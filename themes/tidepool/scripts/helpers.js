/**
 * Tidepool theme helpers.
 *
 * Small, dependency-light helpers shared by the EJS layouts. Keep filesystem
 * or config side effects out of this module — it only renders values.
 */

'use strict';

const { stripHTML, unescapeHTML } = require('hexo-util');

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_RE = /[A-Za-z0-9_]+/g;

function plainText(html) {
  if (!html) return '';
  return unescapeHTML(
    String(html)
      .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
      .replace(/<(pre|code)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html) {
  const text = plainText(html);
  const cjk = (text.match(CJK_RE) || []).length;
  const latin = (text.match(LATIN_RE) || []).length;
  return cjk + latin;
}

function readingMinutes(html) {
  return Math.max(1, Math.round(countWords(html) / 400));
}

function excerpt(html, length) {
  const text = plainText(html);
  const limit = typeof length === 'number' ? length : 160;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function coverOf(post) {
  const raw = post && (post.index_img || post.cover || post.thumbnail);
  if (!raw) return '';
  if (/^(https?:)?\/\//.test(raw)) return raw;
  return this.url_for(raw.replace(/^\//, ''));
}

function isActive(target) {
  const current = `/${(this.page && (this.page.path || '')) || ''}`.replace(/\/+/g, '/');
  const normalized = target.endsWith('/') ? target : `${target}/`;
  if (normalized === '/') {
    return current === '/' || current === '/index.html' || current.startsWith('/page/');
  }
  return current === normalized || current.startsWith(normalized);
}

function categoryTree(categories) {
  const list = categories && categories.toArray ? categories.toArray() : categories || [];
  const nodes = new Map();

  list.forEach((category) => {
    nodes.set(String(category._id), {
      id: String(category._id),
      name: category.name,
      path: category.path,
      count: category.length || 0,
      children: []
    });
  });

  const roots = [];
  list.forEach((category) => {
    const node = nodes.get(String(category._id));
    const parent = category.parent ? nodes.get(String(category.parent)) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sort = (items) => {
    items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);

  return roots;
}

function breadcrumbs(post) {
  const chains = post && post.categories && post.categories.toArray ? post.categories.toArray() : [];
  return chains
    .filter((category) => !category.parent)
    .map((category) => ({
      name: category.name,
      path: category.path,
      children: categoryTree(post.categories).find((node) => node.id === String(category._id))?.children || []
    }));
}

function articleBody(html) {
  return String(html || '').replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}


function categoryChain(pagePath, categoryName, categories) {
  const list = categories && categories.toArray ? categories.toArray() : categories || [];
  const nodes = new Map();
  list.forEach((category) => {
    nodes.set(String(category._id), category);
  });

  const normalizedPage = `/${String(pagePath || '').replace(/^\/+/, '')}`;
  let target = null;
  list.forEach((category) => {
    const path = `/${String(category.path || '').replace(/^\/+/, '')}`;
    if (normalizedPage.startsWith(path) && (!target || path.length > `/${String(target.path).replace(/^\/+/, '')}`.length)) {
      target = category;
    }
  });

  if (!target && categoryName) {
    target = list.find((category) => category.name === categoryName) || null;
  }
  if (!target) return [];

  const chain = [];
  let current = target;
  const seen = new Set();
  while (current && !seen.has(String(current._id))) {
    seen.add(String(current._id));
    chain.unshift({ name: current.name, path: current.path });
    current = current.parent ? nodes.get(String(current.parent)) : null;
  }
  return chain;
}

hexo.extend.helper.register('tide_icon', function (name, className) {
  const cls = className ? ` ${className}` : '';
  return `<svg class="icon${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
});

hexo.extend.helper.register('tide_article', articleBody);
hexo.extend.helper.register('tide_plain', plainText);
hexo.extend.helper.register('tide_words', countWords);
hexo.extend.helper.register('tide_reading', readingMinutes);
hexo.extend.helper.register('tide_excerpt', excerpt);
hexo.extend.helper.register('tide_cover', coverOf);
hexo.extend.helper.register('tide_active', isActive);
hexo.extend.helper.register('tide_cat_tree', categoryTree);
hexo.extend.helper.register('tide_category_chain', categoryChain);
hexo.extend.helper.register('tide_breadcrumbs', breadcrumbs);
