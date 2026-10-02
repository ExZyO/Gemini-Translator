(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const getH = () => (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
  const getToast = () => (window.toast || function() {});

  // ─────────────────────────────────────────────────────────────────────────
  function SwiftAudioPlayer(props) {
    const {
      audioPlayerState,
      amoledMode,
      isFullPlayerOpen,
      setIsFullPlayerOpen,
      isPlayerFullscreen,
      setIsPlayerFullscreen,
      isAudiobookInLibrary,
      saveAudiobookToLibrary,
      removeAudiobookFromLibrary,
      handleOpenAudioDownload,
      downloadingTrackId,
      setDownloadingTrackId,
      audioDownloadModal,
      setAudioDownloadModal,
      getNovelFolderOptions,
      handleExecuteAudioBatchDownload
    } = props;
    const h = getH();
    const toast = getToast();
    const ReactComp = typeof React !== 'undefined' ? React : window.React;

    const hasMini = !!(audioPlayerState?.currentBook);
    const hasFull = !!(isFullPlayerOpen && audioPlayerState?.currentBook);
    const hasBgDl = !!(audioDownloadModal?.active && audioDownloadModal?.isMinimized);
    const hasModalDl = !!(audioDownloadModal && !audioDownloadModal.isMinimized);

    if (!hasMini && !hasFull && !hasBgDl && !hasModalDl) return null;

    return h(ReactComp.Fragment, null,
      // 1. Floating Mini-Player
      hasMini && h('div', {
        className: 'swift-mini-player',
        style: {
          position: 'fixed',
          bottom: 58,
          left: 0,
          right: 0,
          height: 60,
          background: amoledMode ? '#000000' : 'rgba(15, 23, 42, 0.96)',
          borderTop: '1px solid var(--hairline)',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          zIndex: 995,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.45)',
          cursor: 'pointer'
        },
        onClick: () => setIsFullPlayerOpen(true)
      },
        audioPlayerState.currentBook.cover ? h('img', {
          src: audioPlayerState.currentBook.cover,
          alt: 'Cover',
          referrerPolicy: 'no-referrer',
          onError: (e) => { e.target.style.display = 'none'; },
          style: { width: 42, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }
        }) : h('div', {
          style: { width: 42, height: 42, borderRadius: 6, background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }
        }, '🎧'),

        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
            audioPlayerState.currentTrack?.title || audioPlayerState.currentBook.title
          ),
          h('div', { style: { fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', null, `${audioPlayerState.currentTrackIndex + 1}/${audioPlayerState.totalTracks || 1}`),
            h('span', null, '•'),
            h('span', null, `${window.SwiftAudioEngine?.formatDuration(audioPlayerState.currentTime) || '0:00'} / ${window.SwiftAudioEngine?.formatDuration(audioPlayerState.duration) || '0:00'}`)
          )
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 }, onClick: e => e.stopPropagation() },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 11, fontWeight: 700 },
            title: 'Skip back 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
          }, '-5s'),

          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              padding: 0
            },
            title: audioPlayerState.isPlaying ? 'Pause' : 'Play',
            onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
          }, audioPlayerState.isPlaying ? '⏸' : '▶'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 11, fontWeight: 700 },
            title: 'Skip forward 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
          }, '+5s'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 13 },
            title: 'Next Chapter',
            onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
          }, '⏭'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 12 },
            title: 'Open full audiobook player',
            onClick: () => setIsFullPlayerOpen(true)
          }, '▲'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 13, color: 'var(--slate)' },
            title: 'Close and stop player',
            onClick: (e) => {
              e.stopPropagation();
              window.SwiftAudioEngine?.Player?.close();
            }
          }, '✕')
        )
      ),

      // 2. Full Player Modal
      hasFull && h('div', {
        className: 'modal-overlay',
        style: {
          zIndex: 1000,
          alignItems: isPlayerFullscreen ? 'center' : 'flex-end',
          padding: 0,
          background: isPlayerFullscreen ? '#0b0f19' : 'rgba(0, 0, 0, 0.75)'
        },
        onClick: () => setIsFullPlayerOpen(false)
      },
        h('div', {
          className: 'modal-box swift-player-drawer',
          style: {
            maxWidth: isPlayerFullscreen ? '100%' : 480,
            width: '100%',
            height: isPlayerFullscreen ? '100%' : 'auto',
            maxHeight: isPlayerFullscreen ? '100vh' : '92vh',
            borderTopLeftRadius: isPlayerFullscreen ? 0 : 18,
            borderTopRightRadius: isPlayerFullscreen ? 0 : 18,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            overflowX: 'hidden',
            boxSizing: 'border-box'
          },
          onClick: e => e.stopPropagation()
        },
          !isPlayerFullscreen && h('div', {
            style: {
              width: 38,
              height: 4,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.25)',
              margin: '10px auto 2px',
              flexShrink: 0,
              cursor: 'pointer'
            },
            title: 'Double-tap to toggle fullscreen',
            onDoubleClick: () => setIsPlayerFullscreen(prev => !prev)
          }),
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--hairline)'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '4px 8px', fontSize: 13, fontWeight: 700 },
                title: 'Minimize player to bottom',
                onClick: () => setIsFullPlayerOpen(false)
              }, '▼'),
              h('div', null,
                h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Audiobook Player'),
                h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, isPlayerFullscreen ? 'Fullscreen Mode' : 'Powered by Open-Source Plyr')
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              (() => {
                const inLib = isAudiobookInLibrary ? isAudiobookInLibrary(audioPlayerState.currentBook) : false;
                return h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: {
                    padding: '4px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: inLib ? '#f59e0b' : 'var(--paper)',
                    borderColor: inLib ? '#f59e0b' : 'var(--hairline)'
                  },
                  title: inLib ? 'Saved in Library (tap to remove)' : 'Add audiobook to Library',
                  onClick: () => {
                    if (inLib) {
                      if (removeAudiobookFromLibrary) removeAudiobookFromLibrary(audioPlayerState.currentBook);
                    } else {
                      if (saveAudiobookToLibrary) saveAudiobookToLibrary(audioPlayerState.currentBook);
                    }
                  }
                }, inLib ? '⭐ In Library' : '☆ Add to Library');
              })(),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '4px 8px', fontSize: 13 },
                title: isPlayerFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player',
                onClick: () => setIsPlayerFullscreen(prev => !prev)
              }, isPlayerFullscreen ? '🗗' : '⛶'),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', fontSize: 16, color: 'var(--slate)' },
                title: 'Close and stop player',
                onClick: () => {
                  setIsFullPlayerOpen(false);
                  window.SwiftAudioEngine?.Player?.close();
                }
              }, '✕')
            )
          ),

          h('div', { style: { padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', flex: 1, boxSizing: 'border-box' } },
            h('div', { style: { textAlign: 'center', marginBottom: 14 } },
              audioPlayerState.currentBook.cover ? h('img', {
                src: audioPlayerState.currentBook.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: { width: isPlayerFullscreen ? 180 : 160, height: isPlayerFullscreen ? 260 : 230, borderRadius: 12, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', margin: '0 auto' }
              }) : h('div', {
                style: { width: 160, height: 210, borderRadius: 12, background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, margin: '0 auto' }
              }, '🎧')
            ),

            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--paper)', lineHeight: 1.3 } }, audioPlayerState.currentBook.title),
              h('div', { style: { fontSize: 12.5, color: 'var(--slate)', marginTop: 4 } }, audioPlayerState.currentBook.author ? `by ${audioPlayerState.currentBook.author}` : 'SwiftAudiobooks'),
              h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--accent, #6366f1)', marginTop: 4 } },
                audioPlayerState.currentTrack?.title || `Track ${audioPlayerState.currentTrackIndex + 1}`
              )
            ),

            h('div', { style: { marginBottom: 12 } },
              h('input', {
                type: 'range',
                min: 0,
                max: audioPlayerState.duration || 100,
                step: 0.5,
                value: audioPlayerState.currentTime || 0,
                onChange: e => window.SwiftAudioEngine?.Player?.seekTo(parseFloat(e.target.value)),
                style: { width: '100%', accentColor: 'var(--accent, #6366f1)', cursor: 'pointer' }
              }),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 } },
                h('span', null, window.SwiftAudioEngine?.formatDuration(audioPlayerState.currentTime) || '0:00'),
                h('span', null, window.SwiftAudioEngine?.formatDuration(audioPlayerState.duration) || '0:00')
              )
            ),

            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 16, padding: '8px 12px' },
                title: 'Previous Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.previousTrack()
              }, '⏮'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 12, fontWeight: 700, padding: '8px 12px' },
                title: 'Rewind 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
              }, '-5s'),

              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'var(--accent, #6366f1)',
                  color: '#fff',
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                },
                title: audioPlayerState.isPlaying ? 'Pause' : 'Play',
                onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
              }, audioPlayerState.isPlaying ? '⏸' : '▶'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 12, fontWeight: 700, padding: '8px 12px' },
                title: 'Forward 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
              }, '+5s'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 16, padding: '8px 12px' },
                title: 'Next Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
              }, '⏭')
            ),

            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', gap: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'Speed:'),
                [0.75, 1.0, 1.25, 1.5, 2.0].map(sp => h('button', {
                  key: sp,
                  type: 'button',
                  className: `mini-btn ${audioPlayerState.playbackRate === sp ? '' : 'ghost'}`,
                  style: {
                    padding: '4px 7px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: audioPlayerState.playbackRate === sp ? 'var(--accent, #6366f1)' : 'transparent',
                    color: audioPlayerState.playbackRate === sp ? '#fff' : 'var(--paper-dim)'
                  },
                  onClick: () => window.SwiftAudioEngine?.Player?.setPlaybackRate(sp)
                }, `${sp}x`))
              ),

              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'Sleep:'),
                h('select', {
                  value: audioPlayerState.sleepAtEndOfChapter ? 'end_of_chapter' : (audioPlayerState.sleepTimerRemainingSeconds ? String(Math.ceil(audioPlayerState.sleepTimerRemainingSeconds / 60)) : 'off'),
                  onChange: e => {
                    const val = e.target.value;
                    if (val === 'off') window.SwiftAudioEngine?.Player?.clearSleepTimer();
                    else window.SwiftAudioEngine?.Player?.setSleepTimer(val);
                  },
                  style: { background: 'var(--bg)', color: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '4px 6px', fontSize: 11 }
                },
                  h('option', { value: 'off' }, 'Off'),
                  h('option', { value: '15' }, '15 min'),
                  h('option', { value: '30' }, '30 min'),
                  h('option', { value: '45' }, '45 min'),
                  h('option', { value: '60' }, '60 min'),
                  h('option', { value: 'end_of_chapter' }, 'End of Chapter')
                )
              )
            ),

            h('div', { style: { marginTop: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--paper)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('span', null, `Chapters (${audioPlayerState.totalTracks})`),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { fontSize: 11, padding: '3px 8px' },
                  onClick: () => handleOpenAudioDownload && handleOpenAudioDownload(audioPlayerState.currentBook)
                }, '📥 Download MP3s')
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: isPlayerFullscreen ? 360 : 180, overflowY: 'auto' } },
                (audioPlayerState.currentBook.tracks || []).map((t, idx) => {
                  const isCur = idx === audioPlayerState.currentTrackIndex;
                  return h('div', {
                    key: idx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isCur ? 'rgba(99, 102, 241, 0.15)' : 'var(--panel)',
                      border: isCur ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                      cursor: 'pointer'
                    },
                    onClick: () => window.SwiftAudioEngine?.Player?.playTrack(idx)
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                      h('span', { style: { fontSize: 11, color: isCur ? 'var(--accent, #6366f1)' : 'var(--slate)', width: 22, fontWeight: 700 } }, `${idx + 1}`),
                      h('span', { style: { fontSize: 12, color: isCur ? 'var(--accent, #6366f1)' : 'var(--paper)', fontWeight: isCur ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.title)
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
                      t.duration && h('span', { style: { fontSize: 11, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" } }, t.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '3px 6px', fontSize: 11, color: downloadingTrackId === idx ? '#fbbf24' : 'var(--slate)' },
                        title: `Download Track ${idx + 1}: ${t.title}`,
                        disabled: downloadingTrackId === idx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(idx);
                            toast(`Downloading Track ${idx + 1}: "${t.title}"…`, 'info');
                            const fOpts = getNovelFolderOptions ? getNovelFolderOptions(audioPlayerState.currentBook) : {};
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(t, audioPlayerState.currentBook, fOpts);
                            toast(`Downloaded Track ${idx + 1}: "${t.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === idx ? '⏳' : '📥'),
                      isCur && h('span', { style: { fontSize: 11, color: 'var(--accent, #6366f1)' } }, audioPlayerState.isPlaying ? '▶' : '⏸')
                    )
                  );
                })
              )
            )
          )
        )
      ),

      // 3. Background Download Progress Bar
      hasBgDl && h('div', {
        style: {
          position: 'fixed',
          bottom: audioPlayerState?.currentBook ? 122 : 62,
          left: 12,
          right: 12,
          maxWidth: 480,
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 12,
          padding: '10px 14px',
          zIndex: 998,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        },
        onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: false }))
      },
        h('span', { style: { fontSize: 18 } }, '📥'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--paper)' } },
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, audioDownloadModal.status || 'Downloading audio tracks...'),
            h('span', { style: { fontFamily: 'monospace', color: 'var(--accent, #6366f1)', marginLeft: 8 } }, `${audioDownloadModal.percent || 0}%`)
          ),
          h('div', { style: { width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 6 } },
            h('div', { style: { height: '100%', width: `${audioDownloadModal.percent || 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
          )
        ),
        h('span', { style: { fontSize: 11, color: 'var(--accent, #6366f1)', fontWeight: 600, flexShrink: 0 } }, 'Expand ↗')
      ),

      // 4. Batch Download Modal
      hasModalDl && h('div', {
        className: 'modal-overlay',
        style: { zIndex: 1050, background: 'rgba(0, 0, 0, 0.85)' },
        onClick: () => {
          if (audioDownloadModal.active) {
            setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }));
          } else {
            setAudioDownloadModal(null);
          }
        }
      },
        h('div', {
          className: 'modal-box',
          style: { maxWidth: 460, width: '92%', maxHeight: '88vh', boxSizing: 'border-box', overflowX: 'hidden' },
          onClick: e => e.stopPropagation()
        },
          h('div', { className: 'modal-hd' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 20 } }, '📥'),
              h('span', { className: 't' }, 'Download Audiobook MP3s')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              audioDownloadModal.active && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 11, padding: '3px 8px' },
                title: 'Continue downloading in background',
                onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }))
              }, 'Run in Background ─'),
              h('button', {
                type: 'button',
                className: 'x-btn',
                title: audioDownloadModal.active ? 'Run in background' : 'Close',
                onClick: () => {
                  if (audioDownloadModal.active) {
                    setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }));
                  } else {
                    setAudioDownloadModal(null);
                  }
                }
              }, '✕')
            )
          ),
          h('div', { className: 'modal-bd' },
            h('div', { style: { display: 'flex', gap: 12, marginBottom: 12 } },
              audioDownloadModal.book?.cover && h('img', {
                src: audioDownloadModal.book.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: { width: 56, height: 80, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }
              }),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--paper)' } }, audioDownloadModal.book?.title || 'Audiobook'),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } }, `Total: ${audioDownloadModal.book?.tracks?.length || 0} tracks`),
                h('div', { style: { fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 } }, 'Direct storage stream • Background safe')
              )
            ),

            h('div', { style: { background: 'var(--panel)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--hairline)', marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--slate)' } }, 'SAVE LOCATION'),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { fontSize: 10.5, padding: '2px 6px' },
                  disabled: audioDownloadModal.active,
                  onClick: async () => {
                    if (window.NativeBridge && window.NativeBridge.chooseFolder) {
                      const res = await window.NativeBridge.chooseFolder();
                      if (res && res.treeUri) {
                        setAudioDownloadModal(prev => ({
                          ...prev,
                          folderOptions: { treeUri: res.treeUri, folderPath: res.displayPath }
                        }));
                        toast(`Bound to ${res.displayPath}!`, 'success');
                      }
                    } else {
                      const cur = audioDownloadModal.folderOptions?.folderPath || `Audiobooks/${audioDownloadModal.book?.title}`;
                      const p = window.prompt('Enter folder path for audiobook:', cur);
                      if (p !== null && p.trim()) {
                        setAudioDownloadModal(prev => ({
                          ...prev,
                          folderOptions: { subDir: p.trim(), folderPath: p.trim() }
                        }));
                      }
                    }
                  }
                }, '📁 Change Folder')
              ),
              h('div', { style: { fontSize: 11.5, fontFamily: 'monospace', color: 'var(--paper)', wordBreak: 'break-all' } },
                audioDownloadModal.folderOptions?.folderPath || `Download/GeminiTranslator/Audiobooks/${audioDownloadModal.book?.title}`
              )
            ),

            // Chapter checklist selector
            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                h('span', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--paper)' } },
                  `Select Chapters (${(audioDownloadModal.selectedIndices || []).length}/${audioDownloadModal.book?.tracks?.length || 0})`
                ),
                !audioDownloadModal.active && h('div', { style: { display: 'flex', gap: 6 } },
                  h('button', {
                    type: 'button',
                    className: 'mini-btn ghost',
                    style: { fontSize: 10.5, padding: '2px 6px' },
                    onClick: () => {
                      const allIdx = (audioDownloadModal.book?.tracks || []).map((_, i) => i);
                      const isAll = (audioDownloadModal.selectedIndices || []).length === allIdx.length;
                      setAudioDownloadModal(prev => ({
                        ...prev,
                        selectedIndices: isAll ? [] : allIdx
                      }));
                    }
                  }, (audioDownloadModal.selectedIndices || []).length === (audioDownloadModal.book?.tracks?.length || 0) ? 'Deselect All' : 'Select All')
                )
              ),
              h('div', { style: { maxHeight: 160, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--hairline)', borderRadius: 6, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2 } },
                (audioDownloadModal.book?.tracks || []).map((track, tIdx) => {
                  const isChecked = (audioDownloadModal.selectedIndices || []).includes(tIdx);
                  return h('div', {
                    key: tIdx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: 4,
                      background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      fontSize: 11.5
                    }
                  },
                    h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: audioDownloadModal.active ? 'default' : 'pointer', minWidth: 0, flex: 1 } },
                      h('input', {
                        type: 'checkbox',
                        checked: isChecked,
                        disabled: audioDownloadModal.active,
                        onChange: () => {
                          setAudioDownloadModal(prev => {
                            const cur = prev.selectedIndices || [];
                            const next = isChecked ? cur.filter(i => i !== tIdx) : [...cur, tIdx];
                            return { ...prev, selectedIndices: next };
                          });
                        },
                        style: { accentColor: 'var(--accent, #6366f1)', cursor: audioDownloadModal.active ? 'default' : 'pointer' }
                      }),
                      h('span', { style: { color: isChecked ? 'var(--paper)' : 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        `${tIdx + 1}. ${track.title}`
                      )
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
                      track.duration && h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, track.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '2px 5px', fontSize: 10.5, color: downloadingTrackId === tIdx ? '#fbbf24' : 'var(--slate)' },
                        title: `Download ${track.title}`,
                        disabled: audioDownloadModal.active || downloadingTrackId === tIdx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(tIdx);
                            toast(`Downloading "${track.title}"…`, 'info');
                            const fOpts = audioDownloadModal.folderOptions || (getNovelFolderOptions ? getNovelFolderOptions(audioDownloadModal.book) : {});
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(track, audioDownloadModal.book, fOpts);
                            toast(`Downloaded "${track.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === tIdx ? '⏳' : '📥')
                    )
                  );
                })
              )
            ),

            h('div', { style: { marginBottom: 8 } },
              h('div', { style: { fontSize: 11.5, color: 'var(--paper-dim)', marginBottom: 4 } }, audioDownloadModal.status || 'Ready'),
              h('div', { style: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: `${Math.min(100, Math.max(0, audioDownloadModal.percent || 0))}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
              )
            )
          ),
          h('div', { className: 'modal-ft' },
            audioDownloadModal.active ? [
              h('button', {
                key: 'bg',
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
                onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }))
              }, 'Run in Background ─'),
              h('button', {
                key: 'cancel',
                type: 'button',
                className: 'mini-btn danger',
                onClick: () => {
                  window.SwiftAudioEngine?.Downloader?.cancel();
                  toast('Cancelling download…', 'info');
                }
              }, '✕ Cancel Download')
            ] : [
              h('button', {
                key: 'close',
                type: 'button',
                className: 'mini-btn ghost',
                onClick: () => setAudioDownloadModal(null)
              }, 'Close'),
              h('button', {
                key: 'start',
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700 },
                onClick: handleExecuteAudioBatchDownload
              }, `⚡ Download Selected (${(audioDownloadModal.selectedIndices || []).length})`)
            ]
          )
        )
      )
    );
  }

  return { SwiftAudioPlayer };
}));
