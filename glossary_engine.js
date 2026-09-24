/* ═══════════════════════════════════════════════════════════════════════
   GEMINI TRANSLATOR - SMART GLOSSARY & RECURSIVE FILTER ENGINE (v8.17.64)
   Intelligent chunk-level term filtering, source token matching, and name validation
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

const formatGlossaryString = (str) => {
  if (!str || !str.trim()) return '';
  // Keep the glossary lossless. Formatting must never rewrite or discard rules, notes, aliases, or headings.
  return String(str).replace(/\r\n?/g, '\n').trim();
};

// ═══════════════════════════════════════
// SMART DYNAMIC GLOSSARY FILTERING (LOSSLESS & SOURCE-AWARE)
// ═══════════════════════════════════════
const legacyFilterGlossaryForChunk = (rawGlossary, chunkText, isSmartEnabled = true) => {
  if (!rawGlossary || !rawGlossary.trim()) return '';
  if (!isSmartEnabled || !chunkText || !chunkText.trim()) return formatGlossaryString(rawGlossary);

  const lines = rawGlossary.split(/\r?\n/);
  const globalRules = [];
  const blocks = [];
  let currentBlock = null;
  let isGlobalSection = false;

  const lowerChunk = chunkText.toLowerCase();
  const chunkTokens = new Set(lowerChunk.match(/[a-z0-9_'-]{2,}/g) || []);

  const flushCurrentBlock = () => {
    if (currentBlock && currentBlock.lines.length > 0) {
      currentBlock.searchKeys = Array.from(new Set(currentBlock.searchKeys.filter(Boolean)));
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushCurrentBlock();
      continue;
    }

    // Detect Global Translation Style / System Rules Sections (Always included in full)
    if (/^(?:#+\s*)?(?:[I|V|X]+\.|\d+\.)?\s*(?:SYSTEM TRANSLATION RULES|STYLE GUIDELINES|SYSTEM RULES|TRANSLATION RULES|GENERAL RULES|PROMPT RULES)/i.test(trimmed)) {
      isGlobalSection = true;
      flushCurrentBlock();
    } else if (/^(?:#+\s*)?(?:[I|V|X]+\.|\d+\.)?\s*(?:CORE TERMINOLOGY|VOCABULARY|CHARACTER DIRECTORY|CHARACTERS|COSMOLOGY|SEFIROT|EPOCHS|BEYONDER LAWS|LAWS|PATHWAYS|HONORIFIC NAMES|SEALED ARTIFACTS|MYTHICAL CREATURE|ORGANIZATIONS|OUTER DEITIES)/i.test(trimmed)) {
      isGlobalSection = false;
      flushCurrentBlock();
    }

    if (isGlobalSection) {
      globalRules.push(line);
      continue;
    }

    // Child/sub-lines (indented lines, honorific bullet quotes, multi-line definitions)
    const isChildLine = /^(\s{2,}|\t|\*|\+|\s*[-•]\s*["']|\s*["'])/.test(line) &&
      !/^[-*•]?\s*[\u4e00-\u9fa5]{1,10}\s*(?:->|:|=|\()/.test(trimmed) &&
      !/^[A-Z][a-zA-Z0-9\s'.-]{2,30}\s*-\s+[A-Za-z]/.test(trimmed);

    if (isChildLine && currentBlock) {
      currentBlock.lines.push(line);
      const subCjk = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{1,}/g);
      if (subCjk) currentBlock.searchKeys.push(...subCjk);
      const subArtifacts = trimmed.match(/\b\d+-\d+\b/g);
      if (subArtifacts) currentBlock.searchKeys.push(...subArtifacts);
    } else {
      flushCurrentBlock();

      currentBlock = {
        lines: [line],
        searchKeys: []
      };

      // 1. CJK character sequences
      const cjkMatches = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{1,}/g);
      if (cjkMatches) currentBlock.searchKeys.push(...cjkMatches);

      // 2. Parenthetical mappings (e.g. "- 扮演法 (Acting Method)", "- 卢卡·布鲁斯特 (Lucca Brewster)")
      const parenMatch = trimmed.match(/^[-*•#\d.\s]*([^(]+?)\s*\(([^)]+)\)/);
      if (parenMatch) {
        const left = parenMatch[1].replace(/^[-*•#\d.\s]+/, '').trim();
        const right = parenMatch[2].trim();
        if (left) {
          left.split(/[/|,]/).forEach(k => {
            const c = k.trim();
            if (c) currentBlock.searchKeys.push(c);
          });
        }
        if (right) {
          right.split(/[/|,]/).forEach(k => {
            const c = k.trim();
            if (c) currentBlock.searchKeys.push(c);
          });
        }
      }

      // 3. Key-value mapping left-side & right-side aliases (e.g. "克莱恩·莫雷蒂 -> Klein Moretti", "A先生 -> Mr. A")
      if (trimmed.includes('->') || trimmed.includes('=') || (trimmed.includes(':') && !trimmed.startsWith('http'))) {
        const parts = trimmed.split(/->|=|:(?!\/\/)/);
        if (parts.length >= 2) {
          const leftKey = parts[0].replace(/^[-*•#\d.\s]+/, '').trim();
          if (leftKey && leftKey.length >= 1) {
            leftKey.split(/[/|,]/).forEach(k => {
              const cleaned = k.trim().replace(/\(.*\)/, '').trim();
              if (cleaned) currentBlock.searchKeys.push(cleaned);
            });
          }

          const parenMatches = parts[1].match(/\(([^)]+)\)/g);
          if (parenMatches) {
            parenMatches.forEach(p => {
              const inner = p.replace(/[()]/g, '');
              inner.split(/[/|,]/).forEach(alias => {
                const cleanAlias = alias.trim();
                if (cleanAlias.length >= 2) currentBlock.searchKeys.push(cleanAlias);
              });
            });
          }
        }
      }

      // 4. Character Directory entries (e.g. "- Alger Wilson - Tyrant / Hanged Man")
      const charDirMatch = trimmed.match(/^[-*•]?\s*([A-Za-z\s'.-]+)\s*-\s*(.+)$/);
      if (charDirMatch) {
        const name = charDirMatch[1].trim();
        if (name && name.length >= 2 && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(name)) {
          currentBlock.searchKeys.push(name);
        }
      }

      // 5. Standalone English named items / bullet items (e.g. "- Quill of Alzuhod", "- Sefirah Castle")
      const standaloneItem = trimmed.match(/^[-*•]?\s*([A-Za-z0-9\s'.-]{3,50})$/);
      if (standaloneItem) {
        const item = standaloneItem[1].trim();
        if (item && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(item)) {
          currentBlock.searchKeys.push(item);
        }
      }

      // 6. Sealed Artifact Numbers (e.g. 0-08, 1-42, 2-166, 0-01)
      const artMatches = trimmed.match(/\b\d+-\d+\b/g);
      if (artMatches) currentBlock.searchKeys.push(...artMatches);

      // 7. Sequence Names (e.g. "Sequence 9: Seer", "Sequence 4: Bizarro Sorcerer")
      const seqMatch = trimmed.match(/Sequence\s+\d+:\s*([A-Za-z\s()'-]+)/i);
      if (seqMatch) {
        const seqName = seqMatch[1].replace(/\(.*\)/, '').trim();
        if (seqName && seqName.length >= 2) currentBlock.searchKeys.push(seqName);
      }

      // 8. Honorific / Deity headers (e.g. "- The Fool:", "- Evernight Goddess:")
      const deityMatch = trimmed.match(/^[-*•]?\s*([A-Za-z\s'.-]+):$/);
      if (deityMatch) {
        const dName = deityMatch[1].trim();
        if (dName && dName.length >= 2) currentBlock.searchKeys.push(dName);
      }
    }
  }

  flushCurrentBlock();

  const matchedBlocks = [];
  for (const block of blocks) {
    if (!block.searchKeys || block.searchKeys.length === 0) continue;

    const isMatch = block.searchKeys.some(key => {
      if (!key) return false;
      if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(key)) {
        return chunkText.includes(key);
      }
      const lowerKey = key.toLowerCase();
      if (lowerKey.length <= 4) {
        return chunkTokens.has(lowerKey) || lowerChunk.includes(lowerKey);
      }
      return lowerChunk.includes(lowerKey);
    });

    if (isMatch) {
      matchedBlocks.push(block.lines.join('\n'));
    }
  }

  let result = '';
  if (globalRules.length > 0) {
    result += '=== SYSTEM TRANSLATION RULES & STYLE GUIDELINES ===\n' + globalRules.join('\n').trim() + '\n\n';
  }

  if (matchedBlocks.length > 0) {
    result += '=== RELEVANT CHAPTER TERMINOLOGY & GLOSSARY ===\n' + matchedBlocks.join('\n\n');
  }

  return result.trim() || (globalRules.length > 0 ? globalRules.join('\n').trim() : formatGlossaryString(rawGlossary));
};

// Precision Lossless dynamic glossary selection.
const filterGlossaryForChunk = (rawGlossary, chunkText, isSmartEnabled = true) => {
  if (!rawGlossary || !rawGlossary.trim()) return '';
  const originalGlossary = String(rawGlossary).replace(/\r\n?/g, '\n').trim();
  if (!isSmartEnabled || !chunkText || !chunkText.trim()) return originalGlossary;

  const lines = originalGlossary.split('\n');
  const globalRules = [];
  const blocks = [];
  let currentBlock = null;
  let currentSectionHeading = '';
  let isGlobalSection = false;

  const topSectionPattern = /^(?:#+\s*)?[IVXLCDM]+\.\s+\S/i;
  const globalSectionPattern = /^(?:#+\s*)?(?:I\.)?\s*(?:SYSTEM TRANSLATION RULES|STYLE GUIDELINES|SYSTEM RULES|TRANSLATION RULES|GENERAL RULES|PROMPT RULES)/i;
  const alwaysIncludeSectionPattern = /\b(?:RULES?|GUIDELINES?|CONTINUITY|FORMATTING|DO\s+NOT)\b/i;

  const genericKeys = new Set([
    'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'god', 'goddess', 'he', 'her', 'his',
    'human', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'pathway', 'sequence', 'she', 'the',
    'this', 'to', 'unknown', 'was', 'with', 'year', 'ability', 'abilities', 'authority', 'authorities',
    'appearance', 'aliases', 'counters', 'formula', 'history', 'symbolism', 'physical', 'enhanced', 'enhancement',
    'notes', 'note', 'chapter', 'chapters', 'volume', 'volumes', 'vol', 'vols', 'form', 'forms', 'grade', 'level', 'item', 'items'
  ]);

  const normalizeKey = value => String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/[^a-z0-9\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const keyVariants = key => {
    const raw = String(key || '').trim();
    if (!raw) return [];
    if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(raw)) return [raw];
    const normalized = normalizeKey(raw);
    if (!normalized) return [];
    const variants = [normalized];
    const withoutTitle = normalized.replace(/^(?:mr|mrs|ms|miss|madam|madame|the|church\s+of\s+the|church\s+of)\s+/, '').trim();
    if (withoutTitle && withoutTitle !== normalized && withoutTitle.length >= 3) variants.push(withoutTitle);
    if (normalized.includes(' ')) {
      const words = normalized.split(' ').filter(Boolean);
      if (words.length <= 3 && words.every(word => word.length >= 3 && !genericKeys.has(word))) {
        words.forEach(word => variants.push(word));
      }
    }
    return Array.from(new Set(variants)).filter(v => v.length >= 2 && !genericKeys.has(v));
  };

  const bulletRegex = /^(?:[-*+\u2022#\s]+|(?:\d+|[a-zA-Z])[.)]\s+)+/;

  const addTermKeys = (target, value) => {
    const clean = String(value || '').replace(bulletRegex, '').trim();
    if (!clean) return;
    const cjkMatches = (clean.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uff10-\uff19\uff21-\uff3a\uff41-\uff5aa-zA-Z0-9·・_-]+/g) || [])
      .filter(token => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(token));
    cjkMatches.forEach(key => {
      target.push(key);
      key.split(/[·・]/).filter(part => part.length >= 2).forEach(part => target.push(part));
    });
    clean.split(/[/|,;]+/)
      .map(part => part.replace(/\([^)]*\)/g, '').replace(/[\[\]]/g, '').trim())
      .filter(part => part && part.length <= 100)
      .forEach(part => keyVariants(part).forEach(variant => target.push(variant)));
  };

  const addLineSearchKeys = (target, line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;
    const content = trimmed.replace(bulletRegex, '').trim();
    if (!content) return;
    const mapping = content.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)\s*$/);
    if (mapping) {
      addTermKeys(target, mapping[1]);
      let targetClean = mapping[2];
      const hashIdx = targetClean.indexOf('#');
      if (hashIdx !== -1) targetClean = targetClean.slice(0, hashIdx).trim();
      const dSlashIdx = targetClean.indexOf('//');
      if (dSlashIdx !== -1) targetClean = targetClean.slice(0, dSlashIdx).trim();
      addTermKeys(target, targetClean);
    } else {
      const dashEntry = content.match(/^(.+?)\s+-\s+.+$/);
      const colonEntry = content.match(/^(.+?)\s*:\s*(.*)$/);
      addTermKeys(target, dashEntry ? dashEntry[1] : (colonEntry ? colonEntry[1] : content));
      if (colonEntry?.[2] && colonEntry[2].length <= 80) {
        let rightClean = colonEntry[2];
        const hashIdx = rightClean.indexOf('#');
        if (hashIdx !== -1) rightClean = rightClean.slice(0, hashIdx).trim();
        addTermKeys(target, rightClean);
      }
      if (dashEntry?.[2] && dashEntry[2].length <= 80) {
        let rightClean = dashEntry[2];
        const hashIdx = rightClean.indexOf('#');
        if (hashIdx !== -1) rightClean = rightClean.slice(0, hashIdx).trim();
        addTermKeys(target, rightClean);
      }
    }
    (content.match(/\b\d+-\d+\b/g) || []).forEach(number => target.push(number));
  };

  const flushCurrentBlock = () => {
    if (currentBlock && currentBlock.lines.length > 0) {
      currentBlock.searchKeys = Array.from(new Set(currentBlock.searchKeys.filter(Boolean)));
      blocks.push(currentBlock);
    }
    currentBlock = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (isGlobalSection) globalRules.push('');
      flushCurrentBlock();
      continue;
    }
    if (topSectionPattern.test(trimmed)) {
      flushCurrentBlock();
      currentSectionHeading = line;
      const hasDictionaryName = /\b(?:PHRASES?|TERMS?|VOCABULARY|DICTIONARY|NAMES?|CHARACTERS?|PERSONAS?|LOCATIONS?|NOTES?)\b/i.test(trimmed);
      isGlobalSection = (globalSectionPattern.test(trimmed) || alwaysIncludeSectionPattern.test(trimmed)) && !hasDictionaryName;
      if (isGlobalSection) globalRules.push(line);
      continue;
    }

    // Even within a global section, any line with a mapping arrow (A -> B or A => B) is a dictionary entry, NOT a global meta-rule!
    const isMappingLine = /^(?:[-*+\u2022\s]*)?.+?\s*(?:->|=>|=)\s*.+$/.test(trimmed);
    if (isGlobalSection && !isMappingLine) {
      globalRules.push(line);
      continue;
    }

    const isSubIndentedNote = currentBlock && (
      /^\s{2,}[*+\u2022-]\s+/.test(line) ||
      /^\s{2,}\*/.test(line)
    );

    if (isSubIndentedNote) {
      currentBlock.lines.push(line);
      if (trimmed.length <= 120) addLineSearchKeys(currentBlock.searchKeys, line);
    } else {
      flushCurrentBlock();
      currentBlock = { lines: [line], searchKeys: [], sectionHeading: currentSectionHeading };
      addLineSearchKeys(currentBlock.searchKeys, line);
    }
  }
  flushCurrentBlock();

  const chunkForMatch = normalizeKey(chunkText);
  const matchesKeyInText = (key, text, normalizedText) => {
    if (!key) return false;
    if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(key)) return text.includes(key);
    return keyVariants(key).some(variant => {
      const escaped = variant.replace(/[.*+?^()|[\]\\]/g, '\\$&');
      return new RegExp('(?:^| )' + escaped + '(?:$| )', 'i').test(normalizedText);
    });
  };

  // Direct precision matching against chunk text
  const selectedBlocks = new Set();
  for (const block of blocks) {
    for (const key of block.searchKeys) {
      if (matchesKeyInText(key, chunkText, chunkForMatch)) {
        selectedBlocks.add(block);
        break;
      }
    }
  }

  // Assemble Lossless Formatted Output
  const output = [];
  const seenSections = new Set();
  const globalText = globalRules.join('\n').trim();
  if (globalText) output.push(globalText);

  for (const block of blocks) {
    if (!selectedBlocks.has(block)) continue;
    if (block.sectionHeading && !seenSections.has(block.sectionHeading)) {
      output.push(block.sectionHeading);
      seenSections.add(block.sectionHeading);
    }
    output.push(block.lines.join('\n'));
  }

  return output.join('\n\n').trim() || '';
};



  const splitGlossaryIntoChunks = (text, maxLines = 130) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= maxLines) return [text];
    const chunks = [];
    let cur = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeader = /^(?:#+\s*)?(?:SECTION\s+)?[IVXLCDM]+\.\s+/i.test(line) || /^#{1,2}\s+[A-Z]/i.test(line);
      if (cur.length >= maxLines && (line.trim() === '' || isHeader)) {
        chunks.push(cur.join('\n'));
        cur = [];
      } else if (cur.length >= maxLines * 1.5) {
        chunks.push(cur.join('\n'));
        cur = [];
      }
      cur.push(line);
    }
    if (cur.length > 0) chunks.push(cur.join('\n'));
    return chunks;
  };

  const formatExtractedTermsIntoMasterGlossary = (terms) => {
    const characters = [];
    const factions = [];
    const termsList = [];
    const locations = [];
    const other = [];

    terms.forEach(t => {
      const cat = (t.category || '').toLowerCase();
      const line = `- ${t.orig} = ${t.trans}${t.note ? ` # ${t.category}: ${t.note}` : ''}`;
      if (cat.includes('char') || cat.includes('person') || cat.includes('protagonist') || cat.includes('antagonist')) {
        characters.push(line);
      } else if (cat.includes('faction') || cat.includes('sect') || cat.includes('guild') || cat.includes('clan') || cat.includes('org')) {
        factions.push(line);
      } else if (cat.includes('loc') || cat.includes('place') || cat.includes('city') || cat.includes('realm') || cat.includes('world') || cat.includes('school')) {
        locations.push(line);
      } else if (cat.includes('rank') || cat.includes('skill') || cat.includes('item') || cat.includes('term') || cat.includes('magic') || cat.includes('artifact')) {
        termsList.push(line);
      } else {
        other.push(line);
      }
    });

    const sections = [
      '## I. SYSTEM TRANSLATION RULES & STYLE GUIDELINES',
      '- Maintain strict character gender continuity and pronoun fidelity across all chapters.',
      '- Preserve original Japanese/Chinese honorifics (-san, -kun, -sama, Shixiong, Shidi) where appropriate, or translate consistently.',
      '- Keep specialized cultivation, magical techniques, and artifact names consistent with this glossary.',
      '- Retain raw untranslated text structure, dialog formatting, and paragraph line breaks without omitting sentences.'
    ];

    let sectionNum = 2;
    const roman = ['II', 'III', 'IV', 'V', 'VI'];

    if (characters.length > 0 || factions.length > 0) {
      sections.push('', `## ${roman[sectionNum - 2]}. CHARACTER & FACTION DIRECTORY`);
      if (characters.length > 0) sections.push(...characters);
      if (factions.length > 0) sections.push('', '### Factions & Organizations', ...factions);
      sectionNum++;
    }

    if (termsList.length > 0) {
      sections.push('', `## ${roman[sectionNum - 2]}. CORE CONCEPTS & SYSTEM TERMS`);
      sections.push(...termsList);
      sectionNum++;
    }

    if (locations.length > 0) {
      sections.push('', `## ${roman[sectionNum - 2]}. LOCATIONS & GEOGRAPHY`);
      sections.push(...locations);
      sectionNum++;
    }

    if (other.length > 0) {
      sections.push('', `## ${roman[sectionNum - 2]}. ADDITIONAL ENTITIES & TERMINOLOGY`);
      sections.push(...other);
    }

    return sections.join('\n');
  };

  const parseUniversalGlossaryPairs = (text) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const pairs = [];
    const seen = new Set();

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) continue;
      
      const hashIdx = line.indexOf('#');
      if (hashIdx !== -1) line = line.slice(0, hashIdx).trim();
      const slashIdx = line.indexOf('//');
      if (slashIdx !== -1) line = line.slice(0, slashIdx).trim();

      line = line.replace(/^[-*•\s]+/, '').replace(/^\d+[\.\)]\s+/, '').trim();
      if (!line) continue;

      let orig = '';
      let target = '';

      const arrowMatch = line.match(/\s*(?:->|=>|→)\s*/);
      if (arrowMatch) {
        const idx = line.indexOf(arrowMatch[0]);
        orig = line.slice(0, idx).trim();
        target = line.slice(idx + arrowMatch[0].length).trim();
      } else {
        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          orig = line.slice(0, eqIdx).trim();
          target = line.slice(eqIdx + 1).trim();
        }
      }

      if (!orig || !target) continue;
      if (/^(?:Example|Legend|Note|Rule|Warning)/i.test(orig)) continue;

      const origClean = orig.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const targetClean = target.replace(/\s*\[[MFmf]\]\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      const primaryTarget = targetClean.split(/\s*[\/\;]\s*/)[0].replace(/^["']|["']$/g, '').trim();

      if (origClean && primaryTarget && !seen.has(origClean)) {
        seen.add(origClean);
        pairs.push({ orig: origClean, target: primaryTarget });
      }
    }
    return pairs;
  };

  const auditNameConsistency = (glossaryPairs, chapters) => {
    if (!glossaryPairs || !chapters) return [];
    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const results = [];

    glossaryPairs.forEach(pair => {
      const targetTerm = pair.target;
      const origTerm = pair.orig;
      let totalTargetOccurrences = 0;
      let totalLeaks = 0;
      const chapterOccurrences = [];
      const leaksFoundIn = [];
      const driftMatches = [];

      const words = targetTerm.split(/\s+/).filter(w => w.length >= 4);

      chapters.forEach((ch, idx) => {
        const text = (ch?.content || ch?.text || '');
        const chName = ch?.title || `Ch. ${idx + 1}`;

        try {
          const targetRegex = new RegExp('\\b' + escapeRegExp(targetTerm) + '\\b', 'gi');
          const targetMatches = (text.match(targetRegex) || []).length;
          if (targetMatches > 0) {
            totalTargetOccurrences += targetMatches;
            chapterOccurrences.push({ chName, count: targetMatches });
          }

          if (origTerm && origTerm.length >= 2) {
            const leakRegex = new RegExp(escapeRegExp(origTerm), 'g');
            const leakMatches = (text.match(leakRegex) || []).length;
            if (leakMatches > 0) {
              totalLeaks += leakMatches;
              leaksFoundIn.push({ chName, count: leakMatches });
            }
          }

          words.forEach(w => {
            if (w.includes('ou')) {
              const alternate = w.replace(/ou/g, 'o');
              const altRegex = new RegExp('\\b' + escapeRegExp(alternate) + '\\b', 'gi');
              const altMatches = (text.match(altRegex) || []).length;
              if (altMatches > 0) {
                driftMatches.push({ chName, found: alternate, shouldBe: w, count: altMatches });
              }
            }
          });
        } catch (e) {}
      });

      results.push({
        orig: origTerm,
        target: targetTerm,
        totalCount: totalTargetOccurrences,
        chapterOccurrences,
        totalLeaks,
        leaksFoundIn,
        driftMatches,
        status: totalLeaks > 0 ? 'leak' : (driftMatches.length > 0 ? 'drift' : (totalTargetOccurrences > 0 ? 'good' : 'missing'))
      });
    });

    return results;
  };

  const batchFixNameDrift = (foundWord, targetWord, chapters, assembledText) => {
    if (!foundWord || !targetWord) return { updatedChapters: chapters, updatedAssembledText: assembledText, replacedCount: 0 };
    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escapeRegExp(foundWord) + '\\b', 'g');
    let replacedCount = 0;
    let updatedChapters = chapters;
    let updatedAssembledText = assembledText;

    if (chapters && chapters.length > 0) {
      updatedChapters = chapters.map(ch => {
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
  };

  if (typeof window !== 'undefined') {
    window.splitGlossaryIntoChunks = splitGlossaryIntoChunks;
    window.formatExtractedTermsIntoMasterGlossary = formatExtractedTermsIntoMasterGlossary;
    window.parseUniversalGlossaryPairs = parseUniversalGlossaryPairs;
    window.formatGlossaryString = formatGlossaryString;
    window.legacyFilterGlossaryForChunk = legacyFilterGlossaryForChunk;
    window.filterGlossaryForChunk = filterGlossaryForChunk;
    window.auditNameConsistency = auditNameConsistency;
    window.batchFixNameDrift = batchFixNameDrift;
  }

  return {
    splitGlossaryIntoChunks,
    formatExtractedTermsIntoMasterGlossary,
    parseUniversalGlossaryPairs,
    formatGlossaryString,
    legacyFilterGlossaryForChunk,
    filterGlossaryForChunk,
    auditNameConsistency,
    batchFixNameDrift
  };
}));
