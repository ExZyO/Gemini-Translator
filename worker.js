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
      const lines = (glossaryText || '').split(/\r?\n/);
      const matched = [];
      const lowerChunk = (targetChunk || '').toLowerCase();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
        const term = trimmed.split(/[:=\t->]/)[0].trim().toLowerCase();
        if (term && term.length >= 2 && lowerChunk.includes(term)) {
          matched.push(trimmed);
        }
      }
      self.postMessage({ id, success: true, matchedLines: matched });
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
