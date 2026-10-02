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
      );
  }

  // ── 2. HIERARCHICAL ARC & VOLUME TABLE OF CONTENTS DRAWER ──
  function ReaderTocDrawer(props) {
    const {
      showToc, setShowToc, tocSearch, setTocSearch, arcGroups, collapsedArcs,
      toggleArcCollapse, activeIdx, activeTocItemRef, changeChapter
    } = props;
    if (!showToc) return null;
    return h('div', {
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
      sleepTimerMinutes, setSleepTimerMinutes, setSleepTimerSecondsLeft, setShowVoiceModal
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
              style: { width: '100%', padding: '10px 0', marginTop: 14, background: 'var(--r-accent)', color: '#fff', fontWeight: 700, borderRadius: 8 },
              onClick: () => { setShowSettings(false); setShowVoiceModal(true); }
            }, '🎙 Open Voice & Offline AI Engine Manager')
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
      );
  }

  return {
    ReaderTtsPlayerBar,
    ReaderTocDrawer,
    ReaderTypographyModal,
    ReaderVoiceModal,
    ReaderTtsOptionsModal,
    ReaderCharsFilterModal,
    ReaderGestureGuideModal
  };
}));
