/**
 * Gemini Translator - Reader Pro Engine UI Modals & Sheets
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
  const useState = (typeof React !== 'undefined' && React.useState) ? React.useState : (window.React ? window.React.useState : null);
  const useCallback = (typeof React !== 'undefined' && React.useCallback) ? React.useCallback : (window.React ? window.React.useCallback : null);
  const useRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef : (window.React ? window.React.useRef : null);
  const useMemo = (typeof React !== 'undefined' && React.useMemo) ? React.useMemo : (window.React ? window.React.useMemo : null);
  const useEffect = (typeof React !== 'undefined' && React.useEffect) ? React.useEffect : (window.React ? window.React.useEffect : null);
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  function ReaderLiveDashboardModal(props) {
    const {
      isOpen,
      onClose,
      isPaused = false,
      onPause,
      onResume,
      onStop,
      activeMode = 'full',
      chapterIndex = 0,
      chapterTitle = '',
      pct = 0,
      statusMsg = '',
      elapsedSeconds = 0,
      tokenEstimate = 0,
      streamText = '',
      healingBlocks = [],
      chunkCurrent = 1,
      chunkTotal = 1
    } = props;

    if (!isOpen) return null;

    const formatTime = (totalSec) => {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const isHealing = activeMode === 'heal';
    const isTitles = activeMode === 'titles';
    const accentColor = isHealing ? '#c084fc' : (isTitles ? '#38bdf8' : '#818cf8');
    const accentBorder = isHealing ? 'rgba(168, 85, 247, 0.4)' : (isTitles ? 'rgba(56, 189, 248, 0.4)' : 'rgba(99, 102, 241, 0.4)');

    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 10006,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      },
      onClick: onClose
    },
      h('div', {
        style: {
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          background: 'var(--r-card, #0f172a)',
          border: `1px solid ${accentBorder}`,
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          color: '#f8fafc',
          overflow: 'hidden'
        },
        onClick: (e) => e.stopPropagation()
      },
        // Header Row
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('div', {
              style: {
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `rgba(${isHealing ? '168, 85, 247' : (isTitles ? '56, 189, 248' : '99, 102, 241')}, 0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor
              }
            }, ic('Sparkles', 18)),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Live Translation Dashboard'),
              h('div', { style: { fontSize: 11.5, color: '#94a3b8' } },
                isTitles
                  ? 'Batch Title Translation in Progress'
                  : `Chapter ${(chapterIndex ?? 0) + 1}: ${chapterTitle || 'Active Chapter'}`
              )
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', {
              style: {
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: isPaused ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isPaused ? '#fbbf24' : '#34d399',
                border: `1px solid ${isPaused ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }
            }, isPaused ? 'Paused' : 'Running'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { padding: '4px 8px', borderRadius: 6, color: '#94a3b8', fontSize: 18, border: 'none' },
              onClick: onClose
            }, '✕')
          )
        ),

        // 4 Metric Cards Grid
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10
          }
        },
          // Card 1: Progress
          h('div', { style: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' } },
            h('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600 } }, 'Progress'),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: accentColor, marginTop: 2 } }, `${Math.round(pct)}%`)
          ),
          // Card 2: Chunk / Step
          h('div', { style: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' } },
            h('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600 } }, isTitles ? 'Titles' : 'Chunk'),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f8fafc', marginTop: 2 } }, `${chunkCurrent || 1}/${chunkTotal || 1}`)
          ),
          // Card 3: Elapsed Time
          h('div', { style: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' } },
            h('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600 } }, 'Elapsed'),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f8fafc', marginTop: 2 } }, formatTime(elapsedSeconds))
          ),
          // Card 4: Tokens Streamed
          h('div', { style: { background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' } },
            h('div', { style: { fontSize: 10.5, color: '#94a3b8', fontWeight: 600 } }, 'Tokens'),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#38bdf8', marginTop: 2 } }, `~${(tokenEstimate || Math.round((streamText.length || 0) / 4)).toLocaleString()}`)
          )
        ),

        // Status Bar
        h('div', {
          style: {
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11.5,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }
        },
          ic('Info', 13, 'shrink-0 text-indigo-400'),
          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, statusMsg || 'Translating prose chunks…')
        ),

        // Main Live Content Box: Healing Inspector OR Streaming Preview
        isHealing ? (
          // Healing Inspector
          h('div', {
            style: {
              flex: 1,
              overflowY: 'auto',
              maxHeight: 280,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }
          },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: '#c084fc', marginBottom: 4 } },
              `Detected Untranslated Lines (${healingBlocks.length})`
            ),
            healingBlocks.length === 0
              ? h('div', { style: { fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '24px 0' } }, 'Scanning chapter for untranslated or foreign lines…')
              : healingBlocks.map((block, bIdx) => (
                h('div', {
                  key: bIdx,
                  style: {
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + (block.status === 'healed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)'),
                    fontSize: 11.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 10.5 } },
                    h('span', null, `Line #${(block.lineIdx ?? bIdx) + 1}`),
                    h('span', {
                      style: {
                        color: block.status === 'healed' ? '#34d399' : '#fbbf24',
                        fontWeight: 600
                      }
                    }, block.status === 'healed' ? 'Healed' : 'Scanning / Healing...')
                  ),
                  h('div', { style: { color: '#fca5a5', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' } },
                    block.foreignText || block.rawText || ''
                  ),
                  block.healedText && h('div', { style: { color: '#86efac', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: 4, marginTop: 2 } },
                    block.healedText
                  )
                )
              ))
          )
        ) : (
          // Streaming Text Preview
          h('div', {
            style: {
              flex: 1,
              overflowY: 'auto',
              maxHeight: 280,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 11.5,
              color: '#e2e8f0',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap'
            }
          },
            streamText
              ? streamText
              : h('span', { style: { color: '#64748b', fontStyle: 'italic' } }, 'Waiting for first stream tokens from AI…')
          )
        ),

        // Footer Controls Bar
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 12
          }
        },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: {
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              fontWeight: 700,
              fontSize: 12.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            },
            onClick: () => {
              if (typeof onStop === 'function') onStop();
              onClose();
            }
          }, ic('Square', 12), 'Stop Translation'),

          h('div', { style: { display: 'flex', gap: 10 } },
            typeof onPause === 'function' && typeof onResume === 'function' && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: {
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f8fafc',
                fontWeight: 600,
                fontSize: 12.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              },
              onClick: isPaused ? onResume : onPause
            }, ic(isPaused ? 'Play' : 'Pause', 12), isPaused ? 'Resume' : 'Pause'),

            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: {
                padding: '7px 18px',
                borderRadius: 8,
                background: accentColor,
                color: '#fff',
                fontWeight: 700,
                fontSize: 12.5
              },
              onClick: onClose
            }, 'Minimize (Keep Running)')
          )
        )
      )
    );
  }


  return { ReaderLiveDashboardModal };
}));
