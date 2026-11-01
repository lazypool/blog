/**
 * Build /search.json for the client-side command palette.
 *
 * The index is intentionally compact: title, taxonomy, a short excerpt and a
 * capped plain-text body. Everything is lower-cased once on the server so the
 * browser only has to run substring checks.
 */

'use strict';

const { stripHTML, unescapeHTML } = require('hexo-util');

function plain(html) {
  return unescapeHTML(
    stripHTML(
      String(html || '')
        .replace(/<figure class="highlight[\s\S]*?<\/figure>/gi, ' ')
        .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    )
  )
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.generator.register('tidepool-search-index', function (locals) {
  const config = hexo.theme.config.search || {};
  if (config.enable === false) return [];

  const root = hexo.config.root || '/';
  const posts = locals.posts.sort('-date').toArray();

  const index = posts.map((post) => {
    const body = plain(post.content).slice(0, 3000);
    return {
      title: post.title || '',
      url: `${root}${post.path}`.replace(/\/{2,}/g, '/'),
      date: post.date ? post.date.format('YYYY-MM-DD') : '',
      categories: post.categories ? post.categories.toArray().map((item) => item.name) : [],
      tags: post.tags ? post.tags.toArray().map((item) => item.name) : [],
      excerpt: plain(post.excerpt || post.content).slice(0, 180),
      body,
      cover: post.index_img || post.cover || post.thumbnail || '',
      reading: Math.max(1, Math.round(body.length / 400)),
      search: `${post.title || ''} ${(post.tags ? post.tags.toArray() : []).map((t) => t.name).join(' ')} ${(post.categories ? post.categories.toArray() : []).map((c) => c.name).join(' ')} ${body}`.toLowerCase()
    };
  });

  return {
    path: (config.path || '/search.json').replace(/^\//, ''),
    data: JSON.stringify(index)
  };
});
