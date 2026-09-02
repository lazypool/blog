'use strict';

const WJ = '\u2060';

hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(
    /(```[\s\S]*?```|`[^`]*`)|([\u3000-\u303f\uff00-\uffef\u201c\u201d])(\*+)(?=[^\s*\u3000-\u303f\uff00-\uffef\u201c\u201d])|(\*+)([\u3000-\u303f\uff00-\uffef\u201c\u201d])/g,
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
