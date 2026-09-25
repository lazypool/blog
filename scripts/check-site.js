/**
 * check-site.js — site-level consistency linter for the blog.
 *
 * Verifies things markdownlint / check-math cannot see:
 *   1. image references exist  — `index_img` front matter, `![…](url)` images
 *      and `<img src>` in every post (local paths only; http(s)/data skipped);
 *   2. front matter `date` matches the folder/`MM-DD-` file-name convention;
 *   3. tag / category hygiene — empty values, duplicate entries in one post,
 *      and near-duplicate tags that differ only by case / spaces.
 *
 * Usage:  npm run lint:site             (scans source/_posts)
 *         node scripts/check-site.js --tags   (also print tag frequency)
 *         node scripts/check-site.js [file …]
 *
 * Exit code is 1 when errors (missing images, date mismatches) are found.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const givenFiles = process.argv.slice(2).filter((a) => a !== '--tags');
const listTags = process.argv.includes('--tags');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'public' || ent.name === '_assets') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const meta = {};
  let lastKey = null;
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(line);
    if (kv) {
      lastKey = kv[1];
      meta[lastKey] = [];
      const v = kv[2].trim();
      if (v.startsWith('[')) {
        meta[lastKey] = v
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else if (v !== '') {
        meta[lastKey].push(v.replace(/^['"]|['"]$/g, ''));
      }
    } else if (lastKey && /^\s+-\s+/.test(line)) {
      meta[lastKey].push(line.replace(/^\s+-\s+/, '').trim());
    }
  }
  return meta;
}

function stripCode(text) {
  let t = text.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/`[^`\n]*`/g, '');
  return t;
}

function cleanSrc(url) {
  url = url.replace(/\\/g, '/').split(/[?#]/)[0].trim();
  if (!url || /^(https?:|data:|#|\/\/)/i.test(url)) return null;
  return url;
}

function exists(rel) {
  try {
    return fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isFile();
  } catch {
    return false;
  }
}

function main() {
  const files = givenFiles.length ? givenFiles : walk(path.join(ROOT, 'source/_posts'));
  const errs = [];
  const warns = [];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`check-site: no such file: ${file}`);
      process.exitCode = 2;
      return;
    }
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const text = fs.readFileSync(file, 'utf8');
    const meta = frontMatter(text);

    // ---- 1. images exist ----
    const dir = rel.slice(0, rel.lastIndexOf('/') + 1);
    const slug = path.basename(rel, '.md');
    const assetDirs = [dir + slug + '/', dir];

    const check = (url, where) => {
      const u = cleanSrc(url);
      if (!u) return;
      let found = false;
      if (u.startsWith('/')) {
        found = exists('source' + u) || exists('themes/fluid/source' + u);
      } else {
        for (const d of assetDirs) {
          if (exists(d + u)) { found = true; break; }
        }
        if (!found) found = exists('source/img/' + u);
      }
      if (!found) errs.push(`${rel}  ${where} 图片不存在: ${u}`);
    };

    if (meta.index_img && meta.index_img.length) {
      const u = meta.index_img[0];
      if (u && !exists('source/' + u) && !exists('themes/fluid/source/' + u)) {
        errs.push(`${rel}  front matter index_img 图片不存在: ${u}`);
      }
    }

    const body = stripCode(text);
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) check(m[1], 'markdown 图片');
    for (const m of body.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) check(m[1], '<img>');

    // ---- 2. date vs folder/file name ----
    const relParts = rel.split('/');
    if (relParts.length >= 2) {
      const year = relParts[relParts.length - 2];
      const base = relParts[relParts.length - 1];
      const dm = /^(\d{2})-(\d{2})-/.exec(base);
      if (dm && meta.date && meta.date.length) {
        const want = `${year}-${dm[1]}-${dm[2]}`;
        if (!meta.date[0].startsWith(want)) {
          warns.push(`${rel}  日期与目录不一致: 目录=${want}  front matter=${meta.date[0]}`);
        }
      }
    }

    // ---- 3. tag / category hygiene ----
    for (const key of ['tags', 'categories']) {
      const vals = meta[key] || [];
      const seen = [];
      for (const v of vals) {
        if (v === '') warns.push(`${rel}  ${key} 存在空项`);
        const norm = v.toLowerCase().replace(/[\s_\-/]+/g, '');
        if (!norm) continue;
        const dupe = seen.find((s) => s.norm === norm && s.v !== v);
        if (dupe) warns.push(`${rel}  ${key} 近重复项: "${dupe.v}" vs "${v}"`);
        else if (seen.some((s) => s.v === v)) warns.push(`${rel}  ${key} 完全重复项: "${v}"`);
        seen.push({ norm, v });
      }
    }
  }

  const totalTags = new Map();
  const normMap = new Map(); // normalized -> [{v, file}]
  const normOf = (v) => v.toLowerCase().replace(/[\s_\-/]+/g, '');
  if (listTags) {
    for (const file of files) {
      const meta = frontMatter(fs.readFileSync(file, 'utf8'));
      for (const key of ['tags', 'categories']) {
        for (const v of meta[key] || []) {
          totalTags.set(v, (totalTags.get(v) || 0) + 1);
          if (!normOf(v)) continue;
          if (!normMap.has(key)) normMap.set(key, new Map());
          const m = normMap.get(key);
          if (!m.has(normOf(v))) m.set(normOf(v), []);
          m.get(normOf(v)).push({ v, file });
        }
      }
    }
    for (const [key, m] of normMap) {
      for (const [, list] of m) {
        const uniq = [...new Set(list.map((x) => x.v))];
        if (uniq.length > 1) {
          warns.push(`${key} 跨文章近重复: ${uniq.join(' vs ')}（例 ${list[0].file.replace('source/_posts/', '')}）`);
        }
      }
    }
    console.log('\n== tags 词频（出现次数）==');
    for (const [t, n] of [...totalTags.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(2)}  ${t}`);
  }

  for (const w of warns) console.log(`warn  ${w}`);
  for (const e of errs) console.log(`error ${e}`);

  console.log(`\nchecked ${files.length} file(s): ${errs.length} error(s), ${warns.length} warning(s)`);
  if (errs.length) process.exitCode = 1;
}

if (require.main === module) main();
