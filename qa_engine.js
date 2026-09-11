// ══════════════════════════════════════════════════════════════════════
// GEMINI TRANSLATOR — UNIFIED NOVEL HEALTH & TRANSLATION QA SUITE
// Version: 8.11.2 (§5.9 + §7.1 + §7.5)
// Zero-API-cost heuristics: gap detection, corrupt/empty text, CJK leak,
// AI refusal & hallucination loops, with 100% toggleable rules.
// ══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // ── 1. REGEX PATTERNS & HEURISTICS ──
  // Matches Chinese (Han), Japanese (Hiragana, Katakana, Kanji), and Korean (Hangul)
  const CJK_REGEX = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

  // AI Refusal, conversational chatter, and leaking markdown fences
  const AI_REFUSAL_PATTERNS = [
    { name: 'AI Refusal', regex: /i cannot fulfill this request/i },
    { name: 'AI Refusal', regex: /i am unable to fulfill this/i },
    { name: 'AI Disclaimer', regex: /as an ai language model/i },
    { name: 'AI Apology', regex: /i'm sorry, but i cannot/i },
    { name: 'AI Refusal', regex: /i cannot translate this/i },
    { name: 'Policy Refusal', regex: /violates (?:our )?(?:content|safety) policy/i },
    { name: 'AI Self-Reference', regex: /i am an ai/i },
    { name: 'Chatty Intro', regex: /^(?:here is|here's) the (?:translation|translated text)(?::|\b)/im },
    { name: 'Chatty Intro', regex: /^certainly!? here is the translation/im },
    { name: 'Chatty Note', regex: /^note: the following is a translation/im },
    { name: 'Chatty Header', regex: /^translation of chapter \d+/im },
    { name: 'Markdown Block Leak', regex: /```(?:markdown|html|txt)?\s*$/im }
  ];

  // Web crawler error pages & scrape failures saved as chapter text
  const ERROR_MARKERS = [
    { name: '404 Not Found', regex: /\b404\s+not\s+found\b/i },
    { name: 'Access Denied', regex: /\baccess\s+denied\b/i },
    { name: 'Cloudflare Challenge', regex: /\bcloudflare\b/i },
    { name: 'DDoS Protection', regex: /\bddos\s+protection\b/i },
    { name: 'HTTP Error 52x', regex: /\berror\s+52[0-9]\b/i },
    { name: 'Browser Verification', regex: /\bjust\s+a\s+moment\.{2,}\b/i },
    { name: 'Browser Verification', regex: /\bchecking\s+your\s+browser\b/i },
    { name: 'Bad Gateway', regex: /\bbad\s+gateway\b/i },
    { name: 'Service Unavailable', regex: /\bservice\s+unavailable\b/i }
  ];

  // Residual unparsed HTML / JS code
  const RESIDUAL_HTML_REGEX = /<(?:script|style|iframe|form|noscript)[\s>]/i;
  const RAW_DOM_CODE_REGEX = /\b(?:document\.getElementById|window\.location|eval\(|var\s+__CF\$)/i;

  // ── 2. HELPER FUNCTIONS ──
  function extractChapterNumber(title) {
    if (!title || typeof title !== 'string') return null;
    const clean = title.trim();

    // Match "Chapter 123", "Ch. 123", "Ep 123", "Episode 123", "Part 123"
    let m = clean.match(/(?:chapter|ch\.?|ep\.?|episode|act|part)\s*(\d+(?:\.\d+)?)/i);
    if (m) return parseFloat(m[1]);

    // Match Japanese/Chinese "第 123 章/話/回/節"
    m = clean.match(/第\s*(\d+(?:\.\d+)?)\s*[話章回節]/);
    if (m) return parseFloat(m[1]);

    // Match leading digits e.g. "012 - Title" or "12. Title"
    m = clean.match(/^(\d+(?:\.\d+)?)[.:\s-]/);
    if (m) return parseFloat(m[1]);

    return null;
  }

  function getSnippetAroundMatch(text, index, len = 20) {
    const start = Math.max(0, index - len);
    const end = Math.min(text.length, index + len + 1);
    let snippet = text.slice(start, end).replace(/\s+/g, ' ');
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  }

  // ── 3. CORE CHECK METHODS ──

  // Check for CJK Untranslated Leak (§5.9)
  function checkCjkLeak(text) {
    if (!text || typeof text !== 'string') return { hasLeak: false, count: 0, percentage: 0, samples: [] };
    const matches = [];
    let match;
    const re = new RegExp(CJK_REGEX.source, 'g');
    while ((match = re.exec(text)) !== null && matches.length < 50) {
      matches.push({ char: match[0], index: match.index });
    }

    if (matches.length === 0) {
      return { hasLeak: false, count: 0, percentage: 0, samples: [] };
    }

    // Collect up to 3 context samples
    const samples = [];
    const step = Math.max(1, Math.floor(matches.length / 3));
    for (let i = 0; i < matches.length && samples.length < 3; i += step) {
      samples.push(getSnippetAroundMatch(text, matches[i].index, 24));
    }

    const totalChars = text.length || 1;
    const percentage = Math.min(100, parseFloat(((matches.length / totalChars) * 100).toFixed(2)));

    return {
      hasLeak: true,
      count: matches.length,
      percentage,
      samples,
      severity: matches.length > 25 ? 'danger' : 'warning'
    };
  }

  // Check for AI Refusal and Chatty MTL Intros (§7.5)
  function checkMtlRefusal(text) {
    if (!text || typeof text !== 'string') return { hasRefusal: false };
    for (const pat of AI_REFUSAL_PATTERNS) {
      const match = text.match(pat.regex);
      if (match) {
        const idx = match.index || 0;
        return {
          hasRefusal: true,
          patternName: pat.name,
          matchedText: match[0],
          snippet: getSnippetAroundMatch(text, idx, 30),
          severity: 'danger'
        };
      }
    }
    return { hasRefusal: false };
  }

  // Check for Hallucinated Repetition Loops (§5.9)
  function checkRepetitionLoop(text) {
    if (!text || typeof text !== 'string') return { hasLoop: false };

    // Split text into meaningful sentences
    const sentences = text
      .split(/[.!?\n\r]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 18);

    if (sentences.length < 3) return { hasLoop: false };

    // 1. Consecutive identical sentences (e.g. 3 in a row)
    let consecutiveCount = 1;
    for (let i = 1; i < sentences.length; i++) {
      if (sentences[i].toLowerCase() === sentences[i - 1].toLowerCase()) {
        consecutiveCount++;
        if (consecutiveCount >= 3) {
          return {
            hasLoop: true,
            type: 'consecutive',
            phrase: sentences[i].slice(0, 70),
            occurrences: consecutiveCount,
            severity: 'danger'
          };
        }
      } else {
        consecutiveCount = 1;
      }
    }

    // 2. Frequency explosion (same 25+ char sentence appears > 5 times in chapter)
    const freq = new Map();
    for (const s of sentences) {
      if (s.length >= 25) {
        const norm = s.toLowerCase();
        const count = (freq.get(norm) || 0) + 1;
        freq.set(norm, count);
        if (count >= 5) {
          return {
            hasLoop: true,
            type: 'frequency',
            phrase: s.slice(0, 70),
            occurrences: count,
            severity: 'warning'
          };
        }
      }
    }

    return { hasLoop: false };
  }

  // Check for Empty or Corrupted Chapter Content (§7.1)
  function checkEmptyOrCorrupt(chapter) {
    const title = chapter?.title || '';
    const content = (typeof chapter === 'string' ? chapter : (chapter?.content || chapter?.text || '')).trim();

    // 1. Empty or too short
    if (content.length < 50) {
      return {
        isCorrupt: true,
        type: 'empty',
        reason: `Content too short (${content.length} characters, minimum expected: 50)`,
        severity: 'danger'
      };
    }

    // 2. Web scraper error pages
    for (const err of ERROR_MARKERS) {
      if (err.regex.test(content) || err.regex.test(title)) {
        return {
          isCorrupt: true,
          type: 'web_error',
          reason: `Contains web scraper error page marker: "${err.name}"`,
          severity: 'danger'
        };
      }
    }

    // 3. Residual unparsed HTML tags
    if (RESIDUAL_HTML_REGEX.test(content)) {
      return {
        isCorrupt: true,
        type: 'html_junk',
        reason: 'Contains unparsed web tags (<script>, <style>, or <iframe>)',
        severity: 'warning'
      };
    }

    // 4. Raw JavaScript code leaked from scraper
    if (RAW_DOM_CODE_REGEX.test(content)) {
      return {
        isCorrupt: true,
        type: 'code_junk',
        reason: 'Contains leaked JavaScript browser code',
        severity: 'warning'
      };
    }

    return { isCorrupt: false };
  }

  // Detect numeric gaps in chapter sequences (§7.1)
  function detectChapterGaps(chapters) {
    if (!Array.isArray(chapters) || chapters.length < 2) return [];

    const parsed = [];
    chapters.forEach((ch, idx) => {
      const title = ch?.title || '';
      const num = extractChapterNumber(title);
      if (num !== null && !isNaN(num)) {
        parsed.push({ num, idx, title });
      }
    });

    if (parsed.length < 2) return [];

    const gaps = [];
    for (let i = 1; i < parsed.length; i++) {
      const prev = parsed[i - 1];
      const cur = parsed[i];

      // Only check forward increases (ignore volume resets or small decimal chapters like 1.5)
      if (cur.num > prev.num + 1 && Math.floor(cur.num) - Math.floor(prev.num) <= 20) {
        const missingStart = Math.floor(prev.num) + 1;
        const missingEnd = Math.floor(cur.num) - 1;
        const count = (missingEnd - missingStart) + 1;
        const missingLabel = count === 1 ? `Chapter ${missingStart}` : `Chapters ${missingStart}–${missingEnd}`;

        gaps.push({
          type: 'gap',
          missingStart,
          missingEnd,
          count,
          missingLabel,
          prevTitle: prev.title,
          nextTitle: cur.title,
          afterIdx: prev.idx,
          severity: count > 3 ? 'danger' : 'warning'
        });
      }
    }

    return gaps;
  }

  // Detect duplicate chapters (§7.1)
  function detectDuplicates(chapters) {
    if (!Array.isArray(chapters) || chapters.length < 2) return [];

    const duplicates = [];
    const seenTitles = new Map();
    const seenContentPrefix = new Map();

    chapters.forEach((ch, idx) => {
      const title = (ch?.title || '').trim().toLowerCase();
      const content = (typeof ch === 'string' ? ch : (ch?.content || ch?.text || '')).trim();
      const contentPrefix = content.slice(0, 120).toLowerCase();

      // Check duplicate non-generic title
      if (title && !/^(?:chapter|ch\.?)\s*\d+$/i.test(title)) {
        if (seenTitles.has(title)) {
          duplicates.push({
            type: 'duplicate_title',
            idx,
            duplicateOfIdx: seenTitles.get(title),
            title: ch.title,
            severity: 'warning'
          });
        } else {
          seenTitles.set(title, idx);
        }
      }

      // Check duplicate content prefix (>= 60 chars)
      if (contentPrefix.length >= 60) {
        if (seenContentPrefix.has(contentPrefix)) {
          duplicates.push({
            type: 'duplicate_content',
            idx,
            duplicateOfIdx: seenContentPrefix.get(contentPrefix),
            title: ch?.title || `Chapter ${idx + 1}`,
            severity: 'danger'
          });
        } else {
          seenContentPrefix.set(contentPrefix, idx);
        }
      }
    });

    return duplicates;
  }

  // ── 4. CHAPTER & NOVEL COMPREHENSIVE AUDIT ──

  function auditChapter(chapter, idx = 0, options = {}) {
    const opts = {
      checkCorrupt: options.checkCorrupt !== false,
      checkCjkLeaks: options.checkCjkLeaks !== false,
      checkAntiMtl: options.checkAntiMtl !== false,
      checkLoops: options.checkLoops !== false,
      ...options
    };

    const text = (typeof chapter === 'string' ? chapter : (chapter?.content || chapter?.text || '')).trim();
    const title = chapter?.title || `Chapter ${idx + 1}`;
    const issues = [];

    // 1. Empty / Corrupt
    if (opts.checkCorrupt) {
      const cor = checkEmptyOrCorrupt(chapter);
      if (cor.isCorrupt) {
        issues.push({
          category: 'corrupt',
          type: cor.type,
          description: cor.reason,
          severity: cor.severity
        });
      }
    }

    // 2. Anti-MTL Refusal
    if (opts.checkAntiMtl) {
      const ref = checkMtlRefusal(text);
      if (ref.hasRefusal) {
        issues.push({
          category: 'refusal',
          type: 'ai_refusal',
          description: `${ref.patternName}: "${ref.matchedText}"`,
          snippet: ref.snippet,
          severity: ref.severity
        });
      }
    }

    // 3. Repetition Loops
    if (opts.checkLoops) {
      const loop = checkRepetitionLoop(text);
      if (loop.hasLoop) {
        issues.push({
          category: 'loop',
          type: 'hallucination_loop',
          description: `Repetition loop: phrase repeated ${loop.occurrences}x`,
          snippet: loop.phrase,
          severity: loop.severity
        });
      }
    }

    // 4. CJK Character Leak
    if (opts.checkCjkLeaks) {
      const leak = checkCjkLeak(text);
      if (leak.hasLeak) {
        issues.push({
          category: 'cjk_leak',
          type: 'cjk_leak',
          description: `Untranslated text: ${leak.count} CJK character(s) (${leak.percentage}%)`,
          samples: leak.samples,
          severity: leak.severity
        });
      }
    }

    return {
      idx,
      title,
      isHealthy: issues.length === 0,
      issues
    };
  }

  function auditNovel(novel, options = {}) {
    const opts = {
      checkGaps: options.checkGaps !== false,
      checkCorrupt: options.checkCorrupt !== false,
      checkDuplicates: options.checkDuplicates !== false,
      checkCjkLeaks: options.checkCjkLeaks !== false,
      checkAntiMtl: options.checkAntiMtl !== false,
      checkLoops: options.checkLoops !== false,
      ...options
    };

    const chapters = Array.isArray(novel)
      ? novel
      : (novel?.translatedChapters && novel.translatedChapters.length > 0
          ? novel.translatedChapters
          : (novel?.chapters || novel?.rawChapters || []));

    const title = novel?.title || 'Active Novel';
    const totalChapters = chapters.length;

    if (totalChapters === 0) {
      return {
        title,
        totalChapters: 0,
        healthyCount: 0,
        score: 0,
        grade: 'F',
        issues: [{ category: 'empty', type: 'no_chapters', description: 'Novel has no chapters loaded.', severity: 'danger' }],
        summary: { gaps: 0, corrupt: 0, cjkLeaks: 0, refusals: 0, loops: 0, duplicates: 0 }
      };
    }

    const chapterAudits = [];
    let healthyCount = 0;
    const issues = [];
    const summary = { gaps: 0, corrupt: 0, cjkLeaks: 0, refusals: 0, loops: 0, duplicates: 0 };

    // 1. Audit individual chapters
    chapters.forEach((ch, idx) => {
      const res = auditChapter(ch, idx, opts);
      if (res.isHealthy) {
        healthyCount++;
      } else {
        res.issues.forEach(iss => {
          issues.push({
            chapterIdx: idx,
            chapterTitle: res.title,
            ...iss
          });
          if (iss.category === 'corrupt') summary.corrupt++;
          else if (iss.category === 'cjk_leak') summary.cjkLeaks++;
          else if (iss.category === 'refusal') summary.refusals++;
          else if (iss.category === 'loop') summary.loops++;
        });
      }
      chapterAudits.push(res);
    });

    // 2. Audit sequence gaps
    if (opts.checkGaps) {
      const gaps = detectChapterGaps(chapters);
      gaps.forEach(gap => {
        summary.gaps += gap.count;
        issues.push({
          chapterIdx: gap.afterIdx,
          chapterTitle: gap.prevTitle,
          category: 'gap',
          type: 'missing_chapters',
          description: `Missing sequence: ${gap.missingLabel} between "${gap.prevTitle}" and "${gap.nextTitle}"`,
          severity: gap.severity,
          gapInfo: gap
        });
      });
    }

    // 3. Audit duplicates
    if (opts.checkDuplicates) {
      const dups = detectDuplicates(chapters);
      dups.forEach(dup => {
        summary.duplicates++;
        issues.push({
          chapterIdx: dup.idx,
          chapterTitle: dup.title,
          category: 'duplicate',
          type: dup.type,
          description: dup.type === 'duplicate_title'
            ? `Duplicate title with Chapter ${dup.duplicateOfIdx + 1}`
            : `Duplicate content with Chapter ${dup.duplicateOfIdx + 1}`,
          severity: dup.severity
        });
      });
    }

    // 4. Compute Health Score & Grade
    let score = 100;

    // Deductions:
    score -= Math.min(30, summary.gaps * 5);
    score -= Math.min(35, summary.corrupt * 8);
    score -= Math.min(25, summary.refusals * 8);
    score -= Math.min(20, summary.loops * 5);
    score -= Math.min(20, summary.cjkLeaks * 3);
    score -= Math.min(15, summary.duplicates * 4);

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade = 'A+';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 50) grade = 'C';
    else grade = 'F';

    const auditResult = {
      title,
      totalChapters,
      healthyCount,
      score,
      grade,
      issues,
      summary,
      chapterAudits
    };

    try {
      global.telemetryLog?.('QA_AUDIT', `Novel health audit: "${title}" ➔ Score: ${score}/100 [Grade: ${grade}] (${healthyCount}/${totalChapters} healthy chapters)`, {
        title,
        score,
        grade,
        totalChapters,
        healthyCount,
        issueCount: issues.length,
        summary
      });
    } catch(e) {}

    return auditResult;
  }

  // ── 5. EXPORT PUBLIC API ──
  const QAEngine = {
    auditNovel,
    auditChapter,
    checkCjkLeak,
    checkMtlRefusal,
    checkRepetitionLoop,
    checkEmptyOrCorrupt,
    detectChapterGaps,
    detectDuplicates,
    extractChapterNumber
  };

  global.QAEngine = QAEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QAEngine;
  }

  console.log('⚡ [qa_engine] Unified Novel Health & Translation QA Suite v8.11.2 initialized.');
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
