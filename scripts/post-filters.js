/**
 * post-filters.js — Hexo content filters for blog posts.
 *
 * Registers every filter that normalises post content around the Markdown
 * renderer. All hooks live in one module so their relative order is explicit
 * and stable:
 *
 *   1. cjk-bold-fix   (before_post_render) — insert a word-joiner between
 *      bold markers and CJK punctuation so emphasis survives rendering.
 *      (after_post_render) — strip every word-joiner again.
 *   2. cjk-soft-break (before_post_render) — merge soft-wrapped paragraph
 *      lines and insert a space between CJK and non-CJK runs, following the
 *      rules of CSS Text Module Level 3.
 *   3. math-underscore (before_post_render) — escape "_" inside inline and
 *      display math so Markdown does not read it as emphasis before MathJax.
 */

'use strict';

/* global hexo */

// ---------------------------------------------------------------------------
// 1. CJK bold fix
// ---------------------------------------------------------------------------

// Word joiner: an invisible character that stops CommonMark from treating the
// adjacent "*" as emphasis when it touches CJK punctuation.
const WORD_JOINER = '\u2060';

const CJK_PUNCT = '\\u3000-\\u303f\\uff00-\\uffef\\u2018\\u2019\\u201c\\u201d';
const ASCII_PUNCT = '\\x21-\\x2F\\x3A-\\x40\\x5B-\\x60\\x7B-\\x7E';

hexo.extend.filter.register('before_post_render', function (data) {
  data.content = data.content.replace(
    new RegExp(
      '(```[\\s\\S]*?```|`[^`]*`)|([' + CJK_PUNCT + '])(\\*+)(?=[^\\s*' + CJK_PUNCT + '])|' +
      '(?<![' + ASCII_PUNCT + CJK_PUNCT + '*])(\\*+)([' + CJK_PUNCT + '])',
      'g'
    ),
    (match, code, punct, stars, stars2, punct2) => {
      if (code) return code;
      if (punct && stars) return punct + WORD_JOINER + stars;
      if (stars2 && punct2) return stars2 + WORD_JOINER + punct2;
      return match;
    }
  );
  return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
  data.content = data.content.replace(/\u2060/g, '');
  return data;
});

// ---------------------------------------------------------------------------
// 2. CJK soft break
// ---------------------------------------------------------------------------

// Check if a character is CJK (fullwidth / wide), following the Unicode East
// Asian Width property and CSS Text Module Level 3.
function isCJK(char) {
  if (!char) return false;
  const c = char.codePointAt(0);
  return (
    // CJK Unified Ideographs
    (c >= 0x4e00 && c <= 0x9fff) ||
    // CJK Unified Ideographs Extension A
    (c >= 0x3400 && c <= 0x4dbf) ||
    // CJK Unified Ideographs Extension B
    (c >= 0x20000 && c <= 0x2a6df) ||
    // CJK Compatibility Ideographs
    (c >= 0xf900 && c <= 0xfaff) ||
    // CJK Symbols and Punctuation
    (c >= 0x3000 && c <= 0x303f) ||
    // Fullwidth ASCII and Halfwidth Katakana
    (c >= 0xff01 && c <= 0xff60) ||
    (c >= 0xff61 && c <= 0xff9f) ||
    // CJK punctuation
    (c >= 0x2018 && c <= 0x201f) ||
    c === 0x3001 || c === 0x3002 || c === 0xff0c || c === 0xff1a ||
    c === 0xff1b || c === 0xff1f || c === 0xff01
  );
}

// Decide whether a space is needed between two adjacent characters.
// CSS Text Module Level 3: no space between two CJK characters, a space
// otherwise.
function needSpace(prev, next) {
  if (!prev || !next) return false;
  // Either side is already whitespace.
  if (/\s/.test(prev) || /\s/.test(next)) return false;
  // Both sides are CJK.
  if (isCJK(prev) && isCJK(next)) return false;
  return true;
}

// Merge an array of lines into a single line, inserting spaces where needed.
function mergeLines(lines) {
  return lines.reduce((acc, cur, i) => {
    if (i === 0) return cur;
    const prevEnd = acc[acc.length - 1];
    const curStart = cur[0];
    return acc + (needSpace(prevEnd, curStart) ? ' ' : '') + cur;
  }, '');
}

// Merge soft-wrapped paragraph lines before rendering: consecutive non-empty
// lines that are not special syntax become one line. Empty lines, code
// blocks, headings, lists, tables and HTML tags are left untouched.
// Blockquote content is merged and re-prefixed with "> ".
hexo.extend.filter.register('before_post_render', function (data) {
  const lines = data.content.split('\n');
  const result = [];
  let inCodeBlock = false;
  let buffer = [];
  let inBlockquote = false;

  const flush = () => {
    if (buffer.length > 0) {
      const prefix = inBlockquote ? '> ' : '';
      result.push(prefix + mergeLines(buffer));
      buffer = [];
    }
    inBlockquote = false;
  };

  for (const line of lines) {
    // Code block boundary
    if (/^`{3,}/.test(line)) {
      flush();
      result.push(line);
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Preserve lines inside code blocks
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Empty line: paragraph separator
    if (/^\s*$/.test(line)) {
      flush();
      result.push(line);
      continue;
    }

    // Special syntax lines: no merge, keep as-is
    if (
      /^#{1,6}\s/.test(line) ||       // Heading
      /^[-*+]\s/.test(line) ||        // Unordered list
      /^\d+\.\s/.test(line) ||        // Ordered list
      /^\|/.test(line) ||             // Table
      /^<{2,}/.test(line) ||          // HTML tag
      /^\[.*\]:\s/.test(line)         // Link reference
    ) {
      flush();
      result.push(line);
      continue;
    }

    // Blockquote lines: strip the ">" prefix, merge the content
    if (/^>\s?/.test(line)) {
      const content = line.replace(/^>\s?/, '');
      if (/^\s*$/.test(content)) {
        flush();
        result.push(line);
      } else {
        inBlockquote = true;
        buffer.push(content.trim());
      }
      continue;
    }

    // Normal lines: buffer for merging
    buffer.push(line.trim());
  }

  flush();
  data.content = result.join('\n');
  return data;
});

// ---------------------------------------------------------------------------
// 3. Math underscore
// ---------------------------------------------------------------------------

// Escape "_" inside inline and display math so the Markdown renderer does not
// treat it as emphasis. Fenced code and inline code are left untouched.
hexo.extend.filter.register('before_post_render', function (data) {
  data.content = data.content.replace(
    /(```[\s\S]*?```|`[^`]*`)|(\$\$[\s\S]*?\$\$|\$(?:[^\n$]+?)\$)/g,
    function (_, code, math) {
      if (code) return code;
      return math.replace(/_/g, '&#95;');
    }
  );
  return data;
});
