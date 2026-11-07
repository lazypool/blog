/**
 * Rewrite local post images to the image host during `hexo generate` only.
 *
 * Source Markdown keeps relative paths such as `./image.png`; `hexo server`
 * therefore previews local files. During a production build, the rendered
 * HTML is rewritten to posts/<year>/<slug>/<file> on the image host.
 */

'use strict';

const { loadImageHostEnv } = require('../tools/imgbed-env');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function postLocation(data) {
  const source = String(data.source || '').split('\\').join('/');
  const match = /(?:^|\/)(?:_posts|source\/_posts)\/(\d{4})\/\d{2}-\d{2}-([^/]+)\.md$/.exec(source);
  if (match) return { year: match[1], slug: match[2] };

  const segments = String(data.path || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/');
  if (segments.length >= 4 && /^\d{4}$/.test(segments[0])) {
    return { year: segments[0], slug: segments[3] };
  }
  return null;
}

function rewriteHtml(html, postPath, base, location) {
  const pattern = new RegExp(`(<img\\b[^>]*\\bsrc=["'])${escapeRegExp(postPath)}([^/"']+)(["'])`, 'gi');
  return String(html || '').replace(pattern, (match, head, file, tail) => {
    return `${head}${base}/posts/${location.year}/${location.slug}/${file}${tail}`;
  });
}

hexo.extend.filter.register('after_post_render', function (data) {
  if (hexo.env.cmd !== 'generate') return data;

  const location = postLocation(data);
  if (!location) return data;

  const { IMGHOST_PUBLIC_BASE_URL } = loadImageHostEnv(['IMGHOST_PUBLIC_BASE_URL']);
  const base = IMGHOST_PUBLIC_BASE_URL.replace(/\/+$/, '');
  const postPath = `/${String(data.path || '').replace(/^\/+|\/+$/g, '')}/`;

  data.content = rewriteHtml(data.content, postPath, base, location);
  return data;
});
