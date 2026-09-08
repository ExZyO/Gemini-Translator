/**
 * Gemini Translator - Pro Reader Engine (v8.10.57)
 * Architecture inspired by Foliate-js & Moon+ Reader Pro & Legado
 * Features:
 *  - Dual Reading Modes: Continuous Webtoon Scroll & Paginated Book Flip
 *  - Interactive 3-Zone Tap Navigation (Left 25% Prev, Right 25% Next, Center 50% HUD)
 *  - Auto-Scroll Hands-Free Engine with floating speed pill (0.5x - 4.0x)
 *  - In-Reader Keyword Search & Highlight with Match Stepper
 *  - Real-Time TOC Search & Filtering for 500+ chapter web novels
 *  - Tap-to-Zoom Fullscreen Illustration Lightbox
 *  - 7 Open-Source Inspired Themes (AMOLED Pitch Black, Midnight Slate, Nord Frost, Warm Sepia, Antique Parchment, Mint Sage, Clean White)
 *  - Rich Typography Controls: Margins/Width, Line Spacing, Indentation, Justify, Custom Fonts
 *  - SpeechSynthesis Pro TTS with Sentence Highlight & Follow-Along Auto-Scroll
 *  - Reading Speed & Estimated Time Remaining (Chapter & Book)
 *  - Keyboard Navigation (Arrows, Space, J/K, Escape, F for Fullscreen)
 */
(function(window) {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const h = React.createElement;

  // ══════════════════════════════════════════════════════════════════════
  // INLINE STYLES FOR STATE-OF-THE-ART READER EXPERIENCE
  // ══════════════════════════════════════════════════════════════════════
  const READER_STYLES_ID = 'gemini-reader-pro-styles';
  function ensureReaderStyles() {
    if (typeof document === 'undefined' || document.getElementById(READER_STYLES_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = READER_STYLES_ID;
    styleEl.textContent = `
      .reader-pro-shell {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        user-select: text;
        -webkit-user-select: text;
        touch-action: pan-y;
        overflow: hidden;
      }
      .reader-pro-theme-black { background: #000000; color: #d1d5db; --reader-accent: #f59e0b; --reader-bg: #000000; --reader-card: #111111; --reader-border: #222222; --reader-text: #d1d5db; --reader-muted: #888888; }
      .reader-pro-theme-dark { background: #0a0f1d; color: #cbd5e1; --reader-accent: #60a5fa; --reader-bg: #0a0f1d; --reader-card: #141c2f; --reader-border: #222f4c; --reader-text: #cbd5e1; --reader-muted: #7b8fa7; }
      .reader-pro-theme-nord { background: #242933; color: #eceff4; --reader-accent: #88c0d0; --reader-bg: #242933; --reader-card: #2e3440; --reader-border: #434c5e; --reader-text: #eceff4; --reader-muted: #9baec8; }
      .reader-pro-theme-sepia { background: #fbf0d9; color: #433422; --reader-accent: #b45309; --reader-bg: #fbf0d9; --reader-card: #f3e5c8; --reader-border: #e3d2b2; --reader-text: #433422; --reader-muted: #7d6b53; }
      .reader-pro-theme-parchment { background: #f4ecd8; color: #383226; --reader-accent: #92400e; --reader-bg: #f4ecd8; --reader-card: #eadebe; --reader-border: #dbcbb1; --reader-text: #383226; --reader-muted: #706551; }
      .reader-pro-theme-sage { background: #e2ece2; color: #223322; --reader-accent: #15803d; --reader-bg: #e2ece2; --reader-card: #d3e4d3; --reader-border: #bed6be; --reader-text: #223322; --reader-muted: #567056; }
      .reader-pro-theme-light { background: #ffffff; color: #111827; --reader-accent: #4f46e5; --reader-bg: #ffffff; --reader-card: #f3f4f6; --reader-border: #e5e7eb; --reader-text: #111827; --reader-muted: #6b7280; }

      .reader-pro-font-serif { font-family: 'Literata', 'Merriweather', Georgia, 'Times New Roman', serif; }
      .reader-pro-font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', 'Segoe UI', sans-serif; }
      .reader-pro-font-mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, monospace; }
      .reader-pro-font-dyslexic { font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif; }

      .reader-pro-canvas-container {
        flex: 1;
        min-height: 0;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
      }
      .reader-pro-scroll-area {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
      .reader-pro-content-wrapper {
        margin: 0 auto;
        padding: 36px 24px 120px;
        transition: max-width 0.2s ease;
      }
      .reader-pro-width-compact { max-width: 600px; }
      .reader-pro-width-standard { max-width: 740px; }
      .reader-pro-width-wide { max-width: 960px; }
      .reader-pro-width-full { max-width: 100%; padding-left: 32px; padding-right: 32px; }

      .reader-pro-content-wrapper p {
        margin-bottom: 1.25em;
        position: relative;
      }
      .reader-pro-indent p {
        text-indent: 1.8em;
      }
      .reader-pro-content-wrapper p.speaking {
        background: rgba(245, 158, 11, 0.18);
        border-radius: 6px;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.22);
        transition: background 0.2s ease;
      }
      .reader-pro-search-highlight {
        background: #facc15;
        color: #000000;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 2px;
      }
      .reader-pro-search-highlight.active-match {
        background: #f97316;
        color: #ffffff;
        box-shadow: 0 0 0 3px #f97316;
      }

      /* Tap Zones Overlay */
      .reader-pro-tap-zone-left { position: absolute; top: 60px; bottom: 60px; left: 0; width: 22%; z-index: 10; cursor: pointer; }
      .reader-pro-tap-zone-right { position: absolute; top: 60px; bottom: 60px; right: 0; width: 22%; z-index: 10; cursor: pointer; }
      .reader-pro-tap-zone-center { position: absolute; top: 60px; bottom: 60px; left: 22%; width: 56%; z-index: 10; cursor: pointer; }

      /* Auto-Scroll Floating Pill */
      .reader-pro-autoscroll-pill {
        position: absolute;
        bottom: 80px;
        right: 24px;
        z-index: 40;
        background: rgba(18, 18, 24, 0.88);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 30px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        font-size: 13px;
        font-weight: 600;
        animation: fadeIn 0.2s ease;
      }

      /* Lightbox Modal */
      .reader-pro-lightbox {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.94);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
      }
      .reader-pro-lightbox img {
        max-width: 95vw;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      }
    `;
    document.head.appendChild(styleEl);
  }

  const MoonReaderModal = ({
    open,
    onClose,
    text,
    chapters,
    currentIdx,
    onChapterChange,
    theme = 'dark',
    setTheme,
    font = 'serif',
    setFont,
    fontSize = 18,
    setFontSize,
    tgtLang,
    onVerifyConsistency
  }) => {
    if (!open) return null;

    ensureReaderStyles();

    // 1. Chapter Normalization
    const safeChapters = useMemo(() => {
      let list = Array.isArray(chapters) && chapters.length > 0
        ? chapters.filter(c => c && typeof c === 'object').map(c => ({
            title: c.title || 'Chapter',
            text: c.content || c.text || '',
            originalTitle: c.originalTitle || ''
          }))
        : [];

      if (list.length === 0 && text && typeof text === 'string') {
        const lines = text.split(/\r?\n/);
        const isHeading = (l) => {
          const trimmed = l.trim();
          return /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+|\d+[\.\s]+|\#+\s+)/i.test(trimmed);
        };
        let curTitle = 'Chapter 1';
        let curLines = [];
        for (const line of lines) {
          if (isHeading(line) && curLines.length > 0) {
            list.push({ title: curTitle, text: curLines.join('\n') });
            curTitle = line.trim();
            curLines = [];
          } else {
            curLines.push(line);
          }
        }
        if (curLines.length > 0) {
          list.push({ title: curTitle, text: curLines.join('\n') });
        }
      }

      if (list.length === 0) {
        list = [{ title: 'Chapter 1', text: text || 'No text loaded.' }];
      }
      return list;
    }, [chapters, text]);

    // Active Chapter State
    const [activeIdx, setActiveIdx] = useState(typeof currentIdx === 'number' && currentIdx >= 0 ? currentIdx : 0);
    const activeIdxRef = useRef(activeIdx);
    activeIdxRef.current = activeIdx;

    useEffect(() => {
      if (typeof currentIdx === 'number' && currentIdx >= 0 && currentIdx !== activeIdx) {
        setActiveIdx(currentIdx);
      }
    }, [currentIdx]);

    // UI Overlays State
    const [chrome, setChrome] = useState(false); // Controls top & bottom HUD
    const [showToc, setShowToc] = useState(false);
    const [tocSearch, setTocSearch] = useState('');
    const [showVisual, setShowVisual] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const [showTtsBar, setShowTtsBar] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    // Advanced Typography & Reader Settings
    const [readMode, setReadMode] = useState(() => {
      try { return localStorage.getItem('gemini_reader_mode') || 'scroll'; } catch(e) { return 'scroll'; }
    });
    useEffect(() => { try { localStorage.setItem('gemini_reader_mode', readMode); } catch(e) {} }, [readMode]);

    const [contentWidth, setContentWidth] = useState(() => {
      try { return localStorage.getItem('gemini_reader_width') || 'standard'; } catch(e) { return 'standard'; }
    });
    useEffect(() => { try { localStorage.setItem('gemini_reader_width', contentWidth); } catch(e) {} }, [contentWidth]);

    const [lineHeight, setLineHeight] = useState(() => {
      try { return parseFloat(localStorage.getItem('gemini_reader_lineheight')) || 1.8; } catch(e) { return 1.8; }
    });
    useEffect(() => { try { localStorage.setItem('gemini_reader_lineheight', String(lineHeight)); } catch(e) {} }, [lineHeight]);

    const [paragraphIndent, setParagraphIndent] = useState(() => {
      try { return localStorage.getItem('gemini_reader_indent') === 'true'; } catch(e) { return false; }
    });
    useEffect(() => { try { localStorage.setItem('gemini_reader_indent', String(paragraphIndent)); } catch(e) {} }, [paragraphIndent]);

    const [justify, setJustify] = useState(() => {
      try { return localStorage.getItem('readerJustify') !== 'false'; } catch(e) { return false; }
    });
    useEffect(() => { try { localStorage.setItem('readerJustify', String(justify)); } catch(e) {} }, [justify]);

    // Auto-Scroll State
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(1.0); // 1.0 = ~32px/s
    const autoScrollTimerRef = useRef(null);

    // Paginated Book View State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // TTS Engine State
    const [ttsPlaying, setTtsPlaying] = useState(false);
    const [ttsPaused, setTtsPaused] = useState(false);
    const [ttsSpeed, setTtsSpeed] = useState(1.0);
    const [ttsPitch, setTtsPitch] = useState(1.0);
    const [ttsVolume, setTtsVolume] = useState(1.0);
    const [ttsVoices, setTtsVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);

    const containerRef = useRef(null);
    const sentencesRef = useRef([]);
    const sentenceIdxRef = useRef(0);
    const advancingRef = useRef(false);
    const ttsPlayingRef = useRef(false);
    ttsPlayingRef.current = ttsPlaying && !ttsPaused;

    const currentChapter = safeChapters[activeIdx] || safeChapters[0];
    const firstChapterTitle = currentChapter?.title || 'Chapter';

    // 2. Parse Chapter Paragraphs & Illustrations
    const parsedParagraphs = useMemo(() => {
      let rawText = currentChapter?.text || '';
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && currentChapter?.title) {
        rawText = stripFn(rawText, currentChapter.title, currentChapter.originalTitle);
      }
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      return lines.map((line, pIdx) => {
        const imgMatch = line.match(/^!\[(.*?)\]\((https?:\/\/[^\)]+)\)$/);
        if (imgMatch) {
          return { isImage: true, alt: imgMatch[1] || 'Illustration', url: imgMatch[2], pIdx };
        }
        return { isImage: false, text: line, pIdx };
      });
    }, [currentChapter]);

    // 3. Navigation Controls
    const advanceChapter = useCallback(() => {
      if (advancingRef.current) return;
      if (activeIdxRef.current >= safeChapters.length - 1) return;
      advancingRef.current = true;
      const next = activeIdxRef.current + 1;
      setActiveIdx(next);
      onChapterChange?.(next);
      setCurrentPage(1);
      if (containerRef.current) containerRef.current.scrollTop = 0;
      setTimeout(() => { advancingRef.current = false; }, 400);
      if (ttsPlayingRef.current) setTimeout(() => speakSentence(0), 300);
    }, [safeChapters.length, onChapterChange]);

    const prevChapter = useCallback(() => {
      if (advancingRef.current || activeIdxRef.current <= 0) return;
      advancingRef.current = true;
      const prev = activeIdxRef.current - 1;
      setActiveIdx(prev);
      onChapterChange?.(prev);
      setCurrentPage(1);
      if (containerRef.current) containerRef.current.scrollTop = 0;
      setTimeout(() => { advancingRef.current = false; }, 400);
      if (ttsPlayingRef.current) setTimeout(() => speakSentence(0), 300);
    }, [onChapterChange]);

    // Page Up / Down for Paginated or Scroll mode
    const handlePageNext = useCallback(() => {
      if (readMode === 'paginated') {
        if (currentPage < totalPages) {
          setCurrentPage(p => p + 1);
          if (containerRef.current) {
            containerRef.current.scrollTop = (currentPage) * containerRef.current.clientHeight;
          }
        } else {
          advanceChapter();
        }
      } else {
        if (containerRef.current) {
          const scrollStep = containerRef.current.clientHeight * 0.85;
          containerRef.current.scrollBy({ top: scrollStep, behavior: 'smooth' });
        }
      }
    }, [readMode, currentPage, totalPages, advanceChapter]);

    const handlePagePrev = useCallback(() => {
      if (readMode === 'paginated') {
        if (currentPage > 1) {
          setCurrentPage(p => p - 1);
          if (containerRef.current) {
            containerRef.current.scrollTop = (currentPage - 2) * containerRef.current.clientHeight;
          }
        } else {
          prevChapter();
        }
      } else {
        if (containerRef.current) {
          const scrollStep = containerRef.current.clientHeight * 0.85;
          containerRef.current.scrollBy({ top: -scrollStep, behavior: 'smooth' });
        }
      }
    }, [readMode, currentPage, prevChapter]);

    // 4. Keyboard Shortcuts
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          handlePageNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          handlePagePrev();
        } else if (e.key === 'j') {
          if (containerRef.current) containerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
        } else if (e.key === 'k') {
          if (containerRef.current) containerRef.current.scrollBy({ top: -100, behavior: 'smooth' });
        } else if (e.key === 'Escape') {
          if (lightboxImage) setLightboxImage(null);
          else if (showSearch) setShowSearch(false);
          else if (showToc) setShowToc(false);
          else if (showVisual) setShowVisual(false);
          else if (chrome) setChrome(false);
          else onClose();
        } else if (e.key === 'f' || e.key === 'F') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePageNext, handlePagePrev, lightboxImage, showSearch, showToc, showVisual, chrome, onClose]);

    // 5. Auto-Scroll Engine
    useEffect(() => {
      if (!isAutoScrolling || readMode !== 'scroll') {
        if (autoScrollTimerRef.current) cancelAnimationFrame(autoScrollTimerRef.current);
        return;
      }
      let lastTimestamp = performance.now();
      const step = (timestamp) => {
        const delta = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        const px = autoScrollSpeed * 32 * delta; // 32px per sec at 1.0x
        if (containerRef.current) {
          containerRef.current.scrollTop += px;
          if (containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 30) {
            advanceChapter();
          }
        }
        autoScrollTimerRef.current = requestAnimationFrame(step);
      };
      autoScrollTimerRef.current = requestAnimationFrame(step);
      return () => {
        if (autoScrollTimerRef.current) cancelAnimationFrame(autoScrollTimerRef.current);
      };
    }, [isAutoScrolling, autoScrollSpeed, readMode, advanceChapter]);

    // 6. Update Total Pages in Paginated Mode
    useEffect(() => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const calcPages = () => {
        if (el.clientHeight > 0) {
          const pages = Math.max(1, Math.ceil(el.scrollHeight / el.clientHeight));
          setTotalPages(pages);
          const cur = Math.min(pages, Math.max(1, Math.floor(el.scrollTop / el.clientHeight) + 1));
          setCurrentPage(cur);
        }
      };
      calcPages();
      window.addEventListener('resize', calcPages);
      return () => window.removeEventListener('resize', calcPages);
    }, [parsedParagraphs, activeIdx, fontSize, lineHeight, contentWidth]);

    // 7. TTS Voices Setup
    useEffect(() => {
      const updateVoices = () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const vList = window.speechSynthesis.getVoices() || [];
          setTtsVoices(vList);
          if (vList.length > 0 && !selectedVoice) {
            const langCode = (tgtLang || 'en').toLowerCase().substring(0, 2);
            const matched = vList.find(v => v.lang.toLowerCase().startsWith(langCode)) || vList[0];
            if (matched) setSelectedVoice(matched.name);
          }
        }
      };
      updateVoices();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
      return () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }, [tgtLang, selectedVoice]);

    // TTS Sentence Splitting
    useEffect(() => {
      const textOnly = parsedParagraphs.filter(p => !p.isImage).map(p => p.text).join('\n');
      const rawSentences = textOnly
        .split(/([。！？!?\n]+)/)
        .reduce((acc, cur, i, arr) => {
          if (i % 2 === 0 && cur.trim()) {
            const punct = arr[i + 1] || '';
            acc.push((cur + punct).trim());
          }
          return acc;
        }, [])
        .filter(s => s.length > 1 && !s.startsWith('![Illustration]'));
      sentencesRef.current = rawSentences.length > 0 ? rawSentences : [currentChapter?.title || ''];
      sentenceIdxRef.current = 0;
      setActiveSentenceIdx(ttsPlayingRef.current ? 0 : -1);
    }, [parsedParagraphs, currentChapter]);

    const speakSentence = (idx) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const sList = sentencesRef.current;
      if (idx < 0 || idx >= sList.length) {
        if (activeIdxRef.current < safeChapters.length - 1) {
          advanceChapter();
          return;
        } else {
          setTtsPlaying(false);
          setTtsPaused(false);
          setActiveSentenceIdx(-1);
          return;
        }
      }

      sentenceIdxRef.current = idx;
      setActiveSentenceIdx(idx);

      const u = new SpeechSynthesisUtterance(sList[idx]);
      u.rate = ttsSpeed;
      u.pitch = ttsPitch;
      u.volume = ttsVolume;
      if (selectedVoice) {
        const vObj = ttsVoices.find(v => v.name === selectedVoice);
        if (vObj) u.voice = vObj;
      }

      u.onend = () => {
        if (ttsPlayingRef.current) speakSentence(idx + 1);
      };
      u.onerror = () => {
        if (ttsPlayingRef.current) speakSentence(idx + 1);
      };

      window.speechSynthesis.speak(u);
    };

    const handlePlayPauseTts = () => {
      if (!ttsPlaying) {
        setTtsPlaying(true);
        setTtsPaused(false);
        speakSentence(sentenceIdxRef.current >= 0 ? sentenceIdxRef.current : 0);
      } else if (ttsPaused) {
        setTtsPaused(false);
        window.speechSynthesis.resume();
      } else {
        setTtsPaused(true);
        window.speechSynthesis.pause();
      }
    };

    const handleStopTts = () => {
      setTtsPlaying(false);
      setTtsPaused(false);
      setActiveSentenceIdx(-1);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    // 8. Search & Matches inside Chapter
    const searchMatches = useMemo(() => {
      if (!searchQuery || searchQuery.trim().length < 2) return [];
      const q = searchQuery.toLowerCase();
      const matches = [];
      parsedParagraphs.forEach((p, pIdx) => {
        if (p.isImage || !p.text) return;
        const lower = p.text.toLowerCase();
        let pos = 0;
        while ((pos = lower.indexOf(q, pos)) !== -1) {
          matches.push({ pIdx, pos, text: p.text.substring(pos, pos + q.length) });
          pos += q.length;
        }
      });
      return matches;
    }, [searchQuery, parsedParagraphs]);

    const scrollToSearchMatch = (index) => {
      if (!containerRef.current || !searchMatches[index]) return;
      const match = searchMatches[index];
      const pEl = containerRef.current.querySelector(`[data-paragraph-idx="${match.pIdx}"]`);
      if (pEl) {
        pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // 9. Statistics (Reading time calculated at 220 WPM)
    const chapterWords = useMemo(() => (currentChapter?.text || '').split(/\s+/).filter(Boolean).length, [currentChapter]);
    const chapterMins = Math.max(1, Math.round(chapterWords / 220));
    const remainingWords = useMemo(() => {
      return safeChapters.slice(activeIdx).reduce((acc, c) => acc + (c.text || '').split(/\s+/).filter(Boolean).length, 0);
    }, [safeChapters, activeIdx]);
    const bookHours = remainingWords > 0 ? (remainingWords / 220 / 60).toFixed(1) : '0';
    const bookProgressPct = Math.round(((activeIdx + 1) / safeChapters.length) * 100);

    // 10. Filtered TOC items
    const filteredChapters = useMemo(() => {
      if (!tocSearch || !tocSearch.trim()) {
        return safeChapters.map((c, i) => ({ ...c, originalIdx: i }));
      }
      const q = tocSearch.toLowerCase().trim();
      return safeChapters
        .map((c, i) => ({ ...c, originalIdx: i }))
        .filter(c => (c.title || '').toLowerCase().includes(q) || String(c.originalIdx + 1).includes(q));
    }, [safeChapters, tocSearch]);

    // Active Theme & Font Classes
    const themeClass = `reader-pro-theme-${theme || 'dark'}`;
    const fontClass = `reader-pro-font-${font || 'serif'}`;
    const widthClass = `reader-pro-width-${contentWidth}`;

    return h('div', { className: `reader-pro-shell ${themeClass}` },

      // ── TOP NAVIGATION HUD ──
      chrome && h('header', {
        className: 'reader-top',
        style: { zIndex: 50, background: 'var(--reader-card)', borderBottom: '1px solid var(--reader-border)', color: 'var(--reader-text)' },
        onClick: (e) => e.stopPropagation()
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 } },
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Close Reader (Esc)',
            style: { border: 'none', background: 'transparent', color: 'var(--reader-text)', fontSize: 18, cursor: 'pointer' },
            onClick: () => { handleStopTts(); onClose(); }
          }, '←'),
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 'book-title', style: { color: 'var(--reader-text)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, firstChapterTitle),
            h('div', { className: 'ch', style: { color: 'var(--reader-muted)', fontSize: 11 } }, `Chapter ${activeIdx + 1} of ${safeChapters.length} · ${bookProgressPct}% Completed`)
          )
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          onVerifyConsistency && h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Verify Character Name Consistency',
            style: { border: 'none', background: 'transparent', color: 'var(--reader-text)', fontSize: 15, cursor: 'pointer' },
            onClick: () => { handleStopTts(); onClose(); onVerifyConsistency(); }
          }, '🔍'),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Search in Chapter (Ctrl+F)',
            style: { color: showSearch ? 'var(--reader-accent)' : 'var(--reader-text)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15 },
            onClick: () => setShowSearch(!showSearch)
          }, '🔎'),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: isAutoScrolling ? 'Pause Auto-Scroll' : 'Hands-Free Auto-Scroll',
            style: { color: isAutoScrolling ? 'var(--reader-accent)' : 'var(--reader-text)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15 },
            onClick: () => setIsAutoScrolling(!isAutoScrolling)
          }, isAutoScrolling ? '⏸' : '📜'),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Read Aloud (TTS)',
            style: { color: showTtsBar ? 'var(--reader-accent)' : 'var(--reader-text)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15 },
            onClick: () => { setShowTtsBar(!showTtsBar); if (!ttsPlaying && !showTtsBar) handlePlayPauseTts(); }
          }, '🔊'),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Table of Contents',
            style: { color: showToc ? 'var(--reader-accent)' : 'var(--reader-text)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 },
            onClick: () => setShowToc(!showToc)
          }, '☰'),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            title: 'Display & Typography Options',
            style: { color: showVisual ? 'var(--reader-accent)' : 'var(--reader-text)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 },
            onClick: () => setShowVisual(!showVisual)
          }, 'Aa')
        )
      ),

      // ── IN-READER SEARCH OVERLAY ──
      showSearch && h('div', {
        style: {
          background: 'var(--reader-card)',
          borderBottom: '1px solid var(--reader-border)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 45
        },
        onClick: (e) => e.stopPropagation()
      },
        h('span', { style: { fontSize: 13, color: 'var(--reader-muted)' } }, 'Search:'),
        h('input', {
          type: 'text',
          value: searchQuery,
          placeholder: 'Find words in this chapter...',
          autoFocus: true,
          onChange: (e) => { setSearchQuery(e.target.value); setActiveMatchIndex(0); },
          style: {
            flex: 1,
            padding: '6px 12px',
            background: 'var(--reader-bg)',
            border: '1px solid var(--reader-border)',
            borderRadius: 6,
            color: 'var(--reader-text)',
            fontSize: 13,
            outline: 'none'
          }
        }),
        h('span', { style: { fontSize: 12, color: 'var(--reader-muted)', minWidth: 70 } },
          searchMatches.length > 0 ? `${activeMatchIndex + 1} of ${searchMatches.length}` : '0 matches'
        ),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          disabled: searchMatches.length === 0,
          style: { padding: '4px 8px', fontSize: 12 },
          onClick: () => {
            const nextIdx = (activeMatchIndex - 1 + searchMatches.length) % searchMatches.length;
            setActiveMatchIndex(nextIdx);
            scrollToSearchMatch(nextIdx);
          }
        }, '▲ Prev'),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          disabled: searchMatches.length === 0,
          style: { padding: '4px 8px', fontSize: 12 },
          onClick: () => {
            const nextIdx = (activeMatchIndex + 1) % searchMatches.length;
            setActiveMatchIndex(nextIdx);
            scrollToSearchMatch(nextIdx);
          }
        }, '▼ Next'),
        h('button', {
          type: 'button',
          className: 'icon-btn',
          style: { border: 'none', background: 'transparent', color: 'var(--reader-muted)', cursor: 'pointer' },
          onClick: () => { setSearchQuery(''); setShowSearch(false); }
        }, '✕')
      ),

      // ── MAIN CANVAS CONTAINER & 3-ZONE TAP NAVIGATION ──
      h('div', { className: 'reader-pro-canvas-container' },

        // Left Tap Zone: Previous Page / Scroll Up
        h('div', {
          className: 'reader-pro-tap-zone-left',
          title: 'Previous Page / Scroll Up',
          onClick: handlePagePrev
        }),

        // Center Tap Zone: Toggle HUD
        h('div', {
          className: 'reader-pro-tap-zone-center',
          title: 'Toggle Reader Menu',
          onClick: () => setChrome(c => !c)
        }),

        // Right Tap Zone: Next Page / Scroll Down
        h('div', {
          className: 'reader-pro-tap-zone-right',
          title: 'Next Page / Scroll Down',
          onClick: handlePageNext
        }),

        // Content Scroll Viewport
        h('div', {
          ref: containerRef,
          className: `reader-pro-scroll-area ${fontClass} ${justify ? 'reader-body justify' : ''} ${paragraphIndent ? 'reader-pro-indent' : ''}`,
          style: {
            fontSize: `${fontSize || 18}px`,
            lineHeight: lineHeight
          },
          onScroll: () => {
            if (readMode === 'paginated' && containerRef.current) {
              const cur = Math.floor(containerRef.current.scrollTop / containerRef.current.clientHeight) + 1;
              setCurrentPage(Math.min(totalPages, Math.max(1, cur)));
            }
          }
        },
          h('div', { className: `reader-pro-content-wrapper ${widthClass}` },
            // Chapter Title Header
            h('h2', {
              style: {
                fontWeight: 700,
                fontSize: `${Math.round((fontSize || 18) * 1.35)}px`,
                marginBottom: '1.5em',
                color: 'var(--reader-text)',
                lineHeight: 1.3,
                borderBottom: '1px solid var(--reader-border)',
                paddingBottom: '0.6em'
              }
            }, firstChapterTitle),

            // Paragraphs and Illustrations
            parsedParagraphs.map((item, pIdx) => {
              if (item.isImage) {
                return h('div', {
                  key: pIdx,
                  style: { margin: '2.5em 0', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'zoom-in' },
                  onClick: (e) => { e.stopPropagation(); setLightboxImage(item.url); }
                },
                  h('img', {
                    src: item.url,
                    alt: item.alt,
                    loading: 'lazy',
                    style: {
                      maxWidth: '100%',
                      maxHeight: '80vh',
                      objectFit: 'contain',
                      borderRadius: 12,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s ease'
                    }
                  }),
                  item.alt && item.alt !== 'Illustration' && h('span', {
                    style: { fontSize: 12, color: 'var(--reader-muted)', marginTop: 8, fontStyle: 'italic' }
                  }, `🔍 Tap to zoom · ${item.alt}`)
                );
              }

              const isSpeaking = activeSentenceIdx >= 0 && sentencesRef.current[activeSentenceIdx] && item.text.includes(sentencesRef.current[activeSentenceIdx].substring(0, 15));

              // Render text with search highlighting
              let renderedContent = item.text;
              if (searchQuery && searchQuery.trim().length >= 2) {
                const parts = [];
                let lastIdx = 0;
                const lower = item.text.toLowerCase();
                const q = searchQuery.toLowerCase();
                let mPos = 0;
                while ((mPos = lower.indexOf(q, lastIdx)) !== -1) {
                  if (mPos > lastIdx) parts.push(item.text.substring(lastIdx, mPos));
                  const isCurMatch = searchMatches[activeMatchIndex] && searchMatches[activeMatchIndex].pIdx === pIdx && searchMatches[activeMatchIndex].pos === mPos;
                  parts.push(h('mark', {
                    key: mPos,
                    className: `reader-pro-search-highlight ${isCurMatch ? 'active-match' : ''}`
                  }, item.text.substring(mPos, mPos + q.length)));
                  lastIdx = mPos + q.length;
                }
                if (lastIdx < item.text.length) parts.push(item.text.substring(lastIdx));
                renderedContent = parts;
              }

              return h('p', {
                key: pIdx,
                'data-paragraph-idx': pIdx,
                className: `${pIdx === 0 && !paragraphIndent ? 'first-para' : ''} ${isSpeaking ? 'speaking' : ''}`,
                onClick: (e) => {
                  e.stopPropagation();
                  const matchIdx = sentencesRef.current.findIndex(s => item.text.includes(s.substring(0, 15)));
                  if (matchIdx !== -1) {
                    setShowTtsBar(true);
                    speakSentence(matchIdx);
                  }
                }
              }, renderedContent);
            }),

            // End of chapter navigation buttons
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 48,
                paddingTop: 24,
                borderTop: '1px solid var(--reader-border)',
                gap: 12
              }
            },
              h('button', {
                type: 'button',
                disabled: activeIdx <= 0,
                style: {
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid var(--reader-border)',
                  background: 'var(--reader-card)',
                  color: 'var(--reader-text)',
                  cursor: activeIdx <= 0 ? 'not-allowed' : 'pointer',
                  opacity: activeIdx <= 0 ? 0.4 : 1,
                  fontWeight: 600,
                  fontSize: 13
                },
                onClick: (e) => { e.stopPropagation(); prevChapter(); }
              }, '← Previous Chapter'),

              h('button', {
                type: 'button',
                disabled: activeIdx >= safeChapters.length - 1,
                style: {
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--reader-accent)',
                  color: '#ffffff',
                  cursor: activeIdx >= safeChapters.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: activeIdx >= safeChapters.length - 1 ? 0.4 : 1,
                  fontWeight: 700,
                  fontSize: 13
                },
                onClick: (e) => { e.stopPropagation(); advanceChapter(); }
              }, activeIdx >= safeChapters.length - 1 ? '★ Completed Book' : `Next Chapter (${activeIdx + 2}/${safeChapters.length}) →`)
            )
          )
        )
      ),

      // ── AUTOSCROLL FLOATING SPEED PILL ──
      isAutoScrolling && h('div', {
        className: 'reader-pro-autoscroll-pill',
        onClick: (e) => e.stopPropagation()
      },
        h('span', { style: { color: '#f59e0b' } }, '⚡ Auto-Scrolling'),
        h('button', {
          type: 'button',
          style: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 },
          onClick: () => setAutoScrollSpeed(s => Math.max(0.5, +(s - 0.5).toFixed(1)))
        }, '−'),
        h('span', { style: { minWidth: 36, textAlign: 'center', fontFamily: 'monospace' } }, `${autoScrollSpeed.toFixed(1)}×`),
        h('button', {
          type: 'button',
          style: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 },
          onClick: () => setAutoScrollSpeed(s => Math.min(4.0, +(s + 0.5).toFixed(1)))
        }, '+'),
        h('button', {
          type: 'button',
          style: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 12, padding: '2px 8px', fontSize: 11 },
          onClick: () => setIsAutoScrolling(false)
        }, '✕ Stop')
      ),

      // ── LIGHTBOX MODAL (TAP-TO-ZOOM) ──
      lightboxImage && h('div', {
        className: 'reader-pro-lightbox',
        onClick: () => setLightboxImage(null)
      },
        h('img', { src: lightboxImage, alt: 'Full illustration' }),
        h('div', {
          style: { position: 'absolute', top: 20, right: 24, color: '#ffffff', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 20, fontSize: 13 }
        }, '✕ Tap anywhere to close')
      ),

      // ── BOTTOM STATUS BAR & PROGRESS SCRUBBER HUD ──
      chrome && h('footer', {
        style: {
          background: 'var(--reader-card)',
          borderTop: '1px solid var(--reader-border)',
          padding: '10px 20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 50,
          color: 'var(--reader-muted)'
        },
        onClick: (e) => e.stopPropagation()
      },
        // Interactive Chapter Progress Scrubber
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('input', {
            type: 'range',
            min: 0,
            max: safeChapters.length - 1,
            value: activeIdx,
            onChange: (e) => {
              const val = parseInt(e.target.value, 10);
              setActiveIdx(val);
              onChapterChange?.(val);
            },
            style: { flex: 1, accentColor: 'var(--reader-accent)', height: 4, cursor: 'pointer' }
          }),
          h('span', { style: { fontSize: 11, fontFamily: 'monospace', minWidth: 42, textAlign: 'right' } }, `${bookProgressPct}%`)
        ),

        // Reading Time & Chapter Stats Info Line
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontFamily: 'monospace' } },
          h('span', null, `${chapterMins}m left in chapter · ${bookHours}h left in book`),
          h('span', null, readMode === 'paginated' ? `Page ${currentPage} of ${totalPages} · Ch ${activeIdx + 1}/${safeChapters.length}` : `Chapter ${activeIdx + 1} of ${safeChapters.length}`)
        )
      ),

      // ── TABLE OF CONTENTS DRAWER WITH SEARCH ──
      showToc && h('div', {
        className: 'toc-drawer',
        style: { zIndex: 100, background: 'var(--reader-card)', borderRight: '1px solid var(--reader-border)', color: 'var(--reader-text)' },
        onClick: (e) => e.stopPropagation()
      },
        h('div', { className: 'hd', style: { borderBottom: '1px solid var(--reader-border)', color: 'var(--reader-text)' } },
          h('span', null, `Chapters (${safeChapters.length})`),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            style: { border: 'none', background: 'transparent', color: 'var(--reader-text)', fontSize: 16, cursor: 'pointer' },
            onClick: () => setShowToc(false)
          }, '✕')
        ),

        // Real-Time TOC Search Bar
        h('div', { style: { padding: '8px 12px', borderBottom: '1px solid var(--reader-border)' } },
          h('input', {
            type: 'text',
            value: tocSearch,
            placeholder: 'Filter chapters by name or number...',
            onChange: (e) => setTocSearch(e.target.value),
            style: {
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--reader-bg)',
              border: '1px solid var(--reader-border)',
              color: 'var(--reader-text)',
              fontSize: 12,
              outline: 'none'
            }
          })
        ),

        // Chapter List
        h('div', { className: 'toc-list' },
          filteredChapters.map((ch) => {
            const isCur = ch.originalIdx === activeIdx;
            return h('div', {
              key: ch.originalIdx,
              className: `toc-row ${isCur ? 'cur' : ''}`,
              style: isCur ? { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--reader-accent)' } : { color: 'var(--reader-text)' },
              onClick: () => {
                setActiveIdx(ch.originalIdx);
                onChapterChange?.(ch.originalIdx);
                setShowToc(false);
                if (containerRef.current) containerRef.current.scrollTop = 0;
              }
            },
              h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ch.title || `Chapter ${ch.originalIdx + 1}`),
              h('span', { className: 'pg', style: { fontSize: 11, opacity: 0.7 } }, `${Math.round(((ch.originalIdx + 1) / safeChapters.length) * 100)}%`)
            );
          })
        )
      ),

      // ── DISPLAY & TYPOGRAPHY SETTINGS MODAL ──
      showVisual && h('div', {
        className: 'vis-panel',
        style: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 80,
          background: 'var(--reader-card)',
          borderTop: '1px solid var(--reader-border)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          color: 'var(--reader-text)'
        },
        onClick: (e) => e.stopPropagation()
      },
        // Reading Mode Toggle
        h('div', { className: 'row' },
          h('span', { className: 'cap' }, 'Reading Mode'),
          [
            { id: 'scroll', label: '📜 Continuous Scroll' },
            { id: 'paginated', label: '📖 Paginated Book Flip' }
          ].map(m => h('button', {
            key: m.id,
            type: 'button',
            className: `seg-btn ${readMode === m.id ? 'on' : ''}`,
            onClick: () => setReadMode(m.id)
          }, m.label))
        ),

        // 7 Curated Themes
        h('div', { className: 'row' },
          h('span', { className: 'cap' }, 'Theme Preset'),
          [
            { id: 'black', label: 'AMOLED' },
            { id: 'dark', label: 'Slate' },
            { id: 'nord', label: 'Nord' },
            { id: 'sepia', label: 'Sepia' },
            { id: 'parchment', label: 'Parchment' },
            { id: 'sage', label: 'Sage' },
            { id: 'light', label: 'Paper' }
          ].map(t => h('button', {
            key: t.id,
            type: 'button',
            className: `seg-btn ${(theme || 'dark') === t.id ? 'on' : ''}`,
            onClick: () => setTheme?.(t.id)
          }, t.label))
        ),

        // Typography: Font Family
        h('div', { className: 'row' },
          h('span', { className: 'cap' }, 'Font Family'),
          [
            { id: 'serif', label: 'Serif (Literata)' },
            { id: 'sans', label: 'Sans (Inter)' },
            { id: 'mono', label: 'Monospace' },
            { id: 'dyslexic', label: 'Dyslexic' }
          ].map(f => h('button', {
            key: f.id,
            type: 'button',
            className: `seg-btn ${(font || 'serif') === f.id ? 'on' : ''}`,
            onClick: () => setFont?.(f.id)
          }, f.label))
        ),

        // Font Size & Line Spacing
        h('div', { className: 'row' },
          h('span', { className: 'cap' }, 'Font Size & Line Height'),
          h('button', { type: 'button', className: 'tts-btn', onClick: () => setFontSize?.(Math.max(12, (fontSize || 18) - 1)) }, '−'),
          h('span', { style: { minWidth: 32, textAlign: 'center', fontSize: 13, fontWeight: 700 } }, `${fontSize || 18}px`),
          h('button', { type: 'button', className: 'tts-btn', onClick: () => setFontSize?.(Math.min(38, (fontSize || 18) + 1)) }, '+'),

          h('span', { style: { marginLeft: 16, fontSize: 12, color: 'var(--reader-muted)' } }, 'Line Spacing:'),
          [1.4, 1.8, 2.2].map(lh => h('button', {
            key: lh,
            type: 'button',
            className: `seg-btn ${lineHeight === lh ? 'on' : ''}`,
            style: { padding: '4px 10px', fontSize: 12 },
            onClick: () => setLineHeight(lh)
          }, `${lh}×`))
        ),

        // Container Width & Indentation
        h('div', { className: 'row' },
          h('span', { className: 'cap' }, 'Layout & Margins'),
          [
            { id: 'compact', label: 'Compact' },
            { id: 'standard', label: 'Standard' },
            { id: 'wide', label: 'Wide' },
            { id: 'full', label: '100% Full' }
          ].map(w => h('button', {
            key: w.id,
            type: 'button',
            className: `seg-btn ${contentWidth === w.id ? 'on' : ''}`,
            onClick: () => setContentWidth(w.id)
          }, w.label)),

          h('button', {
            type: 'button',
            className: `seg-btn ${paragraphIndent ? 'on' : ''}`,
            style: { marginLeft: 12 },
            onClick: () => setParagraphIndent(!paragraphIndent)
          }, 'First-Line Indent'),

          h('button', {
            type: 'button',
            className: `seg-btn ${justify ? 'on' : ''}`,
            onClick: () => setJustify(!justify)
          }, 'Justify Text')
        ),

        h('button', {
          type: 'button',
          className: 'mini-btn',
          style: { alignSelf: 'flex-end', background: 'var(--reader-accent)', color: '#ffffff', marginTop: 6 },
          onClick: () => setShowVisual(false)
        }, '✓ Save & Close')
      ),

      // ── TTS PLAYBACK CONTROL BAR ──
      showTtsBar && h('div', {
        className: 'ttsbar',
        style: { zIndex: 60, background: 'var(--reader-card)', borderTop: '1px solid var(--reader-border)', color: 'var(--reader-text)' },
        onClick: (e) => e.stopPropagation()
      },
        h('div', { style: { display: 'flex', gap: 8, flex: 'none' } },
          h('button', { type: 'button', className: 'tts-btn', title: 'Previous Sentence', onClick: () => speakSentence(sentenceIdxRef.current - 1) }, '⏮'),
          h('button', { type: 'button', className: 'tts-play', title: ttsPlaying && !ttsPaused ? 'Pause' : 'Play', onClick: handlePlayPauseTts }, ttsPlaying && !ttsPaused ? '❚❚' : '▶'),
          h('button', { type: 'button', className: 'tts-btn', title: 'Next Sentence', onClick: () => speakSentence(sentenceIdxRef.current + 1) }, '⏭'),
          h('button', { type: 'button', className: 'tts-btn', title: 'Stop', onClick: handleStopTts }, '■')
        ),
        h('div', { className: 'tts-meta' },
          h('div', { className: 'line1', style: { color: 'var(--reader-text)' } }, activeSentenceIdx >= 0 ? `Sentence ${activeSentenceIdx + 1} / ${sentencesRef.current.length}` : 'Tap ▶ or any paragraph to read aloud'),
          h('div', { className: 'line2' },
            ttsVoices.length > 0 && h('select', {
              value: selectedVoice,
              onChange: (e) => { setSelectedVoice(e.target.value); if (ttsPlayingRef.current) speakSentence(sentenceIdxRef.current); },
              className: 'chip',
              style: { background: 'var(--reader-bg)', color: 'var(--reader-text)', borderColor: 'var(--reader-border)' }
            },
              ttsVoices.map(v => h('option', { key: v.name, value: v.name }, `${v.name} (${v.lang})`))
            )
          )
        ),
        h('div', { className: 'tts-sliders' },
          h('div', { className: 'slider-row' },
            h('span', { className: 'lbl', style: { color: 'var(--reader-muted)' } }, 'Speed'),
            h('input', { type: 'range', min: '0.5', max: '3', step: '0.1', value: ttsSpeed, onChange: (e) => { const s = parseFloat(e.target.value); setTtsSpeed(s); if (ttsPlayingRef.current) speakSentence(sentenceIdxRef.current); } }),
            h('span', { className: 'val', style: { color: 'var(--reader-text)' } }, `${ttsSpeed.toFixed(1)}×`)
          )
        )
      )
    );
  };

  if (typeof window !== 'undefined') {
    window.MoonReaderModal = MoonReaderModal;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MoonReaderModal };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
