/**
 * sync-source.js — copy Hexo source sub-directories into the source root.
 *
 * Hexo renders "_pages" and "_assets" through dedicated processors, so this
 * "after_init" filter copies their contents into the source root, where the
 * normal page and asset pipeline can pick them up.
 *
 * This script is intentionally kept standalone: it is an init-time filesystem
 * hook and must not be merged with the content filters in post-filters.js.
 */

/* global hexo */

'use strict';

const fs = require('hexo-fs');
const path = require('path');

hexo.extend.filter.register('after_init', async function () {
  const srcDir = hexo.source_dir;

  const promises = ['_pages', '_assets'].map((dir) => {
    const fullPath = path.join(srcDir, dir);
    if (fs.existsSync(fullPath)) {
      return fs.copyDir(fullPath, srcDir, { ignoreHidden: true });
    }
  });

  return Promise.all(promises);
});
