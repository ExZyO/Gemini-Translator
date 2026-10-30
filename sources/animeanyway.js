/**
 * sources/animeanyway.js - Built-in Source for Anime Anyway (animeanyway.com)
 * Native Sanity Portable Text and Next.js SSR extraction engine.
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const BaseSourcePlugin = isNode ? require('./base_plugin').BaseSourcePlugin : window.BaseSourcePlugin;

  class AnimeAnywayPlugin extends BaseSourcePlugin {
    constructor() {
      super({
        id: 'animeanyway',
        name: 'Anime Anyway',
        site: 'https://animeanyway.com',
        version: '1.0.0',
        icon: 'https://animeanyway.com/favicon.ico'
      });
      this.sanityProjectId = 'm1xj6lbt';
      this.sanityDataset = 'production';
    }

    matches(url) {
      if (!url) return false;
      return /animeanyway\.com/i.test(url);
    }

    extractVolumeSlug(url) {
      if (!url) return '';
      try {
        const u = new URL(url);
        const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        if (parts.length > 0 && parts[0] !== 'volumes' && parts[0] !== 'series') {
          return parts[0];
        }
      } catch (_) {
        const m = url.match(/animeanyway\.com\/([^\/?#]+)/i);
        if (m && m[1] !== 'volumes' && m[1] !== 'series') return m[1];
      }
      return '';
    }

    extractChapterSlug(url) {
      if (!url) return '';
      try {
        const u = new URL(url);
        const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        if (parts.length >= 2) return parts[1];
      } catch (_) {
        const m = url.match(/animeanyway\.com\/[^\/?#]+\/([^\/?#]+)/i);
        if (m) return m[1];
      }
      return '';
    }

    async _fetchHtml(url, options = {}) {
      if (typeof window !== 'undefined' && window.WebNovelImporter && typeof window.WebNovelImporter.fetchHtml === 'function') {
        return await window.WebNovelImporter.fetchHtml(url, options);
      }
      if (typeof window !== 'undefined' && window.fetchRetry) {
        const resp = await window.fetchRetry(url);
        return await resp.text();
      }
      if (typeof fetch === 'function') {
        const resp = await fetch(url, options);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
        return await resp.text();
      }
      // Node fallback
      const https = require('https');
      return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
    }

    _extractNextData(html) {
      if (!html) return null;
      const match = html.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
      if (!match) return null;
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        console.warn('[AnimeAnywayPlugin] JSON parse failed for __NEXT_DATA__:', err);
        return null;
      }
    }

    portableTextToHtml(blocks) {
      if (!Array.isArray(blocks)) return '';
      const htmlParts = [];
      const projectId = this.sanityProjectId;
      const dataset = this.sanityDataset;

      for (const block of blocks) {
        if (!block || !block._type) continue;

        if (block._type === 'block') {
          const markDefsMap = new Map();
          if (Array.isArray(block.markDefs)) {
            block.markDefs.forEach(def => {
              if (def && def._key) markDefsMap.set(def._key, def);
            });
          }

          let innerHtml = '';
          if (Array.isArray(block.children)) {
            for (const child of block.children) {
              if (!child || !child.text) continue;
              let text = child.text;
              text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              const marks = Array.isArray(child.marks) ? child.marks : [];
              for (const m of marks) {
                if (m === 'strong') {
                  text = `<strong>${text}</strong>`;
                } else if (m === 'em') {
                  text = `<em>${text}</em>`;
                } else if (m === 'underline') {
                  text = `<u>${text}</u>`;
                } else if (m === 'strike-through') {
                  text = `<s>${text}</s>`;
                } else if (markDefsMap.has(m)) {
                  const def = markDefsMap.get(m);
                  if (def._type === 'link' && def.href) {
                    const safeHref = def.href.replace(/"/g, '&quot;');
                    text = `<a href="${safeHref}" target="_blank" rel="noopener">${text}</a>`;
                  }
                }
              }
              innerHtml += text;
            }
          }

          if (!innerHtml.trim()) continue;

          const style = block.style || 'normal';
          if (style === 'h1' || style === 'h2' || style === 'h3' || style === 'h4') {
            htmlParts.push(`<${style}>${innerHtml}</${style}>`);
          } else if (style === 'blockquote') {
            htmlParts.push(`<blockquote><p>${innerHtml}</p></blockquote>`);
          } else {
            htmlParts.push(`<p>${innerHtml}</p>`);
          }
        } else if (block._type === 'image') {
          let imgUrl = block.asset?.url || '';
          if (!imgUrl && block.asset?._ref) {
            const ref = block.asset._ref;
            const m = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i);
            if (m) {
              imgUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${m[1]}-${m[2]}.${m[3]}`;
            }
          }
          if (imgUrl) {
            htmlParts.push(`<div class="separator" style="clear: both; text-align: center;"><img src="${imgUrl}" alt="Illustration" class="chapter-image" loading="lazy" /></div>`);
          }
        } else if (block._type === 'readerSection') {
          const label = block.label || 'Section';
          htmlParts.push(`<h3 class="chapter-part-heading" style="text-align: center; margin: 1.5em 0 1em; font-size: 1.15em; font-weight: 700; color: #818cf8;">${label}</h3>`);
        } else if (block._type === 'emptySpace') {
          htmlParts.push(`<p class="scene-break" style="text-align: center; margin: 1.5em 0; letter-spacing: 0.3em; color: #94a3b8;">* * *</p>`);
        }
      }

      return htmlParts.join('\n');
    }

    async getNovelDetails(url) {
      const volSlug = this.extractVolumeSlug(url);
      const targetUrl = volSlug ? `https://animeanyway.com/${volSlug}` : url;
      const html = await this._fetchHtml(targetUrl);
      const nextData = this._extractNextData(html);
      const pageProps = nextData?.props?.pageProps;

      if (!pageProps || !pageProps.vol) {
        // Fallback: check if pageProps has chapter and volumeTitle
        if (pageProps?.chapter && pageProps?.volumeTitle) {
          const title = this.decodeHtml(pageProps.volumeTitle);
          return {
            id: 'aa_' + (volSlug || 'novel'),
            title,
            author: 'Anime Anyway Translations',
            cover: '',
            summary: '',
            status: 'Ongoing',
            sourceUrl: url,
            chapters: [{
              title: this.decodeHtml(pageProps.chapter.title || 'Chapter'),
              url,
              order: 1
            }]
          };
        }
        throw new Error(`[Anime Anyway] Could not extract volume details from ${targetUrl}`);
      }

      const vol = pageProps.vol;
      let rawTitle = vol.title || 'Volume';
      if (vol.seriesTitle && !rawTitle.toLowerCase().includes(vol.seriesTitle.toLowerCase())) {
        rawTitle = `${vol.seriesTitle} - ${rawTitle}`;
      }
      const title = this.decodeHtml(rawTitle);

      let author = 'Anime Anyway Translations';
      if (vol.seriesTitle && /classroom\s+of\s+the\s+elite/i.test(vol.seriesTitle)) {
        author = 'Syougo Kinugasa';
      }

      let cover = vol.mainImage?.asset?.url || '';
      if (!cover && vol.mainImage?.asset?._ref) {
        const ref = vol.mainImage.asset._ref;
        const m = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i);
        if (m) {
          cover = `https://cdn.sanity.io/images/${this.sanityProjectId}/${this.sanityDataset}/${m[1]}-${m[2]}.${m[3]}`;
        }
      }

      let summary = '';
      if (Array.isArray(vol.synopsis)) {
        summary = vol.synopsis
          .filter(b => b && b._type === 'block')
          .map(b => (b.children || []).map(c => c.text || '').join(''))
          .join('\n\n')
          .trim();
      }

      const rawChapters = Array.isArray(vol.chapters) ? vol.chapters : [];
      const effectiveVolKeyword = vol.volkeyword || volSlug;
      const chapters = rawChapters.map((ch, idx) => ({
        title: this.decodeHtml(ch.title || `Chapter ${idx + 1}`),
        url: `https://animeanyway.com/${effectiveVolKeyword}/${ch.chkeyword}`,
        order: idx + 1,
        volume: vol.title || ''
      }));

      return {
        id: 'aa_' + (effectiveVolKeyword || vol._id || 'volume'),
        title,
        author,
        cover,
        summary,
        status: vol.progress === 100 ? 'Completed' : 'Ongoing',
        sourceUrl: targetUrl,
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      const html = await this._fetchHtml(chapterUrl);
      const nextData = this._extractNextData(html);
      const pageProps = nextData?.props?.pageProps;

      if (!pageProps || !pageProps.chapter) {
        throw new Error(`[Anime Anyway] Could not find chapter content in page data for ${chapterUrl}`);
      }

      const chapter = pageProps.chapter;
      const title = this.decodeHtml(chapter.title || options.title || 'Chapter');
      const htmlContent = this.portableTextToHtml(chapter.content);

      return {
        title,
        content: htmlContent,
        text: htmlContent,
        originalTitle: title
      };
    }

    async search(query) {
      if (!query || typeof query !== 'string') return [];
      const q = query.toLowerCase().trim();
      try {
        const html = await this._fetchHtml('https://animeanyway.com/volumes');
        const nextData = this._extractNextData(html);
        const vols = nextData?.props?.pageProps?.vols || [];
        const matches = vols.filter(v => {
          const t = (v.title || '').toLowerCase();
          const s = (v.seriesTitle || '').toLowerCase();
          const k = (v.volkeyword || '').toLowerCase();
          return t.includes(q) || s.includes(q) || k.includes(q);
        });

        return matches.map(v => {
          let name = v.title || 'Volume';
          if (v.seriesTitle && !name.toLowerCase().includes(v.seriesTitle.toLowerCase())) {
            name = `${v.seriesTitle} - ${name}`;
          }
          return {
            title: name,
            name,
            url: `https://animeanyway.com/${v.volkeyword}`,
            path: `/${v.volkeyword}`,
            cover: v.mainImage?.asset?.url || '',
            source: this.name,
            sourceId: this.id
          };
        });
      } catch (err) {
        console.warn('[AnimeAnywayPlugin] Search failed:', err.message);
        return [];
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimeAnywayPlugin };
  } else if (typeof window !== 'undefined') {
    window.AnimeAnywayPlugin = AnimeAnywayPlugin;
  }
})();
