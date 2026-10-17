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
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    const h = getH();
    return h ? h('span', { className: cls }, '') : null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MODERN GLASS AUDIOBOOK PLAYER & DOWNLOAD SUITE
  // Sleek glass cards, subtle glowing accents, clean typography, strictly NO emojis
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
    const [scrubTime, setScrubTime] = (ReactComp?.useState || window.React?.useState)(null);

    const hasMini = !!(audioPlayerState?.currentBook);
    const hasFull = !!(isFullPlayerOpen && audioPlayerState?.currentBook);
    const hasBgDl = !!(audioDownloadModal?.active && audioDownloadModal?.isMinimized);
    const hasModalDl = !!(audioDownloadModal && !audioDownloadModal.isMinimized);

    if (!hasMini && !hasFull && !hasBgDl && !hasModalDl) return null;

    const currentBook = audioPlayerState?.currentBook || {};
    const currentTrack = audioPlayerState?.currentTrack || (currentBook.tracks ? currentBook.tracks[audioPlayerState?.currentTrackIndex || 0] : null);
    const currentTime = audioPlayerState?.currentTime || 0;
    const duration = audioPlayerState?.duration || 0;
    const displayTime = scrubTime !== null ? scrubTime : currentTime;
    const isPlaying = !!audioPlayerState?.isPlaying;
    const playbackRate = audioPlayerState?.playbackRate || 1.0;
    const currentTrackIndex = audioPlayerState?.currentTrackIndex || 0;
    const totalTracks = audioPlayerState?.totalTracks || (currentBook.tracks ? currentBook.tracks.length : 1);
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

    const glassCardBg = amoledMode ? 'rgba(0, 0, 0, 0.94)' : 'rgba(15, 23, 42, 0.90)';
    const glassCardBorder = '1px solid rgba(255, 255, 255, 0.10)';

    return h(ReactComp.Fragment, null,
      // ══════════════════════════════════════════════════════════════════════
      // 1. SLEEK FLOATING GLASS MINI-PLAYER
      // ══════════════════════════════════════════════════════════════════════
      hasMini && h('div', {
        className: 'swift-mini-player',
        style: {
          position: 'fixed',
          bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          height: 62,
          background: glassCardBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.10)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          zIndex: 995,
          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.55)',
          cursor: 'pointer',
          overflow: 'hidden'
        },
        onClick: () => setIsFullPlayerOpen(true)
      },
        // Precision Progress Line along the top edge
        h('div', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2.5,
            background: 'rgba(255, 255, 255, 0.08)'
          }
        },
          h('div', {
            style: {
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.7)',
              transition: 'width 0.25s linear'
            }
          })
        ),

        // Cover Thumbnail or Fallback Icon
        currentBook.cover ? h('img', {
          src: currentBook.cover,
          alt: 'Cover',
          referrerPolicy: 'no-referrer',
          onError: (e) => { e.target.style.display = 'none'; },
          style: {
            width: 44,
            height: 44,
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }
        }) : h('div', {
          style: {
            width: 44,
            height: 44,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }
        }, ic('Headphones', 22, 'text-indigo-400')),

        // Track & Chapter Info
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', {
            style: {
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--paper)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em'
            }
          },
            currentTrack?.title || currentBook.title
          ),
          h('div', {
            style: {
              fontSize: 11,
              color: 'var(--slate)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2
            }
          },
            h('span', null, `Chapter ${currentTrackIndex + 1}/${totalTracks}`),
            h('span', { style: { opacity: 0.5 } }, '|'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } },
              `${window.SwiftAudioEngine?.formatDuration(currentTime) || '0:00'} / ${window.SwiftAudioEngine?.formatDuration(duration) || '0:00'}`
            )
          )
        ),

        // Controls
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 }, onClick: e => e.stopPropagation() },
          // Fine -5s Skip Button
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: {
              padding: '5px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--paper)'
            },
            title: 'Skip back 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
          }, '-5s'),

          // Instant Play/Pause Button
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              boxShadow: '0 0 14px rgba(99, 102, 241, 0.45)'
            },
            title: isPlaying ? 'Pause' : 'Play',
            onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
          }, isPlaying ? ic('Pause', 18) : ic('Play', 18)),

          // Fine +5s Skip Button
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: {
              padding: '5px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--paper)'
            },
            title: 'Skip forward 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
          }, '+5s'),

          // Next Chapter
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)' },
            title: 'Next Chapter',
            onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
          }, ic('SkipForward', 15)),

          // Expand Full Player
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' },
            title: 'Open full audiobook player',
            onClick: () => setIsFullPlayerOpen(true)
          }, ic('ChevronUp', 16)),

          // Close
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 7px', color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            title: 'Close and stop player',
            onClick: (e) => {
              e.stopPropagation();
              window.SwiftAudioEngine?.Player?.close();
            }
          }, ic('X', 15))
        )
      ),

      // ══════════════════════════════════════════════════════════════════════
      // 2. FULL GLASS AUDIOBOOK PLAYER MODAL
      // ══════════════════════════════════════════════════════════════════════
      hasFull && h('div', {
        className: 'modal-overlay',
        style: {
          zIndex: 1000,
          alignItems: isPlayerFullscreen ? 'center' : 'flex-end',
          padding: 0,
          background: isPlayerFullscreen ? (amoledMode ? '#000000' : '#0b0f19') : 'rgba(0, 0, 0, 0.82)',
          backdropFilter: isPlayerFullscreen ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isPlayerFullscreen ? 'none' : 'blur(20px)'
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
            background: amoledMode ? '#000000' : 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: glassCardBorder,
            borderTopLeftRadius: isPlayerFullscreen ? 0 : 22,
            borderTopRightRadius: isPlayerFullscreen ? 0 : 22,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.75), 0 0 40px rgba(99, 102, 241, 0.10)'
          },
          onClick: e => e.stopPropagation()
        },
          // Drag handle pill (when not fullscreen)
          !isPlayerFullscreen && h('div', {
            style: {
              width: 40,
              height: 4,
              borderRadius: 99,
              background: 'rgba(255, 255, 255, 0.20)',
              margin: '10px auto 2px',
              flexShrink: 0,
              cursor: 'pointer'
            },
            title: 'Double-tap to toggle fullscreen',
            onDoubleClick: () => setIsPlayerFullscreen(prev => !prev)
          }),

          // Header
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                title: 'Minimize player to bottom',
                onClick: () => setIsFullPlayerOpen(false)
              }, ic('ChevronDown', 17)),
              h('div', null,
                h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)', letterSpacing: '-0.01em' } }, 'Audiobook Player'),
                h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, isPlayerFullscreen ? 'Fullscreen Mode' : 'Poweramp Studio Edition')
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              // Save to Library Toggle
              (() => {
                const inLib = isAudiobookInLibrary ? isAudiobookInLibrary(currentBook) : false;
                return h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: {
                    padding: '5px 9px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: inLib ? '#f59e0b' : 'var(--paper)',
                    borderColor: inLib ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
                    background: inLib ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  },
                  title: inLib ? 'Saved in Library (tap to remove)' : 'Add audiobook to Library',
                  onClick: () => {
                    if (inLib) {
                      if (removeAudiobookFromLibrary) removeAudiobookFromLibrary(currentBook);
                    } else {
                      if (saveAudiobookToLibrary) saveAudiobookToLibrary(currentBook);
                    }
                  }
                },
                  ic('Star', 13, inLib ? 'text-amber-400' : 'text-slate-400'),
                  inLib ? 'In Library' : 'Add to Library'
                );
              })(),

              // Quick Poweramp Launcher Pill
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.20)',
                  border: '1px solid rgba(99, 102, 241, 0.45)',
                  color: '#a5b4fc',
                  borderRadius: 99,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.20)'
                },
                title: 'Open in Poweramp player on Android',
                onClick: () => window.SwiftAudioEngine?.Player?.openInPoweramp()
              },
                ic('ExternalLink', 12),
                'Poweramp'
              ),

              // Fullscreen Toggle
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                title: isPlayerFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player',
                onClick: () => setIsPlayerFullscreen(prev => !prev)
              }, isPlayerFullscreen ? ic('Minimize2', 15) : ic('Maximize2', 15)),

              // Close
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                title: 'Close and stop player',
                onClick: () => {
                  setIsFullPlayerOpen(false);
                  window.SwiftAudioEngine?.Player?.close();
                }
              }, ic('X', 16))
            )
          ),

          // Scrollable Body
          h('div', { style: { padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', flex: 1, boxSizing: 'border-box' } },
            // Large Cover Art Card with Subtle Glow Finish
            h('div', {
              style: {
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: isPlayerFullscreen ? '22px 0 16px' : '12px 0 16px'
              }
            },
              // Ambient soft glow behind cover
              h('div', {
                style: {
                  position: 'absolute',
                  width: isPlayerFullscreen ? 210 : 180,
                  height: isPlayerFullscreen ? 290 : 250,
                  borderRadius: 24,
                  background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0.05) 60%, transparent 80%)',
                  filter: 'blur(22px)',
                  pointerEvents: 'none',
                  zIndex: 0
                }
              }),
              currentBook.cover ? h('img', {
                src: currentBook.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: {
                  width: isPlayerFullscreen ? 190 : 165,
                  height: isPlayerFullscreen ? 270 : 235,
                  borderRadius: 16,
                  objectFit: 'cover',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(99, 102, 241, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  position: 'relative',
                  zIndex: 1
                }
              }) : h('div', {
                style: {
                  width: isPlayerFullscreen ? 190 : 165,
                  height: isPlayerFullscreen ? 270 : 235,
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)'
                }
              }, ic('Headphones', 52, 'text-indigo-400'))
            ),

            // Novel Title, Author & Chapter Badge
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', {
                style: {
                  fontSize: 16.5,
                  fontWeight: 800,
                  color: 'var(--paper)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.02em'
                }
              }, currentBook.title),
              h('div', {
                style: {
                  fontSize: 12.5,
                  color: 'var(--slate)',
                  marginTop: 4
                }
              }, currentBook.author ? `by ${currentBook.author}` : 'SwiftAudiobooks'),
              h('div', {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 99,
                  background: 'rgba(99, 102, 241, 0.14)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#a5b4fc',
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 8,
                  maxWidth: '92%',
                  overflow: 'hidden'
                }
              },
                h('span', {
                  style: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }, currentTrack?.title || `Track ${currentTrackIndex + 1}`)
              )
            ),

            // Precision Time Scrubber Bar with Countdown Time
            h('div', { style: { marginBottom: 14 } },
              h('input', {
                type: 'range',
                min: 0,
                max: duration || 100,
                step: 0.5,
                disabled: !duration || duration <= 0,
                value: displayTime || 0,
                onInput: e => setScrubTime(parseFloat(e.target.value)),
                onChange: e => {
                  const val = parseFloat(e.target.value);
                  setScrubTime(null);
                  window.SwiftAudioEngine?.Player?.seekTo(val);
                },
                style: {
                  width: '100%',
                  accentColor: 'var(--accent, #6366f1)',
                  cursor: duration > 0 ? 'pointer' : 'default',
                  height: 6,
                  borderRadius: 99
                }
              }),
              h('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'var(--slate)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  marginTop: 4
                }
              },
                // Elapsed Time
                h('span', null, window.SwiftAudioEngine?.formatDuration(displayTime) || '0:00'),
                // Center percentage
                h('span', { style: { opacity: 0.5, fontSize: 10 } },
                  `${duration > 0 ? Math.round((displayTime / duration) * 100) : 0}%`
                ),
                // Remaining Countdown Time
                h('span', null, window.SwiftAudioEngine?.formatCountdown(displayTime, duration) || '-0:00')
              )
            ),

            // Fine Playback Controls (Previous, -5s, Play/Pause, +5s, Next)
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 16
              }
            },
              // Previous Chapter
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: {
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  color: 'var(--paper)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                },
                title: 'Previous Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.previousTrack()
              }, ic('SkipBack', 19)),

              // Fine 5-Second Rewind
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: {
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 800,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--paper)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                },
                title: 'Rewind 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
              }, '-5s'),

              // Instant Play / Pause Button with Glow Accent
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 'none',
                  boxShadow: '0 4px 22px rgba(99, 102, 241, 0.55), 0 0 16px rgba(99, 102, 241, 0.3)'
                },
                title: isPlaying ? 'Pause' : 'Play',
                onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
              }, isPlaying ? ic('Pause', 24) : ic('Play', 24)),

              // Fine 5-Second Forward
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: {
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 800,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--paper)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                },
                title: 'Forward 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
              }, '+5s'),

              // Next Chapter
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: {
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  color: 'var(--paper)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                },
                title: 'Next Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
              }, ic('SkipForward', 19))
            ),

            // Speed & Sleep Tuning Glass Card
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '10px 14px',
                borderRadius: 12,
                marginBottom: 14,
                flexWrap: 'wrap',
                gap: 8
              }
            },
              // Speed Pill Selector
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'Speed:'),
                [0.75, 1.0, 1.25, 1.5, 2.0].map(sp => {
                  const isActive = Math.abs(playbackRate - sp) < 0.05;
                  return h('button', {
                    key: sp,
                    type: 'button',
                    className: 'mini-btn',
                    style: {
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      background: isActive ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#fff' : 'var(--paper-dim)',
                      border: isActive ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                      boxShadow: isActive ? '0 0 10px rgba(99, 102, 241, 0.40)' : 'none'
                    },
                    onClick: () => window.SwiftAudioEngine?.Player?.setPlaybackRate(sp)
                  }, `${sp}x`);
                })
              ),

              // Sleep Timer Selector
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 } },
                  ic('Clock', 12),
                  'Sleep:'
                ),
                audioPlayerState?.sleepTimerRemainingSeconds > 0 && h('span', {
                  style: {
                    fontSize: 10.5,
                    color: '#a5b4fc',
                    fontFamily: "'IBM Plex Mono', monospace",
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(99, 102, 241, 0.16)',
                    border: '1px solid rgba(99, 102, 241, 0.35)'
                  }
                }, window.SwiftAudioEngine?.formatDuration(audioPlayerState.sleepTimerRemainingSeconds)),
                h('select', {
                  value: audioPlayerState?.sleepAtEndOfChapter ? 'end_of_chapter' : (audioPlayerState?.sleepTimerMinutes ? String(audioPlayerState.sleepTimerMinutes) : (audioPlayerState?.sleepTimerRemainingSeconds ? String(Math.ceil(audioPlayerState.sleepTimerRemainingSeconds / 60)) : 'off')),
                  onChange: e => {
                    const val = e.target.value;
                    if (val === 'off') window.SwiftAudioEngine?.Player?.clearSleepTimer();
                    else window.SwiftAudioEngine?.Player?.setSleepTimer(val);
                  },
                  style: {
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: 'var(--paper)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 11
                  }
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

            // Open in Poweramp Action Button
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: {
                width: '100%',
                padding: '11px 16px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(79, 70, 229, 0.28))',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                borderRadius: 12,
                color: '#e0e7ff',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 16px rgba(99, 102, 241, 0.18)',
                marginBottom: 14
              },
              title: 'Open and play in Poweramp player on Android',
              onClick: () => window.SwiftAudioEngine?.Player?.openInPoweramp()
            },
              ic('ExternalLink', 15, 'text-indigo-300'),
              'Open in Poweramp'
            ),

            // Expandable Chapter Queue
            h('div', { style: { marginTop: 4 } },
              h('div', {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--paper)',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              },
                h('span', null, `Chapters (${totalTracks})`),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: {
                    fontSize: 11,
                    padding: '3px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 6
                  },
                  onClick: () => handleOpenAudioDownload && handleOpenAudioDownload(currentBook)
                }, ic('Download', 13), 'Download MP3s')
              ),
              h('div', {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  maxHeight: isPlayerFullscreen ? 360 : 190,
                  overflowY: 'auto'
                }
              },
                (currentBook.tracks || []).map((t, idx) => {
                  const isCur = idx === currentTrackIndex;
                  return h('div', {
                    key: idx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isCur ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                      border: isCur ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: isCur ? '0 0 12px rgba(99, 102, 241, 0.15)' : 'none',
                      cursor: 'pointer'
                    },
                    onClick: () => window.SwiftAudioEngine?.Player?.playTrack(idx)
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                      h('span', {
                        style: {
                          fontSize: 11,
                          color: isCur ? 'var(--accent, #6366f1)' : 'var(--slate)',
                          width: 22,
                          fontWeight: 700
                        }
                      }, `${idx + 1}`),
                      h('span', {
                        style: {
                          fontSize: 12,
                          color: isCur ? 'var(--accent, #6366f1)' : 'var(--paper)',
                          fontWeight: isCur ? 700 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }
                      }, t.title)
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
                      t.duration && h('span', { style: { fontSize: 11, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" } }, t.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: {
                          padding: '3px 6px',
                          fontSize: 11,
                          color: downloadingTrackId === idx ? '#fbbf24' : 'var(--slate)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        },
                        title: `Download Track ${idx + 1}: ${t.title}`,
                        disabled: downloadingTrackId === idx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(idx);
                            toast(`Downloading Track ${idx + 1}: "${t.title}"...`, 'info');
                            const fOpts = getNovelFolderOptions ? getNovelFolderOptions(currentBook) : {};
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(t, currentBook, fOpts);
                            toast(`Downloaded Track ${idx + 1}: "${t.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === idx ? ic('Loader2', 13, 'animate-spin') : ic('Download', 13)),
                      isCur && h('span', { style: { display: 'inline-flex', alignItems: 'center', color: 'var(--accent, #6366f1)' } }, isPlaying ? ic('Play', 12) : ic('Pause', 12))
                    )
                  );
                })
              )
            )
          )
        )
      ),

      // ══════════════════════════════════════════════════════════════════════
      // 3. BACKGROUND DOWNLOAD PROGRESS BANNER
      // ══════════════════════════════════════════════════════════════════════
      hasBgDl && h('div', {
        style: {
          position: 'fixed',
          bottom: audioPlayerState?.currentBook ? 124 : 64,
          left: 12,
          right: 12,
          maxWidth: 480,
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 12,
          padding: '10px 14px',
          zIndex: 998,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        },
        onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: false }))
      },
        ic('Download', 18, 'text-indigo-400'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--paper)' } },
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, audioDownloadModal.status || 'Downloading audio tracks...'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent, #6366f1)', marginLeft: 8 } }, `${audioDownloadModal.percent || 0}%`)
          ),
          h('div', { style: { width: '100%', height: 4, borderRadius: 99, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden', marginTop: 6 } },
            h('div', { style: { height: '100%', width: `${audioDownloadModal.percent || 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
          )
        ),
        h('span', { style: { fontSize: 11, color: 'var(--accent, #6366f1)', fontWeight: 600, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 } }, 'Expand', ic('Maximize2', 12))
      ),

      // ══════════════════════════════════════════════════════════════════════
      // 4. BATCH DOWNLOAD MODAL
      // ══════════════════════════════════════════════════════════════════════
      hasModalDl && h('div', {
        className: 'modal-overlay',
        style: {
          zIndex: 1050,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        },
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
          style: {
            maxWidth: 460,
            width: '92%',
            maxHeight: '88vh',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            background: amoledMode ? '#000000' : 'rgba(15, 23, 42, 0.94)',
            border: glassCardBorder,
            borderRadius: 16,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
          },
          onClick: e => e.stopPropagation()
        },
          h('div', { className: 'modal-hd' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              ic('Download', 18, 'text-indigo-400'),
              h('span', { className: 't' }, 'Download Audiobook MP3s')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              audioDownloadModal.active && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 11, padding: '3px 8px' },
                title: 'Continue downloading in background',
                onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }))
              }, 'Run in Background'),
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
              }, ic('X', 15))
            )
          ),
          h('div', { className: 'modal-bd' },
            h('div', { style: { display: 'flex', gap: 12, marginBottom: 12 } },
              audioDownloadModal.book?.cover && h('img', {
                src: audioDownloadModal.book.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: { width: 56, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.1)' }
              }),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--paper)' } }, audioDownloadModal.book?.title || 'Audiobook'),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } }, `Total: ${audioDownloadModal.book?.tracks?.length || 0} tracks`),
                h('div', { style: { fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 } }, 'Direct storage stream | Background safe')
              )
            ),

            h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--slate)' } }, 'SAVE LOCATION'),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { fontSize: 10.5, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 },
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
                }, ic('Folder', 12), 'Change Folder')
              ),
              h('div', { style: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper)', wordBreak: 'break-all' } },
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
              h('div', { style: { maxHeight: 160, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2 } },
                (audioDownloadModal.book?.tracks || []).map((track, tIdx) => {
                  const isChecked = (audioDownloadModal.selectedIndices || []).includes(tIdx);
                  return h('div', {
                    key: tIdx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: 6,
                      background: isChecked ? 'rgba(99, 102, 241, 0.10)' : 'transparent',
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
                      track.duration && h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" } }, track.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '2px 5px', fontSize: 10.5, color: downloadingTrackId === tIdx ? '#fbbf24' : 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
                        title: `Download ${track.title}`,
                        disabled: audioDownloadModal.active || downloadingTrackId === tIdx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(tIdx);
                            toast(`Downloading "${track.title}"...`, 'info');
                            const fOpts = audioDownloadModal.folderOptions || (getNovelFolderOptions ? getNovelFolderOptions(audioDownloadModal.book) : {});
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(track, audioDownloadModal.book, fOpts);
                            toast(`Downloaded "${track.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === tIdx ? ic('Loader2', 12, 'animate-spin') : ic('Download', 12))
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
              }, 'Run in Background'),
              h('button', {
                key: 'cancel',
                type: 'button',
                className: 'mini-btn danger',
                style: { display: 'inline-flex', alignItems: 'center', gap: 4 },
                onClick: () => {
                  window.SwiftAudioEngine?.Downloader?.cancel();
                  toast('Cancelling download...', 'info');
                }
              }, ic('X', 13), 'Cancel Download')
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
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 },
                onClick: handleExecuteAudioBatchDownload
              }, ic('Download', 14), `Download Selected (${(audioDownloadModal.selectedIndices || []).length})`)
            ]
          )
        )
      )
    );
  }

  return { SwiftAudioPlayer };
}));
