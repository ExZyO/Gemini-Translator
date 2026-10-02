// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR - EPUB STUDIO PARSER & PACKAGER ENGINE
// High-speed EPUB Zip Parsing, XML Manifest Traversal & Clean EPUB Export
// ══════════════════════════════════════════════════════════════════════
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EpubEditorPacker = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const getState = () => (typeof window !== 'undefined' && window.epubEditorState) || {};
  const getHelpers = () => (typeof window !== 'undefined' && window.epubEditorHelpers) || {};

  const escapeXml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const countWords = (str) => {
    if (!str) return 0;
    const cleaned = String(str).replace(/<[^>]*>/g, ' ').trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  };

  const cleanTitle = (raw, fallbackIndex) => {
    if (window.epubEditorHelpers?.cleanTitle) return window.epubEditorHelpers.cleanTitle(raw, fallbackIndex);
    return String(raw || '').trim() || (`Chapter ${fallbackIndex}`);
  };

  const extractImagesFromContent = (content) => {
    if (window.epubEditorHelpers?.extractImagesFromContent) return window.epubEditorHelpers.extractImagesFromContent(content);
    if (!content) return [];
    const imgs = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = regex.exec(content)) !== null) { imgs.push(m[1]); }
    return imgs;
  };

  const renderEditorView = () => (window.epubEditorHelpers?.renderEditorView ? window.epubEditorHelpers.renderEditorView() : null);

  let state = (typeof window !== 'undefined' && window.epubEditorState) || {};
  const syncState = () => { if (typeof window !== 'undefined' && window.epubEditorState) state = window.epubEditorState; };


    // ── Universal XML & Zip Resolution Helpers ──
    function getXmlElements(doc, tagName) {
        if (!doc) return [];
        let list = [];
        if (typeof doc.getElementsByTagNameNS === 'function') {
            try { list = Array.from(doc.getElementsByTagNameNS('*', tagName)); } catch (e) {}
        }
        if (list.length === 0 && typeof doc.getElementsByTagName === 'function') {
            try { list = Array.from(doc.getElementsByTagName(tagName)); } catch (e) {}
        }
        if (list.length === 0 && typeof doc.querySelectorAll === 'function') {
            try { list = Array.from(doc.querySelectorAll(tagName)); } catch (e) {}
        }
        return list;
    }

    function getFirstXmlTag(doc, tagName) {
        const els = getXmlElements(doc, tagName);
        if (els.length > 0) return els[0];
        if (typeof doc.getElementsByTagName === 'function') {
            try {
                const dc = doc.getElementsByTagName('dc:' + tagName);
                if (dc.length > 0) return dc[0];
            } catch (e) {}
        }
        try {
            return doc.querySelector(tagName) || doc.querySelector('dc\\:' + tagName);
        } catch (e) {
            return null;
        }
    }

    function findZipEntry(zip, rawPath, opfDir = '') {
        if (!rawPath || !zip) return null;
        const cleanRaw = String(rawPath).split('#')[0].split('?')[0].trim();
        if (!cleanRaw) return null;

        const normalizePath = (p) => {
            const parts = p.replace(/\\/g, '/').split('/');
            const stack = [];
            for (const part of parts) {
                if (part === '.' || part === '') continue;
                if (part === '..') {
                    if (stack.length > 0) stack.pop();
                } else {
                    stack.push(part);
                }
            }
            return stack.join('/');
        };

        const candidates = new Set();
        const addCandidates = (p) => {
            if (!p) return;
            candidates.add(p);
            candidates.add(p.replace(/^\.\//, ''));
            candidates.add(p.replace(/^\//, ''));
            const norm = normalizePath(p);
            candidates.add(norm);
            try {
                const dec = decodeURIComponent(p);
                candidates.add(dec);
                candidates.add(dec.replace(/^\.\//, ''));
                candidates.add(dec.replace(/^\//, ''));
                candidates.add(normalizePath(dec));
            } catch (e) {}
        };

        addCandidates(cleanRaw);
        if (opfDir) {
            addCandidates(opfDir + cleanRaw);
            addCandidates(normalizePath(opfDir + cleanRaw));
            if (cleanRaw.startsWith('../')) {
                addCandidates(cleanRaw.replace(/^\.\.\//, ''));
            }
        }

        // 1. Direct candidate matches
        for (const c of candidates) {
            if (c && zip.file(c)) return zip.file(c);
        }

        // 2. Case-insensitive key matching across zip entries
        const zipKeys = Object.keys(zip.files || {});
        for (const c of candidates) {
            if (!c) continue;
            const lower = c.toLowerCase();
            const foundKey = zipKeys.find(k => k.toLowerCase() === lower);
            if (foundKey && zip.file(foundKey)) return zip.file(foundKey);
        }

        // 3. Basename/filename fallback (e.g. "ch01.xhtml")
        const baseName = cleanRaw.split('/').pop().toLowerCase();
        if (baseName) {
            const foundKey = zipKeys.find(k => {
                const kBase = k.split('/').pop().toLowerCase();
                return kBase === baseName && !k.endsWith('/');
            });
            if (foundKey && zip.file(foundKey)) return zip.file(foundKey);
        }

        return null;
    }

    function getRelativeZipHref(fromPath, toPath) {
        if (!fromPath || !toPath) return toPath || '';
        const norm = (p) => p.replace(/\\/g, '/');
        const fromParts = norm(fromPath).split('/');
        fromParts.pop(); // remove filename
        const toParts = norm(toPath).split('/');

        let i = 0;
        while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
            i++;
        }
        const upCount = fromParts.length - i;
        const relParts = [];
        for (let u = 0; u < upCount; u++) {
            relParts.push('..');
        }
        for (let d = i; d < toParts.length; d++) {
            relParts.push(toParts[d]);
        }
        return relParts.join('/');
    }

    // ── Parse EPUB Archive using JSZip ──
    async function parseEpubFile(file) {
        const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!JSZipClass) {
            if (typeof window.toast === 'function') window.toast('JSZip library is required to unpack EPUBs.', 'error');
            return;
        }

        const spinner = document.getElementById('edit-loading-spinner');
        const desc = document.getElementById('edit-upload-desc');
        const progWrap = document.getElementById('edit-load-progress-wrapper');
        const progBar = document.getElementById('edit-load-progress-bar');
        const progStatus = document.getElementById('edit-load-status');
        const progPct = document.getElementById('edit-load-percent');

        const updateProgress = (text, pct) => {
            if (progWrap) progWrap.classList.remove('hidden');
            if (progStatus) progStatus.textContent = text;
            if (progPct) progPct.textContent = `${pct}%`;
            if (progBar) progBar.style.width = `${pct}%`;
        };

        if (spinner) spinner.classList.remove('hidden');
        updateProgress('Opening EPUB archive…', 10);

        try {
            const zip = await JSZipClass.loadAsync(file);
            updateProgress('Reading container manifest…', 25);

            // 1. Locate container.xml and OPF file
            const containerFile = findZipEntry(zip, 'META-INF/container.xml');
            if (!containerFile) throw new Error('Invalid EPUB: META-INF/container.xml missing');
            const containerXml = await containerFile.async('text');
            const parser = new DOMParser();
            let containerDoc;
            try {
                containerDoc = parser.parseFromString(containerXml, 'text/xml');
                if (containerDoc.querySelector('parsererror')) containerDoc = parser.parseFromString(containerXml, 'text/html');
            } catch (e) {
                containerDoc = parser.parseFromString(containerXml, 'text/html');
            }
            const rootfileEls = getXmlElements(containerDoc, 'rootfile');
            const opfPath = (rootfileEls[0]?.getAttribute('full-path') || 'OEBPS/content.opf').trim();

            const opfFile = findZipEntry(zip, opfPath);
            if (!opfFile) throw new Error(`Cannot find package document: ${opfPath}`);
            const actualOpfPath = opfFile.name;
            const opfDir = actualOpfPath.includes('/') ? actualOpfPath.substring(0, actualOpfPath.lastIndexOf('/') + 1) : '';
            const opfXml = await opfFile.async('text');
            let opfDoc;
            try {
                opfDoc = parser.parseFromString(opfXml, 'text/xml');
                if (opfDoc.querySelector('parsererror')) opfDoc = parser.parseFromString(opfXml, 'text/html');
            } catch (e) {
                opfDoc = parser.parseFromString(opfXml, 'text/html');
            }

            // Store original container references for 100% style/asset preservation
            state.originalZip = zip;
            state.originalOpfPath = actualOpfPath;
            state.originalOpfDir = opfDir;
            state.originalFileName = file.name || 'novel.epub';

            // 2. Metadata
            updateProgress('Extracting metadata & assets…', 35);
            const titleEl = getFirstXmlTag(opfDoc, 'title');
            const authorEl = getFirstXmlTag(opfDoc, 'creator');
            const langEl = getFirstXmlTag(opfDoc, 'language');
            const descEl = getFirstXmlTag(opfDoc, 'description');

            state.title = (titleEl ? titleEl.textContent : (file.name ? file.name.replace(/\.epub$/i, '') : 'Untitled')).trim();
            state.author = (authorEl ? authorEl.textContent : 'Unknown Author').trim();
            state.lang = (langEl ? langEl.textContent : 'en').trim();
            state.description = (descEl ? descEl.textContent : '').trim();
            state.series = '';
            state.imageRepository.clear();
            state.chapters = [];
            state.coverUrl = '';

            // 3. Manifest & Image repository
            const manifestItems = getXmlElements(opfDoc, 'item');
            const manifestMap = new Map();
            let coverHref = '';

            // Check meta cover
            const metaCover = opfDoc.querySelector('metadata > meta[name="cover"]');
            const metaCoverId = (metaCover ? metaCover.getAttribute('content') : '').trim();

            for (const item of manifestItems) {
                const id = (item.getAttribute('id') || '').trim();
                const href = (item.getAttribute('href') || '').trim();
                const mediaType = (item.getAttribute('media-type') || '').trim().toLowerCase();
                const properties = (item.getAttribute('properties') || '').trim();
                const entry = { id, href, mediaType, properties };
                if (id) {
                    manifestMap.set(id, entry);
                    manifestMap.set(id.toLowerCase(), entry);
                }
                if (href) {
                    manifestMap.set(href, entry);
                    manifestMap.set(href.toLowerCase(), entry);
                }

                if (properties.includes('cover-image') || id === metaCoverId || (id && id.toLowerCase() === 'cover-image')) {
                    coverHref = href;
                }

                if (mediaType.startsWith('image/')) {
                    const imgZipFile = findZipEntry(zip, href, opfDir);
                    if (imgZipFile) {
                        try {
                            const b64 = await imgZipFile.async('base64');
                            const dataUrl = `data:${mediaType};base64,${b64}`;
                            const fName = href.split('/').pop();
                            const repoObj = { dataUrl, mime: mediaType, name: fName };
                            state.imageRepository.set(href, repoObj);
                            state.imageRepository.set(imgZipFile.name, repoObj);
                            state.imageRepository.set(fName, repoObj);
                        } catch (e) {}
                    }
                }
            }

            if (coverHref) {
                const foundCover = state.imageRepository.get(coverHref) || state.imageRepository.get(coverHref.split('/').pop());
                if (foundCover) state.coverUrl = foundCover.dataUrl;
            }

            // 4. TOC hierarchy from NCX or nav.xhtml
            updateProgress('Parsing Table of Contents & Hierarchy…', 50);
            const tocMap = new Map(); // href/filename -> { title, level }
            const ncxItem = manifestItems.find(i => (i.getAttribute('media-type') || '').includes('dtbncx'));
            if (ncxItem) {
                const ncxZipFile = findZipEntry(zip, ncxItem.getAttribute('href'), opfDir);
                if (ncxZipFile) {
                    try {
                        const ncxXml = await ncxZipFile.async('text');
                        const ncxDoc = parser.parseFromString(ncxXml, 'text/xml') || parser.parseFromString(ncxXml, 'text/html');
                        const walkNavPoints = (parentEl, currentLevel) => {
                            const navPoints = Array.from(parentEl.children).filter(c => c.tagName.toLowerCase().endsWith('navpoint'));
                            navPoints.forEach(np => {
                                const contentEl = Array.from(np.children).find(c => c.tagName.toLowerCase().endsWith('content'));
                                const textEl = np.querySelector('navLabel > text') || np.getElementsByTagName('text')[0];
                                if (contentEl && textEl) {
                                    const src = (contentEl.getAttribute('src') || '').split('#')[0].trim();
                                    const label = textEl.textContent.trim();
                                    const fname = src.split('/').pop();
                                    const entry = { title: label, level: currentLevel };
                                    if (src) {
                                        tocMap.set(src, entry);
                                        tocMap.set(src.toLowerCase(), entry);
                                    }
                                    if (fname) {
                                        tocMap.set(fname, entry);
                                        tocMap.set(fname.toLowerCase(), entry);
                                    }
                                }
                                walkNavPoints(np, currentLevel + 1);
                            });
                        };
                        const navMapEl = getXmlElements(ncxDoc, 'navMap')[0];
                        if (navMapEl) walkNavPoints(navMapEl, 1);
                    } catch (e) {}
                }
            } else {
                // Support EPUB 3 nav.xhtml navigation document
                const navItem = manifestItems.find(i => {
                    const props = (i.getAttribute('properties') || '').toLowerCase();
                    const href = (i.getAttribute('href') || '').toLowerCase();
                    return props.includes('nav') || href.includes('nav.xhtml') || href.includes('toc.xhtml');
                });
                if (navItem) {
                    const navZipFile = findZipEntry(zip, navItem.getAttribute('href'), opfDir);
                    if (navZipFile) {
                        try {
                            const navXhtml = await navZipFile.async('text');
                            const navDoc = parser.parseFromString(navXhtml, 'text/html');
                            const tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"], nav#toc, nav');
                            if (tocNav) {
                                const walkList = (parentOl, level) => {
                                    const lis = Array.from(parentOl.children).filter(c => c.tagName.toLowerCase() === 'li');
                                    lis.forEach(li => {
                                        const a = Array.from(li.children).find(c => c.tagName.toLowerCase() === 'a');
                                        if (a) {
                                            const src = (a.getAttribute('href') || '').split('#')[0].trim();
                                            const label = a.textContent.trim();
                                            const fname = src.split('/').pop();
                                            const entry = { title: label, level };
                                            if (src) {
                                                tocMap.set(src, entry);
                                                tocMap.set(src.toLowerCase(), entry);
                                            }
                                            if (fname) {
                                                tocMap.set(fname, entry);
                                                tocMap.set(fname.toLowerCase(), entry);
                                            }
                                        }
                                        const subOl = Array.from(li.children).find(c => c.tagName.toLowerCase() === 'ol' || c.tagName.toLowerCase() === 'ul');
                                        if (subOl) walkList(subOl, level + 1);
                                    });
                                };
                                const rootOl = tocNav.querySelector('ol, ul');
                                if (rootOl) walkList(rootOl, 1);
                            }
                        } catch (e) {}
                    }
                }
            }

            // 5. Spine Chapters Extraction with Manifest Fallback
            updateProgress('Extracting chapter prose…', 65);
            let spineItems = getXmlElements(opfDoc, 'itemref');
            let isManifestFallback = false;

            // Fallback to HTML/XHTML manifest items if spine is empty or malformed
            if (spineItems.length === 0) {
                spineItems = manifestItems.filter(i => {
                    const mt = (i.getAttribute('media-type') || '').toLowerCase();
                    const href = (i.getAttribute('href') || '').toLowerCase();
                    const props = (i.getAttribute('properties') || '').toLowerCase();
                    if (!mt.includes('xhtml') && !mt.includes('html')) return false;
                    if (props.includes('nav') || props.includes('cover')) return false;
                    if (/(?:^|\/)(?:toc|nav|cover)(?:[-_.]|\/|$)/i.test(href)) return false;
                    return true;
                });
                isManifestFallback = true;
            }

            let chIdx = 0;

            for (const itemRef of spineItems) {
                try {
                    const idref = (itemRef.getAttribute(isManifestFallback ? 'id' : 'idref') || '').trim();
                    const item = manifestMap.get(idref) || manifestMap.get(idref.toLowerCase()) || (isManifestFallback ? { id: idref, href: itemRef.getAttribute('href') } : null);
                    if (!item || !item.href) continue;

                    const chFile = findZipEntry(zip, item.href, opfDir);
                    if (!chFile) {
                        console.warn('Could not locate chapter file in zip:', item.href, 'opfDir:', opfDir);
                        continue;
                    }

                    chIdx++;
                    const xhtml = await chFile.async('text');
                    const chDoc = parser.parseFromString(xhtml, 'text/html');

                    // Check if this is dedicated cover page
                    const isCoverPage = (item.id || '').toLowerCase() === 'cover_page' || item.href.toLowerCase().includes('cover');
                    const imgs = Array.from(chDoc.querySelectorAll('img, image'));
                    if (isCoverPage && imgs.length === 1 && (chDoc.body ? chDoc.body.textContent.trim().length < 50 : true)) {
                        if (!state.coverUrl) {
                            const src = imgs[0].getAttribute('src') || imgs[0].getAttribute('xlink:href') || '';
                            const fname = src.split('/').pop();
                            const found = state.imageRepository.get(fname) || state.imageRepository.get(src);
                            if (found) state.coverUrl = found.dataUrl;
                        }
                        continue; // Skip cover page from chapters list
                    }

                    // Chapter title
                    const fname = item.href.split('/').pop();
                    const tocEntry = tocMap.get(item.href) || tocMap.get(fname) || tocMap.get(item.href.toLowerCase()) || tocMap.get(fname.toLowerCase());
                    let rawTitle = tocEntry?.title || '';
                    if (!rawTitle) {
                        const h1 = chDoc.querySelector('h1, h2, h3, .title, .chapter-title');
                        rawTitle = h1 ? h1.textContent.trim() : (chDoc.title ? chDoc.title.trim() : `Chapter ${chIdx}`);
                    }
                    const chTitle = cleanTitle(rawTitle, chIdx);
                    const chLevel = tocEntry ? (tocEntry.level > 1 ? 2 : 1) : 1;

                    // Extract prose and format into clean markdown
                    imgs.forEach(img => {
                        const src = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
                        const imgFname = src.split('/').pop();
                        const alt = img.getAttribute('alt') || 'Illustration';
                        const mdNode = chDoc.createTextNode(`\n\n![${alt}](${imgFname})\n\n`);
                        img.parentNode?.replaceChild(mdNode, img);
                    });

                    // Extract paragraphs & scene breaks
                    const blocks = chDoc.body ? Array.from(chDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, hr, div')) : [];
                    let prose = '';
                    if (blocks.length > 0) {
                        const lines = [];
                        blocks.forEach(b => {
                            const tag = b.tagName.toLowerCase();
                            if (tag === 'hr') {
                                lines.push('---');
                            } else if (tag.match(/^h[1-6]$/)) {
                                const lvl = parseInt(tag.charAt(1), 10);
                                const hText = b.textContent.trim();
                                const isTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                                const isEcho = isTitleEcho ? isTitleEcho(hText, chTitle, rawTitle) : ((hText || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (chTitle || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                                if (hText && !isEcho) {
                                    lines.push(`${'#'.repeat(lvl)} ${hText}`);
                                }
                            } else if (tag === 'blockquote') {
                                lines.push(`> ${b.textContent.trim()}`);
                            } else if (tag === 'p') {
                                const pText = b.textContent.trim();
                                if (pText) lines.push(pText);
                            } else if (tag === 'div' && !b.querySelector('p, div, h1, h2, h3, h4, h5, h6, blockquote')) {
                                const divText = b.textContent.trim();
                                if (divText) lines.push(divText);
                            }
                        });
                        prose = lines.join('\n\n');
                    }
                    if (!prose.trim()) {
                        prose = (chDoc.body?.textContent || chDoc.documentElement?.textContent || '').replace(/\r?\n\s*\r?\n/g, '\n\n').trim();
                    }

                    const chImages = extractImagesFromContent(prose);
                    state.chapters.push({
                        id: 'ch_' + chIdx,
                        title: chTitle,
                        originalTitle: rawTitle || chTitle,
                        level: chLevel,
                        content: prose,
                        words: countWords(prose),
                        images: chImages,
                        originalHead: chDoc.head ? chDoc.head.innerHTML : '',
                        bodyAttrs: Array.from(chDoc.body?.attributes || []).map(a => `${a.name}="${escapeXml(a.value)}"`).join(' '),
                        originalXhtml: xhtml,
                        fullPath: chFile.name,
                        href: item.href,
                        isNew: false
                    });
                } catch (chErr) {
                    console.warn('Error parsing chapter item:', chErr);
                }
            }

            // 6. Direct Zip File Fallback: If 0 chapters found via spine/manifest, scan zip directly!
            if (state.chapters.length === 0) {
                console.warn('Spine/manifest returned 0 chapters. Falling back to direct zip file scan...');
                const allZipKeys = Object.keys(zip.files || {});
                const htmlFiles = allZipKeys.filter(k => {
                    if (zip.files[k].dir) return false;
                    const lower = k.toLowerCase();
                    if (!lower.endsWith('.xhtml') && !lower.endsWith('.html') && !lower.endsWith('.htm')) return false;
                    if (/(?:^|\/)(?:toc|nav|cover|titlepage)(?:[-_.]|\/|$)/i.test(lower)) return false;
                    return true;
                });

                htmlFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                for (const k of htmlFiles) {
                    try {
                        const chFile = zip.files[k];
                        if (!chFile) continue;
                        chIdx++;
                        const xhtml = await chFile.async('text');
                        const chDoc = parser.parseFromString(xhtml, 'text/html');

                        const fname = k.split('/').pop();
                        const tocEntry = tocMap.get(k) || tocMap.get(fname) || tocMap.get(k.toLowerCase()) || tocMap.get(fname.toLowerCase());
                        let rawTitle = tocEntry?.title || '';
                        if (!rawTitle) {
                            const h1 = chDoc.querySelector('h1, h2, h3, .title, .chapter-title');
                            rawTitle = h1 ? h1.textContent.trim() : (chDoc.title ? chDoc.title.trim() : `Chapter ${chIdx}`);
                        }
                        const chTitle = cleanTitle(rawTitle, chIdx);
                        const chLevel = tocEntry ? (tocEntry.level > 1 ? 2 : 1) : 1;

                        const imgs = Array.from(chDoc.querySelectorAll('img, image'));
                        imgs.forEach(img => {
                            const src = img.getAttribute('src') || img.getAttribute('xlink:href') || '';
                            const imgFname = src.split('/').pop();
                            const alt = img.getAttribute('alt') || 'Illustration';
                            const mdNode = chDoc.createTextNode(`\n\n![${alt}](${imgFname})\n\n`);
                            img.parentNode?.replaceChild(mdNode, img);
                        });

                        const blocks = chDoc.body ? Array.from(chDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, hr, div')) : [];
                        let prose = '';
                        if (blocks.length > 0) {
                            const lines = [];
                            blocks.forEach(b => {
                                const tag = b.tagName.toLowerCase();
                                if (tag === 'hr') {
                                    lines.push('---');
                                } else if (tag.match(/^h[1-6]$/)) {
                                    const lvl = parseInt(tag.charAt(1), 10);
                                    const hText = b.textContent.trim();
                                    const isTitleEcho = (typeof window !== 'undefined' && window.isTitleEcho) ? window.isTitleEcho : null;
                                    const isEcho = isTitleEcho ? isTitleEcho(hText, chTitle, rawTitle) : ((hText || '').toLowerCase().replace(/[^a-z0-9]/g, '') === (chTitle || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
                                    if (hText && !isEcho) {
                                        lines.push(`${'#'.repeat(lvl)} ${hText}`);
                                    }
                                } else if (tag === 'blockquote') {
                                    lines.push(`> ${b.textContent.trim()}`);
                                } else if (tag === 'p') {
                                    const pText = b.textContent.trim();
                                    if (pText) lines.push(pText);
                                } else if (tag === 'div' && !b.querySelector('p, div, h1, h2, h3, h4, h5, h6, blockquote')) {
                                    const divText = b.textContent.trim();
                                    if (divText) lines.push(divText);
                                }
                            });
                            prose = lines.join('\n\n');
                        }
                        if (!prose.trim()) {
                            prose = (chDoc.body?.textContent || chDoc.documentElement?.textContent || '').replace(/\r?\n\s*\r?\n/g, '\n\n').trim();
                        }

                        const chImages = extractImagesFromContent(prose);
                        state.chapters.push({
                            id: 'ch_' + chIdx,
                            title: chTitle,
                            originalTitle: rawTitle || chTitle,
                            level: chLevel,
                            content: prose,
                            words: countWords(prose),
                            images: chImages,
                            originalHead: chDoc.head ? chDoc.head.innerHTML : '',
                            bodyAttrs: Array.from(chDoc.body?.attributes || []).map(a => `${a.name}="${escapeXml(a.value)}"`).join(' '),
                            originalXhtml: xhtml,
                            fullPath: k,
                            href: fname,
                            isNew: false
                        });
                    } catch (zipChErr) {
                        console.warn('Error reading fallback zip file:', k, zipChErr);
                    }
                }
            }

            updateProgress('Finished parsing book!', 100);
            renderEditorView();
            if (typeof window.toast === 'function') {
                window.toast(`Loaded "${state.title}" (${state.chapters.length} chapters, ${state.imageRepository.size} images)!`, 'success');
            }
        } catch (err) {
            console.error('EPUB parse error:', err);
            if (typeof window.toast === 'function') window.toast('Failed to parse EPUB: ' + err.message, 'error');
        } finally {
            if (spinner) spinner.classList.add('hidden');
            if (progWrap) progWrap.classList.add('hidden');
        }
    }

    // ── Load Book from Library Object (GeminiNovelDB record) ──
    // ── Export Clean EPUB File ──
    async function exportCleanEpub() {
        if (!state.chapters || state.chapters.length === 0) {
            if (typeof window.toast === 'function') window.toast('No chapters to export.', 'warning');
            return;
        }

        const emptyChapters = state.chapters.filter(c => !c.content || !c.content.trim());
        if (emptyChapters.length > 0) {
            const proceed = confirm(`Warning: ${emptyChapters.length} chapter(s) have no content.\n\nDo you want to continue exporting?`);
            if (!proceed) return;
        }

        // Auto-save active chapter modal if currently open
        if (!document.getElementById('edit-chapter-modal')?.classList.contains('hidden')) {
            try {
                saveCurrentModalChapter();
            } catch (e) {}
        }

        // Auto-save TOC manager modal changes if currently open
        if (!document.getElementById('edit-toc-manager-modal')?.classList.contains('hidden')) {
            try {
                saveTocManagerChanges();
            } catch (e) {}
        }

        // Sync metadata
        state.title = document.getElementById('edit-book-title')?.value.trim() || state.title || 'Novel';
        state.author = document.getElementById('edit-book-author')?.value.trim() || state.author || 'Author';
        state.lang = document.getElementById('edit-book-lang')?.value.trim() || 'en';
        state.description = document.getElementById('edit-book-desc')?.value.trim() || state.description || '';

        const btnExport = document.getElementById('btn-edit-export-epub');
        if (btnExport) {
            btnExport.disabled = true;
            btnExport.textContent = '⏳ Packaging…';
        }

        if (typeof window.setEpubPackagingModal === 'function') {
            window.setEpubPackagingModal({ title: state.title, status: `Packaging ${state.chapters.length} chapters…`, pct: 5 });
        }

        try {
            let blob = null;
            const fileName = `${state.title} - ${state.chapters.length} Chapters.epub`.replace(/[\\/:*?"<>|]/g, '_');

            // ── STRATEGY 1: In-Place Preservation of Original Container ──
            if (state.originalZip && state.originalOpfPath) {
                const zip = state.originalZip;
                const opfPath = state.originalOpfPath;
                const opfDir = state.originalOpfDir;
                const parser = new DOMParser();
                const serializer = new XMLSerializer();
                let opfDoc = null;

                // 1. Update OPF metadata and spine
                const opfFile = zip.file(opfPath);
                if (opfFile) {
                    const opfXml = await opfFile.async('text');
                    try {
                        opfDoc = parser.parseFromString(opfXml, 'application/xml');
                        if (opfDoc.querySelector('parsererror')) {
                            opfDoc = parser.parseFromString(opfXml, 'text/html');
                        }
                    } catch (e) {
                        opfDoc = parser.parseFromString(opfXml, 'text/html');
                    }

                    if (opfDoc) {
                        const titleEl = opfDoc.querySelector('metadata > title, metadata > dc\\:title') || opfDoc.getElementsByTagName('dc:title')[0];
                        if (titleEl) titleEl.textContent = state.title;

                        const authorEl = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator') || opfDoc.getElementsByTagName('dc:creator')[0];
                        if (authorEl) authorEl.textContent = state.author;

                        const langEl = opfDoc.querySelector('metadata > language, metadata > dc\\:language') || opfDoc.getElementsByTagName('dc:language')[0];
                        if (langEl) langEl.textContent = state.lang;

                        const descEl = opfDoc.querySelector('metadata > description, metadata > dc\\:description') || opfDoc.getElementsByTagName('dc:description')[0];
                        if (descEl) descEl.textContent = state.description;

                        const manifestEl = opfDoc.querySelector('manifest');
                        const spineEl = opfDoc.querySelector('spine');

                        if (spineEl) {
                            while (spineEl.firstChild) {
                                spineEl.removeChild(spineEl.firstChild);
                            }

                            for (let i = 0; i < state.chapters.length; i++) {
                                const ch = state.chapters[i];
                                let chId = ch.id;
                                let chHref = ch.href;
                                let chFullPath = ch.fullPath;

                                if (ch.isNew || !chFullPath || !zip.file(chFullPath)) {
                                    chId = `ch_new_${i + 1}_${Date.now()}`;
                                    const relFile = `Text/ch_${i + 1}.xhtml`;
                                    chHref = relFile;
                                    chFullPath = opfDir + relFile;
                                    ch.fullPath = chFullPath;
                                    ch.href = chHref;

                                    if (manifestEl) {
                                        const itemEl = opfDoc.createElement('item');
                                        itemEl.setAttribute('id', chId);
                                        itemEl.setAttribute('href', chHref);
                                        itemEl.setAttribute('media-type', 'application/xhtml+xml');
                                        manifestEl.appendChild(itemEl);
                                    }
                                }

                                const itemRef = opfDoc.createElement('itemref');
                                itemRef.setAttribute('idref', chId);
                                spineEl.appendChild(itemRef);

                                // Re-inject prose preserving original head styling and body attributes
                                let headContent = ch.originalHead || `<title>${escapeXml(ch.title)}</title>`;
                                if (headContent.includes('<title>')) {
                                    headContent = headContent.replace(/<title>.*?<\/title>/gi, `<title>${escapeXml(ch.title)}</title>`);
                                } else {
                                    headContent = `<title>${escapeXml(ch.title)}</title>\n` + headContent;
                                }
                                const bodyAttrs = ch.bodyAttrs ? ` ${ch.bodyAttrs}` : '';
                                const bodyHtml = markdownToChapterHtml(ch.content, ch.title);

                                const newXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
${headContent}
</head>
<body${bodyAttrs}>
${bodyHtml}
</body>
</html>`;
                                zip.file(chFullPath, newXhtml);
                            }
                        }

                        // Update cover in zip if modified via Cover Studio or uploaded
                        if (state.coverUrl && state.coverUrl.startsWith('data:image/')) {
                            try {
                                const match = state.coverUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
                                if (match) {
                                    const mime = match[1];
                                    const base64Data = match[2];
                                    const ext = mime.includes('png') ? 'png' : (mime.includes('webp') ? 'webp' : 'jpg');
                                    let coverItem = opfDoc.querySelector('manifest > item[properties*="cover-image"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover-image"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover"]') ||
                                                   opfDoc.querySelector('manifest > item[id="cover-img"]');
                                    if (coverItem) {
                                        const coverHref = coverItem.getAttribute('href');
                                        if (coverHref) {
                                            const existingCoverFile = findZipEntry(zip, coverHref, opfDir);
                                            if (existingCoverFile) {
                                                zip.file(existingCoverFile.name, base64Data, { base64: true });
                                            }
                                        }
                                    } else {
                                        const newCoverRel = `Images/cover.${ext}`;
                                        const newCoverPath = opfDir + newCoverRel;
                                        zip.file(newCoverPath, base64Data, { base64: true });
                                        if (manifestEl) {
                                            const itemEl = opfDoc.createElement('item');
                                            itemEl.setAttribute('id', 'cover-image');
                                            itemEl.setAttribute('href', newCoverRel);
                                            itemEl.setAttribute('media-type', mime);
                                            itemEl.setAttribute('properties', 'cover-image');
                                            manifestEl.appendChild(itemEl);
                                        }
                                    }
                                }
                            } catch (covErr) {
                                console.warn('Cover update in zip warning:', covErr);
                            }
                        }

                        zip.file(opfPath, serializer.serializeToString(opfDoc));
                    }
                }

                // 2. Update Table of Contents in NCX (EPUB 2) AND nav.xhtml (EPUB 3)
                // 2a. Update NCX
                let ncxFile = zip.file(opfDir + 'toc.ncx') || zip.file('toc.ncx');
                if (!ncxFile && opfDoc) {
                    const ncxManifest = opfDoc.querySelector('manifest > item[media-type*="dtbncx"], manifest > item[id="ncx"], manifest > item[id="toc"]');
                    if (ncxManifest) {
                        const href = ncxManifest.getAttribute('href');
                        if (href) ncxFile = findZipEntry(zip, href, opfDir);
                    }
                }
                if (ncxFile) {
                    try {
                        const ncxXml = await ncxFile.async('text');
                        let ncxDoc;
                        try {
                            ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
                            if (ncxDoc.querySelector('parsererror')) {
                                ncxDoc = parser.parseFromString(ncxXml, 'text/html');
                            }
                        } catch (e) {
                            ncxDoc = parser.parseFromString(ncxXml, 'text/html');
                        }

                        const navMapEl = ncxDoc?.querySelector('navMap');
                        if (navMapEl) {
                            while (navMapEl.firstChild) navMapEl.removeChild(navMapEl.firstChild);

                            let playOrder = 1;
                            let currentParentNavPoint = null;

                            state.chapters.forEach((ch, idx) => {
                                const np = ncxDoc.createElement('navPoint');
                                np.setAttribute('id', `navPoint-${playOrder}`);
                                np.setAttribute('playOrder', String(playOrder));

                                const nl = ncxDoc.createElement('navLabel');
                                const txt = ncxDoc.createElement('text');
                                txt.textContent = ch.title;
                                nl.appendChild(txt);
                                np.appendChild(nl);

                                const cnt = ncxDoc.createElement('content');
                                const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                                const relSrc = getRelativeZipHref(ncxFile.name, opfDir + chTarget);
                                cnt.setAttribute('src', relSrc);
                                np.appendChild(cnt);

                                if (ch.level === 2 && currentParentNavPoint) {
                                    currentParentNavPoint.appendChild(np);
                                } else {
                                    navMapEl.appendChild(np);
                                    currentParentNavPoint = np;
                                }
                                playOrder++;
                            });

                            zip.file(ncxFile.name, serializer.serializeToString(ncxDoc));
                        }
                    } catch (ncxErr) {
                        console.warn('NCX update error:', ncxErr);
                    }
                }

                // 2b. Update or Inject EPUB 3 Navigation Document (nav.xhtml)
                let navItem = opfDoc ? opfDoc.querySelector('manifest > item[properties~="nav"], manifest > item[properties*="nav"]') : null;
                let navFile = null;
                if (navItem) {
                    const navHref = navItem.getAttribute('href');
                    if (navHref) navFile = findZipEntry(zip, navHref, opfDir);
                }
                if (!navFile) {
                    navFile = zip.file(opfDir + 'nav.xhtml') || zip.file(opfDir + 'toc.xhtml') || zip.file('nav.xhtml') || zip.file('toc.xhtml');
                }

                const isEpub3 = Boolean(opfDoc?.documentElement?.getAttribute('version')?.startsWith('3'));

                if (navFile) {
                    try {
                        const navXml = await navFile.async('text');
                        let navDoc;
                        try {
                            navDoc = parser.parseFromString(navXml, 'application/xhtml+xml');
                            if (navDoc.querySelector('parsererror')) {
                                navDoc = parser.parseFromString(navXml, 'text/html');
                            }
                        } catch (e) {
                            navDoc = parser.parseFromString(navXml, 'text/html');
                        }

                        let tocNav = navDoc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"], nav#toc, nav');
                        if (!tocNav) {
                            tocNav = navDoc.createElement('nav');
                            tocNav.setAttribute('xmlns:epub', 'http://www.idpf.org/2007/ops');
                            tocNav.setAttribute('epub:type', 'toc');
                            tocNav.setAttribute('id', 'toc');
                            const h1 = navDoc.createElement('h1');
                            h1.textContent = 'Table of Contents';
                            tocNav.appendChild(h1);
                            (navDoc.body || navDoc.documentElement).appendChild(tocNav);
                        }

                        // Remove old lists in tocNav
                        const oldLists = tocNav.querySelectorAll('ol, ul');
                        oldLists.forEach(ol => ol.remove());

                        // Build updated hierarchical <ol>
                        const rootOl = navDoc.createElement('ol');
                        rootOl.style.listStyleType = 'none';
                        let currentParentLi = null;
                        let currentSubOl = null;

                        state.chapters.forEach((ch, idx) => {
                            const li = navDoc.createElement('li');
                            const a = navDoc.createElement('a');
                            const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                            const relHref = getRelativeZipHref(navFile.name, opfDir + chTarget);
                            a.setAttribute('href', relHref);
                            a.textContent = ch.title;
                            li.appendChild(a);

                            if (ch.level === 2 && currentParentLi) {
                                if (!currentSubOl) {
                                    currentSubOl = navDoc.createElement('ol');
                                    currentSubOl.style.listStyleType = 'none';
                                    currentParentLi.appendChild(currentSubOl);
                                }
                                currentSubOl.appendChild(li);
                            } else {
                                rootOl.appendChild(li);
                                currentParentLi = li;
                                currentSubOl = null;
                            }
                        });

                        tocNav.appendChild(rootOl);
                        zip.file(navFile.name, serializer.serializeToString(navDoc));
                    } catch (navErr) {
                        console.warn('EPUB 3 nav.xhtml update error:', navErr);
                    }
                } else if (isEpub3 && opfDoc) {
                    // EPUB 3 book missing nav document: generate clean nav.xhtml and register in manifest
                    try {
                        const navRelPath = 'nav.xhtml';
                        const navFullPath = opfDir + navRelPath;

                        let olContent = '';
                        let currentParentOpen = false;
                        let currentSubOpen = false;

                        state.chapters.forEach((ch, idx) => {
                            const chTarget = ch.href || (ch.fullPath ? ch.fullPath.replace(opfDir, '') : `ch_${idx + 1}.xhtml`);
                            const relHref = getRelativeZipHref(navFullPath, opfDir + chTarget);

                            if (ch.level === 2 && currentParentOpen) {
                                if (!currentSubOpen) {
                                    olContent += '<ol style="list-style-type:none;">';
                                    currentSubOpen = true;
                                }
                                olContent += `<li><a href="${escapeXml(relHref)}">${escapeXml(ch.title)}</a></li>`;
                            } else {
                                if (currentSubOpen) {
                                    olContent += '</ol></li>';
                                    currentSubOpen = false;
                                    currentParentOpen = false;
                                } else if (currentParentOpen) {
                                    olContent += '</li>';
                                    currentParentOpen = false;
                                }
                                olContent += `<li><a href="${escapeXml(relHref)}">${escapeXml(ch.title)}</a>`;
                                currentParentOpen = true;
                            }
                        });
                        if (currentSubOpen) olContent += '</ol>';
                        if (currentParentOpen) olContent += '</li>';

                        const navXhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <meta charset="utf-8" />
  <style>
    nav#toc ol { list-style-type: none; margin: 0; padding: 0 0 0 1.2em; }
    nav#toc li { margin: 0.3em 0; }
    nav#toc a { text-decoration: none; }
  </style>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol style="list-style-type:none;">
      ${olContent}
    </ol>
  </nav>
</body>
</html>`;
                        zip.file(navFullPath, navXhtmlContent);

                        const manifestEl = opfDoc.querySelector('manifest');
                        if (manifestEl && !manifestEl.querySelector('item[properties*="nav"]')) {
                            const navItemEl = opfDoc.createElement('item');
                            navItemEl.setAttribute('id', 'nav');
                            navItemEl.setAttribute('href', navRelPath);
                            navItemEl.setAttribute('media-type', 'application/xhtml+xml');
                            navItemEl.setAttribute('properties', 'nav');
                            manifestEl.appendChild(navItemEl);

                            zip.file(opfPath, serializer.serializeToString(opfDoc));
                        }
                    } catch (genNavErr) {
                        console.warn('Error generating nav.xhtml:', genNavErr);
                    }
                }

                // Ensure mimetype entry has STORE compression for strict EPUB compliance
                if (zip.file('mimetype')) {
                    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
                }

                // 3. Generate Blob from originalZip
                blob = await zip.generateAsync({
                    type: 'blob',
                    mimeType: 'application/epub+zip',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                }, (meta) => {
                    if (btnExport) btnExport.textContent = `⏳ ${Math.round(meta.percent)}%`;
                    if (typeof window.setEpubPackagingModal === 'function') {
                        window.setEpubPackagingModal({ title: state.title, status: `Packaging EPUB…`, pct: Math.round(meta.percent) });
                    }
                });
            } else {
                // ── STRATEGY 2: Fallback to Packaging Engine (for Library/imported records) ──
                if (typeof window.generateEpubFromChapters !== 'function') {
                    throw new Error('EPUB packaging engine is not available.');
                }

                const chaptersForPackaging = state.chapters.map((c, i) => ({
                    id: c.id || `ch_${i + 1}`,
                    title: c.title,
                    originalTitle: c.title,
                    content: c.content,
                    level: c.level || 1,
                    words: c.words || countWords(c.content)
                }));

                const opts = {
                    coverUrl: state.coverUrl,
                    cover: state.coverUrl,
                    hierarchicalToc: true
                };

                blob = await window.generateEpubFromChapters(
                    chaptersForPackaging,
                    state.title,
                    state.author,
                    state.lang,
                    (status, pct, elapsed) => {
                        if (btnExport) btnExport.textContent = `⏳ ${pct}%`;
                        if (typeof window.setEpubPackagingModal === 'function') {
                            window.setEpubPackagingModal({ title: state.title, status: status || `Packaging ${state.chapters.length} chapters…`, pct, elapsed });
                        }
                    },
                    opts
                );
            }

            const novelFolderOpts = (typeof window.getNovelFolderOptions === 'function') ? window.getNovelFolderOptions(state) : null;
            if (typeof window.saveUniversalBlob === 'function') {
                await window.saveUniversalBlob(blob, fileName, 'application/epub+zip', false, novelFolderOpts);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }

            if (typeof window.toast === 'function') {
                window.toast(`✓ Clean EPUB exported! (${state.chapters.length} chapters)`, 'success');
            }

            // Cache freshly exported blob in IndexedDB for fast re-downloads
            if (state.novelId && window.GeminiNovelDB && blob) {
                try {
                    const rec = await window.GeminiNovelDB.getNovel(state.novelId);
                    if (rec) {
                        rec.epubBlob = blob;
                        rec.isEdited = true;
                        await window.GeminiNovelDB.saveNovel(rec);
                    }
                } catch (e) {}
            }
        } catch (err) {
            console.error('EPUB packaging error:', err);
            if (typeof window.toast === 'function') window.toast('Failed to package EPUB: ' + err.message, 'error');
        } finally {
            if (typeof window.setEpubPackagingModal === 'function') {
                window.setEpubPackagingModal(null);
            }
            if (btnExport) {
                btnExport.disabled = false;
                btnExport.textContent = '📥 Download EPUB';
            }
        }
    }

  return {
    getXmlElements,
    getFirstXmlTag,
    findZipEntry,
    getRelativeZipHref,
    parseEpubFile,
    exportCleanEpub
  };
}));
