/**
 * sources/novelarchive.js - Built-in Source for Novel Archive (novelarchive.cc)
 * Fast direct API integration for Single-Page Application (SPA) novels.
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class NovelArchivePlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'novelarchive',
        name: 'Novel Archive',
        site: 'https://novelarchive.cc',
        version: '1.0.0',
        icon: 'https://novelarchive.cc/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /novelarchive\.cc/i.test(url);
    }

    extractNovelId(url) {
      if (!url) return '';
      const match = url.match(/[?&](?:id|novel)=([a-f0-9]+)/i) || url.match(/\/novels?\/([a-f0-9]+)/i);
      return match ? match[1] : '';
    }

    async getNovelDetails(url) {
      const novelId = this.extractNovelId(url);
      if (!novelId) throw new Error('Could not extract novel ID from Novel Archive URL.');

      const apiUrl = `https://novelarchive.cc/api/novels/${encodeURIComponent(novelId)}`;
      let json = null;
      if (typeof window !== 'undefined' && window.fetchRetry) {
        const resp = await window.fetchRetry(apiUrl);
        json = await resp.json();
      } else {
        const resp = await fetch(apiUrl);
        json = await resp.json();
      }

      const novel = (json && json.novel) || {};
      const title = this.decodeHtml(novel.title || 'Novel Archive Fiction');
      const author = this.decodeHtml(novel.author || 'Author');
      const cover = novel.cover_url || (novelId ? `https://novelarchive.cc/api/novels/${novelId}/cover?w=640&q=72&format=webp` : '');
      const summary = this.decodeHtml(novel.description || '');

      const chapters = [];
      const chapterNames = Array.isArray(novel.chapter_names) ? novel.chapter_names : [];
      const totalCount = parseInt(novel.total_chapters || chapterNames.length || 0, 10) || chapterNames.length;

      for (let i = 1; i <= totalCount; i++) {
        const chapterTitle = this.decodeHtml(chapterNames[i - 1] || `Chapter ${i}`);
        chapters.push({
          title: chapterTitle,
          url: `https://novelarchive.cc/reader?novel=${novelId}&chapter=${i}`,
          order: i
        });
      }

      if (chapters.length === 0) {
        chapters.push({
          title: 'Chapter 1',
          url: `https://novelarchive.cc/reader?novel=${novelId}&chapter=1`,
          order: 1
        });
      }

      return {
        id: 'na_' + novelId,
        title,
        author,
        cover,
        summary,
        status: novel.release_status || (novel.ongoing ? 'Ongoing' : 'Completed'),
        sourceUrl: url,
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const novelId = this.extractNovelId(chapterUrl) || options.novelId;
      const chMatch = chapterUrl.match(/[?&]chapter=(\d+)/i) || chapterUrl.match(/\/chapters?\/(\d+)/i);
      const chapterNum = chMatch ? chMatch[1] : (options.order || '1');

      if (!novelId) throw new Error('Could not identify novel ID for chapter.');

      const apiUrl = `https://novelarchive.cc/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapterNum)}`;
      let json = null;
      if (typeof window !== 'undefined' && window.fetchRetry) {
        const resp = await window.fetchRetry(apiUrl);
        json = await resp.json();
      } else {
        const resp = await fetch(apiUrl);
        json = await resp.json();
      }

      const chapter = (json && json.chapter) || {};
      const title = options.title || chapter.title || `Chapter ${chapterNum}`;
      const rawText = chapter.content || chapter.text || '';

      // Format raw text into proper clean HTML paragraphs if it's plain text
      let htmlContent = '';
      if (rawText.includes('<p>') || rawText.includes('<div>')) {
        htmlContent = rawText;
      } else {
        const paragraphs = rawText.split(/\r?\n+/).map(p => p.trim()).filter(Boolean);
        htmlContent = paragraphs.map(p => `<p>${this.decodeHtml(p)}</p>`).join('\n');
      }

      return {
        title,
        content: htmlContent,
        originalTitle: title
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NovelArchivePlugin };
  } else if (typeof window !== 'undefined') {
    window.NovelArchivePlugin = NovelArchivePlugin;
  }
})();
