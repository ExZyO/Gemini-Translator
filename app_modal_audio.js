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
    const [isChapterQueueOpen, setIsChapterQueueOpen] = (ReactComp?.useState || window.React?.useState)(false);

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
      // 1. SLEEK APPLE MUSIC FLOATING FROSTED-GLASS MINI-PLAYER
      // ══════════════════════════════════════════════════════════════════════
      hasMini && h('div', {
        className: 'swift-mini-player',
        style: {
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom, 16px))',
          left: 12,
          right: 12,
          maxWidth: 480,
          margin: '0 auto',
          height: 60,
          background: amoledMode ? 'rgba(0, 0, 0, 0.94)' : 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
          zIndex: 995,
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(99, 102, 241, 0.20)',
          cursor: 'pointer',
          overflow: 'hidden',
          userSelect: 'none'
        },
        onClick: () => setIsFullPlayerOpen(true)
      },
        // Precision Progress Line along the bottom edge
        h('div', {
          style: {
            position: 'absolute',
            bottom: 0,
            left: 10,
            right: 10,
            height: 2,
            background: 'rgba(255, 255, 255, 0.10)',
            borderRadius: 99,
            overflow: 'hidden'
          }
        },
          h('div', {
            style: {
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)',
              transition: 'width 0.25s linear'
            }
          })
        ),

        // Cover Thumbnail with subtle glow
        currentBook.cover ? h('img', {
          src: currentBook.cover,
          alt: 'Cover',
          referrerPolicy: 'no-referrer',
          onError: (e) => { e.target.style.display = 'none'; },
          style: {
            width: 40,
            height: 40,
            borderRadius: 10,
            objectFit: 'cover',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.40)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }
        }) : h('div', {
          style: {
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }
        }, ic('BookOpen', 18, 'text-white')),

        // Book & Chapter Title Info
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', {
            style: {
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em'
            }
          }, currentBook.title || 'Audiobook'),
          h('div', {
            style: {
              fontSize: 11,
              color: '#94a3b8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 1
            }
          }, currentTrack?.title || `Chapter ${currentTrackIndex + 1} of ${totalTracks}`)
        ),

        // Sleek Controls Container
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0
          },
          onClick: e => e.stopPropagation()
        },
          // Previous Chapter Button (visible only if more chapters available before)
          currentTrackIndex > 0 && h('button', {
            type: 'button',
            style: {
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            },
            title: 'Previous chapter',
            onClick: () => window.SwiftAudioEngine?.Player?.previousTrack()
          }, ic('SkipBack', 14)),

          // Sleek -5s Jump Button
          h('button', {
            type: 'button',
            style: {
              minWidth: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.10)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            },
            title: 'Rewind 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
          }, '-5s'),

          // Apple Music White Hero Play/Pause Button
          h('button', {
            type: 'button',
            style: {
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ffffff',
              color: '#0f172a',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)',
              margin: '0 2px'
            },
            title: isPlaying ? 'Pause' : 'Play',
            onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
          }, isPlaying ? ic('Pause', 18, 'text-slate-900') : ic('Play', 18, 'text-slate-900 ml-0.5')),

          // Sleek +5s Jump Button
          h('button', {
            type: 'button',
            style: {
              minWidth: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.10)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            },
            title: 'Forward 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
          }, '+5s'),

          // Next Chapter Button (visible only if more chapters available ahead)
          currentTrackIndex < totalTracks - 1 && h('button', {
            type: 'button',
            style: {
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            },
            title: 'Next chapter',
            onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
          }, ic('SkipForward', 14)),

          // Clean Close Button
          h('button', {
            type: 'button',
            style: {
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: 2
            },
            title: 'Close player',
            onClick: (e) => {
              e.stopPropagation();
              window.SwiftAudioEngine?.Player?.close();
            }
          }, ic('X', 14))
        )
      ),

      // ══════════════════════════════════════════════════════════════════════
      // 2. TRUE FULLSCREEN APPLE MUSIC AUDIOBOOK PLAYER (1:1 with Visual Showcase)
      // ══════════════════════════════════════════════════════════════════════
      hasFull && h('div', {
        className: 'apple-music-fullscreen-root',
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'calc(16px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
          background: amoledMode
            ? '#000000'
            : 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 45%, #020617 100%)',
          color: '#ffffff',
          overflow: 'hidden',
          boxSizing: 'border-box',
          userSelect: 'none'
        },
        onClick: e => e.stopPropagation()
      },
        // Ambient Radial Glow behind artwork
        h('div', {
          style: {
            position: 'absolute',
            top: '-5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 320,
            background: 'rgba(99, 102, 241, 0.35)',
            borderRadius: 9999,
            filter: 'blur(75px)',
            pointerEvents: 'none',
            zIndex: 0
          }
        }),

        // Top Bar
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 10,
            paddingTop: 4
          }
        },
          // Minimize button (top left)
          h('button', {
            type: 'button',
            style: {
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.10)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            },
            title: 'Minimize player',
            onClick: () => setIsFullPlayerOpen(false)
          }, ic('ChevronDown', 18)),

          // Title & Chapter Info
          h('div', { style: { textAlign: 'center', minWidth: 0, flex: 1, padding: '0 12px' } },
            h('div', {
              style: {
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#a5b4fc'
              }
            }, 'Audiobook'),
            h('div', {
              style: {
                fontSize: 12.5,
                fontWeight: 600,
                color: '#cbd5e1',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }, `Chapter ${currentTrackIndex + 1} of ${totalTracks}`)
          ),

          // Options / Library / Close group (top right)
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            // In Library Star
            (() => {
              const inLib = isAudiobookInLibrary ? isAudiobookInLibrary(currentBook) : false;
              return h('button', {
                type: 'button',
                style: {
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: inLib ? 'rgba(245, 158, 11, 0.20)' : 'rgba(255, 255, 255, 0.10)',
                  border: inLib ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: inLib ? '#fbbf24' : '#ffffff',
                  cursor: 'pointer'
                },
                title: inLib ? 'Saved in Library' : 'Add to Library',
                onClick: () => {
                  if (inLib) {
                    if (removeAudiobookFromLibrary) removeAudiobookFromLibrary(currentBook);
                  } else {
                    if (saveAudiobookToLibrary) saveAudiobookToLibrary(currentBook);
                  }
                }
              }, ic('Star', 16, inLib ? 'text-amber-400' : 'text-slate-300'));
            })(),

            // Close button
            h('button', {
              type: 'button',
              style: {
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.10)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer'
              },
              title: 'Close player',
              onClick: () => {
                setIsFullPlayerOpen(false);
                window.SwiftAudioEngine?.Player?.close();
              }
            }, ic('X', 16))
          )
        ),

        // Centered Artwork Card (Matching visual mockup)
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 'auto 0',
            position: 'relative',
            zIndex: 10
          }
        },
          currentBook.cover ? h('img', {
            src: currentBook.cover,
            alt: 'Cover',
            referrerPolicy: 'no-referrer',
            onError: (e) => { e.target.style.display = 'none'; },
            style: {
              width: 'min(240px, 34vh)',
              height: 'min(240px, 34vh)',
              borderRadius: 22,
              objectFit: 'cover',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }
          }) : h('div', {
            style: {
              width: 'min(240px, 34vh)',
              height: 'min(240px, 34vh)',
              borderRadius: 22,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              textAlign: 'center'
            }
          },
            h('div', {
              style: {
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }
            }, ic('BookOpen', 24, 'text-white')),
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' } }, currentBook.title || 'Web Novel'),
            h('div', { style: { fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 } }, currentBook.author || 'Audio Edition')
          )
        ),

        // Track Info, Scrubber & Controls (Matching visual mockup)
        h('div', {
          style: {
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: 480,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }
        },
          // Track Title & Subtitle + Badge
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }
          },
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('h3', {
                style: {
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }, currentBook.title || 'Audiobook'),
              h('p', {
                style: {
                  fontSize: 13,
                  color: '#94a3b8',
                  margin: '2px 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }, currentTrack?.title || `Chapter ${currentTrackIndex + 1}: Story Audio`)
            ),
            h('span', {
              style: {
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 800,
                background: 'rgba(99, 102, 241, 0.20)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                flexShrink: 0,
                letterSpacing: '0.05em'
              }
            }, 'HQ AUDIO')
          ),

          // Fluid Time Scrubber
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            h('div', {
              style: {
                position: 'relative',
                width: '100%',
                height: 6,
                background: 'rgba(255, 255, 255, 0.20)',
                borderRadius: 99,
                overflow: 'hidden'
              }
            },
              h('div', {
                style: {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: '#ffffff',
                  borderRadius: 99,
                  transition: scrubTime !== null ? 'none' : 'width 0.25s linear'
                }
              }),
              h('input', {
                type: 'range',
                min: 0,
                max: duration || 100,
                step: 0.5,
                value: displayTime || 0,
                onInput: e => setScrubTime(parseFloat(e.target.value)),
                onChange: e => {
                  const val = parseFloat(e.target.value);
                  setScrubTime(null);
                  window.SwiftAudioEngine?.Player?.seekTo(val);
                },
                style: {
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }
              })
            ),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11.5,
                color: '#94a3b8',
                fontFamily: "'IBM Plex Mono', monospace"
              }
            },
              h('span', null, window.SwiftAudioEngine?.formatDuration(displayTime) || '0:00'),
              h('span', null, window.SwiftAudioEngine?.formatCountdown(displayTime, duration) || '-0:00')
            )
          ),

          // Primary Controls (Previous Chapter, -5s, Play/Pause 64x64, +5s, Next Chapter)
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '4px 0'
            }
          },
            // Previous Chapter Button (disabled if currentTrackIndex <= 0)
            h('button', {
              type: 'button',
              disabled: currentTrackIndex <= 0,
              style: {
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: currentTrackIndex > 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentTrackIndex > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                cursor: currentTrackIndex > 0 ? 'pointer' : 'default',
                opacity: currentTrackIndex > 0 ? 1 : 0.35,
                transition: 'all 0.15s ease'
              },
              title: currentTrackIndex > 0 ? 'Previous Chapter' : 'No previous chapters',
              onClick: () => {
                if (currentTrackIndex > 0) window.SwiftAudioEngine?.Player?.previousTrack();
              }
            }, ic('SkipBack', 20)),

            // Sleek -5s Jump Button
            h('button', {
              type: 'button',
              style: {
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.10)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
              },
              title: 'Rewind 5 seconds',
              onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
            }, '-5s'),

            // Hero Play/Pause Circle (White circle with dark icon)
            h('button', {
              type: 'button',
              style: {
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(255, 255, 255, 0.25), 0 0 20px rgba(99, 102, 241, 0.40)',
                transform: 'scale(1)',
                transition: 'transform 0.15s ease'
              },
              title: isPlaying ? 'Pause' : 'Play',
              onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
            }, isPlaying ? ic('Pause', 28, 'text-slate-900') : ic('Play', 28, 'text-slate-900 ml-1')),

            // Sleek +5s Jump Button
            h('button', {
              type: 'button',
              style: {
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.10)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
              },
              title: 'Forward 5 seconds',
              onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
            }, '+5s'),

            // Next Chapter Button (disabled if currentTrackIndex >= totalTracks - 1)
            h('button', {
              type: 'button',
              disabled: currentTrackIndex >= totalTracks - 1,
              style: {
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: currentTrackIndex < totalTracks - 1 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentTrackIndex < totalTracks - 1 ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                cursor: currentTrackIndex < totalTracks - 1 ? 'pointer' : 'default',
                opacity: currentTrackIndex < totalTracks - 1 ? 1 : 0.35,
                transition: 'all 0.15s ease'
              },
              title: currentTrackIndex < totalTracks - 1 ? 'Next Chapter' : 'No more chapters',
              onClick: () => {
                if (currentTrackIndex < totalTracks - 1) window.SwiftAudioEngine?.Player?.nextTrack();
              }
            }, ic('SkipForward', 20))
          ),

          // Bottom Function Bar (Matching visual mockup)
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid rgba(255, 255, 255, 0.10)',
              fontSize: 12
            }
          },
            // Speed Pill
            h('button', {
              type: 'button',
              style: {
                padding: '5px 12px',
                borderRadius: 99,
                background: 'rgba(255, 255, 255, 0.10)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer'
              },
              title: 'Cycle speed (1.0x, 1.25x, 1.5x, 2.0x, 0.75x)',
              onClick: () => {
                const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
                const curIdx = rates.findIndex(r => Math.abs(r - playbackRate) < 0.05);
                const nextRate = rates[(curIdx + 1) % rates.length];
                window.SwiftAudioEngine?.Player?.setPlaybackRate(nextRate);
              }
            }, `${playbackRate}x`),

            // Sleep Timer Pill
            h('button', {
              type: 'button',
              style: {
                padding: '5px 12px',
                borderRadius: 99,
                background: audioPlayerState?.sleepTimerRemainingSeconds > 0 ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.10)',
                border: audioPlayerState?.sleepTimerRemainingSeconds > 0 ? '1px solid rgba(99, 102, 241, 0.50)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: audioPlayerState?.sleepTimerRemainingSeconds > 0 ? '#a5b4fc' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                cursor: 'pointer'
              },
              title: 'Sleep timer (Off, 15m, 30m, 45m, 60m)',
              onClick: () => {
                const remaining = audioPlayerState?.sleepTimerRemainingSeconds || 0;
                if (remaining <= 0) window.SwiftAudioEngine?.Player?.setSleepTimer('30');
                else if (remaining > 1800) window.SwiftAudioEngine?.Player?.clearSleepTimer();
                else window.SwiftAudioEngine?.Player?.setSleepTimer('60');
              }
            },
              ic('Clock', 13),
              audioPlayerState?.sleepTimerRemainingSeconds > 0
                ? window.SwiftAudioEngine?.formatDuration(audioPlayerState.sleepTimerRemainingSeconds)
                : 'Sleep Off'
            ),

            // Chapters Queue Drawer Trigger
            h('button', {
              type: 'button',
              style: {
                padding: '5px 12px',
                borderRadius: 99,
                background: isChapterQueueOpen ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.10)',
                border: isChapterQueueOpen ? '1px solid rgba(99, 102, 241, 0.50)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isChapterQueueOpen ? '#a5b4fc' : '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                cursor: 'pointer'
              },
              title: 'Open Chapters Drawer',
              onClick: () => setIsChapterQueueOpen(prev => !prev)
            },
              ic('ListMusic', 13),
              'Chapters'
            ),

            // Poweramp Quick Pill
            h('button', {
              type: 'button',
              style: {
                padding: '5px 10px',
                borderRadius: 99,
                background: 'rgba(99, 102, 241, 0.20)',
                border: '1px solid rgba(99, 102, 241, 0.40)',
                color: '#a5b4fc',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              },
              title: 'Open in Poweramp app',
              onClick: () => window.SwiftAudioEngine?.Player?.openInPoweramp()
            },
              ic('ExternalLink', 12),
              'Poweramp'
            )
          ),

          // Chapter Queue Overlay Sheet
          isChapterQueueOpen && h('div', {
            style: {
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 16,
              padding: 12,
              maxHeight: 220,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7)'
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' } },
              h('span', { style: { fontSize: 12, fontWeight: 700, color: '#ffffff' } }, `All Chapters (${totalTracks})`),
              h('button', {
                type: 'button',
                style: {
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  cursor: 'pointer'
                },
                onClick: () => {
                  if (handleOpenAudioDownload) handleOpenAudioDownload(currentBook);
                }
              }, 'Download MP3s')
            ),
            (currentBook.tracks || []).map((t, idx) => {
              const isCur = idx === currentTrackIndex;
              return h('div', {
                key: idx,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: isCur ? 'rgba(99, 102, 241, 0.20)' : 'rgba(255, 255, 255, 0.03)',
                  border: isCur ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent',
                  cursor: 'pointer'
                },
                onClick: () => window.SwiftAudioEngine?.Player?.playTrack(idx)
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                  h('span', { style: { fontSize: 11, fontWeight: 700, color: isCur ? '#818cf8' : '#64748b', width: 22 } }, `${idx + 1}`),
                  h('span', { style: { fontSize: 12, fontWeight: isCur ? 700 : 500, color: isCur ? '#ffffff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.title)
                ),
                isCur && h('span', { style: { color: '#818cf8' } }, isPlaying ? ic('Play', 12) : ic('Pause', 12))
              );
            })
          )
        )
      ),

      // ══════════════════════════════════════════════════════════════════════
      // 3. BACKGROUND DOWNLOAD PROGRESS BANNER
      // ══════════════════════════════════════════════════════════════════════
      hasBgDl && h('div', {
        style: {
          position: 'fixed',
          bottom: audioPlayerState?.currentBook ? 'calc(164px + env(safe-area-inset-bottom, 16px))' : 'calc(88px + env(safe-area-inset-bottom, 16px))',
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
