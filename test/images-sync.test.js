'use strict';

/**
 * End-to-end `status` / `sync` / `download` runs against an in-memory image
 * host, a temporary posts tree and a mocked fetch. Nothing touches the
 * network or the real source/_posts tree.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, test } = require('node:test');

const imgbed = require('../tools/imgbed');

const ORPHAN = '2000/01-01-removed/old.png';
const GONE = '2025/01-01-a/gone.png';
const LOCAL = ['2025/01-01-a/unref.png', '2025/01-01-a/x.png', '2025/01-01-a/y.png'];

class FakeHost {
  static reset() {
    FakeHost.manifest = null;
    FakeHost.files = new Map();
    FakeHost.calls = [];
    FakeHost.lockHeld = false;
    FakeHost.failUpload = new Set();
  }

  static async connect() {
    return new FakeHost();
  }

  record(name, key) {
    FakeHost.calls.push(key ? `${name} ${key}` : name);
  }

  async lock() {
    if (FakeHost.lockHeld) throw new Error('image host is locked by other (pid 1)');
    this.record('lock');
    FakeHost.lockHeld = true;
    this.locked = true;
  }

  async end() {
    if (this.locked) {
      this.record('unlock');
      FakeHost.lockHeld = false;
      this.locked = false;
    }
  }

  async readManifest() {
    this.record('readManifest');
    return FakeHost.manifest && imgbed.parseManifest(FakeHost.manifest);
  }

  async writeManifest(manifest) {
    this.record('writeManifest');
    FakeHost.manifest = imgbed.serializeManifest(manifest);
  }

  async scan() {
    this.record('scan');
    return new Map([...FakeHost.files].map(([key, size]) => [key, { size }]));
  }

  async upload(file, key) {
    this.record('upload', key);
    if (FakeHost.failUpload.has(key)) {
      // Simulates a failed replace that has already removed the old copy.
      FakeHost.files.delete(key);
      throw new Error('rename failed');
    }
    FakeHost.files.set(key, imgbed.hashFile(file).size);
  }

  async remove(key) {
    this.record('remove', key);
    FakeHost.files.delete(key);
  }

  async removeEmptyDirs() {
    return [];
  }
}

require.cache[require.resolve('../tools/imgbed-sftp')] = {
  exports: { ImageHost: FakeHost },
};
const { main } = require('../tools/images');

let postsDir;

async function run(...argv) {
  const write = process.stdout.write;
  const writeErr = process.stderr.write;
  const out = [];
  // Capture the CLI's string output only: the node --test runner reports
  // results to its parent through binary chunks on this same stdout.
  const capture = (original) =>
    function (chunk, ...rest) {
      if (typeof chunk !== 'string') return original.call(this, chunk, ...rest);
      out.push(chunk);
      return true;
    };
  process.stdout.write = capture(write);
  process.stderr.write = capture(writeErr);
  FakeHost.calls = [];
  process.exitCode = 0;
  try {
    await main(argv, { postsDir });
  } finally {
    process.stdout.write = write;
    process.stderr.write = writeErr;
  }
  const exitCode = process.exitCode;
  process.exitCode = 0;
  return { out: out.join(''), exitCode };
}

const uploads = () => FakeHost.calls.filter((c) => c.startsWith('upload ')).map((c) => c.slice(7));
const manifestFiles = () => JSON.parse(FakeHost.manifest).files;

process.env.IMGHOST_HOST = 'fake.test';
process.env.IMGHOST_USER = 'fake';
process.env.IMGHOST_PRIVATE_KEY_PATH = '/nonexistent';
process.env.IMGHOST_REMOTE_ROOT = '/srv/img';
process.env.IMGHOST_PUBLIC_BASE_URL = 'https://img.test';

beforeEach(() => {
  postsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imgbed-sync-'));
  const files = {
    '2025/01-01-a.md': '![x](./x.png) ![y](./y.png) ![gone](./gone.png)',
    '2025/01-01-a/x.png': 'X',
    '2025/01-01-a/y.png': 'YY',
    '2025/01-01-a/unref.png': 'U',
  };
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(postsDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(postsDir, rel), content);
  }
  FakeHost.reset();
});

afterEach(() => {
  fs.rmSync(postsDir, { recursive: true, force: true });
});

/** Seed the fake host with every local image, an orphan and a referenced remote-only image. */
async function seedHost() {
  for (const key of LOCAL) FakeHost.files.set(key, 1);
  FakeHost.files.set(ORPHAN, 1);
  FakeHost.files.set(GONE, 1);
  await run('sync');
}

test('sync seeds, skips unchanged, uploads modified and prunes orphans', async () => {
  for (const key of LOCAL) FakeHost.files.set(key, 1);
  FakeHost.files.set(ORPHAN, 1);
  FakeHost.files.set(GONE, 1);

  // Dry run on a host without a manifest: no lock, scans, plans, writes nothing.
  await run('sync', '--dry-run');
  assert.deepEqual(FakeHost.calls, ['readManifest', 'scan']);
  assert.equal(FakeHost.manifest, null);

  // --prune is refused while the manifest is only a seed from a listing.
  await assert.rejects(run('sync', '--prune'), /no manifest yet/);
  assert.deepEqual(FakeHost.calls, ['lock', 'readManifest', 'scan', 'unlock']);
  assert.equal(FakeHost.manifest, null);
  await assert.rejects(run('sync', '--prune', '--dry-run'), /no manifest yet/);

  // First real sync: unknown remote content is re-uploaded, manifest written.
  await run('sync');
  assert.deepEqual(uploads(), LOCAL);
  assert.ok(FakeHost.calls.includes('writeManifest'));
  assert.ok(!FakeHost.calls.some((c) => c.startsWith('remove')));
  assert.equal(FakeHost.lockHeld, false);

  // Unchanged tree: one manifest read under the lock and nothing else.
  await run('sync');
  assert.deepEqual(FakeHost.calls, ['lock', 'readManifest', 'unlock']);

  // A changed hash in the manifest stands in for a locally modified image.
  const changed = '2025/01-01-a/x.png';
  const manifest = JSON.parse(FakeHost.manifest);
  manifest.files[changed].sha256 = '0'.repeat(64);
  FakeHost.manifest = JSON.stringify(manifest);
  const { out: status } = await run('status');
  assert.match(status, new RegExp(`modified \\(1\\)[\\s\\S]*${changed}`));
  assert.match(status, /deleted \(1\)/);
  assert.match(status, /missing \(1\)/);
  await run('sync');
  assert.deepEqual(uploads(), [changed]);

  // --prune removes the orphan but never an image a post still references.
  await run('sync', '--prune');
  assert.deepEqual(FakeHost.calls, [
    'lock',
    'readManifest',
    `remove ${ORPHAN}`,
    'writeManifest',
    'unlock',
  ]);
  assert.equal(manifestFiles()[ORPHAN], undefined);
  assert.ok(manifestFiles()[GONE]);

  // --force re-uploads a scoped file even though it is unchanged.
  await run('sync', '--force', path.join(postsDir, changed));
  assert.deepEqual(uploads(), [changed]);
});

test('a failed upload marks the manifest entry unknown so the next sync retries', async () => {
  await seedHost();
  const key = '2025/01-01-a/y.png';
  const recorded = manifestFiles()[key];
  assert.ok(recorded.sha256);

  // Make the manifest disagree so y.png is uploaded, then fail that upload.
  const manifest = JSON.parse(FakeHost.manifest);
  manifest.files[key].sha256 = '1'.repeat(64);
  FakeHost.manifest = JSON.stringify(manifest);
  FakeHost.failUpload.add(key);
  const { exitCode } = await run('sync');
  assert.equal(exitCode, 1);
  assert.deepEqual(manifestFiles()[key], { size: recorded.size, sha256: null });
  assert.equal(FakeHost.lockHeld, false);

  // Even with the local file now matching the old hash, the entry is retried.
  FakeHost.failUpload.clear();
  await run('sync');
  assert.deepEqual(uploads(), [key]);
  assert.deepEqual(manifestFiles()[key], recorded);
});

test('a held lock blocks sync but not status or dry runs', async () => {
  await seedHost();
  FakeHost.lockHeld = true;
  const before = FakeHost.manifest;
  await assert.rejects(run('sync'), /locked/);
  assert.equal(FakeHost.manifest, before);
  await run('sync', '--dry-run', '--force');
  assert.deepEqual(FakeHost.calls, ['readManifest']);
  await run('status');
  assert.equal(FakeHost.lockHeld, true);
});

test('files found by --scan are not pruned in the same run', async () => {
  await seedHost();
  const manual = '2025/01-01-a/manual.png';
  FakeHost.files.set(manual, 7);
  const { out } = await run('sync', '--scan', '--prune');
  assert.match(out, /found by --scan are not pruned/);
  assert.ok(!FakeHost.calls.includes(`remove ${manual}`));
  assert.deepEqual(manifestFiles()[manual], { size: 7, sha256: null });

  await run('sync', '--prune');
  assert.ok(FakeHost.calls.includes(`remove ${manual}`));
});

test('status does not claim full sync when referenced images are missing', async () => {
  await seedHost();
  await run('sync', '--prune');
  const { out } = await run('status');
  assert.match(out, /remote is in sync, but 1 referenced image\(s\) are missing locally/);
  assert.doesNotMatch(out, /host is in sync/);

  fs.writeFileSync(path.join(postsDir, '2025/01-01-a.md'), '![x](./x.png) ![y](./y.png)');
  await run('sync', '--prune');
  assert.match((await run('status')).out, /host is in sync/);
});

// ---- download ----

function mockFetch(handler) {
  const original = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url, options) => {
    requested.push(url);
    assert.ok(options.signal, 'download requests carry a timeout signal');
    return handler(url);
  };
  return {
    requested,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const leftovers = (dir) => fs.readdirSync(dir).filter((name) => name.endsWith('.download'));

test('download restores missing images atomically and skips existing ones', async () => {
  const dir = path.join(postsDir, '2025/01-01-a');
  const fetched = mockFetch(
    () => new Response('GONE', { headers: { 'content-type': 'image/png', 'content-length': '4' } })
  );
  try {
    const { out, exitCode } = await run('download');
    assert.equal(exitCode, 0);
    assert.deepEqual(fetched.requested, [`https://img.test/posts/${GONE}`]);
    assert.equal(fs.readFileSync(path.join(postsDir, GONE), 'utf8'), 'GONE');
    assert.match(out, /1 downloaded, 2 skipped, 0 failed/);
    assert.deepEqual(leftovers(dir), []);
  } finally {
    fetched.restore();
  }
});

test('download failures never leave a partial or replaced image', async (t) => {
  const dir = path.join(postsDir, '2025/01-01-a');
  const cases = [
    ['HTTP error', () => new Response('nope', { status: 404 }), /HTTP 404/],
    [
      'HTML page',
      () => new Response('<html>', { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      /HTML page/,
    ],
    [
      'truncated body',
      () => new Response('GO', { headers: { 'content-type': 'image/png', 'content-length': '4' } }),
      /truncated/,
    ],
  ];
  for (const [name, handler, message] of cases) {
    await t.test(name, async () => {
      const fetched = mockFetch(handler);
      try {
        const { out, exitCode } = await run('download');
        assert.equal(exitCode, 1);
        assert.match(out, message);
        assert.equal(fs.existsSync(path.join(postsDir, GONE)), false);
        assert.deepEqual(leftovers(dir), []);
      } finally {
        fetched.restore();
      }
    });
  }

  await t.test('interrupted write with --overwrite keeps the old file', async () => {
    const fetched = mockFetch(() => new Response('NEWDATA', { headers: { 'content-type': 'image/png' } }));
    const writeFile = fs.promises.writeFile;
    fs.promises.writeFile = async (file, data) => {
      await writeFile(file, data.subarray(0, 3));
      throw new Error('ENOSPC: no space left on device');
    };
    try {
      const { out, exitCode } = await run('download', '--overwrite');
      assert.equal(exitCode, 1);
      assert.match(out, /ENOSPC/);
      assert.equal(fs.readFileSync(path.join(dir, 'x.png'), 'utf8'), 'X');
      assert.equal(fs.existsSync(path.join(postsDir, GONE)), false);
      assert.deepEqual(leftovers(dir), []);
    } finally {
      fs.promises.writeFile = writeFile;
      fetched.restore();
    }
  });
});

test('download --dry-run writes nothing', async () => {
  const fetched = mockFetch(() => {
    throw new Error('dry run must not fetch');
  });
  try {
    const { out } = await run('download', '--dry-run');
    assert.match(out, new RegExp(`would download ${GONE}`));
    assert.deepEqual(fetched.requested, []);
    assert.equal(fs.existsSync(path.join(postsDir, GONE)), false);
  } finally {
    fetched.restore();
  }
});
