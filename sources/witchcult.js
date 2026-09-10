/**
 * sources/witchcult.js - Built-in Source for Witch Cult Translations (Re:Zero)
 * Features per-Arc hierarchical grouping and character entity normalization.
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class WitchCultPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'witchcult',
        name: 'Witch Cult Translations',
        site: 'https://witchculttranslation.com',
        version: '2.0.0',
        icon: 'https://witchculttranslation.com/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /witchculttranslation\.com/i.test(url);
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = this.decodeHtml(doc.querySelector('h1.entry-title, .site-title, title')?.textContent || 'Re:Zero - Starting Life in Another World');
      const author = 'Tappei Nagatsuki';
      const cover = 'https://witchculttranslation.com/wp-content/uploads/2018/11/cropped-icon.png';

      // Detect Arc from URL or page title
      let currentArc = 'Arc';
      const arcMatch = (url + ' ' + (doc.title || '')).match(/(Arc\s*\d+|Arc\s*[IVXLCDM]+|Side\s*Content|EX\s*\d*)/i);
      if (arcMatch) {
        currentArc = arcMatch[1].replace(/\b\w/g, l => l.toUpperCase());
      }

      const chapters = [];
      const links = doc.querySelectorAll('.entry-content a[href*="witchculttranslation.com"]');
      const seen = new Set();

      links.forEach((a, idx) => {
        let href = a.getAttribute('href') || '';
        if (!href || href === url || seen.has(href)) return;
        // Ignore tags, categories, author pages
        if (/\/(category|tag|author|page)\//.test(href)) return;

        seen.add(href);
        const rawChapterTitle = a.textContent.trim();
        if (!rawChapterTitle || rawChapterTitle.length < 2) return;

        // Clean entity encoding in chapter title (e.g. &#8216; -> ')
        const chapterTitle = this.decodeHtml(rawChapterTitle);

        // Detect if link belongs to a specific Arc
        let arc = currentArc;
        const inlineArc = chapterTitle.match(/(Arc\s*\d+|Arc\s*[IVXLCDM]+)/i);
        if (inlineArc) arc = inlineArc[1].replace(/\b\w/g, l => l.toUpperCase());

        chapters.push({
          title: chapterTitle,
          url: href,
          arc: arc,
          order: idx + 1
        });
      });

      // Fallback: If on a single chapter page, return as single chapter
      if (chapters.length === 0) {
        chapters.push({
          title: this.decodeHtml(doc.querySelector('h1.entry-title')?.textContent || 'Chapter 1'),
          url: url,
          arc: currentArc,
          order: 1
        });
      }

      return {
        id: 'witchcult_' + (url.replace(/[^a-zA-Z0-9]/g, '_')),
        title,
        author,
        cover,
        summary: 'Official Re:Zero Web Novel English Translations by Witch Cult Translations.',
        status: 'Ongoing',
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Title
      let rawTitle = doc.querySelector('h1.entry-title, .entry-title, title')?.textContent || options.title || 'Chapter';
      const title = this.decodeHtml(rawTitle.replace(/\s*–\s*Witch Cult Translations.*$/i, '').trim());

      // Content
      const contentEl = doc.querySelector('.entry-content');
      let content = '';

      if (contentEl) {
        // Remove WP share buttons, related posts, navigation
        const trash = contentEl.querySelectorAll('.sharedaddy, .jp-relatedposts, .navigation, script, style, .wp-block-navigation');
        trash.forEach(t => t.remove());

        const paras = contentEl.querySelectorAll('p');
        const cleanParas = [];
        paras.forEach(p => {
          let text = p.textContent.trim();
          if (!text) return;
          // Ignore translator note navigation like "Next Chapter ->"
          if (/^(Next Chapter|Previous Chapter|Table of Contents)/i.test(text)) return;
          cleanParas.push(this.decodeHtml(text));
        });

        content = cleanParas.join('\n\n');
      }

      return {
        title,
        content: content.trim(),
        originalTitle: title
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WitchCultPlugin };
  } else if (typeof window !== 'undefined') {
    window.WitchCultPlugin = WitchCultPlugin;
  }
})();
