/**
 * Gemini Translator - EPUB Packaging & Generation Engine
 * Generates validated EPUB 3.0 archives with styling, navigation, and illustrations
 */
(function(window) {
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const decodeHtmlEntities = (text) => {
      if (!text) return '';
      let decoded = String(text);
      decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        if (code === 8216) return "‘";
        if (code === 8217) return "’";
        if (code === 8220) return "“";
        if (code === 8221) return "”";
        if (code === 8211) return "–";
        if (code === 8212) return "—";
        if (code === 8230) return "…";
        try { return String.fromCharCode(code); } catch(e) { return _; }
      });
      decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return _; }
      });
      return decoded
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;|&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&hellip;/g, '…')
        .replace(/&lsquo;/g, "‘")
        .replace(/&rsquo;/g, "’")
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”');
    };
    if (typeof window !== 'undefined') window.decodeHtmlEntities = decodeHtmlEntities;

    const LNORI_HASH_REGISTRY = (typeof window !== 'undefined' && window.LNORI_HASH_REGISTRY) ? window.LNORI_HASH_REGISTRY : {};

    const smartFormat = (raw, useSmartQuotes = true) => {
      let s = escapeXml(raw);
      // Restore valid unescaped HTML tags if input or AI translation already included formatting tags
      s = s.replace(/&lt;(\/)?(i|em|b|strong|u|del|s|code|sup|sub)&gt;/gi, '<$1$2>');
      s = s.replace(/\[\/?(?:b|i|u|s|center|right|left)\]|\[\/?(?:color|size|font|align)(?:=[^\]]*)?\]/gi, '');
      s = s.replace(/\*{4,}/g, '**');
      if (s.startsWith('**') && !s.slice(2).includes('**')) s = s.slice(2);
      if (s.endsWith('**') && !s.slice(0, -2).includes('**')) s = s.slice(0, -2);
      if (s.startsWith('*') && !s.slice(1).includes('*')) s = s.slice(1);
      if (s.endsWith('*') && !s.slice(0, -1).includes('*')) s = s.slice(0, -1);

      // Clean stray ASCII prompt markers inside or preceding bold/italic: **&gt; -> ** or &gt;** -> **
      s = s.replace(/^(\*{1,2}|_{1,2})&gt;\s*/, '$1');
      s = s.replace(/^&gt;\s*(\*{1,2}|_{1,2})/, '$1');

      if (useSmartQuotes) {
        // Smart quotes: "..." -> curly double quotes
        s = s.replace(/&quot;([^&]*?)&quot;/g, '\u201c$1\u201d');
        // Straight double quotes fallback
        s = s.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
        // Smart single quotes / apostrophes
        s = s.replace(/(\w)&apos;(\w)/g, '$1\u2019$2'); // it's, don't
        s = s.replace(/&apos;([^&]*?)&apos;/g, '\u2018$1\u2019');
      }
      // Normalize dashes: -- or --- to em-dash
      s = s.replace(/---?/g, '\u2014');
      // Normalize triple dots to proper ellipsis
      s = s.replace(/\.{3,}/g, '\u2026');

      // 1. Triple bold-italic: ***text*** or ___text___
      s = s.replace(/\*\*\*([^\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      s = s.replace(/___([^\n]+?)___/g, '<strong><em>$1</em></strong>');

      // 2. Bold: **text** or __text__ (supports nested italics)
      s = s.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__([^\n]+?)__/g, '<strong>$1</strong>');

      // 3. Italic: *text* or _text_ (supports dialogue quotes, punctuation, and glued text)
      s = s.replace(/\*([^*\n\s](?:[^*\n]*?[^*\n\s])?|\S)\*/g, '<em>$1</em>');
      s = s.replace(/\*([^*\n]+?)\*/g, (m, inner) => {
        const trimmed = inner.trim();
        if (!trimmed || /^[\s\*]+$/.test(trimmed)) return m;
        return '<em>' + trimmed + '</em>';
      });
      s = s.replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '<em>$1</em>');
      s = s.replace(/(?<=\w)\*(?!\*)/g, '').replace(/(?<!\*)\*(?=\w)/g, '');

      // 4. Strikethrough: ~~text~~
      s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      // 5. Inline code: `text`
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Convert any lingering markdown image syntax to HTML img tag
      s = s.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (m, alt, u) => {
        return `<img src="${u}" alt="${alt || 'Illustration'}" class="illustration"/>`;
      });
      return s.trim();
    };

    const formatChapterBodyToHtml = (bodyContent, options = {}) => {
      if (!bodyContent) return '';
      const useSmartQuotes = options.useSmartQuotes !== false;
      const chTitle = options.chapterTitle || '';

      // Normalize if bodyContent came with pre-existing HTML paragraph or break tags
      let normalized = String(bodyContent)
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n\n')
        .replace(/<p\b[^>]*>/gi, '')
        .replace(/<div\b[^>]*>/gi, '');

      const rawLines = normalized.split(/\r?\n/);
      const bodyHtml = [];
      const seenHeadings = new Set();
      const chapterTitleKey = chTitle.replace(/\s+/g, ' ').trim().toLowerCase();
      let hasEncounteredParagraph = false;

      for (let li = 0; li < rawLines.length; li++) {
        let trimmed = rawLines[li].trim();
        if (!trimmed) continue;

        // Clean any leading/trailing whitespace, tabs, or non-breaking spaces
        trimmed = trimmed.replace(/^[\s\u00A0\u3000]+/, '').replace(/[\s\u00A0\u3000]+$/, '');
        if (!trimmed) continue;

        // Suppress prompt template placeholder leaks anywhere in chapter
        if (/^(?:#*\s*chapter\s*\[(?:number|\d+)\][\s:–—-]*(?:\[title\])?|#*\s*\[(?:number|name|title)\]|\[(?:number|name|title)\])$/i.test(trimmed)
            || /^#*\s*chapter\s*\[/i.test(trimmed)
            || /---\s*page\s*end\s*---/i.test(trimmed)
            || (typeof isAiRefusal === 'function' ? isAiRefusal(trimmed) : (typeof window !== 'undefined' && window.isAiRefusal ? window.isAiRefusal(trimmed) : false))) {
          continue;
        }

        // Centered elements [center]...[/center] or <center>...</center>
        const centerMatch = trimmed.match(/^(?:\[center\]|<center>|<p\s+class="text-center">)([\s\S]*?)(?:\[\/center\]|<\/center>|<\/p>)?$/i)
                         || trimmed.match(/^([\s\S]*?)\[\/center\]$/i);
        if (centerMatch) {
          const inner = (centerMatch[1] || '').replace(/\[\/?center\]/gi, '').trim();
          if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
            bodyHtml.push('<hr/>');
            continue;
          } else if (/!\[.*?\]\([^\)]+\)/i.test(inner) || /<img\b/i.test(inner) || inner.startsWith('<div class="illustration')) {
            trimmed = inner;
          } else {
            bodyHtml.push(`<p class="text-center">${smartFormat(inner, useSmartQuotes)}</p>`);
            hasEncounteredParagraph = true;
            continue;
          }
        }

        // Right-aligned elements [right]...[/right]
        const rightMatch = trimmed.match(/^(?:\[right\]|<p\s+class="text-right">)([\s\S]*?)(?:\[\/right\]|<\/p>)?$/i)
                        || trimmed.match(/^([\s\S]*?)\[\/right\]$/i);
        if (rightMatch) {
          const inner = (rightMatch[1] || '').replace(/\[\/?right\]/gi, '').trim();
          if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
            bodyHtml.push('<hr/>');
            continue;
          } else if (/!\[.*?\]\([^\)]+\)/i.test(inner) || /<img\b/i.test(inner) || inner.startsWith('<div class="illustration')) {
            trimmed = inner;
          } else {
            bodyHtml.push(`<p class="text-right">${smartFormat(inner, useSmartQuotes)}</p>`);
            hasEncounteredParagraph = true;
            continue;
          }
        }

        // Markdown headings
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const headingText = headingMatch[2].trim();
          const headingKey = headingText.replace(/\s+/g, ' ').toLowerCase();
          if (headingKey === chapterTitleKey || seenHeadings.has(headingKey)) continue;

          seenHeadings.add(headingKey);
          const headingLevel = headingMatch[1].length <= 2 ? 2 : 3;
          bodyHtml.push('<h' + headingLevel + '>' + smartFormat(headingText, useSmartQuotes) + '</h' + headingLevel + '>');
          continue;
        }

        // Illustrations (already processed to <div class="illustration">...</div> in appendChaptersToExistingEpub or raw markdown)
        if (trimmed.startsWith('<div class="illustration"') || trimmed.startsWith('<div class="illustration-wrap"')) {
          bodyHtml.push(trimmed);
          continue;
        }
        if (/^!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/i.test(trimmed)) {
          const m = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/i);
          bodyHtml.push(`<div class="illustration-wrap"><img src="${m[2]}" alt="${escapeXml(m[1] || 'Illustration')}" class="illustration"/></div>`);
          continue;
        }

        // Scene break dividers: ***, ---, ===, ~~~, * * *, ◆◆◆, ✦✦✦, etc.
        if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(trimmed) || trimmed === '---' || trimmed === '***' || trimmed === '___' || trimmed === '===') {
          bodyHtml.push('<hr/>');
          continue;
        }

        // Tables: markdown table rows | col | col |
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          hasEncounteredParagraph = true;
          const tableLines = [trimmed];
          while (li + 1 < rawLines.length && rawLines[li + 1].trim().startsWith('|') && rawLines[li + 1].trim().endsWith('|')) {
            li++;
            tableLines.push(rawLines[li].trim());
          }
          const rows = tableLines.filter(l => !/^[\|\s\-:]+$/.test(l));
          if (rows.length > 0) {
            let tHtml = '<div class="table-wrap"><table>';
            rows.forEach((r, rIdx) => {
              const cells = r.slice(1, -1).split('|').map(c => c.trim());
              const tag = rIdx === 0 ? 'th' : 'td';
              tHtml += '<tr>' + cells.map(c => `<${tag}>${smartFormat(c, useSmartQuotes)}</${tag}>`).join('') + '</tr>';
            });
            tHtml += '</table></div>';
            bodyHtml.push(tHtml);
            continue;
          }
        }

        // Author Note Blockquote
        if (trimmed.startsWith('> **Author\'s Note:**') || trimmed.startsWith('> Author\'s Note:') || trimmed.startsWith('&gt; **Author\'s Note:**') || trimmed.startsWith('&gt; Author\'s Note:')) {
          hasEncounteredParagraph = true;
          const bqLines = [trimmed.replace(/^(?:>|&gt;)\s*/, '')];
          while (li + 1 < rawLines.length && (rawLines[li + 1].trim().startsWith('>') || rawLines[li + 1].trim().startsWith('&gt;'))) {
            li++;
            bqLines.push(rawLines[li].trim().replace(/^(?:>|&gt;)\s*/, ''));
          }
          bodyHtml.push('<blockquote class="author-note">' + bqLines.map(l => `<p>${smartFormat(l, useSmartQuotes)}</p>`).join('\n') + '</blockquote>');
          continue;
        }

        // Blockquote / Stat Screen lines starting with > or &gt;
        if (trimmed.startsWith('>') || trimmed.startsWith('&gt;')) {
          hasEncounteredParagraph = true;
          const bqLines = [trimmed.replace(/^(?:>|&gt;)\s*/, '').trim()];
          while (li + 1 < rawLines.length && (rawLines[li + 1].trim().startsWith('>') || rawLines[li + 1].trim().startsWith('&gt;'))) {
            li++;
            bqLines.push(rawLines[li].trim().replace(/^(?:>|&gt;)\s*/, '').trim());
          }
          bodyHtml.push('<blockquote>\n' + bqLines.map(l => `<p>${smartFormat(l, useSmartQuotes)}</p>`).join('\n') + '\n</blockquote>');
          continue;
        }

        // Normal paragraph with smart formatting
        bodyHtml.push(`<p>${smartFormat(trimmed, useSmartQuotes)}</p>`);
        hasEncounteredParagraph = true;
      }

      return bodyHtml.join('\n');
    };
    if (typeof window !== 'undefined') {
      window.smartFormat = smartFormat;
      window.formatChapterBodyToHtml = formatChapterBodyToHtml;
    }


    const updateOriginalEpubNavigation = async (zip, translatedChapters, options = {}) => {
      if (!zip || !Array.isArray(translatedChapters) || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return;
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) return;

      const normalizePath = value => {
        let decoded = String(value || '');
        try { decoded = decodeURIComponent(decoded); } catch (e) {}
        const parts = decoded.split('/');
        const clean = [];
        parts.forEach(part => {
          if (!part || part === '.') return;
          if (part === '..') clean.pop();
          else clean.push(part);
        });
        return clean.join('/');
      };
      const resolveArchivePath = (filePath, href) => {
        const cleanHref = String(href || '').split('#')[0].split('?')[0];
        const base = normalizePath(filePath).split('/');
        base.pop();
        return normalizePath(base.concat(cleanHref.split('/')).join('/'));
      };

      try {
        const containerDoc = new DOMParser().parseFromString(await containerFile.async('text'), 'text/xml');
        const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
        if (!opfPath) return;
        const opfFile = zip.file(opfPath);
        if (!opfFile) return;
        const opfDoc = new DOMParser().parseFromString(await opfFile.async('text'), 'text/xml');
        const titleByPath = new Map();
        translatedChapters.forEach(ch => {
          if (ch?.zipPath && ch?.title) titleByPath.set(normalizePath(ch.zipPath), String(ch.title).trim());
        });
        if (!titleByPath.size) return;

        const manifestItems = Array.from(opfDoc.querySelectorAll('manifest item'));
        const navItem = manifestItems.find(item => item.getAttribute('properties')?.split(/\s+/).includes('nav'));
        const ncxItem = manifestItems.find(item => item.getAttribute('media-type') === 'application/x-dtbncx+xml');
        const serializer = new XMLSerializer();

        if (navItem?.getAttribute('href')) {
          const navPath = resolveArchivePath(opfPath, navItem.getAttribute('href'));
          const navFile = zip.file(navPath);
          if (navFile) {
            const navDoc = new DOMParser().parseFromString(await navFile.async('text'), 'text/xml');
            navDoc.querySelectorAll('a[href]').forEach(anchor => {
              const title = titleByPath.get(resolveArchivePath(navPath, anchor.getAttribute('href')));
              if (title) anchor.textContent = title;
            });
            zip.file(navPath, serializer.serializeToString(navDoc));
          }
        }

        if (ncxItem?.getAttribute('href')) {
          const ncxPath = resolveArchivePath(opfPath, ncxItem.getAttribute('href'));
          const ncxFile = zip.file(ncxPath);
          if (ncxFile) {
            const ncxDoc = new DOMParser().parseFromString(await ncxFile.async('text'), 'text/xml');
            ncxDoc.querySelectorAll('navPoint').forEach(navPoint => {
              const src = navPoint.querySelector('content')?.getAttribute('src');
              const title = titleByPath.get(resolveArchivePath(ncxPath, src));
              if (title) {
                const label = navPoint.querySelector('navLabel text');
                if (label) label.textContent = title;
              }
            });
            zip.file(ncxPath, serializer.serializeToString(ncxDoc));
          }
        }
        // Ensure <meta name="cover"> exists in metadata if cover-image item exists
        const coverItem = manifestItems.find(item => item.getAttribute('properties')?.split(/\s+/).includes('cover-image') || item.getAttribute('id') === 'cover-image');
        const metaTag = opfDoc.querySelector('metadata');
        let opfUpdated = false;

        if (coverItem && metaTag) {
          if (!metaTag.querySelector('meta[name="cover"]')) {
            const m = opfDoc.createElement('meta');
            m.setAttribute('name', 'cover');
            m.setAttribute('content', coverItem.getAttribute('id') || 'cover-image');
            metaTag.appendChild(m);
            opfUpdated = true;
          }
          let guideTag = opfDoc.querySelector('guide');
          if (!guideTag) {
            guideTag = opfDoc.createElement('guide');
            opfDoc.documentElement.appendChild(guideTag);
            opfUpdated = true;
          }
          if (!guideTag.querySelector('reference[type="cover"]')) {
            const coverPage = manifestItems.find(i => i.getAttribute('id') === 'cover_page' || i.getAttribute('href')?.includes('cover'));
            const ref = opfDoc.createElement('reference');
            ref.setAttribute('type', 'cover');
            ref.setAttribute('title', 'Cover');
            ref.setAttribute('href', coverPage?.getAttribute('href') || coverItem.getAttribute('href') || 'cover.xhtml');
            guideTag.appendChild(ref);
            opfUpdated = true;
          }
        }

        // Embed invisible source URL and multi-sources metadata into package OPF
        if (metaTag && (options?.sourceUrl || options?.sources || options?.novelId)) {
          const srcUrl = options.sourceUrl || (Array.isArray(options.sources) && options.sources[0]?.url) || '';
          if (srcUrl && !metaTag.querySelector('dc\\:source, source')) {
            const dcSrc = opfDoc.createElement('dc:source');
            dcSrc.textContent = srcUrl;
            metaTag.appendChild(dcSrc);
            opfUpdated = true;
          }
          if (srcUrl && !metaTag.querySelector('meta[property="gemini:source_url"]')) {
            const metaSrc = opfDoc.createElement('meta');
            metaSrc.setAttribute('property', 'gemini:source_url');
            metaSrc.textContent = srcUrl;
            metaTag.appendChild(metaSrc);
            opfUpdated = true;
          }
          if (Array.isArray(options.sources) && options.sources.length > 0 && !metaTag.querySelector('meta[property="gemini:sources"]')) {
            const metaSources = opfDoc.createElement('meta');
            metaSources.setAttribute('property', 'gemini:sources');
            metaSources.textContent = JSON.stringify(options.sources);
            metaTag.appendChild(metaSources);
            opfUpdated = true;
          }
          if (options.novelId && !metaTag.querySelector('meta[property="gemini:novel_id"]')) {
            const metaNovelId = opfDoc.createElement('meta');
            metaNovelId.setAttribute('property', 'gemini:novel_id');
            metaNovelId.textContent = options.novelId;
            metaTag.appendChild(metaNovelId);
            opfUpdated = true;
          }
        }

        if (opfUpdated || coverItem) {
          zip.file(opfPath, serializer.serializeToString(opfDoc));
        }
      } catch (e) {
        console.warn('EPUB navigation update skipped:', e);
      }
    };

    /**
     * Synthesizes an elegant, high-resolution SVG typography cover
     * Guaranteed universal fallback when a web novel or document has no illustration
     */
    const generateDefaultCoverSvg = (title, author) => {
      const safeTitle = escapeXml((title || 'Web Novel').substring(0, 90));
      const safeAuthor = escapeXml((author || 'Gemini Translator').substring(0, 60));
      const words = safeTitle.split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).length > 20) {
          if (cur) lines.push(cur.trim());
          cur = w;
        } else {
          cur += (cur ? ' ' : '') + w;
        }
      }
      if (cur) lines.push(cur.trim());
      const titleLines = lines.slice(0, 5);
      const startY = 700 - (titleLines.length * 35);
      const titleTspans = titleLines.map((l, i) =>
        `<tspan x="600" y="${startY + (i * 72)}">${l}</tspan>`
      ).join('');

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="coverBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="45%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#coverBg)" />
  <rect x="50" y="50" width="1100" height="1500" fill="none" stroke="url(#goldGrad)" stroke-width="4" rx="16" />
  <rect x="70" y="70" width="1060" height="1460" fill="none" stroke="#334155" stroke-width="1.5" rx="10" />
  <text x="600" y="240" font-family="'Georgia', 'Times New Roman', serif" font-size="28" fill="#94a3b8" letter-spacing="8" text-anchor="middle">COMPLETE EDITION</text>
  <line x1="450" y1="280" x2="750" y2="280" stroke="url(#goldGrad)" stroke-width="2" />
  <text font-family="'Georgia', 'Times New Roman', serif" font-size="54" font-weight="bold" fill="#f8fafc" text-anchor="middle" letter-spacing="2">
    ${titleTspans}
  </text>
  <circle cx="600" cy="1060" r="5" fill="#f59e0b" />
  <line x1="420" y1="1060" x2="570" y2="1060" stroke="#475569" stroke-width="2" />
  <line x1="630" y1="1060" x2="780" y2="1060" stroke="#475569" stroke-width="2" />
  <text x="600" y="1150" font-family="'Georgia', 'Times New Roman', serif" font-size="34" fill="#cbd5e1" text-anchor="middle" letter-spacing="4">
    ${safeAuthor}
  </text>
  <rect x="420" y="1400" width="360" height="50" fill="#1e293b" stroke="#334155" rx="25" />
  <text x="600" y="1434" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="19" font-weight="600" fill="#38bdf8" text-anchor="middle" letter-spacing="2">GEMINI TRANSLATOR</text>
</svg>`;
    };

    /**
     * Helper to rasterize SVG markup or SVG data URI to a crisp JPEG ArrayBuffer
     * Guarantees 100% compatibility with Android e-readers (Moon+ Reader, Kindle, etc.)
     */
    const rasterizeSvgToJpegBuffer = async (svgStringOrDataUri, width = 1200, height = 1600) => {
      if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
      try {
        let src = String(svgStringOrDataUri || '').trim();
        if (!src) return null;
        let objectUrl = null;
        if (!src.startsWith('data:')) {
          const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
          objectUrl = URL.createObjectURL(blob);
          src = objectUrl;
        }
        const img = new Image();
        const loaded = await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = src;
        });
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (_) {}
        }
        if (!loaded) return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        if (canvas.toBlob) {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
          if (blob && blob.arrayBuffer) {
            return await blob.arrayBuffer();
          }
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (dataUrl && dataUrl.startsWith('data:')) {
          const b64 = dataUrl.split(',')[1];
          if (b64) {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytes.buffer;
          }
        }
        return null;
      } catch (_) {
        return null;
      }
    };

    const generateEpubFromChapters = async (chaptersList, bookTitle = 'Web Novel', bookAuthor = 'Author', bookLang = 'en', onProgress = null, options = {}) => {
      const fflateLib = (typeof window !== 'undefined' && window.fflate) ? window.fflate : (typeof fflate !== 'undefined' ? fflate : null);
      const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
      if (!fflateLib && !JSZipClass) throw new Error('Neither fflate nor JSZip library loaded');

      // Canonicalize book title to prevent "Table of Contents" or branding leaks
      let canonicalBookTitle = String(bookTitle || '').trim();
      if (!canonicalBookTitle || /table\s*of\s*contents?/i.test(canonicalBookTitle)) {
        canonicalBookTitle = options.novelTitle || options.bookTitle || '';
        if (!canonicalBookTitle || /table\s*of\s*contents?/i.test(canonicalBookTitle)) {
          canonicalBookTitle = 'Web Novel Complete Edition';
        }
      }
      canonicalBookTitle = canonicalBookTitle.replace(/\s*[\-\|–—]\s*(?:Witch\s*Cult\s*Translations|Translation\s*Chicken|Eminent\s*Translations).*$/i, '').trim();
      bookTitle = canonicalBookTitle;

      let canonicalAuthor = String(bookAuthor || '').trim();
      if (!canonicalAuthor || canonicalAuthor.toLowerCase() === 'author' || /witch\s*cult/i.test(canonicalAuthor)) {
        canonicalAuthor = 'Web Author';
      }
      bookAuthor = canonicalAuthor;

      window.telemetryLog?.('EPUB_GEN', `Building EPUB archive: "${bookTitle}" (${chaptersList?.length || 0} chapters, author: "${bookAuthor}")`);

      const useFflate = !!fflateLib;
      const fflateFiles = {};
      const nativeZip = !useFflate ? new JSZipClass() : null;

      const addZipFile = (fullPath, content, fileOpts = {}) => {
        if (useFflate) {
          let u8;
          if (typeof content === 'string') {
            u8 = fflateLib.strToU8(content);
          } else if (content instanceof Uint8Array) {
            u8 = content;
          } else if (content instanceof ArrayBuffer) {
            u8 = new Uint8Array(content);
          } else if (content && content.buffer instanceof ArrayBuffer) {
            u8 = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
          } else {
            u8 = fflateLib.strToU8(String(content || ''));
          }
          if (fileOpts.compression === 'STORE' || fileOpts.level === 0) {
            fflateFiles[fullPath] = [u8, { level: 0 }];
          } else {
            fflateFiles[fullPath] = [u8, { level: fileOpts.level || 2 }];
          }
        } else {
          const opts = {};
          if (fileOpts.compression === 'STORE') opts.compression = 'STORE';
          else if (fileOpts.compression === 'DEFLATE') {
            opts.compression = 'DEFLATE';
            opts.compressionOptions = { level: fileOpts.level || 1 };
          }
          nativeZip.file(fullPath, content, opts);
        }
      };

      const zip = {
        file(path, content, opts) { addZipFile(path, content, opts); },
        folder(folderPath) {
          const prefix = folderPath.replace(/\/+$/, '') + '/';
          return {
            file(childPath, content, opts) {
              addZipFile(prefix + childPath.replace(/^\/+/, ''), content, opts);
            },
            folder(subFolderPath) {
              return zip.folder(prefix + subFolderPath.replace(/^\/+/, ''));
            }
          };
        },
        async generateBlob(onProgressCb, getElapsedStr) {
          if (useFflate) {
            onProgressCb?.('Compressing EPUB archive with high-speed fflate…', 85, getElapsedStr());
            window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Compressing with fflate • ${getElapsedStr()}`, 85, true);
            const zipped = fflateLib.zipSync(fflateFiles, { level: 2 });
            onProgressCb?.('EPUB Packaging Complete!', 100, getElapsedStr());
            return new Blob([zipped], { type: 'application/epub+zip' });
          } else {
            let lastReportedPct = 0;
            return await nativeZip.generateAsync(
              { type: 'blob', mimeType: 'application/epub+zip' },
              (meta) => {
                const pct = Math.min(99, Math.round(70 + (meta.percent * 0.29)));
                if (pct - lastReportedPct >= 4 || meta.percent === 100) {
                  lastReportedPct = pct;
                  onProgressCb?.(`Compressing EPUB archive (${Math.round(meta.percent)}%)`, pct, getElapsedStr());
                  window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Compressing archive (${Math.round(meta.percent)}%) • ${getElapsedStr()}`, pct, true);
                }
              }
            );
          }
        }
      };
      // Deterministic RFC4122 v4 UUID for e-reader continuity (Moon+ Reader, Apple Books, Kindle)
      const generateDeterministicUUID = (seed) => {
        let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
        const s = String(seed || '').trim().toLowerCase();
        for (let i = 0; i < s.length; i++) {
          const ch = s.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
        const p2 = ((h2 >>> 16) & 0xffff).toString(16).padStart(4, '0');
        const p3 = ('4' + ((h2 >>> 4) & 0x0fff).toString(16).padStart(3, '0')).slice(0, 4);
        const p4 = (((h1 & 0x3f) | 0x80).toString(16).padStart(2, '0') + ((h2 & 0xff).toString(16).padStart(2, '0'))).slice(0, 4);
        const p5 = (((h1 >>> 4) & 0xffffffff).toString(16) + ((h2 >>> 8) & 0xffffffff).toString(16)).padStart(12, '0').slice(0, 12);
        return `urn:uuid:${p1}-${p2}-${p3}-${p4}-${p5}`;
      };

      const uuid = options.uuid || generateDeterministicUUID(options.novelId || options.sourceUrl || bookTitle);
      const startTime = Date.now();
      const cleanFn = (typeof window !== 'undefined' && window.cleanNovelProse)
        ? window.cleanNovelProse
        : ((typeof cleanNovelProse === 'function') ? cleanNovelProse : (t => String(t || '')));
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent)
        ? window.stripLeadingTitleFromContent
        : ((typeof stripLeadingTitleFromContent === 'function') ? stripLeadingTitleFromContent : null);
      const exportChapters = (Array.isArray(chaptersList) ? chaptersList : []).map((ch, idx) => {
        const title = String(ch?.title || '').trim() || ('Chapter ' + (idx + 1));
        let content = cleanFn(String(ch?.text ?? ch?.content ?? ch?.body ?? ch?.html ?? '').replace(/\r\n?/g, '\n')).trim();
        if (stripFn) {
          content = stripFn(content, title, ch?.originalTitle);
        }
        return {
          ...ch,
          title,
          content
        };
      });

      // Self-healing: If chapters lack content, attempt recovery from IndexedDB (GeminiNovelDB)
      if (typeof window !== 'undefined' && window.GeminiNovelDB && exportChapters.some(c => !c.content || c.content.trim().length === 0)) {
        try {
          const novelId = options.novelId || options.id;
          let dbRecord = null;
          if (novelId) dbRecord = await window.GeminiNovelDB.getNovel(novelId);
          if (!dbRecord && bookTitle) {
            const all = await window.GeminiNovelDB.getAllNovels();
            const cleanBT = (typeof window.normalizeTitleKey === 'function') ? window.normalizeTitleKey(bookTitle) : bookTitle.trim().toLowerCase();
            dbRecord = (all || []).find(n => n.id === novelId || (n.title && ((typeof window.normalizeTitleKey === 'function' ? window.normalizeTitleKey(n.title) : n.title.trim().toLowerCase()) === cleanBT)));
          }
          if (dbRecord) {
            const fullSource = dbRecord.rawChapters || dbRecord.chapters || dbRecord.translatedChapters || [];
            if (fullSource.length > 0) {
              exportChapters.forEach((ch, idx) => {
                if (!ch.content || ch.content.trim().length === 0) {
                  const match = fullSource[idx] || fullSource.find(rc => rc.title === ch.title || (rc.url && rc.url === ch.url));
                  if (match && (match.text || match.content || match.body || match.html)) {
                    let recovered = cleanFn(String(match.text ?? match.content ?? match.body ?? match.html ?? '').replace(/\r\n?/g, '\n')).trim();
                    if (stripFn) recovered = stripFn(recovered, ch.title, match.originalTitle);
                    ch.content = recovered;
                  }
                }
              });
            }
          }
        } catch (dbErr) {
          console.warn('[epub_engine] Chapter content DB recovery fallback error:', dbErr);
        }
      }
      if (!exportChapters.length) throw new Error('No chapters to package');
      const safeLang = String(bookLang || 'en').replace(/[^A-Za-z0-9-]/g, '') || 'en';

      const getLocalPref = (key, fallback) => {
        try {
          if (typeof localStorage !== 'undefined' && localStorage.getItem) {
            const v = localStorage.getItem(key);
            return v !== null ? v : fallback;
          }
        } catch(e) {}
        return fallback;
      };

      const useDropCaps = options.dropCaps !== undefined ? options.dropCaps : (getLocalPref('epubDropCaps', 'true') !== 'false');
      const useSmartQuotes = options.smartQuotes !== undefined ? options.smartQuotes : (getLocalPref('epubSmartQuotes', 'true') !== 'false');
      const useCleanArtifacts = options.cleanWebArtifacts !== undefined ? options.cleanWebArtifacts : (getLocalPref('epubCleanWebArtifacts', 'true') !== 'false');
      const fontTheme = options.fontTheme || getLocalPref('epubFontTheme', 'literata');
      const useJustify = options.justifyText !== undefined ? options.justifyText : (getLocalPref('epubJustifyText', 'true') !== 'false');
      const useIncludeImages = options.includeImages !== undefined ? options.includeImages : (getLocalPref('epubIncludeImages', 'true') !== 'false');

      const getElapsed = () => {
        const sec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return (m > 0 ? `${m}m ` : '') + `${s}s`;
      };

      let wakeLockObj = null;
      try {
        if (window.NativeBridge?.acquireWakeLock) {
          await window.NativeBridge.acquireWakeLock('Packaging EPUB', `Compiling "${bookTitle}" with illustrations...`);
        }
        if (typeof navigator !== 'undefined' && navigator.wakeLock) {
          try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e) {}
        }
      } catch(e) {}

      try {
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, { compression: 'STORE' });

        const oebps = zip.folder('OEBPS');
        const imgFolder = oebps.folder('images');

        let fontStack = '"Literata", "Georgia", "Palatino Linotype", "Book Antiqua", serif';
        if (fontTheme === 'inter') fontStack = '"Inter", system-ui, -apple-system, sans-serif';
        else if (fontTheme === 'georgia') fontStack = '"Georgia", "Times New Roman", serif';
        else if (fontTheme === 'classic') fontStack = '"Times New Roman", "Baskerville", serif';
        else if (fontTheme === 'none') fontStack = 'inherit';

        const cssContent = `@charset "UTF-8";

/* ── Base Typography ── */
body {
  font-family: ${fontStack};
  font-size: 1.05em;
  line-height: 1.85;
  margin: 1.2em 1.5em;
  padding: 0;
  color: #1a1a1a;
  background-color: #ffffff;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  font-kerning: normal;
  font-variant-ligatures: common-ligatures;
  word-wrap: break-word;
  overflow-wrap: break-word;
  ${useJustify ? '-webkit-hyphens: auto; hyphens: auto;' : ''}
  orphans: 2;
  widows: 2;
}

/* ── Headings ── */
h1, h2, h3, h4 {
  font-family: ${fontStack};
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
  text-align: center;
  letter-spacing: -0.01em;
  page-break-after: avoid;
  page-break-inside: avoid;
  margin-bottom: 0.6em;
}
h1 {
  font-size: 1.65em;
  margin-top: 2em;
  padding-bottom: 0.4em;
  border-bottom: 1px solid #e2e8f0;
}
h2 { font-size: 1.35em; margin-top: 1.8em; }
h3 { font-size: 1.15em; margin-top: 1.5em; }

/* ── Paragraphs ── */
p {
  margin-top: 0 !important;
  margin-bottom: 1.15em !important;
  padding: 0 !important;
  line-height: 1.85 !important;
  text-indent: 0 !important;
  ${useJustify ? 'text-align: justify;' : 'text-align: left;'}
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
  hyphens: auto;
  font-size: 1em;
  font-weight: 400;
}
p.text-center {
  text-align: center !important;
  text-indent: 0 !important;
}
p.text-right {
  text-align: right !important;
  text-indent: 0 !important;
}
h1 + p, h2 + p, h3 + p,
.illustration-wrap + p,
p.divider + p,
p.first {
  text-indent: 0 !important;
}

${useDropCaps ? `/* ── Drop Cap ── */
h1 + p::first-letter {
  font-size: 3.2em;
  float: left;
  line-height: 0.8;
  margin-right: 0.08em;
  margin-top: 0.05em;
  font-weight: 700;
  color: #334155;
  font-family: ${fontStack};
}` : ''}

/* ── Scene Break Dividers ── */
p.divider {
  text-align: center;
  text-indent: 0;
  margin: 2.5em 0;
  letter-spacing: 0.35em;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.85em;
  page-break-inside: avoid;
}

/* ── Dialogue & Emphasis ── */
em, i { font-style: italic; }
strong, b { font-weight: 700; }
del, s, strike { text-decoration: line-through; }
code { font-family: monospace; font-size: 0.9em; background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; }

/* ── Blockquote (poems, letters, status screens) ── */
blockquote {
  margin: 1.8em 2em;
  padding: 1em 1.5em;
  border-left: 3px solid #cbd5e1;
  font-style: italic;
  color: #475569;
  background-color: #f8fafc;
  page-break-inside: avoid;
  text-align: left !important;
  text-align-last: left !important;
}
blockquote p {
  text-indent: 0 !important;
  margin-bottom: 0.5em !important;
  text-align: left !important;
  text-align-last: left !important;
}
blockquote p:last-child { margin-bottom: 0 !important; }

/* ── Author Notes ── */
.author-note, blockquote.author-note {
  margin: 2em 1em;
  padding: 1.1em 1.5em;
  border-left: 4px solid #6366f1;
  background-color: #f8fafc;
  border-radius: 6px;
  font-size: 0.95em;
  page-break-inside: avoid;
  text-align: left !important;
  text-align-last: left !important;
}
.author-note p, blockquote.author-note p {
  text-indent: 0 !important;
  margin-bottom: 0.6em !important;
  text-align: left !important;
  text-align-last: left !important;
}
.author-note p:last-child, blockquote.author-note p:last-child {
  margin-bottom: 0 !important;
}

/* ── Tables & Stat Screens ── */
.table-wrap {
  margin: 1.8em 0;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.95em;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  text-align: left;
}
th {
  background-color: #f1f5f9;
  font-weight: 700;
}

/* ── Illustrations ── */
.illustration-wrap {
  text-align: center;
  margin: 2.5em auto;
  page-break-inside: avoid;
  page-break-before: auto;
}
.illustration {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
  border-radius: 4px;
}

/* ── Horizontal Rule ── */
hr {
  border: none;
  border-top: 1px solid #cbd5e1;
  margin: 2.2em auto;
  width: 35%;
  text-align: center;
}

/* ── Dark Mode Compatibility ── */
@media (prefers-color-scheme: dark) {
  body { color: #e2e8f0; background-color: #0f172a; }
  h1, h2, h3, h4 { color: #f1f5f9; }
  h1 { border-bottom-color: #334155; }
  ${useDropCaps ? 'h1 + p::first-letter { color: #94a3b8; }' : ''}
  p.divider { color: #475569; }
  blockquote {
    border-left-color: #475569;
    color: #94a3b8;
    background-color: #1e293b;
  }
  .author-note, blockquote.author-note {
    border-left-color: #818cf8;
    background-color: #1e293b;
    color: #e2e8f0;
  }
  table, th, td { border-color: #334155; }
  th { background-color: #1e293b; }
  hr { border-top-color: #475569; }
}
`;
        oebps.file('style.css', cssContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        const manifestItems = [
          '<item id="css" href="style.css" media-type="text/css"/>',
          '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
          '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        ];
        const spineItems = [];
        const tocEntries = [];

        // Step 1: Scan and strictly filter unique illustration URLs (supports Markdown & HTML img tags)
        const uniqueImgUrls = new Set();
        for (const ch of exportChapters) {
          const contentStr = ch.content || ch.text || '';
          const mdMatches = contentStr.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g);
          for (const imgMatch of mdMatches) {
            if (imgMatch && imgMatch[2]) {
              let u = imgMatch[2].trim()
                .replace(/&amp;/g, '&')
                .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                .replace(/\s+/g, '')
                .replace(/\.jppg$/i, '.jpg');
              if (u.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(u)) {
                u = u.replace(/^http:\/\//i, 'https://');
              }
              if (!u.includes('avatar') && !u.includes('emoji') && !u.includes('gravatar') &&
                  !u.includes('s.w.org') && !u.includes('pixel.wp.com') && !u.includes('widgets') &&
                  !u.includes('badge') && !u.includes('button') && !u.includes('icon') &&
                  !u.includes('paypal') && !u.includes('patreon') && !u.includes('discord') &&
                  !u.includes('sharedaddy') && !u.includes('logo') && !u.includes('ad-banner') && !u.includes('ad_banner') && !u.includes('advertisement') &&
                  !u.includes('reaction') && !u.includes('smilies') && !u.includes('jp-carousel')) {
                uniqueImgUrls.add(u);
              }
            }
          }
          const htmlMatches = contentStr.matchAll(/<img\s+([^>]*?)>/gi);
          for (const imgMatch of htmlMatches) {
            const inner = imgMatch[1] || '';
            const srcM = inner.match(/(?:src|data-src)=["'](https?:\/\/[^"'\s>]+)["']/i);
            if (srcM && srcM[1]) {
              let u = srcM[1].trim()
                .replace(/&amp;/g, '&')
                .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                .replace(/\s+/g, '')
                .replace(/\.jppg$/i, '.jpg');
              if (u.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(u)) {
                u = u.replace(/^http:\/\//i, 'https://');
              }
              const thM = inner.match(/\bth=["']([^"']+)["']/i);
              if (thM && !u.includes('#th=') && !u.includes('?th=')) {
                u += '#th=' + thM[1];
              }
              if (!u.includes('avatar') && !u.includes('emoji') && !u.includes('gravatar') &&
                  !u.includes('s.w.org') && !u.includes('pixel.wp.com') && !u.includes('widgets') &&
                  !u.includes('badge') && !u.includes('button') && !u.includes('icon') &&
                  !u.includes('paypal') && !u.includes('patreon') && !u.includes('discord') &&
                  !u.includes('sharedaddy') && !u.includes('logo') && !u.includes('ad-banner') && !u.includes('ad_banner') && !u.includes('advertisement') &&
                  !u.includes('reaction') && !u.includes('smilies') && !u.includes('jp-carousel')) {
                uniqueImgUrls.add(u);
              }
            }
          }
        }

        // Scan for cover image across options, chapter front-matter, and local library persistence
        let coverUrl = (options.coverUrl || options.cover || options.coverImage || '').trim();
        // Check first chapters for an illustration or cover image before falling back
        if (!coverUrl) {
          for (let i = 0; i < Math.min(5, exportChapters.length); i++) {
            const ch = exportChapters[i];
            const content = ch.content || ch.text || '';
            const m = content.match(/!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\s\)]+)\)/i) ||
                      content.match(/<img[^>]+(?:src|data-src)=["']((?:https?:\/\/|data:image\/)[^"'\s>]+)["']/i);
            if (m && m[1] && (/cover/i.test(ch.title || '') || i === 0)) {
              coverUrl = m[1].trim();
              break;
            }
          }
        }
        if (!coverUrl && typeof window !== 'undefined') {
          try {
            // Only use currentDocCover if this is explicitly a translation export or document title matches
            const isTransDoc = options.isTranslation || (typeof window.currentDocTitle === 'string' && bookTitle && (typeof window.normalizeTitleKey === 'function' ? window.normalizeTitleKey(bookTitle) === window.normalizeTitleKey(window.currentDocTitle) : bookTitle.toLowerCase() === window.currentDocTitle.toLowerCase()));
            if (isTransDoc) {
              if (window.currentDocCover && typeof window.currentDocCover === 'string') {
                coverUrl = window.currentDocCover.trim();
              }
              if (!coverUrl && typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('gemini_current_doc_cover');
                if (saved) coverUrl = saved.trim();
              }
            }
            if (!coverUrl && typeof localStorage !== 'undefined' && bookTitle) {
              const metaRaw = localStorage.getItem('gemini_web_import_history_meta');
              if (metaRaw) {
                const metaList = JSON.parse(metaRaw);
                const cleanBT = (typeof window !== 'undefined' && window.normalizeTitleKey)
                  ? window.normalizeTitleKey(bookTitle)
                  : String(bookTitle).replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                const matched = (metaList || []).find(n => {
                  const nt = (typeof window !== 'undefined' && window.normalizeTitleKey)
                    ? window.normalizeTitleKey(n?.title)
                    : String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                  return nt && (nt === cleanBT) && n.cover;
                });
                if (matched?.cover) coverUrl = matched.cover.trim();
              }
            }
          } catch (_) {}
        }
        if (coverUrl && coverUrl.includes('i.pximg.net')) {
          coverUrl = coverUrl.replace('i.pximg.net', 'i.pixiv.re');
        }
        if (coverUrl) {
          uniqueImgUrls.add(coverUrl);
        }

        const imageCache = new Map();
        let imgSeq = 0;

        // Step 2: Download illustrations & guarantee book cover download
        let imgUrlList = [];
        if (useIncludeImages) {
          imgUrlList = Array.from(uniqueImgUrls);
        } else if (coverUrl) {
          imgUrlList = [coverUrl];
        }

        if (imgUrlList.length > 0) {
          onProgress?.(` Pre-caching ${imgUrlList.length} illustration(s) • ${getElapsed()}...`, 5, getElapsed());
          window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Pre-caching ${imgUrlList.length} images • ${getElapsed()}`, 5, true);
          let downloadedCount = 0;
          let lastReportedImg = 0;

          const downloadWorker = async (url) => {
            let buffer = null;
            let detectedMime = null;
            const AC = typeof AbortController !== 'undefined' ? AbortController : (typeof window !== 'undefined' ? window.AbortController : null);

            const thMatch = (url || '').match(/[#?]th=([A-Za-z0-9_-]+)/i);
            let thHash = thMatch ? thMatch[1] : null;

            let downloadUrl = url || '';
            if (!thHash) {
              const regMatch = downloadUrl.match(/(?:img|cdn)\.lnori\.(?:com|org)\/(\d+)-(\d+)\./i);
              if (regMatch) {
                const regKey = `${regMatch[1]}-${regMatch[2]}`;
                thHash = (window.LNORI_HASH_REGISTRY && window.LNORI_HASH_REGISTRY[regKey]) || (typeof LNORI_HASH_REGISTRY !== 'undefined' ? LNORI_HASH_REGISTRY[regKey] : null);
              }
            }

            // Persistent multi-compile cache check
            if (!window._geminiIllustrationCache) window._geminiIllustrationCache = new Map();
            const memCache = window._geminiIllustrationCache;
            const cachedMem = memCache.get(url) || memCache.get(downloadUrl);
            if (cachedMem && cachedMem.buffer) {
              buffer = cachedMem.buffer;
              detectedMime = cachedMem.mime;
            }

            if (!buffer && typeof caches !== 'undefined' && caches.open) {
              try {
                const cStore = await caches.open('gemini-novel-illustrations-v1');
                const cachedRes = await cStore.match(downloadUrl);
                if (cachedRes && cachedRes.ok) {
                  const b = await cachedRes.arrayBuffer();
                  buffer = b;
                  detectedMime = cachedRes.headers.get('content-type') || 'image/jpeg';
                }
              } catch (_) {}
            }
            if (downloadUrl.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(downloadUrl)) {
              downloadUrl = downloadUrl.replace(/^http:\/\//i, 'https://');
            }
            if (/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i.test(downloadUrl)) {
              downloadUrl = downloadUrl.replace(/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i, 'https://cdn.lnori.com/volume/$1.jpg');
            }
            if (/https?:\/\/cdn\.lnori\.com\/cover\/(\d+)\.webp/i.test(downloadUrl)) {
              downloadUrl = downloadUrl.replace(/https?:\/\/cdn\.lnori\.com\/cover\/(\d+)\.webp/i, 'https://cdn.lnori.com/series/$1.jpg');
            }
            if (downloadUrl.includes('#th=')) {
              downloadUrl = downloadUrl.split('#th=')[0];
            }

            // Directly decode data URIs (base64 or URL-encoded) without network fetch
            if (downloadUrl && downloadUrl.startsWith('data:')) {
              try {
                const commaIdx = downloadUrl.indexOf(',');
                if (commaIdx !== -1) {
                  const metaPart = downloadUrl.substring(0, commaIdx);
                  const dataPart = downloadUrl.substring(commaIdx + 1);
                  const mimeMatch = metaPart.match(/data:([^;,]+)/i);
                  detectedMime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
                  const isBase64 = /;base64/i.test(metaPart);

                  if (isBase64) {
                    const binaryStr = atob(dataPart);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                      bytes[i] = binaryStr.charCodeAt(i);
                    }
                    buffer = bytes.buffer;
                  } else {
                    const decodedText = decodeURIComponent(dataPart);
                    const bytes = new TextEncoder().encode(decodedText);
                    buffer = bytes.buffer;
                  }

                  // If this data URI is an SVG cover, rasterize it to JPEG for e-reader bookshelf compatibility
                  const isCover = coverUrl && (url === coverUrl || downloadUrl === coverUrl || url.split('?')[0] === coverUrl.split('?')[0]);
                  if (isCover && (detectedMime.includes('svg') || (buffer && new TextDecoder().decode(new Uint8Array(buffer).slice(0, 100)).includes('<svg')))) {
                    if (typeof rasterizeSvgToJpegBuffer === 'function') {
                      const svgText = new TextDecoder().decode(buffer);
                      const jpgBuf = await rasterizeSvgToJpegBuffer(svgText);
                      if (jpgBuf) {
                        buffer = jpgBuf;
                        detectedMime = 'image/jpeg';
                      }
                    }
                  }
                }
              } catch (_) {}
            }

            // Helper: sniff image magic bytes
            const sniffMime = (buf) => {
              if (!buf || buf.byteLength < 12) return null;
              const bytes = new Uint8Array(buf.slice(0, 16));
              if (bytes[0] === 0x42 && bytes[1] === 0x4D) return { ext: 'bmp', mime: 'image/bmp' };
              if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { ext: 'png', mime: 'image/png' };
              if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' };
              if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return { ext: 'gif', mime: 'image/gif' };
              if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                  bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { ext: 'webp', mime: 'image/webp' };
              const str = String.fromCharCode(...bytes.slice(4, 12));
              if (str.includes('ftyp') || str.includes('avif')) return { ext: 'avif', mime: 'image/avif' };
              return null;
            };

            let referer = 'https://lnori.com/';
            try {
              if (downloadUrl.includes('pximg.net') || downloadUrl.includes('pixiv.re')) {
                referer = 'https://www.pixiv.net/';
              } else if (downloadUrl.includes('wattpad.com')) {
                referer = 'https://www.wattpad.com/';
              } else if (downloadUrl.includes('witchculttranslation.com')) {
                referer = 'https://witchculttranslation.com/';
              } else {
                const parsedUrl = new URL(downloadUrl);
                referer = parsedUrl.origin + '/';
              }
            } catch(_) {}

            // Rapid resilient image download (skip network attempts if already decoded from data URI)
            if (!downloadUrl.startsWith('data:') || !buffer || buffer.byteLength <= 20) {
              for (let attempt = 1; attempt <= 2; attempt++) {
                if (buffer && buffer.byteLength > 20) break;
                if (attempt > 1) {
                  await new Promise(r => setTimeout(r, 300));
                }

                // Strategy 1: Direct Fetch (Instant 80ms, no proxy delay or rate limits; works for Wattpad, Cloudflare Images, and CORS hosts)
                if (!buffer || buffer.byteLength < 500) {
                  try {
                    const ctrl = AC ? new AC() : null;
                    const t = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
                    const fetchOpts = { signal: ctrl ? ctrl.signal : undefined };
                    const res = await fetch(downloadUrl, fetchOpts);
                    if (t) clearTimeout(t);
                    if (res.ok) {
                      const ct = res.headers.get('content-type') || '';
                      if (ct.includes('image/')) detectedMime = ct.split(';')[0].trim();
                      const b = await res.arrayBuffer();
                      const sniffed = sniffMime(b);
                      if (sniffed) {
                        buffer = b;
                        detectedMime = sniffed.mime;
                      }
                    }
                  } catch(_) {}
                }

                // Strategy 2: Android NativeBridge (Bypasses WebView CORS, direct native Java HTTP connection)
                if ((!buffer || buffer.byteLength < 500) && window.NativeBridge && window.NativeBridge.downloadBinary) {
                  try {
                    const b = await Promise.race([
                      window.NativeBridge.downloadBinary(downloadUrl, { referer }),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
                    ]);
                    if (b && b.byteLength > 500) {
                      const sniffed = sniffMime(b);
                      buffer = b;
                      detectedMime = sniffed ? sniffed.mime : (detectedMime || 'image/jpeg');
                    }
                  } catch(_) {}
                }

                // Strategy 3: Dedicated High-Speed Image CDN & Proxy Pool (weserv.nl image CDN first, then corsproxy.org, then allorigins.win)
                if (!buffer || buffer.byteLength < 500) {
                  const cleanNoProto = downloadUrl.replace(/^https?:\/\//i, '');
                  const proxies = [
                    () => `https://images.weserv.nl/?url=${encodeURIComponent(cleanNoProto)}`,
                    () => `https://corsproxy.org/?url=${encodeURIComponent(downloadUrl)}`,
                    () => `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadUrl)}`
                  ];
                  for (const getProxyUrl of proxies) {
                    if (buffer && buffer.byteLength > 500) break;
                    try {
                      const ctrl = AC ? new AC() : null;
                      const t = ctrl ? setTimeout(() => ctrl.abort(), 5000) : null;
                      const res = await fetch(getProxyUrl(), { signal: ctrl ? ctrl.signal : undefined });
                      if (t) clearTimeout(t);
                      if (res.ok) {
                        const ct = res.headers.get('content-type') || '';
                        if (ct.includes('image/')) detectedMime = ct.split(';')[0].trim();
                        const b = await res.arrayBuffer();
                        const sniffed = sniffMime(b);
                        if (sniffed) {
                          buffer = b;
                          detectedMime = sniffed.mime;
                          break;
                        }
                      }
                    } catch(_) {}
                  }
                }
              }

            // Strategy 3.5: If Lnori JPG failed, attempt direct AVIF download (Lnori Cloudflare edge often caches .avif)
            if ((!buffer || buffer.byteLength < 500) && downloadUrl.includes('img.lnori.com') && downloadUrl.endsWith('.jpg')) {
              try {
                const avifUrl = downloadUrl.slice(0, -4) + '.avif';
                const res = await fetch(avifUrl);
                if (res.ok) {
                  const b = await res.arrayBuffer();
                  const sniffed = sniffMime(b);
                  if (sniffed) {
                    buffer = b;
                    detectedMime = sniffed.mime;
                  }
                }
              } catch (_) {}
            }

            // Strategy 3.6: High-Resolution Illustration Mirror (Retrieves sharp original artwork)
            if ((!buffer || buffer.byteLength < 500)) {
              const highResUrl = (typeof window !== 'undefined' && window.getHighResIllustration) 
                ? window.getHighResIllustration(downloadUrl) 
                : null;
              if (highResUrl) {
                try {
                  const ctrl = AC ? new AC() : null;
                  const t = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
                  const res = await fetch(highResUrl, { signal: ctrl ? ctrl.signal : undefined });
                  if (t) clearTimeout(t);
                  if (res.ok) {
                    const b = await res.arrayBuffer();
                    const sniffed = sniffMime(b);
                    if (sniffed) {
                      buffer = b;
                      detectedMime = sniffed.mime;
                    }
                  }
                } catch (_) {}
              }
            }

            // Strategy 4: High-fidelity Full-Size ThumbHash decoding fallback (renders at 650px full reading resolution)
            if ((!buffer || buffer.byteLength < 500) && thHash) {
              try {
                const decodeFn = (typeof window !== 'undefined' && window.decodeThumbHashToBuffer) ? window.decodeThumbHashToBuffer : (typeof decodeThumbHashToBuffer === 'function' ? decodeThumbHashToBuffer : null);
                if (decodeFn) {
                  const decoded = decodeFn(thHash, 650);
                  if (decoded && decoded.buffer && decoded.buffer.byteLength > 50) {
                    buffer = decoded.buffer;
                    detectedMime = decoded.mime || 'image/png';
                  }
                }
              } catch (_) {}
            }
          }

            if (buffer && buffer.byteLength > 20) {
              imgSeq++;
              const sniffed = sniffMime(buffer);
              let ext = 'jpg';
              let mime = 'image/jpeg';
              if (sniffed) {
                ext = sniffed.ext;
                mime = sniffed.mime;
              } else if (detectedMime) {
                mime = detectedMime;
                ext = mime.includes('svg') ? 'svg' : (mime.includes('png') ? 'png' : (mime.includes('bmp') ? 'bmp' : (mime.includes('webp') ? 'webp' : (mime.includes('gif') ? 'gif' : (mime.includes('avif') ? 'avif' : 'jpg')))));
              } else {
                ext = downloadUrl.includes('.svg') ? 'svg' : (downloadUrl.includes('.png') ? 'png' : (downloadUrl.includes('.bmp') ? 'bmp' : (downloadUrl.includes('.webp') ? 'webp' : (downloadUrl.includes('.gif') ? 'gif' : (downloadUrl.includes('.avif') ? 'avif' : 'jpg')))));
                mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : (ext === 'bmp' ? 'image/bmp' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : (ext === 'avif' ? 'image/avif' : 'image/jpeg')))));
              }

              const isCoverImg = coverUrl && (url === coverUrl || downloadUrl === coverUrl || url.split('?')[0] === coverUrl.split('?')[0]);
              // Guaranteed e-reader bookshelf compatibility: convert SVG cover to JPEG
              if (isCoverImg && (mime.includes('svg') || ext === 'svg')) {
                if (typeof rasterizeSvgToJpegBuffer === 'function') {
                  try {
                    const svgText = new TextDecoder().decode(buffer);
                    const jpgBuf = await rasterizeSvgToJpegBuffer(svgText);
                    if (jpgBuf) {
                      buffer = jpgBuf;
                      mime = 'image/jpeg';
                      ext = 'jpg';
                    }
                  } catch (_) {}
                }
              }

              const imgFilename = isCoverImg ? `cover.${ext}` : `img_${imgSeq}.${ext}`;
              const manifestId = isCoverImg ? 'cover-image' : `img_${imgSeq}`;
              imgFolder.file(imgFilename, buffer, { compression: 'STORE' });
              if (isCoverImg) {
                manifestItems.push(`<item id="cover-image" href="images/${imgFilename}" media-type="${mime}" properties="cover-image"/>`);
              } else {
                manifestItems.push(`<item id="${manifestId}" href="images/${imgFilename}" media-type="${mime}"/>`);
              }
              const entry = { localHref: `images/${imgFilename}`, manifestId, mime, ext, buffer };
              imageCache.set(url, entry);
              if (buffer) {
                memCache.set(url, { buffer, mime, ext });
                memCache.set(downloadUrl, { buffer, mime, ext });
                try {
                  if (typeof caches !== 'undefined' && caches.open) {
                    caches.open('gemini-novel-illustrations-v1').then(cStore => {
                      const blob = new Blob([buffer], { type: mime });
                      const res = new Response(blob, { headers: { 'content-type': mime } });
                      cStore.put(new Request(downloadUrl), res).catch(() => {});
                    }).catch(() => {});
                  }
                } catch (_) {}
              }
              imageCache.set(downloadUrl, entry);
              try {
                imageCache.set(encodeURI(url), entry);
                imageCache.set(decodeURI(url), entry);
                imageCache.set(url.replace(/&amp;/g, '&'), entry);
                imageCache.set(url.replace(/&/g, '&amp;'), entry);
                imageCache.set(downloadUrl.replace(/&amp;/g, '&'), entry);
                imageCache.set(downloadUrl.replace(/&/g, '&amp;'), entry);
                imageCache.set(url.split('?')[0], entry);
                imageCache.set(url.split('#')[0], entry);
                imageCache.set(downloadUrl.split('?')[0], entry);
                imageCache.set(downloadUrl.split('#')[0], entry);
                imageCache.set(url.replace(/^https?:\/\//i, '//'), entry);
                imageCache.set(downloadUrl.replace(/^https?:\/\//i, '//'), entry);
              } catch(_) {}
            }

            downloadedCount++;
            if (downloadedCount - lastReportedImg >= 2 || downloadedCount === imgUrlList.length) {
              lastReportedImg = downloadedCount;
              const pct = Math.min(55, Math.round(5 + (downloadedCount / imgUrlList.length) * 50));
              onProgress?.(`Pre-caching illustrations (${downloadedCount}/${imgUrlList.length})`, pct, getElapsed());
              window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Pre-cached ${downloadedCount}/${imgUrlList.length} images • ${getElapsed()}`, pct, true);
            }
          };

          const concurrency = 6;
          const imgQueue = [...imgUrlList];
          const pool = Array.from({ length: Math.min(concurrency, imgUrlList.length) }, async () => {
            while (imgQueue.length > 0) {
              const u = imgQueue.shift();
              if (u) await downloadWorker(u);
            }
          });
          await Promise.all(pool);
        }

        // Step 3: Fast In-Memory Chapter Assembly
        onProgress?.(`Assembling ${chaptersList.length} chapter(s)...`, 60, getElapsed());
        window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Assembling ${chaptersList.length} chapters • ${getElapsed()}`, 60, true);

        let coverCached = coverUrl ? (imageCache.get(coverUrl) || imageCache.get(coverUrl.split('?')[0])) : null;
        if (!coverCached && uniqueImgUrls.size > 0 && exportChapters.length > 0 && /cover/i.test(exportChapters[0]?.title || '')) {
          const firstImgUrl = Array.from(uniqueImgUrls)[0];
          coverCached = imageCache.get(firstImgUrl);
        }

        // If cover is an SVG, rasterize it to JPEG for 100% Android e-reader compatibility
        if (coverCached && (coverCached.mime === 'image/svg+xml' || coverCached.ext === 'svg') && coverCached.buffer) {
          try {
            const svgText = new TextDecoder().decode(coverCached.buffer);
            if (svgText && typeof rasterizeSvgToJpegBuffer === 'function') {
              const jpgBuf = await rasterizeSvgToJpegBuffer(svgText);
              if (jpgBuf) {
                const imgFilename = 'cover.jpg';
                const manifestId = 'cover-image';
                imgFolder.file(imgFilename, jpgBuf, { compression: 'STORE' });
                manifestItems = manifestItems.filter(i => !i.includes(`id="${coverCached.manifestId}"`));
                manifestItems.push(`<item id="${manifestId}" href="images/${imgFilename}" media-type="image/jpeg" properties="cover-image"/>`);
                coverCached = { localHref: `images/${imgFilename}`, manifestId, mime: 'image/jpeg', ext: 'jpg', buffer: jpgBuf };
                imageCache.set('__cover_cached__', coverCached);
              }
            }
          } catch (_) {}
        }

        // Guaranteed universal fallback: synthesize elegant photo-grade typography cover if none exists
        if (!coverCached && options.generateFallbackCover !== false) {
          const coverSvgContent = generateDefaultCoverSvg(bookTitle, bookAuthor);
          let coverJpgBuf = null;
          if (typeof rasterizeSvgToJpegBuffer === 'function') {
            try {
              coverJpgBuf = await rasterizeSvgToJpegBuffer(coverSvgContent);
            } catch (_) {}
          }
          if (coverJpgBuf) {
            const imgFilename = 'cover.jpg';
            const manifestId = 'cover-image';
            imgFolder.file(imgFilename, coverJpgBuf, { compression: 'STORE' });
            manifestItems.push(`<item id="${manifestId}" href="images/${imgFilename}" media-type="image/jpeg" properties="cover-image"/>`);
            coverCached = { localHref: `images/${imgFilename}`, manifestId, mime: 'image/jpeg', ext: 'jpg', buffer: coverJpgBuf };
            imageCache.set('__fallback_cover__', coverCached);
          } else {
            const coverSvgBuf = new TextEncoder().encode(coverSvgContent).buffer;
            const imgFilename = 'cover.svg';
            const manifestId = 'cover-image';
            imgFolder.file(imgFilename, coverSvgBuf, { compression: 'STORE' });
            manifestItems.push(`<item id="${manifestId}" href="images/${imgFilename}" media-type="image/svg+xml" properties="cover-image"/>`);
            coverCached = { localHref: `images/${imgFilename}`, manifestId, mime: 'image/svg+xml', ext: 'svg', buffer: coverSvgBuf };
            imageCache.set('__fallback_cover__', coverCached);
          }
        }

        if (coverCached) {
          if (!manifestItems.some(i => i.includes('id="cover_page"'))) {
            manifestItems.push('<item id="cover_page" href="cover.xhtml" media-type="application/xhtml+xml"/>');
          }
          if (!spineItems.some(i => i.includes('idref="cover_page"'))) {
            spineItems.unshift('<itemref idref="cover_page"/>');
          }

          const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${safeLang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Cover</title>
<style type="text/css">
  @page { margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000000; }
  body { text-align: center; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
  div.cover-wrapper { width: 100vw; height: 100vh; max-width: 100%; max-height: 100%; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
  img.cover-img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; margin: auto; display: block; }
</style>
</head>
<body>
  <div class="cover-wrapper">
    <img class="cover-img" src="${coverCached.localHref}" alt="Cover" />
  </div>
</body>
</html>`;
          oebps.file('cover.xhtml', coverXhtml, { compression: 'DEFLATE', compressionOptions: { level: 1 } });
        }

        // Skip redundant standalone cover chapter if cover.xhtml was already generated
        let chStartIndex = 0;
        if (coverCached && exportChapters.length > 1 && exportChapters[0]?.title && /^cover$/i.test(exportChapters[0].title.trim())) {
          chStartIndex = 1;
        }

        for (let idx = chStartIndex; idx < exportChapters.length; idx++) {
          const ch = exportChapters[idx];
          const chId = `chapter_${idx + 1}`;
          const chFilename = `${chId}.xhtml`;
          let chTitle = ch.title ? decodeHtmlEntities(ch.title).trim() : `Chapter ${idx + 1}`;
          const cleanFn = (typeof cleanChapterTitle === 'function') ? cleanChapterTitle : ((typeof window !== 'undefined' && window.cleanChapterTitle) ? window.cleanChapterTitle : null);
          if (cleanFn) chTitle = cleanFn(chTitle);
          chTitle = chTitle.replace(/\s*(?:\||–|—|-)\s*Witch\s*Cult\s*Translations/gi, '').trim();
          chTitle = chTitle.replace(/\s*\((?:Originally\s+translated\s+by\s+TranslationChicken|Translation\s*Chicken)\)/gi, '').trim();
          chTitle = chTitle.replace(/^Re:Zero(?:\s*\(WN\))?\s*[-–—:|]?\s*/i, '').trim();
          chTitle = chTitle.replace(/\s*(?:\[\d+\])?\s*[-—–]+\s*FOOTNOTES?\s*[-—–]+[\s\S]*/i, '').trim();
          chTitle = chTitle.replace(/\s*\[\s*(?:TL|TN|Note|Translator'?s?\s*Note)[:\s][^\]]*\]\s*$/i, '').trim();
          chTitle = chTitle.replace(/\s*\[[0-9¹²³⁴⁵⁶⁷⁸⁹]+\]\s*$/g, '').trim();
          chTitle = chTitle.replace(/[¹²³⁴⁵⁶⁷⁸⁹]+$/g, '').trim();
          chTitle = chTitle.replace(/^[\s,;:–—-]+\s*/, '').trim();
          if (!chTitle) chTitle = `Chapter ${idx + 1}`;

          manifestItems.push(`<item id="${chId}" href="${chFilename}" media-type="application/xhtml+xml"/>`);
          spineItems.push(`<itemref idref="${chId}"/>`);
          tocEntries.push({ id: chId, filename: chFilename, title: chTitle, idx, volume: ch.volume || ch.arc, arc: ch.arc || ch.volume, level: ch.level || 1, hasContent: Boolean((ch.content || ch.text || '').trim().length > 60) });

          const rawLines = ch.content.split(/\r?\n/);
          const bodyHtml = [];
          bodyHtml.push(`<h1>${escapeXml(chTitle)}</h1>`);
          const chapterTitleKey = chTitle.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
          const seenHeadings = new Set();

          // Smart typographic formatter
          const smartFormat = (raw) => {
            let s = escapeXml(raw);
            // Restore valid unescaped HTML tags if input or AI translation already included formatting tags
            s = s.replace(/&lt;(\/)?(i|em|b|strong|u|del|s|code|sup|sub)&gt;/gi, '<$1$2>');
            s = s.replace(/\[\/?(?:b|i|u|s|center|right|left)\]|\[\/?(?:color|size|font|align)(?:=[^\]]*)?\]/gi, '');
            s = s.replace(/\*{4,}/g, '**');
            if (s.startsWith('**') && !s.slice(2).includes('**')) s = s.slice(2);
            if (s.endsWith('**') && !s.slice(0, -2).includes('**')) s = s.slice(0, -2);
            if (s.startsWith('*') && !s.slice(1).includes('*')) s = s.slice(1);
            if (s.endsWith('*') && !s.slice(0, -1).includes('*')) s = s.slice(0, -1);

            // Clean stray ASCII prompt markers inside or preceding bold/italic: **&gt; -> ** or &gt;** -> **
            s = s.replace(/^(\*{1,2}|_{1,2})&gt;\s*/, '$1');
            s = s.replace(/^&gt;\s*(\*{1,2}|_{1,2})/, '$1');

            if (useSmartQuotes) {
              // Smart quotes: "..." -> curly double quotes
              s = s.replace(/&quot;([^&]*?)&quot;/g, '\u201c$1\u201d');
              // Straight double quotes fallback
              s = s.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
              // Smart single quotes / apostrophes
              s = s.replace(/(\w)&apos;(\w)/g, '$1\u2019$2'); // it's, don't
              s = s.replace(/&apos;([^&]*?)&apos;/g, '\u2018$1\u2019');
            }
            // Normalize dashes: -- or --- to em-dash
            s = s.replace(/---?/g, '\u2014');
            // Normalize triple dots to proper ellipsis
            s = s.replace(/\.{3,}/g, '\u2026');

            // 1. Triple bold-italic: ***text*** or ___text___
            s = s.replace(/\*\*\*([^\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
            s = s.replace(/___([^\n]+?)___/g, '<strong><em>$1</em></strong>');

            // 2. Bold: **text** or __text__ (supports nested italics)
            s = s.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/__([^\n]+?)__/g, '<strong>$1</strong>');

            // 3. Italic: *text* or _text_ (supports dialogue quotes, punctuation, and glued text)
            s = s.replace(/\*([^*\n\s](?:[^*\n]*?[^*\n\s])?|\S)\*/g, '<em>$1</em>');
            s = s.replace(/\*([^*\n]+?)\*/g, (m, inner) => {
              const trimmed = inner.trim();
              if (!trimmed || /^[\s\*]+$/.test(trimmed)) return m;
              return '<em>' + trimmed + '</em>';
            });
            s = s.replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '<em>$1</em>');
            s = s.replace(/(?<=\w)\*(?!\*)/g, '').replace(/(?<!\*)\*(?=\w)/g, '');

            // 4. Strikethrough: ~~text~~
            s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
            // 5. Inline code: `text`
            s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
            // Convert any lingering markdown image syntax to HTML img tag
            s = s.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (m, alt, u) => {
              return `<img src="${u}" alt="${alt || 'Illustration'}" class="illustration"/>`;
            });
            return s;
          };

          let hasEncounteredParagraph = false;
          for (let li = 0; li < rawLines.length; li++) {
            let trimmed = rawLines[li].trim();
            if (!trimmed) continue;

            // Suppress prompt template placeholder leaks anywhere in chapter
            if (/^(?:#*\s*chapter\s*\[(?:number|\d+)\][\s:–—-]*(?:\[title\])?|#*\s*\[(?:number|name|title)\]|\[(?:number|name|title)\])$/i.test(trimmed)
                || /^#*\s*chapter\s*\[/i.test(trimmed)
                || /---\s*page\s*end\s*---/i.test(trimmed)) {
              continue;
            }

            // Centered elements [center]...[/center] or <center>...</center>
            const centerMatch = trimmed.match(/^(?:\[center\]|<center>|<p\s+class="text-center">)([\s\S]*?)(?:\[\/center\]|<\/center>|<\/p>)?$/i)
                             || trimmed.match(/^([\s\S]*?)\[\/center\]$/i);
            if (centerMatch) {
              const inner = (centerMatch[1] || '').replace(/\[\/?center\]/gi, '').trim();
              if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
                bodyHtml.push('<hr/>');
                continue;
              } else if (/!\[.*?\]\([^\)]+\)/i.test(inner) || /<img\b/i.test(inner) || inner.startsWith('<div class="illustration')) {
                trimmed = inner;
              } else {
                if (!hasEncounteredParagraph) {
                  const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                  if (typeof checkTitleEcho === 'function' && checkTitleEcho(inner, chTitle, ch.originalTitle)) {
                    continue; // Suppress duplicate centered title subheading!
                  }
                }
                bodyHtml.push(`<p class="text-center">${smartFormat(inner)}</p>`);
                hasEncounteredParagraph = true;
                continue;
              }
            }

            // Right-aligned elements [right]...[/right]
            const rightMatch = trimmed.match(/^(?:\[right\]|<p\s+class="text-right">)([\s\S]*?)(?:\[\/right\]|<\/p>)?$/i)
                            || trimmed.match(/^([\s\S]*?)\[\/right\]$/i);
            if (rightMatch) {
              const inner = (rightMatch[1] || '').replace(/\[\/?right\]/gi, '').trim();
              if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
                bodyHtml.push('<hr/>');
                continue;
              } else if (/!\[.*?\]\([^\)]+\)/i.test(inner) || /<img\b/i.test(inner) || inner.startsWith('<div class="illustration')) {
                trimmed = inner;
              } else {
                bodyHtml.push(`<p class="text-right">${smartFormat(inner)}</p>`);
                hasEncounteredParagraph = true;
                continue;
              }
            }

            // Before first narrative paragraph, check if line is a duplicate title echo!
            if (!hasEncounteredParagraph) {
              const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
              if (typeof checkTitleEcho === 'function' && checkTitleEcho(trimmed, chTitle, ch.originalTitle)) {
                continue; // Suppress duplicate title line before narrative begins!
              }
            }

            // Markdown headings: render them and remove duplicate title echoes from scraped pages.
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
              const headingText = headingMatch[2].trim();
              const headingKey = headingText.replace(/\s+/g, ' ').toLocaleLowerCase();
              if (headingKey === chapterTitleKey || seenHeadings.has(headingKey)) continue;

              // If at the beginning of the chapter before any narrative paragraphs:
              if (!hasEncounteredParagraph) {
                const isSpecialNote = /^(?:author'?s?\s*note|translator'?s?\s*note|editor'?s?\s*note|t\/n|a\/n|synopsis|summary|foreword|preface|prologue|epilogue|afterword|interlude|warning|content\s*warning)\b/i.test(headingText);
                if (!isSpecialNote) {
                  const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                  if (typeof checkTitleEcho === 'function') {
                    if (checkTitleEcho(trimmed, chTitle, ch.originalTitle)) {
                      continue; // Suppress duplicate title heading!
                    }
                  } else if (headingText.length < 120) {
                    continue;
                  }
                }
              }

              seenHeadings.add(headingKey);
              const headingLevel = headingMatch[1].length <= 2 ? 2 : 3;
              bodyHtml.push('<h' + headingLevel + '>' + smartFormat(headingText) + '</h' + headingLevel + '>');
              continue;
            }

            // If images disabled, completely strip image markups from line
            if (!useIncludeImages) {
              trimmed = trimmed.replace(/!\[.*?\]\([^\)]+\)/gi, '').replace(/<img\b[^>]*>/gi, '').trim();
              if (!trimmed) continue;
            }

            // Illustration matching (markdown ![]() anywhere on line or standalone)
            if (/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/i.test(trimmed)) {
              if (!useIncludeImages) continue;
              let lineHtml = trimmed.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (fullMd, alt, rawImgUrl) => {
                const altText = alt || 'Illustration';
                const imgUrl = rawImgUrl.trim()
                  .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                  .replace(/\s+/g, '')
                  .replace(/\.jppg$/i, '.jpg');

                const cached = imageCache.get(imgUrl) || imageCache.get(rawImgUrl) ||
                               imageCache.get(imgUrl.replace(/&amp;/g, '&')) || imageCache.get(rawImgUrl.replace(/&amp;/g, '&')) ||
                               imageCache.get(encodeURI(imgUrl)) || imageCache.get(decodeURI(imgUrl)) ||
                               imageCache.get(imgUrl.split('?')[0]) || imageCache.get(imgUrl.split('#')[0]) ||
                               imageCache.get(imgUrl.split(/[#?]/)[0]);
                if (cached) {
                  return `<div class="illustration-wrap"><img src="${cached.localHref}" alt="${escapeXml(altText)}" class="illustration"/></div>`;
                }
                return `<div class="illustration-wrap"><img src="${imgUrl}" alt="${escapeXml(altText)}" class="illustration"/></div>`;
              });
              if (/^<div class="illustration-wrap">/.test(lineHtml)) {
                bodyHtml.push(lineHtml);
              } else {
                bodyHtml.push(`<p>${smartFormat(lineHtml)}</p>`);
              }
              hasEncounteredParagraph = true;
              continue;
            }

            // HTML img tag replacement for cached local images
            if (/<img\s+/i.test(trimmed)) {
              if (!useIncludeImages) continue;
              let updatedLine = trimmed.replace(/<img\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi, (fullImg, attrs, srcUrl) => {
                const cleanUrl = srcUrl.trim()
                  .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                  .replace(/\s+/g, '')
                  .replace(/\.jppg$/i, '.jpg');
                const cached = imageCache.get(cleanUrl) || imageCache.get(srcUrl) ||
                               imageCache.get(cleanUrl.replace(/&amp;/g, '&')) || imageCache.get(srcUrl.replace(/&amp;/g, '&')) ||
                               imageCache.get(encodeURI(cleanUrl)) || imageCache.get(decodeURI(cleanUrl)) ||
                               imageCache.get(cleanUrl.split('?')[0]) || imageCache.get(cleanUrl.split('#')[0]) ||
                               imageCache.get(cleanUrl.split(/[#?]/)[0]);
                if (cached) {
                  return `<div class="illustration-wrap"><img src="${cached.localHref}" alt="Illustration" class="illustration"/></div>`;
                }
                return `<div class="illustration-wrap"><img src="${cleanUrl}" alt="Illustration" class="illustration"/></div>`;
              });
              bodyHtml.push(updatedLine);
              continue;
            }

            // Scene break dividers: ***, ---, ===, ~~~, * * *, ◆◆◆, ✦✦✦, etc.
            if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(trimmed) || trimmed === '---' || trimmed === '***' || trimmed === '___' || trimmed === '===') {
              bodyHtml.push('<hr/>');
              continue;
            }

            // Tables: markdown table rows | col | col |
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
              hasEncounteredParagraph = true;
              const tableLines = [trimmed];
              while (li + 1 < rawLines.length && rawLines[li + 1].trim().startsWith('|') && rawLines[li + 1].trim().endsWith('|')) {
                li++;
                tableLines.push(rawLines[li].trim());
              }
              const rows = tableLines.filter(l => !/^[\|\s\-:]+$/.test(l));
              if (rows.length > 0) {
                let tHtml = '<div class="table-wrap"><table>';
                rows.forEach((r, rIdx) => {
                  const cells = r.slice(1, -1).split('|').map(c => c.trim());
                  const tag = rIdx === 0 ? 'th' : 'td';
                  tHtml += '<tr>' + cells.map(c => `<${tag}>${smartFormat(c)}</${tag}>`).join('') + '</tr>';
                });
                tHtml += '</table></div>';
                bodyHtml.push(tHtml);
                continue;
              }
            }

            // Author Note Blockquote
            if (trimmed.startsWith('> **Author\'s Note:**') || trimmed.startsWith('> Author\'s Note:')) {
              hasEncounteredParagraph = true;
              const bqLines = [trimmed.replace(/^>\s*/, '')];
              while (li + 1 < rawLines.length && rawLines[li + 1].trim().startsWith('>')) {
                li++;
                bqLines.push(rawLines[li].trim().replace(/^>\s*/, ''));
              }
              bodyHtml.push('<blockquote class="author-note">' + bqLines.map(l => `<p>${smartFormat(l)}</p>`).join('\n') + '</blockquote>');
              continue;
            }

            // Blockquote lines starting with >
            if (trimmed.startsWith('>')) {
              hasEncounteredParagraph = true;
              const bqLines = [trimmed.replace(/^>\s*/, '')];
              while (li + 1 < rawLines.length && rawLines[li + 1].trim().startsWith('>')) {
                li++;
                bqLines.push(rawLines[li].trim().replace(/^>\s*/, ''));
              }
              bodyHtml.push('<blockquote>' + bqLines.map(l => `<p>${smartFormat(l)}</p>`).join('\n') + '</blockquote>');
              continue;
            }

            // Standalone line check before first paragraph: suppress title echo
            if (!hasEncounteredParagraph) {
              const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
              if (typeof checkTitleEcho === 'function' && checkTitleEcho(trimmed, chTitle, ch.originalTitle)) {
                continue; // Suppress duplicate plain-text title paragraph!
              }
            }

            // Normal paragraph with smart formatting
            bodyHtml.push(`<p>${smartFormat(trimmed)}</p>`);
            hasEncounteredParagraph = true;
          }

          const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${safeLang}">
<head>
<meta charset="utf-8" />
<title>${escapeXml(chTitle)}</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
${bodyHtml.join('\n ')}
</body>
</html>`;

          oebps.file(chFilename, xhtmlContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });
        }

        // ── HIERARCHICAL TABLE OF CONTENTS (Volume Collapsible Hierarchy) ──
        const useHierarchicalToc = options.hierarchicalToc !== false;
        const volRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc)\s*(\d+|[IVXLCDM]+)[\s,;:–—-]*(.*)$/i;
        const volumeGroups = [];
        let curVolGroup = null;

        const hasExplicitSubChapters = tocEntries.some(e => e.level === 2);

        if (hasExplicitSubChapters) {
          for (let i = 0; i < tocEntries.length; i++) {
            const entry = tocEntries[i];
            const cleanT = decodeHtmlEntities(entry.title).trim();
            if (entry.level === 1 || !curVolGroup) {
              curVolGroup = {
                id: entry.id,
                volName: cleanT,
                firstFilename: entry.filename,
                hasRealVolume: true,
                items: []
              };
              volumeGroups.push(curVolGroup);
              // If this parent chapter has substantive prose (not just an empty volume header),
              // include it as a readable child entry so folder-based TOC readers like Moon+ Reader
              // don't trap the chapter content behind an expand/collapse folder toggle.
              if (entry.hasContent) {
                curVolGroup.items.push({
                  id: entry.id,
                  filename: entry.filename,
                  cleanTitle: cleanT,
                  fullTitle: entry.title
                });
              }
            } else {
              curVolGroup.items.push({
                id: entry.id,
                filename: entry.filename,
                cleanTitle: cleanT,
                fullTitle: entry.title
              });
            }
          }
        } else {
          for (let i = 0; i < tocEntries.length; i++) {
            const entry = tocEntries[i];
            let volName = entry.volume || entry.arc || null;
            let cleanTitle = decodeHtmlEntities(entry.title).trim();

            // Strip any website branding from chapter title
            cleanTitle = cleanTitle.replace(/\s*(?:\||–|—|-)\s*Witch\s*Cult\s*Translations/gi, '').trim();
            cleanTitle = cleanTitle.replace(/\s*\((?:Originally\s+translated\s+by\s+TranslationChicken|Translation\s*Chicken)\)/gi, '').trim();
            cleanTitle = cleanTitle.replace(/^Re:Zero(?:\s*\(WN\))?\s*[-–—:|]?\s*/i, '').trim();

            if (volName) {
              volName = decodeHtmlEntities(volName).trim();
              // If cleanTitle starts with this volume name, strip it so the nested item doesn't repeat the volume name
              const escapedVol = volName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              cleanTitle = cleanTitle.replace(new RegExp(`^(?:\\[\\s*)?${escapedVol}[\\s,;:–—-]*(.*)$`, 'i'), '$1').trim();
            } else {
              const match = cleanTitle.match(volRegex);
              if (match) {
                const prefix = match[1].toLowerCase().startsWith('vol') ? 'Volume' : (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase());
                const num = parseInt(match[2], 10) || match[2];
                volName = `${prefix} ${num}`;
                cleanTitle = match[3] ? match[3].trim() : cleanTitle;
              }
            }

            // Strip any residual leading punctuation left over (comma, colon, dash)
            cleanTitle = cleanTitle.replace(/^[\s,;:–—-]+\s*/, '').trim();
            if (!cleanTitle) cleanTitle = entry.title;

            if (!curVolGroup || (volName && curVolGroup.volName !== volName)) {
              curVolGroup = {
                volName: volName || 'General',
                hasRealVolume: Boolean(volName),
                firstFilename: entry.filename,
                items: []
              };
              volumeGroups.push(curVolGroup);
            }

            curVolGroup.items.push({
              id: entry.id,
              filename: entry.filename,
              cleanTitle: cleanTitle || entry.title,
              fullTitle: entry.title
            });
          }
        }

        const distinctNamedVolumes = volumeGroups.filter(v => v.hasRealVolume);
        const isMultiVolume = useHierarchicalToc && (hasExplicitSubChapters || distinctNamedVolumes.length >= 2 || (volumeGroups.length >= 2 && distinctNamedVolumes.length >= 1));

        const tocNavPoints = [];
        const tocNavLinks = [];
        let playOrder = 1;
        let dtbDepth = 1;

        if (isMultiVolume) {
          dtbDepth = 2;
          volumeGroups.forEach((vol, vIdx) => {
            const volId = `vol_${vIdx + 1}`;
            const firstFile = vol.firstFilename || vol.items[0]?.filename || `chapter_1.xhtml`;
            const parentPlayOrder = playOrder++;

            if (vol.items.length === 0) {
              tocNavPoints.push(`
  <navPoint id="${volId}" playOrder="${parentPlayOrder}">
    <navLabel><text>${escapeXml(vol.volName)}</text></navLabel>
    <content src="${firstFile}"/>
  </navPoint>`);
              tocNavLinks.push(`  <li><a href="${firstFile}">${escapeXml(vol.volName)}</a></li>`);
            } else {
              // Nested navPoints for EPUB 2 NCX (renders as collapsible volume tree in Moon+ Reader)
              const childNavPoints = vol.items.map(item => `
    <navPoint id="nav_${item.id}" playOrder="${playOrder++}">
      <navLabel><text>${escapeXml(item.cleanTitle)}</text></navLabel>
      <content src="${item.filename}"/>
    </navPoint>`).join('');

              tocNavPoints.push(`
  <navPoint id="${volId}" playOrder="${parentPlayOrder}">
    <navLabel><text>${escapeXml(vol.volName)}</text></navLabel>
    <content src="${firstFile}"/>${childNavPoints}
  </navPoint>`);

              // Nested <ol> for EPUB 3 navigation (nav.xhtml)
              const childNavLinks = vol.items.map(item => `      <li><a href="${item.filename}">${escapeXml(item.cleanTitle)}</a></li>`).join('\n');
              tocNavLinks.push(`  <li>
    <a href="${firstFile}">${escapeXml(vol.volName)}</a>
    <ol>
${childNavLinks}
    </ol>
  </li>`);
            }
          });
        } else {
          // Standard flat TOC for single-volume books
          dtbDepth = 1;
          tocEntries.forEach(entry => {
            tocNavPoints.push(`
  <navPoint id="nav_${entry.id}" playOrder="${playOrder++}">
    <navLabel><text>${escapeXml(entry.title)}</text></navLabel>
    <content src="${entry.filename}"/>
  </navPoint>`);
            tocNavLinks.push(`  <li><a href="${entry.filename}">${escapeXml(entry.title)}</a></li>`);
          });
        }

        const primarySourceUrl = String(options.sourceUrl || options.url || '').trim();
        const sourcesList = Array.isArray(options.sources) && options.sources.length > 0
          ? options.sources
          : (primarySourceUrl ? [{ url: primarySourceUrl, label: 'Original Source', active: true }] : []);
        const novelId = String(options.novelId || options.id || uuid).trim();
        const tocHierarchyMap = isMultiVolume ? volumeGroups.map(v => ({
          volume: v.volName,
          chapters: (v.items || []).map(i => i.cleanTitle || i.fullTitle)
        })) : [];

        const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${escapeXml(bookTitle)}</dc:title>
  <dc:creator>${escapeXml(bookAuthor)}</dc:creator>
  <dc:language>${safeLang}</dc:language>
  <dc:identifier id="BookID">${uuid}</dc:identifier>
  <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  ${primarySourceUrl ? `<dc:source>${escapeXml(primarySourceUrl)}</dc:source>` : ''}
  ${primarySourceUrl ? `<meta name="source-url" content="${escapeXml(primarySourceUrl)}"/>` : ''}
  ${primarySourceUrl ? `<meta property="gemini:source_url">${escapeXml(primarySourceUrl)}</meta>` : ''}
  ${sourcesList.length > 0 ? `<meta property="gemini:sources">${escapeXml(JSON.stringify(sourcesList))}</meta>` : ''}
  <meta property="gemini:novel_id">${escapeXml(novelId)}</meta>
  ${tocHierarchyMap.length > 0 ? `<meta property="gemini:toc_hierarchy">${escapeXml(JSON.stringify(tocHierarchyMap))}</meta>` : ''}
  ${coverCached ? '<meta name="cover" content="cover-image"/>' : ''}
</metadata>
<manifest>
  ${manifestItems.join('\n  ')}
</manifest>
<spine toc="ncx">
  ${spineItems.join('\n  ')}
</spine>
${coverCached ? `<guide>
  <reference type="cover" title="Cover" href="cover.xhtml"/>
</guide>` : ''}
</package>`;
        oebps.file('content.opf', opfContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
  <meta name="dtb:uid" content="${uuid}"/>
  <meta name="dtb:depth" content="${dtbDepth}"/>
  <meta name="dtb:totalPageCount" content="0"/>
  <meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${escapeXml(bookTitle)}</text></docTitle>
<navMap>
  ${tocNavPoints.join('')}
</navMap>
</ncx>`;
        oebps.file('toc.ncx', ncxContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });
        const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${safeLang}">
<head>
<meta charset="utf-8" />
<title>${escapeXml(bookTitle)}</title>
</head>
<body>
<nav epub:type="toc" id="toc">
<h1>${escapeXml(bookTitle)}</h1>
<ol>
${tocNavLinks.join('\n')}
</ol>
</nav>
${coverCached ? `<nav epub:type="landmarks" hidden="">
  <h2>Guide</h2>
  <ol>
    <li><a epub:type="cover" href="cover.xhtml">Cover</a></li>
    <li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>
  </ol>
</nav>` : ''}
</body>
</html>`;
        oebps.file('nav.xhtml', navContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        const blob = await zip.generateBlob(onProgress, getElapsed);
        window.telemetryLog?.('EPUB_GEN', `EPUB archive created: "${bookTitle}" (${(blob.size / 1024).toFixed(1)} KB, took ${getElapsed ? getElapsed() : 'unknown time'})`, {
          title: bookTitle,
          author: bookAuthor,
          chapters: chaptersList?.length,
          sizeBytes: blob.size
        });
        return blob;
      } finally {
        try {
          if (wakeLockObj) wakeLockObj.release().catch(() => {});
          window.NativeBridge?.releaseWakeLock?.();
          window.NativeBridge?.clearProgressNotification?.(true, 'EPUB Packaging Complete! ', `"${bookTitle}" is ready.`);
        } catch(e) {}
      }
    };

    /**
     * In-place EPUB Continuation Engine:
     * Takes an existing EPUB (File, Blob, ArrayBuffer, or JSZip) and appends newly fetched chapters.
     * Preserves 100% of the original EPUB's images, fonts, stylesheets, existing chapter files,
     * and Moon+ Reader bookmarks/UUID.
     */
    const appendChaptersToExistingEpub = async (originalFileOrZip, newChapters, options = {}, onProgress = null) => {
      const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
      if (!JSZipClass) throw new Error('JSZip library is required for in-place EPUB updating.');

      if (!Array.isArray(newChapters) || newChapters.length === 0) {
        throw new Error('No new chapters provided to append.');
      }

      onProgress?.('Opening existing EPUB archive…', 10);

      let zip;
      if (originalFileOrZip && typeof originalFileOrZip.file === 'function') {
        zip = originalFileOrZip;
      } else {
        const buf = originalFileOrZip instanceof ArrayBuffer
          ? originalFileOrZip
          : await originalFileOrZip.arrayBuffer();
        zip = await JSZipClass.loadAsync(buf);
      }

      // 1. Locate container.xml and root OPF file
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) throw new Error('Invalid EPUB: META-INF/container.xml not found.');
      const containerXml = await containerFile.async('text');
      const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
      const rootfile = containerDoc.querySelector('rootfile');
      const opfPath = rootfile?.getAttribute('full-path');
      if (!opfPath) throw new Error('Invalid EPUB: rootfile full-path not found in container.xml.');
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

      const opfFile = zip.file(opfPath);
      if (!opfFile) throw new Error(`Invalid EPUB: OPF file not found at "${opfPath}".`);
      const opfXml = await opfFile.async('text');
      const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');

      const manifestEl = opfDoc.querySelector('manifest');
      const spineEl = opfDoc.querySelector('spine');
      if (!manifestEl || !spineEl) throw new Error('Invalid EPUB: manifest or spine missing from OPF.');

      const manifestItems = Array.from(manifestEl.querySelectorAll('item'));
      const spineItems = Array.from(spineEl.querySelectorAll('itemref'));

      onProgress?.(`Preserving ${spineItems.length} existing chapters, photos, and styles…`, 25);

      // 2. Discover chapter directory, styling, and naming conventions from existing book
      let sampleChapterHref = '';
      for (const ref of spineItems) {
        const idref = ref.getAttribute('idref');
        const item = manifestEl.querySelector(`item[id="${idref}"]`);
        if (item) {
          const h = (item.getAttribute('href') || '').trim();
          if (h && !h.includes('cover') && !h.includes('nav') && !h.includes('toc')) {
            sampleChapterHref = h;
            break;
          }
        }
      }
      if (!sampleChapterHref && spineItems.length > 0) {
        const firstItem = manifestEl.querySelector(`item[id="${spineItems[0].getAttribute('idref')}"]`);
        sampleChapterHref = firstItem?.getAttribute('href') || 'text/ch001.xhtml';
      }

      const chapterSubDir = sampleChapterHref.includes('/')
        ? sampleChapterHref.substring(0, sampleChapterHref.lastIndexOf('/') + 1)
        : '';

      // Find stylesheet href from existing manifest
      const cssItem = manifestItems.find(i => (i.getAttribute('media-type') || '').includes('css'));
      let cssLinkHtml = '';
      if (cssItem) {
        const cssHref = cssItem.getAttribute('href') || '';
        let relCss = cssHref;
        if (chapterSubDir && !cssHref.startsWith(chapterSubDir)) {
          relCss = '../' + cssHref;
        }
        cssLinkHtml = `<link rel="stylesheet" href="${relCss}" type="text/css"/>`;
      }

      // 3. Locate NCX (EPUB 2) and NAV (EPUB 3)
      const ncxItem = manifestItems.find(i => (i.getAttribute('media-type') || '').includes('x-dtbncx+xml'));
      let ncxDoc = null;
      let ncxPath = null;
      if (ncxItem) {
        ncxPath = opfDir + ncxItem.getAttribute('href');
        const ncxFile = zip.file(ncxPath);
        if (ncxFile) {
          try {
            ncxDoc = new DOMParser().parseFromString(await ncxFile.async('text'), 'text/xml');
          } catch(e) {}
        }
      }

      const navItem = manifestItems.find(i => (i.getAttribute('properties') || '').split(/\s+/).includes('nav'));
      let navDoc = null;
      let navPath = null;
      if (navItem) {
        navPath = opfDir + navItem.getAttribute('href');
        const navFile = zip.file(navPath);
        if (navFile) {
          try {
            navDoc = new DOMParser().parseFromString(await navFile.async('text'), 'text/xml');
          } catch(e) {}
        }
      }

      // 4. Determine starting index for new chapters
      let startChapterNum = options.startChapter;
      if (typeof startChapterNum !== 'number' || startChapterNum <= 0) {
        startChapterNum = spineItems.length + 1;
      }

      const imageDir = (chapterSubDir ? chapterSubDir : '') + 'images/';
      let imageCounter = 1;

      // Helper to download web image bytes
      const fetchImageBytes = async (imgUrl) => {
        try {
          let targetUrl = imgUrl;
          const thMatch = (targetUrl || '').match(/[#?]th=([A-Za-z0-9_-]+)/i);
          let thHash = thMatch ? thMatch[1] : null;

          if (/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i.test(targetUrl)) {
            targetUrl = targetUrl.replace(/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i, 'https://cdn.lnori.com/volume/$1.jpg');
          }
          if (targetUrl.includes('#th=')) {
            targetUrl = targetUrl.split('#th=')[0];
          }
          if (targetUrl.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(targetUrl)) {
            targetUrl = targetUrl.replace(/^http:\/\//i, 'https://');
          }

          const sniffBytes = (buf) => {
            if (!buf || buf.byteLength < 12) return null;
            const b = new Uint8Array(buf.slice(0, 16));
            if (b[0] === 0x42 && b[1] === 0x4D) return { ext: 'bmp', mime: 'image/bmp' };
            if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
            if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' };
            if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { ext: 'gif', mime: 'image/gif' };
            if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', mime: 'image/webp' };
            const s = String.fromCharCode(...b.slice(4, 12));
            if (s.includes('ftyp') || s.includes('avif')) return { ext: 'avif', mime: 'image/avif' };
            return null;
          };

          if (targetUrl.startsWith('data:')) {
            try {
              const commaIdx = targetUrl.indexOf(',');
              if (commaIdx !== -1) {
                const metaPart = targetUrl.substring(0, commaIdx);
                const dataPart = targetUrl.substring(commaIdx + 1);
                const mimeMatch = metaPart.match(/data:([^;,]+)/i);
                let detectedMime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
                const isBase64 = /;base64/i.test(metaPart);
                let buffer = null;
                if (isBase64) {
                  const bin = atob(dataPart);
                  const bytes = new Uint8Array(bin.length);
                  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                  buffer = bytes.buffer;
                } else {
                  buffer = new TextEncoder().encode(decodeURIComponent(dataPart)).buffer;
                }
                if (buffer && buffer.byteLength > 20) {
                  const sniffed = sniffBytes(buffer);
                  let ext = sniffed ? sniffed.ext : (detectedMime.includes('svg') ? 'svg' : (detectedMime.includes('png') ? 'png' : (detectedMime.includes('webp') ? 'webp' : 'jpg')));
                  let mime = sniffed ? sniffed.mime : detectedMime;
                  return { data: new Uint8Array(buffer), ext, mime };
                }
              }
            } catch (_) {}
          }

          if (targetUrl.startsWith('http')) {
            let buffer = null;
            let detectedMime = null;

            // Strategy 1: NativeBridge
            if (window.NativeBridge && window.NativeBridge.downloadBinary) {
              try {
                let referer = '';
                try { referer = new URL(targetUrl).origin + '/'; } catch (_) {}
                buffer = await Promise.race([
                  window.NativeBridge.downloadBinary(targetUrl, { referer }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);
              } catch (_) {}
            }

            // Strategy 2: Direct fetch
            if (!buffer || buffer.byteLength < 500) {
              try {
                const res = await fetch(targetUrl);
                if (res.ok) {
                  const b = await res.arrayBuffer();
                  const sniffed = sniffBytes(b);
                  if (sniffed) { buffer = b; detectedMime = sniffed.mime; }
                }
              } catch (_) {}
            }

            // Strategy 3: Multi-tier proxy fallback pool
            if (!buffer || buffer.byteLength < 500) {
              const cleanNoProto = targetUrl.replace(/^https?:\/\//i, '');
              const proxies = [
                () => `https://corsproxy.org/?url=${encodeURIComponent(targetUrl)}`,
                () => `https://images.weserv.nl/?url=${encodeURIComponent(cleanNoProto)}`,
                () => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
              ];
              for (const getProxyUrl of proxies) {
                if (buffer && buffer.byteLength > 500) break;
                try {
                  const res = await fetch(getProxyUrl());
                  if (res.ok) {
                    const b = await res.arrayBuffer();
                    const sniffed = sniffBytes(b);
                    if (sniffed) { buffer = b; detectedMime = sniffed.mime; break; }
                  }
                } catch (_) {}
              }
            }

            if (buffer && buffer.byteLength > 50) {
              const sniffed = sniffBytes(buffer);
              const ext = sniffed?.ext || 'jpg';
              const mime = sniffed?.mime || detectedMime || 'image/jpeg';
              return { data: new Uint8Array(buffer), ext, mime };
            }
          }

          if (!thHash) {
            const regMatch = (targetUrl || '').match(/(?:img|cdn)\.lnori\.(?:com|org)\/(\d+)-(\d+)\./i);
            if (regMatch) {
              const regKey = `${regMatch[1]}-${regMatch[2]}`;
              thHash = (window.LNORI_HASH_REGISTRY && window.LNORI_HASH_REGISTRY[regKey]) || (typeof LNORI_HASH_REGISTRY !== 'undefined' ? LNORI_HASH_REGISTRY[regKey] : null);
            }
          }

          const highResUrl = (typeof window !== 'undefined' && window.getHighResIllustration) 
            ? window.getHighResIllustration(targetUrl) 
            : null;
          if (highResUrl) {
            let res = await fetch(highResUrl).catch(() => null);
            if (res && res.ok) {
              const buf = await res.arrayBuffer();
              const sniffed = sniffBytes(buf);
              const ext = sniffed?.ext || 'webp';
              const mime = sniffed?.mime || 'image/webp';
              return { data: new Uint8Array(buf), ext, mime };
            }
          }

          // Fallback: ThumbHash decoding (renders at 650px full reading resolution)
          if (thHash) {
            const decodeFn = (typeof window !== 'undefined' && window.decodeThumbHashToBuffer) ? window.decodeThumbHashToBuffer : (typeof decodeThumbHashToBuffer === 'function' ? decodeThumbHashToBuffer : null);
            if (decodeFn) {
              const decoded = decodeFn(thHash, 650);
              if (decoded && decoded.buffer && decoded.buffer.byteLength > 50) {
                return { data: new Uint8Array(decoded.buffer), ext: decoded.ext || 'png', mime: decoded.mime || 'image/png' };
              }
            }
          }
        } catch(e) {}
        return null;
      };

      // 5. Append each new chapter into the zip
      for (let idx = 0; idx < newChapters.length; idx++) {
        const ch = newChapters[idx];
        const chNum = startChapterNum + idx;
        const progressPct = Math.min(85, Math.round(30 + ((idx / newChapters.length) * 55)));
        onProgress?.(`Appending Ch. ${chNum}: ${ch.title || `Chapter ${chNum}`}…`, progressPct);

        let bodyContent = ch.content || ch.text || '';

        // Process any illustrations inside the chapter text
        const mdImgMatches = Array.from(bodyContent.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi));
        for (const m of mdImgMatches) {
          const imgUrl = m[2] || m[1];
          const imgObj = await fetchImageBytes(imgUrl);
          if (imgObj) {
            const imgFileName = `img_cont_${chNum}_${imageCounter}.${imgObj.ext}`;
            const imgPathInZip = opfDir + imageDir + imgFileName;
            zip.file(imgPathInZip, imgObj.data);

            const imgId = `img_cont_${chNum}_${imageCounter}`;
            const relImgHref = (chapterSubDir ? 'images/' : imageDir) + imgFileName;

            const imgItem = opfDoc.createElement('item');
            imgItem.setAttribute('id', imgId);
            imgItem.setAttribute('href', (chapterSubDir ? chapterSubDir : '') + 'images/' + imgFileName);
            imgItem.setAttribute('media-type', imgObj.mime);
            manifestEl.appendChild(imgItem);

            imageCounter++;
            bodyContent = bodyContent.replace(m[0], `<div class="illustration"><img src="${relImgHref}" alt="Illustration"/></div>`);
          } else {
            bodyContent = bodyContent.replace(m[0], '');
          }
        }

        const htmlImgMatches = Array.from(bodyContent.matchAll(/<img\b[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi));
        for (const m of htmlImgMatches) {
          const imgUrl = m[1];
          const imgObj = await fetchImageBytes(imgUrl);
          if (imgObj) {
            const imgFileName = `img_cont_${chNum}_${imageCounter}.${imgObj.ext}`;
            const imgPathInZip = opfDir + imageDir + imgFileName;
            zip.file(imgPathInZip, imgObj.data);

            const imgId = `img_cont_${chNum}_${imageCounter}`;
            const relImgHref = (chapterSubDir ? 'images/' : imageDir) + imgFileName;

            const imgItem = opfDoc.createElement('item');
            imgItem.setAttribute('id', imgId);
            imgItem.setAttribute('href', (chapterSubDir ? chapterSubDir : '') + 'images/' + imgFileName);
            imgItem.setAttribute('media-type', imgObj.mime);
            manifestEl.appendChild(imgItem);

            imageCounter++;
            bodyContent = bodyContent.replace(m[0], `<div class="illustration"><img src="${relImgHref}" alt="Illustration"/></div>`);
          }
        }

        const cleanFn = (typeof cleanChapterTitle === 'function') ? cleanChapterTitle : ((typeof window !== 'undefined' && window.cleanChapterTitle) ? window.cleanChapterTitle : null);
        const rawChTitle = ch.title || `Chapter ${chNum}`;
        const chTitle = cleanFn ? cleanFn(rawChTitle) : rawChTitle;
        const formattedHtml = formatChapterBodyToHtml(bodyContent, {
          useSmartQuotes: true,
          chapterTitle: chTitle
        });

        const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(chTitle)}</title>
  ${cssLinkHtml}
  <style type="text/css">
    body { font-family: "Literata", "Georgia", serif, sans-serif; line-height: 1.85; margin: 5%; color: #1a1a1a; }
    h1.chapter-title { font-size: 1.5em; margin-bottom: 1.2em; text-align: center; font-weight: 700; }
    p { margin-top: 0; margin-bottom: 1.15em; line-height: 1.85; text-indent: 0; }
    p.text-center { text-align: center; text-indent: 0; }
    p.text-right { text-align: right; text-indent: 0; }
    em, i { font-style: italic; }
    strong, b { font-weight: 700; }
    del, s { text-decoration: line-through; }
    code { font-family: monospace; font-size: 0.9em; background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; }
    blockquote {
      margin: 1.5em 1em;
      padding: 0.8em 1.2em;
      border-left: 3px solid #cbd5e1;
      font-style: italic;
      color: #475569;
      background-color: #f8fafc;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    blockquote p { text-indent: 0 !important; margin-bottom: 0.5em !important; font-style: normal; }
    blockquote p:last-child { margin-bottom: 0 !important; }
    hr { border: none; border-top: 1px solid #cbd5e1; margin: 2em auto; width: 35%; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 700; }
    div.illustration { text-align: center; margin: 1.5em 0; }
    div.illustration img { width: 100%; max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto; }
    @media (prefers-color-scheme: dark) {
      body { color: #e2e8f0; background-color: #0f172a; }
      blockquote { border-left-color: #475569; color: #94a3b8; background-color: #1e293b; }
      th, td { border-color: #334155; }
      th { background-color: #1e293b; }
      hr { border-top-color: #475569; }
    }
  </style>
</head>
<body>
  <section epub:type="chapter" class="chapter">
    <h1 class="chapter-title">${escapeXml(chTitle)}</h1>
    <div class="chapter-body">
      ${formattedHtml}
    </div>
  </section>
</body>
</html>`;

        const chFileName = `chapter_${String(chNum).padStart(4, '0')}.xhtml`;
        const chRelHref = chapterSubDir + chFileName;
        const chFullPath = opfDir + chRelHref;

        zip.file(chFullPath, xhtml);

        // Add to OPF manifest
        const chId = `chapter_${chNum}`;
        const itemEl = opfDoc.createElement('item');
        itemEl.setAttribute('id', chId);
        itemEl.setAttribute('href', chRelHref);
        itemEl.setAttribute('media-type', 'application/xhtml+xml');
        manifestEl.appendChild(itemEl);

        // Add to OPF spine
        const itemrefEl = opfDoc.createElement('itemref');
        itemrefEl.setAttribute('idref', chId);
        spineEl.appendChild(itemrefEl);

        // Add to EPUB 2 NCX
        if (ncxDoc) {
          const navMap = ncxDoc.querySelector('navMap');
          if (navMap) {
            const playOrder = (navMap.querySelectorAll('navPoint').length || 0) + 1;
            const np = ncxDoc.createElement('navPoint');
            np.setAttribute('id', `navPoint_${chNum}`);
            np.setAttribute('playOrder', String(playOrder));
            const nl = ncxDoc.createElement('navLabel');
            const nt = ncxDoc.createElement('text');
            nt.textContent = chTitle;
            nl.appendChild(nt);
            np.appendChild(nl);
            const cEl = ncxDoc.createElement('content');
            cEl.setAttribute('src', chRelHref);
            np.appendChild(cEl);
            navMap.appendChild(np);
          }
        }

        // Add to EPUB 3 NAV
        if (navDoc) {
          const ol = navDoc.querySelector('nav[epub\\:type="toc"] ol, nav#toc ol, nav ol');
          if (ol) {
            const li = navDoc.createElement('li');
            const a = navDoc.createElement('a');
            a.setAttribute('href', chRelHref);
            a.textContent = chTitle;
            li.appendChild(a);
            ol.appendChild(li);
          }
        }
      }

      // 6. Save modified navigation and OPF back into the zip
      // Update OPF modification timestamps so reader apps (Moon+ Reader, Calibre) invalidate cache
      const metadataEl = opfDoc.querySelector('metadata');
      if (metadataEl) {
        const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
        let modMeta = metadataEl.querySelector('meta[property="dcterms:modified"]');
        if (!modMeta) {
          modMeta = opfDoc.createElement('meta');
          modMeta.setAttribute('property', 'dcterms:modified');
          metadataEl.appendChild(modMeta);
        }
        modMeta.textContent = nowIso;

        let dateMeta = metadataEl.querySelector('dc\\:date, date');
        if (!dateMeta) {
          dateMeta = opfDoc.createElement('dc:date');
          metadataEl.appendChild(dateMeta);
        }
        dateMeta.textContent = nowIso;
      }

      const serializer = new XMLSerializer();
      zip.file(opfPath, serializer.serializeToString(opfDoc));

      if (ncxDoc && ncxPath) {
        zip.file(ncxPath, serializer.serializeToString(ncxDoc));
      }
      if (navDoc && navPath) {
        zip.file(navPath, serializer.serializeToString(navDoc));
      }

      onProgress?.('Generating updated EPUB archive…', 90);

      // 7. Generate final Blob
      const updatedBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (meta) => {
        onProgress?.(`Packaging: ${Math.round(meta.percent)}%`, Math.round(90 + (meta.percent * 0.09)));
      });

      onProgress?.('EPUB updated successfully!', 100);
      return updatedBlob;
    };

    /**
     * Sanitizes book titles, stripping branding and falling back to chapter inspection
     */
    const cleanBookTitle = (t, fallbackChs = []) => {
      let s = String(t || '').replace(/\s*[-|–—:•~]\s*(?:Novel\s*Fire(?:\.net)?|Novelfire(?:\.net)?|Lnori|Novel\s*Buddy|Lightnovelpub|Royal\s*Road)\s*$/i, '').trim();
      if (!s || s === 'Web Novel' || s === 'Lnori Series' || s === 'Lnori Book' || s === 'Novel' || s === 'NovelFire Novel') {
        const firstCh = fallbackChs?.[0]?.title || '';
        const m = firstCh.match(/^(?:Volume\s*\d+\s*[-–:]\s*)?([^–—:\n]+)/i);
        if (m && m[1] && m[1].length > 2 && !/^(cover|part|chapter)/i.test(m[1].trim())) {
          s = m[1].trim();
        }
      }
      return s || 'Web Novel';
    };

    /**
     * Sanitizes author names, stripping branding and returning clean author string or empty
     */
    const cleanBookAuthor = (a) => {
      let s = String(a || '').replace(/\s*[-|–—:•~]\s*(?:Novel\s*Fire(?:\.net)?|Novelfire(?:\.net)?|Lnori)\s*$/i, '').trim();
      if (!s || s === 'Author' || s === 'Unknown' || s === 'Lnori Author' || /^(author|unknown|lnori author)$/i.test(s)) return '';
      return s;
    };

    /**
     * Constructs standardized EPUB file names with chapter range and fixed naming support
     */
    const getEpubFileName = (title, chapterCount = 0, isPartial = false, fixedFilename = true) => {
      const sanitizeFn = (typeof window !== 'undefined' && window.sanitizeFilename) || (typeof sanitizeFilename === 'function' ? sanitizeFilename : null);
      const cleanName = (sanitizeFn ? sanitizeFn(title) : String(title || 'Novel')).replace(/\s+/g, ' ').trim();
      if (fixedFilename !== false || !isPartial) {
        return `${cleanName}.epub`;
      }
      return `${cleanName} (Ch1-${chapterCount}).epub`;
    };

    /**
     * Resolves cohesive EPUB packaging options and cover candidate from state and storage
     */
    const getEpubOptions = (extraOpts = {}, state = {}) => {
      const activeNovel = state.activeNovelView || ((state.activeCrawlSession?.chapters?.length >= (state.webImportData?.chapters?.length || 0)) ? state.activeCrawlSession : (state.webImportData || state.activeCrawlSession));
      let coverCandidate = (extraOpts && (extraOpts.coverUrl || extraOpts.cover))
        || activeNovel?.cover
        || state.activeCrawlSession?.cover
        || state.activeNovelRecord?.cover
        || (extraOpts?.isTranslation ? state.currentDocCover : '')
        || '';

      if (!coverCandidate && (extraOpts?.isTranslation || state.activeTab === 'text')) {
        if (typeof window !== 'undefined' && window.currentDocCover) {
          coverCandidate = window.currentDocCover;
        }
        if (!coverCandidate && typeof localStorage !== 'undefined') {
          try {
            coverCandidate = localStorage.getItem('gemini_current_doc_cover') || '';
          } catch (_) {}
        }
      }
      const historyList = (state && Array.isArray(state.webImportHistory))
        ? state.webImportHistory
        : (typeof localStorage !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]'); } catch (_) { return []; } })() : []);

      let matchedMeta = null;
      if (Array.isArray(historyList) && historyList.length > 0) {
        const searchTitle = extraOpts?.novelId || extraOpts?.title || state.fileName || state.currentDocTitle || '';
        if (searchTitle) {
          const cleanST = (typeof window !== 'undefined' && window.normalizeTitleKey)
            ? window.normalizeTitleKey(searchTitle)
            : String(searchTitle).replace(/\.[^/.]+$/, '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
          matchedMeta = historyList.find(n => {
            const nt = (typeof window !== 'undefined' && window.normalizeTitleKey)
              ? window.normalizeTitleKey(n?.title)
              : String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
            return nt && (nt === cleanST);
          }) || null;
          if (!coverCandidate && matchedMeta?.cover) coverCandidate = matchedMeta.cover;
        }
      }

      const getPref = (key, fallback) => {
        if (typeof localStorage !== 'undefined') {
          try {
            const val = localStorage.getItem(key);
            if (val !== null) return val;
          } catch (_) {}
        }
        return fallback;
      };

      const includeImages = state.epubIncludeImages !== undefined
        ? ((state.epubIncludeImages !== false) && (state.scrapeImages !== false))
        : (getPref('epubIncludeImages', 'true') !== 'false' && getPref('scrapeImages', 'true') !== 'false');

      const dropCaps = state.epubDropCaps !== undefined ? !!state.epubDropCaps : (getPref('epubDropCaps', 'true') !== 'false');
      const smartQuotes = state.epubSmartQuotes !== undefined ? !!state.epubSmartQuotes : (getPref('epubSmartQuotes', 'true') !== 'false');
      const cleanWebArtifacts = state.epubCleanWebArtifacts !== undefined ? !!state.epubCleanWebArtifacts : (getPref('epubCleanWebArtifacts', 'true') !== 'false');
      const fontTheme = state.epubFontTheme !== undefined ? state.epubFontTheme : getPref('epubFontTheme', 'literata');
      const justifyText = state.epubJustifyText !== undefined ? !!state.epubJustifyText : (getPref('epubJustifyText', 'true') !== 'false');
      const fixedFilename = state.epubFixedFilename !== undefined ? (state.epubFixedFilename !== false) : (getPref('epubFixedFilename', 'true') !== 'false');

      let sourceUrl = extraOpts?.sourceUrl || extraOpts?.url || state?.activeNovelRecord?.sourceUrl || state?.activeCrawlSession?.sourceUrl || state?.webImportData?.sourceUrl || '';
      let sources = extraOpts?.sources || state?.activeNovelRecord?.sources || state?.activeCrawlSession?.sources || state?.webImportData?.sources || [];
      let novelId = extraOpts?.novelId || extraOpts?.id || state?.activeNovelRecord?.id || state?.activeCrawlSession?.id || '';

      if (matchedMeta) {
        if (!sourceUrl && (matchedMeta.sourceUrl || matchedMeta.url)) sourceUrl = matchedMeta.sourceUrl || matchedMeta.url;
        if ((!sources || !sources.length) && Array.isArray(matchedMeta.sources)) sources = matchedMeta.sources;
        if (!novelId && matchedMeta.id) novelId = matchedMeta.id;
      }
      if (!sources.length && sourceUrl) {
        sources = [{ url: sourceUrl, label: 'Original Source', active: true }];
      }

      const cleanExtra = { ...extraOpts };
      if (!cleanExtra.coverUrl) delete cleanExtra.coverUrl;
      if (!cleanExtra.cover) delete cleanExtra.cover;

      return {
        includeImages,
        dropCaps,
        smartQuotes,
        cleanWebArtifacts,
        fontTheme,
        justifyText,
        fixedFilename,
        sourceUrl,
        sources,
        novelId,
        ...cleanExtra,
        coverUrl: cleanExtra.coverUrl || coverCandidate
      };
    };

    async function generateCoverDataUrl(title, author) {
      const svg = generateDefaultCoverSvg(title, author);
      if (typeof rasterizeSvgToJpegBuffer === 'function') {
        try {
          const jpgBuf = await rasterizeSvgToJpegBuffer(svg);
          if (jpgBuf && typeof btoa !== 'undefined') {
            const bytes = new Uint8Array(jpgBuf);
            let binary = '';
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            return 'data:image/jpeg;base64,' + btoa(binary);
          }
        } catch (_) {}
      }
      // Universal fallback: base64 SVG data URI
      const b64 = (typeof btoa !== 'undefined')
        ? btoa(unescape(encodeURIComponent(svg)))
        : (typeof Buffer !== 'undefined' ? Buffer.from(svg).toString('base64') : '');
      return 'data:image/svg+xml;base64,' + b64;
    }

    window.cleanBookTitle = cleanBookTitle;
    window.cleanBookAuthor = cleanBookAuthor;
    window.getEpubFileName = getEpubFileName;
    window.getEpubOptions = getEpubOptions;
    window.updateOriginalEpubNavigation = updateOriginalEpubNavigation;
    window.generateEpubFromChapters = generateEpubFromChapters;
    window.appendChaptersToExistingEpub = appendChaptersToExistingEpub;
    window.generateDefaultCoverSvg = generateDefaultCoverSvg;
    window.generateCoverDataUrl = generateCoverDataUrl;

    const EpubEngine = {
      cleanBookTitle,
      cleanBookAuthor,
      cleanChapterTitle: (typeof window !== 'undefined' && window.cleanChapterTitle) || (t => t),
      getEpubFileName,
      getEpubOptions,
      smartFormat,
      formatChapterBodyToHtml,
      generateEpubFromChapters,
      appendChaptersToExistingEpub,
      updateOriginalEpubNavigation,
      generateDefaultCoverSvg,
      generateCoverDataUrl
    };
    window.EpubEngine = EpubEngine;

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = EpubEngine;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
