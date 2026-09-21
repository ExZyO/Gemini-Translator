/**
 * sources/royalroad.js - Built-in Source for Royal Road (royalroad.com)
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class RoyalRoadPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'royalroad',
        name: 'Royal Road',
        site: 'https://www.royalroad.com',
        version: '2.0.0',
        icon: 'https://www.royalroad.com/icons/favicon-32x32.png'
      });
    }

    matches(url) {
      if (!url) return false;
      return /royalroad\.com/i.test(url);
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(doc.querySelector('h1, .fic-header h1')?.textContent?.trim() || 'Royal Road Fiction');
      const author = this.decodeHtml(doc.querySelector('.fic-header h4 a, .fic-header a[href*="/profile/"]')?.textContent?.trim() || 'Unknown Author');
      const cover = doc.querySelector('.fic-header img.cover-art, .cover-art-container img')?.getAttribute('src') || '';
      const summary = this.decodeHtml(doc.querySelector('.description, .fiction-info .description')?.textContent || '');

      const chapters = [];
      const rows = doc.querySelectorAll('#chapters tbody tr, .chapter-row');

      rows.forEach((row, idx) => {
        const a = row.querySelector('a[href*="/chapter/"]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : 'https://www.royalroad.com' + href;
        const chapterTitle = this.decodeHtml(a.textContent.trim());

        // Volume / Arc detection
        let volume = '';
        const volumeHeader = row.closest('.volume-container')?.querySelector('.volume-header');
        if (volumeHeader) volume = volumeHeader.textContent.trim();

        chapters.push({
          title: chapterTitle || `Chapter ${idx + 1}`,
          url: fullUrl,
          volume,
          order: idx + 1
        });
      });

      // Single chapter fallback
      if (chapters.length === 0) {
        chapters.push({
          title: title || 'Chapter 1',
          url: url,
          order: 1
        });
      }

      return {
        id: 'rr_' + (url.match(/fiction\/(\d+)/)?.[1] || Date.now()),
        title,
        author,
        cover,
        summary,
        status: 'Ongoing',
        sourceUrl: url,
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = options.title || this.decodeHtml(doc.querySelector('.portlet-title h1, h1.font-white, .chapter-inner h1, h1:not(.fic-header h1)')?.textContent?.trim() || 'Chapter');
      const contentEl = doc.querySelector('.chapter-inner.chapter-content, .chapter-inner, .chapter-content') || doc.body;

      // 1. Remove anti-scraper traps & hidden elements from content DOM
      if (contentEl) {
        contentEl.querySelectorAll('[style*="display: none"], [style*="display:none"], [style*="opacity: 0"], [style*="opacity:0"], [style*="font-size: 0"], .hidden, .d-none').forEach(el => el.remove());
      }

      // 2. Extract Author's Notes (Top and Bottom portlets)
      const authorNotes = Array.from(doc.querySelectorAll('.author-note-portlet'));
      let topNoteHtml = '';
      let bottomNoteHtml = '';
      if (authorNotes.length > 0 && contentEl) {
        authorNotes.forEach(an => {
          const noteBody = an.querySelector('.author-note, .portlet-body');
          if (!noteBody) return;
          const isBefore = (contentEl.compareDocumentPosition(an) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
          const noteCleaned = (window.WebNovelImporter && window.WebNovelImporter.cleanChapterHtmlWithImages)
            ? window.WebNovelImporter.cleanChapterHtmlWithImages(noteBody.innerHTML || noteBody.textContent || '', chapterUrl)
            : (noteBody.textContent || '');
          if (noteCleaned) {
            const formattedNote = '\n\n> **Author\'s Note:**\n> ' + noteCleaned.split('\n').join('\n> ') + '\n\n';
            if (isBefore) {
              topNoteHtml += formattedNote;
            } else {
              bottomNoteHtml += formattedNote;
            }
          }
        });
      }

      let cleanHtml = (window.WebNovelImporter && window.WebNovelImporter.cleanChapterHtmlWithImages)
        ? window.WebNovelImporter.cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '', chapterUrl)
        : (contentEl.textContent || '');

      if (topNoteHtml) cleanHtml = topNoteHtml.trim() + '\n\n' + cleanHtml;
      if (bottomNoteHtml) cleanHtml = cleanHtml + '\n\n' + bottomNoteHtml.trim();

      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && title) {
        cleanHtml = stripFn(cleanHtml, title);
      }

      return {
        title,
        content: cleanHtml,
        text: cleanHtml,
        originalTitle: title
      };
    }

    async search(query) {
      if (!query || !query.trim()) return [];
      const fetchHtml = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) return [];
      try {
        const url = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query.trim())}`;
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const items = [];
        const fictionCards = doc.querySelectorAll('.fiction-list-item, .search-item');
        fictionCards.forEach(card => {
          const titleA = card.querySelector('h2.fiction-title a, .fiction-title a, a[href*="/fiction/"]');
          if (!titleA) return;
          const href = titleA.getAttribute('href') || '';
          const fullUrl = href.startsWith('http') ? href : 'https://www.royalroad.com' + href;
          const name = this.decodeHtml(titleA.textContent.trim());
          const img = card.querySelector('img');
          const cover = img?.getAttribute('src') || '';
          const author = this.decodeHtml(card.querySelector('.author a, span.author')?.textContent?.trim() || '');
          const summary = this.decodeHtml(card.querySelector('.description, p')?.textContent?.trim() || '');
          items.push({
            id: 'rr_' + (href.match(/fiction\/(\d+)/)?.[1] || Math.random().toString(36).slice(2)),
            name,
            title: name,
            url: fullUrl,
            path: fullUrl,
            author,
            cover: cover.startsWith('http') ? cover : (cover ? 'https://www.royalroad.com' + cover : ''),
            summary,
            source: 'Royal Road'
          });
        });
        return items;
      } catch (err) {
        console.warn('[RoyalRoadPlugin] Search failed:', err);
        return [];
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoyalRoadPlugin };
  } else if (typeof window !== 'undefined') {
    window.RoyalRoadPlugin = RoyalRoadPlugin;
  }
})();
