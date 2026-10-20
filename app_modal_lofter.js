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
      className: 'gloss-overlay',
      style: { zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        className: 'gloss-box',
        style: {
          maxWidth: 520,
          width: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          background: 'var(--surface-modal, #11131a)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden'
        }
      },
        // Header
        h('div', {
          className: 'gloss-head',
          style: {
            padding: '14px 18px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Shield', 18),
            h('span', { style: { fontWeight: 700, fontSize: 15, color: 'var(--paper)' } }, 'Lofter Account Session Vault')
          ),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            style: { cursor: 'pointer', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' },
            onClick: onClose,
            title: 'Close'
          }, ic('X', 14))
        ),

        // Body
        h('div', {
          style: {
            padding: '18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          // Status card
          h('div', {
            style: {
              padding: '12px 14px',
              borderRadius: 10,
              border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--hairline)',
              background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
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
                  background: isConnected ? '#10b981' : '#64748b'
                }
              }),
              h('div', null,
                h('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--paper)' } },
                  isConnected ? 'Active Account Session' : 'No Session Connected'
                ),
                h('div', { style: { fontSize: 11, color: 'var(--text-muted, #94a3b8)' } },
                  isConnected
                    ? `Saved in GeminiNovelDB (${auth.updatedAt ? new Date(auth.updatedAt).toLocaleDateString() : 'Active'})`
                    : 'Public access only. Member-locked chapters will be restricted.'
                )
              )
            ),
            isConnected && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { color: '#f87171', fontSize: 11, padding: '4px 8px' },
              onClick: onDisconnect
            }, 'Disconnect')
          ),

          // Explanation
          h('div', { style: { fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted, #94a3b8)' } },
            'Provides your Lofter login credentials to authenticate chapter and illustration downloads, unlocking author member posts and bypassing anti-bot checks.'
          ),

          // Primary login button
          h('button', {
            type: 'button',
            disabled: isConnecting,
            style: {
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: isConnecting ? 'default' : 'pointer',
              opacity: isConnecting ? 0.7 : 1
            },
            onClick: onInAppLogin
          },
            ic('LogIn', 15),
            isConnecting ? 'Opening In-App Login...' : 'One-Tap In-App Web Login'
          ),

          // Manual cookie toggle
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 } },
            h('span', { style: { fontSize: 11, color: 'var(--text-muted, #94a3b8)' } }, 'Advanced: manual cookie input'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { fontSize: 11, padding: '2px 6px', color: 'var(--accent, #6366f1)' },
              onClick: () => setShowManual(!showManual)
            }, showManual ? 'Hide' : 'Paste Cookie')
          ),

          // Manual cookie input box
          showManual && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('textarea', {
              style: {
                width: '100%',
                padding: '8px 10px',
                fontSize: 11,
                fontFamily: 'monospace',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border)',
                color: 'var(--paper)',
                resize: 'vertical',
                minHeight: 60
              },
              placeholder: 'Paste raw Cookie header (e.g. NTES_PASSPORT=...; NTES_SESS=...)',
              value: manualVal,
              onChange: (e) => setManualVal(e.target.value)
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
              h('button', {
                type: 'button',
                className: 'mini-btn primary',
                style: { padding: '6px 14px', fontSize: 12 },
                onClick: () => onSaveManualCookie(manualVal)
              }, 'Save Cookie to Vault')
            )
          ),

          // Privacy note
          h('div', {
            style: {
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: 11,
              lineHeight: 1.4,
              color: 'var(--text-muted, #94a3b8)'
            }
          },
            h('strong', { style: { color: 'var(--paper)' } }, 'Privacy Guarantee: '),
            'Your session credentials never leave this device. They are stored securely in IndexedDB and sent strictly to NetEase servers when requesting chapters.'
          )
        ),

        // Footer
        h('div', {
          className: 'gloss-foot',
          style: {
            padding: '12px 18px',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)'
          }
        },
          h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: { padding: '6px 16px', borderRadius: 8 },
            onClick: onClose
          }, 'Done')
        )
      )
    );
  }

  return LofterAuthModal;
}));
