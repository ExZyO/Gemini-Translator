/**
 * Gemini Translator - Pro Reader Engine (v8.11.4)
 * Complete Ground-Up Rebuild:
 *  - Native Touch & Scroll Architecture (Zero blocking tap overlays)
 *  - Responsive Dual Modes: Continuous Webtoon Scroll & Paginated Book Flip
 *  - Hierarchical Arc & Volume Table of Contents (Per-Arc collapsible accordions)
 *  - Non-Jumping Web Speech TTS Engine with sentence tracking
 *  - Hands-Free Auto-Scroll with floating speed controller (0.5x - 4.0x)
 *  - 7 Pristine Themes (AMOLED Pitch Black, Slate Dark, Nord Frost, Warm Sepia, Antique Parchment, Mint Sage, Clean White)
 *  - Comprehensive Typography: Serif, Sans, Mono, OpenDyslexic, Margins, Spacing, Justify, Indent
 *  - In-Chapter Search with Match Stepper & Highlight
 *  - Tap-to-Zoom Fullscreen Illustration Lightbox
 *  - Full Keyboard Navigation (Arrows, Space, J/K, Escape, F for Fullscreen)
 */
(function(window) {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const h = React.createElement;
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  // ══════════════════════════════════════════════════════════════════════
  // INLINE STYLES FOR CRISP, RESPONSIVE READER
  // ══════════════════════════════════════════════════════════════════════
  const ensureStyles = (typeof window !== 'undefined' && window.ensureReaderStyles) ? window.ensureReaderStyles : function() {};

  const decodeEntities = (typeof window !== 'undefined' && window.decodeEntities) ? window.decodeEntities : (str => str || '');
  const swapPronouns = (typeof window !== 'undefined' && window.swapPronouns) ? window.swapPronouns : (str => str);

  // ── Reading Progress Persistence (Moon+ Reader standard) ──
  const getReadingProgressMap = () => {
    try { const raw = localStorage.getItem('gemini_reading_progress'); return raw ? JSON.parse(raw) : {}; } catch (_) { return {}; }
  };

  const getReadingProgress = (key) => {
    if (!key) return null;
    const map = getReadingProgressMap();
    if (map[String(key)]) return map[String(key)];
    return window.MoonReaderEngine?.PositionBridge?.getPositionFromPo ? window.MoonReaderEngine.PositionBridge.getPositionFromPo(key) : null;
  };

  const saveReadingProgress = (key, chapterIdx, scrollTop, pct) => {
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
      window.MoonReaderEngine?.PositionBridge?.savePositionToPo?.(key, { chapterIdx, scrollTop, pct });
    } catch (e) { console.warn('saveReadingProgress error:', e); }
  };

  window.getReadingProgress = getReadingProgress;
  window.saveReadingProgress = saveReadingProgress;

  // ── Calibre CSS & Script Cleaning (Chimanew standard) ──
  function sanitizeCalibreRawText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw.replace(/<script\b[^>]*?(?:\/>|>[\s\S]*?<\/script\s*>)/gi, '');
    s = s.replace(/style=["']([^"']*)["']/gi, (match, styleContent) => {
      let cleaned = styleContent
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
        if (!hasEncounteredParagraph && typeof checkTitleEcho === 'function') {
          if (checkTitleEcho(inner, chTitle, origTitle)) {
            continue;
          }
        }
        if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:\u2726[\s\u00A0]*){2,}|(?:\u2605[\s\u00A0]*){2,}|(?:\u2606[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
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
        if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:\u2726[\s\u00A0]*){2,}|(?:\u2605[\s\u00A0]*){2,}|(?:\u2606[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(inner) || inner === '---' || inner === '***' || inner === '___' || inner === '===') {
          elems.push({ type: 'divider', id: `p_${elIdx++}` });
        } else {
          elems.push({ type: 'right', content: inner, id: `p_${elIdx++}` });
          hasEncounteredParagraph = true;
        }
        continue;
      }

      if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:\u2726[\s\u00A0]*){2,}|(?:\u2605[\s\u00A0]*){2,}|(?:\u2606[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(rawLine) || rawLine === '---' || rawLine === '***' || rawLine === '___' || rawLine === '===') {
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

      if (rawLine.startsWith('> **Author\'s Note:**') || rawLine.startsWith('> Author\'s Note:')) {
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
        while (li + 1 < lines.length && lines[li + 1].startsWith('>') && !lines[li + 1].startsWith('> **Author\'s Note:')) {
          li++;
          bqLines.push(lines[li].replace(/^>\s*/, ''));
        }
        elems.push({ type: 'blockquote', content: bqLines.join('\n'), id: `p_${elIdx++}` });
        hasEncounteredParagraph = true;
        continue;
      }

      if (!hasEncounteredParagraph && typeof checkTitleEcho === 'function') {
        if (checkTitleEcho(rawLine, chTitle, origTitle)) {
          continue;
        }
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

  const MoonReaderModal = ({
    open,
    onClose,
    text,
    chapters,
    onChaptersChange,
    currentIdx,
    onChapterChange,
    theme = 'dark',
    setTheme,
    font = 'serif',
    setFont,
    fontSize = 18,
    setFontSize,
    tgtLang,
    novelId,
    novelTitle,
    bookTitle: propBookTitle,
    onVerifyConsistency,
    onOpenHealthAudit,
    onOpenDiff,
    onTranslateChapter,
    onExportEpub,
    activeNovelRecord,
    appSettings = {}
  }) => {
    if (!open) return null;
    const bookTitle = novelTitle || propBookTitle || '';
    ensureStyles();

    // ── 1. Chapter Normalization with Arc / Volume Hierarchy Detection ──
    const safeChapters = useMemo(() => {
      let list = Array.isArray(chapters) && chapters.length > 0
        ? chapters.filter(c => c && typeof c === 'object').map(c => ({
            title: (typeof window !== 'undefined' && window.cleanRawChapterTitle) ? window.cleanRawChapterTitle(decodeEntities(c.title || 'Chapter')) : decodeEntities(c.title || 'Chapter'),
            text: c.content || c.text || '',
            content: c.content || c.text || '',
            originalTitle: c.originalTitle || '',
            arc: c.arc || c.volume || '',
            volume: c.volume || c.arc || ''
          }))
        : [];

      if (list.length === 0 && text && typeof text === 'string') {
        const lines = text.split(/\r?\n/);
        const isHeading = (l) => /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+|\d+[\.\s]+|\#+\s+)/i.test(l.trim());
        let curTitle = 'Chapter 1';
        let curLines = [];
        for (const line of lines) {
          if (isHeading(line) && curLines.length > 0) {
            list.push({ title: decodeEntities(curTitle), text: curLines.join('\n'), content: curLines.join('\n'), arc: '', volume: '' });
            curTitle = line.trim();
            curLines = [];
          } else {
            curLines.push(line);
          }
        }
        if (curLines.length > 0) {
          list.push({ title: decodeEntities(curTitle), text: curLines.join('\n'), content: curLines.join('\n'), arc: '', volume: '' });
        }
      }

      if (list.length === 0) {
        list = [{ title: 'Chapter 1', text: text || 'No text loaded.', content: text || 'No text loaded.', arc: '', volume: '' }];
      }
      return list;
    }, [chapters, text]);

    // Active Novel Key for Reading Progress
    const activeNovelKey = novelId || novelTitle || (safeChapters?.[0]?.title ? 'novel_' + safeChapters[0].title.slice(0, 30) : 'current_session');

    // Initial Progress Lookup
    const initialSavedProgress = useMemo(() => {
      if (!open) return null;
      return getReadingProgress(activeNovelKey);
    }, [open, activeNovelKey]);

    // Active Chapter
    const [activeIdx, setActiveIdx] = useState(() => {
      if (typeof currentIdx === 'number' && currentIdx >= 0) return currentIdx;
      if (initialSavedProgress && typeof initialSavedProgress.chapterIdx === 'number') {
        return initialSavedProgress.chapterIdx;
      }
      return 0;
    });

    const [scrubberIdx, setScrubberIdx] = useState(activeIdx);
    const [isScrubbing, setIsScrubbing] = useState(false);

    useEffect(() => {
      if (!isScrubbing) {
        setScrubberIdx(activeIdx);
      }
    }, [activeIdx, isScrubbing]);

    useEffect(() => {
      if (typeof currentIdx === 'number' && currentIdx >= 0 && currentIdx !== activeIdx) {
        setActiveIdx(currentIdx);
      }
    }, [currentIdx]);

    // Immersive Fullscreen Mode (hides Android status bar / phone top bar while reading)
    useEffect(() => {
      if (open) {
        if (window.NativeBridge && typeof window.NativeBridge.setImmersiveMode === 'function') {
          window.NativeBridge.setImmersiveMode(true);
        }
      }
      return () => {
        if (window.NativeBridge && typeof window.NativeBridge.setImmersiveMode === 'function') {
          window.NativeBridge.setImmersiveMode(false);
        }
      };
    }, [open]);

    const pendingScrollTargetRef = useRef(null);
    const scrollRestoredRef = useRef(false);

    const changeChapter = useCallback((newIdx, options = {}) => {
      if (newIdx < 0 || newIdx >= safeChapters.length) return;
      if (typeof options.targetScrollTop === 'number' || typeof options.targetPct === 'number') {
        pendingScrollTargetRef.current = {
          type: 'custom',
          scrollTop: options.targetScrollTop,
          pct: options.targetPct
        };
      } else {
        const isBackward = typeof options.scrollToBottom === 'boolean'
          ? options.scrollToBottom
          : (newIdx < activeIdx);
        pendingScrollTargetRef.current = isBackward ? 'bottom' : 'top';
      }
      setActiveIdx(newIdx);
      if (typeof onChapterChange === 'function') onChapterChange(newIdx);
    }, [safeChapters.length, onChapterChange, activeIdx]);

    useEffect(() => {
      scrollRestoredRef.current = false;
    }, [activeNovelKey]);

    // Position Restoration on Chapter Switch (Consolidated layout pass with zero judder)
    useEffect(() => {
      const container = document.getElementById('gemini-reader-scroll-area');
      if (!container) return;
      const target = pendingScrollTargetRef.current;
      if (target) {
        pendingScrollTargetRef.current = null;
        scrollRestoredRef.current = true;
        const setPos = () => {
          if (!container) return;
          if (target === 'bottom') {
            const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
            container.scrollTop = maxScroll;
            saveReadingProgress(activeNovelKey, activeIdx, maxScroll, 100);
          } else if (target === 'top') {
            container.scrollTop = 0;
            saveReadingProgress(activeNovelKey, activeIdx, 0, 0);
          } else if (typeof target === 'object' && target.type === 'custom') {
            const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
            const targetTop = typeof target.scrollTop === 'number'
              ? target.scrollTop
              : (typeof target.pct === 'number' ? (target.pct / 100) * maxScroll : 0);
            container.scrollTop = targetTop;
            saveReadingProgress(activeNovelKey, activeIdx, targetTop, target.pct || 0);
          }
        };
        setPos();
        requestAnimationFrame(setPos);
        setTimeout(setPos, 60);
        return;
      }

      if (!scrollRestoredRef.current && open) {
        const prog = getReadingProgress(activeNovelKey);
        if (prog && prog.chapterIdx === activeIdx && prog.scrollTop > 0) {
          scrollRestoredRef.current = true;
          requestAnimationFrame(() => { if (container) container.scrollTop = prog.scrollTop; });
        }
      }
    }, [activeIdx, activeNovelKey, open]);

    // Debounced Scroll Persistence & Auto-Scroll Subpixel Accumulator (Chimanew 2.5s persistence pulse)
    const [chapterScrollPct, setChapterScrollPct] = useState(() => initialSavedProgress?.pct || 0);
    const saveScrollTimeoutRef = useRef(null);
    const lastScrollSaveTimeRef = useRef(0);
    const scrollAccumulatorRef = useRef(0);
    const handleScroll = useCallback((e) => {
      const el = e.currentTarget;
      if (!el) return;
      scrollAccumulatorRef.current = el.scrollTop || 0;
      const top = el.scrollTop || 0;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? (top / scrollHeight) * 100 : 0;
      setChapterScrollPct(Math.round(pct * 10) / 10);
      const now = Date.now();
      if (!lastScrollSaveTimeRef.current || now - lastScrollSaveTimeRef.current > 2500) {
        lastScrollSaveTimeRef.current = now;
        saveReadingProgress(activeNovelKey, activeIdx, top, pct);
      } else {
        if (saveScrollTimeoutRef.current) clearTimeout(saveScrollTimeoutRef.current);
        saveScrollTimeoutRef.current = setTimeout(() => {
          lastScrollSaveTimeRef.current = Date.now();
          saveReadingProgress(activeNovelKey, activeIdx, top, pct);
        }, 800);
      }
    }, [activeNovelKey, activeIdx]);

    // Moon+ Reader Vertical Scroll Pull-to-Next & Prev Chapter Gestures
    const scrollGestures = useMemo(() => {
      if (typeof window.MoonReaderEngine?.SwipeHandler?.createGestureTracker !== 'function') return null;
      return window.MoonReaderEngine.SwipeHandler.createGestureTracker({
        onNextChapter: () => changeChapter(activeIdx + 1, { scrollToBottom: false }),
        onPrevChapter: () => changeChapter(activeIdx - 1, { scrollToBottom: true }),
        canGoNext: activeIdx < safeChapters.length - 1,
        canGoPrev: activeIdx > 0
      });
    }, [activeIdx, safeChapters.length, changeChapter]);

    // ── 2. UI Chrome & Menus ──
    const [hudVisible, setHudVisible] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [tocTab, setTocTab] = useState('chapters');
    const [tocBmFilter, setTocBmFilter] = useState('all');
    const [tocSearch, setTocSearch] = useState('');
    const activeTocItemRef = useRef(null);
    useEffect(() => {
      if (showToc && activeTocItemRef.current) {
        const timer = setTimeout(() => {
          activeTocItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 120);
        return () => clearTimeout(timer);
      }
    }, [showToc, activeIdx]);
    const [showSettings, setShowSettings] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const [lightboxImg, setLightboxImg] = useState(null);

    // Reading preferences
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('gemini_reader_mode') || 'scroll');
    const [contentWidth, setContentWidth] = useState(() => localStorage.getItem('gemini_reader_width') || 'standard');
    const [lineHeight, setLineHeight] = useState(() => parseFloat(localStorage.getItem('gemini_reader_lineheight')) || 1.8);
    const [paragraphIndent, setParagraphIndent] = useState(() => localStorage.getItem('gemini_reader_indent') === 'true');
    const [justify, setJustify] = useState(() => localStorage.getItem('readerJustify') !== 'false');
    const [moonStatusBar, setMoonStatusBar] = useState(() => localStorage.getItem('gemini_moon_status_bar') !== 'false');

    useEffect(() => { localStorage.setItem('gemini_reader_mode', viewMode); }, [viewMode]);
    useEffect(() => { localStorage.setItem('gemini_reader_width', contentWidth); }, [contentWidth]);
    useEffect(() => { localStorage.setItem('gemini_reader_lineheight', String(lineHeight)); }, [lineHeight]);
    useEffect(() => { localStorage.setItem('gemini_reader_indent', String(paragraphIndent)); }, [paragraphIndent]);
    useEffect(() => { localStorage.setItem('readerJustify', String(justify)); }, [justify]);
    useEffect(() => { localStorage.setItem('gemini_moon_status_bar', String(moonStatusBar)); }, [moonStatusBar]);

    // Auto-Scroll Engine (Subpixel Precision & Chapter Auto-Advance)
    const [autoScroll, setAutoScroll] = useState(false);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(1.0);
    const autoScrollRaf = useRef(null);
    const autoScrollSpeedRef = useRef(1.0);

    useEffect(() => {
      autoScrollSpeedRef.current = autoScrollSpeed;
    }, [autoScrollSpeed]);

    useEffect(() => {
      if (!autoScroll) {
        if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
        return;
      }

      // If user starts auto-scroll in paginated mode, switch to continuous scroll
      if (viewMode === 'paginated') {
        setViewMode('scroll');
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Switched to continuous scroll mode for Auto-Scroll.', 'info');
        }
      }

      const container = document.getElementById('gemini-reader-scroll-area');
      if (container) {
        scrollAccumulatorRef.current = container.scrollTop;
      }

      let lastTime = performance.now();
      const step = (time) => {
        const delta = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        const c = document.getElementById('gemini-reader-scroll-area');
        if (c) {
          // Base speed: 60px/sec at 1.0x (comfortable reading pace)
          const pxToScroll = autoScrollSpeedRef.current * 60 * delta;
          scrollAccumulatorRef.current += pxToScroll;
          c.scrollTop = Math.round(scrollAccumulatorRef.current);

          // Check if bottom of chapter reached
          if (c.scrollTop + c.clientHeight >= c.scrollHeight - 10) {
            if (activeIdx < safeChapters.length - 1) {
              if (typeof window !== 'undefined' && window.toast) {
                window.toast(`Auto-scrolling to Chapter ${activeIdx + 2}...`, 'info');
              }
              changeChapter(activeIdx + 1);
              scrollAccumulatorRef.current = 0;
            } else {
              setAutoScroll(false);
              if (typeof window !== 'undefined' && window.toast) {
                window.toast('Finished reading book. Auto-scroll stopped.', 'success');
              }
              return;
            }
          }
        }
        autoScrollRaf.current = requestAnimationFrame(step);
      };
      autoScrollRaf.current = requestAnimationFrame(step);
      return () => {
        if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
      };
    }, [autoScroll, viewMode, activeIdx, safeChapters.length, changeChapter]);

    const currentChapter = safeChapters[activeIdx] || safeChapters[0];
    const [renderTick, setRenderTick] = useState(0);

    const handleSwapPronounsCurrentChapter = useCallback(() => {
      const raw = currentChapter?.text || currentChapter?.content || '';
      if (!currentChapter || !raw.trim()) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('No text in current chapter to swap pronouns.', 'info');
        }
        return;
      }
      if (currentChapter._isPronounSwapped && currentChapter._originalText) {
        // Revert cleanly to original text
        currentChapter.text = currentChapter._originalText;
        currentChapter.content = currentChapter._originalText;
        currentChapter._isPronounSwapped = false;
        if (Array.isArray(chapters) && chapters[activeIdx]) {
          chapters[activeIdx].text = currentChapter._originalText;
          chapters[activeIdx].content = currentChapter._originalText;
          chapters[activeIdx]._isPronounSwapped = false;
        }
        setRenderTick(t => t + 1);
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Restored original pronouns for this chapter.', 'info');
        }
        return;
      }

      if (!currentChapter._originalText) {
        currentChapter._originalText = raw;
      }
      const swapped = swapPronouns(raw);
      currentChapter.text = swapped;
      currentChapter.content = swapped;
      currentChapter._isPronounSwapped = true;

      // Also persist to parent chapters array if available
      if (Array.isArray(chapters) && chapters[activeIdx]) {
        if (!chapters[activeIdx]._originalText) chapters[activeIdx]._originalText = raw;
        chapters[activeIdx].text = swapped;
        chapters[activeIdx].content = swapped;
        chapters[activeIdx]._isPronounSwapped = true;
      }

      setRenderTick(t => t + 1);
      if (typeof window !== 'undefined' && window.toast) {
        window.toast('Swapped He ↔ She pronouns across current chapter!', 'success');
      }
    }, [currentChapter, chapters, activeIdx]);

    const [isTranslatingCurrentChapter, setIsTranslatingCurrentChapter] = useState(false);
    const [isTranslatingTitles, setIsTranslatingTitles] = useState(false);
    const [titlesProgress, setTitlesProgress] = useState({ done: 0, total: 0 });
    const [isHealingAll, setIsHealingAll] = useState(false);
    const [healAllProgress, setHealAllProgress] = useState({ done: 0, total: 0 });
    const [isTranslationPaused, setIsTranslationPaused] = useState(false);
    const [chapterTranslateProgress, setChapterTranslateProgress] = useState({ pct: 0, msg: '' });
    const [suiteModalChap, setSuiteModalChap] = useState(null);
    const [isLiveDashboardOpen, setIsLiveDashboardOpen] = useState(false);
    const [liveStreamText, setLiveStreamText] = useState('');
    const [liveHealingBlocks, setLiveHealingBlocks] = useState([]);
    const [translationElapsedSec, setTranslationElapsedSec] = useState(0);
    const [activeTranslationMode, setActiveTranslationMode] = useState(null);
    const [chunkProgress, setChunkProgress] = useState({ current: 1, total: 1 });
    const translationAbortRef = useRef(null);
    const translationTimerRef = useRef(null);
    const streamBufferRef = useRef('');
    const throttleTimerRef = useRef(null);
    const isLiveDashboardOpenRef = useRef(false);
    const pauseResolverRef = useRef(null);

    useEffect(() => {
      isLiveDashboardOpenRef.current = isLiveDashboardOpen;
    }, [isLiveDashboardOpen]);

    const pauseGate = useMemo(() => ({
      checkPause: async () => {
        if (pauseResolverRef.current) {
          await pauseResolverRef.current.promise;
        }
      }
    }), []);

    const handleTogglePause = useCallback(() => {
      if (!isTranslationPaused) {
        let resolve;
        const promise = new Promise(r => { resolve = r; });
        pauseResolverRef.current = { promise, resolve };
        setIsTranslationPaused(true);
        if (typeof window !== 'undefined' && window.NativeBridge?.releaseWakeLock) {
          window.NativeBridge.releaseWakeLock();
        }
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation paused at chunk boundary. Screen wake lock released.', 'info');
        }
      } else {
        if (pauseResolverRef.current) {
          pauseResolverRef.current.resolve();
          pauseResolverRef.current = null;
        }
        setIsTranslationPaused(false);
        if (typeof window !== 'undefined' && window.NativeBridge?.acquireWakeLock) {
          window.NativeBridge.acquireWakeLock();
        }
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation resumed.', 'info');
        }
      }
    }, [isTranslationPaused]);

    // Translation elapsed timer effect
    useEffect(() => {
      const isAnyRunning = isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll;
      if (isAnyRunning) {
        if (!translationTimerRef.current) {
          setTranslationElapsedSec(0);
          translationTimerRef.current = setInterval(() => {
            setTranslationElapsedSec(s => s + 1);
          }, 1000);
        }
      } else {
        if (translationTimerRef.current) {
          clearInterval(translationTimerRef.current);
          translationTimerRef.current = null;
        }
      }
      return () => {
        if (translationTimerRef.current) {
          clearInterval(translationTimerRef.current);
          translationTimerRef.current = null;
        }
      };
    }, [isTranslatingCurrentChapter, isTranslatingTitles, isHealingAll]);

    // Instant Stop Handler for all translation operations
    const handleStopChapterTranslation = useCallback(() => {
      if (pauseResolverRef.current) {
        try { pauseResolverRef.current.resolve(); } catch (_) {}
        pauseResolverRef.current = null;
      }
      setIsTranslationPaused(false);
      if (translationAbortRef.current) {
        try { translationAbortRef.current.abort(); } catch (_) {}
        translationAbortRef.current = null;
      }
      if (translationTimerRef.current) {
        clearInterval(translationTimerRef.current);
        translationTimerRef.current = null;
      }
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      setIsTranslatingCurrentChapter(false);
      setIsTranslatingTitles(false);
      setIsHealingAll(false);
      setActiveTranslationMode(null);
      if (typeof window !== 'undefined' && window.NativeBridge) {
        try { window.NativeBridge.releaseWakeLock?.(); window.NativeBridge.clearProgressNotification?.(false); } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.toast) {
        window.toast('Translation process stopped.', 'info');
      }
    }, []);

    const handleTranslateActiveChapter = useCallback(async (targetChapterIndex = null, optionsOverride = {}) => {
      if (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Another translation task is currently active. Please wait or stop it first.', 'warning');
        }
        return;
      }
      if (typeof onTranslateChapter !== 'function') {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation handler not available in current mode.', 'error');
        }
        return;
      }
      const idx = (typeof targetChapterIndex === 'number') ? targetChapterIndex : activeIdx;
      const targetChap = (chapters && chapters[idx]) || (safeChapters && safeChapters[idx]) || currentChapter;
      setIsTranslatingCurrentChapter(true);
      setActiveTranslationMode('full');
      streamBufferRef.current = '';
      setLiveStreamText('');
      setLiveHealingBlocks([]);
      setChunkProgress({ current: 1, total: 1 });
      setChapterTranslateProgress({ pct: 5, msg: 'Preparing translation…' });
      translationAbortRef.current = new AbortController();
      if (typeof window !== 'undefined' && window.NativeBridge) {
        try { window.NativeBridge.acquireWakeLock?.('Translating Chapter', `Translating Ch. ${idx + 1} in background…`); } catch (_) {}
      }

      try {
        const res = await onTranslateChapter(idx, targetChap, (pct, msg, chunkData) => {
          setChapterTranslateProgress({ pct, msg });
          if (chunkData && typeof chunkData.current === 'number') {
            setChunkProgress({ current: chunkData.current, total: chunkData.total || 1 });
          }
        }, 'full', {
          optionsOverride,
          abortController: translationAbortRef.current,
          pauseGate,
          onStreamChunk: (chunkData) => {
            const token = (typeof chunkData === 'object' && chunkData?.token) ? chunkData.token : String(chunkData || '');
            streamBufferRef.current += token;
            if (isLiveDashboardOpenRef.current) {
              if (!throttleTimerRef.current) {
                throttleTimerRef.current = setTimeout(() => {
                  throttleTimerRef.current = null;
                  if (isLiveDashboardOpenRef.current) {
                    setLiveStreamText(streamBufferRef.current);
                  }
                }, 150);
              }
            }
          }
        });

        if (res && res.content) {
          const newTitle = res.title || (targetChap && targetChap.title);
          const newText = res.content;
          if (currentChapter && idx === activeIdx) {
            currentChapter.title = newTitle;
            currentChapter.text = newText;
            currentChapter.content = newText;
            currentChapter.isTranslated = true;
          }
          if (Array.isArray(chapters) && chapters[idx]) {
            chapters[idx] = { ...chapters[idx], title: newTitle, text: newText, content: newText, isTranslated: true };
          }
          if (Array.isArray(safeChapters) && safeChapters[idx]) {
            safeChapters[idx] = { ...safeChapters[idx], title: newTitle, text: newText, content: newText, isTranslated: true };
          }
          if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
            onChaptersChange([...safeChapters]);
          }
          setRenderTick(t => t + 1);
          setChapterTranslateProgress({ pct: 100, msg: 'Chapter translated successfully!' });
          setTimeout(() => {
            setIsTranslatingCurrentChapter(false);
            setActiveTranslationMode(null);
          }, 1500);
        } else {
          setIsTranslatingCurrentChapter(false);
          setActiveTranslationMode(null);
          if (typeof window !== 'undefined' && window.toast) {
            window.toast('Chapter translation was stopped or could not complete.', 'warning');
          }
        }
      } catch (err) {
        setIsTranslatingCurrentChapter(false);
        setActiveTranslationMode(null);
        if (err.name !== 'AbortError' && typeof window !== 'undefined' && window.toast) {
          window.toast(err.message || 'Translation error occurred.', 'error');
        }
      } finally {
        translationAbortRef.current = null;
        if (typeof window !== 'undefined' && window.NativeBridge) {
          try { window.NativeBridge.releaseWakeLock?.(); window.NativeBridge.clearProgressNotification?.(false); } catch (_) {}
        }
      }
    }, [isTranslatingCurrentChapter, onTranslateChapter, activeIdx, currentChapter, chapters, safeChapters, onChaptersChange]);

    const handleTranslateActiveChapterTitleOnly = useCallback(async (targetChapterIndex = null, optionsOverride = {}) => {
      if (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Another translation task is currently active. Please wait or stop it first.', 'warning');
        }
        return;
      }
      if (typeof onTranslateChapter !== 'function') {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation handler not available in current mode.', 'error');
        }
        return;
      }
      const idx = (typeof targetChapterIndex === 'number') ? targetChapterIndex : activeIdx;
      const targetChap = (chapters && chapters[idx]) || (safeChapters && safeChapters[idx]) || currentChapter;
      if (!targetChap) return;
      setActiveTranslationMode('title');
      try {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(`Translating Ch. ${idx + 1} title…`, 'info');
        }
        const res = await onTranslateChapter(idx, targetChap, null, 'titleOnly', { optionsOverride });
        if (res && res.title) {
          if (currentChapter && idx === activeIdx) {
            currentChapter.title = res.title;
            currentChapter.isTranslated = true;
          }
          if (Array.isArray(chapters) && chapters[idx]) {
            chapters[idx] = { ...chapters[idx], title: res.title, isTranslated: true };
          }
          if (Array.isArray(safeChapters) && safeChapters[idx]) {
            safeChapters[idx] = { ...safeChapters[idx], title: res.title, isTranslated: true };
          }
          if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
            onChaptersChange([...safeChapters]);
          }
          setRenderTick(t => t + 1);
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(err.message || 'Title translation failed.', 'error');
        }
      } finally {
        setActiveTranslationMode(null);
      }
    }, [isTranslatingCurrentChapter, isTranslatingTitles, isHealingAll, onTranslateChapter, activeIdx, currentChapter, chapters, safeChapters, onChaptersChange]);


    const handleTranslateAllChapterTitles = useCallback(async () => {
      if (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Another translation task is currently active. Please wait or stop it first.', 'warning');
        }
        return;
      }
      if (typeof onTranslateChapter !== 'function') {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation handler not available in current mode.', 'error');
        }
        return;
      }
      const hasForeign = (s) => typeof s === 'string' && /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/.test(s);
      const isGeneric = (s) => typeof s === 'string' && /^(?:chapter|ch|volume|vol|part|ep|episode)\.?\s*\d+$/i.test(s.trim());

      const targets = [];
      safeChapters.forEach((ch, idx) => {
        const needsTrans = hasForeign(ch.title) || hasForeign(ch.originalTitle) || (!ch.isTranslated && isGeneric(ch.title) && ch.originalTitle);
        if (needsTrans) targets.push(idx);
      });

      if (targets.length === 0) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('All chapter titles are already translated!', 'info');
        }
        return;
      }

      setIsTranslatingTitles(true);
      setActiveTranslationMode('titles');
      setTitlesProgress({ done: 0, total: targets.length });
      translationAbortRef.current = new AbortController();
      if (typeof window !== 'undefined' && window.NativeBridge) {
        try { window.NativeBridge.acquireWakeLock?.('Translating Titles', 'Batch translating chapter titles in background…'); } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(`Translating ${targets.length} chapter titles…`, 'info');
      }

      let completedCount = 0;
      const pacingDelay = (ms) => new Promise(r => setTimeout(r, ms));

      try {
        for (let i = 0; i < targets.length; i += 2) {
          if (translationAbortRef.current?.signal?.aborted) break;
          const chunk = targets.slice(i, i + 2);
          await Promise.all(chunk.map(async (chIdx) => {
            if (translationAbortRef.current?.signal?.aborted) return;
            const chap = safeChapters[chIdx];
            try {
              const res = await onTranslateChapter(chIdx, chap, null, 'titleOnly', {
                abortController: translationAbortRef.current
              });
              if (res && res.title) {
                if (Array.isArray(chapters) && chapters[chIdx]) {
                  chapters[chIdx] = { ...chapters[chIdx], title: res.title, isTranslated: true };
                }
                if (Array.isArray(safeChapters) && safeChapters[chIdx]) {
                  safeChapters[chIdx] = { ...safeChapters[chIdx], title: res.title, isTranslated: true };
                }
                if (currentChapter && chIdx === activeIdx) {
                  currentChapter.title = res.title;
                  currentChapter.isTranslated = true;
                }
              }
            } catch (_) {}
            completedCount++;
            setTitlesProgress({ done: completedCount, total: targets.length });
          }));

          // Incremental persistence every 10 titles or when batch finishes
          if (completedCount % 10 === 0 || completedCount === targets.length) {
            if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
              onChaptersChange([...safeChapters]);
            }
            setRenderTick(t => t + 1);
          }

          // Gentle 200ms pacing delay between pairs to respect API rate limits
          if (i + 2 < targets.length && !translationAbortRef.current?.signal?.aborted) {
            await pacingDelay(200);
          }
        }

        if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
          onChaptersChange([...safeChapters]);
        }
        setRenderTick(t => t + 1);
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(`Successfully translated ${completedCount} chapter titles!`, 'success');
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Batch title translation stopped.', 'warning');
        }
      } finally {
        setIsTranslatingTitles(false);
        setActiveTranslationMode(null);
        translationAbortRef.current = null;
        if (typeof window !== 'undefined' && window.NativeBridge) {
          try { window.NativeBridge.releaseWakeLock?.(); window.NativeBridge.clearProgressNotification?.(false); } catch (_) {}
        }
      }
    }, [isTranslatingCurrentChapter, isTranslatingTitles, isHealingAll, onTranslateChapter, safeChapters, chapters, currentChapter, activeIdx, onChaptersChange]);


    const handleHealAllChapters = useCallback(async () => {
      if (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Another translation task is currently active. Please wait or stop it first.', 'warning');
        }
        return;
      }
      if (typeof onTranslateChapter !== 'function') {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation handler not available in current mode.', 'error');
        }
        return;
      }
      const hasCjkOrError = (p) => {
        if (!p || typeof p !== 'string') return false;
        if (typeof window !== 'undefined' && window.hasUntranslatedOrError) {
          return window.hasUntranslatedOrError(p, null, 'English');
        }
        return (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(p) || /\[Error:.*?\]/i.test(p));
      };

      const targets = [];
      safeChapters.forEach((ch, idx) => {
        const body = ch.content || ch.text || '';
        if (hasCjkOrError(body)) targets.push(idx);
      });

      if (targets.length === 0) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('All chapters are already healthy! Zero untranslated lines found.', 'success');
        }
        return;
      }

      setIsHealingAll(true);
      setHealAllProgress({ done: 0, total: targets.length });
      if (typeof window !== 'undefined' && window.NativeBridge) {
        try { window.NativeBridge.acquireWakeLock?.('Healing All Chapters', 'Scanning and healing novel prose in background…'); } catch (_) {}
      }
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(`Healing ${targets.length} chapter(s) with incomplete lines…`, 'info');
      }

      let completedCount = 0;
      try {
        for (let i = 0; i < targets.length; i++) {
          const chIdx = targets[i];
          const chap = safeChapters[chIdx];
          try {
            const res = await onTranslateChapter(chIdx, chap, null, 'heal');
            if (res && res.content) {
              const newTitle = res.title || chap.title;
              const newText = res.content;
              if (Array.isArray(chapters) && chapters[chIdx]) {
                chapters[chIdx] = { ...chapters[chIdx], title: newTitle, text: newText, content: newText, isTranslated: true };
              }
              if (Array.isArray(safeChapters) && safeChapters[chIdx]) {
                safeChapters[chIdx] = { ...safeChapters[chIdx], title: newTitle, text: newText, content: newText, isTranslated: true };
              }
              if (currentChapter && chIdx === activeIdx) {
                currentChapter.title = newTitle;
                currentChapter.text = newText;
                currentChapter.content = newText;
                currentChapter.isTranslated = true;
              }
              completedCount++;
            }
          } catch (_) {}
          setHealAllProgress({ done: i + 1, total: targets.length });
          setRenderTick(t => t + 1);
        }

        if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
          onChaptersChange([...safeChapters]);
        }
        setRenderTick(t => t + 1);
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(`Successfully healed ${completedCount} chapter(s)! Zero wasted tokens.`, 'success');
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Whole-novel healing stopped.', 'warning');
        }
      } finally {
        setIsHealingAll(false);
        if (typeof window !== 'undefined' && window.NativeBridge) {
          try { window.NativeBridge.releaseWakeLock?.(); window.NativeBridge.clearProgressNotification?.(false); } catch (_) {}
        }
      }
    }, [isTranslatingCurrentChapter, isHealingAll, isTranslatingTitles, onTranslateChapter, safeChapters, chapters, currentChapter, activeIdx, onChaptersChange]);

    const handleHealActiveChapterLines = useCallback(async (targetChapterIndex = null, optionsOverride = {}) => {
      if (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Another translation task is currently active. Please wait or stop it first.', 'warning');
        }
        return;
      }
      if (typeof onTranslateChapter !== 'function') {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Translation handler not available in current mode.', 'error');
        }
        return;
      }
      const idx = (typeof targetChapterIndex === 'number') ? targetChapterIndex : activeIdx;
      const targetChap = (chapters && chapters[idx]) || (safeChapters && safeChapters[idx]) || currentChapter;
      if (!targetChap) return;
      setIsTranslatingCurrentChapter(true);
      setActiveTranslationMode('heal');
      streamBufferRef.current = '';
      setLiveStreamText('');
      setLiveHealingBlocks([]);
      setChunkProgress({ current: 1, total: 1 });
      setChapterTranslateProgress({ pct: 10, msg: 'Scanning for untranslated lines…' });
      translationAbortRef.current = new AbortController();
      if (typeof window !== 'undefined' && window.NativeBridge) {
        try { window.NativeBridge.acquireWakeLock?.('Healing Chapter', `Healing incomplete lines in Ch. ${idx + 1}…`); } catch (_) {}
      }

      try {
        const res = await onTranslateChapter(idx, targetChap, (pct, msg, chunkData) => {
          setChapterTranslateProgress({ pct, msg });
          if (chunkData && typeof chunkData.current === 'number') {
            setChunkProgress({ current: chunkData.current, total: chunkData.total || 1 });
          }
        }, 'heal', {
          optionsOverride,
          abortController: translationAbortRef.current,
          pauseGate,
          onHealingScanned: (items) => {
            if (Array.isArray(items)) setLiveHealingBlocks(items);
          },
          onHealingBlockProgress: (arg1, arg2) => {
            const blockIdx = (typeof arg1 === 'object') ? arg1.blockIdx : arg1;
            const healedSnippet = (typeof arg1 === 'object') ? (arg1.healedSnippet || '') : (arg2 || '');
            const status = (typeof arg1 === 'object') ? (arg1.status || 'healed') : 'healed';
            setLiveHealingBlocks(prev => prev.map((b, i) => i === blockIdx ? { ...b, healedText: healedSnippet, status } : b));
          }
        });

        if (res && res.content) {
          const newTitle = res.title || (targetChap && targetChap.title);
          const newText = res.content;
          if (currentChapter && idx === activeIdx) {
            currentChapter.title = newTitle;
            currentChapter.text = newText;
            currentChapter.content = newText;
            currentChapter.isTranslated = true;
          }
          if (Array.isArray(chapters) && chapters[idx]) {
            chapters[idx] = { ...chapters[idx], title: newTitle, text: newText, content: newText, isTranslated: true };
          }
          if (Array.isArray(safeChapters) && safeChapters[idx]) {
            safeChapters[idx] = { ...safeChapters[idx], title: newTitle, text: newText, content: newText, isTranslated: true };
          }
          if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
            onChaptersChange([...safeChapters]);
          }
          setRenderTick(t => t + 1);
          setChapterTranslateProgress({ pct: 100, msg: 'Untranslated lines healed!' });
          setTimeout(() => {
            setIsTranslatingCurrentChapter(false);
            setActiveTranslationMode(null);
          }, 1500);
        } else {
          setIsTranslatingCurrentChapter(false);
          setActiveTranslationMode(null);
          if (res?.noop) {
            // zero untranslated lines
          } else if (typeof window !== 'undefined' && window.toast) {
            window.toast('Healing stopped or no incomplete lines were modified.', 'warning');
          }
        }
      } catch (err) {
        setIsTranslatingCurrentChapter(false);
        setActiveTranslationMode(null);
        if (err.name !== 'AbortError' && typeof window !== 'undefined' && window.toast) {
          window.toast(err.message || 'Healing failed.', 'error');
        }
      } finally {
        translationAbortRef.current = null;
        if (typeof window !== 'undefined' && window.NativeBridge) {
          try { window.NativeBridge.releaseWakeLock?.(); window.NativeBridge.clearProgressNotification?.(false); } catch (_) {}
        }
      }
    }, [isTranslatingCurrentChapter, onTranslateChapter, activeIdx, currentChapter, chapters, safeChapters, onChaptersChange]);

    // ── Footnotes Extraction & Caching (§5.10 + Chimanew prefetchAround) ──
    const [activeFootnote, setActiveFootnote] = useState(null);
    const [footnotesMap, chapterElements] = useMemo(() => {
      return parseChapterModel(currentChapter);
    }, [currentChapter, renderTick]);

    // Chimanew prefetchAround: Pre-parse adjacent chapters in background
    useEffect(() => {
      if (!safeChapters || safeChapters.length === 0) return;
      const prefetch = () => {
        [activeIdx + 1, activeIdx - 1].forEach(targetIdx => {
          if (targetIdx >= 0 && targetIdx < safeChapters.length) {
            const chap = safeChapters[targetIdx];
            if (chap && (chap.text || chap.content)) {
              parseChapterModel(chap);
            }
          }
        });
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        const handle = window.requestIdleCallback(prefetch, { timeout: 1500 });
        return () => window.cancelIdleCallback(handle);
      } else {
        const timer = setTimeout(prefetch, 250);
        return () => clearTimeout(timer);
      }
    }, [activeIdx, safeChapters]);

    // ── Native Paginated Book Flip Engine ──
    const paginatedViewportRef = useRef(null);
    const paginatedTrackRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [colWidth, setColWidth] = useState(0);
    const touchStartRef = useRef(null);

    // Reset to page 0 (or last page if navigating backward) whenever active chapter changes
    useEffect(() => {
      if (pendingScrollTargetRef.current !== 'bottom') {
        setCurrentPage(0);
      }
    }, [activeIdx]);

    const updatePagination = useCallback(() => {
      if (viewMode !== 'paginated') return;
      const vp = paginatedViewportRef.current;
      const tr = paginatedTrackRef.current;
      if (!vp || !tr) return;

      const w = tr.clientWidth || vp.clientWidth;
      if (w > 0) {
        setColWidth(w);
        const gap = 60;
        const scrollW = tr.scrollWidth;
        const computedTotal = Math.max(1, Math.round((scrollW + gap) / (w + gap)));
        setTotalPages(computedTotal);
        if (pendingScrollTargetRef.current === 'bottom') {
          setCurrentPage(computedTotal - 1);
        } else {
          setCurrentPage(prev => Math.min(prev, computedTotal - 1));
        }
      }
    }, [viewMode]);

    useEffect(() => {
      updatePagination();
      const t1 = setTimeout(updatePagination, 50);
      const t2 = setTimeout(updatePagination, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }, [updatePagination, activeIdx, fontSize, lineHeight, font, contentWidth, paragraphIndent, justify, chapterElements]);

    useEffect(() => {
      if (viewMode !== 'paginated' || !paginatedViewportRef.current) return;
      const ro = new ResizeObserver(() => updatePagination());
      ro.observe(paginatedViewportRef.current);
      return () => ro.disconnect();
    }, [viewMode, updatePagination]);

    const goToPrevPage = useCallback(() => {
      if (currentPage > 0) {
        setCurrentPage(p => p - 1);
      } else if (activeIdx > 0) {
        changeChapter(activeIdx - 1);
      }
    }, [currentPage, activeIdx, changeChapter]);

    const goToNextPage = useCallback(() => {
      if (currentPage < totalPages - 1) {
        setCurrentPage(p => p + 1);
      } else if (activeIdx < safeChapters.length - 1) {
        changeChapter(activeIdx + 1);
      }
    }, [currentPage, totalPages, activeIdx, safeChapters.length, changeChapter]);

    const handlePaginatedClick = (e) => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'IMG') return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Moon+ Reader Top-Right Dog-Ear Bookmark Tap Zone (top 75px, right 75px)
      if (clickX > rect.width - 75 && clickY < 75) {
        handleToggleBookmark();
        return;
      }

      const ratio = clickX / rect.width;

      if (showMoreMenu) {
        setShowMoreMenu(false);
        return;
      }

      if (ratio < 0.25) {
        goToPrevPage();
      } else if (ratio > 0.75) {
        goToNextPage();
      } else {
        setHudVisible(v => !v);
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now()
        };
      }
    };

    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;
      const touch = (e.changedTouches && e.changedTouches[0]) || null;
      if (!touch) return;
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 600) {
        if (dx < 0) {
          goToNextPage();
        } else {
          goToPrevPage();
        }
      }
    };

    // ── In-Chapter Search Engine ──
    const searchMatches = useMemo(() => {
      if (!showSearch || !searchQuery.trim()) return [];
      const query = searchQuery.trim().toLowerCase();
      const matches = [];
      chapterElements.forEach((el, pIdx) => {
        if (!['text', 'center', 'right', 'blockquote', 'author-note'].includes(el.type) || !el.content) return;
        const lower = el.content.toLowerCase();
        let idx = 0;
        while ((idx = lower.indexOf(query, idx)) !== -1) {
          matches.push({ pIdx, elId: el.id, charIdx: idx });
          idx += query.length;
        }
      });
      return matches;
    }, [showSearch, searchQuery, chapterElements]);

    const scrollToMatch = useCallback((mIdx) => {
      if (!searchMatches || searchMatches.length === 0) return;
      const targetMatch = searchMatches[mIdx];
      if (!targetMatch) return;

      if (viewMode === 'paginated') {
        const el = document.getElementById(targetMatch.elId);
        if (el && colWidth > 0) {
          const trackLeft = el.offsetLeft;
          const page = Math.max(0, Math.min(totalPages - 1, Math.floor(trackLeft / (colWidth + 60))));
          setCurrentPage(page);
        }
      } else {
        setTimeout(() => {
          const markEl = document.getElementById(`search-match-${mIdx}`);
          if (markEl) {
            markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            const pEl = document.getElementById(targetMatch.elId);
            if (pEl) pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    }, [searchMatches, viewMode, colWidth, totalPages]);

    const handleNextSearchMatch = useCallback(() => {
      if (searchMatches.length === 0) return;
      const nextIdx = (activeMatchIndex + 1) % searchMatches.length;
      setActiveMatchIndex(nextIdx);
      scrollToMatch(nextIdx);
    }, [activeMatchIndex, searchMatches, scrollToMatch]);

    const handlePrevSearchMatch = useCallback(() => {
      if (searchMatches.length === 0) return;
      const prevIdx = activeMatchIndex > 0 ? activeMatchIndex - 1 : searchMatches.length - 1;
      setActiveMatchIndex(prevIdx);
      scrollToMatch(prevIdx);
    }, [activeMatchIndex, searchMatches, scrollToMatch]);

    // ── 3. Dual-Tier TTS Engine (Legado + Foliate + Piper Architecture) ──
    const [ttsActive, setTtsActive] = useState(false);
    const [ttsPaused, setTtsPaused] = useState(false);
    const [ttsRate, setTtsRate] = useState(() => {
      const saved = localStorage.getItem('gemini_tts_rate');
      return saved ? (parseFloat(saved) || 1.0) : 1.0;
    });
    const ttsRateRef = useRef(ttsRate);
    const rateRestartTimerRef = useRef(null);
    const speakSentenceRef = useRef(null);
    const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);
    const activeSentenceIdxRef = useRef(-1);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [previewSpeaking, setPreviewSpeaking] = useState(false);
    useEffect(() => {
      if (!hudVisible) {
        setShowMoreMenu(false);
        setShowQuickFont(false);
      }
    }, [hudVisible]);
    const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0); // 0 = off, 15, 30, 45, 60, -1 = end of chapter
    const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(0);
    const sleepTimerRef = useRef(0);
    const [ttsEngines, setTtsEngines] = useState([]);
    const [selectedTtsEngine, setSelectedTtsEngine] = useState(() => localStorage.getItem('gemini_tts_engine') || 'SYSTEM_DEFAULT');
    const [ttsVoices, setTtsVoices] = useState([]);
    const [selectedTtsVoice, setSelectedTtsVoice] = useState(() => localStorage.getItem('gemini_tts_voice') || '');
    const [dacDelayMs, setDacDelayMs] = useState(() => parseInt(localStorage.getItem('gemini_tts_dac_delay') || '200', 10)); // 200ms DAC buffer
    const [showSherpaHelp, setShowSherpaHelp] = useState(false);

    // Moon+ Reader TTS Options & Chars Filters
    const [divideBy, setDivideBy] = useState(() => localStorage.getItem('gemini_tts_divide_by') || 'paragraph'); // 'paragraph' | 'sentence'
    const [stopAfterEnabled, setStopAfterEnabled] = useState(() => localStorage.getItem('gemini_tts_stop_after_enabled') === 'true');
    const [stopAfterMinutes, setStopAfterMinutes] = useState(() => parseInt(localStorage.getItem('gemini_tts_stop_after_min') || '10', 10));
    const [showConfirmBeforeSpeak, setShowConfirmBeforeSpeak] = useState(() => localStorage.getItem('gemini_tts_confirm_speak') === 'true');
    const [speakingIntervalMs, setSpeakingIntervalMs] = useState(() => parseInt(localStorage.getItem('gemini_tts_interval_ms') || '300', 10));
    const [disableAudioFocus, setDisableAudioFocus] = useState(() => localStorage.getItem('gemini_tts_disable_audio_focus') !== 'false');

    useEffect(() => {
      window.__openVoiceModal = () => setShowVoiceModal(true);
      return () => { window.__openVoiceModal = null; };
    }, []);

    const [ttsCharFilters, setTtsCharFilters] = useState(() => {
      try {
        const saved = localStorage.getItem('gemini_tts_char_filters');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return [
        { from: '『', to: '' },
        { from: '』', to: '' },
        { from: '「', to: '' },
        { from: '」', to: '' },
        { from: '【', to: '' },
        { from: '】', to: '' },
        { from: '—', to: '' },
        { from: 'Qing', to: 'Ching' },
        { from: 'Xiao', to: 'Shee-ow' },
        { from: 'Zhou', to: 'Joe' },
        { from: 'Zhang', to: 'Zahng' },
        { from: 'Nephis', to: 'Ne fis' },
        { from: 'Shi', to: 'Shee' },
        { from: 'Zheng', to: 'Zeng' },
        { from: 'Yi', to: 'Yee' },
        { from: 'Liu', to: 'Lioooo' },
        { from: 'Guan', to: 'Gwuaan' },
        { from: 'Yun', to: 'Yoon' }
      ];
    });
    const [ttsUseRegex, setTtsUseRegex] = useState(() => localStorage.getItem('gemini_tts_use_regex') === 'true');
    const [filterSearchQuery, setFilterSearchQuery] = useState('');

    // Moon+ Reader Dialog States
    const [showTtsOptionsModal, setShowTtsOptionsModal] = useState(false);
    const [showCharsFilterModal, setShowCharsFilterModal] = useState(false);
    const [showGestureGuideModal, setShowGestureGuideModal] = useState(false);
    const [showQuickFont, setShowQuickFont] = useState(false);
    const [bookmarks, setBookmarks] = useState(() => {
      try {
        const k = novelId || (typeof window !== 'undefined' && window.activeNovelRecord?.id) || 'default';
        return JSON.parse(localStorage.getItem('gemini_reader_bookmarks_' + k) || '[]');
      } catch (e) {
        return [];
      }
    });

    const handleToggleBookmark = useCallback(() => {
      const k = novelId || (typeof window !== 'undefined' && window.activeNovelRecord?.id) || 'default';
      const container = document.getElementById('gemini-reader-scroll-area');
      const curScrollTop = container ? container.scrollTop : 0;
      const scrollHeight = container ? Math.max(1, container.scrollHeight - container.clientHeight) : 1;
      const curPct = Math.round((curScrollTop / scrollHeight) * 100);

      // Extract visible paragraph snippet around current scroll position
      let snippet = '';
      if (container) {
        const paragraphs = container.querySelectorAll('.reader-v2-content-box p');
        const cRect = container.getBoundingClientRect();
        for (let i = 0; i < paragraphs.length; i++) {
          const rect = paragraphs[i].getBoundingClientRect();
          if (rect.top >= cRect.top - 20 && rect.top <= cRect.bottom) {
            snippet = paragraphs[i].textContent.trim().slice(0, 85);
            if (paragraphs[i].textContent.trim().length > 85) snippet += '…';
            break;
          }
        }
      }
      if (!snippet && currentChapter) {
        snippet = (currentChapter.title || `Chapter ${activeIdx + 1}`) + ` (${curPct}%)`;
      }

      setBookmarks(prev => {
        // Match existing bookmark within 4% of current position
        const existingIdx = prev.findIndex(b => b.chapterIdx === activeIdx && Math.abs((b.pct ?? 0) - curPct) <= 4);
        let next;
        if (existingIdx !== -1) {
          next = prev.filter((_, idx) => idx !== existingIdx);
          if (typeof window !== 'undefined' && window.toast) window.toast(`Bookmark removed at ${curPct}%`);
        } else {
          const newBm = {
            id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            chapterIdx: activeIdx,
            chapterTitle: currentChapter?.title || `Chapter ${activeIdx + 1}`,
            scrollTop: curScrollTop,
            pct: curPct,
            snippet: snippet,
            time: Date.now(),
            type: 0
          };
          next = [...prev, newBm];
          if (typeof window !== 'undefined' && window.toast) window.toast(`Bookmark saved at ${curPct}%`);
        }
        try { localStorage.setItem('gemini_reader_bookmarks_' + k, JSON.stringify(next)); } catch (_) {}
        if (activeNovelRecord && typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
          window.GeminiNovelDB.updateNovel(activeNovelRecord.id, { bookmarks: next }).catch(() => {});
        }
        return next;
      });
    }, [novelId, activeIdx, currentChapter, activeNovelRecord]);

    const handleAddBookmark = useCallback((entry = {}) => {
      const k = novelId || (typeof window !== 'undefined' && window.activeNovelRecord?.id) || 'default';
      setBookmarks(prev => {
        const item = {
          id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          chapterIdx: entry.chapterIdx !== undefined ? entry.chapterIdx : activeIdx,
          chapterTitle: entry.chapterTitle || currentChapter?.title || `Chapter ${activeIdx + 1}`,
          pct: entry.pct !== undefined ? entry.pct : Math.round(chapterScrollPct || 0),
          time: Date.now(),
          type: entry.type !== undefined ? entry.type : 0,
          snippet: entry.snippet || '',
          highlightText: entry.highlightText || '',
          noteText: entry.noteText || '',
          color: entry.color || '#166534'
        };
        const next = [...prev, item];
        try { localStorage.setItem('gemini_reader_bookmarks_' + k, JSON.stringify(next)); } catch (_) {}
        if (activeNovelRecord && typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
          window.GeminiNovelDB.updateNovel(activeNovelRecord.id, { bookmarks: next }).catch(() => {});
        }
        if (typeof window !== 'undefined' && window.toast) window.toast('Bookmark saved');
        return next;
      });
    }, [novelId, activeIdx, currentChapter, chapterScrollPct, activeNovelRecord]);

    const handleDeleteBookmark = useCallback((targetIdOrIdx) => {
      const k = novelId || (typeof window !== 'undefined' && window.activeNovelRecord?.id) || 'default';
      setBookmarks(prev => {
        const next = prev.filter(b => (b.id ? b.id !== targetIdOrIdx : b.chapterIdx !== targetIdOrIdx));
        try { localStorage.setItem('gemini_reader_bookmarks_' + k, JSON.stringify(next)); } catch (_) {}
        if (activeNovelRecord && typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
          window.GeminiNovelDB.updateNovel(activeNovelRecord.id, { bookmarks: next }).catch(() => {});
        }
        if (typeof window !== 'undefined' && window.toast) window.toast('Bookmark removed');
        return next;
      });
    }, [novelId, activeNovelRecord]);

    const sentencesRef = useRef([]);
    const utteranceRef = useRef(null);
    const ttsActiveRef = useRef(false);
    const ttsPausedRef = useRef(false);
    const pendingTtsStartRef = useRef(false);

    useEffect(() => {
      localStorage.setItem('gemini_tts_divide_by', divideBy);
    }, [divideBy]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_interval_ms', String(speakingIntervalMs));
    }, [speakingIntervalMs]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_disable_audio_focus', String(disableAudioFocus));
      if (window.NativeBridge?.setDisableAudioFocus) {
        window.NativeBridge.setDisableAudioFocus(disableAudioFocus);
      }
    }, [disableAudioFocus]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_stop_after_enabled', String(stopAfterEnabled));
      localStorage.setItem('gemini_tts_stop_after_min', String(stopAfterMinutes));
      if (stopAfterEnabled && stopAfterMinutes > 0 && ttsActive) {
        setSleepTimerMinutes(stopAfterMinutes);
        setSleepTimerSecondsLeft(stopAfterMinutes * 60);
      }
    }, [stopAfterEnabled, stopAfterMinutes, ttsActive]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_char_filters', JSON.stringify(ttsCharFilters));
    }, [ttsCharFilters]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_use_regex', String(ttsUseRegex));
    }, [ttsUseRegex]);

    const applyTtsCharFilters = useCallback((text) => {
      if (!text || !Array.isArray(ttsCharFilters) || ttsCharFilters.length === 0) return text;
      let result = text;
      for (const f of ttsCharFilters) {
        if (!f.from) continue;
        try {
          if (ttsUseRegex) {
            const re = new RegExp(f.from, 'gi');
            result = result.replace(re, f.to || '');
          } else {
            result = result.split(f.from).join(f.to || '');
          }
        } catch (e) {
          result = result.split(f.from).join(f.to || '');
        }
      }
      return result;
    }, [ttsCharFilters, ttsUseRegex]);

    useEffect(() => {
      ttsActiveRef.current = ttsActive;
      ttsPausedRef.current = ttsPaused;
      activeSentenceIdxRef.current = activeSentenceIdx;
      ttsRateRef.current = ttsRate;
    }, [ttsActive, ttsPaused, activeSentenceIdx, ttsRate]);

    // Dedicated handler for changing speech speed (immediate audio restart + persistence)
    const handleRateChange = useCallback((newRate) => {
      const r = Math.max(0.5, Math.min(3.0, parseFloat(newRate) || 1.0));
      const cleanR = Math.round(r * 100) / 100;
      setTtsRate(cleanR);
      ttsRateRef.current = cleanR;
      try {
        localStorage.setItem('gemini_tts_rate', String(cleanR));
      } catch (e) {}

      if (window.NativeBridge?.setTtsSpeed) {
        window.NativeBridge.setTtsSpeed(cleanR);
      }

      // If speech is actively playing, debounced restart of current sentence at the new speed
      if (ttsActiveRef.current && !ttsPausedRef.current) {
        if (rateRestartTimerRef.current) {
          clearTimeout(rateRestartTimerRef.current);
          rateRestartTimerRef.current = null;
        }
        rateRestartTimerRef.current = setTimeout(() => {
          if (ttsActiveRef.current && !ttsPausedRef.current) {
            const curIdx = activeSentenceIdxRef.current;
            if (window.NativeBridge?.stopNativeSpeech) {
              window.NativeBridge.stopNativeSpeech();
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            setTimeout(() => {
              if (ttsActiveRef.current && !ttsPausedRef.current && curIdx >= 0) {
                speakSentenceRef.current?.(curIdx);
              }
            }, 60);
          }
        }, 120);
      }
    }, []);

    useEffect(() => {
      sleepTimerRef.current = sleepTimerMinutes;
    }, [sleepTimerMinutes]);

    useEffect(() => {
      localStorage.setItem('gemini_tts_dac_delay', String(dacDelayMs));
    }, [dacDelayMs]);

    const [systemTtsInfo, setSystemTtsInfo] = useState(() => ({
      enginePackage: 'SYSTEM_DEFAULT',
      engineLabel: 'System Default (Android Settings)',
      voiceName: '',
      isReady: true
    }));

    const refreshSystemTts = useCallback(async (forceReload = false) => {
      if (window.NativeBridge?.getSystemTtsInfo) {
        try {
          const info = forceReload && window.NativeBridge.reloadSystemTts
            ? await window.NativeBridge.reloadSystemTts()
            : await window.NativeBridge.getSystemTtsInfo();
          if (info && info.engineLabel) {
            setSystemTtsInfo(info);
          }
        } catch (e) {
          console.warn('Failed to detect system TTS info:', e);
        }
      }
    }, []);

    useEffect(() => {
      // Clear any legacy voice overrides so Android Settings voice is always used
      try { localStorage.removeItem('gemini_tts_voice'); } catch (_) {}
      refreshSystemTts();

      if (window.NativeBridge?.getTtsEngines) {
        window.NativeBridge.getTtsEngines().then(res => {
          if (res?.engines?.length > 0) {
            setTtsEngines(res.engines);
          }
        }).catch(() => {});
      }

      const onFocusOrVisible = () => {
        if (document.visibilityState === 'visible') {
          refreshSystemTts(true);
        }
      };
      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);
      return () => {
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      };
    }, [refreshSystemTts]);

    const previewVoice = async () => {
      if (previewSpeaking) return;
      setPreviewSpeaking(true);
      const sampleText = "Hello Exile! This is a speech test using your active voice from Android settings.";
      try {
        if (window.NativeBridge?.speakNative) {
          await window.NativeBridge.speakNative(sampleText, {
            rate: ttsRateRef.current,
            pitch: 1.0,
            lang: 'en-US',
            voiceName: '',
            delayMs: dacDelayMs,
            onDone: () => setPreviewSpeaking(false),
            onError: () => setPreviewSpeaking(false)
          });
        } else if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(sampleText);
          u.rate = ttsRateRef.current;
          u.onend = () => setPreviewSpeaking(false);
          u.onerror = () => setPreviewSpeaking(false);
          window.speechSynthesis.speak(u);
        } else {
          setPreviewSpeaking(false);
        }
      } catch (e) {
        setPreviewSpeaking(false);
      }
    };

    // Legado-style Sleep Timer countdown
    useEffect(() => {
      if (sleepTimerMinutes <= 0 || !ttsActive || ttsPaused) return;
      const interval = setInterval(() => {
        setSleepTimerSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            stopTts();
            setSleepTimerMinutes(0);
            if (typeof window !== 'undefined' && window.toast) {
              window.toast('⏱ Sleep timer ended. Audio paused.', 'info');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [sleepTimerMinutes, ttsActive, ttsPaused]);

    // Foliate-style Sentence Segmentation (Intl.Segmenter with Unicode boundary detection)
    useEffect(() => {
      const splitSentences = [];
      let sGlobalIdx = 0;
      const langMap = { 'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'ru': 'ru-RU', 'en': 'en-US' };
      const segmenterLang = langMap[tgtLang] || (tgtLang && tgtLang.length === 2 ? `${tgtLang}-${tgtLang.toUpperCase()}` : 'en-US');

      let segmenter = null;
      if (divideBy === 'sentence' && typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
          segmenter = new Intl.Segmenter(segmenterLang, { granularity: 'sentence' });
        } catch (e) {}
      }

      chapterElements.forEach((el, pIdx) => {
        if (!['text', 'center', 'right', 'blockquote', 'author-note'].includes(el.type) || !el.content) return;
        const raw = el.content.trim();
        if (!raw) return;

        let parts = [];
        if (divideBy === 'paragraph') {
          parts = [raw];
        } else {
          if (segmenter) {
            try {
              parts = Array.from(segmenter.segment(raw))
                .map(s => s.segment.trim())
                .filter(s => s.length > 0);
            } catch (e) {}
          }
          if (!parts || parts.length === 0) {
            parts = raw.split(/(?<=[.!?。！？\n])\s+/).map(s => s.trim()).filter(Boolean);
          }
        }

        if (parts.length > 0) {
          parts.forEach(part => {
            splitSentences.push({ text: part, pIdx, sentIdx: sGlobalIdx++ });
          });
        } else {
          splitSentences.push({ text: raw, pIdx, sentIdx: sGlobalIdx++ });
        }
      });
      sentencesRef.current = splitSentences;
      if (pendingTtsStartRef.current && splitSentences.length > 0) {
        pendingTtsStartRef.current = false;
        speakSentence(0);
      }
    }, [chapterElements, tgtLang, divideBy]);

    const stopTts = useCallback(() => {
      ttsActiveRef.current = false;
      ttsPausedRef.current = false;
      pendingTtsStartRef.current = false;
      if (window.NativeBridge?.stopNativeSpeech) {
        window.NativeBridge.stopNativeSpeech();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      if (window.NativeBridge?.setMediaMetadata) {
        window.NativeBridge.setMediaMetadata({
          title: currentChapter?.title || `Chapter ${activeIdx + 1}`,
          artist: bookTitle || 'Gemini Reader',
          playing: false
        });
      }
      window.__ttsActiveUtterance = null;
      setTtsActive(false);
      setTtsPaused(false);
      setActiveSentenceIdx(-1);
    }, [currentChapter, activeIdx, bookTitle]);

    // Stop speech synthesis if reader unmounts or closes
    useEffect(() => {
      return () => {
        stopTts();
      };
    }, [stopTts]);

    const speakSentence = useCallback(async (idx) => {
      if (!ttsActiveRef.current) return;
      if (idx >= sentencesRef.current.length) {
        // Check if sleep timer is set to End of Chapter (-1)
        if (sleepTimerRef.current === -1) {
          stopTts();
          setSleepTimerMinutes(0);
          if (typeof window !== 'undefined' && window.toast) {
            window.toast('⏱ Sleep timer: End of chapter reached. Audio paused.', 'info');
          }
          return;
        }

        // End of chapter reached! Seamlessly advance to next chapter
        if (activeIdx < safeChapters.length - 1) {
          if (typeof window !== 'undefined' && window.toast) {
            window.toast(` Advancing to Chapter ${activeIdx + 2}...`, 'info');
          }
          pendingTtsStartRef.current = true;
          changeChapter(activeIdx + 1);
        } else {
          stopTts();
          if (typeof window !== 'undefined' && window.toast) {
            window.toast(' Finished reading entire book!', 'success');
          }
        }
        return;
      }

      const item = sentencesRef.current[idx];
      const rawText = typeof item === 'string' ? item : item?.text;
      if (!rawText || !rawText.trim()) {
        speakSentenceRef.current?.(idx + 1);
        return;
      }

      // Strip markdown tags/asterisks and clean for natural speech
      const plainSpeechText = rawText
        .replace(/\[\/?(?:b|i|u|s|center|right|left)\]|\[\/?(?:color|size|font|align)(?:=[^\]]*)?\]/gi, '')
        .replace(/(\*{1,3}|_{1,3}|~~|`)/g, '')
        .replace(/^(&gt;|>)\s*/g, '');

      // Apply Moon+ Reader TTS Character & Pronunciation Filters
      const sentence = applyTtsCharFilters(plainSpeechText);

      setActiveSentenceIdx(idx);

      // Smoothly scroll active sentence into view
      setTimeout(() => {
        const sentEl = document.getElementById(`tts-sent-${idx}`);
        if (sentEl) {
          sentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      const langMap = {
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'ru': 'ru-RU',
        'en': 'en-US'
      };
      const ttsLang = langMap[tgtLang] || (tgtLang && tgtLang.length === 2 ? `${tgtLang}-${tgtLang.toUpperCase()}` : 'en-US');

      // Sync metadata to native lockscreen notification
      if (window.NativeBridge?.setMediaMetadata) {
        window.NativeBridge.setMediaMetadata({
          title: currentChapter?.title || `Chapter ${activeIdx + 1}`,
          artist: bookTitle || 'Gemini Reader',
          playing: true
        });
      }

      // 1. Try Native Android TTS Bridge (Zero lag, works with screen off, supports Piper/Sherpa-ONNX)
      let usedNative = false;
      if (window.NativeBridge && window.NativeBridge.speakNative) {
        try {
          const spoken = await window.NativeBridge.speakNative(sentence, {
            rate: ttsRateRef.current,
            pitch: 1.0,
            lang: ttsLang,
            voiceName: '',
            delayMs: speakingIntervalMs || dacDelayMs,
            utteranceId: `tts_${activeIdx}_${idx}_${Date.now()}`,
            onDone: () => {
              if (ttsActiveRef.current && !ttsPausedRef.current) {
                speakSentenceRef.current?.(idx + 1);
              }
            },
            onError: (err) => {
              console.warn('[Native TTS] Sentence error, skipping to next:', err);
              if (ttsActiveRef.current && !ttsPausedRef.current) {
                speakSentenceRef.current?.(idx + 1);
              }
            }
          });
          if (spoken) usedNative = true;
        } catch (e) {
          console.warn('Native speakNative failed, fallback to Web Speech:', e);
        }
      }

      // 2. Web Speech Synthesis Fallback (Desktop / Web browsers)
      if (!usedNative) {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          stopTts();
          window.toast?.('Speech synthesis is not supported on this device.', 'error');
          return;
        }

        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(sentence);
        utt.rate = ttsRateRef.current;
        utt.lang = ttsLang;

        try {
          const voices = window.speechSynthesis.getVoices?.() || [];
          if (voices.length > 0) {
            const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(ttsLang.toLowerCase().slice(0, 2)));
            if (matchedVoice) utt.voice = matchedVoice;
          }
        } catch (e) {}

        utt.onend = () => {
          window.__ttsActiveUtterance = null;
          if (ttsActiveRef.current && !ttsPausedRef.current) {
            speakSentenceRef.current?.(idx + 1);
          }
        };

        utt.onerror = (err) => {
          window.__ttsActiveUtterance = null;
          if (err.error !== 'canceled' && err.error !== 'interrupted') {
            console.warn('[TTS] Synthesis warning:', err);
            if (ttsActiveRef.current && !ttsPausedRef.current) {
              speakSentenceRef.current?.(idx + 1);
            }
          }
        };

        window.__ttsActiveUtterance = utt;
        utteranceRef.current = utt;

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utt);
      }
    }, [activeIdx, safeChapters.length, tgtLang, currentChapter, bookTitle, selectedTtsVoice, dacDelayMs, changeChapter, stopTts]);

    speakSentenceRef.current = speakSentence;

    const toggleTts = useCallback(() => {
      if (sentencesRef.current.length === 0) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('No readable text found in this chapter for Read Aloud.', 'warning');
        }
        return;
      }
      if (ttsActive) {
        if (ttsPaused) {
          ttsPausedRef.current = false;
          setTtsPaused(false);
          const startIdx = activeSentenceIdx >= 0 ? activeSentenceIdx : 0;
          speakSentence(startIdx);
        } else {
          ttsPausedRef.current = true;
          setTtsPaused(true);
          if (window.NativeBridge?.pauseNativeSpeech) {
            window.NativeBridge.pauseNativeSpeech();
          } else if (window.NativeBridge?.stopNativeSpeech) {
            window.NativeBridge.stopNativeSpeech();
          }
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
          }
        }
      } else {
        ttsActiveRef.current = true;
        ttsPausedRef.current = false;
        setTtsActive(true);
        setTtsPaused(false);
        const startIdx = activeSentenceIdx >= 0 ? activeSentenceIdx : 0;
        speakSentence(startIdx);
      }
    }, [ttsActive, ttsPaused, activeSentenceIdx, speakSentence]);

    // Legado-style Native Media Actions listener (lock screen notification, headphone buttons, audio focus)
    useEffect(() => {
      let sub = null;
      if (window.NativeBridge?.onMediaAction) {
        window.NativeBridge.onMediaAction((action) => {
          if (action === 'play') {
            if (ttsPausedRef.current) {
              toggleTts();
            }
          } else if (action === 'pause') {
            if (ttsActiveRef.current && !ttsPausedRef.current) {
              toggleTts();
            }
          } else if (action === 'play_pause') {
            toggleTts();
          } else if (action === 'next') {
            const cur = activeSentenceIdxRef.current;
            if (cur >= 0 && cur < sentencesRef.current.length - 1) {
              speakSentence(cur + 1);
            } else if (activeIdx < safeChapters.length - 1) {
              changeChapter(activeIdx + 1);
            }
          } else if (action === 'prev') {
            const cur = activeSentenceIdxRef.current;
            if (cur > 0) {
              speakSentence(cur - 1);
            }
          } else if (action === 'stop') {
            stopTts();
          }
        }).then(s => { sub = s; });
      }
      return () => {
        try { sub?.remove?.(); } catch (e) {}
      };
    }, [toggleTts, speakSentence, changeChapter, activeIdx, safeChapters.length, stopTts]);

    // ── 4. Hierarchical Arc / Volume TOC Grouping ──
    const arcGroups = useMemo(() => {
      const groups = [];
      let currentArcName = 'General Chapters';
      let currentGroup = null;

      safeChapters.forEach((ch, idx) => {
        let arc = ch.arc || ch.volume || '';
        if (!arc) {
          const m = ch.title.match(/^(?:\[\s*)?(Volume|Vol\.?|Book|Arc)\s*(\d+|[IVXLCDM]+)[\s:–—-]*(.*)$/i);
          if (m) arc = `${m[1]} ${m[2]}`;
        }
        if (!arc) arc = currentArcName;
        else currentArcName = arc;

        if (!currentGroup || currentGroup.arc !== arc) {
          currentGroup = { arc, chapters: [] };
          groups.push(currentGroup);
        }
        currentGroup.chapters.push({ ...ch, idx });
      });
      return groups;
    }, [safeChapters, renderTick]);

    // Collapsible arc drawer state
    const [collapsedArcs, setCollapsedArcs] = useState({});
    const toggleArcCollapse = (arc) => {
      setCollapsedArcs(prev => ({ ...prev, [arc]: !prev[arc] }));
    };

    // Keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (showToc || showSettings || showSearch || lightboxImg) {
          if (e.key === 'Escape') {
            setShowToc(false);
            setShowSettings(false);
            setShowSearch(false);
            setLightboxImg(null);
          }
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          if (viewMode === 'paginated') {
            goToPrevPage();
          } else {
            changeChapter(activeIdx - 1);
          }
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          if (viewMode === 'paginated') {
            goToNextPage();
          } else {
            changeChapter(activeIdx + 1);
          }
        } else if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'f' || e.key === 'F') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIdx, changeChapter, onClose, showToc, showSettings, showSearch, lightboxImg, viewMode, goToPrevPage, goToNextPage]);

    const handleShareDeepLink = useCallback(() => {
      try {
        const novelIdVal = novelId || (typeof window !== 'undefined' && window.__currentNovelId) || 'current';
        const deepHash = `#novel=${encodeURIComponent(novelIdVal)}&chapter=${activeIdx + 1}`;
        const fullUrl = window.location.origin + window.location.pathname + deepHash;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullUrl);
          if (typeof window.showToast === 'function') window.showToast('Deep link copied to clipboard!', 'success');
          else if (typeof window.toast === 'function') window.toast('Deep link copied to clipboard!', 'success');
        } else {
          prompt('Copy deep link:', fullUrl);
        }
      } catch (e) {
        console.warn('Share link failed:', e);
      }
    }, [novelId, activeIdx]);

    const parseInlineMarkdown = (text, keyPrefix = 'md') => {
      if (!text || typeof text !== 'string') return text;
      if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,})$/.test(text.trim())) return null;
      let s = text.replace(/^(\*{1,2}|_{1,2})(&gt;|>)\s*/, '$1')
                  .replace(/^(&gt;|>)\s*(\*{1,2}|_{1,2})/, '$1');
      const inlineRegex = /(`[^`]+`|\*\*\*[^\n]+?\*\*\*|___[^\n]+?___|\*\*[^\n]+?\*\*|__[^\n]+?__|\*(?:[^*\n\s](?:[^*\n]*?[^*\n\s])?|\S)\*|(?<!\w)_[^_\n]+?_(?!\w)|~~[^~]+~~)/g;
      const parts = s.split(inlineRegex);
      if (parts.length === 1) return parts[0];
      return parts.map((part, i) => {
        const k = `${keyPrefix}_${i}`;
        if (!part) return null;
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return h('code', { key: k, style: { fontFamily: 'monospace', fontSize: '0.9em', background: 'rgba(128,128,128,0.15)', padding: '2px 4px', borderRadius: 3 } }, part.slice(1, -1));
        }
        if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
          return h('strong', { key: k }, h('em', null, part.slice(3, -3)));
        }
        if (part.startsWith('___') && part.endsWith('___') && part.length > 6) {
          return h('strong', { key: k }, h('em', null, part.slice(3, -3)));
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const inner = part.slice(2, -2);
          return h('strong', { key: k }, parseInlineMarkdown(inner, `${k}_b`));
        }
        if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
          const inner = part.slice(2, -2);
          return h('strong', { key: k }, parseInlineMarkdown(inner, `${k}_b`));
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return h('em', { key: k }, part.slice(1, -1));
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          return h('em', { key: k }, part.slice(1, -1));
        }
        if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
          return h('del', { key: k }, part.slice(2, -2));
        }
        return part;
      }).filter(Boolean);
    };

    const renderParagraphNode = (el, pIdx, isPaginated, mCounterObj) => {
      if (el.type === 'image') {
        const thMatch = (el.src || '').match(/[#?]th=([A-Za-z0-9_-]+)/i);
        const thHash = thMatch ? thMatch[1] : null;
        let displaySrc = el.src || '';
        if (displaySrc.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(displaySrc)) {
          displaySrc = displaySrc.replace(/^http:\/\//i, 'https://');
        }
        if (/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i.test(displaySrc)) {
          displaySrc = displaySrc.replace(/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i, 'https://cdn.lnori.com/volume/$1.jpg');
        }
        if (displaySrc.includes('#th=')) {
          displaySrc = displaySrc.split('#th=')[0];
        }
        if (typeof window !== 'undefined' && window.getHighResIllustration) {
          const highRes = window.getHighResIllustration(displaySrc);
          if (highRes) displaySrc = highRes;
        }

        return h('div', {
          key: el.id,
          id: el.id,
          style: {
            margin: isPaginated ? '20px 0' : '24px 0',
            textAlign: 'center',
            cursor: 'zoom-in',
            breakInside: 'avoid',
            pageBreakInside: 'avoid'
          },
          onClick: (e) => {
            const currentImg = e.currentTarget.querySelector('img');
            setLightboxImg(currentImg?.src || displaySrc);
          }
        },
          h('img', {
            src: (typeof window !== 'undefined' && window.getSafeImageFallbackUrl) ? window.getSafeImageFallbackUrl(displaySrc) : displaySrc,
            alt: el.alt,
            loading: 'lazy',
            decoding: 'async',
            referrerPolicy: 'no-referrer',
            onError: (e) => {
              if (!e.target.dataset.highResTried) {
                e.target.dataset.highResTried = '1';
                const highRes = (typeof window !== 'undefined' && window.getHighResIllustration) ? window.getHighResIllustration(el.src) : null;
                if (highRes && e.target.src !== highRes) {
                  e.target.src = highRes;
                  return;
                }
              }
              if (thHash && !e.target.dataset.thumbhashLoaded) {
                e.target.dataset.thumbhashLoaded = '1';
                try {
                  const dataUrlFn = (typeof window !== 'undefined' && window.thumbHashToDataUrl) ? window.thumbHashToDataUrl : (typeof thumbHashToDataUrl === 'function' ? thumbHashToDataUrl : null);
                  if (dataUrlFn) {
                    const dataUrl = dataUrlFn(thHash);
                    if (dataUrl) {
                      e.target.src = dataUrl;
                      return;
                    }
                  }
                } catch (_) {}
              }
              if (!e.target.dataset.lnoriFallback && /(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\./i.test(el.src)) {
                e.target.dataset.lnoriFallback = '1';
                const cdnUrl = el.src.replace(/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.[^#?]*/i, 'https://cdn.lnori.com/volume/$1.jpg');
                e.target.src = cdnUrl;
                return;
              }
              if (typeof window !== 'undefined' && window.handleImageErrorFallback) {
                window.handleImageErrorFallback(e, displaySrc);
              }
            },
            style: {
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              maxHeight: isPaginated ? 'calc(100vh - 180px)' : '80vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
            }
          })
        );
      }

      if (el.type === 'divider') {
        return h('div', {
          key: el.id,
          id: el.id,
          className: 'reader-v2-scene-divider',
          style: {
            margin: isPaginated ? '20px auto' : '28px auto',
            textAlign: 'center',
            color: 'var(--r-muted, #94a3b8)',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            letterSpacing: '0.6em',
            fontSize: '1.2em',
            opacity: 0.7
          }
        }, '···');
      }

      if (el.type === 'table') {
        return h('div', {
          key: el.id,
          id: el.id,
          className: 'reader-v2-table-wrap',
          style: {
            margin: isPaginated ? '16px 0' : '24px 0',
            overflowX: 'auto',
            breakInside: 'avoid',
            pageBreakInside: 'avoid'
          }
        },
          h('table', {
            style: {
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.92em'
            }
          },
            h('tbody', null,
              (el.rows || []).map((rowStr, rIdx) => {
                const cells = rowStr.slice(1, -1).split('|').map(c => c.trim());
                const isHeader = rIdx === 0;
                return h('tr', { key: `r_${rIdx}` },
                  cells.map((cellTxt, cIdx) => h(isHeader ? 'th' : 'td', {
                    key: `c_${cIdx}`,
                    style: {
                      border: '1px solid var(--r-border, #cbd5e1)',
                      padding: '8px 12px',
                      fontWeight: isHeader ? 700 : 400,
                      background: isHeader ? 'var(--r-bg-subtle, rgba(255,255,255,0.05))' : 'transparent',
                      textAlign: 'left'
                    }
                  }, parseInlineMarkdown(cellTxt, `c_${rIdx}_${cIdx}`)))
                );
              })
            )
          )
        );
      }

      if (el.type === 'author-note') {
        const noteParagraphs = (el.content || '').split('\n').filter(Boolean);
        return h('aside', {
          key: el.id,
          id: el.id,
          className: 'reader-v2-author-note',
          style: {
            margin: isPaginated ? '20px 0' : '28px 0',
            padding: '14px 18px',
            borderLeft: '4px solid var(--r-accent, #6366f1)',
            backgroundColor: 'var(--r-bg-subtle, rgba(99, 102, 241, 0.08))',
            borderRadius: 6,
            fontSize: '0.94em',
            fontStyle: 'normal',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            textAlign: 'left'
          }
        },
          noteParagraphs.map((np, npIdx) => h('p', {
            key: `np_${npIdx}`,
            style: { margin: npIdx === noteParagraphs.length - 1 ? 0 : '0 0 8px 0', textIndent: 0, textAlign: 'left' }
          }, parseInlineMarkdown(np, `np_${npIdx}`)))
        );
      }

      if (el.type === 'blockquote') {
        const bqParagraphs = (el.content || '').split('\n').filter(Boolean);
        return h('blockquote', {
          key: el.id,
          id: el.id,
          className: 'reader-v2-blockquote',
          style: {
            margin: isPaginated ? '16px 0' : '20px 0',
            padding: '10px 16px',
            borderLeft: '3px solid var(--r-border, #cbd5e1)',
            opacity: 0.9,
            fontStyle: 'italic',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            textAlign: 'left'
          }
        },
          bqParagraphs.map((bp, bpIdx) => h('p', {
            key: `bp_${bpIdx}`,
            style: { margin: bpIdx === bqParagraphs.length - 1 ? 0 : '0 0 6px 0', textIndent: 0, textAlign: 'left' }
          }, parseInlineMarkdown(bp, `bp_${bpIdx}`)))
        );
      }

      const alignStyle = el.type === 'center'
        ? { textAlign: 'center', textIndent: 0 }
        : (el.type === 'right' ? { textAlign: 'right', textIndent: 0 } : {});

      let rawText = (el.content || '')
        .replace(/\[\/?(?:b|i|u|s|center|right|left)\]|\[\/?(?:color|size|font|align)(?:=[^\]]*)?\]/gi, '')
        .replace(/\*{4,}/g, '**');
      rawText = rawText.replace(/^(\*{1,2}|_{1,2})(&gt;|>)\s*/, '$1');
      rawText = rawText.replace(/^(&gt;|>)\s*(\*{1,2}|_{1,2})/, '$1');
      if (rawText.startsWith('**') && !rawText.slice(2).includes('**')) rawText = rawText.slice(2);
      if (rawText.endsWith('**') && !rawText.slice(0, -2).includes('**')) rawText = rawText.slice(0, -2);
      if (rawText.startsWith('*') && !rawText.slice(1).includes('*')) rawText = rawText.slice(1);
      if (rawText.endsWith('*') && !rawText.slice(0, -1).includes('*')) rawText = rawText.slice(0, -1);
      rawText = rawText.trim();
      const fnRegex = /\[([¹²³⁴⁵⁶⁷⁸⁹⁰]+|\d+)\]/g;
      const segments = [];
      let lastIdx = 0;
      let m;
      while ((m = fnRegex.exec(rawText)) !== null) {
        if (m.index > lastIdx) {
          segments.push({ type: 'text', content: rawText.slice(lastIdx, m.index) });
        }
        const num = m[1];
        const note = (footnotesMap && footnotesMap.get(num)) || (footnotesMap && footnotesMap.get(String(parseInt(num, 10)))) || `Cultural Context Note [${num}]`;
        segments.push({ type: 'footnote', num, note, raw: m[0] });
        lastIdx = fnRegex.lastIndex;
      }
      if (lastIdx < rawText.length) {
        segments.push({ type: 'text', content: rawText.slice(lastIdx) });
      }

      const renderTextWithSearch = (txt, segIdx) => {
        if (!showSearch || !searchQuery.trim()) {
          return parseInlineMarkdown(txt, `s_${segIdx}`);
        }
        const query = searchQuery.trim();
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sRegex = new RegExp(`(${escaped})`, 'gi');
        const parts = txt.split(sRegex);
        return parts.map((part, i) => {
          if (part.toLowerCase() === query.toLowerCase()) {
            const mIdx = mCounterObj.count++;
            const isCurrentActive = mIdx === activeMatchIndex;
            return h('mark', {
              key: `${segIdx}-${i}`,
              id: `search-match-${mIdx}`,
              className: `reader-v2-search-match ${isCurrentActive ? 'active' : ''}`
            }, part);
          }
          return parseInlineMarkdown(part, `sm_${segIdx}_${i}`);
        });
      };

      const pSentences = ttsActive ? (sentencesRef.current || []).filter(s => s.pIdx === pIdx) : [];

      if (ttsActive && pSentences.length > 0) {
        return h('p', { key: el.id, id: el.id, style: alignStyle },
          pSentences.map((s) => {
            const isSpeaking = s.sentIdx === activeSentenceIdx;
            return h('span', {
              key: `sent-${s.sentIdx}`,
              id: `tts-sent-${s.sentIdx}`,
              className: `reader-tts-sentence ${isSpeaking ? 'tts-speaking-sentence' : ''}`,
              style: {
                cursor: 'pointer',
                borderRadius: 4
              },
              title: 'Tap to read from here',
              onClick: (e) => {
                e.stopPropagation();
                speakSentence(s.sentIdx);
              }
            }, renderTextWithSearch(s.text + ' ', s.sentIdx));
          })
        );
      }

      return h('p', { key: el.id, id: el.id, style: alignStyle },
        segments.map((seg, sIdx) => {
          if (seg.type === 'footnote') {
            return h('sup', {
              key: sIdx,
              className: 'reader-footnote-badge',
              title: seg.note,
              onClick: (e) => {
                e.stopPropagation();
                setActiveFootnote({ num: seg.num, text: seg.note });
              }
            }, `[${seg.num}]`);
          }
          return renderTextWithSearch(seg.content, sIdx);
        })
      );
    };

        // Spot-specific bookmark proximity check (Rule: bookmark mark only visible when at bookmarked location)
    const isCurrentSpotBookmarked = useMemo(() => {
      if (!bookmarks || bookmarks.length === 0) return false;
      const curPct = viewMode === 'paginated'
        ? (totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 0)
        : chapterScrollPct;
      return bookmarks.some(b => {
        if (b.chapterIdx !== activeIdx) return false;
        if (typeof b.pct === 'number' && typeof curPct === 'number') {
          return Math.abs(b.pct - curPct) <= 3;
        }
        return false;
      });
    }, [bookmarks, activeIdx, chapterScrollPct, viewMode, totalPages, currentPage]);

    // ── 5. Render Reader Shell ──
    const themeClass = `reader-v2-theme-${theme || 'dark'}`;
    const fontClass = `reader-v2-font-${font || 'serif'}`;
    const widthClass = `reader-v2-w-${contentWidth || 'standard'}`;

    return h('div', {
      className: `reader-v2-shell ${themeClass} ${fontClass}`,
      style: { fontSize: `${fontSize}px`, lineHeight: lineHeight }
    },
      // ── MOON+ READER 1:1 TOP BAR (Screenshot 1) ──
      h(window.MoonReaderEngine?.Controls?.TopBar || 'div', {
        bookTitle,
        hudVisible,
        onClose: () => { stopTts(); onClose(); },
        onToggleMore: () => setShowMoreMenu(s => !s)
      }),

      // ── MORE ACTIONS POPUP MENU (...) ──
      h(window.ReaderMoreMenu || 'div', {
        hudVisible, showMoreMenu, setShowMoreMenu, ttsActive, setShowSearch, autoScroll, setAutoScroll,
        setShowVoiceModal, chapters, safeChapters, activeIdx, currentChapter, setSuiteModalChap,
        handleTranslateActiveChapter, isTranslatingCurrentChapter, handleHealActiveChapterLines,
        handleTranslateActiveChapterTitleOnly, isTranslatingTitles, isHealingAll, setLiveStreamText,
        streamBufferRef, setIsLiveDashboardOpen, onExportEpub, onOpenHealthAudit, onOpenDiff,
        onClose, novelId, handleShareDeepLink
      }),

      // ── FLOATING IN-CHAPTER SEARCH BAR ──
      h(window.ReaderSearchBar || 'div', {
        showSearch, setShowSearch, searchQuery, setSearchQuery, searchMatches,
        activeMatchIndex, setActiveMatchIndex, handlePrevSearchMatch, handleNextSearchMatch
      }),

      // ── READING CANVAS CONTAINER ──
      viewMode === 'paginated'
        ? h('div', {
            id: 'gemini-foliate-wrapper',
            ref: paginatedViewportRef,
            className: 'reader-v2-paginated-viewport',
            onClick: handlePaginatedClick,
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd
          },
            // Moon+ Reader Top-Right Dog-Ear Bookmark Indicator
            isCurrentSpotBookmarked && h('div', {
              className: 'moon-dogear-corner',
              title: 'Chapter Bookmarked · Tap to toggle',
              onClick: (e) => {
                e.stopPropagation();
                handleToggleBookmark();
              }
            }),
            // Multi-column Paginated Track
            h('div', {
              ref: paginatedTrackRef,
              className: `reader-v2-paginated-track ${paragraphIndent ? 'reader-v2-indent' : ''}`,
              style: {
                textAlign: justify ? 'justify' : 'left',
                columnWidth: colWidth > 0 ? `${colWidth}px` : 'calc(100vw - 64px)',
                transform: `translateX(-${currentPage * (colWidth > 0 ? colWidth + 60 : 0)}px)`
              }
            },
              // Chapter Header
              h('div', {
                style: {
                  borderBottom: '1px solid var(--r-border)',
                  paddingBottom: 16,
                  marginBottom: 24,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid'
                }
              },
                currentChapter.arc && h('div', {
                  style: {
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--r-accent)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 4
                  }
                }, currentChapter.arc),
                h('h2', {
                  style: {
                    margin: 0,
                    fontSize: '1.4em',
                    fontWeight: 700,
                    lineHeight: 1.3
                  }
                }, (typeof window !== 'undefined' && window.cleanRawChapterTitle) ? window.cleanRawChapterTitle(currentChapter.title) : currentChapter.title),
                h('div', {
                  style: {
                    fontSize: 11.5,
                    color: 'var(--r-muted)',
                    marginTop: 6
                  }
                }, `Chapter ${activeIdx + 1} of ${safeChapters.length} · ~${currentChapter.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words`)
              ),

              // Paragraphs and Illustrations with Footnotes & Search
              (() => {
                let mCounter = { count: 0 };
                return chapterElements.map((el, pIdx) => renderParagraphNode(el, pIdx, true, mCounter));
              })()
            ),

            // Bottom Paginated Page Indicator Pill
            h('div', {
              className: 'reader-v2-page-indicator-pill'
            }, `Page ${currentPage + 1} of ${totalPages} · Chapter ${activeIdx + 1}/${safeChapters.length}`)
          )
        : h('div', {
            id: 'gemini-reader-scroll-area',
            className: 'reader-v2-scroll-container',
            onScroll: handleScroll,
            onTouchStart: scrollGestures?.onTouchStart,
            onTouchMove: scrollGestures?.onTouchMove,
            onTouchEnd: scrollGestures?.onTouchEnd,
            onWheel: scrollGestures?.onWheel,
            onClick: (e) => {
              // Toggle HUD on central canvas click (ignore if user is selecting text)
              const selection = window.getSelection();
              if (selection && selection.toString().trim().length > 0) return;
              if (e.target.tagName === 'IMG' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
              if (showMoreMenu) {
                setShowMoreMenu(false);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;

              // Moon+ Reader Top-Right Dog-Ear Bookmark Tap Zone (top 75px, right 75px)
              if (clickX > rect.width - 75 && clickY < 75) {
                handleToggleBookmark();
                return;
              }

              setHudVisible(prev => !prev);
            }
          },
            // Moon+ Reader Top-Right Dog-Ear Bookmark Indicator
            isCurrentSpotBookmarked && h('div', {
              className: 'moon-dogear-corner',
              title: 'Chapter Bookmarked · Tap to toggle',
              onClick: (e) => {
                e.stopPropagation();
                handleToggleBookmark();
              }
            }),
            h('div', { className: `reader-v2-content-box ${widthClass} ${paragraphIndent ? 'reader-v2-indent' : ''}`, style: { textAlign: justify ? 'justify' : 'left' } },
          // Moon+ Reader Centered Bold Chapter Header (Screenshot 1)
          (() => {
            const rawT = (typeof window !== 'undefined' && window.cleanRawChapterTitle) ? window.cleanRawChapterTitle(currentChapter.title) : (currentChapter.title || '');
            const match = rawT.match(/^(?:chapter|ch|c)?\s*(\d+(?:\.\d+)?)\s*[:：\-_.]\s*(.*)$/i);
            const numPart = match ? `Chapter ${match[1]}:` : `Chapter ${activeIdx + 1}:`;
            const namePart = match ? match[2].trim() : rawT.replace(/^(?:chapter|ch|c)?\s*\d+\s*/i, '').trim();
            return h('div', { className: 'moon-chapter-header' },
              currentChapter.arc && h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--r-accent)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, currentChapter.arc),
              h('div', { className: 'moon-chapter-header-number' }, numPart),
              namePart && h('div', { className: 'moon-chapter-header-title' }, namePart)
            );
          })(),

          // Chapter Paragraphs & Illustrations with Footnotes & Search
          (() => {
            let mCounter = { count: 0 };
            return chapterElements.map((el, pIdx) => renderParagraphNode(el, pIdx, false, mCounter));
          })()
        )
      ),

      // ── MOON+ READER MINIMAL STATUS BAR (Active during immersive reading) ──
      h(window.MoonReaderEngine?.StatusBar || 'div', {
        bookTitle, chapterTitle: currentChapter?.title, chapterIndex: activeIdx,
        totalChapters: safeChapters.length,
        chapterScrollPct: viewMode === 'paginated' ? (totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 0) : chapterScrollPct,
        visible: !hudVisible && moonStatusBar !== false,
        chapters: safeChapters, currentChapter, currentPage, totalPages, viewMode
      }),

      // ── MOON+ READER 1:1 BOTTOM CONTROLS DOCK (Screenshots 1 & 2) ──
      h(window.MoonReaderEngine?.Controls?.BottomHud || 'div', {
        hudVisible,
        activeIdx,
        safeChapters,
        changeChapter,
        isScrubbing,
        setIsScrubbing,
        scrubberIdx,
        setScrubberIdx,
        chapterScrollPct,
        fontSize,
        setFontSize,
        showQuickFont,
        setShowQuickFont,
        onToggleSearch: () => setShowSearch(s => !s),
        onOpenSuite: () => {
          const targetChap = (chapters && chapters[activeIdx]) || (safeChapters && safeChapters[activeIdx]) || currentChapter;
          setSuiteModalChap(targetChap || { idx: activeIdx, title: `Chapter ${activeIdx + 1}` });
        },
        onOpenDashboard: () => {
          setLiveStreamText(streamBufferRef.current || '');
          setIsLiveDashboardOpen(true);
        },
        onToggleMore: () => setShowMoreMenu(s => !s),
        ttsActive,
        toggleTts,
        onOpenSettings: () => setShowSettings(true),
        autoScroll,
        onToggleAutoScroll: () => setAutoScroll(s => !s),
        onToggleBookmark: handleToggleBookmark,
        isCurrentBookmarked: isCurrentSpotBookmarked,
        onOpenToc: (tab = 'chapters') => { setTocTab(tab); setShowToc(true); },
        onOpenBookmarksDrawer: () => { setTocTab('bookmarks'); setTocBmFilter('all'); setShowToc(true); }
      }),

      // ── MOON+ READER FLOATING TTS PLAYER (Screenshots 1 & 3) ──
      h(window.ReaderTtsPlayerBar || (typeof ReaderTtsPlayerBar !== 'undefined' ? ReaderTtsPlayerBar : 'div'), {
        ttsActive, ttsRate, handleRateChange, stopTts, activeIdx, changeChapter,
        activeSentenceIdx, speakSentence, setShowVoiceModal, ttsPaused, toggleTts,
        sentencesRef, safeChapters, setShowTtsOptionsModal, setShowMoreMenu, showMoreMenu
      }),

      // ── FLOATING AUTO-SCROLL PILL (WHEN ACTIVE) ──
      autoScroll && h('div', { className: 'reader-v2-autoscroll-pill' },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('Zap', 13), 'Auto-Scroll'),
        h('button', {
          type: 'button',
          style: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' },
          onClick: () => setAutoScrollSpeed(s => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))))
        }, '–'),
        h('span', { style: { minWidth: 32, textAlign: 'center' } }, `${autoScrollSpeed}x`),
        h('button', {
          type: 'button',
          style: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' },
          onClick: () => setAutoScrollSpeed(s => Math.min(4.0, parseFloat((s + 0.25).toFixed(2))))
        }, '+'),
        h('button', {
          type: 'button',
          style: { background: 'none', border: 'none', color: '#f87171', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
          onClick: () => setAutoScroll(false)
        }, ic('X', 14))
      ),

      // ── DYNAMIC FLOATING TRANSLATION PROGRESS PILL ──
      h(window.ReaderDynamicProgressPill || (typeof ReaderDynamicProgressPill !== 'undefined' ? ReaderDynamicProgressPill : 'div'), {
        isTranslating: isTranslatingCurrentChapter,
        isHealing: isTranslatingCurrentChapter && activeTranslationMode === 'heal',
        isTranslatingTitles: isTranslatingTitles,
        activeMode: activeTranslationMode,
        chapterIndex: activeIdx,
        chapterTitle: currentChapter?.title,
        pct: isTranslatingTitles ? ((titlesProgress.done / Math.max(1, titlesProgress.total || 1)) * 100) : chapterTranslateProgress.pct,
        statusMsg: isTranslatingTitles ? `Translating title ${titlesProgress.done + 1} of ${titlesProgress.total}` : chapterTranslateProgress.msg,
        chunkCurrent: chunkProgress.current,
        chunkTotal: chunkProgress.total,
        titlesProgress,
        hudVisible,
        onOpenDashboard: () => {
          setLiveStreamText(streamBufferRef.current || '');
          setIsLiveDashboardOpen(true);
        },
        onStop: handleStopChapterTranslation
      }),

      // ── EXPANDABLE LIVE TRANSLATION DASHBOARD MODAL ──
      h(window.ReaderLiveDashboardModal || (typeof ReaderLiveDashboardModal !== 'undefined' ? ReaderLiveDashboardModal : 'div'), {
        isOpen: isLiveDashboardOpen,
        onClose: () => setIsLiveDashboardOpen(false),
        isPaused: isTranslationPaused,
        onPause: handleTogglePause,
        onResume: handleTogglePause,
        onStop: handleStopChapterTranslation,
        activeMode: activeTranslationMode || (isTranslatingTitles ? 'titles' : 'full'),
        chapterIndex: activeIdx,
        chapterTitle: currentChapter?.title,
        pct: isTranslatingTitles ? ((titlesProgress.done / Math.max(1, titlesProgress.total || 1)) * 100) : chapterTranslateProgress.pct,
        statusMsg: isTranslatingTitles ? `Translating title ${titlesProgress.done + 1} of ${titlesProgress.total}` : chapterTranslateProgress.msg,
        elapsedSeconds: translationElapsedSec,
        tokenEstimate: Math.round((liveStreamText.length || 0) / 4),
        streamText: liveStreamText,
        healingBlocks: liveHealingBlocks,
        chunkCurrent: chunkProgress.current,
        chunkTotal: chunkProgress.total
      }),

      // ── CHAPTER TRANSLATION SUITE MODAL ──
      h(window.ChapterTranslationSuiteModal || (typeof ChapterTranslationSuiteModal !== 'undefined' ? ChapterTranslationSuiteModal : 'div'), {
        isOpen: Boolean(suiteModalChap),
        onClose: () => setSuiteModalChap(null),
        chapter: suiteModalChap,
        chapters: safeChapters,
        novelRecord: activeNovelRecord || (typeof window !== 'undefined' && window.activeNovelRecord),
        appSettings: appSettings || {},
        onExecute: (chosenAction, optionsOverride, scope, chap, selectedIndices) => {
          if (Array.isArray(selectedIndices) && selectedIndices.length > 1) {
            window.ReaderBatchTranslationOrchestrator?.executeBatch({
              chapterIndices: selectedIndices,
              action: chosenAction,
              optionsOverride,
              chapters,
              safeChapters,
              activeIdx,
              currentChapter,
              onTranslateChapter,
              onChaptersChange,
              activeNovelRecord: activeNovelRecord || (typeof window !== 'undefined' && window.activeNovelRecord),
              setChapterTranslateProgress,
              setChunkProgress,
              setIsTranslatingCurrentChapter,
              setActiveTranslationMode,
              streamBufferRef,
              isLiveDashboardOpenRef,
              setLiveStreamText,
              translationAbortRef,
              toast: window.toast
            });
            return;
          }
          const chapIdx = suiteModalChap?.idx ?? activeIdx;
          if (chosenAction === 'heal') {
            handleHealActiveChapterLines(chapIdx, optionsOverride);
          } else if (chosenAction === 'title') {
            handleTranslateActiveChapterTitleOnly(chapIdx, optionsOverride);
          } else {
            handleTranslateActiveChapter(chapIdx, optionsOverride);
          }
        }
      }),

      // ── IN-CHAPTER SELECTION TRANSLATOR (FLOATING PILL) ──
      h(window.ReaderSelectionTranslator || 'div', {
        currentChapter,
        activeIdx,
        chapters,
        safeChapters,
        onChaptersChange,
        novelRecord: activeNovelRecord || (typeof window !== 'undefined' && window.activeNovelRecord),
        appSettings: appSettings || {},
        onRenderTrigger: () => setRenderTick(t => t + 1)
      }),

      // ── HIERARCHICAL ARC & VOLUME TABLE OF CONTENTS DRAWER ──
      h(window.ReaderTocDrawer || (typeof ReaderTocDrawer !== 'undefined' ? ReaderTocDrawer : 'div'), {
        showToc, setShowToc, tocSearch, setTocSearch, arcGroups, collapsedArcs,
        toggleArcCollapse, activeIdx, activeTocItemRef, changeChapter,
        onTranslateChapter: handleTranslateActiveChapter,
        onTranslateChapterTitle: handleTranslateActiveChapterTitleOnly,
        onHealChapterLines: handleHealActiveChapterLines,
        onTranslateAllTitles: handleTranslateAllChapterTitles,
        isTranslatingTitles, titlesProgress,
        onHealAllChapters: handleHealAllChapters,
        isHealingAll, healAllProgress,
        onOpenSuiteModal: (c) => setSuiteModalChap(c),
        bookTitle, totalChapters: safeChapters.length, chapters: safeChapters, chapterScrollPct,
        bookmarks, onToggleBookmark: handleToggleBookmark,
        coverUrl: activeNovelRecord?.cover || activeNovelRecord?.coverUrl || (typeof window !== 'undefined' ? window.currentDocCover : '') || '',
        onOpenLightbox: (src) => setLightboxImg(src),
        onAddBookmark: handleAddBookmark, onDeleteBookmark: handleDeleteBookmark,
        initialTocTab: tocTab, initialBmFilter: tocBmFilter
      }),

      // ── TYPOGRAPHY & THEMES SETTINGS MODAL ──
      h(window.ReaderTypographyModal || (typeof ReaderTypographyModal !== 'undefined' ? ReaderTypographyModal : 'div'), {
        showSettings, setShowSettings, viewMode, setViewMode, theme, setTheme,
        font, setFont, contentWidth, setContentWidth, lineHeight, setLineHeight,
        paragraphIndent, setParagraphIndent, justify, setJustify, ttsEngines,
        selectedTtsEngine, setSelectedTtsEngine, ttsVoices, selectedTtsVoice,
        setSelectedTtsVoice, ttsRate, handleRateChange, dacDelayMs, setDacDelayMs,
        sleepTimerMinutes, setSleepTimerMinutes, setSleepTimerSecondsLeft, setShowVoiceModal,
        moonStatusBar, setMoonStatusBar
      }),

      // ── VOICE & OFFLINE ENGINE SELECTION MODAL ──
      h(window.ReaderVoiceModal || (typeof ReaderVoiceModal !== 'undefined' ? ReaderVoiceModal : 'div'), {
        showVoiceModal, setShowVoiceModal, systemTtsInfo, previewSpeaking,
        previewVoice, refreshSystemTts, ttsRate, handleRateChange, dacDelayMs,
        setDacDelayMs, showSherpaHelp, setShowSherpaHelp
      }),

      // ── MOON+ READER TTS OPTIONS MODAL ──
      h(window.ReaderTtsOptionsModal || (typeof ReaderTtsOptionsModal !== 'undefined' ? ReaderTtsOptionsModal : 'div'), {
        showTtsOptionsModal, setShowTtsOptionsModal, systemTtsInfo, setShowVoiceModal,
        divideBy, setDivideBy, stopAfterEnabled, setStopAfterEnabled, stopAfterMinutes,
        setStopAfterMinutes, showConfirmBeforeSpeak, setShowConfirmBeforeSpeak,
        speakingIntervalMs, setSpeakingIntervalMs, setShowCharsFilterModal,
        disableAudioFocus, setDisableAudioFocus, setShowGestureGuideModal
      }),

      // ── MOON+ READER TTS CHARS FILTERS MODAL ──
      h(window.ReaderCharsFilterModal || (typeof ReaderCharsFilterModal !== 'undefined' ? ReaderCharsFilterModal : 'div'), {
        showCharsFilterModal, setShowCharsFilterModal, filterSearchQuery,
        setFilterSearchQuery, ttsCharFilters, setTtsCharFilters, ttsUseRegex, setTtsUseRegex
      }),

      // ── MOON+ READER GESTURE CARD ──
      h(window.ReaderGestureGuideModal || (typeof ReaderGestureGuideModal !== 'undefined' ? ReaderGestureGuideModal : 'div'), {
        showGestureGuideModal, setShowGestureGuideModal
      }),

      // ── LIGHTBOX ILLUSTRATION MODAL ──
      h(window.ReaderLightboxModal || 'div', { lightboxImg, setLightboxImg }),

      // ── FLOATING CULTURAL FOOTNOTE CARD (§5.10) ──
      h(window.ReaderFootnoteCard || 'div', { activeFootnote, setActiveFootnote })
    );
  };

  if (typeof window !== 'undefined') {
    window.MoonReaderModal = MoonReaderModal;
  }
})(typeof window !== 'undefined' ? window : this);
