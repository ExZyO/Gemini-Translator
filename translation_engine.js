/* ═══════════════════════════════════════════════════════════════════════
   GEMINI TRANSLATOR - MULTI-MODEL TRANSLATION ENGINE & STREAM PIPELINE (v8.17.65)
   Stateless API callers, token breakdown estimator, prompt builder, and rotation dispatcher
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

  const DEEPL_LANG_MAP = { 'English': 'EN', 'Spanish': 'ES', 'French': 'FR', 'German': 'DE', 'Italian': 'IT', 'Portuguese': 'PT', 'Chinese (Simplified)': 'ZH', 'Chinese (Traditional)': 'ZH', 'Japanese': 'JA', 'Korean': 'KO', 'Russian': 'RU', 'Arabic': 'AR', 'Hindi': 'HI', 'Vietnamese': 'VI', 'Turkish': 'TR', 'Polish': 'PL', 'Dutch': 'NL', 'Swedish': 'SV', 'Norwegian': 'NB', 'Danish': 'DA', 'Finnish': 'FI', 'Greek': 'EL', 'Hebrew': 'HE', 'Indonesian': 'ID', 'Romanian': 'RO', 'Hungarian': 'HU', 'Czech': 'CS', 'Slovak': 'SK', 'Bulgarian': 'BG', 'Serbian': 'SR', 'Croatian': 'HR', 'Ukrainian': 'UK', 'Lithuanian': 'LT', 'Latvian': 'LV', 'Estonian': 'ET', 'Slovenian': 'SL' };
  const LIBRE_LANG_MAP = { 'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it', 'Portuguese': 'pt', 'Chinese (Simplified)': 'zh', 'Chinese (Traditional)': 'zt', 'Japanese': 'ja', 'Korean': 'ko', 'Russian': 'ru', 'Arabic': 'ar', 'Hindi': 'hi', 'Vietnamese': 'vi', 'Turkish': 'tr', 'Polish': 'pl', 'Dutch': 'nl', 'Swedish': 'sv', 'Norwegian': 'nb', 'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hebrew': 'he', 'Indonesian': 'id', 'Filipino': 'tl', 'Romanian': 'ro', 'Hungarian': 'hu', 'Czech': 'cs', 'Slovak': 'sk', 'Bulgarian': 'bg', 'Serbian': 'sr', 'Croatian': 'hr', 'Ukrainian': 'uk' };

  const getFetchRetry = () => (typeof fetchRetry !== 'undefined' ? fetchRetry : (typeof window !== 'undefined' && window.fetchRetry ? window.fetchRetry : fetch));
  const getEstimateTokens = () => (typeof estimateTokens !== 'undefined' ? estimateTokens : (typeof window !== 'undefined' && window.estimateTokens ? window.estimateTokens : (t) => Math.ceil((t || '').length / 4)));
  const getFilterGlossary = () => (typeof filterGlossaryForChunk !== 'undefined' ? filterGlossaryForChunk : (typeof window !== 'undefined' && window.filterGlossaryForChunk ? window.filterGlossaryForChunk : (g) => g));
  const getFormatGlossary = () => (typeof formatGlossaryString !== 'undefined' ? formatGlossaryString : (typeof window !== 'undefined' && window.formatGlossaryString ? window.formatGlossaryString : (g) => g));
  const getKeyPool = () => (typeof KeyPool !== 'undefined' ? KeyPool : (typeof window !== 'undefined' && window.KeyPool ? window.KeyPool : { acquireKey: async (k) => k[0], releaseKey: () => {}, reportFailure: () => {} }));
  const getMaskKey = () => (typeof maskKey !== 'undefined' ? maskKey : (typeof window !== 'undefined' && window.maskKey ? window.maskKey : (k) => (k ? k.slice(0, 4) + '...' : '')));

const calculateTokenBreakdown = (promptTokens, components) => {
  if (!promptTokens || promptTokens <= 0 || !components) {
    return {
      sourceTokens: 0,
      glossaryTokens: 0,
      genderTokens: 0,
      contextTokens: 0,
      systemTokens: 0,
      sourcePct: '0.0',
      glossaryPct: '0.0',
      genderPct: '0.0',
      contextPct: '0.0',
      systemPct: '0.0'
    };
  }

  const estSource = Math.max(0, components.estSource || 0);
  const estGlossary = Math.max(0, components.estGlossary || 0);
  const estGender = Math.max(0, components.estGender || 0);
  const estContext = Math.max(0, components.estContext || 0);
  const estSystem = Math.max(1, components.estSystem || 100);

  const totalEst = estSource + estGlossary + estGender + estContext + estSystem;

  let sourceTokens = Math.round(promptTokens * (estSource / totalEst));
  let glossaryTokens = Math.round(promptTokens * (estGlossary / totalEst));
  let genderTokens = Math.round(promptTokens * (estGender / totalEst));
  let contextTokens = Math.round(promptTokens * (estContext / totalEst));

  let systemTokens = promptTokens - (sourceTokens + glossaryTokens + genderTokens + contextTokens);
  if (systemTokens < 0) {
    sourceTokens = Math.max(0, sourceTokens + systemTokens);
    systemTokens = promptTokens - (sourceTokens + glossaryTokens + genderTokens + contextTokens);
  }

  const getPct = (tok) => promptTokens > 0 ? ((tok / promptTokens) * 100).toFixed(1) : '0.0';

  return {
    sourceTokens,
    glossaryTokens,
    genderTokens,
    contextTokens,
    systemTokens,
    sourcePct: getPct(sourceTokens),
    glossaryPct: getPct(glossaryTokens),
    genderPct: getPct(genderTokens),
    contextPct: getPct(contextTokens),
    systemPct: getPct(systemTokens)
  };
};

const buildPromptResult = (text, srcLang, tgtLang, glossary, instructions, context, smartGlossary = true, needContextUpdate = false, genderLocks = null) => {
  const srcDisplay = srcLang && srcLang !== 'Auto-detect' ? srcLang : 'the detected source language';
  const tgtDisplay = tgtLang || 'English';

  const promptHeader = `You are a direct translator translating the exact supplied text from ${srcDisplay} into ${tgtDisplay}. The input may be a single sentence, dialogue, metadata, or long-form fiction.\n\n` +
    `TRANSLATION GUIDELINES:\n` +
    `0. Translate ONLY the text inside RAW TEXT TO TRANSLATE. Do not continue it, rewrite it, adapt it, summarize it, or replace it with invented content. Stop when the supplied text ends.\n` +
    `1. Translate every supplied sentence, paragraph, heading, dialogue line, and event. Do not omit, merge, or summarize.\n` +
    `2. Preserve the source meaning, relationships, chronology, voice, and level of formality. Use natural ${tgtDisplay} rather than word-for-word phrasing.\n` +
    `3. Use a glossary mapping only when its source term actually occurs in RAW TEXT TO TRANSLATE. Never import a character, setting, event, example, or lore detail from the glossary.\n` +
    `4. Preserve headings, paragraph breaks, dialogue boundaries, and scene breaks. Do not add notes, commentary, or text that is not a translation of the supplied source.\n` +
    `5. Return only the translation.\n\n`;

  let p = `${promptHeader}=== RAW TEXT TO TRANSLATE ===\n${text}\n=== END RAW TEXT TO TRANSLATE ===\n\n`;

  let injectedGlossaryText = '';
  const filteredGlossary = filterGlossaryForChunk(glossary, text, smartGlossary);
  if (filteredGlossary.trim()) {
    try {
      const matchedTerms = filteredGlossary
        .split('\n')
        .filter(l => l.trim().startsWith('-'))
        .map(l => l.trim().replace(/^-\s*/, ''));
      const isVerbose = typeof localStorage !== 'undefined' && localStorage.getItem('telemetry_verbose') === 'true';
      const tokensSaved = Math.max(0, Math.round((glossary.length - filteredGlossary.length) / 3.8));
      window.telemetryLog?.('SMART_GLOSSARY', `Smart Glossary injected ${matchedTerms.length} matched terms into prompt (~${tokensSaved} tokens saved)`, {
        matchedCount: matchedTerms.length,
        matchedTerms: isVerbose ? matchedTerms : matchedTerms.slice(0, 40),
        smartEnabled: Boolean(smartGlossary),
        totalGlossaryChars: glossary.length,
        injectedChars: filteredGlossary.length,
        tokensSavedApprox: tokensSaved
      });
      if (isVerbose) {
        window.telemetryLog?.('PROMPT_INSPECT', 'Raw terminology guide sent to Gemini for chunk', {
          injectedGuide: filteredGlossary
        });
      }
    } catch(e) {}
    injectedGlossaryText = filteredGlossary.trim();
    p = `=== TERMINOLOGY GUIDE (REFERENCE ONLY) ===\nThe following guide supplies terminology and style constraints. It is not story content. Do not reproduce its examples, notes, character lists, or lore unless the same information is present in the raw text.\n\n${filteredGlossary.trim()}\n=== END TERMINOLOGY GUIDE ===\n\n` + p;
  } else if (glossary && glossary.trim()) {
    try {
      window.telemetryLog?.('SMART_GLOSSARY', 'Smart Glossary: 0 terms matched in chunk (all non-occurring lore filtered out to save tokens)', {
        totalGlossaryChars: glossary.length,
        smartEnabled: Boolean(smartGlossary)
      });
    } catch(e) {}
  }

  // ⚥ Anti-Pronoun Drift: Automatically extract & lock genders for characters in this scene
  const combinedLocks = { ...(genderLocks && typeof genderLocks === 'object' ? genderLocks : {}) };
  const fromGlossaryCharacters = new Set();
  if (filteredGlossary && filteredGlossary.trim()) {
    const fLines = filteredGlossary.split('\n');
    for (const line of fLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
      if (/^[-*+\s]*(?:Legend|Example|Note|Rule|Correct|Incorrect):/i.test(trimmed)) continue;
      const m = trimmed.match(/^(?:-\s*)?(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
      if (m) {
        const target = m[2];
        let gen = null;
        if (/\((?:context|dynamic|m\/f)\)|\[(?:context|dynamic|m\/f)\]/i.test(target) || /\b(?:m\/f|dynamic)\b/i.test(target)) {
          gen = 'context';
        } else if (/\((?:female|f)\)|\[(?:female|f)\]|\b(?:female|she\/her)\b/i.test(target)) {
          gen = 'female';
        } else if (/\((?:male|m)\)|\[(?:male|m)\]|\b(?:male|he\/him)\b/i.test(target)) {
          gen = 'male';
        }
        if (gen) {
          const cleanName = target.replace(/\s*(?:\([^)]*\)|\[[^\]]*\]|#.*$)/g, '').trim();
          if (cleanName && cleanName.length <= 40 && !/^(?:do not|never|use|always|note|see)\b/i.test(cleanName) && !combinedLocks[cleanName]) {
            combinedLocks[cleanName] = gen;
            fromGlossaryCharacters.add(cleanName);
          }
        }
      }
    }
  }

  const lockEntries = Object.entries(combinedLocks).filter(([k, v]) => k && v && String(k).trim());
  let genderLockRulesText = '';
  if (lockEntries.length > 0) {
    let activeLocks = lockEntries;
    if (text && text.trim()) {
      const lowerText = text.toLowerCase();
      const aliasMap = new Map();
      if (glossary && typeof glossary === 'string') {
        const gLines = glossary.split(/\r?\n/);
        for (const gl of gLines) {
          if (!gl || gl.startsWith('#') || gl.startsWith('//')) continue;
          const m = gl.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
          if (m) {
            const s = m[1].replace(/#.*$/, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
            const t = m[2].replace(/#.*$/, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
            if (s && t) {
              if (!aliasMap.has(s)) aliasMap.set(s, new Set());
              if (!aliasMap.has(t)) aliasMap.set(t, new Set());
              aliasMap.get(s).add(t);
              aliasMap.get(t).add(s);
            }
          }
        }
      }

      activeLocks = lockEntries.filter(([name]) => {
        if (fromGlossaryCharacters.has(name)) return true;
        const clean = String(name).trim();
        if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(clean)) {
          if (text.includes(clean)) return true;
        } else {
          if (lowerText.includes(clean.toLowerCase())) return true;
          const parts = clean.split(/\s+/).filter(w => w.length >= 4 && !/^(?:miss|mister|lady|lord|sir|madame|king|queen|saint|emperor)$/i.test(w));
          for (const part of parts) {
            if (lowerText.includes(part.toLowerCase())) return true;
          }
        }
        const aliases = aliasMap.get(clean);
        if (aliases) {
          for (const a of aliases) {
            if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(a)) {
              if (text.includes(a)) return true;
            } else {
              if (lowerText.includes(a.toLowerCase())) return true;
            }
          }
        }
        return false;
      });
    }

    if (activeLocks.length > 0) {
      const rules = activeLocks.map(([name, gender]) => {
        const gLower = String(gender).toLowerCase();
        const isContext = gLower.includes('context') || gLower.includes('m/f') || gLower.includes('dynamic') || gLower.includes('both');
        if (isContext) {
          return `- ${String(name).trim()}: CONTEXT-DEPENDENT / DYNAMIC (M/F). This character changes/transitions biological gender or form across the narrative (e.g. sex-change potions, shape-shifting, dual avatars). Translate pronouns dynamically ('he/him' when presenting in male form, 'she/her' when presenting in female form) based strictly on active scene context. Do NOT force a single fixed pronoun.`;
        }
        const isFemale = gLower.includes('female') || gLower.includes('she');
        const isMale = gLower.includes('male') || gLower.includes('he');
        const pronouns = isFemale ? 'she / her / hers / herself' : isMale ? 'he / him / his / himself' : gender;
        return `- ${String(name).trim()}: ${gender} (${pronouns}). Never use opposite pronouns for this character.`;
      }).join('\n');
      genderLockRulesText = rules;
      p = `=== GENDER LOCK PROTOCOL (ANTI-PRONOUN DRIFT) ===\nCRITICAL DIRECTIVE: You MUST maintain the exact gender pronouns for the following characters. Do not confuse or swap pronouns under any circumstances:\n${rules}\n=== END GENDER LOCK PROTOCOL ===\n\n` + p;

      try {
        const tokensSaved = Math.max(0, (lockEntries.length - activeLocks.length) * 15);
        window.telemetryLog?.('GENDER_LOCK', `Smart Prompt injected ${activeLocks.length} scene locks (${lockEntries.length - activeLocks.length} non-scene locks filtered out to save ~${tokensSaved} tokens)`, {
          chunkCharactersPresent: activeLocks.map(([cName, cGen]) => `${cName} [${cGen.toUpperCase()}]`),
          activeLocksCount: activeLocks.length,
          totalDatabaseLocks: lockEntries.length,
          tokensSavedApprox: tokensSaved
        });
      } catch(e) {}
    }
  }

  const culturalFootnotesActive = typeof localStorage !== 'undefined' && localStorage.getItem('culturalFootnotesEnabled') !== 'false';
  if (culturalFootnotesActive) {
    const footnoteRule = `=== CULTURAL CONTEXT & FOOTNOTES PROTOCOL ===\nWhen culturally specific idioms, cultivation lore, puns, honorific subtleties, or historical terms appear, append an explanatory footnote at the very end of the chapter under "--- FOOTNOTES ---" using standard format "[¹ Note: explanation]" or "[² Note: explanation]", and place the superscript marker "[¹]" immediately after the term in the translated text.\n=== END FOOTNOTES PROTOCOL ===\n\n`;
    p = footnoteRule + p;
  }

  let instructionsText = '';
  if (instructions && instructions.trim()) {
    instructionsText = instructions.trim();
    p = `=== CUSTOM TRANSLATION INSTRUCTIONS ===\n${instructionsText}\n=== END CUSTOM INSTRUCTIONS ===\n\n` + p;
  }

  let contextText = '';
  if (context !== undefined && context && context.trim()) {
    contextText = context.trim();
    p = `=== PREVIOUS CHAPTER CONTEXT ===\n${contextText}\n=== END CONTEXT ===\n\nUse this context to maintain strict continuity in character names, gender pronouns (he/she), and tone.\n\n` + p;
  }

  const trailer = needContextUpdate
    ? `Provide ONLY the pure ${tgtDisplay} translation${culturalFootnotesActive ? ' (with any trailing --- FOOTNOTES --- section if cultural terms occurred)' : ''}. Never include the original source text or bilingual side-by-side lines. Followed EXACTLY by the delimiter "\n---CONTEXT_UPDATE---\n", followed by a brief telegraphic continuity note (max 30 words: cast [name/gender], location, immediate tone).`
    : `Provide ONLY the pure ${tgtDisplay} translated text${culturalFootnotesActive ? ' (including trailing --- FOOTNOTES --- section if cultural terms occurred)' : ' without preamble, commentary, or markdown notes'}.`;
  p += trailer;

  const estSource = estimateTokens(text || '');
  const estGlossary = estimateTokens(injectedGlossaryText);
  const estGender = estimateTokens(genderLockRulesText);
  const estContext = estimateTokens(contextText);
  const estInstructions = estimateTokens(instructionsText);
  const systemOverhead = promptHeader + trailer + ' Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.';
  const estSystem = estimateTokens(systemOverhead) + estInstructions;

  return {
    prompt: p,
    components: {
      estSource,
      estGlossary,
      estGender,
      estContext,
      estSystem
    }
  };
};

const buildPrompt = (text, srcLang, tgtLang, glossary, instructions, context, smartGlossary = true, needContextUpdate = false, genderLocks = null) => {
  return buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks).prompt;
};

const cleanNovelProse = (typeof window !== 'undefined' && window.cleanNovelProse)
  ? window.cleanNovelProse
  : (text => {
      if (!text) return '';
      const placeholders = [];
      let t = text.replace(/(?:!\[[^\]]*\]\([^\)]+\)|<img\b[^>]*>|https?:\/\/[^\s<>"'()]+)/gi, (match) => {
        const ph = `__PROTECTED_TOKEN_${placeholders.length}__`;
        placeholders.push(match);
        return ph;
      });

      t = (typeof window !== 'undefined' && window.decodeHtmlEntities)
        ? window.decodeHtmlEntities(t)
        : t.replace(/&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z]+));/g, '');
      t = t.replace(/\u00a0/g, ' ');
      t = t.replace(/^(\s*)\*([A-Za-z0-9!?,.\s'-]{1,30})\*(\s*)$/gm, '$1$2$3');
      t = t.replace(/^\s*(?:Previous Chapter|Next Chapter|Table of Contents|Prev|Next|TOC|Back to Top|Share this:?|Like this:?|Related|Loading\.\.\.|Leave a (?:Reply|Comment)|Click here to .+)\s*$/gim, '');
      t = t.replace(/^\s*(?:#{1,6}\s*)?Chapter\s*\[(?:number|\d+)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
      t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:chapter|number)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
      t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:Chapter\s*Name|Chapter\s*Title|Name|Title)\]\s*$/gim, '');
      t = t.replace(/^\s*---\s*Page\s*End\s*---\s*$/gim, '');
      t = t.replace(/^\s*(?:Advertisements?|Sponsored|Share on (?:Facebook|Twitter|Reddit)|Follow us on .+|Join our Discord.+|Support (?:us|me) on .+|Donate .+|Patreon .+|Buy me a coffee.+)\s*$/gim, '');
      t = t.replace(/<\/?(?:div|span|br|a|script|style|iframe|button|input|form|nav|header|footer|aside|section|figure|figcaption)[^>]*>/gi, '');
      t = t.replace(/\n{3,}/g, '\n\n');
      t = t.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
      t = t.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
      t = t.replace(/(\w)'(\w)/g, '$1\u2019$2');
      t = t.replace(/---?/g, '\u2014');
      t = t.replace(/\.{3,}/g, '\u2026');
      t = t.replace(/([\u201c\u2018"])\s+(?=[A-Za-z])/g, '$1');
      t = t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
      t = t.replace(/([.!?\u2026]+)(["'\u201d\u2019)]?)(?=[A-Za-z])/g, '$1$2 ');

      placeholders.forEach((token, idx) => {
        t = t.replace(`__PROTECTED_TOKEN_${idx}__`, token);
      });

      return t.trim();
    });
if (typeof window !== 'undefined' && !window.cleanNovelProse) window.cleanNovelProse = cleanNovelProse;

const parseTranslationOutput = (rawText, context, usage = null) => {
  let text = cleanNovelProse(rawText || '');
  let newContext = context;
  if (text.includes('CONTEXT_UPDATE')) {
    const parts = text.split(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
    const mainBody = parts[0].trim();
    if (mainBody.length > 0) {
      text = cleanNovelProse(mainBody);
      newContext = parts.slice(1).join('\n').trim();
    } else if (parts.length > 1 && parts[1].trim().length > 0) {
      text = cleanNovelProse(parts.slice(1).join('\n').trim());
    }
  } else {
    text = text.trim();
  }
  return { text, newContext, usage };
};

const isLikelyHeadingOnlyTranslation = (value, sourceLength) => {
  const normalized = cleanNovelProse(value || '').trim();
  if (!normalized || sourceLength <= 300) return !normalized;
  const lines = normalized.split(/\r?\n+/).map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 8) return false;
  return lines.every(line => {
    const plain = line.replace(/^#{1,6}\s*/, '').trim();
    return /^(?:preface|prologue|afterword|epilogue|postscript)$/i.test(plain) ||
      /^chapter\b/i.test(plain) || /^\[[^\]]+\]/.test(plain);
  });
};

const translateGemini = async (text, { apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, strictModel = true, genderLocks = null, rotateApiKey = null }) => {
  if (!apiKey) throw new Error('Gemini API key required.');
  const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
  ];
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    system_instruction: {
      parts: [{
        text: 'Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.'
      }]
    },
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    safetySettings
  };
  // Thinking Control: Only pass thinkingConfig when thinking is ON, or for thinking-native models (like 3.7 / 2.5).
  // Standard models (like gemini-3.5-flash-lite) reject thinkingBudget: 0 with 400 Invalid argument.
  const isThinkingModel = /gemini-(?:3\.7|2\.5)/i.test(model);
  if (enableThinking) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 2048 };
  } else if (isThinkingModel) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const apiStart = performance.now();
  window.AppLogger?.log('info', 'GeminiAPI', `Outbound request to ${model} (Key: ${maskKey(apiKey)}, Chars: ${text.length}, Thinking: ${enableThinking ? 'ON' : 'OFF'}, Strict: ${strictModel ? 'ON' : 'OFF'})`);
  const reqHeaders = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
  let r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  if (!r.ok) {
    const errBody = await r.clone().text().catch(() => '');
    let errSnippet = '';
    try {
      const errJson = JSON.parse(errBody);
      errSnippet = errJson?.error?.message || errBody.slice(0, 160);
    } catch(e) { errSnippet = errBody.slice(0, 160); }
    window.AppLogger?.log('warn', 'GeminiAPI', `Response ${r.status} ${r.statusText} in ${Math.round(performance.now() - apiStart)}ms`, errSnippet);
  } else {
    window.AppLogger?.log('info', 'GeminiAPI', `Response 200 OK in ${Math.round(performance.now() - apiStart)}ms`);
  }

  // Automatic key rotation on HTTP 429 quota exhaustion
  if (!r.ok && r.status === 429) {
    const rotFn = rotateApiKey || (typeof window !== 'undefined' ? window.rotateApiKey : null);
    if (typeof rotFn === 'function') {
      const nextKey = rotFn(apiKey);
      if (nextKey && nextKey !== apiKey) {
        console.warn(`Gemini 429 quota/rate limit hit. Auto-rotated key from ${maskKey ? maskKey(apiKey) : 'key'} to ${maskKey ? maskKey(nextKey) : 'nextKey'}. Retrying translation...`);
        return translateGemini(text, {
          apiKey: nextKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks, rotateApiKey: rotFn
        });
      }
    }
  }

  if (!r.ok && r.status === 400 && payload.generationConfig?.thinkingConfig) {
    delete payload.generationConfig.thinkingConfig;
    r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  }
  if (!r.ok && r.status === 400 && payload.system_instruction) {
    delete payload.system_instruction;
    r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  }
  // If server is overloaded (503/500), be patient: retry with the SAME chosen model first (1-2 quick retries)
  if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
    console.warn(`Model ${model} returned ${r.status} (server busy). Waiting 2s before retrying ${model}...`);
    await new Promise(res => setTimeout(res, 2000));
    r = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
    
    // Second retry on the same model if still busy
    if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
      console.warn(`Model ${model} still busy. Second attempt after 2.5s...`);
      await new Promise(res => setTimeout(res, 2500));
      r = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
    }
  }

  // ONLY switch to fallback if strictModel is disabled AND (model is 404 or sustained 503)
  if (!strictModel && !r.ok && (r.status === 404 || r.status === 503) && model !== 'gemini-3.5-flash-lite') {
    const fallbackModel = 'gemini-3.5-flash-lite';
    const reason = r.status === 404 ? 'Model Not Found / Deprecated' : 'Sustained Server Overload (503)';
    console.warn(`Model ${model} unavailable (${r.status}) after retries. Falling back to ${fallbackModel}...`);
    if (typeof window !== 'undefined' && window.notifyModelChange) {
      window.notifyModelChange(model, fallbackModel, reason);
    }
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
    r = await fetchRetry(fallbackUrl, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  }
  if (!r || !r.ok) { const b = await r?.text().catch(() => '') || ''; throw new Error(`Gemini API error ${r?.status || 'network'}: ${b.substring(0, 200)}`); }
  const j = await r.json();
  const candidateParts = j?.candidates?.[0]?.content?.parts || [];
  const actualParts = candidateParts.filter(p => !p.thought);
  let t = actualParts.length > 0
    ? actualParts.map(p => p.text || '').join('')
    : (candidateParts.map(p => p.text || '').join(''));
  
  const finishReason = j?.candidates?.[0]?.finishReason;
  const blockReason = j?.promptFeedback?.blockReason;
  const isSafetyBlocked = finishReason === 'SAFETY' || blockReason === 'SAFETY';

  // If model returned a blank, near-empty response, or safety blocked on a large chunk, attempt solemn literature direct recovery
  if ((!t || t.trim().length < 15 || isLikelyHeadingOnlyTranslation(t, text.length) || isSafetyBlocked) && text.length > 100) {
    console.warn(`Gemini (${model}) returned minimal/safety response (${finishReason || blockReason || 'minimal'}). Retrying with solemn literary translation recovery prompt...`);
    const solemnPrompt = `You are an expert literary translator performing direct translation of authorized fiction literature into ${tgtLang || 'English'}.\n` +
      `Translate the exact text between these delimiters directly using solemn, objective, and dignified literary prose. Do not summarize, censor, continue, or invent content. Return only the pure translation.\n\n` +
      `=== RAW TEXT ===\n${text}\n=== END RAW TEXT ===`;
    const directPayload = {
      contents: [{ role: 'user', parts: [{ text: solemnPrompt }] }],
      system_instruction: {
        parts: [{
          text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the text directly with solemn, objective prose. Return only the translation.'
        }]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
      },
      safetySettings
    };
    const recoveryRes = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(directPayload), signal });
    if (recoveryRes && recoveryRes.ok) {
      const recJson = await recoveryRes.json();
      const recParts = recJson?.candidates?.[0]?.content?.parts || [];
      const recActual = recParts.filter(p => !p.thought);
      const recText = recActual.length > 0 ? recActual.map(p => p.text || '').join('') : recParts.map(p => p.text || '').join('');
      if (recText && recText.trim().length > 0) {
        t = recText;
      }
    }
  }

  if (!t || t.trim().length === 0) throw new Error(`Empty response from ${model}. Google Cloud servers may be experiencing temporary high demand (503). Retrying...`);
  
  const updatedFinishReason = j?.candidates?.[0]?.finishReason;
  if ((updatedFinishReason === 'SAFETY' || updatedFinishReason === 'MAX_TOKENS') && t.trim().length > 0) {
    console.warn(`Gemini translation cut off due to ${updatedFinishReason}. Auto-continuing seamlessly...`);
    if (updatedFinishReason === 'SAFETY') {
      console.warn('Gemini translation cut off due to SAFETY filter. Attempting solemn auto-continuation...');
    }
    const tailSummary = t.trim().slice(-200);
    const contPrompt = `You are translating an authorized Chinese dark fantasy literature chapter into ${tgtLang || 'English'}.\n` +
      `The translation was partially completed up to this line:\n"...${tailSummary}"\n\n` +
      `FULL RAW TEXT TO FINISH TRANSLATING:\n${text}\n\n` +
      `INSTRUCTION: Continue translating the remaining text seamlessly from the exact cutoff point to the end. For all sacrificial rituals, combat, and beast attacks, use solemn, dignified, and objective literary prose. Translate 100% of the remaining scenes directly without repeating earlier text or omitting anything.`;
    try {
      const contPayload = {
        contents: [{ role: 'user', parts: [{ text: contPrompt }] }],
        system_instruction: {
          parts: [{
            text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the remaining chapter directly with solemn, objective prose.'
          }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
        },
        safetySettings
      };
      const contR = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contPayload), signal });
      if (contR && contR.ok) {
        const cj = await contR.json();
        const cParts = cj?.candidates?.[0]?.content?.parts || [];
        const cActual = cParts.filter(p => !p.thought);
        const ct = cActual.length > 0 ? cActual.map(p => p.text || '').join('') : cParts.map(p => p.text || '').join('');
        if (ct) t += '\n\n' + ct;
      }
    } catch (ce) {
      console.warn('Continuation call error:', ce);
    }
  }
  
  const usage = j?.usageMetadata || null;
  const promptTokens = usage?.promptTokenCount || estimateTokens(prompt);
  const outputTokens = usage?.candidatesTokenCount || estimateTokens(t);
  const totalTokens = usage?.totalTokenCount || (promptTokens + outputTokens);
  const breakdown = calculateTokenBreakdown(promptTokens, components);
  return parseTranslationOutput(t, context, { promptTokens, outputTokens, totalTokens, breakdown });
};

const streamGemini = async (text, { apiKey, model, srcLang, tgtLang, glossary, instructions, signal, onChunk, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, strictModel = true, genderLocks = null, rotateApiKey = null }) => {
  if (!apiKey) throw new Error('Gemini API key required.');
  const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
  ];
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    system_instruction: {
      parts: [{
        text: 'Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.'
      }]
    },
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    safetySettings
  };
  // Thinking Control: Only pass thinkingConfig when thinking is ON, or for thinking-native models (like 3.7 / 2.5).
  // Standard models (like gemini-3.5-flash-lite) reject thinkingBudget: 0 with 400 Invalid argument.
  const isThinkingModel = /gemini-(?:3\.7|2\.5)/i.test(model);
  if (enableThinking) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 2048 };
  } else if (isThinkingModel) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const reqHeaders = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
  let r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });

  // Automatic key rotation on HTTP 429 quota exhaustion in stream
  if (!r.ok && r.status === 429) {
    const rotFn = rotateApiKey || (typeof window !== 'undefined' ? window.rotateApiKey : null);
    if (typeof rotFn === 'function') {
      const nextKey = rotFn(apiKey);
      if (nextKey && nextKey !== apiKey) {
        console.warn(`Gemini stream 429 quota/rate limit hit. Auto-rotated key to ${maskKey ? maskKey(nextKey) : 'nextKey'}. Retrying stream...`);
        return streamGemini(text, {
          apiKey: nextKey, model, srcLang, tgtLang, glossary, instructions, onChunk, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks, rotateApiKey: rotFn
        });
      }
    }
  }

  if (!r.ok && r.status === 400 && payload.generationConfig?.thinkingConfig) {
    delete payload.generationConfig.thinkingConfig;
    r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  }
  if (!r.ok && r.status === 400 && payload.system_instruction) {
    delete payload.system_instruction;
    r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
  }
  // If stream server is overloaded (503/500), retry with the SAME chosen model first
  if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
    console.warn(`Stream for ${model} returned ${r.status}. Waiting 2s before retrying ${model}...`);
    await new Promise(res => setTimeout(res, 2000));
    r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });

    if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
      console.warn(`Stream for ${model} still busy. Second attempt after 2.5s...`);
      await new Promise(res => setTimeout(res, 2500));
      r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
    }
  }

  // ONLY switch to fallback if strictModel is disabled AND (model is 404 or sustained 503)
  if (!strictModel && !r.ok && (r.status === 404 || r.status === 503) && model !== 'gemini-3.5-flash-lite') {
    const fallbackModel = 'gemini-3.5-flash-lite';
    const reason = r.status === 404 ? 'Model Not Found / Deprecated' : 'Sustained Server Overload (503)';
    console.warn(`Stream for ${model} unavailable (${r.status}) after retries. Falling back to ${fallbackModel}...`);
    if (typeof window !== 'undefined' && window.notifyModelChange) {
      window.notifyModelChange(model, fallbackModel, reason);
    }
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
    r = await fetchRetry(fallbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
  }
  if (!r || !r.ok) { const b = await r?.text().catch(() => '') || ''; throw new Error(`Gemini stream error ${r?.status || 'network'}: ${b.substring(0, 200)}`); }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  let isContextContext = false;
  let finalContext = '';
  let slidingWindow = '';
  let accumulatedOutput = '';
  const deferThinkingOutput = Boolean(enableThinking);
  const deferredOutput = [];
  const emitVisible = (value) => {
    if (!value) return;
    if (deferThinkingOutput) {
      deferredOutput.push(value);
    } else {
      onChunk(value);
      accumulatedOutput += value;
    }
  };
  let lastUsage = null;
  let finishReason = null;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const d = line.slice(6).trim();
        if (d === '[DONE]') {
          break;
        }
        try {
          const j = JSON.parse(d);
          if (j?.usageMetadata) lastUsage = j.usageMetadata;
          const fReason = j?.candidates?.[0]?.finishReason;
          if (fReason) finishReason = fReason;
          const candidateParts = j?.candidates?.[0]?.content?.parts || [];
          for (const part of candidateParts) {
            if (part.thought) continue; // Skip internal thinking tokens
            const t = part.text;
            if (t) {
              if (context !== undefined) {
                if (isContextContext) {
                  finalContext += t;
                } else {
                  slidingWindow += t;
                  const splitMatch = slidingWindow.match(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
                  if (splitMatch) {
                    const idx = splitMatch.index;
                    const textPart = slidingWindow.substring(0, idx);
                    if (textPart) emitVisible(textPart);
                    finalContext += slidingWindow.substring(idx + splitMatch[0].length);
                    isContextContext = true;
                    slidingWindow = '';
                  } else {
                    if (slidingWindow.length > 40) {
                      const safeToEmit = slidingWindow.substring(0, slidingWindow.length - 40);
                      emitVisible(safeToEmit);
                      slidingWindow = slidingWindow.substring(slidingWindow.length - 40);
                    }
                  }
                }
              } else {
                emitVisible(t);
              }
            }
          }
        } catch (e) { }
      }
    }
  }
  if (slidingWindow && !isContextContext) { emitVisible(slidingWindow); slidingWindow = ''; }

  if (deferThinkingOutput) {
    const deferredText = deferredOutput.join('');
    if (deferredText.trim() && !isLikelyHeadingOnlyTranslation(deferredText, text.length)) {
      onChunk(deferredText);
      accumulatedOutput = deferredText;
    }
  }

  // Thinking responses can contain only internal thought parts in streaming mode.
  // Recover the visible translation without thinking instead of returning a blank chapter.
  if (enableThinking && (isLikelyHeadingOnlyTranslation(deferredOutput.join(''), text.length) || !accumulatedOutput.trim()) && text.trim().length > 100) {
    console.warn('Gemini thinking stream returned no visible translation. Retrying without thinking...');
    const recovery = await translateGemini(text, {
      apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking: false, strictModel, genderLocks
    });
    if (recovery?.text?.trim()) {
      onChunk(recovery.text);
      return recovery;
    }
  }

  // Auto-continuation on SAFETY or MAX_TOKENS cutoff during streaming
  if ((finishReason === 'SAFETY' || finishReason === 'MAX_TOKENS') && accumulatedOutput.trim().length > 0) {
    console.warn(`Gemini stream interrupted by ${finishReason}. Auto-resuming remaining content seamlessly...`);
    const tailSummary = accumulatedOutput.trim().slice(-200);
    const contPrompt = `You are translating an authorized Chinese dark fantasy literature chapter into ${tgtLang || 'English'}.\n` +
      `The translation was partially completed up to this line:\n"...${tailSummary}"\n\n` +
      `FULL RAW TEXT TO FINISH TRANSLATING:\n${text}\n\n` +
      `INSTRUCTION: Continue translating the remaining text seamlessly from the exact cutoff point to the end. For all sacrificial rituals, combat, and beast attacks, use solemn, dignified, and objective literary prose. Translate 100% of the remaining scenes directly without repeating earlier text or omitting anything.`;
    try {
      const contPayload = {
        contents: [{ role: 'user', parts: [{ text: contPrompt }] }],
        system_instruction: {
          parts: [{
            text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the remaining chapter directly with solemn, objective prose.'
          }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
        },
        safetySettings
      };
      const contUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const contR = await fetchRetry(contUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contPayload), signal });
      if (contR && contR.ok) {
        const contReader = contR.body.getReader();
        let contBuf = '';
        while (true) {
          const { done: cDone, value: cVal } = await contReader.read();
          if (cDone) break;
          contBuf += dec.decode(cVal, { stream: true });
          const cLines = contBuf.split('\n'); contBuf = cLines.pop() || '';
          for (const cl of cLines) {
            if (cl.startsWith('data: ')) {
              const cd = cl.slice(6).trim();
              if (cd === '[DONE]') break;
              try {
                const cj = JSON.parse(cd);
                if (cj?.usageMetadata) lastUsage = cj.usageMetadata;
                const cParts = cj?.candidates?.[0]?.content?.parts || [];
                for (const cp of cParts) {
                  if (cp.thought) continue;
                  if (cp.text) {
                    onChunk(cp.text);
                    accumulatedOutput += cp.text;
                  }
                }
              } catch (ce) {}
            }
          }
        }
      }
    } catch (contErr) {
      console.warn('Continuation stream error:', contErr);
    }
  }

  if ((!accumulatedOutput || !accumulatedOutput.trim()) && text.trim().length > 50) {
    console.warn(`Empty stream from ${model}. Attempting fallback to direct non-streaming translation...`);
    try {
      const directRec = await translateGemini(text, {
        apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks
      });
      if (directRec?.text?.trim()) {
        onChunk(directRec.text);
        return directRec;
      }
    } catch (recErr) {}
    throw new Error(`Empty stream from ${model}. Google Cloud servers may be experiencing temporary high demand (503). Retrying...`);
  }

  const pTok = lastUsage?.promptTokenCount || estimateTokens(prompt);
  const oTok = lastUsage?.candidatesTokenCount || estimateTokens(accumulatedOutput);
  const tTok = lastUsage?.totalTokenCount || (pTok + oTok);
  const breakdown = calculateTokenBreakdown(pTok, components);
  return { text: accumulatedOutput, newContext: finalContext.trim() || context || '', usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: tTok, breakdown } };
};

const translateDeepSeek = async (text, { apiKey, deepseekApiKey, model = 'deepseek-chat', srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, genderLocks = null }) => {
  const key = deepseekApiKey || apiKey;
  if (!key) throw new Error('DeepSeek API key required.');
  const chosenModel = enableThinking && model === 'deepseek-chat' ? 'deepseek-reasoner' : (model || 'deepseek-chat');
  const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
  const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: chosenModel,
      messages: [
        { role: 'system', content: 'You are an expert direct literary translator. Translate only the supplied source text. Do not continue, adapt, rewrite, summarize, or invent content. Glossary terms and context are reference material only. Output only the translated text.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    }),
    signal
  });
  if (!r || !r.ok) {
    const b = await r?.text().catch(() => '') || '';
    throw new Error(`DeepSeek API error ${r?.status || 'network'}: ${b.substring(0, 200)}`);
  }
  const j = await r.json();
  const raw = j.choices?.[0]?.message?.content || '';
  const usage = j?.usage || null;
  const promptTokens = usage?.prompt_tokens || estimateTokens(prompt);
  const outputTokens = usage?.completion_tokens || estimateTokens(raw);
  const totalTokens = usage?.total_tokens || (promptTokens + outputTokens);
  const breakdown = calculateTokenBreakdown(promptTokens, components);
  return parseTranslationOutput(raw, context, { promptTokens, outputTokens, totalTokens, breakdown });
};

const streamDeepSeek = async (text, { apiKey, deepseekApiKey, model = 'deepseek-chat', srcLang, tgtLang, glossary, instructions, signal, onChunk, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, genderLocks = null }) => {
  const key = deepseekApiKey || apiKey;
  if (!key) throw new Error('DeepSeek API key required.');
  const chosenModel = enableThinking && model === 'deepseek-chat' ? 'deepseek-reasoner' : (model || 'deepseek-chat');
  const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
  const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: chosenModel,
      messages: [
        { role: 'system', content: 'You are an expert direct literary translator. Translate only the supplied source text. Do not continue, adapt, rewrite, summarize, or invent content. Glossary terms and context are reference material only. Output only the translated text.' },
        { role: 'user', content: prompt }
      ],
      stream: true,
      stream_options: { include_usage: true }
    }),
    signal
  });
  if (!r || !r.ok) {
    const b = await r?.text().catch(() => '') || '';
    throw new Error(`DeepSeek stream error ${r?.status || 'network'}: ${b.substring(0, 200)}`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let isContextContext = false;
  let finalContext = '';
  let slidingWindow = '';
  let accumulatedOutput = '';
  let lastUsage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') break;
        try {
          const j = JSON.parse(dataStr);
          if (j?.usage) lastUsage = j.usage;
          const t = j.choices?.[0]?.delta?.content;
          if (t) {
            if (context !== undefined) {
              if (isContextContext) {
                finalContext += t;
              } else {
                slidingWindow += t;
                const splitMatch = slidingWindow.match(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
                if (splitMatch) {
                  const idx = splitMatch.index;
                  const textPart = slidingWindow.substring(0, idx);
                  if (textPart) { onChunk(textPart); accumulatedOutput += textPart; }
                  finalContext += slidingWindow.substring(idx + splitMatch[0].length);
                  isContextContext = true;
                  slidingWindow = '';
                } else {
                  if (slidingWindow.length > 40) {
                    const safeToEmit = slidingWindow.substring(0, slidingWindow.length - 40);
                    onChunk(safeToEmit);
                    accumulatedOutput += safeToEmit;
                    slidingWindow = slidingWindow.substring(slidingWindow.length - 40);
                  }
                }
              }
            } else {
              onChunk(t);
              accumulatedOutput += t;
            }
          }
        } catch (e) { }
      }
    }
  }
  if (slidingWindow && !isContextContext) { onChunk(slidingWindow); accumulatedOutput += slidingWindow; }
  const pTok = lastUsage?.prompt_tokens || estimateTokens(prompt);
  const oTok = lastUsage?.completion_tokens || estimateTokens(accumulatedOutput);
  const tTok = lastUsage?.total_tokens || (pTok + oTok);
  const breakdown = calculateTokenBreakdown(pTok, components);
  return { text: accumulatedOutput, newContext: finalContext.trim() || context || '', usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: tTok, breakdown } };
};

// Strips any leaked CONTEXT_UPDATE section (model echo with any dash variant)
const stripContextLeak = (t) => (t || '').split(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\s\S]*$/i)[0].trim();

const translateDeepL = async (text, { apiKey, srcLang, tgtLang, signal }) => {
  if (!apiKey) throw new Error('DeepL API key required.');
  const tgt = DEEPL_LANG_MAP[tgtLang]; if (!tgt) throw new Error(`DeepL doesn't support ${tgtLang}.`);
  const src = srcLang && srcLang !== 'Auto-detect' ? DEEPL_LANG_MAP[srcLang] : undefined;
  const params = new URLSearchParams({ text, target_lang: tgt });
  if (src) params.append('source_lang', src);
  const base = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetchRetry(`${base}/v2/translate`, { method: 'POST', headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal });
  if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`DeepL error ${r.status}: ${b.substring(0, 200)}`); }
  const j = await r.json();
  const resText = j.translations?.[0]?.text || '';
  const pTok = estimateTokens(text);
  const oTok = estimateTokens(resText);
  return { text: resText, usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: pTok + oTok, breakdown: calculateTokenBreakdown(pTok, { estSource: pTok }) } };
};

const translateLibre = async (text, { srcLang, tgtLang, signal, libreUrl }) => {
  const tgt = LIBRE_LANG_MAP[tgtLang]; if (!tgt) throw new Error(`LibreTranslate doesn't support ${tgtLang}.`);
  const src = srcLang && srcLang !== 'Auto-detect' ? (LIBRE_LANG_MAP[srcLang] || 'auto') : 'auto';
  const url = libreUrl || 'https://libretranslate.com';
  const r = await fetchRetry(`${url}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text, source: src, target: tgt, format: 'text' }), signal });
  if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`LibreTranslate error ${r.status}: ${b.substring(0, 200)}`); }
  const j = await r.json();
  const resText = j.translatedText || '';
  const pTok = estimateTokens(text);
  const oTok = estimateTokens(resText);
  return { text: resText, usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: pTok + oTok, breakdown: calculateTokenBreakdown(pTok, { estSource: pTok }) } };
};

            // --- Multi-Key Profile Management ---
  // OpenAI Translation Routine
const translateOpenAI = async (text, { apiKey, srcLang, tgtLang, customInstructions, terminology, signal, glossaryTerms, isContinuation, priorContext, chapterTitle, model }) => {
  const selectedModel = model || 'gpt-4o-mini';
  const prompt = buildContextPrompt({
    text,
    srcLang,
    tgtLang,
    customInstructions,
    terminology: glossaryTerms || terminology,
    isContinuation,
    priorContext,
    chapterTitle
  });

  const isReasoning = selectedModel.startsWith('o1') || selectedModel.startsWith('o3');
  const body = {
    model: selectedModel,
    messages: [
      { role: 'user', content: prompt }
    ]
  };
  if (!isReasoning) {
    body.temperature = 0.3;
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const output = data.choices?.[0]?.message?.content || '';
  return parseTranslationOutput(output);
};

// Anthropic Claude Translation Routine
const translateClaude = async (text, { apiKey, srcLang, tgtLang, customInstructions, terminology, signal, glossaryTerms, isContinuation, priorContext, chapterTitle, model }) => {
  const selectedModel = model || 'claude-3-5-haiku-20241022';
  const prompt = buildContextPrompt({
    text,
    srcLang,
    tgtLang,
    customInstructions,
    terminology: glossaryTerms || terminology,
    isContinuation,
    priorContext,
    chapterTitle
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: selectedModel,
      max_tokens: 8192,
      temperature: 0.3,
      messages: [
        { role: 'user', content: prompt }
      ]
    }),
    signal
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const output = data.content?.[0]?.text || '';
  return parseTranslationOutput(output);
};



// Global Multi-Key Lease Pool (Guarantees zero concurrent collision & smart failover to idle keys)

// ══════════════════════════════════════════════════════════
// SYSTEM DIAGNOSTICS & TELEMETRY LOGGER
// ══════════════════════════════════════════════════════════
const maskKey = window.maskKey;
const KeyPool = window.KeyPool;

const streamWithRotation = async (text, opts) => {
  let currentOpts = { ...opts };
  const allKeys = opts?.availableKeys || [];
  if (allKeys.length > 1) {
    const leased = await KeyPool.acquireKey(allKeys);
    if (leased) currentOpts.apiKey = leased;
  }
  const maxAttempts = 60;
  let backoffDelay = 2000;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const streamFn = currentOpts.provider === 'deepseek' ? streamDeepSeek : streamGemini;
        return await streamFn(text, currentOpts);
      } catch (err) {
        if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
        const errMsg = (err.message || '').toLowerCase();
        const isRetryable = errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('quota') ||
          errMsg.includes('resource_exhausted') || errMsg.includes('503') || errMsg.includes('500') ||
          errMsg.includes('502') || errMsg.includes('504') || errMsg.includes('demand') ||
          errMsg.includes('overloaded') || errMsg.includes('unavailable') || errMsg.includes('empty response') ||
          errMsg.includes('empty stream') || errMsg.includes('network') || errMsg.includes('failed to fetch');
        if (isRetryable) {
          if (allKeys.length > 1) {
            const freshKey = await KeyPool.acquireKey(allKeys, currentOpts.apiKey);
            if (freshKey && freshKey !== currentOpts.apiKey) {
              const errBrief = (err.message || '').replace(/\s+/g, ' ').trim().slice(0, 75);
              console.warn(`Retryable error (${errBrief}) → Leased fresh idle key ${freshKey.substring(0, 8)}... (attempt ${attempt + 1}/${maxAttempts})`);
              currentOpts.apiKey = freshKey;
              await new Promise(r => setTimeout(r, 600));
              continue;
            }
          }
          const waitSec = Math.round(backoffDelay / 1000);
          console.warn(`[Strict/Rotation Engine] Stream ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 60)}). Waiting ${waitSec}s (attempt ${attempt + 1}/${maxAttempts})...`);
          window.AppLogger?.log('warn', 'RotationEngine', `Attempt ${attempt + 1}/${maxAttempts}: Stream ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 80)}). Waiting ${waitSec}s...`);
          await new Promise(r => setTimeout(r, backoffDelay));
          backoffDelay = Math.min(backoffDelay * 1.25, 6000);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Model ${currentOpts.model || 'chosen'} stream busy/rate-limited after ${maxAttempts} patient attempts. Progress safely saved.`);
  } finally {
    if (currentOpts.apiKey) KeyPool.releaseKey(currentOpts.apiKey);
  }
};

const translateWithRotation = async (text, opts) => {
  let currentOpts = { ...opts };
  const allKeys = opts?.availableKeys || [];
  if (allKeys.length > 1) {
    const leased = await KeyPool.acquireKey(allKeys);
    if (leased) currentOpts.apiKey = leased;
  }
  const maxAttempts = 60;
  let backoffDelay = 2000;

  // ── Translation Memory Exact Cache Lookup (§8.2) ──
  const isTmEnabled = (typeof window !== 'undefined' && typeof window.__translationMemoryEnabled !== 'undefined')
    ? window.__translationMemoryEnabled
    : (typeof localStorage !== 'undefined' ? localStorage.getItem('translationMemoryEnabled') !== 'false' : true);

  if (isTmEnabled && window.TMDiffEngine && text && typeof text === 'string' && text.trim().length >= 10) {
    try {
      const tmMatch = await window.TMDiffEngine.TM.lookupExact(text, currentOpts.srcLang, currentOpts.tgtLang);
      if (tmMatch && tmMatch.targetText) {
        const approxTokens = Math.round(text.length / 4);
        window.TMDiffEngine.TM.recordTokensSaved(approxTokens);
        console.log(`⚡ [TM Bank] Exact match hit! Saved ~${approxTokens} tokens.`);
        if (currentOpts.apiKey && allKeys.length > 1) KeyPool.releaseKey(currentOpts.apiKey);
        return (typeof opts.needContextUpdate !== 'undefined' || typeof opts.context !== 'undefined')
          ? { text: tmMatch.targetText, newContext: '', usage: { promptTokens: 0, outputTokens: 0, totalTokens: 0 } }
          : tmMatch.targetText;
      }
    } catch (tmErr) {
      console.warn('[TM Bank] Lookup error:', tmErr);
    }
  }

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await translateChunk(text, currentOpts);
        if (res) {
          // ── Store Translated Segment into TM Bank (§8.2) ──
          if (isTmEnabled && window.TMDiffEngine && text) {
            const resText = (res && typeof res === 'object') ? (res.text || '') : (typeof res === 'string' ? res : '');
            if (resText && !resText.startsWith('[Error:')) {
              const novelKey = currentOpts?.novelId || (typeof activeNovelRecord !== 'undefined' && activeNovelRecord?.id) || '';
              window.TMDiffEngine.TM.storeSegments(text, resText, {
                sourceLang: currentOpts.srcLang,
                targetLang: currentOpts.tgtLang,
                novelId: novelKey
              }).catch(e => console.warn('[TM Bank] Segment store warning:', e));
            }
          }
          return res;
        }
        throw new Error(`Empty response from ${currentOpts.model || 'provider'}`);
      } catch (err) {
        if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
        const errMsg = (err.message || '').toLowerCase();
        const isRetryable = errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('quota') ||
          errMsg.includes('resource_exhausted') || errMsg.includes('503') || errMsg.includes('500') ||
          errMsg.includes('502') || errMsg.includes('504') || errMsg.includes('demand') ||
          errMsg.includes('overloaded') || errMsg.includes('unavailable') || errMsg.includes('empty response') ||
          errMsg.includes('empty stream') || errMsg.includes('network') || errMsg.includes('failed to fetch') ||
          errMsg.includes('timed out') || errMsg.includes('timeout') || errMsg.includes('aborted');
        if (isRetryable) {
          if (allKeys.length > 1) {
            const freshKey = await KeyPool.acquireKey(allKeys, currentOpts.apiKey);
            if (freshKey && freshKey !== currentOpts.apiKey) {
              const errBrief = (err.message || '').replace(/\s+/g, ' ').trim().slice(0, 75);
              console.warn(`Retryable error (${errBrief}) → Leased fresh idle key ${freshKey.substring(0, 8)}... (attempt ${attempt + 1}/${maxAttempts})`);
              currentOpts.apiKey = freshKey;
              await new Promise(r => setTimeout(r, 600));
              continue;
            }
          }
          const waitSec = Math.round(backoffDelay / 1000);
          console.warn(`[Strict/Rotation Engine] Model ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 60)}). Waiting ${waitSec}s (attempt ${attempt + 1}/${maxAttempts})...`);
          window.AppLogger?.log('warn', 'RotationEngine', `Attempt ${attempt + 1}/${maxAttempts}: ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 80)}). Waiting ${waitSec}s...`);
          await new Promise(r => setTimeout(r, backoffDelay));
          backoffDelay = Math.min(backoffDelay * 1.25, 6000);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Model ${currentOpts.model || 'chosen'} busy/rate-limited after ${maxAttempts} patient attempts. Progress safely saved.`);
  } finally {
    if (currentOpts.apiKey) KeyPool.releaseKey(currentOpts.apiKey);
  }
};

const translateChunk = async (text, opts) => {
  switch (opts.provider) {
    case 'deepseek': return translateDeepSeek(text, opts);
    case 'deepl': return translateDeepL(text, opts);
    case 'libre': return translateLibre(text, opts);
    default: return translateGemini(text, { ...opts, context: opts.context });
  }
};

  if (typeof window !== 'undefined') {
    window.calculateTokenBreakdown = calculateTokenBreakdown;
    window.buildPromptResult = buildPromptResult;
    window.buildPrompt = buildPrompt;
    window.cleanNovelProse = cleanNovelProse;
    window.parseTranslationOutput = parseTranslationOutput;
    window.isLikelyHeadingOnlyTranslation = isLikelyHeadingOnlyTranslation;
    window.translateGemini = translateGemini;
    window.streamGemini = streamGemini;
    window.translateDeepSeek = translateDeepSeek;
    window.streamDeepSeek = streamDeepSeek;
    window.stripContextLeak = stripContextLeak;
    window.translateDeepL = translateDeepL;
    window.translateLibre = translateLibre;
    window.translateOpenAI = translateOpenAI;
    window.translateClaude = translateClaude;
    window.streamWithRotation = streamWithRotation;
    window.translateWithRotation = translateWithRotation;
    window.translateChunk = translateChunk;
  }

  return {
    calculateTokenBreakdown,
    buildPromptResult,
    buildPrompt,
    cleanNovelProse,
    parseTranslationOutput,
    isLikelyHeadingOnlyTranslation,
    translateGemini,
    streamGemini,
    translateDeepSeek,
    streamDeepSeek,
    stripContextLeak,
    translateDeepL,
    translateLibre,
    translateOpenAI,
    translateClaude,
    streamWithRotation,
    translateWithRotation,
    translateChunk
  };
}));
