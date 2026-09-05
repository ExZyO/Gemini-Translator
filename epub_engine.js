/**
 * Gemini Translator - EPUB Packaging & Generation Engine
 * Generates validated EPUB 3.0 archives with styling, navigation, and illustrations
 */
(function(window) {
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const updateOriginalEpubNavigation = async (zip, translatedChapters) => {
      if (!zip || !Array.isArray(translatedChapters) || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return;
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) return;

      const normalizePath = value => {
        let decoded = String(value || '');
        try { decoded = decodeURIComponent(decoded); } catch (e) {}
        const parts = decoded.split('/');
        const clean = [];
        parts.forEach(part => {
          if (!part || part === '.') return;
          if (part === '..') clean.pop();
          else clean.push(part);
        });
        return clean.join('/');
      };
      const resolveArchivePath = (filePath, href) => {
        const cleanHref = String(href || '').split('#')[0].split('?')[0];
        const base = normalizePath(filePath).split('/');
        base.pop();
        return normalizePath(base.concat(cleanHref.split('/')).join('/'));
      };

      try {
        const containerDoc = new DOMParser().parseFromString(await containerFile.async('text'), 'text/xml');
        const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
        if (!opfPath) return;
        const opfFile = zip.file(opfPath);
        if (!opfFile) return;
        const opfDoc = new DOMParser().parseFromString(await opfFile.async('text'), 'text/xml');
        const titleByPath = new Map();
        translatedChapters.forEach(ch => {
          if (ch?.zipPath && ch?.title) titleByPath.set(normalizePath(ch.zipPath), String(ch.title).trim());
        });
        if (!titleByPath.size) return;

        const manifestItems = Array.from(opfDoc.querySelectorAll('manifest item'));
        const navItem = manifestItems.find(item => item.getAttribute('properties')?.split(/\s+/).includes('nav'));
        const ncxItem = manifestItems.find(item => item.getAttribute('media-type') === 'application/x-dtbncx+xml');
        const serializer = new XMLSerializer();

        if (navItem?.getAttribute('href')) {
          const navPath = resolveArchivePath(opfPath, navItem.getAttribute('href'));
          const navFile = zip.file(navPath);
          if (navFile) {
            const navDoc = new DOMParser().parseFromString(await navFile.async('text'), 'text/xml');
            navDoc.querySelectorAll('a[href]').forEach(anchor => {
              const title = titleByPath.get(resolveArchivePath(navPath, anchor.getAttribute('href')));
              if (title) anchor.textContent = title;
            });
            zip.file(navPath, serializer.serializeToString(navDoc));
          }
        }

        if (ncxItem?.getAttribute('href')) {
          const ncxPath = resolveArchivePath(opfPath, ncxItem.getAttribute('href'));
          const ncxFile = zip.file(ncxPath);
          if (ncxFile) {
            const ncxDoc = new DOMParser().parseFromString(await ncxFile.async('text'), 'text/xml');
            ncxDoc.querySelectorAll('navPoint').forEach(navPoint => {
              const src = navPoint.querySelector('content')?.getAttribute('src');
              const title = titleByPath.get(resolveArchivePath(ncxPath, src));
              if (title) {
                const label = navPoint.querySelector('navLabel text');
                if (label) label.textContent = title;
              }
            });
            zip.file(ncxPath, serializer.serializeToString(ncxDoc));
          }
        }
      } catch (e) {
        console.warn('EPUB navigation update skipped:', e);
      }
    };

    const generateEpubFromChapters = async (chaptersList, bookTitle = 'Web Novel', bookAuthor = 'Author', bookLang = 'en', onProgress = null, options = {}) => {
      const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
      if (!JSZipClass) throw new Error('JSZip library not loaded');
      const zip = new JSZipClass();
      const uuid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : ('uuid_' + Date.now()));
      const startTime = Date.now();
      const cleanFn = (typeof window !== 'undefined' && window.cleanNovelProse)
        ? window.cleanNovelProse
        : ((typeof cleanNovelProse === 'function') ? cleanNovelProse : (t => String(t || '')));
      const exportChapters = (Array.isArray(chaptersList) ? chaptersList : []).map((ch, idx) => ({
        ...ch,
        title: String(ch?.title || '').trim() || ('Chapter ' + (idx + 1)),
        content: cleanFn(String(ch?.text ?? ch?.content ?? '').replace(/\r\n?/g, '\n')).trim()
      }));
      if (!exportChapters.length) throw new Error('No chapters to package');
      const safeLang = String(bookLang || 'en').replace(/[^A-Za-z0-9-]/g, '') || 'en';

      const useDropCaps = options.dropCaps !== undefined ? options.dropCaps : (localStorage.getItem('epubDropCaps') !== 'false');
      const useSmartQuotes = options.smartQuotes !== undefined ? options.smartQuotes : (localStorage.getItem('epubSmartQuotes') !== 'false');
      const useCleanArtifacts = options.cleanWebArtifacts !== undefined ? options.cleanWebArtifacts : (localStorage.getItem('epubCleanWebArtifacts') !== 'false');
      const fontTheme = options.fontTheme || localStorage.getItem('epubFontTheme') || 'literata';
      const useJustify = options.justifyText !== undefined ? options.justifyText : (localStorage.getItem('epubJustifyText') !== 'false');
      const useIncludeImages = options.includeImages !== undefined ? options.includeImages : (localStorage.getItem('epubIncludeImages') !== 'false');

      const getElapsed = () => {
        const sec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return (m > 0 ? `${m}m ` : '') + `${s}s`;
      };

      let wakeLockObj = null;
      try {
        window.NativeBridge?.acquireWakeLock?.();
        if (typeof navigator !== 'undefined' && navigator.wakeLock) {
          try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e) {}
        }
      } catch(e) {}

      try {
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, { compression: 'STORE' });

        const oebps = zip.folder('OEBPS');
        const imgFolder = oebps.folder('images');

        let fontStack = '"Literata", "Georgia", "Palatino Linotype", "Book Antiqua", serif';
        if (fontTheme === 'inter') fontStack = '"Inter", system-ui, -apple-system, sans-serif';
        else if (fontTheme === 'georgia') fontStack = '"Georgia", "Times New Roman", serif';
        else if (fontTheme === 'classic') fontStack = '"Times New Roman", "Baskerville", serif';
        else if (fontTheme === 'none') fontStack = 'inherit';

        const cssContent = `@charset "UTF-8";

/* ── Base Typography ── */
body {
  font-family: ${fontStack};
  font-size: 1.05em;
  line-height: 1.85;
  margin: 1.2em 1.5em;
  padding: 0;
  color: #1a1a1a;
  background-color: #ffffff;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  font-kerning: normal;
  font-variant-ligatures: common-ligatures;
  word-wrap: break-word;
  overflow-wrap: break-word;
  ${useJustify ? '-webkit-hyphens: auto; hyphens: auto;' : ''}
  orphans: 2;
  widows: 2;
}

/* ── Headings ── */
h1, h2, h3, h4 {
  font-family: ${fontStack};
  font-weight: 700;
  line-height: 1.25;
  color: #0f172a;
  text-align: center;
  letter-spacing: -0.01em;
  page-break-after: avoid;
  page-break-inside: avoid;
  margin-bottom: 0.6em;
}
h1 {
  font-size: 1.65em;
  margin-top: 2em;
  padding-bottom: 0.4em;
  border-bottom: 1px solid #e2e8f0;
}
h2 { font-size: 1.35em; margin-top: 1.8em; }
h3 { font-size: 1.15em; margin-top: 1.5em; }

/* ── Paragraphs ── */
p {
  margin-top: 0 !important;
  margin-bottom: 1.15em !important;
  padding: 0 !important;
  line-height: 1.85 !important;
  text-indent: 0 !important;
  ${useJustify ? 'text-align: justify;' : 'text-align: left;'}
  font-size: 1em;
  font-weight: 400;
}
h1 + p, h2 + p, h3 + p,
.illustration-wrap + p,
p.divider + p,
p.first {
  text-indent: 0 !important;
}

${useDropCaps ? `/* ── Drop Cap ── */
h1 + p::first-letter {
  font-size: 3.2em;
  float: left;
  line-height: 0.8;
  margin-right: 0.08em;
  margin-top: 0.05em;
  font-weight: 700;
  color: #334155;
  font-family: ${fontStack};
}` : ''}

/* ── Scene Break Dividers ── */
p.divider {
  text-align: center;
  text-indent: 0;
  margin: 2.5em 0;
  letter-spacing: 0.35em;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.85em;
  page-break-inside: avoid;
}

/* ── Dialogue & Emphasis ── */
em, i { font-style: italic; }
strong, b { font-weight: 700; }

/* ── Blockquote (poems, letters, status screens) ── */
blockquote {
  margin: 1.8em 2em;
  padding: 1em 1.5em;
  border-left: 3px solid #cbd5e1;
  font-style: italic;
  color: #475569;
  background-color: #f8fafc;
  page-break-inside: avoid;
}
blockquote p {
  text-indent: 0;
  margin-bottom: 0.5em;
}
blockquote p:last-child { margin-bottom: 0; }

/* ── Illustrations ── */
.illustration-wrap {
  text-align: center;
  margin: 2.5em auto;
  page-break-inside: avoid;
  page-break-before: auto;
}
.illustration {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  border-radius: 4px;
}

/* ── Horizontal Rule ── */
hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 2.5em 4em;
}

/* ── Dark Mode Compatibility ── */
@media (prefers-color-scheme: dark) {
  body { color: #e2e8f0; background-color: #0f172a; }
  h1, h2, h3, h4 { color: #f1f5f9; }
  h1 { border-bottom-color: #334155; }
  ${useDropCaps ? 'h1 + p::first-letter { color: #94a3b8; }' : ''}
  p.divider { color: #475569; }
  blockquote {
    border-left-color: #475569;
    color: #94a3b8;
    background-color: #1e293b;
  }
  hr { border-top-color: #334155; }
}
`;
        oebps.file('style.css', cssContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        const manifestItems = [
          '<item id="css" href="style.css" media-type="text/css"/>',
          '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
          '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        ];
        const spineItems = [];
        const tocEntries = [];

        // Step 1: Scan and strictly filter unique illustration URLs (supports Markdown & HTML img tags)
        const uniqueImgUrls = new Set();
        for (const ch of exportChapters) {
          const contentStr = ch.content || '';
          const mdMatches = contentStr.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g);
          for (const imgMatch of mdMatches) {
            if (imgMatch && imgMatch[2]) {
              let u = imgMatch[2].trim()
                .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                .replace(/\s+/g, '')
                .replace(/\.jppg$/i, '.jpg');
              if (!u.includes('avatar') && !u.includes('emoji') && !u.includes('gravatar') &&
                  !u.includes('s.w.org') && !u.includes('pixel.wp.com') && !u.includes('widgets') &&
                  !u.includes('badge') && !u.includes('button') && !u.includes('icon') &&
                  !u.includes('paypal') && !u.includes('patreon') && !u.includes('discord') &&
                  !u.includes('sharedaddy') && !u.includes('logo') && !u.includes('banner') &&
                  !u.includes('reaction') && !u.includes('smilies') && !u.includes('jp-carousel')) {
                uniqueImgUrls.add(u);
              }
            }
          }
          const htmlMatches = contentStr.matchAll(/<img\s+[^>]*src=["'](https?:\/\/[^"']+)["']/gi);
          for (const imgMatch of htmlMatches) {
            if (imgMatch && imgMatch[1]) {
              let u = imgMatch[1].trim()
                .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                .replace(/\s+/g, '')
                .replace(/\.jppg$/i, '.jpg');
              if (!u.includes('avatar') && !u.includes('emoji') && !u.includes('gravatar') &&
                  !u.includes('s.w.org') && !u.includes('pixel.wp.com') && !u.includes('widgets') &&
                  !u.includes('badge') && !u.includes('button') && !u.includes('icon') &&
                  !u.includes('paypal') && !u.includes('patreon') && !u.includes('discord') &&
                  !u.includes('sharedaddy') && !u.includes('logo') && !u.includes('banner') &&
                  !u.includes('reaction') && !u.includes('smilies') && !u.includes('jp-carousel')) {
                uniqueImgUrls.add(u);
              }
            }
          }
        }

        const imageCache = new Map();
        let imgSeq = 0;

        // Step 2: Download all unique illustrations
        const imgUrlList = Array.from(uniqueImgUrls);

        if (useIncludeImages && imgUrlList.length > 0) {
          onProgress?.(` Pre-caching ${imgUrlList.length} illustration(s) • ${getElapsed()}...`, 5, getElapsed());
          window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Pre-caching ${imgUrlList.length} images • ${getElapsed()}`, 5, true);
          let downloadedCount = 0;
          let lastReportedImg = 0;

          const downloadWorker = async (url) => {
            let buffer = null;
            let detectedMime = null;
            const AC = typeof AbortController !== 'undefined' ? AbortController : (typeof window !== 'undefined' ? window.AbortController : null);

            // Helper: sniff image magic bytes
            const sniffMime = (buf) => {
              if (!buf || buf.byteLength < 12) return null;
              const bytes = new Uint8Array(buf.slice(0, 16));
              if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { ext: 'png', mime: 'image/png' };
              if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' };
              if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return { ext: 'gif', mime: 'image/gif' };
              if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                  bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { ext: 'webp', mime: 'image/webp' };
              const str = String.fromCharCode(...bytes.slice(4, 12));
              if (str.includes('ftyp') || str.includes('avif')) return { ext: 'avif', mime: 'image/avif' };
              return null;
            };

            let referer = 'https://lnori.com/';
            try {
              const parsedUrl = new URL(url);
              referer = parsedUrl.origin + '/';
            } catch(_) {}

            // Attempt with up to 3 tries per image to guarantee 100% download reliability
            for (let attempt = 1; attempt <= 3; attempt++) {
              if (buffer && buffer.byteLength > 500) break;
              if (attempt > 1) {
                await new Promise(r => setTimeout(r, 600 * attempt));
              }

              // Strategy 1: Android NativeBridge (generous 35s timeout for high-res novel images)
              if (window.NativeBridge && window.NativeBridge.downloadBinary) {
                try {
                  buffer = await Promise.race([
                    window.NativeBridge.downloadBinary(url, { referer }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 35000))
                  ]);
                } catch(_) {}
              }

              // Strategy 2: Local Direct Fetch (Node / Capacitor / CORS-enabled)
              if (!buffer || buffer.byteLength < 500) {
                try {
                  const ctrl = AC ? new AC() : null;
                  const t = ctrl ? setTimeout(() => ctrl.abort(), 12000) : null;
                  const res = await fetch(url, {
                    signal: ctrl ? ctrl.signal : undefined,
                    headers: { 'Referer': referer }
                  });
                  if (t) clearTimeout(t);
                  if (res.ok) {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('image/')) detectedMime = ct.split(';')[0].trim();
                    buffer = await res.arrayBuffer();
                  }
                } catch(_) {}
              }

              // Strategy 3: Local Telemetry / Socket Proxy (Desktop port 9090)
              if (!buffer || buffer.byteLength < 500) {
                try {
                  const ctrl = AC ? new AC() : null;
                  const t = ctrl ? setTimeout(() => ctrl.abort(), 10000) : null;
                  const res = await fetch(`http://127.0.0.1:9090/proxy?url=${encodeURIComponent(url)}`, {
                    signal: ctrl ? ctrl.signal : undefined,
                    headers: { 'Referer': referer }
                  });
                  if (t) clearTimeout(t);
                  if (res.ok) {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('image/')) detectedMime = ct.split(';')[0].trim();
                    buffer = await res.arrayBuffer();
                  }
                } catch(_) {}
              }

              // Strategy 4: Public Proxy Failover Pool
              if (!buffer || buffer.byteLength < 500) {
                const cleanNoProto = url.replace(/^https?:\/\//i, '');
                const proxies = [
                  () => `https://images.weserv.nl/?url=${encodeURIComponent(cleanNoProto)}`,
                  () => `https://corsproxy.org/?url=${encodeURIComponent(url)}`,
                  () => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                  () => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
                ];
                for (const getProxyUrl of proxies) {
                  if (buffer && buffer.byteLength > 500) break;
                  try {
                    const ctrl = AC ? new AC() : null;
                    const t = ctrl ? setTimeout(() => ctrl.abort(), 9000) : null;
                    const res = await fetch(getProxyUrl(), { signal: ctrl ? ctrl.signal : undefined });
                    if (t) clearTimeout(t);
                    if (res.ok) {
                      const ct = res.headers.get('content-type') || '';
                      if (ct.includes('image/')) detectedMime = ct.split(';')[0].trim();
                      const b = await res.arrayBuffer();
                      if (b && b.byteLength > 500) {
                        buffer = b;
                        break;
                      }
                    }
                  } catch(_) {}
                }
              }
            }

            if (buffer && buffer.byteLength > 500) {
              imgSeq++;
              const sniffed = sniffMime(buffer);
              let ext = 'jpg';
              let mime = 'image/jpeg';
              if (sniffed) {
                ext = sniffed.ext;
                mime = sniffed.mime;
              } else if (detectedMime) {
                mime = detectedMime;
                ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : (mime.includes('gif') ? 'gif' : (mime.includes('avif') ? 'avif' : 'jpg')));
              } else {
                ext = url.includes('.png') ? 'png' : (url.includes('.webp') ? 'webp' : (url.includes('.gif') ? 'gif' : (url.includes('.avif') ? 'avif' : 'jpg')));
                mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : (ext === 'avif' ? 'image/avif' : 'image/jpeg')));
              }

              const imgFilename = `img_${imgSeq}.${ext}`;
              const manifestId = `img_${imgSeq}`;
              imgFolder.file(imgFilename, buffer, { compression: 'STORE' });
              manifestItems.push(`<item id="${manifestId}" href="images/${imgFilename}" media-type="${mime}"/>`);
              const entry = { localHref: `images/${imgFilename}`, manifestId };
              imageCache.set(url, entry);
              try {
                imageCache.set(encodeURI(url), entry);
                imageCache.set(decodeURI(url), entry);
                imageCache.set(url.split('?')[0], entry);
                imageCache.set(url.replace(/^https?:\/\//i, '//'), entry);
              } catch(_) {}
            }

            downloadedCount++;
            if (downloadedCount - lastReportedImg >= 2 || downloadedCount === imgUrlList.length) {
              lastReportedImg = downloadedCount;
              const pct = Math.min(55, Math.round(5 + (downloadedCount / imgUrlList.length) * 50));
              onProgress?.(`Pre-caching illustrations (${downloadedCount}/${imgUrlList.length})`, pct, getElapsed());
              window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Pre-cached ${downloadedCount}/${imgUrlList.length} images • ${getElapsed()}`, pct, true);
            }
          };

          const concurrency = 4;
          const imgQueue = [...imgUrlList];
          const pool = Array.from({ length: Math.min(concurrency, imgUrlList.length) }, async () => {
            while (imgQueue.length > 0) {
              const u = imgQueue.shift();
              if (u) await downloadWorker(u);
            }
          });
          await Promise.all(pool);
        }

        // Step 3: Fast In-Memory Chapter Assembly
        onProgress?.(`Assembling ${chaptersList.length} chapter(s)...`, 60, getElapsed());
        window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Assembling ${chaptersList.length} chapters • ${getElapsed()}`, 60, true);

        for (let idx = 0; idx < exportChapters.length; idx++) {
          const ch = exportChapters[idx];
          const chId = `chapter_${idx + 1}`;
          const chFilename = `${chId}.xhtml`;
          const chTitle = ch.title ? ch.title.trim() : `Chapter ${idx + 1}`;

          manifestItems.push(`<item id="${chId}" href="${chFilename}" media-type="application/xhtml+xml"/>`);
          spineItems.push(`<itemref idref="${chId}"/>`);
          tocEntries.push({ id: chId, filename: chFilename, title: chTitle, idx });

          const rawLines = ch.content.split(/\r?\n/);
          const bodyHtml = [];
          bodyHtml.push(`<h1>${escapeXml(chTitle)}</h1>`);
          const chapterTitleKey = chTitle.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
          const seenHeadings = new Set();

          // Smart typographic formatter
          const smartFormat = (raw) => {
            let s = escapeXml(raw);
            if (useSmartQuotes) {
              // Smart quotes: "..." -> curly double quotes
              s = s.replace(/&quot;([^&]*?)&quot;/g, '\u201c$1\u201d');
              // Straight double quotes fallback
              s = s.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
              // Smart single quotes / apostrophes
              s = s.replace(/(\w)&apos;(\w)/g, '$1\u2019$2'); // it's, don't
              s = s.replace(/&apos;([^&]*?)&apos;/g, '\u2018$1\u2019');
            }
            // Normalize dashes: -- or --- to em-dash
            s = s.replace(/---?/g, '\u2014');
            // Normalize triple dots to proper ellipsis
            s = s.replace(/\.{3,}/g, '\u2026');
            // Bold: **text** or __text__
            s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
            // Italic: *text* or _text_ (single, not inside words)
            s = s.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
            s = s.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');
            return s;
          };

          let hasEncounteredParagraph = false;
          for (let li = 0; li < rawLines.length; li++) {
            const trimmed = rawLines[li].trim();
            if (!trimmed) continue;

            // Suppress prompt template placeholder leaks anywhere in chapter
            if (/\[(?:number|\d+|name|title)\]/i.test(trimmed) || /^#*\s*chapter\s*\[/i.test(trimmed) || /---\s*page\s*end\s*---/i.test(trimmed)) {
              continue;
            }

            // Markdown headings: render them and remove duplicate title echoes from scraped pages.
            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
              const headingText = headingMatch[2].trim();
              const headingKey = headingText.replace(/\s+/g, ' ').toLocaleLowerCase();
              if (headingKey === chapterTitleKey || seenHeadings.has(headingKey)) continue;

              // If at the beginning of the chapter before any narrative paragraphs:
              if (!hasEncounteredParagraph) {
                const isSpecialNote = /^(?:author'?s?\s*note|translator'?s?\s*note|editor'?s?\s*note|t\/n|a\/n|synopsis|summary|foreword|preface|prologue|epilogue|afterword|interlude|warning|content\s*warning)\b/i.test(headingText);
                if (!isSpecialNote) {
                  const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                  if (typeof checkTitleEcho === 'function') {
                    if (checkTitleEcho(trimmed, chTitle, ch.originalTitle)) {
                      continue; // Suppress duplicate title heading!
                    }
                  } else if (headingText.length < 120) {
                    continue;
                  }
                }
              }

              seenHeadings.add(headingKey);
              const headingLevel = headingMatch[1].length <= 2 ? 2 : 3;
              bodyHtml.push('<h' + headingLevel + '>' + smartFormat(headingText) + '</h' + headingLevel + '>');
              continue;
            }

            // If images disabled, completely strip image markups from line
            if (!useIncludeImages) {
              trimmed = trimmed.replace(/!\[.*?\]\([^\)]+\)/gi, '').replace(/<img\b[^>]*>/gi, '').trim();
              if (!trimmed) continue;
            }

            // Illustration matching (markdown ![]() anywhere on line or standalone)
            if (/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/i.test(trimmed)) {
              if (!useIncludeImages) continue;
              let lineHtml = trimmed.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (fullMd, alt, rawImgUrl) => {
                const altText = alt || 'Illustration';
                const imgUrl = rawImgUrl.trim()
                  .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                  .replace(/\s+/g, '')
                  .replace(/\.jppg$/i, '.jpg');

                const cached = imageCache.get(imgUrl) || imageCache.get(rawImgUrl) ||
                               imageCache.get(encodeURI(imgUrl)) || imageCache.get(decodeURI(imgUrl)) ||
                               imageCache.get(imgUrl.split('?')[0]);
                if (cached) {
                  return `<div class="illustration-wrap"><img src="${cached.localHref}" alt="${escapeXml(altText)}" class="illustration"/></div>`;
                }
                return `<div class="illustration-wrap"><img src="${imgUrl}" alt="${escapeXml(altText)}" class="illustration"/></div>`;
              });
              if (/^<div class="illustration-wrap">/.test(lineHtml)) {
                bodyHtml.push(lineHtml);
              } else {
                bodyHtml.push(`<p>${smartFormat(lineHtml)}</p>`);
              }
              hasEncounteredParagraph = true;
              continue;
            }

            // HTML img tag replacement for cached local images
            if (/<img\s+/i.test(trimmed)) {
              if (!useIncludeImages) continue;
              let updatedLine = trimmed.replace(/<img\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi, (fullImg, attrs, srcUrl) => {
                const cleanUrl = srcUrl.trim()
                  .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                  .replace(/\s+/g, '')
                  .replace(/\.jppg$/i, '.jpg');
                const cached = imageCache.get(cleanUrl) || imageCache.get(srcUrl) ||
                               imageCache.get(encodeURI(cleanUrl)) || imageCache.get(decodeURI(cleanUrl)) ||
                               imageCache.get(cleanUrl.split('?')[0]);
                if (cached) {
                  return `<div class="illustration-wrap"><img src="${cached.localHref}" alt="Illustration" class="illustration"/></div>`;
                }
                return `<div class="illustration-wrap"><img src="${cleanUrl}" alt="Illustration" class="illustration"/></div>`;
              });
              bodyHtml.push(updatedLine);
              continue;
            }

            // Scene break dividers: ***, ---, ===, ~~~, * * *, etc.
            if (/^(?:\*\s*\*\s*\*|\*{3,}|\.{3,}|\u2026{2,}|\u2014{2,}|-{3,}|={3,}|~{3,}|#\s*#\s*#)$/.test(trimmed)) {
              bodyHtml.push('<hr/>');
              continue;
            }

            // Horizontal rule markdown
            if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
              bodyHtml.push('<hr/>');
              continue;
            }

            // Blockquote lines starting with >
            if (trimmed.startsWith('>')) {
              hasEncounteredParagraph = true;
              const bqLines = [trimmed.replace(/^>\s*/, '')];
              while (li + 1 < rawLines.length && rawLines[li + 1].trim().startsWith('>')) {
                li++;
                bqLines.push(rawLines[li].trim().replace(/^>\s*/, ''));
              }
              bodyHtml.push('<blockquote>' + bqLines.map(l => `<p>${smartFormat(l)}</p>`).join('\n') + '</blockquote>');
              continue;
            }

            // Standalone line check before first paragraph: suppress title echo
            if (!hasEncounteredParagraph) {
              const checkTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
              if (typeof checkTitleEcho === 'function' && checkTitleEcho(trimmed, chTitle, ch.originalTitle)) {
                continue; // Suppress duplicate plain-text title paragraph!
              }
            }

            // Normal paragraph with smart formatting
            bodyHtml.push(`<p>${smartFormat(trimmed)}</p>`);
            hasEncounteredParagraph = true;
          }

          const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${safeLang}">
<head>
<meta charset="utf-8" />
<title>${escapeXml(chTitle)}</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
${bodyHtml.join('\n ')}
</body>
</html>`;

          oebps.file(chFilename, xhtmlContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });
        }

        // ── HIERARCHICAL TABLE OF CONTENTS (Volume Collapsible Hierarchy) ──
        const useHierarchicalToc = options.hierarchicalToc !== false;
        const volRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc)\s*(\d+|[IVXLCDM]+)[\s:–—-]*(.*)$/i;
        const volumeGroups = [];
        let curVolGroup = null;

        for (let i = 0; i < tocEntries.length; i++) {
          const entry = tocEntries[i];
          const match = entry.title.match(volRegex);
          let volName = null;
          let cleanTitle = entry.title;

          if (match) {
            const prefix = match[1].toLowerCase().startsWith('vol') ? 'Volume' : (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase());
            const num = parseInt(match[2], 10) || match[2];
            volName = `${prefix} ${num}`;
            cleanTitle = match[3] ? match[3].trim() : entry.title;
          }

          if (!curVolGroup || (volName && curVolGroup.volName !== volName)) {
            curVolGroup = {
              volName: volName || 'General',
              hasRealVolume: Boolean(volName),
              firstFilename: entry.filename,
              items: []
            };
            volumeGroups.push(curVolGroup);
          }

          curVolGroup.items.push({
            id: entry.id,
            filename: entry.filename,
            cleanTitle: cleanTitle || entry.title,
            fullTitle: entry.title
          });
        }

        const distinctNamedVolumes = volumeGroups.filter(v => v.hasRealVolume);
        const isMultiVolume = useHierarchicalToc && (distinctNamedVolumes.length >= 2 || (volumeGroups.length >= 2 && distinctNamedVolumes.length >= 1));

        const tocNavPoints = [];
        const tocNavLinks = [];
        let playOrder = 1;
        let dtbDepth = 1;

        if (isMultiVolume) {
          dtbDepth = 2;
          volumeGroups.forEach((vol, vIdx) => {
            const volId = `vol_${vIdx + 1}`;
            const firstFile = vol.items[0]?.filename || `chapter_1.xhtml`;
            const parentPlayOrder = playOrder++;

            // Nested navPoints for EPUB 2 NCX (renders as collapsible volume tree in Moon+ Reader)
            const childNavPoints = vol.items.map(item => `
    <navPoint id="nav_${item.id}" playOrder="${playOrder++}">
      <navLabel><text>${escapeXml(item.cleanTitle)}</text></navLabel>
      <content src="${item.filename}"/>
    </navPoint>`).join('');

            tocNavPoints.push(`
  <navPoint id="${volId}" playOrder="${parentPlayOrder}">
    <navLabel><text>${escapeXml(vol.volName)}</text></navLabel>
    <content src="${firstFile}"/>${childNavPoints}
  </navPoint>`);

            // Nested <ol> for EPUB 3 navigation (nav.xhtml)
            const childNavLinks = vol.items.map(item => `      <li><a href="${item.filename}">${escapeXml(item.cleanTitle)}</a></li>`).join('\n');
            tocNavLinks.push(`  <li>
    <a href="${firstFile}">${escapeXml(vol.volName)}</a>
    <ol>
${childNavLinks}
    </ol>
  </li>`);
          });
        } else {
          // Standard flat TOC for single-volume books
          dtbDepth = 1;
          tocEntries.forEach(entry => {
            tocNavPoints.push(`
  <navPoint id="nav_${entry.id}" playOrder="${playOrder++}">
    <navLabel><text>${escapeXml(entry.title)}</text></navLabel>
    <content src="${entry.filename}"/>
  </navPoint>`);
            tocNavLinks.push(`  <li><a href="${entry.filename}">${escapeXml(entry.title)}</a></li>`);
          });
        }

        const opfContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${escapeXml(bookTitle)}</dc:title>
  <dc:creator>${escapeXml(bookAuthor)}</dc:creator>
  <dc:language>${safeLang}</dc:language>
  <dc:identifier id="BookID">${uuid}</dc:identifier>
  <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
  ${manifestItems.join('\n ')}
</manifest>
<spine toc="ncx">
  ${spineItems.join('\n ')}
</spine>
</package>`;
        oebps.file('content.opf', opfContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        const ncxContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
  <meta name="dtb:uid" content="${uuid}"/>
  <meta name="dtb:depth" content="${dtbDepth}"/>
  <meta name="dtb:totalPageCount" content="0"/>
  <meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>${escapeXml(bookTitle)}</text></docTitle>
<navMap>
  ${tocNavPoints.join('')}
</navMap>
</ncx>`;
        oebps.file('toc.ncx', ncxContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });
        const navContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${safeLang}">
<head>
<meta charset="utf-8" />
<title>${escapeXml(bookTitle)}</title>
</head>
<body>
<nav epub:type="toc" id="toc">
<h1>${escapeXml(bookTitle)}</h1>
<ol>
${tocNavLinks.join('\n')}
</ol>
</nav>
</body>
</html>`;
        oebps.file('nav.xhtml', navContent, { compression: 'DEFLATE', compressionOptions: { level: 1 } });

        onProgress?.(`Compressing EPUB archive...`, 70, getElapsed());
        window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Compressing archive • ${getElapsed()}`, 70, true);

        let lastReportedPct = 0;
        const blob = await zip.generateAsync(
          { type: 'blob', mimeType: 'application/epub+zip' },
          (meta) => {
            const pct = Math.min(99, Math.round(70 + (meta.percent * 0.29)));
            if (pct - lastReportedPct >= 4 || meta.percent === 100) {
              lastReportedPct = pct;
              onProgress?.(`Compressing EPUB archive (${Math.round(meta.percent)}%)`, pct, getElapsed());
              window.NativeBridge?.showProgressNotification?.('Compiling EPUB', `Compressing archive (${Math.round(meta.percent)}%) • ${getElapsed()}`, pct, true);
            }
          }
        );

        return blob;
      } finally {
        try {
          if (wakeLockObj) wakeLockObj.release().catch(() => {});
          window.NativeBridge?.releaseWakeLock?.();
          window.NativeBridge?.clearProgressNotification?.(true, 'EPUB Packaging Complete! ', `"${bookTitle}" is ready.`);
        } catch(e) {}
      }
    };

  window.updateOriginalEpubNavigation = updateOriginalEpubNavigation;
  window.generateEpubFromChapters = generateEpubFromChapters;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateOriginalEpubNavigation, generateEpubFromChapters };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
