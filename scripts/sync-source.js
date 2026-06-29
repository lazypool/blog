/* global hexo */

'use strict';

const fs = require('hexo-fs');
const path = require('path');

hexo.extend.filter.register('after_init', async function() {
  const srcDir = hexo.source_dir;

  const promises = ['_pages', '_assets'].map(dir => {
    const fullPath = path.join(srcDir, dir);
    if (fs.existsSync(fullPath)) {
      return fs.copyDir(fullPath, srcDir, { ignoreHidden: true });
    }
  });

  return Promise.all(promises);
});
