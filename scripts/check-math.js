/**
 * check-math.js — Math formula linter / normalizer for blog Markdown.
 *
 * Scans every ".md" file under source/ (or the files given on the command
 * line) and reports:
 *
 *  - LaTeX syntax errors: every inline $...$ / display $$...$$ segment is
 *    rendered through KaTeX (strict parser) after emulating the markdown
 *    escaping the site relies on (backslash-backslash -> backslash, so \\{,
 *    \\&, \\\\ reach MathJax the same way they do after hexo-renderer-marked).
 *  - Structural problems that silently break $$...$$ rendering:
 *      * unbalanced / unclosed display blocks;
 *      * blank lines inside a $$...$$ block;
 *      * a line inside a $$...$$ block starting with -, +, *, >, # or "1."
 *        (markdown turns those into lists / blockquotes and splits the
 *        formula);
 *      * a stray single $ left over on a line (non-math shell "$(" "$'"
 *        snippets are ignored).
 *  - Alignment / style warnings (do not fail the build): raw < > inside math
 *    (prefer \lt \gt \le \ge so they don't collide with HTML parsing).
 *
 * Usage:
 *   npm run check:math                 # check everything under source/
 *   node scripts/check-math.js FILE…   # check specific files
 *   npm run check:math:fix             # also auto-fix the safe structural
 *                                      # issues (blank lines inside display
 *                                      # math, wrapped rows that begin with a
 *                                      # list marker)
 *
 * Exit code is 1 when errors (not warnings) are found.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const katex = require('katex');

const ROOT = path.join(__dirname, '..');
const fix = process.argv.includes('--fix');
const givenFiles = process.argv.slice(2).filter((a) => a !== '--fix');

const BLOCK_START = /^(?:[-+*]|>|#|(?:\d+)\.)\s/;
const ERROR = 0;
const WARN = 1;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'public') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Emulate CommonMark `\\` -> `\`.
function unescapeMd(s) {
  return s.replace(/\\\\/g, '\\');
}

function addProblem(problems, file, line, level, code, msg) {
  problems.push({ file, line, level, code, msg });
}

function validate(tex, display, file, line, problems) {
  try {
    katex.renderToString(unescapeMd(tex), {
      throwOnError: true,
      strict: 'ignore',
      displayMode: display,
    });
  } catch (e) {
    addProblem(problems, file, line, ERROR, 'katex',
      String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 220));
  }
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === '<' || tex[i] === '>') {
      if (i > 0 && tex[i - 1] === '\\') continue; // \lt \gt \le \ge \langle …
      addProblem(problems, file, line, WARN, 'raw-<>',
        `raw "${tex[i]}" inside math (prefer \\lt / \\gt / \\le / \\ge): ` +
        `…${tex.slice(Math.max(0, i - 18), i + 18)}…`);
      break;
    }
  }
}

function stripInlineCodeAndComments(line) {
  return line
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/`[^`]*`/g, '');
}

function checkFile(file, problems) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const rel = path.relative(ROOT, file);

  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (inFence) {
      if (/^\s*```/.test(lines[i])) inFence = false;
      continue;
    }
    if (/^\s*```/.test(lines[i])) {
      inFence = true;
      continue;
    }

    const raw = lines[i];
    const line = stripInlineCodeAndComments(raw);
    const trimmed = line.trim();

    // display math block: a line that is exactly $$
    if (trimmed === '$$') {
      const start = i + 1;
      const buf = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const t = stripInlineCodeAndComments(lines[j]);
        if (t.trim() === '$$') {
          closed = true;
          break;
        }
        buf.push(lines[j]);
        j++;
      }
      if (!closed) {
        addProblem(problems, rel, start, ERROR, '$$', 'unclosed display math (no closing $$)');
        break;
      }
      buf.forEach((l, k) => {
        const t = l.trim();
        if (t === '') {
          addProblem(problems, rel, start + 1 + k, ERROR, '$$', 'blank line inside display math');
        } else if (BLOCK_START.test(t)) {
          addProblem(problems, rel, start + 1 + k, ERROR, '$$',
            `line starts with a block marker — markdown will split the formula: ${t.slice(0, 30)}`);
        }
      });
      validate(buf.join('\n'), true, rel, start, problems);
      i = j;
      continue;
    }

    // handle any $$...$$ that appears in the middle of a line, then the
    // remaining inline $...$ pairs
    let rest = line;
    while (true) {
      const open = rest.indexOf('$$');
      if (open < 0) break;
      const close = rest.indexOf('$$', open + 2);
      if (close < 0) {
        addProblem(problems, rel, i + 1, ERROR, '$$', 'unclosed display math on the line');
        break;
      }
      validate(rest.slice(open + 2, close), true, rel, i + 1, problems);
      rest = rest.slice(0, open) + '  ' + rest.slice(close + 2);
    }

    let scan = 0;
    let stray = -1;
    while (scan < rest.length) {
      const open = rest.indexOf('$', scan);
      if (open < 0) break;
      const close = rest.indexOf('$', open + 1);
      if (close < 0) {
        stray = open; // a $ with no closing partner on this line
        break;
      }
      const inner = rest.slice(open + 1, close).trim();
      if (inner.length > 0) validate(inner, false, rel, i + 1, problems);
      scan = close + 1;
    }
    if (stray >= 0) {
      const next = rest[stray + 1];
      const prev = stray > 0 ? rest[stray - 1] : '';
      const shellLike = next === '(' || next === "'" || prev === '\\';
      if (!shellLike) {
        addProblem(problems, rel, i + 1, ERROR, '$',
          `odd number of "$" delimiters (unmatched, or a formula spans lines?): ${trimmed.slice(0, 40)}`);
      }
    }
  }
}

// Auto-fix the safe structural problems: drop blank lines inside $$…$$ and
// merge wrapped rows whose continuation begins with a list marker.
function fixFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const out = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '$$') {
      out.push(lines[i]);
      continue;
    }
    let j = i + 1;
    const inner = [];
    while (j < lines.length && lines[j].trim() !== '$$') {
      inner.push(lines[j]);
      j++;
    }
    if (j >= lines.length) {
      out.push(lines[i]); // unclosed — leave as is
      continue;
    }
    const fixed = [];
    for (const l of inner) {
      const t = l.trim();
      if (t === '') {
        changed = true; // drop blank line inside display math
        continue;
      }
      if (BLOCK_START.test(t)) {
        const prev = fixed[fixed.length - 1];
        // only merge when the previous line does not itself end a row
        if (fixed.length && prev.trim() !== '' && !/\\\\$/.test(prev.trim())) {
          fixed[fixed.length - 1] = prev + ' ' + l;
          changed = true;
          continue;
        }
      }
      fixed.push(l);
    }
    out.push(lines[i], ...fixed, lines[j]);
    i = j;
  }

  if (changed) fs.writeFileSync(file, out.join('\n'));
  return changed;
}

function main() {
  const files = givenFiles.length ? givenFiles : walk(path.join(ROOT, 'source'));

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`check-math: no such file: ${f}`);
      process.exitCode = 2;
      return;
    }
  }

  if (fix) {
    for (const f of files) {
      if (fixFile(f)) console.log(`fixed: ${path.relative(ROOT, f)}`);
    }
  }

  const problems = [];
  for (const f of files) checkFile(f, problems);

  for (const p of problems) {
    const tag = p.level === WARN ? 'warn ' : 'error';
    console.log(`${tag}  ${p.file}:${p.line}  [${p.code}] ${p.msg}`);
  }

  const nErr = problems.filter((p) => p.level === ERROR).length;
  const nWarn = problems.filter((p) => p.level === WARN).length;
  console.log(`\nchecked ${files.length} file(s): ${nErr} error(s), ${nWarn} warning(s)`);
  if (nErr > 0) process.exitCode = 1;
}

if (require.main === module) main();
