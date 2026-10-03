/**
 * app_tab_studio.js - Tab 3 (EPUB Studio / Ebook Editor, Splitter & Merger) for Gemini Translator
 * Provides the sub-tab navigator and host mounting container for:
 *   1. ✏️ Edit Ebook (epub_editor.js)
 *   2. 📚 Split into Volumes (splitter.js)
 *   3. 📖 Merge into One Book (merger.js)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function TabStudio(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;

    const {
      studioSubTab = (typeof window !== 'undefined' && window.studioSubTab) || 'split',
      setStudioSubTab = function() {},
      activeTab = 'studio'
    } = props || {};

    const handleSelectSubTab = (sub) => {
      setStudioSubTab(sub);
      try {
        localStorage.setItem('studioSubTab', sub);
        if (typeof window !== 'undefined') window.studioSubTab = sub;
      } catch (e) {}

      if (typeof window !== 'undefined' && typeof window.switchStudioSubTab === 'function') {
        window.switchStudioSubTab(sub);
      } else {
        setTimeout(() => {
          if (sub === 'edit' && typeof window !== 'undefined' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
          }
          if (sub === 'split' && typeof window !== 'undefined' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
          }
          if (sub === 'merge' && typeof window !== 'undefined' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
          }
        }, 40);
      }
    };

    // Sub-tab auto-initialization effect
    if (typeof React !== 'undefined' && React.useEffect) {
      React.useEffect(() => {
        if (activeTab !== 'studio') return;
        const timer = setTimeout(() => {
          if (studioSubTab === 'edit' && typeof window !== 'undefined' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
          }
          if (studioSubTab === 'split' && typeof window !== 'undefined' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
          }
          if (studioSubTab === 'merge' && typeof window !== 'undefined' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
          }
        }, 40);
        return () => clearTimeout(timer);
      }, [studioSubTab, activeTab]);
    }

    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function() {};
    const confirmAction = (typeof window !== 'undefined' && window.confirmAction) || props?.confirmAction || function(msg, cb) { if (confirm(msg)) cb(); };

    const handleResetStudio = () => {
      confirmAction('Reset current EPUB Studio tool to clean state? Any unsaved edits will be discarded.', () => {
        try {
          if (studioSubTab === 'edit') {
            const btn = document.getElementById('btn-edit-reset-book');
            if (btn) btn.click();
            else if (typeof window.initEpubEditor === 'function') window.initEpubEditor();
          } else if (studioSubTab === 'split') {
            const btn = document.getElementById('btn-reset');
            if (btn) btn.click();
            else if (typeof window.initSplitter === 'function') window.initSplitter();
          } else if (studioSubTab === 'merge') {
            const btn = document.getElementById('btn-clear-all-merge');
            if (btn) btn.click();
            else if (typeof window.initMerger === 'function') window.initMerger();
          }
          toast('Studio tool reset to clean state.', 'info');
        } catch (e) {
          toast('Studio reset: ' + e.message, 'warning');
        }
      });
    };

    const currentHtml = studioSubTab === 'edit'
      ? (typeof window !== 'undefined' && window.editHtml ? window.editHtml : (typeof editHtml !== 'undefined' ? editHtml : ''))
      : (studioSubTab === 'split'
          ? (typeof window !== 'undefined' && window.splitHtml ? window.splitHtml : (typeof splitHtml !== 'undefined' ? splitHtml : ''))
          : (typeof window !== 'undefined' && window.mergeHtml ? window.mergeHtml : (typeof mergeHtml !== 'undefined' ? mergeHtml : '')));

    return h(React.Fragment, null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
        h('div', { className: 'seg-wide', style: { flex: 1, minWidth: 260, margin: 0 } },
          h('span', {
            className: studioSubTab === 'edit' ? 'on' : '',
            onClick: () => handleSelectSubTab('edit'),
            role: 'button',
            title: 'Full WYSIWYG and chapter prose editor'
          }, '✏️ Edit Ebook'),
          h('span', {
            className: studioSubTab === 'split' ? 'on' : '',
            onClick: () => handleSelectSubTab('split'),
            role: 'button',
            title: 'Split continuous web novels into volumes'
          }, 'Split into Volumes'),
          h('span', {
            className: studioSubTab === 'merge' ? 'on' : '',
            onClick: () => handleSelectSubTab('merge'),
            role: 'button',
            title: 'Merge multiple EPUB volumes into one consolidated book'
          }, 'Merge into One Book')
        ),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: {
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            whiteSpace: 'nowrap'
          },
          onClick: handleResetStudio,
          title: 'Reset active studio tool and close open files'
        }, '✕ Reset Studio')
      ),
      h('div', {
        className: 'studio-host',
        dangerouslySetInnerHTML: {
          __html: currentHtml
        }
      })
    );
  }

  return { TabStudio };
}));
