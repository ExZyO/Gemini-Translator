// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR — TRANSLATION MEMORY BANK & DIFF ENGINE
// Version: 8.11.3 (§8.2 + §8.6)
// Powered by Google diff-match-patch & Dexie IndexedDB
// 100% Offline, Zero Cloud Dependencies, 100% Toggleable
// ══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const DiffMatchPatchClass = (typeof global !== 'undefined' && global.diff_match_patch)
    ? global.diff_match_patch
    : (typeof diff_match_patch !== 'undefined' ? diff_match_patch : null);

  // ── 1. IN-MEMORY LRU CACHE FOR FAST TM ACCESS ──
  const TM_MEMORY_CACHE = new Map();
  const MAX_CACHE_SIZE = 500;

  function normalizeSentence(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function hashString(str) {
    let hash = 5381;
    const clean = normalizeSentence(str);
    for (let i = 0; i < clean.length; i++) {
      hash = ((hash << 5) + hash) + clean.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + (hash >>> 0).toString(16);
  }

  // Dice's Bigram Similarity Coefficient (Standard in CAT Tools)
  function diceSimilarity(s1, s2) {
    const n1 = normalizeSentence(s1);
    const n2 = normalizeSentence(s2);
    if (n1 === n2) return 1.0;
    if (n1.length < 2 || n2.length < 2) return 0.0;

    const getBigrams = str => {
      const b = new Map();
      for (let i = 0; i < str.length - 1; i++) {
        const pair = str.slice(i, i + 2);
        b.set(pair, (b.get(pair) || 0) + 1);
      }
      return b;
    };

    const b1 = getBigrams(n1);
    const b2 = getBigrams(n2);
    let intersection = 0;
    for (const [pair, count] of b1.entries()) {
      if (b2.has(pair)) intersection += Math.min(count, b2.get(pair));
    }

    return (2 * intersection) / ((n1.length - 1) + (n2.length - 1));
  }

  function splitIntoSentences(text) {
    if (!text || typeof text !== 'string') return [];
    // Split by period, exclamation, question, or Asian punctuation while keeping meaning
    return text
      .split(/(?<=[.!?。！？\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 10);
  }

  // ── 2. TRANSLATION MEMORY BANK API (§8.2) ──
  const TM = {
    // Exact Match: 100% token savings
    async lookupExact(sourceText, sourceLang = '', targetLang = '') {
      if (!sourceText || typeof sourceText !== 'string') return null;
      const hash = hashString(sourceText);

      // Check in-memory cache first
      if (TM_MEMORY_CACHE.has(hash)) {
        const item = TM_MEMORY_CACHE.get(hash);
        this.recordHit('exact');
        return {
          match: true,
          matchType: 'exact',
          targetText: item.targetText,
          similarity: 1.0,
          sourceText: item.sourceText
        };
      }

      // Check Dexie DB
      try {
        const db = global.novelDB;
        if (db && db.translation_memory) {
          const match = await db.translation_memory.where('sourceHash').equals(hash).first();
          if (match && match.targetText) {
            TM_MEMORY_CACHE.set(hash, match);
            this.recordHit('exact');
            return {
              match: true,
              matchType: 'exact',
              targetText: match.targetText,
              similarity: 1.0,
              sourceText: match.sourceText
            };
          }
        }
      } catch (err) {
        console.warn('[TM] Lookup warning:', err);
      }

      return null;
    },

    // Fuzzy Match: >= 90% similarity
    async lookupFuzzy(sourceText, threshold = 0.90) {
      if (!sourceText || typeof sourceText !== 'string' || sourceText.length < 15) return null;

      // 1. Check in-memory items
      for (const item of TM_MEMORY_CACHE.values()) {
        const sim = diceSimilarity(sourceText, item.sourceText);
        if (sim >= threshold) {
          this.recordHit('fuzzy');
          return {
            match: true,
            matchType: 'fuzzy',
            targetText: item.targetText,
            similarity: parseFloat(sim.toFixed(2)),
            referenceSource: item.sourceText
          };
        }
      }

      // 2. Sample recent items from Dexie DB
      try {
        const db = global.novelDB;
        if (db && db.translation_memory) {
          const recent = await db.translation_memory.orderBy('timestamp').reverse().limit(100).toArray();
          for (const item of recent) {
            const sim = diceSimilarity(sourceText, item.sourceText);
            if (sim >= threshold) {
              this.recordHit('fuzzy');
              return {
                match: true,
                matchType: 'fuzzy',
                targetText: item.targetText,
                similarity: parseFloat(sim.toFixed(2)),
                referenceSource: item.sourceText
              };
            }
          }
        }
      } catch (err) {
        console.warn('[TM] Fuzzy lookup warning:', err);
      }

      return null;
    },

    // Store translated sentence pairs
    async storeSegments(sourceText, targetText, metadata = {}) {
      if (!sourceText || !targetText) return 0;
      const srcSentences = splitIntoSentences(sourceText);
      const tgtSentences = splitIntoSentences(targetText);

      // If sentence counts match closely, index pairs
      const pairs = [];
      if (Math.abs(srcSentences.length - tgtSentences.length) <= 2 && srcSentences.length > 0) {
        const count = Math.min(srcSentences.length, tgtSentences.length);
        for (let i = 0; i < count; i++) {
          const s = srcSentences[i];
          const t = tgtSentences[i];
          if (s && t && s.length >= 10 && t.length >= 10) {
            const hash = hashString(s);
            const entry = {
              id: 'tm_' + hash + '_' + (metadata.novelId || 'gen'),
              sourceHash: hash,
              sourceText: s,
              targetText: t,
              sourceLang: metadata.sourceLang || '',
              targetLang: metadata.targetLang || '',
              novelId: metadata.novelId || '',
              timestamp: Date.now()
            };
            pairs.push(entry);
            if (TM_MEMORY_CACHE.size < MAX_CACHE_SIZE) {
              TM_MEMORY_CACHE.set(hash, entry);
            }
          }
        }
      } else {
        // Index full paragraph / segment
        const hash = hashString(sourceText);
        const entry = {
          id: 'tm_' + hash + '_' + (metadata.novelId || 'gen'),
          sourceHash: hash,
          sourceText: sourceText.trim(),
          targetText: targetText.trim(),
          sourceLang: metadata.sourceLang || '',
          targetLang: metadata.targetLang || '',
          novelId: metadata.novelId || '',
          timestamp: Date.now()
        };
        pairs.push(entry);
        TM_MEMORY_CACHE.set(hash, entry);
      }

      if (pairs.length > 0) {
        try {
          const db = global.novelDB;
          if (db && db.translation_memory) {
            await db.translation_memory.bulkPut(pairs);
          }
        } catch (err) {
          console.warn('[TM] Bulk store warning:', err);
        }
      }

      return pairs.length;
    },

    recordHit(type = 'exact') {
      try {
        if (typeof localStorage !== 'undefined') {
          const k = type === 'exact' ? 'tm_exact_hits' : 'tm_fuzzy_hits';
          const cur = parseInt(localStorage.getItem(k) || '0', 10);
          localStorage.setItem(k, String(cur + 1));
        }
        global.telemetryLog?.('TM_BANK', `Translation Memory ${type === 'exact' ? '100% Exact' : 'Fuzzy'} Cache Hit!`);
      } catch (_) {}
    },

    recordTokensSaved(approxTokens) {
      try {
        if (typeof localStorage !== 'undefined' && approxTokens > 0) {
          const cur = parseInt(localStorage.getItem('tm_tokens_saved') || '0', 10);
          localStorage.setItem('tm_tokens_saved', String(cur + Math.round(approxTokens)));
        }
      } catch (_) {}
    },

    async getStats() {
      let totalUnits = TM_MEMORY_CACHE.size;
      try {
        const db = global.novelDB;
        if (db && db.translation_memory) {
          totalUnits = await db.translation_memory.count();
        }
      } catch (_) {}

      let tokensSaved = 0;
      let exactHits = 0;
      let fuzzyHits = 0;
      try {
        if (typeof localStorage !== 'undefined') {
          tokensSaved = parseInt(localStorage.getItem('tm_tokens_saved') || '0', 10);
          exactHits = parseInt(localStorage.getItem('tm_exact_hits') || '0', 10);
          fuzzyHits = parseInt(localStorage.getItem('tm_fuzzy_hits') || '0', 10);
        }
      } catch (_) {}

      return { totalUnits, tokensSaved, exactHits, fuzzyHits };
    },

    async clearTM() {
      TM_MEMORY_CACHE.clear();
      try {
        const db = global.novelDB;
        if (db && db.translation_memory) {
          await db.translation_memory.clear();
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tm_tokens_saved', '0');
          localStorage.setItem('tm_exact_hits', '0');
          localStorage.setItem('tm_fuzzy_hits', '0');
        }
      } catch (err) {
        console.warn('[TM] Clear warning:', err);
      }
      return true;
    },

    // Export TMX (Translation Memory eXchange XML format standard)
    async exportTMX() {
      let records = [];
      try {
        const db = global.novelDB;
        if (db && db.translation_memory) {
          records = await db.translation_memory.toArray();
        }
      } catch (_) {}

      if (records.length === 0) {
        records = Array.from(TM_MEMORY_CACHE.values());
      }

      const dateStr = new Date().toISOString();
      const tuNodes = records.map(r => `    <tu creationdate="${new Date(r.timestamp || Date.now()).toISOString()}">
      <tuv xml:lang="${r.sourceLang || 'ja'}"><seg>${escapeXml(r.sourceText)}</seg></tuv>
      <tuv xml:lang="${r.targetLang || 'en'}"><seg>${escapeXml(r.targetText)}</seg></tuv>
    </tu>`).join('\n');

      return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tmx SYSTEM "tmx14.dtd">
<tmx version="1.4">
  <header creationtool="GeminiTranslator" creationtoolversion="8.11.3" segtype="sentence" adminlang="en" srclang="ja" datatype="PlainText" o-tmf="unknown" creationdate="${dateStr}"/>
  <body>
${tuNodes}
  </body>
</tmx>`;
    }
  };

  function escapeXml(unsafe) {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // ── 3. TRANSLATION SNAPSHOTS & DIFF ENGINE (§8.6) ──
  const Snapshots = {
    // Save chapter snapshot before or after revision
    async createSnapshot({ novelId, chapterIdx, chapterTitle, text, model }) {
      if (!text || typeof text !== 'string') return null;
      const cleanText = text.trim();
      if (cleanText.length < 20) return null;

      const novelKey = String(novelId || 'active_doc');
      const idx = typeof chapterIdx === 'number' ? chapterIdx : 0;
      const snapshot = {
        id: `snap_${novelKey}_ch${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        novelId: novelKey,
        chapterIdx: idx,
        chapterTitle: chapterTitle || `Chapter ${idx + 1}`,
        text: cleanText,
        model: model || 'Gemini',
        timestamp: Date.now(),
        wordCount: cleanText.split(/\s+/).filter(Boolean).length
      };

      try {
        const db = global.novelDB;
        if (db && db.translation_snapshots) {
          // Keep max 5 snapshots per chapter to prevent storage bloat
          const existing = await db.translation_snapshots
            .where('novelId').equals(novelKey)
            .and(s => s.chapterIdx === idx)
            .sortBy('timestamp');

          if (existing.length >= 5) {
            const toDelete = existing.slice(0, existing.length - 4);
            for (const d of toDelete) {
              await db.translation_snapshots.delete(d.id);
            }
          }

          await db.translation_snapshots.put(snapshot);
          global.telemetryLog?.('SNAPSHOT', `Saved translation snapshot for "${novelKey}" Ch. ${idx + 1} (${snapshot.wordCount} words, model: ${snapshot.model})`);
        }
      } catch (err) {
        console.warn('[Snapshots] Create warning:', err);
      }

      return snapshot;
    },

    // Retrieve all historical versions of a chapter
    async getChapterSnapshots(novelId, chapterIdx) {
      const novelKey = String(novelId || 'active_doc');
      const idx = typeof chapterIdx === 'number' ? chapterIdx : 0;

      try {
        const db = global.novelDB;
        if (db && db.translation_snapshots) {
          return await db.translation_snapshots
            .where('novelId').equals(novelKey)
            .and(s => s.chapterIdx === idx)
            .sortBy('timestamp');
        }
      } catch (err) {
        console.warn('[Snapshots] Fetch warning:', err);
      }

      return [];
    },

    // Compute semantic diff using Google diff-match-patch
    computeDiff(oldText, newText) {
      if (!DiffMatchPatchClass) {
        console.warn('[Diff] diff_match_patch library not loaded.');
        return {
          diffs: [],
          html: escapeXml(newText),
          addedWords: 0,
          removedWords: 0,
          unchangedWords: 0,
          similarityPct: 100
        };
      }

      const dmp = new DiffMatchPatchClass();
      dmp.Diff_Timeout = 2.0; // 2 sec max diff computation
      dmp.Diff_EditCost = 4;

      const a = (oldText || '').trim();
      const b = (newText || '').trim();

      const diffs = dmp.diff_main(a, b);
      dmp.diff_cleanupSemantic(diffs);

      let addedChars = 0;
      let removedChars = 0;
      let unchangedChars = 0;
      let addedWords = 0;
      let removedWords = 0;
      let unchangedWords = 0;

      const htmlParts = [];

      for (const [op, chunk] of diffs) {
        const escaped = escapeXml(chunk).replace(/\n/g, '<br/>');
        const words = chunk.split(/\s+/).filter(Boolean).length;

        if (op === 1) {
          // Added (Green highlight)
          addedChars += chunk.length;
          addedWords += words;
          htmlParts.push(`<span class="diff-ins" style="background: rgba(16, 185, 129, 0.22); color: #6ee7b7; padding: 1px 4px; border-radius: 3px; font-weight: 500;">${escaped}</span>`);
        } else if (op === -1) {
          // Removed (Red strikethrough)
          removedChars += chunk.length;
          removedWords += words;
          htmlParts.push(`<span class="diff-del" style="background: rgba(239, 68, 68, 0.22); color: #fca5a5; text-decoration: line-through; padding: 1px 4px; border-radius: 3px;">${escaped}</span>`);
        } else {
          // Unchanged
          unchangedChars += chunk.length;
          unchangedWords += words;
          htmlParts.push(`<span>${escaped}</span>`);
        }
      }

      const totalChars = (addedChars + removedChars + unchangedChars) || 1;
      const similarityPct = Math.max(0, Math.min(100, Math.round((unchangedChars / totalChars) * 100)));

      return {
        diffs,
        html: htmlParts.join(''),
        addedWords,
        removedWords,
        unchangedWords,
        similarityPct
      };
    },

    // Rollback to specific snapshot
    async rollbackSnapshot(snapshotId) {
      if (!snapshotId) return null;
      try {
        const db = global.novelDB;
        if (db && db.translation_snapshots) {
          const snap = await db.translation_snapshots.get(snapshotId);
          return snap || null;
        }
      } catch (err) {
        console.warn('[Snapshots] Rollback warning:', err);
      }
      return null;
    }
  };

  // ── 4. EXPORT ENGINE ──
  const TMDiffEngine = {
    TM,
    Snapshots,
    diceSimilarity,
    splitIntoSentences
  };

  global.TMDiffEngine = TMDiffEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TMDiffEngine;
  }

  console.log('⚡ [tm_diff_engine] Translation Memory Bank & Snapshots Suite v8.11.3 initialized.');
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
