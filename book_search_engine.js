// ══════════════════════════════════════════════════════════════════════
// BOOK SEARCH & DOWNLOAD ENGINE
// Unified Multi-Source Ebook Catalog: Project Gutenberg, Standard Ebooks,
// Library Genesis (LibGen), and Open Library with 1-Tap EPUB Ingestion
// ══════════════════════════════════════════════════════════════════════
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BookSearchEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  function stripHtml(str) {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/g, '')
      .replace(/&#8217;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Multi-tier resilient fetch for shadow libraries and external mirrors
  async function fetchExternal(url, options = {}) {
    const timeoutMs = options.timeout || 12000;
    const signal = options.signal;

    // 1. Direct fetch fast-path
    try {
      const directCtrl = new AbortController();
      const directTimer = setTimeout(() => directCtrl.abort(), 3500);
      const res = await fetch(url, {
        headers: options.headers || { 'User-Agent': 'Mozilla/5.0' },
        signal: signal || directCtrl.signal
      });
      clearTimeout(directTimer);
      if (res.ok) {
        return await (options.asBuffer ? res.arrayBuffer() : res.text());
      }
    } catch (_) {}

    // 2. Delegate to WebNovelImporter.fetchHtml if text requested
    if (!options.asBuffer && typeof window !== 'undefined' && window.WebNovelImporter?.fetchHtml) {
      try {
        const text = await window.WebNovelImporter.fetchHtml(url, {
          context: 'Book Search',
          timeout: timeoutMs,
          signal
        });
        if (text && text.length > 50) return text;
      } catch (_) {}
    }

    // 3. Multi-tier proxy fallbacks
    const proxies = [
      (u) => `https://corsproxy.org/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://cors.eu.org/${u}`
    ];

    for (const pFn of proxies) {
      if (signal?.aborted) break;
      try {
        const proxyUrl = pFn(url);
        const pCtrl = new AbortController();
        const pTimer = setTimeout(() => pCtrl.abort(), 8000);
        const pRes = await fetch(proxyUrl, {
          signal: signal || pCtrl.signal
        });
        clearTimeout(pTimer);
        if (pRes.ok) {
          return await (options.asBuffer ? pRes.arrayBuffer() : pRes.text());
        }
      } catch (_) {}
    }

    throw new Error(`Unable to fetch book resource from ${url}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. PROJECT GUTENBERG (Gutendex REST API)
  // ══════════════════════════════════════════════════════════════════════
  async function searchGutenberg(query, signal) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(cleanQ)}`;
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: signal || AbortSignal.timeout(8000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = [];

      for (const b of (data.results || [])) {
        const epubUrl = b.formats['application/epub+zip'] || b.formats['application/epub'] || '';
        const authorNames = (b.authors || []).map(a => {
          if (!a.name) return '';
          return a.name.includes(',') ? a.name.split(',').reverse().join(' ').trim() : a.name.trim();
        }).filter(Boolean).join(', ') || 'Unknown Author';

        const deathYear = b.authors && b.authors[0]?.death_year ? b.authors[0].death_year : null;
        const yearLabel = deathYear ? `Public Domain (d. ${deathYear})` : 'Public Domain';

        results.push({
          id: `gutenberg_${b.id}`,
          title: (b.title || 'Untitled Book').trim(),
          authors: authorNames,
          year: yearLabel,
          cover: b.formats['image/jpeg'] || '',
          epubUrl: epubUrl,
          source: 'Project Gutenberg',
          sourceBadge: '🏛️ Gutenberg',
          formatBadge: epubUrl ? '⚡ Instant EPUB' : 'HTML / Text',
          directEpub: Boolean(epubUrl),
          downloads: b.download_count || 0,
          summary: (b.subjects || []).slice(0, 3).join(' • ') || 'Classic literature preserved in the public domain.'
        });
      }
      return results;
    } catch (e) {
      console.warn('[BookSearchEngine] Gutenberg search error:', e);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. STANDARD EBOOKS (OPDS Atom Feed)
  // ══════════════════════════════════════════════════════════════════════
  async function searchStandardEbooks(query, signal) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const url = `https://standardebooks.org/opds/all?query=${encodeURIComponent(cleanQ)}`;
    try {
      const xml = await fetchExternal(url, { signal, timeout: 8000 });
      if (!xml || typeof xml !== 'string') return [];

      const entries = xml.split('</entry>');
      const results = [];

      for (let i = 0; i < entries.length - 1; i++) {
        const chunk = entries[i];
        const titleMatch = chunk.match(/<title[^>]*>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
        if (!rawTitle || rawTitle.toLowerCase() === 'search results') continue;

        const nameMatch = chunk.match(/<name[^>]*>([^<]+)<\/name>/i);
        const author = nameMatch ? stripHtml(nameMatch[1]) : 'Unknown Author';

        const links = chunk.split('<link');
        let epubUrl = '';
        let coverUrl = '';

        for (const linkTag of links) {
          if (linkTag.includes('application/epub+zip')) {
            const m = linkTag.match(/href="([^"]+)"/i) || linkTag.match(/href='([^']+)'/i);
            if (m) epubUrl = m[1];
          }
          if (linkTag.includes('image') || linkTag.includes('thumbnail')) {
            const m = linkTag.match(/href="([^"]+)"/i) || linkTag.match(/href='([^']+)'/i);
            if (m && !coverUrl) coverUrl = m[1];
          }
        }

        if (epubUrl && !epubUrl.startsWith('http')) epubUrl = 'https://standardebooks.org' + epubUrl;
        if (coverUrl && !coverUrl.startsWith('http')) coverUrl = 'https://standardebooks.org' + coverUrl;

        const summaryMatch = chunk.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
        const summary = summaryMatch ? stripHtml(summaryMatch[1]).substring(0, 180) + '…' : 'Beautifully formatted open-access typography edition.';

        results.push({
          id: `se_${encodeURIComponent(rawTitle)}`,
          title: rawTitle,
          authors: author,
          year: 'Standard Ebooks Edition',
          cover: coverUrl,
          epubUrl: epubUrl,
          source: 'Standard Ebooks',
          sourceBadge: '✨ Standard Ebooks',
          formatBadge: '⚡ Instant EPUB',
          directEpub: Boolean(epubUrl),
          summary: summary
        });
      }
      return results;
    } catch (e) {
      console.warn('[BookSearchEngine] Standard Ebooks search error:', e);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. OPEN LIBRARY (Official JSON REST API)
  // ══════════════════════════════════════════════════════════════════════
  async function searchOpenLibrary(query, signal) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQ)}&limit=12&fields=title,author_name,first_publish_year,cover_i,key,has_fulltext,ia,edition_count`;
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: signal || AbortSignal.timeout(8000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = [];

      for (const doc of (data.docs || [])) {
        if (!doc.title) continue;
        const authors = (doc.author_name || []).join(', ') || 'Unknown Author';
        const cover = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '';
        const workUrl = doc.key ? `https://openlibrary.org${doc.key}` : '';
        const iaKey = doc.ia && doc.ia[0] ? doc.ia[0] : '';
        const iaUrl = iaKey ? `https://archive.org/details/${iaKey}` : '';

        results.push({
          id: `ol_${(doc.key || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          title: doc.title.trim(),
          authors: authors,
          year: doc.first_publish_year ? String(doc.first_publish_year) : '',
          cover: cover,
          source: 'Open Library',
          sourceBadge: '📖 Open Library',
          formatBadge: 'ℹ️ Web Catalog',
          directEpub: false,
          workUrl: workUrl,
          iaUrl: iaUrl,
          summary: doc.edition_count ? `${doc.edition_count} recorded editions across world libraries.` : 'Catalog record on Open Library.'
        });
      }
      return results;
    } catch (e) {
      console.warn('[BookSearchEngine] Open Library search error:', e);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. LIBRARY GENESIS (LibGen HTML Table Parser)
  // ══════════════════════════════════════════════════════════════════════
  async function searchLibgen(query, signal) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const url = `https://libgen.li/index.php?req=${encodeURIComponent(cleanQ)}&columns[]=t&res=25`;
    try {
      const html = await fetchExternal(url, { signal, timeout: 10000 });
      if (!html || typeof html !== 'string') return [];

      const trs = html.split('<tr');
      const results = [];
      const seenMd5 = new Set();

      for (let i = 2; i < trs.length; i++) {
        const tr = trs[i];
        const md5Match = tr.match(/href=[\"'](?:\/)?(?:get|ads)\.php\?md5=([a-f0-9]{32})/i);
        if (!md5Match) continue;
        const md5 = md5Match[1].toLowerCase();
        if (seenMd5.has(md5)) continue;
        seenMd5.add(md5);

        const rawTds = tr.split('<td');
        if (rawTds.length < 8) continue;
        const cleanTds = rawTds.slice(1).map(td => stripHtml(td));

        // Skip banner ads or empty rows
        if (cleanTds[0].includes('atOptions') || cleanTds[1]?.includes('atOptions')) continue;

        // Clean title
        let title = cleanTds[0] || '';
        title = title.replace(/\s*\(.*?\)\.(?:epub|pdf|mobi|cbz)$/i, '').replace(/\[.*?\]/g, '').trim();
        if (!title || title.length < 2) title = 'Untitled Book';

        const author = cleanTds[1] || 'Unknown Author';
        const publisher = cleanTds[2] || '';
        const year = cleanTds[3] || '';
        const language = cleanTds[4] || '';
        const size = cleanTds[6] || '';
        const ext = (cleanTds[7] || 'epub').toLowerCase();
        const isEpub = ext === 'epub';

        results.push({
          id: `libgen_${md5}`,
          title: title,
          authors: author,
          year: year || (publisher ? publisher : 'Published Book'),
          publisher: publisher,
          language: language,
          size: size,
          format: ext.toUpperCase(),
          formatBadge: isEpub ? '⚡ EPUB' : ext.toUpperCase(),
          source: 'LibGen',
          sourceBadge: '📚 LibGen',
          directEpub: isEpub,
          downloadUrl: `https://libgen.li/ads.php?md5=${md5}`,
          md5: md5,
          summary: `${ext.toUpperCase()} • ${size || 'Standard Size'} • ${language || 'Multi-language'}${publisher ? ` • ${publisher}` : ''}`
        });

        if (results.length >= 15) break;
      }
      return results;
    } catch (e) {
      console.warn('[BookSearchEngine] LibGen search error:', e);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. UNIFIED MULTI-SOURCE SEARCH COORDINATOR
  // ══════════════════════════════════════════════════════════════════════
  async function searchBooks(query, filter = 'all', callbacks = {}) {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim();
    const results = [];
    const seenKeys = new Set();

    function addItems(items) {
      for (const item of items) {
        const normKey = `${(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${(item.authors || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;
        if (seenKeys.has(normKey)) continue;
        seenKeys.add(normKey);
        results.push(item);
      }
      if (callbacks.onPartialResults) {
        callbacks.onPartialResults([...results]);
      }
    }

    if (filter === 'gutenberg') {
      const g = await searchGutenberg(cleanQ);
      addItems(g);
      return results;
    }

    if (filter === 'standardebooks') {
      const se = await searchStandardEbooks(cleanQ);
      addItems(se);
      return results;
    }

    if (filter === 'libgen') {
      const lg = await searchLibgen(cleanQ);
      addItems(lg);
      return results;
    }

    if (filter === 'openlibrary') {
      const ol = await searchOpenLibrary(cleanQ);
      addItems(ol);
      return results;
    }

    // Default: Search across all 4 platforms in parallel
    const promises = [
      searchGutenberg(cleanQ).then(items => addItems(items)),
      searchStandardEbooks(cleanQ).then(items => addItems(items)),
      searchLibgen(cleanQ).then(items => addItems(items)),
      searchOpenLibrary(cleanQ).then(items => addItems(items))
    ];

    await Promise.allSettled(promises);

    // Sort: Instant EPUB downloadables at top, then LibGen, then Catalog records
    results.sort((a, b) => {
      if (a.directEpub && !b.directEpub) return -1;
      if (!a.directEpub && b.directEpub) return 1;
      if (a.sourceBadge?.includes('Gutenberg') && !b.sourceBadge?.includes('Gutenberg')) return -1;
      return 0;
    });

    return results;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. EPUB DOWNLOAD & INGESTION COORDINATOR
  // ══════════════════════════════════════════════════════════════════════
  async function downloadBookFile(book, callbacks = {}) {
    const directUrl = book.epubUrl || book.downloadUrl;
    if (!directUrl) throw new Error('No download link available for this book.');

    callbacks.onProgress?.({ percent: 10, status: 'Contacting book server…' });

    let finalDownloadUrl = directUrl;

    // For LibGen ads.php links, resolve the actual get.php download link if needed
    if (directUrl.includes('ads.php?md5=')) {
      try {
        callbacks.onProgress?.({ percent: 25, status: 'Resolving mirror gateway…' });
        const adsHtml = await fetchExternal(directUrl, { timeout: 8000 });
        const getKeyMatch = adsHtml.match(/href="([^"]*get\.php\?md5=[^"]*)"/i);
        if (getKeyMatch) {
          finalDownloadUrl = getKeyMatch[1].startsWith('http') ? getKeyMatch[1] : `https://libgen.li/${getKeyMatch[1].replace(/^\//, '')}`;
        }
      } catch (e) {
        console.warn('[BookSearchEngine] Mirror gateway resolution notice:', e);
      }
    }

    callbacks.onProgress?.({ percent: 45, status: 'Downloading book content…' });

    const arrayBuf = await fetchExternal(finalDownloadUrl, { asBuffer: true, timeout: 25000 });
    if (!arrayBuf || arrayBuf.byteLength < 500) {
      throw new Error('Downloaded book file appears corrupt or empty.');
    }

    callbacks.onProgress?.({ percent: 90, status: 'Finalizing EPUB packaging…' });

    const safeTitle = (book.title || 'Book').replace(/[/\\?%*:|"<>]/g, '_').trim();
    const ext = (book.format || 'epub').toLowerCase();
    const fileName = `${safeTitle}.${ext}`;
    const mime = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';

    const blob = new Blob([arrayBuf], { type: mime });
    const file = new File([blob], fileName, { type: mime });

    callbacks.onProgress?.({ percent: 100, status: 'Download complete!' });

    return { file, blob, fileName, isEpub: ext === 'epub' };
  }

  async function loadBookIntoApp(book, actions = {}, callbacks = {}) {
    try {
      actions.toast?.('📥 Downloading book…', 'info');
      const { file, blob, fileName, isEpub } = await downloadBookFile(book, {
        onProgress: (p) => {
          if (actions.setWebImportStatus) actions.setWebImportStatus(p.status);
        }
      });

      if (actions.processFile) {
        actions.toast?.('📖 Unpacking book chapters and artwork…', 'info');
        await actions.processFile(file);
      }

      // If user provided saveNovelToHistory
      if (actions.saveNovelToHistory) {
        actions.saveNovelToHistory({
          title: book.title,
          author: book.authors,
          cover: book.cover,
          sourceUrl: book.epubUrl || book.downloadUrl || '',
          source: book.source
        });
      }

      actions.toast?.(`🎉 "${book.title}" ready! Opening reader…`, 'success');

      if (actions.setActiveTab) {
        actions.setActiveTab('text');
      }

      callbacks.onSuccess?.({ file, fileName });
    } catch (err) {
      console.error('[BookSearchEngine] Load book error:', err);
      actions.toast?.(`Failed to download book: ${err.message || err}`, 'error');
      callbacks.onError?.(err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. PUBLIC INTERFACE
  // ══════════════════════════════════════════════════════════════════════
  return {
    searchGutenberg,
    searchStandardEbooks,
    searchOpenLibrary,
    searchLibgen,
    searchBooks,
    downloadBookFile,
    loadBookIntoApp,
    getAnnasArchiveSearchUrl: (q) => `https://annas-archive.li/search?q=${encodeURIComponent(q || '')}&ext=epub`,
    getOceanOfPdfSearchUrl: (q) => `https://oceanofpdf.com/?s=${encodeURIComponent(q || '')}`
  };
}));
