/**
 * sources/wattpad.js - Built-in Source for Wattpad (wattpad.com)
 * High-fidelity Wattpad story scraper supporting multi-page chapters,
 * clean paragraph formatting, illustration preservation, and story search.
 */

(function() {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class WattpadPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'wattpad',
        name: 'Wattpad',
        site: 'https://www.wattpad.com',
        version: '1.0.0',
        icon: 'https://www.wattpad.com/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /wattpad\.com/i.test(url);
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      let targetUrl = url;
      let storyData = null;
      let initialHtml = '';

      try {
        initialHtml = await fetchHtml(targetUrl);
      } catch (err) {
        throw new Error(`Failed to fetch Wattpad story: ${err.message}`);
      }

      // Check if user passed a chapter URL instead of a story URL
      // Chapter URLs contain groupId or group object pointing to the story
      const groupMatch = initialHtml.match(/"group"\s*:\s*\{\s*"id"\s*:\s*"(\d+)"/i) || initialHtml.match(/"groupId"\s*:\s*"?(\d+)"?/i);
      if (groupMatch && !targetUrl.includes('/story/')) {
        const parentStoryId = groupMatch[1];
        targetUrl = `https://www.wattpad.com/story/${parentStoryId}`;
        try {
          initialHtml = await fetchHtml(targetUrl);
        } catch (_) {}
      }

      // 1. Extract from Remix context (Primary and fastest)
      const remixMatch = initialHtml.match(/window\.__remixContext\s*=\s*(\{[\s\S]*?\});<\/script>/);
      if (remixMatch) {
        try {
          const remix = JSON.parse(remixMatch[1]);
          const loaderData = remix.state?.loaderData || {};
          for (const k of Object.keys(loaderData)) {
            if (loaderData[k]?.story) {
              storyData = loaderData[k].story;
              break;
            }
          }
        } catch (_) {}
      }

      // 2. Fallback to Wattpad API v3 endpoint
      if (!storyData) {
        const storyIdMatch = targetUrl.match(/wattpad\.com\/story\/(\d+)/i) || targetUrl.match(/wattpad\.com\/(\d+)/i);
        const storyId = storyIdMatch ? storyIdMatch[1] : null;
        if (storyId) {
          try {
            const apiJsonStr = await fetchHtml(`https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,url,cover,description,user(name,username),parts(id,title,url)`);
            const parsed = JSON.parse(apiJsonStr);
            if (parsed && parsed.title) {
              storyData = parsed;
            }
          } catch (_) {}
        }
      }

      if (storyData) {
        const chapters = (storyData.parts || []).map((p, idx) => ({
          title: this.decodeHtml(p.title || `Part ${idx + 1}`),
          url: p.url || `https://www.wattpad.com/${p.id}`,
          order: idx + 1,
          id: String(p.id)
        }));

        return {
          id: 'wp_' + (storyData.id || Date.now()),
          title: this.decodeHtml(storyData.title || 'Wattpad Story'),
          author: this.decodeHtml(storyData.user?.name || storyData.user?.username || 'Wattpad Author'),
          cover: storyData.cover || '',
          summary: this.decodeHtml(storyData.description || ''),
          status: storyData.completed ? 'Completed' : 'Ongoing',
          sourceUrl: storyData.url || targetUrl,
          chapters
        };
      }

      // 3. Fallback to DOM parsing
      const doc = new DOMParser().parseFromString(initialHtml, 'text/html');
      const title = this.decodeHtml(doc.querySelector('h1, .story-info__title, meta[property="og:title"]')?.textContent?.trim() || 'Wattpad Story');
      const author = this.decodeHtml(doc.querySelector('.author-info a, .author-name, meta[name="author"]')?.textContent?.trim() || 'Wattpad Author');
      const cover = doc.querySelector('.story-cover img, .cover img, meta[property="og:image"]')?.getAttribute('src') || '';
      const summary = this.decodeHtml(doc.querySelector('.description, .story-info__description, meta[property="og:description"]')?.textContent?.trim() || '');

      const chapters = [];
      const partLinks = doc.querySelectorAll('.story-parts li a, .table-of-contents li a, ul.table-of-contents a');
      partLinks.forEach((a, idx) => {
        const href = a.getAttribute('href') || '';
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : 'https://www.wattpad.com' + href;
        const partTitle = this.decodeHtml(a.querySelector('.part-title')?.textContent?.trim() || a.textContent?.trim() || `Part ${idx + 1}`);
        chapters.push({
          title: partTitle,
          url: fullUrl,
          order: idx + 1
        });
      });

      if (chapters.length === 0) {
        chapters.push({
          title: title || 'Chapter 1',
          url: targetUrl,
          order: 1
        });
      }

      return {
        id: 'wp_' + (targetUrl.match(/\d+/)?.[0] || Date.now()),
        title,
        author,
        cover,
        summary,
        status: 'Ongoing',
        sourceUrl: targetUrl,
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const idMatch = chapterUrl.match(/wattpad\.com\/(\d+)/i);
      const chapterId = idMatch ? idMatch[1] : null;

      const html = await fetchHtml(chapterUrl);

      // Extract chapter title
      let title = options.title || '';
      if (!title) {
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
        if (titleMatch) {
          title = this.decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '').trim());
        }
      }
      if (!title) title = 'Chapter';

      // Detect page count
      const pagesMatch = html.match(/"pages":\s*(\d+)/);
      const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) : 1;

      // Method 1: Fetch clean story text via Wattpad apiv2
      const pageHtmls = [];
      if (chapterId) {
        for (let p = 1; p <= pageCount; p++) {
          try {
            const pageRes = await fetchHtml(`https://www.wattpad.com/apiv2/?m=storytext&id=${chapterId}&page=${p}`);
            if (pageRes && pageRes.includes('<p')) {
              pageHtmls.push(pageRes);
            }
          } catch (_) {}
        }
      }

      let rawContent = pageHtmls.join('\n');

      // Method 2: Fallback to DOM paragraphs from chapter HTML
      if (!rawContent || !rawContent.includes('<p')) {
        const pMatches = [...html.matchAll(/<p\s+data-p-id="[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)];
        if (pMatches.length > 0) {
          rawContent = pMatches.map(m => `<p>${m[1]}</p>`).join('\n');
        } else {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const ps = doc.querySelectorAll('p[data-p-id], .story-part-text p, .panel-reading p');
          if (ps.length > 0) {
            rawContent = Array.from(ps).map(p => `<p>${p.innerHTML}</p>`).join('\n');
          }
        }
      }

      // Clean up internal metadata attributes while preserving inline formatting and illustrations
      const cleanContent = rawContent
        .replace(/\s*data-p-id="[^"]*"/gi, '')
        .replace(/<p>\s*<\/p>/gi, '')
        .trim();

      return {
        title,
        content: cleanContent
      };
    }

    async search(query) {
      if (!query || !query.trim()) return [];
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) return [];

      try {
        const searchUrl = `https://www.wattpad.com/search/${encodeURIComponent(query.trim())}`;
        const html = await fetchHtml(searchUrl);

        const results = [];
        const cardRegex = /<a[^>]*class="[^"]*story-card[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = cardRegex.exec(html)) !== null && results.length < 25) {
          const href = match[1];
          const fullUrl = href.startsWith('http') ? href : 'https://www.wattpad.com' + href;
          const cardHtml = match[2];

          const titleMatch = cardHtml.match(/class="[^"]*sr-only[^"]*"[^>]*>([^<]+)</i) || cardHtml.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
          const title = titleMatch ? this.decodeHtml(titleMatch[1].trim()) : 'Wattpad Story';

          const authorMatch = cardHtml.match(/class="[^"]*username[^"]*"[^>]*>([^<]+)</i);
          const author = authorMatch ? this.decodeHtml(authorMatch[1].trim()) : 'Wattpad Author';

          const coverMatch = cardHtml.match(/<img[^>]*src="([^"]+)"/i);
          const cover = coverMatch ? coverMatch[1] : '';

          const descMatch = cardHtml.match(/class="[^"]*description[^"]*"[^>]*>([^<]+)</i);
          const description = descMatch ? this.decodeHtml(descMatch[1].trim()) : '';

          results.push({
            id: 'wp_' + (fullUrl.match(/story\/(\d+)/)?.[1] || Math.random().toString(36).slice(2)),
            name: title,
            title: title,
            url: fullUrl,
            path: fullUrl,
            author,
            cover,
            summary: description,
            source: 'Wattpad'
          });
        }

        return results;
      } catch (err) {
        console.warn('[WattpadPlugin] Search failed:', err.message);
        return [];
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WattpadPlugin };
  } else if (typeof window !== 'undefined') {
    window.WattpadPlugin = WattpadPlugin;
  }
})();
