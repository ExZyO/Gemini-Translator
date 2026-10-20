/**
 * sources/lofter.js - Built-in Source Plugin for NetEase Lofter
 * Supports:
 * - Single Posts (username.lofter.com/post/xxxx or www.lofter.com/front/post/xxxx)
 * - Series Collections (lofter.com/front/blog/collection/share?collectionId=xxxx)
 * - Author Tag Streams (username.lofter.com/tag/TagName)
 * - Author Homepages & Archives (username.lofter.com)
 * - Lofter Account Cookie Vault session injection
 * - Chronological chapter sorting (oldest to newest)
 * - Full-resolution illustration preservation
 * - Clean dialogue and scene break formatting
 */

(function() {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

  class LofterPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'lofter',
        name: 'NetEase Lofter',
        site: 'https://www.lofter.com',
        version: '2.0.0',
        icon: 'https://www.lofter.com/favicon.ico'
      });
    }

    matches(url) {
      if (!url) return false;
      return /lofter\.com|127\.net/i.test(url);
    }

    /**
     * Resolves authenticated request headers using the Lofter Account Session Vault.
     */
    async getAuthHeaders(customCookie = '') {
      const headers = {
        'Referer': 'https://www.lofter.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      };

      let cookieStr = customCookie || '';
      if (!cookieStr && typeof window !== 'undefined' && window.GeminiNovelDB?.getSiteAuth) {
        try {
          const auth = await window.GeminiNovelDB.getSiteAuth('lofter');
          if (auth && auth.cookieString) {
            cookieStr = auth.cookieString;
          }
        } catch (e) {
          console.warn('[LofterPlugin] Failed reading site auth:', e);
        }
      }

      if (cookieStr) {
        headers['Cookie'] = cookieStr;
        if (typeof window !== 'undefined' && window.NativeBridge?.setSiteCookie) {
          try {
            await window.NativeBridge.setSiteCookie('https://www.lofter.com', cookieStr);
          } catch (e) {}
        }
      }

      return headers;
    }

    /**
     * Fetches raw HTML via the central Importer fetcher with fallback.
     */
    async fetchPageHtml(targetUrl, headers = {}) {
      const fetchFn = (typeof window !== 'undefined' && window.WebNovelImporter?.fetchHtml)
        ? window.WebNovelImporter.fetchHtml
        : null;

      if (fetchFn) {
        return await fetchFn(targetUrl, {
          userAgent: MOBILE_UA,
          headers
        });
      }

      if (typeof window !== 'undefined' && window.NativeBridge?.fetchUrl) {
        const res = await window.NativeBridge.fetchUrl(targetUrl, {
          userAgent: MOBILE_UA,
          headers
        });
        return await res.text();
      }

      const res = await fetch(targetUrl, { headers });
      return await res.text();
    }

    /**
     * Strips promotional watermarks, author tips, and formats illustrations.
     */
    cleanLofterHtml(rawHtml, photoList = []) {
      if (!rawHtml && (!photoList || photoList.length === 0)) return '';

      let photoImgs = '';
      if (Array.isArray(photoList) && photoList.length > 0) {
        photoImgs = photoList.map(p => {
          const rawUrl = p.originUrl || p.rawUrl || p.url || '';
          const clean = rawUrl ? rawUrl.replace(/\?imageView.*$/i, '') : '';
          return clean ? `\n\n![Illustration](${clean})\n\n` : '';
        }).join('');
      }

      let content = (photoImgs + (rawHtml || '')).trim();

      // Clean known Lofter artifact tags and engagement buttons
      content = content
        .replace(/<span[^>]*class="[^"]*more-link[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
        .replace(/<div[^>]*class="[^"]*(?:opti|share|like|comment|tag|hot)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<p[^>]*>本文为博主原创文章.*<\/p>/gi, '')
        .replace(/<p[^>]*>展开全文.*<\/p>/gi, '');

      if (typeof window !== 'undefined' && window.WebNovelImporter?.cleanChapterHtmlWithImages) {
        return window.WebNovelImporter.cleanChapterHtmlWithImages(content, 'https://www.lofter.com/');
      }

      return content;
    }

    /**
     * Extracts post data from a Lofter front post URL.
     */
    async fetchSinglePost(permalink, authHeaders = {}) {
      const frontUrl = `https://www.lofter.com/front/post/${permalink}`;
      const html = await this.fetchPageHtml(frontUrl, authHeaders);

      let title = 'Lofter Chapter';
      let author = 'Lofter Author';
      let tags = [];
      let collectionId = null;
      let text = '';
      let publishTime = 0;
      let blogName = '';

      const startIdx = html.indexOf('window.__initialize_data__');
      if (startIdx !== -1) {
        try {
          const endIdx = html.indexOf('</script>', startIdx);
          const rawJson = html.substring(startIdx, endIdx).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, '');
          const data = JSON.parse(rawJson);
          const blogInfo = data.postData?.data?.blogInfo;
          if (blogInfo?.blogNickName) author = blogInfo.blogNickName;
          if (blogInfo?.blogName) blogName = blogInfo.blogName;

          const pv = data.postData?.data?.postData?.postView;
          if (pv) {
            if (pv.title && pv.title.trim()) title = pv.title.trim();
            else if (pv.digest) title = pv.digest.substring(0, 40).trim();

            if (pv.collectionId) collectionId = pv.collectionId;
            if (Array.isArray(pv.tagList)) tags = pv.tagList;
            if (pv.publishTime) publishTime = pv.publishTime;

            const rawContent = pv.textPostView?.content || pv.content || '';
            text = this.cleanLofterHtml(rawContent, pv.photoList);
          }
        } catch (e) {
          console.warn('[LofterPlugin] Post JSON parsing error:', e);
        }
      }

      if (!text) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const contentEl = doc.querySelector('.post-content, .ctc, .text, .content, article');
        if (contentEl) {
          text = this.cleanLofterHtml(contentEl.innerHTML);
        }
        const titleEl = doc.querySelector('.post-title, h1, .title');
        if (titleEl && titleEl.textContent?.trim()) {
          title = titleEl.textContent.trim();
        }
      }

      return {
        permalink,
        title,
        author,
        blogName,
        tags,
        collectionId,
        publishTime,
        text
      };
    }

    /**
     * Crawls a Lofter collection / series.
     */
    async crawlCollection(collectionId, permalink, mainPost, progressCb, authHeaders) {
      progressCb?.('Found Lofter series. Crawling collection chapters...', 30);
      const collUrl = `https://www.lofter.com/front/blog/collection/share?collectionId=${collectionId}`;
      const collHtml = await this.fetchPageHtml(collUrl, authHeaders);

      let seriesTitle = mainPost?.title || 'Lofter Novel';
      let seriesAuthor = mainPost?.author || 'Lofter Author';
      let seriesCover = '';
      let seriesSummary = '';
      const postItems = [];

      const cStart = collHtml.indexOf('window.__initialize_data__');
      if (cStart !== -1) {
        try {
          const cEnd = collHtml.indexOf('</script>', cStart);
          const cData = JSON.parse(collHtml.substring(cStart, cEnd).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));
          const coll = cData.data?.collection;
          if (coll?.name) seriesTitle = coll.name;
          if (coll?.desc) seriesSummary = coll.desc;
          if (coll?.coverUrl) seriesCover = coll.coverUrl;

          const rawPosts = cData.data?.posts || [];
          rawPosts.forEach((item, idx) => {
            if (item && item.permalink) {
              postItems.push({
                item,
                permalink: item.permalink,
                title: item.title || `Chapter ${idx + 1}`,
                url: `https://www.lofter.com/front/post/${item.permalink}`
              });
            }
          });
        } catch (e) {
          console.warn('[LofterPlugin] Collection JSON parse error:', e);
        }
      }

      if (postItems.length === 0) {
        return null;
      }

      const crawlPool = (typeof window !== 'undefined' && window.crawlChapterPool)
        ? window.crawlChapterPool
        : null;

      let chapters = [];
      if (crawlPool) {
        const { chapters: poolChapters } = await crawlPool(
          postItems,
          async (pObj) => {
            const { permalink: pLink, title: chTitle, item } = pObj;
            if (pLink === permalink && mainPost?.text) {
              return { title: chTitle, text: mainPost.text };
            }
            try {
              const res = await this.fetchSinglePost(pLink, authHeaders);
              return { title: chTitle || res.title, text: res.text || (item.digest ? this.cleanLofterHtml(item.digest) : '') };
            } catch (e) {
              return { title: chTitle, text: item.digest ? this.cleanLofterHtml(item.digest) : '' };
            }
          },
          5,
          progressCb
        );
        chapters = poolChapters.filter(c => c && c.text);
      } else {
        for (let i = 0; i < postItems.length; i++) {
          const pObj = postItems[i];
          progressCb?.(`Fetching chapter ${i + 1} of ${postItems.length}...`, Math.round(30 + (i / postItems.length) * 65));
          if (pObj.permalink === permalink && mainPost?.text) {
            chapters.push({ title: pObj.title, text: mainPost.text });
          } else {
            const res = await this.fetchSinglePost(pObj.permalink, authHeaders);
            if (res.text) chapters.push({ title: pObj.title || res.title, text: res.text });
          }
        }
      }

      return {
        title: seriesTitle,
        author: seriesAuthor,
        cover: seriesCover,
        summary: seriesSummary || chapters[0]?.text?.substring(0, 300) + '...',
        chapters
      };
    }

    /**
     * Crawls an author's tag stream or archive timeline in chronological order.
     */
    async crawlTagStream(url, tagName, authorBlogName, progressCb, authHeaders) {
      progressCb?.(`Scanning author tag stream for "${tagName}"...`, 20);

      const postMap = new Map();
      const maxPages = 15;
      let baseUrl = url.split('?')[0];

      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        progressCb?.(`Scanning page ${page} of tag entries...`, 20 + Math.min(page * 2, 25));

        let html = '';
        try {
          html = await this.fetchPageHtml(pageUrl, authHeaders);
        } catch (e) {
          break;
        }

        let newFoundOnPage = 0;

        // 1. Check window.__initialize_data__
        const sIdx = html.indexOf('window.__initialize_data__');
        if (sIdx !== -1) {
          try {
            const eIdx = html.indexOf('</script>', sIdx);
            const raw = html.substring(sIdx, eIdx).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, '');
            const parsed = JSON.parse(raw);
            const posts = parsed.tagData?.posts || parsed.posts || parsed.postList || [];
            if (Array.isArray(posts)) {
              for (const p of posts) {
                if (p && p.permalink && !postMap.has(p.permalink)) {
                  postMap.set(p.permalink, {
                    permalink: p.permalink,
                    title: p.title || p.digest?.substring(0, 40) || '',
                    publishTime: p.publishTime || 0,
                    digest: p.digest || ''
                  });
                  newFoundOnPage++;
                }
              }
            }
          } catch (e) {}
        }

        // 2. DOM scraping fallback
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a[href*="/post/"]');
        links.forEach((a) => {
          const href = a.getAttribute('href') || '';
          const m = href.match(/\/post\/([a-zA-Z0-9_-]+)/i);
          if (m) {
            const pLink = m[1];
            if (!postMap.has(pLink)) {
              const aText = a.textContent?.trim() || '';
              postMap.set(pLink, {
                permalink: pLink,
                title: aText,
                publishTime: 0,
                digest: ''
              });
              newFoundOnPage++;
            }
          }
        });

        if (newFoundOnPage === 0) {
          break;
        }
      }

      if (postMap.size === 0) {
        throw new Error('No chapters found matching this tag. Please verify the tag link or your Lofter login status.');
      }

      // Chronological sort: oldest to newest
      const postList = Array.from(postMap.values());
      const hasTimestamps = postList.some(p => p.publishTime > 0);
      if (hasTimestamps) {
        postList.sort((a, b) => (a.publishTime || 0) - (b.publishTime || 0));
      } else {
        // Tag pages present newest first, so reverse to read oldest first
        postList.reverse();
      }

      const chapterItems = postList.map((p, idx) => ({
        permalink: p.permalink,
        title: p.title || `Chapter ${idx + 1}`,
        item: p
      }));

      progressCb?.(`Discovered ${chapterItems.length} chapters. Fetching contents...`, 50);

      const crawlPool = (typeof window !== 'undefined' && window.crawlChapterPool)
        ? window.crawlChapterPool
        : null;

      let chapters = [];
      let discoveredAuthor = authorBlogName || 'Lofter Author';

      if (crawlPool) {
        const { chapters: poolChapters } = await crawlPool(
          chapterItems,
          async (pObj) => {
            try {
              const res = await this.fetchSinglePost(pObj.permalink, authHeaders);
              if (res.author && res.author !== 'Lofter Author') {
                discoveredAuthor = res.author;
              }
              return {
                title: pObj.title || res.title,
                text: res.text || (pObj.item.digest ? this.cleanLofterHtml(pObj.item.digest) : '')
              };
            } catch (e) {
              return {
                title: pObj.title,
                text: pObj.item.digest ? this.cleanLofterHtml(pObj.item.digest) : ''
              };
            }
          },
          5,
          progressCb
        );
        chapters = poolChapters.filter(c => c && c.text);
      } else {
        for (let i = 0; i < chapterItems.length; i++) {
          const pObj = chapterItems[i];
          progressCb?.(`Fetching chapter ${i + 1} of ${chapterItems.length}...`, Math.round(50 + (i / chapterItems.length) * 45));
          const res = await this.fetchSinglePost(pObj.permalink, authHeaders);
          if (res.author && res.author !== 'Lofter Author') discoveredAuthor = res.author;
          if (res.text) chapters.push({ title: pObj.title || res.title, text: res.text });
        }
      }

      const cleanTagTitle = tagName ? decodeURIComponent(tagName).replace(/[-_]/g, ' ') : 'Lofter Story';

      return {
        title: cleanTagTitle,
        author: discoveredAuthor,
        cover: '',
        tags: [cleanTagTitle],
        summary: chapters[0]?.text?.substring(0, 300) + '...',
        chapters
      };
    }

    /**
     * Unified crawler entry point for Lofter URLs.
     */
    async crawl(url, progressCb, options = {}) {
      progressCb?.('Connecting to NetEase Lofter...', 10);
      const authHeaders = await this.getAuthHeaders(options.cookie);

      // 1. Direct collection URL
      const collMatch = url.match(/collectionId=([0-9a-zA-Z_-]+)/i) || url.match(/\/collection\/([0-9a-zA-Z_-]+)/i);
      if (collMatch) {
        const collRes = await this.crawlCollection(collMatch[1], '', null, progressCb, authHeaders);
        if (collRes && collRes.chapters.length > 0) {
          progressCb?.(`Loaded ${collRes.chapters.length} Lofter chapters`, 100);
          return {
            title: collRes.title,
            author: collRes.author,
            summary: collRes.summary,
            cover: collRes.cover,
            tags: [],
            chapters: collRes.chapters,
            totalWords: collRes.chapters.reduce((acc, c) => acc + (c.text ? c.text.length : 0), 0),
            isEpub: false,
            sourceUrl: url
          };
        }
      }

      // 2. Author Tag Stream URL
      const tagMatch = url.match(/\/tag\/([^/?#]+)/i);
      if (tagMatch) {
        const rawTag = tagMatch[1];
        const hostMatch = url.match(/https?:\/\/([a-zA-Z0-9_-]+)\.lofter\.com/i);
        const authorBlogName = (hostMatch && hostMatch[1] !== 'www') ? hostMatch[1] : '';
        const tagRes = await this.crawlTagStream(url, rawTag, authorBlogName, progressCb, authHeaders);
        progressCb?.(`Loaded ${tagRes.chapters.length} Lofter chapters`, 100);
        return {
          title: tagRes.title,
          author: tagRes.author,
          summary: tagRes.summary,
          cover: tagRes.cover || '',
          tags: tagRes.tags || [],
          chapters: tagRes.chapters,
          totalWords: tagRes.chapters.reduce((acc, c) => acc + (c.text ? c.text.length : 0), 0),
          isEpub: false,
          sourceUrl: url
        };
      }

      // 3. Single Post URL (with automatic series expansion)
      const permalinkMatch = url.match(/\/post\/([a-zA-Z0-9_-]+)/i);
      const permalink = permalinkMatch ? permalinkMatch[1] : '';

      if (permalink) {
        progressCb?.('Loading post content...', 25);
        const post = await this.fetchSinglePost(permalink, authHeaders);

        if (post.collectionId) {
          const collRes = await this.crawlCollection(post.collectionId, permalink, post, progressCb, authHeaders);
          if (collRes && collRes.chapters.length > 0) {
            progressCb?.(`Loaded ${collRes.chapters.length} Lofter chapters`, 100);
            return {
              title: collRes.title,
              author: collRes.author,
              summary: collRes.summary,
              cover: collRes.cover,
              tags: post.tags || [],
              chapters: collRes.chapters,
              totalWords: collRes.chapters.reduce((acc, c) => acc + (c.text ? c.text.length : 0), 0),
              isEpub: false,
              sourceUrl: url
            };
          }
        }

        // Standalone post
        const chapters = [];
        if (post.text) {
          chapters.push({ title: post.title, text: post.text });
        }
        progressCb?.(`Loaded ${chapters.length} Lofter chapter`, 100);
        return {
          title: post.title || 'Lofter Story',
          author: post.author || 'Lofter Author',
          summary: post.text?.substring(0, 300) + '...',
          cover: '',
          tags: post.tags || [],
          chapters,
          totalWords: post.text ? post.text.length : 0,
          isEpub: false,
          sourceUrl: url
        };
      }

      // 4. Author Archive URL fallback
      const hostMatch = url.match(/https?:\/\/([a-zA-Z0-9_-]+)\.lofter\.com\/?$/i);
      if (hostMatch && hostMatch[1] !== 'www') {
        const authorBlog = hostMatch[1];
        const tagRes = await this.crawlTagStream(url, '', authorBlog, progressCb, authHeaders);
        progressCb?.(`Loaded ${tagRes.chapters.length} Lofter chapters`, 100);
        return {
          title: `${authorBlog} Works`,
          author: tagRes.author || authorBlog,
          summary: tagRes.summary,
          cover: '',
          tags: [],
          chapters: tagRes.chapters,
          totalWords: tagRes.chapters.reduce((acc, c) => acc + (c.text ? c.text.length : 0), 0),
          isEpub: false,
          sourceUrl: url
        };
      }

      throw new Error('Unsupported Lofter URL format. Please provide a post link, collection link, or author tag stream.');
    }

    /**
     * LNReader Plugin Spec Implementation: getNovelDetails
     */
    async getNovelDetails(url) {
      const result = await this.crawl(url, null);
      return {
        id: url,
        title: result.title,
        author: result.author,
        cover: result.cover || '',
        summary: result.summary,
        chapters: result.chapters.map((ch, idx) => ({
          title: ch.title,
          url: `${url}#ch-${idx + 1}`,
          order: idx + 1
        }))
      };
    }

    /**
     * LNReader Plugin Spec Implementation: getChapter
     */
    async getChapter(chapterUrl, options = {}) {
      const permalinkMatch = chapterUrl.match(/\/post\/([a-zA-Z0-9_-]+)/i);
      if (!permalinkMatch) {
        throw new Error('Invalid Lofter chapter URL');
      }
      const authHeaders = await this.getAuthHeaders(options.cookie);
      const post = await this.fetchSinglePost(permalinkMatch[1], authHeaders);
      return {
        title: post.title,
        content: post.text,
        originalTitle: post.title
      };
    }
  }

  // Register on window and export
  const pluginInstance = new LofterPlugin();

  if (typeof window !== 'undefined') {
    window.LofterPlugin = pluginInstance;
    window.LofterPluginClass = LofterPlugin;
  }

  if (isNode) {
    module.exports = { LofterPlugin, instance: pluginInstance };
  }
})();
