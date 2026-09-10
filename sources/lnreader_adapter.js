/**
 * sources/lnreader_adapter.js - LNReader v3 Plugin Adapter & Runner
 * Executes community LNReader plugins directly within Gemini Translator.
 */

(function() {
  const FilterTypes = {
    TextInput: 'Text',
    Picker: 'Picker',
    CheckboxGroup: 'Checkbox',
    Switch: 'Switch',
    ExcludableCheckboxGroup: 'XCheckbox'
  };

  const NovelStatus = {
    Unknown: 'Unknown',
    Ongoing: 'Ongoing',
    Completed: 'Completed',
    Licensed: 'Licensed',
    PublishingFinished: 'Publishing Finished',
    Cancelled: 'Cancelled',
    OnHiatus: 'On Hiatus',
    STUB: 'STUB',
    Inactive: 'Inactive'
  };

  const defaultCover = 'https://github.com/LNReader/lnreader-plugins/blob/main/icons/src/coverNotAvailable.jpg?raw=true';

  /**
   * Lightweight Cheerio browser/DOM shim for LNReader plugins.
   * Maps Cheerio syntax directly to native DOM manipulation.
   */
  function createCheerioShim() {
    return {
      load: function(html) {
        let doc;
        if (typeof DOMParser !== 'undefined') {
          try {
            doc = new DOMParser().parseFromString(html || '', 'text/html');
          } catch (_) {
            doc = null;
          }
        }
        if (!doc && typeof document !== 'undefined') {
          doc = document.implementation.createHTMLDocument('');
          doc.documentElement.innerHTML = html || '';
        }

        function wrapElements(elements) {
          const list = Array.isArray(elements) ? elements : (elements ? [elements] : []);
          const wrapper = function(selector) {
            if (!selector) return wrapElements([]);
            const results = [];
            list.forEach(el => {
              if (el && el.querySelectorAll) {
                try {
                  const matches = el.querySelectorAll(selector);
                  matches.forEach(m => results.push(m));
                } catch (_) {}
              }
            });
            return wrapElements(results);
          };

          wrapper.length = list.length;
          wrapper[0] = list[0];
          wrapper.get = (idx) => (typeof idx === 'number' ? list[idx] : list);

          wrapper.find = function(selector) {
            return wrapper(selector);
          };

          wrapper.children = function() {
            const kids = [];
            list.forEach(el => {
              if (el && el.children) {
                for (let i = 0; i < el.children.length; i++) kids.push(el.children[i]);
              }
            });
            return wrapElements(kids);
          };

          wrapper.each = function(callback) {
            list.forEach((el, i) => {
              callback(i, el);
            });
            return wrapper;
          };

          wrapper.map = function(callback) {
            const results = list.map((el, i) => callback(i, el));
            return {
              get: () => results,
              toArray: () => results
            };
          };

          wrapper.text = function() {
            return list.map(el => (el ? el.textContent || '' : '')).join(' ');
          };

          wrapper.html = function() {
            if (list.length === 0 || !list[0]) return '';
            return list[0].innerHTML || '';
          };

          wrapper.attr = function(name) {
            if (list.length === 0 || !list[0] || !list[0].getAttribute) return undefined;
            return list[0].getAttribute(name) || undefined;
          };

          wrapper.remove = function() {
            list.forEach(el => {
              if (el && el.parentNode) el.parentNode.removeChild(el);
            });
            return wrapper;
          };

          return wrapper;
        }

        const rootWrapper = function(selector) {
          if (!doc) return wrapElements([]);
          if (typeof selector === 'object' && selector) {
            return wrapElements(selector);
          }
          if (typeof selector === 'string') {
            try {
              const nodes = Array.from(doc.querySelectorAll(selector));
              return wrapElements(nodes);
            } catch (_) {
              return wrapElements([]);
            }
          }
          return wrapElements([]);
        };

        rootWrapper.html = function() {
          return doc ? (doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML) : '';
        };

        return rootWrapper;
      }
    };
  }

  /**
   * LNReaderPluginAdapter
   * Wraps an LNReader plugin instance and provides Gemini Translator standard methods.
   */
  class LNReaderPluginAdapter {
    constructor(pluginInstance) {
      this.plugin = pluginInstance;
      this.id = pluginInstance.id || 'lnreader_custom';
      this.name = pluginInstance.name || 'LNReader Plugin';
      this.site = pluginInstance.site || '';
      this.version = pluginInstance.version || '1.0.0';
      this.icon = pluginInstance.icon || '';
      this.filters = pluginInstance.filters || {};
    }

    matches(url) {
      if (!this.site || !url) return false;
      try {
        const u = new URL(url);
        const s = new URL(this.site);
        return u.hostname === s.hostname || u.hostname.endsWith('.' + s.hostname);
      } catch (_) {
        return url.includes(this.site);
      }
    }

    async search(query, page = 1) {
      if (typeof this.plugin.searchNovels === 'function') {
        const results = await this.plugin.searchNovels(query, page);
        return (results || []).map(r => ({
          name: r.name || 'Untitled',
          path: r.path || '',
          url: this.resolveUrl(r.path),
          cover: r.cover || defaultCover
        }));
      }
      return [];
    }

    resolveUrl(path) {
      if (!path) return '';
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      if (typeof this.plugin.resolveUrl === 'function') {
        try { return this.plugin.resolveUrl(path); } catch (_) {}
      }
      const base = this.site.endsWith('/') ? this.site.slice(0, -1) : this.site;
      const rel = path.startsWith('/') ? path : '/' + path;
      return base + rel;
    }

    async getNovelDetails(url) {
      // In LNReader, path is usually relative or stripped
      let path = url;
      if (url.startsWith(this.site)) {
        path = url.substring(this.site.length);
        if (!path.startsWith('/')) path = '/' + path;
      }
      const raw = await this.plugin.parseNovel(path);
      const chapters = (raw.chapters || []).map((c, idx) => ({
        title: c.name || `Chapter ${idx + 1}`,
        url: this.resolveUrl(c.path),
        path: c.path,
        releaseDate: c.releaseTime || '',
        order: idx + 1
      }));

      return {
        id: this.id + '_' + (path.replace(/[^a-zA-Z0-9]/g, '_')),
        title: raw.name || 'Untitled Novel',
        author: raw.author || 'Unknown Author',
        cover: raw.cover || defaultCover,
        summary: raw.summary || '',
        status: raw.status || 'Unknown',
        genres: Array.isArray(raw.genres) ? raw.genres : (raw.genres ? [raw.genres] : []),
        chapters
      };
    }

    async getChapter(chapterUrl, options = {}) {
      let path = chapterUrl;
      if (chapterUrl.startsWith(this.site)) {
        path = chapterUrl.substring(this.site.length);
        if (!path.startsWith('/')) path = '/' + path;
      }
      const html = await this.plugin.parseChapter(path);
      return {
        title: options.title || 'Chapter',
        content: html || '',
        originalTitle: options.title || ''
      };
    }
  }

  /**
   * Evaluates and instantiates an LNReader plugin from compiled JS code.
   * @param {string} pluginJsCode
   * @param {Object} [fetcherOverride]
   * @returns {LNReaderPluginAdapter}
   */
  function loadLNReaderPlugin(pluginJsCode, fetcherOverride = null) {
    const defaultFetchApi = async (url, init = {}) => {
      const fetchFn = fetcherOverride || (window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      let rawText = '';
      if (fetchFn) {
        rawText = await fetchFn(url, init);
      } else {
        const res = await fetch(url, init);
        rawText = await res.text();
      }
      return {
        text: async () => rawText,
        json: async () => JSON.parse(rawText)
      };
    };

    const cheerioShim = (typeof window !== 'undefined' && window.cheerio) ? window.cheerio : createCheerioShim();

    const mockRequire = (id) => {
      if (id === 'cheerio') return cheerioShim;
      if (id === '@libs/fetch') return { fetchApi: defaultFetchApi, fetchFile: async () => '' };
      if (id === '@libs/defaultCover') return { defaultCover };
      if (id === '@libs/novelStatus') return { NovelStatus };
      if (id === '@libs/filterInputs') return { FilterTypes };
      if (id.includes('filterInputs')) return { FilterTypes };
      if (id.includes('defaultCover')) return { defaultCover };
      if (id.includes('novelStatus')) return { NovelStatus };
      throw new Error('LNReader sandbox: module not found: ' + id);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('module', 'exports', 'require', 'console', pluginJsCode);
    fn(moduleObj, moduleObj.exports, mockRequire, console);

    const pluginInstance = moduleObj.exports.default || moduleObj.exports;
    return new LNReaderPluginAdapter(pluginInstance);
  }

  const LNReaderEngine = {
    FilterTypes,
    NovelStatus,
    defaultCover,
    createCheerioShim,
    LNReaderPluginAdapter,
    loadPlugin: loadLNReaderPlugin
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LNReaderEngine;
  } else if (typeof window !== 'undefined') {
    window.LNReaderEngine = LNReaderEngine;
  }
})();
