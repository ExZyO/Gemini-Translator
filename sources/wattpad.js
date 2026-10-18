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

      let targetUrl = (url || '').split('?')[0].split('#')[0].trim();
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
            const apiJsonStr = await fetchHtml(`https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,url,cover,description,user(name,username),parts(id,title,url,photoUrl,length,pages)`);
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
          id: String(p.id),
          partId: String(p.id),
          length: p.length || 0,
          photoUrl: p.photoUrl || '',
          pages: typeof p.pages === 'number' ? p.pages : (p.pages ? parseInt(p.pages, 10) : 0)
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

      const cleanChUrl = (chapterUrl || '').split('?')[0].split('#')[0].trim();
      const idMatch = cleanChUrl.match(/wattpad\.com\/(\d+)/i);
      const chapterId = options.id || options.partId || (idMatch ? idMatch[1] : null);

      let title = options.title || '';
      let rawContent = '';

      const isApiError = (txt) => {
        if (!txt || typeof txt !== 'string') return true;
        const t = txt.trim();
        if (!t) return true;
        if (t.startsWith('{') && (t.includes('"result"') || t.includes('"error"') || t.includes('"code"') || t.includes('"message"'))) return true;
        if (t.includes('"result":"ERROR"') || t.includes('"Too many requests"') || t.includes('429 Too Many Requests') || t.includes('error_code') || t.includes('Request blocked') || t.includes('403 ERROR')) return true;
        return false;
      };

      const isValidPage = (txt) => {
        if (isApiError(txt)) return false;
        return txt.includes('<p') || txt.includes('<div') || txt.includes('<img') || txt.trim().length > 15;
      };

      // Method 1: Fast direct text fetch via Wattpad apiv2 with paced page batching
      if (chapterId) {
        try {
          const fetchOpts = { allowEmpty: true, isSearch: true, timeout: 8000 };
          const allPages = [];
          const totalExpectedPages = options.pages && options.pages > 0 ? options.pages : 0;
          let hitRateLimit = false;

          const fetchPageWithRetry = async (page) => {
            try {
              let text = await fetchHtml(`https://www.wattpad.com/apiv2/?m=storytext&id=${chapterId}&page=${page}`, fetchOpts);
              if (text && isApiError(text)) {
                // If rate limited or error, wait 1.2s and retry once
                await new Promise(r => setTimeout(r, 1200));
                text = await fetchHtml(`https://www.wattpad.com/apiv2/?m=storytext&id=${chapterId}&page=${page}`, fetchOpts);
              }
              return text || '';
            } catch (_) {
              return '';
            }
          };

          if (totalExpectedPages > 0) {
            // Known page count: fetch in small paced batches of 2 in parallel
            for (let p = 1; p <= totalExpectedPages; p += 2) {
              if (hitRateLimit) break;
              const batch = [p];
              if (p + 1 <= totalExpectedPages) batch.push(p + 1);
              const results = await Promise.all(batch.map(page => fetchPageWithRetry(page)));
              for (const txt of results) {
                if (isValidPage(txt)) {
                  allPages.push(txt);
                } else if (isApiError(txt)) {
                  hitRateLimit = true;
                  break;
                }
              }
              if (p + 2 <= totalExpectedPages) {
                await new Promise(r => setTimeout(r, 80));
              }
            }
          } else {
            // Unknown page count: fetch up to 12 pages in batches of 2
            for (let p = 1; p <= 12; p += 2) {
              if (hitRateLimit) break;
              const batch = [p, p + 1];
              const results = await Promise.all(batch.map(page => fetchPageWithRetry(page)));
              let stopLoop = false;
              for (const txt of results) {
                if (isValidPage(txt)) {
                  allPages.push(txt);
                } else {
                  if (isApiError(txt)) hitRateLimit = true;
                  stopLoop = true;
                  break;
                }
              }
              if (stopLoop) break;
              await new Promise(r => setTimeout(r, 80));
            }
          }

          if (!hitRateLimit && allPages.length > 0) {
            rawContent = allPages.join('\n');
          }
        } catch (_) {}
      }

      // Method 2: Fallback to full chapter HTML if apiv2 hit error, rate-limit, or returned empty
      if (!rawContent || isApiError(rawContent)) {
        rawContent = '';
        let html = '';
        try {
          html = await fetchHtml(cleanChUrl);
        } catch (_) {}

        if (html && !isApiError(html)) {
          if (!title) {
            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
            if (titleMatch) {
              title = this.decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '').trim());
            }
          }

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
      }

      if (isApiError(rawContent)) {
        rawContent = '';
      }

      if (!title) title = 'Chapter';

      // Clean up internal metadata attributes while preserving inline formatting and illustrations
      let cleanContent = (rawContent || '')
        .replace(/\s*data-p-id="[^"]*"/gi, '')
        .replace(/<p>\s*<\/p>/gi, '')
        .trim();

      if (options.photoUrl && typeof options.photoUrl === 'string' && options.photoUrl.trim() && !cleanContent.includes(options.photoUrl.trim())) {
        cleanContent = `<p><img src="${options.photoUrl.trim()}" alt="Chapter Banner"></p>\n\n` + cleanContent;
      }

      if (!cleanContent) {
        throw new Error(`[Wattpad] Chapter "${title}" content could not be retrieved. Server temporarily busy, please retry in a moment.`);
      }

      return {
        title,
        content: cleanContent
      };
    }

    isPlaylistUrl(url) {
      if (!url || typeof url !== 'string') return false;
      const clean = url.trim().toLowerCase();
      return /wattpad\.com\/list\/\d+/i.test(clean) ||
             /wattpad\.com\/user\/[a-z0-9_.-]+\/lists/i.test(clean) ||
             /wattpad\.com\/user\/[a-z0-9_.-]+\/?(?:$|[?#])/i.test(clean);
    }

    async getPlaylistDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const cleanUrl = (url || '').split('?')[0].split('#')[0].trim();

      // Case 1: Specific reading list URL: /list/(\d+)
      const listMatch = cleanUrl.match(/wattpad\.com\/list\/(\d+)/i) || cleanUrl.match(/\/list\/(\d+)/i);
      if (listMatch) {
        const listId = listMatch[1];
        let listName = 'Wattpad Reading List';
        let listAuthor = 'Wattpad User';
        let listCover = '';
        let totalStories = 0;

        try {
          const infoStr = await fetchHtml(`https://www.wattpad.com/api/v3/lists/${listId}`);
          const info = JSON.parse(infoStr);
          if (info) {
            listName = this.decodeHtml(info.name || listName);
            listAuthor = this.decodeHtml(info.user?.name || info.user?.username || listAuthor);
            listCover = info.sample_covers?.[0] || '';
            totalStories = info.numStories || 0;
          }
        } catch (_) {}

        const allStories = [];
        let offset = 0;
        const maxStoriesToFetch = Math.max(totalStories || 0, 500);

        while (offset < maxStoriesToFetch) {
          try {
            const jsonStr = await fetchHtml(`https://www.wattpad.com/api/v3/lists/${listId}/stories?limit=100&offset=${offset}`);
            const data = JSON.parse(jsonStr);
            const list = data.stories || [];
            if (list.length === 0) break;
            allStories.push(...list);
            offset += list.length;
            if (list.length < 100) break;
          } catch (_) {
            break;
          }
        }

        const formattedStories = allStories.map((s, idx) => ({
          id: 'wp_' + (s.id || idx),
          storyId: String(s.id),
          name: this.decodeHtml(s.title || 'Untitled Story'),
          title: this.decodeHtml(s.title || 'Untitled Story'),
          author: this.decodeHtml(s.user?.name || s.user?.username || 'Wattpad Author'),
          cover: s.cover || '',
          url: s.url || `https://www.wattpad.com/story/${s.id}`,
          path: s.url || `https://www.wattpad.com/story/${s.id}`,
          chapters: s.numParts || (s.parts ? s.parts.length : 0),
          summary: this.decodeHtml(s.description || ''),
          source: 'Wattpad'
        }));

        return {
          isPlaylist: true,
          id: 'wp_list_' + listId,
          listId,
          title: listName,
          author: listAuthor,
          cover: listCover,
          totalCount: formattedStories.length,
          stories: formattedStories,
          sourceUrl: cleanUrl
        };
      }

      // Case 2: User profile URL: /user/([a-zA-Z0-9_.-]+)
      const userMatch = cleanUrl.match(/wattpad\.com\/user\/([a-zA-Z0-9_.-]+)/i);
      if (userMatch) {
        const username = userMatch[1];
        try {
          const jsonStr = await fetchHtml(`https://www.wattpad.com/api/v3/users/${username}/lists`);
          const parsed = JSON.parse(jsonStr);
          const rawLists = parsed.lists || [];
          const formattedLists = rawLists.map(l => ({
            id: String(l.id),
            name: this.decodeHtml(l.name || 'Reading List'),
            numStories: l.numStories || 0,
            cover: l.sample_covers?.[0] || '',
            url: `https://www.wattpad.com/list/${l.id}`
          }));

          return {
            isUserLists: true,
            username,
            title: `${username}'s Reading Lists`,
            totalCount: formattedLists.length,
            lists: formattedLists,
            sourceUrl: cleanUrl
          };
        } catch (err) {
          throw new Error(`Failed to fetch user reading lists for ${username}: ${err.message}`);
        }
      }

      throw new Error('Unrecognized Wattpad playlist or profile URL');
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
