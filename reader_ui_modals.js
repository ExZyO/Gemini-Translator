/**
 * Gemini Translator - Reader Pro Engine UI Modals & Sheets
 * Modular dialogs for Typography, Voices, TTS Options, Filters, Gestures, TOC, and TTS Player Bar
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) {
    Object.assign(root, exports);
    root.ReaderUiModals = exports;
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, exports);
    window.ReaderUiModals = exports;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : (window.React ? window.React.createElement : null);
  const useState = (typeof React !== 'undefined' && React.useState) ? React.useState : (window.React ? window.React.useState : null);
  const useCallback = (typeof React !== 'undefined' && React.useCallback) ? React.useCallback : (window.React ? window.React.useCallback : null);
  const useRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef : (window.React ? window.React.useRef : null);
  const useMemo = (typeof React !== 'undefined' && React.useMemo) ? React.useMemo : (window.React ? window.React.useMemo : null);
  const useEffect = (typeof React !== 'undefined' && React.useEffect) ? React.useEffect : (window.React ? window.React.useEffect : null);
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  // ── 1. MOON+ READER FLOATING TTS PLAYER BAR ──
  function ReaderTtsPlayerBar(props) {
    const {
      ttsActive, ttsRate, handleRateChange, stopTts, activeIdx, changeChapter,
      activeSentenceIdx, speakSentence, setShowVoiceModal, ttsPaused, toggleTts,
      sentencesRef, safeChapters, setShowTtsOptionsModal, setShowMoreMenu, showMoreMenu
    } = props;
    if (!ttsActive) return null;
    return h('div', {
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
            onInput: (e) => handleRateChange(parseFloat(e.target.value)),
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
          }, ic('Volume2', 15)),

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
          }, ic('Settings', 15)),

          // 9. More Options (...)
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { flex: 1, minWidth: 0, height: 38, fontSize: 15, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
            title: 'More Actions',
            onClick: () => setShowMoreMenu(!showMoreMenu)
          }, '···')
        )
      );
  }

  // ── 2. HIERARCHICAL ARC & VOLUME TABLE OF CONTENTS DRAWER (1:1 MOON+ READER) ──
  function ReaderTocDrawer(props) {
    const {
      showToc, setShowToc, tocSearch, setTocSearch, arcGroups, collapsedArcs,
      toggleArcCollapse, activeIdx, activeTocItemRef, changeChapter,
      onTranslateChapter, onTranslateChapterTitle, onHealChapterLines,
      onTranslateAllTitles, isTranslatingTitles, titlesProgress,
      onHealAllChapters, isHealingAll, healAllProgress,
      onOpenSuiteModal,
      bookTitle = '', totalChapters = 0, chapters = [], chapterScrollPct = 0,
      bookmarks = [], onToggleBookmark, coverUrl = '', onOpenLightbox,
      onAddBookmark, onDeleteBookmark, initialTocTab = 'chapters', initialBmFilter = 'all'
    } = props;

    const [activeTab, setActiveTab] = useState(() => props.initialTocTab || 'chapters'); // 'chapters' | 'bookmarks' | 'gallery'
    const [bmFilter, setBmFilter] = useState(() => props.initialBmFilter || 'all'); // 'all' | 'bookmarks' | 'notes' | 'highlights'
    const [bmSearch, setBmSearch] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [filterImagesOnly, setFilterImagesOnly] = useState(false);
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);
    const [showSettingsSheet, setShowSettingsSheet] = useState(false);

    const [filterUntranslatedOnly, setFilterUntranslatedOnly] = useState(false);
    const [scrubVal, setScrubVal] = useState(null);

    const longPressTimerRef = useRef(null);
    const didLongPressRef = useRef(false);

    useEffect(() => {
      if (showToc && props.initialTocTab) {
        setActiveTab(props.initialTocTab);
        if (props.initialBmFilter) setBmFilter(props.initialBmFilter);
      }
    }, [showToc, props.initialTocTab, props.initialBmFilter]);

    const safeChapters = Array.isArray(chapters) ? chapters : [];
    const totalChsCount = totalChapters || safeChapters.length || 1;
    const overallPct = (((activeIdx + Math.max(0, Math.min(1, (chapterScrollPct || 0) / 100))) / Math.max(1, totalChsCount)) * 100).toFixed(1);

    // Cumulative starting page for each chapter (standard ~250 words per book page)
    const chapterPages = useMemo(() => {
      const pages = [];
      let cum = 1;
      safeChapters.forEach((ch, idx) => {
        pages[idx] = cum;
        const text = (ch.content || ch.text || '');
        const words = text ? text.trim().split(/\s+/).length : 250;
        cum += Math.max(1, Math.round(words / 250));
      });
      return pages;
    }, [safeChapters]);

    // All illustrations extracted across chapters for Gallery View (Screenshot 2)
    const allIllustrations = useMemo(() => {
      const imgs = [];
      safeChapters.forEach((ch, chIdx) => {
        const text = (ch.content || ch.text || '');
        const mdMatches = [...text.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s)]+|data:image\/[^\s)]+)\)/gi)];
        mdMatches.forEach(m => {
          let src = m[2];
          if (src && src.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(src)) {
            src = src.replace(/^http:\/\//i, 'https://');
          }
          imgs.push({
            alt: m[1] || 'Illustration',
            src: src,
            chapterIdx: chIdx,
            chapterTitle: ch.title || `Chapter ${chIdx + 1}`
          });
        });
        const htmlMatches = [...text.matchAll(/<img\b[^>]*src=["'](https?:\/\/[^"']+|data:image\/[^"']+)["'][^>]*>/gi)];
        htmlMatches.forEach(m => {
          let src = m[1];
          if (src && src.startsWith('http://') && !/^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(src)) {
            src = src.replace(/^http:\/\//i, 'https://');
          }
          if (!imgs.some(existing => existing.src === src)) {
            imgs.push({
              alt: 'Illustration',
              src: src,
              chapterIdx: chIdx,
              chapterTitle: ch.title || `Chapter ${chIdx + 1}`
            });
          }
        });
      });
      return imgs;
    }, [safeChapters]);

    // Format Moon+ Reader chapter label: "#<num> <title>"
    const formatMoonTitle = (ch, origIdx) => {
      const cleanT = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
        ? window.cleanRawChapterTitle(ch.title)
        : (ch.title || `Chapter ${origIdx + 1}`);
      const m = cleanT.match(/^(?:chapter|ch|c)?\s*(\d+(?:\.\d+)?)\s*[:：\-_.]\s*(.*)$/i);
      const num = m ? m[1] : (origIdx + 1);
      const name = m ? m[2].trim() : cleanT.replace(/^(?:chapter|ch|c)?\s*\d+\s*/i, '').trim();
      return { num, name: name || `Chapter ${num}` };
    };

    // Filter and sort chapters
    const displayedChapters = useMemo(() => {
      let list = safeChapters.map((ch, idx) => ({ ...ch, originalIndex: idx }));
      if (filterImagesOnly) {
        list = list.filter(ch => ch.hasImages || /<img/i.test(ch.content || ch.text || '') || /!\[/i.test(ch.content || ch.text || ''));
      }
      if (filterUntranslatedOnly) {
        const hasForeignChars = (s) => typeof s === 'string' && /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/.test(s);
        list = list.filter(c => !c.isTranslated || hasForeignChars(c.title) || hasForeignChars(c.originalTitle) || hasForeignChars(c.content || c.text));
      }
      if (tocSearch && tocSearch.trim()) {
        const q = tocSearch.trim().toLowerCase();
        list = list.filter(c => (c.title && c.title.toLowerCase().includes(q)) || (c.arc && c.arc.toLowerCase().includes(q)));
      }
      if (!sortAsc) {
        list = [...list].reverse();
      }
      return list;
    }, [safeChapters, filterImagesOnly, filterUntranslatedOnly, tocSearch, sortAsc]);

    // Helper to categorize bookmark kinds (0: bookmark, 1: note, 2: highlight)
    const getBmKind = (b) => {
      if (b.type === 1 || b.type === 'note' || b.noteText) return 'notes';
      if (b.type === 2 || b.type === 'highlight' || b.highlightText) return 'highlights';
      return 'bookmarks';
    };

    // Filtered & Strictly Ordered Bookmarks (Bookmarks first, then Notes, then Highlights)
    const displayedBookmarks = useMemo(() => {
      let list = Array.isArray(bookmarks) ? [...bookmarks] : [];
      if (bmSearch && bmSearch.trim()) {
        const q = bmSearch.trim().toLowerCase();
        list = list.filter(b => 
          (b.chapterTitle && b.chapterTitle.toLowerCase().includes(q)) ||
          (b.noteText && b.noteText.toLowerCase().includes(q)) ||
          (b.highlightText && b.highlightText.toLowerCase().includes(q)) ||
          (b.snippet && b.snippet.toLowerCase().includes(q))
        );
      }
      if (bmFilter === 'bookmarks') return list.filter(b => getBmKind(b) === 'bookmarks');
      if (bmFilter === 'notes') return list.filter(b => getBmKind(b) === 'notes');
      if (bmFilter === 'highlights') return list.filter(b => getBmKind(b) === 'highlights');

      // STRICT 1:1 ORDERING FROM MOON+ READER (Screenshot 1): Bookmarks first, Notes second, Highlights third
      const bms = list.filter(b => getBmKind(b) === 'bookmarks');
      const nts = list.filter(b => getBmKind(b) === 'notes');
      const hls = list.filter(b => getBmKind(b) === 'highlights');
      return [...bms, ...nts, ...hls];
    }, [bookmarks, bmFilter, bmSearch]);

    if (!showToc) return null;

    const currentChapter = safeChapters[activeIdx] || { title: `Chapter ${activeIdx + 1}` };
    const currentChapterTitle = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
      ? window.cleanRawChapterTitle(currentChapter.title)
      : (currentChapter.title || `Chapter ${activeIdx + 1}`);

    return h('div', {
      className: 'moon-toc-modal-backdrop',
      onClick: () => {
        setShowSearchDrawer(false);
        setShowSettingsSheet(false);
        setShowToc(false);
      }
    },
      h('div', {
        className: 'moon-toc-panel',
        onClick: (e) => e.stopPropagation()
      },
        // ── TOP NAVIGATION BAR (Screenshots 1 & 2) ──
        h('div', { className: 'moon-toc-top-nav' },
          h('div', { className: 'moon-toc-nav-left' },
            h('button', {
              type: 'button',
              className: 'moon-toc-back-arrow',
              title: 'Back to Reader',
              onClick: () => setShowToc(false)
            }, ic('ArrowLeft', 20)),
            h('div', { className: 'moon-toc-tabs' },
              h('button', {
                type: 'button',
                className: 'moon-toc-tab-item' + (activeTab === 'chapters' ? ' active' : ''),
                onClick: () => setActiveTab('chapters')
              }, 'Chapters'),
              h('button', {
                type: 'button',
                className: 'moon-toc-tab-item' + (activeTab === 'bookmarks' ? ' active' : ''),
                onClick: () => setActiveTab('bookmarks')
              }, 'Bookmarks' + (bookmarks && bookmarks.length > 0 ? ` (${bookmarks.length})` : ''))
            )
          ),
          h('div', { className: 'moon-toc-nav-actions' },
            h('button', {
              type: 'button',
              className: 'moon-toc-action-btn' + (activeTab === 'gallery' ? ' active' : ''),
              title: activeTab === 'gallery' ? 'View Chapters' : 'View Image Gallery',
              onClick: () => setActiveTab(t => t === 'gallery' ? 'chapters' : 'gallery')
            }, ic('Image', 17)),
            h('button', {
              type: 'button',
              className: 'moon-toc-action-btn',
              title: sortAsc ? 'Sort Descending' : 'Sort Ascending',
              onClick: () => setSortAsc(v => !v)
            }, ic('ArrowUpDown', 17))
          )
        ),

        // ── OPTIONAL SEARCH DRAWER ──
        showSearchDrawer && h('div', { className: 'moon-toc-search-drawer' },
          ic('Search', 15, 'text-gray-400 shrink-0'),
          h('input', {
            type: 'text',
            placeholder: activeTab === 'bookmarks' ? 'Filter bookmarks, notes, or highlights…' : 'Filter chapters or arcs…',
            value: activeTab === 'bookmarks' ? bmSearch : tocSearch,
            autoFocus: true,
            onChange: (e) => activeTab === 'bookmarks' ? setBmSearch(e.target.value) : setTocSearch(e.target.value)
          }),
          (activeTab === 'bookmarks' ? bmSearch : tocSearch) && h('button', {
            type: 'button',
            className: 'moon-toc-action-btn',
            style: { width: 28, height: 28 },
            onClick: () => activeTab === 'bookmarks' ? setBmSearch('') : setTocSearch('')
          }, ic('X', 14))
        ),

        // ── SUB-BAR: BOOKMARKS / NOTES / HIGHLIGHTS CHIPS (Screenshot 1) ──
        activeTab === 'bookmarks' && h('div', { className: 'moon-bm-filter-bar' },
          h('button', {
            type: 'button',
            className: 'moon-bm-filter-chip' + (bmFilter === 'all' ? ' active' : ''),
            onClick: () => setBmFilter('all')
          }, '>> All'),
          h('button', {
            type: 'button',
            className: 'moon-bm-filter-chip' + (bmFilter === 'bookmarks' ? ' active' : ''),
            onClick: () => setBmFilter('bookmarks')
          }, 'Bookmarks'),
          h('button', {
            type: 'button',
            className: 'moon-bm-filter-chip' + (bmFilter === 'notes' ? ' active' : ''),
            onClick: () => setBmFilter('notes')
          }, 'Notes'),
          h('button', {
            type: 'button',
            className: 'moon-bm-filter-chip' + (bmFilter === 'highlights' ? ' active' : ''),
            onClick: () => setBmFilter('highlights')
          }, 'Highlights')
        ),

        // ── MAIN CONTENT (Chapters | Bookmarks | Image Gallery) ──
        activeTab === 'gallery' ? (
          // ── 1:1 MOON+ READER IMAGES TAB (Screenshot 1) ──
          (() => {
            const coverItem = coverUrl ? [{
              src: coverUrl,
              chapterIdx: 0,
              chapterTitle: bookTitle || 'Cover',
              isCover: true,
              alt: bookTitle || 'Cover'
            }] : [];
            let fullGallery = [...coverItem, ...allIllustrations];
            if (!sortAsc) fullGallery = [...fullGallery].reverse();

            if (fullGallery.length === 0) {
              return h('div', { className: 'moon-gallery-container' },
                h('div', { style: { padding: '48px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 } },
                  'No illustrations or cover found in this novel.'
                )
              );
            }

            return h('div', { className: 'moon-gallery-container' },
              fullGallery.map((img, iIdx) => {
                const safeSrc = (typeof window !== 'undefined' && window.getSafeImageFallbackUrl)
                  ? window.getSafeImageFallbackUrl(img.src)
                  : img.src;

                return h('img', {
                  key: `gallery-feed-${img.isCover ? 'cover' : (img.chapterIdx + '-' + iIdx)}`,
                  className: 'moon-gallery-feed-item',
                  src: safeSrc,
                  alt: img.alt || `Illustration ${iIdx + 1}`,
                  loading: 'lazy',
                  referrerPolicy: 'no-referrer',
                  title: img.chapterTitle || 'Illustration',
                  onTouchStart: () => {
                    didLongPressRef.current = false;
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(() => {
                      didLongPressRef.current = true;
                      if (typeof onOpenLightbox === 'function') onOpenLightbox(img.src);
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
                    }, 450);
                  },
                  onTouchEnd: () => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  },
                  onTouchMove: () => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  },
                  onMouseDown: () => {
                    didLongPressRef.current = false;
                    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = setTimeout(() => {
                      didLongPressRef.current = true;
                      if (typeof onOpenLightbox === 'function') onOpenLightbox(img.src);
                    }, 450);
                  },
                  onMouseUp: () => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  },
                  onClick: (e) => {
                    if (didLongPressRef.current) {
                      didLongPressRef.current = false;
                      e.stopPropagation();
                      e.preventDefault();
                      return;
                    }
                    changeChapter(img.chapterIdx !== undefined ? img.chapterIdx : 0);
                    setShowToc(false);
                  },
                  onContextMenu: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof onOpenLightbox === 'function') onOpenLightbox(img.src);
                  },
                  onError: (e) => {
                    if (typeof window !== 'undefined' && window.handleImageErrorFallback) {
                      window.handleImageErrorFallback(e, img.src);
                    }
                  }
                });
              })
            );
          })()
        ) : activeTab === 'chapters' ? (
          h('div', { className: 'moon-toc-list-wrap' },
            displayedChapters.length === 0 ? (
              h('div', { style: { padding: '48px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 } },
                'No matching chapters found'
              )
            ) : (
              displayedChapters.map((ch, idx) => {
                const origIdx = ch.originalIndex !== undefined ? ch.originalIndex : idx;
                const isCurrent = origIdx === activeIdx;
                const isRead = origIdx < activeIdx;
                const formatted = formatMoonTitle(ch, origIdx);
                const pageNum = chapterPages[origIdx] || 1;

                return h('div', {
                  key: `moon-ch-${origIdx}`,
                  ref: isCurrent ? activeTocItemRef : undefined,
                  className: 'moon-toc-chapter-row' + (isCurrent ? ' active' : ''),
                  onClick: () => {
                    changeChapter(origIdx);
                    setShowToc(false);
                  }
                },
                  h('div', { className: 'moon-toc-chapter-title' },
                    isRead && h('span', { style: { marginRight: 6, color: '#10b981', fontWeight: 600 } }, '√'),
                    h('span', null, `#${formatted.num} ${formatted.name}`)
                  ),
                  h('div', { className: 'moon-toc-chapter-page' }, String(pageNum))
                );
              })
            )
          )
        ) : (
          // ── 1:1 MOON+ READER BOOKMARKS, NOTES & HIGHLIGHTS TAB (Screenshot 1) ──
          h('div', { className: 'moon-bm-container' },
            displayedBookmarks.length === 0 ? (
              h('div', { style: { padding: '64px 20px', textAlign: 'center', color: '#64748b' } },
                ic('Bookmark', 36, 'opacity-40 mb-3'),
                h('div', { style: { fontWeight: 600, color: '#94a3b8', fontSize: 14, marginBottom: 6 } }, 'No Items Yet'),
                h('div', { style: { fontSize: 12, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' } },
                  'Tap "ADD NEW BOOKMARK" below or bookmark from the reader menu.'
                )
              )
            ) : (
              displayedBookmarks.map((bm, bIdx) => {
                const kind = getBmKind(bm);
                const isCurrent = bm.chapterIdx === activeIdx;
                const dateStr = bm.time ? new Date(bm.time).toISOString().replace('T', ' ').slice(0, 16) : 'Recently';
                const chTitle = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
                  ? window.cleanRawChapterTitle(bm.chapterTitle)
                  : (bm.chapterTitle || `Chapter ${(bm.chapterIdx ?? 0) + 1}`);

                return h('div', {
                  key: bm.id || `moon-bm-${bIdx}`,
                  className: 'moon-bm-card',
                  onClick: () => {
                    changeChapter(bm.chapterIdx || 0);
                    setShowToc(false);
                  }
                },
                  // Card Header
                  h('div', { className: 'moon-bm-header' },
                    h('div', { className: 'moon-bm-header-left' },
                      h('span', { className: 'moon-bm-icon' },
                        kind === 'highlights'
                          ? ic('Highlighter', 15, 'text-emerald-400')
                          : kind === 'notes'
                          ? ic('Edit3', 15, 'text-sky-400')
                          : ic('Bookmark', 15, isCurrent ? 'text-amber-400' : 'text-blue-400')
                      ),
                      h('div', { className: 'moon-bm-meta' },
                        h('span', { className: 'moon-bm-date' }, dateStr),
                        h('span', { className: 'moon-bm-chapter-tag' }, `Chapter ${(bm.chapterIdx ?? 0) + 1}: ${chTitle}`)
                      )
                    ),
                    h('button', {
                      type: 'button',
                      className: 'moon-bm-menu-btn',
                      title: 'Delete Item',
                      onClick: (e) => {
                        e.stopPropagation();
                        if (typeof onDeleteBookmark === 'function') {
                          onDeleteBookmark(bm.id || bm.chapterIdx);
                        } else if (typeof onToggleBookmark === 'function') {
                          onToggleBookmark(bm.chapterIdx);
                        }
                      }
                    }, ic('Trash2', 13) || '✕')
                  ),

                  // Card Body (Highlight colored box vs Note vs Bookmark progress)
                  kind === 'highlights' ? (
                    h('div', {
                      className: 'moon-bm-highlight-box',
                      style: { background: bm.color || '#166534' }
                    }, `${bIdx + 1}. ${bm.highlightText || bm.snippet || 'Highlighted excerpt'}`)
                  ) : kind === 'notes' ? (
                    h('div', { className: 'moon-bm-snippet', style: { color: '#e2e8f0', fontStyle: 'italic' } },
                      bm.noteText || bm.snippet || 'Note'
                    )
                  ) : (
                    h('div', { className: 'moon-bm-snippet' },
                      bm.snippet || `${bm.pct !== undefined ? bm.pct + '% completed' : 'Chapter bookmark'} (p. ${chapterPages[bm.chapterIdx] || 1})`
                    )
                  )
                );
              })
            )
          )
        ),

        // ── QUICK JUMP & SETTINGS SHEET ──
        showSettingsSheet && h('div', {
          style: {
            background: '#16181f',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'fadeIn 0.12s ease-out'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, 'Quick Chapter Jump & Tools'),
            h('button', {
              type: 'button',
              className: 'moon-toc-action-btn',
              style: { width: 24, height: 24 },
              onClick: () => setShowSettingsSheet(false)
            }, ic('X', 13))
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('input', {
              type: 'range',
              min: 0,
              max: Math.max(0, totalChsCount - 1),
              value: scrubVal !== null ? scrubVal : activeIdx,
              onChange: (e) => setScrubVal(parseInt(e.target.value, 10)),
              onMouseUp: () => {
                if (scrubVal !== null) {
                  changeChapter(scrubVal);
                  setScrubVal(null);
                }
              },
              onTouchEnd: () => {
                if (scrubVal !== null) {
                  changeChapter(scrubVal);
                  setScrubVal(null);
                }
              },
              style: { flex: 1, accentColor: '#f97316', cursor: 'pointer' }
            }),
            h('span', { style: { fontSize: 12, color: '#f97316', fontWeight: 700, minWidth: 42, textAlign: 'right' } },
              `#${(scrubVal !== null ? scrubVal : activeIdx) + 1}`
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' } },
            h('div', { style: { display: 'flex', gap: 4 } },
              h('button', { type: 'button', className: 'mini-btn ghost', style: { padding: '4px 8px', fontSize: 11 }, disabled: activeIdx <= 0, onClick: () => changeChapter(Math.max(0, activeIdx - 25)) }, '« 25'),
              h('button', { type: 'button', className: 'mini-btn ghost', style: { padding: '4px 8px', fontSize: 11 }, disabled: activeIdx <= 0, onClick: () => changeChapter(Math.max(0, activeIdx - 1)) }, '‹'),
              h('button', { type: 'button', className: 'mini-btn ghost', style: { padding: '4px 8px', fontSize: 11 }, disabled: activeIdx >= totalChsCount - 1, onClick: () => changeChapter(Math.min(totalChsCount - 1, activeIdx + 1)) }, '›'),
              h('button', { type: 'button', className: 'mini-btn ghost', style: { padding: '4px 8px', fontSize: 11 }, disabled: activeIdx >= totalChsCount - 1, onClick: () => changeChapter(Math.min(totalChsCount - 1, activeIdx + 25)) }, '25 »')
            ),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', {
                type: 'button',
                className: 'mini-btn' + (filterUntranslatedOnly ? ' active' : ' ghost'),
                style: { fontSize: 11, padding: '4px 8px', borderRadius: 6, background: filterUntranslatedOnly ? '#f97316' : 'rgba(255,255,255,0.06)', color: filterUntranslatedOnly ? '#fff' : '#94a3b8', border: '1px solid ' + (filterUntranslatedOnly ? '#f97316' : 'rgba(255,255,255,0.1)') },
                onClick: () => setFilterUntranslatedOnly(v => !v)
              }, 'Untranslated'),
              typeof onHealAllChapters === 'function' && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                disabled: isHealingAll || isTranslatingTitles,
                style: { fontSize: 11, padding: '4px 8px' },
                onClick: onHealAllChapters
              }, isHealingAll ? 'Healing…' : 'Heal All')
            )
          )
        ),

        // ── BOTTOM HUD BAR (Screenshot 1 for Bookmarks, Screenshot 2 for Chapters/Gallery) ──
        activeTab === 'bookmarks' ? (
          h('div', { className: 'moon-bm-footer-bar' },
            h('button', {
              type: 'button',
              className: 'moon-toc-action-btn',
              title: 'Export / Backup Bookmarks (.mrexpt)',
              onClick: () => {
                const text = bookmarks.map(b => `${b.chapterIdx || 0}\n${b.snippet || ''}\n${b.time || Date.now()}`).join('\n#\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = (bookTitle || 'Book') + '.mrexpt';
                a.click();
                URL.revokeObjectURL(a.href);
              }
            }, ic('Share2', 17) || ic('Link', 17)),
            h('button', {
              type: 'button',
              className: 'moon-bm-add-btn',
              onClick: () => {
                if (typeof onAddBookmark === 'function') {
                  onAddBookmark({ chapterIdx: activeIdx, pct: Math.round(chapterScrollPct || 0) });
                } else if (typeof onToggleBookmark === 'function') {
                  onToggleBookmark();
                }
              }
            }, ic('Plus', 16), 'ADD NEW BOOKMARK'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', {
                type: 'button',
                className: 'moon-toc-action-btn' + (showSearchDrawer ? ' active' : ''),
                title: 'Search bookmarks',
                onClick: () => setShowSearchDrawer(v => !v)
              }, ic('Search', 17)),
              h('button', {
                type: 'button',
                className: 'moon-toc-action-btn',
                title: 'Jump Tools',
                onClick: () => setShowSettingsSheet(v => !v)
              }, ic('Settings', 17))
            )
          )
        ) : (
          h('div', { className: 'moon-toc-bottom-hud' },
            h('div', {
              className: 'moon-toc-bottom-left',
              title: `#${activeIdx + 1} ${currentChapterTitle} (${activeIdx + 1}/${totalChsCount})`
            }, `#${activeIdx + 1} ${currentChapterTitle} (${activeIdx + 1}/${totalChsCount})`),
            h('div', { className: 'moon-toc-bottom-right' },
              h('button', {
                type: 'button',
                className: 'moon-toc-action-btn' + (showSearchDrawer ? ' active' : ''),
                title: 'Search in chapters',
                onClick: () => setShowSearchDrawer(v => !v)
              }, ic('Search', 17)),
              h('button', {
                type: 'button',
                className: 'moon-toc-action-btn' + (showSettingsSheet ? ' active' : ''),
                title: 'Jump & Translation Tools',
                onClick: () => setShowSettingsSheet(v => !v)
              }, ic('Settings', 17)),
              h('span', {
                style: { fontSize: 13, fontWeight: 600, color: '#f8fafc', minWidth: 44, textAlign: 'right' }
              }, `${overallPct}%`)
            )
          )
        )
      )
    );
  }

  // ── 3. TYPOGRAPHY & THEMES SETTINGS MODAL ──
  function ReaderTypographyModal(props) {
    const {
      showSettings, setShowSettings, viewMode, setViewMode, theme, setTheme,
      font, setFont, contentWidth, setContentWidth, lineHeight, setLineHeight,
      paragraphIndent, setParagraphIndent, justify, setJustify, ttsEngines,
      selectedTtsEngine, setSelectedTtsEngine, ttsVoices, selectedTtsVoice,
      setSelectedTtsVoice, ttsRate, handleRateChange, dacDelayMs, setDacDelayMs,
      sleepTimerMinutes, setSleepTimerMinutes, setSleepTimerSecondsLeft, setShowVoiceModal,
      moonStatusBar, setMoonStatusBar
    } = props;
    if (!showSettings) return null;
    return h('div', {
        style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
        onClick: () => setShowSettings(false)
      },
        h('div', {
          style: { width: '100%', maxWidth: 520, background: 'var(--r-card)', color: 'var(--r-text)', borderRadius: '16px 16px 0 0', padding: 20, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' },
          onClick: (e) => e.stopPropagation()
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
            h('span', { style: { fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Settings', 16), 'Typography & Appearance'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
              onClick: () => setShowSettings(false)
            }, ic('X', 15))
          ),

          // Reading Mode (Foliate vs Scroll)
          h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 } }, 'Reading Mode'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              h('button', {
                type: 'button',
                className: `mini-btn ${viewMode === 'paginated' ? '' : 'ghost'}`,
                style: viewMode === 'paginated' ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, padding: '9px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 } : { padding: '9px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => setViewMode('paginated')
              }, ic('BookOpen', 15), 'Foliate Book Flip'),
              h('button', {
                type: 'button',
                className: `mini-btn ${viewMode === 'scroll' ? '' : 'ghost'}`,
                style: viewMode === 'scroll' ? { background: 'var(--r-accent)', color: '#fff', fontWeight: 700, padding: '9px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 } : { padding: '9px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => setViewMode('scroll')
              }, ic('Rows2', 15), 'Continuous Scroll')
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
            }, paragraphIndent ? 'First-Line Indent' : 'No Indent'),
            h('button', {
              type: 'button',
              className: `mini-btn ${justify ? '' : 'ghost'}`,
              style: { flex: 1, padding: '8px 0' },
              onClick: () => setJustify(s => !s)
            }, justify ? 'Justify Text' : 'Align Left')
          ),

          // Moon+ Reader Pro Status Bar Toggle
          typeof setMoonStatusBar === 'function' && h('div', { style: { marginBottom: 16 } },
            h('button', {
              type: 'button',
              className: `mini-btn ${moonStatusBar !== false ? '' : 'ghost'}`,
              style: { width: '100%', padding: '9px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
              onClick: () => setMoonStatusBar(s => !s)
            }, ic('Smartphone', 14), moonStatusBar !== false ? 'Moon+ Reader Status Bar: Enabled' : 'Moon+ Reader Status Bar: Disabled')
          ),

          // Audio & Speech (TTS) Engine & Voice Settings (Legado & Piper Integration)
          h('div', { style: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--r-border)' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Headphones', 14), 'Audio & Speech (TTS)'),

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
                onInput: (e) => handleRateChange(parseFloat(e.target.value)),
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
              style: { width: '100%', padding: '10px 0', marginTop: 14, background: 'var(--r-accent)', color: '#fff', fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
              onClick: () => { setShowSettings(false); setShowVoiceModal(true); }
            }, ic('Volume2', 15), 'Open Voice & Offline AI Engine Manager')
          )
        )
      );
  }

  // ── 4. VOICE & OFFLINE ENGINE SELECTION MODAL ──
  function ReaderVoiceModal(props) {
    const {
      showVoiceModal, setShowVoiceModal, systemTtsInfo, previewSpeaking,
      previewVoice, refreshSystemTts, ttsRate, handleRateChange, dacDelayMs,
      setDacDelayMs, showSherpaHelp, setShowSherpaHelp
    } = props;
    if (!showVoiceModal) return null;
    return h('div', {
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
              }, ic('Volume2', 20, 'text-white')),
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
            }, ic('X', 15))
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
                ic('Activity', 22, 'text-indigo-400'),
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
              }, 'Active in Android')
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
              }, previewSpeaking ? [ic('Volume2', 14), ' Speaking…'] : [ic('Play', 14), ' Test Audio Sample']),

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
                  if (window.toast) window.toast('Re-detected TTS settings from Android', 'info');
                }
              }, [ic('RefreshCw', 13), ' Refresh'])
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
              }, [ic('Settings', 13), ' Android Settings']),
              window.NativeBridge?.openSherpaApp && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', background: 'rgba(16,185,129,0.08)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                onClick: () => window.NativeBridge.openSherpaApp()
              }, [ic('Zap', 13), ' Open SherpaTTS App'])
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
              onInput: (e) => handleRateChange(parseFloat(e.target.value)),
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
              [[0, '0ms'], [100, '100ms'], [200, '200ms (Rec)'], [300, '300ms'], [500, '500ms']].map(([ms, label]) => h('button', {
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
                ic('Info', 14),
                h('span', null, 'How to install Callum / Piper models in SherpaTTS')
              ),
              showSherpaHelp ? ic('ChevronUp', 13) : ic('ChevronDown', 13)
            ),
            showSherpaHelp && h('ol', { style: { fontSize: 12, lineHeight: 1.6, color: 'var(--r-text)', paddingLeft: 18, margin: '10px 0 0 0' } },
              h('li', null, 'Install the SherpaTTS APK on your Android device.'),
              h('li', null, 'Copy your model files (e.g. callum.onnx and tokens.txt) into your phone’s Download folder.'),
              h('li', null, 'Open SherpaTTS, tap "+" or "Install from SD", select the model & tokens file, and tap Install.'),
              h('li', null, 'Tap "Android Settings" above, set Preferred Engine to SherpaTTS, and enjoy studio offline audio!')
            )
          )
        )
      );
  }

  // ── 5. MOON+ READER TTS OPTIONS MODAL ──
  function ReaderTtsOptionsModal(props) {
    const {
      showTtsOptionsModal, setShowTtsOptionsModal, systemTtsInfo, setShowVoiceModal,
      divideBy, setDivideBy, stopAfterEnabled, setStopAfterEnabled, stopAfterMinutes,
      setStopAfterMinutes, showConfirmBeforeSpeak, setShowConfirmBeforeSpeak,
      speakingIntervalMs, setSpeakingIntervalMs, setShowCharsFilterModal,
      disableAudioFocus, setDisableAudioFocus, setShowGestureGuideModal
    } = props;
    if (!showTtsOptionsModal) return null;
    return h('div', {
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
              h('div', { style: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--r-accent)', display: 'flex', alignItems: 'center', gap: 6 } },
                ic('Volume2', 14), ' Voice & Speech Engine'
              ),
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
              }, [ic('Volume2', 13), ' Speech & Voice Info']),
              window.NativeBridge?.openTtsSettings && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12 },
                title: 'Open Android System Text-to-Speech Settings',
                onClick: () => window.NativeBridge.openTtsSettings()
              }, [ic('Settings', 13), ' Android Settings'])
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
              }, ic('Settings', 14))
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
            h('span', { style: { fontSize: 12, color: 'var(--r-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 } }, 'View ', ic('ArrowRight', 12))
          ),

          // 9. Open Android TTS Settings Button
          window.NativeBridge?.openTtsSettings && h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { width: '100%', padding: '9px 0', marginBottom: 16, borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1px solid var(--r-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
            onClick: () => window.NativeBridge.openTtsSettings()
          }, [ic('Settings', 13), ' Open Android System Text-to-Speech Settings']),

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
      );
  }

  // ── 6. MOON+ READER TTS CHARS FILTERS MODAL ──
  function ReaderCharsFilterModal(props) {
    const {
      showCharsFilterModal, setShowCharsFilterModal, filterSearchQuery,
      setFilterSearchQuery, ttsCharFilters, setTtsCharFilters, ttsUseRegex, setTtsUseRegex
    } = props;
    if (!showCharsFilterModal) return null;
    return h('div', {
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
              ic('Search', 12, 'opacity-70'),
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
                style: { fontSize: 11, cursor: 'pointer', color: 'var(--r-accent)', display: 'inline-flex', alignItems: 'center' },
                title: 'When enabled, Match text is evaluated as a regular expression (e.g. \\d+ or [a-z])'
              }, ic('Info', 12))
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
      );
  }

  // ── 7. MOON+ READER GESTURE CARD ──
  function ReaderGestureGuideModal(props) {
    const { showGestureGuideModal, setShowGestureGuideModal } = props;
    if (!showGestureGuideModal) return null;
    return h('div', {
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
              ic('ArrowUpDown', 28, 'text-indigo-400'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Speak'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, '1 finger vertical swipe')
            ),

            // 2. Speed (2 fingers vertical swipe)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              ic('Sliders', 28, 'text-indigo-400'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Speed'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, '2 fingers vertical swipe')
            ),

            // 3. Pause / Resume (Single tap)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              ic('Play', 28, 'text-indigo-400'),
              h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--r-text)' } }, 'Pause/Resume'),
              h('div', { style: { fontSize: 11, color: 'var(--r-muted)' } }, 'Single tap')
            ),

            // 4. Stop (Horizontal swipe)
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              ic('ArrowRightLeft', 28, 'text-indigo-400'),
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
      );
  }

  // ── 8. CHAPTER TRANSLATION SUITE MODAL ──
  // ── 8. CHAPTER TRANSLATION SUITE MODAL (DELEGATED) ──
  const ChapterTranslationSuiteModal = (typeof window !== "undefined" && window.ChapterTranslationSuiteModal) ? window.ChapterTranslationSuiteModal : null;

  function ReaderDynamicProgressPill(props) {
    const {
      isTranslating,
      isHealing,
      isTranslatingTitles,
      activeMode,
      chapterIndex,
      chapterTitle,
      pct = 0,
      statusMsg = '',
      chunkCurrent = 1,
      chunkTotal = 1,
      titlesProgress = null,
      hudVisible = true,
      isPillHidden: controlledHidden,
      onToggleHidden,
      onOpenDashboard,
      onStop
    } = props;

    const [internalHidden, setInternalHidden] = useState(false);
    const isHidden = typeof controlledHidden === 'boolean' ? controlledHidden : internalHidden;
    const toggleHidden = useCallback(() => {
      if (typeof onToggleHidden === 'function') {
        onToggleHidden(!isHidden);
      } else {
        setInternalHidden(prev => !prev);
      }
    }, [isHidden, onToggleHidden]);

    const isActive = isTranslating || isHealing || isTranslatingTitles;
    if (!isActive) return null;

    const cleanTitle = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
      ? window.cleanRawChapterTitle(chapterTitle || '')
      : (chapterTitle || '');

    const modeLabel = isHealing
      ? 'Healing Prose'
      : (isTranslatingTitles ? 'Batch Titles' : 'Translating');

    const accentColor = isHealing ? '#c084fc' : (isTranslatingTitles ? '#38bdf8' : '#818cf8');
    const accentBorder = isHealing ? 'rgba(168, 85, 247, 0.45)' : (isTranslatingTitles ? 'rgba(56, 189, 248, 0.45)' : 'rgba(99, 102, 241, 0.45)');
    const glowShadow = isHealing ? 'rgba(168, 85, 247, 0.25)' : (isTranslatingTitles ? 'rgba(56, 189, 248, 0.25)' : 'rgba(99, 102, 241, 0.25)');

    // Minimized / Hidden State: Sleek non-intrusive floating chip at the edge
    if (isHidden) {
      return h('div', {
        className: 'reader-dynamic-progress-pill-mini',
        title: `${modeLabel} in progress (${Math.round(pct)}%) · Tap to unhide progress bar`,
        style: {
          position: 'fixed', top: hudVisible ? 'calc(58px + env(safe-area-inset-top, 0px))' : 'calc(14px + env(safe-area-inset-top, 0px))',
          right: '16px', zIndex: 60, background: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${accentBorder}`, boxShadow: `0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px ${glowShadow}`,
          borderRadius: 9999, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc',
          fontSize: 11.5, fontWeight: 700, cursor: 'pointer', userSelect: 'none', transition: 'top 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease'
        },
        onClick: toggleHidden
      },
        h('div', { style: { width: 7, height: 7, borderRadius: '50%', background: accentColor, boxShadow: `0 0 6px ${accentColor}` }, className: 'animate-pulse' }),
        h('span', { style: { color: accentColor } }, `${Math.round(pct)}%`),
        ic('Eye', 12, 'opacity-70')
      );
    }

    return h('div', {
      className: 'reader-dynamic-progress-pill',
      style: {
        position: 'fixed', top: hudVisible ? 'calc(58px + env(safe-area-inset-top, 0px))' : 'calc(12px + env(safe-area-inset-top, 0px))',
        left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${accentBorder}`,
        boxShadow: `0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 16px ${glowShadow}`, borderRadius: 9999,
        padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#f8fafc', fontSize: 12.5,
        maxWidth: 'min(460px, calc(100vw - 28px))', cursor: 'pointer', userSelect: 'none',
        transition: 'top 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease, opacity 0.25s ease'
      },
      onClick: onOpenDashboard
    },
      // Left: Animated pulsing icon
      h('div', {
        style: { width: 24, height: 24, borderRadius: '50%', background: `rgba(${isHealing ? '168, 85, 247' : (isTranslatingTitles ? '56, 189, 248' : '99, 102, 241')}, 0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, flexShrink: 0 }
      }, ic('Sparkles', 13, 'animate-pulse')),

      // Center Info
      h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 90, maxWidth: 200, overflow: 'hidden' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: accentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
          h('span', null, isTranslatingTitles ? `Titles (${titlesProgress?.done || 0}/${titlesProgress?.total || '…'})` : `Ch. ${(chapterIndex ?? 0) + 1} · ${modeLabel}`),
          h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, `${Math.round(pct)}%`)
        ),
        h('div', { style: { fontSize: 10.5, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, statusMsg || cleanTitle || 'Tap for Live Dashboard')
      ),

      // Progress Bar
      h('div', { style: { width: 60, height: 5, background: 'rgba(255, 255, 255, 0.12)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 } },
        h('div', {
          style: {
            width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%',
            background: isHealing ? 'linear-gradient(90deg, #a855f7, #ec4899)' : (isTranslatingTitles ? 'linear-gradient(90deg, #38bdf8, #6366f1)' : 'linear-gradient(90deg, #6366f1, #a855f7)'),
            transition: 'width 0.3s ease'
          }
        })
      ),

      // Action Buttons Container
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 } },
        // Hide Button
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          title: 'Hide progress bar (keeps translation active)',
          style: {
            padding: '3px 8px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            cursor: 'pointer'
          },
          onClick: (e) => {
            e.stopPropagation();
            toggleHidden();
          }
        }, ic('EyeOff', 11), 'Hide'),

        // Stop Button
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          title: 'Stop translation',
          style: {
            padding: '3px 8px',
            borderRadius: 9999,
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            cursor: 'pointer'
          },
          onClick: (e) => {
            e.stopPropagation();
            if (typeof onStop === 'function') onStop();
          }
        }, ic('Square', 10), 'Stop')
      )
    );
  }

  // ── 10. EXPANDABLE LIVE TRANSLATION DASHBOARD ──
  // ── 10. EXPANDABLE LIVE TRANSLATION DASHBOARD (DELEGATED) ──
  const ReaderLiveDashboardModal = (typeof window !== "undefined" && window.ReaderLiveDashboardModal) ? window.ReaderLiveDashboardModal : null;

  return {
    ReaderTtsPlayerBar,
    ReaderTocDrawer,
    ReaderTypographyModal,
    ReaderVoiceModal,
    ReaderTtsOptionsModal,
    ReaderCharsFilterModal,
    ReaderGestureGuideModal,
    ChapterTranslationSuiteModal,
    ReaderDynamicProgressPill,
    ReaderLiveDashboardModal
  };
}));
