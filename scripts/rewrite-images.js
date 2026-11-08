/**
 * Rewrite local post images to the image host during `hexo generate` only.
 *
 * Source Markdown keeps relative paths such as `./image.png`; `hexo server`
 * therefore previews local files. During a production build, relative image
 * references are rewritten to posts/<year>/<slug>/<file> before Hexo resolves
 * post assets, so the input tree does not need to contain the image files.
 */

'use strict';

const { loadImageHostEnv } = require('../tools/imgbed-env');

const IMAGE_EXT_RE = /\.(?:jpe?g|png|gif|webp|svg)$/i;

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

function relativeImage(href) {
  if (!href || /^(?:[a-z]+:)?\/\//i.test(href) || /^(?:data:|#|\/)/i.test(href)) return '';
  const file = href.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!IMAGE_EXT_RE.test(file) || file.includes('/') || file.includes('..') || file.startsWith('.')) {
    return '';
  }
  return file;
}

function mapOutsideCode(text, map) {
  return String(text || '')
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : map(part)))
    .join('');
}

function rewriteMarkdown(markdown, location, base) {
  const prefix = `${base}/posts/${location.year}/${location.slug}/`;
  return mapOutsideCode(markdown, (text) => {
    return text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (match, alt, href, tail) => {
        const file = relativeImage(href);
        return file ? `![${alt}](${prefix}${file}${tail})` : match;
      })
      .replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi, (match, head, href, tail) => {
        const file = relativeImage(href);
        return file ? `${head}${prefix}${file}${tail}` : match;
      });
  });
}

function rewriteHtml(html, postPath, base, location) {
  const pattern = new RegExp(
    `(<img\\b[^>]*\\bsrc=["'])${escapeRegExp(postPath)}([^/"']+)(["'])`,
    'gi'
  );
  return String(html || '').replace(pattern, (match, head, file, tail) => {
    return `${head}${base}/posts/${location.year}/${location.slug}/${file}${tail}`;
  });
}

function imageHostBase() {
  const env = loadImageHostEnv([]);
  const enabled = String(process.env.IMGHOST_ENABLED || env.IMGHOST_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) return '';
  if (!env.IMGHOST_PUBLIC_BASE_URL) {
    throw new Error('IMGHOST_ENABLED=true but IMGHOST_PUBLIC_BASE_URL is missing');
  }
  return env.IMGHOST_PUBLIC_BASE_URL.replace(/\/+$/, '');
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (hexo.env.cmd !== 'generate') return data;

  const location = postLocation(data);
  if (!location) return data;

  const base = imageHostBase();
  if (!base) return data;

  data.content = rewriteMarkdown(data.content, location, base);
  return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
  if (hexo.env.cmd !== 'generate') return data;

  const location = postLocation(data);
  if (!location) return data;

  const base = imageHostBase();
  if (!base) return data;

  const postPath = `/${String(data.path || '').replace(/^\/+|\/+$/g, '')}/`;
  data.content = rewriteHtml(data.content, postPath, base, location);
  return data;
});
