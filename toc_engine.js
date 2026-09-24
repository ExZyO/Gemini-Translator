/* ═══════════════════════════════════════════════════════════════════════
   GEMINI TRANSLATOR - AI TABLE OF CONTENTS & MODEL CATALOG ENGINE (v8.17.64)
   AI Chapter title standardizer, hierarchy builder, and model tier categorizer
   ═══════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

// ═══════════════════════════════════════════════════════════════
// AI TABLE OF CONTENTS & METADATA POLISHER ENGINE
// ═══════════════════════════════════════════════════════════════
                            const aiPolishEpubToc = async function(sampleChapters, bookTitle, onRetryStatus, customProvider, customInstruction) {
  const provider = customProvider || localStorage.getItem('translationProvider') || 'gemini';
  
  let allKeys = [];
  try {
    const stored = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
    allKeys = (stored[provider] || []).map(p => p.key).filter(Boolean);
  } catch (e) {}

  if (allKeys.length === 0) {
    const single = localStorage.getItem(`${provider}ApiKey`) || (provider === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
    if (single) allKeys.push(single);
  }

  if (allKeys.length === 0) throw new Error(`${provider.toUpperCase()} API key required. Please configure your key in Settings .`);

  let keyIndex = 0;
  const getActiveKey = () => allKeys[keyIndex % allKeys.length];
  const rotateKey = () => { keyIndex++; return getActiveKey(); };

  const compactLines = sampleChapters.map(c => {
    let line = `${c.index}. ${c.rawName || ''}`;
    if (c.internalTitle) line += ` -> "${c.internalTitle}"`;
    return line;
  }).join('\n');

  const customUserRule = customInstruction ? `\nUSER CUSTOM INSTRUCTIONS:\n${customInstruction}\n` : '';

  const prompt = `You are an expert digital eBook editor and Table of Contents specialist.
Task: Standardize raw/scraped Table of Contents entries into clean, readable, professional titles by analyzing both file names AND the internal chapter text snippet provided.

CRITICAL RULES:
1. PRESERVE NOVEL HIERARCHY & SPECIAL SECTIONS:
   - If an entry is a Volume, Arc, Year, or Book (e.g. "Year 3, Volume 3", "Volume 1", "Book 2: Earth", "Arc 4"), PRESERVE the Volume/Arc name.
   - If an entry is a Prologue, Epilogue, Interlude, Monologue, Side Story (SS), Afterword, Synopsis, or Illustrations, KEEP its authentic character name (e.g. "Prologue: Shiina Hiyori's Monologue", "Illustrations", "Epilogue", "Side Story - Kushida", "1.1", "7.1", "E.1").
   - If an entry has Parts or Sub-chapters (e.g. "Part 1", "Part 2", "Chapter 1 - Part 1"), preserve the Part structure.
   - DO NOT flatten or renumber everything into a generic "Chapter 1 to 500" if the book is an anthology or light novel series with Volumes/Years/Arcs!
2. CLEAN STORY CHAPTERS:
   - Use the internal text snippet and heading to produce the true chapter title (e.g. "Chapter 1 - The Structure of Japanese Society").
   - Strip ugly web scrape artifacts and file paths (.xhtml, .html).${customUserRule}

Book Title: ${bookTitle || 'Unknown'}

Chapters to clean:
${compactLines}

Return strictly a JSON object with this exact format:
{
  "cleanedTitle": "Official Book Title",
  "chapters": [
{ "index": 1, "cleanedName": "Cleaned Title" }
  ]
}`;

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
  ];

  // Strictly verified official Gemini 3 Flash endpoints (high speed & high quota)
  const isCustomActive = localStorage.getItem('useCustomModel') === 'true';
  const storedCustomModel = (localStorage.getItem('customModel') || '').trim();
  const preferredModel = (isCustomActive && storedCustomModel) ? storedCustomModel : (localStorage.getItem('geminiModel') || 'gemini-3.8-flash');
  const geminiModels = Array.from(new Set([
    preferredModel,
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview'
  ])).filter(m => (m.startsWith('gemini') || m === preferredModel) && !m.includes('pro'));

  let modelIdx = 0;
  const maxAttempts = 30; // High resilience
  let backoffDelay = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = getActiveKey();
    try {
      let rawJson = '';
      let data = null;

      if (provider === 'gemini' || !provider) {
        const currentModel = geminiModels[modelIdx % geminiModels.length];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentKey}`;
        
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 14000);

        let res;
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              safetySettings,
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                // thinking disabled
              }
            })
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!res.ok) {
          const errTxt = await res.text().catch(() => '');
          const is404 = res.status === 404 || errTxt.includes('no longer available') || errTxt.includes('not found') || errTxt.includes('is not supported');
          const is503 = res.status === 503 || res.status === 500 || res.status === 502 || res.status === 504 || errTxt.includes('high demand') || errTxt.includes('UNAVAILABLE') || errTxt.includes('overloaded');
          const is429 = res.status === 429 || errTxt.includes('quota') || errTxt.includes('RESOURCE_EXHAUSTED') || errTxt.includes('rate limit');

          const isStrict = localStorage.getItem('strictModel') !== 'false';
          if ((is404 || is503) && !isStrict) {
            modelIdx++;
            const nextModel = geminiModels[modelIdx % geminiModels.length];
            const reason = is503 ? 'High Server Demand (503)' : 'Model Unavailable (404)';
            if (typeof window !== 'undefined' && window.notifyModelChange) {
              window.notifyModelChange(currentModel, nextModel, reason);
            }
            if (typeof onRetryStatus === 'function') onRetryStatus(`⚠️ Model switched: ${currentModel} → ${nextModel} (${reason})`);
            await new Promise(r => setTimeout(r, 800));
            continue;
          }

          if (is429) {
            rotateKey();
            const keyNum = (keyIndex % allKeys.length) + 1;
            const waitSec = Math.round(backoffDelay / 1000);
            for (let s = waitSec; s > 0; s--) {
              if (typeof onRetryStatus === 'function') {
                onRetryStatus(`Rate limit cooldown: retrying in ${s}s with Key ${keyNum}/${allKeys.length} (${currentModel})...`);
              }
              await new Promise(r => setTimeout(r, 1000));
            }
            backoffDelay = Math.min(backoffDelay * 1.3, 8000);
            continue;
          }
          throw new Error(`Gemini Error ${res.status}: ${errTxt.substring(0, 150)}`);
        }
        data = await res.json();
        
        // Correctly filter out thought reasoning tokens from Gemini 3
        const candidateParts = data?.candidates?.[0]?.content?.parts || [];
        const actualParts = candidateParts.filter(p => !p.thought);
        rawJson = actualParts.length > 0
          ? actualParts.map(p => p.text || '').join('')
          : (candidateParts.map(p => p.text || '').join(''));
      } else if (provider === 'deepseek') {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 15000);
        let res;
        try {
          res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
            signal: ctrl.signal,
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' }
            })
          });
        } finally {
          clearTimeout(timeoutId);
        }
        if (!res.ok) {
          const errTxt = await res.text().catch(() => '');
          if (res.status === 429 || res.status === 503) {
            await new Promise(r => setTimeout(r, backoffDelay));
            backoffDelay = Math.min(backoffDelay * 1.4, 8000);
            continue;
          }
          throw new Error(`DeepSeek Error ${res.status}: ${errTxt.substring(0, 150)}`);
        }
        data = await res.json();
        rawJson = data.choices?.[0]?.message?.content || '';
      } else if (provider === 'openai') {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 15000);
        let res;
        try {
          res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
            signal: ctrl.signal,
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' }
            })
          });
        } finally {
          clearTimeout(timeoutId);
        }
        if (!res.ok) {
          const errTxt = await res.text().catch(() => '');
          if (res.status === 429 || res.status === 503) {
            await new Promise(r => setTimeout(r, backoffDelay));
            backoffDelay = Math.min(backoffDelay * 1.4, 8000);
            continue;
          }
          throw new Error(`OpenAI Error ${res.status}: ${errTxt.substring(0, 150)}`);
        }
        data = await res.json();
        rawJson = data.choices?.[0]?.message?.content || '';
      } else if (provider === 'claude') {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 15000);
        let res;
        try {
          res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': currentKey, 'anthropic-version': '2023-06-01', 'dangerously-allow-browser': 'true' },
            signal: ctrl.signal,
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }]
            })
          });
        } finally {
          clearTimeout(timeoutId);
        }
        if (!res.ok) {
          const errTxt = await res.text().catch(() => '');
          if (res.status === 429 || res.status === 503) {
            await new Promise(r => setTimeout(r, backoffDelay));
            backoffDelay = Math.min(backoffDelay * 1.4, 8000);
            continue;
          }
          throw new Error(`Claude Error ${res.status}: ${errTxt.substring(0, 150)}`);
        }
        data = await res.json();
        rawJson = data.content?.[0]?.text || '';
      }

      let clean = rawJson.replace(/^\`\`\`json\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
      
      // Fallback regex to extract JSON object if wrapped in text
      if (!clean.startsWith('{')) {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) clean = match[0];
      }

      const parsed = JSON.parse(clean);
      
      let pTok = Math.ceil(prompt.length / 4);
      let oTok = Math.ceil(rawJson.length / 4);
      if (data?.usageMetadata) {
        pTok = data.usageMetadata.promptTokenCount || pTok;
        oTok = data.usageMetadata.candidatesTokenCount || oTok;
      } else if (data?.usage) {
        pTok = data.usage.prompt_tokens || data.usage.input_tokens || pTok;
        oTok = data.usage.completion_tokens || data.usage.output_tokens || oTok;
      }

      const activeModelName = provider === 'gemini' || !provider ? geminiModels[modelIdx % geminiModels.length] : (provider === 'deepseek' ? 'deepseek-chat' : (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku'));

      return {
        ...parsed,
        usage: {
          promptTokens: pTok,
          outputTokens: oTok,
          totalTokens: pTok + oTok,
          model: activeModelName,
          provider
        }
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const isTransient = isTimeout || (err.message || '').includes('429') || (err.message || '').includes('503') || (err.message || '').includes('quota') || (err.message || '').includes('demand') || (err.message || '').includes('404');
      if (isTransient && attempt < maxAttempts - 1) {
        modelIdx++;
        rotateKey();
        if (typeof onRetryStatus === 'function') {
          onRetryStatus(isTimeout ? 'Request timed out (14s). Switched to next key/model...' : `Transient error (${err.message.substring(0, 40)}). Retrying...`);
        }
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (attempt === maxAttempts - 1) throw err;
    }
  }
};

const formatModelName = (id, displayName) => {
  if (displayName && displayName !== id && !displayName.startsWith('models/')) return displayName;
  if (id.startsWith('gemini-')) {
    return id
      .split('-')
      .map((part, idx) => {
        if (idx === 0) return 'Gemini';
        if (/^\d+(\.\d+)?$/.test(part)) return part;
        if (part.toLowerCase() === '8b') return '8B';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }
  if (id.startsWith('gemma-')) {
    return id
      .split('-')
      .map((part, idx) => {
        if (idx === 0) return 'Gemma';
        return part.toUpperCase();
      })
      .join(' ');
  }
  return id.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const groupModelsByCompany = (models) => {
  const groups = {
    ' RECOMMENDED FREE TIER': [],
    ' FLAGSHIP & DEEP REASONING': [],
    ' ULTRA FAST & LITE': [],
    ' OTHER & OPEN WEIGHTS': []
  };

  for (const m of models) {
    const id = (m.id || '').toLowerCase();
    const name = (m.name || '').toLowerCase();

    if (id === 'gemini-3.5-flash-lite' || id === 'gemini-3.1-flash-lite' || name.includes('recommended free tier') || name.includes('fast & stable') || name.includes('highest free quota')) {
      groups[' RECOMMENDED FREE TIER'].push(m);
    } else if (id.includes('pro') || id.startsWith('gemini-3.7') || (id.startsWith('gemini-3.5-flash') && !id.includes('lite')) || name.includes('flagship') || name.includes('literary')) {
      groups[' FLAGSHIP & DEEP REASONING'].push(m);
    } else if (id.includes('lite') || id.includes('8b') || id.includes('nano') || name.includes('lite') || name.includes('lowest cost') || name.includes('high speed')) {
      groups[' ULTRA FAST & LITE'].push(m);
    } else {
      groups[' OTHER & OPEN WEIGHTS'].push(m);
    }
  }

  return Object.entries(groups).filter(([_, list]) => list.length > 0);
};

const fetchGeminiModels = async (apiKey) => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
  if (!r.ok) throw new Error('Failed to fetch models');
  const j = await r.json();
  const valid = (j.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent') &&
      !m.name.includes('embedding') &&
      !m.name.includes('aqa') &&
      !m.name.includes('imagen') &&
      !m.name.includes('tts') &&
      !m.name.includes('audio') &&
      !m.name.includes('bison') &&
      !m.name.includes('gecko') &&
      !m.name.includes('gemini-2') &&
      !m.name.includes('gemini-1'))
    .map(m => {
      const id = m.name.replace('models/', '');
      return { id, name: formatModelName(id, m.displayName) };
    });

        // Sort models logically: Gemini 3 Flash -> Lite -> Pro
        valid.sort((a, b) => {
    const getRank = id => {
      if (id.startsWith('gemini-3.7-flash')) return -40;
      if (id.startsWith('gemini-3.6-flash')) return -39;
      if (id.startsWith('gemini-3.5-flash-lite')) return -38;
      if (id.startsWith('gemini-3.1-flash-lite')) return -37;
      if (id.startsWith('gemini-3.5-flash')) return -36;
      if (id.startsWith('gemini-3.1-pro-preview')) return -35;
      if (id.startsWith('gemini-3-flash-preview')) return -34;
      return 0;
    };
    return getRank(a.id) - getRank(b.id);
  });
  return valid;
};

  if (typeof window !== 'undefined') {
    window.aiPolishEpubToc = aiPolishEpubToc;
    window.formatModelName = formatModelName;
    window.groupModelsByCompany = groupModelsByCompany;
    window.fetchGeminiModels = fetchGeminiModels;
  }

  return {
    aiPolishEpubToc,
    formatModelName,
    groupModelsByCompany,
    fetchGeminiModels
  };
}));
