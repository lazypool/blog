/* global hexo */

'use strict';

const fs = require('hexo-fs');
const path = require('path');

hexo.extend.filter.register('after_init', function() {
  const srcDir = hexo.source_dir;

  ['_pages', '_assets'].forEach(dir => {
    const fullPath = path.join(srcDir, dir);
    if (fs.existsSync(fullPath)) {
      fs.copyDir(fullPath, srcDir, { ignoreHidden: true });
    }
  });
});
