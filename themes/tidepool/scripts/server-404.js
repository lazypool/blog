/**
 * Serve the themed 404 page in `hexo server` for unknown routes.
 *
 * `hexo-server` falls through to connect's default handler ("Cannot GET /path")
 * when no route matches. This catch-all middleware runs last and returns the
 * generated `404.html` with a proper 404 status, matching what GitHub Pages
 * serves in production. Requests for missing assets (an extension other than
 * `.html`) still fall through so the bare "Cannot GET" message stays useful
 * while debugging.
 */

'use strict';

const path = require('node:path');

hexo.extend.filter.register('server_middleware', function (app) {
  const { route } = hexo;

  app.use(function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const ext = path.extname(req.url.split('?')[0]);
    if (ext && ext !== '.html' && ext !== '.htm') return next();

    const data = route.get('404.html');
    if (!data) return next();

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (req.method === 'GET') {
      data.pipe(res).on('error', next);
    } else {
      res.end();
    }
  });
});
