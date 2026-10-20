/**
 * Gemini EPUB Translator - Translation Execution Loops & Chapter Dispatchers Engine
 * Module: translation_loop_engine.js
 * 
 * Provides:
 * - extractTextNodes(element): Traverses DOM with createTreeWalker and extracts non-empty text nodes
 * - translateText({ inputText, resume, session, opts, config, callbacks }): Full text translation loop with streaming, intra-context, and parallel workers
 * - translateEbook({ chapters, resume, isEpub, originalZip, session, opts, config, callbacks }): Full ebook chapter dispatcher with intra-chapter context, parallel concurrency, title translation, healing pass, and DOM node replacement
 * - Controller: buildTranslateOpts, buildTranslationConfig, pauseTranslation, resumeTranslation, discardSession, saveTranslationToLibrarySpace, executeTranslateText, executeTranslateEbook, createTranslationDispatcher
 * - splitChunks, batchParallel, calculateRealCost, formatDuration, generateJobId utilities
 */

(function (global) {
  'use strict';

  // --- Centralized Helpers & Delegations ---
  const escapeXml = (s) => (typeof window !== 'undefined' && window.escapeXml) ? window.escapeXml(s) : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const normalizeTitleKey = (t) => (typeof window !== 'undefined' && window.normalizeTitleKey) ? window.normalizeTitleKey(t) : String(t || '').replace(/\.[^/.]+$/, '').replace(/\s*\((?:Translated|Translation)\)/gi, '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim().toLowerCase();
  const isGenericTitle = (t) => (typeof window !== 'undefined' && window.isGenericTitle) ? window.isGenericTitle(t) : (!t || !t.trim() || /^translated\s*(document|file)?$/i.test(t.trim()));
  const formatDuration = (ms) => (typeof window !== 'undefined' && window.formatDuration) ? window.formatDuration(ms) : `${((ms || 0)/1000).toFixed(1)}s`;
  const calculateRealCost = (pTok, oTok, m, prov) => (typeof window !== 'undefined' && window.calculateRealCost) ? window.calculateRealCost(pTok, oTok, m, prov) : '$0.0000';
  const generateJobId = (t, isFile) => (typeof window !== 'undefined' && window.generateJobId) ? window.generateJobId(t, isFile) : `job_${Date.now()}`;

  // --- Paragraph Boundary Chunk Splitting ---
  const CHUNK_PAYLOAD_MAP = {
    turbo: 4500,
    large: 3800,
    medium: 2800,
    small: 1800
  };
  const PROMPT_OVERHEAD = 350;

  function splitChunks(text, glossaryLen = 0, smartGlossary = true, preset = null) {
    if (typeof window !== 'undefined' && window.splitChunks) return window.splitChunks(text, glossaryLen, smartGlossary, preset);
    if (!text || typeof text !== 'string') return [];
    const activePreset = preset || (typeof localStorage !== 'undefined' ? localStorage.getItem('chunkSizePreset') : null) || 'turbo';
    const basePayload = CHUNK_PAYLOAD_MAP[activePreset] || 4500;
    const max = Math.max(1800, Math.min(3500, basePayload - Math.min(PROMPT_OVERHEAD + (smartGlossary ? Math.min(glossaryLen, 1500) : glossaryLen), 1800)));
    const chunks = []; let rem = text;
    while (rem.length > 0) {
      if (rem.length <= max) { chunks.push(rem); break; }
      let sp = max;
      let idx = rem.lastIndexOf('\n\n', max);
      if (idx !== -1 && idx >= max * 0.4) sp = idx + 2;
      else {
        idx = rem.lastIndexOf('\n', max);
        if (idx !== -1 && idx >= max * 0.4) sp = idx + 1;
        else {
          const puncts = [rem.lastIndexOf('。\n', max), rem.lastIndexOf('。', max), rem.lastIndexOf('.\n', max), rem.lastIndexOf('.', max)].filter(i => i >= max * 0.3);
          if (puncts.length > 0) sp = Math.max(...puncts) + 1;
        }
      }
      chunks.push(rem.substring(0, sp));
      rem = rem.substring(sp);
    }
    return chunks;
  }

  // --- Work-Stealing Multi-Key Parallel Worker Pool ---
  async function batchParallel(items, fn, concurrency = 3, signal = null) {
    if (typeof global !== 'undefined' && global.batchParallel) return global.batchParallel(items, fn, concurrency, signal);
    if (typeof window !== 'undefined' && window.batchParallel) return window.batchParallel(items, fn, concurrency, signal);
    if (!items || items.length === 0) return [];
    const results = new Array(items.length);
    let nextIndex = 0;
    let fatalError = null;
    const numWorkers = Math.max(1, Math.min(concurrency, items.length));

    const workers = Array.from({ length: numWorkers }, async (_, workerId) => {
      if (workerId > 0) {
        await new Promise(r => setTimeout(r, workerId * 350));
      }
      while (nextIndex < items.length) {
        if (signal?.aborted) {
          const err = new Error('Translation paused.');
          err.name = 'AbortError';
          throw err;
        }
        if (fatalError) {
          throw fatalError;
        }
        const currentIndex = nextIndex++;
        const item = items[currentIndex];
        try {
          const res = await fn(item, currentIndex, workerId);
          results[currentIndex] = res;
        } catch (err) {
          if (signal?.aborted || err.name === 'AbortError') throw err;
          const msg = err?.message || '';
          const isFatal = msg.includes('429') || msg.includes('quota') || msg.includes('billing') || msg.includes('Strict Model') || msg.includes('403') || msg.includes('denied access') || msg.includes('PERMISSION_DENIED');
          if (isFatal) {
            fatalError = err;
            throw err;
          }
          results[currentIndex] = { error: msg || 'Unknown error' };
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  // --- Helper Safe String Sanitizers ---
  function safeStripContextLeak(text) {
    const fn = (typeof window !== 'undefined' && window.stripContextLeak) ||
               (typeof global !== 'undefined' && global.stripContextLeak);
    if (typeof fn === 'function') return fn(text);
    if (!text) return '';
    return text.replace(/\[(?:Context|Memory|Scene Context)[^\]]*\]/gi, '').trim();
  }

  function safeCleanNovelProse(text) {
    const fn = (typeof window !== 'undefined' && window.cleanNovelProse) ||
               (typeof global !== 'undefined' && global.cleanNovelProse);
    if (typeof fn === 'function') return fn(text);
    if (!text) return '';
    return text.replace(/\r\n|\r/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  }

  function isChapterCompleted(translatedChap, rawChap, tgtLang = 'English') {
    if (!translatedChap) return false;
    const content = (typeof translatedChap === 'object' ? (translatedChap.content || translatedChap.text || '') : String(translatedChap || '')).trim();
    if (!content) return false;
    if (content.startsWith('[Error:') || content.includes('\n[Error:')) return false;
    if (typeof translatedChap === 'object' && translatedChap.isTranslated === false) return false;
    const rawText = (typeof rawChap === 'string' ? rawChap : (rawChap?.text || rawChap?.content || '')).trim();
    if (rawText && content === rawText) return false;
    const isTargetNonCjk = !tgtLang || /^(en|english|fr|es|de|it|pt|ru)/i.test(tgtLang);
    if (isTargetNonCjk && content.length > 60) {
      const cjkChars = (content.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
      if (cjkChars > 30 && (cjkChars / content.length) > 0.20) {
        return false;
      }
    }
    return true;
  }

  function getKeyPool() {
    return (typeof window !== 'undefined' && window.KeyPool) ||
           (typeof global !== 'undefined' && global.KeyPool) ||
           { acquireKey: async (keys) => (keys && keys[0]?.key) || null, releaseKey: () => {} };
  }

  async function safeStreamWithRotation(chunk, opts) {
    const fn = (opts && opts.streamWithRotation) ||
               (typeof window !== 'undefined' && window.streamWithRotation) ||
               (typeof global !== 'undefined' && global.streamWithRotation);
    if (typeof fn === 'function') return fn(chunk, opts);
    throw new Error('streamWithRotation is not available');
  }

  async function safeTranslateWithRotation(chunk, opts) {
    const fn = (opts && opts.translateWithRotation) ||
               (typeof window !== 'undefined' && window.translateWithRotation) ||
               (typeof global !== 'undefined' && global.translateWithRotation);
    if (typeof fn === 'function') return fn(chunk, opts);
    throw new Error('translateWithRotation is not available');
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. HTML DOM Text Node Extraction Helper
  // ═══════════════════════════════════════════════════════════════
  /**
   * Traverses DOM with document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false).
   * Filters out script, style, noscript tags and empty whitespace nodes.
   * Returns array of text nodes.
   */
  function extractTextNodes(element) {
    const nodes = [];
    if (!element) return nodes;
    if (typeof document === 'undefined' || typeof NodeFilter === 'undefined') return nodes;
    try {
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = walk.nextNode())) {
        const parentTag = n.parentElement ? n.parentElement.tagName.toLowerCase() : '';
        if (parentTag === 'script' || parentTag === 'style' || parentTag === 'noscript') continue;
        if (n.nodeValue && n.nodeValue.trim().length > 0) {
          nodes.push(n);
        }
      }
    } catch (e) {
      console.warn('[TranslationLoopEngine] extractTextNodes error:', e);
    }
    return nodes;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Text Translation Execution Loop
  // ═══════════════════════════════════════════════════════════════
  /**
   * Translates plain or raw markdown/prose text with streaming, intra-context, or parallel dispatch.
   *
   * @param {Object} params
   * @param {string} params.inputText
   * @param {boolean} [params.resume=false]
   * @param {Object|null} [params.session=null]
   * @param {Object} [params.opts={}]
   * @param {Object} [params.config={}]
   * @param {Object} [params.callbacks={}]
   * @returns {Promise<{ assembledText: string, lastUsageStats: Object, totalTokensUsed: number, chapters: Array }>}
   */
  async function translateText({ inputText, resume = false, session = null, opts = {}, config = {}, callbacks = {} }) {
    if (!inputText || !inputText.trim()) {
      throw new Error('Paste some text to translate.');
    }

    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const provider = config.provider || 'gemini';
    const effectiveTerm = config.enableGlossary ? (config.terminology || '') : '';
    const chunks = splitChunks(inputText, effectiveTerm.length, config.smartGlossary !== false, config.chunkSizePreset);
    const isAIProvider = provider === 'gemini' || provider === 'deepseek';
    const useContext = Boolean(config.contextAware && chunks.length > 1 && isAIProvider);
    const activeLocks = opts.genderLocks ? Object.keys(opts.genderLocks) : [];
    const jobId = config.jobId || generateJobId(inputText);

    if (typeof window !== 'undefined' && window.telemetryLog) {
      window.telemetryLog('TRANSLATE', `Initiating text translation (${inputText.length} chars, ${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`, {
        model: opts.model,
        provider,
        srcLang: opts.srcLang,
        tgtLang: opts.tgtLang,
        chunksCount: chunks.length,
        genderLocksInjectedCount: activeLocks.length,
        genderLocksInjected: activeLocks.slice(0, 100),
        glossaryRulesCount: effectiveTerm ? effectiveTerm.split('\n').filter(l => l.trim() && !l.startsWith('#')).length : 0
      });
    }

    const curSession = resume ? session : null;
    let result = curSession ? (curSession.result || '') : '';
    let ctx = curSession ? (curSession.ctx || '') : '';
    let startIndex = curSession ? (curSession.completedCount || 0) : 0;
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let totalTokensUsed = 0;
    let accumulatedBreakdown = {
      sourceTokens: 0,
      glossaryTokens: 0,
      genderTokens: 0,
      contextTokens: 0,
      systemTokens: 0
    };

    const saveState = async (res, c, count) => {
      const state = { id: jobId, type: 'text', title: 'Text Translation', result: res, ctx: c, completedCount: count, total: chunks.length, timestamp: Date.now() };
      if (callbacks.onSaveState) {
        await callbacks.onSaveState(state);
      }
      return state;
    };

    // Snapshot state immediately so pausing at any point captures the session
    await saveState(result, ctx, startIndex);

    if (isAIProvider && config.enableStreaming) {
      for (let i = startIndex; i < chunks.length; i++) {
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Streaming chunk ${i + 1}/${chunks.length}${useContext ? ' (with context)' : ''}...`);
        }
        const pct = Math.round(((i + 1) / chunks.length) * 100);
        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.showProgressNotification?.('Gemini Translator', `Chunk ${i + 1}/${chunks.length} (${pct}%)`, pct);
          window.NativeBridge.haptic?.('milestone');
        }
        let chunkResult = '';
        const onChunkStream = t => {
          if (chunkResult === '' && result !== '' && !result.endsWith('\n')) {
            result += '\n\n';
          }
          chunkResult += t;
          result += t;
          if (callbacks.onStream) {
            callbacks.onStream(t, result);
          }
        };
        const isLastChunk = i === chunks.length - 1;
        const hasIncomingContext = Boolean(ctx && ctx.trim());
        const shouldPassContext = useContext && (hasIncomingContext || i > 0);
        const shouldRequestUpdate = useContext && !isLastChunk;
        let streamRes = await safeStreamWithRotation(chunks[i], {
          ...opts,
          context: shouldPassContext ? ctx : undefined,
          needContextUpdate: shouldRequestUpdate,
          onChunk: onChunkStream
        });

        // Fallback: if the context-memory pass returned no translation body, retry once without context
        if ((!chunkResult.trim() || (chunks[i].trim().length > 300 && chunkResult.trim().length < 100)) && useContext) {
          chunkResult = '';
          streamRes = await safeStreamWithRotation(chunks[i], { ...opts, context: undefined, needContextUpdate: shouldRequestUpdate, onChunk: onChunkStream });
        }
        if (useContext) { ctx = streamRes.newContext || ctx; }
        if (streamRes?.usage) {
          totalPromptTokens += streamRes.usage.promptTokens || 0;
          totalOutputTokens += streamRes.usage.outputTokens || 0;
          totalTokensUsed += streamRes.usage.totalTokens || 0;
          if (streamRes.usage.breakdown) {
            accumulatedBreakdown.sourceTokens += streamRes.usage.breakdown.sourceTokens || 0;
            accumulatedBreakdown.glossaryTokens += streamRes.usage.breakdown.glossaryTokens || 0;
            accumulatedBreakdown.genderTokens += streamRes.usage.breakdown.genderTokens || 0;
            accumulatedBreakdown.contextTokens += streamRes.usage.breakdown.contextTokens || 0;
            accumulatedBreakdown.systemTokens += streamRes.usage.breakdown.systemTokens || 0;
          }
        }
        if (callbacks.onProgress) {
          callbacks.onProgress(Math.floor(((i + 1) / chunks.length) * 100));
        }
        if (callbacks.onChunkDone) {
          callbacks.onChunkDone({ chunkIndex: i, totalChunks: chunks.length, chunkResult, assembledText: result, usage: streamRes?.usage });
        }
        await saveState(result, ctx, i + 1);
      }
      result = safeStripContextLeak(result);
      if (!(result || '').trim()) throw new Error('Provider returned an empty stream. Check the selected model in Settings · Engine.');
    } else if (useContext) {
      for (let i = startIndex; i < chunks.length; i++) {
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Translating chunk ${i + 1}/${chunks.length} (with context)...`);
        }
        let translated = null;
        const isLastChunk = i === chunks.length - 1;
        const hasIncomingContext = Boolean(ctx && ctx.trim());
        const shouldPassContext = useContext && (hasIncomingContext || i > 0);
        const shouldRequestUpdate = useContext && !isLastChunk;
        try {
          translated = await safeTranslateWithRotation(chunks[i], {
            ...opts,
            context: shouldPassContext ? ctx : undefined,
            needContextUpdate: shouldRequestUpdate
          });
        } catch (err) {
          if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
          const isFatalQuota = (err.message || '').includes('429') || (err.message || '').includes('quota') || (err.message || '').includes('billing');
          if (isFatalQuota) {
            throw new Error(`API Quota exhausted across keys. Switch model to Gemini 3.5 Flash Lite in Settings · Engine. Progress saved at chunk ${i + 1}/${chunks.length}.`);
          }
          if (opts?.strictModel) {
            const cleanErr = (err.message || '').replace(/\.+$/, '');
            throw new Error(`Strict Model: Could not complete chunk ${i + 1}/${chunks.length} with ${opts.model || 'chosen model'}: ${cleanErr}. Progress safely preserved. Tap Resume to retry.`);
          }
          let recText = '';
          try {
            const apiKeysByProvider = config.apiKeysByProvider || {};
            const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
            const KeyPool = getKeyPool();
            const fallbackLeased = (availableKeys?.length > 1) ? await KeyPool.acquireKey(availableKeys) : null;
            const fallbackOpts = { ...opts, apiKey: fallbackLeased || opts.apiKey, context: undefined, needContextUpdate: false };
            const recRes = await safeTranslateWithRotation(chunks[i], fallbackOpts);
            if (fallbackLeased) KeyPool.releaseKey(fallbackLeased);
            recText = (recRes && typeof recRes === 'object') ? (recRes.text || '') : (typeof recRes === 'string' ? recRes : '');
          } catch (recErr) {}
          if (recText && recText.trim()) {
            translated = { text: recText };
          } else {
            translated = { text: `\n\n[Error on chunk ${i + 1}: ${err.message}]\n\n` };
          }
        }
        result += (result ? '\n' : '') + (translated.text || translated);
        ctx = translated.newContext || ctx;
        if (translated?.usage) {
          totalPromptTokens += translated.usage.promptTokens || 0;
          totalOutputTokens += translated.usage.outputTokens || 0;
          totalTokensUsed += translated.usage.totalTokens || 0;
          if (translated.usage.breakdown) {
            accumulatedBreakdown.sourceTokens += translated.usage.breakdown.sourceTokens || 0;
            accumulatedBreakdown.glossaryTokens += translated.usage.breakdown.glossaryTokens || 0;
            accumulatedBreakdown.genderTokens += translated.usage.breakdown.genderTokens || 0;
            accumulatedBreakdown.contextTokens += translated.usage.breakdown.contextTokens || 0;
            accumulatedBreakdown.systemTokens += translated.usage.breakdown.systemTokens || 0;
          }
        }
        const curFormatted = result.replace(/\r\n/g, '\n').trim();
        if (callbacks.onChunkDone) {
          callbacks.onChunkDone({ chunkIndex: i, totalChunks: chunks.length, chunkResult: translated.text || translated, assembledText: curFormatted, usage: translated?.usage });
        }
        if (callbacks.onProgress) {
          callbacks.onProgress(Math.floor(((i + 1) / chunks.length) * 100));
        }
        await saveState(result, ctx, i + 1);
      }
      const final = safeStripContextLeak(result).replace(/\r\n/g, '\n').trim();
      if (!final) throw new Error('Provider returned an empty response. Check the selected model in Settings · Engine.');
      result = final;
    } else {
      // Parallel batch translation (no context)
      const remainingChunks = chunks.slice(startIndex);
      if (callbacks.onProgressLabel) {
        callbacks.onProgressLabel(`Translating ${remainingChunks.length} remaining chunk(s) with ${Math.min(config.concurrency || 3, remainingChunks.length)} parallel...`);
      }
      let completed = startIndex;
      const apiKeysByProvider = config.apiKeysByProvider || {};
      const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
      const effectiveConcurrency = Math.max(1, config.concurrency || 3);
      const results = await batchParallel(remainingChunks, async (chunk, idx, workerId = 0) => {
        const workerKey = availableKeys.length > 0 ? availableKeys[workerId % availableKeys.length].key : opts.apiKey;
        const workerOpts = { ...opts, apiKey: workerKey, availableKeys, isParallelWorker: effectiveConcurrency > 1 };
        const translated = await safeTranslateWithRotation(chunk, workerOpts);
        completed++;
        if (callbacks.onProgress) {
          callbacks.onProgress(Math.floor((completed / chunks.length) * 100));
        }
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Completed ${completed}/${chunks.length} chunks`);
        }
        await saveState(result + (result ? '\n' : '') + '[Partial Parallel Completion]', '', completed);
        return translated;
      }, effectiveConcurrency, opts.signal);

      if (opts?.strictModel) {
        const failedItem = results.find(r => r?.error || (!r?.text && typeof r !== 'string'));
        if (failedItem) {
          throw new Error(`Strict Model: A chunk encountered an issue ("${failedItem.error || 'empty response'}"). Progress safely saved at ${completed}/${chunks.length}. Tap Resume to retry.`);
        }
      }

      results.forEach(r => {
        if (r?.usage) {
          totalPromptTokens += r.usage.promptTokens || 0;
          totalOutputTokens += r.usage.outputTokens || 0;
          totalTokensUsed += r.usage.totalTokens || 0;
          if (r.usage.breakdown) {
            accumulatedBreakdown.sourceTokens += r.usage.breakdown.sourceTokens || 0;
            accumulatedBreakdown.glossaryTokens += r.usage.breakdown.glossaryTokens || 0;
            accumulatedBreakdown.genderTokens += r.usage.breakdown.genderTokens || 0;
            accumulatedBreakdown.contextTokens += r.usage.breakdown.contextTokens || 0;
            accumulatedBreakdown.systemTokens += r.usage.breakdown.systemTokens || 0;
          }
        }
      });

      const translatedPieces = results.map(r => typeof r === 'string' ? r : (r?.text ? r.text : (r?.error ? `\n\n[Error: ${r.error}]\n\n` : '')));
      const combinedNew = safeCleanNovelProse(translatedPieces.join('\n\n').replace(/\r\n/g, '\n')).trim();
      result = safeStripContextLeak(result ? result + '\n\n' + combinedNew : combinedNew);

      // Anti-MTL Quality Gate & Proofreader Check (§7.5 + §5.9)
      if (config.antiMtlGateEnabled && typeof window !== 'undefined' && window.QAEngine && result) {
        const refCheck = window.QAEngine.checkMtlRefusal(result);
        const loopCheck = window.QAEngine.checkRepetitionLoop(result);
        window.telemetryLog?.('ANTI_MTL', `Text translation quality audit: ${refCheck.hasRefusal ? `Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `Loop [${loopCheck.phrase}]` : 'Clean Pass'}`, {
          hasRefusal: refCheck.hasRefusal,
          refusalPattern: refCheck.patternName || null,
          hasLoop: loopCheck.hasLoop,
          loopPhrase: loopCheck.phrase || null
        });
        if (refCheck.hasRefusal && callbacks.onToast) {
          callbacks.onToast(`Anti-MTL Gate: ${refCheck.patternName} detected in translation`, 'warning');
        } else if (loopCheck.hasLoop && callbacks.onToast) {
          callbacks.onToast(`QA Proofreader: Hallucinated repetition loop detected`, 'warning');
        }
      }

      // Translation Revision Snapshot (§8.6)
      if (config.snapshotsEnabled && typeof window !== 'undefined' && window.TMDiffEngine && result) {
        const novelKey = (config.activeNovelRecord && config.activeNovelRecord.id) || (config.fileName && config.fileName.trim()) || 'active_doc';
        const activeM = provider === 'deepseek'
          ? (config.useCustomDeepseekModel && config.customDeepseekModel ? config.customDeepseekModel : config.deepseekModel)
          : (config.useCustomModel && config.customModel ? config.customModel : (config.geminiModel || config.model));
        window.TMDiffEngine.Snapshots.createSnapshot({
          novelId: novelKey,
          chapterIdx: 0,
          chapterTitle: (config.fileName && config.fileName.trim()) || 'Translated Document',
          text: result,
          model: activeM || 'Gemini'
        }).catch(e => console.warn('[Snapshots] Single text snapshot error:', e));
      }
    }

    const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    const durationStr = formatDuration(elapsedMs);
    const totalToks = totalTokensUsed || (totalPromptTokens + totalOutputTokens);
    const tokPerSec = elapsedMs > 0 && totalToks ? Math.round((totalToks / (elapsedMs / 1000))) : 0;

    const activeM = provider === 'deepseek'
      ? (config.useCustomDeepseekModel && config.customDeepseekModel ? config.customDeepseekModel : config.deepseekModel)
      : (config.useCustomModel && config.customModel ? config.customModel : (config.geminiModel || config.model || opts.model));
    const finalCost = calculateRealCost(totalPromptTokens, totalOutputTokens, activeM, provider);
    const finalBreakdown = totalPromptTokens > 0 ? {
      sourceTokens: accumulatedBreakdown.sourceTokens,
      glossaryTokens: accumulatedBreakdown.glossaryTokens,
      genderTokens: accumulatedBreakdown.genderTokens,
      contextTokens: accumulatedBreakdown.contextTokens,
      systemTokens: accumulatedBreakdown.systemTokens,
      sourcePct: ((accumulatedBreakdown.sourceTokens / totalPromptTokens) * 100).toFixed(1),
      glossaryPct: ((accumulatedBreakdown.glossaryTokens / totalPromptTokens) * 100).toFixed(1),
      genderPct: ((accumulatedBreakdown.genderTokens / totalPromptTokens) * 100).toFixed(1),
      contextPct: ((accumulatedBreakdown.contextTokens / totalPromptTokens) * 100).toFixed(1),
      systemPct: ((accumulatedBreakdown.systemTokens / totalPromptTokens) * 100).toFixed(1)
    } : null;

    const stats = {
      promptTokens: totalPromptTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalToks,
      cost: finalCost,
      duration: durationStr,
      durationMs: elapsedMs,
      speed: tokPerSec ? `${tokPerSec} tok/s` : '',
      model: activeM,
      provider,
      enableStreaming: Boolean(config.enableStreaming),
      enableThinking: Boolean(config.enableThinking),
      strictModel: Boolean(config.strictModel),
      contextAware: Boolean(config.contextAware),
      concurrency: Number(config.concurrency || 1),
      chunkSizePreset: String(config.chunkSizePreset || 'turbo'),
      smartGlossary: Boolean(config.smartGlossary),
      glossaryTermCount: Number(config.glossaryTermCount || 0),
      hasGlossary: Boolean(config.terminology && config.terminology.trim()),
      hasInstructions: Boolean(config.customInstructions && config.customInstructions.trim()),
      breakdown: finalBreakdown
    };

    return {
      assembledText: result,
      lastUsageStats: stats,
      totalTokensUsed: totalToks,
      chapters: [{ title: 'Translated Document', content: result }]
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Ebook & Chapter Dispatcher Execution Loop
  // ═══════════════════════════════════════════════════════════════
  /**
   * Dispatches and orchestrates translation across multi-chapter eBooks, EPUBs, and web novel bundles.
   *
   * @param {Object} params
   * @param {Array} params.chapters
   * @param {boolean} [params.resume=false]
   * @param {boolean} [params.isEpub=false]
   * @param {Object|null} [params.originalZip=null]
   * @param {Object|null} [params.session=null]
   * @param {Object} [params.opts={}]
   * @param {Object} [params.config={}]
   * @param {Object} [params.callbacks={}]
   * @returns {Promise<{ translatedChapters: Array, assembledText: string, lastUsageStats: Object, totalTokensUsed: number }>}
   */
  async function translateEbook({ chapters, resume = false, isEpub = false, originalZip = null, session = null, opts = {}, config = {}, callbacks = {} }) {
    const startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const provider = config.provider || 'gemini';
    const effectiveTerm = config.enableGlossary ? (config.terminology || '') : '';
    const useContext = Boolean(config.contextAware && (provider === 'gemini' || provider === 'deepseek'));
    const curSession = resume ? session : null;
    let ctx = curSession ? (curSession.ctx || '') : '';
    let done = curSession ? (curSession.completedCount || 0) : 0;
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let totalTokensUsed = 0;
    let accumulatedBreakdown = {
      sourceTokens: 0,
      glossaryTokens: 0,
      genderTokens: 0,
      contextTokens: 0,
      systemTokens: 0
    };

    const allParts = curSession ? [...(curSession.allParts || [])] : [];
    const newChapters = curSession ? [...(curSession.newChapters || [])] : [];
    const startChapterIdx = curSession ? (curSession.currentChapterIdx || 0) : 0;
    const startChunkIdx = curSession ? (curSession.currentChunkIdx || 0) : 0;

    const bookTitle = config.bookTitle ||
      ((chapters && chapters[0]?.title && !isGenericTitle(chapters[0].title))
        ? chapters[0].title
        : ((config.fileName && config.fileName.trim()) || (config.activeNovelRecord && config.activeNovelRecord.title) || config.currentDocTitle || 'Web Novel'));
    const jobId = config.fileHash || ('job_' + String(bookTitle).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + chapters.length);

    const activeLocks = opts.genderLocks ? Object.keys(opts.genderLocks) : [];
    if (typeof window !== 'undefined' && window.telemetryLog) {
      window.telemetryLog('TRANSLATE', `Started eBook translation: "${bookTitle}" (${chapters.length} chapters, isEpub=${isEpub})`, {
        bookTitle,
        totalChapters: chapters.length,
        model: opts.model,
        provider,
        srcLang: opts.srcLang,
        tgtLang: opts.tgtLang,
        resume,
        activeGenderLocksCount: activeLocks.length,
        activeGenderLocks: activeLocks.slice(0, 100),
        glossaryRulesCount: opts.glossary ? opts.glossary.split('\n').filter(l => l.trim() && !l.startsWith('#')).length : 0,
        translationMemoryEnabled: !!config.translationMemoryEnabled,
        antiMtlGateEnabled: !!config.antiMtlGateEnabled
      });
    }

    let lastUiAssembledUpdate = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let totalChunks = 0;

    // Disambiguate duplicate adjacent chapter titles in chapters array (e.g. AO3 summary block vs story chapter)
    for (let idx = 0; idx < chapters.length - 1; idx++) {
      const cur = chapters[idx];
      const next = chapters[idx + 1];
      const curTitle = (cur?.title || '').trim().toLowerCase();
      const nextTitle = (next?.title || '').trim().toLowerCase();
      if (curTitle && curTitle === nextTitle) {
        const curText = (typeof cur === 'string' ? cur : (cur?.text || cur?.content || ''));
        const curIsSummary = /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|简介|内容简介|前言)[:：\s]/i.test(curText);
        if (curIsSummary) {
          if (cur && typeof cur === 'object') cur.title = 'Summary';
        }
      }
    }

    // Prepare chapter chunks with clean paragraph boundary splitting
    const chapterData = chapters.map(c => {
      let chapterText = (typeof c === 'string' ? c : (c?.text || c?.content || ''));
      const chapterTitle = (typeof c === 'object' && c?.title) ? String(c.title).trim() : '';
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && chapterTitle) {
        chapterText = stripFn(chapterText, chapterTitle, c?.originalTitle);
      }
      const ch = splitChunks(chapterText, effectiveTerm.length, config.smartGlossary !== false, config.chunkSizePreset);
      totalChunks += ch.length;
      if (chapterTitle) totalChunks++;
      return { title: chapterTitle, chunks: ch.map(text => ({ text })), doc: c?.doc, zipPath: c?.zipPath };
    });

    if (resume && newChapters.length > 0) {
      done = 0;
      newChapters.forEach((nc, idx) => {
        if (nc && isChapterCompleted(nc, chapters[idx], opts.tgtLang || config.tgtLang)) {
          done += (chapterData[idx]?.chunks?.length || 1) + (chapterData[idx]?.title?.trim() ? 1 : 0);
        }
      });
    }

    const saveState = async (c, count, chIdx, ckIdx, ap, nc) => {
      const state = {
        id: jobId,
        type: 'ebook',
        title: bookTitle,
        ctx: c,
        completedCount: count,
        currentChapterIdx: chIdx,
        currentChunkIdx: ckIdx,
        allParts: ap,
        newChapters: nc,
        totalChunks,
        chapters: (chapters || []).map((c, i) => ({ title: c?.title || `Chapter ${i + 1}`, text: c?.text || c?.content || '' })),
        isEpub,
        cover: config.cover || config.currentDocCover || config.activeNovelRecord?.cover || curSession?.cover || '',
        novelRecord: config.activeNovelRecord || curSession?.novelRecord || null,
        timestamp: Date.now(),
        isDeltaUpdate: Boolean(curSession?.isDeltaUpdate),
        deltaStart: curSession?.deltaStart,
        deltaEnd: curSession?.deltaEnd,
        novelId: curSession?.novelId
      };
      if (callbacks.onSaveState) {
        await callbacks.onSaveState(state);
      }
      return state;
    };

    // Snapshot state immediately at millisecond zero so pausing during chapter 1 never yields null
    await saveState(ctx, done, startChapterIdx, startChunkIdx, allParts, newChapters);

    const chapterItems = chapterData.map((ch, idx) => ({ ch, idx })).filter(({ idx }) => {
      if (!resume) return true;
      return !isChapterCompleted(newChapters[idx], chapters[idx], opts.tgtLang || config.tgtLang);
    });

    if (chapterItems.length === 0) {
      if (callbacks.onToast) callbacks.onToast('All chapters are already translated!', 'success');
      return {
        translatedChapters: newChapters,
        assembledText: allParts.filter(Boolean).join('\n\n\n').trim(),
        lastUsageStats: null,
        totalTokensUsed: 0
      };
    }

    const apiKeysByProvider = config.apiKeysByProvider || {};
    const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
    const effectiveConcurrency = Math.max(1, config.concurrency || 3);
    const translatedTitleCache = new Map();

    const initialPct = Math.floor((done / totalChunks) * 100);
    if (callbacks.onProgress) callbacks.onProgress(initialPct);
    if (callbacks.onProgressLabel) {
      callbacks.onProgressLabel(`Translating ${chapterItems.length} chapter(s) with ${Math.min(effectiveConcurrency, chapterItems.length)} parallel multi-key stream(s)${useContext ? ' (intra-chapter context)' : ''}...`);
    }

    // ── Earliest-Unattended In-Order Chunk Pipeline ──
    // Flatten all pending tasks (titles and chunks) across chapters in strict reading order.
    // Parallel workers continuously acquire the next available task in sequence,
    // ensuring zero stream idle time and strictly contiguous chapter completion.
    const chapterTrackers = new Map();
    const allTasks = [];

    for (const { ch, idx: i } of chapterItems) {
      let rawTitle = ch?.title || '';
      const hasCjk = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(rawTitle);
      const isTitleAlreadyTranslated = Boolean(resume && newChapters[i]?.title && !hasCjk);
      const chunks = ch?.chunks || [];

      let cachedT = '';
      if (rawTitle && translatedTitleCache.has(rawTitle)) {
        cachedT = translatedTitleCache.get(rawTitle);
      } else if (!hasCjk && rawTitle) {
        cachedT = rawTitle.trim();
        translatedTitleCache.set(rawTitle, cachedT);
      }

      const needsTitleTask = Boolean(rawTitle && hasCjk && !isTitleAlreadyTranslated && !cachedT);

      const tracker = {
        idx: i,
        ch,
        title: cachedT || (isTitleAlreadyTranslated ? newChapters[i].title : (rawTitle || `Chapter ${i + 1}`)),
        origTitle: chapters[i]?.originalTitle || chapters[i]?.title || ch?.title || `Chapter ${i + 1}`,
        needsTitleTask,
        titleDone: !needsTitleTask,
        totalChunks: Math.max(1, chunks.length),
        completedChunks: 0,
        parts: new Array(Math.max(1, chunks.length)),
        isFinalized: false,
        chapterCtx: ''
      };
      chapterTrackers.set(i, tracker);

      if (needsTitleTask) {
        allTasks.push({
          type: 'title',
          chapterIdx: i,
          text: rawTitle,
          origTitle: tracker.origTitle
        });
      }

      for (let j = 0; j < chunks.length; j++) {
        allTasks.push({
          type: 'chunk',
          chapterIdx: i,
          chunkIdx: j,
          totalChunks: chunks.length,
          text: chunks[j].text,
          ch
        });
      }
    }

    const finalizeChapter = async (tracker) => {
      if (tracker.isFinalized) return;
      tracker.isFinalized = true;

      const i = tracker.idx;
      const ch = tracker.ch;
      const title = tracker.title || tracker.origTitle || `Chapter ${i + 1}`;
      const rawCombined = tracker.parts.filter(Boolean).join('\n\n');
      let content = safeCleanNovelProse(safeStripContextLeak(rawCombined).replace(/\r\n/g, '\n')).trim();
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && title) {
        content = stripFn(content, title, chapters[i]?.title);
      }

      // Anti-MTL Quality Gate & Proofreader Check (§7.5 + §5.9)
      if (config.antiMtlGateEnabled && typeof window !== 'undefined' && window.QAEngine && content) {
        const refCheck = window.QAEngine.checkMtlRefusal(content);
        const loopCheck = window.QAEngine.checkRepetitionLoop(content);
        window.telemetryLog?.('ANTI_MTL', `Chapter ${i + 1} quality audit: ${refCheck.hasRefusal ? `Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `Loop [${loopCheck.phrase}]` : 'Clean Pass'}`, {
          chapterIndex: i + 1,
          hasRefusal: refCheck.hasRefusal,
          refusalPattern: refCheck.patternName || null,
          hasLoop: loopCheck.hasLoop,
          loopPhrase: loopCheck.phrase || null
        });
      }

      let docHtml = null;
      if (isEpub && ch?.doc) {
        if (title && ch.doc.querySelector('title')) ch.doc.querySelector('title').textContent = title;
        if (config.domNodeTranslation && ch.doc.body) {
          const textNodes = extractTextNodes(ch.doc.body);
          if (textNodes.length > 0) {
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (let nodeIdx = 0; nodeIdx < textNodes.length && nodeIdx < lines.length; nodeIdx++) {
              textNodes[nodeIdx].nodeValue = lines[nodeIdx];
            }
          }
        } else {
          const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const titleHeading = (title && !isGenericTitle(title)) ? `<h2>${escapeXml(title)}</h2>\n` : '';
            const fmtFn = (typeof window !== 'undefined' && window.smartFormat) ? window.smartFormat : escapeXml;
            const bodyParagraphs = lines.map(line => {
              if (/^(\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(line)) {
                return `<p class="divider">${escapeXml(line)}</p>`;
              }
              return `<p>${fmtFn(line)}</p>`;
            }).join('\n');
            ch.doc.body.innerHTML = `${titleHeading}${bodyParagraphs}`;
          }
        }
        docHtml = ch.doc.documentElement.outerHTML;
        if (originalZip && ch.zipPath) originalZip.file(ch.zipPath, docHtml);
      }

      // Translation Revision Snapshot (§8.6)
      if (config.snapshotsEnabled && typeof window !== 'undefined' && window.TMDiffEngine && content) {
        const novelKey = (config.activeNovelRecord && config.activeNovelRecord.id) || (config.fileName && config.fileName.trim()) || 'active_doc';
        window.TMDiffEngine.Snapshots.createSnapshot({
          novelId: novelKey,
          chapterIdx: i,
          chapterTitle: title,
          text: content,
          model: config.model || 'Gemini'
        }).catch(() => {});
      }

      newChapters[i] = { originalTitle: tracker.origTitle, title, content, zipPath: ch?.zipPath, docHtml, isTranslated: true };
      allParts[i] = `${title}\n\n${content}`;

      if (callbacks.onChapterComplete) {
        callbacks.onChapterComplete(i, newChapters[i], [...newChapters], allParts);
      }
      await saveState(tracker.chapterCtx || '', done, i + 1, 0, allParts, newChapters);
    };

    let batchResults = [];
    try {
      batchResults = await batchParallel(allTasks, async (task, taskIdx, workerId = 0) => {
        const workerKey = availableKeys.length > 0 ? availableKeys[workerId % availableKeys.length].key : opts.apiKey;
        const workerOpts = { ...opts, apiKey: workerKey, availableKeys, isParallelWorker: effectiveConcurrency > 1 };
        const tracker = chapterTrackers.get(task.chapterIdx);

        if (task.type === 'title') {
          try {
            const titleWorkerOpts = {
              ...workerOpts,
              context: undefined,
              needContextUpdate: false,
              glossary: '',
              smartGlossary: false,
              instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
            };
            const tRes = await safeTranslateWithRotation(task.text, titleWorkerOpts);
            const trans = (tRes && typeof tRes === 'object') ? (tRes.text || '') : (typeof tRes === 'string' ? tRes : '');
            if (trans && trans.trim()) {
              const cleanT = (typeof window !== 'undefined' && window.sanitizeChapterTitle) ? window.sanitizeChapterTitle(trans.trim()) : trans.trim();
              translatedTitleCache.set(task.text, cleanT);
              tracker.title = cleanT;
            }
            if (tRes?.usage) {
              totalPromptTokens += tRes.usage.promptTokens || 0;
              totalOutputTokens += tRes.usage.outputTokens || 0;
              totalTokensUsed += tRes.usage.totalTokens || 0;
            }
          } catch (tErr) {
            console.warn('Title translation failed, keeping original title for now:', tErr.message);
          }
          tracker.titleDone = true;
          done++;
          const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
          if (callbacks.onProgress) callbacks.onProgress(curPct);
          if (tracker.completedChunks >= tracker.totalChunks && !tracker.isFinalized) {
            await finalizeChapter(tracker);
          }
          return { text: tracker.title };
        }

        // Chunk Task
        const i = task.chapterIdx;
        const j = task.chunkIdx;
        const totalChChunks = task.totalChunks;
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Chapter ${i + 1}/${chapters.length} (part ${j + 1}/${totalChChunks})...`);
        }
        if (typeof window !== 'undefined' && window.AppLogger) {
          window.AppLogger.log('info', 'Translator', `Translating Chapter ${i + 1}/${chapters.length} · Chunk ${j + 1}/${totalChChunks} (${task.text.length} chars)`);
        }

        let translatedText = '';
        try {
          const translated = await safeTranslateWithRotation(task.text, workerOpts);
          translatedText = (translated && typeof translated === 'object') ? (translated.text || '') : (typeof translated === 'string' ? translated : '');
          if (typeof window !== 'undefined' && window.AppLogger) {
            window.AppLogger.log('info', 'Translator', `Completed Chapter ${i + 1} Chunk ${j + 1}/${totalChChunks} (${translatedText.length} chars output)`);
          }
          if (translated?.usage) {
            totalPromptTokens += translated.usage.promptTokens || 0;
            totalOutputTokens += translated.usage.outputTokens || 0;
            totalTokensUsed += translated.usage.totalTokens || 0;
          }
        } catch (e) {
          if (e.name === 'AbortError' || opts?.signal?.aborted) throw e;
          if (typeof window !== 'undefined' && window.AppLogger) {
            window.AppLogger.log('error', 'Translator', `Chapter ${i + 1} Chunk ${j + 1}/${totalChChunks} failed: ${e.message}`);
          }
          const msg = e.message || '';
          if (msg.includes('429') || msg.includes('quota') || msg.includes('billing')) {
            throw new Error(`API Quota exhausted across keys. Switch model to Gemini 3.5 Flash Lite in Settings · Engine. Progress saved at chapter ${i + 1}.`);
          }
          if (msg.includes('403') || msg.includes('denied access') || msg.includes('PERMISSION_DENIED')) {
            throw new Error(`Gemini Key Denied (403): Google blocked access to this project/key. Add a fresh key in Settings · Engine and tap Resume. Progress saved at chapter ${i + 1}.`);
          }
          if (opts?.strictModel) {
            throw new Error(`Strict Model: Failed translating chunk ${j + 1}/${totalChChunks} of Ch. ${i + 1}: ${msg}. Progress saved.`);
          }
          translatedText = `\n\n[Error: ${e.message}]\n\n`;
        }

        tracker.parts[j] = translatedText;
        tracker.completedChunks++;

        done++;
        const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
        if (callbacks.onProgress) callbacks.onProgress(curPct);

        const nowTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (nowTime - lastUiAssembledUpdate > 2500) {
          lastUiAssembledUpdate = nowTime;
          const liveText = allParts.filter(Boolean).join('\n\n\n').trim();
          if (callbacks.onLiveTextUpdate) callbacks.onLiveTextUpdate(liveText);
        }

        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.showProgressNotification?.(
            `Gemini Translator (${curPct}%)`,
            `Ch. ${i + 1}/${chapters.length} (part ${j + 1}/${totalChChunks})`,
            curPct,
            true
          );
        }

        if (tracker.completedChunks >= tracker.totalChunks && tracker.titleDone && !tracker.isFinalized) {
          await finalizeChapter(tracker);
        }

        return { text: translatedText };
      }, effectiveConcurrency, opts.signal);
    } catch (batchErr) {
      if (batchErr.name !== 'AbortError' && !opts.signal?.aborted) throw batchErr;
      console.log('[translateEbook] Stopped early by user. Staging and retaining all completed chapters...');
    }

    const failedChapterItems = (batchResults || []).filter(r => r && r.error);
    if (failedChapterItems.length > 0 && opts?.strictModel) {
      throw new Error(`Strict Model: ${failedChapterItems.length} chapter(s) encountered an issue ("${failedChapterItems[0].error || 'error'}"). Progress safely saved. Tap Resume to continue.`);
    }

    // Title Healing Pass: Ensure zero chapters are left with raw untranslated CJK titles
    const hasCjkTitle = s => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(s || '');
    const untranslatedTitles = newChapters
      .map((nc, idx) => ({ nc, idx }))
      .filter(({ nc }) => nc && hasCjkTitle(nc.title));

    if (untranslatedTitles.length > 0 && !opts.signal?.aborted) {
      console.log(`[Title Healing] Found ${untranslatedTitles.length} untranslated title(s). Running healing pass...`);
      for (let hIdx = 0; hIdx < untranslatedTitles.length; hIdx++) {
        const { nc, idx } = untranslatedTitles[hIdx];
        if (opts.signal?.aborted) break;
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Healing untranslated title ${hIdx + 1}/${untranslatedTitles.length}...`);
        }
        try {
          const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('Title healing timeout')), 12000));
          const titlePromise = safeTranslateWithRotation(nc.title, {
            ...opts,
            context: undefined,
            needContextUpdate: false,
            glossary: '',
            smartGlossary: false,
            instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
          });
          const hRes = await Promise.race([titlePromise, timeoutPromise]);
          const hTrans = (hRes && typeof hRes === 'object') ? (hRes.text || '') : (typeof hRes === 'string' ? hRes : '');
          if (hTrans && hTrans.trim()) {
            nc.title = hTrans.trim();
            allParts[idx] = `${nc.title}\n\n${nc.content}`;
          }
        } catch (hErr) {
          console.warn(`[Title Healing] Skipped Ch. ${idx + 1}:`, hErr.message);
        }
      }
    }

    const final = safeStripContextLeak(allParts.join('\n\n\n')).trim();
    const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    const durationStr = formatDuration(elapsedMs);
    const totalToks = totalTokensUsed || (totalPromptTokens + totalOutputTokens);
    const tokPerSec = elapsedMs > 0 && totalToks ? Math.round((totalToks / (elapsedMs / 1000))) : 0;

    const activeM = provider === 'deepseek'
      ? (config.useCustomDeepseekModel && config.customDeepseekModel ? config.customDeepseekModel : config.deepseekModel)
      : (config.useCustomModel && config.customModel ? config.customModel : (config.geminiModel || config.model || opts.model));
    const finalCost = calculateRealCost(totalPromptTokens, totalOutputTokens, activeM, provider);
    const finalBreakdown = totalPromptTokens > 0 ? {
      sourceTokens: accumulatedBreakdown.sourceTokens,
      glossaryTokens: accumulatedBreakdown.glossaryTokens,
      genderTokens: accumulatedBreakdown.genderTokens,
      contextTokens: accumulatedBreakdown.contextTokens,
      systemTokens: accumulatedBreakdown.systemTokens,
      sourcePct: ((accumulatedBreakdown.sourceTokens / totalPromptTokens) * 100).toFixed(1),
      glossaryPct: ((accumulatedBreakdown.glossaryTokens / totalPromptTokens) * 100).toFixed(1),
      genderPct: ((accumulatedBreakdown.genderTokens / totalPromptTokens) * 100).toFixed(1),
      contextPct: ((accumulatedBreakdown.contextTokens / totalPromptTokens) * 100).toFixed(1),
      systemPct: ((accumulatedBreakdown.systemTokens / totalPromptTokens) * 100).toFixed(1)
    } : null;

    const stats = {
      promptTokens: totalPromptTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalToks,
      cost: finalCost,
      duration: durationStr,
      durationMs: elapsedMs,
      speed: tokPerSec ? `${tokPerSec} tok/s` : '',
      model: activeM,
      provider,
      enableStreaming: Boolean(config.enableStreaming),
      enableThinking: Boolean(config.enableThinking),
      strictModel: Boolean(config.strictModel),
      contextAware: Boolean(config.contextAware),
      concurrency: Number(config.concurrency || 1),
      chunkSizePreset: String(config.chunkSizePreset || 'turbo'),
      smartGlossary: Boolean(config.smartGlossary),
      glossaryTermCount: Number(config.glossaryTermCount || 0),
      hasGlossary: Boolean(config.terminology && config.terminology.trim()),
      hasInstructions: Boolean(config.customInstructions && config.customInstructions.trim()),
      breakdown: finalBreakdown
    };

    return {
      translatedChapters: newChapters,
      assembledText: final,
      allParts,
      lastUsageStats: stats,
      totalTokensUsed: totalToks
    };
  }

  /**
   * Translates an individual novel or chapter title accurately into English.
   */
  async function translateChapterTitle({
    rawTitle = '',
    opts = {},
    config = {},
    callbacks = {}
  } = {}) {
    if (!rawTitle || !rawTitle.trim()) return '';
    const cleanFn = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
      ? window.cleanRawChapterTitle
      : ((typeof cleanRawChapterTitle === 'function') ? cleanRawChapterTitle : (s => s ? s.trim() : ''));
    const preCleaned = cleanFn(rawTitle) || rawTitle.trim();

    const prefixMatch = preCleaned.match(/^((?:#\s*\d+|第\s*\d+\s*[話章回集節部]?|Chapter\s*\d+|Episode\s*\d+|Part\s*\d+|\d+[\.:])\s*[-–—:\s]*)/i);
    const cleanPrefix = prefixMatch ? prefixMatch[1] : '';
    const coreToTranslate = cleanPrefix ? preCleaned.slice(cleanPrefix.length).trim() : preCleaned;

    const hasForeignChars = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff]/.test(coreToTranslate);
    if (!hasForeignChars && coreToTranslate) {
      return preCleaned;
    }

    const storedProvider = (typeof localStorage !== 'undefined' ? (localStorage.getItem('translation_provider') || localStorage.getItem('provider')) : null) || 'gemini';
    const provider = config.provider || opts.provider || storedProvider;
    let apiKeysByProvider = config.apiKeysByProvider;
    if (!apiKeysByProvider && typeof localStorage !== 'undefined') {
      try {
        apiKeysByProvider = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
      } catch (_) {
        apiKeysByProvider = {};
      }
    }
    const rawKeys = (apiKeysByProvider && apiKeysByProvider[provider]) || [];
    const availableKeys = rawKeys.filter(k => k && (typeof k === 'string' ? k.trim() : (k.key && k.key.trim())));
    const activeKey = opts.apiKey ||
      (provider === 'deepseek'
        ? (opts.deepseekApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('deepseekApiKey') : null))
        : (opts.geminiApiKey || (typeof localStorage !== 'undefined' ? (localStorage.getItem('geminiApiKey') || localStorage.getItem('apiKey')) : null))) ||
      (availableKeys.length > 0 ? (typeof availableKeys[0] === 'string' ? availableKeys[0] : availableKeys[0].key) : null);

    const fallbackModel = (typeof window !== 'undefined' && window.getProviderFallbackModel) ? window.getProviderFallbackModel(provider) : (provider === 'deepseek' ? 'deepseek-chat' : 'gemini-3.8-flash');
    const storedModel = (typeof localStorage !== 'undefined' ? (provider === 'deepseek' ? localStorage.getItem('deepseekModel') : localStorage.getItem('geminiModel')) : null);
    const activeModel = opts.model || (provider === 'deepseek'
      ? (config.useCustomDeepseekModel && config.customDeepseekModel ? config.customDeepseekModel : (config.deepseekModel || storedModel || 'deepseek-chat'))
      : (config.useCustomModel && config.customModel ? config.customModel : (config.geminiModel || storedModel || fallbackModel)));

    const targetLanguage = opts.tgtLang || config.tgtLang || 'English';
    const textToTranslate = coreToTranslate || preCleaned;

    const workerOpts = {
      ...opts,
      provider,
      apiKey: activeKey,
      model: activeModel,
      availableKeys,
      context: undefined,
      needContextUpdate: false,
      glossary: '',
      smartGlossary: false,
      instructions: `Translate this novel chapter title accurately and concisely into ${targetLanguage}. Maintain formal title casing. Output ONLY the translated title, without quotes, markdown, brackets or notes.`
    };
    if (callbacks && typeof callbacks.onProgress === 'function') callbacks.onProgress(10, 'Translating chapter title…');
    try {
      const tRes = await safeTranslateWithRotation(textToTranslate, workerOpts);
      const trans = (tRes && typeof tRes === 'object') ? (tRes.text || '') : (typeof tRes === 'string' ? tRes : '');
      if (trans && trans.trim() && !trans.trim().startsWith('[Error:')) {
        let cleanT = cleanFn(trans.trim());
        if (typeof window !== 'undefined' && window.sanitizeChapterTitle) {
          cleanT = window.sanitizeChapterTitle(cleanT);
        }
        if (cleanPrefix) {
          let formattedPrefix = cleanPrefix;
          const cjkChapMatch = cleanPrefix.match(/^第\s*(\d+)\s*[話章回集節部]?\s*[-–—:\s]*/);
          if (cjkChapMatch && targetLanguage.toLowerCase().startsWith('eng')) {
            formattedPrefix = `Chapter ${cjkChapMatch[1]}: `;
          }
          if (!cleanT.toLowerCase().startsWith(cleanPrefix.trim().toLowerCase()) &&
              !cleanT.toLowerCase().startsWith('chapter') &&
              !cleanT.toLowerCase().startsWith('#')) {
            cleanT = `${formattedPrefix}${cleanT}`;
          }
        }
        if (callbacks && typeof callbacks.onProgress === 'function') callbacks.onProgress(100, 'Title translated!');
        return cleanT;
      }
    } catch (err) {
      console.warn('[translateChapterTitle] Translation call error:', err);
      if (typeof window !== 'undefined' && window.AppLogger) {
        window.AppLogger.log('warn', 'Translator', `Chapter title translation failed for "${rawTitle}": ${err.message}`);
      }
    }
    return preCleaned;
  }

  /**
   * Translates an individual chapter on demand using active Translator settings.
   */
  async function translateSingleChapter({
    chapterIdx = 0,
    rawTitle = '',
    rawText = '',
    opts = {},
    config = {},
    callbacks = {},
    titleOnly = false
  }) {
    if (titleOnly) {
      const translatedTitle = await translateChapterTitle({ rawTitle, opts, config, callbacks });
      return {
        title: translatedTitle || rawTitle,
        content: rawText,
        isTranslated: true,
        titleOnly: true
      };
    }

    if (!rawText || !rawText.trim()) {
      throw new Error('No chapter text provided for translation.');
    }

    const provider = config.provider || 'gemini';
    const effectiveTerm = config.enableGlossary ? (config.terminology || '') : '';
    const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
    let cleanSourceText = rawText;
    if (typeof stripFn === 'function' && rawTitle) {
      cleanSourceText = stripFn(cleanSourceText, rawTitle);
    }

    const chunks = splitChunks(cleanSourceText, effectiveTerm.length, config.smartGlossary !== false, config.chunkSizePreset);
    if (chunks.length === 0) chunks.push(cleanSourceText);

    const apiKeysByProvider = config.apiKeysByProvider || {};
    const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
    const workerOpts = { ...opts, availableKeys };

    // 1. Translate Title (if CJK or non-English)
    let finalTitle = rawTitle;
    if (rawTitle && rawTitle.trim()) {
      try {
        if (callbacks.onProgress) callbacks.onProgress(5, 'Translating chapter title…');
        finalTitle = await translateChapterTitle({
          rawTitle,
          opts: workerOpts,
          config,
          callbacks
        });
      } catch (tErr) {
        console.warn('Single chapter title translation error:', tErr);
      }
    }

    // 2. Translate Chunks
    const parts = [];
    let chapterCtx = '';
    const useContext = Boolean(config.contextAware && (provider === 'gemini' || provider === 'deepseek'));
    const effectiveConcurrency = (!useContext && chunks.length > 1)
      ? Math.max(1, Math.min(Number(config.concurrency || 3), availableKeys.length || 3))
      : 1;

    let interrupted = false;
    if (effectiveConcurrency > 1) {
      let completedCount = 0;
      const parallelParts = new Array(chunks.length);
      await batchParallel(chunks, async (chunk, j, workerId) => {
        if (config.pauseGate && typeof config.pauseGate.checkPause === 'function') {
          await config.pauseGate.checkPause();
        }
        if (workerOpts.signal && workerOpts.signal.aborted) {
          interrupted = true;
          return;
        }
        const workerKey = availableKeys.length > 0 ? (typeof availableKeys[workerId % availableKeys.length] === 'string' ? availableKeys[workerId % availableKeys.length] : (availableKeys[workerId % availableKeys.length].key || opts.apiKey)) : opts.apiKey;
        try {
          const translated = await safeTranslateWithRotation(chunk, {
            ...workerOpts,
            apiKey: workerKey,
            onStreamChunk: (token) => {
              if (typeof callbacks.onStreamChunk === 'function') {
                callbacks.onStreamChunk({ chunkIdx: j, totalChunks: chunks.length, token });
              }
            }
          });
          const translatedText = (translated && typeof translated === 'object') ? (translated.text || '') : (typeof translated === 'string' ? translated : '');
          parallelParts[j] = translatedText;
        } catch (chunkErr) {
          if (workerOpts.signal && workerOpts.signal.aborted) {
            interrupted = true;
            return;
          }
          throw chunkErr;
        }
        completedCount++;
        const pct = Math.round(10 + ((completedCount / chunks.length) * 85));
        if (callbacks.onProgress) {
          callbacks.onProgress(pct, `Translating chunk ${completedCount}/${chunks.length} (${pct}%)…`);
        }
      }, effectiveConcurrency, workerOpts.signal);

      for (let j = 0; j < chunks.length; j++) {
        parts.push(parallelParts[j] || chunks[j]);
      }
    } else {
      for (let j = 0; j < chunks.length; j++) {
        if (config.pauseGate && typeof config.pauseGate.checkPause === 'function') {
          await config.pauseGate.checkPause();
        }
        if (workerOpts.signal && workerOpts.signal.aborted) {
          interrupted = true;
          break;
        }
        const pct = Math.round(10 + ((j / chunks.length) * 85));
        if (callbacks.onProgress) {
          callbacks.onProgress(pct, `Translating chunk ${j + 1}/${chunks.length}${chunks.length > 1 ? ` (${pct}%)` : ''}…`);
        }

        const isLastChunk = j === chunks.length - 1;
        const hasIncomingContext = Boolean(chapterCtx && chapterCtx.trim());
        const shouldPassContext = useContext && (hasIncomingContext || j > 0);
        const shouldRequestUpdate = useContext && !isLastChunk;

        let translated = null;
        try {
          translated = await safeTranslateWithRotation(chunks[j], {
            ...workerOpts,
            context: shouldPassContext ? chapterCtx : undefined,
            needContextUpdate: shouldRequestUpdate,
            onStreamChunk: (token) => {
              if (typeof callbacks.onStreamChunk === 'function') {
                callbacks.onStreamChunk({ chunkIdx: j, totalChunks: chunks.length, token });
              }
            }
          });
        } catch (chunkErr) {
          if (workerOpts.signal && workerOpts.signal.aborted) {
            interrupted = true;
            break;
          }
          throw chunkErr;
        }

        const translatedText = (translated && typeof translated === 'object') ? (translated.text || '') : (typeof translated === 'string' ? translated : '');
        if (useContext && translated?.newContext) {
          chapterCtx = translated.newContext;
        }
        parts.push(translatedText);
      }
    }

    // Anti-truncation safeguard: if aborted mid-chapter, merge remaining raw chunks so no chapter prose is lost
    if (interrupted || parts.length < chunks.length) {
      for (let r = parts.length; r < chunks.length; r++) {
        parts.push(chunks[r]);
      }
    }

    let content = safeCleanNovelProse(safeStripContextLeak(parts.join('\n\n')).replace(/\r\n/g, '\n')).trim();
    if (typeof stripFn === 'function' && finalTitle) {
      content = stripFn(content, finalTitle, rawTitle);
    }

    // Anti-MTL Quality Gate & Proofreader Check
    if (config.antiMtlGateEnabled && typeof window !== 'undefined' && window.QAEngine && content) {
      const refCheck = window.QAEngine.checkMtlRefusal(content);
      const loopCheck = window.QAEngine.checkRepetitionLoop(content);
      if (refCheck.hasRefusal && callbacks.onToast) {
        callbacks.onToast(`Anti-MTL Gate: ${refCheck.patternName} detected in translation`, 'warning');
      } else if (loopCheck.hasLoop && callbacks.onToast) {
        callbacks.onToast(`QA Proofreader: Repetition loop detected`, 'warning');
      }
    }

    // Translation Revision Snapshot
    if (config.snapshotsEnabled && typeof window !== 'undefined' && window.TMDiffEngine && content) {
      const novelKey = (config.activeNovelRecord && config.activeNovelRecord.id) || (config.fileName && config.fileName.trim()) || 'active_doc';
      window.TMDiffEngine.Snapshots.createSnapshot({
        novelId: novelKey,
        chapterIdx,
        chapterTitle: finalTitle || `Chapter ${chapterIdx + 1}`,
        text: content,
        model: workerOpts?.model || config.model || 'Gemini'
      }).catch(e => console.warn('[Snapshots] Auto-save error:', e));
    }

    if (callbacks.onProgress) callbacks.onProgress(100, 'Chapter translated!');

    return {
      title: finalTitle,
      content,
      isTranslated: true
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Controller: Execution Orchestration, Session State & Library Staging
  // ═══════════════════════════════════════════════════════════════

  /**
   * Builds normalized options for translation dispatcher.
   */
  function buildTranslateOpts(options = {}) {
    const provider = options.provider || 'gemini';
    const deepseekKey = options.deepseekKey || '';
    const geminiKey = options.geminiKey || options.apiKey || '';
    const deeplKey = options.deeplKey || '';
    const apiKey = options.apiKey || (provider === 'deepseek' ? deepseekKey : geminiKey);

    let model = options.model;
    if (!model) {
      if (provider === 'deepseek') {
        model = (options.useCustomDeepseekModel && options.customDeepseekModel)
          ? options.customDeepseekModel
          : (options.deepseekModel || 'deepseek-chat');
      } else {
        model = (options.useCustomModel && options.customModel)
          ? options.customModel
          : (options.geminiModel || (typeof localStorage !== 'undefined' ? localStorage.getItem('geminiModel') : null) || 'gemini-3.7-flash');
      }
    }

    let strictModel = options.strictModel;
    if (strictModel === undefined) {
      if (typeof localStorage !== 'undefined') {
        try {
          strictModel = localStorage.getItem('strictModel') !== 'false';
        } catch (_) {
          strictModel = true;
        }
      } else {
        strictModel = true;
      }
    }

    const baseLocks = options.genderLocks || {};
    const activeViewLocks = (options.activeNovelView && options.activeNovelView.genderLocks) || {};
    const genderLocks = (options.activeNovelView && options.activeNovelView.genderLocks)
      ? { ...baseLocks, ...activeViewLocks }
      : baseLocks;

    let availableKeys = Array.isArray(options.availableKeys) ? [...options.availableKeys] : [];
    if (availableKeys.length === 0) {
      const provKeys = (options.apiKeysByProvider && options.apiKeysByProvider[provider]) || null;
      if (Array.isArray(provKeys) && provKeys.length > 0) {
        availableKeys = provKeys;
      } else if (typeof window !== 'undefined' && window.apiKeysByProvider && Array.isArray(window.apiKeysByProvider[provider])) {
        availableKeys = window.apiKeysByProvider[provider];
      } else if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('apiKeysByProvider');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed[provider])) availableKeys = parsed[provider];
          }
        } catch (_) {}
      }
    }
    availableKeys = availableKeys.filter(k => k && (typeof k === 'string' ? k.trim() : (k.key && k.key.trim())));

    return {
      apiKey,
      availableKeys,
      rotateApiKey: options.rotateApiKey,
      deepseekApiKey: deepseekKey,
      deeplApiKey: deeplKey,
      model,
      srcLang: options.srcLang,
      tgtLang: options.tgtLang,
      glossary: options.glossary || options.terminology || '',
      instructions: options.instructions || options.customInstructions || '',
      genderLocks,
      smartGlossary: options.smartGlossary !== false,
      epubSmartQuotes: Boolean(options.epubSmartQuotes),
      epubCleanWebArtifacts: Boolean(options.epubCleanWebArtifacts),
      enableThinking: Boolean(options.enableThinking),
      strictModel: Boolean(strictModel),
      signal: options.signal || null,
      provider,
      libreUrl: options.libreUrl || ''
    };
  }

  /**
   * Builds normalized configuration for translation dispatcher.
   */
  function buildTranslationConfig(options = {}) {
    let strictModel = options.strictModel;
    if (strictModel === undefined) {
      if (typeof localStorage !== 'undefined') {
        try {
          strictModel = localStorage.getItem('strictModel') !== 'false';
        } catch (_) {
          strictModel = true;
        }
      } else {
        strictModel = true;
      }
    }

    return {
      provider: options.provider || 'gemini',
      enableStreaming: Boolean(options.enableStreaming),
      enableThinking: Boolean(options.enableThinking),
      strictModel: Boolean(strictModel),
      contextAware: Boolean(options.contextAware),
      concurrency: Number(options.concurrency) || (typeof localStorage !== 'undefined' ? parseInt(localStorage.getItem('gemini_concurrency') || localStorage.getItem('concurrency') || '3', 10) : 3),
      chunkSizePreset: options.chunkSizePreset || (typeof localStorage !== 'undefined' ? (localStorage.getItem('gemini_chunk_size') || localStorage.getItem('chunkSizePreset') || 'turbo') : 'turbo'),
      smartGlossary: options.smartGlossary !== false,
      enableGlossary: options.enableGlossary !== false,
      terminology: options.terminology || options.glossary || '',
      glossaryTermCount: options.glossaryTermCount || 0,
      customInstructions: options.customInstructions || options.instructions || '',
      antiMtlGateEnabled: Boolean(options.antiMtlGateEnabled),
      snapshotsEnabled: Boolean(options.snapshotsEnabled),
      fileName: options.fileName || '',
      activeNovelRecord: options.activeNovelRecord || null,
      apiKeysByProvider: options.apiKeysByProvider || null,
      model: options.model || '',
      geminiModel: options.geminiModel || '',
      customModel: options.customModel || '',
      useCustomModel: Boolean(options.useCustomModel),
      deepseekModel: options.deepseekModel || '',
      customDeepseekModel: options.customDeepseekModel || '',
      useCustomDeepseekModel: Boolean(options.useCustomDeepseekModel),
      jobId: options.jobId || '',
      bookTitle: options.bookTitle || '',
      fileHash: options.fileHash || options.currentFileHash || '',
      translationMemoryEnabled: Boolean(options.translationMemoryEnabled),
      cover: options.cover || options.currentDocCover || (options.activeNovelRecord && options.activeNovelRecord.cover) || '',
      currentDocCover: options.currentDocCover || ''
    };
  }

  /**
   * Pauses an active translation, synthesizes session if needed, and persists state to GeminiNovelDB.
   */
  async function pauseTranslation(params = {}) {
    if (params.isPausingRef) params.isPausingRef.current = true;
    if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
    if (params.abortRef && params.abortRef.current) {
      try { params.abortRef.current.abort(); } catch (_) {}
    }

    let session = (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
    if (!session && typeof window !== 'undefined' && window.GeminiNovelDB) {
      try {
        session = await window.GeminiNovelDB.getActiveTranslationSession();
      } catch (_) {}
    }

    // Fallback: If still no session, synthesize one from current state so Resume is GUARANTEED to exist
    if (!session) {
      const chapters = params.chapters || [];
      const translatedChapters = params.translatedChapters || [];
      const fileName = params.fileName || '';
      const activeNovelRecord = params.activeNovelRecord || null;
      const currentFileHash = params.currentFileHash || '';
      const currentIsEpub = Boolean(params.currentIsEpub);
      const currentDocCover = params.currentDocCover || '';
      const inputText = params.inputText || '';
      const assembledText = params.assembledText || '';

      if (chapters && chapters.length > 0) {
        const bTitle = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || (chapters[0] && chapters[0]?.title) || 'Web Novel';
        const jId = currentFileHash || ('job_' + String(bTitle).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + chapters.length);
        const compCount = translatedChapters.filter(c => c && (c.content || c.text)).length;
        session = {
          id: jId,
          type: 'ebook',
          title: bTitle,
          ctx: '',
          completedCount: compCount,
          currentChapterIdx: compCount,
          currentChunkIdx: 0,
          allParts: translatedChapters.map(c => c ? `${c.title || ''}\n\n${c.content || c.text || ''}` : ''),
          newChapters: translatedChapters,
          totalChunks: chapters.length,
          chapters: chapters.map((c, i) => ({ title: c?.title || `Chapter ${i + 1}`, text: c?.text || c?.content || '' })),
          isEpub: currentIsEpub,
          cover: currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || '',
          novelRecord: activeNovelRecord || null,
          timestamp: Date.now()
        };
      } else if (inputText.trim()) {
        const jId = generateJobId(inputText);
        session = {
          id: jId,
          type: 'text',
          title: 'Text Translation',
          result: assembledText,
          ctx: '',
          completedCount: assembledText ? 1 : 0,
          total: 1,
          cover: currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || '',
          novelRecord: activeNovelRecord || null,
          timestamp: Date.now()
        };
      }
    }

    if (session) {
      const cover = params.currentDocCover || (params.activeNovelRecord && params.activeNovelRecord.cover) || '';
      if (!session.cover && cover) {
        session.cover = cover;
      }
      if (!session.novelRecord && params.activeNovelRecord) {
        session.novelRecord = params.activeNovelRecord;
      }
      if (params.activeSessionRef) params.activeSessionRef.current = session;
      if (params.setActiveSession) params.setActiveSession(session);
      if (params.setSavedTranslationSession) params.setSavedTranslationSession(session);
      if (typeof window !== 'undefined' && window.GeminiNovelDB) {
        window.GeminiNovelDB.saveTranslationSession(session).catch(() => {});
      }
    }

    if (typeof window !== 'undefined' && window.KeyPool?.clearCooldowns) {
      window.KeyPool.clearCooldowns();
    }

    if (typeof window !== 'undefined' && window.NativeBridge) {
      window.NativeBridge.clearProgressNotification?.(false);
      window.NativeBridge.showCompletionNotification?.('Translation Paused', 'Translation paused. Progress safely saved.');
    }
    if (typeof params.toast === 'function') {
      params.toast('Translation paused. All progress safely saved to database.', 'info');
    }
    return session;
  }

  /**
   * Resumes a paused translation session.
   */
  async function resumeTranslation(params = {}) {
    const s = params.session || params.savedTranslationSession || (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
    if (!s) {
      if (typeof params.toast === 'function') {
        params.toast('No saved translation session found.', 'warning');
      }
      return;
    }
    if (typeof params.toast === 'function') {
      params.toast(`Resuming translation (${s.completedCount || 0} done)...`, 'info');
    }
    if (params.activeSessionRef) params.activeSessionRef.current = s;
    if (params.setActiveSession) params.setActiveSession(s);
    if (params.setSavedTranslationSession) params.setSavedTranslationSession(s);
    if (params.setIsTranslationPaused) params.setIsTranslationPaused(false);
    if (params.isPausingRef) params.isPausingRef.current = false;
    if (s.cover && params.setCurrentDocCover) params.setCurrentDocCover(s.cover);
    if (s.novelRecord && params.setActiveNovelRecord) params.setActiveNovelRecord(s.novelRecord);
    if (s.title) {
      if (params.setFileName) params.setFileName(s.title);
      if (params.setCurrentDocTitle) params.setCurrentDocTitle(s.title);
    }
    if (params.setActiveTab) params.setActiveTab('text');

    const handleTranslateEbook = (params.handlers && params.handlers.handleTranslateEbook) || params.handleTranslateEbook;
    const handleTranslateText = (params.handlers && params.handlers.handleTranslateText) || params.handleTranslateText;

    if (s.type === 'ebook') {
      if (s.newChapters && s.newChapters.length > 0 && params.setTranslatedChapters) {
        params.setTranslatedChapters(s.newChapters);
      }
      if (s.allParts && s.allParts.length > 0 && params.setAssembledText) {
        params.setAssembledText(s.allParts.filter(Boolean).join('\n\n\n').trim());
      }
      const chs = (params.chapters && params.chapters.length > 0) ? params.chapters : (s.chapters || []);
      if (typeof handleTranslateEbook === 'function') {
        handleTranslateEbook(chs, true, s.isEpub);
      }
    } else {
      if (s.result && params.setAssembledText) params.setAssembledText(s.result);
      if (typeof handleTranslateText === 'function') {
        handleTranslateText(true);
      }
    }
  }

  /**
   * Discards a saved translation session from database and local storage.
   */
  async function discardSession(params = {}) {
    const sessionId = params.sessionId || (params.session && params.session.id);
    if (typeof window !== 'undefined' && window.GeminiNovelDB && sessionId) {
      await window.GeminiNovelDB.deleteTranslationSession(sessionId).catch(() => {});
    }
    if (sessionId && typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(sessionId); } catch (_) {}
    }
    if (params.activeSessionRef) params.activeSessionRef.current = null;
    if (params.setSavedTranslationSession) params.setSavedTranslationSession(null);
    if (params.setActiveSession) params.setActiveSession(null);
    if (params.setIsTranslationPaused) params.setIsTranslationPaused(false);
    if (typeof params.toast === 'function') {
      params.toast('Discarded saved translation session.', 'info');
    }
  }

  /**
   * Saves translated document/chapters to Saved Space in library history.
   */
  async function saveTranslationToLibrarySpace(params = {}) {
    const assembledText = params.assembledText || '';
    const toast = typeof params.toast === 'function' ? params.toast : (() => {});
    if (!assembledText.trim()) {
      toast('No translated text to save.', 'warning');
      return;
    }

    const fileName = params.fileName || '';
    const activeNovelRecord = params.activeNovelRecord || null;
    const currentDocTitle = params.currentDocTitle || '';
    const translatedChapters = params.translatedChapters || [];
    const chapters = params.chapters || [];
    const inputText = params.inputText || '';
    const parseFn = params.parseAssembledTextToChapters || (typeof window !== 'undefined' && window.ExportEngine && window.ExportEngine.parseAssembledTextToChapters) || (typeof window !== 'undefined' && window.parseAssembledTextToChapters);

    const title = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || (translatedChapters && translatedChapters[0]?.title && !isGenericTitle(translatedChapters[0].title) ? translatedChapters[0].title : 'Translated Document');
    const exportChs = (typeof parseFn === 'function' && assembledText.trim())
      ? parseFn(assembledText, title)
      : [];
    const chs = (exportChs.length > 0)
      ? exportChs.map((c, i) => ({
          idx: i,
          title: c?.title || `Chapter ${i + 1}`,
          text: c?.content || c?.text || '',
          content: c?.content || c?.text || '',
          words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
        }))
      : (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters.filter(Boolean).map((c, i) => ({
          idx: i,
          title: c?.title || `Chapter ${i + 1}`,
          text: c?.content || c?.text || '',
          content: c?.content || c?.text || '',
          words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
        }))
      : [{
          idx: 0,
          title: title,
          text: assembledText,
          content: assembledText,
          words: assembledText.split(/\s+/).filter(Boolean).length
        }];

    const origChs = (chapters && chapters.length > 0)
      ? chapters.filter(Boolean).map((c, i) => ({
          idx: i,
          title: c?.title || `Chapter ${i + 1}`,
          text: c?.content || c?.text || '',
          content: c?.content || c?.text || '',
          words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
        }))
      : (inputText.trim() ? [{
          idx: 0,
          title: title,
          text: inputText,
          content: inputText,
          words: inputText.split(/\s+/).filter(Boolean).length
        }] : []);

    const saveTitle = title.includes('(Translated)') ? title : `${title} (Translated)`;
    const baseTitle = normalizeTitleKey(title);
    const webImportHistory = params.webImportHistory || [];
    const webImportData = params.webImportData || null;
    const webImportUrl = params.webImportUrl || '';
    const matchingOriginal = webImportHistory.find(n => n && normalizeTitleKey(n?.title) === baseTitle);
    const resolvedCover = params.currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || (webImportData && webImportData.cover) || (matchingOriginal && matchingOriginal.cover) || '';
    const resolvedAuthor = (activeNovelRecord && activeNovelRecord.author) || (webImportData && webImportData.author) || (matchingOriginal && matchingOriginal.author) || 'Author';
    const resolvedSourceUrl = (activeNovelRecord && (activeNovelRecord.sourceUrl || activeNovelRecord.url)) ||
                              (webImportData && (webImportData.sourceUrl || webImportData.url)) ||
                              (webImportUrl ? webImportUrl : '') ||
                              (matchingOriginal && (matchingOriginal.sourceUrl || matchingOriginal.url)) || '';

    if (typeof params.saveNovelToHistory === 'function') {
      await params.saveNovelToHistory({
        title: saveTitle,
        author: resolvedAuthor,
        cover: resolvedCover,
        sourceUrl: resolvedSourceUrl,
        chapters: chs,
        rawChapters: chs,
        originalChapters: origChs,
        chapterCount: chs.length,
        totalChapterCount: chs.length,
        isTranslated: true,
        inSavedSpace: true,
        isIncomplete: false
      });
    }
    toast(`"${saveTitle}" saved to your Saved Space! ⭐`, 'success');
  }

  /**
   * Executes text translation cycle with wake-lock, notifications, abort coordination, and telemetry.
   */
  async function executeTranslateText(params = {}) {
    const inputText = params.inputText || '';
    const resume = Boolean(params.resume);
    const toast = typeof params.toast === 'function' ? params.toast : (() => {});

    if (!inputText.trim()) {
      if (params.setError) params.setError('Paste some text to translate.');
      return;
    }

    let wakeLock = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try { navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {}); } catch (_) {}
    }
    if (params.setIsTranslating) params.setIsTranslating(true);
    if (params.setProgress) params.setProgress(0);
    if (params.setProgressLabel) params.setProgressLabel(resume ? 'Resuming...' : 'Preparing...');
    if (params.setError) params.setError('');
    if (typeof window !== 'undefined' && window.NativeBridge) {
      window.NativeBridge.acquireWakeLock?.();
      window.NativeBridge.showProgressNotification?.('Gemini Translator', resume ? 'Resuming translation...' : 'Starting text translation...', 0);
    }
    if (!resume) {
      if (params.setAssembledText) params.setAssembledText('');
      if (params.setTranslatedChapters) params.setTranslatedChapters([]);
    }

    const ctrl = new AbortController();
    if (params.abortRef) params.abortRef.current = ctrl;
    const jobId = params.jobId || generateJobId(inputText);

    try {
      const opts = params.opts || (typeof params.getTranslateOpts === 'function' ? params.getTranslateOpts(ctrl.signal) : buildTranslateOpts({ ...params, signal: ctrl.signal }));
      const config = params.config || buildTranslationConfig({ ...params, jobId });

      const callbacks = {
        onProgress: (pct) => params.setProgress && params.setProgress(pct),
        onProgressLabel: (label) => params.setProgressLabel && params.setProgressLabel(label),
        onStream: (chunk, assembled) => params.setAssembledText && params.setAssembledText(assembled),
        onChunkDone: (info) => {
          if (info && info.assembledText && params.setAssembledText) params.setAssembledText(info.assembledText);
        },
        onSaveState: async (state) => {
          if (params.activeSessionRef) params.activeSessionRef.current = state;
          if (params.setActiveSession) params.setActiveSession(state);
          if (params.setSavedTranslationSession) params.setSavedTranslationSession(state);
          try {
            if (state.result && state.result.length < 2000000 && typeof localStorage !== 'undefined') {
              localStorage.setItem(jobId, JSON.stringify(state));
            }
          } catch (_) {}
          if (typeof window !== 'undefined' && window.GeminiNovelDB) {
            await window.GeminiNovelDB.saveTranslationSession(state).catch(() => {});
          }
        },
        onToast: (msg, type) => toast(msg, type),
        ...(params.callbacks || {})
      };

      const loopEngine = (typeof window !== 'undefined' && window.TranslationLoopEngine) || TranslationLoopEngine;
      const sessionToResume = resume ? ((params.activeSessionRef && params.activeSessionRef.current) || params.activeSession) : null;
      const res = await (loopEngine.translateText || translateText)({
        inputText,
        resume,
        session: sessionToResume,
        opts,
        config,
        callbacks
      });

      const { assembledText: result, lastUsageStats: stats } = res;
      if (params.setAssembledText) params.setAssembledText(result);
      if (params.setTranslatedChapters) params.setTranslatedChapters([{ title: 'Translated Document', content: result }]);
      const isTextComplete = Boolean(result && result.trim() && !result.includes('[Partial Parallel Completion]'));
      if (isTextComplete) {
        if (typeof localStorage !== 'undefined') {
          try { localStorage.removeItem(jobId); } catch (_) {}
        }
        if (params.activeSessionRef) params.activeSessionRef.current = null;
        if (params.setActiveSession) params.setActiveSession(null);
        if (params.setSavedTranslationSession) params.setSavedTranslationSession(null);
        if (params.setIsTranslationPaused) params.setIsTranslationPaused(false);
        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.deleteTranslationSession(jobId).catch(() => {});
        }
      } else {
        if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
      }

      if (params.setLastUsageStats) params.setLastUsageStats(stats);
      if (stats && stats.breakdown && typeof window !== 'undefined') {
        window.telemetryLog?.('TOKEN_BREAKDOWN', `Token Consumption Breakdown: ${stats.promptTokens.toLocaleString()} in (${stats.breakdown.glossaryTokens.toLocaleString()} glossary · ${stats.breakdown.sourceTokens.toLocaleString()} source · ${stats.breakdown.genderTokens.toLocaleString()} gender · ${stats.breakdown.systemTokens.toLocaleString()} system) + ${stats.outputTokens.toLocaleString()} out`, {
          totalTokens: stats.totalTokens,
          promptTokens: stats.promptTokens,
          outputTokens: stats.outputTokens,
          breakdown: stats.breakdown
        });
      }
      const summaryText = typeof params.getReportSummaryText === 'function'
        ? params.getReportSummaryText(stats)
        : (typeof window !== 'undefined' && window.getReportSummaryText ? window.getReportSummaryText(stats) : '');
      if (summaryText && typeof window !== 'undefined') {
        window.sendTelemetry?.('REPORT', '\n' + summaryText);
      }
      if (typeof params.addToHistory === 'function') {
        params.addToHistory(params.srcLang, params.tgtLang, config.provider, inputText, result, stats);
      }
      toast(`Translation complete in ${stats.duration}! (${stats.totalTokens.toLocaleString()} tokens · ${stats.cost})`);
      try {
        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.releaseWakeLock?.();
          window.NativeBridge.showCompletionNotification?.('Text Translation Complete!', `Translated in ${stats.duration} (${stats.totalTokens.toLocaleString()} tokens).`);
        }
      } catch (_) {}
      return res;
    } catch (e) {
      if (e.name !== 'AbortError') {
        if (params.setError) params.setError(e.message);
        toast(e.message, 'error');
      } else {
        toast('Translation paused. Progress safely saved.', 'info');
      }
      if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
      const session = (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
      if (session) {
        if (params.setSavedTranslationSession) params.setSavedTranslationSession(session);
        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.saveTranslationSession(session).catch(() => {});
        }
      } else if (typeof window !== 'undefined' && window.GeminiNovelDB) {
        window.GeminiNovelDB.getActiveTranslationSession().then(s => {
          if (s) {
            if (params.setSavedTranslationSession) params.setSavedTranslationSession(s);
            if (params.setActiveSession) params.setActiveSession(s);
          }
        }).catch(() => {});
      }
    } finally {
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
      if (params.setIsTranslating) params.setIsTranslating(false);
      const isPausing = params.isPausingRef && params.isPausingRef.current;
      if (!isPausing) {
        if (params.setProgress) params.setProgress(0);
        if (params.setProgressLabel) params.setProgressLabel('');
        try {
          if (typeof window !== 'undefined' && window.NativeBridge) {
            window.NativeBridge.releaseWakeLock?.();
          }
        } catch (_) {}
      }
      if (params.abortRef) params.abortRef.current = null;
      if (params.isPausingRef) params.isPausingRef.current = false;
    }
  }

  /**
   * Executes ebook translation cycle with wake-lock, notifications, abort coordination, library history persistence, and cloud sync.
   */
  async function executeTranslateEbook(params = {}) {
    const chapters = params.chapters || [];
    const resume = Boolean(params.resume);
    const toast = typeof params.toast === 'function' ? params.toast : (() => {});

    let wakeLock = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try { navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {}); } catch (_) {}
    }
    if (params.setIsTranslating) params.setIsTranslating(true);
    if (params.setProgress) params.setProgress(0);
    if (params.setError) params.setError('');
    if (typeof window !== 'undefined' && window.NativeBridge) {
      window.NativeBridge.acquireWakeLock?.();
      window.NativeBridge.showProgressNotification?.('Gemini Ebook Translator', resume ? 'Resuming book...' : 'Analyzing chapters...', 0);
    }
    if (!resume) {
      if (params.setAssembledText) params.setAssembledText('');
      if (params.setTranslatedChapters) params.setTranslatedChapters([]);
    }

    const isEpub = params.isEpub !== undefined ? params.isEpub : (params.isEpubParam || params.currentIsEpub || false);
    const originalZip = params.originalZip || params.originalZipParam || params.currentOriginalZip || (typeof window !== 'undefined' ? window.currentTranslatedZip : null) || null;
    if (isEpub && params.setCurrentIsEpub) params.setCurrentIsEpub(true);
    if (originalZip) {
      if (params.setCurrentOriginalZip) params.setCurrentOriginalZip(originalZip);
      if (typeof window !== 'undefined') window.currentTranslatedZip = originalZip;
    }

    const ctrl = new AbortController();
    if (params.abortRef) params.abortRef.current = ctrl;
    const opts = params.opts || (typeof params.getTranslateOpts === 'function' ? params.getTranslateOpts(ctrl.signal) : buildTranslateOpts({ ...params, signal: ctrl.signal }));

    const curSession = (resume ? ((params.activeSessionRef && params.activeSessionRef.current) || params.activeSession) : null);
    const fileName = params.fileName || '';
    const activeNovelRecord = params.activeNovelRecord || null;
    const currentDocTitle = params.currentDocTitle || '';
    const currentDocCover = params.currentDocCover || '';
    const currentFileHash = params.currentFileHash || '';
    const bookTitle = (chapters && chapters[0]?.title && !isGenericTitle(chapters[0].title))
      ? chapters[0].title
      : ((fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || 'Web Novel');
    const jobId = currentFileHash || ('job_' + String(bookTitle).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + chapters.length);

    try {
      const config = params.config || buildTranslationConfig({
        ...params,
        bookTitle,
        fileHash: currentFileHash,
        cover: currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || (curSession && curSession.cover) || '',
        currentDocCover
      });

      const callbacks = {
        onProgress: (pct) => params.setProgress && params.setProgress(pct),
        onProgressLabel: (label) => params.setProgressLabel && params.setProgressLabel(label),
        onLiveTextUpdate: (text) => params.setAssembledText && params.setAssembledText(text),
        onChapterComplete: (i, chapter, allChapters, allParts) => {
          if (params.setTranslatedChapters) params.setTranslatedChapters([...allChapters]);
          const currentAssembled = allParts.filter(Boolean).join('\n\n\n').trim();
          if (params.setAssembledText) params.setAssembledText(currentAssembled);
        },
        onSaveState: async (state) => {
          if (params.activeSessionRef) params.activeSessionRef.current = state;
          if (params.setActiveSession) params.setActiveSession(state);
          if (params.setSavedTranslationSession) params.setSavedTranslationSession(state);
          try {
            const sStr = JSON.stringify(state);
            if (sStr.length < 2000000 && typeof localStorage !== 'undefined') localStorage.setItem(jobId, sStr);
          } catch (_) {}
          if (typeof window !== 'undefined' && window.GeminiNovelDB) {
            await window.GeminiNovelDB.saveTranslationSession(state).catch(() => {});
          }
        },
        onToast: (msg, type) => toast(msg, type),
        ...(params.callbacks || {})
      };

      const loopEngine = (typeof window !== 'undefined' && window.TranslationLoopEngine) || TranslationLoopEngine;
      const res = await (loopEngine.translateEbook || translateEbook)({
        chapters,
        resume,
        isEpub,
        originalZip,
        session: curSession,
        opts,
        config,
        callbacks
      });

      if (!res) return;
      const { translatedChapters: newChapters, assembledText: final, lastUsageStats: stats } = res;

      if (isEpub && originalZip && typeof window !== 'undefined') {
        window.currentTranslatedZip = originalZip;
      }
      if (params.setTranslatedChapters) params.setTranslatedChapters(newChapters);
      if (params.setAssembledText) params.setAssembledText(final);
      if (params.setLastUsageStats) params.setLastUsageStats(stats);
      if (stats && stats.breakdown && typeof window !== 'undefined') {
        window.telemetryLog?.('TOKEN_BREAKDOWN', `Token Consumption Breakdown: ${stats.promptTokens.toLocaleString()} in (${stats.breakdown.glossaryTokens.toLocaleString()} glossary · ${stats.breakdown.sourceTokens.toLocaleString()} source · ${stats.breakdown.genderTokens.toLocaleString()} gender · ${stats.breakdown.systemTokens.toLocaleString()} system) + ${stats.outputTokens.toLocaleString()} out`, {
          totalTokens: stats.totalTokens,
          promptTokens: stats.promptTokens,
          outputTokens: stats.outputTokens,
          breakdown: stats.breakdown
        });
      }
      const summaryText = typeof params.getReportSummaryText === 'function'
        ? params.getReportSummaryText(stats)
        : (typeof window !== 'undefined' && window.getReportSummaryText ? window.getReportSummaryText(stats) : '');
      if (summaryText && typeof window !== 'undefined') {
        window.sendTelemetry?.('REPORT', '\n' + summaryText);
      }
      if (typeof params.addToHistory === 'function') {
        params.addToHistory(params.srcLang, params.tgtLang, config.provider, params.inputText || (chapters || []).map(c => c.text).join('\n\n'), final, stats);
      }

      if (newChapters && newChapters.length > 0) {
        const mappedTranslated = (chapters || []).map((orig, idx) => {
          const nc = newChapters && newChapters[idx];
          const isDone = isChapterCompleted(nc, orig, params.tgtLang);
          if (isDone) {
            return {
              title: nc.title || orig?.title || `Chapter ${idx + 1}`,
              text: nc.content || nc.text,
              content: nc.content || nc.text,
              isTranslated: true,
              originalTitle: orig?.originalTitle || orig?.title || '',
              docHtml: nc.docHtml,
              zipPath: nc.zipPath
            };
          } else {
            return {
              title: orig?.title || `Chapter ${idx + 1}`,
              text: '',
              content: '',
              isTranslated: false,
              originalTitle: orig?.originalTitle || orig?.title || '',
              rawText: typeof orig === 'string' ? orig : (orig?.text || orig?.content || '')
            };
          }
        });
        const srcChaps = (chapters || []).map((c, idx) => ({
          title: c?.title || `Chapter ${idx + 1}`,
          text: typeof c === 'string' ? c : (c?.text || c?.content || ''),
          content: typeof c === 'string' ? c : (c?.content || c?.text || '')
        }));

        const webImportHistory = params.webImportHistory || [];
        const webImportData = params.webImportData || null;
        const activeCrawlSession = params.activeCrawlSession || null;

        if (activeNovelRecord && activeNovelRecord.id) {
          const cleanBT = normalizeTitleKey(activeNovelRecord?.title || '');
          const matchedMeta = webImportHistory.find(n => {
            const nt = normalizeTitleKey(n?.title);
            return nt && (nt === cleanBT || cleanBT.includes(nt) || nt.includes(cleanBT)) && n.cover;
          });
          const resolvedCover = activeNovelRecord.cover || currentDocCover || matchedMeta?.cover || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';
          const updatedRec = {
            ...activeNovelRecord,
            cover: resolvedCover,
            isTranslated: true,
            translatedChapters: mappedTranslated,
            targetLang: params.tgtLang,
            chapters: mappedTranslated,
            rawChapters: (activeNovelRecord.rawChapters && activeNovelRecord.rawChapters.length >= srcChaps.length) ? activeNovelRecord.rawChapters : srcChaps,
            originalChapters: srcChaps,
            chapterCount: mappedTranslated.length
          };
          if (typeof params.saveNovelToHistory === 'function') {
            params.saveNovelToHistory(updatedRec).catch(e => console.warn('History save error:', e));
          }
          if (params.setActiveNovelRecord) params.setActiveNovelRecord(updatedRec);
          if (resolvedCover) {
            if (params.setCurrentDocCover) params.setCurrentDocCover(resolvedCover);
            try { localStorage.setItem('gemini_current_doc_cover', resolvedCover); } catch (_) {}
          }
          if (params.setNovelUpdateBadges) {
            params.setNovelUpdateBadges(prev => {
              const next = { ...prev };
              delete next[activeNovelRecord.id];
              return next;
            });
          }
        } else {
          const bTitle = (fileName && fileName.trim()) ? fileName.replace(/\.[^/.]+$/, '') : ((chapters && chapters[0]?.title) || 'Translated Novel');
          const cleanBT = normalizeTitleKey(bTitle);
          const matchedMeta = webImportHistory.find(n => {
            const nt = normalizeTitleKey(n?.title);
            return nt && (nt === cleanBT || cleanBT.includes(nt) || nt.includes(cleanBT)) && n.cover;
          });
          const recCover = currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || (activeCrawlSession && activeCrawlSession.cover) || (webImportData && webImportData.cover) || (matchedMeta && matchedMeta.cover) || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';
          const newRec = {
            id: (activeNovelRecord && activeNovelRecord.id) || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
            title: bTitle.includes('(Translated)') ? bTitle : `${bTitle} (Translated)`,
            author: (activeNovelRecord && activeNovelRecord.author) || 'Gemini Translator',
            cover: recCover,
            isTranslated: true,
            chapters: mappedTranslated,
            translatedChapters: mappedTranslated,
            targetLang: params.tgtLang,
            originalChapters: srcChaps,
            originalText: params.inputText || ''
          };
          if (typeof params.saveNovelToHistory === 'function') {
            params.saveNovelToHistory(newRec).catch(e => console.warn('History save error:', e));
          }
          if (params.setActiveNovelRecord) params.setActiveNovelRecord(newRec);
          if (recCover) {
            if (params.setCurrentDocCover) params.setCurrentDocCover(recCover);
            try { localStorage.setItem('gemini_current_doc_cover', recCover); } catch (_) {}
          }
        }
      }

      const completedCount = (newChapters || []).filter((c, idx) => isChapterCompleted(c, chapters && chapters[idx], params.tgtLang)).length;
      const totalCount = (chapters && chapters.length > 0) ? chapters.length : (newChapters ? newChapters.length : 0);
      const isFullyComplete = totalCount > 0 && completedCount >= totalCount;

      if (!isFullyComplete) {
        console.warn(`[TranslationLoopEngine] Incomplete translation: ${completedCount}/${totalCount} chapters finished. Preserving session for resume.`);
        if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
        const partialSession = {
          ...(curSession || {}),
          id: jobId,
          type: 'ebook',
          fileHash: currentFileHash,
          fileName,
          title: bookTitle,
          cover: currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || '',
          chapters: (chapters && chapters.length > 0) ? chapters : (curSession?.chapters || []),
          newChapters,
          allParts: (res && res.allParts) || (newChapters || []).map(c => c ? `${c.title || ''}\n\n${c.content || c.text || ''}` : ''),
          translatedChapters: newChapters,
          isEpub,
          originalZip,
          srcLang: params.srcLang,
          tgtLang: params.tgtLang,
          completedCount,
          totalCount,
          updatedAt: Date.now()
        };
        if (params.activeSessionRef) params.activeSessionRef.current = partialSession;
        if (params.setActiveSession) params.setActiveSession(partialSession);
        if (params.setSavedTranslationSession) params.setSavedTranslationSession(partialSession);
        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.saveTranslationSession(partialSession).catch(() => {});
        }
        toast(`Translation stopped at Ch. ${completedCount}/${totalCount}. Tap "Resume" to continue!`, 'info');
        try {
          if (typeof window !== 'undefined' && window.NativeBridge) {
            window.NativeBridge.releaseWakeLock?.();
            window.NativeBridge.clearProgressNotification?.(false);
            window.NativeBridge.showCompletionNotification?.('Translation Paused', `Ch. ${completedCount}/${totalCount} translated. Tap to resume!`);
          }
        } catch (_) {}
        return res;
      }

      if (typeof localStorage !== 'undefined') {
        try { localStorage.removeItem(jobId); } catch (_) {}
      }
      if (params.activeSessionRef) params.activeSessionRef.current = null;
      if (params.setActiveSession) params.setActiveSession(null);
      if (params.setSavedTranslationSession) params.setSavedTranslationSession(null);
      if (params.setIsTranslationPaused) params.setIsTranslationPaused(false);
      if (typeof window !== 'undefined' && window.GeminiNovelDB) {
        window.GeminiNovelDB.deleteTranslationSession(jobId).catch(() => {});
      }
      toast(`Ebook translation complete in ${stats.duration}! (${stats.totalTokens.toLocaleString()} tokens · ${stats.cost})`);
      try {
        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.releaseWakeLock?.();
          window.NativeBridge.clearProgressNotification?.(true, 'Book Translation Complete!', `${chapters.length} chapters translated in ${stats.duration}. Tap to read!`);
          window.NativeBridge.showCompletionNotification?.('Book Translation Complete!', `${chapters.length} chapters translated in ${stats.duration}. Tap to read!`);
          window.NativeBridge.haptic?.('success');
        }
      } catch (_) {}
      if (params.webdavAutoSync && params.webdavUrl && params.webdavUrl.trim() && typeof params.backupToWebDav === 'function') {
        params.backupToWebDav().catch(e => console.warn('Auto WebDAV sync error:', e));
      }
      if (params.gdriveAutoSync && typeof window !== 'undefined' && window.GoogleDriveSync?.isConnected() && typeof params.backupToGoogleDrive === 'function') {
        params.backupToGoogleDrive().catch(e => console.warn('Auto Google Drive sync error:', e));
      }
      return res;
    } catch (e) {
      if (e.name !== 'AbortError') {
        if (params.setError) params.setError(e.message);
        toast(e.message, 'error');
      } else {
        toast('Translation paused. Progress safely saved to database.', 'info');
      }
      if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
      const session = (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
      if (session) {
        if (params.setSavedTranslationSession) params.setSavedTranslationSession(session);
        if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.saveTranslationSession(session).catch(() => {});
        }
      } else if (typeof window !== 'undefined' && window.GeminiNovelDB) {
        window.GeminiNovelDB.getActiveTranslationSession().then(s => {
          if (s) {
            if (params.setSavedTranslationSession) params.setSavedTranslationSession(s);
            if (params.setActiveSession) params.setActiveSession(s);
          }
        }).catch(() => {});
      }
      const finalChapters = ((params.activeSessionRef && params.activeSessionRef.current) || params.activeSession)?.newChapters || [];
      if (finalChapters.length > 0 && params.setTranslatedChapters) params.setTranslatedChapters(finalChapters);
    } finally {
      if (params.setIsTranslating) params.setIsTranslating(false);
      const isPausing = params.isPausingRef && params.isPausingRef.current;
      if (!isPausing) {
        if (params.setProgress) params.setProgress(0);
        if (params.setProgressLabel) params.setProgressLabel('');
      }
      if (params.abortRef) params.abortRef.current = null;
      if (params.isPausingRef) params.isPausingRef.current = false;
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
      try {
        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.releaseWakeLock?.();
        }
      } catch (_) {}
    }
  }

  const Controller = {
    buildTranslateOpts,
    buildTranslationConfig,
    pauseTranslation,
    resumeTranslation,
    discardSession,
    saveTranslationToLibrarySpace,
    executeTranslateText,
    executeTranslateEbook,
    executeTranslateSingleChapter: async function(params) {
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
          const isProblem = detectUntranslated ? detectUntranslated(p, rawSrcP, targetLanguage) : (/[\u3040-\u9fff\uac00-\ud7af]/.test(p) || /\[Error:.*?\]/i.test(p));
          if (isProblem) {
            if (!curBlock) {
              curBlock = { startIdx: idx, endIdx: idx, texts: [p] };
            } else {
              curBlock.endIdx = idx;
              curBlock.texts.push(p);
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
              safeBlocks.push({ startIdx: b.startIdx + i, endIdx: b.startIdx + i + slice.length - 1, texts: slice });
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
            completedHealingCount++;
            if (typeof onProgress === 'function') {
              onProgress(Math.floor((completedHealingCount / activeBlocks.length) * 80) + 15, `Healing section ${completedHealingCount}/${activeBlocks.length}…`);
            }
            if (typeof params.onHealingBlockProgress === 'function') {
              params.onHealingBlockProgress({
                blockIdx: bIdx,
                totalBlocks: activeBlocks.length,
                healedSnippet: (block.translatedText || '').slice(0, 150),
                status: block.translatedText ? 'healed' : 'failed'
              });
            }
          }, healingConcurrency, ctrl.signal);
        } catch (parallelErr) {
          if (parallelErr.name !== 'AbortError' && !ctrl.signal?.aborted) console.warn('[Healing] batch error:', parallelErr);
        }

        for (let bIdx = 0; bIdx < activeBlocks.length; bIdx++) {
          const block = activeBlocks[bIdx];
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

        const finalContent = paragraphs.join(sep);
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
    },
    translateChapterTitle,
    translateSingleChapter,
    createTranslationDispatcher(ctx) {
      return {
        translateText: async (resume = false) => {
          return await (TranslationLoopEngine?.Controller || Controller).executeTranslateText({
            ...ctx,
            resume
          });
        },
        translateEbook: async (chapters, resume = false, isEpubParam, originalZipParam) => {
          return await (TranslationLoopEngine?.Controller || Controller).executeTranslateEbook({
            ...ctx,
            chapters,
            resume,
            isEpubParam,
            originalZipParam
          });
        },
        translateChapter: async (chapterIdx, rawTitle, rawText, callbacks) => {
          return await (TranslationLoopEngine?.Controller || Controller).translateSingleChapter({
            chapterIdx,
            rawTitle,
            rawText,
            opts: typeof ctx.getTranslateOpts === 'function' ? ctx.getTranslateOpts() : {},
            config: (TranslationLoopEngine?.Controller || Controller).buildTranslationConfig(ctx),
            callbacks
          });
        },
        translateTitle: async (rawTitle, callbacks) => {
          return await (TranslationLoopEngine?.Controller || Controller).translateChapterTitle({
            rawTitle,
            opts: typeof ctx.getTranslateOpts === 'function' ? ctx.getTranslateOpts() : {},
            config: (TranslationLoopEngine?.Controller || Controller).buildTranslationConfig(ctx),
            callbacks
          });
        }
      };
    }
  };

  const TranslationLoopEngine = {
    Controller,
    extractTextNodes,
    translateText,
    translateEbook,
    translateChapterTitle,
    translateSingleChapter,
    isChapterCompleted,
    splitChunks,
    batchParallel,
    generateJobId,
    calculateRealCost,
    formatDuration,
    escapeXml,
    isGenericTitle
  };

  global.TranslationLoopEngine = TranslationLoopEngine;
  if (typeof window !== 'undefined') {
    window.TranslationLoopEngine = TranslationLoopEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationLoopEngine;
  }
})(typeof window !== 'undefined' ? window : this);

