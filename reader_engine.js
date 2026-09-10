/**
 * Gemini Translator - Pro Reader Engine (v8.10.59)
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

  // ══════════════════════════════════════════════════════════════════════
  // INLINE STYLES FOR CRISP, RESPONSIVE READER
  // ══════════════════════════════════════════════════════════════════════
  const STYLES_ID = 'gemini-reader-pro-v2-styles';
  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLES_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = STYLES_ID;
    styleEl.textContent = `
      .reader-v2-shell {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        user-select: text;
        -webkit-user-select: text;
        touch-action: pan-y;
        overflow: hidden;
        font-family: inherit;
      }
      .reader-v2-theme-black { background: #000000; color: #d1d5db; --r-accent: #f59e0b; --r-bg: #000000; --r-card: #111111; --r-border: #222222; --r-text: #d1d5db; --r-muted: #888888; }
      .reader-v2-theme-dark { background: #0a0f1d; color: #cbd5e1; --r-accent: #60a5fa; --r-bg: #0a0f1d; --r-card: #141c2f; --r-border: #222f4c; --r-text: #cbd5e1; --r-muted: #7b8fa7; }
      .reader-v2-theme-nord { background: #242933; color: #eceff4; --r-accent: #88c0d0; --r-bg: #242933; --r-card: #2e3440; --r-border: #434c5e; --r-text: #eceff4; --r-muted: #9baec8; }
      .reader-v2-theme-sepia { background: #fbf0d9; color: #433422; --r-accent: #b45309; --r-bg: #fbf0d9; --r-card: #f3e5c8; --r-border: #e3d2b2; --r-text: #433422; --r-muted: #7d6b53; }
      .reader-v2-theme-parchment { background: #f4ecd8; color: #383226; --r-accent: #92400e; --r-bg: #f4ecd8; --r-card: #eadebe; --r-border: #dbcbb1; --r-text: #383226; --r-muted: #706551; }
      .reader-v2-theme-sage { background: #e2ece2; color: #223322; --r-accent: #15803d; --r-bg: #e2ece2; --r-card: #d3e4d3; --r-border: #bed6be; --r-text: #223322; --r-muted: #567056; }
      .reader-v2-theme-light { background: #ffffff; color: #111827; --r-accent: #4f46e5; --r-bg: #ffffff; --r-card: #f3f4f6; --r-border: #e5e7eb; --r-text: #111827; --r-muted: #6b7280; }

      .reader-v2-font-serif { font-family: 'Literata', 'Merriweather', Georgia, 'Times New Roman', serif; }
      .reader-v2-font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', 'Segoe UI', sans-serif; }
      .reader-v2-font-mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, monospace; }
      .reader-v2-font-dyslexic { font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif; }

      .reader-v2-scroll-container {
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
      .reader-v2-content-box {
        margin: 0 auto;
        padding: 40px 24px 140px;
        transition: max-width 0.2s ease;
      }
      .reader-v2-w-compact { max-width: 600px; }
      .reader-v2-w-standard { max-width: 740px; }
      .reader-v2-w-wide { max-width: 960px; }
      .reader-v2-w-full { max-width: 100%; padding-left: 28px; padding-right: 28px; }

      .reader-v2-content-box p {
        margin-bottom: 1.2em;
        line-height: inherit;
        position: relative;
      }
      .reader-v2-indent p {
        text-indent: 1.8em;
      }
      .reader-v2-speaking-sentence {
        background: rgba(245, 158, 11, 0.22);
        border-radius: 4px;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.26);
        transition: background 0.15s ease;
      }
      .reader-v2-search-match {
        background: #facc15;
        color: #000000;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 2px;
      }
      .reader-v2-search-match.active {
        background: #f97316;
        color: #ffffff;
        box-shadow: 0 0 0 2px #ea580c;
      }

      .reader-v2-hud-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--r-card);
        border-bottom: 1px solid var(--r-border);
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      }
      .reader-v2-hud-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--r-card);
        border-top: 1px solid var(--r-border);
        box-shadow: 0 -4px 20px rgba(0,0,0,0.35);
        padding: 10px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      }
      .reader-v2-hud-hidden {
        transform: translateY(-110%);
        opacity: 0;
        pointer-events: none;
      }
      .reader-v2-hud-bottom.reader-v2-hud-hidden {
        transform: translateY(110%);
      }

      /* Floating Auto-scroll speed pill */
      .reader-v2-autoscroll-pill {
        position: absolute;
        bottom: 84px;
        right: 20px;
        z-index: 45;
        background: rgba(18, 18, 24, 0.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 24px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        font-size: 12.5px;
        font-weight: 600;
      }

      /* Lightbox Modal */
      .reader-v2-lightbox {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
      }
      .reader-v2-lightbox img {
        max-width: 95vw;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 6px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      }
    `;
    document.head.appendChild(styleEl);
  }

  const decodeEntities = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        if (code === 8216) return "‘";
        if (code === 8217) return "’";
        if (code === 8220) return "“";
        if (code === 8221) return "”";
        if (code === 8211) return "–";
        if (code === 8212) return "—";
        if (code === 8230) return "…";
        try { return String.fromCharCode(code); } catch(e) { return _; }
      })
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  };

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
    ensureStyles();

    // ── 1. Chapter Normalization with Arc / Volume Hierarchy Detection ──
    const safeChapters = useMemo(() => {
      let list = Array.isArray(chapters) && chapters.length > 0
        ? chapters.filter(c => c && typeof c === 'object').map(c => ({
            title: decodeEntities(c.title || 'Chapter'),
            text: c.content || c.text || '',
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
            list.push({ title: decodeEntities(curTitle), text: curLines.join('\n'), arc: '', volume: '' });
            curTitle = line.trim();
            curLines = [];
          } else {
            curLines.push(line);
          }
        }
        if (curLines.length > 0) {
          list.push({ title: decodeEntities(curTitle), text: curLines.join('\n'), arc: '', volume: '' });
        }
      }

      if (list.length === 0) {
        list = [{ title: 'Chapter 1', text: text || 'No text loaded.', arc: '', volume: '' }];
      }
      return list;
    }, [chapters, text]);

    // Active Chapter
    const [activeIdx, setActiveIdx] = useState(typeof currentIdx === 'number' && currentIdx >= 0 ? currentIdx : 0);
    useEffect(() => {
      if (typeof currentIdx === 'number' && currentIdx >= 0 && currentIdx !== activeIdx) {
        setActiveIdx(currentIdx);
      }
    }, [currentIdx]);

    const changeChapter = useCallback((newIdx) => {
      if (newIdx < 0 || newIdx >= safeChapters.length) return;
      setActiveIdx(newIdx);
      if (typeof onChapterChange === 'function') onChapterChange(newIdx);
      // Reset scroll
      const container = document.getElementById('gemini-reader-scroll-area');
      if (container) container.scrollTo({ top: 0, behavior: 'instant' });
    }, [safeChapters.length, onChapterChange]);

    // ── 2. UI Chrome & Menus ──
    const [hudVisible, setHudVisible] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [tocSearch, setTocSearch] = useState('');
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

    useEffect(() => { localStorage.setItem('gemini_reader_mode', viewMode); }, [viewMode]);
    useEffect(() => { localStorage.setItem('gemini_reader_width', contentWidth); }, [contentWidth]);
    useEffect(() => { localStorage.setItem('gemini_reader_lineheight', String(lineHeight)); }, [lineHeight]);
    useEffect(() => { localStorage.setItem('gemini_reader_indent', String(paragraphIndent)); }, [paragraphIndent]);
    useEffect(() => { localStorage.setItem('readerJustify', String(justify)); }, [justify]);

    // Auto-Scroll
    const [autoScroll, setAutoScroll] = useState(false);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(1.0);
    const autoScrollRaf = useRef(null);

    useEffect(() => {
      if (!autoScroll) {
        if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
        return;
      }
      let lastTime = performance.now();
      const step = (time) => {
        const delta = (time - lastTime) / 1000;
        lastTime = time;
        const container = document.getElementById('gemini-reader-scroll-area');
        if (container) {
          container.scrollTop += (autoScrollSpeed * 40 * delta);
        }
        autoScrollRaf.current = requestAnimationFrame(step);
      };
      autoScrollRaf.current = requestAnimationFrame(step);
      return () => {
        if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
      };
    }, [autoScroll, autoScrollSpeed]);

    // ── 3. TTS Engine ──
    const [ttsActive, setTtsActive] = useState(false);
    const [ttsPaused, setTtsPaused] = useState(false);
    const [ttsRate, setTtsRate] = useState(1.0);
    const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);
    const sentencesRef = useRef([]);
    const utteranceRef = useRef(null);

    const currentChapter = safeChapters[activeIdx] || safeChapters[0];

    // Clean chapter paragraphs and images
    const chapterElements = useMemo(() => {
      let raw = currentChapter?.text || '';
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && currentChapter?.title) {
        raw = stripFn(raw, currentChapter.title, currentChapter.originalTitle);
      }
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      return lines.map((line, idx) => {
        // Illustration check
        const mdImg = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)$/i);
        if (mdImg) {
          return { type: 'image', alt: mdImg[1] || 'Illustration', src: mdImg[2], id: `p_${idx}` };
        }
        return { type: 'text', content: line, id: `p_${idx}` };
      });
    }, [currentChapter]);

    // Extract sentences for TTS
    useEffect(() => {
      const textOnly = chapterElements.filter(e => e.type === 'text').map(e => e.content).join(' ');
      const rawSentences = textOnly.match(/[^.!?。！？]+[.!?。！？]+/g) || [textOnly];
      sentencesRef.current = rawSentences.map(s => s.trim()).filter(Boolean);
    }, [chapterElements]);

    const stopTts = useCallback(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setTtsActive(false);
      setTtsPaused(false);
      setActiveSentenceIdx(-1);
    }, []);

    const speakSentence = useCallback((idx) => {
      if (!window.speechSynthesis || idx >= sentencesRef.current.length) {
        stopTts();
        return;
      }
      window.speechSynthesis.cancel();
      const sentence = sentencesRef.current[idx];
      setActiveSentenceIdx(idx);

      const utt = new SpeechSynthesisUtterance(sentence);
      utt.rate = ttsRate;
      utt.lang = tgtLang === 'zh' ? 'zh-CN' : (tgtLang === 'ja' ? 'ja-JP' : 'en-US');
      utt.onend = () => {
        speakSentence(idx + 1);
      };
      utt.onerror = () => {
        stopTts();
      };
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    }, [ttsRate, tgtLang, stopTts]);

    const toggleTts = () => {
      if (ttsActive) {
        if (ttsPaused) {
          window.speechSynthesis?.resume();
          setTtsPaused(false);
        } else {
          window.speechSynthesis?.pause();
          setTtsPaused(true);
        }
      } else {
        setTtsActive(true);
        setTtsPaused(false);
        speakSentence(0);
      }
    };

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
    }, [safeChapters]);

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
          changeChapter(activeIdx - 1);
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          changeChapter(activeIdx + 1);
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
    }, [activeIdx, changeChapter, onClose, showToc, showSettings, showSearch, lightboxImg]);

    // ── 5. Render Reader Shell ──
    const themeClass = `reader-v2-theme-${theme || 'dark'}`;
    const fontClass = `reader-v2-font-${font || 'serif'}`;
    const widthClass = `reader-v2-w-${contentWidth || 'standard'}`;

    return h('div', {
      className: `reader-v2-shell ${themeClass} ${fontClass}`,
      style: { fontSize: `${fontSize}px`, lineHeight: lineHeight }
    },
      // ── TOP HUD ──
      h('div', { className: `reader-v2-hud-top ${hudVisible ? '' : 'reader-v2-hud-hidden'}` },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { border: 'none', fontSize: 16, padding: '4px 8px' },
            onClick: () => { stopTts(); onClose(); },
            title: 'Close Reader'
          }, '✕'),
          h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13.5 } },
            currentChapter.title
          )
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { border: 'none', padding: '4px 8px' },
            onClick: () => setShowSearch(s => !s),
            title: 'Search in Chapter'
          }, '🔍'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { border: 'none', padding: '4px 8px' },
            onClick: () => setShowToc(true),
            title: 'Table of Contents'
          }, '📑'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { border: 'none', padding: '4px 8px' },
            onClick: () => setShowSettings(true),
            title: 'Typography & Appearance'
          }, '⚙')
        )
      ),

      // ── READING CANVAS CONTAINER ──
      h('div', {
        id: 'gemini-reader-scroll-area',
        className: 'reader-v2-scroll-container',
        onClick: (e) => {
          // Toggle HUD on central canvas click (ignore if user is selecting text)
          const selection = window.getSelection();
          if (selection && selection.toString().trim().length > 0) return;
          if (e.target.tagName === 'IMG' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
          setHudVisible(prev => !prev);
        }
      },
        h('div', { className: `reader-v2-content-box ${widthClass} ${paragraphIndent ? 'reader-v2-indent' : ''}`, style: { textAlign: justify ? 'justify' : 'left' } },
          // Chapter Title Header
          h('div', { style: { borderBottom: '1px solid var(--r-border)', paddingBottom: 16, marginBottom: 24 } },
            currentChapter.arc && h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--r-accent)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, currentChapter.arc),
            h('h2', { style: { margin: 0, fontSize: '1.4em', fontWeight: 700, lineHeight: 1.3 } }, currentChapter.title),
            h('div', { style: { fontSize: 11.5, color: 'var(--r-muted)', marginTop: 6 } },
              `Chapter ${activeIdx + 1} of ${safeChapters.length} · ~${currentChapter.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words`
            )
          ),

          // Chapter Paragraphs & Illustrations
          chapterElements.map((el, pIdx) => {
            if (el.type === 'image') {
              return h('div', {
                key: el.id,
                style: { margin: '24px 0', textAlign: 'center', cursor: 'zoom-in' },
                onClick: () => setLightboxImg(el.src)
              },
                h('img', {
                  src: el.src,
                  alt: el.alt,
                  loading: 'lazy',
                  style: { maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }
                })
              );
            }

            // Text Paragraph with Search Highlighting
            let paragraphContent = el.content;
            if (showSearch && searchQuery.trim().length > 0) {
              const query = searchQuery.trim();
              const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
              const parts = paragraphContent.split(regex);
              return h('p', { key: el.id },
                parts.map((part, i) => regex.test(part)
                  ? h('mark', { key: i, className: 'reader-v2-search-match' }, part)
                  : part
                )
              );
            }

            return h('p', { key: el.id }, el.content);
          }),

          // Bottom Chapter Navigation Stepper
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--r-border)' } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              disabled: activeIdx <= 0,
              style: { padding: '10px 18px', fontWeight: 600 },
              onClick: (e) => { e.stopPropagation(); changeChapter(activeIdx - 1); }
            }, '← Previous Chapter'),
            h('span', { style: { fontSize: 12, color: 'var(--r-muted)' } }, `${activeIdx + 1} / ${safeChapters.length}`),
            h('button', {
              type: 'button',
              className: 'mini-btn',
              disabled: activeIdx >= safeChapters.length - 1,
              style: { padding: '10px 18px', background: 'var(--r-accent)', color: '#fff', fontWeight: 600 },
              onClick: (e) => { e.stopPropagation(); changeChapter(activeIdx + 1); }
            }, 'Next Chapter →')
          )
        )
      ),

      // ── BOTTOM HUD ──
      h('div', { className: `reader-v2-hud-bottom ${hudVisible ? '' : 'reader-v2-hud-hidden'}` },
        // Progress Slider
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', { style: { fontSize: 11, color: 'var(--r-muted)', width: 36, textAlign: 'right' } }, `${activeIdx + 1}`),
          h('input', {
            type: 'range',
            min: 0,
            max: safeChapters.length - 1,
            value: activeIdx,
            style: { flex: 1, accentColor: 'var(--r-accent)' },
            onChange: (e) => changeChapter(parseInt(e.target.value, 10))
          }),
          h('span', { style: { fontSize: 11, color: 'var(--r-muted)', width: 36 } }, `${safeChapters.length}`)
        ),

        // Action Toolbar
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          // Chapter navigation
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              disabled: activeIdx <= 0,
              onClick: () => changeChapter(activeIdx - 1)
            }, '⏮ Prev'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              disabled: activeIdx >= safeChapters.length - 1,
              onClick: () => changeChapter(activeIdx + 1)
            }, 'Next ⏭')
          ),

          // Tools: TTS, Auto-scroll, Font size
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('button', {
              type: 'button',
              className: `mini-btn ${ttsActive ? '' : 'ghost'}`,
              style: ttsActive ? { background: '#f59e0b', color: '#000', fontWeight: 700 } : {},
              onClick: toggleTts
            }, ttsActive ? (ttsPaused ? '▶ Resume TTS' : '⏸ Pause TTS') : '🎧 Read Aloud'),
            h('button', {
              type: 'button',
              className: `mini-btn ${autoScroll ? '' : 'ghost'}`,
              style: autoScroll ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
              onClick: () => setAutoScroll(s => !s)
            }, autoScroll ? '⏸ Stop Scroll' : '⚡ Auto-Scroll'),
            h('div', { style: { display: 'flex', alignItems: 'center', background: 'var(--r-bg)', borderRadius: 6, border: '1px solid var(--r-border)' } },
              h('button', {
                type: 'button',
                style: { background: 'none', border: 'none', padding: '4px 8px', color: 'inherit', cursor: 'pointer', fontSize: 13 },
                onClick: () => setFontSize?.(Math.max(12, fontSize - 1))
              }, 'A-'),
              h('span', { style: { fontSize: 11, padding: '0 4px', color: 'var(--r-muted)' } }, `${fontSize}`),
              h('button', {
                type: 'button',
                style: { background: 'none', border: 'none', padding: '4px 8px', color: 'inherit', cursor: 'pointer', fontSize: 13 },
                onClick: () => setFontSize?.(Math.min(36, fontSize + 1))
              }, 'A+')
            )
          )
        )
      ),

      // ── FLOATING AUTO-SCROLL PILL (WHEN ACTIVE) ──
      autoScroll && h('div', { className: 'reader-v2-autoscroll-pill' },
        h('span', null, '⚡ Auto-Scroll'),
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
          style: { background: 'none', border: 'none', color: '#f87171', padding: '2px 6px', cursor: 'pointer', fontWeight: 700 },
          onClick: () => setAutoScroll(false)
        }, '✕')
      ),

      // ── HIERARCHICAL ARC & VOLUME TABLE OF CONTENTS DRAWER ──
      showToc && h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex' },
        onClick: () => setShowToc(false)
      },
        h('div', {
          style: { width: '85%', maxWidth: 380, height: '100%', background: 'var(--r-card)', color: 'var(--r-text)', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.5)' },
          onClick: (e) => e.stopPropagation()
        },
          // Header & Search
          h('div', { style: { padding: '16px 18px', borderBottom: '1px solid var(--r-border)' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
              h('span', { style: { fontWeight: 700, fontSize: 16 } }, '📑 Table of Contents'),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', fontSize: 16, padding: '2px 6px' },
                onClick: () => setShowToc(false)
              }, '✕')
            ),
            h('input', {
              type: 'text',
              placeholder: 'Filter chapters or arcs…',
              value: tocSearch,
              onChange: (e) => setTocSearch(e.target.value),
              style: { width: '100%', padding: '8px 12px', background: 'var(--r-bg)', border: '1px solid var(--r-border)', color: 'inherit', borderRadius: 6, fontSize: 13 }
            })
          ),

          // Chapter List (Hierarchical per Arc)
          h('div', { style: { flex: 1, overflowY: 'auto', padding: '12px 10px' } },
            arcGroups.map((group, gIdx) => {
              const matchingChapters = group.chapters.filter(c =>
                !tocSearch || c.title.toLowerCase().includes(tocSearch.toLowerCase()) || group.arc.toLowerCase().includes(tocSearch.toLowerCase())
              );
              if (matchingChapters.length === 0) return null;

              const isCollapsed = Boolean(collapsedArcs[group.arc]) && !tocSearch;

              return h('div', { key: gIdx, style: { marginBottom: 10 } },
                // Arc Header Accordion Toggle
                h('div', {
                  style: {
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: 'var(--r-accent)'
                  },
                  onClick: () => toggleArcCollapse(group.arc)
                },
                  h('span', null, `${isCollapsed ? '▸' : '▾'} ${group.arc}`),
                  h('span', { style: { fontSize: 11, color: 'var(--r-muted)', fontWeight: 500 } }, `${group.chapters.length}`)
                ),

                // Chapters inside this Arc
                !isCollapsed && h('div', { style: { marginLeft: 6, marginTop: 4 } },
                  matchingChapters.map(c => {
                    const isActive = c.idx === activeIdx;
                    return h('div', {
                      key: c.idx,
                      style: {
                        padding: '9px 12px',
                        borderRadius: 6,
                        marginBottom: 2,
                        cursor: 'pointer',
                        fontSize: 12.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                        color: isActive ? 'var(--r-accent)' : 'inherit',
                        fontWeight: isActive ? 700 : 400
                      },
                      onClick: () => {
                        changeChapter(c.idx);
                        setShowToc(false);
                      }
                    },
                      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.title),
                      isActive && h('span', { style: { fontSize: 10, padding: '2px 6px', background: 'var(--r-accent)', color: '#fff', borderRadius: 4 } }, 'Reading')
                    );
                  })
                )
              );
            })
          )
        )
      ),

      // ── TYPOGRAPHY & THEMES SETTINGS MODAL ──
      showSettings && h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
        onClick: () => setShowSettings(false)
      },
        h('div', {
          style: { width: '100%', maxWidth: 520, background: 'var(--r-card)', color: 'var(--r-text)', borderRadius: '16px 16px 0 0', padding: 20, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' },
          onClick: (e) => e.stopPropagation()
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
            h('span', { style: { fontWeight: 700, fontSize: 15 } }, '⚙ Typography & Appearance'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { border: 'none', fontSize: 16 },
              onClick: () => setShowSettings(false)
            }, '✕')
          ),

          // Themes Palette
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 } }, 'Color Theme'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 } },
              [
                ['black', '#000000', 'Black'],
                ['dark', '#0a0f1d', 'Dark'],
                ['nord', '#242933', 'Nord'],
                ['sepia', '#fbf0d9', 'Sepia'],
                ['parchment', '#f4ecd8', 'Parchment'],
                ['sage', '#e2ece2', 'Sage'],
                ['light', '#ffffff', 'Light']
              ].map(([tKey, color, name]) => h('div', {
                key: tKey,
                title: name,
                style: {
                  height: 36,
                  borderRadius: 6,
                  background: color,
                  border: theme === tKey ? '2px solid var(--r-accent)' : '1px solid var(--r-border)',
                  cursor: 'pointer',
                  boxShadow: theme === tKey ? '0 0 8px var(--r-accent)' : 'none'
                },
                onClick: () => setTheme?.(tKey)
              }))
            )
          ),

          // Fonts
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 } }, 'Typeface'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } },
              [['serif', 'Serif'], ['sans', 'Sans'], ['mono', 'Mono'], ['dyslexic', 'Dyslexic']].map(([fKey, label]) => h('button', {
                key: fKey,
                type: 'button',
                className: `mini-btn ${font === fKey ? '' : 'ghost'}`,
                style: font === fKey ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                onClick: () => setFont?.(fKey)
              }, label))
            )
          ),

          // Margin / Content Width
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 } }, 'Reading Width'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } },
              [['compact', 'Compact'], ['standard', 'Standard'], ['wide', 'Wide'], ['full', 'Full']].map(([wKey, label]) => h('button', {
                key: wKey,
                type: 'button',
                className: `mini-btn ${contentWidth === wKey ? '' : 'ghost'}`,
                style: contentWidth === wKey ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                onClick: () => setContentWidth(wKey)
              }, label))
            )
          ),

          // Toggles: Indentation & Justification
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10 } },
            h('button', {
              type: 'button',
              className: `mini-btn ${paragraphIndent ? '' : 'ghost'}`,
              style: { flex: 1, padding: '8px 0' },
              onClick: () => setParagraphIndent(s => !s)
            }, paragraphIndent ? '✓ First-Line Indent' : 'No Indent'),
            h('button', {
              type: 'button',
              className: `mini-btn ${justify ? '' : 'ghost'}`,
              style: { flex: 1, padding: '8px 0' },
              onClick: () => setJustify(s => !s)
            }, justify ? '✓ Justify Text' : 'Align Left')
          )
        )
      ),

      // ── LIGHTBOX ILLUSTRATION MODAL ──
      lightboxImg && h('div', {
        className: 'reader-v2-lightbox',
        onClick: () => setLightboxImg(null)
      },
        h('img', { src: lightboxImg, alt: 'High Resolution Illustration' })
      )
    );
  };

  if (typeof window !== 'undefined') {
    window.MoonReaderModal = MoonReaderModal;
  }
})(typeof window !== 'undefined' ? window : this);
