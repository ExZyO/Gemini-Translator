/**
 * Gemini Translator - Translation Chapter Runner
 * In-place single chapter translation & healing runner
 */
(function(root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) module.exports = exports;
  if (root) Object.assign(root, exports);
  if (typeof window !== 'undefined') {
    Object.assign(window, exports);
    window.TranslationChapterRunner = exports;
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  async function executeTranslateSingleChapter(params, engineContext = {}) {
    const Controller = engineContext.Controller || window.TranslationLoopEngine?.Controller || {};
    const safeTranslateWithRotation = engineContext.safeTranslateWithRotation || window.TranslationLoopEngine?.safeTranslateWithRotation;
    const translateSingleChapter = engineContext.translateSingleChapter || Controller.translateSingleChapter;
    const buildTranslationConfig = engineContext.buildTranslationConfig || Controller.buildTranslationConfig;
    const translateChapterTitle = engineContext.translateChapterTitle || Controller.translateChapterTitle;
    const batchParallel = engineContext.batchParallel || window.Utils?.batchParallel || window.batchParallel;
    const escapeXml = window.escapeXml || window.Utils?.escapeXml || ((s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    const isAiRefusal = window.isAiRefusal || window.Utils?.isAiRefusal || (() => false);

      const {
        targetChapterIdx,
        chapterData,
        onProgress,
        titleOnly = false,
        healOnly = false,
        activeNovelRecord,
        readerNovelId,
        readerNovelTitle,
        chapters,
        readerChapters,
        setReaderChapters,
        translationCtx,
        getTranslateOpts,
        setTranslatedChapters,
        setChapters,
        setActiveNovelRecord,
        saveNovelToHistory,
        setAssembledText,
        currentOriginalZip,
        currentIsEpub,
        toast
      } = params;

      let novelRec = activeNovelRecord;
      const currentNovelId = readerNovelId || (novelRec && novelRec.id);
      if (!novelRec && typeof window !== 'undefined' && window.GeminiNovelDB) {
        if (currentNovelId) {
          try { novelRec = await window.GeminiNovelDB.getNovel(currentNovelId); } catch (_) {}
        }
        if (!novelRec && readerNovelTitle) {
          try {
            const all = await window.GeminiNovelDB.getAllNovels();
            novelRec = (all || []).find(n => n && (n.title === readerNovelTitle || n.id === currentNovelId || String(n.id) === String(currentNovelId)));
          } catch (_) {}
        }
      }
      if (novelRec && typeof setActiveNovelRecord === 'function') {
        try { setActiveNovelRecord(novelRec); } catch (_) {}
      }

      const candidateBase = (Array.isArray(readerChapters) && readerChapters.length > 0)
        ? readerChapters
        : ((Array.isArray(chapters) && chapters.length > 0)
          ? chapters
          : ((Array.isArray(novelRec?.translatedChapters) && novelRec.translatedChapters.length > 0)
            ? novelRec.translatedChapters
            : ((Array.isArray(novelRec?.chapters) && novelRec.chapters.length > 0)
              ? novelRec.chapters
              : ((Array.isArray(novelRec?.rawChapters) && novelRec.rawChapters.length > 0)
                ? novelRec.rawChapters
                : []))));

      let rawChap = null;
      if (candidateBase && candidateBase[targetChapterIdx]) {
        rawChap = candidateBase[targetChapterIdx];
      } else if (novelRec) {
        if (novelRec.rawChapters && novelRec.rawChapters[targetChapterIdx]) {
          rawChap = novelRec.rawChapters[targetChapterIdx];
        } else if (novelRec.originalChapters && novelRec.originalChapters[targetChapterIdx]) {
          rawChap = novelRec.originalChapters[targetChapterIdx];
        } else if (novelRec.chapters && novelRec.chapters[targetChapterIdx]) {
          rawChap = novelRec.chapters[targetChapterIdx];
        }
      }
      if (!rawChap && chapters && chapters[targetChapterIdx]) {
        rawChap = chapters[targetChapterIdx];
      }

      const hasForeignChars = (s) => typeof s === 'string' && /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/.test(s);
      const isGenericEnglish = (s) => typeof s === 'string' && /^(?:chapter|ch|volume|vol|part|ep|episode)\.?\s*\d+$/i.test(s.trim());

      let candidateOriginalTitle = '';
      if (novelRec?.rawChapters && novelRec.rawChapters[targetChapterIdx]) {
        const rawT = novelRec.rawChapters[targetChapterIdx].title || novelRec.rawChapters[targetChapterIdx].originalTitle;
        if (rawT && hasForeignChars(rawT)) candidateOriginalTitle = rawT;
      } else if (novelRec?.originalChapters && novelRec.originalChapters[targetChapterIdx]) {
        const rawT = novelRec.originalChapters[targetChapterIdx].title || novelRec.originalChapters[targetChapterIdx].originalTitle;
        if (rawT && hasForeignChars(rawT)) candidateOriginalTitle = rawT;
      }

      let rawTitle = '';
      if (candidateOriginalTitle) {
        rawTitle = candidateOriginalTitle;
      } else if (rawChap?.originalTitle && (hasForeignChars(rawChap.originalTitle) || isGenericEnglish(rawChap.title))) {
        rawTitle = rawChap.originalTitle;
      } else if (chapterData?.originalTitle && (hasForeignChars(chapterData.originalTitle) || isGenericEnglish(chapterData.title))) {
        rawTitle = chapterData.originalTitle;
      } else if (rawChap?.title) {
        rawTitle = rawChap.title;
      } else if (rawChap?.originalTitle) {
        rawTitle = rawChap.originalTitle;
      } else if (chapterData?.title) {
        rawTitle = chapterData.title;
      } else if (chapterData?.originalTitle) {
        rawTitle = chapterData.originalTitle;
      } else {
        rawTitle = `Chapter ${targetChapterIdx + 1}`;
      }

      const rawText = (rawChap && (rawChap.content || rawChap.text)) || (chapterData && (chapterData.text || chapterData.content)) || '';

      const ctrl = params.abortController || new AbortController();
      const userOpts = params.optionsOverride || {};
      const baseOpts = typeof getTranslateOpts === 'function' ? getTranslateOpts(ctrl.signal) : {};
      const opts = { ...baseOpts, ...userOpts, signal: ctrl.signal };
      if (!opts.availableKeys || opts.availableKeys.length === 0) {
        const prov = opts.provider || 'gemini';
        const ctxKeys = translationCtx?.apiKeysByProvider?.[prov];
        if (Array.isArray(ctxKeys) && ctxKeys.length > 0) {
          opts.availableKeys = ctxKeys;
        } else if (typeof window !== 'undefined' && window.apiKeysByProvider?.[prov]) {
          opts.availableKeys = window.apiKeysByProvider[prov];
        } else if (typeof localStorage !== 'undefined') {
          try {
            const raw = localStorage.getItem('apiKeysByProvider');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && Array.isArray(parsed[prov])) opts.availableKeys = parsed[prov];
            }
          } catch (_) {}
        }
      }
      if (Array.isArray(opts.availableKeys)) {
        opts.availableKeys = opts.availableKeys.filter(k => k && (typeof k === 'string' ? k.trim() : (k.key && k.key.trim())));
      }
      const config = Controller.buildTranslationConfig({
        ...translationCtx,
        ...userOpts,
        bookTitle: readerNovelTitle || (novelRec && novelRec.title) || 'Translated Novel'
      });

      if (titleOnly) {
        const transTitle = await translateChapterTitle({
          rawTitle,
          opts,
          config,
          callbacks: { onProgress }
        });
        const finalTitle = transTitle || ((typeof window !== 'undefined' && window.cleanRawChapterTitle) ? window.cleanRawChapterTitle(rawTitle) : (rawTitle ? rawTitle.trim() : ''));

        // 1. Update React state: readerChapters (Dedicated Reader anchor)
        if (typeof setReaderChapters === 'function') {
          setReaderChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), title: finalTitle, isTranslated: true } : c));
          });
        }

        // 2. Update React state: translatedChapters
        if (typeof setTranslatedChapters === 'function') {
          setTranslatedChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), title: finalTitle, isTranslated: true } : c));
          });
        }

        // 3. Update React state: chapters
        if (typeof setChapters === 'function') {
          setChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), title: finalTitle, isTranslated: true } : c));
          });
        }

        // 4. Update React state: assembledText (preserving all chapters!)
        if (typeof setAssembledText === 'function') {
          setAssembledText(prevText => {
            const baseChs = (candidateBase && candidateBase.length > 0) ? candidateBase : (chapters || []);
            if (baseChs.length > 0) {
              return baseChs.map((c, i) => {
                const t = (i === targetChapterIdx) ? finalTitle : (c?.title || `Chapter ${i + 1}`);
                const body = c?.content || c?.text || '';
                return `# ${t}\n\n${body}`;
              }).join('\n\n\n');
            }
            return prevText ? prevText.replace(new RegExp(`^#\\s*${escapeXml(rawTitle)}`, 'm'), `# ${finalTitle}`) : `# ${finalTitle}\n\n${rawText}`;
          });
        }

        // 5. Update in-memory original EPUB zip if present
        const targetZipPath = (rawChap && rawChap.zipPath) || (chapterData && chapterData.zipPath);
        if (currentOriginalZip && targetZipPath) {
          try {
            const fileInZip = currentOriginalZip.file(targetZipPath);
            if (fileInZip) {
              const xhtml = await fileInZip.async('text');
              if (xhtml && typeof DOMParser !== 'undefined') {
                const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
                const tEl = doc.querySelector('title');
                if (tEl) tEl.textContent = finalTitle;
                const hEl = doc.querySelector('h1, h2, h3');
                if (hEl) hEl.textContent = finalTitle;
                currentOriginalZip.file(targetZipPath, new XMLSerializer().serializeToString(doc));
              }
            }
            if (typeof window !== 'undefined' && typeof window.updateOriginalEpubNavigation === 'function') {
              const chsForNav = (candidateBase && candidateBase.length > 0) ? [...candidateBase] : ((chapters && chapters.length > 0) ? [...chapters] : []);
              if (chsForNav[targetChapterIdx]) chsForNav[targetChapterIdx] = { ...chsForNav[targetChapterIdx], title: finalTitle, zipPath: targetZipPath };
              window.updateOriginalEpubNavigation(currentOriginalZip, chsForNav);
            }
          } catch (zipErr) {
            console.warn('[executeTranslateSingleChapter] Could not update title in originalZip:', zipErr);
          }
        }

        // 6. Update Database: GeminiNovelDB
        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          try {
            let full = null;
            if (currentNovelId) {
              full = await window.GeminiNovelDB.getNovel(currentNovelId);
            }
            if (!full && readerNovelTitle) {
              const all = await window.GeminiNovelDB.getAllNovels();
              full = (all || []).find(n => n && (n.title === readerNovelTitle || n.id === currentNovelId || String(n.id) === String(currentNovelId)));
            }
            if (!full) full = novelRec;
            if (full) {
              const baseList = (candidateBase && candidateBase.length > 0) ? candidateBase : (full.chapters || full.rawChapters || []);
              const updatedChs = (full.chapters && full.chapters.length > 0) ? [...full.chapters] : [...baseList];
              if (updatedChs[targetChapterIdx]) {
                updatedChs[targetChapterIdx] = { ...updatedChs[targetChapterIdx], title: finalTitle, isTranslated: true };
              } else if (baseList[targetChapterIdx]) {
                updatedChs[targetChapterIdx] = { ...baseList[targetChapterIdx], title: finalTitle, isTranslated: true };
              }
              const updatedTransChs = (full.translatedChapters && full.translatedChapters.length > 0) ? [...full.translatedChapters] : [...updatedChs];
              if (updatedTransChs[targetChapterIdx]) {
                updatedTransChs[targetChapterIdx] = { ...updatedTransChs[targetChapterIdx], title: finalTitle, isTranslated: true };
              } else if (baseList[targetChapterIdx]) {
                updatedTransChs[targetChapterIdx] = { ...baseList[targetChapterIdx], title: finalTitle, isTranslated: true };
              }
              const updatedRawChs = (full.rawChapters && full.rawChapters.length > 0) ? [...full.rawChapters] : [...updatedChs];
              if (updatedRawChs[targetChapterIdx]) {
                updatedRawChs[targetChapterIdx] = { ...updatedRawChs[targetChapterIdx], title: finalTitle };
              } else if (baseList[targetChapterIdx]) {
                updatedRawChs[targetChapterIdx] = { ...baseList[targetChapterIdx], title: finalTitle };
              }
              const updatedNovel = {
                ...full,
                chapters: updatedChs,
                translatedChapters: updatedTransChs,
                rawChapters: updatedRawChs,
                isEdited: true,
                isTranslated: true,
                epubBlob: undefined, // Invalidate stale cached pre-built blob so fresh EPUB exports use updated title!
                updatedAt: Date.now()
              };
              const saveId = full.id || currentNovelId;
              await window.GeminiNovelDB.updateNovel(saveId, updatedNovel);
              if (typeof saveNovelToHistory === 'function') {
                saveNovelToHistory(updatedNovel).catch(() => {});
              }
              if (typeof setActiveNovelRecord === 'function') setActiveNovelRecord(updatedNovel);
            }
          } catch (dbErr) {
            console.warn('[Reader] Failed to update novel title in database:', dbErr);
          }
        }
        if (typeof toast === 'function') {
          toast(`Chapter ${targetChapterIdx + 1} title translated: ${finalTitle}`, 'success');
        }
        return { title: finalTitle, isTranslated: true };
      }

      if (healOnly) {
        const curBody = (chapterData && (chapterData.content || chapterData.text)) ||
                        (candidateBase && candidateBase[targetChapterIdx] && (candidateBase[targetChapterIdx].content || candidateBase[targetChapterIdx].text)) ||
                        rawText || '';

        if (!curBody || !curBody.trim()) {
          if (typeof toast === 'function') toast('No text available to heal in this chapter.', 'warning');
          return null;
        }

        const targetLanguage = opts.tgtLang || config.tgtLang || 'English';
        const isDoubleBreak = /\r?\n\r?\n/.test(curBody);
        const sep = isDoubleBreak ? '\n\n' : '\n';
        const paragraphs = curBody.split(isDoubleBreak ? /\r?\n\r?\n/ : /\r?\n/);

        const rawParagraphs = (rawText && typeof rawText === 'string') ? rawText.split(isDoubleBreak ? /\r?\n\r?\n/ : /\r?\n/) : [];
        const detectUntranslated = (typeof window !== 'undefined' && window.hasUntranslatedOrError) ? window.hasUntranslatedOrError : null;
        const cleanProseFn = (typeof window !== 'undefined' && window.cleanHealedProse) ? window.cleanHealedProse : (s => (s || '').trim());

        const blocks = [];
        let curBlock = null;
        paragraphs.forEach((p, idx) => {
          const rawSrcP = rawParagraphs[idx] || null;
          const pIsRefusal = (typeof isAiRefusal === 'function' ? isAiRefusal(p) : false);
          const isProblem = pIsRefusal || (detectUntranslated ? detectUntranslated(p, rawSrcP, targetLanguage) : (/[\u3040-\u9fff\uac00-\ud7af]/.test(p) || /\[Error:.*?\]/i.test(p)));
          if (isProblem) {
            const hasRawSource = rawSrcP && typeof rawSrcP === 'string' && rawSrcP.trim().length > 0 && !isAiRefusal(rawSrcP);
            const textToUse = hasRawSource ? rawSrcP : p;
            const isPurge = pIsRefusal && !hasRawSource;
            if (!curBlock) {
              curBlock = { startIdx: idx, endIdx: idx, texts: [textToUse], isPurgeOnly: isPurge };
            } else {
              curBlock.endIdx = idx;
              curBlock.texts.push(textToUse);
              if (!isPurge) curBlock.isPurgeOnly = false;
            }
          } else {
            if (curBlock) {
              blocks.push(curBlock);
              curBlock = null;
            }
          }
        });
        if (curBlock) blocks.push(curBlock);

        if (blocks.length === 0) {
          if (typeof toast === 'function') toast(`Chapter ${targetChapterIdx + 1} has zero untranslated lines! Already clean.`, 'info');
          return { content: curBody, title: rawTitle, noop: true };
        }

        // Split oversized blocks into <= 10 paragraphs so AI never exceeds token limits or times out
        const safeBlocks = [];
        blocks.forEach(b => {
          if (b.texts.length <= 12) {
            safeBlocks.push(b);
          } else {
            for (let i = 0; i < b.texts.length; i += 10) {
              const slice = b.texts.slice(i, i + 10);
              safeBlocks.push({ startIdx: b.startIdx + i, endIdx: b.startIdx + i + slice.length - 1, texts: slice, isPurgeOnly: b.isPurgeOnly });
            }
          }
        });
        const activeBlocks = safeBlocks.length > 0 ? safeBlocks : blocks;

        const totalHealedSections = activeBlocks.reduce((acc, b) => acc + (b.endIdx - b.startIdx + 1), 0);
        if (typeof toast === 'function') {
          toast(`Healing ${totalHealedSections} untranslated section(s) in Ch. ${targetChapterIdx + 1}…`, 'info');
        }

        if (typeof params.onHealingScanned === 'function') {
          params.onHealingScanned(activeBlocks.map((b, i) => ({
            id: i,
            startIdx: b.startIdx,
            endIdx: b.endIdx,
            originalSnippet: b.texts.join(' ').slice(0, 150),
            status: 'pending'
          })));
        }

        const healingConcurrency = Math.max(1, Math.min(Number(config.concurrency || userOpts.concurrency || 3), (opts.availableKeys && opts.availableKeys.length) || 3));
        let completedHealingCount = 0;
        try {
          await batchParallel(activeBlocks, async (block, bIdx, workerId) => {
            if (ctrl.signal?.aborted) return;
            if (typeof params.onHealingBlockProgress === 'function') {
              params.onHealingBlockProgress({ blockIdx: bIdx, totalBlocks: activeBlocks.length, status: 'healing' });
            }
            const blockRawText = block.texts.join(sep);
            const healInstructions = opts.instructions || config.instructions ||
              `Translate accurately and fluently into ${targetLanguage}. Maintain formal novel prose style and preserve all quotes, indentation, and formatting. Output ONLY the translated prose, without commentary or markdown code fences.`;
            const workerKey = (opts.availableKeys && opts.availableKeys.length > 0)
              ? (typeof opts.availableKeys[workerId % opts.availableKeys.length] === 'string' ? opts.availableKeys[workerId % opts.availableKeys.length] : (opts.availableKeys[workerId % opts.availableKeys.length].key || opts.apiKey))
              : opts.apiKey;
            if (block.isPurgeOnly) {
              block.translatedText = '';
            } else {
              try {
                const transBlock = await safeTranslateWithRotation(blockRawText, {
                  ...opts,
                  apiKey: workerKey,
                  instructions: healInstructions
                });
                let translatedBlockText = (transBlock && typeof transBlock === 'object') ? (transBlock.text || '') : (typeof transBlock === 'string' ? transBlock : '');
                translatedBlockText = cleanProseFn(translatedBlockText);
                block.translatedText = translatedBlockText;
              } catch (healErr) {
                console.warn(`[Healing] Block ${bIdx + 1} error:`, healErr.message);
              }
            }
            completedHealingCount++;
            if (typeof onProgress === 'function') {
              onProgress(Math.floor((completedHealingCount / activeBlocks.length) * 80) + 15, `Healing section ${completedHealingCount}/${activeBlocks.length}…`);
            }
            if (typeof params.onHealingBlockProgress === 'function') {
              params.onHealingBlockProgress({
                blockIdx: bIdx,
                totalBlocks: activeBlocks.length,
                healedSnippet: (block.translatedText || '').slice(0, 150),
                status: (block.isPurgeOnly || block.translatedText) ? 'healed' : 'failed'
              });
            }
          }, healingConcurrency, ctrl.signal);
        } catch (parallelErr) {
          if (parallelErr.name !== 'AbortError' && !ctrl.signal?.aborted) console.warn('[Healing] batch error:', parallelErr);
        }

        for (let bIdx = activeBlocks.length - 1; bIdx >= 0; bIdx--) {
          const block = activeBlocks[bIdx];
          if (block.isPurgeOnly) {
            paragraphs.splice(block.startIdx, block.endIdx - block.startIdx + 1);
            continue;
          }
          const translatedBlockText = block.translatedText || '';
          if (translatedBlockText && translatedBlockText.trim()) {
            const splitTranslated = translatedBlockText.trim().split(isDoubleBreak ? /\r?\n\r?\n/ : /\r?\n/);
            if (splitTranslated.length === block.texts.length) {
              for (let k = 0; k < block.texts.length; k++) {
                paragraphs[block.startIdx + k] = splitTranslated[k].trim();
              }
            } else {
              paragraphs.splice(block.startIdx, block.endIdx - block.startIdx + 1, translatedBlockText.trim());
            }
          }
        }

        let finalContent = paragraphs.filter(Boolean).join(sep);
        const stripRefusalFn = (typeof window !== 'undefined' && window.stripAiRefusalDisclaimers) ? window.stripAiRefusalDisclaimers : null;
        if (stripRefusalFn) finalContent = stripRefusalFn(finalContent);
        const finalTitle = rawTitle;

        if (typeof setReaderChapters === 'function') {
          setReaderChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), content: finalContent, text: finalContent, isTranslated: true } : c));
          });
        }

        if (typeof setTranslatedChapters === 'function') {
          setTranslatedChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), content: finalContent, text: finalContent, isTranslated: true } : c));
          });
        }

        if (typeof setChapters === 'function') {
          setChapters(prev => {
            const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
            return base.map((c, i) => (i === targetChapterIdx ? { ...(c || {}), content: finalContent, text: finalContent, isTranslated: true } : c));
          });
        }

        if (typeof setAssembledText === 'function') {
          setAssembledText(prevText => {
            const baseChs = (candidateBase && candidateBase.length > 0) ? candidateBase : (chapters || []);
            if (baseChs.length > 0) {
              return baseChs.map((c, i) => {
                const t = c?.title || `Chapter ${i + 1}`;
                const body = (i === targetChapterIdx) ? finalContent : (c?.content || c?.text || '');
                return `# ${t}\n\n${body}`;
              }).join('\n\n\n');
            }
            return `${prevText ? prevText + '\n\n\n' : ''}# ${finalTitle}\n\n${finalContent}`;
          });
        }

        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          try {
            let full = null;
            if (currentNovelId) {
              full = await window.GeminiNovelDB.getNovel(currentNovelId);
            }
            if (!full && readerNovelTitle) {
              const all = await window.GeminiNovelDB.getAllNovels();
              full = (all || []).find(n => n && (n.title === readerNovelTitle || n.id === currentNovelId || String(n.id) === String(currentNovelId)));
            }
            if (!full) full = novelRec;
            if (full) {
              const baseList = (candidateBase && candidateBase.length > 0) ? candidateBase : (full.chapters || full.rawChapters || []);
              const updatedChs = (full.chapters && full.chapters.length > 0) ? [...full.chapters] : [...baseList];
              updatedChs[targetChapterIdx] = {
                ...(updatedChs[targetChapterIdx] || baseList[targetChapterIdx] || {}),
                content: finalContent,
                text: finalContent,
                isTranslated: true
              };
              const updatedTransChs = (full.translatedChapters && full.translatedChapters.length > 0) ? [...full.translatedChapters] : [...updatedChs];
              updatedTransChs[targetChapterIdx] = {
                ...(updatedTransChs[targetChapterIdx] || baseList[targetChapterIdx] || {}),
                content: finalContent,
                text: finalContent,
                isTranslated: true
              };
              const updatedRawChs = (full.rawChapters && full.rawChapters.length > 0) ? [...full.rawChapters] : [...updatedChs];
              if (updatedRawChs[targetChapterIdx]) {
                updatedRawChs[targetChapterIdx] = {
                  ...updatedRawChs[targetChapterIdx],
                  content: finalContent,
                  text: finalContent
                };
              }
              const updatedNovel = {
                ...full,
                chapters: updatedChs,
                translatedChapters: updatedTransChs,
                rawChapters: updatedRawChs,
                isTranslated: true,
                isEdited: true,
                epubBlob: undefined,
                updatedAt: Date.now()
              };
              const saveId = full.id || currentNovelId;
              await window.GeminiNovelDB.updateNovel(saveId, updatedNovel);
              if (typeof saveNovelToHistory === 'function') {
                saveNovelToHistory(updatedNovel).catch(() => {});
              }
              if (typeof setActiveNovelRecord === 'function') setActiveNovelRecord(updatedNovel);
            }
          } catch (dbErr) {
            console.warn('[Reader] Failed to update healed novel in database:', dbErr);
          }
        }

        if (typeof toast === 'function') {
          const numHealed = activeBlocks.filter(b => b && b.translatedText && b.translatedText.trim()).length;
          if (ctrl.signal?.aborted) {
            toast(`Stopped early. Safely saved ${numHealed} healed section(s) to book!`, 'info');
          } else {
            toast(`Healed ${totalHealedSections} untranslated section(s)! Zero wasted tokens.`, 'success');
          }
        }
        return { content: finalContent, title: finalTitle, isTranslated: true };
      }

      if (!rawText || !rawText.trim()) {
        if (typeof toast === 'function') toast('No source text found for this chapter.', 'error');
        return null;
      }

      const res = await translateSingleChapter({
        chapterIdx: targetChapterIdx,
        rawTitle,
        rawText,
        opts,
        config,
        callbacks: {
          onProgress,
          onToast: (msg, type) => { if (typeof toast === 'function') toast(msg, type); }
        }
      });

      if (!res || !res.content) {
        throw new Error('Translation produced empty text.');
      }

      const finalTitle = res.title || rawTitle;
      const targetZipPath = (rawChap && rawChap.zipPath) || (chapterData && chapterData.zipPath);

      // 1. Update React state: readerChapters (Dedicated Reader anchor)
      if (typeof setReaderChapters === 'function') {
        setReaderChapters(prev => {
          const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
          return base.map((c, i) => (i === targetChapterIdx ? {
            ...(c || {}),
            title: finalTitle,
            content: res.content,
            text: res.content,
            zipPath: targetZipPath,
            isTranslated: true
          } : c));
        });
      }

      // 2. Update React state: translatedChapters
      if (typeof setTranslatedChapters === 'function') {
        setTranslatedChapters(prev => {
          const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
          return base.map((c, i) => (i === targetChapterIdx ? {
            ...(c || {}),
            title: finalTitle,
            content: res.content,
            text: res.content,
            zipPath: targetZipPath,
            isTranslated: true
          } : c));
        });
      }

      // 3. Update React state: chapters
      if (typeof setChapters === 'function') {
        setChapters(prev => {
          const base = (Array.isArray(prev) && prev.length > 0) ? prev : candidateBase;
          return base.map((c, i) => (i === targetChapterIdx ? {
            ...(c || {}),
            title: finalTitle,
            content: res.content,
            text: res.content,
            zipPath: targetZipPath,
            isTranslated: true
          } : c));
        });
      }

      // 4. Update React state: assembledText (preserving all chapters!)
      if (typeof setAssembledText === 'function') {
        setAssembledText(prevText => {
          const baseChs = (candidateBase && candidateBase.length > 0) ? candidateBase : (chapters || []);
          if (baseChs.length > 0) {
            return baseChs.map((c, i) => {
              const t = (i === targetChapterIdx) ? finalTitle : (c?.title || `Chapter ${i + 1}`);
              const body = (i === targetChapterIdx) ? res.content : (c?.content || c?.text || '');
              return `# ${t}\n\n${body}`;
            }).join('\n\n\n');
          }
          return `${prevText ? prevText + '\n\n\n' : ''}# ${finalTitle}\n\n${res.content}`;
        });
      }

      // 5. Update in-memory original EPUB zip if present
      if (currentOriginalZip && targetZipPath) {
        try {
          const fileInZip = currentOriginalZip.file(targetZipPath);
          if (fileInZip) {
            const xhtml = await fileInZip.async('text');
            if (xhtml && typeof DOMParser !== 'undefined') {
              const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
              const titleHeading = (finalTitle && !isGenericTitle(finalTitle)) ? `<h2>${escapeXml(finalTitle)}</h2>\n` : '';
              const lines = res.content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              const fmtFn = (typeof window !== 'undefined' && window.smartFormat) ? window.smartFormat : escapeXml;
              const bodyParagraphs = lines.map(line => {
                if (/^(\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(line)) {
                  return `<p class="divider">${escapeXml(line)}</p>`;
                }
                return `<p>${fmtFn(line)}</p>`;
              }).join('\n');
              if (doc.body) {
                doc.body.innerHTML = `${titleHeading}${bodyParagraphs}`;
                const tEl = doc.querySelector('title');
                if (tEl && finalTitle) tEl.textContent = finalTitle;
                currentOriginalZip.file(targetZipPath, new XMLSerializer().serializeToString(doc));
              }
            }
          }
          if (typeof window !== 'undefined' && typeof window.updateOriginalEpubNavigation === 'function') {
            const chsForNav = (candidateBase && candidateBase.length > 0) ? [...candidateBase] : ((chapters && chapters.length > 0) ? [...chapters] : []);
            if (chsForNav[targetChapterIdx]) chsForNav[targetChapterIdx] = { ...chsForNav[targetChapterIdx], title: finalTitle, zipPath: targetZipPath };
            window.updateOriginalEpubNavigation(currentOriginalZip, chsForNav);
          }
        } catch (zipErr) {
          console.warn('[executeTranslateSingleChapter] Could not update XHTML in originalZip:', zipErr);
        }
      }

      // 6. Update Database: GeminiNovelDB
      if (typeof window !== 'undefined' && window.GeminiNovelDB) {
        try {
          let full = null;
          if (currentNovelId) {
            full = await window.GeminiNovelDB.getNovel(currentNovelId);
          }
          if (!full && readerNovelTitle) {
            const all = await window.GeminiNovelDB.getAllNovels();
            full = (all || []).find(n => n && (n.title === readerNovelTitle || n.id === currentNovelId || String(n.id) === String(currentNovelId)));
          }
          if (!full) full = novelRec;
          if (full) {
            const baseList = (candidateBase && candidateBase.length > 0) ? candidateBase : (full.chapters || full.rawChapters || []);
            const updatedChs = (full.chapters && full.chapters.length > 0) ? [...full.chapters] : [...baseList];
            updatedChs[targetChapterIdx] = {
              ...(updatedChs[targetChapterIdx] || baseList[targetChapterIdx] || {}),
              title: finalTitle,
              content: res.content,
              text: res.content,
              zipPath: targetZipPath,
              isTranslated: true
            };
            const updatedTransChs = (full.translatedChapters && full.translatedChapters.length > 0) ? [...full.translatedChapters] : [...updatedChs];
            updatedTransChs[targetChapterIdx] = {
              ...(updatedTransChs[targetChapterIdx] || baseList[targetChapterIdx] || {}),
              title: finalTitle,
              content: res.content,
              text: res.content,
              zipPath: targetZipPath,
              isTranslated: true
            };
            const updatedRawChs = (full.rawChapters && full.rawChapters.length > 0) ? [...full.rawChapters] : [...updatedChs];
            if (updatedRawChs[targetChapterIdx]) {
              updatedRawChs[targetChapterIdx] = {
                ...updatedRawChs[targetChapterIdx],
                title: finalTitle,
                content: res.content,
                text: res.content,
                zipPath: targetZipPath
              };
            }
            const updatedNovel = {
              ...full,
              chapters: updatedChs,
              translatedChapters: updatedTransChs,
              rawChapters: updatedRawChs,
              isTranslated: true,
              isEdited: true,
              epubBlob: undefined, // Invalidate stale cached pre-built blob so fresh EPUB exports use updated chapter!
              updatedAt: Date.now()
            };
            const saveId = full.id || currentNovelId;
            await window.GeminiNovelDB.updateNovel(saveId, updatedNovel);
            if (typeof saveNovelToHistory === 'function') {
              saveNovelToHistory(updatedNovel).catch(() => {});
            }
            if (typeof setActiveNovelRecord === 'function') setActiveNovelRecord(updatedNovel);
          }
        } catch (dbErr) {
          console.warn('[Reader] Failed to update novel in database:', dbErr);
        }
      }

      if (typeof toast === 'function') {
        toast(`Chapter ${targetChapterIdx + 1} translated and saved!`, 'success');
      }
      return res;
  }

  return { executeTranslateSingleChapter };
}));
