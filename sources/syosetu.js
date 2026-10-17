/**
 * sources/syosetu.js - Built-in Source for Shousetsuka ni Narou (syosetu.com) & Hameln (syosetu.org)
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class SyosetuPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'syosetu',
        name: 'Syosetu & Hameln',
        site: 'https://syosetu.com',
        version: '2.0.0',
        icon: 'https://syosetu.com/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /syosetu\.com|syosetu\.org|hameln/i.test(url);
    }

    isHameln(url) {
      return /syosetu\.org/i.test(url);
    }

    async getNovelDetails(url) {
      const isHameln = this.isHameln(url);
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      let html = await fetchHtml(url);

      // Check for Cloudflare Challenge
      if (html.includes('security service to protect against malicious bots') || html.includes('cf-browser-verification')) {
        throw new Error('CLOUDFLARE_PROTECTED: Cloudflare verification required for syosetu.org. Please open the link in WebView or use your browser once to clear the challenge.');
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');

      if (isHameln) {
        return this.parseHamelnNovel(url, doc);
      } else {
        return this.parseNarouNovel(url, doc, fetchHtml);
      }
    }

    parseHamelnNovel(url, doc) {
      const rawTitle = doc.querySelector('.novel_title, h1, title')?.textContent || 'Hameln Novel';
      const title = this.decodeHtml(rawTitle.replace(/\s*-\s*ハーメルン.*$/i, '').trim());
      const author = this.decodeHtml(doc.querySelector('.novel_author, a[href*="/user/"]')?.textContent || 'Unknown Author');
      const summary = this.decodeHtml(doc.querySelector('#novel_ex, .synopsis, #synopsis')?.textContent || '');

      const chapters = [];
      const novelId = (url.match(/novel\/(\d+)/) || [])[1];
      const baseUrl = url.replace(/\/index\.html.*$/, '/').replace(/\?.*$/, '').replace(/\/+$/, '') + '/';
      const seenNums = new Set();
      const seenUrls = new Set();

      const allLinks = doc.querySelectorAll('a[href]');
      allLinks.forEach((a) => {
        let href = a.getAttribute('href') || '';
        if (!href) return;
        let fullUrl;
        try {
          fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        } catch (e) {
          return;
        }

        try {
          const u = new URL(fullUrl);
          if (!u.hostname.includes('syosetu.org')) return;
          const pathRegex = novelId
            ? new RegExp(`^/novel/${novelId}/(\\d+)(?:\\.html)?$`, 'i')
            : /^\/novel\/\d+\/(\d+)(?:\.html)?$/i;
          const m = u.pathname.match(pathRegex);
          if (m) {
            const chNum = parseInt(m[1], 10);
            const cleanUrl = u.origin + u.pathname;
            if (!seenNums.has(chNum) && !seenUrls.has(cleanUrl)) {
              seenNums.add(chNum);
              seenUrls.add(cleanUrl);
              const titleText = a.textContent?.trim() || `Chapter ${chNum}`;
              chapters.push({
                title: this.decodeHtml(titleText),
                url: cleanUrl,
                order: chNum
              });
            }
          }
        } catch (e) {}
      });

      if (chapters.length > 0) {
        chapters.sort((a, b) => a.order - b.order);
      } else {
        const isChapterUrl = /\/\d+\.html/.test(url);
        const bodyContent = doc.querySelector('#honbun');
        if (isChapterUrl || (bodyContent && bodyContent.textContent.trim().length > 100)) {
          chapters.push({
            title: title || 'Chapter 1',
            url: url,
            order: 1
          });
        }
      }

      const cover = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.extractPageCover)
        ? window.WebNovelImporter.extractPageCover(doc, url)
        : (doc.querySelector('#novel_header img, #novel_ex img, meta[property="og:image"]')?.getAttribute('content') || '');

      return {
        id: 'hameln_' + (novelId || Date.now()),
        title,
        author,
        cover: cover || '',
        summary,
        status: 'Ongoing',
        chapters
      };
    }

    async parseNarouNovel(url, doc, fetchHtml) {
      // Shousetsuka ni Narou redesign selectors
      const rawTitle = doc.querySelector('.p-novel__title, #novel_title, h1')?.textContent || 'Syosetu Novel';
      const title = this.decodeHtml(rawTitle.trim());
      const author = this.decodeHtml(doc.querySelector('.p-novel__author, .novel_writername, a[href*="mypage"]')?.textContent?.replace(/作者：/g, '')?.trim() || 'Unknown Author');
      const summary = this.decodeHtml(doc.querySelector('#novel_ex, .p-novel__summary')?.textContent || '');

      const chapters = [];
      const sublistItems = doc.querySelectorAll('.p-eplist__sublist, .novel_sublist2');

      if (sublistItems.length > 0) {
        sublistItems.forEach((item, idx) => {
          const a = item.querySelector('a');
          if (!a) return;
          const href = a.getAttribute('href') || '';
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
          chapters.push({
            title: this.decodeHtml(a.textContent.trim()) || `Chapter ${idx + 1}`,
            url: fullUrl,
            order: idx + 1
          });
        });
      } else {
        // Fallback: any chapter link matching ncode pattern
        const allLinks = doc.querySelectorAll('a[href*="/n"]');
        allLinks.forEach((a, idx) => {
          const href = a.getAttribute('href') || '';
          if (/\/\d+\/?$/.test(href)) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
            chapters.push({
              title: this.decodeHtml(a.textContent.trim()) || `Chapter ${idx + 1}`,
              url: fullUrl,
              order: idx + 1
            });
          }
        });
      }

      const cover = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.extractPageCover)
        ? window.WebNovelImporter.extractPageCover(doc, url)
        : (doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '');

      return {
        id: 'narou_' + (url.match(/(n\d+[a-z]+)/i)?.[1] || Date.now()),
        title,
        author,
        cover: cover || '',
        summary,
        status: 'Ongoing',
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      if (html.includes('security service to protect against malicious bots')) {
        throw new Error('CLOUDFLARE_PROTECTED: Cloudflare verification required.');
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Title extraction
      let title = doc.querySelector('.p-novel__title, .novel_subtitle, h1, .subtitle')?.textContent?.trim() || options.title || 'Chapter';
      title = this.decodeHtml(title);

      // Content extraction: Hameln uses #honbun (plus optional #mae/#ato), Narou uses .p-novel__body or #novel_honbun
      let content = '';
      const cleanFn = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.cleanChapterHtmlWithImages)
        ? window.WebNovelImporter.cleanChapterHtmlWithImages
        : null;

      const honbun = doc.querySelector('#honbun');
      if (honbun) {
        const mae = doc.querySelector('#mae');
        const ato = doc.querySelector('#ato');
        if (cleanFn) {
          let combinedHtml = '';
          if (mae) combinedHtml += mae.innerHTML + '\n<hr/>\n';
          combinedHtml += honbun.innerHTML;
          if (ato) combinedHtml += '\n<hr/>\n' + ato.innerHTML;
          content = cleanFn(combinedHtml, chapterUrl);
        } else {
          const parts = [];
          if (mae && mae.textContent.trim()) parts.push(mae.textContent.trim());
          parts.push(honbun.textContent.trim());
          if (ato && ato.textContent.trim()) parts.push(ato.textContent.trim());
          content = parts.join('\n\n');
        }
      } else {
        const contentEl = doc.querySelector('.p-novel__body, #novel_honbun, .novel_honbun, .widget-episodeBody, .ss');
        if (contentEl) {
          if (cleanFn) {
            content = cleanFn(contentEl.innerHTML, chapterUrl);
          } else {
            // Remove Ruby tags markup or format cleanly
            const paras = contentEl.querySelectorAll('p, div.novel_honbun, .p-novel__text');
            if (paras.length > 0) {
              const cleanParas = [];
              paras.forEach(p => {
                const t = p.textContent.trim();
                if (t) cleanParas.push(t);
              });
              content = cleanParas.join('\n\n');
            } else {
              content = contentEl.innerText || contentEl.textContent || '';
            }
          }
        }
      }

      return {
        title,
        content: content.trim(),
        originalTitle: title
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyosetuPlugin };
  } else if (typeof window !== 'undefined') {
    window.SyosetuPlugin = SyosetuPlugin;
  }
})();
