/**
 * app_modal_lofter.js - Lofter Account Session Vault Modal Component
 * Provides one-tap in-app web login and manual cookie vault management.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LofterAuthModal = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function LofterAuthModal(props) {
    const { isOpen, onClose, auth, onInAppLogin, onSaveManualCookie, onDisconnect, isConnecting } = props || {};
    if (!isOpen) return null;
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const useState = (typeof React !== 'undefined' ? React.useState : window.React?.useState) || function(i) { return [i, function() {}]; };
    const ic = (typeof window !== 'undefined' && window.ic) || function() { return null; };

    const [manualVal, setManualVal] = useState(auth?.cookieString || '');
    const [showManual, setShowManual] = useState(false);

    const isConnected = Boolean(auth && auth.cookieString);

    return h('div', {
      className: 'omni-sheet-backdrop',
      style: { position: 'fixed', inset: 0, zIndex: 10045 },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        className: 'omni-sheet',
        style: {
          padding: '10px 0 calc(20px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column'
        },
        onClick: (e) => e.stopPropagation()
      },
        h('div', { className: 'p-sheet-handle' }),
        // Header
        h('div', {
          className: 'p-topbar',
          style: { position: 'static', background: 'transparent', padding: '4px 16px 12px', minHeight: 44 }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Shield', 18),
            h('span', { style: { fontWeight: 700, fontSize: 16, color: 'var(--p-ink)' } }, 'Lofter Session Vault')
          ),
          h('button', {
            type: 'button',
            className: 'p-icon-btn',
            onClick: onClose,
            title: 'Close'
          }, ic('X', 17))
        ),

        // Body
        h('div', {
          style: {
            padding: '14px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          // Status strip
          h('div', {
            style: {
              padding: '12px 14px',
              borderRadius: 14,
              background: isConnected ? 'rgba(34, 197, 94, 0.12)' : 'var(--p-input, #171A21)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('div', {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isConnected ? '#22c55e' : 'var(--p-dim)'
                }
              }),
              h('div', null,
                h('div', { style: { fontSize: 13.5, fontWeight: 650, color: 'var(--p-ink)' } },
                  isConnected ? 'Active Account Session' : 'No Session Connected'
                ),
                h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)' } },
                  isConnected
                    ? `Saved offline (${auth.updatedAt ? new Date(auth.updatedAt).toLocaleDateString() : 'Active'})`
                    : 'Public access only. Member-locked chapters will be restricted.'
                )
              )
            ),
            isConnected && h('button', {
              type: 'button',
              className: 'p-pill-btn is-danger',
              style: { height: 28, fontSize: 11.5, padding: '0 10px' },
              onClick: onDisconnect
            }, 'Disconnect')
          ),

          // Explanation
          h('div', { style: { fontSize: 12.5, lineHeight: 1.5, color: 'var(--p-muted)' } },
            'Provides your Lofter login credentials to authenticate chapter and illustration downloads.'
          ),

          // Primary login button
          h('button', {
            type: 'button',
            disabled: isConnecting,
            className: 'p-cta-btn',
            style: {
              width: '100%',
              opacity: isConnecting ? 0.7 : 1
            },
            onClick: onInAppLogin
          },
            ic('LogIn', 15),
            isConnecting ? 'Opening In-App Login...' : 'One-Tap In-App Web Login'
          ),

          // Manual cookie toggle
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 } },
            h('span', { style: { fontSize: 12, color: 'var(--p-muted)' } }, 'Advanced: manual cookie input'),
            h('button', {
              type: 'button',
              className: 'p-pill-btn',
              style: { height: 30, fontSize: 11.5, color: 'var(--p-accent)' },
              onClick: () => setShowManual(!showManual)
            }, showManual ? 'Hide' : 'Paste Cookie')
          ),

          // Manual cookie input box
          showManual && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('textarea', {
              className: 'p-textarea',
              style: {
                fontSize: 11.5,
                fontFamily: "'IBM Plex Mono', monospace",
                minHeight: 72
              },
              placeholder: 'Paste raw Cookie header (e.g. NTES_PASSPORT=...; NTES_SESS=...)',
              value: manualVal,
              onChange: (e) => setManualVal(e.target.value)
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
              h('button', {
                type: 'button',
                className: 'p-pill-btn is-primary',
                onClick: () => onSaveManualCookie(manualVal)
              }, 'Save Cookie')
            )
          ),

          // Privacy note
          h('div', {
            style: {
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--p-input, #171A21)',
              fontSize: 11.5,
              lineHeight: 1.45,
              color: 'var(--p-muted)'
            }
          },
            h('strong', { style: { color: 'var(--p-ink)' } }, 'Privacy Guarantee: '),
            'Your session credentials stay on this device and are sent only when fetching Lofter chapters.'
          )
        )
      )
    );
  }

  return LofterAuthModal;
}));
