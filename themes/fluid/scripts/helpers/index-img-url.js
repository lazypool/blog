/* global hexo */

'use strict';

hexo.extend.helper.register('process_index_img', function(img) {
  if (!img) return '';
  if (/^(https?:)?\/\//i.test(img)) return img;

  var prefix = this.theme.post.index_img_cdn_prefix || '';
  if (prefix) {
    prefix = prefix.replace(/\/+$/, '');
    img = img.replace(/^\/+/, '');
    return prefix + '/' + img;
  }

  return this.url_for(img);
});
