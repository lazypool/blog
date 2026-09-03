'use strict';

const WJ = '\u2060';

const CJK_PUNCT = '\\u3000-\\u303f\\uff00-\\uffef\\u2018\\u2019\\u201c\\u201d';
const ASCII_PUNCT = '\\x21-\\x2F\\x3A-\\x40\\x5B-\\x60\\x7B-\\x7E';

hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(
    new RegExp(
      '(```[\\s\\S]*?```|`[^`]*`)|([' + CJK_PUNCT + '])(\\*+)(?=[^\\s*' + CJK_PUNCT + '])|' +
      '(?<![' + ASCII_PUNCT + CJK_PUNCT + '*])(\\*+)([' + CJK_PUNCT + '])',
      'g'
    ),
    (match, code, punct, stars, stars2, punct2) => {
      if (code) return code;
      if (punct && stars) return punct + WJ + stars;
      if (stars2 && punct2) return stars2 + WJ + punct2;
      return match;
    }
  );
  return data;
});

hexo.extend.filter.register('after_post_render', function(data) {
  data.content = data.content.replace(/\u2060/g, '');
  return data;
});
