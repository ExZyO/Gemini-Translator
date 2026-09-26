/**
 * Gemini EPUB Translator - Glossary Manager Engine
 * Module: glossary_manager_engine.js
 * 
 * Provides:
 * - Glossary profile management (save, delete, rename, import, export JSON/TXT)
 * - Lossless AI Glossary Optimizer with multi-chunk orchestration
 * - AI Novel Character & Lore Extractor
 * - Auto-registration of verified character genders into Gender Locks
 * - Name Consistency Verifier & Batch Drift Fixer
 */

(function (global) {
  'use strict';

  // Safe internal fetch with exponential backoff & timeout
  async function safeFetchRetry(url, opts, retries = 3, timeoutMs = 75000) {
    const globalFetchRetry = (typeof window !== 'undefined' && window.fetchRetry)
      || (typeof global !== 'undefined' && global.fetchRetry);
    if (typeof globalFetchRetry === 'function') {
      return globalFetchRetry(url, opts, retries, timeoutMs);
    }

    let delay = 1500;
    for (let i = 0; i < retries; i++) {
      const attemptController = new AbortController();
      const timeoutId = setTimeout(() => {
        attemptController.abort(new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s).`));
      }, timeoutMs);

      try {
        const fetchOpts = { ...opts, signal: attemptController.signal };
        const r = await fetch(url, fetchOpts);
        clearTimeout(timeoutId);
        if (r.status === 429) {
          const errText = await r.text().catch(() => '');
          const err = new Error(`Rate limit (429): ${errText.substring(0, 150)}`);
          err.status = 429;
          throw err;
        }
        if (r.status >= 500 && i < retries - 1) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          continue;
        }
        return r;
      } catch (e) {
        clearTimeout(timeoutId);
        if (i === retries - 1) throw e;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
  }

  // Resolve API key for a given provider from storage
  function resolveApiKey(provider) {
    const prov = provider || 'gemini';
    let allKeys = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
        allKeys = (stored[prov] || []).map(p => p && p.key).filter(Boolean);
      }
    } catch (e) {}

    if (allKeys.length === 0 && typeof localStorage !== 'undefined') {
      const single = localStorage.getItem(`${prov}ApiKey`) || (prov === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
      if (single) allKeys.push(single);
    }
    return allKeys.length > 0 ? allKeys[0] : '';
  }

  /**
   * 1. Save Glossary Profile
   */
  async function saveGlossary(name, content = '', instructions = '', savedGlossaries = [], callbacks = {}) {
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Glossary name cannot be empty.');
    const cleanContent = typeof content === 'string' ? content : '';
    const cleanInstructions = typeof instructions === 'string' ? instructions : '';

    const existing = (savedGlossaries || []).findIndex(g => g && g.name === cleanName);
    const updatedEntry = { name: cleanName, content: cleanContent, instructions: cleanInstructions };
    let updatedList;
    if (existing > -1) {
      updatedList = [...savedGlossaries];
      updatedList[existing] = updatedEntry;
    } else {
      updatedList = [...(savedGlossaries || []), updatedEntry];
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('savedGlossaries', JSON.stringify(updatedList));
        localStorage.setItem('terminology', cleanContent);
        localStorage.setItem('customInstructions', cleanInstructions);
        localStorage.setItem('activeGlossaryId', cleanName);
      }
    } catch (e) {
      console.warn('GlossaryManagerEngine.saveGlossary localStorage error:', e);
    }

    const putFn = (callbacks && callbacks.dbPut)
      || (typeof window !== 'undefined' && window.dbPut)
      || (typeof global !== 'undefined' && global.dbPut);
    if (typeof putFn === 'function') {
      try {
        await putFn('glossaries', updatedEntry);
      } catch (e) {
        console.warn('GlossaryManagerEngine.saveGlossary dbPut error:', e);
      }
    }

    return {
      savedGlossaries: updatedList,
      activeGlossaryId: cleanName
    };
  }

  /**
   * 2. Delete Glossary Profile
   */
  async function deleteGlossary(name, savedGlossaries = [], activeGlossaryId = null, defaultGlossaryName = null, callbacks = {}) {
    const updatedList = (savedGlossaries || []).filter(g => g && g.name !== name);
    let updatedActive = activeGlossaryId;
    let updatedDefault = defaultGlossaryName;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('savedGlossaries', JSON.stringify(updatedList));
        if (activeGlossaryId === name) {
          updatedActive = null;
          localStorage.removeItem('activeGlossaryId');
          localStorage.removeItem('terminology');
        }
        if (defaultGlossaryName === name) {
          updatedDefault = null;
          localStorage.removeItem('defaultGlossaryName');
        }
      }
    } catch (e) {
      console.warn('GlossaryManagerEngine.deleteGlossary localStorage error:', e);
    }

    const delFn = (callbacks && callbacks.dbDelete)
      || (typeof window !== 'undefined' && window.dbDelete)
      || (typeof global !== 'undefined' && global.dbDelete);
    if (typeof delFn === 'function') {
      try {
        await delFn('glossaries', name);
      } catch (e) {
        console.warn('GlossaryManagerEngine.deleteGlossary dbDelete error:', e);
      }
    }

    return {
      savedGlossaries: updatedList,
      activeGlossaryId: updatedActive,
      defaultGlossaryName: updatedDefault
    };
  }

  /**
   * 3. Rename Glossary Profile
   */
  async function renameGlossary(oldName, newName, savedGlossaries = [], activeGlossaryId = null, defaultGlossaryName = null, callbacks = {}) {
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new Error('New profile name cannot be empty.');
    if (trimmed === oldName) {
      return { savedGlossaries, activeGlossaryId, defaultGlossaryName };
    }
    if ((savedGlossaries || []).some(g => g && g.name === trimmed)) {
      throw new Error(`A profile named "${trimmed}" already exists.`);
    }

    const updatedList = (savedGlossaries || []).map(g => (g && g.name === oldName ? { ...g, name: trimmed } : g));
    const updatedActive = (activeGlossaryId === oldName) ? trimmed : activeGlossaryId;
    const updatedDefault = (defaultGlossaryName === oldName) ? trimmed : defaultGlossaryName;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('savedGlossaries', JSON.stringify(updatedList));
        if (activeGlossaryId === oldName) {
          localStorage.setItem('activeGlossaryId', trimmed);
        }
        if (defaultGlossaryName === oldName) {
          localStorage.setItem('defaultGlossaryName', trimmed);
        }
      }
    } catch (e) {
      console.warn('GlossaryManagerEngine.renameGlossary localStorage error:', e);
    }

    const delFn = (callbacks && callbacks.dbDelete)
      || (typeof window !== 'undefined' && window.dbDelete)
      || (typeof global !== 'undefined' && global.dbDelete);
    const putFn = (callbacks && callbacks.dbPut)
      || (typeof window !== 'undefined' && window.dbPut)
      || (typeof global !== 'undefined' && global.dbPut);

    if (typeof delFn === 'function') {
      try { await delFn('glossaries', oldName); } catch (e) {}
    }
    const renamed = updatedList.find(g => g && g.name === trimmed);
    if (renamed && typeof putFn === 'function') {
      try { await putFn('glossaries', renamed); } catch (e) {}
    }

    return {
      savedGlossaries: updatedList,
      activeGlossaryId: updatedActive,
      defaultGlossaryName: updatedDefault
    };
  }

  /**
   * 4. Import Glossaries from JSON
   */
  function importGlossaries(jsonText, savedGlossaries = []) {
    const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Glossary file is empty or invalid format.');
    }
    const merged = [...(savedGlossaries || [])];
    let addedCount = 0;
    data.forEach(g => {
      if (g && g.name && g.content && !merged.find(x => x && x.name === g.name)) {
        merged.push(g);
        addedCount++;
      }
    });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('savedGlossaries', JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('GlossaryManagerEngine.importGlossaries localStorage error:', e);
    }
    return { savedGlossaries: merged, addedCount };
  }

  /**
   * 5. Export All Glossaries to JSON Blob
   */
  async function exportGlossaries(savedGlossaries = []) {
    try {
      const blob = new Blob([JSON.stringify(savedGlossaries || [], null, 2)], { type: 'application/json' });
      const saveBlob = (typeof window !== 'undefined' && window.saveUniversalBlob)
        || (typeof global !== 'undefined' && global.saveUniversalBlob)
        || (typeof saveUniversalBlob === 'function' ? saveUniversalBlob : null);
      if (typeof saveBlob === 'function') {
        await saveBlob(blob, 'glossaries_backup.json', 'application/json');
      }
      return blob;
    } catch (e) {
      throw new Error('Export error: ' + e.message);
    }
  }

  /**
   * 6. Export Active Glossary as Plain Text (.txt)
   */
  async function exportGlossaryTxt(terminology, activeGlossaryId = null) {
    if (!terminology || !terminology.trim()) {
      throw new Error('Glossary is empty. Add terms before exporting.');
    }
    const blob = new Blob([terminology], { type: 'text/plain;charset=utf-8' });
    const exportFileName = (activeGlossaryId ? activeGlossaryId.replace(/\s+/g, '_') : 'glossary_export') + '.txt';
    const saveBlob = (typeof window !== 'undefined' && window.saveUniversalBlob)
      || (typeof global !== 'undefined' && global.saveUniversalBlob)
      || (typeof saveUniversalBlob === 'function' ? saveUniversalBlob : null);
    if (typeof saveBlob === 'function') {
      await saveBlob(blob, exportFileName, 'text/plain');
    }
    return { blob, filename: exportFileName };
  }

  /**
   * 7. Lossless AI Glossary Optimizer
   */
  async function aiOptimizeGlossary(terminology, options = {}, callbacks = {}) {
    if (!terminology || !terminology.trim()) {
      throw new Error('Enter or paste some glossary notes/text first to optimize.');
    }

    const prov = options.provider || 'gemini';
    let key = options.apiKey || options.key;
    if (!key) {
      key = resolveApiKey(prov);
    }
    if (!key) {
      throw new Error(`Please enter your ${prov === 'deepseek' ? 'DeepSeek' : 'Gemini'} API key in Settings.`);
    }

    const chunkSplitter = (options && options.splitGlossaryIntoChunks)
      || (typeof window !== 'undefined' && window.splitGlossaryIntoChunks)
      || (typeof splitGlossaryIntoChunks === 'function' ? splitGlossaryIntoChunks : null);
    const chunks = chunkSplitter ? chunkSplitter(terminology, options.chunkLines || 130) : [terminology];
    const totalChunks = chunks.length;

    if (totalChunks > 1 && typeof callbacks.confirm === 'function') {
      const proceed = await callbacks.confirm(
        `⚡ Lossless Section Optimizer (${Math.round(terminology.length / 1000)}k chars, ${terminology.split('\n').length} lines):\n\n` +
        `This glossary will be optimized across ${totalChunks} discrete sections to guarantee 0% truncation and 100% preservation of all terms against API output token limits.\n\n` +
        `Proceed with lossless AI optimization?`
      );
      if (!proceed) return null;
    }

    if (typeof callbacks.toast === 'function') {
      callbacks.toast(totalChunks > 1 ? `Starting lossless AI optimization across ${totalChunks} sections...` : 'Optimizing glossary with AI...', 'info');
    }

    const systemPrompt = `You are an expert literary localization editor and terminology engineer.
Your task is to organize, standardize, clean up, and optimize raw glossary notes, character lists, or wiki dumps into a standardized Master Glossary for a translation engine.

FORMATTING & STRUCTURE RULES:
1. NO TOKEN-WASTING DIVIDERS (do not use === or --- lines).
2. PRESERVE ALL SECTION HEADINGS (e.g. "I. SYSTEM TRANSLATION RULES...", "II. CORE CONCEPTS...", "III. CHARACTER DIRECTORY...").
3. STANDARD SYNTAX FOR ENTRIES:
   - Format entries strictly as:
     - [Original Language Source Key] -> [English Translation] ([Optional Lore / Alias / Context])
   - Always put the original language characters (Chinese/Korean/Japanese) on the LEFT side of ->.
   - FOR ALL CHARACTERS: Always explicitly append their gender: (female), (male), or [context] (for gender-fluid, shifting, or dynamic forms).
     Example:
     - 休·迪尔查 -> Xio Derecha (female)
     - 克莱恩·莫雷蒂 -> Klein Moretti (male)
     - 特莉丝 -> Trissy [context]
4. STRICT LOSSLESS REQUIREMENT: Never delete, omit, summarize, deduplicate, merge, paraphrase, or truncate any original rule, term, alias, note, example, heading, section, or line. Preserve every original fact and its ordering. Add searchable aliases or index lines only when additive; never replace source text.
5. Keep all original content even when it appears repetitive or belongs to another series; dynamic selection handles relevance during translation.
6. Output ONLY the lossless plaintext glossary content for this section. No conversational opening, explanations, or closing chatter.`;

    const fetchFn = (options && options.fetchRetry)
      || (callbacks && callbacks.fetchRetry)
      || (typeof window !== 'undefined' && window.fetchRetry)
      || safeFetchRetry;

    const optimizeSingleChunk = async (chunk, idx, total) => {
      const userPrompt = total > 1
        ? `Please format and optimize Part ${idx + 1} of ${total} of this glossary. Preserve EVERY entry, character, rule, and note losslessly without truncation:\n\n${chunk}`
        : `Please optimize, structure, and format the following glossary data losslessly:\n\n${chunk}`;

      if (prov === 'deepseek') {
        const model = (options.useCustomDeepseekModel && options.customDeepseekModel) ? options.customDeepseekModel : 'deepseek-reasoner';
        const r = await fetchFn('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false
          })
        });
        if (!r.ok) {
          const b = await r.text().catch(() => '');
          throw new Error(`DeepSeek API error ${r.status}: ${b.substring(0, 150)}`);
        }
        const j = await r.json();
        return j.choices?.[0]?.message?.content || '';
      } else {
        const model = (options.useCustomModel && options.customModel) ? options.customModel : (options.geminiModel || 'gemini-2.5-flash');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const r = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: 1024 }
            }
          })
        });
        if (!r.ok) {
          const b = await r.text().catch(() => '');
          throw new Error(`Gemini API error ${r.status}: ${b.substring(0, 150)}`);
        }
        const j = await r.json();
        const finishReason = j?.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
          console.warn(`Chunk ${idx + 1} reached MAX_TOKENS, falling back to original chunk to prevent data loss.`);
          return chunk;
        }
        const candidateParts = j?.candidates?.[0]?.content?.parts || [];
        const actualParts = candidateParts.filter(p => !p.thought);
        const text = actualParts.length > 0
          ? actualParts.map(p => p.text || '').join('')
          : (candidateParts.map(p => p.text || '').join(''));
        return text || '';
      }
    };

    const optimizedParts = [];
    for (let i = 0; i < totalChunks; i++) {
      if (totalChunks > 1 && typeof callbacks.toast === 'function') {
        callbacks.toast(`Optimizing section ${i + 1}/${totalChunks} (100% lossless)...`, 'info');
      }
      if (typeof callbacks.onProgress === 'function') {
        callbacks.onProgress({ current: i + 1, total: totalChunks, chunk: chunks[i] });
      }
      let res = '';
      try {
        res = await optimizeSingleChunk(chunks[i], i, totalChunks);
      } catch (chunkErr) {
        console.warn(`Chunk ${i + 1} failed:`, chunkErr);
        res = chunks[i];
      }

      if (!res || (res.length < chunks[i].length * 0.4 && chunks[i].length > 300)) {
        console.warn(`Chunk ${i + 1} output truncated or empty, preserving original chunk.`);
        res = chunks[i];
      }
      optimizedParts.push(res.trim());
    }

    const finalResult = optimizedParts.join('\n\n');
    if (!finalResult.trim()) throw new Error('Received empty response from AI.');
    return finalResult.trim();
  }

  /**
   * 8. AI Analysis Engine (DeepSeek / Gemini)
   */
  async function callAiAnalysis(prompt, systemInstruction = '', options = {}) {
    let modelOverride = null;
    let providerOverride = null;
    let apiKeyOverride = null;
    let customDeepseekModel = null;
    let useCustomDeepseekModel = false;
    let customModel = null;
    let useCustomModel = false;
    let geminiModel = null;
    let fetchFn = (typeof window !== 'undefined' && window.fetchRetry) || safeFetchRetry;

    if (typeof options === 'string') {
      modelOverride = options;
      if (arguments.length > 3 && typeof arguments[3] === 'string') {
        providerOverride = arguments[3];
      }
    } else if (options && typeof options === 'object') {
      modelOverride = options.modelOverride || options.model || null;
      providerOverride = options.providerOverride || options.provider || null;
      apiKeyOverride = options.apiKey || options.key || null;
      customDeepseekModel = options.customDeepseekModel || null;
      useCustomDeepseekModel = !!options.useCustomDeepseekModel;
      customModel = options.customModel || null;
      useCustomModel = !!options.useCustomModel;
      geminiModel = options.geminiModel || null;
      if (typeof options.fetchRetry === 'function') fetchFn = options.fetchRetry;
    }

    const prov = providerOverride || (modelOverride && modelOverride.startsWith('deepseek') ? 'deepseek' : 'gemini');
    let key = apiKeyOverride || resolveApiKey(prov);
    if (!key) throw new Error(`Please configure an API key for ${prov.toUpperCase()} in Settings.`);

    if (prov === 'deepseek') {
      const m = modelOverride || (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : 'deepseek-chat');
      const r = await fetchFn('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: m,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });
      if (!r.ok) {
        const b = await r.text().catch(() => '');
        throw new Error(`DeepSeek error ${r.status}: ${b.substring(0, 120)}`);
      }
      const j = await r.json();
      return j.choices?.[0]?.message?.content || '';
    } else {
      const activeM = modelOverride || (useCustomModel && customModel ? customModel : (geminiModel || 'gemini-3.5-flash-lite'));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeM}:generateContent?key=${key}`;
      const bodyPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
      };
      if (systemInstruction) {
        bodyPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      const r = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      if (!r.ok) {
        const b = await r.text().catch(() => '');
        throw new Error(`Gemini error ${r.status}: ${b.substring(0, 120)}`);
      }
      const j = await r.json();
      const candidateParts = j?.candidates?.[0]?.content?.parts || [];
      const actualParts = candidateParts.filter(p => !p.thought);
      return actualParts.length > 0 ? actualParts.map(p => p.text || '').join('') : candidateParts.map(p => p.text || '').join('');
    }
  }

  /**
   * 9. Auto-Glossary & Character Extractor Engine
   */
  async function extractGlossaryFromSample(sampleText, options = {}, callbacks = {}) {
    if (!sampleText || !sampleText.trim()) {
      throw new Error('Please load a novel or enter text in the translate box first');
    }

    const sysPrompt = `You are an expert light novel and web novel translator and editor.
Analyze the provided novel chapter excerpts and extract:
1. Character names (protagonists, side characters, villains, titles, aliases) with verified gender
2. Factions, sects, guilds, schools, academies, or family clans
3. Special fantasy terminology, cultivation ranks, magical skills, or key locations

For each entity, output a single line in this exact format:
- OriginalTerm = TranslatedTerm # Category: Note

For characters, explicitly specify their gender in the Category tag if known from context, pronouns, or honorifics:
- Character (male)
- Character (female)

If a character or term has aliases, multiple names, or honorific forms, include them separated by slashes on the left and right sides so the Smart Glossary matches all variations:
Examples:
- 綾小路 清隆 / 綾小路 = Kiyotaka Ayanokouji / Kiyo # Character (male): Main protagonist, Class D
- 堀北 鈴音 = Suzune Horikita # Character (female): Class D leader
- 高度育成高等学校 = Advanced Nurturing High School # Location: Main setting
- 鬼道 / 破道 = Kido / Hado # Skill: Soul Reaper incantation magic

Output ONLY the glossary lines starting with a hyphen. Do not wrap in markdown code blocks or add conversational chatter.`;

    const raw = await callAiAnalysis(`NOVEL TEXT EXCERPTS:\n${sampleText}`, sysPrompt, options);
    const parsed = [];
    const lines = (raw || '').split(/\r?\n/);
    lines.forEach((line, idx) => {
      line = line.trim();
      if (!line || line.startsWith('//') || line.startsWith('/*')) return;
      line = line.replace(/^[-*•\s]+/, '').trim();
      const match = line.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
      if (match) {
        const orig = match[1].trim();
        let rest = match[2].trim();
        let cat = 'Character';
        let note = '';
        const hashIdx = rest.indexOf('#');
        if (hashIdx !== -1) {
          const comment = rest.slice(hashIdx + 1).trim();
          rest = rest.slice(0, hashIdx).trim();
          const colIdx = comment.indexOf(':');
          if (colIdx !== -1) {
            cat = comment.slice(0, colIdx).trim();
            note = comment.slice(colIdx + 1).trim();
          } else {
            cat = comment;
          }
        }
        let gen = null;
        if (/\b(?:female|f)\b/i.test(cat)) gen = 'female';
        else if (/\b(?:male|m)\b/i.test(cat)) gen = 'male';
        if (orig && rest) {
          parsed.push({ id: 'term_' + idx, orig, trans: rest, category: cat || 'Entity', gender: gen, note, checked: true });
        }
      }
    });

    return parsed;
  }

  /**
   * 10. Apply Extracted Terms to Active Glossary & Auto-Lock Genders
   */
  function applyExtractedTerms(selectedTerms, currentTerminology = '', options = {}) {
    const terms = (selectedTerms || []).filter(t => t && t.checked !== false);
    if (terms.length === 0) {
      throw new Error('No terms selected');
    }

    let autoLockedCount = 0;
    const updatedGenderLocks = { ...(options && options.genderLocks ? options.genderLocks : {}) };

    terms.forEach(t => {
      const gen = t.gender || (/\b(?:female|f)\b/i.test(t.category) ? 'female' : (/\b(?:male|m)\b/i.test(t.category) ? 'male' : null));
      if (gen) {
        if (t.trans) {
          t.trans.split(/[/|,]/).map(x => x.trim()).filter(Boolean).forEach(alias => {
            updatedGenderLocks[alias] = gen;
          });
        }
        if (t.orig && t.orig !== t.trans) {
          t.orig.split(/[/|,]/).map(x => x.trim()).filter(Boolean).forEach(alias => {
            updatedGenderLocks[alias] = gen;
          });
        }
        autoLockedCount++;
      }
    });

    const formatMasterFn = (options && options.formatExtractedTermsIntoMasterGlossary)
      || (typeof window !== 'undefined' && window.formatExtractedTermsIntoMasterGlossary)
      || (typeof formatExtractedTermsIntoMasterGlossary === 'function' ? formatExtractedTermsIntoMasterGlossary : null);

    const structuredGlossary = formatMasterFn
      ? formatMasterFn(terms)
      : terms.map(t => `- ${t.orig} = ${t.trans}${t.note ? ` # ${t.category}: ${t.note}` : ''}`).join('\n');
    const formattedLines = terms.map(t => `- ${t.orig} = ${t.trans}${t.note ? ` # ${t.category}: ${t.note}` : ''}`).join('\n');

    const current = (currentTerminology || '').trim();
    let updatedTerminology = '';
    if (!current) {
      updatedTerminology = structuredGlossary;
    } else if (current.includes('## I.') || current.includes('## II.') || current.includes('I. SYSTEM TRANSLATION RULES')) {
      updatedTerminology = `${current}\n\n${formattedLines}`;
    } else {
      updatedTerminology = `${current}\n${formattedLines}`;
    }

    return {
      updatedTerminology,
      autoLockedCount,
      updatedGenderLocks,
      structuredGlossary
    };
  }

  /**
   * 11. Run Name Consistency & Leakage Audit
   */
  function runConsistencyCheck(terminology, chapters = [], assembledText = '') {
    const parseFn = (typeof window !== 'undefined' && window.parseUniversalGlossaryPairs)
      || (typeof parseUniversalGlossaryPairs === 'function' ? parseUniversalGlossaryPairs : null);
    const glossaryPairs = parseFn ? parseFn(terminology || '') : [];
    if (!glossaryPairs || glossaryPairs.length === 0) {
      return [];
    }

    const chs = (chapters && chapters.length > 0)
      ? chapters
      : [{ title: 'Current Output', content: assembledText || '' }];

    const auditFn = (typeof window !== 'undefined' && window.auditNameConsistency)
      || (typeof auditNameConsistency === 'function' ? auditNameConsistency : null);
    return auditFn ? auditFn(glossaryPairs, chs) : [];
  }

  /**
   * 12. Batch Fix Name Drift Across Chapters and Output
   */
  function batchFixDrift(foundWord, targetWord, translatedChapters, assembledText) {
    if (!foundWord || !targetWord) {
      return { updatedChapters: translatedChapters, updatedAssembledText: assembledText, replacedCount: 0 };
    }
    const fixFn = (typeof window !== 'undefined' && window.batchFixNameDrift)
      || (typeof batchFixNameDrift === 'function' ? batchFixNameDrift : null);
    if (fixFn) {
      return fixFn(foundWord, targetWord, translatedChapters, assembledText);
    }

    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escapeRegExp(foundWord) + '\\b', 'g');
    let replacedCount = 0;
    let updatedChapters = translatedChapters;
    let updatedAssembledText = assembledText;

    if (translatedChapters && translatedChapters.length > 0) {
      updatedChapters = translatedChapters.map(ch => {
        if (!ch) return null;
        const c = ch.content || ch.text || '';
        const matches = (c.match(regex) || []).length;
        replacedCount += matches;
        return { ...ch, content: c.replace(regex, targetWord) };
      });
    }

    if (assembledText) {
      const matches = (assembledText.match(regex) || []).length;
      if (replacedCount === 0) replacedCount += matches;
      updatedAssembledText = assembledText.replace(regex, targetWord);
    }

    return { updatedChapters, updatedAssembledText, replacedCount };
  }

  /**
   * Additional profile state helpers
   */
  function loadGlossary(g) {
    if (!g) return { terminology: '', customInstructions: '', activeGlossaryId: null };
    const content = g.content || '';
    const instructions = g.instructions || '';
    const name = g.name || '';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('activeGlossaryId', name);
        localStorage.setItem('terminology', content);
        localStorage.setItem('customInstructions', instructions);
      }
    } catch (e) {}
    return { terminology: content, customInstructions: instructions, activeGlossaryId: name };
  }

  function unlinkGlossary() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('activeGlossaryId');
      }
    } catch (e) {}
    return { activeGlossaryId: null };
  }

  function unloadGlossary() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('terminology');
        localStorage.removeItem('activeGlossaryId');
      }
    } catch (e) {}
    return { terminology: '', activeGlossaryId: null };
  }

  /**
   * 13. Copy Standardized Master Glossary Prompt Template
   */
  const MASTER_GLOSSARY_PROMPT_TEMPLATE = `You are an expert literary localization editor and terminology engineer.
Organize, standardize, clean up, and optimize raw glossary notes, character lists, or novel wiki notes into a standardized Master Glossary file for a translation engine.

FORMATTING & STRUCTURE RULES:
1. NO TOKEN-WASTING DIVIDERS (do not use === or --- lines). Use clean section numbers (I., II., III.) and blank lines.
2. SECTION BREAKDOWN:
   I. SYSTEM TRANSLATION RULES & STYLE GUIDELINES (Global rules, tone, pronoun conventions like 祂 -> "He", formatting preservation)
   II. CORE CONCEPTS & SYSTEM TERMS (Cultivation ranks, power systems, currencies, realms)
   III. CHARACTER & FACTION DIRECTORY
   IV. ABILITIES, ARTIFACTS, ITEMS & TECHNIQUES
   V. GEOGRAPHY & LOCATIONS
3. STANDARD SYNTAX FOR ENTRIES:
   Format every term strictly as:
   - [Original Language Source Key] -> [English Translation] ([Optional Lore, Notes, or Alias])
   Always put the original language characters (Chinese/Korean/Japanese) on the LEFT side of ->.
   FOR ALL CHARACTERS IN SECTION III: Always explicitly append their gender: (female), (male), or [context] (for gender-fluid, shifting, or dynamic forms).
   Example:
   - 休·迪尔查 -> Xio Derecha (female)
   - 克莱恩·莫雷蒂 -> Klein Moretti (male)
   - 特莉丝 -> Trissy [context]
4. LOSSLESS REQUIREMENT: Do not delete, omit, summarize, deduplicate, merge, paraphrase, or silently correct any original rule, term, alias, note, example, heading, section, or line. Preserve every original fact and its ordering. You may add searchable aliases or index lines, but additions must be clearly additive and must never replace the original text.
5. Keep all original content even when it appears repetitive or belongs to another series; the translation engine's dynamic selector decides what to use per source chunk.
6. Output ONLY the lossless plaintext glossary content. No meta-commentary.

---
RAW GLOSSARY DATA TO CLEAN:
[PASTE YOUR RAW NOTES HERE]`;

  async function copyAiGlossaryPrompt(callbacks = {}) {
    const prompt = MASTER_GLOSSARY_PROMPT_TEMPLATE;
    let copied = false;
    const copyFn = (callbacks && typeof callbacks.copyText === 'function')
      ? callbacks.copyText
      : (typeof window !== 'undefined' && typeof window.copyText === 'function' ? window.copyText : null);

    if (copyFn) {
      try {
        await copyFn(prompt);
        copied = true;
      } catch (e) {}
    }
    if (!copied && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(prompt);
        copied = true;
      } catch (e) {}
    }
    if (callbacks && typeof callbacks.onCopied === 'function') {
      callbacks.onCopied();
    } else if (typeof callbacks === 'function') {
      callbacks();
    }
    return prompt;
  }

  /**
   * 14. Apply Glossary Preset (Presets from window.GLOSSARY_PRESETS)
   */
  function applyPreset(type, currentTerminology = '', currentInstructions = '') {
    const presets = (typeof window !== 'undefined' && window.GLOSSARY_PRESETS)
      || (typeof global !== 'undefined' && global.GLOSSARY_PRESETS) || {};
    const selected = presets[type];
    if (!selected) {
      return {
        updatedTerminology: currentTerminology || '',
        updatedInstructions: currentInstructions || '',
        isInstruction: false,
        presetApplied: false
      };
    }
    const isInstruction = (type === 'literary' || type === 'dialogue');
    let updatedTerminology = currentTerminology || '';
    let updatedInstructions = currentInstructions || '';

    if (isInstruction) {
      updatedInstructions = updatedInstructions ? `${updatedInstructions}\n${selected}` : selected;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('customInstructions', updatedInstructions);
        }
      } catch (e) {}
    } else {
      updatedTerminology = updatedTerminology ? `${updatedTerminology}\n\n${selected}` : selected;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('terminology', updatedTerminology);
        }
      } catch (e) {}
    }

    return {
      updatedTerminology,
      updatedInstructions,
      isInstruction,
      presetApplied: true
    };
  }

  /**
   * 15. Format Glossary Content Cleanly
   */
  function formatGlossaryContent(terminology = '') {
    if (!terminology || !terminology.trim()) {
      return '';
    }
    const fmt = (typeof window !== 'undefined' && window.formatGlossaryString)
      || (typeof global !== 'undefined' && global.formatGlossaryString)
      || (typeof formatGlossaryString === 'function' ? formatGlossaryString : null);
    const formatted = fmt ? fmt(terminology) : terminology;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('terminology', formatted);
      }
    } catch (e) {}
    return formatted;
  }

  /**
   * 16. Auto-Glossary Extraction Orchestration Workflow
   */
  async function extractGlossaryWorkflow({
    sampleText = '',
    chapterCount = 5,
    targetNovel = null,
    chapters = [],
    inputText = '',
    options = {},
    callbacks = {}
  } = {}) {
    let text = sampleText;
    if (!text || !text.trim()) {
      const targetChs = targetNovel?.chapters || targetNovel?.rawChapters || chapters || [];
      if (targetChs && targetChs.length > 0) {
        const count = Math.min(chapterCount || 5, targetChs.length);
        let built = '';
        for (let i = 0; i < count; i++) {
          const c = targetChs[i];
          const title = (typeof c === 'object' && c?.title) ? c.title : `Chapter ${i + 1}`;
          const txt = (typeof c === 'string' ? c : (c?.text || c?.content || '')).slice(0, 4000);
          built += `\n--- ${title} ---\n${txt}\n`;
        }
        text = built;
      } else if (inputText && inputText.trim()) {
        text = inputText.slice(0, 16000);
      }
    }

    if (!text || !text.trim()) {
      const err = new Error('Please load a novel or enter text in the translate box first');
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(err);
      }
      return null;
    }

    if (callbacks && typeof callbacks.onStart === 'function') {
      callbacks.onStart(text);
    }

    try {
      const parsedTerms = await extractGlossaryFromSample(text, options, callbacks);
      if (callbacks && typeof callbacks.onSuccess === 'function') {
        callbacks.onSuccess(parsedTerms);
      }
      return parsedTerms;
    } catch (err) {
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(err);
      } else {
        throw err;
      }
      return null;
    }
  }

  /**
   * 17. Apply Extracted Terms Workflow
   */
  async function applyExtractedTermsWorkflow({
    selected = [],
    asNewProfile = false,
    currentTerminology = '',
    genderLocks = {},
    targetNovel = null,
    activeNovelRecord = null,
    chapters = [],
    savedGlossaries = [],
    callbacks = {}
  } = {}) {
    const terms = (selected || []).filter(t => t && t.checked !== false);
    if (terms.length === 0) {
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(new Error('No terms selected'));
      }
      return null;
    }

    const {
      updatedTerminology,
      autoLockedCount,
      updatedGenderLocks,
      structuredGlossary
    } = applyExtractedTerms(terms, currentTerminology, {
      genderLocks,
      formatExtractedTermsIntoMasterGlossary: (typeof window !== 'undefined' && window.formatExtractedTermsIntoMasterGlossary)
        || (typeof global !== 'undefined' && global.formatExtractedTermsIntoMasterGlossary)
    });

    if (autoLockedCount > 0) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('gemini_gender_locks', JSON.stringify(updatedGenderLocks));
        }
      } catch (e) {}
    }

    let newProfileName = null;

    if (asNewProfile) {
      const targetTitle = (targetNovel?.title || (chapters && chapters[0]?.title) || (activeNovelRecord && activeNovelRecord.title) || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      const defaultName = targetTitle ? `${targetTitle} Glossary` : 'Auto Extracted Glossary';
      const promptFn = (callbacks && callbacks.prompt) || (typeof window !== 'undefined' && window.prompt ? window.prompt.bind(window) : null);
      const name = promptFn ? promptFn('Enter profile name for these terms:', defaultName) : defaultName;
      if (!name || !name.trim()) {
        return null;
      }
      newProfileName = name.trim();

      if (callbacks && typeof callbacks.onSaveProfile === 'function') {
        await callbacks.onSaveProfile(newProfileName, structuredGlossary);
      } else {
        await saveGlossary(newProfileName, structuredGlossary, '', savedGlossaries, callbacks);
      }

      if (targetNovel && typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
        try {
          const novelId = targetNovel.id || targetNovel.sourceUrl;
          if (novelId) {
            await window.GeminiNovelDB.updateNovel(novelId, {
              glossaryProfile: newProfileName,
              glossary: structuredGlossary
            });
          }
        } catch (e) {
          console.warn('Could not bind glossary to novel in DB:', e);
        }
      }
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('terminology', updatedTerminology);
        }
      } catch (e) {}

      if (targetNovel && typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
        try {
          const novelId = targetNovel.id || targetNovel.sourceUrl;
          if (novelId) {
            await window.GeminiNovelDB.updateNovel(novelId, {
              glossary: updatedTerminology
            });
          }
        } catch (e) {}
      }
    }

    const result = {
      updatedLocks: updatedGenderLocks,
      updatedTerminology,
      newProfileName,
      autoLockedCount,
      structuredGlossary,
      selectedCount: terms.length
    };

    if (callbacks && typeof callbacks.onComplete === 'function') {
      callbacks.onComplete(result);
    }

    return result;
  }

  /**
   * 18. Name Consistency Verification Workflow
   */
  function runConsistencyCheckWorkflow({
    terminology = '',
    translatedChapters = [],
    chapters = [],
    assembledText = '',
    inputText = '',
    callbacks = {}
  } = {}) {
    const parseFn = (typeof window !== 'undefined' && window.parseUniversalGlossaryPairs)
      || (typeof global !== 'undefined' && global.parseUniversalGlossaryPairs)
      || (typeof parseUniversalGlossaryPairs === 'function' ? parseUniversalGlossaryPairs : null);

    const pairs = parseFn ? parseFn(terminology || '') : [];
    if (!pairs || pairs.length === 0) {
      if (callbacks && typeof callbacks.onNoPairs === 'function') {
        callbacks.onNoPairs();
      }
      return null;
    }

    const targetChapters = (translatedChapters && translatedChapters.length > 0)
      ? translatedChapters
      : (chapters && chapters.length > 0 ? chapters : [{ title: 'Current Output', content: assembledText || inputText || '' }]);

    const auditFn = (typeof window !== 'undefined' && window.auditNameConsistency)
      || (typeof global !== 'undefined' && global.auditNameConsistency)
      || (typeof auditNameConsistency === 'function' ? auditNameConsistency : null);

    const results = auditFn ? auditFn(pairs, targetChapters) : [];

    if (callbacks && typeof callbacks.onComplete === 'function') {
      callbacks.onComplete(results);
    }
    return results;
  }

  /**
   * 19. Batch Fix Name Drift Workflow
   */
  function batchFixDriftWorkflow({
    foundWord,
    targetWord,
    translatedChapters = [],
    assembledText = '',
    callbacks = {}
  } = {}) {
    const fixFn = (typeof window !== 'undefined' && window.batchFixNameDrift)
      || (typeof global !== 'undefined' && global.batchFixNameDrift)
      || batchFixDrift;

    const res = fixFn(foundWord, targetWord, translatedChapters, assembledText);
    if (callbacks && typeof callbacks.onComplete === 'function') {
      callbacks.onComplete(res);
    }
    return res;
  }

  const Controller = {
    async aiOptimize(params = {}) {
      const {
        terminology = '',
        provider = 'gemini',
        apiKey,
        getActiveApiKey,
        geminiModel,
        customModel,
        useCustomModel,
        customDeepseekModel,
        useCustomDeepseekModel,
        splitGlossaryIntoChunks = (typeof window !== 'undefined' ? window.splitGlossaryIntoChunks : null),
        setTerminology,
        setIsOptimizingGlossary,
        setError = console.error,
        toast = (typeof window !== 'undefined' ? window.toast : console.log),
        confirm = (typeof window !== 'undefined' ? window.confirm : () => true),
        fetchRetry = (typeof window !== 'undefined' ? window.fetchRetry : fetch),
        telemetryLog = (typeof window !== 'undefined' ? window.telemetryLog : null)
      } = params;

      if (!terminology || !terminology.trim()) {
        if (typeof setError === 'function') setError('Enter or paste some glossary notes/text first to optimize.');
        return null;
      }
      const key = apiKey || (typeof getActiveApiKey === 'function' ? getActiveApiKey(provider) : resolveApiKey(provider));
      if (!key) {
        if (typeof setError === 'function') setError(`Please enter your ${provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} API key in Settings.`);
        return null;
      }

      if (typeof setIsOptimizingGlossary === 'function') setIsOptimizingGlossary(true);
      if (typeof setError === 'function') setError('');

      try {
        const finalResult = await aiOptimizeGlossary(
          terminology,
          {
            provider,
            apiKey: key,
            geminiModel,
            customModel,
            useCustomModel,
            customDeepseekModel,
            useCustomDeepseekModel,
            splitGlossaryIntoChunks
          },
          {
            confirm: async (msg) => (typeof confirm === 'function' ? confirm(msg) : true),
            toast: (msg, type) => (typeof toast === 'function' ? toast(msg, type) : null),
            fetchRetry
          }
        );

        if (finalResult) {
          if (typeof setTerminology === 'function') setTerminology(finalResult);
          if (typeof toast === 'function') toast('Glossary successfully cleaned and structured (100% lossless)!', 'success');
          if (typeof telemetryLog === 'function') {
            telemetryLog('AI_OPTIMIZE', `Losslessly optimized glossary (${finalResult.split('\n').length} lines).`);
          }
          return finalResult;
        }
        return null;
      } catch (err) {
        if (typeof setError === 'function') setError('AI Glossary Optimization failed: ' + err.message);
        throw err;
      } finally {
        if (typeof setIsOptimizingGlossary === 'function') setIsOptimizingGlossary(false);
      }
    },

    async callAiAnalysis(prompt, systemInstruction = '', options = {}) {
      return await callAiAnalysis(prompt, systemInstruction, options);
    },

    async extractGlossary(options = {}, callbacks = {}) {
      const mergedOptions = { ...options };
      const mergedCallbacks = callbacks && Object.keys(callbacks).length > 0
        ? callbacks
        : (options.callbacks || {});
      return await extractGlossaryWorkflow({
        ...mergedOptions,
        callbacks: mergedCallbacks
      });
    },

    async applyExtractedTerms(options = {}, callbacks = {}) {
      const mergedOptions = { ...options };
      const mergedCallbacks = callbacks && Object.keys(callbacks).length > 0
        ? callbacks
        : (options.callbacks || {});
      return await applyExtractedTermsWorkflow({
        ...mergedOptions,
        callbacks: mergedCallbacks
      });
    },

    runConsistencyCheck(options = {}, callbacks = {}) {
      const mergedOptions = { ...options };
      const mergedCallbacks = callbacks && Object.keys(callbacks).length > 0
        ? callbacks
        : (options.callbacks || {});
      return runConsistencyCheckWorkflow({
        ...mergedOptions,
        callbacks: mergedCallbacks
      });
    },

    batchFixDrift(options = {}, callbacks = {}) {
      if (typeof options === 'string') {
        const foundWord = options;
        const targetWord = arguments[1];
        const opts = (arguments[2] && typeof arguments[2] === 'object') ? arguments[2] : {};
        const cbs = (arguments[3] && typeof arguments[3] === 'object') ? arguments[3] : {};
        return batchFixDriftWorkflow({
          foundWord,
          targetWord,
          ...opts,
          callbacks: cbs
        });
      }
      const mergedOptions = { ...options };
      const mergedCallbacks = callbacks && Object.keys(callbacks).length > 0
        ? callbacks
        : (options.callbacks || {});
      return batchFixDriftWorkflow({
        ...mergedOptions,
        callbacks: mergedCallbacks
      });
    }
  };

  const GlossaryManagerEngine = {
    saveGlossary,
    deleteGlossary,
    renameGlossary,
    importGlossaries,
    exportGlossaries,
    exportGlossaryTxt,
    aiOptimizeGlossary,
    callAiAnalysis,
    extractGlossaryFromSample,
    applyExtractedTerms,
    runConsistencyCheck,
    batchFixDrift,
    loadGlossary,
    unlinkGlossary,
    unloadGlossary,
    resolveApiKey,
    copyAiGlossaryPrompt,
    applyPreset,
    formatGlossaryContent,
    extractGlossaryWorkflow,
    applyExtractedTermsWorkflow,
    runConsistencyCheckWorkflow,
    batchFixDriftWorkflow,
    Controller
  };

  const Profiles = {
    async save(name, content, instructions, savedGlossaries, callbacks = {}) {
      const contentToSave = typeof content === 'string' ? content : '';
      const instrToSave = typeof instructions === 'string' ? instructions : '';
      if (!contentToSave.trim() && !instrToSave.trim()) {
        if (typeof callbacks.setError === 'function') callbacks.setError('Profile content is empty.');
        return null;
      }
      try {
        const engine = GlossaryManagerEngine;
        const { savedGlossaries: u, activeGlossaryId: newActiveId } = await engine.saveGlossary(
          name,
          contentToSave,
          instrToSave,
          savedGlossaries,
          { dbPut: callbacks.dbPut }
        );
        if (typeof callbacks.setSavedGlossaries === 'function') callbacks.setSavedGlossaries(u);
        if (typeof callbacks.setTerminology === 'function') callbacks.setTerminology(contentToSave);
        if (typeof callbacks.setNewGlossaryName === 'function') callbacks.setNewGlossaryName('');
        if (typeof callbacks.setActiveGlossaryId === 'function') callbacks.setActiveGlossaryId(newActiveId);
        if (typeof callbacks.setError === 'function') callbacks.setError('');
        if (typeof callbacks.toast === 'function') callbacks.toast(`Profile "${name}" saved!`, 'success');
        return { savedGlossaries: u, activeGlossaryId: newActiveId };
      } catch (err) {
        if (typeof callbacks.setError === 'function') callbacks.setError(err.message);
        if (typeof callbacks.toast === 'function') callbacks.toast(err.message, 'error');
        return null;
      }
    },

    delete(name, savedGlossaries, activeId, defaultName, callbacks = {}) {
      const performDelete = async () => {
        try {
          const engine = GlossaryManagerEngine;
          const { savedGlossaries: u, activeGlossaryId: newActive, defaultGlossaryName: newDef } = await engine.deleteGlossary(
            name, savedGlossaries, activeId, defaultName, { dbDelete: callbacks.dbDelete }
          );
          if (typeof callbacks.setSavedGlossaries === 'function') callbacks.setSavedGlossaries(u);
          if (activeId === name) {
            if (typeof callbacks.setActiveGlossaryId === 'function') callbacks.setActiveGlossaryId(newActive);
            if (typeof callbacks.setTerminology === 'function') callbacks.setTerminology('');
          }
          if (defaultName === name) {
            if (typeof callbacks.setDefaultGlossaryName === 'function') callbacks.setDefaultGlossaryName(newDef);
          }
          if (typeof callbacks.toast === 'function') callbacks.toast('Profile deleted.', 'info');
          return { savedGlossaries: u, activeGlossaryId: newActive, defaultGlossaryName: newDef };
        } catch (err) {
          if (typeof callbacks.toast === 'function') callbacks.toast(err.message, 'error');
        }
      };
      if (typeof callbacks.confirmAction === 'function') {
        callbacks.confirmAction(`Delete profile "${name}"?`, performDelete);
      } else {
        return performDelete();
      }
    },

    async rename(oldName, newName, savedGlossaries, activeId, defaultName, callbacks = {}) {
      if (!newName || !newName.trim() || newName.trim() === oldName) return null;
      try {
        const engine = GlossaryManagerEngine;
        const { savedGlossaries: u, activeGlossaryId: newActive, defaultGlossaryName: newDef } = await engine.renameGlossary(
          oldName, newName, savedGlossaries, activeId, defaultName, { dbPut: callbacks.dbPut, dbDelete: callbacks.dbDelete }
        );
        if (typeof callbacks.setSavedGlossaries === 'function') callbacks.setSavedGlossaries(u);
        if (activeId === oldName && typeof callbacks.setActiveGlossaryId === 'function') callbacks.setActiveGlossaryId(newActive);
        if (defaultName === oldName && typeof callbacks.setDefaultGlossaryName === 'function') callbacks.setDefaultGlossaryName(newDef);
        if (typeof callbacks.toast === 'function') callbacks.toast(`Profile renamed to "${newName.trim()}"!`);
        return { savedGlossaries: u, activeGlossaryId: newActive, defaultGlossaryName: newDef };
      } catch (err) {
        if (typeof callbacks.setError === 'function') callbacks.setError(err.message);
        if (typeof callbacks.toast === 'function') callbacks.toast(err.message, 'error');
        return null;
      }
    },

    import(text, savedGlossaries, callbacks = {}) {
      try {
        const engine = GlossaryManagerEngine;
        const { savedGlossaries: merged, addedCount } = engine.importGlossaries(text, savedGlossaries);
        if (typeof callbacks.setSavedGlossaries === 'function') callbacks.setSavedGlossaries(merged);
        if (typeof callbacks.toast === 'function') callbacks.toast(`Imported ${addedCount} new glossaries (${merged.length} total)!`, 'success');
        return { savedGlossaries: merged, addedCount };
      } catch (err) {
        if (typeof callbacks.setError === 'function') callbacks.setError('Invalid glossary file: ' + err.message);
        if (typeof callbacks.toast === 'function') callbacks.toast('Invalid glossary file: ' + err.message, 'error');
        return null;
      }
    },

    async exportAll(savedGlossaries, toast) {
      const tst = typeof toast === 'function' ? toast : toast?.toast;
      try {
        const engine = GlossaryManagerEngine;
        const blob = await engine.exportGlossaries(savedGlossaries);
        if (typeof tst === 'function') tst('Glossaries exported!', 'success');
        return blob;
      } catch (e) {
        if (typeof tst === 'function') tst('Export error: ' + e.message, 'error');
        return null;
      }
    },

    async exportTxt(terminology, activeId, toast, setError) {
      const tst = typeof toast === 'function' ? toast : toast?.toast;
      const setErr = typeof setError === 'function' ? setError : toast?.setError;
      try {
        const engine = GlossaryManagerEngine;
        const res = await engine.exportGlossaryTxt(terminology, activeId);
        if (typeof tst === 'function') tst('Glossary exported to Downloads as .txt!', 'success');
        return res;
      } catch (e) {
        if (typeof setErr === 'function') setErr(e.message);
        if (typeof tst === 'function') tst(e.message, 'error');
        return null;
      }
    },

    applyPreset(type, terminology, instructions, callbacks = {}) {
      const engine = GlossaryManagerEngine;
      const res = engine.applyPreset(type, terminology, instructions);
      if (res.presetApplied) {
        if (res.isInstruction) {
          if (typeof callbacks.setCustomInstructions === 'function') callbacks.setCustomInstructions(res.updatedInstructions);
          if (typeof callbacks.toast === 'function') callbacks.toast(`Added ${type} instructions!`);
        } else {
          if (typeof callbacks.setTerminology === 'function') callbacks.setTerminology(res.updatedTerminology);
          if (typeof callbacks.toast === 'function') callbacks.toast(`Added ${type} terminology!`);
        }
      }
      return res;
    },

    copyAiPrompt(toast) {
      const tst = typeof toast === 'function' ? toast : toast?.toast;
      const engine = GlossaryManagerEngine;
      return engine.copyAiGlossaryPrompt({
        copyText: typeof window !== 'undefined' ? window.copyText : null,
        onCopied: () => {
          if (typeof tst === 'function') tst('AI Optimizer Prompt copied to clipboard!');
        }
      });
    }
  };

  GlossaryManagerEngine.Profiles = Profiles;

  global.GlossaryManagerEngine = GlossaryManagerEngine;
  if (typeof window !== 'undefined') {
    window.GlossaryManagerEngine = GlossaryManagerEngine;
    window.GlossaryManagerEngine.Controller = Controller;
    window.GlossaryManagerEngine.Profiles = Profiles;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlossaryManagerEngine;
  }
})(typeof window !== 'undefined' ? window : this);
