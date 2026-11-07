/**
 * Upload one local post image to the static image host over SFTP.
 *
 * Usage:
 *   node tools/upload-image.js <local-image> --slug <slug> [--year <year>] [--overwrite]
 *
 * The script never reads or prints the private key itself; it passes the local
 * key path to ssh2. Credentials live in .env.imgbed.host, which is gitignored.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadImageHostEnv } = require('./imgbed-env');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const YEAR_RE = /^\d{4}$/;

function usage() {
  return [
    'usage: node tools/upload-image.js <local-image> --slug <slug> [--year <year>] [--overwrite]',
    '  --slug       post slug used in posts/<year>/<slug>/<file>',
    '  --year       four-digit year (defaults to the post folder or current year)',
    '  --overwrite  replace an existing remote file'
  ].join('\n');
}

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  let file = '';
  let slug = '';
  let year = '';
  let overwrite = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--slug') {
      slug = argv[++i] || '';
    } else if (arg === '--year') {
      year = argv[++i] || '';
    } else if (arg === '--overwrite') {
      overwrite = true;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else if (arg.startsWith('-')) {
      fail(`unknown option: ${arg}`);
    } else if (!file) {
      file = arg;
    } else {
      fail(`unexpected extra argument: ${arg}`);
    }
  }

  if (!file) fail('missing local image path');
  return { file, slug, year, overwrite };
}

function normalizeLocalFile(input) {
  const file = path.resolve(input);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    fail(`local image not found: ${file}`);
  }
  const ext = path.extname(file).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    fail(`unsupported image extension: ${ext || '(none)'} (allowed: ${[...ALLOWED_EXT].join(' ')})`);
  }
  return { file, name: path.basename(file), ext };
}

function validateSegment(value, label) {
  if (!value || value === '.' || value === '..' || !SEGMENT_RE.test(value)) {
    fail(`${label} must match [A-Za-z0-9._-]+ and must not be . or ..`);
  }
  return value;
}

function fromPostPath(file) {
  const normalized = file.split(path.sep).join('/');
  const match = /\/source\/_posts\/(\d{4})\/\d{2}-\d{2}-([^/]+)\//.exec(normalized);
  if (!match) return null;
  return { year: match[1], slug: match[2] };
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

async function upload(config, local, root, year, slug, overwrite) {
  const SftpClient = require('ssh2-sftp-client');
  const sftp = new SftpClient();
  const remoteDir = path.posix.join(root, 'posts', year, slug);
  const remotePath = path.posix.join(remoteDir, path.basename(local));
  if (!remotePath.startsWith(`${root}/`)) fail('remote path escapes IMGHOST_REMOTE_ROOT');

  let connected = false;
  try {
    await sftp.connect({
      host: config.IMGHOST_HOST,
      port: Number(config.IMGHOST_PORT || 22),
      username: config.IMGHOST_USER,
      privateKey: fs.readFileSync(config.IMGHOST_PRIVATE_KEY_PATH),
      readyTimeout: 20000
    });
    connected = true;

    if (!overwrite && (await sftp.exists(remotePath))) {
      fail(`remote file already exists: ${remotePath} (use --overwrite)`);
    }

    const rootStat = await sftp.stat(root);
    await sftp.mkdir(remoteDir, true);
    await sftp.fastPut(local, remotePath);

    const dirs = [
      path.posix.join(root, 'posts'),
      path.posix.join(root, 'posts', year),
      remoteDir
    ];
    for (const dir of dirs) {
      await sftpCall(sftp.sftp, 'chown', dir, rootStat.uid, rootStat.gid);
      await sftpCall(sftp.sftp, 'chmod', dir, 0o755);
    }
    await sftpCall(sftp.sftp, 'chown', remotePath, rootStat.uid, rootStat.gid);
    await sftpCall(sftp.sftp, 'chmod', remotePath, 0o644);

    return remotePath;
  } finally {
    if (connected) await sftp.end().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const local = normalizeLocalFile(args.file);
  const detected = fromPostPath(local.file);
  const slug = validateSegment(args.slug || (detected && detected.slug) || '', 'slug');
  const year = validateSegment(
    args.year || (detected && detected.year) || String(new Date().getFullYear()),
    'year'
  );
  if (!YEAR_RE.test(year)) fail('year must be four digits');

  const config = loadImageHostEnv([
    'IMGHOST_HOST',
    'IMGHOST_USER',
    'IMGHOST_PRIVATE_KEY_PATH',
    'IMGHOST_REMOTE_ROOT',
    'IMGHOST_PUBLIC_BASE_URL'
  ]);

  const root = remoteRoot(config.IMGHOST_REMOTE_ROOT);
  if (!fs.existsSync(config.IMGHOST_PRIVATE_KEY_PATH)) {
    fail(`private key not found: ${config.IMGHOST_PRIVATE_KEY_PATH}`);
  }

  await upload(config, local.file, root, year, slug, args.overwrite);

  const base = publicBase(config.IMGHOST_PUBLIC_BASE_URL);
  process.stdout.write(`${base}/posts/${year}/${slug}/${local.name}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`upload-image: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, normalizeLocalFile, validateSegment, fromPostPath };
