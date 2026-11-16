'use strict';

/**
 * Image-host CLI: one entry point for status, sync and download.
 *
 * Local post images under source/_posts/<year>/<slug>/ are the source of
 * truth. The host keeps `.imgbed-manifest.json` next to `posts/`, recording
 * the size and SHA-256 of every uploaded image. `status` and `sync` read that
 * one file instead of probing each image, hash local files (cheap: the whole
 * tree is tens of MB), and only touch remote images that actually changed.
 * A sync that modifies the host holds `.imgbed-lock` for its whole run.
 *
 * Usage: see usage() below or run `node tools/images.js --help`.
 */

const fs = require('node:fs');
const path = require('node:path');
const imgbed = require('./imgbed');

const COMMANDS = {
  status: new Set(['--scan']),
  sync: new Set(['--dry-run', '--force', '--prune', '--scan']),
  download: new Set(['--dry-run', '--overwrite']),
};
const DOWNLOAD_CONCURRENCY = 4;
const DOWNLOAD_TIMEOUT_MS = 30000;
const SSH_KEYS = ['IMGHOST_HOST', 'IMGHOST_USER', 'IMGHOST_PRIVATE_KEY_PATH', 'IMGHOST_REMOTE_ROOT'];

function usage() {
  return [
    'usage: node tools/images.js <command> [options] [--year <year>] [--slug <slug>] [file ...]',
    '',
    'commands:',
    '  status    compare local images with the remote manifest; changes nothing',
    '  sync      upload new and modified images and update the remote manifest',
    '  download  restore missing local images referenced by Markdown (public URL, no SSH)',
    '',
    'options:',
    '  --dry-run    sync/download: report the planned actions without changing anything',
    '  --prune      sync: also delete remote images whose local file was removed',
    '               (refused while the host has no manifest yet)',
    '  --force      sync: upload every image in scope even if unchanged',
    '  --scan       status/sync: list the remote tree and reconcile the manifest with it',
    '               (compares sizes only; use --force after a same-size edit on the host)',
    '  --overwrite  download: replace local files that already exist',
    '  --year       limit to one year',
    '  --slug       limit to one post folder',
    '  file ...     sync/status: limit to these images under source/_posts',
    '',
    'An image referenced by Markdown but absent locally is reported as missing and is',
    'never pruned; run download to restore it. Only inline `![](file)` and',
    '`<img src="file">` references outside code blocks and HTML comments are recognized.',
  ].join('\n');
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') return { help: true };
  if (!Object.hasOwn(COMMANDS, command)) throw new Error(`unknown command: ${command}\n\n${usage()}`);

  const args = { command, year: '', slug: '', files: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--year') args.year = imgbed.validateYear(rest[++i]);
    else if (arg === '--slug') args.slug = imgbed.validateSegment(rest[++i], 'slug');
    else if (COMMANDS[command].has(arg)) {
      args[arg.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = true;
    } else if (arg.startsWith('-')) throw new Error(`unknown option for ${command}: ${arg}`);
    else if (command === 'download') throw new Error('download does not take file arguments');
    else args.files.push(arg);
  }
  return args;
}

function scopeFor(args, postsDir) {
  const scope = { year: args.year, slug: args.slug };
  if (args.files.length) {
    scope.keys = new Set(
      args.files.map((input) => {
        const file = path.resolve(input);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          throw new Error(`local image not found: ${input}`);
        }
        const key = imgbed.imageKey(file, postsDir);
        if (!key) throw new Error(`not a post image under source/_posts/<year>/<slug>/: ${input}`);
        return key;
      })
    );
  }
  return scope;
}

function hashLocal(local, scope) {
  const out = new Map();
  for (const [key, file] of local) {
    if (imgbed.inScope(key, scope)) out.set(key, { file, ...imgbed.hashFile(file) });
  }
  return out;
}

function log(message) {
  process.stderr.write(`images: ${message}\n`);
}

function printList(label, keys, note = '') {
  if (!keys.length) return;
  process.stdout.write(`${label} (${keys.length})${note ? ` - ${note}` : ''}\n`);
  for (const key of keys) process.stdout.write(`  ${key}\n`);
}

/**
 * Connect, optionally take the single-writer lock (before reading, so the
 * manifest cannot change underneath us), load the manifest and, when it is
 * absent or `--scan` is given, reconcile it with a remote listing.
 * Returns { host, manifest, seeded, untracked }.
 */
async function openHost(args, scope, { lock = false } = {}) {
  const { ImageHost } = require('./imgbed-sftp');
  const config = imgbed.loadImageHostEnv(SSH_KEYS);
  const host = await ImageHost.connect(config, imgbed.remoteRoot(config.IMGHOST_REMOTE_ROOT));
  try {
    if (lock) await host.lock();
    let manifest = await host.readManifest();
    let untracked = [];
    const seeded = !manifest;
    if (seeded) {
      log('no remote manifest yet; scanning the remote tree to seed it');
      manifest = imgbed.emptyManifest();
      untracked = imgbed.mergeRemoteListing(manifest, await host.scan());
    } else if (args.scan) {
      const listingScope = { year: scope.year, slug: scope.slug };
      untracked = imgbed.mergeRemoteListing(manifest, await host.scan(listingScope), listingScope);
    }
    return { host, manifest, seeded, untracked };
  } catch (error) {
    await host.end();
    throw error;
  }
}

async function status(args, { postsDir }) {
  const scope = scopeFor(args, postsDir);
  const local = imgbed.localImages(postsDir);
  const referenced = imgbed.referencedImages(postsDir);
  const hashed = hashLocal(local, scope);
  const { host, manifest, seeded, untracked } = await openHost(args, scope);
  await host.end();

  const plan = imgbed.planSync({ local: hashed, manifest, referenced, scope });
  const byReason = (reason) => plan.upload.filter((u) => u.reason === reason).map((u) => u.key);
  const unreferenced = [...hashed.keys()].filter((key) => !referenced.has(key));

  printList('new', byReason('new'), 'not on the host');
  printList('modified', byReason('modified'), 'differs from the uploaded copy');
  printList('unknown', byReason('unknown'), 'on the host, content not recorded; sync re-uploads');
  printList('deleted', plan.deleted, 'removed locally; sync --prune deletes the remote copy');
  printList('missing', plan.missing, 'referenced but not local; run download');
  printList('unreferenced', unreferenced, 'local images no post references');

  const pending = plan.upload.length + plan.deleted.length;
  log(
    `${plan.unchanged.length} unchanged, ${plan.upload.length} to upload, ` +
      `${plan.deleted.length} to prune, ${plan.missing.length} missing locally` +
      (untracked.length ? `, ${untracked.length} untracked on the host` : '') +
      (seeded ? ' (no remote manifest yet)' : '')
  );
  if (pending) return;
  if (plan.missing.length) {
    log(`remote is in sync, but ${plan.missing.length} referenced image(s) are missing locally`);
  } else {
    log('host is in sync');
  }
}

async function sync(args, { postsDir }) {
  const scope = scopeFor(args, postsDir);
  const local = imgbed.localImages(postsDir);
  if (args.prune && !local.size) {
    throw new Error('no local post images found; refusing to prune the remote host');
  }
  const referenced = imgbed.referencedImages(postsDir);
  const hashed = hashLocal(local, scope);
  const base = imgbed.loadImageHostEnv(['IMGHOST_PUBLIC_BASE_URL']).IMGHOST_PUBLIC_BASE_URL;
  const publicBase = imgbed.publicBase(base);

  // A dry run never touches the host, so it reads without taking the lock.
  const { host, manifest, seeded, untracked } = await openHost(args, scope, { lock: !args.dryRun });
  if (args.prune && seeded) {
    // Everything in a seeded manifest came from a listing, not from this
    // tool, and the local tree may be a partial clone: prune nothing yet.
    await host.end();
    throw new Error(
      'the host has no manifest yet; run sync without --prune first, review ' +
        '`images:status`, then prune in a later run'
    );
  }
  let dirty = seeded || untracked.length > 0 || args.scan;
  let uploaded = 0;
  let deleted = 0;
  let failed = 0;

  try {
    const plan = imgbed.planSync({ local: hashed, manifest, referenced, scope, force: args.force });
    // Files that --scan just discovered were never recorded by a sync; list
    // them as deleted but leave pruning them to a later, reviewed run.
    const fresh = new Set(untracked);
    const prune = args.prune ? plan.deleted.filter((key) => !fresh.has(key)) : [];
    if (args.prune && prune.length < plan.deleted.length) {
      log(
        `${plan.deleted.length - prune.length} remote image(s) found by --scan are not pruned ` +
          'in the same run; rerun with --prune to delete them'
      );
    }

    for (const [i, { key, reason }] of plan.upload.entries()) {
      const label = `[${i + 1}/${plan.upload.length}] ${key} (${reason})`;
      if (args.dryRun) {
        process.stdout.write(`would upload ${key} (${reason})\n`);
        continue;
      }
      try {
        const { file, size, sha256 } = hashed.get(key);
        await host.upload(file, key);
        manifest.files[key] = { size, sha256 };
        dirty = true;
        uploaded += 1;
        process.stdout.write(`${publicBase}/posts/${key}\n`);
      } catch (error) {
        // The remote copy may now be absent or partial: forget its hash so
        // the next sync retries instead of trusting the old entry.
        if (manifest.files[key]) {
          manifest.files[key] = { size: manifest.files[key].size, sha256: null };
          dirty = true;
        }
        failed += 1;
        log(`${label} error: ${error.message}`);
      }
    }

    const removedKeys = [];
    for (const key of prune) {
      if (args.dryRun) {
        process.stdout.write(`would delete ${key}\n`);
        continue;
      }
      try {
        await host.remove(key);
        delete manifest.files[key];
        dirty = true;
        removedKeys.push(key);
        deleted += 1;
        process.stdout.write(`deleted ${key}\n`);
      } catch (error) {
        failed += 1;
        log(`delete ${key} error: ${error.message}`);
      }
    }
    if (removedKeys.length) {
      for (const dir of await host.removeEmptyDirs(removedKeys)) {
        process.stdout.write(`removed empty dir ${dir}\n`);
      }
    }

    if (plan.deleted.length && !args.prune) {
      log(
        `${plan.deleted.length} remote image(s) not present locally or referenced by any post; ` +
          'review with images:status, then rerun with --prune to delete'
      );
    }
    if (plan.missing.length) {
      log(`${plan.missing.length} referenced image(s) missing locally; run download`);
    }
    const verb = args.dryRun ? 'would upload' : 'uploaded';
    const verbDelete = args.dryRun ? 'would delete' : 'deleted';
    log(
      `${verb} ${args.dryRun ? plan.upload.length : uploaded}, ` +
        `${verbDelete} ${args.dryRun ? prune.length : deleted}, ` +
        `unchanged ${plan.unchanged.length}, failed ${failed}`
    );
  } finally {
    // Record whatever succeeded, even after a partial failure; a dry run never writes.
    try {
      if (dirty && !args.dryRun) await host.writeManifest(manifest);
    } finally {
      await host.end();
    }
  }
  if (failed) process.exitCode = 1;
}

async function runPool(items, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

/**
 * Fetch one image into `dest` atomically: the body goes to a temporary file
 * that is renamed over `dest` only after a complete write, so an interrupted
 * download never leaves a partial file that sync would mistake for an edit.
 */
async function fetchImage(url, dest) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type === 'text/html') throw new Error('server returned an HTML page, not an image');
  const buffer = Buffer.from(await response.arrayBuffer());
  const length = response.headers.get('content-length');
  if (length !== null && !response.headers.get('content-encoding') && Number(length) !== buffer.length) {
    throw new Error(`truncated response (${buffer.length} of ${length} bytes)`);
  }

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.download`;
  try {
    await fs.promises.writeFile(tmp, buffer);
    await fs.promises.rename(tmp, dest);
  } catch (error) {
    await fs.promises.rm(tmp, { force: true }).catch(() => {});
    throw error;
  }
  return buffer.length;
}

async function download(args, { postsDir }) {
  const config = imgbed.loadImageHostEnv(['IMGHOST_PUBLIC_BASE_URL']);
  const base = imgbed.publicBase(config.IMGHOST_PUBLIC_BASE_URL);
  const scope = { year: args.year, slug: args.slug };
  const items = [...imgbed.referencedImages(postsDir).keys()]
    .filter((key) => imgbed.inScope(key, scope))
    .sort()
    .map((key) => ({ key, dest: path.join(postsDir, key) }));

  if (!items.length) {
    log('no matching image references');
    return;
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(items, async ({ key, dest }) => {
    if (!args.overwrite && fs.existsSync(dest)) {
      skipped += 1;
      return;
    }
    if (args.dryRun) {
      process.stdout.write(`would download ${key}\n`);
      return;
    }
    try {
      const bytes = await fetchImage(`${base}/posts/${key}`, dest);
      downloaded += 1;
      process.stdout.write(`downloaded ${key} (${bytes} bytes)\n`);
    } catch (error) {
      failed += 1;
      log(`failed ${key}: ${error.message}`);
    }
  });

  log(`${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

/** `options.postsDir` overrides source/_posts (used by the tests). */
async function main(argv, { postsDir = imgbed.POSTS_DIR } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  await { status, sync, download }[args.command](args, { postsDir });
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    log(error.message);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
