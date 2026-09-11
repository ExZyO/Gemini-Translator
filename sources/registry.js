/**
 * sources/registry.js - Central Source Plugin Registry & Router
 * Coordinates all built-in and community LNReader source plugins.
 */

(function() {
  const isNode = typeof module !== 'undefined' && module.exports;
  const SyosetuPlugin = isNode ? require('./syosetu').SyosetuPlugin : window.SyosetuPlugin;
  const WitchCultPlugin = isNode ? require('./witchcult').WitchCultPlugin : window.WitchCultPlugin;
  const RoyalRoadPlugin = isNode ? require('./royalroad').RoyalRoadPlugin : window.RoyalRoadPlugin;
  const UniversalPlugin = isNode ? require('./universal').UniversalPlugin : window.UniversalPlugin;

  class SourceRegistry {
    constructor() {
      this.plugins = new Map();
      this.universalPlugin = null;
      this.builtinIds = new Set(['syosetu', 'witchcult', 'royalroad', 'universal']);
      this.initBuiltins();
      this.loadPersistedPlugins();
    }

    initBuiltins() {
      if (SyosetuPlugin) this.register(new SyosetuPlugin());
      if (WitchCultPlugin) this.register(new WitchCultPlugin());
      if (RoyalRoadPlugin) this.register(new RoyalRoadPlugin());
      if (UniversalPlugin) {
        this.universalPlugin = new UniversalPlugin();
      }
    }

    /**
     * Rehydrate community plugins saved in localStorage
     */
    loadPersistedPlugins() {
      if (typeof localStorage === 'undefined') return;
      try {
        const raw = localStorage.getItem('gemini_installed_plugins');
        if (!raw) return;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.code) {
              try {
                this.registerLNReaderCode(item.code, false, item.meta || {});
                console.log(`[SourceRegistry] Rehydrated community plugin: ${item.id}`);
              } catch (e) {
                console.warn(`[SourceRegistry] Failed to rehydrate plugin ${item.id}:`, e.message);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[SourceRegistry] Error reading installed plugins:', err.message);
      }
    }

    /**
     * Save installed plugins to localStorage
     */
    _persistCustomPlugins() {
      if (typeof localStorage === 'undefined') return;
      try {
        const custom = [];
        for (const [id, plugin] of this.plugins.entries()) {
          if (!this.builtinIds.has(id) && plugin._rawCode) {
            custom.push({
              id,
              code: plugin._rawCode,
              meta: {
                name: plugin.name,
                site: plugin.site,
                version: plugin.version,
                icon: plugin.icon || '',
                lang: plugin.lang || ''
              }
            });
          }
        }
        localStorage.setItem('gemini_installed_plugins', JSON.stringify(custom));
      } catch (err) {
        console.warn('[SourceRegistry] Error saving plugins:', err.message);
      }
    }

    /**
     * Register a plugin instance
     * @param {BaseSourcePlugin} plugin
     */
    register(plugin) {
      if (!plugin || !plugin.id) return;
      this.plugins.set(plugin.id, plugin);
      console.log(`[SourceRegistry] Registered plugin: ${plugin.name} (${plugin.id})`);
    }

    /**
     * Check if a plugin ID is installed/active
     * @param {string} pluginId
     */
    isInstalled(pluginId) {
      return this.plugins.has(pluginId) || (this.universalPlugin && this.universalPlugin.id === pluginId);
    }

    /**
     * Unregister/uninstall a plugin by ID
     * @param {string} pluginId
     */
    unregister(pluginId) {
      if (this.builtinIds.has(pluginId)) {
        console.warn(`[SourceRegistry] Cannot unregister built-in plugin: ${pluginId}`);
        return false;
      }
      const res = this.plugins.delete(pluginId);
      this._persistCustomPlugins();
      return res;
    }

    /**
     * Find best matching plugin for a novel or chapter URL
     * @param {string} url
     * @returns {BaseSourcePlugin}
     */
    findPlugin(url) {
      if (!url) return this.universalPlugin;

      for (const plugin of this.plugins.values()) {
        try {
          if (plugin.matches && plugin.matches(url)) {
            return plugin;
          }
        } catch (_) {}
      }

      return this.universalPlugin;
    }

    /**
     * Load an LNReader plugin from compiled JS code and register it
     * @param {string} pluginJsCode
     * @returns {BaseSourcePlugin}
     */
    registerLNReaderCode(pluginJsCode, persist = true, meta = {}) {
      const LNReaderEngine = isNode ? require('./lnreader_adapter') : window.LNReaderEngine;
      if (!LNReaderEngine || !LNReaderEngine.loadPlugin) {
        throw new Error('LNReaderEngine not loaded');
      }
      const adapter = LNReaderEngine.loadPlugin(pluginJsCode);
      adapter._rawCode = pluginJsCode;
      if (meta.lang) adapter.lang = meta.lang;
      if (meta.icon) adapter.icon = meta.icon;
      this.register(adapter);
      if (persist) {
        this._persistCustomPlugins();
      }
      return adapter;
    }

    /**
     * Fetch the official catalog of 278 LNReader community plugins
     * @returns {Promise<Array<{ id: string, name: string, site: string, lang: string, version: string, url: string, iconUrl: string }>>}
     */
    async fetchCatalog() {
      const catalogUrl = 'https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.dist/plugins.json';
      const fetchFn = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      let raw = '';
      if (fetchFn) {
        raw = await fetchFn(catalogUrl);
      } else {
        const res = await fetch(catalogUrl);
        raw = await res.text();
      }
      return JSON.parse(raw);
    }

    /**
     * Install an LNReader plugin from a remote URL
     * @param {string} pluginUrl
     * @returns {Promise<BaseSourcePlugin>}
     */
    async loadPluginFromUrl(pluginUrl, meta = {}) {
      const fetchFn = (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      let code = '';
      if (fetchFn) {
        code = await fetchFn(pluginUrl);
      } else {
        const res = await fetch(pluginUrl);
        code = await res.text();
      }
      return this.registerLNReaderCode(code, true, meta);
    }

    /**
     * Install an LNReader plugin by its catalog ID (e.g. 'novelfull', 'boxnovel', 'ranobes')
     * @param {string} pluginId
     * @returns {Promise<BaseSourcePlugin>}
     */
    async loadPluginById(pluginId) {
      const catalog = await this.fetchCatalog();
      const target = catalog.find(p => p.id.toLowerCase() === pluginId.toLowerCase());
      if (!target) {
        throw new Error(`Plugin "${pluginId}" not found in LNReader catalog. Call sourceRegistry.fetchCatalog() to inspect available plugins.`);
      }
      return this.loadPluginFromUrl(target.url, {
        name: target.name,
        site: target.site,
        version: target.version,
        lang: target.lang,
        icon: target.iconUrl || ''
      });
    }

    /**
     * Search novels across all registered sources supporting search
     * @param {string} query
     * @returns {Promise<Array<{ name: string, path: string, url: string, cover: string, source: string }>>}
     */
    async searchAll(query) {
      const searches = [];
      for (const plugin of this.plugins.values()) {
        if (typeof plugin.search === 'function') {
          searches.push(
            plugin.search(query).then(results => 
              results.map(r => ({ ...r, source: plugin.name, sourceId: plugin.id }))
            ).catch(err => {
              console.warn(`[SourceRegistry] Search failed on ${plugin.name}:`, err.message);
              return [];
            })
          );
        }
      }
      const nested = await Promise.all(searches);
      return nested.flat();
    }

    /**
     * Get list of all active plugins
     */
    listPlugins() {
      const list = Array.from(this.plugins.values()).map(p => ({
        id: p.id,
        name: p.name,
        site: p.site,
        version: p.version,
        icon: p.icon
      }));
      if (this.universalPlugin) {
        list.push({
          id: this.universalPlugin.id,
          name: this.universalPlugin.name,
          site: this.universalPlugin.site,
          version: this.universalPlugin.version,
          icon: ''
        });
      }
      return list;
    }

    /**
     * Get list of all active plugins (alias for listPlugins)
     */
    getAll() {
      return this.listPlugins();
    }
  }

  const defaultRegistry = new SourceRegistry();

  // Attach static helper methods to class for backwards compatibility
  SourceRegistry.getAll = () => defaultRegistry.listPlugins();
  SourceRegistry.listPlugins = () => defaultRegistry.listPlugins();
  SourceRegistry.isInstalled = (id) => defaultRegistry.isInstalled(id);
  SourceRegistry.unregister = (id) => defaultRegistry.unregister(id);
  SourceRegistry.loadPluginById = (id) => defaultRegistry.loadPluginById(id);
  SourceRegistry.loadPluginFromUrl = (url, meta) => defaultRegistry.loadPluginFromUrl(url, meta);
  SourceRegistry.fetchCatalog = () => defaultRegistry.fetchCatalog();
  SourceRegistry.defaultRegistry = defaultRegistry;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SourceRegistry, defaultRegistry };
  } else if (typeof window !== 'undefined') {
    window.SourceRegistry = defaultRegistry;
    window.SourceRegistryClass = SourceRegistry;
    window.sourceRegistry = defaultRegistry;
  }
})();
