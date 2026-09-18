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
   * Helper to query DOM elements safely supporting jQuery/Cheerio pseudo-selectors like :contains("...")
   */
  function safeQuerySelectorAll(root, selector) {
    if (!root || !selector) return [];
    const trimmed = selector.trim();

    // Handle jQuery/Cheerio :contains("text") pseudo selector
    if (/:contains\(/i.test(trimmed)) {
      const match = trimmed.match(/^(.*?):contains\((['"]?)(.*?)\2\)(.*)$/i);
      if (match) {
        const baseSel = match[1].trim() || '*';
        const needle = match[3];
        const tailSel = match[4].trim();

        let baseElements = [];
        try {
          baseElements = Array.from(root.querySelectorAll(baseSel));
        } catch (_) {
          baseElements = Array.from(root.querySelectorAll('*'));
        }

        const filtered = baseElements.filter(el => (el.textContent || '').includes(needle));
        if (tailSel) {
          const results = [];
          filtered.forEach(parent => {
            try {
              const matched = parent.querySelectorAll(tailSel);
              matched.forEach(m => results.push(m));
            } catch (_) {}
          });
          return results;
        }
        return filtered;
      }
    }

    try {
      return Array.from(root.querySelectorAll(trimmed));
    } catch (_) {
      return [];
    }
  }

  /**
   * Comprehensive Cheerio browser/DOM shim for LNReader plugins.
   * Maps Cheerio & jQuery traversal methods directly to native DOM manipulation.
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
          const rawList = Array.isArray(elements) ? elements : (elements ? [elements] : []);
          const list = rawList.filter(Boolean);

          const wrapper = function(selector) {
            if (!selector) return wrapElements([]);
            return wrapper.find(selector);
          };

          wrapper.__isCheerioWrapper = true;
          wrapper.length = list.length;
          wrapper[0] = list[0];
          for (let i = 0; i < list.length; i++) {
            wrapper[i] = list[i];
          }

          wrapper.get = (idx) => (typeof idx === 'number' ? list[idx] : list.slice());
          wrapper.toArray = () => list.slice();

          wrapper.find = function(selector) {
            if (!selector) return wrapElements([]);
            const results = [];
            list.forEach(el => {
              if (el && el.querySelectorAll) {
                const matches = safeQuerySelectorAll(el, selector);
                matches.forEach(m => {
                  if (!results.includes(m)) results.push(m);
                });
              }
            });
            return wrapElements(results);
          };

          wrapper.children = function(selector) {
            const kids = [];
            list.forEach(el => {
              if (el && el.children) {
                for (let i = 0; i < el.children.length; i++) {
                  const child = el.children[i];
                  if (!selector || (child.matches && child.matches(selector))) {
                    kids.push(child);
                  }
                }
              }
            });
            return wrapElements(kids);
          };

          wrapper.parent = function(selector) {
            const parents = [];
            list.forEach(el => {
              const p = el.parentElement;
              if (p && (!selector || (p.matches && p.matches(selector)))) {
                if (!parents.includes(p)) parents.push(p);
              }
            });
            return wrapElements(parents);
          };

          wrapper.parents = function(selector) {
            const parents = [];
            list.forEach(el => {
              let cur = el.parentElement;
              while (cur && cur !== (doc && doc.body) && cur !== (doc && doc.documentElement)) {
                if (!selector || (cur.matches && cur.matches(selector))) {
                  if (!parents.includes(cur)) parents.push(cur);
                }
                cur = cur.parentElement;
              }
            });
            return wrapElements(parents);
          };

          wrapper.closest = function(selector) {
            const matches = [];
            list.forEach(el => {
              if (el && el.closest) {
                const c = el.closest(selector);
                if (c && !matches.includes(c)) matches.push(c);
              }
            });
            return wrapElements(matches);
          };

          wrapper.next = function(selector) {
            const nexts = [];
            list.forEach(el => {
              const n = el.nextElementSibling;
              if (n && (!selector || (n.matches && n.matches(selector)))) {
                if (!nexts.includes(n)) nexts.push(n);
              }
            });
            return wrapElements(nexts);
          };

          wrapper.prev = function(selector) {
            const prevs = [];
            list.forEach(el => {
              const p = el.previousElementSibling;
              if (p && (!selector || (p.matches && p.matches(selector)))) {
                if (!prevs.includes(p)) prevs.push(p);
              }
            });
            return wrapElements(prevs);
          };

          wrapper.first = function() {
            return wrapElements(list[0] ? [list[0]] : []);
          };

          wrapper.last = function() {
            return wrapElements(list.length > 0 ? [list[list.length - 1]] : []);
          };

          wrapper.eq = function(idx) {
            if (typeof idx !== 'number') return wrapElements([]);
            const target = idx >= 0 ? list[idx] : list[list.length + idx];
            return wrapElements(target ? [target] : []);
          };

          wrapper.filter = function(filterFnOrSelector) {
            if (typeof filterFnOrSelector === 'function') {
              const passed = list.filter((el, i) => filterFnOrSelector.call(el, i, el));
              return wrapElements(passed);
            }
            if (typeof filterFnOrSelector === 'string') {
              const passed = list.filter(el => el.matches && el.matches(filterFnOrSelector));
              return wrapElements(passed);
            }
            return wrapElements(list);
          };

          wrapper.not = function(filterFnOrSelector) {
            if (typeof filterFnOrSelector === 'function') {
              const passed = list.filter((el, i) => !filterFnOrSelector.call(el, i, el));
              return wrapElements(passed);
            }
            if (typeof filterFnOrSelector === 'string') {
              const passed = list.filter(el => !el.matches || !el.matches(filterFnOrSelector));
              return wrapElements(passed);
            }
            return wrapElements(list);
          };

          wrapper.is = function(selector) {
            return list.some(el => el.matches && el.matches(selector));
          };

          wrapper.hasClass = function(className) {
            return list.some(el => el.classList && el.classList.contains(className));
          };

          wrapper.addClass = function(className) {
            list.forEach(el => el.classList && el.classList.add(className));
            return wrapper;
          };

          wrapper.removeClass = function(className) {
            list.forEach(el => el.classList && el.classList.remove(className));
            return wrapper;
          };

          wrapper.each = function(callback) {
            for (let i = 0; i < list.length; i++) {
              const el = list[i];
              const res = callback.call(el, i, el);
              if (res === false) break;
            }
            return wrapper;
          };

          wrapper.map = function(callback) {
            const results = list.map((el, i) => callback.call(el, i, el));
            return {
              get: () => results,
              toArray: () => results
            };
          };

          wrapper.text = function(val) {
            if (val !== undefined) {
              list.forEach(el => { if (el) el.textContent = String(val); });
              return wrapper;
            }
            return list.map(el => (el ? el.textContent || '' : '')).join(' ').trim();
          };

          wrapper.html = function(val) {
            if (val !== undefined) {
              list.forEach(el => { if (el) el.innerHTML = String(val); });
              return wrapper;
            }
            if (list.length === 0 || !list[0]) return '';
            return list[0].innerHTML || '';
          };

          wrapper.attr = function(name, val) {
            if (val !== undefined) {
              list.forEach(el => { if (el && el.setAttribute) el.setAttribute(name, String(val)); });
              return wrapper;
            }
            if (list.length === 0 || !list[0] || !list[0].getAttribute) return undefined;
            return list[0].getAttribute(name) || undefined;
          };

          wrapper.prop = function(name) {
            if (list.length === 0 || !list[0]) return undefined;
            return list[0][name];
          };

          wrapper.data = function(name, val) {
            if (list.length === 0 || !list[0]) return undefined;
            if (val !== undefined) {
              list.forEach(el => { if (el && el.dataset) el.dataset[name] = String(val); });
              return wrapper;
            }
            return list[0].dataset ? list[0].dataset[name] : undefined;
          };

          wrapper.replaceWith = function(newContent) {
            list.forEach(el => {
              if (el && el.parentNode) {
                if (typeof newContent === 'string') {
                  const tmp = (doc || document).createElement('div');
                  tmp.innerHTML = newContent;
                  while (tmp.firstChild) {
                    el.parentNode.insertBefore(tmp.firstChild, el);
                  }
                  el.parentNode.removeChild(el);
                } else if (newContent && newContent.nodeType) {
                  el.parentNode.replaceChild(newContent, el);
                }
              }
            });
            return wrapper;
          };

          wrapper.remove = function() {
            list.forEach(el => {
              if (el && el.parentNode) el.parentNode.removeChild(el);
            });
            return wrapper;
          };

          wrapper.empty = function() {
            list.forEach(el => { if (el) el.innerHTML = ''; });
            return wrapper;
          };

          wrapper.contents = function() {
            const nodes = [];
            list.forEach(el => {
              if (el && el.childNodes) {
                for (let i = 0; i < el.childNodes.length; i++) nodes.push(el.childNodes[i]);
              }
            });
            return wrapElements(nodes);
          };

          wrapper.addBack = function() {
            return wrapper;
          };

          return wrapper;
        }

        const rootWrapper = function(selector) {
          if (!doc) return wrapElements([]);
          if (selector && selector.__isCheerioWrapper) {
            return selector;
          }
          if (typeof selector === 'function') {
            return wrapElements([]);
          }
          if (typeof selector === 'object' && selector) {
            if (Array.isArray(selector)) return wrapElements(selector);
            if (selector.nodeType) return wrapElements([selector]);
            return wrapElements(selector);
          }
          if (typeof selector === 'string') {
            const trimmed = selector.trim();
            // HTML fragment instantiation e.g. $("<br>") or $("<div>")
            if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
              try {
                const tmp = (doc || document).createElement('div');
                tmp.innerHTML = trimmed;
                return wrapElements(Array.from(tmp.childNodes));
              } catch (_) {
                return wrapElements([]);
              }
            }
            const nodes = safeQuerySelectorAll(doc.documentElement || doc.body || doc, trimmed);
            return wrapElements(nodes);
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
   * Native htmlparser2 event-stream bridge.
   * Enables community scrapers (AllNovelFull, AllNovel, CPUNovel) to run seamlessly on the native DOMParser.
   */
  function createHtmlParser2Shim() {
    class Parser {
      constructor(cbs = {}, options = {}) {
        this.cbs = cbs;
        this.options = options;
        this.buffer = '';
      }

      write(chunk) {
        this.buffer += (chunk || '');
      }

      end(chunk) {
        if (chunk) this.buffer += chunk;
        this._parse();
      }

      reset() {
        this.buffer = '';
      }

      _parse() {
        const html = this.buffer;
        this.buffer = '';
        let doc;
        if (typeof DOMParser !== 'undefined') {
          try {
            doc = new DOMParser().parseFromString(html || '', 'text/html');
          } catch (_) {}
        }
        if (!doc && typeof document !== 'undefined') {
          doc = document.implementation.createHTMLDocument('');
          doc.documentElement.innerHTML = html || '';
        }
        if (!doc) return;

        const traverse = (node) => {
          if (!node) return;
          if (node.nodeType === 1) { // ELEMENT_NODE
            const tagName = node.tagName.toLowerCase();
            const attribs = {};
            if (node.attributes) {
              for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attribs[attr.name.toLowerCase()] = attr.value;
              }
            }
            if (this.cbs.onopentag) this.cbs.onopentag(tagName, attribs);
            if (this.cbs.onopentagname) this.cbs.onopentagname(tagName);

            let child = node.firstChild;
            while (child) {
              traverse(child);
              child = child.nextSibling;
            }

            if (this.cbs.onclosetag) this.cbs.onclosetag(tagName);
          } else if (node.nodeType === 3) { // TEXT_NODE
            if (node.nodeValue && this.cbs.ontext) {
              this.cbs.ontext(node.nodeValue);
            }
          }
        };

        const root = doc.body || doc.documentElement;
        let child = root ? root.firstChild : null;
        while (child) {
          traverse(child);
          child = child.nextSibling;
        }

        if (this.cbs.onend) this.cbs.onend();
      }
    }

    return {
      Parser,
      Tokenizer: class Tokenizer {}
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
      let results = [];
      if (typeof this.plugin.searchNovels === 'function') {
        try {
          results = await this.plugin.searchNovels(query, page);
        } catch (e) {
          console.warn(`[LNReaderPluginAdapter:${this.id}] searchNovels failed:`, e);
        }
      }

      // Fallback: If searchNovels returns empty or threw, try popularNovels with filter
      if ((!results || results.length === 0) && typeof this.plugin.popularNovels === 'function') {
        try {
          const pop = await this.plugin.popularNovels(page, { filters: {}, showLatestNovels: false });
          const qLower = (query || '').toLowerCase().trim();
          if (Array.isArray(pop) && qLower) {
            results = pop.filter(r => {
              const n = (r.name || r.title || '').toLowerCase();
              const p = (r.path || '').toLowerCase();
              return n.includes(qLower) || p.includes(qLower);
            });
          }
        } catch (_) {}
      }

      return (results || []).map(r => {
        let title = (r.name || r.title || '').trim();
        const path = r.path || r.url || '';
        const fullUrl = this.resolveUrl(path);

        // Smart slug recovery if title is missing or 'Untitled'
        if (!title || title.toLowerCase() === 'untitled' || title.toLowerCase() === 'untitled novel') {
          const slug = path.replace(/^https?:\/\/[^\/]+/i, '').replace(/^\/|\/$/g, '').split('/').pop() || '';
          if (slug && !slug.includes('?') && !slug.includes('=')) {
            title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
          }
        }
        if (!title) title = 'Web Novel';

        return {
          id: this.id + '_' + (path.replace(/[^a-zA-Z0-9]/g, '_') || Math.random().toString(36).slice(2)),
          name: title,
          title: title,
          path,
          url: fullUrl,
          cover: r.cover || defaultCover,
          author: r.author || '',
          summary: r.summary || '',
          chapters: r.chapters || '',
          source: this.name,
          sourceId: this.id
        };
      });
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

      let title = (raw.name || raw.title || '').trim();
      if (!title || title.toLowerCase() === 'untitled' || title.toLowerCase() === 'untitled novel') {
        const slug = path.replace(/^https?:\/\/[^\/]+/i, '').replace(/^\/|\/$/g, '').split('/').pop() || '';
        if (slug && !slug.includes('?') && !slug.includes('=')) {
          title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
        }
      }
      if (!title) title = 'Web Novel';

      return {
        id: this.id + '_' + (path.replace(/[^a-zA-Z0-9]/g, '_')),
        title,
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
      const fetchFn = fetcherOverride || (typeof window !== 'undefined' && window.WebNovelImporter && window.WebNovelImporter.fetchHtml) || null;
      const targetUrl = typeof url === 'string' ? url : (url?.url || '');
      let rawText = '';
      if (fetchFn) {
        rawText = await fetchFn(targetUrl, init);
      } else {
        const res = await fetch(targetUrl, init);
        rawText = await res.text();
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: targetUrl,
        headers: {
          get: (headerName) => {
            if (headerName && headerName.toLowerCase() === 'content-type') return 'text/html';
            return null;
          },
          has: () => false,
          entries: () => []
        },
        text: async () => rawText,
        json: async () => JSON.parse(rawText),
        blob: async () => new Blob([rawText], { type: 'text/html' })
      };
    };

    const cheerioShim = (typeof window !== 'undefined' && window.cheerio) ? window.cheerio : createCheerioShim();
    const htmlparser2Shim = createHtmlParser2Shim();

    const mockRequire = (id) => {
      if (id === 'cheerio') return cheerioShim;
      if (id === 'htmlparser2') return htmlparser2Shim;
      if (id === '@libs/fetch') return { fetchApi: defaultFetchApi, fetchFile: async () => '' };
      if (id === '@libs/defaultCover') return { defaultCover };
      if (id === '@libs/novelStatus') return { NovelStatus };
      if (id === '@libs/filterInputs' || id.includes('filterInputs')) return { FilterTypes };
      if (id.includes('defaultCover')) return { defaultCover };
      if (id.includes('novelStatus')) return { NovelStatus };
      if (id === 'dayjs') {
        const dayjsFn = (d) => ({
          format: () => String(d || ''),
          isValid: () => true,
          fromNow: () => String(d || ''),
          toDate: () => new Date(d || Date.now()),
          toISOString: () => new Date(d || Date.now()).toISOString(),
          subtract: () => dayjsFn(d)
        });
        dayjsFn.extend = () => {};
        return dayjsFn;
      }
      if (id === '@libs/storage') {
        return {
          storage: {
            get: (k) => {
              try { return JSON.parse(localStorage.getItem('lnreader_storage_' + k)); } catch (_) { return null; }
            },
            set: (k, v) => {
              try { localStorage.setItem('lnreader_storage_' + k, JSON.stringify(v)); } catch (_) {}
            },
            remove: (k) => {
              try { localStorage.removeItem('lnreader_storage_' + k); } catch (_) {}
            }
          }
        };
      }
      if (id === '@libs/isAbsoluteUrl') {
        return { isAbsoluteUrl: (u) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(u) };
      }
      if (id === 'he' || id === 'html-entities') {
        return {
          decode: (s) => (typeof window !== 'undefined' && window.decodeEntities ? window.decodeEntities(s) : String(s || ''))
        };
      }
      return {};
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
    createHtmlParser2Shim,
    LNReaderPluginAdapter,
    loadPlugin: loadLNReaderPlugin
  };

  if (typeof window !== 'undefined') {
    window.LNReaderEngine = LNReaderEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LNReaderEngine;
  }
})();

