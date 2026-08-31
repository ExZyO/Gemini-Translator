/* Gemini EPUB Translator - High-Performance Background Worker */
self.onmessage = async function(e) {
  const { id, type, payload } = e.data;
  try {
    if (type === 'PING') {
      self.postMessage({ id, success: true, result: 'ready' });
    } else if (type === 'COUNT_WORDS_BULK') {
      const { chapters } = payload;
      const results = (chapters || []).map(ch => {
        const text = ch.text || '';
        const cjk = (text.match(/[一-龥぀-ヿ가-힯]/g) || []).length;
        const nonCjk = text.replace(/[一-龥぀-ヿ가-힯]/g, ' ');
        const words = (nonCjk.trim().split(/\s+/).filter(Boolean)).length;
        return {
          title: ch.title || '',
          wordCount: cjk + words,
          charCount: text.length,
          tokens: Math.ceil(cjk * 1.2 + words * 1.3)
        };
      });
      self.postMessage({ id, success: true, results });
    } else if (type === 'FILTER_GLOSSARY') {
      const { glossaryText, targetChunk } = payload;
      if (!glossaryText || !glossaryText.trim() || !targetChunk || !targetChunk.trim()) {
        self.postMessage({ id, success: true, filteredText: glossaryText || '' });
        return;
      }
      const lines = glossaryText.split(/\r?\n/);
      const globalRules = [];
      const blocks = [];
      let currentBlock = null;
      let isGlobalSection = false;

      const lowerChunk = targetChunk.toLowerCase();
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
        if (!trimmed) { flushCurrentBlock(); continue; }

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
          currentBlock = { lines: [line], searchKeys: [] };
          const cjkMatches = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{1,}/g);
          if (cjkMatches) currentBlock.searchKeys.push(...cjkMatches);

          // Parenthetical mappings (e.g. "- 扮演法 (Acting Method)")
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

          const charDirMatch = trimmed.match(/^[-*•]?\s*([A-Za-z\s'.-]+)\s*-\s*(.+)$/);
          if (charDirMatch) {
            const name = charDirMatch[1].trim();
            if (name && name.length >= 2 && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(name)) {
              currentBlock.searchKeys.push(name);
            }
          }
          const standaloneItem = trimmed.match(/^[-*•]?\s*([A-Za-z0-9\s'.-]{3,50})$/);
          if (standaloneItem) {
            const item = standaloneItem[1].trim();
            if (item && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(item)) {
              currentBlock.searchKeys.push(item);
            }
          }
          const artMatches = trimmed.match(/\b\d+-\d+\b/g);
          if (artMatches) currentBlock.searchKeys.push(...artMatches);

          const seqMatch = trimmed.match(/Sequence\s+\d+:\s*([A-Za-z\s()'-]+)/i);
          if (seqMatch) {
            const seqName = seqMatch[1].replace(/\(.*\)/, '').trim();
            if (seqName && seqName.length >= 2) currentBlock.searchKeys.push(seqName);
          }

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
          if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(key)) return targetChunk.includes(key);
          const lowerKey = key.toLowerCase();
          if (lowerKey.length <= 4) return chunkTokens.has(lowerKey) || lowerChunk.includes(lowerKey);
          return lowerChunk.includes(lowerKey);
        });
        if (isMatch) matchedBlocks.push(block.lines.join('\n'));
      }

      let filteredText = '';
      if (globalRules.length > 0) filteredText += '=== SYSTEM TRANSLATION RULES & STYLE GUIDELINES ===\n' + globalRules.join('\n').trim() + '\n\n';
      if (matchedBlocks.length > 0) filteredText += '=== RELEVANT CHAPTER TERMINOLOGY & GLOSSARY ===\n' + matchedBlocks.join('\n\n');

      self.postMessage({ id, success: true, filteredText: filteredText.trim() });
    } else if (type === 'OPTIMIZE_CHUNKS') {
      const { text, maxPayload, promptOverhead } = payload;
      const targetSize = (maxPayload || 4500) - (promptOverhead || 800);
      const paragraphs = (text || '').split('\n\n');
      const chunks = [];
      let cur = '';
      for (const p of paragraphs) {
        if ((cur + '\n\n' + p).length > targetSize && cur.trim()) {
          chunks.push(cur.trim());
          cur = p;
        } else {
          cur = cur ? (cur + '\n\n' + p) : p;
        }
      }
      if (cur.trim()) chunks.push(cur.trim());
      self.postMessage({ id, success: true, chunks });
    } else {
      self.postMessage({ id, success: false, error: 'Unknown worker action: ' + type });
    }
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};
