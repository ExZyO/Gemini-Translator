/**
 * Gemini EPUB Translator - Translation Execution Loops & Chapter Dispatchers Engine
 * Module: translation_loop_engine.js
 * 
 * Provides:
 * - extractTextNodes(element): Traverses DOM with createTreeWalker and extracts non-empty text nodes
 * - translateText({ inputText, resume, session, opts, config, callbacks }): Full text translation loop with streaming, intra-context, and parallel workers
 * - translateEbook({ chapters, resume, isEpub, originalZip, session, opts, config, callbacks }): Full ebook chapter dispatcher with intra-chapter context, parallel concurrency, title translation, healing pass, and DOM node replacement
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

  const TranslationLoopEngine = {
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
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationLoopEngine;
  }
})(typeof window !== 'undefined' ? window : this);
