/**
 * Gemini EPUB Translator - Document & Book Export Engine
 * Module: export_engine.js
 * 
 * Provides:
 * - High-fidelity PDF generation with typographic sanitization and scene-divider alignment
 * - Word (.docx) document compiler with standard chapter breaks and headings
 * - Dual-mode EPUB packaging (Original structure preservation or new clean Lnori/Standard EPUB)
 * - Translation History export (Structured JSON and plain text records)
 */

(function(window) {
  'use strict';

  const ExportEngine = {
    /**
     * Sanitizes complex Unicode and diacritics for core Helvetica/standard PDF engines
     */
    sanitizeTextForPdf(str) {
      if (!str) return '';
      let s = str
        .replace(/[ōŌ]/g, m => m === 'ō' ? 'o' : 'O')
        .replace(/[ūŪ]/g, m => m === 'ū' ? 'u' : 'U')
        .replace(/[āĀ]/g, m => m === 'ā' ? 'a' : 'A')
        .replace(/[īĪ]/g, m => m === 'ī' ? 'i' : 'I')
        .replace(/[ēĒ]/g, m => m === 'ē' ? 'e' : 'E')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      s = s
        .replace(/[\u3000\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, ' ')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2013\u2014\u2015\u2E3A\u2E3B]/g, ' - ')
        .replace(/\u2026/g, '...')
        .replace(/[«»「」『』]/g, '"')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
      return s;
    },

    /**
     * Identifies placeholder or generic novel titles
     */
    isGenericTitle(t) {
      return !t || t.trim() === '' || /^translated\s*(document|file)?$/i.test(t.trim());
    },

    /**
     * Saves a Blob to user downloads via saveUniversalBlob or browser fallback
     */
    async saveBlob(blob, filename, mimeType, options = {}) {
      if (typeof window.saveUniversalBlob === 'function') {
        return await window.saveUniversalBlob(blob, filename, mimeType, false, options);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { path: filename };
    },

    /**
     * Exports chapter list as a formatted, paginated PDF document
     */
    async exportPdf(chaptersToExport, options = {}) {
      if (!chaptersToExport || chaptersToExport.length === 0) {
        throw new Error('No translated content available to export as PDF.');
      }
      if (!window.jspdf?.jsPDF) {
        throw new Error('PDF generator library (jsPDF) is not loaded.');
      }

      const {
        title = '',
        tgtLang = 'English',
        fileName = ''
      } = options;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      doc.setFont('Helvetica', 'normal');
      const m = 18;
      const mw = doc.internal.pageSize.getWidth() - 2 * m;
      const pageHeight = doc.internal.pageSize.getHeight();
      const lh = 6.2;
      let y = m + 5;

      chaptersToExport.forEach((ch, i) => {
        if (i > 0) { doc.addPage(); y = m + 5; }
        const hasRealTitle = ch.title && ch.title.trim() && !this.isGenericTitle(ch.title);
        if (hasRealTitle) {
          const cleanTitle = this.sanitizeTextForPdf(ch.title);
          doc.setFontSize(16);
          doc.setFont('Helvetica', 'bold');
          doc.text(cleanTitle, m, y);
          y += lh * 2.2;
          doc.setFont('Helvetica', 'normal');
        }
        doc.setFontSize(10.5);
        const stripFn = window.stripLeadingTitleFromContent || null;
        const cleanContent = (typeof stripFn === 'function')
          ? stripFn(ch.content || '', ch.title, ch.originalTitle)
          : (ch.content || '');
        const rawLines = cleanContent.split(/\r?\n/);
        for (const rawLine of rawLines) {
          const p = this.sanitizeTextForPdf(rawLine);
          if (!p) continue;

          const isSceneDivider = /^(\*|\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(p);
          const splitLines = doc.splitTextToSize(p, mw);

          if (y + (splitLines.length * lh) > pageHeight - m) {
            doc.addPage();
            y = m + 5;
          }

          splitLines.forEach(l => {
            if (isSceneDivider) {
              doc.text(l, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
            } else {
              doc.text(l, m, y);
            }
            y += lh;
          });
          y += isSceneDivider ? lh * 0.8 : lh * 0.45;
        }
      });

      const pdfBlob = doc.output('blob');
      const docTitle = chaptersToExport.length === 1 && !this.isGenericTitle(chaptersToExport[0].title)
        ? chaptersToExport[0].title.trim()
        : (title && !this.isGenericTitle(title) ? title.trim() : `Translated Novel (${tgtLang})`);
      
      const sanitizeFn = window.sanitizeFilename || (s => s.replace(/[^a-zA-Z0-9_\-\s]/g, '_'));
      const cleanDocName = docTitle ? sanitizeFn(docTitle).replace(/\s+/g, ' ').trim() : `Translated Novel (${tgtLang})`;
      const pdfFileName = `${cleanDocName}.pdf`;

      await this.saveBlob(pdfBlob, pdfFileName, 'application/pdf');
      return { blob: pdfBlob, fileName: pdfFileName };
    },

    /**
     * Exports chapter list as a formatted Word (.docx) document
     */
    async exportDocx(chaptersToExport, options = {}) {
      if (!chaptersToExport || chaptersToExport.length === 0) {
        throw new Error('No content to download.');
      }
      if (!window.docx) {
        throw new Error('DOCX generator library is not loaded.');
      }

      const {
        title = '',
        tgtLang = 'English'
      } = options;

      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;
      const sections = chaptersToExport.map((ch, i) => {
        const hasRealTitle = ch.title && ch.title.trim() && !this.isGenericTitle(ch.title);
        const paragraphElements = [];

        if (hasRealTitle) {
          paragraphElements.push(new Paragraph({
            text: ch.title.trim(),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 280 }
          }));
        }

        const stripFn = window.stripLeadingTitleFromContent || null;
        const cleanContent = (typeof stripFn === 'function')
          ? stripFn(ch.content || '', ch.title, ch.originalTitle)
          : (ch.content || '');
        const lines = cleanContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Center divider markers (e.g. *, ***, ..., ---)
          const isSceneDivider = /^(\*|\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(trimmed);

          paragraphElements.push(new Paragraph({
            alignment: isSceneDivider ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: trimmed,
                font: 'Calibri',
                size: 24 // 12pt
              })
            ],
            spacing: {
              line: 360, // 1.5 line height
              after: isSceneDivider ? 240 : 180 // Webnovel spacing after sentence/dialogue
            }
          }));
        }

        return {
          properties: i > 0 ? { type: (window.docx?.SectionType?.NEXT_PAGE || 'nextPage'), page: { pageBreaks: { before: true } } } : {},
          children: paragraphElements
        };
      });

      const doc = new Document({
        sections,
        styles: {
          default: {
            document: {
              run: { font: 'Calibri', size: 24 }
            }
          }
        }
      });

      const blob = await Packer.toBlob(doc);
      const docTitle = chaptersToExport.length === 1 && !this.isGenericTitle(chaptersToExport[0].title)
        ? chaptersToExport[0].title.trim()
        : (title && !this.isGenericTitle(title) ? title.trim() : `Translated Novel (${tgtLang})`);
      
      const sanitizeFn = window.sanitizeFilename || (s => s.replace(/[^a-zA-Z0-9_\-\s]/g, '_'));
      const cleanDocName = docTitle ? sanitizeFn(docTitle).replace(/\s+/g, ' ').trim() : `Translated Novel (${tgtLang})`;
      const docxFileName = `${cleanDocName}.docx`;

      await this.saveBlob(blob, docxFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      return { blob, fileName: docxFileName };
    },

    /**
     * Exports chapter list as a standardized EPUB ebook
     */
    async exportEpub(chaptersToExport, options = {}) {
      if (!chaptersToExport || chaptersToExport.length === 0) {
        throw new Error('No translated content available yet to download.');
      }

      const {
        title = '',
        author = 'Gemini Translator',
        tgtLang = 'en',
        currentIsEpub = false,
        currentOriginalZip = null,
        coverUrl = '',
        onProgress = null
      } = options;

      const sanitizeFn = window.sanitizeFilename || (s => s.replace(/[^a-zA-Z0-9_\-\s]/g, '_'));
      const cleanBookTitleFn = window.cleanBookTitle || ((t) => t || 'Novel');
      const cleanBookAuthorFn = window.cleanBookAuthor || ((a) => a || 'Gemini Translator');

      const rawBaseTitle = title || (chaptersToExport.length === 1 && !this.isGenericTitle(chaptersToExport[0].title) ? chaptersToExport[0].title.trim() : null);
      const docTitle = rawBaseTitle
        ? (rawBaseTitle.includes('(Translated)') ? rawBaseTitle : `${rawBaseTitle} (Translated)`)
        : `Translated Novel (${tgtLang})`;
      
      const cleanDocTitle = cleanBookTitleFn(docTitle, chaptersToExport).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      const cleanAuthor = cleanBookAuthorFn(author).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      const lang = String(tgtLang || 'en').split(/[-_ ]/)[0].toLowerCase() || 'en';

      window.telemetryLog?.('FILE_EXPORT', `Starting EPUB export: "${cleanDocTitle}" (${chaptersToExport.length} chapters, preserveOriginal=${!!(currentIsEpub && currentOriginalZip)})`, {
        title: cleanDocTitle,
        author: cleanAuthor,
        chapters: chaptersToExport.length
      });

      // 1. Preserve ORIGINAL EPUB structure (OPF/TOC/images/CSS) if translating from an EPUB
      if (currentIsEpub && currentOriginalZip && typeof currentOriginalZip.generateAsync === 'function' && typeof window.updateOriginalEpubNavigation === 'function') {
        if (onProgress) onProgress('Packaging original EPUB structure…', 40);
        await window.updateOriginalEpubNavigation(currentOriginalZip, chaptersToExport);
        const zipBlob = await currentOriginalZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
        const cleanDocName = sanitizeFn(cleanDocTitle).replace(/\s+/g, ' ').trim();
        const outFileName = `${cleanDocName}.epub`;
        const res = await this.saveBlob(zipBlob, outFileName, 'application/epub+zip');
        window.telemetryLog?.('FILE_EXPORT', `EPUB exported (original structure): "${outFileName}" (${(zipBlob.size / 1024).toFixed(1)} KB)`);
        return { blob: zipBlob, fileName: outFileName, path: res?.path };
      }

      // 2. Standardized high-compatibility EPUB assembly via generateEpubFromChapters
      if (typeof window.generateEpubFromChapters !== 'function') {
        throw new Error('EPUB packaging engine (generateEpubFromChapters) is not loaded.');
      }

      if (onProgress) onProgress('Assembling translated EPUB archive…', 10);
      const getOptsFn = window.getEpubOptions;
      const epubOpts = typeof getOptsFn === 'function'
        ? getOptsFn({ title: cleanDocTitle, coverUrl })
        : { coverUrl };

      const blob = await window.generateEpubFromChapters(
        chaptersToExport,
        cleanDocTitle,
        cleanAuthor,
        lang,
        (status, pct, elapsed) => {
          if (onProgress) onProgress(status, pct, elapsed);
        },
        epubOpts
      );

      const cleanDocName = cleanDocTitle && !this.isGenericTitle(cleanDocTitle)
        ? sanitizeFn(cleanDocTitle).replace(/\s+/g, ' ').trim()
        : `Translated Novel (${tgtLang})`;
      const outFileName = `${cleanDocName}.epub`;
      const res = await this.saveBlob(blob, outFileName, 'application/epub+zip');
      window.telemetryLog?.('FILE_EXPORT', `EPUB exported: "${outFileName}" (${(blob.size / 1024).toFixed(1)} KB)`);
      return { blob, fileName: outFileName, path: res?.path };
    },

    /**
     * Exports full translation history as clean JSON backup
     */
    async exportHistoryJson(historyData, version = '8.17.67') {
      if (!historyData || historyData.length === 0) {
        throw new Error('No translation history to export.');
      }

      const sorted = [...historyData].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
      const exportObj = {
        app: 'Gemini EPUB Translator',
        type: 'history_export',
        storageEngine: 'IndexedDB',
        version: version || '8.17.67',
        exportedAt: new Date().toISOString(),
        totalEntries: sorted.length,
        history: sorted
      };

      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const d = new Date().toISOString().slice(0, 10);
      const outFileName = `gemini_translation_history_${d}.json`;

      await this.saveBlob(blob, outFileName, 'application/json');
      return { count: sorted.length, fileName: outFileName };
    },

    /**
     * Exports a single history entry as a readable text document
     */
    async exportHistoryItemTxt(entry) {
      if (!entry) throw new Error('No history entry provided.');
      const title = `${(entry.tgtLang ? `${entry.srcLang || 'Auto'} to ${entry.tgtLang}` : 'Translation')}_${new Date(entry.ts || Date.now()).toISOString().slice(0, 10)}`;
      const content = `====================================================\nGEMINI TRANSLATION HISTORY ENTRY\nProvider: ${entry.provider || 'AI'}\nLanguage: ${entry.srcLang || 'Auto'} -> ${entry.tgtLang || 'English'}\nDate: ${new Date(entry.ts || Date.now()).toLocaleString()}\nTokens: ${entry.stats?.totalTokens?.toLocaleString() || 'N/A'}\nCost: ${entry.stats?.cost || 'N/A'}\n====================================================\n\n[INPUT TEXT]:\n${entry.fullInput || entry.inputPreview || ''}\n\n====================================================\n[TRANSLATED OUTPUT]:\n${entry.fullOutput || entry.outputPreview || ''}\n`;
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const sanitizeFn = window.sanitizeFilename || (s => s.replace(/[^a-zA-Z0-9_\-\s]/g, '_'));
      const exportFileName = `${sanitizeFn(title).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.txt`;

      await this.saveBlob(blob, exportFileName, 'text/plain');
      return { fileName: exportFileName };
    }
  };

  window.ExportEngine = ExportEngine;
})(typeof window !== 'undefined' ? window : this);
