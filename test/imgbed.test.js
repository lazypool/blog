'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const imgbed = require('../tools/imgbed');
const { parseArgs } = require('../tools/images');

function tempPosts(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'imgbed-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

test('imageKey maps post images and rejects other layouts', () => {
  const posts = '/blog/source/_posts';
  assert.equal(imgbed.imageKey(`${posts}/2025/01-09-x/a.PNG`, posts), '2025/01-09-x/a.PNG');
  assert.equal(imgbed.imageKey(`${posts}/2025/01-09-x.md`, posts), null);
  assert.equal(imgbed.imageKey(`${posts}/2025/01-09-x/sub/a.png`, posts), null);
  assert.equal(imgbed.imageKey(`${posts}/2025/01-09-x/notes.txt`, posts), null);
  assert.throws(() => imgbed.imageKey(`${posts}/2025/01-09-x/a b.png`, posts), /filename/);
});

test('imageRefs finds relative Markdown and HTML images outside code', () => {
  const markdown = [
    '![a](./a.png) ![b](b.jpg "title") ![remote](https://x.test/c.png)',
    '<img src="./d.webp" alt="">',
    '![abs](/img/e.png) ![nested](../f.png) ![sub](dir/g.png) ![doc](h.pdf)',
    '`![inline](./i.png)`',
    '```md',
    '![fenced](./j.png)',
    '```',
    '![a again](a.png)',
  ].join('\n');
  assert.deepEqual(imgbed.imageRefs(markdown).sort(), ['a.png', 'b.jpg', 'd.webp']);
});

test('imageRefs ignores indented code blocks and HTML comments', () => {
  const markdown = [
    'Intro paragraph.',
    '',
    '    ![indented](./code.png)',
    '\t<img src="tab.png">',
    '',
    '<!-- ![commented](./hidden.png)',
    '<img src="hidden2.png"> -->',
    '',
    '- list item',
    '',
    '    ![continuation](./list.png)',
    '',
    'Paragraph',
    '    ![lazy](./lazy.png)',
    '',
    '`code`    ![after inline code](./inline-tail.png)',
  ].join('\n');
  assert.deepEqual(imgbed.imageRefs(markdown).sort(), ['inline-tail.png', 'lazy.png', 'list.png']);
});

test('mapOutsideCode leaves code and comments byte-identical', () => {
  const markdown = 'a ![x](x.png)\n\n    ![y](y.png)\n<!-- ![z](z.png) -->\n```\n![w](w.png)\n```\n';
  const mapped = imgbed.mapOutsideCode(markdown, (text) => text.replace(/\.png/g, '.PNG'));
  assert.equal(mapped, markdown.replace('x.png', 'x.PNG'));
});

test('localImages and referencedImages walk a posts tree', () => {
  const dir = tempPosts({
    '2025/01-09-x.md': '![a](./a.png) ![gone](./gone.png)',
    '2025/01-09-x/a.png': 'A',
    '2025/01-09-x/unused.jpg': 'U',
    '2025/01-09-x/readme.txt': 'T',
    'draft.md': '![d](./d.png)',
  });
  try {
    assert.deepEqual([...imgbed.localImages(dir).keys()], [
      '2025/01-09-x/a.png',
      '2025/01-09-x/unused.jpg',
    ]);
    assert.deepEqual([...imgbed.referencedImages(dir).keys()].sort(), [
      '2025/01-09-x/a.png',
      '2025/01-09-x/gone.png',
    ]);
    assert.deepEqual(imgbed.hashFile(path.join(dir, '2025/01-09-x/a.png')), {
      size: 1,
      sha256: sha('A'),
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('planSync classifies new, modified, unknown, unchanged, deleted and missing', () => {
  const local = new Map([
    ['2025/p/new.png', { size: 1, sha256: sha('n') }],
    ['2025/p/same.png', { size: 1, sha256: sha('s') }],
    ['2025/p/changed.png', { size: 1, sha256: sha('c2') }],
    ['2025/p/seeded.png', { size: 1, sha256: sha('x') }],
  ]);
  const manifest = {
    files: {
      '2025/p/same.png': { size: 1, sha256: sha('s') },
      '2025/p/changed.png': { size: 1, sha256: sha('c1') },
      '2025/p/seeded.png': { size: 1, sha256: null },
      '2025/p/removed.png': { size: 1, sha256: sha('r') },
      '2025/p/fresh-clone.png': { size: 1, sha256: sha('f') },
    },
  };
  const referenced = new Set(['2025/p/fresh-clone.png']);
  const plan = imgbed.planSync({ local, manifest, referenced });
  assert.deepEqual(plan.upload, [
    { key: '2025/p/changed.png', reason: 'modified' },
    { key: '2025/p/new.png', reason: 'new' },
    { key: '2025/p/seeded.png', reason: 'unknown' },
  ]);
  assert.deepEqual(plan.unchanged, ['2025/p/same.png']);
  assert.deepEqual(plan.deleted, ['2025/p/removed.png']);
  assert.deepEqual(plan.missing, ['2025/p/fresh-clone.png']);

  const forced = imgbed.planSync({ local, manifest, referenced, force: true });
  assert.deepEqual(forced.unchanged, []);
  assert.ok(forced.upload.some((u) => u.key === '2025/p/same.png' && u.reason === 'forced'));
});

test('planSync honours year, slug and file scopes', () => {
  const local = new Map([
    ['2024/a/x.png', { size: 1, sha256: 'h1' }],
    ['2025/b/y.png', { size: 1, sha256: 'h2' }],
  ]);
  const manifest = { files: { '2024/a/old.png': { size: 1, sha256: 'h0' } } };
  const byYear = imgbed.planSync({ local, manifest, scope: { year: '2025' } });
  assert.deepEqual(byYear.upload.map((u) => u.key), ['2025/b/y.png']);
  assert.deepEqual(byYear.deleted, []);

  const byKey = imgbed.planSync({ local, manifest, scope: { keys: new Set(['2024/a/x.png']) } });
  assert.deepEqual(byKey.upload.map((u) => u.key), ['2024/a/x.png']);
  assert.deepEqual(byKey.deleted, []);
});

test('mergeRemoteListing seeds unknown hashes and drops vanished entries', () => {
  const manifest = {
    files: {
      '2025/p/kept.png': { size: 3, sha256: 'k' },
      '2025/p/resized.png': { size: 3, sha256: 'r' },
      '2025/p/vanished.png': { size: 3, sha256: 'v' },
      '2024/q/other.png': { size: 3, sha256: 'o' },
    },
  };
  const remote = new Map([
    ['2025/p/kept.png', { size: 3 }],
    ['2025/p/resized.png', { size: 4 }],
    ['2025/p/manual.png', { size: 5 }],
  ]);
  const untracked = imgbed.mergeRemoteListing(manifest, remote, { year: '2025' });
  assert.deepEqual(untracked, ['2025/p/manual.png']);
  assert.deepEqual(manifest.files, {
    '2025/p/kept.png': { size: 3, sha256: 'k' },
    '2025/p/resized.png': { size: 4, sha256: null },
    '2025/p/manual.png': { size: 5, sha256: null },
    '2024/q/other.png': { size: 3, sha256: 'o' },
  });
});

test('manifest round-trips and rejects unsafe paths', () => {
  const manifest = {
    files: { '2025/p/b.png': { size: 2, sha256: sha('b') }, '2025/p/a.png': { size: 1, sha256: null } },
  };
  const text = imgbed.serializeManifest(manifest);
  assert.deepEqual(Object.keys(JSON.parse(text).files), ['2025/p/a.png', '2025/p/b.png']);
  assert.deepEqual(imgbed.parseManifest(text).files, {
    '2025/p/a.png': { size: 1, sha256: null },
    '2025/p/b.png': { size: 2, sha256: sha('b') },
  });
  assert.throws(() => imgbed.parseManifest('{"version":1,"files":{"2025/../x.png":{}}}'), /invalid/);
  assert.throws(() => imgbed.parseManifest('{"version":2,"files":{}}'), /version/);
});

test('parseManifest rejects malformed data with clear errors', () => {
  const entry = (value) => JSON.stringify({ version: 1, files: { '2025/p/a.png': value } });
  assert.throws(() => imgbed.parseManifest('{'), /not valid JSON/);
  assert.throws(() => imgbed.parseManifest('null'), /unsupported/);
  assert.throws(() => imgbed.parseManifest('[]'), /unsupported/);
  assert.throws(() => imgbed.parseManifest('{"version":1,"files":null}'), /"files" must be an object/);
  assert.throws(() => imgbed.parseManifest('{"version":1,"files":[]}'), /"files" must be an object/);
  assert.throws(() => imgbed.parseManifest('{"version":1}'), /"files" must be an object/);
  for (const bad of [null, 'x', [], {}, { size: '1', sha256: null }, { size: -1, sha256: null },
    { size: 1.5, sha256: null }, { size: 1 }, { size: 1, sha256: 'zz' }, { size: 1, sha256: 5 }]) {
    assert.throws(() => imgbed.parseManifest(entry(bad)), /malformed: 2025\/p\/a\.png/, JSON.stringify(bad));
  }
});

test('config helpers validate remote root, public base and env overrides', () => {
  assert.equal(imgbed.remoteRoot('/www/root//'), '/www/root');
  assert.throws(() => imgbed.remoteRoot('www'), /absolute/);
  assert.throws(() => imgbed.remoteRoot('/www/../etc'), /\.\./);
  assert.throws(() => imgbed.remoteRoot('/'), /must not be \//);
  assert.throws(() => imgbed.remoteRoot('//'), /must not be \//);
  assert.equal(imgbed.publicBase('https://img.test/'), 'https://img.test');
  assert.throws(() => imgbed.publicBase('ftp://img.test'), /http/);

  const dir = tempPosts({ '.env': 'IMGHOST_HOST="file.test"\nexport IMGHOST_USER=u\n# c\n' });
  try {
    const env = imgbed.loadImageHostEnv(['IMGHOST_HOST'], path.join(dir, '.env'), {
      IMGHOST_HOST: 'env.test',
      OTHER: 'x',
    });
    assert.equal(env.IMGHOST_HOST, 'env.test');
    assert.equal(env.IMGHOST_USER, 'u');
    assert.equal(env.OTHER, undefined);
    assert.throws(() => imgbed.loadImageHostEnv(['IMGHOST_X'], path.join(dir, '.env'), {}), /IMGHOST_X/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseArgs accepts per-command flags only', () => {
  assert.deepEqual(parseArgs(['sync', '--dry-run', '--prune', '--year', '2025']), {
    command: 'sync',
    year: '2025',
    slug: '',
    files: [],
    dryRun: true,
    prune: true,
  });
  assert.equal(parseArgs([]).help, true);
  assert.throws(() => parseArgs(['status', '--prune']), /unknown option/);
  assert.throws(() => parseArgs(['download', 'a.png']), /file arguments/);
  assert.throws(() => parseArgs(['sync', '--slug', '..']), /slug/);
  assert.throws(() => parseArgs(['upload']), /unknown command/);
  for (const name of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
    assert.throws(() => parseArgs([name]), /unknown command/);
  }
});
