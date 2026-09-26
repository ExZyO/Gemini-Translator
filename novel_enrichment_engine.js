/**
 * Gemini EPUB Translator - Novel Enrichment Engine
 * Module: novel_enrichment_engine.js
 * 
 * Provides:
 * - Token & Cost Estimation for translation across multiple models and stream counts
 * - Online Metadata Enrichment (AniList GraphQL & Kitsu fallback)
 * - Arc & Volume Splitter packaging with EPUB generation
 * - QA Health Audit delegation
 * - Source Plugin Registry integration & live novel search
 * - Translation Memory & Chapter Revision Snapshot management
 */

(function (global) {
  'use strict';

  function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  }

  /**
   * 1. Cost & Token Estimator
   */
  function calculateCostEstimate(params = {}) {
    let chs = (params.chapters && params.chapters.length > 0) ? params.chapters : [];
    let totalChars = 0;
    let totalWords = 0;

    if (chs.length > 0) {
      for (const c of chs) {
        const t = (typeof c === 'string' ? c : (c?.text || c?.content || ''));
        totalChars += t.length;
        totalWords += t.split(/\s+/).filter(Boolean).length;
      }
    } else if (params.inputText && params.inputText.trim()) {
      totalChars = params.inputText.length;
      totalWords = params.inputText.split(/\s+/).filter(Boolean).length;
      chs = [{ title: 'Current Text', content: params.inputText }];
    }

    if (totalChars === 0) {
      return null;
    }

    const estSourceTokens = Math.round(totalChars / 2.8);
    const glossaryTermsActive = params.glossaryTermCount || 0;
    const estGlossaryTokens = params.smartGlossary
      ? Math.min(chs.length * 40, glossaryTermsActive * 12)
      : (glossaryTermsActive * 15);
    const estGenderTokens = Object.keys(params.genderLocks || {}).length * 8;
    const estSystemOverhead = chs.length * 85;
    const totalPromptTokens = estSourceTokens + estGlossaryTokens + estGenderTokens + estSystemOverhead;
    const totalOutputTokens = Math.max(Math.round(totalWords * 1.3), Math.round(estSourceTokens * 0.75));
    const totalTokens = totalPromptTokens + totalOutputTokens;

    const models = [
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 3.5 Flash-Lite',
        tag: 'Most Cost Effective ⚡',
        inRate: 0.075,
        outRate: 0.30,
        recommended: true
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 3.7 Flash',
        tag: 'Balanced Quality & Speed',
        inRate: 0.10,
        outRate: 0.40,
        recommended: false
      },
      {
        id: 'gemini-2.5-flash-thinking',
        name: 'Gemini 3.8 Flash (Thinking)',
        tag: 'High Nuance & Slang',
        inRate: 0.15,
        outRate: 0.60,
        recommended: false
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        tag: 'Web Novel Specialist',
        inRate: 0.14,
        outRate: 0.28,
        recommended: false
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 3.5 Pro',
        tag: 'Maximum Literary Depth',
        inRate: 1.25,
        outRate: 5.00,
        recommended: false
      }
    ];

    const calculatedModels = models.map(m => {
      const inCost = (totalPromptTokens / 1000000) * m.inRate;
      const outCost = (totalOutputTokens / 1000000) * m.outRate;
      const totalCost = inCost + outCost;
      return {
        ...m,
        inCost,
        outCost,
        totalCost: totalCost < 0.01 ? '< $0.01' : `$${totalCost.toFixed(3)}`
      };
    });

    const wordsPerSecStream = 55;
    const baseSecs = Math.max(5, Math.round(totalWords / wordsPerSecStream));
    const timeTiers = [
      { streams: 1, duration: formatDuration(baseSecs) },
      { streams: 5, duration: formatDuration(Math.max(3, Math.round(baseSecs / 4.2))), recommended: true },
      { streams: 10, duration: formatDuration(Math.max(2, Math.round(baseSecs / 7.5))) },
      { streams: 15, duration: formatDuration(Math.max(2, Math.round(baseSecs / 10.5))) }
    ];

    return {
      chapterCount: chs.length,
      totalChars,
      totalWords,
      estSourceTokens,
      totalPromptTokens,
      totalOutputTokens,
      totalTokens,
      models: calculatedModels,
      timeTiers
    };
  }

  /**
   * 2. Online Metadata Fetcher (AniList GraphQL with Kitsu Fallback)
   */
  async function fetchNovelMetadata(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') return null;
    const baseTitle = rawTitle.replace(/\s*\(Translated\)\s*$/i, '').trim();
    const cleanQuery = baseTitle
      .replace(/\s*[-—~|:]\s*(?:Web Novel Complete Edition|Complete Edition|Web Novel|Arc Edition|Starting Life in Another World|Lnori|Syosetu|NovelBuddy|RoyalRoad|Witch Cult).*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .trim() || baseTitle;

    let metadata = null;
    let sourceProvider = 'AniList';

    // 1. Try AniList GraphQL first (with strict 3.5s timeout)
    try {
      const query = `
        query ($search: String) {
          Media (search: $search, type: MANGA) {
            id
            title { romaji english native }
            description(asHtml: false)
            coverImage { extraLarge large }
            genres
            averageScore
            status
          }
        }
      `;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { search: cleanQuery } })
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const media = data?.data?.Media;
        if (media) {
          metadata = {
            title: media.title?.english || media.title?.romaji || media.title?.native || baseTitle,
            cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
            summary: (media.description || '').replace(/<[^>]*>/g, '').trim(),
            genres: Array.isArray(media.genres) ? media.genres : [],
            rating: media.averageScore,
            id: media.id,
            sourceProvider: 'AniList'
          };
        }
      }
    } catch (_) {
      // Fallback to secondary catalog provider
    }

    // 2. High-Availability Fallback: Kitsu API
    if (!metadata) {
      try {
        sourceProvider = 'Kitsu / Manga Catalog';
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4500);
        const kRes = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(cleanQuery)}&page[limit]=1`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (kRes.ok) {
          const kData = await kRes.json();
          const item = kData?.data?.[0]?.attributes;
          if (item) {
            const ratingVal = item.averageRating ? Math.round(parseFloat(item.averageRating)) : null;
            metadata = {
              title: item.canonicalTitle || cleanQuery,
              cover: item.posterImage?.large || item.posterImage?.original || item.posterImage?.medium || '',
              summary: (item.synopsis || '').replace(/<[^>]*>/g, '').trim(),
              genres: [item.mangaType || 'Light Novel', ...(item.subtype ? [item.subtype] : [])],
              rating: ratingVal,
              id: kData?.data?.[0]?.id,
              sourceProvider: 'Kitsu / Manga Catalog'
            };
          }
        }
      } catch (_) {}
    }

    return metadata;
  }

  /**
   * 3. Apply Enriched Metadata
   */
  async function applyEnrichedMetadata(novelRecord, metadata, callbacks = {}) {
    if (!novelRecord || !metadata) return null;
    const bestTitle = metadata.title;
    const coverUrl = metadata.cover;
    const summary = metadata.summary;
    const genres = metadata.genres || [];

    const confirmMsg = `Found metadata via ${metadata.sourceProvider || 'Metadata Provider'}:\n\nTitle: ${bestTitle}\nGenres: ${(genres || []).join(', ') || 'None'}\nRating: ${metadata.rating ? metadata.rating + '%' : 'N/A'}\n\nApply enriched cover art, synopsis, and tags to this novel?`;

    const shouldApply = typeof callbacks.confirm === 'function'
      ? await callbacks.confirm(confirmMsg)
      : (typeof confirm !== 'undefined' ? confirm(confirmMsg) : true);

    if (!shouldApply) return null;

    const updates = {
      enrichedTitle: bestTitle,
      cover: coverUrl || novelRecord.cover,
      summary: summary || novelRecord.summary,
      genres: genres,
      metadataId: metadata.id,
      rating: metadata.rating
    };

    const db = (typeof window !== 'undefined' && window.novelDB) || null;
    if (db && novelRecord.id && db.novels && typeof db.novels.update === 'function') {
      try {
        await db.novels.update(novelRecord.id, updates);
      } catch (e) {
        console.warn('[NovelEnrichmentEngine] DB update warning:', e);
      }
    }

    if (typeof callbacks.onUpdateHistory === 'function') {
      callbacks.onUpdateHistory(updates);
    }
    if (typeof callbacks.onUpdateActiveNovelView === 'function') {
      callbacks.onUpdateActiveNovelView(updates);
    }

    return updates;
  }

  /**
   * 4. Package Novel for Arc Splitter
   */
  async function packageNovelForArcSplitter(fullNovel, callbacks = {}) {
    if (!fullNovel) {
      if (callbacks.toast) callbacks.toast('Novel data not found in database.', 'error');
      return null;
    }
    const chs = (fullNovel.translatedChapters && fullNovel.translatedChapters.length > 0)
      ? fullNovel.translatedChapters
      : (fullNovel.rawChapters || fullNovel.chapters || []);
    if (chs.length === 0) {
      if (callbacks.toast) callbacks.toast('No chapters available to split.', 'warning');
      return null;
    }

    const cleanTitleFn = callbacks.cleanBookTitle || (typeof window !== 'undefined' && window.cleanBookTitle);
    const cleanAuthorFn = callbacks.cleanBookAuthor || (typeof window !== 'undefined' && window.cleanBookAuthor);
    const genEpubFn = callbacks.generateEpubFromChapters || (typeof window !== 'undefined' && window.generateEpubFromChapters);
    const sanitizeFn = callbacks.sanitizeFilename || (typeof window !== 'undefined' && window.sanitizeFilename);

    const novelTitle = (typeof cleanTitleFn === 'function' ? cleanTitleFn(fullNovel.title, chs) : (fullNovel.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
    const novelAuthor = (typeof cleanAuthorFn === 'function' ? cleanAuthorFn(fullNovel.author) : (fullNovel.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();

    if (typeof genEpubFn !== 'function') {
      throw new Error('generateEpubFromChapters is not available');
    }

    const blob = await genEpubFn(chs, novelTitle, novelAuthor, fullNovel.targetLang || 'en');
    const safeName = (typeof sanitizeFn === 'function' ? sanitizeFn(novelTitle) : novelTitle.replace(/[^a-zA-Z0-9_-]/g, '_')) || 'Novel';
    const file = new File([blob], `${safeName}.epub`, { type: 'application/epub+zip' });

    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.processSplitFile === 'function') {
        window.processSplitFile(file);
        if (callbacks.toast) callbacks.toast(`Loaded "${novelTitle}" (${chs.length} chapters) into Volume Splitter!`, 'success');
      }
    }, 250);

    return { file, novelTitle, chapterCount: chs.length };
  }

  /**
   * 5. Audit Novel Health & Proofreader Sub-system
   */
  function runAudit(novelOrChapters, optionsOverride = {}, state = {}) {
    const qa = (typeof window !== 'undefined' && window.QAEngine) || (typeof global !== 'undefined' && global.QAEngine);
    if (!qa || typeof qa.auditNovel !== 'function') {
      console.warn('[NovelEnrichmentEngine.QA] QAEngine is not loaded.');
      return null;
    }
    const opts = {
      checkGaps: optionsOverride.checkGaps !== undefined ? optionsOverride.checkGaps : !!state.qaCheckGaps,
      checkCorrupt: optionsOverride.checkCorrupt !== undefined ? optionsOverride.checkCorrupt : !!state.qaCheckCorrupt,
      checkCjkLeaks: optionsOverride.checkCjkLeaks !== undefined ? optionsOverride.checkCjkLeaks : (!!state.cjkLeakCheckEnabled && !!state.qaCheckCjk),
      checkAntiMtl: optionsOverride.checkAntiMtl !== undefined ? optionsOverride.checkAntiMtl : (!!state.antiMtlGateEnabled && !!state.qaCheckAntiMtl),
      checkLoops: optionsOverride.checkLoops !== undefined ? optionsOverride.checkLoops : !!state.qaCheckLoops,
      checkDuplicates: optionsOverride.checkDuplicates !== undefined ? optionsOverride.checkDuplicates : !!state.qaCheckDuplicates
    };
    return qa.auditNovel(novelOrChapters, opts);
  }

  async function openNovelHealthModal(item, loadFullNovelFn, callbacks = {}) {
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    if (typeof loadFullNovelFn !== 'function') {
      toast('Novel loader function not provided.', 'error');
      return null;
    }
    const full = await loadFullNovelFn(item);
    if (!full) {
      toast('Novel data not found.', 'error');
      return null;
    }
    if (callbacks.setQaAuditNovelRef) callbacks.setQaAuditNovelRef(full);
    const result = runAudit(full, callbacks.optionsOverride || {}, callbacks.state || {});
    if (callbacks.setQaAuditResult) callbacks.setQaAuditResult(result);
    if (callbacks.setQaFilterCategory) callbacks.setQaFilterCategory('all');
    if (callbacks.setQaModalOpen) callbacks.setQaModalOpen(true);
    return result;
  }

  function openActiveQaModal(context = {}, callbacks = {}) {
    const {
      translatedChapters,
      chapters,
      fileName,
      assembledText,
      inputText,
      activeNovelRecord,
      currentDocTitle
    } = context;

    const chs = (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters
      : (chapters && chapters.length > 0 ? chapters : [{ title: (fileName && fileName.trim()) || 'Active Document', content: assembledText || inputText || '' }]);

    const novelObj = {
      title: (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || 'Active Document',
      chapters: chs
    };

    if (callbacks.setQaAuditNovelRef) callbacks.setQaAuditNovelRef(novelObj);
    const result = runAudit(novelObj, callbacks.optionsOverride || {}, callbacks.state || {});
    if (callbacks.setQaAuditResult) callbacks.setQaAuditResult(result);
    if (callbacks.setQaFilterCategory) callbacks.setQaFilterCategory('all');
    if (callbacks.setQaModalOpen) callbacks.setQaModalOpen(true);
    return result;
  }

  function auditNovelHealth(novelOrChapters, options = {}) {
    return runAudit(novelOrChapters, options, options);
  }

  const QA = {
    runAudit,
    openNovelHealthModal,
    openActiveQaModal,
    auditNovelHealth
  };

  /**
   * 6. Plugins Sub-system
   */
  async function searchNovels(query, sourceId = 'all') {
    const q = (query || '').trim();
    if (!q) return [];
    const reg = (typeof window !== 'undefined' && (window.sourceRegistry || window.SourceRegistry)) || null;
    let results = [];
    if (sourceId && sourceId !== 'all' && reg && typeof reg.searchPlugin === 'function') {
      results = await reg.searchPlugin(sourceId, q);
    } else {
      const promises = [];
      if (reg && typeof reg.searchAll === 'function') {
        promises.push(reg.searchAll(q).catch(e => { console.warn('[searchAll]', e); return []; }));
      }
      const importer = (typeof window !== 'undefined' && window.WebNovelImporter) || null;
      if (importer && typeof importer.searchNovels === 'function') {
        promises.push(importer.searchNovels(q, 'all').catch(e => { console.warn('[importerSearch]', e); return []; }));
      }
      const resLists = await Promise.all(promises);
      const seenUrls = new Set();
      for (const list of resLists) {
        if (Array.isArray(list)) {
          for (const item of list) {
            const itemUrl = (item.url || item.path || '').replace(/\/$/, '');
            if (itemUrl && !seenUrls.has(itemUrl)) {
              seenUrls.add(itemUrl);
              let title = (item.title || item.name || '').trim();
              if (!title || /^untitled/i.test(title)) {
                try {
                  const pathParts = itemUrl.split('/').filter(Boolean);
                  const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
                  if (slug && !slug.startsWith('http')) {
                    title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  }
                } catch (_) {}
              }
              results.push({
                ...item,
                id: item.id || itemUrl,
                title: title || 'Web Novel',
                name: title || 'Web Novel',
                url: item.url || item.path,
                source: item.source || 'Plugin'
              });
            }
          }
        }
      }
    }
    return results || [];
  }

  async function checkRezeroUpdates(optionsOrParams = {}, maybeCallbacks = {}) {
    let options = optionsOrParams;
    let callbacks = maybeCallbacks;

    if (optionsOrParams && optionsOrParams.callbacks) {
      callbacks = optionsOrParams.callbacks;
      const webImportHistory = optionsOrParams.webImportHistory || [];
      const activeCrawlSession = optionsOrParams.activeCrawlSession || null;
      const chapters = optionsOrParams.chapters || [];
      const activeNovelRecord = optionsOrParams.activeNovelRecord || null;

      const wctUrl = optionsOrParams.url || 'https://witchculttranslation.com/table-of-content/';
      const existing = webImportHistory.find(n => /witchcult|rezero/i.test(n?.sourceUrl || n?.url || n?.title || ''))
        || (activeCrawlSession && /witchcult|rezero/i.test(activeCrawlSession?.sourceUrl || activeCrawlSession?.url || activeCrawlSession?.title || '') ? activeCrawlSession : null);
      const existingChapters = existing?.chapters || existing?.rawChapters || (chapters && chapters.length > 0 && /rezero|witch/i.test(activeNovelRecord?.title || '') ? chapters : []);

      options = {
        url: wctUrl,
        existingNovel: existing,
        existingChapters: existingChapters,
        title: existing?.title || 'Web Novel Series (WCT)',
        author: existing?.author || 'Author',
        cover: existing?.cover || 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg'
      };
    }

    const wctUrl = options.url || 'https://witchculttranslation.com/table-of-content/';
    if (callbacks.onSetWebImportUrl) {
      callbacks.onSetWebImportUrl(wctUrl);
    }
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    toast('Checking source for new chapters…', 'info');

    const existing = options.existingNovel || null;
    const existingChapters = options.existingChapters || [];

    const importer = (typeof window !== 'undefined' && window.WebNovelImporter) || null;
    if (!importer || typeof importer.importUrl !== 'function') {
      toast('Web Importer engine not loaded.', 'error');
      return null;
    }

    if (callbacks.onProgress) callbacks.onProgress('Scanning live Table of Contents…');
    try {
      const tocResult = await importer.importUrl(wctUrl, (msg) => {
        if (callbacks.onProgress) callbacks.onProgress(msg);
      }, { tocOnly: true });

      const remoteList = tocResult?.chapterList || (tocResult?.chapters && tocResult.chapters.length > 0 ? tocResult.chapters : []);
      if (!remoteList || remoteList.length === 0) {
        toast('Could not scan chapter list. Check network connection.', 'warning');
        return null;
      }

      const existingUrls = new Set((existingChapters || []).map(c => (c.url || '').replace(/\/$/, '')).filter(Boolean));
      const existingTitles = new Set((existingChapters || []).map(c => (c.title || '').trim().toLowerCase()).filter(Boolean));

      const newChapters = remoteList.filter(c => {
        const cleanU = (c.url || '').replace(/\/$/, '');
        const cleanT = (c.title || '').trim().toLowerCase();
        const hasUrl = cleanU && existingUrls.has(cleanU);
        const hasTitle = cleanT && existingTitles.has(cleanT);
        return !hasUrl && !hasTitle;
      });

      if (newChapters.length === 0 && existingChapters.length > 0) {
        toast(`Chapters are 100% up to date! All ${existingChapters.length} chapters downloaded.`, 'success');
        if (callbacks.onProgress) callbacks.onProgress('');
        return { upToDate: true, total: existingChapters.length };
      }

      if (existingChapters.length === 0) {
        toast(`Discovered ${remoteList.length} chapters. Starting ingestion…`, 'info');
        if (callbacks.onStartFetch) callbacks.onStartFetch(false, null, false, wctUrl);
        return { startingFull: true, total: remoteList.length };
      }

      toast(`Found ${newChapters.length} new chapters! Downloading incrementally…`, 'success');
      const payload = {
        id: existing?.id,
        url: wctUrl,
        sourceUrl: wctUrl,
        title: options.title || existing?.title || 'Web Novel Series (WCT)',
        author: options.author || existing?.author || 'Author',
        cover: options.cover || existing?.cover || 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg',
        chapters: existingChapters,
        rawChapters: existingChapters,
        totalChapterCount: remoteList.length
      };
      if (callbacks.onStartFetch) callbacks.onStartFetch(true, payload, false, wctUrl);
      return { incremental: true, newCount: newChapters.length, total: remoteList.length };
    } catch (err) {
      console.error('[checkRezeroUpdates]', err);
      toast('Update check failed: ' + (err?.message || err), 'error');
      return null;
    } finally {
      if (callbacks.onProgress) callbacks.onProgress('');
    }
  }

  async function openCatalog(params = {}) {
    const { pluginCatalog, callbacks = {} } = params;
    if (callbacks.setSourcePluginsModalOpen) callbacks.setSourcePluginsModalOpen(true);
    if (!pluginCatalog || pluginCatalog.length === 0) {
      if (callbacks.setIsCatalogLoading) callbacks.setIsCatalogLoading(true);
      try {
        const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
        let cat = [];
        if (reg && typeof reg.fetchCatalog === 'function') {
          cat = await reg.fetchCatalog();
        }
        const list = Array.isArray(cat) ? cat : [];
        if (callbacks.setPluginCatalog) callbacks.setPluginCatalog(list);
        return list;
      } catch (err) {
        console.warn('Failed to fetch plugins catalog:', err);
        const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
        toast('Could not fetch online plugins catalog: ' + (err?.message || err), 'warning');
        return [];
      } finally {
        if (callbacks.setIsCatalogLoading) callbacks.setIsCatalogLoading(false);
      }
    }
    return pluginCatalog;
  }

  async function installPlugin(item, callbacks = {}) {
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
    if (!reg || typeof reg.loadPluginById !== 'function') {
      toast('Source registry not loaded', 'error');
      throw new Error('Source registry not loaded');
    }
    try {
      if (callbacks.setInstallingPluginId) callbacks.setInstallingPluginId(item.id);
      toast(`Installing ${item.name || item.id} plugin…`, 'info');
      const res = await reg.loadPluginById(item.id);
      if (callbacks.setPluginCatalogTick) callbacks.setPluginCatalogTick(t => (typeof t === 'number' ? t + 1 : 1));
      toast(`✅ Successfully installed ${item.name || item.id} (${item.id})!`, 'success');
      return res;
    } catch (err) {
      toast(`Plugin install failed: ${err.message}`, 'error');
      throw err;
    } finally {
      if (callbacks.setInstallingPluginId) callbacks.setInstallingPluginId(null);
    }
  }

  function uninstallPlugin(id, callbacks = {}) {
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
    if (!reg || typeof reg.unregister !== 'function') return false;
    const success = reg.unregister(id);
    if (success) {
      if (callbacks.setPluginCatalogTick) callbacks.setPluginCatalogTick(t => (typeof t === 'number' ? t + 1 : 1));
      toast(`Uninstalled plugin: ${id}`, 'info');
    } else {
      toast('Cannot uninstall built-in plugin.', 'warning');
    }
    return success;
  }

  async function installCustomPluginUrl(url, callbacks = {}) {
    if (!url || !url.trim()) return false;
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
    if (!reg || typeof reg.loadPluginFromUrl !== 'function') {
      toast('Source registry not loaded', 'error');
      throw new Error('Source registry not loaded');
    }
    try {
      toast('Fetching and installing custom plugin…', 'info');
      const res = await reg.loadPluginFromUrl(url.trim());
      if (callbacks.setPluginCatalogTick) callbacks.setPluginCatalogTick(t => (typeof t === 'number' ? t + 1 : 1));
      toast('✅ Custom plugin registered and ready!', 'success');
      if (callbacks.setCustomPluginUrl) callbacks.setCustomPluginUrl('');
      return res;
    } catch (err) {
      toast(`Custom plugin load failed: ${err.message}`, 'error');
      throw err;
    }
  }

  async function searchNovelsInPlugins(params = {}) {
    const {
      query,
      sourceId = 'all',
      pluginNovelSearchQuery = '',
      callbacks = {}
    } = params;
    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const q = (query || pluginNovelSearchQuery || '').trim();
    if (!q) {
      toast('Please enter a novel title or keyword to search.', 'warning');
      return [];
    }
    if (callbacks.setIsPluginNovelSearching) callbacks.setIsPluginNovelSearching(true);
    try {
      const results = await searchNovels(q, sourceId);
      if (callbacks.setPluginNovelSearchResults) callbacks.setPluginNovelSearchResults(results || []);
      if (!results || results.length === 0) {
        toast(`No novels found for "${q}". Try another query or install more plugins!`, 'info');
      } else {
        toast(`Found ${results.length} novels across active plugins & sources!`, 'success');
      }
      return results;
    } catch (err) {
      console.error('[searchNovelsInPlugins]', err);
      toast('Plugin novel search error: ' + (err?.message || err), 'error');
      return [];
    } finally {
      if (callbacks.setIsPluginNovelSearching) callbacks.setIsPluginNovelSearching(false);
    }
  }

  const Plugins = {
    fetchCatalog: async function () {
      const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
      if (reg && typeof reg.fetchCatalog === 'function') {
        return await reg.fetchCatalog();
      }
      return [];
    },
    openCatalog,
    installPlugin,
    uninstallPlugin,
    installCustomPluginUrl,
    searchNovels,
    searchNovelsInPlugins,
    checkRezeroUpdates
  };

  /**
   * 7. Translation Memory & Snapshots Sub-system
   */
  async function refreshStats() {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM || typeof engine.TM.getStats !== 'function') return null;
    return await engine.TM.getStats();
  }

  async function clearTM() {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM || typeof engine.TM.clearTM !== 'function') return false;
    return await engine.TM.clearTM();
  }

  async function exportTMX(filename) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM) throw new Error('TMDiffEngine not loaded');
    const tmx = await engine.TM.exportTMX();
    if (typeof document !== 'undefined') {
      const blob = new Blob([tmx], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `translation_memory_${new Date().toISOString().slice(0, 10)}.tmx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return tmx;
  }

  async function getChapterSnapshots(novelKey, chapterIdx) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.getChapterSnapshots !== 'function') return [];
    return await engine.Snapshots.getChapterSnapshots(novelKey, chapterIdx);
  }

  async function createSnapshot(data) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.createSnapshot !== 'function') return null;
    return await engine.Snapshots.createSnapshot(data);
  }

  function computeDiff(oldText, newText) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.computeDiff !== 'function') {
      return { oldText, newText, diff: [] };
    }
    return engine.Snapshots.computeDiff(oldText, newText);
  }

  async function rollbackSnapshot(snapId) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.rollbackSnapshot !== 'function') return null;
    return await engine.Snapshots.rollbackSnapshot(snapId);
  }

  async function openDiffModal(params = {}) {
    const {
      chapterIdx = 0,
      novelOverride = null,
      activeNovelRecord = null,
      fileName = '',
      translatedChapters = [],
      chapters = [],
      assembledText = '',
      inputText = '',
      geminiModel = '',
      callbacks = {}
    } = params;

    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine) {
      toast('Diff Engine loading...', 'info');
      return;
    }

    const activeNovel = novelOverride || activeNovelRecord;
    const novelKey = activeNovel?.id || (fileName && fileName.trim()) || 'active_doc';
    const chs = (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters
      : (activeNovel?.translatedChapters && activeNovel.translatedChapters.length > 0
          ? activeNovel.translatedChapters
          : (chapters && chapters.length > 0 ? chapters : []));

    const targetCh = chs[chapterIdx] || {
      title: (fileName && fileName.trim()) || 'Active Document',
      content: assembledText || inputText || ''
    };
    const curText = (targetCh.content || targetCh.text || assembledText || '').trim();

    const snapshots = await getChapterSnapshots(novelKey, chapterIdx);

    if (!snapshots || snapshots.length === 0) {
      if (!curText) {
        toast('No text or snapshots available for this chapter yet.', 'info');
        return;
      }
      await createSnapshot({
        novelId: novelKey,
        chapterIdx: chapterIdx,
        chapterTitle: targetCh.title || `Chapter ${chapterIdx + 1}`,
        text: curText,
        model: geminiModel || 'Current'
      });
      toast('Initial baseline snapshot recorded for this chapter.', 'info');
      const refreshedSnaps = await getChapterSnapshots(novelKey, chapterIdx);
      if (callbacks.setDiffSnapshotsList) callbacks.setDiffSnapshotsList(refreshedSnaps);
      if (callbacks.setSelectedDiffSnapId) callbacks.setSelectedDiffSnapId(refreshedSnaps[0]?.id || '');
      const diffResult = computeDiff(curText, curText);
      if (callbacks.setActiveDiffData) {
        callbacks.setActiveDiffData({
          title: targetCh.title || `Chapter ${chapterIdx + 1}`,
          chapterIdx,
          novelKey,
          ...diffResult
        });
      }
      if (callbacks.setDiffModalOpen) callbacks.setDiffModalOpen(true);
      return;
    }

    if (callbacks.setDiffSnapshotsList) callbacks.setDiffSnapshotsList(snapshots);
    const latestSnap = snapshots[snapshots.length - 1];
    if (callbacks.setSelectedDiffSnapId) callbacks.setSelectedDiffSnapId(latestSnap.id);
    const diffResult = computeDiff(latestSnap.text, curText);
    if (callbacks.setActiveDiffData) {
      callbacks.setActiveDiffData({
        title: targetCh.title || `Chapter ${chapterIdx + 1}`,
        chapterIdx,
        novelKey,
        ...diffResult
      });
    }
    if (callbacks.setDiffModalOpen) callbacks.setDiffModalOpen(true);
  }

  async function saveManualSnapshot(params = {}) {
    const {
      activeDiffData = null,
      translatedChapters = [],
      activeNovelRecord = null,
      chapters = [],
      assembledText = '',
      inputText = '',
      geminiModel = '',
      callbacks = {}
    } = params;

    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !activeDiffData) return;

    const chs = (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters
      : (activeNovelRecord?.translatedChapters && activeNovelRecord.translatedChapters.length > 0
          ? activeNovelRecord.translatedChapters
          : (chapters && chapters.length > 0 ? chapters : []));
    const targetCh = chs[activeDiffData.chapterIdx] || { content: assembledText || inputText || '' };
    const curText = (targetCh.content || targetCh.text || assembledText || '').trim();
    if (!curText) {
      toast('No text available in this chapter to snapshot.', 'info');
      return;
    }
    await createSnapshot({
      novelId: activeDiffData.novelKey,
      chapterIdx: activeDiffData.chapterIdx,
      chapterTitle: activeDiffData.title || `Chapter ${activeDiffData.chapterIdx + 1}`,
      text: curText,
      model: `${geminiModel || 'Current'} (Manual)`
    });
    const refreshedSnaps = await getChapterSnapshots(activeDiffData.novelKey, activeDiffData.chapterIdx);
    if (callbacks.setDiffSnapshotsList) callbacks.setDiffSnapshotsList(refreshedSnaps);
    if (refreshedSnaps && refreshedSnaps.length > 0 && callbacks.setSelectedDiffSnapId) {
      callbacks.setSelectedDiffSnapId(refreshedSnaps[refreshedSnaps.length - 1].id);
    }
    toast('Snapshot saved successfully!', 'success');
  }

  function selectDiffSnapshot(params = {}) {
    const {
      snapId,
      activeDiffData,
      diffSnapshotsList = [],
      translatedChapters = [],
      activeNovelRecord = null,
      chapters = [],
      assembledText = '',
      inputText = '',
      callbacks = {}
    } = params;

    if (callbacks.setSelectedDiffSnapId) callbacks.setSelectedDiffSnapId(snapId);
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!activeDiffData || !engine) return;
    const snap = diffSnapshotsList.find(s => s.id === snapId);
    if (!snap) return;

    const chs = (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters
      : (activeNovelRecord?.translatedChapters && activeNovelRecord.translatedChapters.length > 0
          ? activeNovelRecord.translatedChapters
          : (chapters && chapters.length > 0 ? chapters : []));
    const targetCh = chs[activeDiffData.chapterIdx] || { content: assembledText || inputText || '' };
    const curText = (targetCh.content || targetCh.text || assembledText || '').trim();

    const diffResult = computeDiff(snap.text, curText);
    if (callbacks.setActiveDiffData) {
      callbacks.setActiveDiffData(prev => ({
        ...prev,
        ...diffResult
      }));
    }
  }

  async function rollbackDiffSnapshot(params = {}) {
    const {
      snapId,
      translatedChapters = [],
      activeNovelRecord = null,
      loadFullNovelFn = null,
      saveNovelRecordFn = null,
      callbacks = {}
    } = params;

    const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine) return;
    const snap = await rollbackSnapshot(snapId);
    if (!snap || !snap.text) {
      toast('Failed to load snapshot for rollback.', 'error');
      return;
    }

    const confirmFn = callbacks.confirm || (typeof window !== 'undefined' && window.confirm) || (() => true);
    if (!confirmFn(`Roll back "${snap.chapterTitle || 'Chapter'}" to revision from ${new Date(snap.timestamp).toLocaleString()}?`)) {
      return;
    }

    const chIdx = snap.chapterIdx || 0;
    if (translatedChapters && translatedChapters.length > chIdx) {
      const updated = [...translatedChapters];
      updated[chIdx] = { ...updated[chIdx], content: snap.text };
      if (callbacks.setTranslatedChapters) callbacks.setTranslatedChapters(updated);
      const currentDisplay = updated.map(c => `${c?.title || ''}\n\n${c?.content || ''}`).join('\n\n\n').trim();
      if (callbacks.setAssembledText) callbacks.setAssembledText(currentDisplay);
    } else {
      if (callbacks.setAssembledText) callbacks.setAssembledText(snap.text);
    }

    if (activeNovelRecord && typeof loadFullNovelFn === 'function' && typeof saveNovelRecordFn === 'function') {
      try {
        const full = await loadFullNovelFn(activeNovelRecord);
        if (full && full.translatedChapters && full.translatedChapters.length > chIdx) {
          full.translatedChapters[chIdx].content = snap.text;
          await saveNovelRecordFn(full);
        }
      } catch (e) {
        console.warn('[Rollback] DB save warning:', e);
      }
    }

    toast(`↺ Reverted "${snap.chapterTitle || 'Chapter'}" to revision.`, 'success');
    if (callbacks.setDiffModalOpen) callbacks.setDiffModalOpen(false);
  }

  const TM = {
    refreshStats,
    clearTM,
    exportTMX,
    getChapterSnapshots,
    createSnapshot,
    computeDiff,
    rollbackSnapshot,
    openDiffModal,
    saveManualSnapshot,
    selectDiffSnapshot,
    rollbackDiffSnapshot
  };

  /**
   * AppUpdate: In-app update checking and APK installation
   */
  const AppUpdate = {
    async checkForUpdate(currentVersion, isManual = false, callbacks = {}) {
      if (isManual && typeof callbacks.toast === 'function') callbacks.toast('Checking for updates...', 'info');
      try {
        const parseV = v => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
        let update = null;
        if (typeof window !== 'undefined' && window.NativeBridge && typeof window.NativeBridge.checkForUpdate === 'function') {
          update = await window.NativeBridge.checkForUpdate(currentVersion);
        }
        if (!update || !update.latestVersion) {
          // Web fallback: query GitHub releases and version manifest concurrently
          const candidates = [];
          let discoveredApk = null;
          const q1 = fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest?t=' + Date.now()).then(async r => {
            if (r.ok) {
              const d = await r.json();
              const m = (d.name || '').match(/v?(\d+\.\d+\.\d+)/i) || (d.tag_name || '').match(/v?(\d+\.\d+\.\d+)/i);
              if (m) candidates.push(m[1]);
              if (Array.isArray(d.assets)) {
                const a = d.assets.find(x => x.name && x.name.toLowerCase().endsWith('.apk'));
                if (a?.browser_download_url) discoveredApk = a.browser_download_url;
              }
            }
          }).catch(() => {});
          const q2 = fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/version.json?t=' + Date.now()).then(async r => {
            if (r.ok) {
              const d = await r.json();
              if (d?.version) candidates.push(d.version);
              if (d?.apkUrl || d?.downloadUrl) discoveredApk = d.apkUrl || d.downloadUrl;
            }
          }).catch(() => {});
          await Promise.allSettled([q1, q2]);

          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const [a1, a2, a3] = parseV(a);
              const [b1, b2, b3] = parseV(b);
              if (b1 !== a1) return b1 - a1;
              if (b2 !== a2) return b2 - a2;
              return b3 - a3;
            });
            const bestVer = candidates[0];
            const [rMaj=0, rMin=0, rPat=0] = parseV(bestVer);
            const [cMaj=0, cMin=0, cPat=0] = parseV(currentVersion);
            const isNewer = (rMaj > cMaj) || (rMaj === cMaj && rMin > cMin) || (rMaj === cMaj && rMin === cMin && rPat > cPat);
            const latestTag = `v${[rMaj, rMin, rPat].join('.')}`;
            update = {
              isNewer,
              latestVersion: latestTag,
              currentVersion: 'v' + [cMaj, cMin, cPat].join('.'),
              apkUrl: discoveredApk || `https://github.com/ExZyO/Gemini-Translator/releases/download/${latestTag}/GeminiTranslator.apk`,
              releasePage: `https://github.com/ExZyO/Gemini-Translator/releases/tag/${latestTag}`
            };
          }
        }

        if (update && update.isNewer) {
          if (typeof callbacks.onUpdateAvailable === 'function') {
            callbacks.onUpdateAvailable(update);
          }
          if (isManual && typeof callbacks.toast === 'function') callbacks.toast(`New version ${update.latestVersion} available!`, 'success');
        } else {
          if (typeof callbacks.onUpToDate === 'function') {
            callbacks.onUpToDate(currentVersion, isManual, update);
          }
          if (isManual && typeof callbacks.toast === 'function') {
            const remoteVer = update?.latestVersion || `v${currentVersion}`;
            callbacks.toast(`You are on the latest version (${remoteVer})!`, 'success');
          }
        }
        return update;
      } catch (e) {
        if (typeof callbacks.onError === 'function') {
          callbacks.onError(e, isManual);
        }
        if (isManual && typeof callbacks.toast === 'function') {
          callbacks.toast('Failed to check for updates: ' + e.message, 'error');
        }
        return null;
      }
    },

    async installUpdate(availableUpdate, callbacks = {}) {
      if (typeof callbacks.onStart === 'function') callbacks.onStart();
      if (typeof callbacks.toast === 'function') callbacks.toast('⬇️ Starting update download...', 'info');
      try {
        const apkUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
        const installResult = (typeof window !== 'undefined' && window.NativeBridge && typeof window.NativeBridge.installApk === 'function')
          ? await window.NativeBridge.installApk(apkUrl)
          : null;
        if (installResult && installResult.success === false) {
          throw new Error(installResult.message || 'The package installer could not be launched.');
        }
        if (typeof callbacks.toast === 'function') callbacks.toast('🎉 Download complete. Opening package installer...', 'success');
        if (typeof callbacks.onSuccess === 'function') callbacks.onSuccess(installResult);
      } catch (err) {
        console.error('Update error:', err);
        const updateError = err?.message || String(err);
        if (/unknown apps|allow from this source/i.test(updateError)) {
          if (typeof callbacks.toast === 'function') callbacks.toast('Permission required: Please enable "Allow from this source" in Settings, then tap Update again.', 'warning', 7000);
        } else {
          if (typeof callbacks.toast === 'function') callbacks.toast('Failed to install update: ' + updateError + '. Opening browser download...', 'error', 5000);
          const fallbackUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
          if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(fallbackUrl, '_blank');
          }
        }
        if (typeof callbacks.onError === 'function') callbacks.onError(err);
      } finally {
        if (typeof callbacks.onComplete === 'function') callbacks.onComplete();
      }
    }
  };

  const Controller = {
    openHealthModal(item, loadFullNovel, callbacks = {}) {
      const engine = NovelEnrichmentEngine;
      const loader = typeof loadFullNovel === 'function' ? loadFullNovel : ((typeof window !== 'undefined' && window.LibraryEngine?.Controller?.loadFullNovel) || null);
      return engine?.QA?.openNovelHealthModal(item, loader, callbacks);
    },

    openActiveQaModal(context, callbacks = {}) {
      const engine = NovelEnrichmentEngine;
      return engine?.QA?.openActiveQaModal(context, callbacks);
    },

    runAudit(targetNovel, options = {}, callbacks = {}) {
      const engine = NovelEnrichmentEngine;
      const toast = callbacks.toast || (typeof window !== 'undefined' && window.__toast) || console.log;
      if (!engine?.QA || !(typeof window !== 'undefined' && window.QAEngine)) {
        if (typeof toast === 'function') toast('QA Engine is loading...', 'info');
        return null;
      }
      const result = engine.QA.runAudit(targetNovel, options, callbacks.state || {});
      if (typeof callbacks.setQaAuditResult === 'function') {
        callbacks.setQaAuditResult(result);
      }
      return result;
    },

    async clearTm(refreshStats, toast, confirmFn) {
      const rStats = typeof refreshStats === 'function' ? refreshStats : refreshStats?.refreshStats;
      const tst = typeof toast === 'function' ? toast : refreshStats?.toast;
      const conf = typeof confirmFn === 'function' ? confirmFn : (refreshStats?.confirm || (typeof window !== 'undefined' ? window.confirm : () => true));
      const engine = NovelEnrichmentEngine;
      if (!engine?.TM) return;
      if (!conf('Are you sure you want to clear all cached Translation Memory segments? This cannot be undone.')) return;
      await engine.TM.clearTM();
      if (typeof rStats === 'function') await rStats();
      if (typeof tst === 'function') tst('Translation Memory cache cleared.', 'info');
    },

    async exportTmx(toast) {
      const tst = typeof toast === 'function' ? toast : toast?.toast;
      const engine = NovelEnrichmentEngine;
      if (!engine?.TM) return;
      try {
        await engine.TM.exportTMX();
        if (typeof tst === 'function') tst('Exported Translation Memory (TMX).', 'success');
      } catch (e) {
        if (typeof tst === 'function') tst('Failed exporting TMX: ' + e.message, 'error');
      }
    },

    openDiffModal(params) {
      const engine = NovelEnrichmentEngine;
      return engine?.TM?.openDiffModal(params);
    },

    manualSnapshot(params) {
      const engine = NovelEnrichmentEngine;
      return engine?.TM?.saveManualSnapshot(params);
    },

    selectDiffSnapshot(params) {
      const engine = NovelEnrichmentEngine;
      return engine?.TM?.selectDiffSnapshot(params);
    },

    rollbackDiffSnapshot(params) {
      const engine = NovelEnrichmentEngine;
      return engine?.TM?.rollbackDiffSnapshot(params);
    },

    openPlugins(catalog, setters = {}) {
      const cat = Array.isArray(catalog) ? catalog : (catalog?.pluginCatalog || catalog?.catalog);
      const cbs = typeof catalog === 'object' && !Array.isArray(catalog) ? catalog : setters;
      const engine = NovelEnrichmentEngine;
      return engine?.Plugins?.openCatalog({
        pluginCatalog: cat,
        callbacks: cbs
      });
    },

    installPlugin(item, setters = {}) {
      const engine = NovelEnrichmentEngine;
      return engine?.Plugins?.installPlugin(item, setters);
    },

    uninstallPlugin(id, setters = {}) {
      const engine = NovelEnrichmentEngine;
      return engine?.Plugins?.uninstallPlugin(id, setters);
    },

    installCustomUrl(url, setters = {}) {
      const engine = NovelEnrichmentEngine;
      return engine?.Plugins?.installCustomPluginUrl(url, setters);
    },

    searchPlugins(query, sourceId = 'all', callbacks = {}) {
      const q = typeof query === 'string' ? query : query?.query;
      const src = typeof query === 'object' ? (query.sourceId || 'all') : sourceId;
      const cbs = typeof query === 'object' ? query : (callbacks || {});
      const engine = NovelEnrichmentEngine;
      return engine?.Plugins?.searchNovelsInPlugins({
        query: q,
        sourceId: src,
        callbacks: cbs
      });
    },

    openCostEstimator(params = {}) {
      const engine = NovelEnrichmentEngine;
      const data = engine.calculateCostEstimate(params);
      if (!data) {
        if (typeof params.toast === 'function') params.toast('Please paste text or load a novel/EPUB before estimating cost.', 'warning');
        return null;
      }
      if (typeof params.setCostEstimatorData === 'function') params.setCostEstimatorData(data);
      if (typeof params.setCostEstimatorModalOpen === 'function') params.setCostEstimatorModalOpen(true);
      return data;
    },

    async enrichMetadata(novelRecord, { setWebImportHistory, setActiveNovelView, activeNovelView, toast, confirm: confirmFn } = {}) {
      if (!novelRecord || !novelRecord.title) {
        if (typeof toast === 'function') toast('No novel selected for metadata enrichment.', 'warning');
        return;
      }
      if (typeof toast === 'function') toast(`Fetching official metadata for "${novelRecord.title}"…`, 'info');
      try {
        const engine = NovelEnrichmentEngine;
        const metadata = await engine.fetchNovelMetadata(novelRecord.title);
        if (!metadata) {
          if (typeof toast === 'function') toast(`No matching metadata found for "${novelRecord.title}".`, 'warning');
          return;
        }
        const conf = typeof confirmFn === 'function' ? confirmFn : (typeof window !== 'undefined' ? window.confirm : () => true);
        const applied = await engine.applyEnrichedMetadata(novelRecord, metadata, {
          confirm: (msg) => conf(msg),
          onUpdateHistory: (updates) => {
            if (typeof setWebImportHistory === 'function') {
              setWebImportHistory(prev => prev.map(b => b.id === novelRecord.id ? { ...b, ...updates } : b));
            }
          },
          onUpdateActiveNovelView: (updates) => {
            if (typeof setActiveNovelView === 'function' && activeNovelView && activeNovelView.id === novelRecord.id) {
              setActiveNovelView(prev => ({ ...prev, ...updates }));
            }
          }
        });
        if (applied && typeof toast === 'function') {
          toast(`Enriched "${metadata.title}" with official HD cover art & synopsis!`, 'success');
        }
        return applied;
      } catch (err) {
        console.warn('Metadata enrichment error:', err);
        if (typeof toast === 'function') toast(`Metadata enrichment error: ${err.message}`, 'error');
      }
    },

    async splitIntoArcs(novelRecord, { loadFullNovel: loadFullNovelFn, setActiveTab, setStudioSubTab, toast, cleanBookTitle, cleanBookAuthor, generateEpubFromChapters, sanitizeFilename } = {}) {
      const loader = typeof loadFullNovelFn === 'function' ? loadFullNovelFn : ((typeof window !== 'undefined' && window.LibraryEngine?.Controller?.loadFullNovel) || null);
      const full = loader ? await loader(novelRecord) : novelRecord;
      if (!full) {
        if (typeof toast === 'function') toast('Novel data not found in database.', 'error');
        return;
      }
      const chs = (full.translatedChapters && full.translatedChapters.length > 0)
        ? full.translatedChapters
        : (full.rawChapters || full.chapters || []);
      if (chs.length === 0) {
        if (typeof toast === 'function') toast('No chapters available to split.', 'warning');
        return;
      }

      if (typeof setActiveTab === 'function') setActiveTab('studio');
      if (typeof setStudioSubTab === 'function') setStudioSubTab('split');
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('activeTab', 'studio'); } catch (e) {}
      if (typeof toast === 'function') toast(`Packaging "${full.title || 'Novel'}" into Volume Splitter…`, 'info');

      try {
        const engine = NovelEnrichmentEngine;
        await engine.packageNovelForArcSplitter(full, {
          cleanBookTitle,
          cleanBookAuthor,
          generateEpubFromChapters,
          sanitizeFilename,
          toast
        });
      } catch (splitErr) {
        console.warn('Auto-split mounting warning:', splitErr);
        if (typeof toast === 'function') toast(`Switched to EPUB Studio with "${full.title || 'Novel'}"!`, 'info');
      }
    }
  };

  const NovelEnrichmentEngine = {
    calculateCostEstimate,
    fetchNovelMetadata,
    applyEnrichedMetadata,
    packageNovelForArcSplitter,
    auditNovelHealth,
    QA,
    Plugins,
    TM,
    AppUpdate,
    Controller
  };

  global.NovelEnrichmentEngine = NovelEnrichmentEngine;
  if (typeof window !== 'undefined') {
    window.NovelEnrichmentEngine = NovelEnrichmentEngine;
    window.NovelEnrichmentEngine.Controller = Controller;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NovelEnrichmentEngine;
  }
})(typeof window !== 'undefined' ? window : this);
