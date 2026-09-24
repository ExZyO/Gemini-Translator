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

    const currentHtml = studioSubTab === 'edit'
      ? (typeof window !== 'undefined' && window.editHtml ? window.editHtml : (typeof editHtml !== 'undefined' ? editHtml : ''))
      : (studioSubTab === 'split'
          ? (typeof window !== 'undefined' && window.splitHtml ? window.splitHtml : (typeof splitHtml !== 'undefined' ? splitHtml : ''))
          : (typeof window !== 'undefined' && window.mergeHtml ? window.mergeHtml : (typeof mergeHtml !== 'undefined' ? mergeHtml : '')));

    return h(React.Fragment, null,
      h('div', { className: 'seg-wide' },
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
