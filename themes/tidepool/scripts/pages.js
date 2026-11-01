/**
 * Generate the three standalone routes the theme owns. Keeping them here
 * avoids empty markdown files in source/_pages — the pages have no content of
 * their own, only a layout and a title.
 */

'use strict';

hexo.extend.generator.register('tidepool-layout-pages', function () {
  const make = (path, layout, title) => ({
    path,
    layout: [layout, 'page', 'post', 'index'],
    data: {
      title,
      layout,
      path,
      content: '',
      __page: true
    }
  });

  return [make('404.html', '404', '页面走丢了')];
});
