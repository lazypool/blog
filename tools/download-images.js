'use strict';

/**
 * Download post images from the public image host back into source/_posts.
 *
 * Markdown keeps relative paths like `./image.png`; the upload tool stores the
 * matching file at `<IMGHOST_PUBLIC_BASE_URL>/posts/<year>/<slug>/<file>`. This
 * script reads those references and restores the local files so `hexo server`
 * can display them without rewriting anything.
 *
 * Usage:
 *   node tools/download-images.js [--overwrite] [--dry-run] [--year <year>] [--slug <slug>]
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadImageHostEnv } = require('./imgbed-env');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const YEAR_RE = /^\d{4}$/;
const CONCURRENCY = 4;

function usage() {
  return [
    'usage: node tools/download-images.js [--overwrite] [--dry-run] [--year <year>] [--slug <slug>]',
    '  --overwrite  replace local files that already exist',
    '  --dry-run    list what would be downloaded without writing files',
    '  --year       only download one year',
    '  --slug       only download one post folder'
  ].join('\n');
}

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = { overwrite: false, dryRun: false, year: '', slug: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--overwrite') args.overwrite = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--year') args.year = argv[++i] || '';
    else if (arg === '--slug') args.slug = argv[++i] || '';
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  if (args.year && !YEAR_RE.test(args.year)) fail('year must be four digits');
  if (args.slug && (!/^[A-Za-z0-9._-]+$/.test(args.slug) || args.slug === '.' || args.slug === '..')) {
    fail('slug must match [A-Za-z0-9._-]+');
  }
  return args;
}

function walkMarkdown(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMarkdown(full, out);
    else if (ent.isFile() && ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function postLocation(file) {
  const relative = path.relative(POSTS_DIR, file).split(path.sep).join('/');
  const match = /^(\d{4})\/([^/]+)\.md$/.exec(relative);
  if (!match) return null;
  return { year: match[1], slug: match[2] };
}

function relativeImage(href) {
  if (!href) return '';
  const raw = String(href).trim();
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) || /^(?:data:|#|\/)/i.test(raw)) return '';
  const file = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (file.includes('/') || file.includes('..') || file.startsWith('.')) return '';
  if (!IMAGE_EXT.has(path.extname(file).toLowerCase())) return '';
  return file;
}

function imagesIn(markdown) {
  const text = String(markdown || '').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, ' ');
  const files = new Set();

  let match;
  const markdownImage = /!\[[^\]]*\]\(([^)\s]+)(?:[^)]*)\)/g;
  while ((match = markdownImage.exec(text))) {
    const file = relativeImage(match[1]);
    if (file) files.add(file);
  }

  const htmlImage = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = htmlImage.exec(text))) {
    const file = relativeImage(match[1]);
    if (file) files.add(file);
  }

  return Array.from(files);
}

function collectItems(args) {
  const items = [];
  const seen = new Set();

  walkMarkdown(POSTS_DIR).forEach((file) => {
    const location = postLocation(file);
    if (!location) return;
    if (args.year && location.year !== args.year) return;
    if (args.slug && location.slug !== args.slug) return;

    const markdown = fs.readFileSync(file, 'utf8');
    imagesIn(markdown).forEach((name) => {
      const dest = path.join(POSTS_DIR, location.year, location.slug, name);
      if (seen.has(dest)) return;
      seen.add(dest);
      items.push({
        name,
        dest,
        relative: path.relative(ROOT, dest).split(path.sep).join('/'),
        url: `${location.year}/${location.slug}/${name}`
      });
    });
  });

  return items.sort((a, b) => a.relative.localeCompare(b.relative));
}

async function download(item, base) {
  const response = await fetch(`${base}/posts/${item.url}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.mkdir(path.dirname(item.dest), { recursive: true });
  await fs.promises.writeFile(item.dest, buffer);
  return buffer.length;
}

async function runPool(items, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadImageHostEnv(['IMGHOST_PUBLIC_BASE_URL']);
  const base = config.IMGHOST_PUBLIC_BASE_URL.replace(/\/+$/, '');
  const items = collectItems(args);

  if (!items.length) {
    process.stderr.write('download-images: no matching image references\n');
    return;
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(items, async (item) => {
    if (!args.overwrite && fs.existsSync(item.dest)) {
      skipped += 1;
      return;
    }
    if (args.dryRun) {
      process.stdout.write(`would download ${item.relative}\n`);
      return;
    }
    try {
      const bytes = await download(item, base);
      downloaded += 1;
      process.stdout.write(`downloaded ${item.relative} (${bytes} bytes)\n`);
    } catch (error) {
      failed += 1;
      process.stderr.write(`failed ${item.relative}: ${error.message}\n`);
    }
  });

  process.stdout.write(
    `download-images: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed\n`
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`download-images: ${error.message}\n`);
  process.exitCode = 1;
});
