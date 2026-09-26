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
    const { activeTab } = props;
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;

    if (activeTab === 'text') {
      return h(window.TabTranslate || TabTranslate, props);
    }
    if (activeTab === 'web_importer') {
      return h(window.TabImporter || TabImporter, props);
    }
    if (activeTab === 'studio') {
      return h(window.TabStudio || TabStudio, props);
    }
    if (activeTab === 'history') {
      return h(window.TabLibrary || TabLibrary, props);
    }
    if (activeTab === 'settings') {
      return h(window.TabSettings || TabSettings, props);
    }
    return null;
  }

  return AppTabsContainer;
}));
