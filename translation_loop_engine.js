/**
 * Gemini EPUB Translator - Translation Execution Loops & Chapter Dispatchers Engine
 * Module: translation_loop_engine.js
 * 
 * Provides:
 * - extractTextNodes(element): Traverses DOM with createTreeWalker and extracts non-empty text nodes
 * - translateText({ inputText, resume, session, opts, config, callbacks }): Full text translation loop with streaming, intra-context, and parallel workers
 * - translateEbook({ chapters, resume, isEpub, originalZip, session, opts, config, callbacks }): Full ebook chapter dispatcher with intra-chapter context, parallel concurrency, title translation, healing pass, and DOM node replacement
 * - Controller: buildTranslateOpts, buildTranslationConfig, pauseTranslation, resumeTranslation, discardSession, saveTranslationToLibrarySpace, executeTranslateText, executeTranslateEbook
 * - splitChunks, batchParallel, calculateRealCost, formatDuration, generateJobId utilities
 */

(function (global) {
  'use strict';

  // --- XML / HTML Escaper ---
  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // --- Generic Title Detector ---
  function isGenericTitle(title) {
    if (typeof global !== 'undefined' && global.isGenericTitle) return global.isGenericTitle(title);
    if (typeof window !== 'undefined' && window.isGenericTitle) return window.isGenericTitle(title);
    if (typeof window !== 'undefined' && window.ExportEngine && window.ExportEngine.isGenericTitle) {
      return window.ExportEngine.isGenericTitle(title);
    }
    return !title || !title.trim() || /^translated\s*(document|file)?$/i.test(title.trim());
  }

  // --- Safe Duration Formatter ---
  function formatDuration(ms) {
    if (typeof global !== 'undefined' && global.formatDuration) return global.formatDuration(ms);
    if (typeof window !== 'undefined' && window.formatDuration) return window.formatDuration(ms);
    if (!ms || ms <= 0) return '0.0s';
    const totalSec = ms / 1000;
    if (totalSec < 1) return `${totalSec.toFixed(2)}s`;
    if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
    const totalMin = Math.floor(totalSec / 60);
    const remSec = Math.floor(totalSec % 60);
    if (totalMin < 60) return `${totalMin}m ${remSec}s`;
    const totalHours = Math.floor(totalMin / 60);
    const remMin = totalMin % 60;
    if (totalHours < 24) return `${totalHours}h ${remMin}m ${remSec}s`;
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    return `${days}d ${remHours}h ${remMin}m`;
  }

  // --- Real Cost Calculator ---
  function calculateRealCost(promptTokens, outputTokens, modelId = 'gemini-3.7-flash', provider = 'gemini') {
    if (typeof global !== 'undefined' && global.calculateRealCost) return global.calculateRealCost(promptTokens, outputTokens, modelId, provider);
    if (typeof window !== 'undefined' && window.calculateRealCost) return window.calculateRealCost(promptTokens, outputTokens, modelId, provider);
    let inPerM = 0.075;
    let outPerM = 0.30;
    if (provider === 'deepseek') {
      if (modelId === 'deepseek-reasoner') {
        inPerM = 0.55;
        outPerM = 2.19;
      } else {
        inPerM = 0.14;
        outPerM = 0.28;
      }
    } else {
      if (modelId.includes('3.1-pro') || modelId.includes('pro')) {
        inPerM = 1.25;
        outPerM = 5.00;
      } else if (modelId.includes('flash-lite') || modelId.includes('8b')) {
        inPerM = 0.0375;
        outPerM = 0.15;
      } else {
        inPerM = 0.075;
        outPerM = 0.30;
      }
    }
    const cost = ((promptTokens / 1000000) * inPerM) + ((outputTokens / 1000000) * outPerM);
    return cost < 0.0001 && cost > 0 ? '$0.0001' : `$${cost.toFixed(4)}`;
  }

  // --- Session Job ID Generator ---
  function generateJobId(text, isFile = false) {
    if (typeof global !== 'undefined' && global.generateJobId) return global.generateJobId(text, isFile);
    if (typeof window !== 'undefined' && window.generateJobId) return window.generateJobId(text, isFile);
    let hash = 0; const s = isFile ? text : (text || '').substring(0, 1000);
    for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
    return `job_${Math.abs(hash)}`;
  }

  // --- Paragraph Boundary Chunk Splitting ---
  const CHUNK_PAYLOAD_MAP = {
    turbo: 4500,
    large: 3800,
    medium: 2800,
    small: 1800
  };
  const PROMPT_OVERHEAD = 350;

  function splitChunks(text, glossaryLen = 0, smartGlossary = true, preset = null) {
    if (typeof global !== 'undefined' && global.splitChunks) return global.splitChunks(text, glossaryLen, smartGlossary, preset);
    if (typeof window !== 'undefined' && window.splitChunks) return window.splitChunks(text, glossaryLen, smartGlossary, preset);
    if (!text || typeof text !== 'string') return [];
    const activePreset = preset || (typeof localStorage !== 'undefined' ? localStorage.getItem('chunkSizePreset') : null) || 'turbo';
    const basePayload = CHUNK_PAYLOAD_MAP[activePreset] || 4500;
    const effectiveGlossaryLen = smartGlossary ? Math.min(glossaryLen, 1500) : glossaryLen;
    let max = basePayload - Math.min(PROMPT_OVERHEAD + effectiveGlossaryLen, 1800);
    if (max > 3500) max = 3500;
    if (max <= 0) max = 1800;
    const chunks = []; let rem = text;
    while (rem.length > 0) {
      if (rem.length <= max) { chunks.push(rem); break; }
      let sp = max;
      let idx = rem.lastIndexOf('\n\n', max);
      if (idx !== -1 && idx >= max * 0.4) {
        sp = idx + 2;
      } else {
        idx = rem.lastIndexOf('\n', max);
        if (idx !== -1 && idx >= max * 0.4) {
          sp = idx + 1;
        } else {
          const punctIndices = [
            rem.lastIndexOf('。\n', max), rem.lastIndexOf('。', max),
            rem.lastIndexOf('！\n', max), rem.lastIndexOf('！', max),
            rem.lastIndexOf('？\n', max), rem.lastIndexOf('？', max),
            rem.lastIndexOf('”\n', max), rem.lastIndexOf('”', max),
            rem.lastIndexOf('…\n', max), rem.lastIndexOf('…', max),
            rem.lastIndexOf('.\n', max), rem.lastIndexOf('.', max),
            rem.lastIndexOf('!\n', max), rem.lastIndexOf('!', max),
            rem.lastIndexOf('?\n', max), rem.lastIndexOf('?', max)
          ].filter(i => i >= max * 0.3);
          if (punctIndices.length > 0) {
            sp = Math.max(...punctIndices) + 1;
          } else {
            const anyPunct = [
              rem.lastIndexOf('\n\n', max),
              rem.lastIndexOf('\n', max),
              rem.lastIndexOf('。', max),
              rem.lastIndexOf('.', max)
            ].filter(i => i > 0);
            if (anyPunct.length > 0) {
              sp = Math.max(...anyPunct) + 1;
            }
          }
        }
      }
      if (sp <= 0) sp = max;
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
        const currentIndex = nextIndex++;
        const item = items[currentIndex];
        try {
          const res = await fn(item, currentIndex, workerId);
          results[currentIndex] = res;
        } catch (err) {
          if (signal?.aborted || err.name === 'AbortError') throw err;
          results[currentIndex] = { error: err.message || 'Unknown error' };
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
            throw new Error(`Strict Model: Could not complete chunk ${i + 1}/${chunks.length} with ${opts.model || 'chosen model'}: ${err.message}. Progress safely preserved. Tap Resume to retry.`);
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
        window.telemetryLog?.('ANTI_MTL', `Text translation quality audit: ${refCheck.hasRefusal ? `⚠️ Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `⚠️ Loop [${loopCheck.phrase}]` : 'Clean Pass ✅'}`, {
          hasRefusal: refCheck.hasRefusal,
          refusalPattern: refCheck.patternName || null,
          hasLoop: loopCheck.hasLoop,
          loopPhrase: loopCheck.phrase || null
        });
        if (refCheck.hasRefusal && callbacks.onToast) {
          callbacks.onToast(`⚠️ Anti-MTL Gate: ${refCheck.patternName} detected in translation`, 'warning');
        } else if (loopCheck.hasLoop && callbacks.onToast) {
          callbacks.onToast(`⚠️ QA Proofreader: Hallucinated repetition loop detected`, 'warning');
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
          if (typeof cur === 'object') cur.title = 'Summary';
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
        if (nc && nc.content) {
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
      return !newChapters[idx] || !newChapters[idx].content;
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

    await batchParallel(chapterItems, async ({ ch, idx: i }, itemIdx, workerId = 0) => {
      const workerKey = availableKeys.length > 0 ? availableKeys[workerId % availableKeys.length].key : opts.apiKey;
      const workerOpts = { ...opts, apiKey: workerKey, availableKeys, isParallelWorker: effectiveConcurrency > 1 };
      let title = ch.title;
      const chunks = ch.chunks;
      let chapterCtx = '';

      // 1. Translate title if needed (cached so duplicate chapter titles match exactly)
      if (title && String(title).trim()) {
        if (!(resume && newChapters[i]?.title)) {
          if (translatedTitleCache.has(title)) {
            title = translatedTitleCache.get(title);
          } else {
            try {
              const hasCjk = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(title);
              if (!hasCjk) {
                translatedTitleCache.set(title, title.trim());
              } else {
                const titleWorkerOpts = {
                  ...workerOpts,
                  context: undefined,
                  needContextUpdate: false,
                  glossary: '', // Titles are 1-10 words; omitting huge story glossary saves ~2,100 tokens per title!
                  smartGlossary: false,
                  instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
                };
                const tRes = await safeTranslateWithRotation(title, titleWorkerOpts);
                const trans = (tRes && typeof tRes === 'object') ? (tRes.text || '') : (typeof tRes === 'string' ? tRes : '');
                if (trans && trans.trim()) {
                  const cleanT = (typeof window !== 'undefined' && window.sanitizeChapterTitle) ? window.sanitizeChapterTitle(trans.trim()) : trans.trim();
                  translatedTitleCache.set(title, cleanT);
                  title = cleanT;
                }
                if (tRes?.usage) {
                  totalPromptTokens += tRes.usage.promptTokens || 0;
                  totalOutputTokens += tRes.usage.outputTokens || 0;
                  totalTokensUsed += tRes.usage.totalTokens || 0;
                  if (tRes.usage.breakdown) {
                    accumulatedBreakdown.sourceTokens += tRes.usage.breakdown.sourceTokens || 0;
                    accumulatedBreakdown.glossaryTokens += tRes.usage.breakdown.glossaryTokens || 0;
                    accumulatedBreakdown.genderTokens += tRes.usage.breakdown.genderTokens || 0;
                    accumulatedBreakdown.contextTokens += tRes.usage.breakdown.contextTokens || 0;
                    accumulatedBreakdown.systemTokens += tRes.usage.breakdown.systemTokens || 0;
                  }
                }
              }
            } catch (e) {
              console.warn('Title translation failed, keeping original title for now:', e.message);
            }
          }
          done++;
          const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
          if (callbacks.onProgress) callbacks.onProgress(curPct);
          if (typeof window !== 'undefined' && window.NativeBridge) {
            window.NativeBridge.showProgressNotification?.(
              `Gemini Translator (${curPct}%)`,
              `Ch. ${i + 1}/${chapters.length}: Title standardized`,
              curPct,
              true
            );
          }
        } else {
          title = newChapters[i].title;
        }
      }

      // 2. Translate Chunks with Intra-Chapter Context Pipeline
      const parts = [];
      for (let j = 0; j < chunks.length; j++) {
        if (callbacks.onProgressLabel) {
          callbacks.onProgressLabel(`Chapter ${i + 1}/${chapters.length}: chunk ${j + 1}/${chunks.length}${useContext ? ' (intra-context)' : ''}...`);
        }
        let translatedText = '';
        const isLastChunk = j === chunks.length - 1;
        const hasIncomingContext = Boolean(chapterCtx && chapterCtx.trim());
        const shouldPassContext = useContext && (hasIncomingContext || j > 0);
        const shouldRequestUpdate = useContext && !isLastChunk;
        try {
          const translated = await safeTranslateWithRotation(chunks[j].text, {
            ...workerOpts,
            context: shouldPassContext ? chapterCtx : undefined,
            needContextUpdate: shouldRequestUpdate
          });
          translatedText = (translated && typeof translated === 'object') ? (translated.text || '') : (typeof translated === 'string' ? translated : '');
          if (useContext && translated?.newContext) {
            chapterCtx = translated.newContext;
          }
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
        } catch (e) {
          if (e.name === 'AbortError' || opts?.signal?.aborted) throw e;
          const isFatalQuota = (e.message || '').includes('429') || (e.message || '').includes('quota') || (e.message || '').includes('billing');
          if (isFatalQuota) {
            throw new Error(`API Quota exhausted across keys. Switch model to Gemini 3.5 Flash Lite in Settings · Engine. Progress saved at chapter ${i + 1}.`);
          }
          if (opts?.strictModel) {
            throw new Error(`Strict Model: Failed translating chunk ${j + 1}/${chunks.length} of "${title || `Chapter ${i + 1}`}": ${e.message}. Progress safely saved. Tap Resume to retry.`);
          }
          // When strictModel is OFF, attempt one fresh-key fallback before writing error placeholder
          let recovered = false;
          try {
            const KeyPool = getKeyPool();
            const fallbackLeased = (availableKeys.length > 1) ? await KeyPool.acquireKey(availableKeys) : null;
            const fallbackOpts = { ...workerOpts, apiKey: fallbackLeased || workerOpts.apiKey, context: undefined, needContextUpdate: false };
            const recRes = await safeTranslateWithRotation(chunks[j].text, fallbackOpts);
            if (fallbackLeased) KeyPool.releaseKey(fallbackLeased);
            const recText = (recRes && typeof recRes === 'object') ? (recRes.text || '') : (typeof recRes === 'string' ? recRes : '');
            if (recText && recText.trim()) {
              translatedText = recText;
              recovered = true;
            }
          } catch (recErr) {
            console.warn(`Chunk fallback recovery failed: ${recErr.message}`);
          }
          if (!recovered) {
            translatedText = `\n\n[Error: ${e.message}]\n\n`;
          }
        }
        parts.push(translatedText);

        // Live update output box throttled or on chapter completion
        allParts[i] = `${title}\n\n${parts.join('\n\n')}`;
        const nowTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (nowTime - lastUiAssembledUpdate > 2500 || j === chunks.length - 1) {
          lastUiAssembledUpdate = nowTime;
          const liveText = allParts.filter(Boolean).join('\n\n\n').trim();
          if (callbacks.onLiveTextUpdate) {
            callbacks.onLiveTextUpdate(liveText);
          }
        }

        done++;
        const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
        if (callbacks.onProgress) callbacks.onProgress(curPct);
        const chTitleClean = (title || `Chapter ${i + 1}`).trim().slice(0, 30);
        if (typeof window !== 'undefined' && window.NativeBridge) {
          window.NativeBridge.showProgressNotification?.(
            `Gemini Translator (${curPct}%)`,
            `Ch. ${i + 1}/${chapters.length} (chunk ${j + 1}/${chunks.length}) • ${chTitleClean}`,
            curPct,
            true
          );
        }
      }

      let content = safeCleanNovelProse(safeStripContextLeak(parts.join('\n\n')).replace(/\r\n/g, '\n')).trim();
      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
      if (typeof stripFn === 'function' && title) {
        content = stripFn(content, title, chapters[i]?.title);
      }

      // Anti-MTL Quality Gate & Proofreader Check (§7.5 + §5.9)
      if (config.antiMtlGateEnabled && typeof window !== 'undefined' && window.QAEngine && content) {
        const refCheck = window.QAEngine.checkMtlRefusal(content);
        const loopCheck = window.QAEngine.checkRepetitionLoop(content);
        window.telemetryLog?.('ANTI_MTL', `Chapter ${i + 1} quality audit: ${refCheck.hasRefusal ? `⚠️ Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `⚠️ Loop [${loopCheck.phrase}]` : 'Clean Pass ✅'}`, {
          chapterIndex: i + 1,
          hasRefusal: refCheck.hasRefusal,
          refusalPattern: refCheck.patternName || null,
          hasLoop: loopCheck.hasLoop,
          loopPhrase: loopCheck.phrase || null
        });
        if (refCheck.hasRefusal) {
          console.warn(`[Anti-MTL Gate] Chapter ${i + 1}:`, refCheck.matchedText);
          if (callbacks.onToast) callbacks.onToast(`⚠️ Anti-MTL Gate: ${refCheck.patternName} detected in Ch. ${i + 1}`, 'warning');
        } else if (loopCheck.hasLoop) {
          console.warn(`[QA Proofreader] Chapter ${i + 1}:`, loopCheck.phrase);
          if (callbacks.onToast) callbacks.onToast(`⚠️ QA Proofreader: Repetition loop detected in Ch. ${i + 1}`, 'warning');
        }
      }

      let docHtml = null;
      if (isEpub && ch.doc) {
        if (title && ch.doc.querySelector('title')) ch.doc.querySelector('title').textContent = title;
        
        // Support DOM Node replacement if DOM nodes exist, or format clean HTML paragraphs
        if (config.domNodeTranslation && ch.doc.body) {
          const textNodes = extractTextNodes(ch.doc.body);
          if (textNodes.length > 0) {
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (let nodeIdx = 0; nodeIdx < textNodes.length && nodeIdx < lines.length; nodeIdx++) {
              textNodes[nodeIdx].nodeValue = lines[nodeIdx];
            }
          }
        } else {
          // Format clean HTML paragraphs into the EPUB chapter body
          const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) {
            const titleHeading = (title && !isGenericTitle(title)) ? `<h2>${escapeXml(title)}</h2>\n` : '';
            const bodyParagraphs = lines.map(line => {
              if (/^(\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(line)) {
                return `<p class="divider">${escapeXml(line)}</p>`;
              }
              return `<p>${escapeXml(line)}</p>`;
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
          chapterTitle: title || chapters[i]?.title || `Chapter ${i + 1}`,
          text: content,
          model: workerOpts?.model || config.model || 'Gemini'
        }).catch(e => console.warn('[Snapshots] Auto-save error:', e));
      }

      newChapters[i] = { originalTitle: chapters[i].title, title, content, zipPath: ch.zipPath, docHtml };
      allParts[i] = `${title}\n\n${content}`;
      
      if (callbacks.onChapterComplete) {
        callbacks.onChapterComplete(i, newChapters[i], [...newChapters], allParts);
      }
      await saveState(chapterCtx, done, i + 1, 0, allParts, newChapters);
    }, effectiveConcurrency, opts.signal);

    // Title Healing Pass: Ensure zero chapters are left with raw untranslated CJK titles
    const hasCjkTitle = s => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(s || '');
    const untranslatedTitles = newChapters
      .map((nc, idx) => ({ nc, idx }))
      .filter(({ nc }) => nc && hasCjkTitle(nc.title));

    if (untranslatedTitles.length > 0 && !opts.signal?.aborted) {
      console.log(`[Title Healing] Found ${untranslatedTitles.length} untranslated title(s). Running healing pass...`);
      if (callbacks.onProgressLabel) {
        callbacks.onProgressLabel(`Healing ${untranslatedTitles.length} untranslated chapter title(s)...`);
      }
      for (const { nc, idx } of untranslatedTitles) {
        if (opts.signal?.aborted) break;
        try {
          const hRes = await safeTranslateWithRotation(nc.title, {
            ...opts,
            context: undefined,
            needContextUpdate: false,
            glossary: '',
            smartGlossary: false,
            instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
          });
          const hTrans = (hRes && typeof hRes === 'object') ? (hRes.text || '') : (typeof hRes === 'string' ? hRes : '');
          if (hTrans && hTrans.trim()) {
            nc.title = hTrans.trim();
            allParts[idx] = `${nc.title}\n\n${nc.content}`;
          }
        } catch (hErr) {
          console.warn(`[Title Healing] Failed for Ch. ${idx + 1}:`, hErr.message);
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
      lastUsageStats: stats,
      totalTokensUsed: totalToks
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
          : (options.geminiModel || 'gemini-2.5-flash');
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

    return {
      apiKey,
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
      concurrency: options.concurrency || 1,
      chunkSizePreset: options.chunkSizePreset || 'turbo',
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
        const bTitle = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || (chapters[0] && chapters[0].title) || 'Web Novel';
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

    if (typeof window !== 'undefined' && window.NativeBridge) {
      window.NativeBridge.clearProgressNotification?.(false);
      window.NativeBridge.showCompletionNotification?.('Translation Paused ⏸', 'Translation paused. Progress safely saved.');
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
    const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
    const baseTitle = cleanT(title);
    const webImportHistory = params.webImportHistory || [];
    const webImportData = params.webImportData || null;
    const webImportUrl = params.webImportUrl || '';
    const matchingOriginal = webImportHistory.find(n => n && cleanT(n.title) === baseTitle);
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
          window.NativeBridge.showCompletionNotification?.('Text Translation Complete! ✨', `Translated in ${stats.duration} (${stats.totalTokens.toLocaleString()} tokens).`);
        }
      } catch (_) {}
      return res;
    } catch (e) {
      if (e.name !== 'AbortError') {
        if (params.setError) params.setError(e.message);
        toast(e.message, 'error');
      } else {
        if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
        const session = (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
        if (session) {
          if (params.setSavedTranslationSession) params.setSavedTranslationSession(session);
        } else if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.getActiveTranslationSession().then(s => {
            if (s && params.setSavedTranslationSession) params.setSavedTranslationSession(s);
          }).catch(() => {});
        }
        toast('Translation paused. Progress safely saved.', 'info');
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
        const mappedTranslated = newChapters.map((nc, idx) => ({
          title: nc?.title || (chapters && chapters[idx]?.title) || `Chapter ${idx + 1}`,
          text: nc?.content || nc?.text || (chapters && (chapters[idx]?.text || chapters[idx]?.content)) || '',
          content: nc?.content || nc?.text || (chapters && (chapters[idx]?.content || chapters[idx]?.text)) || ''
        }));
        const srcChaps = (chapters || []).map((c, idx) => ({
          title: c?.title || `Chapter ${idx + 1}`,
          text: typeof c === 'string' ? c : (c?.text || c?.content || ''),
          content: typeof c === 'string' ? c : (c?.content || c?.text || '')
        }));

        const webImportHistory = params.webImportHistory || [];
        const webImportData = params.webImportData || null;
        const activeCrawlSession = params.activeCrawlSession || null;

        if (activeNovelRecord && activeNovelRecord.id) {
          const cleanBT = String(activeNovelRecord.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
          const matchedMeta = webImportHistory.find(n => {
            const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
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
          const cleanBT = bTitle.replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
          const matchedMeta = webImportHistory.find(n => {
            const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
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
          window.NativeBridge.clearProgressNotification?.(true, 'Book Translation Complete! 🎉', `${chapters.length} chapters translated in ${stats.duration}. Tap to read!`);
          window.NativeBridge.showCompletionNotification?.('Book Translation Complete! 🎉', `${chapters.length} chapters translated in ${stats.duration}. Tap to read!`);
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
        if (params.setIsTranslationPaused) params.setIsTranslationPaused(true);
        const session = (params.activeSessionRef && params.activeSessionRef.current) || params.activeSession;
        if (session) {
          if (params.setSavedTranslationSession) params.setSavedTranslationSession(session);
        } else if (typeof window !== 'undefined' && window.GeminiNovelDB) {
          window.GeminiNovelDB.getActiveTranslationSession().then(s => {
            if (s && params.setSavedTranslationSession) params.setSavedTranslationSession(s);
          }).catch(() => {});
        }
        toast('Translation paused. Progress safely saved to database.', 'info');
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
    executeTranslateEbook
  };

  const TranslationLoopEngine = {
    Controller,
    extractTextNodes,
    translateText,
    translateEbook,
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

