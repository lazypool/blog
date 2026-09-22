'use strict';

// Check if character is CJK (fullwidth/wide)
// Follows CSS Text Module Level 3 and Unicode East Asian Width
function isCJK(char) {
  if (!char) return false;
  const c = char.codePointAt(0);
  return (
    // CJK Unified Ideographs
    (c >= 0x4E00 && c <= 0x9FFF) ||
    // CJK Unified Ideographs Extension A
    (c >= 0x3400 && c <= 0x4DBF) ||
    // CJK Unified Ideographs Extension B
    (c >= 0x20000 && c <= 0x2A6DF) ||
    // CJK Compatibility Ideographs
    (c >= 0xF900 && c <= 0xFAFF) ||
    // CJK Symbols and Punctuation
    (c >= 0x3000 && c <= 0x303F) ||
    // Fullwidth ASCII and Halfwidth Katakana
    (c >= 0xFF01 && c <= 0xFF60) ||
    (c >= 0xFF61 && c <= 0xFF9F) ||
    // CJK Punctuation
    (c >= 0x2018 && c <= 0x201F) ||
    c === 0x3001 || c === 0x3002 || c === 0xFF0C || c === 0xFF1A ||
    c === 0xFF1B || c === 0xFF1F || c === 0xFF01
  );
}

// Check if a space is needed between two characters
// Follows CSS Text Module Level 3: no space between CJK, space otherwise
function needSpace(prev, next) {
  if (!prev || !next) return false;
  // If either side is already a space, no need to add
  if (/\s/.test(prev) || /\s/.test(next)) return false;
  // If both sides are CJK, no space needed
  if (isCJK(prev) && isCJK(next)) return false;
  // Otherwise, space is needed
  return true;
}

// Merge lines, adding space based on character type
function mergeLines(lines) {
  return lines.reduce((acc, cur, i) => {
    if (i === 0) return cur;
    const prevEnd = acc[acc.length - 1];
    const curStart = cur[0];
    return acc + (needSpace(prevEnd, curStart) ? ' ' : '') + cur;
  }, '');
}

// Merge soft-wrapped paragraph lines before rendering.
// Rule: consecutive non-empty lines (not special syntax) are merged into one line.
// Skips: empty lines, code blocks, headings, lists, tables, HTML tags.
// Blockquote content is merged, with > prefix added.
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
      /^\[.*\]:\s/.test(line)        // Link reference
    ) {
      flush();
      result.push(line);
      continue;
    }

    // Blockquote lines: strip > prefix, merge content
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
