'use strict';

/**
 * Sync local post images to the image host over one SFTP connection.
 *
 * Usage:
 *   node tools/upload-images.js [--overwrite] [--dry-run] [--slug <slug>] [--year <year>] [file ...]
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadImageHostEnv } = require('./imgbed-env');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const YEAR_RE = /^\d{4}$/;

function usage() {
  return [
    'usage: node tools/upload-images.js [--overwrite] [--dry-run] [--slug <slug>] [--year <year>] [file ...]',
    '  --overwrite  replace existing remote files',
    '  --dry-run    show what would be uploaded without changing the server',
    '  --slug       only sync one post folder (or override the folder name for file arguments)',
    '  --year       only sync one year (or override the year for file arguments)',
    '',
    'With no file arguments, every image under source/_posts is synced.',
    'With file arguments, only those files are synced.'
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
  const args = { overwrite: false, dryRun: false, slug: '', year: '', files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--overwrite') args.overwrite = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--slug') args.slug = argv[++i] || '';
    else if (arg === '--year') args.year = argv[++i] || '';
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else if (arg.startsWith('-')) {
      fail(`unknown option: ${arg}`);
    } else {
      args.files.push(arg);
    }
  }
  if (args.slug) validateSegment(args.slug, 'slug');
  if (args.year) {
    validateSegment(args.year, 'year');
    if (!YEAR_RE.test(args.year)) fail('year must be four digits');
  }
  return args;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile() && ALLOWED_EXT.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function normalizeFile(input) {
  const file = path.resolve(input);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`local image not found: ${file}`);
  }
  if (!ALLOWED_EXT.has(path.extname(file).toLowerCase())) {
    fail(`unsupported image extension: ${path.extname(file) || '(none)'}`);
  }
  return file;
}

function locationFor(file) {
  const relative = path.relative(POSTS_DIR, file).split(path.sep).join('/');
  const match = /^(\d{4})\/([^/]+)\/([^/]+)$/.exec(relative);
  if (!match) return null;
  const [, year, slug, name] = match;
  validateSegment(slug, `slug in ${relative}`);
  validateSegment(name, `filename in ${relative}`);
  return { relative, year, slug, name };
}

function itemFor(file, args) {
  const derived = locationFor(file);
  const year = args.year || (derived && derived.year) || '';
  const slug = args.slug || (derived && derived.slug) || '';
  validateSegment(year, 'year');
  if (!YEAR_RE.test(year)) fail('year must be four digits');
  validateSegment(slug, 'slug');
  const name = path.basename(file);
  validateSegment(name, 'filename');
  return {
    file,
    location: {
      relative: path.relative(ROOT, file).split(path.sep).join('/'),
      year,
      slug,
      name
    }
  };
}

function collectItems(args) {
  const files = args.files.length
    ? args.files.map(normalizeFile)
    : walk(POSTS_DIR)
        .map((file) => ({ file, location: locationFor(file) }))
        .filter((item) => item.location)
        .filter(({ location }) => !args.slug || location.slug === args.slug)
        .filter(({ location }) => !args.year || location.year === args.year)
        .map(({ file }) => file);

  const seen = new Set();
  return files
    .filter((file) => {
      if (seen.has(file)) return false;
      seen.add(file);
      return true;
    })
    .map((file) => itemFor(file, args))
    .sort((a, b) => a.location.relative.localeCompare(b.location.relative));
}

function remoteRoot(value) {
  if (!value || !value.startsWith('/')) fail('IMGHOST_REMOTE_ROOT must be an absolute path');
  if (value.split('/').includes('..')) fail('IMGHOST_REMOTE_ROOT must not contain ..');
  return path.posix.normalize(value).replace(/\/+$/, '');
}

function publicBase(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('IMGHOST_PUBLIC_BASE_URL must be a valid URL');
  }
  if (!/^https?:$/.test(url.protocol)) fail('IMGHOST_PUBLIC_BASE_URL must use http or https');
  return value.replace(/\/+$/, '');
}

function sftpCall(sftp, method, ...args) {
  return new Promise((resolve, reject) => {
    sftp[method](...args, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadImageHostEnv([
    'IMGHOST_HOST',
    'IMGHOST_USER',
    'IMGHOST_PRIVATE_KEY_PATH',
    'IMGHOST_REMOTE_ROOT',
    'IMGHOST_PUBLIC_BASE_URL'
  ]);
  if (!fs.existsSync(config.IMGHOST_PRIVATE_KEY_PATH)) {
    fail(`private key not found: ${config.IMGHOST_PRIVATE_KEY_PATH}`);
  }

  const root = remoteRoot(config.IMGHOST_REMOTE_ROOT);
  const base = publicBase(config.IMGHOST_PUBLIC_BASE_URL);
  const files = collectItems(args);

  if (!files.length) {
    process.stderr.write('upload-images: no matching images\n');
    return;
  }

  const SftpClient = require('ssh2-sftp-client');
  const sftp = new SftpClient();
  let connected = false;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const preparedDirs = new Set();
  let rootStat = null;

  try {
    await sftp.connect({
      host: config.IMGHOST_HOST,
      port: Number(config.IMGHOST_PORT || 22),
      username: config.IMGHOST_USER,
      privateKey: fs.readFileSync(config.IMGHOST_PRIVATE_KEY_PATH),
      readyTimeout: 20000
    });
    connected = true;
    rootStat = await sftp.stat(root);

    const prepareDir = async (dir) => {
      if (preparedDirs.has(dir)) return;
      await sftp.mkdir(dir, true);
      await sftpCall(sftp.sftp, 'chown', dir, rootStat.uid, rootStat.gid);
      await sftpCall(sftp.sftp, 'chmod', dir, 0o755);
      preparedDirs.add(dir);
    };

    for (let i = 0; i < files.length; i += 1) {
      const { file, location } = files[i];
      const remoteDir = path.posix.join(root, 'posts', location.year, location.slug);
      const remotePath = path.posix.join(remoteDir, location.name);
      const url = `${base}/posts/${location.year}/${location.slug}/${location.name}`;
      const label = `[${i + 1}/${files.length}] ${location.relative}`;

      try {
        const exists = await sftp.exists(remotePath);
        if (exists && !args.overwrite) {
          skipped += 1;
          process.stderr.write(`${label} skip (exists)\n`);
          continue;
        }
        if (args.dryRun) {
          uploaded += 1;
          process.stderr.write(`${label} would upload -> ${url}\n`);
          continue;
        }

        await prepareDir(path.posix.join(root, 'posts'));
        await prepareDir(path.posix.join(root, 'posts', location.year));
        await prepareDir(remoteDir);
        await sftp.fastPut(file, remotePath);
        await sftpCall(sftp.sftp, 'chown', remotePath, rootStat.uid, rootStat.gid);
        await sftpCall(sftp.sftp, 'chmod', remotePath, 0o644);
        uploaded += 1;
        process.stdout.write(`${url}\n`);
      } catch (error) {
        failed += 1;
        process.stderr.write(`${label} error: ${error.message}\n`);
      }
    }
  } finally {
    if (connected) await sftp.end().catch(() => {});
  }

  const action = args.dryRun ? 'would upload' : 'uploaded';
  process.stderr.write(
    `upload-images: ${action} ${uploaded}, skipped ${skipped}, failed ${failed}\n`
  );
  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`upload-images: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, locationFor, normalizeFile, walk };
