/**
 * Gemini Translator - Application Modals Suite
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

  function DownloadSuccessModal(props) {
    const { downloadSuccessModal, setDownloadSuccessModal } = props || {};
    if (!downloadSuccessModal) return null;
    const h = getH();
    const isEpub = (downloadSuccessModal.fileName || '').toLowerCase().endsWith('.epub');
    const isContinuation = !!downloadSuccessModal.isContinuation;

    const reactObj = typeof React !== 'undefined' ? React : window.React;
    if (reactObj && reactObj.useEffect) {
      reactObj.useEffect(() => {
        const timer = setTimeout(() => {
          if (typeof setDownloadSuccessModal === 'function') setDownloadSuccessModal(null);
        }, 10000);
        return () => clearTimeout(timer);
      }, [downloadSuccessModal]);
    }

    const handleOpenInReader = async () => {
      try {
        if (window.NativeBridge && window.NativeBridge.openWithReader) {
          const opened = await window.NativeBridge.openWithReader(downloadSuccessModal.fileName, downloadSuccessModal.path || '');
          if (opened) { setDownloadSuccessModal(null); return; }
        }
      } catch (e) { console.warn('Reader open error:', e); }
      if (typeof window.toast === 'function') window.toast('Opening in Moon+ Reader…', 'info');
      setDownloadSuccessModal(null);
    };

    return h('div', {
      style: { position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom, 16px))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 420, zIndex: 10100, pointerEvents: 'auto' }
    },
      h('div', {
        className: 'download-success-toast',
        style: { background: 'rgba(22, 27, 34, 0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: 16, padding: '12px 14px', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4)', display: 'flex', flexDirection: 'column', gap: 10, animation: 'sheetSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 } },
            h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 } }, ic('CheckCircle', 18, 'text-emerald-400')),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-color, #f1f5f9)', lineHeight: 1.2 } },
                isContinuation ? (downloadSuccessModal.newChaptersCount ? `EPUB Updated (+${downloadSuccessModal.newChaptersCount} ch)` : 'EPUB Updated') : 'File Saved'
              ),
              h('div', { style: { fontSize: 11, color: 'var(--slate, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 } }, downloadSuccessModal.fileName)
            )
          ),
          h('button', {
            type: 'button',
            onClick: () => setDownloadSuccessModal(null),
            style: { background: 'transparent', border: 'none', color: 'var(--slate, #94a3b8)', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }, ic('X', 14))
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          isEpub && h('button', {
            type: 'button',
            onClick: handleOpenInReader,
            style: { flex: 1, padding: '7px 12px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#38bdf8', color: '#0f172a', borderRadius: 8, border: 'none', cursor: 'pointer' }
          }, ic('BookOpen', 14), 'Open in Moon+ Reader'),
          h('button', {
            type: 'button',
            onClick: () => setDownloadSuccessModal(null),
            style: { padding: '7px 12px', fontSize: 12, color: 'var(--text-secondary, #cbd5e1)', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }
          }, 'Done')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 18. EPUB PACKAGING PROGRESS DOCK
  // ─────────────────────────────────────────────────────────────────────────
  function EpubPackagingProgressDock(props) {
    const {
      epubPackagingModal,
      setEpubPackagingModal
    } = props || {};

    if (!epubPackagingModal) return null;
    const h = getH();

    return h('div', {
      style: {
        position: 'fixed',
        bottom: '76px',
        left: '12px',
        right: '12px',
        maxWidth: '440px',
        margin: '0 auto',
        zIndex: 85,
        pointerEvents: 'auto',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '16px',
        boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        padding: '14px 16px'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 } },
          h('div', {
            style: {
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: '0 3px 8px rgba(99, 102, 241, 0.4)',
              color: '#fff'
            }
          }, ic('Package', 16)),
          h('div', { style: { minWidth: 0, flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#f8fafc', lineHeight: 1.2 } }, 'Packaging EPUB…'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, epubPackagingModal.title || 'Novel Archive')
          )
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', {
            style: {
              fontWeight: 800,
              fontSize: 14,
              color: '#818cf8',
              fontFamily: "'IBM Plex Mono', monospace"
            }
          }, `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`),
          h('button', {
            type: 'button',
            style: {
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              cursor: 'pointer',
              padding: 0
            },
            onClick: () => setEpubPackagingModal(null),
            'aria-label': 'Dismiss loading card',
            title: 'Dismiss loading card'
          }, ic('X', 12))
        )
      ),

      // Animated Visual Progress Bar
      h('div', {
        style: {
          width: '100%',
          height: 6,
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          margin: '8px 0 10px',
          position: 'relative'
        }
      },
        h('div', {
          style: {
            height: '100%',
            width: `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #10b981 100%)',
            borderRadius: 999,
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        })
      ),

      // Status message and elapsed time
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#94a3b8' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 } },
          h('span', { style: { width: 6, height: 6, minWidth: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' } }),
          h('span', { style: { fontWeight: 500, color: '#cbd5e1', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, epubPackagingModal.status || 'Compiling...')
        ),
        epubPackagingModal.elapsed && h('div', {
          style: {
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            background: 'rgba(255, 255, 255, 0.07)',
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            color: '#cbd5e1'
          }
        }, `⏱ ${epubPackagingModal.elapsed}`)
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 18B. TOAST ITEM (Touch & Pointer Swipe to Dismiss / Swipe Down to Dismiss All)
  // ─────────────────────────────────────────────────────────────────────────
  function ToastItem(props) {
    const { toast, onDismiss, onDismissAll } = props;
    const h = getH();
    const elRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(null) : { current: null };
    const gestureRef = (typeof React !== 'undefined' && React.useRef)
      ? React.useRef({ startX: 0, startY: 0, deltaX: 0, deltaY: 0, swiping: false })
      : { current: { startX: 0, startY: 0, deltaX: 0, deltaY: 0, swiping: false } };

    const handlePointerDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      const g = gestureRef.current;
      g.startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      g.startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      g.deltaX = 0;
      g.deltaY = 0;
      g.swiping = true;
      if (elRef.current) {
        elRef.current.style.transition = 'none';
        if (typeof elRef.current.setPointerCapture === 'function' && e.pointerId !== undefined) {
          try { elRef.current.setPointerCapture(e.pointerId); } catch (_) {}
        }
      }
    };

    const handlePointerMove = (e) => {
      const g = gestureRef.current;
      if (!g.swiping || !elRef.current) return;
      const curX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const curY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      g.deltaX = curX - g.startX;
      g.deltaY = curY - g.startY;

      // Downward swipe (gesture to clear all toasts)
      if (g.deltaY > 10 && Math.abs(g.deltaY) > Math.abs(g.deltaX) * 1.1) {
        elRef.current.style.transform = `translateY(${g.deltaY}px)`;
        elRef.current.style.opacity = String(Math.max(0.08, 1 - g.deltaY / 160));
      } else {
        // Horizontal swipe (gesture to dismiss individual toast)
        elRef.current.style.transform = `translateX(${g.deltaX}px)`;
        elRef.current.style.opacity = String(Math.max(0.08, 1 - Math.abs(g.deltaX) / 200));
      }
    };

    const handlePointerEnd = (e) => {
      const g = gestureRef.current;
      if (!g.swiping || !elRef.current) return;
      g.swiping = false;

      // Downward swipe -> Dismiss ALL toasts
      if (g.deltaY > 45 && Math.abs(g.deltaY) > Math.abs(g.deltaX)) {
        elRef.current.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        elRef.current.style.transform = 'translateY(120px)';
        elRef.current.style.opacity = '0';
        setTimeout(() => {
          if (typeof onDismissAll === 'function') onDismissAll();
        }, 160);
        return;
      }

      // Horizontal swipe -> Dismiss this single toast
      if (Math.abs(g.deltaX) > 55) {
        elRef.current.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        elRef.current.style.transform = `translateX(${g.deltaX > 0 ? 350 : -350}px)`;
        elRef.current.style.opacity = '0';
        setTimeout(() => {
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }, 160);
        return;
      }

      // Snap back if threshold was not reached
      elRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      elRef.current.style.transform = 'translate(0px, 0px)';
      elRef.current.style.opacity = '1';
    };

    return h('div', {
      key: toast.id,
      ref: elRef,
      className: `toast ${toast.type || 'success'}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        textAlign: 'left'
      },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd
    },
      h('span', { style: { flex: 1, pointerEvents: 'none' } }, toast.msg),
      toast.action && h('button', {
        type: 'button',
        className: 'mini-btn',
        style: {
          background: '#ffffff',
          color: '#111827',
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 800,
          borderRadius: 6,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          flexShrink: 0
        },
        onClick: (e) => {
          e.stopPropagation();
          if (typeof toast.action.onClick === 'function') toast.action.onClick();
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }
      }, toast.action.label || 'Undo'),
      h('button', {
        type: 'button',
        className: 'toast-dismiss-btn',
        'aria-label': 'Dismiss toast',
        title: 'Dismiss toast',
        onClick: (e) => {
          e.stopPropagation();
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }
      }, ic('X', 12))
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 19. APP MODALS CONTAINER (Consolidated Root Modal Container)
  // ─────────────────────────────────────────────────────────────────────────

  return { DownloadSuccessModal, EpubPackagingProgressDock, ToastItem };
}));
