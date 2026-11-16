/**
 * Shared, network-free logic for the image-host workflow.
 *
 * - configuration: `.env.imgbed.host` plus `IMGHOST_*` environment overrides
 * - path mapping: `source/_posts/<year>/<slug>/<file>` <-> `<year>/<slug>/<file>`
 * - Markdown image references (`![](./x.png)` and `<img src="x.png">`)
 * - content hashing and the manifest diff used by `tools/images.js`
 *
 * `scripts/rewrite-images.js` also loads this file during `hexo generate`, so
 * it must not require anything outside Node built-ins. The config contains
 * local credentials and paths: never print the parsed object or the private
 * key; callers should only expose field names in errors.
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');
const ENV_FILE = path.join(ROOT, '.env.imgbed.host');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const YEAR_RE = /^\d{4}$/;
const MANIFEST_VERSION = 1;

// ---- configuration ----

function parseEnvFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`image host config not found: ${file}`);
  }

  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(text);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadImageHostEnv(required, envFile = ENV_FILE, env = process.env) {
  const values = fs.existsSync(envFile) ? parseEnvFile(envFile) : {};
  const merged = { ...values };
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('IMGHOST_') && value) merged[key] = value;
  }

  const missing = required.filter((key) => !merged[key]);
  if (missing.length) {
    throw new Error(`image host config missing: ${missing.join(', ')} (${envFile})`);
  }

  return merged;
}

function remoteRoot(value) {
  if (!value || !value.startsWith('/')) throw new Error('IMGHOST_REMOTE_ROOT must be an absolute path');
  if (value.split('/').includes('..')) throw new Error('IMGHOST_REMOTE_ROOT must not contain ..');
  const root = path.posix.normalize(value).replace(/\/+$/, '');
  if (!root) throw new Error('IMGHOST_REMOTE_ROOT must not be /');
  return root;
}

function publicBase(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('IMGHOST_PUBLIC_BASE_URL must be a valid URL');
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error('IMGHOST_PUBLIC_BASE_URL must use http or https');
  }
  return value.replace(/\/+$/, '');
}

// ---- path mapping ----

function isSegment(value) {
  return Boolean(value) && value !== '.' && value !== '..' && SEGMENT_RE.test(value);
}

function validateSegment(value, label) {
  if (!isSegment(value)) {
    throw new Error(`${label} must match [A-Za-z0-9._-]+ and must not be . or ..`);
  }
  return value;
}

function validateYear(value) {
  if (!YEAR_RE.test(value || '')) throw new Error('year must be four digits');
  return value;
}

function isImageName(name) {
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

/**
 * Map a local file to its key `<year>/<slug>/<file>`, which is also its path
 * below `posts/` on the image host. Returns null for files outside the
 * `source/_posts/<year>/<slug>/` layout; throws for unsafe names inside it.
 */
function imageKey(file, postsDir = POSTS_DIR) {
  const relative = path.relative(postsDir, file).split(path.sep).join('/');
  const match = /^(\d{4})\/([^/]+)\/([^/]+)$/.exec(relative);
  if (!match || !isImageName(match[3])) return null;
  validateSegment(match[2], `slug in ${relative}`);
  validateSegment(match[3], `filename in ${relative}`);
  return relative;
}

function splitKey(key) {
  const [year, slug, name] = key.split('/');
  return { year, slug, name };
}

function inScope(key, scope = {}) {
  const { year, slug } = splitKey(key);
  if (scope.year && year !== scope.year) return false;
  if (scope.slug && slug !== scope.slug) return false;
  if (scope.keys && !scope.keys.has(key)) return false;
  return true;
}

function walk(dir, accept, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, accept, out);
    else if (ent.isFile() && accept(ent.name)) out.push(full);
  }
  return out;
}

/** Map of key -> absolute path for every post image under `postsDir`. */
function localImages(postsDir = POSTS_DIR) {
  const out = new Map();
  for (const file of walk(postsDir, isImageName)) {
    const key = imageKey(file, postsDir);
    if (key) out.set(key, file);
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
}

// ---- Markdown image references ----

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g;
const HTML_IMAGE_RE = /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi;

/** Return the bare file name for a same-folder relative image, or ''. */
function relativeImage(href) {
  if (!href) return '';
  const raw = String(href).trim();
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) || /^(?:data:|#|\/)/i.test(raw)) return '';
  const file = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (file.includes('/') || file.includes('..') || file.startsWith('.')) return '';
  return isImageName(file) ? file : '';
}

const BLOCK_CODE_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|<!--[\s\S]*?-->)/g;
const INLINE_CODE_RE = /(`[^`\n]*`)/g;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s/;

/**
 * Split `text` into alternating [prose, code, prose, ...] around indented
 * code blocks. Conservative on purpose: a run of lines indented by four
 * spaces or a tab counts as code only after a blank line whose preceding text
 * is neither a list item nor indented itself, so list continuations (and the
 * images in them) stay prose. `atLineStart` is false when `text` begins in
 * the middle of a line.
 */
function splitIndentedCode(text, atLineStart) {
  const parts = [''];
  let inCode = false;
  let prevBlank = atLineStart;
  let lastText = '';
  for (const [i, line] of text.split(/(?<=\n)/).entries()) {
    const blank = !line.trim();
    const indented = !blank && /^(?: {4}|\t)/.test(line);
    const midLine = i === 0 && !atLineStart;
    if (inCode && !blank && !indented) {
      inCode = false;
      parts.push('');
    } else if (!inCode && !midLine && indented && prevBlank && !LIST_ITEM_RE.test(lastText) && !/^\s/.test(lastText)) {
      inCode = true;
      parts.push('');
    }
    parts[parts.length - 1] += line;
    if (!blank) lastText = line;
    prevBlank = blank && !midLine;
  }
  return parts;
}

/**
 * Apply `map` to the parts of `text` outside code: fenced blocks, HTML
 * comments, indented code blocks and inline code are left untouched.
 */
function mapOutsideCode(text, map) {
  const source = String(text || '');
  let offset = 0;
  return source
    .split(BLOCK_CODE_RE)
    .map((block, i) => {
      const atLineStart = offset === 0 || source[offset - 1] === '\n';
      offset += block.length;
      if (i % 2) return block;
      return splitIndentedCode(block, atLineStart)
        .map((part, j) => {
          if (j % 2) return part;
          return part
            .split(INLINE_CODE_RE)
            .map((piece, k) => (k % 2 ? piece : map(piece)))
            .join('');
        })
        .join('');
    })
    .join('');
}

/** File names of relative images referenced by one Markdown document. */
function imageRefs(markdown) {
  const files = new Set();
  mapOutsideCode(markdown, (text) => {
    for (const re of [MARKDOWN_IMAGE_RE, HTML_IMAGE_RE]) {
      for (const match of text.matchAll(re)) {
        const file = relativeImage(match[2]);
        if (file) files.add(file);
      }
    }
    return text;
  });
  return [...files];
}

/** Map of key -> Markdown file for every image referenced by a post. */
function referencedImages(postsDir = POSTS_DIR) {
  const out = new Map();
  for (const file of walk(postsDir, (name) => name.endsWith('.md'))) {
    const relative = path.relative(postsDir, file).split(path.sep).join('/');
    const match = /^(\d{4})\/([^/]+)\.md$/.exec(relative);
    if (!match || !isSegment(match[2])) continue;
    for (const name of imageRefs(fs.readFileSync(file, 'utf8'))) {
      if (isSegment(name)) out.set(`${match[1]}/${match[2]}/${name}`, file);
    }
  }
  return out;
}

// ---- hashing and manifest ----

function hashFile(file) {
  const data = fs.readFileSync(file);
  return { size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
}

function emptyManifest() {
  return { version: MANIFEST_VERSION, files: {} };
}

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parseManifest(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`image manifest is not valid JSON: ${error.message}`);
  }
  if (!isPlainObject(data) || data.version !== MANIFEST_VERSION) {
    throw new Error(`unsupported image manifest (expected version ${MANIFEST_VERSION})`);
  }
  if (!isPlainObject(data.files)) throw new Error('image manifest "files" must be an object');
  const files = {};
  for (const [key, entry] of Object.entries(data.files)) {
    const parts = key.split('/');
    if (parts.length !== 3 || !YEAR_RE.test(parts[0]) || !parts.every(isSegment)) {
      throw new Error(`image manifest contains an invalid path: ${key}`);
    }
    if (
      !isPlainObject(entry) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      !(entry.sha256 === null || /^[0-9a-f]{64}$/.test(entry.sha256))
    ) {
      throw new Error(`image manifest entry is malformed: ${key}`);
    }
    files[key] = { size: entry.size, sha256: entry.sha256 };
  }
  return { version: MANIFEST_VERSION, files };
}

function serializeManifest(manifest) {
  const files = {};
  for (const key of Object.keys(manifest.files).sort()) files[key] = manifest.files[key];
  return `${JSON.stringify({ version: MANIFEST_VERSION, updatedAt: new Date().toISOString(), files }, null, 2)}\n`;
}

/**
 * Reconcile the manifest with a remote tree listing (`key -> { size }`) for
 * the keys in `scope`. Remote files keep their recorded hash only when the
 * size still matches; otherwise the hash becomes null ("content unknown"), so
 * the next sync re-uploads the local copy. Entries missing remotely are
 * dropped. Returns the keys found remotely but absent from the old manifest.
 */
function mergeRemoteListing(manifest, remote, scope = {}) {
  const untracked = [];
  for (const key of Object.keys(manifest.files)) {
    if (inScope(key, scope) && !remote.has(key)) delete manifest.files[key];
  }
  for (const [key, { size }] of remote) {
    if (!inScope(key, scope)) continue;
    const entry = manifest.files[key];
    if (!entry) untracked.push(key);
    manifest.files[key] = entry && entry.size === size ? entry : { size, sha256: null };
  }
  return untracked.sort();
}

/**
 * Compare local hashes with the manifest.
 *
 *   local       Map key -> { size, sha256 } for in-scope local images
 *   manifest    { files: { key: { size, sha256|null } } }
 *   referenced  Set/Map of keys referenced by Markdown (whole tree)
 *
 * Result lists (all sorted keys):
 *   upload     [{ key, reason: 'new' | 'modified' | 'unknown' | 'forced' }]
 *   unchanged  local hash equals the manifest hash
 *   deleted    in the manifest, gone locally, not referenced: safe to prune
 *   missing    in the manifest, gone locally, still referenced: restore it
 *              with `download`, never prune it
 */
function planSync({ local, manifest, referenced = new Set(), scope = {}, force = false }) {
  const plan = { upload: [], unchanged: [], deleted: [], missing: [] };
  for (const [key, { sha256 }] of local) {
    if (!inScope(key, scope)) continue;
    const entry = manifest.files[key];
    let reason = '';
    if (!entry) reason = 'new';
    else if (!entry.sha256) reason = 'unknown';
    else if (entry.sha256 !== sha256) reason = 'modified';
    else if (force) reason = 'forced';
    if (reason) plan.upload.push({ key, reason });
    else plan.unchanged.push(key);
  }
  for (const key of Object.keys(manifest.files)) {
    if (!inScope(key, scope) || local.has(key)) continue;
    (referenced.has(key) ? plan.missing : plan.deleted).push(key);
  }
  plan.upload.sort((a, b) => a.key.localeCompare(b.key));
  plan.unchanged.sort();
  plan.deleted.sort();
  plan.missing.sort();
  return plan;
}

module.exports = {
  ENV_FILE,
  IMAGE_EXT,
  POSTS_DIR,
  ROOT,
  HTML_IMAGE_RE,
  MARKDOWN_IMAGE_RE,
  emptyManifest,
  hashFile,
  imageKey,
  imageRefs,
  inScope,
  isImageName,
  loadImageHostEnv,
  localImages,
  mapOutsideCode,
  mergeRemoteListing,
  parseEnvFile,
  parseManifest,
  planSync,
  publicBase,
  referencedImages,
  relativeImage,
  remoteRoot,
  serializeManifest,
  splitKey,
  validateSegment,
  validateYear,
};
