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
      return /(witchculttranslation\.com|translationchicken\.com|eminenttranslations\.com)/i.test(url);
    }

    async getNovelDetails(url) {
      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const cleanUrl = url.replace(/^http:\/\//i, 'https://');
      const isArcSpecific = /\/arc-\d+/i.test(cleanUrl);
      const specificArcMatch = cleanUrl.match(/\/arc-(\d+)/i);
      const specificArcName = specificArcMatch ? `Arc ${specificArcMatch[1]}` : '';

      const targetHtml = await fetchHtml('https://witchculttranslation.com/table-of-content/');
      const doc = new DOMParser().parseFromString(targetHtml, 'text/html');

      let title = 'Re:Zero Starting Life in Another World — Web Novel Complete Edition';
      if (isArcSpecific && specificArcName) {
        title = `Re:Zero Web Novel — ${specificArcName}`;
      } else {
        const rawTitle = this.decodeHtml(doc.querySelector('h1.entry-title, .site-title, title')?.textContent || '').trim();
        if (rawTitle && !/table\s*of\s*contents?/i.test(rawTitle)) {
          title = rawTitle.replace(/\s*[\-\|–—]\s*(?:Witch\s*Cult\s*Translations|Translation\s*Chicken|Eminent\s*Translations).*$/i, '').trim();
        }
      }
      const author = 'Tappei Nagatsuki';
      const cover = 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg';

      const normalizeArc = (heading) => {
        if (!heading) return 'Arc 1';
        const m = heading.match(/Arc\s*(\d+)/i);
        if (m) return `Arc ${m[1]}`;
        if (/Side\s*Content/i.test(heading)) return 'Side Content';
        if (/IF\s*Stories/i.test(heading)) return 'IF Stories';
        if (/EX\s*Novel/i.test(heading)) return 'EX Novels';
        return heading.trim();
      };

      const getSortKey = (item) => {
        const text = (item.text || item.title || '').toLowerCase();
        const href = (item.href || item.url || '').toLowerCase();
        if (text.includes('prologue') || href.includes('prologue')) return -1;
        if (text.includes('appendix') || href.includes('appendix')) return 90000;
        if (text.includes('epilogue') || href.includes('epilogue')) return 99999;
        const m = text.match(/(?:Chapter|Ch\.?)\s*(\d+)(?:\s*part\s*(\d+))?/i) ||
                  href.match(/chapter[_-](\d+)(?:[_-]part[_-](\d+))?/i);
        if (m) {
          return parseInt(m[1], 10) * 100 + (m[2] ? parseInt(m[2], 10) : 0);
        }
        const intM = text.match(/Interlude\s*([IVXLCDM]+|\d+)?/i);
        if (intM) return 80000 + (parseInt(intM[1], 10) || 1);
        return 70000;
      };

      // Isolate .entry-content to avoid sidebar/footer widgets leaking into chapters
      let contentHtml = targetHtml;
      const entryMatch = targetHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<!--/i) ||
                         targetHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
      if (entryMatch) {
        contentHtml = entryMatch[1];
      } else {
        contentHtml = targetHtml.split(/<(?:aside|footer|div[^>]*class="[^"]*(?:sidebar|widget-area))/i)[0];
      }

      const parts = contentHtml.split(/<(?:h1|h2)[^>]*>/i);
      let currentArc = 'Arc 1';
      const allLinks = [];
      const seen = new Set();

      for (const part of parts) {
        const headingMatch = part.match(/^([\s\S]*?)<\/(?:h1|h2)>/i);
        if (headingMatch) {
          const rawHeading = this.decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '').trim());
          if (/Arc\s*\d+|Side\s*Content|EX\s*Novel|Tanpenshuu|IF\s*Stories/i.test(rawHeading)) {
            currentArc = normalizeArc(rawHeading);
          }
        }

        const linkMatches = [...part.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const m of linkMatches) {
          let href = m[1].replace(/\/$/, '') + '/';
          if (href.startsWith('http://')) href = href.replace('http://', 'https://');
          let rawChapterTitle = this.decodeHtml(m[2].replace(/<[^>]+>/g, '').trim());

          const isTranslatorHome = href === 'https://eminenttranslations.com/' || 
                                   href === 'https://kagurojp.wordpress.com/' || 
                                   href === 'https://translationchicken.com/' ||
                                   href === 'https://witchculttranslation.com/';

          const isGarbage = href.includes('rezerodb.com') ||
                            href.includes('twitter.com') ||
                            href.includes('x.com') ||
                            href.includes('discord.com') ||
                            href.includes('discord.gg') ||
                            href.includes('mega.nz') ||
                            href.includes('/category/') ||
                            href.includes('/tag/') ||
                            href.includes('cut-content') ||
                            href.includes('trelling.php') ||
                            href.includes('wp-content/uploads') ||
                            rawChapterTitle.toLowerCase().includes('cut content') ||
                            rawChapterTitle.toLowerCase().includes('mega archive') ||
                            rawChapterTitle.toLowerCase().includes('side content+') ||
                            rawChapterTitle.toLowerCase().includes('progress monitor') ||
                            rawChapterTitle.toLowerCase().includes('anniversary space') ||
                            rawChapterTitle.toLowerCase().includes('azamuku supplement') ||
                            rawChapterTitle.toLowerCase().includes('twitter sidestory');

          const isAllowed = href.includes('witchculttranslation.com/20') ||
                            href.includes('witchculttranslation.com/arc-') ||
                            href.includes('eminenttranslations.com') ||
                            href.includes('kagurojp.wordpress.com') ||
                            href.includes('remonwater.wordpress.com');

          if (isAllowed && !isTranslatorHome && !isGarbage && rawChapterTitle.length > 0 && !seen.has(href)) {
            seen.add(href);
            rawChapterTitle = rawChapterTitle.replace(/\s*\(Originally translated.*?\)/i, '').trim();
            allLinks.push({
              title: rawChapterTitle,
              url: href,
              arc: currentArc,
              order: allLinks.length + 1
            });
          }
        }
      }

      // Step 1: Arc 3 KaguroJP backfill
      const arc3Count = allLinks.filter(l => l.arc === 'Arc 3').length;
      if (arc3Count < 10) {
        try {
          const kHtml = await fetchHtml('https://kagurojp.wordpress.com/');
          const kMatches = [...kHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
          const kItems = [];
          for (const km of kMatches) {
            const kHref = km[1].replace(/\/$/, '') + '/';
            let kText = this.decodeHtml(km[2].replace(/<[^>]+>/g, '').trim());
            if (kHref.includes('kagurojp.wordpress.com/20') && /vol\.?\s*3/i.test(kText) && !seen.has(kHref)) {
              seen.add(kHref);
              const cleanTitle = kText.replace(/^Vol\.?\s*3\.?\s*Ch\.?\s*(\d+)[:：\s]*/i, 'Chapter $1: ');
              kItems.push({
                title: cleanTitle,
                url: kHref,
                arc: 'Arc 3',
                order: allLinks.length + 1
              });
            }
          }
          if (kItems.length > 0) {
            const arc3Idx = allLinks.findIndex(l => l.arc === 'Arc 3');
            const insertIdx = arc3Idx !== -1 ? arc3Idx : allLinks.length;
            allLinks.splice(insertIdx, 0, ...kItems);
          }
        } catch (_) {}
      }

      // Step 2: Arc 4 Translation Chicken backfill
      const arc4Count = allLinks.filter(l => l.arc === 'Arc 4').length;
      if (arc4Count < 5) {
        try {
          const tcHtml = await fetchHtml('https://translationchicken.com/2016/09/21/rezero-web-novel-fan-translation-table-of-contents/');
          const tcMatches = [...tcHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
          let lastArc3Idx = -1;
          for (let i = allLinks.length - 1; i >= 0; i--) {
            if (allLinks[i].arc === 'Arc 3') {
              lastArc3Idx = i;
              break;
            }
          }
          const insertIdx = lastArc3Idx !== -1 ? lastArc3Idx + 1 : allLinks.length;
          const tcItems = [];
          for (const tm of tcMatches) {
            const tHref = tm[1].replace(/\/$/, '') + '/';
            let tText = this.decodeHtml(tm[2].replace(/<[^>]+>/g, '').trim());
            if (tHref.includes('translationchicken.com/20') && /arc-4/i.test(tHref) && !tHref.includes('#') && !seen.has(tHref)) {
              seen.add(tHref);
              if (tText.startsWith('http') || tText.length < 5) {
                const slug = tHref.replace(/^.*\/([^\/]+)\/?$/, '$1');
                tText = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              }
              tcItems.push({
                title: tText,
                url: tHref,
                arc: 'Arc 4',
                order: allLinks.length + 1
              });
            }
          }
          if (tcItems.length > 0) {
            allLinks.splice(insertIdx, 0, ...tcItems);
          }
        } catch (_) {}
      }

      // Step 3: Arc 6 missing chapters (33, 34) backfill
      try {
        const arc6Html = await fetchHtml('https://witchculttranslation.com/arc-6/');
        const a6Matches = [...arc6Html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const am of a6Matches) {
          let aHref = am[1].replace(/\/$/, '') + '/';
          if (aHref.startsWith('http://')) aHref = aHref.replace('http://', 'https://');
          const aText = this.decodeHtml(am[2].replace(/<[^>]+>/g, '').trim());
          if (/witchculttranslation\.com\/20/i.test(aHref) && /chapter\s*(?:33|34)/i.test(aText) && !seen.has(aHref)) {
            seen.add(aHref);
            allLinks.push({
              title: aText.replace(/\s*\(Originally translated.*?\)/i, '').trim(),
              url: aHref,
              arc: 'Arc 6',
              order: allLinks.length + 1
            });
          }
        }
      } catch (_) {}

      // Step 4: Re:Zero IF Stories & Special Side Content
      try {
        const ifWidgetMatch = targetHtml.match(/Re:\s*Zero\s*IF\s*Stories[\s\S]*?<\/section>/i) ||
                              targetHtml.match(/id=["']text-2["'][\s\S]*?<\/section>/i);
        const ifHtml = ifWidgetMatch ? ifWidgetMatch[0] : '';
        const ifMatches = [...ifHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const im of ifMatches) {
          let href = im[1].trim();
          if (href.startsWith('/')) href = 'https://witchculttranslation.com' + href;
          if (href.startsWith('http://')) href = href.replace('http://', 'https://');
          let rawText = this.decodeHtml(im[2].replace(/<[^>]+>/g, '').trim());
          if (href.includes('/category/') || !rawText) continue;

          // Normalize Ayamatsu IF PDF link from WCT uploads
          if (/ayamatsu.*\.pdf/i.test(href)) {
            href = 'https://witchculttranslation.com/wp-content/uploads/2019/02/ayamatsu-april-fools-2017.pdf';
            rawText = 'Ayamatsu IF (Pride Route)';
          } else if (href.endsWith('.pdf')) {
            continue;
          }

          if (!seen.has(href)) {
            seen.add(href);
            allLinks.push({
              title: rawText.replace(/^Re:\s*/i, '').trim(),
              url: href,
              arc: 'IF Stories',
              order: allLinks.length + 1
            });
          }
        }
      } catch (_) {}

      // Step 5: Sort numerically by Arc
      const byArc = new Map();
      for (const ch of allLinks) {
        if (!byArc.has(ch.arc)) byArc.set(ch.arc, []);
        byArc.get(ch.arc).push(ch);
      }

      const sortedChapters = [];
      for (const [arcName, arcChapters] of byArc.entries()) {
        arcChapters.sort((a, b) => getSortKey(a) - getSortKey(b));
        sortedChapters.push(...arcChapters);
      }

      let finalChapters = sortedChapters;
      if (isArcSpecific && specificArcName) {
        const filtered = sortedChapters.filter(c => c.arc.toLowerCase() === specificArcName.toLowerCase());
        if (filtered.length > 0) finalChapters = filtered;
      }

      finalChapters.forEach((ch, idx) => {
        ch.order = idx + 1;
        ch.title = this.formatCanonicalTitle(ch.title, ch.arc);
      });

      if (finalChapters.length === 0) {
        finalChapters.push({
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
        summary: `Official Re:Zero Web Novel English Translations by Witch Cult Translations. ${finalChapters.length} complete chronological chapters.`,
        status: 'Ongoing',
        chapters: finalChapters
      };
    }

    formatCanonicalTitle(rawTitle, arcName) {
      if (!rawTitle) return 'Chapter';
      let t = this.decodeHtml(rawTitle).trim();

      // 1. Strip site branding suffixes
      t = t.replace(/\s*[\-\|–—]\s*(?:Witch\s*Cult\s*Translations|Translation\s*Chicken|Eminent\s*Translations|Rem\s*on\s*Water).*$/i, '');
      t = t.replace(/\s*\(Originally translated.*?\)/i, '');

      // 2. Strip redundant series prefixes (e.g., "Re:Zero (WN) Arc 2 | Chapter 1" or "Re: Ayamatsu IF")
      t = t.replace(/^(?:Re:\s*Zero\s*(?:\([^\)]+\)|\[[^\]]+\])?\s*[\-\|–—:]*\s*)/i, '');
      t = t.replace(/^Re:\s+/i, '');

      // 3. Strip redundant Arc prefix from start of title if it matches current arc or generic Arc
      if (arcName && arcName !== 'Side Content' && arcName !== 'IF Stories') {
        t = t.replace(new RegExp(`^(?:${arcName})[\\s,:–—\\-\\|\\/]+`, 'i'), '');
      }
      t = t.replace(/^(?:Arc\s*\d+|Volume\s*\d+|Vol\.?\s*\d+)[\s,:–—\-\|\/]+/i, '');

      // 4. Strip any leading commas, colons, or punctuation
      t = t.replace(/^[\s,:–—\-\|\/]+/, '').trim();

      // 5. Standardize "Vol 3 Ch 1" or "Ch 1"
      t = t.replace(/^Vol\.?\s*\d+\s*Ch\.?\s*(\d+)[:\s–—-]*/i, 'Chapter $1: ');
      t = t.replace(/^Ch\.?\s*(\d+)[:\s–—-]*/i, 'Chapter $1: ');

      return t.trim() || rawTitle.trim();
    }

    async getChapter(chapterUrl, options = {}) {
      if (chapterUrl.endsWith('.pdf') || chapterUrl.includes('.pdf')) {
        let pdfText = '';
        try {
          const extractFn = (window.WebNovelImporter && window.WebNovelImporter.extractPdfText) || null;
          if (typeof extractFn === 'function') {
            const res = await fetch(chapterUrl);
            const buf = await res.arrayBuffer();
            pdfText = extractFn(buf);
          }
        } catch (pdfErr) {
          console.warn('PDF extraction error in getChapter:', pdfErr);
        }
        const chapterTitle = options.title || 'Ayamatsu IF (Pride Route)';
        return {
          title: chapterTitle,
          content: pdfText || 'Ayamatsu IF (Pride Route)',
          originalTitle: chapterTitle,
          arc: options.arc || 'IF Stories',
          volume: options.volume || options.arc || 'IF Stories'
        };
      }

      const fetchHtml = (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      if (!fetchHtml) throw new Error('HTML fetcher not initialized');

      const html = await fetchHtml(chapterUrl);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Title
      let rawTitle = doc.querySelector('h1.entry-title, .entry-title, title')?.textContent || options.title || 'Chapter';
      const title = this.formatCanonicalTitle(rawTitle, options.arc);

      // Content
      let contentEl = doc.querySelector('.entry-content, .post-content, article .content, article, main');
      let content = '';

      if (contentEl) {
        // Remove WP share buttons, related posts, navigation
        const trash = contentEl.querySelectorAll('.sharedaddy, .jp-relatedposts, .navigation, script, style, .wp-block-navigation, header, footer, .widget-area');
        trash.forEach(t => t.remove());

        if (window.WebNovelImporter && typeof window.WebNovelImporter.cleanWitchCultChapter === 'function') {
          content = window.WebNovelImporter.cleanWitchCultChapter(contentEl.innerHTML);
        } else {
          // Robust fallback preserving images
          let inner = contentEl.innerHTML;
          // Strip avatars, logos, flags, pins
          inner = inner.replace(/<p[^>]*>\s*<img[^>]*the-artifice\.com[^>]*>\s*<\/p>/gi, '')
                       .replace(/<img[^>]*the-artifice\.com[^>]*>/gi, '')
                       .replace(/<img[^>]*(?:wct_logo|Satella_Pin|Emilia_Pin|Pin\.png|pin\.png|jp\.png|France-Flag|flag)[^>]*>/gi, '');

          // Convert direct <img> tags to markdown illustrations
          inner = inner.replace(/<img\b[^>]*>/gi, (imgTag) => {
            const orig = (imgTag.match(/data-orig-file=["']([^"']+)["']/i) || [])[1] || '';
            const large = (imgTag.match(/data-large-file=["']([^"']+)["']/i) || [])[1] || '';
            const actual = (imgTag.match(/data-(?:original|actualsrc|src|lazy-src)=["']([^"']+)["']/i) || [])[1] || '';
            const src = (imgTag.match(/src=["']([^"']+)["']/i) || [])[1] || '';
            let best = orig || large || actual || src;
            if (!best || best.includes('avatar') || best.includes('emoji') || best.includes('logo') || best.includes('pin') || best.includes('flag')) return '';
            best = best.trim().replace(/\?w=\d+.*$/i, '').replace(/\?resize=\d+.*$/i, '').replace(/\?fit=\d+.*$/i, '');
            return `\n\n![Illustration](${best})\n\n`;
          });

          // Convert paragraphs & line breaks
          const cleanText = inner
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n### $1\n\n')
            .replace(/<[^>]+>/g, '');
          content = this.decodeHtml(cleanText).trim();
        }
      }

      return {
        title,
        content: content.trim(),
        originalTitle: title,
        arc: options.arc,
        volume: options.volume || options.arc
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WitchCultPlugin };
  } else if (typeof window !== 'undefined') {
    window.WitchCultPlugin = WitchCultPlugin;
  }
})();
