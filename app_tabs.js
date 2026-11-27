/**
 * app_tabs.js - Container router for main application tabs (v8.17.92)
 * Routes activeTab to TabTranslate, TabImporter, TabStudio, TabLibrary, or TabSettings.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppTabsContainer = factory();
    if (typeof window !== 'undefined') {
      window.AppTabsContainer = root.AppTabsContainer;
    }
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function AppTabsContainer(props) {
    const {
      activeTab,
      epubRestoreInputRef,
      ongoingEpubInputRef,
      handleRestoreFromEpubFiles,
      handleSelectOngoingEpubFile
    } = props;
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;

    let tabEl = null;
    if (activeTab === 'text') {
      tabEl = h(window.TabTranslate || TabTranslate, props);
    } else if (activeTab === 'web_importer') {
      tabEl = h(window.TabImporter || TabImporter, props);
    } else if (activeTab === 'studio') {
      tabEl = h(window.TabStudio || TabStudio, props);
    } else if (activeTab === 'history') {
      tabEl = h(window.TabLibrary || TabLibrary, props);
    } else if (activeTab === 'settings') {
      tabEl = h(window.TabSettings || TabSettings, props);
    }

    return h(React.Fragment, null,
      tabEl,
      // Mounted unconditionally so Restore & Continue EPUB pickers work from both Library and Discover
      h('input', {
        type: 'file',
        ref: epubRestoreInputRef,
        accept: '.epub,application/epub+zip,application/zip,application/octet-stream',
        style: { display: 'none' },
        onChange: handleRestoreFromEpubFiles
      }),
      h('input', {
        type: 'file',
        ref: ongoingEpubInputRef,
        accept: '.epub,application/epub+zip,application/zip,application/octet-stream',
        style: { display: 'none' },
        onChange: (e) => {
          const f = e.target.files?.[0];
          if (f && typeof handleSelectOngoingEpubFile === 'function') {
            handleSelectOngoingEpubFile(f);
          }
          e.target.value = '';
        }
      })
    );
  }

  return AppTabsContainer;
}));
