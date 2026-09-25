/**
 * Gemini EPUB Translator - Key Manager Engine
 * Module: key_manager_engine.js
 * 
 * Provides:
 * - Multi-provider API key profiles (Gemini, DeepSeek, OpenAI, Claude, DeepL, LibreTranslate)
 * - Active key selection and persistent storage
 * - Automatic key rotation with wrap-around
 * - Live key health and latency testing with error classification
 * - Bulk key import parsing and profile creation
 * - Translation diagnostics reporting
 */

(function (global) {
  'use strict';

  const PROVIDER_NAMES = {
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    claude: 'Claude',
    deepl: 'DeepL',
    libre: 'LibreTranslate'
  };

  function getProviderDisplayName(provider) {
    if (!provider) return 'API';
    return PROVIDER_NAMES[provider] || String(provider).toUpperCase();
  }

  function makeDefaultId() {
    return 'k_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 1. Add API Key Profile
   */
  function addApiKey(provider, apiKeysByProvider, activeKeyIds, idGenerator) {
    const prov = provider || 'gemini';
    const id = (typeof idGenerator === 'function') ? idGenerator() : makeDefaultId();
    const provName = getProviderDisplayName(prov);
    const existingList = (apiKeysByProvider && apiKeysByProvider[prov]) ? apiKeysByProvider[prov] : [];
    const newKey = { id, name: `${provName} Key ${existingList.length + 1}`, key: '' };
    const updatedMap = {
      ...(apiKeysByProvider || {}),
      [prov]: [...existingList, newKey]
    };
    const updatedActive = { ...(activeKeyIds || {}) };
    if (!updatedActive[prov]) {
      updatedActive[prov] = id;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('apiKeysByProvider', JSON.stringify(updatedMap));
        localStorage.setItem('activeKeyIds', JSON.stringify(updatedActive));
      }
    } catch (e) {
      console.warn('KeyManagerEngine.addApiKey storage error:', e);
    }
    return {
      apiKeysByProvider: updatedMap,
      activeKeyIds: updatedActive,
      newKey,
      provName
    };
  }

  /**
   * 2. Delete API Key Profile
   */
  function deleteApiKey(provider, id, apiKeysByProvider, activeKeyIds) {
    const prov = provider || 'gemini';
    const existingList = (apiKeysByProvider && apiKeysByProvider[prov]) ? apiKeysByProvider[prov] : [];
    const updatedList = existingList.filter(k => k && k.id !== id);
    const updatedMap = {
      ...(apiKeysByProvider || {}),
      [prov]: updatedList
    };
    const updatedActive = { ...(activeKeyIds || {}) };
    if (updatedActive[prov] === id) {
      const nextId = updatedList.length > 0 ? updatedList[0].id : null;
      updatedActive[prov] = nextId;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('apiKeysByProvider', JSON.stringify(updatedMap));
        localStorage.setItem('activeKeyIds', JSON.stringify(updatedActive));
      }
    } catch (e) {
      console.warn('KeyManagerEngine.deleteApiKey storage error:', e);
    }
    return {
      apiKeysByProvider: updatedMap,
      activeKeyIds: updatedActive
    };
  }

  /**
   * 3. Update API Key Profile Field
   */
  function updateApiKey(provider, id, field, value, apiKeysByProvider) {
    const prov = provider || 'gemini';
    const existingList = (apiKeysByProvider && apiKeysByProvider[prov]) ? apiKeysByProvider[prov] : [];
    const updatedList = existingList.map(k => (k && k.id === id ? { ...k, [field]: value } : k));
    const updatedMap = {
      ...(apiKeysByProvider || {}),
      [prov]: updatedList
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('apiKeysByProvider', JSON.stringify(updatedMap));
      }
    } catch (e) {
      console.warn('KeyManagerEngine.updateApiKey storage error:', e);
    }
    return {
      apiKeysByProvider: updatedMap
    };
  }

  /**
   * 4. Set Active Key
   */
  function setActiveKey(provider, id, activeKeyIds) {
    const prov = provider || 'gemini';
    const updatedActive = {
      ...(activeKeyIds || {}),
      [prov]: id
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('activeKeyIds', JSON.stringify(updatedActive));
      }
    } catch (e) {
      console.warn('KeyManagerEngine.setActiveKey storage error:', e);
    }
    return {
      activeKeyIds: updatedActive
    };
  }

  /**
   * 5. Get Active API Key String
   */
  function getActiveApiKey(provider, apiKeysByProvider, activeKeyIds) {
    const prov = provider || 'gemini';
    const keys = (apiKeysByProvider && apiKeysByProvider[prov]) || [];
    const activeId = activeKeyIds ? activeKeyIds[prov] : null;
    const found = keys.find(k => k && k.id === activeId);
    return found ? (found.key || '') : (keys[0] ? (keys[0].key || '') : '');
  }

  /**
   * 6. Rotate API Key
   */
  function rotateApiKey(provider, failingKey, apiKeysByProvider, activeKeyIdsRef, onRotatedCallback) {
    const prov = provider || 'gemini';
    const keys = ((apiKeysByProvider && apiKeysByProvider[prov]) || []).filter(k => k && k.key && k.key.trim());
    if (keys.length <= 1) return null;

    let currentIdx = -1;
    if (failingKey) {
      currentIdx = keys.findIndex(k => k.key === failingKey);
    }
    if (currentIdx === -1) {
      let currentId = (activeKeyIdsRef && activeKeyIdsRef.current) ? activeKeyIdsRef.current[prov] : null;
      if (!currentId) {
        try {
          if (typeof localStorage !== 'undefined') {
            const saved = JSON.parse(localStorage.getItem('activeKeyIds') || '{}');
            currentId = saved[prov];
          }
        } catch (e) {}
      }
      currentIdx = Math.max(0, keys.findIndex(k => k.id === currentId));
    }

    const nextIdx = (currentIdx + 1) % keys.length;
    const nextKey = keys[nextIdx];

    if (activeKeyIdsRef && activeKeyIdsRef.current) {
      activeKeyIdsRef.current = { ...activeKeyIdsRef.current, [prov]: nextKey.id };
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('activeKeyIds') || '{}');
        saved[prov] = nextKey.id;
        localStorage.setItem('activeKeyIds', JSON.stringify(saved));
      }
    } catch (e) {}

    if (typeof onRotatedCallback === 'function') {
      onRotatedCallback(nextKey.id, nextKey, nextIdx, keys.length);
    }

    return nextKey.key;
  }

  /**
   * 7. Test Single Key Connection & Health
   */
  async function testSingleKey(provider, keyStr, modelOverride) {
    if (!keyStr || !keyStr.trim()) {
      return { status: 'error', latency: 0, message: '❌ Key is empty' };
    }
    const prov = provider || 'gemini';
    const trimmedKey = keyStr.trim();
    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    try {
      if (prov === 'gemini') {
        const targetModel = modelOverride || 'gemini-3.8-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': trimmedKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } })
        });
        const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
        if (r.ok) {
          return { status: 'ok', latency, message: `🟢 Healthy & Active (${latency}ms)` };
        }
        const body = await r.text().catch(() => '');
        let detail = '';
        try {
          const j = JSON.parse(body);
          detail = j.error?.message || `HTTP ${r.status}`;
        } catch (e) {
          detail = body.slice(0, 120) || `HTTP ${r.status}`;
        }

        const retryMatch = detail.match(/retry in\s+([\d\.]+)\s*s/i);
        if (r.status === 429) {
          if (retryMatch) {
            const sec = Math.ceil(parseFloat(retryMatch[1]));
            return { status: 'cooling', latency, message: `⏳ Cooldown (${sec}s remaining · Key is Valid)` };
          } else if (/quota|exhausted/i.test(detail)) {
            return { status: 'exhausted', latency, message: `🔴 Daily Quota Exhausted (${latency}ms)` };
          }
          return { status: 'cooling', latency, message: `⏳ Rate Limited (429 · ${latency}ms)` };
        } else if (r.status === 400 || r.status === 403) {
          return { status: 'error', latency, message: `❌ Invalid Key / Unauthorized (${r.status})` };
        }
        return { status: 'error', latency, message: `❌ HTTP ${r.status}: ${detail}` };

      } else if (prov === 'deepseek') {
        const r = await fetch('https://api.deepseek.com/models', {
          headers: { 'Authorization': `Bearer ${trimmedKey}` }
        });
        const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
        if (r.ok) {
          return { status: 'ok', latency, message: `🟢 DeepSeek Active (${latency}ms)` };
        } else if (r.status === 401 || r.status === 403) {
          return { status: 'error', latency, message: `❌ Invalid DeepSeek Key (${r.status})` };
        } else if (r.status === 429) {
          return { status: 'cooling', latency, message: `⏳ DeepSeek Rate Limited (429 · ${latency}ms)` };
        }
        return { status: 'error', latency, message: `❌ DeepSeek Error: HTTP ${r.status}` };

      } else if (prov === 'openai') {
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${trimmedKey}` }
        });
        const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
        if (r.ok) {
          return { status: 'ok', latency, message: `🟢 OpenAI Active (${latency}ms)` };
        } else if (r.status === 401 || r.status === 403) {
          return { status: 'error', latency, message: `❌ Invalid OpenAI Key (${r.status})` };
        } else if (r.status === 429) {
          return { status: 'cooling', latency, message: `⏳ OpenAI Rate Limited / Quota Exceeded (429)` };
        }
        return { status: 'error', latency, message: `❌ OpenAI Error: HTTP ${r.status}` };

      } else if (prov === 'claude') {
        const r = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': trimmedKey, 'anthropic-version': '2023-06-01' }
        });
        const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
        if (r.ok) {
          return { status: 'ok', latency, message: `🟢 Anthropic Active (${latency}ms)` };
        } else if (r.status === 401 || r.status === 403) {
          return { status: 'error', latency, message: `❌ Invalid Anthropic Key (${r.status})` };
        }
        return { status: 'error', latency, message: `❌ Anthropic HTTP ${r.status}` };

      } else if (prov === 'deepl') {
        const isFree = trimmedKey.endsWith(':fx');
        const endpoint = isFree ? 'https://api-free.deepl.com/v2/usage' : 'https://api.deepl.com/v2/usage';
        const r = await fetch(endpoint, {
          headers: { 'Authorization': `DeepL-Auth-Key ${trimmedKey}` }
        });
        const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
        if (r.ok) {
          let usageInfo = '';
          try {
            const u = await r.json();
            if (u.character_count !== undefined && u.character_limit !== undefined) {
              const pct = Math.round((u.character_count / u.character_limit) * 100);
              usageInfo = ` (${pct}% used · ${(u.character_count).toLocaleString()}/${(u.character_limit).toLocaleString()} chars)`;
            }
          } catch (e) {}
          return { status: 'ok', latency, message: `🟢 DeepL ${isFree ? 'Free' : 'Pro'} Active (${latency}ms)${usageInfo}` };
        } else if (r.status === 403) {
          return { status: 'error', latency, message: `❌ Invalid DeepL Key (403)` };
        } else if (r.status === 456) {
          return { status: 'exhausted', latency, message: `🔴 DeepL Quota Exceeded (456)` };
        } else if (r.status === 429) {
          return { status: 'cooling', latency, message: `⏳ DeepL Rate Limited (429 · ${latency}ms)` };
        }
        return { status: 'error', latency, message: `❌ DeepL Error: HTTP ${r.status}` };

      } else {
        return { status: 'ok', latency: 0, message: '🟢 Key Saved & Ready' };
      }
    } catch (err) {
      return { status: 'error', latency: 0, message: `❌ Network Error: ${err.message || 'connection failed'}` };
    }
  }

  /**
   * 8. Test All Keys with Pauses
   */
  async function testAllKeys(provider, keys, modelOverride, callbacks = {}) {
    const list = Array.isArray(keys) ? keys : [];
    const provKeys = list.filter(k => k && k.key && k.key.trim());
    if (provKeys.length === 0) {
      if (typeof callbacks.onEmpty === 'function') callbacks.onEmpty();
      return { count: 0, results: {} };
    }
    if (typeof callbacks.onStart === 'function') callbacks.onStart(provKeys.length);
    const results = {};
    for (let i = 0; i < provKeys.length; i++) {
      const k = provKeys[i];
      if (typeof callbacks.onKeyTesting === 'function') callbacks.onKeyTesting(k.id, k);
      const res = await testSingleKey(provider, k.key, modelOverride);
      results[k.id] = res;
      if (typeof callbacks.onKeyResult === 'function') {
        callbacks.onKeyResult(k.id, res, k);
      }
      if (i < provKeys.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (typeof callbacks.onComplete === 'function') callbacks.onComplete(provKeys.length, results);
    return { count: provKeys.length, results };
  }

  /**
   * 9. Bulk Key Import & Profile Creation
   */
  function bulkImportKeys(rawText, provider, apiKeysByProvider, activeKeyIds, idGenerator) {
    if (!rawText || !rawText.trim()) {
      return { success: false, message: 'No valid API keys detected. Keys are usually 30+ characters.' };
    }
    const rawLines = rawText.split(/[\r\n,;]+/);
    const validKeys = rawLines.map(k => (k ? k.trim() : '')).filter(k => k.length > 15);
    if (validKeys.length === 0) {
      return {
        success: false,
        message: 'No valid API keys detected. Keys are usually 30+ characters.'
      };
    }

    const prov = provider || 'gemini';
    const provName = getProviderDisplayName(prov);
    const makeId = (typeof idGenerator === 'function') ? idGenerator : makeDefaultId;

    const newProfiles = validKeys.map((k, idx) => ({
      id: makeId(),
      name: `${provName} Key ${idx + 1}`,
      key: k
    }));

    const updatedMap = {
      ...(apiKeysByProvider || {}),
      [prov]: newProfiles
    };

    const updatedActive = { ...(activeKeyIds || {}) };
    if (newProfiles.length > 0) {
      updatedActive[prov] = newProfiles[0].id;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('apiKeysByProvider', JSON.stringify(updatedMap));
        localStorage.setItem('activeKeyIds', JSON.stringify(updatedActive));
      }
    } catch (e) {
      console.warn('KeyManagerEngine.bulkImportKeys storage error:', e);
    }

    return {
      success: true,
      apiKeysByProvider: updatedMap,
      activeKeyIds: updatedActive,
      count: newProfiles.length,
      provName,
      message: `🎉 Successfully imported ${newProfiles.length} ${provName} API keys!`
    };
  }

  /**
   * 10. Format Diagnostics Report
   */
  function formatDiagnosticsReport(options = {}) {
    const s = options.stats || options.overrideStats || null;
    const provider = options.provider || 'gemini';
    const fallbackModel = provider === 'gemini'
      ? (options.geminiModel || 'gemini-3.7-flash')
      : (options.deepseekModel || 'deepseek-chat');

    const modelStr = s ? `Model: ${s.provider || ''} · ${s.model || ''}` : `Model: ${provider} · ${fallbackModel}`;

    const isStreaming = s ? !!s.enableStreaming : !!options.enableStreaming;
    const isThinking = s ? !!s.enableThinking : !!options.enableThinking;
    const isStrict = (s ? s.strictModel : options.strictModel) ? 'ON' : 'OFF';
    const isContext = s ? (s.contextAware ? 'ON' : 'OFF') : (options.contextAware ? 'ON' : 'OFF');
    const concurrency = s ? (s.concurrency || 1) : (options.concurrency || 1);
    const chunkPreset = (s?.chunkSizePreset || options.chunkSizePreset || 'turbo').toUpperCase();
    const isSmartGlossary = (s ? s.smartGlossary : options.smartGlossary) ? 'ON' : 'OFF';
    const termCount = s ? (s.glossaryTermCount || 0) : (options.glossaryTermCount || 0);

    const tokenLine = s
      ? `Tokens: ${(s.totalTokens || 0).toLocaleString()} (${(s.promptTokens || 0).toLocaleString()} in · ${(s.outputTokens || 0).toLocaleString()} out)`
      : 'Tokens: In-flight / pending completion';

    const lines = [
      '=== 📊 TRANSLATION DIAGNOSTICS REPORT ===',
      modelStr,
      `Typewriter Streaming: ${isStreaming ? 'ON' : 'OFF'} | Extended Thinking: ${isThinking ? 'ON' : 'OFF'} | Strict Model: ${isStrict}`,
      `Context-Aware Memory: ${isContext} | Concurrency: ${concurrency} parallel stream(s)`,
      `Chunk Size Preset: ${chunkPreset} | Smart Glossary: ${isSmartGlossary} (${termCount} terms loaded)`,
      tokenLine
    ];

    if (s?.breakdown && s.promptTokens > 0) {
      const b = s.breakdown;
      if (b.glossaryTokens > 0) lines.push(`  ├─ Injected Glossary: ${(b.glossaryTokens || 0).toLocaleString()} tokens (${b.glossaryPct}%)`);
      lines.push(`  ├─ Raw Source Text: ${(b.sourceTokens || 0).toLocaleString()} tokens (${b.sourcePct}%)`);
      if (b.genderTokens > 0) lines.push(`  ├─ Gender Lock Protocol: ${(b.genderTokens || 0).toLocaleString()} tokens (${b.genderPct}%)`);
      if (b.contextTokens > 0) lines.push(`  ├─ Context-Aware Memory: ${(b.contextTokens || 0).toLocaleString()} tokens (${b.contextPct}%)`);
      lines.push(`  └─ System & Rules Overhead: ${(b.systemTokens || 0).toLocaleString()} tokens (${b.systemPct}%)`);
    }

    let wordsCount = 0;
    if (typeof options.words === 'number') {
      wordsCount = options.words;
    } else if (typeof options.wordCount === 'function') {
      wordsCount = options.wordCount(options.assembledText || '');
    } else if (typeof options.assembledText === 'string') {
      wordsCount = options.assembledText.trim().split(/\s+/).filter(Boolean).length;
    }

    const lastLine = s
      ? `Cost: ${s.cost || '$0.0000'} | Time: ${s.duration || ''} (${s.speed || 'N/A'}) | Words: ${wordsCount.toLocaleString()}`
      : `Words: ${wordsCount.toLocaleString()}`;
    lines.push(lastLine);

    return lines.join('\n');
  }

  const KeyManagerEngine = {
    addApiKey,
    deleteApiKey,
    updateApiKey,
    setActiveKey,
    getActiveApiKey,
    rotateApiKey,
    testSingleKey,
    testAllKeys,
    bulkImportKeys,
    formatDiagnosticsReport
  };

  global.KeyManagerEngine = KeyManagerEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyManagerEngine;
  }
})(typeof window !== 'undefined' ? window : this);
