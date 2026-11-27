(function (root) {
  'use strict';

  // ── Reading Progress Persistence (Moon+ Reader standard) ──
  function getReadingProgressMap() {
    try {
      const raw = localStorage.getItem('gemini_reading_progress');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function getReadingProgress(key) {
    if (!key) return null;
    const map = getReadingProgressMap();
    if (map[String(key)]) return map[String(key)];
    return (typeof window !== 'undefined' && window.MoonReaderEngine?.PositionBridge?.getPositionFromPo)
      ? window.MoonReaderEngine.PositionBridge.getPositionFromPo(key)
      : null;
  }

  function saveReadingProgress(key, chapterIdx, scrollTop, pct) {
    if (!key || (typeof localStorage !== 'undefined' && localStorage.getItem('incognitoMode') === 'true')) return;
    try {
      const map = getReadingProgressMap();
      map[String(key)] = {
        chapterIdx: typeof chapterIdx === 'number' ? chapterIdx : 0,
        scrollTop: typeof scrollTop === 'number' ? Math.round(scrollTop) : 0,
        pct: typeof pct === 'number' ? Math.round(pct * 10) / 10 : 0,
        updatedAt: Date.now()
      };
      localStorage.setItem('gemini_reading_progress', JSON.stringify(map));
      if (typeof window !== 'undefined') {
        window.MoonReaderEngine?.PositionBridge?.savePositionToPo?.(key, { chapterIdx, scrollTop, pct });
      }
    } catch (e) {
      console.warn('saveReadingProgress error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.getReadingProgress = getReadingProgress;
    window.saveReadingProgress = saveReadingProgress;
  }

  // ── Calibre CSS & Script Cleaning (Chimanew standard) ──
  function sanitizeCalibreRawText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw.replace(/<script\b[^>]*?(?:\/>|>[\s\S]*?<\/script\s*>)/gi, '');
    s = s.replace(/style=["']([^"']*)["']/gi, (match, styleContent) => {
      const cleaned = styleContent
        .replace(/text-indent\s*:\s*-[^;]+/gi, 'text-indent: 0')
        .replace(/(?:^|[;{])\s*line-height\s*:\s*[^;]+;?/gi, '');
      return `style="${cleaned}"`;
    });
    return s;
  }

  // ── Chapter Model LRU Cache & Parser (Chimanew prefetchAround parity) ──
  const _parsedChapterCache = new Map();
  const MAX_PARSED_CACHE_SIZE = 8;

  function parseChapterModel(chapter) {
    if (!chapter) return [new Map(), []];
    let raw = chapter.text || chapter.content || '';
    if (!raw) return [new Map(), []];
    const cacheKey = (chapter.id ? String(chapter.id) : '') + '_' + (chapter.title || '') + '_' + raw.length + '_' + (chapter._isPronounSwapped ? 's' : 'o');
    if (_parsedChapterCache.has(cacheKey)) {
      return _parsedChapterCache.get(cacheKey);
    }

    raw = sanitizeCalibreRawText(raw);
    const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
    if (typeof stripFn === 'function' && chapter.title) {
      raw = stripFn(raw, chapter.title, chapter.originalTitle);
    }

    const map = new Map();
    let mainText = raw;

    const fnHeaderMatch = raw.match(/(?:---\s*FOOTNOTES\s*---|===+\s*FOOTNOTES\s*===+)[\s\S]*$/i);
    if (fnHeaderMatch) {
      const fnBlock = fnHeaderMatch[0];
      mainText = raw.slice(0, fnHeaderMatch.index).trim();
      const defRegex = /\[([¹²³⁴⁵⁶⁷⁸⁹⁰]+|\d+)(?:\s*(?:Note|note)?\s*[:：]|\s+Note[:：]?)\s*([\s\S]*?)(?=(?:\[[¹²³⁴⁵⁶⁷⁸⁹⁰\d]+|$))/gi;
      let m;
      while ((m = defRegex.exec(fnBlock)) !== null) {
        const num = m[1].trim();
        const note = m[2].replace(/\n+/g, ' ').trim();
        if (num && note) map.set(num, note);
      }
    }

    const trailingDefRegex = /(?:^|\n)\[([¹²³⁴⁵⁶⁷⁸⁹⁰]+|\d+)\s+(?:Note|note)[:：]\s*([^\n]+)\]/gi;
    let tm;
    while ((tm = trailingDefRegex.exec(mainText)) !== null) {
      map.set(tm[1].trim(), tm[2].trim());
    }
    mainText = mainText.replace(trailingDefRegex, '').trim();

    const lines = mainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const elems = [];
    let elIdx = 0;
    let hasEncounteredParagraph = false;
    const chTitle = chapter.title || '';
    const origTitle = chapter.originalTitle || '';
    const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;

    const dividerRe = /^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:\u2726[\s\u00A0]*){2,}|(?:\u2605[\s\u00A0]*){2,}|(?:\u2606[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/;

    for (let li = 0; li < lines.length; li++) {
      let rawLine = lines[li];
      if (typeof isAiRefusal === 'function' ? isAiRefusal(rawLine) : (typeof window !== 'undefined' && window.isAiRefusal ? window.isAiRefusal(rawLine) : false)) {
        continue;
      }
      const centerImgWrap = rawLine.match(/^(?:\[(?:center|right)\]|<center>|<p\s+class="(?:text-center|text-right)">)\s*(!\[.*?\]\([^\)]+\)|<img\b[^>]*>)\s*(?:\[\/(?:center|right)\]|<\/center>|<\/p>)?$/i);
      if (centerImgWrap) {
        rawLine = centerImgWrap[1].trim();
      }

      const mdImg = rawLine.match(/^!\[(.*?)\]\(([^\)]+)\)\s*$/i);
      if (mdImg) {
        elems.push({ type: 'image', alt: mdImg[1] || 'Illustration', src: mdImg[2].trim(), id: `p_${elIdx++}` });
        continue;
      }
      const htmlImg = rawLine.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>\s*$/i);
      if (htmlImg) {
        const altM = rawLine.match(/alt=["']([^"']+)["']/i);
        elems.push({ type: 'image', alt: altM ? altM[1] : 'Illustration', src: htmlImg[1].trim(), id: `p_${elIdx++}` });
        continue;
      }
      if (/!\[.*?\]\([^\)]+\)/i.test(rawLine)) {
        const parts = rawLine.split(/(!\[.*?\]\([^\)]+\))/gi);
        for (const part of parts) {
          const pTrim = part.trim();
          if (!pTrim) continue;
          const subMd = pTrim.match(/^!\[(.*?)\]\(([^\)]+)\)$/i);
          if (subMd) {
            elems.push({ type: 'image', alt: subMd[1] || 'Illustration', src: subMd[2].trim(), id: `p_${elIdx++}` });
          } else {
            elems.push({ type: 'text', content: pTrim, id: `p_${elIdx++}` });
          }
        }
        hasEncounteredParagraph = true;
        continue;
      }

      const centerM = rawLine.match(/^(?:\[center\]|<center>|<p\s+class="text-center">)([\s\S]*?)(?:\[\/center\]|<\/center>|<\/p>)?$/i)
                   || rawLine.match(/^([\s\S]*?)\[\/center\]$/i);
      if (centerM) {
        const inner = (centerM[1] || '').replace(/\[\/?center\]/gi, '').trim();
        if (!hasEncounteredParagraph && typeof checkTitleEcho === 'function' && checkTitleEcho(inner, chTitle, origTitle)) {
          continue;
        }
        if (dividerRe.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
          elems.push({ type: 'divider', id: `p_${elIdx++}` });
        } else {
          elems.push({ type: 'center', content: inner, id: `p_${elIdx++}` });
          hasEncounteredParagraph = true;
        }
        continue;
      }

      const rightM = rawLine.match(/^(?:\[right\]|<p\s+class="text-right">)([\s\S]*?)(?:\[\/right\]|<\/p>)?$/i)
                  || rawLine.match(/^([\s\S]*?)\[\/right\]$/i);
      if (rightM) {
        const inner = (rightM[1] || '').replace(/\[\/?right\]/gi, '').trim();
        if (dividerRe.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
          elems.push({ type: 'divider', id: `p_${elIdx++}` });
        } else {
          elems.push({ type: 'right', content: inner, id: `p_${elIdx++}` });
          hasEncounteredParagraph = true;
        }
        continue;
      }

      if (dividerRe.test(rawLine) || rawLine === '---' || rawLine === '***' || rawLine === '___' || rawLine === '===') {
        elems.push({ type: 'divider', id: `p_${elIdx++}` });
        continue;
      }

      if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
        const tableLines = [rawLine];
        while (li + 1 < lines.length && lines[li + 1].startsWith('|') && lines[li + 1].endsWith('|')) {
          li++;
          tableLines.push(lines[li]);
        }
        const rows = tableLines.filter(l => !/^[\|\s\-:]+$/.test(l));
        if (rows.length > 0) {
          elems.push({ type: 'table', rows, id: `p_${elIdx++}` });
          hasEncounteredParagraph = true;
          continue;
        }
      }

      if (rawLine.startsWith("> **Author's Note:**") || rawLine.startsWith("> Author's Note:")) {
        const noteLines = [rawLine.replace(/^>\s*/, '')];
        while (li + 1 < lines.length && lines[li + 1].startsWith('>')) {
          li++;
          noteLines.push(lines[li].replace(/^>\s*/, ''));
        }
        elems.push({ type: 'author-note', content: noteLines.join('\n'), id: `p_${elIdx++}` });
        hasEncounteredParagraph = true;
        continue;
      }

      if (rawLine.startsWith('>')) {
        const bqLines = [rawLine.replace(/^>\s*/, '')];
        while (li + 1 < lines.length && lines[li + 1].startsWith('>') && !lines[li + 1].startsWith("> **Author's Note:")) {
          li++;
          bqLines.push(lines[li].replace(/^>\s*/, ''));
        }
        elems.push({ type: 'blockquote', content: bqLines.join('\n'), id: `p_${elIdx++}` });
        hasEncounteredParagraph = true;
        continue;
      }

      if (!hasEncounteredParagraph && typeof checkTitleEcho === 'function' && checkTitleEcho(rawLine, chTitle, origTitle)) {
        continue;
      }

      elems.push({ type: 'text', content: rawLine, id: `p_${elIdx++}` });
      hasEncounteredParagraph = true;
    }

    const parsedResult = [map, elems];
    if (_parsedChapterCache.size >= MAX_PARSED_CACHE_SIZE) {
      const firstKey = _parsedChapterCache.keys().next().value;
      _parsedChapterCache.delete(firstKey);
    }
    _parsedChapterCache.set(cacheKey, parsedResult);
    return parsedResult;
  }

  root.ReaderHelpers = {
    getReadingProgressMap,
    getReadingProgress,
    saveReadingProgress,
    sanitizeCalibreRawText,
    parseChapterModel
  };
})(typeof window !== 'undefined' ? window : globalThis);
