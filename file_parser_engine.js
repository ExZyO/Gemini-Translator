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
      const zip = await window.JSZip.loadAsync(f);
      const chapters = [];
      const cf = zip.file('META-INF/container.xml');
      if (!cf) throw new Error('Invalid EPUB: META-INF/container.xml missing');
      
      const cc = await cf.async('text');
      const cd = new DOMParser().parseFromString(cc, 'text/xml');
      const rp = cd.querySelector('rootfile')?.getAttribute('full-path');
      if (!rp) throw new Error('Invalid EPUB: No rootfile declared in container.xml');
      
      const od = rp.substring(0, rp.lastIndexOf('/') + 1);
      const of2 = zip.file(rp);
      if (!of2) throw new Error('OPF package document not found: ' + rp);
      
      const oc = await of2.async('text');
      const opf = new DOMParser().parseFromString(oc, 'text/xml');
      const bookTitle = (opf.querySelector('title, dc\\:title')?.textContent || '').trim();
      const bookAuthor = (opf.querySelector('creator, dc\\:creator')?.textContent || '').trim();
      const bookIdentifier = (opf.querySelector('identifier, dc\\:identifier')?.textContent || '').trim();
      const bookSource = (opf.querySelector('source, dc\\:source')?.textContent || opf.querySelector('meta[name="source"]')?.getAttribute('content') || '').trim();
      
      const ncxI = opf.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');
      const ncxH = ncxI ? od + ncxI.getAttribute('href') : null;
      const navI = Array.from(opf.querySelectorAll('manifest item')).find(i => (i.getAttribute('properties') || '').split(/\s+/).includes('nav'));
      const navH = navI ? od + navI.getAttribute('href') : null;
      
      const titles = new Map();
      if (ncxH) {
        const nf = zip.file(ncxH);
        if (nf) {
          const nc = await nf.async('text');
          const nd = new DOMParser().parseFromString(nc, 'text/xml');
          nd.querySelectorAll('navPoint').forEach(np => {
            const l = np.querySelector('navLabel text')?.textContent;
            const s = np.querySelector('content')?.getAttribute('src');
            if (l && s) titles.set(s.split('#')[0], l.trim());
          });
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

      for (const ir of opf.querySelectorAll('spine itemref')) {
        const id = ir.getAttribute('idref');
        const mi = opf.querySelector(`manifest item[id="${id}"]`);
        const href = mi?.getAttribute('href');
        if (!href) continue;

        const hrefPath = href.split('#')[0];
        const cp = od + hrefPath;
        const properties = (mi.getAttribute('properties') || '').toLowerCase().split(/\s+/);
        if (properties.includes('nav') || cp === navH || cp === ncxH || /(?:^|\/)(?:nav|toc|table[-_ ]?of[-_ ]?contents)(?:[-_.]|\/|$)/i.test(hrefPath)) continue;

        const mt = (mi.getAttribute('media-type') || '').toLowerCase();
        if (mt && (mt === 'application/xhtml+xml' || mt === 'text/html')) {
          const file = zip.file(cp);
          if (file) {
            try {
              const html = await file.async('text');
              const doc = new DOMParser().parseFromString(html, 'text/html');
              let txt = extractText(doc.body);
              let title = titles.get(href.split('#')[0]) || titles.get(href) || '';
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

              if (!txt || !txt.trim()) {
                const hasImg = doc.querySelector('img, image, svg');
                if (hasImg) {
                  txt = '[Illustration]';
                } else {
                  txt = doc.body?.textContent?.trim() || '[Chapter Content]';
                }
              }
              chapters.push({ title, text: txt, doc, zipPath: cp });
            } catch (e) {}
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
          const coverZipFile = zip.file(fullCoverPath) || zip.file(cleanHref);
          if (coverZipFile) {
            const b64 = await coverZipFile.async('base64');
            const ext = fullCoverPath.split('.').pop().toLowerCase();
            const mime = coverMediaType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
            extractedCover = `data:${mime};base64,${b64}`;
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

      return {
        chapters,
        isEpub: true,
        originalZip: zip,
        cover: extractedCover,
        title: bookTitle,
        author: bookAuthor,
        uuid: bookIdentifier,
        sourceUrl: bookSource
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
    }
  };

  window.DocumentParser = DocumentParser;
})(typeof window !== 'undefined' ? window : this);
