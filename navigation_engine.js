(function (global) {
  'use strict';

  /**
   * Resizable Box Gestures (Pointer & Touch)
   * @param {Object} options
   * @param {Function|Object} options.getHeights
   * @param {Function} options.setHeight
   * @param {Object|Function} options.refs
   * @param {Function} [options.h]
   * @returns {Object} { handlePointerResizeStart, handleTouchResizeStart, setBoxPreset, toggleBoxExpand, renderBoxResizeBar }
   */
  function initBoxResizer(options) {
    options = options || {};
    const { getHeights, setHeight, refs, h } = options;
    const createElement = h || (typeof React !== 'undefined' ? React.createElement : null);

    const getH = function (boxType) {
      if (typeof getHeights === 'function') {
        const all = getHeights();
        return all ? all[boxType] : undefined;
      }
      if (getHeights && typeof getHeights === 'object') {
        return getHeights[boxType];
      }
      return undefined;
    };

    const applyH = function (boxType, val) {
      if (typeof setHeight === 'function') {
        setHeight(boxType, val);
      }
    };

    const minHeights = { input: 120, output: 120, instructions: 50, glossary: 80 };
    const maxHeights = { input: 3500, output: 3500, instructions: 1200, glossary: 2500 };
    const defaults = { input: 220, output: 250, instructions: 80, glossary: 140 };
    const expanded = { input: 750, output: 750, instructions: 350, glossary: 550 };
    const talls = { input: 820, output: 820, instructions: 380, glossary: 600 };

    const handlePointerResizeStart = function (e, boxType) {
      if (e.button !== undefined && e.button !== 0) return;
      const startY = e.clientY;
      const startH = getH(boxType) || defaults[boxType] || 200;
      let lastH = startH;

      const targetEl = e.currentTarget || e.target;
      try {
        if (targetEl && typeof targetEl.setPointerCapture === 'function') {
          targetEl.setPointerCapture(e.pointerId);
        }
      } catch (_) {}

      const onPointerMove = function (moveEvt) {
        const delta = (moveEvt.clientY - startY);
        const newH = Math.max(minHeights[boxType] || 80, Math.min(maxHeights[boxType] || 2500, Math.round(startH + delta)));
        lastH = newH;
        applyH(boxType, newH);
      };

      const onPointerUp = function (upEvt) {
        try {
          if (targetEl && typeof targetEl.releasePointerCapture === 'function') {
            targetEl.releasePointerCapture(upEvt.pointerId);
          }
        } catch (_) {}
        if (typeof window !== 'undefined') {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
        }
        try {
          localStorage.setItem(boxType + 'BoxHeight', lastH);
        } catch (_) {}
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      }
    };

    const handleTouchResizeStart = function (e, boxType) {
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      const startY = touch.clientY;
      const startH = getH(boxType) || defaults[boxType] || 200;
      let lastH = startH;

      const onTouchMove = function (moveEvt) {
        const curTouch = moveEvt.touches && moveEvt.touches[0];
        if (!curTouch) return;
        const delta = (curTouch.clientY - startY) * 1.85;
        const newH = Math.max(minHeights[boxType] || 80, Math.min(maxHeights[boxType] || 2500, Math.round(startH + delta)));
        lastH = newH;
        applyH(boxType, newH);
      };

      const onTouchEnd = function () {
        if (typeof window !== 'undefined') {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
        }
        try {
          localStorage.setItem(boxType + 'BoxHeight', lastH);
        } catch (_) {}
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
      }
    };

    const setBoxPreset = function (boxType, preset) {
      let targetH = defaults[boxType] || 200;
      if (preset === 'S') {
        targetH = defaults[boxType] || 200;
      } else if (preset === 'auto') {
        const allRefs = typeof refs === 'function' ? refs() : refs;
        const elRef = allRefs ? allRefs[boxType] : null;
        const el = elRef ? (elRef.current || elRef) : null;
        if (el && typeof el.scrollHeight === 'number') {
          targetH = Math.max(defaults[boxType] || 200, Math.min(4000, el.scrollHeight + 25));
        } else {
          targetH = talls[boxType] || 820;
        }
      }

      applyH(boxType, targetH);
      try {
        localStorage.setItem(boxType + 'BoxHeight', targetH);
      } catch (_) {}
    };

    const toggleBoxExpand = function (boxType) {
      const cur = getH(boxType) || defaults[boxType] || 200;
      const exp = expanded[boxType] || 750;
      const def = defaults[boxType] || 220;
      const target = (cur >= exp - 60) ? def : exp;

      applyH(boxType, target);
      try {
        localStorage.setItem(boxType + 'BoxHeight', target);
      } catch (_) {}
    };

    const renderBoxResizeBar = function (boxType) {
      if (!createElement) return null;
      const cur = getH(boxType) || defaults[boxType] || 200;
      const def = defaults[boxType] || 220;
      const isExp = cur > (def + 60);

      return createElement('div', {
        className: 'py-2 flex items-center justify-center cursor-row-resize touch-none group select-none',
        onPointerDown: function (e) { handlePointerResizeStart(e, boxType); },
        onTouchStart: function (e) { handleTouchResizeStart(e, boxType); },
        onDoubleClick: function () { toggleBoxExpand(boxType); },
        title: 'Drag to resize · double-click to expand or collapse'
      },
        createElement('div', {
          className: 'w-24 h-1.5 rounded-full transition-colors',
          style: { background: isExp ? 'var(--iris-deep)' : 'var(--hairline)' }
        })
      );
    };

    return {
      handlePointerResizeStart,
      handleTouchResizeStart,
      setBoxPreset,
      toggleBoxExpand,
      renderBoxResizeBar
    };
  }

  /**
   * Deep-Link URL Router
   * @param {Object} callbacks
   * @param {Function} callbacks.onRouteNovel
   * @param {Function} [callbacks.loadFullNovel]
   * @returns {Function} cleanup
   */
  function initDeepLinkRouter(callbacks) {
    callbacks = callbacks || {};
    const handleHashRoute = async function () {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash || '';
      if (!hash || !hash.includes('novel=')) return;
      try {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const novelParam = params.get('novel');
        const chapterParam = parseInt(params.get('chapter') || '1', 10);
        if (novelParam && window.GeminiNovelDB) {
          const all = await window.GeminiNovelDB.getAllNovels();
          const target = all.find(function (n) {
            return n.id === novelParam || n.title === novelParam || (n.title && n.title.toLowerCase().includes(novelParam.toLowerCase()));
          });
          if (target) {
            const loadFn = callbacks.loadFullNovel || (window.LibraryEngine && window.LibraryEngine.loadFullNovel) || window.loadFullNovel;
            const full = typeof loadFn === 'function' ? await loadFn(target) : target;
            if (full) {
              const chs = (full.translatedChapters && full.translatedChapters.length > 0)
                ? full.translatedChapters
                : (full.rawChapters || full.chapters || []);
              if (chs.length > 0) {
                const cleanCh = function (c) {
                  const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
                  const raw = c?.text || c?.content || '';
                  return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
                };
                const cleanedChs = chs.map(function (c) {
                  return { title: c.title, content: cleanCh(c) };
                });
                const targetIdx = Math.max(0, Math.min(cleanedChs.length - 1, chapterParam - 1));
                if (typeof callbacks.onRouteNovel === 'function') {
                  callbacks.onRouteNovel(target, cleanedChs, targetIdx);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DeepLink] Routing error:', e);
      }
    };

    const timer = setTimeout(handleHashRoute, 400);
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashRoute);
    }

    let appUrlOpenHandle = null;
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const res = window.Capacitor.Plugins.App.addListener('appUrlOpen', function (data) {
        if (data?.url) {
          try {
            const u = new URL(data.url);
            if (u.hash) window.location.hash = u.hash;
          } catch (_) {}
        }
      });
      if (res && typeof res.then === 'function') {
        res.then(function (h) { appUrlOpenHandle = h; }).catch(function () {});
      } else {
        appUrlOpenHandle = res;
      }
    }

    const cleanup = function () {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleHashRoute);
      }
      if (appUrlOpenHandle && typeof appUrlOpenHandle.remove === 'function') {
        appUrlOpenHandle.remove();
        appUrlOpenHandle = null;
      }
    };
    cleanup.handleHashRoute = handleHashRoute;
    return cleanup;
  }

  /**
   * Centralized 9-tier Android & Edge-Swipe Back-Button Handler
   * @param {Object} actions
   * @param {Function} [actions.closeActiveModal]
   * @param {Function} [actions.popTab]
   * @param {Function} [actions.toast]
   * @returns {Function} cleanup
   */
  function initBackButtonHandler(actions) {
    actions = actions || {};
    let lastBackPress = 0;
    let removeListener = null;

    const handleAppBack = function () {
      // 1. Chapter Preview Mode in Edit Ebook
      if (global.isEpubEditorPreviewActive && typeof global.exitEpubEditorPreview === 'function') {
        global.exitEpubEditorPreview();
        return true;
      }

      // 2. Unsaved confirmation dialog in Edit Ebook
      const unsaved = typeof document !== 'undefined' ? document.getElementById('edit-unsaved-confirm-modal') : null;
      if (unsaved && !unsaved.classList.contains('hidden')) {
        unsaved.classList.add('hidden');
        return true;
      }

      // 3. Move & Hierarchy Sheet in Edit Ebook
      const moveModal = typeof document !== 'undefined' ? document.getElementById('edit-move-chapter-modal') : null;
      if (moveModal && !moveModal.classList.contains('hidden')) {
        moveModal.classList.add('hidden');
        return true;
      }

      // 4. Rename Chapter Modal in Edit Ebook
      const renModal = typeof document !== 'undefined' ? document.getElementById('edit-rename-modal') : null;
      if (renModal && !renModal.classList.contains('hidden')) {
        renModal.classList.add('hidden');
        return true;
      }

      // 5. Chapter Edit Prose Modal in Edit Ebook
      const chModal = typeof document !== 'undefined' ? document.getElementById('edit-chapter-modal') : null;
      if (chModal && !chModal.classList.contains('hidden')) {
        if (global.isEpubEditorPreviewActive && typeof global.exitEpubEditorPreview === 'function') {
          global.exitEpubEditorPreview();
          return true;
        }
        if (typeof global.requestCloseChapterModal === 'function') {
          global.requestCloseChapterModal();
        } else {
          chModal.classList.add('hidden');
        }
        return true;
      }

      // 6. Other Studio Modals (Gallery Lightbox, Gallery, Find & Replace, Auto-Number, Library)
      const galLightbox = typeof document !== 'undefined' ? document.getElementById('edit-gallery-lightbox') : null;
      if (galLightbox && (galLightbox.style.display === 'flex' || !galLightbox.classList.contains('hidden'))) {
        if (typeof global.closeGalleryLightbox === 'function') {
          global.closeGalleryLightbox();
        } else {
          galLightbox.style.display = 'none';
          galLightbox.classList.add('hidden');
        }
        return true;
      }
      const galModal = typeof document !== 'undefined' ? document.getElementById('edit-gallery-modal') : null;
      if (galModal && (galModal.style.display === 'flex' || !galModal.classList.contains('hidden'))) {
        if (typeof global.closeGalleryModal === 'function') {
          global.closeGalleryModal();
        } else {
          galModal.style.display = 'none';
          galModal.classList.add('hidden');
        }
        return true;
      }
      const frModal = typeof document !== 'undefined' ? document.getElementById('edit-find-replace-modal') : null;
      if (frModal && !frModal.classList.contains('hidden')) {
        frModal.classList.add('hidden');
        return true;
      }
      const anModal = typeof document !== 'undefined' ? document.getElementById('edit-autonumber-modal') : null;
      if (anModal && !anModal.classList.contains('hidden')) {
        anModal.classList.add('hidden');
        return true;
      }
      const libModal = typeof document !== 'undefined' ? document.getElementById('edit-library-modal') : null;
      if (libModal && !libModal.classList.contains('hidden')) {
        libModal.classList.add('hidden');
        return true;
      }

      // 7. React App Modals & Overlays
      if (typeof actions.closeActiveModal === 'function') {
        const handled = actions.closeActiveModal();
        if (handled) return true;
      }

      // 8. Secondary Tab -> Return to Library or Translate
      if (typeof actions.popTab === 'function') {
        const handled = actions.popTab();
        if (handled) return true;
      }

      // 9. Root Level -> Double-tap within 2s to exit app
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        if (global.Capacitor?.Plugins?.App?.exitApp) {
          global.Capacitor.Plugins.App.exitApp();
        }
      } else {
        lastBackPress = now;
        const showToast = actions.toast || global.toast;
        if (typeof showToast === 'function') {
          showToast('Press back again to exit', 'info');
        } else if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg: 'Press back again to exit', type: 'info' } }));
          } catch (_) {}
        }
      }
      return true;
    };

    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const res = window.Capacitor.Plugins.App.addListener('backButton', function () {
        handleAppBack();
      });
      if (res && typeof res.then === 'function') {
        res.then(function (h) {
          removeListener = h;
        }).catch(function () {});
      } else {
        removeListener = res;
      }
    }

    const cleanup = function () {
      if (removeListener && typeof removeListener.remove === 'function') {
        removeListener.remove();
        removeListener = null;
      }
    };
    cleanup.handleAppBack = handleAppBack;
    return cleanup;
  }

  const NavigationEngine = {
    initBoxResizer,
    initDeepLinkRouter,
    initBackButtonHandler
  };

  global.NavigationEngine = NavigationEngine;
})(typeof window !== 'undefined' ? window : this);
