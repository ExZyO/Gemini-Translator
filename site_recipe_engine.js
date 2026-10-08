(function (global) {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════════════
  // SITE RECIPE ENGINE (MANUAL SITE SETTINGS & UNIVERSAL WEB CRAWLER OVERRIDES)
  // ══════════════════════════════════════════════════════════════════════════════════

  const SHARE_PREFIX = (typeof window !== 'undefined' && window.SITE_RECIPE_SHARE_PREFIX) || 'GTRECIPE1:';
  const MAX_NEXT_HOPS = (typeof window !== 'undefined' && window.SITE_RECIPE_MAX_NEXT_HOPS) || 5000;
  const MAX_TOC_PAGES = (typeof window !== 'undefined' && window.SITE_RECIPE_MAX_TOC_PAGES) || 200;
  const MAX_DELAY_MS = (typeof window !== 'undefined' && window.SITE_RECIPE_MAX_DELAY_MS) || 10000;
  const MIN_CONTENT_CHARS = (typeof window !== 'undefined' && window.SITE_RECIPE_MIN_CONTENT_CHARS) || 35;
  const PREVIEW_CHARS = (typeof window !== 'undefined' && window.SITE_RECIPE_PREVIEW_CHARS) || 1500;

  const NAV_TEXT_RE = /^(?:[«‹<]+\s*)?(?:previous|prev|next|back|index|table of contents|toc|chapter list)(?:\s+chapter)?(?:\s*[»›>]+)?$/i;
  const NEXT_LINK_TEXT_RE = /^(?:next(?:\s+chapter)?|下一章|다음|次へ|siguiente|suivant)\s*[»›>]*$/i;
  const TOC_NEXT_TEXT_RE = /^(?:next|›|»|>|>>|next page|下一页|다음)$/i;

  // In-memory cache of recipes by normalized hostname
  const _recipesMap = new Map();
  let _readyPromise = null;
  let _isInitialized = false;

  // Safe DOM query delegation
  function safeQuerySelector(root, sel) {
    if (typeof window !== 'undefined' && window.safeQuerySelector) {
      return window.safeQuerySelector(root, sel);
    }
    try { return root ? root.querySelector(sel) : null; } catch (_) { return null; }
  }

  function safeQuerySelectorAll(root, sel) {
    if (typeof window !== 'undefined' && window.safeQuerySelectorAll) {
      return window.safeQuerySelectorAll(root, sel);
    }
    try { return root ? Array.from(root.querySelectorAll(sel)) : []; } catch (_) { return []; }
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 1. STORAGE & NORMALIZATION
  // ══════════════════════════════════════════════════════════════════════════════════

  function normalizeHost(urlOrHost) {
    if (!urlOrHost || typeof urlOrHost !== 'string') return '';
    let raw = urlOrHost.trim();
    if (!raw) return '';

    try {
      if (!/^https?:\/\//i.test(raw)) {
        raw = 'https://' + raw;
      }
      const parsed = new URL(raw);
      let host = (parsed.hostname || '').toLowerCase();
      // Strip leading www., m., mobile.
      host = host.replace(/^(?:www|m|mobile)\./i, '');
      return host;
    } catch (_) {
      // Fallback for bare domains without protocol
      let cleaned = urlOrHost.trim().toLowerCase().split('/')[0].split(':')[0];
      cleaned = cleaned.replace(/^(?:www|m|mobile)\./i, '');
      return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned) ? cleaned : '';
    }
  }

  function withDefaults(partial) {
    const p = partial && typeof partial === 'object' ? partial : {};
    const book = p.book && typeof p.book === 'object' ? p.book : {};
    const chapter = p.chapter && typeof p.chapter === 'object' ? p.chapter : {};
    const cleanup = p.cleanup && typeof p.cleanup === 'object' ? p.cleanup : {};
    const network = p.network && typeof p.network === 'object' ? p.network : {};
    const testUrls = p.testUrls && typeof p.testUrls === 'object' ? p.testUrls : {};

    const rawReplacements = Array.isArray(cleanup.replacements) ? cleanup.replacements : [];
    const cleanReplacements = rawReplacements
      .filter(r => r && typeof r === 'object' && typeof r.find === 'string' && r.find.trim())
      .map(r => ({
        find: r.find.trim().slice(0, 500),
        replace: typeof r.replace === 'string' ? r.replace : '',
        isRegex: Boolean(r.isRegex)
      }));

    const delayMs = parseInt(network.delayMs, 10);
    const clampedDelay = isNaN(delayMs) ? 0 : Math.max(0, Math.min(MAX_DELAY_MS, delayMs));

    const bookUrl = typeof p.bookUrl === 'string' ? p.bookUrl : (typeof testUrls.book === 'string' ? testUrls.book : '');
    const chapterUrl = typeof p.chapterUrl === 'string' ? p.chapterUrl : (typeof testUrls.chapter === 'string' ? testUrls.chapter : '');

    let rawRemoves = [];
    if (Array.isArray(chapter.removeSelectors)) {
      rawRemoves = chapter.removeSelectors;
    } else if (typeof chapter.removeSelector === 'string') {
      rawRemoves = chapter.removeSelector.split(',').map(s => s.trim());
    } else if (typeof chapter.removeSelectors === 'string') {
      rawRemoves = chapter.removeSelectors.split(',').map(s => s.trim());
    }
    const cleanRemoves = rawRemoves
      .map(s => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);

    const id = normalizeHost(p.id || p.name || bookUrl || chapterUrl || '');

    return {
      id: id,
      name: (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : id,
      enabled: p.enabled !== false,
      schema: 1,
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
      bookUrl: bookUrl,
      chapterUrl: chapterUrl,
      testUrls: {
        book: bookUrl,
        chapter: chapterUrl
      },
      mode: (p.mode === 'next') ? 'next' : 'list',
      book: {
        titleSelector: typeof book.titleSelector === 'string' ? book.titleSelector.trim() : '',
        authorSelector: typeof book.authorSelector === 'string' ? book.authorSelector.trim() : '',
        coverSelector: typeof book.coverSelector === 'string' ? book.coverSelector.trim() : '',
        summarySelector: typeof book.summarySelector === 'string' ? book.summarySelector.trim() : '',
        chapterLinkSelector: typeof book.chapterLinkSelector === 'string' ? book.chapterLinkSelector.trim() : '',
        tocNextPageSelector: typeof book.tocNextPageSelector === 'string' ? book.tocNextPageSelector.trim() : '',
        firstChapterSelector: typeof book.firstChapterSelector === 'string' ? book.firstChapterSelector.trim() : '',
        reverseOrder: Boolean(book.reverseOrder)
      },
      chapter: {
        contentSelector: typeof chapter.contentSelector === 'string' ? chapter.contentSelector.trim() : '',
        titleSelector: typeof chapter.titleSelector === 'string' ? chapter.titleSelector.trim() : '',
        removeSelector: cleanRemoves.join(', '),
        removeSelectors: cleanRemoves,
        nextLinkSelector: typeof chapter.nextLinkSelector === 'string' ? chapter.nextLinkSelector.trim() : ''
      },
      cleanup: {
        removeNavText: Boolean(cleanup.removeNavText),
        replacements: cleanReplacements
      },
      network: {
        delayMs: clampedDelay,
        skipBroken: Boolean(network.skipBroken)
      }
    };
  }

  async function reload() {
    _recipesMap.clear();
    try {
      if (typeof window !== 'undefined' && window.GeminiNovelDB && typeof window.GeminiNovelDB.getAllSiteRecipes === 'function') {
        const list = await window.GeminiNovelDB.getAllSiteRecipes();
        if (Array.isArray(list)) {
          list.forEach(item => {
            const recipe = withDefaults(item);
            if (recipe.id) {
              _recipesMap.set(recipe.id, recipe);
            }
          });
        }
      }
    } catch (err) {
      if (typeof window !== 'undefined' && window.AppLogger && typeof window.AppLogger.warn === 'function') {
        window.AppLogger.warn('[SiteRecipeEngine] reload error:', err);
      }
    }
    return Array.from(_recipesMap.values());
  }

  function init() {
    if (!_readyPromise) {
      _readyPromise = reload().then(() => {
        _isInitialized = true;
      });
    }
    return _readyPromise;
  }

  function ready() {
    if (!_readyPromise) return init();
    return _readyPromise;
  }

  function getAll() {
    const list = Array.from(_recipesMap.values());
    return list.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  }

  function get(id) {
    if (!id) return null;
    const norm = normalizeHost(id);
    return _recipesMap.get(norm) || null;
  }

  function findForUrl(url) {
    if (!url) return null;
    const host = normalizeHost(url);
    if (!host) return null;

    // 1. Direct host match
    const direct = _recipesMap.get(host);
    if (direct && direct.enabled) return direct;

    // 2. Parent domain fallbacks: sub.domain.example.com -> domain.example.com -> example.com
    const parts = host.split('.');
    while (parts.length > 2) {
      parts.shift();
      const parentHost = parts.join('.');
      const parentRecipe = _recipesMap.get(parentHost);
      if (parentRecipe && parentRecipe.enabled) {
        return parentRecipe;
      }
    }
    return null;
  }

  async function save(recipeInput) {
    const recipe = withDefaults(recipeInput);
    if (!recipe.id) {
      throw new Error('Recipe must have a valid website address or name.');
    }
    recipe.updatedAt = Date.now();
    if (!recipe.createdAt) recipe.createdAt = recipe.updatedAt;

    if (typeof window !== 'undefined' && window.GeminiNovelDB && typeof window.GeminiNovelDB.saveSiteRecipe === 'function') {
      await window.GeminiNovelDB.saveSiteRecipe(recipe);
    }
    _recipesMap.set(recipe.id, recipe);
    return recipe;
  }

  async function remove(id) {
    if (!id) return false;
    const norm = normalizeHost(id);
    if (typeof window !== 'undefined' && window.GeminiNovelDB && typeof window.GeminiNovelDB.deleteSiteRecipe === 'function') {
      await window.GeminiNovelDB.deleteSiteRecipe(norm);
    }
    _recipesMap.delete(norm);
    return true;
  }

  function createBlank(url) {
    const host = normalizeHost(url);
    return withDefaults({
      id: host,
      name: host,
      testUrls: { book: url || '', chapter: '' }
    });
  }

  function isBuiltInSite(url) {
    if (!url || typeof window === 'undefined') return false;
    try {
      if (window.WebNovelImporter && typeof window.WebNovelImporter.detectType === 'function') {
        const type = window.WebNovelImporter.detectType(url);
        if (type && type !== 'universal') return true;
      }
      if (window.sourceRegistry && typeof window.sourceRegistry.findPlugin === 'function') {
        const plugin = window.sourceRegistry.findPlugin(url);
        if (plugin && plugin.id && plugin.id !== 'universal') return true;
      }
    } catch (_) {}
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 2. RULE CLASSIFICATION
  // ══════════════════════════════════════════════════════════════════════════════════

  function hasBookTakeover(r) {
    if (!r) return false;
    return r.mode === 'next' ||
      Boolean(r.book && r.book.chapterLinkSelector) ||
      Boolean(r.book && r.book.tocNextPageSelector);
  }

  function hasMetaOverrides(r) {
    if (!r || !r.book) return false;
    return Boolean(
      r.book.titleSelector ||
      r.book.authorSelector ||
      r.book.coverSelector ||
      r.book.summarySelector
    );
  }

  function hasChapterRules(r) {
    if (!r || !r.chapter) return false;
    return Boolean(
      r.chapter.contentSelector ||
      r.chapter.titleSelector ||
      (Array.isArray(r.chapter.removeSelectors) && r.chapter.removeSelectors.length > 0)
    );
  }

  function hasTextCleanup(r) {
    if (!r || !r.cleanup) return false;
    return Boolean(
      r.cleanup.removeNavText ||
      (Array.isArray(r.cleanup.replacements) && r.cleanup.replacements.some(x => x && x.find))
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 3. EXTRACTION HELPERS
  // ══════════════════════════════════════════════════════════════════════════════════

  function resolveUrl(relativeOrAbsolute, baseUrl) {
    if (!relativeOrAbsolute) return '';
    try {
      return new URL(relativeOrAbsolute, baseUrl).href;
    } catch (_) {
      return relativeOrAbsolute;
    }
  }

  function genericBookInfo(doc, baseUrl) {
    if (!doc) return { title: '', author: '', cover: '', summary: '' };
    let title = '';
    let author = '';
    let cover = '';
    let summary = '';

    try {
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const h1 = doc.querySelector('h1')?.textContent;
      title = (ogTitle || h1 || doc.title || '').trim();

      const metaAuthor = doc.querySelector('meta[name="author"], meta[property="book:author"]')?.getAttribute('content');
      const authorEl = doc.querySelector('.author, .novel-author, [rel="author"]')?.textContent;
      author = (metaAuthor || authorEl || '').trim();

      if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.extractPageCover === 'function') {
        cover = window.WebNovelImporter.extractPageCover(doc, baseUrl);
      } else {
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) cover = resolveUrl(ogImage, baseUrl);
      }

      const ogDesc = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute('content');
      const descEl = doc.querySelector('.description, .synopsis, #description, .summary')?.textContent;
      summary = (ogDesc || descEl || '').trim();
    } catch (_) {}

    return { title, author, cover, summary };
  }

  function extractBookInfo(doc, r, baseUrl) {
    if (!doc) return { title: '', author: '', cover: '', summary: '' };
    const result = { title: '', author: '', cover: '', summary: '' };

    if (!r || !r.book) return result;

    if (r.book.titleSelector) {
      const el = safeQuerySelector(doc, r.book.titleSelector);
      if (el) result.title = (el.textContent || '').trim();
    }

    if (r.book.authorSelector) {
      const el = safeQuerySelector(doc, r.book.authorSelector);
      if (el) result.author = (el.textContent || '').trim();
    }

    if (r.book.coverSelector) {
      const el = safeQuerySelector(doc, r.book.coverSelector);
      if (el) {
        if (el.tagName && el.tagName.toLowerCase() === 'img') {
          if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.getBestImageUrl === 'function') {
            result.cover = window.WebNovelImporter.getBestImageUrl(el, baseUrl);
          } else {
            result.cover = resolveUrl(el.getAttribute('src') || el.getAttribute('data-src') || '', baseUrl);
          }
        } else {
          const imgChild = el.querySelector('img');
          if (imgChild) {
            if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.getBestImageUrl === 'function') {
              result.cover = window.WebNovelImporter.getBestImageUrl(imgChild, baseUrl);
            } else {
              result.cover = resolveUrl(imgChild.getAttribute('src') || imgChild.getAttribute('data-src') || '', baseUrl);
            }
          } else {
            const rawAttr = el.getAttribute('content') || el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('data-src');
            if (rawAttr) result.cover = resolveUrl(rawAttr, baseUrl);
          }
        }
      }
    }

    if (r.book.summarySelector) {
      const el = safeQuerySelector(doc, r.book.summarySelector);
      if (el) result.summary = (el.textContent || '').trim();
    }

    return result;
  }

  function extractChapterLinks(doc, r, baseUrl) {
    if (!doc || !r || !r.book || !r.book.chapterLinkSelector) return [];
    const elements = safeQuerySelectorAll(doc, r.book.chapterLinkSelector);
    if (!elements || elements.length === 0) return [];

    const links = [];
    const seenUrls = new Set();

    elements.forEach((el, idx) => {
      let a = el;
      if (!a || a.tagName.toLowerCase() !== 'a') {
        a = (el.closest && el.closest('a[href]')) || el.querySelector('a[href]');
      }
      if (!a) return;

      const rawHref = a.getAttribute('href');
      if (!rawHref) return;
      const trimmedHref = rawHref.trim();
      if (!trimmedHref || trimmedHref.startsWith('#') || trimmedHref.startsWith('javascript:') || trimmedHref.startsWith('mailto:')) {
        return;
      }

      const absoluteUrl = resolveUrl(trimmedHref, baseUrl);
      const cleanUrl = absoluteUrl.split('#')[0].replace(/\/+$/, '');

      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        const titleText = (a.textContent || '').trim();
        links.push({
          title: titleText || `Chapter ${links.length + 1}`,
          url: absoluteUrl
        });
      }
    });

    if (r.book.reverseOrder) {
      links.reverse();
    }

    return links;
  }

  function findTocNextPage(doc, r, baseUrl) {
    if (!doc) return '';
    const selector = r && r.book && r.book.tocNextPageSelector ? r.book.tocNextPageSelector.trim() : '';
    if (!selector) return '';

    if (selector !== 'auto') {
      const el = safeQuerySelector(doc, selector);
      if (el) {
        let a = (el.tagName && el.tagName.toLowerCase() === 'a') ? el : el.querySelector('a[href]');
        if (a) {
          const href = a.getAttribute('href');
          return href ? resolveUrl(href, baseUrl) : '';
        }
      }
      return '';
    }

    // Auto-detect Next TOC page
    const autoCandidates = [
      'a[rel="next"]',
      'link[rel="next"]',
      '.pagination a.next',
      '.pagination li.active + li a',
      '.pager-next a',
      'a.next-page',
      'a.next'
    ];

    for (const cand of autoCandidates) {
      const el = safeQuerySelector(doc, cand);
      if (el) {
        const href = el.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          return resolveUrl(href, baseUrl);
        }
      }
    }

    const allLinks = safeQuerySelectorAll(doc, 'a[href]');
    for (const a of allLinks) {
      const txt = (a.textContent || '').trim();
      if (TOC_NEXT_TEXT_RE.test(txt)) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          return resolveUrl(href, baseUrl);
        }
      }
    }

    return '';
  }

  async function collectPagedChapterLinks(firstDoc, r, baseUrl, deps, ctrl, progressCb) {
    const allLinks = [];
    const seenPageUrls = new Set();
    const seenChapterUrls = new Set();

    let curDoc = firstDoc;
    let curUrl = baseUrl;
    let pageNum = 1;

    while (curDoc && pageNum <= MAX_TOC_PAGES) {
      if (ctrl && (ctrl.isCancelled || ctrl.isPaused)) break;

      const pageLinks = r.book.chapterLinkSelector
        ? extractChapterLinks(curDoc, r, curUrl)
        : [];

      for (const item of pageLinks) {
        const norm = item.url.split('#')[0].replace(/\/+$/, '');
        if (!seenChapterUrls.has(norm)) {
          seenChapterUrls.add(norm);
          allLinks.push(item);
        }
      }

      if (typeof progressCb === 'function') {
        progressCb(`Reading chapter list page ${pageNum} (${allLinks.length} chapters found)…`, Math.min(25, pageNum * 2));
      }

      const nextUrl = findTocNextPage(curDoc, r, curUrl);
      if (!nextUrl || seenPageUrls.has(nextUrl)) break;

      seenPageUrls.add(nextUrl);
      curUrl = nextUrl;
      pageNum++;

      if (!deps || typeof deps.fetchHtml !== 'function') break;
      try {
        const html = await deps.fetchHtml(nextUrl);
        if (!html) break;
        curDoc = new DOMParser().parseFromString(html, 'text/html');
      } catch (err) {
        if (typeof window !== 'undefined' && window.AppLogger && typeof window.AppLogger.warn === 'function') {
          window.AppLogger.warn(`[SiteRecipeEngine] Paged chapter list fetch error on page ${pageNum}:`, err);
        }
        break;
      }
    }

    return allLinks;
  }

  function isNavLineText(text) {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (NAV_TEXT_RE.test(trimmed)) return true;

    // Test pipe-separated or bullet-separated combined lines (e.g. Previous Chapter | Index | Next Chapter)
    const parts = trimmed.split(/\s*[|•·/]\s*/);
    if (parts.length >= 2) {
      const allMatch = parts.every(part => NAV_TEXT_RE.test(part.trim()));
      if (allMatch) return true;
    }
    return false;
  }

  function postProcessText(r, text) {
    if (!text || typeof text !== 'string') return '';
    let processed = text;

    // 1. Remove Navigation Text Lines
    if (r && r.cleanup && r.cleanup.removeNavText) {
      const lines = processed.split(/\r?\n/);
      const kept = [];
      for (const line of lines) {
        // Strip HTML tags for heuristic testing
        const stripped = line.replace(/<[^>]+>/g, '').trim();
        if (stripped && isNavLineText(stripped)) {
          continue; // drop line
        }
        kept.push(line);
      }
      processed = kept.join('\n');
    }

    // 2. Custom Find & Replace rules
    if (r && r.cleanup && Array.isArray(r.cleanup.replacements)) {
      for (const rep of r.cleanup.replacements) {
        if (!rep || !rep.find) continue;
        const findStr = rep.find;
        const replaceStr = rep.replace || '';

        if (rep.isRegex) {
          try {
            const rx = new RegExp(findStr, 'gi');
            processed = processed.replace(rx, replaceStr);
          } catch (e) {
            // Log invalid regex once and skip
            if (typeof window !== 'undefined' && window.AppLogger && typeof window.AppLogger.warn === 'function') {
              window.AppLogger.warn('[SiteRecipeEngine] Invalid find & replace regex:', findStr);
            }
          }
        } else {
          processed = processed.split(findStr).join(replaceStr);
        }
      }
    }

    return processed;
  }

  function extractChapter(doc, r, baseUrl) {
    if (!doc) return { title: '', text: '', rawChars: 0 };
    let title = '';

    // Title extraction
    if (r && r.chapter && r.chapter.titleSelector) {
      const tEl = safeQuerySelector(doc, r.chapter.titleSelector);
      if (tEl) title = (tEl.textContent || '').trim();
    }

    // Content container selection
    let container = null;
    if (r && r.chapter && r.chapter.contentSelector) {
      container = safeQuerySelector(doc, r.chapter.contentSelector);
    }
    if (!container && typeof window !== 'undefined' && window.ChameleonExtractor && typeof window.ChameleonExtractor.findBestContentNode === 'function') {
      container = window.ChameleonExtractor.findBestContentNode(doc);
    }

    if (!container) {
      return { title, text: '', rawChars: 0 };
    }

    // Clone container to modify safely
    const clone = container.cloneNode(true);

    // Remove user-specified junk selectors
    if (r && r.chapter && Array.isArray(r.chapter.removeSelectors)) {
      for (const sel of r.chapter.removeSelectors) {
        if (!sel || typeof sel !== 'string') continue;
        const matches = safeQuerySelectorAll(clone, sel);
        matches.forEach(m => {
          try { if (m.parentNode) m.parentNode.removeChild(m); } catch (_) {}
        });
      }
    }

    // Remove always-unwanted tags
    const junkTags = safeQuerySelectorAll(clone, 'script, style, iframe, noscript, svg, button');
    junkTags.forEach(j => {
      try { if (j.parentNode) j.parentNode.removeChild(j); } catch (_) {}
    });

    // Remove in-DOM navigation elements if requested
    if (r && r.cleanup && r.cleanup.removeNavText) {
      const linksAndButtons = safeQuerySelectorAll(clone, 'a, div, p, span');
      linksAndButtons.forEach(node => {
        const text = (node.textContent || '').trim();
        if (text && isNavLineText(text)) {
          if (node.tagName.toLowerCase() === 'a' || node.querySelector('a')) {
            try { if (node.parentNode) node.parentNode.removeChild(node); } catch (_) {}
          }
        }
      });
    }

    let rawHtml = clone.innerHTML || '';
    let cleanedText = '';
    if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.cleanChapterHtmlWithImages === 'function') {
      cleanedText = window.WebNovelImporter.cleanChapterHtmlWithImages(rawHtml, baseUrl);
    } else {
      cleanedText = rawHtml;
    }

    const finalText = postProcessText(r, cleanedText);
    const rawChars = finalText.replace(/<[^>]+>/g, '').trim().length;

    return {
      title,
      text: finalText,
      rawChars
    };
  }

  function findNextChapterLink(doc, r, baseUrl) {
    if (!doc) return '';

    // 1. Selector configured
    if (r && r.chapter && r.chapter.nextLinkSelector) {
      const el = safeQuerySelector(doc, r.chapter.nextLinkSelector);
      if (el) {
        const a = (el.tagName && el.tagName.toLowerCase() === 'a') ? el : el.querySelector('a[href]');
        if (a) {
          const href = a.getAttribute('href');
          if (href) return resolveUrl(href, baseUrl);
        }
      }
    }

    // 2. Auto-detect in standard order
    const autoSelectors = [
      'a[rel="next"]',
      'link[rel="next"]',
      '.next-link',
      '#next_url',
      '.next a',
      '.btn-next',
      '.nav-next a'
    ];

    for (const sel of autoSelectors) {
      const el = safeQuerySelector(doc, sel);
      if (el) {
        const href = el.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const full = resolveUrl(href, baseUrl);
          if (full !== baseUrl) return full;
        }
      }
    }

    // 3. Match text
    const allLinks = safeQuerySelectorAll(doc, 'a[href]');
    for (const a of allLinks) {
      const text = (a.textContent || '').trim();
      if (NEXT_LINK_TEXT_RE.test(text)) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const full = resolveUrl(href, baseUrl);
          if (full !== baseUrl) return full;
        }
      }
    }

    // 4. Match class or id containing next
    for (const a of allLinks) {
      const cls = ((a.className || '') + ' ' + (a.id || '')).toLowerCase();
      if (/\bnext\b/.test(cls) || /btn-next/.test(cls) || /chapter-next/.test(cls)) {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const full = resolveUrl(href, baseUrl);
          if (full !== baseUrl) return full;
        }
      }
    }

    return '';
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 4. CRAWL INTEGRATION HELPERS
  // ══════════════════════════════════════════════════════════════════════════════════

  function wrapExtractor(r, originalFn, deps) {
    if (!hasChapterRules(r)) {
      return originalFn;
    }

    let hasWarnedEmpty = false;

    return async function (item, idx) {
      if (!deps || typeof deps.fetchHtml !== 'function') {
        return originalFn ? originalFn(item, idx) : null;
      }

      const html = await deps.fetchHtml(item.url);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const extracted = extractChapter(doc, r, item.url);

      const strippedLen = extracted.text.replace(/<[^>]+>/g, '').trim().length;

      // Fallback safety net: if selector extracted no content, fall back to built-in extractor
      if (strippedLen < MIN_CONTENT_CHARS && typeof originalFn === 'function') {
        if (!hasWarnedEmpty) {
          hasWarnedEmpty = true;
          if (typeof window !== 'undefined' && window.AppLogger && typeof window.AppLogger.warn === 'function') {
            window.AppLogger.warn('[SiteRecipe] selector found no text, using built-in reader', item.url);
          }
        }
        return await originalFn(item, idx);
      }

      return {
        title: extracted.title || item.title || `Chapter ${idx + 1}`,
        text: extracted.text,
        arc: item.arc,
        volume: item.volume
      };
    };
  }

  async function overlayBookInfo(r, url, result, deps) {
    if (!r || !result || !hasMetaOverrides(r)) return result;
    if (!deps || typeof deps.fetchHtml !== 'function') return result;

    try {
      const html = await deps.fetchHtml(url);
      if (!html) return result;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const overrides = extractBookInfo(doc, r, url);

      if (overrides.title) result.title = overrides.title;
      if (overrides.author) result.author = overrides.author;
      if (overrides.cover) result.cover = overrides.cover;
      if (overrides.summary) result.summary = overrides.summary;
    } catch (e) {
      if (typeof window !== 'undefined' && window.AppLogger && typeof window.AppLogger.warn === 'function') {
        window.AppLogger.warn('[SiteRecipeEngine] overlayBookInfo error:', e);
      }
    }
    return result;
  }

  async function crawlNextMode(r, url, bookDoc, meta, progressCb, options, deps) {
    const ctrl = deps.getController ? deps.getController() : null;
    const chapters = [];
    const chapterList = [];
    const seenUrls = new Set();

    let startUrl = url;
    if (r.book && r.book.firstChapterSelector && bookDoc) {
      const el = safeQuerySelector(bookDoc, r.book.firstChapterSelector);
      if (el) {
        const a = (el.tagName && el.tagName.toLowerCase() === 'a') ? el : el.querySelector('a[href]');
        if (a && a.getAttribute('href')) {
          startUrl = resolveUrl(a.getAttribute('href'), url);
        }
      }
    }

    let curUrl = startUrl;
    let consecutiveFailures = 0;
    const delay = Math.max(300, (r.network && r.network.delayMs) || 300);

    // Support resuming from existing chapters
    if (ctrl && Array.isArray(ctrl.initialChapters) && ctrl.initialChapters.length > 0) {
      ctrl.initialChapters.forEach(c => {
        chapters.push(c);
        if (c.url) {
          seenUrls.add(c.url.split('#')[0].replace(/\/+$/, ''));
          chapterList.push({ title: c.title, url: c.url });
        }
      });
      const lastCh = ctrl.initialChapters[ctrl.initialChapters.length - 1];
      if (lastCh && lastCh.url) {
        try {
          const lastHtml = await deps.fetchHtml(lastCh.url);
          const lastDoc = new DOMParser().parseFromString(lastHtml, 'text/html');
          const nextOfLast = findNextChapterLink(lastDoc, r, lastCh.url);
          if (nextOfLast) curUrl = nextOfLast;
        } catch (_) {}
      }
    }

    // TOC-only mode: follow links without full content download
    const isTocOnly = Boolean(options && (options.tocOnly || (ctrl && ctrl.tocOnly)));
    const maxHops = isTocOnly ? 50 : MAX_NEXT_HOPS;

    while (curUrl && chapters.length < maxHops) {
      if (ctrl && (ctrl.isCancelled || ctrl.isPaused)) break;

      const normUrl = curUrl.split('#')[0].replace(/\/+$/, '');
      if (seenUrls.has(normUrl)) break;
      seenUrls.add(normUrl);

      const chIdx = chapters.length + 1;
      if (typeof progressCb === 'function') {
        progressCb(`Following Next: chapter ${chIdx}…`, Math.min(95, Math.round((chIdx / (chIdx + 5)) * 100)));
      }

      let html = '';
      try {
        html = await deps.fetchHtml(curUrl);
        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures++;
        if (r.network && r.network.skipBroken && (err.httpStatus === 404 || err.httpStatus === 410)) {
          // Push placeholder chapter
          const placeholder = {
            title: `Chapter ${chIdx} (Skipped)`,
            text: '<p>[Skipped: this chapter page no longer exists on the site]</p>',
            url: curUrl,
            isPlaceholder: true
          };
          chapters.push(placeholder);
          chapterList.push({ title: placeholder.title, url: curUrl });
          break; // Stop walking if broken link encountered
        }
        if (consecutiveFailures >= 3) {
          if (ctrl) {
            ctrl.isPaused = true;
            ctrl.pauseReason = '3 consecutive network errors';
          }
          break;
        }
      }

      if (!html) break;

      const chDoc = new DOMParser().parseFromString(html, 'text/html');
      const extracted = extractChapter(chDoc, r, curUrl);

      const chapterTitle = extracted.title || `Chapter ${chIdx}`;
      const chapterObj = {
        title: chapterTitle,
        text: extracted.text,
        url: curUrl
      };

      chapters.push(chapterObj);
      chapterList.push({ title: chapterTitle, url: curUrl });

      if (ctrl && typeof ctrl.onChapterDone === 'function') {
        try {
          ctrl.onChapterDone(chapterObj, chapters, {
            completed: chapters.length,
            total: chapters.length + 1,
            percent: Math.min(99, Math.round((chapters.length / (chapters.length + 1)) * 100))
          });
        } catch (_) {}
      }

      const nextUrl = findNextChapterLink(chDoc, r, curUrl);
      if (!nextUrl || seenUrls.has(nextUrl.split('#')[0].replace(/\/+$/, ''))) {
        break;
      }
      curUrl = nextUrl;

      // Rate limiting delay between pages
      if (delay > 0) {
        await new Promise(res => setTimeout(res, delay));
      }
    }

    return {
      title: meta.title || 'Web Novel',
      author: meta.author || 'Author',
      cover: meta.cover || '',
      summary: meta.summary || '',
      chapters,
      chapterList,
      totalChapterCount: chapters.length,
      isEpub: false,
      sourceUrl: url
    };
  }

  async function crawlWithRecipe(r, url, progressCb, options, deps) {
    if (typeof progressCb === 'function') {
      progressCb('Reading this site with your recipe…', 5);
    }

    const ctrl = deps.getController ? deps.getController() : null;
    const html = await deps.fetchHtml(url);
    const bookDoc = new DOMParser().parseFromString(html, 'text/html');

    const recipeMeta = extractBookInfo(bookDoc, r, url);
    const genericMeta = genericBookInfo(bookDoc, url);
    const meta = {
      title: recipeMeta.title || genericMeta.title || 'Web Novel',
      author: recipeMeta.author || genericMeta.author || 'Author',
      cover: recipeMeta.cover || genericMeta.cover || '',
      summary: recipeMeta.summary || genericMeta.summary || ''
    };

    if (r.mode === 'next') {
      return await crawlNextMode(r, url, bookDoc, meta, progressCb, options, deps);
    }

    let links = [];
    if (r.book && r.book.tocNextPageSelector) {
      links = await collectPagedChapterLinks(bookDoc, r, url, deps, ctrl, progressCb);
    } else if (r.book && r.book.chapterLinkSelector) {
      links = extractChapterLinks(bookDoc, r, url);
    } else if (typeof window !== 'undefined' && window.UniversalPlugin) {
      try {
        const uPlugin = new window.UniversalPlugin();
        const details = await uPlugin.getNovelDetails(url);
        links = details && Array.isArray(details.chapterList) ? details.chapterList : [];
      } catch (_) {
        links = [];
      }
    }

    if (!links || links.length === 0) {
      throw new Error('Your recipe found no chapter links on this page. Open Site Settings and pick a chapter link again.');
    }

    if (options && (options.tocOnly || (ctrl && ctrl.tocOnly))) {
      return {
        title: meta.title,
        author: meta.author,
        cover: meta.cover,
        summary: meta.summary,
        chapters: [],
        chapterList: links,
        totalChapterCount: links.length,
        isEpub: false,
        sourceUrl: url
      };
    }

    const fallbackExtract = async (item) => {
      const chHtml = await deps.fetchHtml(item.url);
      if (typeof window !== 'undefined' && window.ChameleonExtractor && typeof window.ChameleonExtractor.extractArticle === 'function') {
        const art = window.ChameleonExtractor.extractArticle(chHtml, item.url);
        return { title: art.title || item.title, text: art.text || '' };
      }
      return { title: item.title, text: chHtml };
    };

    const poolDelay = (r.network && r.network.delayMs > 0) ? r.network.delayMs : 250;
    const poolConcurrency = (r.network && r.network.delayMs > 0) ? 1 : (options.concurrency || 4);

    const crawledChapters = await deps.crawlChapterPool(
      links,
      fallbackExtract,
      poolConcurrency,
      progressCb,
      meta,
      { delayMs: poolDelay }
    );

    return {
      title: meta.title,
      author: meta.author,
      cover: meta.cover,
      summary: meta.summary,
      chapters: crawledChapters,
      chapterList: links,
      totalChapterCount: links.length,
      isEpub: false,
      sourceUrl: url
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 5. SHARING & IMPORT / EXPORT
  // ══════════════════════════════════════════════════════════════════════════════════

  function stripForShare(r) {
    const copy = JSON.parse(JSON.stringify(r));
    delete copy.createdAt;
    delete copy.updatedAt;
    return copy;
  }

  function encodeShareCode(r) {
    try {
      const stripped = stripForShare(r);
      const json = JSON.stringify(stripped);
      const utf8 = unescape(encodeURIComponent(json));
      return SHARE_PREFIX + btoa(utf8);
    } catch (e) {
      throw new Error('Failed to encode recipe share code: ' + e.message);
    }
  }

  function decodeShareCode(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('No recipe share code found.');
    }
    const idx = text.indexOf(SHARE_PREFIX);
    if (idx === -1) {
      throw new Error('That recipe code is damaged or incomplete (missing prefix).');
    }

    const codePart = text.slice(idx + SHARE_PREFIX.length).trim().split(/\s+/)[0];
    try {
      const decodedUtf8 = atob(codePart);
      const json = decodeURIComponent(escape(decodedUtf8));
      const parsed = JSON.parse(json);
      return withDefaults(parsed);
    } catch (_) {
      throw new Error('That recipe code is damaged or incomplete.');
    }
  }

  async function exportFile(r) {
    if (!r) return;
    const stripped = stripForShare(r);
    const jsonStr = JSON.stringify(stripped, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `${r.id || 'recipe'}.gtrecipe.json`;

    if (typeof window !== 'undefined' && window.saveUniversalBlob) {
      return await window.saveUniversalBlob(blob, filename, 'application/json', true);
    } else {
      // Browser fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function importFile(file) {
    if (!file) throw new Error('No file provided.');
    const text = await file.text();
    const trimmed = text.trim();

    // Check if file is a share code or JSON
    if (trimmed.includes(SHARE_PREFIX)) {
      return decodeShareCode(trimmed);
    }
    try {
      const parsed = JSON.parse(trimmed);
      return withDefaults(parsed);
    } catch (_) {
      throw new Error('Invalid recipe file format.');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 6. AUTO-DETECTION ENGINE (SMART AI & HEURISTIC SCANNER)
  // ══════════════════════════════════════════════════════════════════════════════════

  async function autoDetectRecipe(targetUrl, options, deps) {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Please provide a URL to auto-detect.');
    }
    const cleanUrl = targetUrl.trim();
    const host = normalizeHost(cleanUrl);
    if (!host) {
      throw new Error('Invalid web address.');
    }

    const fetchHtmlFn = (deps && typeof deps.fetchHtml === 'function')
      ? deps.fetchHtml
      : async (u) => {
          if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.fetchHtml === 'function') {
            return await window.WebNovelImporter.fetchHtml(u, { context: 'RecipeAutoDetect' });
          }
          if (typeof window !== 'undefined' && typeof window.fetchRetry === 'function') {
            const resp = await window.fetchRetry(u);
            return await resp.text();
          }
          const resp = await fetch(u);
          return await resp.text();
        };

    const firstHtml = await fetchHtmlFn(cleanUrl);
    if (!firstHtml || typeof firstHtml !== 'string' || firstHtml.trim().length < 80) {
      throw new Error('Empty or invalid response from website.');
    }

    const firstDoc = new DOMParser().parseFromString(firstHtml, 'text/html');

    // Standard high-probability content selectors
    const standardContentSelectors = [
      '#content', '.chapter-content', '.entry-content', '#chapter-content',
      '#story-text', 'article', '.content', '.text-content', '#text',
      '.chapter-text', '.reading-content', '#chr-content', '.chr-c',
      '.post-content', '.reader-content', '.chapter-body', '#chapter_content'
    ];

    // Standard high-probability TOC containers
    const standardTocContainers = [
      '.chapter-list', '.list-chapter', '#chapters', '.volume-list',
      '.catalog', '.toc', '.episodes', 'ul.chapters', '#chapter-list',
      '.chapters', '.chapter-box', '.list-chapters', '.ch-list',
      '#list-chapter', '.accordion-content', '.table-of-contents'
    ];

    // Helper: evaluate text density of a container
    const evaluateContentContainer = (el) => {
      if (!el) return { words: 0, text: '' };
      const rawText = (el.textContent || '').trim();
      const words = rawText ? rawText.split(/\s+/).length : 0;
      return { words, text: rawText };
    };

    // Helper: detect chapter prose in a doc
    const findBestChapterContentSelector = (doc) => {
      for (const sel of standardContentSelectors) {
        const el = safeQuerySelector(doc, sel);
        if (el) {
          const evalRes = evaluateContentContainer(el);
          if (evalRes.words >= 80) {
            return { selector: sel, words: evalRes.words, preview: evalRes.text.slice(0, 300) };
          }
        }
      }

      const candidateBlocks = safeQuerySelectorAll(doc, 'div, article, main, section');
      let best = null;
      let maxScore = 0;

      for (const block of candidateBlocks) {
        const tag = block.tagName.toLowerCase();
        if (tag === 'nav' || tag === 'header' || tag === 'footer') continue;
        const pCount = block.querySelectorAll('p').length;
        if (pCount < 2) continue;

        const text = (block.textContent || '').trim();
        const words = text ? text.split(/\s+/).length : 0;
        if (words < 120) continue;

        const linkWords = Array.from(block.querySelectorAll('a')).map(a => a.textContent || '').join(' ').split(/\s+/).length;
        const textDensity = words / Math.max(1, linkWords);

        const score = words * Math.min(textDensity, 10);
        if (score > maxScore) {
          maxScore = score;
          const sel = (typeof window !== 'undefined' && window.SitePicker && typeof window.SitePicker.uniqueSelector === 'function')
            ? window.SitePicker.uniqueSelector(block, doc)
            : (block.id ? '#' + block.id : (block.className ? '.' + block.className.split(/\s+/)[0] : 'article'));
          best = { selector: sel, words, preview: text.slice(0, 300) };
        }
      }

      return best || { selector: '#content', words: 0, preview: '' };
    };

    // Helper: detect chapter links in a doc
    const findBestChapterLinks = (doc, pageUrl) => {
      for (const containerSel of standardTocContainers) {
        const container = safeQuerySelector(doc, containerSel);
        if (container) {
          const links = Array.from(container.querySelectorAll('a[href]'))
            .map(a => ({
              title: (a.textContent || '').trim(),
              href: resolveUrl(a.getAttribute('href') || '', pageUrl)
            }))
            .filter(l => l.title.length > 0 && l.title.length < 160 && !/^(javascript:|#|mailto:)/i.test(l.href));
          if (links.length >= 3) {
            return {
              selector: containerSel + ' a[href]',
              links,
              count: links.length
            };
          }
        }
      }

      const allLinks = safeQuerySelectorAll(doc, 'a[href]');
      const chapterPattern = /(?:chapter|ch|ep|episode|vol|volume|第)\s*\d+|\b\d+(?:[-.]\d+)?\b/i;

      const parentGroups = new Map();
      for (const a of allLinks) {
        const t = (a.textContent || '').trim();
        const h = a.getAttribute('href') || '';
        if (!t || t.length > 160 || /^(javascript:|#|mailto:)/i.test(h)) continue;

        const isChapterLike = chapterPattern.test(t) || /\/chapter[-_/]?\d+/i.test(h);
        if (isChapterLike) {
          const parent = a.parentElement;
          if (parent) {
            const list = parentGroups.get(parent) || [];
            list.push({ title: t, href: resolveUrl(h, pageUrl), el: a });
            parentGroups.set(parent, list);
          }
        }
      }

      let bestGroup = [];
      let bestParent = null;
      for (const [parent, list] of parentGroups.entries()) {
        if (list.length > bestGroup.length) {
          bestGroup = list;
          bestParent = parent;
        }
      }

      if (bestGroup.length >= 3 && bestParent) {
        const grandParent = bestParent.parentElement || bestParent;
        const containerSel = (typeof window !== 'undefined' && window.SitePicker && typeof window.SitePicker.uniqueSelector === 'function')
          ? window.SitePicker.uniqueSelector(grandParent, doc)
          : (grandParent.id ? '#' + grandParent.id : (grandParent.className ? '.' + grandParent.className.split(/\s+/)[0] : 'div'));
        return {
          selector: containerSel + ' a[href]',
          links: bestGroup,
          count: bestGroup.length
        };
      }

      return null;
    };

    // Helper: detect Next Chapter link in chapter doc
    const findNextChapterSelector = (doc) => {
      const candidates = [
        'a[rel="next"]',
        '.next-chapter',
        '#next_url',
        '.btn-next',
        '.next_page',
        'a.next'
      ];
      for (const s of candidates) {
        const el = safeQuerySelector(doc, s);
        if (el) return s;
      }
      const allA = safeQuerySelectorAll(doc, 'a[href]');
      for (const a of allA) {
        const t = (a.textContent || '').trim();
        if (NEXT_LINK_TEXT_RE.test(t)) {
          return (typeof window !== 'undefined' && window.SitePicker)
            ? window.SitePicker.uniqueSelector(a, doc)
            : 'a[rel="next"]';
        }
      }
      return 'a[rel="next"]';
    };

    // Helper: detect chapter title in chapter doc
    const findChapterTitleSelector = (doc) => {
      const candidates = [
        'h1.chapter-title',
        'h1.entry-title',
        'h1.title',
        '.chapter-name',
        'h1',
        'h2.chapter-title'
      ];
      for (const s of candidates) {
        const el = safeQuerySelector(doc, s);
        if (el && (el.textContent || '').trim()) return s;
      }
      return 'h1';
    };

    const detectedTOC = findBestChapterLinks(firstDoc, cleanUrl);
    const detectedDirectContent = findBestChapterContentSelector(firstDoc);

    const isTOC = detectedTOC && detectedTOC.links.length >= 3;
    const isChapter = !isTOC && detectedDirectContent && detectedDirectContent.words >= 80;

    let bookUrl = isTOC ? cleanUrl : '';
    let chapterUrl = isChapter ? cleanUrl : '';
    let chapterLinkSelector = '';
    let contentSelector = '';
    let titleSelector = 'h1';
    let nextChapterSelector = 'a[rel="next"]';
    let sampleWords = 0;
    let chaptersCount = 0;
    let firstChapterName = '';
    let lastChapterName = '';

    const bookInfo = genericBookInfo(firstDoc, cleanUrl);

    if (isTOC) {
      chapterLinkSelector = detectedTOC.selector;
      chaptersCount = detectedTOC.count;
      firstChapterName = detectedTOC.links[0]?.title || '';
      lastChapterName = detectedTOC.links[detectedTOC.links.length - 1]?.title || '';

      const sampleLink = detectedTOC.links[0]?.href;
      if (sampleLink) {
        chapterUrl = sampleLink;
        try {
          const sampleHtml = await fetchHtmlFn(sampleLink);
          if (sampleHtml && sampleHtml.length > 200) {
            const sampleDoc = new DOMParser().parseFromString(sampleHtml, 'text/html');
            const chContent = findBestChapterContentSelector(sampleDoc);
            if (chContent) {
              contentSelector = chContent.selector;
              sampleWords = chContent.words;
            }
            titleSelector = findChapterTitleSelector(sampleDoc);
            nextChapterSelector = findNextChapterSelector(sampleDoc);
          }
        } catch (sampleErr) {
          console.warn('[SiteRecipeEngine] Auto-detect sample chapter error:', sampleErr);
        }
      }
    } else {
      contentSelector = detectedDirectContent?.selector || '#content';
      sampleWords = detectedDirectContent?.words || 0;
      titleSelector = findChapterTitleSelector(firstDoc);
      nextChapterSelector = findNextChapterSelector(firstDoc);

      const allA = safeQuerySelectorAll(firstDoc, 'a[href]');
      for (const a of allA) {
        const t = (a.textContent || '').trim().toLowerCase();
        const h = a.getAttribute('href') || '';
        if (t.includes('index') || t.includes('toc') || t.includes('all chapters') || t.includes('contents') || t.includes('novel')) {
          bookUrl = resolveUrl(h, cleanUrl);
          break;
        }
      }

      if (bookUrl) {
        try {
          const bHtml = await fetchHtmlFn(bookUrl);
          if (bHtml) {
            const bDoc = new DOMParser().parseFromString(bHtml, 'text/html');
            const bTOC = findBestChapterLinks(bDoc, bookUrl);
            if (bTOC) {
              chapterLinkSelector = bTOC.selector;
              chaptersCount = bTOC.count;
              firstChapterName = bTOC.links[0]?.title || '';
              lastChapterName = bTOC.links[bTOC.links.length - 1]?.title || '';
            }
          }
        } catch (_) {}
      }
    }

    if (!contentSelector) contentSelector = '#content, .chapter-content, article';
    if (!chapterLinkSelector && isTOC) chapterLinkSelector = detectedTOC?.selector || '.chapter-list a[href]';

    const standardRemoveSelectors = [
      '.ads', '.advertisement', '.ad-container', '.share-box',
      '.social-share', '.watermark', 'script', 'style'
    ];

    const generatedRecipe = withDefaults({
      id: host,
      name: host,
      mode: (chapterLinkSelector ? 'toc' : 'next'),
      bookUrl: bookUrl || cleanUrl,
      chapterUrl: chapterUrl || '',
      book: {
        titleSelector: 'h1',
        authorSelector: '.author, [rel="author"]',
        coverSelector: 'img.cover, .book-cover img',
        summarySelector: '.description, .synopsis, #description',
        chapterLinkSelector: chapterLinkSelector || '',
        tocNextPageSelector: 'a[rel="next"]'
      },
      chapter: {
        contentSelector: contentSelector,
        titleSelector: titleSelector,
        nextChapterSelector: nextChapterSelector,
        removeSelectors: standardRemoveSelectors
      },
      cleanup: {
        removeSelector: standardRemoveSelectors.join(', ')
      }
    });

    return {
      success: true,
      recipe: generatedRecipe,
      stats: {
        isTOC,
        isChapter,
        chaptersCount,
        sampleWords,
        firstChapterName,
        lastChapterName,
        bookTitle: bookInfo.title || '',
        author: bookInfo.author || '',
        cover: bookInfo.cover || '',
        summary: bookInfo.summary || ''
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 7. TESTING / PREVIEW ENGINE
  // ══════════════════════════════════════════════════════════════════════════════════

  async function testRecipe(r, urls, deps) {
    const recipeObj = r || {};
    const bookUrl = (urls && urls.bookUrl ? urls.bookUrl.trim() : '') || (recipeObj.bookUrl ? recipeObj.bookUrl.trim() : '') || (recipeObj.testUrls && recipeObj.testUrls.book ? recipeObj.testUrls.book.trim() : '');
    const chapterUrl = (urls && urls.chapterUrl ? urls.chapterUrl.trim() : '') || (recipeObj.chapterUrl ? recipeObj.chapterUrl.trim() : '') || (recipeObj.testUrls && recipeObj.testUrls.chapter ? recipeObj.testUrls.chapter.trim() : '');

    const fetchHtmlFn = (deps && typeof deps.fetchHtml === 'function')
      ? deps.fetchHtml
      : async (targetUrl) => {
          if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.fetchHtml === 'function') {
            return await window.WebNovelImporter.fetchHtml(targetUrl);
          }
          if (typeof window !== 'undefined' && window.WebNovelCrawler && typeof window.WebNovelCrawler.fetchHtmlDirect === 'function') {
            return await window.WebNovelCrawler.fetchHtmlDirect(targetUrl);
          }
          if (typeof window !== 'undefined' && typeof window.fetchRetry === 'function') {
            const resp = await window.fetchRetry(targetUrl);
            return await resp.text();
          }
          const resp = await fetch(targetUrl);
          return await resp.text();
        };

    const bookResult = {
      title: '', author: '', cover: '', summary: '',
      chapterCount: 0, firstChapter: '', lastChapter: '', warnings: []
    };
    const chapterResult = {
      title: '', preview: '', words: 0, wordCount: 0, warnings: []
    };

    if (!bookUrl && !chapterUrl) {
      throw new Error('Please enter a Book Overview URL or Sample Chapter URL above to test.');
    }

    // 1. Test Book Page
    if (bookUrl) {
      try {
        const html = await fetchHtmlFn(bookUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const recipeMeta = extractBookInfo(doc, recipeObj, bookUrl);
        const genericMeta = genericBookInfo(doc, bookUrl);

        bookResult.title = recipeMeta.title || genericMeta.title;
        bookResult.author = recipeMeta.author || genericMeta.author;
        bookResult.cover = recipeMeta.cover || genericMeta.cover;
        bookResult.summary = recipeMeta.summary || genericMeta.summary;

        if (!bookResult.title) bookResult.warnings.push('Book title was not found.');
        if (!bookResult.author) bookResult.warnings.push('Author name was not found.');
        if (!bookResult.cover) bookResult.warnings.push('Cover image was not found.');

        if (recipeObj.mode === 'next') {
          if (recipeObj.book && recipeObj.book.firstChapterSelector) {
            const firstA = safeQuerySelector(doc, recipeObj.book.firstChapterSelector);
            if (!firstA) bookResult.warnings.push('First chapter link was not found on this book page.');
          }
        } else if (recipeObj.book && recipeObj.book.chapterLinkSelector) {
          const links = extractChapterLinks(doc, recipeObj, bookUrl);
          bookResult.chapterCount = links.length;
          if (links.length === 0) {
            bookResult.warnings.push('No chapter links found. Try picking a chapter link again.');
          } else if (links.length === 1) {
            bookResult.warnings.push('Only 1 chapter link found. Pick a chapter link again to group them.');
          } else {
            bookResult.firstChapter = links[0].title;
            bookResult.lastChapter = links[links.length - 1].title;
          }
        }
      } catch (err) {
        bookResult.warnings.push(`Failed to read book page: ${err.message}`);
      }
    }

    // 2. Test Chapter Page
    if (chapterUrl) {
      try {
        const html = await fetchHtmlFn(chapterUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const extracted = extractChapter(doc, recipeObj, chapterUrl);
        chapterResult.title = extracted.title || 'Chapter';

        const plainText = extracted.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordsCount = plainText ? plainText.split(/\s+/).length : 0;
        chapterResult.words = wordsCount;
        chapterResult.wordCount = wordsCount;
        chapterResult.preview = plainText.slice(0, PREVIEW_CHARS);

        if (extracted.rawChars < MIN_CONTENT_CHARS) {
          chapterResult.warnings.push('Story text looks empty. Try picking a bigger area.');
        }

        if (recipeObj.mode === 'next') {
          const nextLink = findNextChapterLink(doc, recipeObj, chapterUrl);
          if (!nextLink) {
            chapterResult.warnings.push('Next button not found on this chapter.');
          }
        }
      } catch (err) {
        chapterResult.warnings.push(`Failed to read chapter page: ${err.message}`);
      }
    }

    const allWarnings = [...bookResult.warnings, ...chapterResult.warnings];
    return { book: bookResult, chapter: chapterResult, warnings: allWarnings };
  }

  // ══════════════════════════════════════════════════════════════════════════════════
  // 7. CONTROLLER SUITE (Rule 2.1: The UI talks exclusively to this)
  // ══════════════════════════════════════════════════════════════════════════════════

  const Controller = {
    async open(params, setters) {
      try {
        await ready();
        const url = params?.url || '';
        const recipeId = params?.recipeId || (url ? normalizeHost(url) : '');
        if (setters && typeof setters.setSiteRecipeEditor === 'function') {
          setters.setSiteRecipeEditor({ url, recipeId });
        }
      } catch (err) {
        if (setters?.toast) setters.toast('Could not open site settings: ' + err.message, 'error');
      }
    },

    async save(recipeInput, callbacks) {
      try {
        const saved = await save(recipeInput);
        if (callbacks?.onSaved) callbacks.onSaved(saved);
        if (callbacks?.toast) callbacks.toast(`Saved site recipe for ${saved.name || saved.id}!`, 'success');
        return saved;
      } catch (err) {
        if (callbacks?.toast) callbacks.toast('Could not save recipe: ' + err.message, 'error');
        throw err;
      }
    },

    async remove(id, callbacks) {
      try {
        await remove(id);
        if (callbacks?.onRemoved) callbacks.onRemoved(id);
        if (callbacks?.toast) callbacks.toast(`Removed recipe for ${id}.`, 'info');
        return true;
      } catch (err) {
        if (callbacks?.toast) callbacks.toast('Could not remove recipe: ' + err.message, 'error');
        return false;
      }
    },

    async test(recipe, urls, callbacks) {
      try {
        const fetchHtml = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml)
          ? window.WebNovelImporter.fetchHtml
          : null;
        if (!fetchHtml) throw new Error('Importer network fetcher is unavailable.');

        const result = await testRecipe(recipe, urls, { fetchHtml });
        if (callbacks?.onSuccess) callbacks.onSuccess(result);
        return result;
      } catch (err) {
        if (callbacks?.onError) callbacks.onError(err);
        if (callbacks?.toast) callbacks.toast('Test error: ' + err.message, 'error');
        throw err;
      }
    },

    async copyCode(recipe, toast) {
      try {
        const code = encodeShareCode(recipe);
        if (typeof window !== 'undefined' && window.copyText) {
          await window.copyText(code);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(code);
        }
        if (typeof toast === 'function') toast('Recipe share code copied to clipboard! 📋', 'success');
        return code;
      } catch (err) {
        if (typeof toast === 'function') toast('Could not copy share code: ' + err.message, 'error');
      }
    },

    async pasteCode(text, callbacks) {
      try {
        let raw = text;
        let cbs = callbacks;
        if (typeof text === 'function' || (text && typeof text === 'object' && typeof text.toast === 'function')) {
          cbs = typeof text === 'function' ? { toast: text } : text;
          raw = null;
        }
        if (!raw && typeof navigator !== 'undefined' && navigator.clipboard) {
          raw = await navigator.clipboard.readText();
        }
        const recipe = decodeShareCode(raw);
        if (cbs?.onParsed) cbs.onParsed(recipe);
        if (cbs?.toast) cbs.toast(`Loaded recipe for ${recipe.name || recipe.id}!`, 'success');
        return recipe;
      } catch (err) {
        const cbs = typeof callbacks === 'function' ? { toast: callbacks } : (typeof text === 'function' ? { toast: text } : callbacks);
        if (cbs?.toast) cbs.toast(err.message, 'error');
        throw err;
      }
    },

    async exportFile(recipe, toast) {
      try {
        await exportFile(recipe);
        const tFn = typeof toast === 'function' ? toast : toast?.toast;
        if (typeof tFn === 'function') tFn(`Saved ${recipe.id}.gtrecipe.json! 💾`, 'success');
      } catch (err) {
        const tFn = typeof toast === 'function' ? toast : toast?.toast;
        if (typeof tFn === 'function') tFn('Export failed: ' + err.message, 'error');
      }
    },

    async importFile(file, callbacks) {
      try {
        const recipe = await importFile(file);
        const cbs = typeof callbacks === 'function' ? { toast: callbacks } : callbacks;
        if (cbs?.onParsed) cbs.onParsed(recipe);
        if (cbs?.toast) cbs.toast(`Loaded recipe for ${recipe.name || recipe.id}!`, 'success');
        return recipe;
      } catch (err) {
        const cbs = typeof callbacks === 'function' ? { toast: callbacks } : callbacks;
        if (cbs?.toast) cbs.toast(err.message, 'error');
        throw err;
      }
    },

    async autoDetect(url, callbacks) {
      try {
        if (callbacks?.onStart) callbacks.onStart();
        if (callbacks?.toast) callbacks.toast('⚡ AI scanning website layout & chapters...', 'info');

        const fetchHtml = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml)
          ? window.WebNovelImporter.fetchHtml
          : null;

        const result = await autoDetectRecipe(url, {}, { fetchHtml });
        if (callbacks?.onSuccess) callbacks.onSuccess(result);
        if (callbacks?.toast) callbacks.toast(`✓ Discovered ${result.stats?.chaptersCount || 0} chapters & story text!`, 'success');
        return result;
      } catch (err) {
        if (callbacks?.onError) callbacks.onError(err);
        if (callbacks?.toast) callbacks.toast('Auto-detect: ' + err.message, 'warning');
        throw err;
      }
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════════
  // PUBLIC API EXPORT
  // ══════════════════════════════════════════════════════════════════════════════════

  const SiteRecipeEngine = {
    normalizeHost,
    withDefaults,
    init,
    ready,
    reload,
    getAll,
    get,
    findForUrl,
    save,
    remove,
    createBlank,
    isBuiltInSite,

    hasBookTakeover,
    hasMetaOverrides,
    hasChapterRules,
    hasTextCleanup,

    extractBookInfo,
    genericBookInfo,
    extractChapterLinks,
    findTocNextPage,
    collectPagedChapterLinks,
    extractChapter,
    findNextChapterLink,
    postProcessText,

    wrapExtractor,
    overlayBookInfo,
    crawlNextMode,
    crawlWithRecipe,

    encodeShareCode,
    decodeShareCode,
    exportFile,
    importFile,

    autoDetectRecipe,
    testRecipe,
    Controller
  };

  global.SiteRecipeEngine = SiteRecipeEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteRecipeEngine;
  }
})(typeof window !== 'undefined' ? window : this);
