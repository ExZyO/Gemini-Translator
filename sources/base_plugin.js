/**
 * sources/base_plugin.js - Gemini Translator Source Plugin Base Class
 * Modeled after the LNReader v3 plugin specification.
 */

class BaseSourcePlugin {
  constructor(options = {}) {
    this.id = options.id || 'base';
    this.name = options.name || 'Base Plugin';
    this.site = options.site || '';
    this.version = options.version || '1.0.0';
    this.icon = options.icon || '';
    this.filters = options.filters || {};
  }

  /**
   * Returns true if this plugin handles the given URL.
   * @param {string} url
   * @returns {boolean}
   */
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

  /**
   * Search for novels on this source.
   * @param {string} query
   * @param {number} [page=1]
   * @returns {Promise<Array<{ name: string, path: string, cover: string }>>}
   */
  async search(query, page = 1) {
    throw new Error(`Search not implemented for ${this.name}`);
  }

  /**
   * Parse novel metadata and chapter list.
   * @param {string} url
   * @returns {Promise<{
   *   id?: string,
   *   title: string,
   *   author?: string,
   *   cover?: string,
   *   summary?: string,
   *   status?: string,
   *   genres?: string[],
   *   chapters: Array<{
   *     title: string,
   *     url: string,
   *     arc?: string,
   *     volume?: string,
   *     order?: number,
   *     releaseDate?: string
   *   }>
   * }>}
   */
  async getNovelDetails(url) {
    throw new Error(`getNovelDetails not implemented for ${this.name}`);
  }

  /**
   * Parse single chapter content.
   * @param {string} chapterUrl
   * @param {Object} [options]
   * @returns {Promise<{
   *   title: string,
   *   content: string,
   *   originalTitle?: string
   * }>}
   */
  async getChapter(chapterUrl, options = {}) {
    throw new Error(`getChapter not implemented for ${this.name}`);
  }

  /**
   * Helper to decode HTML entities in titles and text
   */
  decodeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;|[‘’‚‛]/g, "'")
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”„‟]/g, '"')
      .replace(/&#8230;|&hellip;/g, '…')
      .replace(/&#8211;|&ndash;/g, '–')
      .replace(/&#8212;|&mdash;/g, '—')
      .replace(/&#(\d+);/g, (_, code) => {
        try { return String.fromCharCode(parseInt(code, 10)); } catch (e) { return _; }
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        try { return String.fromCharCode(parseInt(hex, 16)); } catch (e) { return _; }
      })
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaseSourcePlugin };
} else if (typeof window !== 'undefined') {
  window.BaseSourcePlugin = BaseSourcePlugin;
}
