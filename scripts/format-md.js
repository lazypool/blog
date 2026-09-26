/**
 * format-md.js — reflow and normalize blog Markdown sources.
 *
 * What it does:
 *   1. Rewraps ordinary paragraphs so every line stays within a target width
 *      measured in terminal columns (CJK / emoji count as 2, everything else
 *      as 1). Breaks are only inserted where the render-time "cjk-soft-break"
 *      filter reproduces the same text, so rendered output is unchanged.
 *   2. Normalizes formula delimiters to "$…$" / "$$…$$", renders display math
 *      as fenced blocks ("$$" on its own line, blank lines around the block),
 *      and standardizes formula content using the @unified-latex AST:
 *        - removes \left / \right
 *        - tightens brace groups (leading/trailing whitespace removed)
 *        - inserts a single space between top-level tokens
 *   3. Wraps long display formulas at top-level element boundaries.
 *
 * Usage:
 *   node scripts/format-md.js [--check] [--write] [--width N] [file ...]
 *
 * Default is --check: report files that would change and exit 1.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { processLatexToAstViaUnified } = require('@unified-latex/unified-latex');

const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const write = args.includes('--write');
const givenFiles = args.filter((a) => !a.startsWith('--'));
const widthIdx = args.indexOf('--width');
const WIDTH = widthIdx >= 0 ? Number(args[widthIdx + 1]) : 80;

// ---------------------------------------------------------------------------
// Width measurement (East Asian Width)
// ---------------------------------------------------------------------------

function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function cw(ch) {
  return isWide(ch.codePointAt(0)) ? 2 : 1;
}

function displayWidth(s) {
  let w = 0;
  for (const ch of s) w += cw(ch);
  return w;
}

function firstOf(s) { return s ? [...s][0] : ''; }
function lastOf(s) { const a = s ? [...s] : []; return a.length ? a[a.length - 1] : ''; }

function isCJKChar(ch) {
  if (!ch) return false;
  const c = ch.codePointAt(0);
  return (
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x20000 && c <= 0x2a6df) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0x3000 && c <= 0x303f) ||
    (c >= 0xff01 && c <= 0xff60) ||
    (c >= 0xff61 && c <= 0xff9f) ||
    (c >= 0x2018 && c <= 0x201f) ||
    c === 0x3001 || c === 0x3002 || c === 0xff0c || c === 0xff1a ||
    c === 0xff1b || c === 0xff1f || c === 0xff01
  );
}

const NO_START = '，。、；：？！）】》」』〉]}”’…—·';
const NO_END = '（【《「『〈[{“‘';

// ---------------------------------------------------------------------------
// Paragraph reflow
// ---------------------------------------------------------------------------

const INLINE = [
  /^!\[[^\]]*\]\([^)]*\)/,
  /^\[[^\]]*\]\([^)]*\)/,
  /^`+[^`]*`+/,
  /^\$[^$\n]+\$/,
  /^<[^>]+>/,
];

function tokenize(text) {
  const units = [];
  let spaceBefore = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { spaceBefore = true; i++; continue; }
    let matched = null;
    for (const re of INLINE) { const m = re.exec(text.slice(i)); if (m) { matched = m[0]; break; } }
    if (matched) {
      units.push({ text: matched, w: displayWidth(matched), spaceBefore });
      spaceBefore = false;
      i += matched.length;
      continue;
    }
    if (isWide(ch.codePointAt(0))) {
      units.push({ text: ch, w: cw(ch), spaceBefore });
      spaceBefore = false;
      i++;
      continue;
    }
    let j = i + 1;
    while (j < text.length) {
      const c = text[j];
      if (/\s/.test(c) || isWide(c.codePointAt(0))) break;
      if (INLINE.some((re) => re.test(text.slice(j)))) break;
      j++;
    }
    units.push({ text: text.slice(i, j), w: displayWidth(text.slice(i, j)), spaceBefore });
    spaceBefore = false;
    i = j;
  }
  return units;
}

function breakable(prev, cur) {
  const l = lastOf(prev.text);
  const r = firstOf(cur.text);
  if (NO_END.includes(l) || NO_START.includes(r)) return false;
  const lw = isCJKChar(l);
  const rw = isCJKChar(r);
  if (cur.spaceBefore) return !(lw && rw);
  return lw && rw;
}

function renderUnits(units) {
  return units.map((u, i) => (i > 0 && u.spaceBefore ? ' ' : '') + u.text).join('');
}

function wrapUnits(units, w) {
  const lines = [];
  const n = units.length;
  let start = 0;
  while (start < n) {
    let curW = units[start].w;
    let fit = start + 1;
    for (let k = start + 1; k < n; k++) {
      const sep = units[k].spaceBefore ? 1 : 0;
      if (curW + sep + units[k].w > w) break;
      curW += sep + units[k].w;
      fit = k + 1;
    }
    let chosen = -1;
    for (let e = fit; e > start; e--) {
      if (safeBreak(units, e)) { chosen = e; break; }
    }
    if (chosen < 0) {
      for (let e = fit + 1; e <= n; e++) {
        if (safeBreak(units, e)) { chosen = e; break; }
      }
    }
    if (chosen < 0) chosen = n;
    lines.push(renderUnits(units.slice(start, chosen)));
    start = chosen;
  }
  return lines.length ? lines : [''];
}

function safeBreak(units, e) {
  if (e <= 0 || e >= units.length) return true;
  if (!breakable(units[e - 1], units[e])) return false;
  const l = lastOf(units[e - 1].text);
  const r = firstOf(units[e].text);
  // At line start: + - * followed by backslash → markdown list marker risk
  if (e < units.length && /^[+\-*]$/.test(units[e].text) && r === '\\') return false;
  return true;
}

function mergeLines(lines) {
  return lines.reduce((acc, cur, i) => {
    cur = cur.trim();
    if (i === 0) return cur;
    const p = acc[acc.length - 1] || '';
    const c = cur[0] || '';
    if (!p || !c) return acc + cur;
    if (/\s/.test(p) || /\s/.test(c)) return acc + cur;
    if (isCJKChar(p) && isCJKChar(c)) return acc + cur;
    return acc + ' ' + cur;
  }, '');
}

// ---------------------------------------------------------------------------
// Formula normalization (AST-based)
// ---------------------------------------------------------------------------

const TEXT_LIKE_MACROS = new Set([
  'text', 'mathrm', 'operatorname', 'mbox', 'textnormal', 'textbf', 'textit',
]);

function isTextMacro(node) {
  return node && node.type === 'macro' && TEXT_LIKE_MACROS.has(node.content);
}

// Faithful printer: walk the @unified-latex AST and emit raw LaTeX without
// any normalization that printRaw might apply.
function emitFormula(nodes) {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'macro') {
      // ^ and _ are special math operators, not backslash commands.
      if (node.content === '^' || node.content === '_') {
        out += node.content;
      } else {
        out += '\\' + node.content;
      }
      if (node.args) {
        for (const arg of node.args) {
          if (arg.type !== 'argument') continue;
          const om = arg.openMark || '';
          const cm = arg.closeMark || '';
          if (Array.isArray(arg.content)) {
            // Skip empty args with no marks (missing optional arguments)
            if (arg.content.length === 0 && !om) continue;
            out += om + emitFormula(arg.content) + cm;
          }
        }
      }
    } else if (node.type === 'string') {
      out += node.content;
    } else if (node.type === 'whitespace') {
      out += ' ';
    } else if (node.type === 'group') {
      out += '{' + emitFormula(node.content || []) + '}';
    } else if (node.type === 'environment') {
      out += '\\begin{' + node.env + '}' + emitFormula(node.content || []) + '\\end{' + node.env + '}';
    }
  }
  return out;
}

function tightenGroup(group) {
  if (!Array.isArray(group.content)) return;
  while (group.content.length > 0 && group.content[0].type === 'whitespace') group.content.shift();
  while (group.content.length > 0 && group.content[group.content.length - 1].type === 'whitespace') group.content.pop();
}

function tightenArgs(macroNode) {
  if (!macroNode.args) return;
  for (const arg of macroNode.args) {
    if (arg.type !== 'argument') continue;
    if (typeof arg.content === 'string') {
      arg.content = arg.content.replace(/^\{\s+/, '{').replace(/\s+\}/, '}');
    } else if (Array.isArray(arg.content)) {
      while (arg.content.length > 0 && arg.content[0].type === 'whitespace') arg.content.shift();
      while (arg.content.length > 0 && arg.content[arg.content.length - 1].type === 'whitespace') arg.content.pop();
    }
  }
}

function isBraceMacro(node) {
  return node && node.type === 'macro' && (node.content === '{' || node.content === '}');
}

// Should a space be inserted between prev and next?
function needsSpace(prev, next, isFirst) {
  if (!prev || !next) return false;
  if (prev.type === 'whitespace' || next.type === 'whitespace') return false;
  if (isBraceMacro(prev) || isBraceMacro(next)) return false;
  // \\ line-break command
  if (prev.type === 'macro' && prev.content === '\\') return false;
  // Modifiers ^ _
  const pStr = prev.type === 'string' ? prev.content : '';
  const nStr = next.type === 'string' ? next.content : '';
  if (pStr.length > 0 && /[\^_]$/.test(pStr)) return false;
  if (nStr.length > 0 && /^[\^_]/.test(nStr)) return false;
  // Brackets
  if (pStr === '[' || pStr === '(' || pStr === ']' || pStr === ')') return false;
  if (nStr === '[' || nStr === '(' || nStr === ']' || nStr === ')') return false;
  // Punctuation
  if (pStr === ',' || pStr === ';') return false;
  if (nStr === ',' || nStr === ';') return false;
  // Group attached to preceding
  if (next.type === 'group') return false;
  // At line start, + - * followed by a control sequence: no space
  // (markdown list marker risk)
  if (isFirst && /^[+\-*]$/.test(pStr) && (nStr === '\\' || next.type === 'macro')) return false;
  return true;
}

// Normalize a single LaTeX math string using the @unified-latex AST.
// Returns the normalized string.
function normalizeFormula(tex) {
  const file = processLatexToAstViaUnified().processSync(tex);
  const root = file.result;
  let c = root.content;

  // 1. Remove \left / \right
  const rm = new Set();
  for (let i = 0; i < c.length; i++) {
    if (c[i].type === 'macro' && (c[i].content === 'left' || c[i].content === 'right')) {
      rm.add(i);
    }
  }
  c = c.filter((_, i) => !rm.has(i));

  // 2. Tighten standalone groups and macro arguments
  for (let i = 0; i < c.length; i++) {
    if (c[i].type === 'group') tightenGroup(c[i]);
    if (c[i].type === 'macro' && c[i].args && !isTextMacro(c[i])) tightenArgs(c[i]);
  }

  // 3. Remove all top-level whitespace
  c = c.filter((n) => n.type !== 'whitespace');

  // 4. Insert whitespace between adjacent non-whitespace nodes where needed
  const result = [];
  for (let i = 0; i < c.length; i++) {
    const node = c[i];
    if (result.length > 0 && needsSpace(result[result.length - 1], node, result.length === 1)) {
      result.push({ type: 'whitespace' });
    }
    result.push(node);
  }
  root.content = result;

  return emitFormula(root.content);
}

// ---------------------------------------------------------------------------
// Display math
// ---------------------------------------------------------------------------

// Walk the formula, splitting only between top-level pieces.
// Returns null when the formula must be kept verbatim (contains \\ or \begin).
function tokenizeTex(s) {
  if (/\\\\/.test(s) || s.includes('%') || /\\begin\{/.test(s)) return null;
  const pieces = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { pieces.push({ text: ' ', w: 1, space: true }); i++; continue; }
    if (ch === '\\') {
      let j = i + 1;
      if (j < s.length && /[A-Za-z]/.test(s[j])) { while (j < s.length && /[A-Za-z]/.test(s[j])) j++; }
      else if (j < s.length) { j++; }
      pieces.push({ text: s.slice(i, j), w: displayWidth(s.slice(i, j)), space: false });
      i = j;
      continue;
    }
    if (ch === '{' || ch === '[') {
      const open = ch; const close = ch === '{' ? '}' : ']';
      let j = i + 1; let depth = 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '\\') j++;
        else if (s[j] === open) depth++;
        else if (s[j] === close) depth--;
        j++;
      }
      pieces.push({ text: s.slice(i, j), w: displayWidth(s.slice(i, j)), space: false });
      i = j;
      continue;
    }
    pieces.push({ text: ch, w: cw(ch), space: false });
    i++;
  }
  return pieces;
}

function wrapTex(content, w) {
  const pieces = tokenizeTex(content);
  if (!pieces) return null;
  const lines = [];
  let cur = '';
  let curW = 0;
  for (const p of pieces) {
    if (cur && curW + p.w > w) {
      lines.push(cur.replace(/\s+$/, ''));
      cur = p.space ? '' : p.text;
      curW = p.space ? 0 : p.w;
    } else {
      cur += p.text;
      curW += p.w;
    }
  }
  lines.push(cur.replace(/\s+$/, ''));
  return lines.filter((l) => l !== '' || lines.length === 1);
}

function collectDollar(lines, start) {
  const indent = (lines[start].match(/^\s*/) || [''])[0];
  const inner = [];
  let j = start + 1;
  while (j < lines.length && lines[j].trim() !== '$$') {
    if (lines[j].trim() !== '') inner.push(lines[j].trim());
    j++;
  }
  if (j >= lines.length) return null;
  return { indent, inner, end: j };
}

function formatDollarBlock(block, w) {
  if (!block.inner.length) return [`${block.indent}$$`, `${block.indent}$$`];
  const raw = block.inner.join('\n');
  const isVerbatim = /\\\\/.test(raw) || /\\begin\{/.test(raw) || raw.includes('%');
  if (isVerbatim) {
    const body = block.inner.map((l) => normalizeFormula(l));
    return [`${block.indent}$$`, ...body.map((l) => (l ? block.indent + l : '')), `${block.indent}$$`];
  }
  const content = normalizeFormula(block.inner.join(' '));
  const wrapped = wrapTex(content, w);
  const body = wrapped || [content];
  return [`${block.indent}$$`, ...body.map((l) => (l ? block.indent + l : '')), `${block.indent}$$`];
}

// ---------------------------------------------------------------------------
// Escaped math delimiters:  \\( … \\)  ->  $ … $   and   \\[ … \\]  ->  $$ … $$
// (single backslashes are literal prose and are left alone)
// ---------------------------------------------------------------------------

function convertEscaped(line) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\' && line[i + 1] === '\\') {
      let k = i;
      while (line[k] === '\\') k++;
      if (k - i === 2) {
        const open = line[k];
        if (open === '(' || open === '[') {
          const closeSeq = open === '(' ? '\\\\)' : '\\\\]';
          const close = line.indexOf(closeSeq, k + 1);
          if (close > -1) {
            const inner = line.slice(k + 1, close);
            out += (open === '(' ? '$' : '$$') + inner + (open === '(' ? '$' : '$$');
            i = close + 3;
            continue;
          }
        }
      }
      out += line.slice(i, k);
      i = k;
      continue;
    }
    out += line[i];
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Inline math normalization
// ---------------------------------------------------------------------------

function normalizeInlineMath(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const close = text.indexOf('$$', i + 2);
      if (close < 0) { out += text.slice(i); break; }
      out += text.slice(i, close + 2);
      i = close + 2;
      continue;
    }
    if (text[i] === '$') {
      const close = text.indexOf('$', i + 1);
      if (close < 0 || close === i + 1) { out += text[i]; i++; continue; }
      const inner = text.slice(i + 1, close);
      out += '$' + normalizeFormula(inner) + '$';
      i = close + 1;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Block classification
// ---------------------------------------------------------------------------

function isFence(line) {
  const m = /^(\s*)(`{3,}|~{3,})/.exec(line);
  return m ? { indent: m[1], marker: m[2][0], len: m[2].length } : null;
}

function listPrefix(line) {
  const m = /^(\s*(?:[-*+]|\d+\.) )/.exec(line);
  return m ? m[1] : null;
}

function isListCont(line, contentW) {
  if (line.trim() === '') return false;
  if (!/^ /.test(line)) return false;
  const first = line.search(/\S/);
  if (first < 0 || first > contentW) return false;
  if (first === contentW && listPrefix(line) !== null) return false;
  return first >= contentW;
}

function maskInlineCode(line) {
  return line.replace(/`[^`]*`/g, (m) => 'x'.repeat(m.length));
}

function expandDollar(lines) {
  const out = [];
  let fence = null;
  let i = 0;
  if (lines[0] && lines[0].trim() === '---') {
    out.push(lines[0]); i = 1;
    while (i < lines.length && lines[i].trim() !== '---') out.push(lines[i++]);
    if (i < lines.length) out.push(lines[i++]);
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    const f = isFence(line);
    if (fence) {
      out.push(line);
      if (f && f.marker === fence.marker && f.len >= fence.len) fence = null;
      continue;
    }
    if (f) { fence = f; out.push(line); continue; }
    if (line.trim().startsWith('$$')) { out.push(line); continue; }
    const m = /\$\$([\s\S]+?)\$\$/.exec(maskInlineCode(line));
    if (m) {
      const before = line.slice(0, m.index).trim();
      const inner = line.slice(m.index + 2, m.index + m[0].length - 2).trim();
      const after = line.slice(m.index + m[0].length).trim();
      if (before) out.push(before);
      out.push('$$'); out.push(inner); out.push('$$');
      if (after) out.push(after);
      continue;
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

function formatContent(text, w) {
  let lines = text.split('\n').map(convertEscaped);
  lines = expandDollar(lines);
  lines = lines.map(normalizeInlineMath);
  const out = [];
  let i = 0;

  // YAML front matter
  if (lines[0] && lines[0].trim() === '---') {
    out.push(lines[0]); i = 1;
    while (i < lines.length && lines[i].trim() !== '---') out.push(lines[i++]);
    if (i < lines.length) out.push(lines[i++]);
  }

  let fence = null;
  const blankBefore = (arr) => { if (arr.length && arr[arr.length - 1].trim() !== '') arr.push(''); };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const f = isFence(line);
    if (fence) {
      out.push(line);
      if (f && f.marker === fence.marker && f.len >= fence.len) fence = null;
      i++; continue;
    }
    if (f) { fence = f; out.push(line); i++; continue; }

    if (trimmed === '') { out.push(line); i++; continue; }

    // Display math fences
    if (trimmed === '$$') {
      const block = collectDollar(lines, i);
      if (block) {
        blankBefore(out);
        out.push(...formatDollarBlock(block, w));
        i = block.end + 1;
        if (i < lines.length && lines[i].trim() !== '') out.push('');
        continue;
      }
    }
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      const block = { indent: (line.match(/^\s*/) || [''])[0], inner: [trimmed.slice(2, -2).trim()], end: i };
      blankBefore(out);
      out.push(...formatDollarBlock(block, w));
      i++;
      if (i < lines.length && lines[i].trim() !== '') out.push('');
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const bqInner = [];
      const bqPrefix = line.match(/^>\s?/)[0];
      while (i < lines.length) {
        const l = lines[i]; const t = l.trim();
        if (t === '' || !t.startsWith('>')) break;
        bqInner.push(l.replace(/^>\s?/, ''));
        i++;
      }
      const hasList = bqInner.some((l) => /^(\s*(?:[-*+]|\d+\.)\s)/.test(l));
      if (hasList) {
        bqInner.forEach((inner) => out.push((bqPrefix + inner).replace(/\s+$/, '')));
      } else {
        const merged = mergeLines(bqInner);
        if (merged.trim() === '') {
          bqInner.forEach((inner) => out.push(bqPrefix + inner));
        } else {
          const units = tokenize(merged);
          wrapUnits(units, Math.max(w - displayWidth(bqPrefix), 10)).forEach((l) => out.push(bqPrefix + l));
        }
      }
      continue;
    }

    // List item
    const lpf = listPrefix(line);
    if (lpf) {
      const liInner = [line.slice(lpf.length)];
      const contentW = displayWidth(lpf);
      i++;
      while (i < lines.length && isListCont(lines[i], contentW)) {
        liInner.push(lines[i].trim());
        i++;
      }
      const merged = mergeLines(liInner);
      if (merged.trim() === '') {
        liInner.forEach((l) => out.push(lpf + l));
      } else {
        const units = tokenize(merged);
        const wrapped = wrapUnits(units, Math.max(w - contentW, 10));
        const indent = ' '.repeat(contentW);
        wrapped.forEach((l, idx) => out.push(idx === 0 ? lpf + l : indent + l));
      }
      continue;
    }

    // Other protected lines
    if (/^\s/.test(line) || isSpecial(trimmed)) {
      out.push(line); i++; continue;
    }

    // Paragraph
    const para = [];
    while (i < lines.length) {
      const l = lines[i]; const t = l.trim();
      if (t === '' || /^\s/.test(l) || isSpecial(t)) break;
      if (t === '$$') break;
      if (t.startsWith('$$') && t.endsWith('$$')) break;
      para.push(l); i++;
    }
    if (para.some((l) => /\s\s$/.test(l) || /\\$/.test(l))) {
      out.push(...para);
    } else {
      const units = tokenize(mergeLines(para));
      out.push(...wrapUnits(units, w));
    }
  }

  return out.join('\n');
}

function isSpecial(trimmed) {
  if (/^#{1,6}(\s|$)/.test(trimmed)) return true;
  if (/^([-*+]|\d+\.)\s/.test(trimmed)) return true;
  if (/^>/.test(trimmed)) return true;
  if (/^\|/.test(trimmed)) return true;
  if (/^</.test(trimmed)) return true;
  if (/^\[[^\]]+\]:\s/.test(trimmed)) return true;
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'public' || ent.name === '_assets' || ent.name === '_drafts') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function main() {
  const files = givenFiles.length ? givenFiles : walk(path.join(ROOT, 'source'));
  let changed = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`format-md: no such file: ${file}`);
      process.exitCode = 2; return;
    }
    const original = fs.readFileSync(file, 'utf8');
    const formatted = formatContent(original, WIDTH);
    if (formatted === original) continue;
    changed++;
    const rel = path.relative(ROOT, file);
    if (write) { fs.writeFileSync(file, formatted); console.log(`formatted: ${rel}`); }
    else { console.log(`would change: ${rel}`); }
  }
  if (!write && changed) process.exitCode = 1;
  if (!write) console.log(`\n${changed} file(s) would change`);
}

if (require.main === module) main();

module.exports = { formatContent, normalizeFormula };
