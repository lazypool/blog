'use strict';

/**
 * Remove post images from the image host that no longer exist locally.
 *
 * `upload-images.js` only uploads or overwrites files; it never deletes remote
 * images. This tool compares the remote `posts/<year>/<slug>/<file>` tree with
 * the local `source/_posts` tree and lists (or deletes) the remote-only files.
 *
 * The local image files are the source of truth, mirroring what
 * `upload-images.js` would sync. Deleting a local image or a whole post folder
 * therefore makes its remote copy an orphan.
 *
 * Usage:
 *   node tools/prune-images.js [--year <year>] [--slug <slug>] \
 *     [--prune-empty-dirs] [--delete]
 *
 *   Default (no --delete) is a dry run that only lists orphan files.
 *   --delete           actually delete the listed remote files
 *   --prune-empty-dirs remove empty slug/year directories after deletion
 *   --year / --slug    limit the scan to one year or one post folder
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadImageHostEnv } = require('./imgbed-env');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const YEAR_RE = /^\d{4}$/;
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

function usage() {
  return [
    'usage: node tools/prune-images.js [--year <year>] [--slug <slug>] [--prune-empty-dirs] [--delete]',
    '  --delete           delete orphan files from the image host (default: dry run)',
    '  --prune-empty-dirs remove empty slug/year directories after deletion',
    '  --year             only scan one year',
    '  --slug             only scan one post folder',
    '  --dry-run          explicit dry run (default)',
    '',
    'Orphans are remote images under posts/<year>/<slug>/ that no longer exist in source/_posts.'
  ].join('\n');
}

function fail(message) {
  throw new Error(message);
}

function validateSegment(value, label) {
  if (!value || value === '.' || value === '..' || !SEGMENT_RE.test(value)) {
    fail(`${label} must match [A-Za-z0-9._-]+ and must not be . or ..`);
  }
  return value;
}

function parseArgs(argv) {
  const args = { delete: false, dryRun: true, year: '', slug: '', pruneEmptyDirs: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--delete') {
      args.delete = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.delete = false;
      args.dryRun = true;
    } else if (arg === '--prune-empty-dirs') args.pruneEmptyDirs = true;
    else if (arg === '--year') args.year = argv[++i] || '';
    else if (arg === '--slug') args.slug = argv[++i] || '';
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      fail(`unknown option: ${arg}`);
    }
  }
  if (args.year) {
    validateSegment(args.year, 'year');
    if (!YEAR_RE.test(args.year)) fail('year must be four digits');
  }
  if (args.slug) validateSegment(args.slug, 'slug');
  if (args.pruneEmptyDirs && !args.delete) {
    fail('--prune-empty-dirs only makes sense together with --delete');
  }
  return args;
}

function walkLocal(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkLocal(full, out);
    else if (ent.isFile() && ALLOWED_EXT.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function localImages(args) {
  const local = new Map();
  for (const file of walkLocal(POSTS_DIR)) {
    const relative = path.relative(POSTS_DIR, file).split(path.sep).join('/');
    const match = /^(\d{4})\/([^/]+)\/([^/]+)$/.exec(relative);
    if (!match) continue;
    const [, year, slug, name] = match;
    if (args.year && year !== args.year) continue;
    if (args.slug && slug !== args.slug) continue;
    validateSegment(slug, `slug in ${relative}`);
    validateSegment(name, `filename in ${relative}`);
    local.set(relative, file);
  }
  return local;
}

async function listChildren(sftp, dir) {
  try {
    return await sftp.list(dir);
  } catch (error) {
    if (/no such file|not exist/i.test(error.message)) return [];
    throw error;
  }
}

async function remoteImages(sftp, root, args) {
  const postsRoot = path.posix.join(root, 'posts');
  const out = [];
  if (!(await sftp.exists(postsRoot))) return out;

  const years = await listChildren(sftp, postsRoot);
  for (const yearEntry of years) {
    if (yearEntry.type !== 'd' || !YEAR_RE.test(yearEntry.name)) continue;
    if (args.year && yearEntry.name !== args.year) continue;
    const yearDir = path.posix.join(postsRoot, yearEntry.name);

    const slugs = await listChildren(sftp, yearDir);
    for (const slugEntry of slugs) {
      if (slugEntry.type !== 'd' || !SEGMENT_RE.test(slugEntry.name)) continue;
      if (args.slug && slugEntry.name !== args.slug) continue;
      const slugDir = path.posix.join(yearDir, slugEntry.name);

      const files = await listChildren(sftp, slugDir);
      for (const fileEntry of files) {
        if (fileEntry.type !== '-') continue;
        const ext = path.extname(fileEntry.name).toLowerCase();
        if (!ALLOWED_EXT.has(ext) || !SEGMENT_RE.test(fileEntry.name)) continue;
        out.push({
          relative: `${yearEntry.name}/${slugEntry.name}/${fileEntry.name}`,
          path: path.posix.join(slugDir, fileEntry.name),
          size: fileEntry.size || 0
        });
      }
    }
  }
  return out;
}

function remoteRoot(value) {
  if (!value || !value.startsWith('/')) fail('IMGHOST_REMOTE_ROOT must be an absolute path');
  if (value.split('/').includes('..')) fail('IMGHOST_REMOTE_ROOT must not contain ..');
  return path.posix.normalize(value).replace(/\/+$/, '');
}

async function removeEmptyDirs(sftp, items) {
  const dirs = new Set();
  for (const item of items) {
    const slugDir = path.posix.dirname(item.path);
    const yearDir = path.posix.dirname(slugDir);
    dirs.add(slugDir);
    dirs.add(yearDir);
  }
  let removed = 0;
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
    try {
      await sftp.rmdir(dir);
      removed += 1;
      process.stdout.write(`removed empty dir ${dir}\n`);
    } catch {
      // Directory is not empty or already gone; nothing to do.
    }
  }
  return removed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allLocal = localImages({ year: '', slug: '' });

  if (!allLocal.size) {
    fail('no local post images found; refusing to prune the remote host');
  }

  const local = args.year || args.slug ? localImages(args) : allLocal;

  const config = loadImageHostEnv([
    'IMGHOST_HOST',
    'IMGHOST_USER',
    'IMGHOST_PRIVATE_KEY_PATH',
    'IMGHOST_REMOTE_ROOT'
  ]);
  if (!fs.existsSync(config.IMGHOST_PRIVATE_KEY_PATH)) {
    fail(`private key not found: ${config.IMGHOST_PRIVATE_KEY_PATH}`);
  }

  const root = remoteRoot(config.IMGHOST_REMOTE_ROOT);
  const SftpClient = require('ssh2-sftp-client');
  const sftp = new SftpClient();

  let deleted = 0;
  let failed = 0;
  let emptyDirs = 0;
  let orphans = [];

  try {
    await sftp.connect({
      host: config.IMGHOST_HOST,
      port: Number(config.IMGHOST_PORT || 22),
      username: config.IMGHOST_USER,
      privateKey: fs.readFileSync(config.IMGHOST_PRIVATE_KEY_PATH),
      readyTimeout: 20000
    });

    const remote = await remoteImages(sftp, root, args);
    const remoteNames = new Set(remote.map((item) => item.relative));
    orphans = remote.filter((item) => !local.has(item.relative));
    const missing = [...local.keys()].filter((name) => !remoteNames.has(name));

    if (!orphans.length) {
      process.stderr.write('prune-images: no orphan remote images\n');
    } else {
      const total = orphans.reduce((sum, item) => sum + item.size, 0);
      process.stderr.write(
        `prune-images: ${orphans.length} orphan(s), ${(total / 1024 / 1024).toFixed(2)} MB\n`
      );
    }

    for (const item of orphans) {
      if (args.dryRun) {
        process.stdout.write(`would delete ${item.relative}\n`);
        continue;
      }
      try {
        await sftp.delete(item.path);
        deleted += 1;
        process.stdout.write(`deleted ${item.relative}\n`);
      } catch (error) {
        failed += 1;
        process.stderr.write(`failed ${item.relative}: ${error.message}\n`);
      }
    }

    if (args.delete && args.pruneEmptyDirs && deleted) {
      emptyDirs = await removeEmptyDirs(sftp, orphans);
    }

    if (missing.length) {
      process.stderr.write(
        `prune-images: ${missing.length} local image(s) not on the host (run upload:images to sync)\n`
      );
    }
  } finally {
    await sftp.end().catch(() => {});
  }

  if (args.dryRun) {
    process.stderr.write(
      `prune-images: dry run, ${orphans.length} orphan(s); rerun with --delete to remove\n`
    );
  } else {
    process.stderr.write(
      `prune-images: deleted ${deleted}, failed ${failed}, empty dirs removed ${emptyDirs}\n`
    );
  }
  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`prune-images: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, localImages, remoteImages, remoteRoot };
