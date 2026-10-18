(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function TabLibrary(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = window.toast || function() {};
    const ic = window.ic || function() { return null; };
    const btn = window.btn || function(p, ...ch) { return h('button', p, ...ch); };

    const {
      activeSession,
      activeSessionRef,
      libQuery,
      setLibQuery,
      epubRestoreInputRef,
      ongoingEpubInputRef,
      handleRestoreFromEpubFiles,
      handleSelectOngoingEpubFile,
      libTab,
      setLibTab,
      allCountLabel,
      filteredAudiobooks,
      savedSpaceCount,
      transCount,
      incCount,
      loadTrashCount,
      trashCount,
      trashList,
      savedAudiobooks,
      setSavedAudiobooks,
      confirmAction,
      deleteNovelFromHistory,
      setWebImportHistory,
      audioPlayerState,
      setIsFullPlayerOpen,
      handleStartPlayAudiobook,
      handleOpenAudioDownload,
      removeAudiobookFromLibrary,
      displayedBooks,
      handleClearSavedSpace,
      handleClearScopedBooks,
      handleCheckAllUpdates,
      isBatchChecking,
      checkingUpdates,
      downloadingUpdates,
      handleEmptyTrash,
      handleRestoreAllTrash,
      savedTranslationSession,
      isTranslationPaused,
      resumeSavedTranslation,
      discardSavedTranslation,
      handleUpdateTranslateAndMakeEpub,
      handleDownloadNewChapters,
      loadFullNovel,
      setActiveTab,
      setStudioSubTab,
      handleCheckNovelUpdate,
      handleOpenContinuationForNovel,
      currentDocCover,
      setActiveBookMenuNovel,
      setReaderNovelId,
      setReaderNovelTitle,
      setReaderChapterIdx,
      setReaderOpen,
      readerChapters = [],
      setReaderChapters = function() {},
      setActiveNovelRecord = function() {},
      setAssembledText,
      setChapters,
      setInputText,
      setTranslatedChapters,
      translatedChapters,
      generateEpubFromChapters,
      getNovelFolderOptions,
      setEpubPackagingModal,
      getEpubFileName,
      getEpubOptions,
      handleRestoreNovel,
      handlePermanentDelete,
      clearAllNovelHistory,
      libCollapsed,
      setLibCollapsed,
      history,
      filteredHistory,
      loadFromHistory,
      deleteHistoryItem,
      clearHistory,
      webImportHistory,
      novelUpdateBadges
    } = props;

    const latestReadingBook = (typeof React !== 'undefined' && React.useMemo) ? React.useMemo(() => {
      if (!displayedBooks || !displayedBooks.length) return null;
      let best = null;
      let bestTs = 0;
      for (const b of displayedBooks) {
        const prog = window.getReadingProgress ? window.getReadingProgress(b.id || b.title) : null;
        if (prog) {
          const t = prog.updatedAt ? new Date(prog.updatedAt).getTime() : (prog.pct > 0 ? 1 : 0);
          if (t > bestTs) {
            bestTs = t;
            best = { book: b, prog };
          }
        }
      }
      return best;
    }, [displayedBooks]) : null;

    const [isSelectMode, setIsSelectMode] = (typeof React !== 'undefined' && React.useState) ? React.useState(false) : [false, () => {}];
    const [selectedBookIds, setSelectedBookIds] = (typeof React !== 'undefined' && React.useState) ? React.useState([]) : [[], () => {}];

    const toggleSelectBook = (id) => {
      if (!id) return;
      setSelectedBookIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAllBooks = () => {
      setSelectedBookIds(displayedBooks.map(b => b.id || b.title).filter(Boolean));
    };

    const deselectAllBooks = () => {
      setSelectedBookIds([]);
    };

    const deleteSelectedBooks = () => {
      if (selectedBookIds.length === 0) return;
      const count = selectedBookIds.length;
      const doDelete = async () => {
        const deleteFn = props.deleteNovelFromHistory || deleteNovelFromHistory;
        const setHistoryFn = props.setWebImportHistory || setWebImportHistory;
        for (const id of selectedBookIds) {
          try {
            if (deleteFn) {
              await deleteFn(id);
            } else if (window.LibraryEngine?.Controller?.moveToTrash) {
              await window.LibraryEngine.Controller.moveToTrash(id, {
                setWebImportHistory: setHistoryFn,
                loadTrashCount,
                toast
              });
            }
          } catch (delErr) {
            console.warn('[LibraryTab] Error deleting book:', id, delErr);
          }
        }
        if (typeof setHistoryFn === 'function') {
          setHistoryFn(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.filter(item => !selectedBookIds.includes(item.id) && !selectedBookIds.includes(item.title));
          });
        }
        setSelectedBookIds([]);
        setIsSelectMode(false);
        if (typeof loadTrashCount === 'function') {
          loadTrashCount();
        }
        toast(`Moved ${count} book(s) to Trash.`, 'success');
      };

      if (typeof confirmAction === 'function') {
        confirmAction(`Move ${count} selected book(s) to Trash?`, doDelete);
      } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm(`Move ${count} selected book(s) to Trash?`)) {
          doDelete();
        }
      } else {
        doDelete();
      }
    };

    const timerRefs = (typeof React !== 'undefined' && React.useRef) ? React.useRef({}) : { current: {} };
    const longPressTriggered = (typeof React !== 'undefined' && React.useRef) ? React.useRef({}) : { current: {} };
    const touchStartPos = (typeof React !== 'undefined' && React.useRef) ? React.useRef({}) : { current: {} };
    const lastLongPressTimeRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(0) : { current: 0 };
    const isTouchInteractionRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(false) : { current: false };

    const handleCardTouchStart = (item, e) => {
      const isTouch = Boolean(e.touches || e.changedTouches || e.type === 'touchstart');
      if (isTouch) {
        isTouchInteractionRef.current = true;
      } else if (isTouchInteractionRef.current && e.type === 'mousedown') {
        return;
      }

      const id = item.id || item.title;
      if (timerRefs.current[id]) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
      longPressTriggered.current[id] = false;
      const t = e.touches ? e.touches[0] : e;
      touchStartPos.current[id] = { x: t?.clientX || 0, y: t?.clientY || 0 };
      timerRefs.current[id] = setTimeout(() => {
        longPressTriggered.current[id] = true;
        lastLongPressTimeRef.current = Date.now();
        if (isSelectMode) {
          toggleSelectBook(item.id || item.title);
        } else {
          setActiveBookMenuNovel(item);
        }
      }, 500);
    };

    const handleCardTouchMove = (item, e) => {
      const id = item.id || item.title;
      if (!timerRefs.current[id]) return;
      const t = e.touches ? e.touches[0] : e;
      const start = touchStartPos.current[id] || { x: 0, y: 0 };
      const dx = Math.abs((t?.clientX || 0) - start.x);
      const dy = Math.abs((t?.clientY || 0) - start.y);
      if (dx > 12 || dy > 12) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
    };

    const handleCardTouchEnd = (item) => {
      const id = item.id || item.title;
      if (timerRefs.current[id]) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
    };

    const handleCardClick = (item, e) => {
      const id = item.id || item.title;
      const timeSinceLongPress = Date.now() - (lastLongPressTimeRef.current || 0);
      if (longPressTriggered.current[id] || timeSinceLongPress < 850) {
        longPressTriggered.current[id] = false;
        if (e) {
          e.preventDefault?.();
          e.stopPropagation?.();
        }
        return;
      }
      if (isSelectMode) {
        toggleSelectBook(item.id || item.title);
      } else {
        openReaderForBook(item);
      }
    };

    const openReaderForBook = async (item) => {
      const full = await loadFullNovel(item);
      if (!full) { toast('Novel data not found in local store.', 'error'); return; }
      if (typeof setActiveNovelRecord === 'function') {
        setActiveNovelRecord(full);
      }
      const isTrans = !!item.isTranslated || !!full.isTranslated || (item.title || '').includes('(Translated)');
      let chs = [];
      if (isTrans && Array.isArray(full.translatedChapters) && full.translatedChapters.length > 0) {
        chs = full.translatedChapters;
      } else {
        chs = (Array.isArray(full.rawChapters) && full.rawChapters.length > 0)
          ? full.rawChapters
          : ((Array.isArray(full.chapters) && full.chapters.length > 0)
            ? full.chapters
            : (full.translatedChapters || []));
      }
      if (chs.length === 0 && (full.epubBlob || item.epubBlob)) {
        try {
          toast('Unpacking book for reader...', 'info');
          const blob = full.epubBlob || item.epubBlob;
          const parsed = await window.DocumentParser.parseFile(blob);
          if (parsed && parsed.chapters && parsed.chapters.length > 0) {
            chs = parsed.chapters;
            if (full.id && window.GeminiNovelDB) {
              window.GeminiNovelDB.updateNovel(full.id, { rawChapters: parsed.chapters }).catch(() => {});
            }
          }
        } catch(err) {
          console.error('Failed to unpack EPUB for reader:', err);
        }
      }
      if (chs.length === 0) { toast('No chapters available to read.', 'warning'); return; }
      const cleanCh = (c) => {
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
        const raw = c?.text || c?.content || '';
        return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
      };
      const cleanedChs = chs.map(c => ({
        title: c.title,
        content: cleanCh(c),
        text: cleanCh(c),
        originalTitle: c.originalTitle || c.title,
        isTranslated: Boolean(c.isTranslated || isTrans)
      }));
      if (typeof setReaderChapters === 'function') {
        setReaderChapters(cleanedChs);
      }
      if (isTrans) {
        setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n\n'));
        setTranslatedChapters(cleanedChs);
        if (full.originalChapters && full.originalChapters.length > 0) {
          const srcChs = full.originalChapters;
          setInputText(srcChs.map(c => `# ${c.title}\n\n${cleanCh(c)}`).join('\n\n\n'));
          setChapters(srcChs.map(c => ({ title: c.title, content: cleanCh(c), text: cleanCh(c) })));
        } else {
          setInputText('');
          setChapters(cleanedChs);
        }
      } else {
        setAssembledText('');
        setTranslatedChapters([]);
        setInputText(cleanedChs.map(c => `# ${c.title}\n\n${cleanCh(c)}`).join('\n\n\n'));
        setChapters(cleanedChs);
      }
      const novelKey = item.id || item.title;
      setReaderNovelId(novelKey);
      setReaderNovelTitle(item.title);
      const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
      const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
      setReaderChapterIdx(resumeIdx);
      setReaderOpen(true);
      if (savedProg && resumeIdx > 0) {
        toast(`Resuming "${item.title}" at Chapter ${resumeIdx + 1}!`, 'success');
      } else {
        toast(`Reading "${item.title}" (${chs.length} ch)!`, 'success');
      }
    };

    function renderBookshelfGrid() {
      if (displayedBooks.length === 0) {
        return h('div', { className: 'card', style: { textAlign: 'center', padding: '44px 16px' } },
          h('p', { style: { fontSize: 13, color: 'var(--slate)', fontWeight: 600 } },
            libQuery
              ? 'No saved books match your search.'
              : libTab === 'saved'
                ? 'Your Saved Space is empty. Star any book to pin it here!'
                : libTab === 'translated'
                  ? 'No translated books in your library yet.'
                  : libTab === 'incomplete'
                    ? 'No incomplete crawls or paused downloads found.'
                    : 'Your library is empty.'
          ),
          h('p', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 6 } },
            libQuery
              ? 'Try a different search term.'
              : 'Translated books and downloaded novels will appear here automatically.'
          )
        );
      }

      return h(React.Fragment, null,
        // ── HERO: CONTINUE READING CARD ──
        latestReadingBook && h('div', {
          className: 'shelf-hero-card',
          style: { cursor: 'pointer' },
          onClick: () => openReaderForBook(latestReadingBook.book)
        },
          h('div', { style: { position: 'relative' } },
            latestReadingBook.book.cover ? h('img', {
              src: latestReadingBook.book.cover,
              alt: '',
              className: 'shelf-hero-cover',
              referrerPolicy: 'no-referrer',
              onError: (e) => { e.target.style.display = 'none'; }
            }) : h('div', {
              className: 'shelf-hero-cover',
              style: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1D30', color: 'var(--iris)' }
            }, ic(BookOpen, 28))
          ),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'shelf-hero-badge' }, ic(BookOpen, 13), 'Continue Reading'),
            h('div', {
              style: {
                fontSize: 16,
                fontWeight: 700,
                color: '#F8FAFC',
                marginTop: 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }, latestReadingBook.book.title || 'Untitled Book'),
            h('div', { style: { fontSize: 12, color: '#94A3B8', marginTop: 2 } },
              `${latestReadingBook.book.author ? `by ${latestReadingBook.book.author} · ` : ''}Chapter ${(latestReadingBook.prog?.chapterIdx || 0) + 1}${latestReadingBook.prog?.pct ? ` (${latestReadingBook.prog.pct}%)` : ''}`
            ),
            h('div', {
              style: {
                width: '100%',
                height: 4,
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 999,
                overflow: 'hidden',
                marginTop: 8
              }
            },
              h('div', {
                style: {
                  width: `${latestReadingBook.prog?.pct || 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                  borderRadius: 999
                }
              })
            )
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: {
              padding: '8px 16px',
              fontWeight: 700,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#000',
              border: 'none',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            },
            onClick: (e) => {
              e.stopPropagation();
              openReaderForBook(latestReadingBook.book);
            }
          }, ic(Play, 13), 'Resume')
        ),

        // ── FLUID 3:4 COVER GRID ──
        h('div', { className: 'shelf-grid' },
          displayedBooks.map((item, idx) => {
            const savedProg = window.getReadingProgress ? window.getReadingProgress(item.id || item.title) : null;
            const resumeCh = (savedProg && typeof savedProg.chapterIdx === 'number') ? (savedProg.chapterIdx + 1) : null;
            const pct = savedProg?.pct;
            const updateBadge = (novelUpdateBadges && (novelUpdateBadges[item.id] || novelUpdateBadges[item.title])) || null;
            const unit = updateBadge?.isVolumeBased ? 'Vol' : 'Ch';
            const newCount = updateBadge ? (updateBadge.newCount ?? updateBadge.count ?? 0) : 0;
            const isSelected = selectedBookIds.includes(item.id) || selectedBookIds.includes(item.title);

            return h('div', {
              key: item.id || idx,
              className: `shelf-book-item ${isSelected ? 'shelf-selected' : ''}`,
              style: { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' },
              onMouseDown: (e) => handleCardTouchStart(item, e),
              onMouseUp: () => handleCardTouchEnd(item),
              onMouseLeave: () => handleCardTouchEnd(item),
              onTouchStart: (e) => handleCardTouchStart(item, e),
              onTouchMove: (e) => handleCardTouchMove(item, e),
              onTouchEnd: () => handleCardTouchEnd(item),
              onClick: (e) => handleCardClick(item, e),
              onContextMenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                const timeSinceLongPress = Date.now() - (lastLongPressTimeRef.current || 0);
                if (timeSinceLongPress >= 850 && !isSelectMode) {
                  setActiveBookMenuNovel(item);
                }
              }
            },
              h('div', { className: 'shelf-book-cover-wrap' },
                isSelectMode && h('div', {
                  style: {
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--iris)' : 'rgba(0, 0, 0, 0.65)',
                    border: isSelected ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)'
                  }
                }, isSelected ? ic(Check, 13) : null),
                item.cover ? h('img', {
                  src: item.cover,
                  alt: item.title || 'Cover',
                  className: 'shelf-book-cover-img',
                  referrerPolicy: 'no-referrer',
                  onError: (e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }
                }) : null,
                h('div', {
                  style: {
                    display: item.cover ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    background: '#1A1D30',
                    color: 'var(--iris)'
                  }
                }, ic(BookOpen, 28)),
                h('div', { className: 'shelf-book-spine' }),
                (pct > 0 || resumeCh) && h('div', { className: 'shelf-book-progress-badge' },
                  pct > 0 ? `${pct}%` : `Ch.${resumeCh}`
                ),
                newCount > 0 && h('div', {
                  style: {
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: '#2563eb',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    zIndex: 5
                  }
                }, `+${newCount} ${unit}`)
              ),
              h('div', { className: 'shelf-book-title', title: item.title }, item.title || 'Untitled Book'),
              h('div', { className: 'shelf-book-author' }, item.author || `${item.chapterCount || 0} chapters`),
              newCount > 0 && h('div', {
                style: {
                  display: 'flex',
                  gap: 4,
                  marginTop: 6,
                  width: '100%'
                },
                onClick: (e) => e.stopPropagation()
              },
                h('button', {
                  type: 'button',
                  className: 'mini-btn primary',
                  title: 'Download new chapters',
                  style: {
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3
                  },
                  onClick: (e) => {
                    e.stopPropagation();
                    if (typeof handleDownloadNewChapters === 'function') {
                      handleDownloadNewChapters(item);
                    }
                  }
                }, ic(Download, 11), `Download (${newCount})`),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  title: 'Translate new chapters & export EPUB',
                  style: {
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3
                  },
                  onClick: (e) => {
                    e.stopPropagation();
                    if (typeof handleUpdateTranslateAndMakeEpub === 'function') {
                      handleUpdateTranslateAndMakeEpub(item);
                    }
                  }
                }, ic(Globe, 11), 'Translate')
              )
            );
          })
        )
      );
    }

    return h(React.Fragment, null,
      // Apple-style Header
      h('div', { className: 'apple-page-header', style: { marginBottom: 14 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 } },
          h('div', null,
            h('h1', { style: { fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: '0 0 2px' } }, 'Bookshelf'),
            h('p', { style: { fontSize: 13, color: '#94A3B8', margin: 0 } }, 'Your reading library, progress & offline books')
          ),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              className: isSelectMode ? 'mini-btn primary' : 'mini-btn ghost',
              style: {
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 650,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              },
              onClick: () => {
                setIsSelectMode(prev => !prev);
                setSelectedBookIds([]);
              }
            }, ic(Check, 13), isSelectMode ? 'Exit Select' : 'Select'),
            (libQuery || libTab !== 'all') && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: {
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer'
              },
              title: 'Reset library search and filter back to All Books',
              onClick: () => {
                setLibQuery('');
                setLibTab('all');
                toast('Library view reset to All Books.', 'info');
              }
            }, 'Reset View')
          )
        )
      ),

      // Multi-Select Batch Actions Deck
      isSelectMode && h('div', {
        className: 'card',
        style: {
          background: 'rgba(30, 27, 75, 0.95)',
          border: '1px solid var(--iris)',
          borderRadius: 16,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap'
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontWeight: 700, fontSize: 13, color: '#F8FAFC' } }, `${selectedBookIds.length} Selected`),
          h('span', { style: { fontSize: 11, color: '#94A3B8' } }, `of ${displayedBooks.length}`)
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '5px 10px', fontSize: 11.5 },
            onClick: selectAllBooks
          }, 'Select All'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '5px 10px', fontSize: 11.5 },
            onClick: deselectAllBooks
          }, 'Deselect All'),
          h('button', {
            type: 'button',
            className: 'mini-btn danger',
            style: {
              padding: '5px 12px',
              fontSize: 11.5,
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            },
            disabled: selectedBookIds.length === 0,
            onClick: deleteSelectedBooks
          }, ic(Trash2, 13), `Delete (${selectedBookIds.length})`),
          h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: { padding: '5px 12px', fontSize: 11.5 },
            onClick: () => { setIsSelectMode(false); setSelectedBookIds([]); }
          }, 'Done')
        )
      ),

      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 } },
        h('div', { className: 'apple-search-wrap', style: { marginBottom: 0 } },
          h('div', { className: 'apple-search-bar' },
            h('span', { style: { display: 'inline-flex', alignItems: 'center', opacity: 0.7 } }, ic(Search, 15)),
            h('input', {
              className: 'apple-search-input',
              type: 'text',
              placeholder: 'Search library by title, author, chapters…',
              value: libQuery,
              onChange: e => setLibQuery(e.target.value)
            }),
            libQuery && h('button', {
              type: 'button',
              className: 'apple-search-clear',
              onClick: () => setLibQuery(''),
              title: 'Clear search'
            }, ic('X', 12))
          )
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--iris)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            },
            title: 'Re-import previously downloaded EPUB files back into your library',
            onClick: () => epubRestoreInputRef.current?.click()
          }, ic(Download, 13), 'Restore EPUBs'),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            },
            title: 'Input an existing EPUB to auto-search sources and continue fetching',
            onClick: () => ongoingEpubInputRef.current?.click()
          }, ic(Zap, 13), 'Continue Ongoing EPUB')
        ),
        h('input', {
          type: 'file',
          ref: epubRestoreInputRef,
          accept: '.epub',
          multiple: true,
          style: { display: 'none' },
          onChange: handleRestoreFromEpubFiles
        }),
        h('input', {
          type: 'file',
          ref: ongoingEpubInputRef,
          accept: '.epub',
          style: { display: 'none' },
          onChange: (e) => {
            const f = e.target.files?.[0];
            if (f) handleSelectOngoingEpubFile(f);
            e.target.value = '';
          }
        })
      ),

      h('div', { className: 'studio-pill-bar', style: { marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' } },
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'all' ? 'active' : ''}`,
          onClick: () => setLibTab('all')
        }, ic(Library, 12), ` All (${allCountLabel})`),
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'audio' ? 'active' : ''}`,
          onClick: () => setLibTab('audio')
        }, ic(Volume2, 12), ` Audio (${filteredAudiobooks.length})`),
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'saved' ? 'active' : ''}`,
          onClick: () => setLibTab('saved')
        }, ic(Star, 12), ` Saved (${savedSpaceCount})`),
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'translated' ? 'active' : ''}`,
          onClick: () => setLibTab('translated')
        }, ic(Globe, 12), ` Translated (${transCount})`),
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'incomplete' ? 'active' : ''}`,
          onClick: () => setLibTab('incomplete')
        }, ic(Clock, 12), ` Incomplete (${incCount})`),
        h('button', {
          type: 'button',
          className: `studio-pill-btn ${libTab === 'trash' ? 'active' : ''}`,
          onClick: () => { setLibTab('trash'); loadTrashCount(); }
        }, ic(Trash2, 12), ` Trash (${trashCount})`)
      ),

              // AUDIOBOOK SHELF IN LIBRARY
              libTab === 'audio' && h(React.Fragment, null,
                h('div', { className: 'card-title', style: { marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  h('span', { style: { fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Headphones', 15), `Saved Audiobooks (${filteredAudiobooks.length})`),
                  savedAudiobooks.length > 0 && h('button', {
                    type: 'button',
                    className: 'mini-btn danger',
                    onClick: () => confirmAction('Clear all saved audiobooks from your library?', () => {
                      setSavedAudiobooks([]);
                      try { localStorage.removeItem('gemini_saved_audiobooks'); } catch (e) {}
                      toast('Audiobook library cleared.');
                    })
                  }, 'Clear All')
                ),
                filteredAudiobooks.length === 0
                  ? h('div', { className: 'card', style: { textAlign: 'center', padding: '44px 16px' } },
                      h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--slate)' } }, ic('Headphones', 36)),
                      h('p', { style: { fontSize: 13.5, color: 'var(--paper)', fontWeight: 600 } }, libQuery ? 'No saved audiobooks match your search.' : 'Your Audiobook Library is empty.'),
                      h('p', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 6, maxWidth: 360, margin: '6px auto 0', lineHeight: 1.5 } },
                        libQuery ? 'Try another search keyword.' : 'Search for any audiobook in the Import tab and tap "Add to Library" to keep it here for quick listening and downloading!'
                      )
                    )
                  : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                      filteredAudiobooks.map((b, idx) => {
                        const isCurrentlyPlaying = audioPlayerState?.isPlaying && audioPlayerState?.currentBook?.url === b.url;
                        const progressPercent = (b.totalTracks && b.lastPlayedTrackIndex !== undefined)
                          ? Math.round(((b.lastPlayedTrackIndex + 1) / b.totalTracks) * 100)
                          : 0;

                        return h('div', {
                          key: b.id || b.url || idx,
                          className: 'book-card',
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            borderColor: isCurrentlyPlaying ? 'var(--iris)' : 'var(--hairline)'
                          }
                        },
                          h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start' } },
                            h('div', {
                              style: {
                                width: 62,
                                height: 88,
                                borderRadius: 6,
                                overflow: 'hidden',
                                flexShrink: 0,
                                position: 'relative',
                                background: 'var(--ember-2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }
                            },
                              b.cover ? h('img', {
                                src: b.cover,
                                alt: 'Cover',
                                referrerPolicy: 'no-referrer',
                                onError: (e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                },
                                style: { width: '100%', height: '100%', objectFit: 'cover' }
                              }) : null,
                              h('div', {
                                style: {
                                  display: b.cover ? 'none' : 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  height: '100%',
                                  color: 'var(--slate)'
                                }
                              }, ic('Headphones', 24))
                            ),

                            h('div', { style: { flex: 1, minWidth: 0 } },
                              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
                                h('div', { style: { fontSize: 14.5, fontWeight: 700, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.title),
                                h('span', {
                                  style: {
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    color: '#a78bfa',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }
                                }, ic('Headphones', 10), ' Audiobook')
                              ),
                              h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 2 } }, b.author ? `by ${b.author}` : 'SwiftAudiobooks'),
                              h('div', { style: { fontSize: 11.5, color: 'var(--paper-dim)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('BookOpen', 11), `${b.totalTracks || (b.tracks ? b.tracks.length : '?')} chapters`),
                                b.duration && h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('Clock', 11), b.duration)
                              ),
                              b.lastPlayedTrackTitle ? h('div', {
                                style: {
                                  fontSize: 11,
                                  color: 'var(--lamp)',
                                  marginTop: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }
                              }, `Resumes at: ${b.lastPlayedTrackTitle}${progressPercent > 0 ? ` (${progressPercent}%)` : ''}`) : null
                            )
                          ),

                          h('div', { className: 'book-acts', style: { marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                            h('button', {
                              type: 'button',
                              className: 'mini-btn',
                              style: {
                                background: isCurrentlyPlaying ? '#10b981' : 'var(--accent, #6366f1)',
                                color: '#fff',
                                fontWeight: 700,
                                padding: '6px 12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              },
                              onClick: () => {
                                if (isCurrentlyPlaying) {
                                  window.SwiftAudioEngine?.Player?.pause();
                                } else if (audioPlayerState?.currentBook?.url === b.url) {
                                  window.SwiftAudioEngine?.Player?.play();
                                  setIsFullPlayerOpen(true);
                                } else {
                                  handleStartPlayAudiobook(b, b.lastPlayedTrackIndex || 0);
                                }
                              }
                            }, isCurrentlyPlaying ? [ic('Pause', 12), ' Now Playing'] : (b.lastPlayedTrackIndex ? [ic('Play', 12), ' Resume Playing'] : [ic('Play', 12), ' Start Listening'])),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn ghost',
                              style: { fontWeight: 600, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                              onClick: () => handleOpenAudioDownload(b)
                            }, ic('Download', 12), ' Download MP3s'),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn danger',
                              style: { marginLeft: 'auto', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                              title: 'Remove this audiobook from Library',
                              onClick: () => confirmAction(`Remove "${b.title}" from your Library?`, () => removeAudiobookFromLibrary(b))
                            }, ic('Trash2', 12), ' Remove')
                          )
                        );
                      })
                    )
              ),

              // RECYCLE BIN SHELF IN LIBRARY
              libTab === 'trash' && h(React.Fragment, null,
                h('div', { className: 'card-title', style: { marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  h('span', { style: { fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Trash2', 15), `Recycle Bin (${trashList.length})`),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    trashList.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: () => confirmAction(`Restore all ${trashList.length} deleted novel(s) back into your library?`, handleRestoreAllTrash)
                    }, ic('RotateCcw', 12), ` Restore All (${trashList.length})`),
                    trashList.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: () => confirmAction('Permanently delete all items in Recycle Bin? This cannot be undone.', handleEmptyTrash)
                    }, ic('Trash2', 12), ' Empty Bin')
                  )
                ),
                trashList.length === 0
                  ? h('div', { className: 'card', style: { textAlign: 'center', padding: '44px 16px' } },
                      h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--slate)' } }, ic('Trash2', 36)),
                      h('p', { style: { fontSize: 13.5, color: 'var(--paper)', fontWeight: 600 } }, 'Your Recycle Bin is empty.'),
                      h('p', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 6, maxWidth: 380, margin: '6px auto 0', lineHeight: 1.5 } },
                        'Whenever you delete novels or clear a shelf, they are safely preserved here so you can restore them anytime with 1 tap.'
                      )
                    )
                  : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                      trashList.map((item, idx) => h('div', {
                        key: item.id || idx,
                        className: 'book-card',
                        style: { display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.95 }
                      },
                        h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start' } },
                          h('div', {
                            style: {
                              width: 52,
                              height: 72,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: 'var(--ember-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }
                          },
                            item.cover ? h('img', {
                              src: item.cover,
                              alt: 'Cover',
                              referrerPolicy: 'no-referrer',
                              onError: (e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              },
                              style: { width: '100%', height: '100%', objectFit: 'cover' }
                            }) : null,
                            h('div', {
                              style: {
                                display: item.cover ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                color: 'var(--slate)'
                              }
                            }, ic('BookOpen', 20))
                          ),
                          h('div', { style: { flex: 1, minWidth: 0 } },
                            h('div', { style: { fontSize: 14.5, fontWeight: 700, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title || 'Untitled Book'),
                            h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 3 } },
                              `${item.chapterCount || (item.chapters ? item.chapters.length : 0)} chapters · Deleted ${item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'recently'}`
                            )
                          )
                        ),
                        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 } },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            style: { background: '#10b981', color: '#fff', fontWeight: 700, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                            onClick: () => handleRestoreNovel(item.id)
                          }, ic('RotateCcw', 12), ' Restore to Library'),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn danger',
                            style: { padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                            onClick: () => confirmAction(`Permanently delete "${item.title}"?`, () => handlePermanentDelete(item.id))
                          }, ic('Trash2', 12), ' Delete Permanently')
                        )
                      ))
                    )
              ),

              libTab !== 'audio' && libTab !== 'trash' && h(React.Fragment, null,
                h('div', { className: 'card-title', style: { marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  h('span', { style: { cursor: 'pointer', fontWeight: 700 }, onClick: () => setLibCollapsed(s => ({ ...s, books: !s.books })) },
                    `${libCollapsed.books ? '▸' : '▾'} ${libTab === 'saved' ? 'Special Saved Space' : libTab === 'translated' ? 'Translated Books' : libTab === 'incomplete' ? 'Incomplete Crawls' : 'Books Library'} (${displayedBooks.length})`
                  ),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                    displayedBooks.length > 0 && h('button', {
                      type: 'button',
                      className: isSelectMode ? 'mini-btn primary' : 'mini-btn ghost',
                      style: {
                        padding: '5px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 650,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      },
                      onClick: () => {
                        setIsSelectMode(prev => !prev);
                        setSelectedBookIds([]);
                      }
                    }, ic(Check, 13), isSelectMode ? 'Exit Select' : 'Select Books'),

                    webImportHistory.some(b => b.sourceUrl && b.sourceUrl.startsWith('http')) && h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', border: '1px solid var(--accent, #6366f1)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      disabled: isBatchChecking,
                      onClick: handleCheckAllUpdates,
                      title: 'Scan web sources for novel chapter updates'
                    }, isBatchChecking ? [ic('RefreshCw', 12, 'animate-spin'), ' Checking…'] : [ic('RefreshCw', 12), ' Check All Updates']),

                    // Scoped Clear Button for Incomplete:
                    libTab === 'incomplete' && displayedBooks.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      title: 'Move incomplete crawl drafts to Recycle Bin',
                      onClick: () => confirmAction(`Move all ${displayedBooks.length} incomplete crawl(s) to the Recycle Bin? (Completed novels and other shelves will NOT be affected.)`, () => handleClearScopedBooks(displayedBooks, 'incomplete'))
                    }, `Clear Incomplete (${displayedBooks.length})`),

                    // Scoped Clear Button for Saved Space:
                    libTab === 'saved' && displayedBooks.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      title: 'Unpin books from Special Saved Space',
                      onClick: () => confirmAction(`Remove all ${displayedBooks.length} book(s) from Special Saved Space? (Novels will stay in your main library.)`, () => handleClearSavedSpace(displayedBooks))
                    }, `Clear Saved Space (${displayedBooks.length})`),

                    // Scoped Clear Button for Translated:
                    libTab === 'translated' && displayedBooks.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      title: 'Move translated novels to Recycle Bin',
                      onClick: () => confirmAction(`Move all ${displayedBooks.length} translated novel(s) to Recycle Bin? (Raw/ongoing novels will NOT be affected.)`, () => handleClearScopedBooks(displayedBooks, 'translated'))
                    }, `Clear Translated (${displayedBooks.length})`),

                    // Scoped Clear Button for All (with explicit danger confirmation):
                    libTab === 'all' && webImportHistory.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      title: 'Move all library books to Recycle Bin',
                      onClick: () => confirmAction(`Warning: You are in the 'All' tab. This will move all ${webImportHistory.length} novels from every shelf into the Recycle Bin. Proceed?`, () => clearAllNovelHistory())
                    }, 'Clear Entire Library')
                  )
                ),
              (savedTranslationSession || isTranslationPaused || activeSessionRef?.current) && (libTab === 'all' || libTab === 'incomplete' || libTab === 'saved') && (() => {
                const s = savedTranslationSession || activeSessionRef?.current || activeSession;
                if (!s) return null;
                const cCount = s.completedCount || 0;
                const tCount = s.total || s.totalChunks || '?';
                const isDelta = Boolean(s.isDeltaUpdate);
                const deltaLabel = `Ch ${s.deltaStart || (cCount + 1)}–${s.deltaEnd || tCount}`;
                return h('div', {
                  className: 'card',
                  style: {
                    border: isDelta ? '1.5px solid #3b82f6' : '1.5px solid var(--accent, #6366f1)',
                    background: isDelta
                      ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(124, 58, 237, 0.12))'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
                    marginBottom: 12,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 } },
                    h('div', null,
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 } },
                        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, isDelta ? ic('Zap', 13) : ic('Pause', 13), isDelta ? 'Novel Update Staged' : 'Paused Translation Session'),
                        h('span', { className: 'badge', style: { background: isDelta ? '#2563eb' : 'var(--accent, #6366f1)', color: '#fff' } },
                          isDelta ? `${deltaLabel} staged` : `${cCount} / ${tCount} done`
                        )
                      ),
                      h('div', { style: { fontSize: 12, fontWeight: 500, color: 'var(--paper)', marginTop: 4 } }, s?.title || 'Translation'),
                      h('div', { style: { fontSize: 11, opacity: 0.75, marginTop: 2 } },
                        isDelta ? `Chapters 1–${cCount} already translated · New chapters waiting` : `Saved in database · ${new Date(s?.timestamp || Date.now()).toLocaleTimeString()}`
                      )
                    ),
                    h('div', { style: { display: 'flex', gap: 8 } },
                      h('button', {
                        type: 'button',
                        className: 'mini-btn',
                        style: {
                          background: isDelta ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          fontWeight: 700,
                          padding: '7px 18px',
                          border: 'none',
                          borderRadius: 999,
                          boxShadow: isDelta ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none'
                        },
                        onClick: () => {
                          setActiveTab('text');
                          resumeSavedTranslation(s);
                        }
                      }, isDelta ? `Translate New Chapters (${deltaLabel})` : 'Resume Translation'),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn danger',
                        onClick: () => discardSavedTranslation(s.id)
                      }, 'Discard')
                    )
                  )
                );
              })(),
              !libCollapsed.books && renderBookshelfGrid(),
              h('div', { className: 'card-title', style: { marginTop: 12, cursor: 'pointer' }, onClick: () => setLibCollapsed(s => ({ ...s, history: !s.history })) },
                h('span', null, `${libCollapsed.history ? '▸' : '▾'} Translation History (${filteredHistory.length})`),
                history.length > 0 && h('button', { type: 'button', className: 'mini-btn danger', onClick: clearHistory }, 'Clear')
              ),
              !libCollapsed.history && filteredHistory.length > 0 && h(React.Fragment, null,
                filteredHistory.map(entry => h('div', { key: entry.id, className: 'book-card' },
                  h('div', { className: 't' }, `Translation · ${new Date(entry.ts).toLocaleString()}`),
                  h('div', { className: 'm' }, `${entry.srcLang || 'Auto'} → ${entry.tgtLang}${entry.outputPreview ? ' · ' + (entry.outputPreview.length > 140 ? entry.outputPreview.substring(0, 140) + '…' : entry.outputPreview) : ''}`),
                  h('div', { className: 'book-acts' },
                    h('button', { type: 'button', className: 'mini-btn', onClick: () => loadFromHistory(entry) }, 'Load'),
                    h('button', { type: 'button', className: 'mini-btn danger', onClick: () => deleteHistoryItem(entry.id) }, 'Delete')
                  )
                ))
              )
            ),
    );
  }

  return { TabLibrary };
}));
