'use strict';

hexo.extend.filter.register('before_post_render', function(data) {
  let inCode = false;
  data.content = data.content.replace(
    /(```[\s\S]*?```|`[^`]*`)|(\$\$[\s\S]*?\$\$|\$(?:[^\n$]+?)\$)/g,
    function(m, code, math) {
      if (code) return code;
      return math.replace(/_/g, '&#95;');
    }
  );
  return data;
});
