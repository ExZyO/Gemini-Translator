/**
 * content_transformer_engine.js - Non-Destructive Content Transformer Pipeline
 * Inspired by Readest, Foliate, and LNReader architectures.
 *
 * Provides a dual-stage text processing pipeline:
 *  1. Ingestion Hygiene (sanitizeForStorage): Strips zero-width characters, anti-scraper traps,
 *     residual watermarks, and collapses excessive empty newlines before saving to IndexedDB.
 *  2. Presentation & Export Transformers (formatForReader, formatForEpub): Parses Japanese Ruby/Furigana,
 *     converts translator bracketed notes into interactive footnote badges, and normalizes typography.
 *
 * Guarantees zero data loss: author prose and story text are never deleted or corrupted.
 */

(function (root, factory) {
  'use strict';
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) {
    root.ContentTransformerEngine = exports;
  }
  if (typeof window !== 'undefined') {
    window.ContentTransformerEngine = exports;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 1: INGESTION HYGIENE (Storage & Translation Safe)
  // ───────────────────────────────────────────────────────────────────────────

  // Anti-bot, Cloudflare challenge, and network error signatures that must NEVER be written to an ebook
  const ERROR_PAGE_PATTERNS = [
    /error\s*1015/i,
    /error\s*429\b/i,
    /rate\s*limit/i,
    /too\s*many\s*requests/i,
    /challenges\.cloudflare\.com/i,
    /cf-browser-verification/i,
    /cf-turnstile-wrapper/i,
    /attention\s*required!\s*\|\s*cloudflare/i,
    /<title>\s*just\s*a\s*moment\.\.\.\s*<\/title>/i,
    /checking\s*(?:your\s*browser|if\s*the\s*site\s*connection\s*is\s*secure)/i,
    /403\s*forbidden/i,
    /401\s*unauthorized/i,
    /502\s*bad\s*gateway/i,
    /504\s*gateway\s*time-?out/i,
    /503\s*service\s*temporarily\s*unavailable/i,
    /all\s*proxies\s*exhausted/i,
    /chapter\s*content\s*could\s*not\s*be\s*retrieved/i,
    /failed\s*to\s*fetch\s*chapter/i,
    /chapter\s*download\s*failed/i
  ];

  /**
   * Check whether raw downloaded text is an error page, rate-limit page, or Cloudflare challenge
   * rather than actual story prose.
   * @param {string} text
   * @returns {boolean}
   */
  function isErrorOrBlockContent(text) {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.length === 0) return true;
    const sample = trimmed.length > 5000 ? trimmed.slice(0, 5000) : trimmed;
    return ERROR_PAGE_PATTERNS.some(p => p.test(sample));
  }

  // Zero-width characters, invisible control codes, and anti-scraper traps
  const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060-\u206F]/g;

  /**
   * Strip invisible zero-width characters and normalize trapped whitespace
   * @param {string} text
   * @returns {string}
   */
  function stripZeroWidthCharacters(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
      .replace(ZERO_WIDTH_REGEX, '')
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  }

  /**
   * Remove hidden anti-scraper trap HTML elements and zero-font artifacts
   * @param {string} text
   * @returns {string}
   */
  function stripAntiScraperTraps(text) {
    if (!text || typeof text !== 'string') return text || '';
    let cleaned = text;

    // Strip elements hidden via inline styles (e.g. display:none, font-size:0, visibility:hidden, opacity:0)
    cleaned = cleaned.replace(/<(?:p|span|div|b|i)\b[^>]*(?:display\s*:\s*none|font-size\s*:\s*0|visibility\s*:\s*hidden|opacity\s*:\s*0|height\s*:\s*0)[^>]*>[\s\S]*?<\/(?:p|span|div|b|i)>/gi, '');

    // Strip common hidden anti-scraping classes
    cleaned = cleaned.replace(/<(?:p|span|div)\b[^>]*class=["'][^"']*\b(?:hidden|screen-reader-text|sr-only|trap|anti-scrape|watermark-text)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:p|span|div)>/gi, '');

    return cleaned;
  }

  /**
   * Collapse 3+ consecutive blank lines down to 2 without merging actual prose paragraphs
   * @param {string} text
   * @returns {string}
   */
  function normalizeExcessiveWhitespace(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+$/gm, '') // trim trailing spaces per line
      .replace(/\n{3,}/g, '\n\n') // collapse 3+ empty lines to standard double newline
      .trim();
  }

  /**
   * Remove residual scraper link wrappers and download button artifacts
   * @param {string} text
   * @returns {string}
   */
  function cleanSiteArtifacts(text) {
    if (!text || typeof text !== 'string') return text || '';
    let cleaned = text;

    // Strip residual "[Download Image]" or "Click to view image" anchor text
    cleaned = cleaned.replace(/(?<!\!)[\[\(【〔]\s*(?:Download|View|Click to view|High-Res|Full Size|Original)?\s*(?:Image|Illustration|Artwork|Resolution|Photo|Picture|插图|插圖|图|圖)\s*[\]\)】〕]/gi, '');
    cleaned = cleaned.replace(/\b(?:Download|View|Click to view)\s+(?:High-Res\s+|Full Size\s+|Original\s+)?(?:Image|Illustration|Artwork|Photo|Picture)\b/gi, '');

    // Strip common scraper watermarks at the very end of chapters (Read more at, Source: ...)
    cleaned = cleaned.replace(/(?:Find authorized novels in Webnovel.*|Please report any errors.*to support@.*|Read latest Chapters at .* only)$/gim, '');

    return cleaned;
  }

  /**
   * Master Ingestion Transformer: prepares raw crawled chapter prose for safe database storage.
   * Guaranteed non-destructive to story sentences and author prose.
   * @param {string} rawText
   * @param {object} [options]
   * @returns {string}
   */
  function sanitizeForStorage(rawText, options = {}) {
    if (!rawText || typeof rawText !== 'string') return rawText || '';

    let res = rawText;
    res = stripZeroWidthCharacters(res);
    res = stripAntiScraperTraps(res);
    res = cleanSiteArtifacts(res);
    res = normalizeExcessiveWhitespace(res);

    return res;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 2: PRESENTATION & EXPORT TRANSFORMERS (Reader Canvas & EPUB Packaging)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Parse Japanese Ruby / Furigana tags into standard semantic XHTML
   * Supports both HTML <ruby> tags and Markdown-style {base|ruby} or [base](ruby) patterns
   * @param {string} text
   * @returns {string}
   */
  function parseRuby(text) {
    if (!text || typeof text !== 'string') return text || '';
    let formatted = text;

    // Pattern 1: {Kanji|Furigana} => <ruby>Kanji<rt>Furigana</rt></ruby>
    formatted = formatted.replace(/\{([^{}|]+)\|([^{}|]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');

    // Pattern 2: ｜Kanji《Furigana》 (Aozora Bunko format)
    formatted = formatted.replace(/｜([^《》]+)《([^《》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>');

    // Clean malformed ruby tags
    formatted = formatted.replace(/<ruby>\s*<ruby>/gi, '<ruby>').replace(/<\/ruby>\s*<\/ruby>/gi, '</ruby>');

    return formatted;
  }

  /**
   * Extract cultural footnotes, translation notes, and bracketed explanations into structured metadata
   * Examples: [1: Explanation of cultivation realm], (TL Note: Character nickname joke)
   * @param {string} paragraphText
   * @param {number} [startNum=1]
   * @returns {{ formattedText: string, footnotes: Array<{ num: number, text: string }> }}
   */
  function parseFootnotes(paragraphText, startNum = 1) {
    if (!paragraphText || typeof paragraphText !== 'string') {
      return { formattedText: paragraphText || '', footnotes: [] };
    }

    const footnotes = [];
    let currentNum = startNum;

    // Match bracketed footnotes: [1: note text] or [Note 1: note text] or (TL Note: note text)
    const formattedText = paragraphText.replace(/(?:\[(?:\d+|note\s*\d*)\s*[:：]\s*([^\]]+)\]|\((?:tl\s*note|translator['’]?s?\s*note)\s*[:：]\s*([^)]+)\))/gi, (match, noteA, noteB) => {
      const noteContent = (noteA || noteB || '').trim();
      if (!noteContent) return match;

      const num = currentNum++;
      footnotes.push({ num, text: noteContent });
      return ` <sup class="reader-footnote-badge" data-fn-num="${num}" title="${noteContent}">[${num}]</sup> `;
    });

    return {
      formattedText,
      footnotes
    };
  }

  /**
   * Normalize typography: quotes, em-dashes, and ellipses
   * @param {string} text
   * @returns {string}
   */
  function normalizeTypography(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
      .replace(/--/g, '—') // standard em dash
      .replace(/\.{3,}/g, '…') // standard ellipsis
      .replace(/“|”/g, '"') // uniform quotes
      .replace(/‘|’/g, "'");
  }

  /**
   * Format text for Reader Canvas presentation
   * @param {string} text
   * @param {object} [options]
   * @returns {{ text: string, footnotes: Array }}
   */
  function formatForReader(text, options = {}) {
    if (!text || typeof text !== 'string') return { text: text || '', footnotes: [] };

    let cleaned = sanitizeForStorage(text);
    cleaned = parseRuby(cleaned);
    const { formattedText, footnotes } = parseFootnotes(cleaned, options.startFootnoteNum || 1);

    return {
      text: formattedText,
      footnotes
    };
  }

  /**
   * Format text for EPUB packaging (produces valid XHTML compliant paragraphs)
   * @param {string} text
   * @param {object} [options]
   * @returns {string}
   */
  function formatForEpub(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return '<p class="chapter-unavailable"><em>[Chapter unavailable at time of compilation.]</em></p>';
    }

    // Absolute guard: Never write Cloudflare challenges, rate limit dumps, or error stack traces to an EPUB
    if (isErrorOrBlockContent(text)) {
      return '<p class="chapter-unavailable"><em>[Chapter content could not be retrieved from online source at time of compilation.]</em></p>';
    }

    let cleaned = sanitizeForStorage(text);
    cleaned = parseRuby(cleaned);

    const paragraphs = cleaned.split(/\n\n+/);
    const htmlParagraphs = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (/^!\[(.*?)\]\((.*?)\)$/.test(trimmed)) {
        // Image tag
        const m = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        return `<div class="epub-illustration-wrap"><img src="${m[2]}" alt="${m[1] || 'Illustration'}" /></div>`;
      }
      return `<p>${trimmed}</p>`;
    }).filter(Boolean);

    return htmlParagraphs.join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PIPELINE API
  // ───────────────────────────────────────────────────────────────────────────

  return {
    isErrorOrBlockContent,
    stripZeroWidthCharacters,
    stripAntiScraperTraps,
    normalizeExcessiveWhitespace,
    cleanSiteArtifacts,
    sanitizeForStorage,
    parseRuby,
    parseFootnotes,
    normalizeTypography,
    formatForReader,
    formatForEpub
  };
});
