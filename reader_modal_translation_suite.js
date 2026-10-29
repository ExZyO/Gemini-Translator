/**
 * Gemini Translator - Reader Pro Engine UI Modals & Sheets
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) {
    Object.assign(root, exports);
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : (window.React ? window.React.createElement : null);
  const useState = (typeof React !== 'undefined' && React.useState) ? React.useState : (window.React ? window.React.useState : null);
  const useCallback = (typeof React !== 'undefined' && React.useCallback) ? React.useCallback : (window.React ? window.React.useCallback : null);
  const useRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef : (window.React ? window.React.useRef : null);
  const useMemo = (typeof React !== 'undefined' && React.useMemo) ? React.useMemo : (window.React ? window.React.useMemo : null);
  const useEffect = (typeof React !== 'undefined' && React.useEffect) ? React.useEffect : (window.React ? window.React.useEffect : null);
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  function ChapterTranslationSuiteModal(props) {
    const {
      isOpen,
      onClose,
      chapter,
      chapters = [],
      novelRecord,
      appSettings = {},
      onExecute
    } = props;

    if (!isOpen || !chapter) return null;

    const nSettings = novelRecord?.translationSettings;
    const defaultScope = (nSettings && Object.keys(nSettings).length > 0) ? 'novel' : 'app';
    const [scope, setScope] = useState(defaultScope);
    const [action, setAction] = useState('full');
    const [batchMode, setBatchMode] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState(() => [typeof chapter.idx === 'number' ? chapter.idx : 0]);

    const resolve = (key, fallback, storageKey) => {
      if (typeof window !== 'undefined' && window.resolveSetting) {
        return window.resolveSetting(nSettings, key, (typeof localStorage !== 'undefined' && storageKey) ? localStorage.getItem(storageKey) : fallback);
      }
      return nSettings?.[key] ?? appSettings[key] ?? (typeof localStorage !== 'undefined' && storageKey ? localStorage.getItem(storageKey) : null) ?? fallback;
    };

    const [provider, setProvider] = useState(() => resolve('provider', appSettings.provider || 'gemini', 'gemini_provider'));
    const [geminiModel, setGeminiModel] = useState(() => resolve('geminiModel', appSettings.geminiModel || 'gemini-3.8-flash', 'gemini_model'));
    const [deepseekModel, setDeepseekModel] = useState(() => resolve('deepseekModel', appSettings.deepseekModel || 'deepseek-chat', 'gemini_deepseek_model'));
    const [useCustomModel, setUseCustomModel] = useState(() => Boolean(resolve('useCustomModel', appSettings.useCustomModel || false)));
    const [customModel, setCustomModel] = useState(() => resolve('customModel', appSettings.customModel || ''));
    const [tgtLang, setTgtLang] = useState(() => resolve('tgtLang', appSettings.tgtLang || 'English', 'gemini_tgt_lang'));
    const [concurrency, setConcurrency] = useState(() => parseInt(resolve('concurrency', appSettings.concurrency || 3, 'gemini_concurrency'), 10) || 3);
    const [chunkSizePreset, setChunkSizePreset] = useState(() => {
      const v = resolve('chunkSizePreset', appSettings.chunkSizePreset || 'turbo', 'gemini_chunk_size');
      if (v === 'generous') return 'turbo';
      if (v === 'standard') return 'medium';
      if (v === 'compact') return 'small';
      return v || 'turbo';
    });
    const [enableStreaming, setEnableStreaming] = useState(() => {
      const v = resolve('enableStreaming', appSettings.enableStreaming ?? true, 'gemini_enable_streaming');
      return v === true || v === 'true';
    });
    const [enableThinking, setEnableThinking] = useState(() => {
      const v = resolve('enableThinking', appSettings.enableThinking ?? false, 'gemini_enable_thinking');
      return v === true || v === 'true';
    });
    const [strictModel, setStrictModel] = useState(() => {
      const v = resolve('strictModel', appSettings.strictModel ?? false, 'gemini_strict_model');
      return v === true || v === 'true';
    });
    const [customInstructions, setCustomInstructions] = useState(() => resolve('customInstructions', appSettings.customInstructions || ''));
    const [terminology, setTerminology] = useState(() => resolve('terminology', appSettings.terminology || ''));
    const [selectedGlossaryId, setSelectedGlossaryId] = useState(() => resolve('glossaryId', appSettings.activeGlossaryId || 'default'));
    const [showAdvanced, setShowAdvanced] = useState(false);

    const isMachineTranslation = provider === 'deepl' || provider === 'libretranslate';
    const availableProviders = Array.from(new Set(['gemini', 'deepseek', provider].filter(Boolean)));

    const targetLanguages = (typeof window !== 'undefined' && window.TARGET_LANGUAGES) || [
      'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Korean', 'Vietnamese', 'Thai', 'Indonesian', 'Arabic'
    ];
    const geminiModels = (typeof window !== 'undefined' && window.DEFAULT_GEMINI_MODELS) || [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Fast & Literary)' },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' }
    ];
    const deepseekModels = (typeof window !== 'undefined' && window.DEFAULT_DEEPSEEK_MODELS) || [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1 Thinking)' }
    ];

    const cleanTitle = (typeof window !== 'undefined' && window.cleanRawChapterTitle)
      ? window.cleanRawChapterTitle(chapter.title)
      : (chapter.title || `Chapter ${chapter.idx + 1}`);

    const handleExecuteAction = (chosenAction) => {
      const act = chosenAction || action;
      const optionsOverride = {
        provider,
        geminiModel,
        deepseekModel,
        customModel: useCustomModel ? customModel.trim() : '',
        useCustomModel,
        tgtLang,
        concurrency: Number(concurrency) || 3,
        chunkSizePreset,
        enableStreaming: Boolean(enableStreaming),
        enableThinking: Boolean(enableThinking),
        strictModel: Boolean(strictModel),
        customInstructions,
        terminology,
        glossaryId: selectedGlossaryId
      };

      if (scope === 'app' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('gemini_provider', provider);
          localStorage.setItem('gemini_model', geminiModel);
          localStorage.setItem('gemini_deepseek_model', deepseekModel);
          localStorage.setItem('gemini_tgt_lang', tgtLang);
          localStorage.setItem('gemini_concurrency', String(concurrency));
          localStorage.setItem('gemini_chunk_size', chunkSizePreset);
          localStorage.setItem('gemini_enable_streaming', enableStreaming ? 'true' : 'false');
          localStorage.setItem('gemini_enable_thinking', enableThinking ? 'true' : 'false');
          localStorage.setItem('gemini_strict_model', strictModel ? 'true' : 'false');
        } catch (e) {}
      } else if (scope === 'novel' && novelRecord) {
        novelRecord.translationSettings = { ...optionsOverride };
        if (typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
          window.GeminiNovelDB.updateNovel(novelRecord).catch(() => {});
        }
      }

      if (typeof onExecute === 'function') {
        onExecute(act, optionsOverride, scope, chapter, selectedIndices);
      }
      onClose();
    };

    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 12px'
      },
      onClick: onClose
    },
      h('div', {
        style: {
          width: '100%',
          maxWidth: 540,
          maxHeight: '92vh',
          background: 'var(--r-card, #1e293b)',
          border: '1px solid var(--r-border, rgba(255,255,255,0.12))',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--r-text, #f8fafc)'
        },
        onClick: (e) => e.stopPropagation()
      },
        // Modal Header
        h('div', {
          style: {
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } },
            h('div', {
              style: {
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--r-accent, #818cf8)',
                flexShrink: 0
              }
            }, ic('Sparkles', 18)),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontWeight: 700, fontSize: 14.5 } }, `Translate Chapter ${chapter.idx + 1}`),
              h('div', {
                style: {
                  fontSize: 11.5,
                  color: 'var(--r-muted, #94a3b8)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }, cleanTitle)
            )
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '4px 8px', borderRadius: 6, color: '#94a3b8', fontSize: 18, border: 'none' },
            onClick: onClose
          }, '✕')
        ),

        // Scrollable Body
        h('div', {
          style: {
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }
        },
          // 1. Persistence Scope Selector
          h('div', {
            style: {
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)'
            }
          },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Save Settings Scope'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 } },
              [
                { id: 'app', label: 'App Defaults', hint: 'Sync with app' },
                { id: 'novel', label: 'This Novel', hint: 'Book-specific' },
                { id: 'chapter', label: 'This Run Only', hint: 'Temporary' }
              ].map(item => {
                const isSel = scope === item.id;
                return h('button', {
                  key: item.id,
                  type: 'button',
                  className: 'mini-btn' + (isSel ? ' active' : ' ghost'),
                  style: {
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: '1px solid ' + (isSel ? 'var(--r-accent, #6366f1)' : 'rgba(255,255,255,0.1)'),
                    background: isSel ? 'var(--r-accent, #6366f1)' : 'rgba(255,255,254,0.04)',
                    color: isSel ? '#fff' : 'var(--r-text)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer'
                  },
                  onClick: () => setScope(item.id)
                },
                  h('span', { style: { fontWeight: 700, fontSize: 11.5 } }, item.label),
                  h('span', { style: { fontSize: 9.5, opacity: 0.8 } }, item.hint)
                );
              })
            )
          ),

          // 1b. Target Chapters (Single vs Multi-Chapter Selection)
          h('div', {
            style: {
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)'
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' } },
                selectedIndices.length > 1 ? `Target Chapters (${selectedIndices.length} Selected)` : `Target: Chapter ${chapter.idx + 1}`
              ),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 11, padding: '3px 8px', color: 'var(--r-accent, #818cf8)', fontWeight: 600, border: 'none' },
                onClick: () => setBatchMode(b => !b)
              }, batchMode ? 'Hide Chapter Picker' : (selectedIndices.length > 1 ? `Change (${selectedIndices.length})` : 'Select Specific Chapters…'))
            ),
            batchMode && (typeof window !== 'undefined' && window.ChapterBatchSelector) && h(window.ChapterBatchSelector, {
              chapters,
              activeIdx: typeof chapter.idx === 'number' ? chapter.idx : 0,
              selectedIndices,
              onSelectionChange: setSelectedIndices,
              currentArc: chapter.arc || ''
            })
          ),

          // 2. Quick Action Buttons
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' } },
              selectedIndices.length > 1 ? `Execute on ${selectedIndices.length} Selected Chapters` : 'Quick Execution Actions'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'var(--r-accent, #6366f1)',
                  color: '#fff',
                  padding: '11px 12px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                },
                onClick: () => handleExecuteAction('full')
              },
                ic('Sparkles', 14),
                selectedIndices.length > 1 ? `Translate ${selectedIndices.length} Chapters` : 'Translate Full Chapter'
              ),

              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'rgba(168, 85, 247, 0.16)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  padding: '11px 12px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                },
                onClick: () => handleExecuteAction('heal')
              },
                ic('Sparkles', 14),
                selectedIndices.length > 1 ? `Heal ${selectedIndices.length} Chapters` : 'Heal Untranslated Lines'
              )
            ),

            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: {
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--r-text)',
                padding: '9px 12px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              },
              onClick: () => handleExecuteAction('title')
            },
              ic('Sparkles', 12),
              selectedIndices.length > 1 ? `Translate ${selectedIndices.length} Titles Only` : 'Translate Title Only'
            )
          ),

          // 3. Core Translation Settings (Target Language, Provider, Model)
          h('div', {
            style: {
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 10,
              padding: '14px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }
          },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Translation Configuration'),

            // Target Language
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              h('label', { style: { fontSize: 12, fontWeight: 600, color: 'var(--r-text)' } }, 'Target Language'),
              h('select', {
                value: tgtLang,
                style: {
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'inherit',
                  fontSize: 12.5,
                  outline: 'none'
                },
                onChange: (e) => setTgtLang(e.target.value)
              },
                targetLanguages.map(l => h('option', { key: l, value: l, style: { background: '#1e293b', color: '#fff' } }, l))
              )
            ),

            // Provider & Model Row
            h('div', { style: { display: 'grid', gridTemplateColumns: isMachineTranslation ? '1fr' : '1fr 1fr', gap: 10 } },
              // Provider Selector
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 12, fontWeight: 600, color: 'var(--r-text)' } }, 'AI Provider'),
                h('div', { style: { display: 'flex', gap: 4 } },
                  availableProviders.map(p => {
                    const isSel = provider === p;
                    return h('button', {
                      key: p,
                      type: 'button',
                      className: 'mini-btn' + (isSel ? ' active' : ' ghost'),
                      style: {
                        flex: 1,
                        padding: '8px 0',
                        fontSize: 11.5,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid ' + (isSel ? 'var(--r-accent, #6366f1)' : 'rgba(255,255,255,0.1)'),
                        background: isSel ? 'var(--r-accent, #6366f1)' : 'rgba(255,255,255,0.04)',
                        color: isSel ? '#fff' : 'var(--r-text)',
                        textTransform: 'capitalize'
                      },
                      onClick: () => setProvider(p)
                    }, p);
                  })
                )
              ),

              // Model Selector or Neural MT badge
              isMachineTranslation ? (
                h('div', {
                  style: {
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd',
                    fontSize: 11.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }
                }, ic('Sparkles', 14), 'Direct Neural Translation Engine')
              ) : (
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                  h('label', { style: { fontSize: 12, fontWeight: 600, color: 'var(--r-text)' } }, 'AI Model'),
                  useCustomModel ? (
                    h('input', {
                      type: 'text',
                      placeholder: 'Custom model ID',
                      value: customModel,
                      style: {
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'inherit',
                        fontSize: 12,
                        outline: 'none'
                      },
                      onChange: (e) => setCustomModel(e.target.value)
                    })
                  ) : (
                    h('select', {
                      value: provider === 'deepseek' ? deepseekModel : geminiModel,
                      style: {
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'inherit',
                        fontSize: 12,
                        outline: 'none'
                      },
                      onChange: (e) => {
                        if (provider === 'deepseek') setDeepseekModel(e.target.value);
                        else setGeminiModel(e.target.value);
                      }
                    },
                      (provider === 'deepseek' ? deepseekModels : geminiModels).map(m => (
                        h('option', { key: m.id, value: m.id, style: { background: '#1e293b', color: '#fff' } }, m.name)
                      ))
                    )
                  )
                )
              )
            ),

            // Custom Model Toggle (LLM only)
            !isMachineTranslation && h('label', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                color: 'var(--r-muted)',
                cursor: 'pointer',
                userSelect: 'none'
              }
            },
              h('input', {
                type: 'checkbox',
                checked: useCustomModel,
                onChange: (e) => setUseCustomModel(e.target.checked)
              }),
              'Use Custom Model Identifier'
            )
          ),

          // 4. Advanced Settings Accordion Toggle
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--r-accent)'
            },
            onClick: () => setShowAdvanced(!showAdvanced)
          },
            h('span', null, `${showAdvanced ? '▾' : '▸'} Advanced Translation Controls (Speed, Prompts, Glossaries)`),
            h('span', { style: { fontSize: 10.5, color: 'var(--r-muted)' } }, showAdvanced ? 'Collapse' : 'Expand')
          ),

          // 5. Advanced Settings Drawer Content
          showAdvanced && (
            isMachineTranslation ? (
              h('div', {
                style: {
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#93c5fd',
                  fontSize: 11.5,
                  lineHeight: 1.5
                }
              }, 'Neural machine translation translates directly via API. Deep reasoning models, real-time token streaming, and custom prompt overrides are bypassed.')
            ) : h('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)'
              }
            },
            // Concurrency & Chunk Size Row
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--r-text)' } }, `Concurrency (${concurrency}x parallel)`),
                h('select', {
                  value: concurrency,
                  style: {
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'inherit',
                    fontSize: 12
                  },
                  onChange: (e) => setConcurrency(parseInt(e.target.value, 10))
                },
                  [1, 2, 3, 4, 5].map(n => h('option', { key: n, value: n, style: { background: '#1e293b', color: '#fff' } }, `${n} parallel stream${n > 1 ? 's' : ''}`))
                )
              ),

              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--r-text)' } }, 'Chunk Size Preset'),
                h('select', {
                  value: chunkSizePreset,
                  style: {
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'inherit',
                    fontSize: 12
                  },
                  onChange: (e) => setChunkSizePreset(e.target.value)
                },
                  h('option', { value: 'turbo', style: { background: '#1e293b', color: '#fff' } }, 'Turbo (Max words/req ~4,500 chars)'),
                  h('option', { value: 'large', style: { background: '#1e293b', color: '#fff' } }, 'Large (~3,800 chars)'),
                  h('option', { value: 'medium', style: { background: '#1e293b', color: '#fff' } }, 'Medium (~2,800 chars)'),
                  h('option', { value: 'small', style: { background: '#1e293b', color: '#fff' } }, 'Small (~1,800 chars)')
                )
              )
            ),

            // Toggles: Streaming, Thinking, Strict Model
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 } },
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--r-text)', cursor: 'pointer' } },
                h('input', { type: 'checkbox', checked: enableStreaming, onChange: (e) => setEnableStreaming(e.target.checked) }),
                'Enable Real-Time Prose Streaming'
              ),
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--r-text)', cursor: 'pointer' } },
                h('input', { type: 'checkbox', checked: enableThinking, onChange: (e) => setEnableThinking(e.target.checked) }),
                'Enable Deep Thinking / AI Reasoning'
              ),
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--r-text)', cursor: 'pointer' } },
                h('input', { type: 'checkbox', checked: strictModel, onChange: (e) => setStrictModel(e.target.checked) }),
                'Strict Model (Do not auto-fallback on error)'
              )
            ),

            // Custom Instructions & Quick Style Presets
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--r-text)' } }, 'Custom Translation Instructions'),
                h('div', { style: { display: 'flex', gap: 4 } },
                  [
                    { label: 'Literary', text: 'Translate in an immersive literary style with rich prose and natural flow.' },
                    { label: 'Dialogue', text: 'Prioritize punchy, natural character dialogue and distinct vocal tone.' },
                    { label: 'Action', text: 'Translate fast-paced combat and martial arts scenes with dynamic impact.' }
                  ].map(p => h('button', {
                    key: p.label,
                    type: 'button',
                    className: 'mini-btn ghost',
                    style: { fontSize: 9.5, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' },
                    onClick: () => setCustomInstructions(prev => prev ? `${prev}\n${p.text}` : p.text)
                  }, `+ ${p.label}`))
                )
              ),
              h('textarea', {
                rows: 2,
                placeholder: 'e.g. Preserve honorifics (-san, -sama), maintain atmospheric prose...',
                value: customInstructions,
                style: {
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'inherit',
                  fontSize: 11.5,
                  outline: 'none',
                  resize: 'vertical'
                },
                onChange: (e) => setCustomInstructions(e.target.value)
              })
            ),

            // Glossary Terms
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--r-text)' } }, 'Glossary Terms & Names'),
              h('textarea', {
                rows: 2,
                placeholder: 'Original = Translation (one per line)',
                value: terminology,
                style: {
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'inherit',
                  fontSize: 11.5,
                  outline: 'none',
                  resize: 'vertical'
                },
                onChange: (e) => setTerminology(e.target.value)
              })
            )
          ))
        ),

        // Modal Footer
        h('div', {
          style: {
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10
          }
        },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12.5 },
            onClick: onClose
          }, 'Cancel'),

          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              padding: '8px 20px',
              borderRadius: 8,
              background: 'var(--r-accent, #6366f1)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12.5
            },
            onClick: () => handleExecuteAction(action)
          }, 'Start Translation')
        )
      )
    );
  }

  // ── 9. DYNAMIC FLOATING PROGRESS PILL ──

  return { ChapterTranslationSuiteModal };
}));
