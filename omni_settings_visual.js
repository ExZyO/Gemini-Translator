/**
 * omni_settings_visual.js - Visual Presentation & Palette Customizer Sub-View
 * Provides a sticky live miniature preview stage, all 14 Pure-AMOLED semantic palettes
 * (with Custom Dual-Hex contrast auto-pairing), clickable wireframe layout switches
 * for Library / Book Details / Discover, and surface blur/sheen/radius/motion controls.
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.OmniVisualSettingsScreen = exports.OmniVisualSettingsScreen;
  }
  if (typeof window !== 'undefined') {
    window.OmniVisualSettingsScreen = exports.OmniVisualSettingsScreen;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function OmniVisualSettingsScreen(props) {
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null);
    const h = ReactObj && ReactObj.createElement ? ReactObj.createElement : function () { return null; };
    const useState = ReactObj && ReactObj.useState ? ReactObj.useState : function (v) { return [typeof v === 'function' ? v() : v, function () {}]; };
    const useEffect = ReactObj && ReactObj.useEffect ? ReactObj.useEffect : function () {};

    const ic = (typeof window !== 'undefined' && window.ic) ? window.ic : function () { return null; };
    const toast = (typeof window !== 'undefined' && window.toast) ? window.toast : function () {};
    const Engine = (typeof window !== 'undefined' && window.OmniThemeEngine) ? window.OmniThemeEngine : null;

    const prefs = Engine && typeof Engine.useOmniPrefs === 'function'
      ? Engine.useOmniPrefs()
      : {
          themeId: 'WHITE',
          customHex1: '#E8C26A',
          customHex2: '#A855F7',
          libraryLayout: 'editorial',
          detailsHeader: 'jacket',
          discoverLayout: 'grid',
          heroBlur: 24,
          glassSheen: 70,
          posterRadius: 10,
          heroAutoscroll: true,
          heroInterval: 6
        };

    const palettes = (Engine && Array.isArray(Engine.PALETTES)) ? Engine.PALETTES : [];
    const activePalette = (Engine && typeof Engine.getPalette === 'function')
      ? Engine.getPalette(prefs.themeId, prefs)
      : { id: 'WHITE', name: 'Monochrome', accent: '#F5F5F5', variant: '#C8C4BC', onAccent: '#000000' };

    const [hexDraft1, setHexDraft1] = useState(prefs.customHex1 || '#E8C26A');
    const [hexDraft2, setHexDraft2] = useState(prefs.customHex2 || '#A855F7');

    useEffect(function () {
      setHexDraft1(prefs.customHex1 || '#E8C26A');
      setHexDraft2(prefs.customHex2 || '#A855F7');
    }, [prefs.customHex1, prefs.customHex2]);

    const setPref = function (key, val) {
      if (Engine && typeof Engine.setPref === 'function') {
        Engine.setPref(key, val);
      }
    };

    const handleHexTyping = function (key, rawVal, setDraft) {
      const cleaned = String(rawVal || '').toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 7);
      setDraft(cleaned);
      if (/^#[0-9A-F]{6}$/.test(cleaned)) {
        setPref(key, cleaned);
      } else if (/^[0-9A-F]{6}$/.test(cleaned)) {
        setPref(key, '#' + cleaned);
      }
    };

    const commitHexBlur = function (key, draft, fallback, setDraft) {
      const sanitized = (Engine && typeof Engine.sanitizeHex === 'function')
        ? Engine.sanitizeHex(draft, fallback)
        : fallback;
      setDraft(sanitized);
      setPref(key, sanitized);
    };

    const onBack = typeof props?.onBack === 'function' ? props.onBack : function () {};

    const sheenAlpha = ((Number(prefs.glassSheen) || 0) / 100) * 0.28;
    const previewBlurPx = Math.max(0, Math.round((Number(prefs.heroBlur) || 0) * 0.6));

    // Reusable miniature wireframe schematic renderer
    const renderWireframeCard = function (opts) {
      const isActive = opts.active;
      return h('button', {
        key: opts.value,
        type: 'button',
        onClick: function () { setPref(opts.prefKey, opts.value); },
        style: {
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          padding: '10px',
          borderRadius: 8,
          background: isActive ? 'rgba(255, 255, 255, 0.065)' : 'rgba(255, 255, 255, 0.02)',
          border: isActive ? ('1.2px solid ' + activePalette.accent) : '0.6px solid rgba(255, 255, 255, 0.09)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }
      },
        h('div', {
          style: {
            width: '100%',
            height: 62,
            borderRadius: 5,
            background: '#050507',
            border: '0.6px solid rgba(255,255,255,0.08)',
            padding: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflow: 'hidden',
            position: 'relative'
          }
        }, opts.schematic(isActive ? activePalette.accent : 'rgba(255,255,255,0.28)')),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 } },
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 12, fontWeight: isActive ? 750 : 600, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, opts.title),
            h('div', { style: { fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 } }, opts.desc)
          ),
          isActive && h('span', { style: { color: activePalette.accent, flexShrink: 0 } }, ic('Check', 14))
        )
      );
    };

    const hairlineSectionHeader = function (label, rightText) {
      return h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 22,
          marginBottom: 10
        }
      },
        h('span', {
          style: {
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.45)'
          }
        }, label),
        rightText ? h('span', {
          style: {
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: activePalette.accent
          }
        }, rightText) : null
      );
    };

    return h('div', { className: 'omni-visual-settings', style: { paddingBottom: 32 } },
      // ── Sticky Top Back Header + Pinned Live Preview Card ──
      h('div', {
        style: {
          position: 'sticky',
          top: 0,
          zIndex: 14,
          background: '#000000',
          borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 4,
          paddingBottom: 12
        }
      },
        h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } },
            h('button', {
              type: 'button',
              className: 'omni-circle-btn',
              onClick: onBack,
              'aria-label': 'Back to Settings',
              style: { color: '#FFFFFF' }
            }, ic('ArrowLeft', 18)),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 16, fontWeight: 750, color: '#F5F5F5', letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, 'Visual Presentation & Colors'),
              h('div', { style: { fontSize: 11, color: 'rgba(255, 255, 255, 0.48)' } }, 'Live OLED canvas, accent polarity & screen layouts')
            )
          ),
          h('button', {
            type: 'button',
            onClick: function () {
              if (Engine && typeof Engine.resetPrefs === 'function') {
                Engine.resetPrefs();
                toast('Reset visual theme and layouts to Monochrome defaults.', 'info');
              }
            },
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.055)',
              border: '0.6px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }
          }, ic('RotateCcw', 12), 'Reset')
        ),

        // Pinned Miniature Live Interactive Preview Stage
        h('div', {
          style: {
            position: 'relative',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#050507',
            border: '0.6px solid rgba(255, 255, 255, 0.1)',
            minHeight: 108
          }
        },
          // Blurred ambient mesh backdrop (tracks heroBlur and palette accent/variant live)
          h('div', {
            style: {
              position: 'absolute',
              inset: -16,
              background: 'radial-gradient(circle at 18% 30%, ' + activePalette.accent + '55 0%, transparent 55%), radial-gradient(circle at 82% 70%, ' + activePalette.variant + '44 0%, transparent 58%), linear-gradient(135deg, #101116 0%, #030305 100%)',
              filter: 'blur(' + previewBlurPx + 'px)',
              transform: 'scale(1.08)',
              pointerEvents: 'none'
            }
          }),
          h('div', {
            style: {
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.82) 100%)',
              pointerEvents: 'none'
            }
          }),
          // Preview content row
          h('div', {
            style: {
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 12px'
            }
          },
            // Miniature 2:3 specular cover poster
            h('div', {
              style: {
                position: 'relative',
                width: 52,
                height: 78,
                flexShrink: 0,
                borderRadius: (prefs.posterRadius || 10) + 'px',
                overflow: 'hidden',
                background: 'linear-gradient(160deg, ' + activePalette.accent + '33 0%, #09090D 52%, ' + activePalette.variant + '44 100%)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: '0 8px 18px rgba(0, 0, 0, 0.7)'
              }
            },
              h('div', {
                style: {
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,' + sheenAlpha.toFixed(3) + ') 0%, transparent 55%)',
                  pointerEvents: 'none'
                }
              }),
              h('div', {
                style: {
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '6px 5px'
                }
              },
                h('div', { style: { width: 14, height: 2, background: activePalette.accent, borderRadius: 2 } }),
                h('div', { style: { fontSize: 6.5, fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', lineHeight: 1.2 } }, 'OBSIDIAN\nSTAR')
              )
            ),
            // Preview metadata + live hairline strip + contrast CTA
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', {
                style: {
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: activePalette.accent,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }, activePalette.name + ' · ' + (prefs.libraryLayout === 'editorial' ? 'Editorial' : 'Minimal') + ' · ' + (prefs.detailsHeader === 'jacket' ? 'Jacket' : 'Split')),
              h('div', {
                style: {
                  fontSize: 13.5,
                  fontWeight: 750,
                  color: '#F5F5F5',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }
              }, 'Chronicles of the Obsidian Star'),
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  borderTop: '0.6px solid rgba(255, 255, 255, 0.12)',
                  borderBottom: '0.6px solid rgba(255, 255, 255, 0.12)',
                  padding: '3px 0',
                  margin: '6px 0 7px',
                  fontSize: 9.5,
                  color: 'rgba(255, 255, 255, 0.65)',
                  textAlign: 'center'
                }
              },
                h('span', null, '214 CH'),
                h('span', null, '68% READ'),
                h('span', null, '42 GLS'),
                h('span', null, 'EPUB')
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 7,
                    background: activePalette.accent,
                    color: activePalette.onAccent,
                    fontSize: 10.5,
                    fontWeight: 750
                  }
                }, ic('Play', 10), 'Continue Ch. 146'),
                h('span', {
                  style: {
                    fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'rgba(255,255,255,0.5)'
                  }
                }, activePalette.accent + ' / ' + activePalette.onAccent)
              )
            )
          )
        )
      ),

      // ── 1. Accent & Surface Palette Grid (14 Presets) ──
      hairlineSectionHeader('Accent Palette (14 Presets)', activePalette.name),
      h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
          gap: 8
        }
      }, palettes.map(function (p) {
        const isSelected = prefs.themeId === p.id;
        const swatchPrimary = p.id === 'CUSTOM' ? (prefs.customHex1 || p.accent) : p.accent;
        const swatchSecondary = p.id === 'CUSTOM' ? (prefs.customHex2 || p.variant) : p.variant;
        return h('button', {
          key: p.id,
          type: 'button',
          onClick: function () { setPref('themeId', p.id); },
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 6,
            padding: '9px 10px',
            borderRadius: 8,
            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.025)',
            border: isSelected ? ('1.2px solid ' + swatchPrimary) : '0.6px solid rgba(255, 255, 255, 0.09)',
            cursor: 'pointer',
            textAlign: 'left'
          }
        },
          h('div', { style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('span', {
              style: {
                width: 22,
                height: 22,
                borderRadius: 999,
                background: 'linear-gradient(135deg, ' + swatchPrimary + ' 52%, ' + swatchSecondary + ' 52%)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-block'
              }
            }),
            isSelected && h('span', { style: { color: swatchPrimary } }, ic('Check', 13))
          ),
          h('div', {
            style: {
              fontSize: 11.5,
              fontWeight: isSelected ? 750 : 500,
              color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.78)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%'
            }
          }, p.name)
        );
      })),

      // ── Custom Dual-Hex Picker (Expanded when CUSTOM is active) ──
      prefs.themeId === 'CUSTOM' && h('div', {
        style: {
          marginTop: 12,
          padding: '12px 0',
          borderTop: '0.6px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10
        }
      },
        h('div', null,
          h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' } }, 'Primary Accent Hex'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('input', {
              type: 'color',
              value: prefs.customHex1 || '#E8C26A',
              onChange: function (e) { setPref('customHex1', e.target.value); },
              style: { width: 34, height: 34, padding: 0, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer' }
            }),
            h('input', {
              type: 'text',
              maxLength: 7,
              value: hexDraft1,
              onChange: function (e) { handleHexTyping('customHex1', e.target.value, setHexDraft1); },
              onBlur: function () { commitHexBlur('customHex1', hexDraft1, '#E8C26A', setHexDraft1); },
              style: {
                flex: 1,
                minWidth: 0,
                background: 'rgba(255,255,255,0.05)',
                border: '0.6px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '7px 8px',
                color: '#F5F5F5',
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                outline: 'none'
              }
            })
          )
        ),
        h('div', null,
          h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' } }, 'Secondary Glow Hex'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('input', {
              type: 'color',
              value: prefs.customHex2 || '#A855F7',
              onChange: function (e) { setPref('customHex2', e.target.value); },
              style: { width: 34, height: 34, padding: 0, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer' }
            }),
            h('input', {
              type: 'text',
              maxLength: 7,
              value: hexDraft2,
              onChange: function (e) { handleHexTyping('customHex2', e.target.value, setHexDraft2); },
              onBlur: function () { commitHexBlur('customHex2', hexDraft2, '#A855F7', setHexDraft2); },
              style: {
                flex: 1,
                minWidth: 0,
                background: 'rgba(255,255,255,0.05)',
                border: '0.6px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '7px 8px',
                color: '#F5F5F5',
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                outline: 'none'
              }
            })
          )
        )
      ),

      // ── 2. Screen Layouts (Clickable Wireframes) ──
      hairlineSectionHeader('Library Screen Layout', prefs.libraryLayout === 'editorial' ? 'Editorial' : 'Minimal'),
      h('div', { style: { display: 'flex', gap: 8 } },
        renderWireframeCard({
          prefKey: 'libraryLayout',
          value: 'editorial',
          active: prefs.libraryLayout === 'editorial',
          title: 'Editorial Showcase',
          desc: 'Hero carousel + resume rail + grid',
          schematic: function (tint) {
            return [
              h('div', { key: 'h', style: { height: 22, borderRadius: 3, background: tint + '33', border: '0.6px solid ' + tint } }),
              h('div', { key: 's', style: { display: 'flex', gap: 3 } },
                h('div', { style: { flex: 1, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.14)' } }),
                h('div', { style: { flex: 1, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.08)' } })
              ),
              h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, flex: 1 } },
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.16)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.12)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.09)' } })
              )
            ];
          }
        }),
        renderWireframeCard({
          prefKey: 'libraryLayout',
          value: 'minimal',
          active: prefs.libraryLayout === 'minimal',
          title: 'Minimal Classic Grid',
          desc: 'Compact header + immediate 3-col shelf',
          schematic: function (tint) {
            return [
              h('div', { key: 't', style: { height: 8, width: '58%', borderRadius: 2, background: tint } }),
              h('div', { key: 'g1', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, flex: 1 } },
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.18)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.18)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.14)' } })
              ),
              h('div', { key: 'g2', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, height: 14 } },
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.1)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.1)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.08)' } })
              )
            ];
          }
        })
      ),

      hairlineSectionHeader('Book Details Header', prefs.detailsHeader === 'jacket' ? 'Book Jacket' : 'Split Hero'),
      h('div', { style: { display: 'flex', gap: 8 } },
        renderWireframeCard({
          prefKey: 'detailsHeader',
          value: 'jacket',
          active: prefs.detailsHeader === 'jacket',
          title: 'Centered Book Jacket',
          desc: 'Floating 2:3 spine cover + halo',
          schematic: function (tint) {
            return [
              h('div', { key: 'c', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                h('div', { style: { width: 22, height: 34, borderRadius: 3, border: '1px solid ' + tint, background: tint + '2A' } })
              ),
              h('div', { key: 'b', style: { height: 7, width: '66%', margin: '0 auto', borderRadius: 2, background: tint } })
            ];
          }
        }),
        renderWireframeCard({
          prefKey: 'detailsHeader',
          value: 'split',
          active: prefs.detailsHeader === 'split',
          title: 'Full-Bleed Split Hero',
          desc: 'Edge-to-edge banner + left poster',
          schematic: function (tint) {
            return [
              h('div', { key: 'bg', style: { height: 28, borderRadius: 3, background: tint + '25', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 4, padding: 3 } },
                h('div', { style: { width: 14, height: 20, borderRadius: 2, background: tint, flexShrink: 0 } }),
                h('div', { style: { flex: 1, height: 6, borderRadius: 2, background: 'rgba(255,255,255,0.45)' } })
              ),
              h('div', { key: 's', style: { height: 8, width: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.1)' } })
            ];
          }
        })
      ),

      hairlineSectionHeader('Discover Catalog Layout', prefs.discoverLayout === 'grid' ? '3-Col Grid' : 'Source Rails'),
      h('div', { style: { display: 'flex', gap: 8 } },
        renderWireframeCard({
          prefKey: 'discoverLayout',
          value: 'grid',
          active: prefs.discoverLayout === 'grid',
          title: '3-Column Poster Grid',
          desc: 'Dense uniform cover gallery',
          schematic: function (tint) {
            return [
              h('div', { key: 'r1', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, flex: 1 } },
                h('div', { style: { borderRadius: 2, background: tint + '55' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.16)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.16)' } })
              ),
              h('div', { key: 'r2', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, flex: 1 } },
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.1)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.1)' } }),
                h('div', { style: { borderRadius: 2, background: 'rgba(255,255,255,0.1)' } })
              )
            ];
          }
        }),
        renderWireframeCard({
          prefKey: 'discoverLayout',
          value: 'rails',
          active: prefs.discoverLayout === 'rails',
          title: 'Editorial Source Rails',
          desc: 'Spotlight + horizontal rails',
          schematic: function (tint) {
            return [
              h('div', { key: 'sp', style: { height: 22, borderRadius: 3, background: tint + '30', border: '0.6px solid ' + tint } }),
              h('div', { key: 'rl', style: { display: 'flex', gap: 3, flex: 1 } },
                h('div', { style: { width: '32%', borderRadius: 2, background: 'rgba(255,255,255,0.2)' } }),
                h('div', { style: { width: '32%', borderRadius: 2, background: 'rgba(255,255,255,0.15)' } }),
                h('div', { style: { width: '32%', borderRadius: 2, background: 'rgba(255,255,255,0.1)' } })
              )
            ];
          }
        })
      ),

      // ── 3. Surface Optics & Carousel Motion ──
      hairlineSectionHeader('Surface Optics & Motion', null),
      h('div', { style: { borderTop: '0.6px solid rgba(255, 255, 255, 0.08)' } },
        // Hero Backdrop Blur pills (0, 6, 14, 24)
        h('div', {
          style: {
            padding: '13px 0',
            borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 600, color: '#F5F5F5' } }, 'Hero Backdrop Blur'),
            h('span', { style: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: activePalette.accent } }, prefs.heroBlur + 'px')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 } },
            [
              { val: 0, label: 'Sharp' },
              { val: 6, label: 'Soft' },
              { val: 14, label: 'Medium' },
              { val: 24, label: 'Deep' }
            ].map(function (opt) {
              const activeBlur = Number(prefs.heroBlur) === opt.val;
              return h('button', {
                key: opt.val,
                type: 'button',
                onClick: function () { setPref('heroBlur', opt.val); },
                style: {
                  padding: '7px 6px',
                  borderRadius: 7,
                  background: activeBlur ? activePalette.accent : 'rgba(255,255,255,0.045)',
                  color: activeBlur ? activePalette.onAccent : 'rgba(255,255,255,0.78)',
                  border: activeBlur ? 'none' : '0.6px solid rgba(255,255,255,0.09)',
                  fontSize: 11.5,
                  fontWeight: activeBlur ? 750 : 500,
                  cursor: 'pointer'
                }
              }, opt.label + ' (' + opt.val + ')');
            })
          )
        ),

        // Specular Glass Sheen slider (0-100)
        h('div', {
          style: {
            padding: '13px 0',
            borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 600, color: '#F5F5F5' } }, 'Specular Glass Sheen'),
            h('span', { style: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: activePalette.accent } }, prefs.glassSheen + '%')
          ),
          h('input', {
            type: 'range',
            min: 0,
            max: 100,
            step: 2,
            value: prefs.glassSheen,
            onChange: function (e) { setPref('glassSheen', Number(e.target.value)); },
            style: { width: '100%', accentColor: activePalette.accent, cursor: 'pointer' }
          })
        ),

        // Poster Corner Radius slider (4-16)
        h('div', {
          style: {
            padding: '13px 0',
            borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 600, color: '#F5F5F5' } }, 'Poster Corner Radius'),
            h('span', { style: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: activePalette.accent } }, prefs.posterRadius + 'px')
          ),
          h('input', {
            type: 'range',
            min: 4,
            max: 16,
            step: 1,
            value: prefs.posterRadius,
            onChange: function (e) { setPref('posterRadius', Number(e.target.value)); },
            style: { width: '100%', accentColor: activePalette.accent, cursor: 'pointer' }
          })
        ),

        // Hero Carousel Auto-Scroll switch
        h('div', {
          style: {
            padding: '13px 0',
            borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
          h('div', null,
            h('div', { style: { fontSize: 13.5, fontWeight: 600, color: '#F5F5F5' } }, 'Hero Carousel Auto-Scroll'),
            h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.48)', marginTop: 2 } }, 'Cycle featured active books automatically in Editorial Library')
          ),
          h('button', {
            type: 'button',
            className: 'switch ' + (prefs.heroAutoscroll ? 'on' : ''),
            'aria-pressed': !!prefs.heroAutoscroll,
            onClick: function () { setPref('heroAutoscroll', !prefs.heroAutoscroll); }
          })
        ),

        // Carousel Auto-Scroll Interval slider (3-15s)
        prefs.heroAutoscroll && h('div', {
          style: {
            padding: '13px 0',
            borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 600, color: '#F5F5F5' } }, 'Carousel Slide Interval'),
            h('span', { style: { fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: activePalette.accent } }, prefs.heroInterval + 's')
          ),
          h('input', {
            type: 'range',
            min: 3,
            max: 15,
            step: 1,
            value: prefs.heroInterval,
            onChange: function (e) { setPref('heroInterval', Number(e.target.value)); },
            style: { width: '100%', accentColor: activePalette.accent, cursor: 'pointer' }
          })
        )
      )
    );
  }

  return { OmniVisualSettingsScreen: OmniVisualSettingsScreen };
}));
