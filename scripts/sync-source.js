/**
 * sync-source.js — mirror Hexo source sub-directories into the source root.
 *
 * Hexo renders "_pages" and "_assets" through dedicated processors, so this
 * "after_init" filter mirrors their contents into the source root, where the
 * normal page and asset pipeline can pick them up. Existing generated entries
 * are removed first so moved or deleted source files do not leave stale copies.
 *
 * This script is intentionally kept standalone: it is an init-time filesystem
 * hook and must not be merged with the content filters in post-filters.js.
 */

/* global hexo */

'use strict';

const fs = require('hexo-fs');
const fsp = require('node:fs/promises');
const path = require('path');

const SOURCE_DIRS = ['_pages', '_assets'];

hexo.extend.filter.register('after_init', async function () {
  const srcDir = hexo.source_dir;
  const available = SOURCE_DIRS.filter((dir) => fs.existsSync(path.join(srcDir, dir)));

  for (const dir of available) {
    const entries = await fsp.readdir(path.join(srcDir, dir));
    await Promise.all(
      entries.map((entry) =>
        fsp.rm(path.join(srcDir, entry), { recursive: true, force: true })
      )
    );
  }

  await Promise.all(
    available.map((dir) =>
      fs.copyDir(path.join(srcDir, dir), srcDir, { ignoreHidden: true })
    )
  );
});
