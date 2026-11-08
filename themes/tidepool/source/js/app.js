/**
 * Tidepool runtime.
 *
 * One small runtime for the whole theme: theming, palette, navigation, search,
 * Swup page transitions and the per-page enhancers (TOC, code copy, math,
 * lightbox, reveal, progress). Everything here is vanilla ES2019+.
 */

(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

  const ICONS = {
    sun: '<svg class="icon" aria-hidden="true"><use href="#i-sun"></use></svg>',
    moon: '<svg class="icon" aria-hidden="true"><use href="#i-moon"></use></svg>',
    monitor: '<svg class="icon" aria-hidden="true"><use href="#i-monitor"></use></svg>',
    copy: '<svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg>',
    check: '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>',
    close: '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>'
  };

  const escapeHTML = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (char) => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const clampi = (value, min, max) => Math.min(max, Math.max(min, value));

  function setLocked(locked) {
    body.classList.toggle('is-locked', locked);
  }

  /* ------------------------------------------------------------------ *
   * Theme mode
   * ------------------------------------------------------------------ */

  const THEME_ORDER = ['auto', 'light', 'dark'];

  function storedTheme() {
    const value = localStorage.getItem('tide-theme');
    return THEME_ORDER.includes(value) ? value : 'auto';
  }

  function resolveDark(theme) {
    return theme === 'dark' || (theme === 'auto' && mqDark.matches);
  }

  function themeIcon(theme) {
    if (theme === 'dark') return ICONS.sun;
    if (theme === 'light') return ICONS.moon;
    return ICONS.monitor;
  }

  const coverPreloads = new Map();
  let coverPreloadIdle = 0;

  function preloadPostCovers() {
    const connection = navigator.connection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''))) return;

    const dark = root.classList.contains('dark');
    $$('.post-cover img[data-cover-light]').forEach((img) => {
      const target = dark ? img.dataset.coverLight : img.dataset.coverDark;
      if (!target || target === img.getAttribute('src') || coverPreloads.has(target)) return;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = target;
      coverPreloads.set(target, preload);
      if (preload.decode) preload.decode().catch(() => {});
    });
  }

  function scheduleCoverPreload() {
    if (coverPreloadIdle) return;
    const run = () => {
      coverPreloadIdle = 0;
      preloadPostCovers();
    };
    if ('requestIdleCallback' in window) {
      coverPreloadIdle = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      coverPreloadIdle = window.setTimeout(run, 200);
    }
  }

  function updatePostCovers() {
    const dark = root.classList.contains('dark');
    $$('.post-cover img[data-cover-light]').forEach((img) => {
      const next = dark ? img.dataset.coverDark : img.dataset.coverLight;
      if (next && img.getAttribute('src') !== next) img.src = next;
    });
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.classList.toggle('dark', resolveDark(theme));
    root.style.colorScheme = resolveDark(theme) ? 'dark' : 'light';
    updatePostCovers();
    scheduleCoverPreload();
    $$('[data-theme-icon]').forEach((node) => {
      node.innerHTML = themeIcon(theme);
    });
    $$('[data-theme-toggle]').forEach((button) => {
      const label = theme === 'auto' ? '跟随系统' : theme === 'dark' ? '深色模式' : '浅色模式';
      button.setAttribute('aria-label', `切换明暗模式（当前：${label}）`);
      button.setAttribute('title', `切换明暗模式（当前：${label}）`);
    });
  }

  function initTheme() {
    applyTheme(storedTheme());
    $$('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = THEME_ORDER[(THEME_ORDER.indexOf(storedTheme()) + 1) % THEME_ORDER.length];
        localStorage.setItem('tide-theme', next);
        applyTheme(next);
      });
      button.addEventListener('pointerenter', preloadPostCovers, { passive: true });
      button.addEventListener('focus', preloadPostCovers);
    });
    const onSchemeChange = () => {
      if (storedTheme() === 'auto') applyTheme('auto');
    };
    if (mqDark.addEventListener) mqDark.addEventListener('change', onSchemeChange);
    else if (mqDark.addListener) mqDark.addListener(onSchemeChange);
  }

  /* ------------------------------------------------------------------ *
   * Palette
   * ------------------------------------------------------------------ */

  const PALETTES = ['tide', 'abyss', 'coral', 'kelp'];

  function applyPalette(id) {
    const palette = PALETTES.includes(id) ? id : 'tide';
    root.dataset.palette = palette;
    localStorage.setItem('tide-palette', palette);
    $$('.palette-item[data-palette]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.palette === palette);
    });
  }

  let paletteCloseTimer = 0;
  let paletteHideTimer = 0;

  function initPalette() {
    const saved = localStorage.getItem('tide-palette') || root.dataset.palette || 'tide';
    applyPalette(saved);

    const pop = $('#palette-pop');
    const toggle = $('[data-palette-toggle]');
    if (toggle && pop) {
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        window.clearTimeout(paletteCloseTimer);
        const open = pop.hidden || pop.classList.contains('is-closing');
        if (open) {
          window.clearTimeout(paletteHideTimer);
          pop.classList.remove('is-closing');
          pop.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          closePalette();
        }
      });

      const wrap = pop.closest('.nav-popover-wrap');
      const cancelClose = () => window.clearTimeout(paletteCloseTimer);
      const scheduleClose = () => {
        window.clearTimeout(paletteCloseTimer);
        paletteCloseTimer = window.setTimeout(closePalette, 180);
      };
      if (wrap) {
        wrap.addEventListener('mouseenter', cancelClose);
        wrap.addEventListener('mouseleave', scheduleClose);
      }
      pop.addEventListener('mouseenter', cancelClose);
      pop.addEventListener('mouseleave', scheduleClose);

      document.addEventListener('click', (event) => {
        if (!event.target.closest('.nav-popover-wrap')) closePalette();
      });
    }

    $$('.palette-item[data-palette]').forEach((button) => {
      button.addEventListener('click', () => {
        applyPalette(button.dataset.palette);
        closePalette();
      });
    });
  }

  function closePalette() {
    window.clearTimeout(paletteCloseTimer);
    const pop = $('#palette-pop');
    const toggle = $('[data-palette-toggle]');
    if (!pop || pop.hidden || pop.classList.contains('is-closing')) return;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    pop.classList.add('is-closing');
    window.clearTimeout(paletteHideTimer);
    paletteHideTimer = window.setTimeout(() => {
      pop.hidden = true;
      pop.classList.remove('is-closing');
    }, 180);
  }

  /* ------------------------------------------------------------------ *
   * Mobile menu
   * ------------------------------------------------------------------ */

  function initMenu() {
    const menu = $('#mobile-menu');
    const toggle = $('[data-menu-toggle]');
    if (!menu || !toggle) return;

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? ICONS.close : '<svg class="icon" aria-hidden="true"><use href="#i-menu"></use></svg>';
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('#mobile-menu') && !event.target.closest('[data-menu-toggle]')) {
        closeMenu();
      }
    });
  }

  function closeMenu() {
    const menu = $('#mobile-menu');
    const toggle = $('[data-menu-toggle]');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-menu"></use></svg>';
    }
  }

  /* ------------------------------------------------------------------ *
   * Friends popover
   * ------------------------------------------------------------------ */

  function openFriends(pop, toggle) {
    closeFriends();
    window.clearTimeout(pop.friendsHideTimer);
    pop.closest('.sidebar')?.classList.add('is-friends-open');
    pop.classList.remove('is-closing');
    pop.hidden = false;
    window.requestAnimationFrame(() => pop.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
  }

  function initFriends() {
    const toggles = $$('[data-friends-toggle]');
    if (!toggles.length) return;

    toggles.forEach((toggle) => {
      const pop = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!pop) return;

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = pop.hidden || pop.classList.contains('is-closing');
        if (open) openFriends(pop, toggle);
        else closeFriends();
      });

      pop.addEventListener('click', (event) => {
        if (event.target.closest('a')) window.setTimeout(closeFriends, 120);
      });

      const wrap = toggle.closest('.friends-wrap');
      if (wrap) {
        let hoverTimer = 0;
        const cancelHoverClose = () => window.clearTimeout(hoverTimer);
        const scheduleHoverClose = () => {
          cancelHoverClose();
          hoverTimer = window.setTimeout(closeFriends, 260);
        };
        [wrap, pop].forEach((node) => {
          node.addEventListener('mouseenter', cancelHoverClose);
          node.addEventListener('mouseleave', scheduleHoverClose);
        });
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.friends-wrap')) closeFriends();
    });
  }

  function closeFriends() {
    $$('.friends-pop').forEach((pop) => {
      const toggle = document.querySelector(`[aria-controls="${pop.id}"]`);
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (pop.hidden || pop.classList.contains('is-closing')) return;
      pop.classList.remove('is-open');
      pop.classList.add('is-closing');
      window.clearTimeout(pop.friendsHideTimer);
      pop.friendsHideTimer = window.setTimeout(() => {
        pop.hidden = true;
        pop.classList.remove('is-closing');
        pop.closest('.sidebar')?.classList.remove('is-friends-open');
      }, 180);
    });
  }

  /* ------------------------------------------------------------------ *
   * Search command palette
   * ------------------------------------------------------------------ */

  const search = {
    overlay: null,
    input: null,
    results: null,
    items: [],
    index: null,
    loading: false,
    loaded: false,
    selected: 0,
    lastFocus: null
  };

  function initSearch() {
    if (body.dataset.search !== 'true') return;
    search.overlay = $('#search-overlay');
    search.input = $('#search-input');
    search.results = $('#search-results');
    if (!search.overlay || !search.input || !search.results) return;

    $('[data-search-open]')?.addEventListener('click', openSearch);
    $$('[data-search-close]').forEach((button) => button.addEventListener('click', closeSearch));

    search.input.addEventListener('input', () => renderSearch(search.input.value));
    search.input.addEventListener('keydown', onSearchKey);

    search.overlay.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusables = $$('input, button, a[href]', search.overlay).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    search.results.addEventListener('click', (event) => {
      const item = event.target.closest('.search-result');
      if (!item) return;
      event.preventDefault();
      navigate(item.dataset.url);
      closeSearch();
    });
  }

  function openSearch() {
    if (!search.overlay) return;
    search.lastFocus = document.activeElement;
    search.overlay.hidden = false;
    setLocked(true);
    search.input.value = '';
    search.selected = 0;
    renderSearch('');
    window.setTimeout(() => search.input.focus(), 30);
    loadSearchIndex().then(() => {
      if (!search.overlay.hidden) renderSearch(search.input.value);
    });
  }

  function closeSearch() {
    if (!search.overlay || search.overlay.hidden) return;
    search.overlay.hidden = true;
    setLocked(false);
    if (search.lastFocus && search.lastFocus.focus) search.lastFocus.focus();
  }

  async function loadSearchIndex() {
    if (search.loaded || search.loading) return;
    search.loading = true;
    const path = search.overlay.dataset.searchPath || '/search.json';
    try {
      const response = await fetch(path, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      search.index = await response.json();
    } catch (error) {
      console.warn('[tidepool] search index failed:', error);
      search.index = [];
    } finally {
      search.loaded = true;
      search.loading = false;
    }
  }

  function renderSearch(query) {
    if (!search.results) return;
    const raw = String(query || '').trim();

    if (!search.loaded) {
      search.results.innerHTML = '<p class="search-hint">正在加载索引…</p>';
      return;
    }

    if (!search.index || !search.index.length) {
      search.results.innerHTML = '<p class="search-empty">搜索索引暂时不可用。</p>';
      return;
    }

    let results;
    if (!raw) {
      results = search.index.slice(0, 6);
    } else {
      const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
      results = search.index
        .map((post) => {
          const title = post.title.toLowerCase();
          let score = 0;
          for (const token of tokens) {
            if (!post.search.includes(token)) return null;
            if (title.includes(token)) score += 80;
            if (post.tags.some((tag) => tag.toLowerCase().includes(token))) score += 30;
            if (post.categories.some((category) => category.toLowerCase().includes(token))) score += 24;
            score += Math.min(12, (post.search.split(token).length - 1) * 2);
          }
          if (title.includes(raw.toLowerCase())) score += 120;
          return { post, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((entry) => entry.post);
    }

    search.items = results;
    search.selected = 0;

    if (!results.length) {
      search.results.innerHTML = `<p class="search-empty">没有找到与「${escapeHTML(raw)}」相关的文章。</p>`;
      return;
    }

    search.results.innerHTML = results
      .map((post, index) => {
        const title = highlight(post.title, raw);
        const excerpt = highlight(post.excerpt || '', raw);
        const categories = (post.categories || []).slice(0, 2)
          .map((category) => `<span>${escapeHTML(category)}</span>`).join('');
        return `<a class="search-result${index === 0 ? ' is-selected' : ''}" href="${escapeHTML(post.url)}" data-url="${escapeHTML(post.url)}" role="option" aria-selected="${index === 0}">
          <span class="search-result-title"><svg class="icon" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>${title}</span>
          <span class="search-result-excerpt">${excerpt}</span>
          <span class="search-result-meta"><span>${escapeHTML(post.date || '')}</span>${categories}</span>
        </a>`;
      })
      .join('');
  }

  function highlight(text, query) {
    const safe = escapeHTML(text);
    const raw = String(query || '').trim();
    if (!raw) return safe;
    const tokens = raw.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (!tokens.length) return safe;
    return safe.replace(new RegExp(`(${tokens.join('|')})`, 'gi'), '<mark>$1</mark>');
  }

  function onSearchKey(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!search.items.length) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      search.selected = (search.selected + delta + search.items.length) % search.items.length;
      updateSearchSelection();
    } else if (event.key === 'Enter') {
      const item = search.items[search.selected];
      if (item) {
        event.preventDefault();
        navigate(item.url);
        closeSearch();
      }
    }
  }

  function updateSearchSelection() {
    const nodes = $$('.search-result', search.results);
    nodes.forEach((node, index) => {
      const selected = index === search.selected;
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-selected', String(selected));
      if (selected) node.scrollIntoView({ block: 'nearest' });
    });
  }

  function initKeyboard() {
    document.addEventListener('keydown', (event) => {
      const active = document.activeElement || document.body;
      const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      } else if (event.key === '/' && !isTyping && search.overlay && search.overlay.hidden) {
        event.preventDefault();
        openSearch();
      } else if (event.key === 'Escape') {
        closeSearch();
        closeMenu();
        closePalette();
        closeFriends();
        closeTocPanel();
        closeLightbox();
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Sidebar category cards: fade between top-level categories
   * ------------------------------------------------------------------ */

  function setupCarousel(widget) {
    const pages = $$('.carousel-page', widget);
    const dots = $$('.carousel-dot', widget);
    const nextButton = $('[data-carousel-next]', widget);

    widget.onclick = null;
    if (nextButton) nextButton.onclick = null;
    dots.forEach((dot) => {
      dot.onclick = null;
      dot.hidden = pages.length < 2;
    });
    if (!pages.length) return;

    if (nextButton) nextButton.hidden = pages.length < 2;
    if (pages.length < 2) {
      pages.forEach((page, i) => page.classList.toggle('is-active', i === 0));
      return;
    }

    let index = 0;
    const show = (next) => {
      index = (next + pages.length) % pages.length;
      pages.forEach((page, i) => {
        const active = i === index;
        page.classList.toggle('is-active', active);
        if (active) page.removeAttribute('inert');
        else page.setAttribute('inert', '');
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    };
    const advance = () => show(index + 1);
    if (nextButton) {
      nextButton.onclick = (event) => {
        event.stopPropagation();
        advance();
      };
    }
    dots.forEach((dot, i) => {
      dot.onclick = (event) => {
        event.stopPropagation();
        show(i);
      };
    });
    widget.onclick = (event) => {
      if (event.target.closest('a, button')) return;
      advance();
    };
    show(0);
  }

  function initCarousels() {
    $$('[data-carousel]').forEach(setupCarousel);
  }

  /* ------------------------------------------------------------------ *
   * Sidebar viewport fit
   * ------------------------------------------------------------------ */

  const sidebarMq = window.matchMedia('(max-width: 1180px)');
  const SIDEBAR_MIN_SCALE = 0.6;
  let sidebarFitFrame = 0;

  function fitSidebar() {
    const grid = $('.site-grid');
    const sidebar = $('.sidebar');
    const inner = $('.sidebar-inner');
    if (!grid || !sidebar || !inner) return;

    body.classList.remove('sidebar-hidden');
    if (sidebarMq.matches) {
      body.style.removeProperty('--sidebar-scale');
      return;
    }

    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const top = sidebar.getBoundingClientRect().top;
    const available = window.innerHeight - top - gap;

    body.style.setProperty('--sidebar-scale', '1');
    const baseWidth = parseFloat(getComputedStyle(inner).width);
    const natural = inner.getBoundingClientRect().height;
    if (available <= 0 || !natural || !baseWidth) return;

    let scale = available / natural;
    for (let i = 0; i < 4; i += 1) {
      body.style.setProperty('--sidebar-scale', String(scale));
      const height = inner.getBoundingClientRect().height;
      if (!height) break;
      const next = (scale * available) / height;
      if (Math.abs(next - scale) < 0.001) {
        scale = next;
        break;
      }
      scale = next;
    }

    const gridWidth = grid.clientWidth;
    const minMain = Math.min(512, gridWidth * 0.5);
    const maxByWidth = Math.max(baseWidth, gridWidth - gap - minMain) / baseWidth;
    scale = Math.min(scale, maxByWidth);

    if (scale < SIDEBAR_MIN_SCALE) {
      body.style.removeProperty('--sidebar-scale');
      body.classList.add('sidebar-hidden');
      return;
    }

    body.style.setProperty('--sidebar-scale', scale.toFixed(4));
  }

  function scheduleSidebarFit() {
    if (sidebarFitFrame) return;
    sidebarFitFrame = window.requestAnimationFrame(() => {
      sidebarFitFrame = 0;
      fitSidebar();
    });
  }

  function initSidebarFit() {
    scheduleSidebarFit();
    window.addEventListener('resize', scheduleSidebarFit, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleSidebarFit).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------ *
   * Sidebar tag carousel: fill each page by height
   * ------------------------------------------------------------------ */

  const TAG_PAGE_ROWS = 4;
  let tagFillFrame = 0;
  let tagFillWidth = -1;

  function buildTagPages(widget, force) {
    const pagesWrap = $('.carousel-pages', widget);
    const sourceCloud = $('.tag-cloud', pagesWrap);
    const dotsWrap = $('.carousel-dots', widget);
    if (!pagesWrap || !sourceCloud || !dotsWrap) return false;

    const width = sourceCloud.offsetWidth;
    if (!width) return false;
    if (!force && width === tagFillWidth && pagesWrap.children.length > 1) return false;

    const chips = $$('.tag-chip', widget);
    if (chips.length < 2) {
      tagFillWidth = width;
      return false;
    }

    const host = document.createElement('div');
    host.className = 'widget-tags';
    host.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
    const cloud = document.createElement('div');
    cloud.className = 'tag-cloud';
    cloud.style.width = `${width}px`;
    host.appendChild(cloud);
    document.body.appendChild(host);

    const heights = new Map();
    const measure = (start, end) => {
      const key = `${start},${end}`;
      if (heights.has(key)) return heights.get(key);
      cloud.replaceChildren();
      for (let i = start; i < end; i += 1) cloud.appendChild(chips[i].cloneNode(true));
      const height = cloud.getBoundingClientRect().height;
      heights.set(key, height);
      return height;
    };

    cloud.replaceChildren();
    cloud.appendChild(chips[0].cloneNode(true));
    const chipHeight = cloud.getBoundingClientRect().height;
    const rowGap = parseFloat(getComputedStyle(cloud).rowGap) || 0;
    const target = chipHeight * TAG_PAGE_ROWS + rowGap * (TAG_PAGE_ROWS - 1);

    const count = chips.length;
    let chosen = null;
    for (let pageCount = 1; pageCount <= count; pageCount += 1) {
      const maxDp = Array.from({ length: pageCount + 1 }, () => new Array(count + 1).fill(Infinity));
      const minDp = Array.from({ length: pageCount + 1 }, () => new Array(count + 1).fill(-Infinity));
      const prev = Array.from({ length: pageCount + 1 }, () => new Array(count + 1).fill(0));
      maxDp[0][0] = 0;
      minDp[0][0] = Infinity;

      for (let p = 1; p <= pageCount; p += 1) {
        for (let i = 1; i <= count; i += 1) {
          for (let j = p - 1; j < i; j += 1) {
            if (!Number.isFinite(maxDp[p - 1][j])) continue;
            const height = measure(j, i);
            const max = Math.max(maxDp[p - 1][j], height);
            const min = Math.min(minDp[p - 1][j], height);
            const sameMax = Math.abs(max - maxDp[p][i]) <= 0.01;
            const better = max < maxDp[p][i] - 0.01
              || (sameMax && min > minDp[p][i] + 0.01)
              || (sameMax && Math.abs(min - minDp[p][i]) <= 0.01 && j > prev[p][i]);
            if (better) {
              maxDp[p][i] = max;
              minDp[p][i] = min;
              prev[p][i] = j;
            }
          }
        }
      }

      if (maxDp[pageCount][count] <= target + 0.5) {
        chosen = { pageCount, prev };
        break;
      }
    }

    if (!chosen) {
      host.remove();
      return false;
    }

    const parts = [];
    let end = count;
    for (let p = chosen.pageCount; p >= 1; p -= 1) {
      const start = chosen.prev[p][end];
      parts.unshift([start, end]);
      end = start;
    }

    pagesWrap.replaceChildren();
    parts.forEach(([start, stop], i) => {
      const page = document.createElement('div');
      page.className = `carousel-page${i === 0 ? ' is-active' : ''}`;
      if (i > 0) page.setAttribute('inert', '');
      const pageCloud = document.createElement('div');
      pageCloud.className = 'tag-cloud';
      for (let k = start; k < stop; k += 1) pageCloud.appendChild(chips[k].cloneNode(true));
      page.appendChild(pageCloud);
      pagesWrap.appendChild(page);
    });

    dotsWrap.replaceChildren();
    parts.forEach((part, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `carousel-dot${i === 0 ? ' is-active' : ''}`;
      dot.setAttribute('aria-label', `第 ${i + 1} 组标签`);
      dotsWrap.appendChild(dot);
    });

    host.remove();
    tagFillWidth = width;
    setupCarousel(widget);
    return true;
  }

  function fillSidebarTags(force) {
    const widget = $('.widget-tags[data-tag-fill]');
    if (!widget) return;
    if (buildTagPages(widget, force)) scheduleSidebarFit();
  }

  function scheduleTagFill(force) {
    if (tagFillFrame) return;
    tagFillFrame = window.requestAnimationFrame(() => {
      tagFillFrame = 0;
      fillSidebarTags(force);
    });
  }

  function initSidebarTagFill() {
    scheduleTagFill(true);
    window.addEventListener('resize', () => scheduleTagFill(false), { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => scheduleTagFill(true)).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------ *
   * Navigation indicator
   * ------------------------------------------------------------------ */

  let navIndicator = null;
  let navIndicatorWrap = null;
  let navIndicatorFrame = 0;

  function setIndicatorGeometry(x, y, width, height) {
    navIndicator.style.setProperty('--ind-x', `${x}px`);
    navIndicator.style.setProperty('--ind-y', `${y}px`);
    navIndicator.style.setProperty('--ind-w', `${width}px`);
    navIndicator.style.setProperty('--ind-h', `${height}px`);
  }

  function updateNavIndicator() {
    if (!navIndicator || !navIndicatorWrap) return;

    if (navIndicatorWrap.offsetParent === null) {
      navIndicator.classList.add('is-hidden');
      return;
    }

    const active = $('.nav-link.is-active', navIndicatorWrap);
    if (!active) {
      navIndicator.classList.add('is-hidden');
      return;
    }

    const wrapRect = navIndicatorWrap.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    setIndicatorGeometry(
      rect.left - wrapRect.left,
      rect.top - wrapRect.top,
      rect.width,
      rect.height
    );
    navIndicator.classList.remove('is-hidden');
  }

  function scheduleNavIndicator() {
    if (navIndicatorFrame) return;
    navIndicatorFrame = window.requestAnimationFrame(() => {
      navIndicatorFrame = 0;
      updateNavIndicator();
    });
  }

  function initNavIndicator() {
    navIndicatorWrap = $('.nav-links');
    if (!navIndicatorWrap) return;

    navIndicator = $('.nav-indicator', navIndicatorWrap);
    if (!navIndicator) {
      navIndicator = document.createElement('span');
      navIndicator.className = 'nav-indicator';
      navIndicator.setAttribute('aria-hidden', 'true');
      navIndicator.innerHTML = '<span class="nav-indicator-dot"></span>';
      navIndicatorWrap.prepend(navIndicator);
    }

    navIndicatorWrap.classList.add('has-indicator');

    updateNavIndicator();
    window.requestAnimationFrame(() => navIndicator.classList.add('is-ready'));

    navIndicatorWrap.addEventListener('click', (event) => {
      const link = event.target.closest('.nav-link');
      if (!link) return;
      $$('.nav-link', navIndicatorWrap).forEach((item) => {
        const active = item === link;
        item.classList.toggle('is-active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      scheduleNavIndicator();
    });

    scheduleNavIndicator();
    window.addEventListener('resize', scheduleNavIndicator, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleNavIndicator).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------ *
   * Navigation helper
   * ------------------------------------------------------------------ */

  function navigate(url) {
    if (window.__tideSwup) {
      window.__tideSwup.navigate(url);
    } else {
      window.location.href = url;
    }
  }

  /* ------------------------------------------------------------------ *
   * Preload adjacent posts
   * ------------------------------------------------------------------ */

  let adjacentPreloadIdle = 0;

  function preloadAdjacentPosts() {
    const swup = window.__tideSwup;
    if (!swup || typeof swup.preload !== 'function') return;

    const connection = navigator.connection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''))) return;

    const links = $$('.post-nav-item[href]');
    if (!links.length) return;

    if ('cancelIdleCallback' in window && adjacentPreloadIdle) {
      window.cancelIdleCallback(adjacentPreloadIdle);
    } else if (adjacentPreloadIdle) {
      window.clearTimeout(adjacentPreloadIdle);
    }

    const run = () => {
      adjacentPreloadIdle = 0;
      links.forEach((link) => {
        swup.preload(link.href).catch(() => {});
      });
    };

    if ('requestIdleCallback' in window) {
      adjacentPreloadIdle = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      adjacentPreloadIdle = window.setTimeout(run, 600);
    }
  }

  /* ------------------------------------------------------------------ *
   * Reveal on scroll
   * ------------------------------------------------------------------ */

  let revealObserver = null;

  function initReveal() {
    const nodes = $$('[data-reveal]:not(.is-visible)');
    if (!nodes.length) return;

    if (body.dataset.revealEnabled !== 'true') {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
    }

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight) {
        node.classList.add('is-visible');
      } else {
        revealObserver.observe(node);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * GitHub contribution heatmap (about page)
   * ------------------------------------------------------------------ */

  const githubCache = new Map();

  function parseGithubDate(value) {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function buildGithubHeatmap(data) {
    const contributions = data.contributions || [];
    if (!contributions.length) {
      return '<p class="github-error">暂时没有可展示的提交数据。</p>';
    }

    const first = parseGithubDate(contributions[0].date);
    const offset = first.getUTCDay();
    const weeks = Math.ceil((offset + contributions.length) / 7);
    const cell = 11;
    const gap = 2;
    const step = cell + gap;
    const left = 30;
    const top = 20;
    const width = left + weeks * step + 8;
    const height = top + 7 * step + 30;

    const monthLabels = [];
    let lastMonth = -1;
    contributions.forEach((item, index) => {
      const date = parseGithubDate(item.date);
      if (date.getUTCDate() !== 1 && index !== 0) return;
      const month = date.getUTCMonth();
      if (month === lastMonth) return;
      const week = Math.floor((offset + index) / 7);
      if (!monthLabels.length || week - monthLabels[monthLabels.length - 1].week >= 3) {
        monthLabels.push({ week, label: `${month + 1}月` });
        lastMonth = month;
      }
    });

    const monthText = monthLabels
      .map((item) => `<text x="${left + item.week * step}" y="10" class="heatmap-month">${item.label}</text>`)
      .join('');

    const dayText = [1, 3, 5]
      .map((day) => {
        const label = ['', 'Mon', '', 'Wed', '', 'Fri', ''][day];
        return `<text x="0" y="${top + day * step + cell - 1}" class="heatmap-day">${label}</text>`;
      })
      .join('');

    const rects = contributions
      .map((item, index) => {
        const position = offset + index;
        const week = Math.floor(position / 7);
        const day = position % 7;
        const level = Math.max(0, Math.min(4, Number(item.level) || 0));
        const count = Number(item.count) || 0;
        return `<rect x="${left + week * step}" y="${top + day * step}" width="${cell}" height="${cell}" rx="2" class="heat-cell level-${level}"><title>${item.date} · ${count} 次提交</title></rect>`;
      })
      .join('');

    const total = data.total && typeof data.total.lastYear === 'number'
      ? data.total.lastYear
      : contributions.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

    const legendY = top + 7 * step + 12;
    const legendX = width - 128;
    const legendRects = [0, 1, 2, 3, 4]
      .map((level, index) => `<rect x="${legendX + 20 + index * 15}" y="${legendY - 9}" width="${cell}" height="${cell}" rx="2" class="heat-cell level-${level}"></rect>`)
      .join('');
    const legend = `<g class="heat-legend"><text x="${legendX}" y="${legendY}">少</text>${legendRects}<text x="${legendX + 20 + 5 * 15 + 2}" y="${legendY}">多</text></g>`;

    return `<svg class="heatmap-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub 最近一年提交热力图，共 ${total} 次提交">${monthText}${dayText}${rects}${legend}</svg>`;
  }

  function initGithubHeatmap() {
    const card = $('[data-github-heatmap]');
    if (!card || card.dataset.githubReady === 'true') return;
    const user = card.dataset.githubUser;
    const chart = $('[data-github-chart]', card);
    const totalEl = $('[data-github-total]', card);
    if (!user || !chart) return;

    const render = (data) => {
      chart.innerHTML = buildGithubHeatmap(data);
      if (totalEl) {
        const total = data.total && typeof data.total.lastYear === 'number'
          ? data.total.lastYear
          : (data.contributions || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
        totalEl.textContent = `${total} 次提交`;
      }
      card.dataset.githubReady = 'true';
    };

    if (githubCache.has(user)) {
      render(githubCache.get(user));
      return;
    }

    chart.innerHTML = '<p class="github-loading">正在加载 GitHub 活动…</p>';
    fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, {
      credentials: 'omit'
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        githubCache.set(user, data);
        render(data);
      })
      .catch((error) => {
        console.warn('[tidepool] GitHub heatmap failed:', error);
        chart.innerHTML = `<p class="github-error">热力图暂时不可用，<a href="https://github.com/${encodeURIComponent(user)}" target="_blank" rel="noopener noreferrer">去 GitHub 看看</a>。</p>`;
        if (totalEl) totalEl.textContent = '—';
      });
  }

  /* ------------------------------------------------------------------ *
   * Infinite scrolling for post lists
   * ------------------------------------------------------------------ */

  let infiniteList = null;
  let infiniteSentinel = null;
  let infiniteLoader = null;
  let infiniteNext = '';
  let infiniteLoading = false;
  let infiniteDone = false;

  function initInfiniteList() {
    const list = $('.post-list[data-next]');
    if (list && list === infiniteList && infiniteSentinel && infiniteSentinel.isConnected) {
      maybeLoadMore();
      return;
    }

    infiniteList = list || null;
    infiniteSentinel = null;
    infiniteLoader = null;
    infiniteNext = list ? list.dataset.next || '' : '';
    infiniteLoading = false;
    infiniteDone = !infiniteNext;

    if (!infiniteList || !infiniteNext) return;

    infiniteLoader = document.createElement('div');
    infiniteLoader.className = 'list-loader';
    infiniteLoader.hidden = true;
    infiniteLoader.innerHTML = '<span aria-hidden="true"></span>';

    infiniteSentinel = document.createElement('div');
    infiniteSentinel.className = 'list-sentinel';
    infiniteSentinel.setAttribute('aria-hidden', 'true');

    infiniteList.after(infiniteLoader);
    infiniteLoader.after(infiniteSentinel);
    window.setTimeout(maybeLoadMore, 250);
  }

  function finishInfinite() {
    infiniteDone = true;
    infiniteNext = '';
    if (infiniteLoader) {
      infiniteLoader.hidden = true;
      infiniteLoader.remove();
      infiniteLoader = null;
    }
    if (infiniteSentinel) {
      infiniteSentinel.remove();
      infiniteSentinel = null;
    }
  }

  function maybeLoadMore() {
    if (!infiniteList || infiniteDone || infiniteLoading || !infiniteNext) return;
    if (!infiniteSentinel || !infiniteSentinel.isConnected) return;
    if (infiniteSentinel.getBoundingClientRect().top > window.innerHeight + 320) return;

    infiniteLoading = true;
    if (infiniteLoader) infiniteLoader.hidden = false;

    fetch(infiniteNext, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nextList = doc.querySelector('.post-list[data-next]');
        if (!nextList) {
          finishInfinite();
          return;
        }
        const cards = $$('.post-card', nextList);
        if (!cards.length) {
          finishInfinite();
          return;
        }
        cards.forEach((card) => {
          card.classList.add('is-appended');
          infiniteList.appendChild(card);
        });
        updatePostCovers();
        scheduleCoverPreload();
        infiniteNext = nextList.dataset.next || '';
        infiniteList.dataset.next = infiniteNext;
        if (!infiniteNext) finishInfinite();
      })
      .catch((error) => {
        console.warn('[tidepool] load more failed:', error);
        finishInfinite();
      })
      .finally(() => {
        infiniteLoading = false;
        if (infiniteLoader && !infiniteDone) infiniteLoader.hidden = true;
        if (!infiniteDone) window.setTimeout(maybeLoadMore, 120);
      });
  }

  /* ------------------------------------------------------------------ *
   * TOC + heading anchors
   * ------------------------------------------------------------------ */

  let headings = [];
  let tocLinks = [];
  let tocPanel = null;
  let tocCloseTimer = 0;
  let tocHideTimer = 0;
  let lastTocActive = '';

  function initToc() {
    headings = [];
    tocLinks = [];
    lastTocActive = '';
    window.clearTimeout(tocHideTimer);
    const article = $('[data-article]');
    const toggle = $('[data-toc-toggle]');
    tocPanel = $('#toc-panel');

    if (toggle && tocPanel) {
      toggle.onclick = (event) => {
        event.stopPropagation();
        window.clearTimeout(tocCloseTimer);
        const open = tocPanel.hidden || tocPanel.classList.contains('is-closing');
        if (open) {
          window.clearTimeout(tocHideTimer);
          tocPanel.hidden = false;
          tocPanel.classList.remove('is-closing');
          window.requestAnimationFrame(() => {
            tocPanel.classList.add('is-visible');
            const activeLink = $('.toc-body a.is-active', tocPanel);
            if (activeLink) activeLink.scrollIntoView({ block: 'center', behavior: 'auto' });
          });
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          closeTocPanel();
        }
      };

      tocPanel.onclick = (event) => {
        if (event.target.closest('a')) window.setTimeout(closeTocPanel, 140);
      };

      if (!root.dataset.tocOutside) {
        root.dataset.tocOutside = 'true';
        document.addEventListener('click', (event) => {
          if (!event.target.closest('.toc-fab-wrap')) closeTocPanel();
        });
      }

      const tocWrap = $('.toc-fab-wrap');
      const cancelClose = () => window.clearTimeout(tocCloseTimer);
      const scheduleClose = () => {
        window.clearTimeout(tocCloseTimer);
        tocCloseTimer = window.setTimeout(closeTocPanel, 180);
      };
      if (tocWrap) {
        tocWrap.onmouseenter = cancelClose;
        tocWrap.onmouseleave = scheduleClose;
      }
      tocPanel.onmouseenter = cancelClose;
      tocPanel.onmouseleave = scheduleClose;
    }

    if (!article) return;

    const allHeadings = $$('h2, h3, h4', article).filter((heading) => heading.id);
    tocLinks = $$('.toc-body a');

    const tocIds = new Set();
    tocLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      try {
        tocIds.add(decodeURIComponent(href.slice(1)));
      } catch (error) {
        tocIds.add(href.slice(1));
      }
    });
    headings = allHeadings.filter((heading) => tocIds.has(heading.id));

    if (body.dataset.anchor === 'true') {
      allHeadings.forEach((heading) => {
        if (heading.querySelector('.heading-anchor')) return;
        const link = document.createElement('a');
        link.className = 'heading-anchor';
        link.href = `#${heading.id}`;
        link.textContent = '#';
        link.setAttribute('aria-label', `链接到：${heading.textContent.trim()}`);
        heading.appendChild(link);
      });
    }

    updateTocActive();
  }

  function closeTocPanel() {
    window.clearTimeout(tocCloseTimer);
    if (!tocPanel || tocPanel.hidden || tocPanel.classList.contains('is-closing')) return;
    const toggle = $('[data-toc-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    tocPanel.classList.remove('is-visible');
    tocPanel.classList.add('is-closing');
    window.clearTimeout(tocHideTimer);
    tocHideTimer = window.setTimeout(() => {
      if (!tocPanel) return;
      tocPanel.hidden = true;
      tocPanel.classList.remove('is-closing');
    }, 340);
  }

  function updateTocActive() {
    if (!headings.length || !tocLinks.length) return;
    let active = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 150) active = heading;
      else break;
    }
    const id = active ? active.id : '';

    if (id !== lastTocActive) {
      lastTocActive = id;
      if (id && tocPanel && !tocPanel.hidden) {
        const activeLink = tocLinks.find((link) => {
          const href = link.getAttribute('href') || '';
          try {
            return decodeURIComponent(href.slice(1)) === id;
          } catch (error) {
            return href.slice(1) === id;
          }
        });
        if (activeLink) {
          activeLink.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }

    tocLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      let target = href.slice(1);
      try {
        target = decodeURIComponent(target);
      } catch (error) {
        /* keep the raw value */
      }
      link.classList.toggle('is-active', target === id);
    });
  }

  /* ------------------------------------------------------------------ *
   * Code copy
   * ------------------------------------------------------------------ */

  function initCodeCopy() {
    if (body.dataset.codeCopy !== 'true') return;

    $$('.highlight').forEach((figure) => {
      $('.code-copy', figure)?.remove();
      $('.code-lang', figure)?.remove();

      const pre = $('.code pre', figure) || $('pre', figure);
      if (!pre) return;

      const language = Array.from(figure.classList)
        .find((name) => name !== 'highlight' && name !== 'code');
      if (language) {
        const label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = language.replace(/^language-/, '');
        figure.appendChild(label);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.setAttribute('aria-label', '复制代码');
      button.title = '复制代码';
      button.innerHTML = ICONS.copy;
      figure.appendChild(button);

      button.addEventListener('click', async () => {
        const code = pre.innerText.replace(/\n$/, '');
        try {
          await copyText(code);
          button.innerHTML = ICONS.check;
          button.classList.add('is-copied');
        } catch (error) {
          button.title = '复制失败';
        }
        window.setTimeout(() => {
          button.innerHTML = ICONS.copy;
          button.classList.remove('is-copied');
          button.title = '复制代码';
        }, 1600);
      });
    });
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  /* ------------------------------------------------------------------ *
   * Image lightbox
   * ------------------------------------------------------------------ */

  let lightbox = null;
  let lightboxImage = null;

  function ensureLightbox() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.hidden = true;
    lightbox.innerHTML = `<button class="lightbox-close" type="button" aria-label="关闭">${ICONS.close}</button><img alt="">`;
    document.body.appendChild(lightbox);
    lightboxImage = $('img', lightbox);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox || event.target.closest('.lightbox-close')) closeLightbox();
    });
  }

  function initImages() {
    if (body.dataset.imageZoom !== 'true') return;
    ensureLightbox();

    $$('[data-article] img').forEach((image) => {
      if (!image.hasAttribute('loading')) image.setAttribute('loading', 'lazy');
      if (!image.hasAttribute('decoding')) image.setAttribute('decoding', 'async');

      image.onclick = (event) => {
        event.preventDefault();
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt || '';
        lightbox.hidden = false;
        setLocked(true);
      };
    });
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImage.removeAttribute('src');
    setLocked(false);
  }

  /* ------------------------------------------------------------------ *
   * Math
   * ------------------------------------------------------------------ */

  let mathRetries = 0;

  function initMath() {
    if (body.dataset.math !== 'true') return;
    const scope = $('#swup');
    if (!scope) return;

    if (typeof window.renderMathInElement !== 'function') {
      if (mathRetries < 20) {
        mathRetries += 1;
        window.setTimeout(initMath, 150);
      }
      return;
    }

    try {
      window.renderMathInElement(scope, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        strict: false,
        errorColor: '#d14b6a',
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
      });
    } catch (error) {
      console.warn('[tidepool] math render failed:', error);
    }
  }

  /* ------------------------------------------------------------------ *
   * Scroll-driven UI
   * ------------------------------------------------------------------ */

  let ticking = false;
  let progressEl = null;
  let backToTopEl = null;

  function scrollHandler() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      updateProgress();
      updateBackToTop();
      updateNavState();
      updateTocActive();
      maybeLoadMore();
    });
  }

  function updateProgress() {
    if (body.dataset.progress !== 'true') return;
    if (!progressEl) progressEl = $('#reading-progress');
    if (!progressEl) return;
    const bar = $('.reading-progress-bar', progressEl);
    if (!bar) return;

    const article = $('.post [data-article]');
    if (!article) {
      bar.style.width = '0%';
      return;
    }

    const rect = article.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const start = articleTop - 120;
    const end = articleTop + article.offsetHeight - window.innerHeight;
    const total = Math.max(1, end - start);
    const ratio = clampi((window.scrollY - start) / total, 0, 1);
    bar.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  function updateBackToTop() {
    if (!backToTopEl) backToTopEl = $('#back-to-top');
    if (body.dataset.backToTop !== 'true') {
      if (backToTopEl) backToTopEl.hidden = true;
      return;
    }
    if (!backToTopEl) return;
    const visible = window.scrollY > 220;
    backToTopEl.hidden = !visible;
  }

  function updateNavState() {
    const nav = $('#navbar') || $('.nav');
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  function initScrollUi() {
    progressEl = $('#reading-progress');
    backToTopEl = $('#back-to-top');

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler, { passive: true });

    if (backToTopEl) {
      backToTopEl.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    scrollHandler();
  }

  /* ------------------------------------------------------------------ *
   * Nav active state + in-page anchors
   * ------------------------------------------------------------------ */

  function isTaxonomyPath(path) {
    const dir = (name) => `/${String(name || '').replace(/^\/+|\/+$/g, '')}`;
    const categories = dir(body.dataset.categoryDir || 'categories');
    const tags = dir(body.dataset.tagDir || 'tags');
    return path === categories || path.startsWith(`${categories}/`)
      || path === tags || path.startsWith(`${tags}/`);
  }

  function initActiveNav() {
    const path = normalizePath(window.location.pathname);
    const taxonomy = isTaxonomyPath(path);
    $$('.nav-link, .mobile-link').forEach((link) => {
      const href = normalizePath(new URL(link.href, window.location.origin).pathname);
      const active = href === '/'
        ? path === '/' || path.startsWith('/page/') || taxonomy
        : href === path || path.startsWith(`${href}/`);
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    scheduleNavIndicator();
  }

  function normalizePath(value) {
    const path = String(value || '/').replace(/index\.html$/, '').replace(/\/+$/, '');
    return path || '/';
  }

  function initAnchors() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || link.target === '_blank' || link.hasAttribute('data-no-swup')) return;

      if (href.startsWith('#')) {
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', href);
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      if (/\.(png|jpe?g|gif|webp|svg|avif|pdf|zip|gz|mp4|mp3|wav|txt|json)$/i.test(url.pathname)) {
        link.setAttribute('data-no-swup', '');
        return;
      }

      if (url.pathname === window.location.pathname && url.hash) {
        const target = document.getElementById(url.hash.slice(1));
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', url.hash);
      }
    }, true);
  }

  /* ------------------------------------------------------------------ *
   * Swup
   * ------------------------------------------------------------------ */

  function initSwup() {
    if (body.dataset.swup !== 'true' || typeof window.Swup !== 'function') return;

    const plugins = [];
    if (typeof window.SwupHeadPlugin === 'function') {
      plugins.push(new window.SwupHeadPlugin({ awaitAssets: false, timeout: 2000 }));
    }
    if (body.dataset.preload === 'true' && typeof window.SwupPreloadPlugin === 'function') {
      plugins.push(new window.SwupPreloadPlugin());
    }

    const swup = new window.Swup({
      containers: ['#swup'],
      plugins,
      cache: true
    });

    window.__tideSwup = swup;

    swup.hooks.on('visit:start', () => {
      closeSearch();
      closeMenu();
      closePalette();
      closeFriends();
      closeTocPanel();
    });

    swup.hooks.on('content:replace', (visit) => {
      if (visit && visit.to && visit.to.hash) return;
      jumpToTop();
    });

    swup.hooks.on('page:view', () => {
      initPage();
      scheduleSidebarFit();
      settleTop();
      if (window.location.hash) {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (target) {
          window.setTimeout(() => {
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          }, 60);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Page bootstrap
   * ------------------------------------------------------------------ */

  let instantScrollTimer = 0;

  function jumpToTop() {
    root.classList.add('is-instant-scroll');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.clearTimeout(instantScrollTimer);
    instantScrollTimer = window.setTimeout(() => {
      root.classList.remove('is-instant-scroll');
    }, 400);
  }

  function settleTop() {
    if (window.location.hash) return;
    jumpToTop();
    window.requestAnimationFrame(() => {
      jumpToTop();
      window.setTimeout(jumpToTop, 90);
      window.setTimeout(jumpToTop, 320);
    });
  }

  function initPage() {
    initActiveNav();
    initReveal();
    initInfiniteList();
    initToc();
    initCodeCopy();
    initImages();
    initGithubHeatmap();
    initMath();
    updatePostCovers();
    scheduleCoverPreload();
    preloadAdjacentPosts();
    scrollHandler();
  }

  function boot() {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    initTheme();
    initPalette();
    initMenu();
    initFriends();
    initSearch();
    initKeyboard();
    initSidebarTagFill();
    initCarousels();
    initSidebarFit();
    initNavIndicator();
    initScrollUi();
    initAnchors();
    initSwup();
    initPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
