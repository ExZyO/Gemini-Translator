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

    async search(query) {
      const q = (query || '').toLowerCase().trim();
      const rezeroTerms = ['re:zero', 'rezero', 'witch', 'cult', 'subaru', 'emilia', 'rem', 'ram', 'echidna', 'tappei'];
      const matches = !q || rezeroTerms.some(t => q.includes(t) || t.includes(q));
      if (!matches) return [];

      return [
        {
          id: 'https://witchculttranslation.com/table-of-content/',
          title: 'Re:Zero − Starting Life in Another World (Witch Cult Translations)',
          name: 'Re:Zero − Starting Life in Another World (Witch Cult Translations)',
          url: 'https://witchculttranslation.com/table-of-content/',
          path: 'https://witchculttranslation.com/table-of-content/',
          author: 'Tappei Nagatsuki',
          cover: 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg',
          summary: 'Complete Web Novel archive including Arcs 1–10, Eminent Arc 2, Translation Chicken Arc 4, Remonwater Rem IF, and 60+ Side Stories & IF Routes.',
          source: 'Witch Cult Translations',
          sourceId: 'witchcult',
          chapters: 'Arcs 1–10 + IF'
        }
      ];
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

          if (href.includes('eminenttranslations.com')) {
            const emM = href.match(/(?:arc-2.*chapter-|volume-2\/chapter-)(\d+)/i) || href.match(/chapter-(\d+)/i);
            if (emM && (href.includes('arc-2') || href.includes('volume-2'))) {
              href = `https://eminenttranslations.com/reader/rezero-starting-life-in-another-world-wn/volume-2/chapter-${emM[1]}`;
            }
          }

          const isPdfLink = href.toLowerCase().endsWith('.pdf') || href.toLowerCase().includes('.pdf?') || href.toLowerCase().includes('.pdf/');
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
                            (!isPdfLink && href.includes('wp-content/uploads')) ||
                            rawChapterTitle.toLowerCase().includes('cut content') ||
                            rawChapterTitle.toLowerCase().includes('mega archive') ||
                            rawChapterTitle.toLowerCase().includes('side content+') ||
                            rawChapterTitle.toLowerCase().includes('progress monitor') ||
                            rawChapterTitle.toLowerCase().includes('anniversary space');

          const isAllowed = href.includes('witchculttranslation.com/20') ||
                            href.includes('witchculttranslation.com/arc-') ||
                            href.includes('eminenttranslations.com') ||
                            href.includes('kagurojp.wordpress.com') ||
                            href.includes('remonwater.wordpress.com') ||
                            (isPdfLink && href.includes('witchculttranslation.com/wp-content/uploads'));

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
        let tcAdded = 0;
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
            tcAdded = tcItems.length;
          }
        } catch (_) {}

        if (tcAdded < 5) {
          const fallbackManifest = (typeof window !== 'undefined' && window.TRANSLATION_CHICKEN_ARC4_MANIFEST) ||
                                   (typeof require === 'function' ? (function() { try { return require('./rezero_manifest'); } catch(_) { return null; } })() : null);
          if (Array.isArray(fallbackManifest)) {
            let lastArc3Idx = -1;
            for (let i = allLinks.length - 1; i >= 0; i--) {
              if (allLinks[i].arc === 'Arc 3') {
                lastArc3Idx = i;
                break;
              }
            }
            const insertIdx = lastArc3Idx !== -1 ? lastArc3Idx + 1 : allLinks.length;
            const fallbackItems = [];
            for (const item of fallbackManifest) {
              if (!seen.has(item.href)) {
                seen.add(item.href);
                fallbackItems.push({
                  title: item.title,
                  url: item.href,
                  arc: 'Arc 4',
                  order: allLinks.length + 1
                });
              }
            }
            if (fallbackItems.length > 0) {
              allLinks.splice(insertIdx, 0, ...fallbackItems);
            }
          }
        }
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

      // Step 4b: Harvest Eminent Translations side stories & IF routes
      try {
        const emHtml = await fetchHtml('https://eminenttranslations.com/reader/rezero-starting-life-in-another-world-wn/volume-2/chapter-1');
        const emOptions = [...emHtml.matchAll(/<option\s+value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi)];
        for (const o of emOptions) {
          const val = o[1];
          const rawText = this.decodeHtml(o[2].replace(/<[^>]+>/g, '').trim());
          if (val.includes('-heading') || !val.includes('rezero-starting-life-in-another-world-wn/')) continue;
          if (val.includes('/volume-')) continue;
          const emHref = `https://eminenttranslations.com/reader/${val}`;
          if (!seen.has(emHref)) {
            seen.add(emHref);
            const isIf = val.includes('/if-stories/');
            const arcName = isIf ? 'IF Stories' : 'Side Content';
            allLinks.push({
              title: rawText,
              url: emHref,
              arc: arcName,
              order: allLinks.length + 1
            });
          }
        }
      } catch (_) {}

      // Step 4c: Harvest Remonwater Sloth IF / Rem IF
      try {
        const remonHtml = await fetchHtml('https://remonwater.wordpress.com/2017/06/04/reif-starting-life-in-a-different-world-prologue-the-beginning/');
        const rMatches = [...remonHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const m of rMatches) {
          let rHref = m[1].replace(/\/$/, '') + '/';
          const rText = this.decodeHtml(m[2].replace(/<[^>]+>/g, '').trim());
          if (rHref.includes('remonwater.wordpress.com/20') && !seen.has(rHref) && rText.length > 3) {
            seen.add(rHref);
            allLinks.push({
              title: `Rem IF — ${rText}`,
              url: rHref,
              arc: 'IF Stories',
              order: allLinks.length + 1
            });
          }
        }
      } catch (_) {}

      // Step 4d: Harvest WCT Side Content posts
      try {
        const wctSideHtml = await fetchHtml('https://witchculttranslation.com/side-content/');
        const wsMatches = [...wctSideHtml.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const m of wsMatches) {
          let wsHref = m[1].replace(/\/$/, '') + '/';
          const wsText = this.decodeHtml(m[2].replace(/<[^>]+>/g, '').trim());
          if (wsHref.includes('witchculttranslation.com/20') && !seen.has(wsHref) && wsText.length > 3 && !wsHref.includes('/category/')) {
            seen.add(wsHref);
            const isIf = wsText.toLowerCase().includes('if') || wsHref.includes('if');
            const arcName = isIf ? 'IF Stories' : 'Side Content';
            allLinks.push({
              title: wsText,
              url: wsHref,
              arc: arcName,
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

    async search(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) return [];
      // Re:Zero matching keywords
      if (/re[:\s-]*zero|witch\s*cult|subaru|rem|ram|emilia|echidna|tappei|arc\s*\d|if\s*stor/i.test(q)) {
        return [{
          id: 'witchcult_rezero_complete',
          name: 'Re:Zero Starting Life in Another World — Web Novel Complete Edition',
          title: 'Re:Zero Starting Life in Another World — Web Novel Complete Edition',
          author: 'Tappei Nagatsuki (Witch Cult Translations)',
          url: 'https://witchculttranslation.com/table-of-content/',
          path: 'https://witchculttranslation.com/table-of-content/',
          cover: 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg',
          summary: 'Complete Web Novel English translation: Arcs 1–9, side content, IF stories (including Ayamatsu Pride Route). Clean volume hierarchy and zero AI tokens needed.',
          status: 'Ongoing',
          chapters: '700+ Chapters',
          source: 'Witch Cult Translations'
        }];
      }
      return [];
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

      if (chapterUrl.includes('eminenttranslations.com') || html.includes('self.__next_f.push')) {
        const pushes = [...html.matchAll(/self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g)];
        const extractedParas = [];
        for (const m of pushes) {
          let unescaped = m[1];
          try { unescaped = JSON.parse(`"${unescaped}"`); } catch(e) {
            unescaped = unescaped.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
          }
          const textMatches = [...unescaped.matchAll(/"text":\s*"([^"]+)"/g)];
          for (const tm of textMatches) {
            let t = tm[1];
            try { t = JSON.parse(`"${t}"`); } catch(_) {}
            t = t.trim();
            if (t && !t.startsWith('http') && t !== 'Previous' && t !== 'Next' && !/^Chapter\s*\d+:/i.test(t)) {
              extractedParas.push(t);
            }
          }
        }
        if (extractedParas.length > 0) {
          content = extractedParas.map(p => `<p>${p}</p>`).join('\n\n');
        }
      }

      if (!content && contentEl) {
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
