/**
 * sources/novelfire.js - Built-in Source for Novel Fire (novelfire.net)
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class NovelFirePlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'novelfire',
        name: 'Novel Fire',
        site: 'https://novelfire.net',
        version: '2.0.0',
        icon: 'https://novelfire.net/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /novelfire\.(?:net|com|org)/i.test(url);
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(url, { headers: { 'Referer': 'https://novelfire.net/' } });
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(doc.querySelector('h1.novel-title, h1, .book-title')?.textContent?.trim() || 'NovelFire Novel');
      const author = this.decodeHtml(doc.querySelector('.author a, .author span, a[href*="/author/"]')?.textContent?.trim() || 'NovelFire Author');
      const cover = doc.querySelector('.novel-cover img, figure.novel-cover img, .cover img')?.getAttribute('src') || '';
      const fullCover = cover.startsWith('http') ? cover : (cover ? `https://novelfire.net${cover}` : '');
      const summary = this.decodeHtml(doc.querySelector('.description .content, .description, #info')?.textContent?.trim() || '');

      // Parse chapters from novel page or chapter list
      const chapters = [];
      const seen = new Set();
      doc.querySelectorAll('ul.chapter-list li a, .chapters-list li a, a[href*="/chapter/"], a[href*="/book/"][href*="-chapter-"]').forEach((a, idx) => {
        const href = a.getAttribute('href') || '';
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `https://novelfire.net${href}`;
        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);
        const chapterTitle = this.decodeHtml(a.textContent?.trim() || `Chapter ${idx + 1}`);
        chapters.push({
          title: chapterTitle,
          url: fullUrl,
          order: idx + 1
        });
      });

      if (chapters.length === 0) {
        chapters.push({
          title: title || 'Chapter 1',
          url: url,
          order: 1
        });
      }

      return {
        id: 'nf_' + (url.match(/\/book\/([^\/]+)/)?.[1] || Date.now()),
        title,
        author,
        cover: fullCover,
        summary,
        status: 'Ongoing',
        chapters,
        sourceUrl: url
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl, { headers: { 'Referer': 'https://novelfire.net/' } });
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(doc.querySelector('h1.chapter-title, h1, .chapter-name')?.textContent?.trim() || options.title || 'Chapter');
      const contentEl = doc.querySelector('.chapter-content, #chapter-content, .content-inner') || doc.body;

      // Strip ad banners, scripts, and promotional elements
      contentEl.querySelectorAll('script, style, iframe, .ads, .ad-container, [id*="ad_"], .chapter-nav').forEach(el => el.remove());

      const cleanHtmlFn = (window.WebNovelImporter && window.WebNovelImporter.cleanChapterHtmlWithImages) || null;
      const content = cleanHtmlFn ? cleanHtmlFn(contentEl.innerHTML || contentEl.textContent || '') : (contentEl.textContent || '').trim();

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
        const url = `https://novelfire.net/search?keyword=${encodeURIComponent(query.trim())}`;
        const html = await fetchHtml(url, { headers: { 'Referer': 'https://novelfire.net/' } });
        if (!html) return [];

        const results = [];
        const itemMatches = [...html.matchAll(/<li class="novel-item">([\s\S]*?)<\/li>/gi)];

        for (const m of itemMatches) {
          const block = m[1];
          const linkM = block.match(/<a title="([^"]+)"\s+href="([^"]+)"/i) || block.match(/<a\s+href="([^"]+)"\s+title="([^"]+)"/i);
          if (!linkM) continue;

          const rawTitle = linkM[1].includes('/book/') ? linkM[2] : linkM[1];
          const rawHref = linkM[1].includes('/book/') ? linkM[1] : linkM[2];

          const title = this.decodeHtml(rawTitle.replace(/<[^>]*>/g, '').trim());
          const bookUrl = rawHref.startsWith('http') ? rawHref : `https://novelfire.net${rawHref}`;

          const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
          let cover = coverM ? coverM[1] : '';
          if (cover && !cover.startsWith('http')) cover = `https://novelfire.net${cover}`;

          const chM = block.match(/(\d[\d,]*)\s*Chapters/i);
          const chapters = chM ? `${chM[1]} chapters` : '';

          const rankM = block.match(/icon-crown[^>]*><\/i>\s*([^<]+)/i);
          const rank = rankM ? this.decodeHtml(rankM[1].replace(/<[^>]*>/g, '').trim()) : '';

          results.push({
            id: 'nf_' + (bookUrl.match(/\/book\/([^\/]+)/)?.[1] || Math.random().toString(36).slice(2)),
            name: title,
            title,
            url: bookUrl,
            path: bookUrl,
            cover,
            author: 'NovelFire Author',
            chapters,
            rating: rank,
            source: 'Novel Fire',
            sourceId: 'novelfire'
          });
        }

        return results;
      } catch (err) {
        console.warn('[NovelFirePlugin] Search error:', err);
        return [];
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NovelFirePlugin };
  } else if (typeof window !== 'undefined') {
    window.NovelFirePlugin = NovelFirePlugin;
  }
})();
