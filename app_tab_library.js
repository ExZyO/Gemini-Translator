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

    return h(React.Fragment, null,
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 } },
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                  h('input', {
                    type: 'text',
                    className: 'url-input',
                    style: { flex: 1, height: 44, borderRadius: 12, padding: '0 14px', fontSize: 13 },
                    placeholder: 'Search library by title, author, chapters…',
                    value: libQuery,
                    onChange: e => setLibQuery(e.target.value)
                  }),
                  libQuery && h('button', {
                    type: 'button',
                    className: 'icon-btn',
                    style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--slate)', cursor: 'pointer' },
                    onClick: () => setLibQuery('')
                  }, '✕')
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
                      gap: 5
                    },
                    title: 'Re-import previously downloaded EPUB files back into your library',
                    onClick: () => epubRestoreInputRef.current?.click()
                  }, '📥 Restore EPUBs'),
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
                      gap: 5
                    },
                    title: 'Input an existing EPUB to auto-search sources and continue fetching',
                    onClick: () => ongoingEpubInputRef.current?.click()
                  }, '⚡ Continue Ongoing EPUB')
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
              h('div', { className: 'seg', style: { marginTop: 10, marginBottom: 12, overflowX: 'auto', display: 'flex' } },
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'all' ? 'active' : ''}`,
                  style: libTab === 'all' ? { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700 } : {},
                  onClick: () => setLibTab('all')
                }, `📚 All (${allCountLabel})`),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'audio' ? 'active' : ''}`,
                  style: libTab === 'audio' ? { background: '#8b5cf6', color: '#fff', fontWeight: 700 } : {},
                  onClick: () => setLibTab('audio')
                }, `🎧 Audiobooks (${filteredAudiobooks.length})`),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'saved' ? 'active' : ''}`,
                  style: libTab === 'saved' ? { background: '#f59e0b', color: '#000', fontWeight: 700 } : {},
                  onClick: () => setLibTab('saved')
                }, `⭐ Saved Space (${savedSpaceCount})`),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'translated' ? 'active' : ''}`,
                  style: libTab === 'translated' ? { background: '#22c55e', color: '#fff', fontWeight: 700 } : {},
                  onClick: () => setLibTab('translated')
                }, `🌐 Translated (${transCount})`),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'incomplete' ? 'active' : ''}`,
                  style: libTab === 'incomplete' ? { background: '#eab308', color: '#000', fontWeight: 700 } : {},
                  onClick: () => setLibTab('incomplete')
                }, `⏸ Incomplete (${incCount})`),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${libTab === 'trash' ? 'active' : ''}`,
                  style: libTab === 'trash' ? { background: '#ef4444', color: '#fff', fontWeight: 700 } : {},
                  onClick: () => { setLibTab('trash'); loadTrashCount(); }
                }, `🗑️ Trash (${trashCount})`)
              ),

              // 🎧 AUDIOBOOK SHELF IN LIBRARY
              libTab === 'audio' && h(React.Fragment, null,
                h('div', { className: 'card-title', style: { marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  h('span', { style: { fontWeight: 700 } }, `🎧 Saved Audiobooks (${filteredAudiobooks.length})`),
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
                      h('div', { style: { fontSize: 36, marginBottom: 10 } }, '🎧'),
                      h('p', { style: { fontSize: 13.5, color: 'var(--paper)', fontWeight: 600 } }, libQuery ? 'No saved audiobooks match your search.' : 'Your Audiobook Library is empty.'),
                      h('p', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 6, maxWidth: 360, margin: '6px auto 0', lineHeight: 1.5 } },
                        libQuery ? 'Try another search keyword.' : 'Search for any audiobook in the Import tab and tap "☆ Add to Library" to keep it here for quick listening and downloading!'
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
                                  fontSize: 24
                                }
                              }, '🎧')
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
                                    whiteSpace: 'nowrap'
                                  }
                                }, '🎧 Audiobook')
                              ),
                              h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 2 } }, b.author ? `by ${b.author}` : 'SwiftAudiobooks'),
                              h('div', { style: { fontSize: 11.5, color: 'var(--paper-dim)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                                h('span', null, `📚 ${b.totalTracks || (b.tracks ? b.tracks.length : '?')} chapters`),
                                b.duration && h('span', null, `⏱ ${b.duration}`)
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
                              }, `▶ Resumes at: ${b.lastPlayedTrackTitle}${progressPercent > 0 ? ` (${progressPercent}%)` : ''}`) : null
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
                                padding: '6px 12px'
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
                            }, isCurrentlyPlaying ? '⏸ Now Playing' : (b.lastPlayedTrackIndex ? '▶ Resume Playing' : '▶ Start Listening')),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn ghost',
                              style: { fontWeight: 600, padding: '6px 10px' },
                              onClick: () => handleOpenAudioDownload(b)
                            }, '📥 Download MP3s'),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn danger',
                              style: { marginLeft: 'auto', padding: '6px 10px' },
                              title: 'Remove this audiobook from Library',
                              onClick: () => confirmAction(`Remove "${b.title}" from your Library?`, () => removeAudiobookFromLibrary(b))
                            }, '🗑 Remove')
                          )
                        );
                      })
                    )
              ),

              // 🗑️ RECYCLE BIN SHELF IN LIBRARY
              libTab === 'trash' && h(React.Fragment, null,
                h('div', { className: 'card-title', style: { marginTop: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                  h('span', { style: { fontWeight: 700 } }, `🗑️ Recycle Bin (${trashList.length})`),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    trashList.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '6px 12px' },
                      onClick: () => confirmAction(`Restore all ${trashList.length} deleted novel(s) back into your library?`, handleRestoreAllTrash)
                    }, `↺ Restore All (${trashList.length})`),
                    trashList.length > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '6px 12px' },
                      onClick: () => confirmAction('Permanently delete all items in Recycle Bin? This cannot be undone.', handleEmptyTrash)
                    }, 'Empty Bin')
                  )
                ),
                trashList.length === 0
                  ? h('div', { className: 'card', style: { textAlign: 'center', padding: '44px 16px' } },
                      h('div', { style: { fontSize: 36, marginBottom: 10 } }, '🗑️'),
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
                                fontSize: 22
                              }
                            }, '📖')
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
                            style: { background: '#10b981', color: '#fff', fontWeight: 700, padding: '5px 12px' },
                            onClick: () => handleRestoreNovel(item.id)
                          }, '↺ Restore to Library'),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn danger',
                            style: { padding: '5px 10px' },
                            onClick: () => confirmAction(`Permanently delete "${item.title}"?`, () => handlePermanentDelete(item.id))
                          }, 'Delete Permanently')
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
                    webImportHistory.some(b => b.sourceUrl && b.sourceUrl.startsWith('http')) && h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', border: '1px solid var(--accent, #6366f1)', fontWeight: 600 },
                      disabled: isBatchChecking,
                      onClick: handleCheckAllUpdates,
                      title: 'Scan web sources for novel chapter updates'
                    }, isBatchChecking ? '🔄 Checking…' : '🔄 Check All Updates'),

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
                      onClick: () => confirmAction(`⚠️ WARNING: You are in the 'All' tab. This will move ALL ${webImportHistory.length} novels from every shelf into the Recycle Bin. Proceed?`, () => clearAllNovelHistory())
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
                        h('span', null, isDelta ? '⚡ Novel Update Staged' : '⏸ Paused Translation Session'),
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
                          padding: '7px 16px',
                          border: 'none',
                          borderRadius: 6,
                          boxShadow: isDelta ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none'
                        },
                        onClick: () => {
                          setActiveTab('text');
                          resumeSavedTranslation(s);
                        }
                      }, isDelta ? `▶ Translate New Chapters (${deltaLabel})` : '▶ Resume Translation'),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn danger',
                        onClick: () => discardSavedTranslation(s.id)
                      }, 'Discard')
                    )
                  )
                );
              })(),
              !libCollapsed.books && (displayedBooks.length === 0
                ? h('div', { className: 'card', style: { textAlign: 'center', padding: '44px 16px' } },
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
                        : libTab === 'saved'
                          ? 'Tap "☆ Save to Space" on any book to quickly bookmark it here.'
                          : libTab === 'translated'
                            ? 'Translated books and exported novels will appear here automatically.'
                            : libTab === 'incomplete'
                              ? 'Paused downloads and unfinished crawls will appear here for easy resumption.'
                              : 'Translated books and scraped novels will appear here automatically.'
                    )
                  )
                : h(React.Fragment, null,
                    displayedBooks.map((item, idx) => {
                      const savedProg = window.getReadingProgress ? window.getReadingProgress(item.id || item.title) : null;
                      const resumeCh = (savedProg && typeof savedProg.chapterIdx === 'number') ? (savedProg.chapterIdx + 1) : null;
                      const pct = savedProg?.pct;
                      const isTrans = !!item.isTranslated || (item.title || '').includes('(Translated)');
                      const updateBadge = novelUpdateBadges[item.id];
                      const isLnori = item.sourceUrl && /lnori\.(?:org|com)/i.test(item.sourceUrl);
                      const isUpdating = !!downloadingUpdates[item.id];
                      const unit = updateBadge?.isVolumeBased ? 'Vol' : 'Ch';

                      return h('div', {
                        key: item.id || idx,
                        className: 'book-card',
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          padding: '16px 18px',
                          borderRadius: 16,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--hairline)',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      },
                        // Top section with Cover and Info
                        h('div', { style: { display: 'flex', gap: 14, alignItems: 'flex-start' } },
                          h('div', {
                            style: {
                              width: 68,
                              height: 94,
                              borderRadius: 10,
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))',
                              border: '1px solid rgba(255,255,255,0.08)',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }
                          },
                            item.cover ? h('img', {
                              src: item.cover,
                              alt: item.title || 'Cover',
                              referrerPolicy: 'no-referrer',
                              onError: (e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              },
                              style: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }
                            }) : null,
                            h('div', {
                              style: {
                                display: item.cover ? 'none' : 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                padding: '4px 2px',
                                textAlign: 'center',
                                userSelect: 'none'
                              }
                            },
                              h('span', { style: { fontSize: 24, lineHeight: 1 } }, '📖'),
                              h('span', {
                                style: {
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: 'var(--paper)',
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                  marginTop: 4,
                                  maxWidth: 60,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  opacity: 0.85
                                }
                              }, (item.title || 'Novel').replace(/^[^\w\d\u4e00-\u9fa5\u3040-\u30ff]+/i, '').slice(0, 7))
                            )
                          ),

                          h('div', { style: { flex: 1, minWidth: 0 } },
                            h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 } },
                              h('div', {
                                style: {
                                  fontSize: 15.5,
                                  fontWeight: 700,
                                  color: 'var(--paper)',
                                  lineHeight: 1.35,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                },
                                title: item.title
                              }, item.title || 'Untitled Book'),
                              item.inSavedSpace && h('span', {
                                style: {
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }
                              }, '⭐ Space')
                            ),

                            h('div', { style: { fontSize: 12.5, color: 'var(--slate)', marginTop: 4 } },
                              `${item.author ? `by ${item.author} · ` : ''}${item.chapterCount || 0}${item.totalChapterCount ? ` / ${item.totalChapterCount}` : ''} chapters${item.volumeCount ? ` · ${item.volumeCount} vols` : ''}`
                            ),

                            // Badges row
                            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 } },
                              resumeCh ? h('span', {
                                style: {
                                  fontSize: 11,
                                  color: 'var(--iris)',
                                  fontWeight: 600,
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  padding: '2px 8px',
                                  borderRadius: 6
                                }
                              }, `📖 Ch. ${resumeCh}${pct ? ` (${pct}%)` : ''}`) : null,

                              updateBadge && h('span', {
                                style: {
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: 'rgba(59, 130, 246, 0.25)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }
                              }, `+${updateBadge.newCount} ${unit} New`),

                              item.isIncomplete ? h('span', {
                                style: {
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: 'rgba(234, 179, 8, 0.15)',
                                  color: '#eab308',
                                  border: '1px solid rgba(234, 179, 8, 0.3)',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }
                              }, `⏸ Incomplete (${item.chapterCount}/${item.totalChapterCount || '?'} ch)`) : (
                                isTrans && h('span', {
                                  style: {
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                  }
                                }, '✓ Translated')
                              )
                            )
                          )
                        ),

                        // Bottom Action Row (Touch-Friendly Apple Pill Buttons)
                        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 } },
                          // Update Action if available
                          updateBadge && (() => {
                            return h(React.Fragment, null,
                              !isLnori && h('button', {
                                type: 'button',
                                className: 'mini-btn',
                                disabled: isUpdating || checkingUpdates[item.id],
                                style: {
                                  background: isUpdating ? 'var(--hairline)' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                  color: isUpdating ? 'var(--slate)' : '#fff',
                                  fontWeight: 700,
                                  height: 38,
                                  padding: '0 14px',
                                  borderRadius: 10,
                                  boxShadow: isUpdating ? 'none' : '0 2px 8px rgba(124, 58, 237, 0.35)',
                                  cursor: isUpdating ? 'not-allowed' : 'pointer'
                                },
                                onClick: (e) => {
                                  e?.stopPropagation?.();
                                  if (!isUpdating) handleUpdateTranslateAndMakeEpub(item);
                                },
                                title: 'Fetch new chapters, preserve existing translations, and stage in Translator'
                              }, isUpdating ? '⏳ Fetching…' : `⚡ Stage New (+${updateBadge.newCount})`),
                              h('button', {
                                type: 'button',
                                className: isLnori ? 'mini-btn' : 'mini-btn ghost',
                                disabled: isUpdating || checkingUpdates[item.id],
                                style: {
                                  background: isUpdating ? 'var(--hairline)' : (isLnori ? 'linear-gradient(90deg, #6366f1, #10b981)' : undefined),
                                  borderColor: isUpdating ? 'transparent' : (isLnori ? 'transparent' : 'rgba(34, 197, 94, 0.4)'),
                                  color: isUpdating ? 'var(--slate)' : (isLnori ? '#fff' : '#22c55e'),
                                  fontWeight: 700,
                                  height: 38,
                                  padding: '0 12px',
                                  borderRadius: 10,
                                  cursor: isUpdating ? 'not-allowed' : 'pointer'
                                },
                                onClick: (e) => {
                                  e?.stopPropagation?.();
                                  if (!isUpdating) handleDownloadNewChapters(item);
                                }
                              }, isUpdating
                                ? '⏳ Fetching…'
                                : (isLnori
                                  ? `⚡ Download Clean EPUB (+${updateBadge.newCount} ${unit})`
                                  : `📥 Download Raw (+${updateBadge.newCount})`))
                            );
                          })(),

                          // Primary: Read button
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            style: {
                              background: 'var(--accent, #6366f1)',
                              color: '#fff',
                              fontWeight: 700,
                              height: 38,
                              padding: '0 16px',
                              borderRadius: 10,
                              fontSize: 13,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            },
                            onClick: async () => {
                              const full = await loadFullNovel(item);
                              if (!full) { toast('Novel data not found in local store.', 'error'); return; }
                              const chs = (full.translatedChapters && full.translatedChapters.length > 0)
                                ? full.translatedChapters
                                : (full.rawChapters || full.chapters || []);
                              if (chs.length === 0) { toast('No chapters available to read.', 'warning'); return; }
                              const cleanCh = (c) => {
                                const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
                                const raw = c?.text || c?.content || '';
                                return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
                              };
                              const cleanedChs = chs.map(c => ({ title: c.title, content: cleanCh(c) }));
                              if (isTrans) {
                                setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
                                setTranslatedChapters(cleanedChs);
                                if (full.originalChapters && full.originalChapters.length > 0) {
                                  const srcChs = full.originalChapters;
                                  setInputText(srcChs.map(c => `# ${c.title}\n\n${cleanCh(c)}`).join('\n\n'));
                                  setChapters(srcChs.map(c => ({ title: c.title, content: cleanCh(c) })));
                                } else {
                                  setInputText('');
                                  setChapters([]);
                                }
                              } else {
                                setChapters(cleanedChs);
                                setInputText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
                                setAssembledText('');
                                setTranslatedChapters([]);
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
                            }
                          }, '📖 Read'),

                          // Secondary: ⚡ Continue Ongoing
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: {
                              borderColor: 'rgba(16, 185, 129, 0.4)',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.08)',
                              fontWeight: 700,
                              height: 38,
                              padding: '0 14px',
                              borderRadius: 10,
                              fontSize: 12.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
                            },
                            title: 'Search online sources and continue fetching new chapters for this book',
                            onClick: () => handleOpenContinuationForNovel(item)
                          }, '⚡ Continue'),

                          // Download EPUB
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: {
                              borderColor: 'var(--hairline)',
                              color: 'var(--paper)',
                              fontWeight: 600,
                              height: 38,
                              padding: '0 12px',
                              borderRadius: 10,
                              fontSize: 12
                            },
                            onClick: async () => {
                              const full = await loadFullNovel(item);
                              if (!full) { toast('Novel data not found in local store.', 'error'); return; }
                              const chs = (full.translatedChapters && full.translatedChapters.length > 0)
                                ? full.translatedChapters
                                : (full.rawChapters || full.chapters || []);
                              if (chs.length === 0) { toast('No chapters found in saved novel.', 'warning'); return; }
                              const bookTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(item.title, chs) : (item.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                              const bookAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(item.author) : (item.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                              const isInc = item.isIncomplete || (item.totalChapterCount && chs.length < item.totalChapterCount);
                              try {
                                if (full.epubBlob && !full.isEdited && !item?.isEdited) {
                                  const epubFileName = getEpubFileName(bookTitle, chs.length, isInc);
                                  await saveUniversalBlob(full.epubBlob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(item || full));
                                  toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                                  return;
                                }
                                const cleanBT = String(bookTitle).replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                                const matchingOriginal = (webImportHistory || []).find(n => {
                                  const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                                  return nt && (nt === cleanBT || cleanBT.includes(nt) || nt.includes(cleanBT)) && n.cover;
                                });
                                const resolvedCover = item.cover || full?.cover || matchingOriginal?.cover || (typeof currentDocCover !== 'undefined' ? currentDocCover : '') || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';
                                setEpubPackagingModal({ title: bookTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                                const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: item.id || item.sourceUrl || bookTitle, title: bookTitle, coverUrl: resolvedCover }) : { novelId: item.id, title: bookTitle, coverUrl: resolvedCover };
                                const blob = await generateEpubFromChapters(chs, bookTitle, bookAuthor, full.targetLang || 'en', (status, pct, elapsed) => {
                                  setEpubPackagingModal({ title: bookTitle, status, pct, elapsed });
                                }, opts);
                                const epubFileName = getEpubFileName(bookTitle, chs.length, isInc);
                                await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(item || full));
                                toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                              } catch (e) {
                                toast('EPUB export error: ' + e.message, 'error');
                              } finally {
                                setEpubPackagingModal(null);
                              }
                            }
                          }, (item.hasTranslatedChapters || item.isTranslated || (item.title || '').includes('(Translated)')) ? '📥 EPUB (Trans)' : '📥 EPUB'),

                          // Check updates button
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            disabled: !!checkingUpdates[item.id],
                            style: {
                              height: 38,
                              width: 38,
                              padding: 0,
                              borderRadius: 10,
                              borderColor: checkingUpdates[item.id] ? 'var(--accent, #6366f1)' : 'var(--hairline)',
                              color: checkingUpdates[item.id] ? 'var(--accent, #6366f1)' : 'var(--paper)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: checkingUpdates[item.id] ? 'wait' : 'pointer',
                              marginLeft: 'auto'
                            },
                            title: checkingUpdates[item.id] ? 'Checking web source for new chapters…' : 'Check for new online chapters',
                            onClick: (e) => {
                              e?.stopPropagation?.();
                              handleCheckNovelUpdate(item);
                            }
                          },
                            h('span', {
                              style: {
                                display: 'inline-block',
                                animation: checkingUpdates[item.id] ? 'spin 0.85s linear infinite' : 'none',
                                fontSize: 13
                              }
                            }, '🔄')
                          ),

                          // More options button (⋮)
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: {
                              height: 38,
                              width: 38,
                              padding: 0,
                              borderRadius: 10,
                              fontSize: 16,
                              fontWeight: 700,
                              borderColor: 'var(--hairline)',
                              color: 'var(--paper)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            },
                            title: 'More options for this novel',
                            onClick: (e) => {
                              e?.stopPropagation?.();
                              setActiveBookMenuNovel(item);
                            }
                          }, '⋮')
                        )
                      );
                    })
                  )),
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
