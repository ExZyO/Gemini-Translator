/**
 * Gemini EPUB Translator - Document Parsing & Ebook Ingestion Engine
 * Module: file_parser_engine.js
 * 
 * Provides:
 * - Pure asynchronous decoders for EPUB, PDF, Word (.docx), and plain text (.txt)
 * - Intelligent TOC hierarchy and heading resolution for EPUB 2/3 and NCX navigation
 * - Embedded and manifest cover art extraction with data URI serialization
 * - Foreword, summary, and prologue disambiguation
 * - Unified parseFile entry point for multi-format drag-and-drop / file selector
 */

(function(window) {
  'use strict';

  const DocumentParser = {
    /**
     * Reads a File or Blob as UTF-8 plain text
     */
    readFileAsText(f) {
      return new Promise((res, rej) => {
        if (!f) return rej(new Error('No file provided.'));
        if (typeof f.text === 'function') {
          f.text().then(res).catch(() => {
            const r = new FileReader();
            r.onload = e => res(e.target.result);
            r.onerror = e => rej(e.target.error);
            r.readAsText(f);
          });
        } else {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = e => rej(e.target.error);
          r.readAsText(f);
        }
      });
    },

    /**
     * Extracts text from PDF files using window.pdfjsLib
     */
    async readPdf(f) {
      if (!window.pdfjsLib) throw new Error('PDF.js engine is not loaded.');
      const buf = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let txt = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        if (!tc.items?.length) continue;
        const items = tc.items.sort((a, b) => a.transform[5] < b.transform[5] ? 1 : a.transform[5] > b.transform[5] ? -1 : a.transform[4] - b.transform[4]);
        let lastY = items[0].transform[5];
        let line = '';
        for (const it of items) {
          const y = it.transform[5];
          if (Math.abs(y - lastY) > it.height * 0.4) {
            txt += line + '\n';
            if (Math.abs(y - lastY) > it.height * 1.2) txt += '\n';
            line = '';
          }
          line += it.str + (it.str.endsWith(' ') ? '' : ' ');
          lastY = y;
        }
        txt += line + '\n\n';
      }
      return txt;
    },

    /**
     * Extracts text and heading structure from Word (.docx) documents
     */
    async readDocx(f) {
      if (!window.JSZip) throw new Error('JSZip is required to read .docx files.');
      const zip = await window.JSZip.loadAsync(f);
      const docFile = zip.file('word/document.xml');
      if (!docFile) throw new Error('Invalid Word (.docx) document: word/document.xml not found.');
      const xmlText = await docFile.async('text');

      let lines = [];
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const paragraphs = xmlDoc.getElementsByTagName('w:p');
        if (paragraphs && paragraphs.length > 0) {
          for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const isHeading = Boolean(p.querySelector && p.querySelector('pStyle[val*="Heading"], pStyle[val*="Title"], pStyle[val*="heading"], pStyle[val*="title"], w\\:pStyle[w\\:val*="Heading"], w\\:pStyle[w\\:val*="Title"]'));
            const textNodes = p.querySelectorAll ? p.querySelectorAll('w\\:t, t, w\\:br, br, w\\:tab, tab') : p.getElementsByTagName('w:t');
            let pText = '';
            if (textNodes && textNodes.length > 0) {
              for (let j = 0; j < textNodes.length; j++) {
                const node = textNodes[j];
                const tag = (node.tagName || '').toLowerCase();
                if (tag.endsWith('br')) pText += '\n';
                else if (tag.endsWith('tab')) pText += ' ';
                else pText += node.textContent || '';
              }
            } else {
              const ts = p.getElementsByTagName('w:t');
              for (let j = 0; j < ts.length; j++) pText += ts[j].textContent || '';
            }
            const trimmed = pText.trim();
            if (trimmed) {
              if (isHeading && !trimmed.startsWith('#')) {
                lines.push(`# ${trimmed}`);
              } else {
                lines.push(trimmed);
              }
            }
          }
        }
      } catch (domErr) {
        console.warn('DOMParser failed on docx, using regex fallback:', domErr);
      }

      if (lines.length === 0) {
        const pMatches = xmlText.match(/<w:p[\s>].*?<\/w:p>/g) || [];
        lines = pMatches.map(p => {
          const tMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
          return tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
        }).filter(l => l.trim());
      }

      const fullText = lines.join('\n\n');
      if (!fullText.trim()) throw new Error('Word document contains no readable text.');
      return fullText;
    },

    /**
     * Complete EPUB 2 / EPUB 3 reader with NCX / Nav parsing and cover extraction
     */
    async readEpub(f) {
      if (!window.JSZip) throw new Error('JSZip is required to read .epub files.');
      let zipInput = f;
      if (f && typeof f.arrayBuffer === 'function') {
        try {
          zipInput = await f.arrayBuffer();
        } catch (_) {
          zipInput = f;
        }
      } else if (f && f.buffer && f.buffer instanceof ArrayBuffer) {
        zipInput = f.buffer;
      }
      if (typeof Blob !== 'undefined' && zipInput instanceof Blob && typeof FileReader !== 'undefined') {
        try {
          zipInput = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(zipInput);
          });
        } catch (_) {}
      }
      const zip = await (window.JSZip.loadAsync ? window.JSZip.loadAsync(zipInput) : new window.JSZip().loadAsync(zipInput));
      const chapters = [];

      // Resilient file lookup helper that resolves across case, encoding, and path separators
      const findZipFile = (pathStr) => {
        if (!pathStr || typeof pathStr !== 'string') return null;
        let clean = pathStr.replace(/^\/+/, '');
        let zf = zip.file(clean);
        if (zf) return zf;
        try {
          const dec = decodeURIComponent(clean);
          zf = zip.file(dec);
          if (zf) return zf;
        } catch (_) {}
        try {
          const enc = encodeURI(clean);
          zf = zip.file(enc);
          if (zf) return zf;
        } catch (_) {}
        const normClean = clean.toLowerCase().replace(/\\/g, '/');
        const bareFilename = normClean.split('/').pop().split(/[#?]/)[0];
        const allKeys = Object.keys(zip.files).filter(k => !k.endsWith('/'));
        const exactNorm = allKeys.find(k => k.toLowerCase().replace(/\\/g, '/') === normClean);
        if (exactNorm) return zip.file(exactNorm);
        const endsNorm = allKeys.find(k => k.toLowerCase().replace(/\\/g, '/').endsWith('/' + normClean));
        if (endsNorm) return zip.file(endsNorm);
        const bareNorm = allKeys.find(k => k.split('/').pop().split(/[#?]/)[0].toLowerCase() === bareFilename);
        if (bareNorm) return zip.file(bareNorm);
        return null;
      };

      const cf = findZipFile('META-INF/container.xml') || findZipFile('container.xml');
      let rp = '';
      let od = '';
      if (cf) {
        const cc = await cf.async('text');
        const cd = new DOMParser().parseFromString(cc, 'text/xml');
        const rootfileEl = cd.querySelector('rootfile') || cd.getElementsByTagName('rootfile')[0] || cd.getElementsByTagNameNS('*', 'rootfile')[0];
        rp = rootfileEl?.getAttribute('full-path') || '';
      }
      if (rp) od = rp.substring(0, rp.lastIndexOf('/') + 1);

      let of2 = rp ? findZipFile(rp) : null;
      if (!of2) {
        // Fallback: search for any .opf package file in the zip
        const opfKey = Object.keys(zip.files).find(k => !k.endsWith('/') && k.toLowerCase().endsWith('.opf'));
        if (opfKey) {
          of2 = zip.file(opfKey);
          od = opfKey.substring(0, opfKey.lastIndexOf('/') + 1);
        }
      }
      if (!of2) throw new Error('Invalid EPUB: OPF package document not found.');
      
      const oc = await of2.async('text');
      const opf = new DOMParser().parseFromString(oc, 'text/xml');

      const getOpfText = (tag) => {
        const el = opf.querySelector(tag) ||
                   opf.querySelector(`dc\\:${tag}`) ||
                   (opf.getElementsByTagNameNS ? opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', tag)[0] : null) ||
                   (opf.getElementsByTagName ? opf.getElementsByTagName(tag)[0] : null) ||
                   (opf.getElementsByTagName ? opf.getElementsByTagName(`dc:${tag}`)[0] : null);
        return (el?.textContent || '').trim();
      };

      const bookTitle = getOpfText('title') || (f && f.name ? f.name.replace(/\.epub$/i, '') : 'Imported Novel');
      const bookAuthor = getOpfText('creator') || 'Author';
      const bookIdentifier = getOpfText('identifier') || '';
      const bookSource = (
        getOpfText('source') ||
        opf.querySelector('meta[property="gemini:source_url"]')?.textContent ||
        opf.querySelector('meta[name="source-url"]')?.getAttribute('content') ||
        opf.querySelector('meta[name="source"]')?.getAttribute('content') ||
        ''
      ).trim();

      // Extract invisible multi-source list
      let sources = [];
      const sourcesMeta = opf.querySelector('meta[property="gemini:sources"]')?.textContent;
      if (sourcesMeta) {
        try {
          const parsed = JSON.parse(sourcesMeta);
          if (Array.isArray(parsed) && parsed.length > 0) {
            sources = parsed;
          }
        } catch (e) {}
      }
      if (!sources.length && bookSource) {
        sources = [{ url: bookSource, label: 'Original Source', active: true }];
      }

      // Extract saved novel ID if previously assigned
      const savedNovelId = (opf.querySelector('meta[property="gemini:novel_id"]')?.textContent || '').trim();

      // Extract saved TOC hierarchy if embedded
      let embeddedTocHierarchy = null;
      const tocHierarchyMeta = opf.querySelector('meta[property="gemini:toc_hierarchy"]')?.textContent;
      if (tocHierarchyMeta) {
        try {
          embeddedTocHierarchy = JSON.parse(tocHierarchyMeta);
        } catch (e) {}
      }
      
      const allManifestItems = Array.from(opf.querySelectorAll('manifest item, *|manifest *|item, item'));
      const manifestMap = new Map();
      allManifestItems.forEach(item => {
        const mId = item.getAttribute('id');
        if (mId) manifestMap.set(mId, item);
      });

      const ncxI = allManifestItems.find(i => (i.getAttribute('media-type') || '').toLowerCase() === 'application/x-dtbncx+xml');
      const ncxH = ncxI ? od + (ncxI.getAttribute('href') || '') : null;
      const navI = allManifestItems.find(i => (i.getAttribute('properties') || '').split(/\s+/).includes('nav'));
      const navH = navI ? od + (navI.getAttribute('href') || '') : null;
      
      const titles = new Map();
      const tocMap = new Map();

      // Helper to resolve relative zip file paths
      const resolveZipPath = (baseFilePath, relPath) => {
        if (!relPath) return '';
        if (relPath.startsWith('/')) return relPath.slice(1);
        if (/^[a-zA-Z]+:\/\//.test(relPath)) return '';
        const baseDir = baseFilePath.substring(0, baseFilePath.lastIndexOf('/') + 1);
        const combined = baseDir + relPath.split('#')[0].split('?')[0];
        const parts = combined.split('/');
        const stack = [];
        for (const p of parts) {
          if (p === '.' || p === '') continue;
          if (p === '..') {
            if (stack.length > 0) stack.pop();
          } else {
            stack.push(p);
          }
        }
        return stack.join('/');
      };

      // 1. Recursive NCX parser with volume hierarchy preservation
      if (ncxH) {
        const nf = findZipFile(ncxH) || (od ? findZipFile(ncxH.replace(od, '')) : null);
        if (nf) {
          try {
            const nc = await nf.async('text');
            const nd = new DOMParser().parseFromString(nc, 'text/xml');
            const walkNcx = (parentEl, currentVolume = '', depth = 1) => {
              const navPoints = Array.from(parentEl.children).filter(c => c.tagName && c.tagName.toLowerCase() === 'navpoint');
              for (const np of navPoints) {
                const label = (np.querySelector(':scope > navLabel > text')?.textContent || '').trim();
                const src = np.querySelector(':scope > content')?.getAttribute('src') || '';
                const cleanSrc = src ? src.split('#')[0] : '';
                const canonSrc = cleanSrc ? resolveZipPath(ncxH, cleanSrc) : '';
                const bareName = cleanSrc ? cleanSrc.split('/').pop() : '';
                const childNavPoints = Array.from(np.children).filter(c => c.tagName && c.tagName.toLowerCase() === 'navpoint');

                if (childNavPoints.length > 0) {
                  // Volume or Arc heading
                  const vol = label || currentVolume;
                  const entry = { title: label, volume: currentVolume, level: depth };
                  if (cleanSrc) {
                    titles.set(cleanSrc, label);
                    tocMap.set(cleanSrc, entry);
                  }
                  if (canonSrc) {
                    titles.set(canonSrc, label);
                    tocMap.set(canonSrc, entry);
                    if (od && canonSrc.startsWith(od)) tocMap.set(canonSrc.slice(od.length), entry);
                  }
                  if (bareName) tocMap.set(bareName, entry);
                  walkNcx(np, vol, depth + 1);
                } else {
                  // Leaf chapter
                  const entry = { title: label, volume: currentVolume, level: depth };
                  if (cleanSrc) {
                    if (label) titles.set(cleanSrc, label);
                    tocMap.set(cleanSrc, entry);
                  }
                  if (canonSrc) {
                    if (label) titles.set(canonSrc, label);
                    tocMap.set(canonSrc, entry);
                    if (od && canonSrc.startsWith(od)) tocMap.set(canonSrc.slice(od.length), entry);
                  }
                  if (bareName) tocMap.set(bareName, entry);
                }
              }
            };
            const navMap = nd.querySelector('navMap');
            if (navMap) walkNcx(navMap, '', 1);
            else walkNcx(nd.documentElement, '', 1);
          } catch (e) {
            console.warn('[FileParserEngine] NCX parsing warning:', e);
          }
        }
      }

      // 2. Recursive EPUB 3 Nav parser with nested volume list
      if (navH) {
        const nvf = findZipFile(navH) || (od ? findZipFile(navH.replace(od, '')) : null);
        if (nvf) {
          try {
            const nvc = await nvf.async('text');
            const nvd = new DOMParser().parseFromString(nvc, 'text/html') || new DOMParser().parseFromString(nvc, 'application/xhtml+xml');
            const walkNavOl = (olEl, currentVolume = '', depth = 1) => {
              const lis = Array.from(olEl.children).filter(c => c.tagName && c.tagName.toLowerCase() === 'li');
              for (const li of lis) {
                const subOl = li.querySelector(':scope > ol');
                const a = li.querySelector(':scope > a');
                const span = li.querySelector(':scope > span');
                const label = (a?.textContent || span?.textContent || '').trim();
                const href = a?.getAttribute('href') || '';
                const cleanHref = href ? href.split('#')[0] : '';
                const canonHref = cleanHref ? resolveZipPath(navH, cleanHref) : '';
                const bareName = cleanHref ? cleanHref.split('/').pop() : '';

                if (subOl) {
                  const vol = label || currentVolume;
                  const entry = { title: label, volume: currentVolume, level: depth };
                  if (cleanHref) {
                    if (label && !titles.has(cleanHref)) titles.set(cleanHref, label);
                    tocMap.set(cleanHref, entry);
                  }
                  if (canonHref) {
                    if (label && !titles.has(canonHref)) titles.set(canonHref, label);
                    tocMap.set(canonHref, entry);
                    if (od && canonHref.startsWith(od)) tocMap.set(canonHref.slice(od.length), entry);
                  }
                  if (bareName) tocMap.set(bareName, entry);
                  walkNavOl(subOl, vol, depth + 1);
                } else if (cleanHref) {
                  const entry = { title: label, volume: currentVolume, level: depth };
                  if (label && !titles.has(cleanHref)) titles.set(cleanHref, label);
                  tocMap.set(cleanHref, entry);
                  if (canonHref) {
                    if (label && !titles.has(canonHref)) titles.set(canonHref, label);
                    tocMap.set(canonHref, entry);
                    if (od && canonHref.startsWith(od)) tocMap.set(canonHref.slice(od.length), entry);
                  }
                  if (bareName) tocMap.set(bareName, entry);
                }
              }
            };
            const tocNav = nvd.querySelector('nav[*|type="toc"], nav#toc, nav.toc, nav');
            const firstOl = tocNav?.querySelector('ol');
            if (firstOl) walkNavOl(firstOl, '', 1);
          } catch (e) {
            console.warn('[FileParserEngine] Nav.xhtml parsing warning:', e);
          }
        }
      }

      // Extracts structured prose while maintaining paragraph breaks and punctuation spacing
      const extractText = n => {
        let t = '';
        const blocks = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'blockquote', 'tr', 'section', 'article', 'pre'];
        if (n.nodeType === 3) {
          t += (n.textContent || '');
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') return '\n';
          if (tag === 'img') {
            const src = n.getAttribute('data-embedded-uri') || n.getAttribute('src');
            const alt = n.getAttribute('alt') || 'Illustration';
            if (src) return `\n\n![${alt}](${src})\n\n`;
          }
          if (tag === 'image') {
            const href = n.getAttribute('data-embedded-uri') || n.getAttribute('href') || n.getAttribute('xlink:href') || (n.getAttributeNS && n.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
            if (href) return `\n\n![Illustration](${href})\n\n`;
          }
          for (const c of n.childNodes) {
            const childTxt = extractText(c);
            if (childTxt) {
              if (t && !t.endsWith(' ') && !t.endsWith('\n') && !childTxt.startsWith(' ') && !childTxt.startsWith('\n') && !/[，。！？、,.!?\s]/.test(t.slice(-1))) {
                t += ' ';
              }
              t += childTxt;
            }
          }
          if (blocks.includes(tag)) {
            t = t.trimEnd() + '\n\n';
          }
        }
        return t.replace(/([.!?])([A-Z])/g, '$1 $2');
      };

      const spineItems = Array.from(
        opf.querySelectorAll('spine itemref, *|spine *|itemref, itemref') ||
        (opf.getElementsByTagName ? opf.getElementsByTagName('itemref') : [])
      );

      for (const ir of spineItems) {
        const id = ir.getAttribute('idref');
        const mi = (id && manifestMap.get(id)) || (id ? (opf.querySelector(`manifest item[id="${CSS.escape ? CSS.escape(id) : id}"]`) || null) : null);
        const href = mi?.getAttribute('href');
        if (!href) continue;

        const hrefPath = href.split('#')[0];
        const cp = od + hrefPath;
        const properties = (mi.getAttribute('properties') || '').toLowerCase().split(/\s+/);
        if (properties.includes('nav') || cp === navH || cp === ncxH || /(?:^|\/)(?:nav|toc|table[-_ ]?of[-_ ]?contents)(?:[-_.]|\/|$)/i.test(hrefPath)) continue;

        const mt = (mi.getAttribute('media-type') || '').toLowerCase();
        if (!mt || mt.includes('html') || mt.includes('xml') || /\.(x?html?|xml)$/i.test(hrefPath)) {
          const file = findZipFile(cp) || findZipFile(hrefPath) || findZipFile(resolveZipPath(od, hrefPath));
          if (file) {
            try {
              const html = await file.async('text');
              const doc = new DOMParser().parseFromString(html, 'text/html');

              // Asynchronously extract and resolve all embedded illustrations at 100% full original resolution
              const chapterImages = [];
              const imgEls = Array.from(doc.querySelectorAll('img, image, svg image'));
              for (const imgEl of imgEls) {
                const rawSrc = imgEl.getAttribute('src') || imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href') || (imgEl.getAttributeNS && imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) || '';
                if (!rawSrc) continue;
                if (rawSrc.startsWith('data:')) {
                  chapterImages.push(rawSrc);
                  continue;
                }
                const resolvedImgPath = resolveZipPath(cp, rawSrc);
                let imgZip = findZipFile(resolvedImgPath) || (od && !resolvedImgPath.startsWith(od) ? findZipFile(od + resolvedImgPath) : null);
                if (!imgZip) {
                  const filename = rawSrc.split('/').pop().split(/[#?]/)[0];
                  imgZip = findZipFile(filename);
                }
                if (imgZip) {
                  try {
                    const b64 = await imgZip.async('base64');
                    const ext = (resolvedImgPath || rawSrc).split('.').pop().toLowerCase();
                    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                    const dataUri = `data:${mime};base64,${b64}`;
                    imgEl.setAttribute('src', dataUri);
                    imgEl.setAttribute('href', dataUri);
                    imgEl.setAttribute('xlink:href', dataUri);
                    if (imgEl.setAttributeNS) {
                      try { imgEl.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUri); } catch (_) {}
                    }
                    imgEl.setAttribute('data-embedded-uri', dataUri);
                    chapterImages.push(dataUri);
                  } catch (e) {
                    console.warn('[FileParserEngine] Failed to read image binary:', rawSrc, e);
                  }
                }
              }

              let txt = extractText(doc.body);
              // Ensure all extracted images are present in the chapter text markdown for the reader
              for (const uri of chapterImages) {
                if (!txt.includes(uri)) {
                  txt = txt ? `${txt}\n\n![Illustration](${uri})\n\n` : `![Illustration](${uri})\n\n`;
                }
              }
              let tocInfo = tocMap.get(hrefPath) || tocMap.get(href) || null;
              if (!tocInfo) {
                const bareHref = hrefPath.split('/').pop();
                for (const [k, v] of tocMap.entries()) {
                  if (k.endsWith('/' + bareHref) || k === bareHref) {
                    tocInfo = v;
                    break;
                  }
                }
              }
              let title = tocInfo?.title || titles.get(href.split('#')[0]) || titles.get(href) || '';
              let volume = tocInfo?.volume || '';
              let level = tocInfo?.level || 1;

              if (!title) {
                const headingEl = doc.querySelector('h1,h2,h3,h4, [class*="title"], [class*="heading"], [id*="title"], [class*="chap"]');
                if (headingEl && headingEl.textContent.trim()) {
                  title = headingEl.textContent.trim();
                }
              }
              if (!title) {
                const firstLine = (txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || '';
                if (firstLine && (/^(?:第[0-9零一二三四五六七八九十百千万]+[章节回节卷集部]|Chapter\s+\d+|Section\s+\d+|Volume\s+\d+|[【\[(]?(?:作品相关|内容简介|版权信息|制作信息|引言|序章|前言|楔子)[\]】)]?)/i.test(firstLine) || firstLine.length <= 40)) {
                  title = firstLine;
                }
              }
              if (!title) title = `Chapter ${chapters.length + 1}`;

              // AO3 / EPUB Summary & Foreword Disambiguation
              const isSummaryBlock = doc.querySelector('.meta, .tags, [class*="summary"], [class*="preface"], dl.tags') ||
                /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|Author'?s?\s*Note|内容简介|简介|前言|文案)[:：\s]/i.test(txt || '');
              if (isSummaryBlock && (title.toLowerCase() === bookTitle.toLowerCase() || !title || /^chapter\s+\d+$/i.test(title))) {
                title = 'Summary';
              }

              // Auto-derive volume from title if not established in TOC
              if (!volume) {
                const volMatch = title.match(/^(?:第[0-9零一二三四五六七八九十百千万]+卷|Volume\s*\d+|Vol\.?\s*\d+|Book\s*\d+|Arc\s*\d+)/i);
                if (volMatch) {
                  volume = volMatch[0].trim();
                }
              }

              if (!txt || !txt.trim()) {
                if (chapterImages.length > 0) {
                  txt = chapterImages.map(uri => `![Illustration](${uri})`).join('\n\n');
                } else {
                  const hasImg = doc.querySelector('img, image, svg');
                  if (hasImg) {
                    txt = '[Illustration]';
                  } else {
                    txt = doc.body?.textContent?.trim() || '[Chapter Content]';
                  }
                }
              }
              chapters.push({
                title,
                text: txt,
                content: txt,
                volume: volume || '',
                arc: volume || '',
                level: level || 1,
                images: chapterImages,
                doc,
                zipPath: cp
              });
            } catch (e) {}
          }
        }
      }

      // 3. Resilient Fallback: If spine items yielded 0 chapters, scan the archive directly for HTML/XHTML content
      if (chapters.length === 0) {
        console.warn('[FileParserEngine] Spine produced 0 chapters, scanning zip files for HTML / XHTML content...');
        const candidateFiles = Object.keys(zip.files).filter(k => {
          if (k.endsWith('/')) return false;
          const kLower = k.toLowerCase();
          if (!/\.(x?html?|xml)$/i.test(kLower)) return false;
          if (/(?:^|\/)(?:nav|toc|table[-_ ]?of[-_ ]?contents|cover|meta-inf)(?:[-_.]|\/|$)/i.test(kLower)) return false;
          if (kLower.endsWith('.opf') || kLower.endsWith('.ncx') || kLower.endsWith('container.xml')) return false;
          return true;
        });

        // Natural sort candidate files so chapters appear in numerical sequence
        candidateFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        for (const filePath of candidateFiles) {
          const file = zip.file(filePath);
          if (!file) continue;
          try {
            const html = await file.async('text');
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const chapterImages = [];
            const imgEls = Array.from(doc.querySelectorAll('img, image, svg image'));
            for (const imgEl of imgEls) {
              const rawSrc = imgEl.getAttribute('src') || imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href') || '';
              if (!rawSrc) continue;
              if (rawSrc.startsWith('data:')) {
                chapterImages.push(rawSrc);
                continue;
              }
              const resolvedImgPath = resolveZipPath(filePath, rawSrc);
              const imgZip = findZipFile(resolvedImgPath) || findZipFile(rawSrc.split('/').pop().split(/[#?]/)[0]);
              if (imgZip) {
                try {
                  const b64 = await imgZip.async('base64');
                  const ext = resolvedImgPath.split('.').pop().toLowerCase();
                  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                  const dataUri = `data:${mime};base64,${b64}`;
                  imgEl.setAttribute('src', dataUri);
                  imgEl.setAttribute('data-embedded-uri', dataUri);
                  chapterImages.push(dataUri);
                } catch (_) {}
              }
            }

            let txt = extractText(doc.body);
            for (const uri of chapterImages) {
              if (!txt.includes(uri)) {
                txt = txt ? `${txt}\n\n![Illustration](${uri})\n\n` : `![Illustration](${uri})\n\n`;
              }
            }

            let title = '';
            const headingEl = doc.querySelector('h1,h2,h3,h4, [class*="title"], [class*="heading"], [id*="title"], [class*="chap"]');
            if (headingEl && headingEl.textContent.trim()) {
              title = headingEl.textContent.trim();
            }
            if (!title) {
              const firstLine = (txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || '';
              if (firstLine && (/^(?:第[0-9零一二三四五六七八九十百千万]+[章节回节卷集部]|Chapter\s+\d+|Section\s+\d+|Volume\s+\d+|[【\[(]?(?:作品相关|内容简介|版权信息|制作信息|引言|序章|前言|楔子)[\]】)]?)/i.test(firstLine) || firstLine.length <= 40)) {
                title = firstLine;
              }
            }
            if (!title) {
              const baseName = filePath.split('/').pop().replace(/\.[^.]+$/, '');
              title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            if (!txt || !txt.trim()) {
              if (chapterImages.length > 0) {
                txt = chapterImages.map(uri => `![Illustration](${uri})`).join('\n\n');
              } else {
                txt = doc.body?.textContent?.trim() || '[Chapter Content]';
              }
            }

            chapters.push({
              title,
              text: txt,
              content: txt,
              volume: '',
              arc: '',
              level: 1,
              images: chapterImages,
              doc,
              zipPath: filePath
            });
          } catch (e) {
            console.warn('[FileParserEngine] Failed to parse fallback chapter:', filePath, e);
          }
        }
      }

      // Deduplicate adjacent identical chapter titles
      for (let idx = 0; idx < chapters.length - 1; idx++) {
        const cur = chapters[idx];
        const next = chapters[idx + 1];
        if (cur.title.trim().toLowerCase() === next.title.trim().toLowerCase()) {
          const curIsSummary = /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|简介|内容简介|前言)[:：\s]/i.test(cur.text || '');
          if (curIsSummary) {
            cur.title = 'Summary';
          }
        }
      }
      // Apply embedded TOC hierarchy if preserved from prior export
      if (Array.isArray(embeddedTocHierarchy) && embeddedTocHierarchy.length > 0) {
        embeddedTocHierarchy.forEach((volGroup, vIdx) => {
          const volName = volGroup.volume || `Volume ${vIdx + 1}`;
          (volGroup.chapters || []).forEach(chTitle => {
            const cleanTarget = String(chTitle || '').trim().toLowerCase();
            const matchedCh = chapters.find(c =>
              String(c.title || '').trim().toLowerCase() === cleanTarget
            );
            if (matchedCh) {
              matchedCh.volume = volName;
              matchedCh.arc = volName;
              matchedCh.level = 2;
            }
          });
        });
      }

      // Propagate forward volumes across sequential chapters
      let activeVol = '';
      chapters.forEach(c => {
        if (c.volume) {
          activeVol = c.volume;
        } else if (activeVol) {
          c.volume = activeVol;
          c.arc = activeVol;
        }
      });

      if (!chapters.length) throw new Error('No readable text found in EPUB.');

      // Extract Cover Art
      let extractedCover = '';
      try {
        let coverHref = '';
        let coverMediaType = '';

        // 1. EPUB 3 manifest item with properties="cover-image"
        const coverItem = Array.from(opf.querySelectorAll('manifest item')).find(i => {
          const props = (i.getAttribute('properties') || '').split(/\s+/);
          return props.includes('cover-image');
        });
        if (coverItem) {
          coverHref = coverItem.getAttribute('href');
          coverMediaType = coverItem.getAttribute('media-type');
        }

        // 2. EPUB 2 <meta name="cover" content="cover_item_id"/>
        if (!coverHref) {
          const metaCover = opf.querySelector('metadata meta[name="cover"]');
          if (metaCover) {
            const coverId = metaCover.getAttribute('content');
            if (coverId) {
              const item = opf.querySelector(`manifest item[id="${coverId}"]`);
              if (item) {
                coverHref = item.getAttribute('href');
                coverMediaType = item.getAttribute('media-type');
              }
            }
          }
        }

        // 3. EPUB 2/3 <guide><reference type="cover" href="..."/></guide>
        if (!coverHref) {
          const guideCover = opf.querySelector('guide reference[type="cover"]');
          if (guideCover) {
            const href = guideCover.getAttribute('href');
            if (href) {
              if (/\.(jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(href)) {
                coverHref = href;
              } else {
                const coverHtmlFile = zip.file(od + href.split('#')[0]);
                if (coverHtmlFile) {
                  const html = await coverHtmlFile.async('text');
                  const imgDoc = new DOMParser().parseFromString(html, 'text/html');
                  const imgEl = imgDoc.querySelector('image[*|href], img[src]');
                  const foundSrc = imgEl ? (imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href') || imgEl.getAttribute('src')) : '';
                  if (foundSrc) {
                    const pageDir = (od + href.split('#')[0]).substring(0, (od + href.split('#')[0]).lastIndexOf('/') + 1);
                    const resolvedCoverPath = (pageDir + foundSrc).replace(/\/\.\//g, '/').replace(/[^/]+\/\.\.\//g, '');
                    const resolvedFile = zip.file(resolvedCoverPath);
                    if (resolvedFile) {
                      const b64 = await resolvedFile.async('base64');
                      const ext = resolvedCoverPath.split('.').pop().toLowerCase();
                      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                      extractedCover = `data:${mime};base64,${b64}`;
                    }
                  }
                }
              }
            }
          }
        }

        // 4. Heuristic manifest search for cover image
        if (!extractedCover && !coverHref) {
          const heuristicItem = Array.from(opf.querySelectorAll('manifest item')).find(i => {
            const id = (i.getAttribute('id') || '').toLowerCase();
            const href = (i.getAttribute('href') || '').toLowerCase();
            const mt = (i.getAttribute('media-type') || '').toLowerCase();
            return mt.startsWith('image/') && (id.includes('cover') || href.includes('cover'));
          });
          if (heuristicItem) {
            coverHref = heuristicItem.getAttribute('href');
            coverMediaType = heuristicItem.getAttribute('media-type');
          }
        }

        if (!extractedCover && coverHref) {
          const cleanHref = coverHref.split('#')[0];
          const fullCoverPath = od + cleanHref;
          const coverZipFile = findZipFile(fullCoverPath) || findZipFile(cleanHref);
          if (coverZipFile) {
            const b64 = await coverZipFile.async('base64');
            const ext = fullCoverPath.split('.').pop().toLowerCase();
            const mime = coverMediaType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
            extractedCover = `data:${mime};base64,${b64}`;
          }
        }

        // 5. Ultimate fallback: look for any image in the archive with 'cover' in its filename
        if (!extractedCover) {
          const coverImgKey = Object.keys(zip.files).find(k => {
            if (k.endsWith('/')) return false;
            const kLower = k.toLowerCase();
            return /\.(jpe?g|png|webp|gif|svg)$/i.test(kLower) && kLower.includes('cover');
          });
          if (coverImgKey) {
            const zf = zip.file(coverImgKey);
            if (zf) {
              const b64 = await zf.async('base64');
              const ext = coverImgKey.split('.').pop().toLowerCase();
              const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
              extractedCover = `data:${mime};base64,${b64}`;
            }
          }
        }
      } catch (coverErr) {
        console.warn('Cover extraction warning:', coverErr);
      }

      window.telemetryLog?.('EPUB_PARSE', `Extracted ${chapters.length} chapters from EPUB: "${bookTitle || f.name}"`, {
        title: bookTitle || f.name,
        chapterCount: chapters.length,
        hasCover: Boolean(extractedCover),
        sizeBytes: f.size
      });

      // Compute total detected volumes
      const uniqueVolumes = new Set();
      chapters.forEach(c => {
        if (c.volume) uniqueVolumes.add(c.volume.trim().toLowerCase());
      });

      return {
        chapters,
        isEpub: true,
        originalZip: zip,
        cover: extractedCover,
        title: bookTitle,
        author: bookAuthor,
        uuid: bookIdentifier || savedNovelId,
        novelId: savedNovelId || bookIdentifier,
        sourceUrl: bookSource,
        sources: sources,
        volumeCount: uniqueVolumes.size,
        tocHierarchy: embeddedTocHierarchy
      };
    },

    /**
     * Unified document ingestor: reads any supported format into standardized chapter models
     */
    async parseFile(f, options = {}) {
      if (!f) throw new Error('No file provided.');
      const fname = (f.name || '').toLowerCase();

      // 1. JSON Backup
      if (fname.endsWith('.json') || f.type === 'application/json') {
        return { isBackupJson: true, file: f };
      }

      // 2. Word .docx
      if (fname.endsWith('.docx') || fname.endsWith('.doc')) {
        if (fname.endsWith('.doc') && !fname.endsWith('.docx')) {
          throw new Error('Legacy binary .doc files are not supported. Please save as modern .docx or .txt before importing.');
        }
        const docxText = await this.readDocx(f);
        const fallbackTitle = f.name.replace(/\.docx$/i, '');
        const parseAssembledFn = options?.parseAssembledTextToChapters || (typeof window !== 'undefined' ? window.parseAssembledTextToChapters : null);
        const parsedChs = typeof parseAssembledFn === 'function' ? parseAssembledFn(docxText, fallbackTitle) : [];
        const chs = (parsedChs.length > 0)
          ? parsedChs.map(c => ({ title: c.title, text: c.content || c.text || '', content: c.content || c.text || '' }))
          : [{ title: fallbackTitle, text: docxText, content: docxText }];
        return { chapters: chs, title: fallbackTitle, rawText: docxText, isEpub: false };
      }

      // 3. Plain Text .txt
      if (f.type === 'text/plain' || fname.endsWith('.txt')) {
        const rawText = await this.readFileAsText(f);
        const fallbackTitle = f.name.replace(/\.txt$/i, '');
        return {
          chapters: [{ title: fallbackTitle, text: rawText, content: rawText }],
          title: fallbackTitle,
          rawText,
          isEpub: false
        };
      }

      // 4. PDF .pdf
      if (f.type === 'application/pdf' || fname.endsWith('.pdf')) {
        const pdfText = await this.readPdf(f);
        const fallbackTitle = f.name.replace(/\.pdf$/i, '');
        return {
          chapters: [{ title: fallbackTitle, text: pdfText, content: pdfText }],
          title: fallbackTitle,
          rawText: pdfText,
          isEpub: false
        };
      }

      // 5. EPUB / ZIP
      if (f.type === 'application/epub+zip' || fname.endsWith('.epub') || fname.endsWith('.zip')) {
        return await this.readEpub(f);
      }

      // 6. Generic Text Fallback
      try {
        const rawText = await this.readFileAsText(f);
        if (rawText && rawText.trim()) {
          const fallbackTitle = f.name || 'Imported Document';
          return {
            chapters: [{ title: fallbackTitle, text: rawText, content: rawText }],
            title: fallbackTitle,
            rawText,
            isEpub: false
          };
        }
      } catch (_) {}

      throw new Error('Unsupported file type. Please use .txt, .pdf, .epub, .docx, or .json backup.');
    },

    /**
     * Cleans whitespace and newlines from raw plain text
     */
    cleanText(t) {
      if (!t || typeof t !== 'string') return '';
      let c = t.replace(/\r\n|\r/g, '\n');
      c = c.replace(/[ \t]{2,}/g, ' ');
      c = c.replace(/(\n\s*){2,}/g, '\n\n');
      return c.trim();
    },

    /**
     * Computes a deterministic job hash ID for document identification and session recovery
     */
    generateJobId(text, isFile = false) {
      if (!text) return 'job_0';
      let hash = 0;
      const s = isFile ? String(text) : String(text).substring(0, 1000);
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return `job_${Math.abs(hash)}`;
    },

    /**
     * Coordinates reading, decoding, resume detection, and ingestion of an uploaded file
     */
    async processInputFile(file, options = {}, callbacks = {}) {
      if (!file) return;

      const cbs = callbacks || {};
      const setUploadingFile = cbs.setUploadingFile || (() => {});
      const setError = cbs.setError || (() => {});
      const toast = cbs.toast || ((msg, type) => (type === 'error' ? console.error(msg) : console.log(msg)));
      const onResetState = cbs.onResetState || (() => {});
      const onBackupJson = cbs.onBackupJson || (() => {});
      const onFileHash = cbs.onFileHash || cbs.setCurrentFileHash || (() => {});
      const onResumeSession = cbs.onResumeSession || null;
      const onLoaded = cbs.onLoaded || (() => {});
      const onError = cbs.onError || (() => {});
      const onFinally = cbs.onFinally || (() => {});

      setUploadingFile(true);
      setError('');
      if (typeof onResetState === 'function') onResetState();

      const hasher = options.generateJobId || this.generateJobId.bind(this);
      const hashId = hasher(file.name + file.size, true);
      onFileHash(hashId);

      try {
        const fname = (file.name || '').toLowerCase();
        if (fname.endsWith('.json') || file.type === 'application/json') {
          setUploadingFile(false);
          if (typeof onBackupJson === 'function') {
            return onBackupJson(file);
          }
          return;
        }

        const data = await this.parseFile(file, {
          parseAssembledTextToChapters: options.parseAssembledTextToChapters || (typeof window !== 'undefined' ? window.parseAssembledTextToChapters : null)
        });

        const isEpub = Boolean(data.isEpub);
        const originalZip = data.originalZip || null;
        const extractedCover = data.cover || '';
        const docTitle = data.title || file.name.replace(/\.[^.]+$/, '');
        const cleaner = options.cleanText || this.cleanText.bind(this);

        const cleanedChapters = (data.chapters || []).map(c => ({
          ...c,
          text: isEpub ? (c.text || c.content || '') : cleaner(c.text || c.content || ''),
          content: isEpub ? (c.content || c.text || '') : cleaner(c.content || c.text || '')
        }));

        if (typeof window !== 'undefined') {
          if (originalZip) window.currentTranslatedZip = originalZip;
          window.telemetryLog?.('FILE_IMPORT', `Ingested file "${file.name}" (${(file.size / 1024).toFixed(1)} KB, isEpub=${isEpub}) -> ${cleanedChapters.length} chapters loaded.`, {
            fileName: file.name,
            fileSize: file.size,
            chapterCount: cleanedChapters.length,
            isEpub
          });
        }

        const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(hashId) : null;
        if (saved && typeof onResumeSession === 'function') {
          const willResume = (typeof confirm === 'function')
            ? confirm(`Found an incomplete translation for "${file.name}". Do you want to resume? (Cancel to start fresh)`)
            : false;
          if (willResume) {
            try {
              const parsedSession = JSON.parse(saved);
              toast(`Resuming translation for ${file.name}...`, 'info');
              await onResumeSession({
                savedSession: parsedSession,
                cleanedChapters,
                isEpub,
                originalZip,
                hashId
              });
              return;
            } catch (resumeErr) {
              console.warn('Failed to parse saved session resume:', resumeErr);
            }
          } else {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(hashId);
          }
        }

        const loadedPayload = {
          file,
          hashId,
          rawText: data.rawText || '',
          isEpub,
          originalZip,
          cover: extractedCover,
          fileName: file.name,
          docTitle,
          chapters: cleanedChapters
        };

        if (cbs.setInputText && data.rawText && !isEpub) cbs.setInputText(data.rawText);
        if (cbs.setCurrentIsEpub) cbs.setCurrentIsEpub(isEpub);
        if (cbs.setCurrentOriginalZip) cbs.setCurrentOriginalZip(originalZip);
        if (cbs.setCurrentDocCover) cbs.setCurrentDocCover(extractedCover || '');
        if (cbs.setFileName) cbs.setFileName(file.name);
        if (cbs.setCurrentDocTitle) cbs.setCurrentDocTitle(docTitle);
        if (cbs.setChapters) cbs.setChapters(cleanedChapters);

        if (typeof onLoaded === 'function') {
          onLoaded(loadedPayload);
        }

        toast(`Loaded "${file.name}" (${cleanedChapters.length} chapters)! Review settings and tap "Translate".`, 'success');
        return loadedPayload;
      } catch (e) {
        setError(e.message);
        toast(e.message, 'error');
        if (typeof onError === 'function') onError(e);
      } finally {
        setUploadingFile(false);
        if (typeof onFinally === 'function') onFinally();
      }
    },

    /**
     * Reads plain text from system clipboard and invokes callbacks
     */
    async pasteFromClipboard(callbacks = {}) {
      const cbs = callbacks || {};
      const onPasted = cbs.onPasted || (() => {});
      const onError = cbs.onError || (() => {});
      const toast = cbs.toast || ((msg, type) => (type === 'error' ? console.error(msg) : console.log(msg)));

      try {
        if (!navigator.clipboard?.readText) {
          throw new Error('Clipboard access denied or not supported by browser.');
        }
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onPasted(text);
          toast('Pasted from clipboard.');
          return text;
        } else {
          toast('Clipboard is empty.', 'info');
          return '';
        }
      } catch (e) {
        toast('Clipboard access denied by browser.', 'error');
        onError(e);
        return null;
      }
    },

    /**
     * Splits raw text into chapter segments using standard novel heading patterns
     */
    autoDetectChapterSplit(text, callbacks = {}) {
      const cbs = callbacks || {};
      const onSplit = cbs.onSplit || (() => {});
      const toast = cbs.toast || ((msg, type) => (type === 'error' ? console.error(msg) : console.log(msg)));

      const raw = (text || '').trim();
      if (!raw) {
        toast('Please enter or paste text with chapter headings first.', 'warning');
        return [];
      }

      const lines = raw.split(/\r?\n/);
      const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc)\b|CHAPTER\s*\d+)/i;
      const parts = [];
      let cur = null;
      for (const line of lines) {
        const trimmed = line.trim();
        if (heading.test(trimmed)) {
          if (cur) parts.push(cur);
          cur = { title: trimmed, content: '' };
        } else if (cur) {
          cur.content += line + '\n';
        } else {
          cur = { title: 'Chapter 1', content: line + '\n' };
        }
      }
      if (cur) parts.push(cur);

      let resultChapters;
      if (parts.length > 1) {
        resultChapters = parts.map(p => ({
          title: p.title,
          content: p.content.trim(),
          text: p.content.trim()
        }));
        toast(`Split into ${resultChapters.length} chapters.`, 'success');
      } else {
        toast('No chapter headings detected — using whole text as one chapter.', 'info');
        resultChapters = [{ title: 'Chapter 1', content: raw, text: raw }];
      }

      onSplit(resultChapters);
      return resultChapters;
    },

    /**
     * Swaps source and target languages unless source is Auto-detect
     */
    swapLanguages(srcLang, tgtLang, callbacks = {}) {
      const cbs = callbacks || {};
      const onSwapped = cbs.onSwapped || (() => {});
      const toast = cbs.toast || ((msg, type) => (type === 'error' ? console.error(msg) : console.log(msg)));

      if (srcLang === 'Auto-detect') {
        toast('Auto-detect cannot be swapped — pick a source language first.', 'info');
        return false;
      }
      const newSrc = tgtLang;
      const newTgt = srcLang;
      onSwapped(newSrc, newTgt);
      return { srcLang: newSrc, tgtLang: newTgt };
    },

    /**
     * Attempts to partition assembled raw text by identifying base chapter titles
     */
    partitionTextByChapters(fullText, baseChapters) {
      if (!fullText || !baseChapters || baseChapters.length <= 1) return null;
      const positions = [];
      for (let i = 0; i < baseChapters.length; i++) {
        const ch = baseChapters[i];
        const t = (ch.title || ch.originalTitle || '').trim();
        if (!t) return null;
        const regex = new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?:\\*\\*)?\\s*(?:\\n|$)`, 'i');
        const match = fullText.match(regex);
        if (!match || typeof match.index !== 'number') {
          const idx = fullText.indexOf(t);
          if (idx === -1) return null;
          positions.push({ idx, title: t, origCh: ch });
        } else {
          positions.push({ idx: match.index, title: t, origCh: ch });
        }
      }
      for (let i = 0; i < positions.length - 1; i++) {
        if (positions[i].idx >= positions[i + 1].idx) return null;
      }
      const result = [];
      for (let i = 0; i < positions.length; i++) {
        const start = positions[i].idx;
        const end = (i + 1 < positions.length) ? positions[i + 1].idx : fullText.length;
        let chText = fullText.substring(start, end).trim();
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
        const cleanContent = (typeof stripFn === 'function') ? stripFn(chText, positions[i].title, positions[i].origCh?.originalTitle) : chText;
        result.push({
          ...positions[i].origCh,
          title: positions[i].title,
          content: cleanContent,
          text: cleanContent
        });
      }
      return result;
    },

    /**
     * Parses assembled full text into structured chapters by detecting markdown headings, bold titles, and standard CJK/Western chapter markers
     */
    parseAssembledTextToChapters(text, fallbackTitle = 'Chapter 1', knownTitles = []) {
      if (!text || !text.trim()) return [];
      const lines = text.split(/\r?\n/);
      const cleanKnown = (knownTitles || []).map(t => String(t || '').replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim().toLowerCase()).filter(Boolean);
      const knownSet = new Set(cleanKnown);

      // Matches markdown headings (# Title), bold headings (**Chapter 1**), standard chapter patterns (Chapter 1, Ch. 2, Volume 1, Prologue, etc.), CJK patterns (第1章, 第一回), and numbered patterns (1. Title, 1 - Title, 1: Title)
      const headingRegex = /^(?:#{1,6}\s+(.+)$|\*\*(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc|第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]).+\*\*|(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc)\b\s*[\dIVXLCDM\s:.-].*|第[0-9零一二三四五六七八九十百千万]+[章回卷节篇].*|^(?:Chapter\s*)?\d+[\s:.-]+[A-Za-z\u4e00-\u9fa5].*)/i;
      const parts = [];
      let cur = null;
      for (const line of lines) {
        const trimmed = line.trim();
        const titleCandidate = trimmed.replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
        const isKnown = titleCandidate && knownSet.has(titleCandidate.toLowerCase());
        const match = trimmed.match(headingRegex);
        if ((match || isKnown) && trimmed.length <= 150) {
          if (cur) parts.push({ title: cur.title, content: cur.content.trim() });
          const titleClean = titleCandidate || (match && match[1]) || trimmed;
          cur = { title: titleClean || fallbackTitle, content: '' };
        } else if (cur) {
          cur.content += line + '\n';
        } else {
          cur = { title: fallbackTitle, content: line + '\n' };
        }
      }
      if (cur) parts.push({ title: cur.title, content: cur.content.trim() });
      return parts;
    },

    /**
     * Synchronizes live edits in the assembled studio text editor back into structured translatedChapters
     */
    syncAssembledTextToChapters({ newText, translatedChapters = [], setAssembledText, setTranslatedChapters, defaultTitle } = {}) {
      if (typeof setAssembledText === 'function') {
        setAssembledText(newText);
      }
      const knownTitles = (translatedChapters || []).map(c => c?.title || c?.originalTitle).filter(Boolean);
      if (!translatedChapters || translatedChapters.length <= 1) {
        const fallback = (translatedChapters && translatedChapters[0]?.title) || defaultTitle || 'Chapter 1';
        const parsed = this.parseAssembledTextToChapters(newText, fallback, knownTitles);
        if (typeof setTranslatedChapters === 'function') {
          if (parsed.length > 0) {
            setTranslatedChapters(parsed);
          } else {
            setTranslatedChapters([{ title: fallback, content: newText }]);
          }
        }
      } else {
        const parsed = this.parseAssembledTextToChapters(newText, translatedChapters[0]?.title || 'Chapter 1', knownTitles);
        if (typeof setTranslatedChapters === 'function') {
          if (parsed.length === translatedChapters.length) {
            // Keep original chapter metadata (index, stats, raw) but update titles and content with user's edits
            setTranslatedChapters(prev => (prev || []).map((ch, i) => ({
              ...ch,
              title: parsed[i].title || ch.title,
              content: parsed[i].content || parsed[i].text || '',
              text: parsed[i].content || parsed[i].text || ''
            })));
          } else if (parsed.length > 1) {
            setTranslatedChapters(parsed);
          } else if (parsed.length === 1 && translatedChapters.length > 1) {
            const partitioned = this.partitionTextByChapters(newText, translatedChapters);
            if (partitioned && partitioned.length === translatedChapters.length) {
              setTranslatedChapters(partitioned);
            }
          }
          // If parsed.length <= 1 and cannot partition, do NOT overwrite chapter 0 with all chapters; keep translatedChapters intact
        }
      }
    }
  };

  const Controller = {
    async handleFile(file, options = {}, callbacks = {}) {
      if (!file) return;
      return DocumentParser.processInputFile(file, options, callbacks);
    },

    async handlePaste(callbacks = {}) {
      return DocumentParser.pasteFromClipboard(callbacks);
    },

    handleAutoSplit(inputText, callbacks = {}) {
      return DocumentParser.autoDetectChapterSplit(inputText, callbacks);
    },

    handleSwap(srcLang, tgtLang, callbacks = {}) {
      return DocumentParser.swapLanguages(srcLang, tgtLang, callbacks);
    }
  };

  DocumentParser.Controller = Controller;
  if (typeof window !== 'undefined') {
    window.DocumentParser = DocumentParser;
    window.DocumentParser.Controller = Controller;
    window.partitionTextByChapters = DocumentParser.partitionTextByChapters.bind(DocumentParser);
    window.parseAssembledTextToChapters = DocumentParser.parseAssembledTextToChapters.bind(DocumentParser);
    window.syncAssembledTextToChapters = DocumentParser.syncAssembledTextToChapters.bind(DocumentParser);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentParser;
  }
})(typeof window !== 'undefined' ? window : this);
