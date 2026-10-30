/**
 * Gemini Translator - Reader Pro Menus, Search Bar, Lightbox, and Footnote Components
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) {
    Object.assign(root, exports);
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : (window.React ? window.React.createElement : null);
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  function ReaderMoreMenu(props) {
    const {
      hudVisible,
      showMoreMenu,
      setShowMoreMenu,
      ttsActive,
      setShowSearch,
      autoScroll,
      setAutoScroll,
      setShowVoiceModal,
      chapters,
      safeChapters,
      activeIdx,
      currentChapter,
      setSuiteModalChap,
      handleTranslateActiveChapter,
      isTranslatingCurrentChapter,
      handleHealActiveChapterLines,
      handleTranslateActiveChapterTitleOnly,
      isTranslatingTitles,
      isHealingAll,
      setLiveStreamText,
      streamBufferRef,
      setIsLiveDashboardOpen,
      onExportEpub,
      onOpenHealthAudit,
      onOpenDiff,
      onClose,
      novelId,
      handleShareDeepLink
    } = props;

    if (!hudVisible || !showMoreMenu) return null;

    return h(React.Fragment, null,
      h('div', {
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'transparent'
        },
        onPointerDown: (e) => {
          e.stopPropagation();
          setShowMoreMenu(false);
        },
        onTouchStart: (e) => {
          e.stopPropagation();
          setShowMoreMenu(false);
        },
        onClick: (e) => {
          e.stopPropagation();
          setShowMoreMenu(false);
        }
      }),
      h('div', {
        className: 'reader-v2-more-menu',
        style: {
          zIndex: 9999,
          ...(ttsActive ? {
            top: 'auto',
            bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
            right: 'max(16px, calc((100vw - 520px) / 2 + 16px))'
          } : {})
        },
        onClick: (e) => e.stopPropagation()
      },
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); setShowSearch(s => !s); } }, ic('Search', 15), h('span', null, 'Find in Chapter')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); setAutoScroll(s => !s); } }, ic('Zap', 15), h('span', null, autoScroll ? 'Stop Auto-Scroll' : 'Start Auto-Scroll')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); setShowVoiceModal(true); } }, ic('Volume2', 15), h('span', null, 'Voice & Offline Engine Settings')),
        h('div', { className: 'reader-more-divider' }),
        h('button', { type: 'button', className: 'reader-more-item', style: { color: 'var(--r-accent)', fontWeight: 700 }, onClick: () => { setShowMoreMenu(false); const targetChap = (chapters && chapters[activeIdx]) || (safeChapters && safeChapters[activeIdx]) || currentChapter; setSuiteModalChap(targetChap || { idx: activeIdx, title: `Chapter ${activeIdx + 1}` }); } }, ic('Sparkles', 15), h('span', null, 'Chapter Translation Suite & Settings...')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); handleTranslateActiveChapter(); } }, ic('Sparkles', 15), h('span', null, isTranslatingCurrentChapter ? 'Translating Chapter...' : 'Quick Translate Chapter')),
        h('button', { type: 'button', className: 'reader-more-item', style: { color: '#c084fc' }, onClick: () => { setShowMoreMenu(false); handleHealActiveChapterLines(); } }, ic('Sparkles', 15), h('span', null, 'Quick Heal Chapter Lines')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); handleTranslateActiveChapterTitleOnly(); } }, ic('Type', 15), h('span', null, 'Translate Chapter Title Only')),
        (isTranslatingCurrentChapter || isTranslatingTitles || isHealingAll) && h('button', { type: 'button', className: 'reader-more-item', style: { color: 'var(--r-accent)', fontWeight: 600 }, onClick: () => { setShowMoreMenu(false); setLiveStreamText(streamBufferRef?.current || ''); setIsLiveDashboardOpen(true); } }, ic('Activity', 15), h('span', null, 'Open Live Translation Dashboard')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); if (typeof onExportEpub === 'function') { onExportEpub(chapters); } else if (typeof window !== 'undefined' && window.ExportEngine?.Controller?.export) { window.ExportEngine.Controller.export('epub', { chaptersToExport: chapters }, { toast: (m, t) => window.toast?.(m, t) }); } } }, ic('Download', 15), h('span', null, 'Save / Export EPUB')),
        h('div', { className: 'reader-more-divider' }),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); if (typeof onOpenHealthAudit === 'function') onOpenHealthAudit(); else if (typeof window !== 'undefined' && typeof window.openNovelHealthAudit === 'function') window.openNovelHealthAudit(); } }, ic('Activity', 15), h('span', null, 'Novel Health & QA Audit')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); if (typeof onOpenDiff === 'function') onOpenDiff(activeIdx); else if (typeof window !== 'undefined' && typeof window.openDiffInspector === 'function') window.openDiffInspector(activeIdx); } }, ic('GitCompare', 15), h('span', null, 'Translation Diffs & Revisions')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); if (typeof onClose === 'function') onClose(); if (window.loadEpubForEditing) window.loadEpubForEditing({ id: novelId, chapters }); if (typeof window.setActiveAppTab === 'function') window.setActiveAppTab('studio', 'edit'); } }, ic('Edit', 15), h('span', null, 'Edit in Ebook Studio')),
        h('button', { type: 'button', className: 'reader-more-item', onClick: () => { setShowMoreMenu(false); handleShareDeepLink(); } }, ic('Link', 15), h('span', null, 'Share Chapter Deep Link'))
      )
    );
  }

  function ReaderSearchBar(props) {
    const {
      showSearch,
      setShowSearch,
      searchQuery,
      setSearchQuery,
      searchMatches = [],
      activeMatchIndex = 0,
      setActiveMatchIndex,
      handlePrevSearchMatch,
      handleNextSearchMatch
    } = props;

    if (!showSearch) return null;

    return h('div', {
      className: 'reader-v2-search-bar',
      onClick: (e) => e.stopPropagation()
    },
      ic('Search', 15, 'opacity-70'),
      h('input', {
        type: 'text',
        className: 'reader-search-input',
        placeholder: 'Search chapter text...',
        value: searchQuery,
        autoFocus: true,
        onChange: (e) => {
          setSearchQuery(e.target.value);
          if (typeof setActiveMatchIndex === 'function') setActiveMatchIndex(0);
        },
        onKeyDown: (e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              if (typeof handlePrevSearchMatch === 'function') handlePrevSearchMatch();
            } else {
              if (typeof handleNextSearchMatch === 'function') handleNextSearchMatch();
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
        'aria-label': 'Previous search match',
        title: 'Previous match (Shift+Enter)'
      }, ic('ChevronUp', 14)),
      h('button', {
        type: 'button',
        className: 'reader-search-nav-btn',
        disabled: searchMatches.length === 0,
        onClick: handleNextSearchMatch,
        'aria-label': 'Next search match',
        title: 'Next match (Enter)'
      }, ic('ChevronDown', 14)),
      h('button', {
        type: 'button',
        className: 'reader-search-nav-btn close',
        onClick: () => {
          setShowSearch(false);
          setSearchQuery('');
        },
        'aria-label': 'Close search',
        title: 'Close search'
      }, ic('X', 14))
    );
  }

  function ReaderLightboxModal(props) {
    const { lightboxImg, setLightboxImg } = props;
    if (!lightboxImg) return null;

    return h('div', {
      className: 'reader-v2-lightbox',
      onClick: () => setLightboxImg(null)
    },
      h('img', {
        src: lightboxImg,
        alt: 'High Resolution Illustration',
        decoding: 'async',
        onError: (e) => {
          if (!e.target.dataset.highResTried) {
            e.target.dataset.highResTried = '1';
            const highRes = (typeof window !== 'undefined' && window.getHighResIllustration) ? window.getHighResIllustration(lightboxImg) : null;
            if (highRes && e.target.src !== highRes) {
              e.target.src = highRes;
              return;
            }
          }
          const thMatch = (lightboxImg || '').match(/[#?]th=([A-Za-z0-9_-]+)/i);
          if (thMatch && !e.target.dataset.thumbhashLoaded) {
            e.target.dataset.thumbhashLoaded = '1';
            try {
              const dataUrlFn = (typeof window !== 'undefined' && window.thumbHashToDataUrl) ? window.thumbHashToDataUrl : (typeof thumbHashToDataUrl === 'function' ? thumbHashToDataUrl : null);
              if (dataUrlFn) {
                const dataUrl = dataUrlFn(thMatch[1]);
                if (dataUrl) e.target.src = dataUrl;
              }
            } catch (_) {}
          }
        }
      })
    );
  }

  function ReaderFootnoteCard(props) {
    const { activeFootnote, setActiveFootnote } = props;
    if (!activeFootnote) return null;

    return h('div', {
      className: 'reader-footnote-card',
      onClick: (e) => e.stopPropagation()
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--r-accent)' } },
          ic('Bookmark', 15),
          h('span', null, `Cultural Context Note [${activeFootnote.num}]`)
        ),
        h('button', {
          type: 'button',
          className: 'reader-search-nav-btn close',
          style: { width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          onClick: () => setActiveFootnote(null),
          'aria-label': 'Close cultural context note',
          title: 'Close cultural context note'
        }, ic('X', 14))
      ),
      h('div', { style: { fontSize: 13.5, lineHeight: 1.55, color: 'var(--r-text)' } }, activeFootnote.text)
    );
  }

  return {
    ReaderMoreMenu,
    ReaderSearchBar,
    ReaderLightboxModal,
    ReaderFootnoteCard
  };
}));
