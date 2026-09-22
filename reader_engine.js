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
      .reader-v2-paginated-viewport {
        flex: 1;
        min-height: 0;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        padding: 52px 32px 58px;
        user-select: text;
        -webkit-user-select: text;
        touch-action: pan-y;
        cursor: default;
      }
      .reader-v2-paginated-track {
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        column-fill: auto;
        column-gap: 60px;
        transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.25, 1);
        will-change: transform;
      }
      .reader-v2-paginated-track p {
        margin-bottom: 1.15em;
        line-height: inherit;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .reader-v2-paginated-track img {
        max-width: 100%;
        max-height: calc(100vh - 180px);
        object-fit: contain;
        display: block;
        margin: 16px auto;
        border-radius: 8px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .reader-v2-page-indicator-pill {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        color: #ffffff;
        font-size: 11.5px;
        padding: 4px 14px;
        border-radius: 14px;
        letter-spacing: 0.5px;
        font-weight: 600;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        z-index: 40;
        border: 1px solid rgba(255, 255, 255, 0.12);
        white-space: nowrap;
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
        width: 100%;
        max-width: 100vw;
        box-sizing: border-box;
        z-index: 50;
        background: var(--r-card);
        border-bottom: 1px solid var(--r-border);
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
        overflow-x: hidden;
      }
      .reader-top-btn-group {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        flex-shrink: 1;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        justify-content: flex-end;
      }
      .reader-top-btn-group::-webkit-scrollbar {
        display: none;
      }
      .reader-top-btn {
        min-height: 38px;
        min-width: 38px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: 1px solid var(--r-border);
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        white-space: nowrap;
        user-select: none;
        flex-shrink: 0;
      }
      .reader-top-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--r-accent);
      }
      .reader-top-btn:active {
        transform: scale(0.96);
        background: rgba(255, 255, 255, 0.18);
      }
      .reader-top-btn.active {
        background: var(--r-accent);
        color: #ffffff;
        border-color: var(--r-accent);
      }
      .reader-top-btn-text {
        display: inline;
      }
      @media (max-width: 768px) {
        .reader-v2-hud-top {
          padding: 6px 8px;
          gap: 6px;
        }
        .reader-top-btn {
          min-height: 36px;
          min-width: 36px;
          padding: 6px 8px;
          font-size: 12.5px;
        }
      }
      @media (max-width: 640px) {
        .reader-top-btn {
          min-height: 36px;
          min-width: 36px;
          padding: 6px 7px;
          font-size: 14px;
        }
        .reader-top-btn-text {
          display: none;
        }
      }
      .reader-v2-search-bar {
        position: absolute;
        top: 58px;
        left: 50%;
        transform: translateX(-50%);
        width: min(94vw, 540px);
        z-index: 60;
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
        padding: 6px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(12px);
      }
      .reader-search-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: inherit;
        font-size: 13.5px;
        padding: 6px 4px;
        font-family: inherit;
      }
      .reader-search-nav-btn {
        min-width: 34px;
        min-height: 34px;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid var(--r-border);
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .reader-search-nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--r-accent);
      }
      .reader-search-nav-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .reader-search-nav-btn.close {
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.25);
      }
      .reader-footnote-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 3px;
        padding: 1px 5px;
        font-size: 0.72em;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--r-accent);
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid currentColor;
        border-radius: 9999px;
        cursor: pointer;
        user-select: none;
        vertical-align: super;
        line-height: 1;
        transition: all 0.15s ease;
      }
      .reader-footnote-badge:hover {
        transform: scale(1.12);
        background: var(--r-accent);
        color: #ffffff;
      }
      .reader-footnote-card {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 520px;
        width: calc(100% - 32px);
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
        padding: 14px 18px;
        z-index: 10050;
        backdrop-filter: blur(12px);
        animation: toastIn 0.2s ease-out;
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

      /* More Actions Popover Menu (...) */
      .reader-v2-more-menu {
        position: absolute;
        top: 54px;
        right: 12px;
        z-index: 70;
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
        padding: 6px;
        min-width: 230px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        backdrop-filter: blur(16px);
        animation: fadeIn 0.15s ease-out;
      }
      .reader-more-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        width: 100%;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .reader-more-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--r-accent);
      }
      .reader-more-divider {
        height: 1px;
        background: var(--r-border);
        margin: 4px 6px;
      }

      /* Floating TTS Audio Player Bar */
      .reader-v2-tts-bar {
        position: fixed;
        bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 520px;
        z-index: 9999;
        background: rgba(18, 20, 26, 0.96);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
        animation: toastIn 0.2s ease-out;
        user-select: none;
      }
      .tts-speaking-sentence {
        background: rgba(245, 158, 11, 0.22);
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.38);
        color: #fff;
        transition: all 0.2s ease;
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
    if (typeof window !== 'undefined' && window.he && typeof window.he.decode === 'function') {
      try { return window.he.decode(String(str)); } catch(_) {}
    }
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

  const swapPronouns = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Words that follow an object 'her' (prepositions, conjunctions, punctuation, pronouns, verbs)
    const nonPossessiveFollowers = /^(?:and|or|but|so|yet|that|which|who|whom|with|for|to|in|on|at|from|by|as|if|because|when|while|though|then|than|after|before|into|through|over|under|out|up|down|off|away|back|again|too|also|either|neither|now|here|there|not|is|was|are|were|has|had|have|did|does|do)\b/i;

    // Step 1: Protect reflexives & absolute possessive
    let s = text
      .replace(/\bhimself\b/g, '___TEMP_HERSELF___')
      .replace(/\bHimself\b/g, '___TEMP_HERSELF_CAP___')
      .replace(/\bherself\b/g, 'himself')
      .replace(/\bHerself\b/g, 'Himself')
      .replace(/\bhers\b/g, '___TEMP_HIS_ABS___')
      .replace(/\bHers\b/g, '___TEMP_HIS_ABS_CAP___');

    // Step 2: Subject pronouns
    s = s
      .replace(/\bhe\b/g, '___TEMP_SHE___')
      .replace(/\bHe\b/g, '___TEMP_SHE_CAP___')
      .replace(/\bshe\b/g, 'he')
      .replace(/\bShe\b/g, 'He');

    // Step 3: 'his' -> 'her' (possessive)
    s = s
      .replace(/\bhis\b/g, '___TEMP_HER_POSS___')
      .replace(/\bHis\b/g, '___TEMP_HER_POSS_CAP___');

    // Step 4: 'him' -> 'her' (object)
    s = s
      .replace(/\bhim\b/g, '___TEMP_HER_OBJ___')
      .replace(/\bHim\b/g, '___TEMP_HER_OBJ_CAP___');

    // Step 5: Distinguish 'her' as possessive ("her sword" -> "his sword") vs object ("looked at her" -> "looked at him")
    s = s.replace(/\b(her|Her)\b(\s+)?([a-zA-Z]+)?/g, (match, herWord, space, nextWord) => {
      const isCap = herWord === 'Her';
      if (!nextWord || nonPossessiveFollowers.test(nextWord)) {
        // Object pronoun: "looked at her" -> "looked at him"
        return (isCap ? 'Him' : 'him') + (space || '') + (nextWord || '');
      } else {
        // Possessive adjective: "her sword" -> "his sword"
        return (isCap ? 'His' : 'his') + (space || '') + (nextWord || '');
      }
    });

    // Step 6: Restore temporary tokens
    s = s
      .replace(/___TEMP_HERSELF___/g, 'herself')
      .replace(/___TEMP_HERSELF_CAP___/g, 'Herself')
      .replace(/___TEMP_HIS_ABS___/g, 'his')
      .replace(/___TEMP_HIS_ABS_CAP___/g, 'His')
      .replace(/___TEMP_SHE___/g, 'she')
      .replace(/___TEMP_SHE_CAP___/g, 'She')
      .replace(/___TEMP_HER_POSS___/g, 'her')
      .replace(/___TEMP_HER_POSS_CAP___/g, 'Her')
      .replace(/___TEMP_HER_OBJ___/g, 'her')
      .replace(/___TEMP_HER_OBJ_CAP___/g, 'Her');

    return s;
  };
  window.swapPronouns = swapPronouns;

  // ── Reading Progress Persistence (Moon+ Reader standard) ──
  const getReadingProgressMap = () => {
    try {
      const raw = localStorage.getItem('gemini_reading_progress');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  const getReadingProgress = (key) => {
    if (!key) return null;
    const map = getReadingProgressMap();
    return map[String(key)] || null;
  };

  const saveReadingProgress = (key, chapterIdx, scrollTop, pct) => {
    if (!key) return;
    try {
      const map = getReadingProgressMap();
      map[String(key)] = {
        chapterIdx: typeof chapterIdx === 'number' ? chapterIdx : 0,
        scrollTop: typeof scrollTop === 'number' ? Math.round(scrollTop) : 0,
        pct: typeof pct === 'number' ? Math.round(pct * 10) / 10 : 0,
        updatedAt: Date.now()
      };
      localStorage.setItem('gemini_reading_progress', JSON.stringify(map));
    } catch (e) {
      console.warn('saveReadingProgress error:', e);
    }
  };

  window.getReadingProgress = getReadingProgress;
  window.saveReadingProgress = saveReadingProgress;

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
    novelId,
    novelTitle,
    bookTitle: propBookTitle,
    onVerifyConsistency,
    onOpenHealthAudit,
    onOpenDiff
  }) => {
    if (!open) return null;
    const bookTitle = novelTitle || propBookTitle || '';
    ensureStyles();

    // ── 1. Chapter Normalization with Arc / Volume Hierarchy Detection ──
    const safeChapters = useMemo(() => {
      let list = Array.isArray(chapters) && chapters.length > 0
        ? chapters.filter(c => c && typeof c === 'object').map(c => ({
            title: decodeEntities(c.title || 'Chapter'),
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

    const changeChapter = useCallback((newIdx) => {
      if (newIdx < 0 || newIdx >= safeChapters.length) return;
      setActiveIdx(newIdx);
      if (typeof onChapterChange === 'function') onChapterChange(newIdx);
      saveReadingProgress(activeNovelKey, newIdx, 0, 0);
      // Reset scroll
      const container = document.getElementById('gemini-reader-scroll-area');
      if (container) container.scrollTo({ top: 0, behavior: 'instant' });
    }, [safeChapters.length, onChapterChange, activeNovelKey]);

    // Scroll Position Restoration
    const scrollRestoredRef = useRef(false);
    useEffect(() => {
      scrollRestoredRef.current = false;
    }, [activeNovelKey]);

    useEffect(() => {
      if (!open || scrollRestoredRef.current) return;
      const prog = getReadingProgress(activeNovelKey);
      if (prog && prog.chapterIdx === activeIdx && prog.scrollTop > 0) {
        scrollRestoredRef.current = true;
        const timer = setTimeout(() => {
          const container = document.getElementById('gemini-reader-scroll-area');
          if (container) {
            container.scrollTo({ top: prog.scrollTop, behavior: 'instant' });
          }
        }, 80);
        return () => clearTimeout(timer);
      }
    }, [open, activeIdx, activeNovelKey]);

    // Debounced Scroll Persistence & Auto-Scroll Subpixel Accumulator
    const saveScrollTimeoutRef = useRef(null);
    const scrollAccumulatorRef = useRef(0);
    const handleScroll = useCallback((e) => {
      const el = e.currentTarget;
      if (!el) return;
      scrollAccumulatorRef.current = el.scrollTop || 0;
      if (saveScrollTimeoutRef.current) clearTimeout(saveScrollTimeoutRef.current);
      saveScrollTimeoutRef.current = setTimeout(() => {
        const top = el.scrollTop || 0;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        const pct = scrollHeight > 0 ? (top / scrollHeight) * 100 : 0;
        saveReadingProgress(activeNovelKey, activeIdx, top, pct);
      }, 200);
    }, [activeNovelKey, activeIdx]);

    // ── 2. UI Chrome & Menus ──
    const [hudVisible, setHudVisible] = useState(false);
    const [showToc, setShowToc] = useState(false);
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

    useEffect(() => { localStorage.setItem('gemini_reader_mode', viewMode); }, [viewMode]);
    useEffect(() => { localStorage.setItem('gemini_reader_width', contentWidth); }, [contentWidth]);
    useEffect(() => { localStorage.setItem('gemini_reader_lineheight', String(lineHeight)); }, [lineHeight]);
    useEffect(() => { localStorage.setItem('gemini_reader_indent', String(paragraphIndent)); }, [paragraphIndent]);
    useEffect(() => { localStorage.setItem('readerJustify', String(justify)); }, [justify]);

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
                window.toast(`⚡ Auto-scrolling to Chapter ${activeIdx + 2}...`, 'info');
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

    // ── Footnotes Extraction & Caching (§5.10) ──
    const [activeFootnote, setActiveFootnote] = useState(null);
    const [footnotesMap, chapterElements] = useMemo(() => {
      let raw = currentChapter?.text || currentChapter?.content || '';
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && currentChapter?.title) {
        raw = stripFn(raw, currentChapter.title, currentChapter.originalTitle);
      }

      const map = new Map();
      let mainText = raw;

      // Detect --- FOOTNOTES --- section at the bottom
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

      // Also detect standalone trailing footnote lines
      const trailingDefRegex = /(?:^|\n)\[([¹²³⁴⁵⁶⁷⁸⁹⁰]+|\d+)\s+(?:Note|note)[:：]\s*([^\n]+)\]/gi;
      let tm;
      while ((tm = trailingDefRegex.exec(mainText)) !== null) {
        map.set(tm[1].trim(), tm[2].trim());
      }
      mainText = mainText.replace(trailingDefRegex, '').trim();

      const lines = mainText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const elems = [];
      let elIdx = 0;
      for (let li = 0; li < lines.length; li++) {
        const rawLine = lines[li];
        // 1. Standalone markdown image: ![alt](url)
        const mdImg = rawLine.match(/^!\[(.*?)\]\(([^\)]+)\)\s*$/i);
        if (mdImg) {
          elems.push({ type: 'image', alt: mdImg[1] || 'Illustration', src: mdImg[2].trim(), id: `p_${elIdx++}` });
          continue;
        }
        // 2. Standalone HTML img tag: <img ... src="..." ...>
        const htmlImg = rawLine.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>\s*$/i);
        if (htmlImg) {
          const altM = rawLine.match(/alt=["']([^"']+)["']/i);
          elems.push({ type: 'image', alt: altM ? altM[1] : 'Illustration', src: htmlImg[1].trim(), id: `p_${elIdx++}` });
          continue;
        }
        // 3. Embedded markdown image mixed with text
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
          continue;
        }

        // 4. Centered text: [center]...[/center] or <center>...</center>
        const centerM = rawLine.match(/^(?:\[center\]|<center>|<p\s+class="text-center">)([\s\S]*?)(?:\[\/center\]|<\/center>|<\/p>)?$/i)
                     || rawLine.match(/^([\s\S]*?)\[\/center\]$/i);
        if (centerM) {
          const inner = (centerM[1] || '').replace(/\[\/?center\]/gi, '').trim();
          elems.push({ type: 'center', content: inner, id: `p_${elIdx++}` });
          continue;
        }

        // 5. Right-aligned text: [right]...[/right]
        const rightM = rawLine.match(/^(?:\[right\]|<p\s+class="text-right">)([\s\S]*?)(?:\[\/right\]|<\/p>)?$/i)
                    || rawLine.match(/^([\s\S]*?)\[\/right\]$/i);
        if (rightM) {
          const inner = (rightM[1] || '').replace(/\[\/?right\]/gi, '').trim();
          elems.push({ type: 'right', content: inner, id: `p_${elIdx++}` });
          continue;
        }

        // 6. Scene break divider: ---, ***, ___, ◆◆◆, ✦✦✦, etc.
        if (/^(?:\*\s*\*\s*\*|\*{3,}|\.{3,}|\u2026{2,}|\u2014{2,}|-{3,}|={3,}|~{3,}|#\s*#\s*#|(?:◆\s*){2,}|(?:◇\s*){2,}|(?:✦\s*){2,}|(?:★\s*){2,}|(?:☆\s*){2,}|(?:•\s*){3,}|(?:·\s*){3,})$/.test(rawLine) || rawLine === '---' || rawLine === '***' || rawLine === '___') {
          elems.push({ type: 'divider', id: `p_${elIdx++}` });
          continue;
        }

        // 7. Markdown tables: | col | col |
        if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
          const tableLines = [rawLine];
          while (li + 1 < lines.length && lines[li + 1].startsWith('|') && lines[li + 1].endsWith('|')) {
            li++;
            tableLines.push(lines[li]);
          }
          const rows = tableLines.filter(l => !/^[\|\s\-:]+$/.test(l));
          if (rows.length > 0) {
            elems.push({ type: 'table', rows, id: `p_${elIdx++}` });
            continue;
          }
        }

        // 8. Author's Note blockquote: > **Author's Note:** or > Author's Note:
        if (rawLine.startsWith('> **Author\'s Note:**') || rawLine.startsWith('> Author\'s Note:')) {
          const noteLines = [rawLine.replace(/^>\s*/, '')];
          while (li + 1 < lines.length && lines[li + 1].startsWith('>')) {
            li++;
            noteLines.push(lines[li].replace(/^>\s*/, ''));
          }
          elems.push({ type: 'author-note', content: noteLines.join('\n'), id: `p_${elIdx++}` });
          continue;
        }

        // 9. Standard blockquote: > text
        if (rawLine.startsWith('>')) {
          const bqLines = [rawLine.replace(/^>\s*/, '')];
          while (li + 1 < lines.length && lines[li + 1].startsWith('>') && !lines[li + 1].startsWith('> **Author\'s Note:')) {
            li++;
            bqLines.push(lines[li].replace(/^>\s*/, ''));
          }
          elems.push({ type: 'blockquote', content: bqLines.join('\n'), id: `p_${elIdx++}` });
          continue;
        }

        elems.push({ type: 'text', content: rawLine, id: `p_${elIdx++}` });
      }

      return [map, elems];
    }, [currentChapter, renderTick]);

    // ── Native Paginated Book Flip Engine ──
    const paginatedViewportRef = useRef(null);
    const paginatedTrackRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [colWidth, setColWidth] = useState(0);
    const touchStartRef = useRef(null);

    // Reset to page 0 whenever active chapter changes
    useEffect(() => {
      setCurrentPage(0);
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
        setCurrentPage(prev => Math.min(prev, computedTotal - 1));
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
      const ratio = clickX / rect.width;

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
    const speakSentenceRef = useRef(null);
    const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);
    const activeSentenceIdxRef = useRef(-1);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [previewSpeaking, setPreviewSpeaking] = useState(false);
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

      // If speech is actively playing, immediately restart current sentence at the new speed
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

      // Apply Moon+ Reader TTS Character & Pronunciation Filters
      const sentence = applyTtsCharFilters(rawText);

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
          if (typeof window.showToast === 'function') window.showToast('🔗 Deep link copied to clipboard!', 'success');
          else if (typeof window.toast === 'function') window.toast('🔗 Deep link copied to clipboard!', 'success');
        } else {
          prompt('Copy deep link:', fullUrl);
        }
      } catch (e) {
        console.warn('Share link failed:', e);
      }
    }, [novelId, activeIdx]);

    const renderParagraphNode = (el, pIdx, isPaginated, mCounterObj) => {
      if (el.type === 'image') {
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
          onClick: () => setLightboxImg(el.src)
        },
          h('img', {
            src: el.src,
            alt: el.alt,
            loading: 'lazy',
            style: {
              maxWidth: '100%',
              maxHeight: isPaginated ? 'calc(100vh - 180px)' : '80vh',
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
                  }, cellTxt))
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
            pageBreakInside: 'avoid'
          }
        },
          noteParagraphs.map((np, npIdx) => h('p', {
            key: `np_${npIdx}`,
            style: { margin: npIdx === noteParagraphs.length - 1 ? 0 : '0 0 8px 0', textIndent: 0, textAlign: 'left' }
          }, np))
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
            pageBreakInside: 'avoid'
          }
        },
          bqParagraphs.map((bp, bpIdx) => h('p', {
            key: `bp_${bpIdx}`,
            style: { margin: bpIdx === bqParagraphs.length - 1 ? 0 : '0 0 6px 0', textIndent: 0, textAlign: 'left' }
          }, bp))
        );
      }

      const alignStyle = el.type === 'center'
        ? { textAlign: 'center', textIndent: 0 }
        : (el.type === 'right' ? { textAlign: 'right', textIndent: 0 } : {});

      let rawText = (el.content || '')
        .replace(/\[\/?(?:center|right|left|b|i|u|s|color|size|font|align)[^\]]*\]/gi, '')
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
        if (!showSearch || !searchQuery.trim()) return txt;
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
          return part;
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
            className: 'reader-top-btn',
            style: { minWidth: 40, minHeight: 40, fontSize: 16 },
            onClick: () => { stopTts(); onClose(); },
            title: 'Close Reader'
          }, '✕'),
          h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13.5 } },
            currentChapter.title
          )
        ),
        h('div', { className: 'reader-top-btn-group' },
          // 1. Table of Contents
          h('button', {
            type: 'button',
            className: 'reader-top-btn',
            onClick: () => { setShowMoreMenu(false); setShowToc(true); },
            title: 'Table of Contents'
          },
            h('span', null, '📑'),
            h('span', { className: 'reader-top-btn-text' }, ' TOC')
          ),
          // 2. Read Aloud (TTS)
          h('button', {
            type: 'button',
            className: `reader-top-btn ${ttsActive ? 'active' : ''}`,
            onClick: () => { setShowMoreMenu(false); toggleTts(); },
            title: ttsActive ? (ttsPaused ? 'Resume Read Aloud' : 'Pause Read Aloud') : 'Read Aloud (TTS)'
          },
            h('span', null, ttsActive ? (ttsPaused ? '▶' : '⏸') : '🎧'),
            h('span', { className: 'reader-top-btn-text' }, ' TTS')
          ),
          // 2b. Voice & Engine Selector
          h('button', {
            type: 'button',
            className: 'reader-top-btn',
            onClick: () => { setShowMoreMenu(false); setShowVoiceModal(true); },
            title: 'Change Voice & Speech Engine (SherpaTTS / Piper / Android Settings)'
          },
            h('span', null, '🎙'),
            h('span', { className: 'reader-top-btn-text' }, ' Voice')
          ),
          // 3. Settings (Typography & Themes)
          h('button', {
            type: 'button',
            className: 'reader-top-btn',
            onClick: () => { setShowMoreMenu(false); setShowSettings(true); },
            title: 'Typography & Appearance'
          },
            h('span', null, '⚙'),
            h('span', { className: 'reader-top-btn-text' }, ' Settings')
          ),
          // 4. More Actions Menu (...)
          h('button', {
            type: 'button',
            className: `reader-top-btn ${showMoreMenu ? 'active' : ''}`,
            onClick: (e) => { e.stopPropagation(); setShowMoreMenu(s => !s); },
            title: 'More Actions'
          },
            h('span', { style: { fontSize: 16, fontWeight: 900, letterSpacing: 1 } }, '···')
          )
        )
      ),

      // ── MORE ACTIONS POPUP MENU (...) ──
      showMoreMenu && h('div', {
        className: 'reader-v2-more-menu',
        style: ttsActive ? {
          top: 'auto',
          bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
          right: 'max(16px, calc((100vw - 520px) / 2 + 16px))'
        } : undefined,
        onClick: (e) => e.stopPropagation()
      },
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => { setShowMoreMenu(false); setShowSearch(s => !s); }
        },
          h('span', null, '🔍'),
          h('span', null, 'Find in Chapter')
        ),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => { setShowMoreMenu(false); setAutoScroll(s => !s); }
        },
          h('span', null, '⚡'),
          h('span', null, autoScroll ? 'Stop Auto-Scroll' : 'Start Auto-Scroll')
        ),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => { setShowMoreMenu(false); setShowVoiceModal(true); }
        },
          h('span', null, '🎙'),
          h('span', null, 'Voice & Offline Engine Settings')
        ),
        h('div', { className: 'reader-more-divider' }),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => {
            setShowMoreMenu(false);
            if (typeof onOpenHealthAudit === 'function') onOpenHealthAudit();
            else if (typeof window !== 'undefined' && typeof window.openNovelHealthAudit === 'function') window.openNovelHealthAudit();
          }
        },
          h('span', null, '🩺'),
          h('span', null, 'Novel Health & QA Audit')
        ),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => {
            setShowMoreMenu(false);
            if (typeof onOpenDiff === 'function') onOpenDiff(activeIdx);
            else if (typeof window !== 'undefined' && typeof window.openDiffInspector === 'function') window.openDiffInspector(activeIdx);
          }
        },
          h('span', null, '📜'),
          h('span', null, 'Translation Diffs & Revisions')
        ),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => {
            setShowMoreMenu(false);
            if (typeof onClose === 'function') onClose();
            if (window.loadEpubForEditing) window.loadEpubForEditing({ id: novelId, chapters });
            if (typeof window.setActiveAppTab === 'function') window.setActiveAppTab('studio', 'edit');
          }
        },
          h('span', null, '✏️'),
          h('span', null, 'Edit in Ebook Studio')
        ),
        h('button', {
          type: 'button',
          className: 'reader-more-item',
          onClick: () => { setShowMoreMenu(false); handleShareDeepLink(); }
        },
          h('span', null, '🔗'),
          h('span', null, 'Share Chapter Deep Link')
        )
      ),

      // ── FLOATING IN-CHAPTER SEARCH BAR ──
      showSearch && h('div', {
        className: 'reader-v2-search-bar',
        onClick: (e) => e.stopPropagation()
      },
        h('span', { style: { fontSize: 15, opacity: 0.7 } }, '🔍'),
        h('input', {
          type: 'text',
          className: 'reader-search-input',
          placeholder: 'Search chapter text…',
          value: searchQuery,
          autoFocus: true,
          onChange: (e) => {
            setSearchQuery(e.target.value);
            setActiveMatchIndex(0);
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) {
                handlePrevSearchMatch();
              } else {
                handleNextSearchMatch();
              }
            } else if (e.key === 'Escape') {
              setShowSearch(false);
            }
          }
        }),
        h('span', {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: searchMatches.length > 0 ? 'var(--r-accent)' : 'var(--r-muted)',
            whiteSpace: 'nowrap',
            padding: '2px 6px'
          }
        }, searchQuery.trim() ? (searchMatches.length > 0 ? `${activeMatchIndex + 1} of ${searchMatches.length}` : '0 found') : ''),
        h('button', {
          type: 'button',
          className: 'reader-search-nav-btn',
          disabled: searchMatches.length === 0,
          onClick: handlePrevSearchMatch,
          title: 'Previous match (Shift+Enter)'
        }, '▲'),
        h('button', {
          type: 'button',
          className: 'reader-search-nav-btn',
          disabled: searchMatches.length === 0,
          onClick: handleNextSearchMatch,
          title: 'Next match (Enter)'
        }, '▼'),
        h('button', {
          type: 'button',
          className: 'reader-search-nav-btn close',
          onClick: () => {
            setShowSearch(false);
            setSearchQuery('');
          },
          title: 'Close search'
        }, '✕')
      ),

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
                }, currentChapter.title),
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

          // Chapter Paragraphs & Illustrations with Footnotes & Search
          (() => {
            let mCounter = { count: 0 };
            return chapterElements.map((el, pIdx) => renderParagraphNode(el, pIdx, false, mCounter));
          })(),

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
        // Progress Scrubber Slider with Live Chapter Tooltip
        h('div', { style: { position: 'relative', width: '100%', marginBottom: 4 } },
          isScrubbing && h('div', {
            style: {
              position: 'absolute',
              bottom: '100%',
              left: `${Math.min(90, Math.max(10, ((scrubberIdx + 1) / Math.max(1, safeChapters.length)) * 100))}%`,
              transform: 'translateX(-50%)',
              marginBottom: 10,
              background: 'var(--r-card, #1e293b)',
              color: 'var(--r-text, #fff)',
              border: '1px solid var(--r-border, rgba(255,255,255,0.15))',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 100
            }
          },
            `Ch. ${scrubberIdx + 1}: ${(safeChapters[scrubberIdx]?.title || `Chapter ${scrubberIdx + 1}`).slice(0, 32)}`
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { fontSize: 11, color: 'var(--r-muted)', minWidth: 38, textAlign: 'right' } }, `${(isScrubbing ? scrubberIdx : activeIdx) + 1}`),
            h('input', {
              type: 'range',
              min: 0,
              max: Math.max(0, safeChapters.length - 1),
              value: isScrubbing ? scrubberIdx : activeIdx,
              style: { flex: 1, accentColor: 'var(--r-accent)', cursor: 'pointer' },
              onPointerDown: () => setIsScrubbing(true),
              onTouchStart: () => setIsScrubbing(true),
              onInput: (e) => {
                setIsScrubbing(true);
                setScrubberIdx(parseInt(e.target.value, 10));
              },
              onChange: (e) => {
                const target = parseInt(e.target.value, 10);
                setScrubberIdx(target);
                setIsScrubbing(false);
                changeChapter(target);
              },
              onPointerUp: () => {
                if (isScrubbing) {
                  setIsScrubbing(false);
                  changeChapter(scrubberIdx);
                }
              },
              onTouchEnd: () => {
                if (isScrubbing) {
                  setIsScrubbing(false);
                  changeChapter(scrubberIdx);
                }
              }
            }),
            h('span', { style: { fontSize: 11, color: 'var(--r-muted)', minWidth: 38 } }, `${safeChapters.length}`)
          )
        ),

        // Clean Navigation Toolbar
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            disabled: activeIdx <= 0,
            style: { padding: '7px 14px', fontWeight: 600, fontSize: 12.5 },
            onClick: () => changeChapter(activeIdx - 1)
          }, '⏮ Previous'),

          h('div', { style: { fontSize: 12, color: 'var(--r-muted)', fontWeight: 600 } },
            `Chapter ${activeIdx + 1} of ${safeChapters.length} • ${Math.round(((activeIdx + 1) / safeChapters.length) * 100)}%`
          ),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            disabled: activeIdx >= safeChapters.length - 1,
            style: { padding: '7px 14px', fontWeight: 600, fontSize: 12.5 },
            onClick: () => changeChapter(activeIdx + 1)
          }, 'Next ⏭')
        )
      ),

      // ── MOON+ READER FLOATING TTS PLAYER (Screenshots 1 & 3) ──
      ttsActive && h('div', {
        className: 'reader-v2-tts-bar',
        style: {
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 520,
          margin: 0,
          boxSizing: 'border-box',
          zIndex: 9999
        },
        onClick: (e) => e.stopPropagation()
      },
        // Row 1: Speed Slider & Buttons (Screenshots 1 & 3)
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            boxSizing: 'border-box'
          }
        },
          h('span', { style: { fontSize: 12, fontWeight: 700, minWidth: 40, color: 'var(--r-muted)', flexShrink: 0 } }, 'Speed'),
          h('span', { style: { fontSize: 12.5, fontWeight: 800, color: 'var(--r-accent)', minWidth: 38, flexShrink: 0 } }, `${ttsRate}x`),
          h('input', {
            type: 'range',
            min: '0.5',
            max: '3.0',
            step: '0.05',
            value: ttsRate,
            style: { flex: 1, minWidth: 50, accentColor: 'var(--r-accent)', height: 4, cursor: 'pointer' },
            onChange: (e) => handleRateChange(parseFloat(e.target.value))
          }),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '3px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid var(--r-border)', flexShrink: 0 },
            title: 'Reset to 1.0x',
            onClick: () => handleRateChange(1.0)
          }, '↺'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '3px 9px', fontSize: 13, fontWeight: 700, borderRadius: 6, border: '1px solid var(--r-border)', flexShrink: 0 },
            title: 'Decrease Speed',
            onClick: () => handleRateChange(Math.max(0.5, Math.round((ttsRate - 0.1) * 10) / 10))
          }, '–'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '3px 9px', fontSize: 13, fontWeight: 700, borderRadius: 6, border: '1px solid var(--r-border)', flexShrink: 0 },
            title: 'Increase Speed',
            onClick: () => handleRateChange(Math.min(3.0, Math.round((ttsRate + 0.1) * 10) / 10))
          }, '+')
        ),

        // Row 2: Transport Controls (Screenshots 1 & 3) - Perfectly Centered & Symmetrical
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 4,
            boxSizing: 'border-box'
          }
        },
          // 1. Stop button
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 15, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            title: 'Stop TTS',
            onClick: stopTts
          }, '⏹'),

          // 2. Prev Chapter
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            disabled: activeIdx <= 0,
            title: 'Previous Chapter',
            onClick: () => {
              if (activeIdx > 0) changeChapter(activeIdx - 1);
            }
          }, '|◀'),

          // 3. Prev Sentence/Paragraph
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            disabled: activeSentenceIdx <= 0,
            title: 'Previous Chunk',
            onClick: () => speakSentence(Math.max(0, activeSentenceIdx - 1))
          }, '◀◀'),

          // 4. Voice & Engine Selector
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 15, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            title: 'Change Voice & Speech Engine (SherpaTTS / Piper)',
            onClick: () => setShowVoiceModal(true)
          }, '🎙'),

          // 5. Play / Pause button (DEAD CENTER)
          h('button', {
            type: 'button',
            style: {
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--r-accent)',
              color: '#ffffff',
              border: 'none',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
              flexShrink: 0,
              margin: '0 4px'
            },
            title: ttsPaused ? 'Resume' : 'Pause',
            onClick: toggleTts
          }, ttsPaused ? '▶' : '⏸'),

          // 6. Next Sentence/Paragraph
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            disabled: activeSentenceIdx >= sentencesRef.current.length - 1,
            title: 'Next Chunk',
            onClick: () => speakSentence(activeSentenceIdx + 1)
          }, '▶▶'),

          // 7. Next Chapter
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            disabled: activeIdx >= safeChapters.length - 1,
            title: 'Next Chapter',
            onClick: () => {
              if (activeIdx < safeChapters.length - 1) changeChapter(activeIdx + 1);
            }
          }, '▶|'),

          // 8. TTS Options
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 15, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--r-accent)' },
            title: 'TTS Options',
            onClick: () => setShowTtsOptionsModal(true)
          }, '⚙'),

          // 9. More Options (...)
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 15, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            title: 'More Actions',
            onClick: () => setShowMoreMenu(!showMoreMenu)
          }, '···')
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

              const isCollapsed = Boolean(collapsedArcs[group.arc]) && !tocSearch && !group.chapters.some(c => c.idx === activeIdx);

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
                      ref: isActive ? activeTocItemRef : null,
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

          // Reading Mode (Foliate vs Scroll)
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 } }, 'Reading Mode'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              h('button', {
                type: 'button',
                className: `mini-btn ${viewMode === 'paginated' ? '' : 'ghost'}`,
                style: viewMode === 'paginated' ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, padding: '9px 0' } : { padding: '9px 0' },
                onClick: () => setViewMode('paginated')
              }, '📖 Foliate Book Flip'),
              h('button', {
                type: 'button',
                className: `mini-btn ${viewMode === 'scroll' ? '' : 'ghost'}`,
                style: viewMode === 'scroll' ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, padding: '9px 0' } : { padding: '9px 0' },
                onClick: () => setViewMode('scroll')
              }, '📜 Continuous Scroll')
            )
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

          // Line Height / Spacing Controls
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
              h('span', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)' } }, 'Line Spacing'),
              h('span', { style: { fontSize: 12, fontWeight: 700, color: 'var(--r-accent)' } }, `${lineHeight.toFixed(1)}x`)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 } },
              [1.4, 1.6, 1.8, 2.0, 2.2].map(lh => h('button', {
                key: lh,
                type: 'button',
                className: `mini-btn ${Math.abs(lineHeight - lh) < 0.05 ? '' : 'ghost'}`,
                style: Math.abs(lineHeight - lh) < 0.05 ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                onClick: () => setLineHeight(lh)
              }, `${lh}`))
            )
          ),

          // Toggles: Indentation & Justification
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 16 } },
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
          ),

          // Audio & Speech (TTS) Engine & Voice Settings (Legado & Piper Integration)
          h('div', { style: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--r-border)' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 10 } }, '🎧 Audio & Speech (TTS)'),

            // Installed TTS Engine Selector (SherpaTTS / Piper / Google / Samsung)
            ttsEngines.length > 0 && h('div', { style: { marginBottom: 12 } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'TTS Engine'),
              h('select', {
                value: selectedTtsEngine,
                style: { width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--r-bg)', color: 'var(--r-text)', border: '1px solid var(--r-border)', fontSize: 13 },
                onChange: async (e) => {
                  const eng = e.target.value;
                  setSelectedTtsEngine(eng);
                  if (window.NativeBridge?.setTtsEngine) {
                    await window.NativeBridge.setTtsEngine(eng);
                    if (window.toast) window.toast(`TTS engine switched to: ${eng}`, 'success');
                  }
                }
              },
                ttsEngines.map(eng => h('option', { key: eng.name, value: eng.name }, `${eng.label || eng.name}${eng.name.includes('sherpa') ? ' (Offline Piper AI)' : ''}`))
              )
            ),

            // Voice Selector (if available)
            ttsVoices.length > 0 && h('div', { style: { marginBottom: 12 } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Voice'),
              h('select', {
                value: selectedTtsVoice,
                style: { width: '100%', padding: '8px 10px', borderRadius: 6, background: 'var(--r-bg)', color: 'var(--r-text)', border: '1px solid var(--r-border)', fontSize: 13 },
                onChange: (e) => {
                  setSelectedTtsVoice(e.target.value);
                  if (window.NativeBridge?.setTtsVoice) {
                    window.NativeBridge.setTtsVoice(e.target.value);
                  }
                }
              },
                h('option', { value: '' }, 'Default Voice'),
                ttsVoices.map(v => h('option', { key: v.name, value: v.name }, `${v.name} (${v.locale})`))
              )
            ),

            // Speech Speed (Rate)
            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                h('span', { style: { fontSize: 12, fontWeight: 600 } }, 'Speech Speed'),
                h('span', { style: { fontSize: 12, fontWeight: 700, color: 'var(--r-accent)' } }, `${ttsRate}x`)
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 } },
                [0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(r => h('button', {
                  key: r,
                  type: 'button',
                  className: `mini-btn ${Math.abs(ttsRate - r) < 0.05 ? '' : 'ghost'}`,
                  style: Math.abs(ttsRate - r) < 0.05 ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, fontSize: 11 } : { fontSize: 11 },
                  onClick: () => handleRateChange(r)
                }, `${r}x`))
              ),
              h('input', {
                type: 'range',
                min: '0.5',
                max: '3.0',
                step: '0.05',
                value: ttsRate,
                style: { width: '100%', accentColor: 'var(--r-accent)' },
                onChange: (e) => handleRateChange(parseFloat(e.target.value))
              })
            ),

            // Inter-Sentence Pause (DAC Ramp-Up Safety for Piper)
            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Sentence Pause (DAC Ramp-Up Buffer)'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 } },
                [[0, '0ms'], [100, '100ms'], [200, '200ms'], [300, '300ms'], [500, '500ms']].map(([ms, label]) => h('button', {
                  key: ms,
                  type: 'button',
                  className: `mini-btn ${dacDelayMs === ms ? '' : 'ghost'}`,
                  style: dacDelayMs === ms ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                  title: ms === 200 ? 'Recommended for Piper ONNX' : undefined,
                  onClick: () => setDacDelayMs(ms)
                }, label))
              )
            ),

            // Sleep Timer presets in settings
            h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } }, 'Sleep Timer'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 } },
                [[0, 'Off'], [15, '15m'], [30, '30m'], [45, '45m'], [60, '60m'], [-1, 'End Ch.']].map(([m, label]) => h('button', {
                  key: m,
                  type: 'button',
                  className: `mini-btn ${sleepTimerMinutes === m ? '' : 'ghost'}`,
                  style: sleepTimerMinutes === m ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, fontSize: 11 } : { fontSize: 11 },
                  onClick: () => {
                    setSleepTimerMinutes(m);
                    if (m > 0) setSleepTimerSecondsLeft(m * 60);
                  }
                }, label))
              )
            ),
            // Button to open full Voice & Offline Engine Manager
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: { width: '100%', padding: '10px 0', marginTop: 14, background: 'var(--r-accent)', color: '#fff', fontWeight: 700, borderRadius: 8 },
              onClick: () => { setShowSettings(false); setShowVoiceModal(true); }
            }, '🎙 Open Voice & Offline AI Engine Manager')
          )
        )
      ),

      // ── VOICE & OFFLINE ENGINE SELECTION MODAL (Premium Modern UI) ──
      showVoiceModal && h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 10001,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        },
        onClick: () => setShowVoiceModal(false)
      },
        h('div', {
          style: {
            width: '100%',
            maxWidth: 520,
            maxHeight: '88vh',
            overflowY: 'auto',
            background: 'var(--r-card, #16161a)',
            color: 'var(--r-text, #f1f5f9)',
            borderRadius: '24px 24px 0 0',
            padding: '22px 20px 32px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          },
          onClick: (e) => e.stopPropagation()
        },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('div', {
                style: {
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 19,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                }
              }, '🎙'),
              h('div', null,
                h('div', { style: { fontWeight: 800, fontSize: 16.5, letterSpacing: -0.3 } }, 'Speech Engine & Voices'),
                h('div', { style: { fontSize: 12, color: 'var(--r-muted, #94a3b8)' } }, 'Select offline Piper AI (SherpaTTS) or system speech')
              )
            ),
            h('button', {
              type: 'button',
              style: {
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: 'var(--r-muted, #94a3b8)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                cursor: 'pointer'
              },
              onClick: () => setShowVoiceModal(false)
            }, '✕')
          ),

          // ── 1. ACTIVE ANDROID SYSTEM SPEECH STATUS CARD ──
          h('div', {
            style: {
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))',
              border: '1.5px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 26 } }, '📱'),
                h('div', null,
                  h('div', { style: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--r-accent, #6366f1)', letterSpacing: 0.8 } }, 'Active Speech Engine (From Android)'),
                  h('div', { style: { fontWeight: 800, fontSize: 16, color: 'var(--r-text, #f1f5f9)', marginTop: 2 } },
                    systemTtsInfo.engineLabel || 'System Default'
                  )
                )
              ),
              h('span', {
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 9999,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }
              }, '★ Active in Android')
            ),

            h('div', {
              style: {
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 12.5,
                color: 'var(--r-muted, #cbd5e1)',
                lineHeight: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }
            },
              h('div', null,
                h('span', { style: { color: 'var(--r-text, #fff)', fontWeight: 600 } }, 'Voice Model: '),
                systemTtsInfo.voiceName ? systemTtsInfo.voiceName : 'Exact model chosen in Android / SherpaTTS (e.g. Callum)'
              ),
              h('div', { style: { fontSize: 11.5, color: 'var(--r-muted, #94a3b8)' } },
                'The app automatically detects and reads using your voice directly from Android. No in-app overrides.'
              )
            ),

            // Action row: Test voice and Refresh
            h('div', { style: { display: 'flex', gap: 8, marginTop: 4 } },
              h('button', {
                type: 'button',
                className: 'mini-btn',
                disabled: previewSpeaking,
                style: {
                  flex: 1,
                  padding: '10px 14px',
                  background: 'var(--r-accent, #6366f1)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: 10,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                },
                onClick: previewVoice
              }, previewSpeaking ? '🔊 Speaking…' : '▶ Test Audio Sample'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: {
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--r-border)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                },
                title: 'Re-detect settings from Android',
                onClick: () => {
                  refreshSystemTts(true);
                  if (window.toast) window.toast('🔄 Re-detected TTS settings from Android', 'info');
                }
              }, '🔄 Refresh')
            )
          ),

          // ── 2. QUICK SHORTCUTS TO ANDROID & SHERPATTS ──
          h('div', null,
            h('div', { style: { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-accent, #6366f1)', letterSpacing: 0.8, marginBottom: 8 } }, 'Configure Voice & Engine in Android'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              window.NativeBridge?.openTtsSettings && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '12px 14px', borderRadius: 12, border: '1px solid var(--r-border)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => window.NativeBridge.openTtsSettings()
              }, '⚙ Android Settings'),
              window.NativeBridge?.openSherpaApp && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', background: 'rgba(16,185,129,0.08)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => window.NativeBridge.openSherpaApp()
              }, '⚡ Open SherpaTTS App')
            )
          ),

          // ── 4. SPEECH SPEED (RATE) ──
          h('div', {
            style: {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--r-border, rgba(255,255,255,0.08))',
              borderRadius: 14,
              padding: 14
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
              h('div', { style: { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-accent, #6366f1)', letterSpacing: 0.8 } }, '3. Speech Speed'),
              h('div', { style: { fontSize: 13, fontWeight: 800, color: 'var(--r-accent, #6366f1)' } }, `${ttsRate}x`)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 } },
              [0.75, 1.0, 1.25, 1.5, 2.0].map(r => h('button', {
                key: r,
                type: 'button',
                className: `mini-btn ${Math.abs(ttsRate - r) < 0.05 ? '' : 'ghost'}`,
                style: Math.abs(ttsRate - r) < 0.05 ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                onClick: () => handleRateChange(r)
              }, `${r}x`))
            ),
            h('input', {
              type: 'range',
              min: '0.5',
              max: '3.0',
              step: '0.05',
              value: ttsRate,
              style: { width: '100%', accentColor: 'var(--r-accent)', height: 5, cursor: 'pointer' },
              onChange: (e) => handleRateChange(parseFloat(e.target.value))
            })
          ),

          // ── 5. INTER-SENTENCE PAUSE (DAC RAMP-UP BUFFER) ──
          h('div', {
            style: {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--r-border, rgba(255,255,255,0.08))',
              borderRadius: 14,
              padding: 14
            }
          },
            h('div', { style: { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-accent, #6366f1)', letterSpacing: 0.8, marginBottom: 4 } }, '4. Sentence Pause (DAC Buffer)'),
            h('div', { style: { fontSize: 11.5, color: 'var(--r-muted)', marginBottom: 8 } }, 'Recommended: 200ms to prevent initial consonant clipping on Piper models'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 } },
              [[0, '0ms'], [100, '100ms'], [200, '200ms (★)'], [300, '300ms'], [500, '500ms']].map(([ms, label]) => h('button', {
                key: ms,
                type: 'button',
                className: `mini-btn ${dacDelayMs === ms ? '' : 'ghost'}`,
                style: dacDelayMs === ms ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700 } : {},
                onClick: () => setDacDelayMs(ms)
              }, label))
            )
          ),

          // ── 6. COLLAPSIBLE SHERPATTS GUIDE ──
          h('div', {
            style: {
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: 'pointer'
            },
            onClick: () => setShowSherpaHelp(!showSherpaHelp)
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('div', { style: { fontWeight: 700, fontSize: 12.5, color: 'var(--r-accent)', display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', null, '💡'),
                h('span', null, 'How to install Callum / Piper models in SherpaTTS')
              ),
              h('span', { style: { fontSize: 12, color: 'var(--r-muted)' } }, showSherpaHelp ? '▲' : '▼')
            ),
            showSherpaHelp && h('ol', { style: { fontSize: 12, lineHeight: 1.6, color: 'var(--r-text)', paddingLeft: 18, margin: '10px 0 0 0' } },
              h('li', null, 'Install the SherpaTTS APK on your Android device.'),
              h('li', null, 'Copy your model files (e.g. callum.onnx and tokens.txt) into your phone’s Download folder.'),
              h('li', null, 'Open SherpaTTS, tap "+" or "Install from SD", select the model & tokens file, and tap Install.'),
              h('li', null, 'Tap "Android Settings" above, set Preferred Engine to SherpaTTS, and enjoy studio offline audio!')
            )
          )
        )
      ),

      // ── MOON+ READER TTS OPTIONS MODAL (Screenshot 3) ──
      showTtsOptionsModal && h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
        onClick: () => setShowTtsOptionsModal(false)
      },
        h('div', {
          style: { width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: 'var(--r-card, #1a1a1f)', color: 'var(--r-text, #e2e8f0)', borderRadius: 16, padding: 22, boxShadow: '0 20px 50px rgba(0,0,0,0.7)', border: '1px solid var(--r-border, rgba(255,255,255,0.1))' },
          onClick: (e) => e.stopPropagation()
        },
          // Header
          h('div', { style: { fontSize: 18, fontWeight: 800, marginBottom: 18, color: 'var(--r-text)' } }, 'TTS Options'),

          // 0. Voice & Speech Engine (Prominent & Clear)
          h('div', { style: { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--r-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-accent)' } }, '🎙 Voice & Speech Engine'),
              h('span', { style: { fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 700 } },
                systemTtsInfo.engineLabel || 'Android Settings Default'
              )
            ),
            h('div', { style: { fontSize: 12, color: 'var(--r-muted)', marginBottom: 10 } },
              'Active Engine: ' + (systemTtsInfo.engineLabel || 'System Default') + ' · Uses exact voice model chosen in Android / SherpaTTS'
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { flex: 1, padding: '9px 12px', background: 'var(--r-accent)', color: '#fff', fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => { setShowTtsOptionsModal(false); setShowVoiceModal(true); }
              }, '🎙 Speech & Voice Info'),
              window.NativeBridge?.openTtsSettings && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 },
                title: 'Open Android System Text-to-Speech Settings',
                onClick: () => window.NativeBridge.openTtsSettings()
              }, '⚙ Android Settings')
            )
          ),

          // 1. Divide content by
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 12, color: 'var(--r-muted)', marginBottom: 6 } }, 'Divide content by'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('select', {
                value: divideBy,
                style: { flex: 1, padding: '9px 12px', borderRadius: 8, background: 'var(--r-bg, #111)', color: 'var(--r-text)', border: '1px solid var(--r-border)', fontSize: 13.5, fontWeight: 600 },
                onChange: (e) => setDivideBy(e.target.value)
              },
                h('option', { value: 'paragraph' }, 'paragraph'),
                h('option', { value: 'sentence' }, 'sentence')
              ),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--r-border)' },
                title: 'TTS Voice & Offline Engine Manager',
                onClick: () => { setShowTtsOptionsModal(false); setShowVoiceModal(true); }
              }, '⚙')
            )
          ),

          // 2. Stop TTS after X minutes
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            h('input', {
              type: 'checkbox',
              id: 'cb-stop-after',
              checked: stopAfterEnabled,
              style: { width: 17, height: 17, accentColor: 'var(--r-accent)', cursor: 'pointer' },
              onChange: (e) => setStopAfterEnabled(e.target.checked)
            }),
            h('label', { htmlFor: 'cb-stop-after', style: { fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
              'Stop TTS after',
              h('input', {
                type: 'number',
                min: '1',
                max: '300',
                value: stopAfterMinutes,
                style: { width: 50, padding: '2px 6px', textAlign: 'center', borderRadius: 4, background: 'var(--r-bg, #111)', color: 'var(--r-text)', border: '1px solid var(--r-border)', fontSize: 13, fontWeight: 700 },
                onChange: (e) => setStopAfterMinutes(parseInt(e.target.value, 10) || 10)
              }),
              'minutes'
            ),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { marginLeft: 'auto', padding: '4px 8px', borderRadius: 6, fontSize: 11, border: '1px solid var(--r-border)' },
              title: 'Sleep timer presets',
              onClick: () => {
                const presets = [10, 15, 30, 45, 60, -1];
                const curIdx = presets.indexOf(stopAfterMinutes);
                const next = presets[(curIdx + 1) % presets.length];
                setStopAfterMinutes(next);
                setStopAfterEnabled(true);
              }
            }, stopAfterMinutes === -1 ? 'End Ch.' : `${stopAfterMinutes}m`)
          ),

          // 3. Show confirmation dialog before speak
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            h('input', {
              type: 'checkbox',
              id: 'cb-confirm-speak',
              checked: showConfirmBeforeSpeak,
              style: { width: 17, height: 17, accentColor: 'var(--r-accent)', cursor: 'pointer' },
              onChange: (e) => setShowConfirmBeforeSpeak(e.target.checked)
            }),
            h('label', { htmlFor: 'cb-confirm-speak', style: { fontSize: 13, cursor: 'pointer' } },
              'Show confirmation dialog before speak'
            )
          ),

          // 4. Speaking Interval: X millisecond
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 } },
            h('input', {
              type: 'checkbox',
              id: 'cb-interval',
              checked: speakingIntervalMs > 0,
              style: { width: 17, height: 17, accentColor: 'var(--r-accent)', cursor: 'pointer' },
              onChange: (e) => setSpeakingIntervalMs(e.target.checked ? 300 : 0)
            }),
            h('label', { htmlFor: 'cb-interval', style: { fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
              'Speaking Interval:',
              h('input', {
                type: 'number',
                min: '0',
                max: '2000',
                step: '50',
                value: speakingIntervalMs,
                style: { width: 62, padding: '2px 6px', textAlign: 'center', borderRadius: 4, background: 'var(--r-bg, #111)', color: 'var(--r-text)', border: '1px solid var(--r-border)', fontSize: 13, fontWeight: 700 },
                onChange: (e) => setSpeakingIntervalMs(parseInt(e.target.value, 10) || 0)
              }),
              'millisecond'
            )
          ),

          // 5. TTS CHARS FILTERS button (Screenshot 3)
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { width: '100%', padding: '11px 0', marginBottom: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--r-border)', borderRadius: 8, fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: 'var(--r-text)' },
            onClick: () => setShowCharsFilterModal(true)
          }, 'TTS CHARS FILTERS'),

          // 6. Disable AudioFocus communication with other audio Apps
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 } },
            h('input', {
              type: 'checkbox',
              id: 'cb-audio-focus',
              checked: disableAudioFocus,
              style: { width: 17, height: 17, marginTop: 2, accentColor: 'var(--r-accent)', cursor: 'pointer' },
              onChange: (e) => setDisableAudioFocus(e.target.checked)
            }),
            h('label', { htmlFor: 'cb-audio-focus', style: { fontSize: 12.5, lineHeight: 1.4, cursor: 'pointer', color: 'var(--r-text)' } },
              'Disable AudioFocus communication with other audio Apps (TTS can run in background)'
            )
          ),

          // 7. Tip Box (Screenshot 3)
          h('div', { style: { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--r-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 } },
            h('div', { style: { fontSize: 11.5, lineHeight: 1.5, color: 'var(--r-muted)' } },
              h('strong', { style: { color: 'var(--r-text)' } }, 'Tip: '),
              'Please add the reader and TTS engine to the system battery Not optimized list and allow the app notification permission so that the reader can continue TTS in the background when the screen is turned off.'
            )
          ),

          // 8. Try control gestures row
          h('div', {
            style: { padding: '10px 0', borderTop: '1px solid var(--r-border)', borderBottom: '1px solid var(--r-border)', marginBottom: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            onClick: () => setShowGestureGuideModal(true)
          },
            h('span', { style: { fontSize: 13, color: 'var(--r-muted)' } }, 'Try control gestures'),
            h('span', { style: { fontSize: 12, color: 'var(--r-accent)', fontWeight: 700 } }, 'View ➔')
          ),

          // 9. Open Android TTS Settings Button
          window.NativeBridge?.openTtsSettings && h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { width: '100%', padding: '9px 0', marginBottom: 16, borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1px solid var(--r-border)' },
            onClick: () => window.NativeBridge.openTtsSettings()
          }, '⚙ Open Android System Text-to-Speech Settings'),

          // Footer: CANCEL / OK
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 12 } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { padding: '8px 18px', fontWeight: 700, fontSize: 13 },
              onClick: () => setShowTtsOptionsModal(false)
            }, 'CANCEL'),
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: { padding: '8px 22px', background: 'var(--r-accent)', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 8 },
              onClick: () => setShowTtsOptionsModal(false)
            }, 'OK')
          )
        )
      ),

      // ── MOON+ READER TTS CHARS FILTERS MODAL (Screenshot 2) ──
      showCharsFilterModal && h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10003, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
        onClick: () => setShowCharsFilterModal(false)
      },
        h('div', {
          style: { width: '100%', maxWidth: 460, height: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--r-card, #1a1a1f)', color: 'var(--r-text, #e2e8f0)', borderRadius: 16, padding: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.7)', border: '1px solid var(--r-border, rgba(255,255,255,0.1))' },
          onClick: (e) => e.stopPropagation()
        },
          // Header with search icon
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } },
            h('div', { style: { fontSize: 18, fontWeight: 800 } }, 'TTS Chars Filters'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--r-bg, #111)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--r-border)' } },
              h('span', { style: { fontSize: 12, opacity: 0.7 } }, '🔍'),
              h('input', {
                type: 'text',
                placeholder: 'Search filters…',
                value: filterSearchQuery,
                style: { background: 'transparent', border: 'none', color: 'var(--r-text)', fontSize: 12, width: 110, outline: 'none' },
                onChange: (e) => setFilterSearchQuery(e.target.value)
              })
            )
          ),

          // Scrollable Filter List
          h('div', { style: { flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 14 } },
            ttsCharFilters
              .map((f, idx) => ({ ...f, origIdx: idx }))
              .filter(f => !filterSearchQuery || f.from.toLowerCase().includes(filterSearchQuery.toLowerCase()) || f.to.toLowerCase().includes(filterSearchQuery.toLowerCase()))
              .map((item) => h('div', {
                key: item.origIdx,
                style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }
              },
                h('input', {
                  type: 'text',
                  value: item.from,
                  placeholder: 'Match text / regex',
                  style: { flex: 1, padding: '6px 8px', borderRadius: 6, background: 'transparent', color: 'var(--r-text)', border: 'none', borderBottom: '1px solid var(--r-border)', fontSize: 13, outline: 'none' },
                  onChange: (e) => {
                    const updated = [...ttsCharFilters];
                    updated[item.origIdx].from = e.target.value;
                    setTtsCharFilters(updated);
                  }
                }),
                h('span', { style: { color: 'var(--r-muted)', fontWeight: 700 } }, '>'),
                h('input', {
                  type: 'text',
                  value: item.to,
                  placeholder: 'Replacement (leave blank to delete)',
                  style: { flex: 1, padding: '6px 8px', borderRadius: 6, background: 'transparent', color: 'var(--r-text)', border: 'none', borderBottom: '1px solid var(--r-border)', fontSize: 13, outline: 'none' },
                  onChange: (e) => {
                    const updated = [...ttsCharFilters];
                    updated[item.origIdx].to = e.target.value;
                    setTtsCharFilters(updated);
                  }
                }),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-muted)', fontSize: 16 },
                  title: 'Delete Filter Rule',
                  onClick: () => {
                    const updated = ttsCharFilters.filter((_, i) => i !== item.origIdx);
                    setTtsCharFilters(updated);
                  }
                }, '–')
              )),

            // (+) Add row button
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--r-accent)', fontSize: 18, fontWeight: 700 },
                title: 'Add new filter',
                onClick: () => {
                  setTtsCharFilters([...ttsCharFilters, { from: '', to: '' }]);
                }
              }, '+')
            )
          ),

          // Bottom Checkbox & Links (Screenshot 2)
          h('div', { style: { borderTop: '1px solid var(--r-border)', paddingTop: 12, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
              h('input', {
                type: 'checkbox',
                id: 'cb-use-regex',
                checked: ttsUseRegex,
                style: { width: 16, height: 16, accentColor: 'var(--r-accent)', cursor: 'pointer' },
                onChange: (e) => setTtsUseRegex(e.target.checked)
              }),
              h('label', { htmlFor: 'cb-use-regex', style: { fontSize: 12.5, cursor: 'pointer' } }, 'Use regular expression'),
              h('span', {
                style: { fontSize: 11, cursor: 'pointer', color: 'var(--r-accent)' },
                title: 'When enabled, Match text is evaluated as a regular expression (e.g. \\d+ or [a-z])'
              }, 'ℹ')
            ),

            h('div', { style: { display: 'flex', gap: 16 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', padding: 0, color: '#6366f1', fontSize: 12.5, fontWeight: 600 },
                onClick: () => {
                  const input = prompt('Paste filter rules JSON or CSV (from,to):');
                  if (!input) return;
                  try {
                    const parsed = JSON.parse(input);
                    if (Array.isArray(parsed)) {
                      setTtsCharFilters(parsed);
                      alert('Successfully imported filters!');
                    }
                  } catch (e) {
                    // Try CSV parsing
                    const lines = input.split('\n');
                    const parsed = [];
                    for (const l of lines) {
                      const parts = l.split(',');
                      if (parts.length >= 2) parsed.push({ from: parts[0].trim(), to: parts[1].trim() });
                    }
                    if (parsed.length > 0) {
                      setTtsCharFilters(parsed);
                      alert('Successfully imported ' + parsed.length + ' filters!');
                    } else {
                      alert('Invalid format. Please provide valid JSON array or CSV.');
                    }
                  }
                }
              }, 'Import'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', padding: 0, color: '#6366f1', fontSize: 12.5, fontWeight: 600 },
                onClick: () => {
                  const json = JSON.stringify(ttsCharFilters, null, 2);
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(json);
                    alert('Filter rules copied to clipboard!');
                  } else {
                    prompt('Copy filter rules JSON:', json);
                  }
                }
              }, 'Export'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', padding: 0, color: '#6366f1', fontSize: 12.5, fontWeight: 600 },
                onClick: () => {
                  if (confirm('Clear all custom filter rules?')) {
                    setTtsCharFilters([]);
                  }
                }
              }, 'Clear')
            )
          ),

          // Footer: CANCEL / OK
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 12 } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { padding: '8px 18px', fontWeight: 700, fontSize: 13 },
              onClick: () => setShowCharsFilterModal(false)
            }, 'CANCEL'),
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: { padding: '8px 22px', background: 'var(--r-accent)', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 8 },
              onClick: () => setShowCharsFilterModal(false)
            }, 'OK')
          )
        )
      ),

      // ── MOON+ READER GESTURE CARD (Screenshot 1) ──
      showGestureGuideModal && h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10004, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
        onClick: () => setShowGestureGuideModal(false)
      },
        h('div', {
          style: { width: '100%', maxWidth: 360, background: 'rgba(28, 28, 34, 0.96)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '24px 20px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', textAlign: 'center' },
          onClick: (e) => e.stopPropagation()
        },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 16px', marginBottom: 20 } },
            // 1. Speak (1 finger vertical swipe)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              h('div', { style: { fontSize: 32 } }, '👆↕️'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Speak'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, '1 finger vertical swipe')
            ),

            // 2. Speed (2 fingers vertical swipe)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              h('div', { style: { fontSize: 32 } }, '✌️↕️'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Speed'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, '2 fingers vertical swipe')
            ),

            // 3. Pause / Resume (Single tap)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              h('div', { style: { fontSize: 32 } }, '👆'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Pause/Resume'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, 'Single tap')
            ),

            // 4. Stop (Horizontal swipe)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              h('div', { style: { fontSize: 32 } }, '👆↔️'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Stop'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, 'Horizontal swipe')
            )
          ),

          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { width: '100%', padding: '10px 0', background: 'var(--r-accent)', color: '#fff', fontWeight: 700, borderRadius: 8 },
            onClick: () => setShowGestureGuideModal(false)
          }, 'Got It')
        )
      ),

      // ── LIGHTBOX ILLUSTRATION MODAL ──
      lightboxImg && h('div', {
        className: 'reader-v2-lightbox',
        onClick: () => setLightboxImg(null)
      },
        h('img', { src: lightboxImg, alt: 'High Resolution Illustration' })
      ),

      // ── FLOATING CULTURAL FOOTNOTE CARD (§5.10) ──
      activeFootnote && h('div', {
        className: 'reader-footnote-card',
        onClick: (e) => e.stopPropagation()
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--r-accent)' } },
            h('span', null, '🔖'),
            h('span', null, `Cultural Context Note [${activeFootnote.num}]`)
          ),
          h('button', {
            type: 'button',
            className: 'reader-search-nav-btn close',
            style: { width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0 },
            onClick: () => setActiveFootnote(null)
          }, '✕')
        ),
        h('div', { style: { fontSize: 13.5, lineHeight: 1.55, color: 'var(--r-text)' } }, activeFootnote.text)
      )
    );
  };

  if (typeof window !== 'undefined') {
    window.MoonReaderModal = MoonReaderModal;
  }
})(typeof window !== 'undefined' ? window : this);
