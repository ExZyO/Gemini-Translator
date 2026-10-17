/**
 * Gemini EPUB Translator - In-Chapter Selection Translator & Multi-Chapter Batch Selector
 * Module: reader_chapter_translator.js
 * 
 * Provides:
 * 1. ReaderSelectionTranslator:
 *    - Floating toolbar on text selection with [ ✨ Translate Selection ], [ 🩹 Heal Paragraph ], [ 📋 Copy ].
 *    - In-place single-block AI translation with active model and glossary.
 *    - Direct paragraph text splicing and persistent commit to GeminiNovelDB.
 * 2. ChapterBatchSelector:
 *    - Interactive multi-chapter checklist for ChapterTranslationSuiteModal.
 *    - Quick filters: Untranslated Only, Next 5, Next 10, Range (From X to Y), Current Arc, Clear.
 * 3. ReaderBatchTranslationOrchestrator:
 *    - Executes sequential/turbo parallel batch translation across chosen chapters.
 *    - Live updates to top Dynamic Floating Pill and safe partial saving on early stop.
 */

(function(window) {
  'use strict';

  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const h = React.createElement;
  const ic = (name, size = 16, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  // ══════════════════════════════════════════════════════════════════════
  // 1. FLOATING SELECTION TRANSLATOR TOOLBAR
  // ══════════════════════════════════════════════════════════════════════
  function ReaderSelectionTranslator(props) {
    const {
      currentChapter,
      activeIdx,
      chapters,
      safeChapters,
      onChaptersChange,
      novelRecord,
      appSettings = {},
      onRenderTrigger
    } = props;

    const [toolbarState, setToolbarState] = useState(null); // { text, rect, pIdx, paragraphText }
    const [isTranslating, setIsTranslating] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const debounceTimerRef = useRef(null);

    // Listen to text selection within reader canvas
    useEffect(() => {
      const handleSelectionChange = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (isTranslating) return;
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            setToolbarState(null);
            return;
          }

          const text = sel.toString().trim();
          if (text.length < 2) {
            setToolbarState(null);
            return;
          }

          // Verify selection is inside reader container
          const anchor = sel.anchorNode;
          const readerArea = document.getElementById('gemini-reader-scroll-area') ||
                             document.getElementById('gemini-foliate-wrapper') ||
                             document.querySelector('.reader-v2-scroll-container') ||
                             document.querySelector('.reader-v2-paginated-viewport');

          if (!readerArea || !readerArea.contains(anchor)) {
            setToolbarState(null);
            return;
          }

          try {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
              setToolbarState(null);
              return;
            }

            // Find parent paragraph element
            let pElem = anchor.nodeType === 1 ? anchor : anchor.parentElement;
            while (pElem && pElem.tagName !== 'P' && pElem !== readerArea) {
              pElem = pElem.parentElement;
            }

            const pIdxAttr = pElem?.getAttribute?.('data-pidx') || pElem?.id?.replace('p_', '');
            const pIdx = pIdxAttr ? parseInt(pIdxAttr, 10) : -1;
            const paragraphText = pElem?.innerText || pElem?.textContent || text;

            // Position toolbar directly above selection center
            const top = Math.max(12, rect.top - 54);
            const left = Math.min(window.innerWidth - 240, Math.max(12, rect.left + (rect.width / 2) - 120));

            setToolbarState({
              text,
              rect: { top, left, width: rect.width, height: rect.height },
              pIdx,
              paragraphText: paragraphText.trim()
            });
          } catch (e) {
            setToolbarState(null);
          }
        }, 180);
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      };
    }, [isTranslating]);

    // Build translation configuration options
    const buildTranslationOpts = useCallback(() => {
      const nSettings = novelRecord?.translationSettings || {};
      const resolve = (key, fallback, storageKey) => {
        if (typeof window !== 'undefined' && window.resolveSetting) {
          return window.resolveSetting(nSettings, key, (typeof localStorage !== 'undefined' && storageKey) ? localStorage.getItem(storageKey) : fallback);
        }
        return nSettings[key] ?? appSettings[key] ?? (typeof localStorage !== 'undefined' && storageKey ? localStorage.getItem(storageKey) : null) ?? fallback;
      };

      const provider = resolve('provider', 'gemini', 'gemini_provider');
      const geminiModel = resolve('geminiModel', 'gemini-3.8-flash', 'gemini_model');
      const deepseekModel = resolve('deepseekModel', 'deepseek-chat', 'gemini_deepseek_model');
      const useCustomModel = Boolean(resolve('useCustomModel', false));
      const customModel = resolve('customModel', '');
      const tgtLang = resolve('tgtLang', 'English', 'gemini_tgt_lang');
      const customInstructions = resolve('customInstructions', '');
      const terminology = resolve('terminology', '');

      let apiKey = '';
      if (typeof window !== 'undefined' && window.KeyManagerEngine?.Controller?.getActiveKey) {
        apiKey = window.KeyManagerEngine.Controller.getActiveKey(provider, window.apiKeysByProvider, window.activeKeyIds) || '';
      }
      if (!apiKey && typeof localStorage !== 'undefined') {
        apiKey = (provider === 'deepseek' ? localStorage.getItem('deepseek_api_key') : localStorage.getItem('gemini_api_key')) || '';
      }

      return {
        provider,
        apiKey,
        model: useCustomModel ? customModel.trim() : (provider === 'deepseek' ? deepseekModel : geminiModel),
        targetLanguage: tgtLang,
        tgtLang,
        instructions: customInstructions,
        terminology
      };
    }, [novelRecord, appSettings]);

    // In-place text replacement & persistent commit
    const commitUpdatedText = useCallback(async (originalTargetText, newTranslatedText) => {
      if (!currentChapter) return false;
      const originalBody = currentChapter.text || currentChapter.content || '';
      let updatedBody = '';

      if (originalBody.includes(originalTargetText)) {
        updatedBody = originalBody.replace(originalTargetText, newTranslatedText);
      } else {
        // Fallback: match normalized whitespace
        const cleanOrig = originalTargetText.replace(/\s+/g, ' ').trim();
        const lines = originalBody.split('\n');
        let replaced = false;
        const newLines = lines.map(line => {
          if (!replaced && line.replace(/\s+/g, ' ').includes(cleanOrig)) {
            replaced = true;
            return line.replace(originalTargetText.trim(), newTranslatedText.trim());
          }
          return line;
        });
        updatedBody = replaced ? newLines.join('\n') : (originalBody + '\n\n' + newTranslatedText);
      }

      currentChapter.text = updatedBody;
      currentChapter.content = updatedBody;
      currentChapter.isTranslated = true;

      const targetIdx = typeof activeIdx === 'number' ? activeIdx : 0;
      if (Array.isArray(chapters) && chapters[targetIdx]) {
        chapters[targetIdx] = { ...chapters[targetIdx], text: updatedBody, content: updatedBody, isTranslated: true };
      }
      if (Array.isArray(safeChapters) && safeChapters[targetIdx]) {
        safeChapters[targetIdx] = { ...safeChapters[targetIdx], text: updatedBody, content: updatedBody, isTranslated: true };
      }

      if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
        onChaptersChange([...safeChapters]);
      }

      // Commit to IndexedDB database
      if (novelRecord && window.GeminiNovelDB?.updateNovel) {
        try {
          if (Array.isArray(novelRecord.chapters) && novelRecord.chapters[targetIdx]) {
            novelRecord.chapters[targetIdx] = { ...novelRecord.chapters[targetIdx], text: updatedBody, content: updatedBody, isTranslated: true };
          }
          await window.GeminiNovelDB.updateNovel(novelRecord);
        } catch (dbErr) {
          console.warn('[ReaderSelectionTranslator] DB update warning:', dbErr);
        }
      }

      if (typeof onRenderTrigger === 'function') onRenderTrigger();
      return true;
    }, [currentChapter, activeIdx, chapters, safeChapters, onChaptersChange, novelRecord, onRenderTrigger]);

    // Translate selected text
    const handleTranslateSelection = async (e) => {
      e?.stopPropagation?.();
      if (!toolbarState?.text) return;
      const targetText = toolbarState.text;
      setIsTranslating(true);
      setStatusMsg('Translating selection…');

      try {
        const opts = buildTranslationOpts();
        const translateFn = (typeof window !== 'undefined' && window.translateWithRotation)
          ? window.translateWithRotation
          : (typeof window !== 'undefined' && window.TranslationLoopEngine?.safeTranslateWithRotation);

        if (!translateFn) throw new Error('Translation engine not loaded.');
        const result = await translateFn(targetText, opts);
        let transText = (result && typeof result === 'object') ? (result.text || '') : String(result || '');

        // Clean prose
        transText = transText.replace(/```(?:markdown|html)?/gi, '').replace(/```/g, '').trim();
        if (!transText) throw new Error('Received empty translation from AI.');

        await commitUpdatedText(targetText, transText);

        if (typeof window !== 'undefined' && window.toast) {
          window.toast('✨ Selected text translated and updated in book!', 'success');
        }
        window.getSelection()?.removeAllRanges?.();
        setToolbarState(null);
      } catch (err) {
        console.error('[ReaderSelectionTranslator] Translate error:', err);
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(err.message || 'Failed to translate selected text.', 'error');
        }
      } finally {
        setIsTranslating(false);
        setStatusMsg('');
      }
    };

    // Heal whole paragraph
    const handleHealParagraph = async (e) => {
      e?.stopPropagation?.();
      if (!toolbarState?.paragraphText) return;
      const targetParagraph = toolbarState.paragraphText;
      setIsTranslating(true);
      setStatusMsg('Healing paragraph…');

      try {
        const opts = buildTranslationOpts();
        const healInstructions = `Translate accurately and fluently into ${opts.targetLanguage || 'English'}. Maintain formal novel prose style and preserve all quotes, indentation, and formatting. Output ONLY the translated prose, without commentary or markdown code fences.`;

        const translateFn = (typeof window !== 'undefined' && window.translateWithRotation)
          ? window.translateWithRotation
          : (typeof window !== 'undefined' && window.TranslationLoopEngine?.safeTranslateWithRotation);

        if (!translateFn) throw new Error('Translation engine not loaded.');
        const result = await translateFn(targetParagraph, { ...opts, instructions: healInstructions });
        let healedText = (result && typeof result === 'object') ? (result.text || '') : String(result || '');

        healedText = healedText.replace(/```(?:markdown|html)?/gi, '').replace(/```/g, '').trim();
        if (!healedText) throw new Error('Received empty healed text.');

        await commitUpdatedText(targetParagraph, healedText);

        if (typeof window !== 'undefined' && window.toast) {
          window.toast('🩹 Paragraph healed and updated in book!', 'success');
        }
        window.getSelection()?.removeAllRanges?.();
        setToolbarState(null);
      } catch (err) {
        console.error('[ReaderSelectionTranslator] Heal error:', err);
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(err.message || 'Failed to heal paragraph.', 'error');
        }
      } finally {
        setIsTranslating(false);
        setStatusMsg('');
      }
    };

    // Copy selected text
    const handleCopySelection = (e) => {
      e?.stopPropagation?.();
      if (!toolbarState?.text) return;
      try {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(toolbarState.text);
        } else if (typeof window !== 'undefined' && window.copyText) {
          window.copyText(toolbarState.text);
        }
        if (typeof window !== 'undefined' && window.toast) {
          window.toast('Copied to clipboard!', 'info');
        }
      } catch (_) {}
      setToolbarState(null);
    };

    if (!toolbarState && !isTranslating) return null;

    const rect = toolbarState?.rect || { top: 60, left: 20 };

    return h('div', {
      className: 'reader-selection-toolbar-wrap',
      style: {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        zIndex: 10010,
        pointerEvents: 'auto',
        animation: 'toolbarPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
      },
      onClick: (e) => e.stopPropagation()
    },
      h('div', {
        className: 'reader-selection-toolbar',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 30,
          padding: '4px 8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(99, 102, 241, 0.25)',
          color: '#f8fafc',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }
      },
        isTranslating
          ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', color: '#818cf8' } },
              h('div', { className: 'reader-mini-spinner', style: { width: 14, height: 14, border: '2px solid rgba(129, 140, 248, 0.3)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' } }),
              h('span', null, statusMsg)
            )
          : h(React.Fragment, null,
              h('button', {
                type: 'button',
                className: 'reader-sel-btn primary',
                style: {
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                },
                onClick: handleTranslateSelection,
                title: 'Translate selected text with AI and replace in chapter'
              },
                ic('Sparkles', 14),
                h('span', null, 'Translate')
              ),
              h('button', {
                type: 'button',
                className: 'reader-sel-btn',
                style: {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 20,
                  padding: '6px 11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  fontSize: 12
                },
                onClick: handleHealParagraph,
                title: 'Heal all untranslated lines in this paragraph'
              },
                ic('Zap', 13),
                h('span', null, 'Heal Para')
              ),
              h('button', {
                type: 'button',
                className: 'reader-sel-btn icon-only',
                style: {
                  background: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                },
                onClick: handleCopySelection,
                title: 'Copy selection to clipboard'
              }, ic('Copy', 13)),
              h('button', {
                type: 'button',
                className: 'reader-sel-btn close',
                style: {
                  background: 'transparent',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                },
                onClick: () => setToolbarState(null),
                title: 'Dismiss'
              }, ic('X', 13))
            )
      )
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. MULTI-CHAPTER BATCH SELECTOR COMPONENT (FOR SUITE MODAL)
  // ══════════════════════════════════════════════════════════════════════
  function ChapterBatchSelector(props) {
    const {
      chapters = [],
      activeIdx = 0,
      selectedIndices = [],
      onSelectionChange,
      currentArc = ''
    } = props;

    const [filterQuery, setFilterQuery] = useState('');
    const [rangeStart, setRangeStart] = useState(String(activeIdx + 1));
    const [rangeEnd, setRangeEnd] = useState(String(Math.min(chapters.length, activeIdx + 5)));

    const untranslatedIndices = useMemo(() => {
      const arr = [];
      chapters.forEach((ch, idx) => {
        if (!ch?.isTranslated) arr.push(idx);
      });
      return arr;
    }, [chapters]);

    const filteredChapters = useMemo(() => {
      if (!filterQuery.trim()) return chapters.map((ch, idx) => ({ ...ch, originalIdx: idx }));
      const q = filterQuery.toLowerCase().trim();
      return chapters
        .map((ch, idx) => ({ ...ch, originalIdx: idx }))
        .filter(ch => {
          const t = String(ch.title || '').toLowerCase();
          const num = String(ch.originalIdx + 1);
          return t.includes(q) || num === q;
        });
    }, [chapters, filterQuery]);

    // Quick selection helpers
    const handleSelectUntranslated = () => {
      onSelectionChange(untranslatedIndices.length > 0 ? untranslatedIndices : [activeIdx]);
    };

    const handleSelectNextN = (count) => {
      const start = activeIdx;
      const end = Math.min(chapters.length - 1, start + count - 1);
      const nextArr = [];
      for (let i = start; i <= end; i++) nextArr.push(i);
      onSelectionChange(nextArr);
    };

    const handleSelectArc = () => {
      if (!currentArc) return;
      const arcArr = [];
      chapters.forEach((ch, idx) => {
        if (ch?.arc === currentArc) arcArr.push(idx);
      });
      onSelectionChange(arcArr.length > 0 ? arcArr : [activeIdx]);
    };

    const handleApplyRange = () => {
      const s = Math.max(1, parseInt(rangeStart, 10) || 1) - 1;
      const e = Math.min(chapters.length, Math.max(1, parseInt(rangeEnd, 10) || 1)) - 1;
      const min = Math.min(s, e);
      const max = Math.max(s, e);
      const rangeArr = [];
      for (let i = min; i <= max; i++) rangeArr.push(i);
      onSelectionChange(rangeArr);
    };

    const handleToggleChapter = (idx) => {
      if (selectedIndices.includes(idx)) {
        if (selectedIndices.length <= 1) return; // Keep at least 1 selected
        onSelectionChange(selectedIndices.filter(i => i !== idx));
      } else {
        onSelectionChange([...selectedIndices, idx].sort((a, b) => a - b));
      }
    };

    const handleSelectAll = () => {
      onSelectionChange(chapters.map((_, idx) => idx));
    };

    const handleClearSelection = () => {
      onSelectionChange([activeIdx]);
    };

    return h('div', { className: 'chapter-batch-selector-container', style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 } },
      // Quick filter chips row
      h('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          fontSize: 11
        }
      },
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6, fontWeight: 600 },
          onClick: handleSelectUntranslated
        }, `Untranslated (${untranslatedIndices.length})`),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6 },
          onClick: () => handleSelectNextN(5)
        }, '+5 Next'),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6 },
          onClick: () => handleSelectNextN(10)
        }, '+10 Next'),
        currentArc && h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6, color: 'var(--r-accent)' },
          onClick: handleSelectArc
        }, `Current Arc (${currentArc.slice(0, 14)})`),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6 },
          onClick: handleSelectAll
        }, 'All'),
        h('button', {
          type: 'button',
          className: 'mini-btn ghost',
          style: { padding: '4px 8px', borderRadius: 6, color: '#f87171' },
          onClick: handleClearSelection
        }, 'Reset')
      ),

      // Range Selector Inputs
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          color: 'var(--r-muted, #94a3b8)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 10px'
        }
      },
        h('span', null, 'Range: Ch.'),
        h('input', {
          type: 'number',
          min: 1,
          max: chapters.length,
          value: rangeStart,
          onChange: (e) => setRangeStart(e.target.value),
          style: { width: 50, padding: '2px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--r-border)', color: '#fff', textAlign: 'center' }
        }),
        h('span', null, 'to'),
        h('input', {
          type: 'number',
          min: 1,
          max: chapters.length,
          value: rangeEnd,
          onChange: (e) => setRangeEnd(e.target.value),
          style: { width: 50, padding: '2px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--r-border)', color: '#fff', textAlign: 'center' }
        }),
        h('button', {
          type: 'button',
          className: 'mini-btn',
          style: { padding: '3px 10px', fontSize: 11, background: 'var(--r-accent, #6366f1)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 },
          onClick: handleApplyRange
        }, 'Apply Range')
      ),

      // Search & Selected count bar
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
        h('div', { style: { position: 'relative', flex: 1 } },
          h('input', {
            type: 'text',
            placeholder: 'Search chapters by name or number…',
            value: filterQuery,
            onChange: (e) => setFilterQuery(e.target.value),
            style: {
              width: '100%',
              padding: '6px 10px 6px 28px',
              fontSize: 11.5,
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#fff',
              boxSizing: 'border-box'
            }
          }),
          h('div', { style: { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--r-muted)', pointerEvents: 'none' } },
            ic('Search', 12)
          )
        ),
        h('span', {
          style: {
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--r-accent, #818cf8)',
            whiteSpace: 'nowrap',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 12,
            padding: '3px 10px'
          }
        }, `${selectedIndices.length} Selected`)
      ),

      // Scrollable Checklist
      h('div', {
        className: 'chapter-batch-scroll-list',
        style: {
          maxHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 8px'
        }
      },
        filteredChapters.map(ch => {
          const isSelected = selectedIndices.includes(ch.originalIdx);
          const cleanTitle = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
            ? window.cleanRawChapterTitle(ch.title)
            : (ch.title || `Chapter ${ch.originalIdx + 1}`);

          return h('label', {
            key: `ch_sel_${ch.originalIdx}`,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              borderRadius: 6,
              background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              border: isSelected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              cursor: 'pointer',
              userSelect: 'none'
            }
          },
            h('input', {
              type: 'checkbox',
              checked: isSelected,
              onChange: () => handleToggleChapter(ch.originalIdx),
              style: { accentColor: 'var(--r-accent, #6366f1)', cursor: 'pointer' }
            }),
            h('span', {
              style: {
                fontWeight: isSelected ? 700 : 500,
                fontSize: 12,
                color: isSelected ? '#ffffff' : 'var(--r-text, #cbd5e1)',
                minWidth: 46
              }
            }, `Ch. ${ch.originalIdx + 1}`),
            h('span', {
              style: {
                flex: 1,
                fontSize: 11.5,
                color: isSelected ? '#e2e8f0' : 'var(--r-muted, #94a3b8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }
            }, cleanTitle),
            h('span', {
              style: {
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: ch.isTranslated ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.18)',
                color: ch.isTranslated ? '#4ade80' : '#facc15'
              }
            }, ch.isTranslated ? 'Done' : 'Raw')
          );
        })
      )
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. MULTI-CHAPTER BATCH TRANSLATION ORCHESTRATOR
  // ══════════════════════════════════════════════════════════════════════
  const ReaderBatchTranslationOrchestrator = {
    async executeBatch(params) {
      const {
        chapterIndices = [],
        action = 'full',
        optionsOverride = {},
        chapters = [],
        safeChapters = [],
        activeIdx = 0,
        currentChapter = {},
        onTranslateChapter,
        onChaptersChange,
        activeNovelRecord,
        setChapterTranslateProgress,
        setChunkProgress,
        setIsTranslatingCurrentChapter,
        setActiveTranslationMode,
        streamBufferRef,
        isLiveDashboardOpenRef,
        setLiveStreamText,
        translationAbortRef,
        toast = (typeof window !== 'undefined' && window.toast) ? window.toast : console.log
      } = params;

      if (!Array.isArray(chapterIndices) || chapterIndices.length === 0) {
        toast('No chapters selected for translation.', 'warning');
        return;
      }

      if (typeof onTranslateChapter !== 'function') {
        toast('Translation handler not available.', 'error');
        return;
      }

      setIsTranslatingCurrentChapter(true);
      setActiveTranslationMode(action);
      translationAbortRef.current = new AbortController();

      if (typeof window !== 'undefined' && window.NativeBridge) {
        try {
          window.NativeBridge.acquireWakeLock?.(
            `Translating ${chapterIndices.length} Chapters`,
            `Processing batch chapter translation in background.`
          );
        } catch (_) {}
      }

      let completedCount = 0;
      const totalCount = chapterIndices.length;

      try {
        for (let idxIndex = 0; idxIndex < chapterIndices.length; idxIndex++) {
          if (translationAbortRef.current?.signal?.aborted) {
            console.log('[ReaderBatchOrchestrator] Batch aborted early by user.');
            break;
          }

          const targetIdx = chapterIndices[idxIndex];
          const targetChap = (chapters && chapters[targetIdx]) || (safeChapters && safeChapters[targetIdx]) || {};
          const chapTitle = targetChap?.title || `Chapter ${targetIdx + 1}`;

          setChapterTranslateProgress({
            pct: Math.round(((idxIndex) / totalCount) * 100),
            msg: `Ch. ${targetIdx + 1} (${idxIndex + 1}/${totalCount}): ${chapTitle.slice(0, 24)}…`
          });

          // Single chapter execution
          const res = await onTranslateChapter(
            targetIdx,
            targetChap,
            (pct, msg, chunkData) => {
              const chapterShare = (1 / totalCount) * 100;
              const overallPct = Math.round((idxIndex / totalCount) * 100 + ((pct / 100) * chapterShare));
              setChapterTranslateProgress({
                pct: overallPct,
                msg: `[${idxIndex + 1}/${totalCount}] Ch. ${targetIdx + 1}: ${msg || 'Translating…'}`
              });
              if (chunkData && typeof chunkData.current === 'number') {
                setChunkProgress({ current: chunkData.current, total: chunkData.total || 1 });
              }
            },
            action,
            {
              optionsOverride,
              abortController: translationAbortRef.current,
              onStreamChunk: (chunkData) => {
                const token = (typeof chunkData === 'object' && chunkData?.token) ? chunkData.token : String(chunkData || '');
                if (streamBufferRef) streamBufferRef.current += token;
                if (isLiveDashboardOpenRef?.current && setLiveStreamText && streamBufferRef) {
                  setLiveStreamText(streamBufferRef.current);
                }
              }
            }
          );

          if (res && res.content) {
            completedCount++;
            const newTitle = res.title || targetChap.title;
            const newText = res.content;

            if (currentChapter && targetIdx === activeIdx) {
              currentChapter.title = newTitle;
              currentChapter.text = newText;
              currentChapter.content = newText;
              currentChapter.isTranslated = true;
            }

            if (Array.isArray(chapters) && chapters[targetIdx]) {
              chapters[targetIdx] = { ...chapters[targetIdx], title: newTitle, text: newText, content: newText, isTranslated: true };
            }
            if (Array.isArray(safeChapters) && safeChapters[targetIdx]) {
              safeChapters[targetIdx] = { ...safeChapters[targetIdx], title: newTitle, text: newText, content: newText, isTranslated: true };
            }

            // Immediately persist completed chapter to IndexedDB
            if (activeNovelRecord && window.GeminiNovelDB?.updateNovel) {
              try {
                if (Array.isArray(activeNovelRecord.chapters) && activeNovelRecord.chapters[targetIdx]) {
                  activeNovelRecord.chapters[targetIdx] = { ...activeNovelRecord.chapters[targetIdx], title: newTitle, text: newText, content: newText, isTranslated: true };
                  await window.GeminiNovelDB.updateNovel(activeNovelRecord);
                }
              } catch (dbErr) {
                console.warn('[ReaderBatchOrchestrator] Intermediate DB save warning:', dbErr);
              }
            }

            if (typeof onChaptersChange === 'function' && Array.isArray(safeChapters)) {
              onChaptersChange([...safeChapters]);
            }
          }
        }

        if (translationAbortRef.current?.signal?.aborted) {
          toast(`Stopped early. Safely saved ${completedCount} completed chapter(s) to book!`, 'info');
        } else {
          toast(`Successfully translated ${completedCount} chapter(s)!`, 'success');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[ReaderBatchOrchestrator] Error:', err);
          toast(err.message || 'Batch translation encountered an error.', 'error');
        }
      } finally {
        setIsTranslatingCurrentChapter(false);
        setActiveTranslationMode(null);
        translationAbortRef.current = null;
        if (typeof window !== 'undefined' && window.NativeBridge) {
          try {
            window.NativeBridge.releaseWakeLock?.();
            window.NativeBridge.clearProgressNotification?.(false);
          } catch (_) {}
        }
      }
    }
  };

  // Attach to window global
  window.ReaderSelectionTranslator = ReaderSelectionTranslator;
  window.ChapterBatchSelector = ChapterBatchSelector;
  window.ReaderBatchTranslationOrchestrator = ReaderBatchTranslationOrchestrator;

})(typeof window !== 'undefined' ? window : this);
