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
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(doc.querySelector('h1, .fic-header h1')?.textContent?.trim() || options.title || 'Chapter');
      const contentEl = doc.querySelector('.chapter-inner.chapter-content, .chapter-content');
      let content = '';

      if (contentEl) {
        const paras = contentEl.querySelectorAll('p');
        const clean = [];
        paras.forEach(p => {
          const t = p.textContent.trim();
          if (t) clean.push(this.decodeHtml(t));
        });
        content = clean.join('\n\n');
      }

      return {
        title,
        content: content.trim(),
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
