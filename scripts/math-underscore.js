'use strict';

hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(
    /(```[\s\S]*?```|`[^`]*`)|(\$\$[\s\S]*?\$\$|\$(?:[^\n$]+?)\$)/g,
    function(_, code, math) {
      if (code) return code;
      return math.replace(/_/g, '&#95;');
    }
  );
  return data;
});
