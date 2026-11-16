# AGENTS.md

## Project Overview

This is a static blog built with Hexo and the custom **Tidepool** theme, deployed to GitHub Pages.
The theme focuses on:

- partial navigation with Swup, with no full-page reloads
- switchable color palettes and light/dark mode
- a card-based two-column layout, a sticky sidebar, and a post table of contents
- client-side KaTeX, local JSON search, code copy, and an image lightbox

## Tech Stack

- **Framework**: Hexo 8.1.2
- **Theme**: Tidepool (`themes/tidepool/`)
- **Template engine**: EJS
- **Styling**: plain CSS (`themes/tidepool/source/css/`)
- **Interactivity**: vanilla JS + Swup 4 + KaTeX
- **Package manager**: npm
- **Node.js**: >= 22

## Project Structure

```text
├── source/                 # Posts and page sources
│   ├── _assets/            # Shared images (mirrored into source/ at build time)
│   ├── _pages/             # Standalone page sources (about / photo)
│   └── _posts/             # Posts
├── themes/
│   └── tidepool/           # Current theme
│       ├── layout/         # EJS layouts and partials
│       ├── scripts/        # Hexo theme scripts (helpers / search index)
│       └── source/         # CSS / JS / Swup dependencies
├── scripts/                # Hexo runtime scripts loaded at build time
├── tools/                  # Standalone CLI tools (not loaded by Hexo)
├── public/                 # Generated static files
├── _config.yml             # Main Hexo configuration
└── _config.tidepool.yml    # Tidepool theme configuration
```

## Common Commands

### Development

- `npm run server` - start the local development server
- `npm run build` - generate static files
- `npm run clean` - remove generated files
- `npm run deploy` - deploy to GitHub Pages

### Code Quality

- `npm run lint` - run all lint checks
- `npm run lint:ejs` - check Tidepool EJS template syntax
- `npm run lint:markdown` - check Markdown formatting
- `npm run lint:math` - check math formulas
- `npm run lint:site` - check site configuration
- `npm run format` - format code
- `npm run fix` - automatically fix issues
- `npm test` - run `node:test` unit tests for the tools

## Custom Scripts

Hexo runtime (`scripts/`, loaded at build time):

- `scripts/post-filters.js` - post filters (CJK / math)
- `scripts/rewrite-images.js` - rewrite rendered post images to the image host
- `scripts/sync-source.js` - mirror `_pages` and `_assets` into `source/`

Standalone CLI tools (`tools/`, not loaded by Hexo):

- `tools/check-math.js` - check math formula formatting
- `tools/check-site.js` - check site configuration and links
- `tools/format-md.js` - format Markdown files
- `tools/images.js` - image-host CLI: `status`, `sync` (`--prune`, `--force`, `--scan`, `--dry-run`) and `download`
- `tools/imgbed.js` - network-free image-host logic: `.env.imgbed.host` parsing, path mapping, Markdown image references, hashing, manifest diff (also used by `scripts/rewrite-images.js`)
- `tools/imgbed-sftp.js` - SFTP access: remote manifest, scan, upload, delete

Tests (`npm test`, `node:test`): `test/*.test.js`.

Theme-level (`themes/tidepool/scripts/`):

- `helpers.js` - EJS helpers for icons, excerpts, word count/reading time, category tree, active state
- `search-index.js` - generate the `/search.json` local search index
- `pages.js` - generate `/404.html` (avoids an empty Markdown file in `source/_pages`)

## Development Guidelines

### Writing Posts

1. Check `README.md` for the category system before writing.
2. Posts are Markdown files under `source/_posts/`.
3. File name format: `year/month-day-title.md`.
4. Use YAML front matter for metadata (`layout`, `title`, `categories`, `tags`). Do not set `index_img`; post covers are generated from the title.
5. Use `$...$` / `$$...$$` for math; it is rendered by client-side KaTeX.

### Theme Development

> **Important: all color and visual theme changes must go through `themes/tidepool/`.**
>
> - Color tokens: `themes/tidepool/source/css/tokens.css`
> - Layout/component/article styles: the corresponding files under `themes/tidepool/source/css/`
> - Theme features and defaults: `_config.tidepool.yml` (defaults live in `themes/tidepool/_config.yml`)
> - **Do not create `css/` or `js/` directories or files at the project root.**
> - **Do not add `source/css/` or `source/js/`, and do not put CSS/JS in `source/_assets`; `source/_assets` is for shared images only.**
> - Put theme JS under `themes/tidepool/source/js/`; page interactions belong in `app.js`.

- Override theme configuration in `_config.tidepool.yml`; do not change defaults in `themes/tidepool/_config.yml` unless you are adding a new default.
- Layouts live in `themes/tidepool/layout/`; page types: `index`, `post`, `page`, `about`, `archive`, `category`, `tag`, `404`.
- Styles live in `themes/tidepool/source/css/`, split into tokens / base / layout / components / article / pages.
- Interactions live in `themes/tidepool/source/js/app.js`; any logic that must re-run after Swup replaces `#swup` belongs in `initPage()`.
- New icons: add `<symbol id="i-xxx">` in `layout/_partials/icons.ejs` and use `tide_icon('xxx')`.
- New pages: set `layout` in `source/_pages/<name>/index.md`.

### Image Host Workflow

- Keep post images local during development; `npm run server` must not rewrite or upload them.
- Restore missing local images from the public image host with `npm run images:download`; existing files are skipped unless `--overwrite` is passed.
- Check what differs with `npm run images:status`; upload new and modified images with `npm run images:sync` (pass file paths, `--year` or `--slug` for a subset, `--dry-run` to preview).
- Change detection uses `.imgbed-manifest.json` on the image host (size + SHA-256 per image);
  unchanged images cause no remote request. Without a manifest, the first sync scans the remote
  tree and re-uploads every local image once. Use `--scan` after editing the host by hand; it
  compares sizes only, so re-upload a same-size hand edit with `--force`.
- A sync that changes the host holds `.imgbed-lock` next to the manifest and fails fast if
  another sync holds it; delete a stale lock on the host by hand. `status` and `--dry-run` take
  no lock. A failed upload marks its manifest entry unknown so the next sync retries it.
- Delete remote copies of locally deleted images with `npm run images:sync -- --prune` (preview with `--dry-run`). Images still referenced by a post are reported as missing and never pruned.
  `--prune` is refused while the host has no manifest yet (sync once, review status, then prune),
  and images that `--scan` finds for the first time are not pruned in the same run.
- Only inline `![](file)` and `<img src="file">` references outside code blocks and HTML comments
  count; `{% asset_img %}` and reference-style images are not recognized.
- Downloads are atomic (temporary file, then rename), with a timeout.
- Do not commit images, `.env.imgbed.host`, `.imgbed-manifest.json` or `.imgbed-lock`.
- Keep Markdown image paths relative. During `hexo generate`,
  `scripts/rewrite-images.js` rewrites them to
  `${IMGHOST_PUBLIC_BASE_URL}/posts/<year>/<slug>/<file>` before Hexo resolves
  post assets; `<slug>` is the local post folder name, including its `MM-DD-` prefix.
- URL rewriting is opt-in: set `IMGHOST_ENABLED=true`. The default `false` keeps local paths.
- CI only needs `IMGHOST_ENABLED=true` and `IMGHOST_PUBLIC_BASE_URL`; no SSH key is needed there.
- Builds do not upload images automatically; uploads run from the development machine.

### Code Style

- Markdown is reflowed by `tools/format-md.js`; JSON/YAML are formatted with Prettier.
- Follow markdownlint rules.
- EJS templates are checked with ejslint.
- Do not introduce full packages such as jQuery or Bootstrap.

### Git Workflow

1. Develop on a feature branch.
2. Run `npm run lint` and `npm run format` before committing.
3. Commit only intended files; check `git status` and `git diff` first.
4. Never commit local planning files such as `TODO.md` unless explicitly asked.
5. Do not commit generated output or secrets.

#### Commit Message Convention

Follow Conventional Commits and write commit messages in English:

```text
<type>(<scope>): <subject>

- <what changed and why>
- <another change>
```

- **Type**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `build`, `ci`, `perf`, or `revert`.
- **Scope**: use the narrowest affected area, such as `theme`, `sidebar`, `font`, `home`, `post`, `scripts`, or `deps`.
- **Subject**: imperative, lowercase, no trailing period, concise (about 72 characters or less).
- **Body**: English only; use a bullet list with `-` and keep lines around 80 characters.
- Do not use Chinese in commit messages.
- The repository hook adds `Signed-off-by`; do not add it manually.
- Match the history style; run `git log --oneline -10` if unsure.

Examples:

- `feat(sidebar): fill tag pages by measured height`
- `fix(font): prefer LXGW WenKai in the UI stack`
- `refactor(scripts): merge content filters and unify npm script names`

## Deployment

1. Build locally: `npm run build`.
2. Generated files are in `public/`.
3. Deploy to GitHub Pages with `npm run deploy`.

## Notes

- `source/_pages` and `source/_assets` are mirrored into `source/` during `after_init`; put page sources in `_pages`.
- There is no standalone `/tags/` or `/categories/` index page; tag/category entry points live in the sidebar, and detail pages are generated by Hexo's tag/category generators.
- Escape math correctly and run `npm run lint:math` to check.
- Images belong in the post folder under `source/` (`post_asset_folder: true`).
- Post covers are generated from the post title via the DiceBear HTTP API (`themes/tidepool/scripts/cover.js`); do not add `index_img` front matter or store cover images under `source/_assets/img/index`.
- Image-host URL rewriting is opt-in: set `IMGHOST_ENABLED=true` before `npm run build`; otherwise builds keep local image paths.
- Swup replaces `#swup`; global components such as navigation, search, and footer must stay outside `#swup`.
- The search index is generated at build time; run `npm run build` after changing search logic.
- Hexo caches theme scripts when the server starts; restart `npm run server` after changing files under `themes/tidepool/scripts/`, including `cover.js`.
