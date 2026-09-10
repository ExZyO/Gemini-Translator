/**
 * sources/universal.js - Universal Web Novel Scraper Fallback
 * Heuristic extractor for any arbitrary blog, forum, or web novel website.
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class UniversalPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'universal',
        name: 'Universal Reader & Scraper',
        site: '*',
        version: '2.0.0',
        icon: ''
      });
    }

    matches() {
      return true; // Catch-all fallback
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('h1')?.textContent ||
        doc.title ||
        'Web Novel'
      );

      const author = this.decodeHtml(
        doc.querySelector('meta[name="author"], .author, [rel="author"]')?.getAttribute('content') ||
        doc.querySelector('.author, .byline')?.textContent ||
        'Unknown Author'
      );

      const cover = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const summary = this.decodeHtml(
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('.description, .synopsis, #synopsis')?.textContent ||
        ''
      );

      // Extract candidate chapter links
      const chapters = [];
      const links = doc.querySelectorAll('a[href]');
      const seen = new Set();

      const chapterPattern = /(chapter|ch\.|episode|ep\.|part|act|volume|vol\.|scene|entry|#\d+|\b\d+\b)/i;

      links.forEach((a, idx) => {
        const text = a.textContent.trim();
        const href = a.getAttribute('href');
        if (!href || seen.has(href) || href.startsWith('#') || href.startsWith('javascript:')) return;

        if (chapterPattern.test(text) || chapterPattern.test(href)) {
          seen.add(href);
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
          chapters.push({
            title: this.decodeHtml(text) || `Chapter ${chapters.length + 1}`,
            url: fullUrl,
            order: chapters.length + 1
          });
        }
      });

      // If no TOC links found, treat the current URL as a single-chapter novel
      if (chapters.length === 0) {
        chapters.push({
          title: title || 'Chapter 1',
          url: url,
          order: 1
        });
      }

      return {
        id: 'univ_' + Math.abs(this.hashCode(url)),
        title,
        author,
        cover,
        summary,
        status: 'Unknown',
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Title
      let rawTitle = doc.querySelector('h1, h2.chapter-title, .entry-title, .novel-title')?.textContent || options.title || 'Chapter';
      const title = this.decodeHtml(rawTitle.trim());

      // Best content container heuristic
      const selectors = [
        'article',
        '.entry-content',
        '.chapter-content',
        '#chapter-content',
        '.content',
        '#content',
        '.post-content',
        'main',
        '#main'
      ];

      let contentEl = null;
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 200) {
          contentEl = el;
          break;
        }
      }

      if (!contentEl) contentEl = doc.body;

      // Clean non-text tags
      const trash = contentEl.querySelectorAll('script, style, nav, header, footer, iframe, .ads, .ad, .social-share');
      trash.forEach(t => t.remove());

      const paras = contentEl.querySelectorAll('p');
      let content = '';

      if (paras.length > 2) {
        const cleanParas = [];
        paras.forEach(p => {
          const t = p.textContent.trim();
          if (t && t.length > 1) cleanParas.push(this.decodeHtml(t));
        });
        content = cleanParas.join('\n\n');
      } else {
        content = contentEl.innerText || contentEl.textContent || '';
      }

      return {
        title,
        content: content.trim(),
        originalTitle: title
      };
    }

    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UniversalPlugin };
  } else if (typeof window !== 'undefined') {
    window.UniversalPlugin = UniversalPlugin;
  }
})();
