/**
 * Site Recipe Editor and Settings Management UI (Zero-Build UMD React)
 * Features visual tap-to-pick inspector, rule testing, and backup integration
 */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['react'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('react'));
    } else {
        const exports = factory(root.React);
        root.SiteRecipeEditor = exports.SiteRecipeEditor;
        root.SiteRecipeManagerCard = exports.SiteRecipeManagerCard;
        root.SitePickerOverlay = exports.SitePickerOverlay;
    }
}(typeof self !== 'undefined' ? self : this, function (React) {
    'use strict';
    const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : window.React?.createElement;
    const { useState, useEffect, useRef } = React || window.React;

    // Helper: Lucide icon or fallback
    function renderIcon(name, size = 16, className = '') {
        if (typeof window !== 'undefined' && window.ic) {
            const iconObj = window[name] || window.LucideIcons?.[name];
            if (iconObj) return window.ic(iconObj, size, className);
        }
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 1. VISUAL PICKER OVERLAY (Sandboxed Iframe)
    // ══════════════════════════════════════════════════════════════════════
    function SitePickerOverlay({ open, url, target, initialSelector, onClose, onSelect, toast }) {
        if (!open) return null;

        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [previewHtml, setPreviewHtml] = useState('');
        const [selection, setSelection] = useState(null);
        const iframeRef = useRef(null);
        const pickerHandleRef = useRef(null);

        const targetLabels = {
            content: 'Tap the main story text',
            chapterTitle: 'Tap the chapter title',
            remove: 'Tap elements you want removed (toggles red)',
            bookTitle: 'Tap the book title',
            author: 'Tap the author name',
            cover: 'Tap the book cover image',
            summary: 'Tap the synopsis / summary text',
            chapterLinks: 'Tap one chapter link in the list',
            tocNextPage: 'Tap the "Next page" button in chapter list',
            nextLink: 'Tap the "Next chapter" button'
        };

        const loadPreview = async () => {
            if (!url) {
                setError('No URL provided to preview.');
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const fetchFn = window.WebNovelImporter?.fetchHtml;
                if (!fetchFn) throw new Error('WebNovelImporter.fetchHtml is not available.');
                const rawHtml = await fetchFn(url, { context: 'SitePickerPreview' });
                const built = window.SitePicker?.buildPreviewDoc?.(rawHtml, url) || rawHtml;
                setPreviewHtml(built);
            } catch (err) {
                console.error('[SitePicker] Preview load error:', err);
                setError(err.message || 'Failed to load page for picking.');
            } finally {
                setLoading(false);
            }
        };

        useEffect(() => {
            loadPreview();
            return () => {
                pickerHandleRef.current?.detach?.();
            };
        }, [url]);

        const onIframeLoad = () => {
            if (!iframeRef.current || !window.SitePicker) return;
            try {
                pickerHandleRef.current = window.SitePicker.attach(iframeRef.current, {
                    target,
                    initialSelector,
                    onChange: (selData) => {
                        setSelection(selData);
                    }
                });
            } catch (e) {
                console.warn('[SitePicker] Failed to attach picker to iframe:', e);
            }
        };

        const handleUseSelection = () => {
            if (!selection) {
                toast?.('Please tap an element on the page first.', 'warning');
                return;
            }
            onSelect?.(selection);
            onClose?.();
        };

        return h('div', {
            className: 'fixed inset-0 z-[10060] bg-black/80 flex flex-col backdrop-blur-sm animate-fade-in'
        }, [
            // Top Bar
            h('div', {
                key: 'topbar',
                className: 'h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0 shadow-lg'
            }, [
                h('div', { className: 'flex items-center gap-2 truncate' }, [
                    h('span', { className: 'text-amber-400 font-bold text-sm tracking-wide uppercase' }, '👆 Visual Inspector'),
                    h('span', { className: 'text-slate-400 text-xs truncate' }, targetLabels[target] || 'Tap an element on the page')
                ]),
                h('div', { className: 'flex items-center gap-2' }, [
                    h('button', {
                        className: 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors',
                        onClick: onClose
                    }, 'Cancel'),
                    h('button', {
                        className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm',
                        onClick: handleUseSelection
                    }, '✓ Use This')
                ])
            ]),

            // Middle: Iframe / Loading / Error
            h('div', {
                key: 'body',
                className: 'flex-1 relative bg-slate-950 overflow-hidden'
            }, [
                loading && h('div', {
                    key: 'loading',
                    className: 'absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-white z-10'
                }, [
                    h('div', { className: 'w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin' }),
                    h('p', { className: 'text-sm text-slate-300' }, 'Loading page preview...')
                ]),

                error && h('div', {
                    key: 'error',
                    className: 'absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10'
                }, [
                    h('div', { className: 'max-w-md p-6 rounded-2xl bg-slate-900 border border-red-500/30 text-white space-y-3' }, [
                        h('p', { className: 'text-red-400 font-semibold' }, '⚠️ Could not load page'),
                        h('p', { className: 'text-xs text-slate-300' }, error),
                        h('button', {
                            className: 'px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors',
                            onClick: loadPreview
                        }, '🔄 Try Again')
                    ])
                ]),

                h('iframe', {
                    key: 'iframe',
                    ref: iframeRef,
                    srcDoc: previewHtml,
                    sandbox: 'allow-same-origin',
                    className: 'w-full h-full border-none bg-white',
                    onLoad: onIframeLoad
                })
            ]),

            // Bottom Bar (Action Toolbar)
            selection && h('div', {
                key: 'bottombar',
                className: 'h-14 px-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-white shrink-0'
            }, [
                h('div', { className: 'flex items-center gap-2 truncate text-xs text-slate-300' }, [
                    selection.words ? `Selected: ~${selection.words.toLocaleString()} words` : null,
                    selection.count ? `Matches: ${selection.count}` : null,
                    selection.first ? `First: "${selection.first.slice(0, 25)}..."` : null,
                    selection.selectors ? `${selection.selectors.length} element(s) marked for removal` : null
                ].filter(Boolean).join(' • ')),
                h('div', { className: 'flex items-center gap-2' }, [
                    h('button', {
                        className: 'px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700',
                        onClick: () => pickerHandleRef.current?.bigger?.()
                    }, '⬆ Expand (Bigger)'),
                    h('button', {
                        className: 'px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700',
                        onClick: () => pickerHandleRef.current?.smaller?.()
                    }, '⬇ Narrow (Smaller)')
                ])
            ])
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. SITE RECIPE EDITOR MODAL SHEET
    // ══════════════════════════════════════════════════════════════════════
    function SiteRecipeEditor({ open, url, recipeId, onClose, toast, confirmAction }) {
        if (!open) return null;

        const RE = window.SiteRecipeEngine;
        const [recipe, setRecipe] = useState(null);
        const [isDirty, setIsDirty] = useState(false);
        const [activePicker, setActivePicker] = useState(null); // { target, url, initialSelector }
        const [showAdvanced, setShowAdvanced] = useState(() => {
            try { return localStorage.getItem('siteRecipeAdvanced') === 'true'; } catch(e) { return false; }
        });
        const [testResult, setTestResult] = useState(null);
        const [isTesting, setIsTesting] = useState(false);

        useEffect(() => {
            if (!RE) return;
            let loaded = null;
            if (recipeId) {
                loaded = RE.get(recipeId);
            }
            if (!loaded && url) {
                loaded = RE.findForUrl(url);
                if (!loaded) loaded = RE.createBlank(url);
            }
            if (!loaded) loaded = RE.createBlank('example.com');
            setRecipe(loaded);
            setIsDirty(false);
            setTestResult(null);
        }, [recipeId, url]);

        if (!recipe || !RE) return null;

        const isBuiltin = RE.isBuiltInSite(recipe.id);

        const updateField = (path, value) => {
            setRecipe(prev => {
                const next = JSON.parse(JSON.stringify(prev));
                const parts = path.split('.');
                let curr = next;
                for (let i = 0; i < parts.length - 1; i++) {
                    curr = curr[parts[i]];
                }
                curr[parts[parts.length - 1]] = value;
                return RE.withDefaults(next);
            });
            setIsDirty(true);
        };

        const handleSave = async () => {
            try {
                await RE.save(recipe);
                setIsDirty(false);
                toast?.(`Recipe for "${recipe.id}" saved successfully!`, 'success');
                onClose?.();
            } catch (err) {
                toast?.(`Failed to save recipe: ${err.message}`, 'error');
            }
        };

        const pasteToField = async (field) => {
            try {
                let text = '';
                if (window.NativeBridge && typeof window.NativeBridge.getClipboardText === 'function') {
                    text = await window.NativeBridge.getClipboardText();
                } else if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
                    try { text = await navigator.clipboard.readText(); } catch (e) {}
                }
                if (text && typeof text === 'string') {
                    text = text.trim();
                    if (text) {
                        updateField(field, text);
                        toast?.('Pasted link! 📋', 'success');
                        return;
                    }
                }
                toast?.('Clipboard is empty. Copy a link first!', 'warning');
            } catch (err) {
                toast?.('Could not read clipboard: ' + err.message, 'error');
            }
        };

        const handleImportRecipeFile = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    if (parsed && typeof parsed === 'object') {
                        const standardized = RE.withDefaults(parsed);
                        setRecipe(standardized);
                        setIsDirty(true);
                        toast?.(`Imported recipe for "${standardized.name || standardized.id}"!`, 'success');
                    } else {
                        toast?.('Invalid recipe JSON file format.', 'error');
                    }
                } catch (err) {
                    toast?.('Failed to parse JSON file: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        };

        const handlePasteRecipeCode = async () => {
            try {
                let code = '';
                if (window.NativeBridge && typeof window.NativeBridge.getClipboardText === 'function') {
                    code = await window.NativeBridge.getClipboardText();
                } else if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
                    try { code = await navigator.clipboard.readText(); } catch (e) {}
                }
                if (!code || typeof code !== 'string') {
                    toast?.('Clipboard is empty. Copy a recipe code or JSON first!', 'warning');
                    return;
                }
                code = code.trim();
                if (!code) {
                    toast?.('Clipboard is empty. Copy a recipe code or JSON first!', 'warning');
                    return;
                }

                let imported = null;
                if (code.startsWith('{')) {
                    imported = JSON.parse(code);
                } else if (RE.decodeShareCode) {
                    imported = RE.decodeShareCode(code);
                }
                if (imported) {
                    const standardized = RE.withDefaults(imported);
                    setRecipe(standardized);
                    setIsDirty(true);
                    toast?.(`Loaded recipe for "${standardized.name || standardized.id}"!`, 'success');
                } else {
                    toast?.('Could not recognize recipe format.', 'error');
                }
            } catch (err) {
                toast?.('Could not import recipe code: ' + err.message, 'error');
            }
        };

        const handleClosePrompt = () => {
            if (isDirty) {
                confirmAction?.({
                    title: 'Discard Unsaved Changes?',
                    message: 'You have unsaved adjustments to this recipe. Discard and leave?',
                    confirmLabel: 'Discard',
                    cancelLabel: 'Keep Editing',
                    isDangerous: true,
                    onConfirm: () => onClose?.()
                });
            } else {
                onClose?.();
            }
        };

        const toggleAdvanced = (val) => {
            setShowAdvanced(val);
            try { localStorage.setItem('siteRecipeAdvanced', String(val)); } catch(e) {}
        };

        const handleRunTest = async () => {
            setIsTesting(true);
            setTestResult(null);
            try {
                const res = await RE.testRecipe(recipe);
                setTestResult(res);
                if (res.warnings?.length > 0) {
                    toast?.(`Test completed with ${res.warnings.length} warning(s).`, 'warning');
                } else {
                    toast?.('Test completed cleanly! Book & chapter extracted.', 'success');
                }
            } catch (e) {
                toast?.(`Test failed: ${e.message}`, 'error');
                setTestResult({ error: e.message });
            } finally {
                setIsTesting(false);
            }
        };

        const openPicker = (target, targetUrl, initialSelector) => {
            const pickUrl = targetUrl || recipe.chapterUrl || recipe.bookUrl || url;
            if (!pickUrl) {
                toast?.('Please enter a test URL in the card above before picking.', 'warning');
                return;
            }
            setActivePicker({ target, url: pickUrl, initialSelector });
        };

        return h('div', {
            className: 'fixed inset-0 z-[10050] bg-slate-950 text-slate-100 flex flex-col overflow-hidden animate-fade-in'
        }, [
            // Header bar
            h('div', {
                key: 'header',
                className: 'h-16 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md'
            }, [
                h('div', { className: 'flex items-center gap-3 truncate' }, [
                    h('button', {
                        className: 'p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors',
                        onClick: handleClosePrompt
                    }, '← Back'),
                    h('div', { className: 'truncate' }, [
                        h('h2', { className: 'text-base font-bold text-white truncate' }, 'Site Settings & Recipe'),
                        h('p', { className: 'text-xs text-slate-400 font-mono truncate' }, recipe.id)
                    ])
                ]),
                h('div', { className: 'flex items-center gap-3' }, [
                    h('label', { className: 'flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer' }, [
                        h('input', {
                            type: 'checkbox',
                            checked: recipe.enabled !== false,
                            onChange: (e) => updateField('enabled', e.target.checked),
                            className: 'rounded accent-emerald-500 w-4 h-4'
                        }),
                        'Enabled'
                    ]),
                    h('button', {
                        className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors',
                        onClick: handleSave
                    }, '💾 Save')
                ])
            ]),

            // Scrollable Content Body
            h('div', {
                key: 'body',
                className: 'flex-1 overflow-y-auto p-4 md:p-6 pb-36 md:pb-28 overscroll-contain space-y-5 max-w-4xl mx-auto w-full'
            }, [
                // Status Banner
                h('div', {
                    key: 'banner',
                    className: `p-3.5 rounded-2xl border text-xs leading-relaxed ${isBuiltin ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' : 'bg-blue-950/40 border-blue-500/30 text-blue-200'}`
                }, isBuiltin
                    ? '⚡ This website is officially supported. Any selector you customize here overrides just that specific element. Blank fields retain standard built-in behaviour.'
                    : '🌐 This website is custom or unsupported. Use the visual inspector below to configure chapter links, story text, and layout cleanup.'
                ),

                // Controls toolbar (Advanced patterns toggle)
                h('div', {
                    key: 'toolbar',
                    className: 'flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs'
                }, [
                    h('span', { className: 'text-slate-300 font-medium' }, 'Advanced CSS Selectors'),
                    h('label', { className: 'flex items-center gap-2 cursor-pointer text-slate-400' }, [
                        h('input', {
                            type: 'checkbox',
                            checked: showAdvanced,
                            onChange: (e) => toggleAdvanced(e.target.checked),
                            className: 'rounded accent-indigo-500 w-4 h-4'
                        }),
                        'Show selector text fields'
                    ])
                ]),

                // Card: Test Pages
                h('div', {
                    key: 'card-urls',
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'
                }, [
                    h('h3', { className: 'text-sm font-semibold text-white flex items-center gap-2' }, '🔗 Test Pages'),
                    h('div', { className: 'space-y-2 text-xs' }, [
                        h('label', { className: 'text-slate-400 block' }, 'Book Overview / Table of Contents URL'),
                        h('div', { className: 'flex gap-2' }, [
                            h('input', {
                                type: 'url',
                                inputMode: 'url',
                                autoCapitalize: 'none',
                                autoCorrect: 'off',
                                spellCheck: false,
                                style: { userSelect: 'text', WebkitUserSelect: 'text', WebkitTouchCallout: 'default' },
                                className: 'flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 outline-none select-text cursor-text',
                                placeholder: 'https://example.com/novel/title',
                                value: recipe.bookUrl || '',
                                onChange: (e) => updateField('bookUrl', e.target.value)
                            }),
                            h('button', {
                                type: 'button',
                                className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0 flex items-center gap-1 transition-colors',
                                onClick: () => pasteToField('bookUrl'),
                                title: 'Paste URL from clipboard'
                            }, '📋 Paste'),
                            h('button', {
                                type: 'button',
                                className: 'px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shrink-0 transition-colors',
                                onClick: () => openPicker('chapterLinks', recipe.bookUrl)
                            }, '👆 Inspect TOC')
                        ]),

                        h('label', { className: 'text-slate-400 block pt-1' }, 'Sample Chapter URL'),
                        h('div', { className: 'flex gap-2' }, [
                            h('input', {
                                type: 'url',
                                inputMode: 'url',
                                autoCapitalize: 'none',
                                autoCorrect: 'off',
                                spellCheck: false,
                                style: { userSelect: 'text', WebkitUserSelect: 'text', WebkitTouchCallout: 'default' },
                                className: 'flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 outline-none select-text cursor-text',
                                placeholder: 'https://example.com/novel/title/chapter-1',
                                value: recipe.chapterUrl || '',
                                onChange: (e) => updateField('chapterUrl', e.target.value)
                            }),
                            h('button', {
                                type: 'button',
                                className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium shrink-0 flex items-center gap-1 transition-colors',
                                onClick: () => pasteToField('chapterUrl'),
                                title: 'Paste URL from clipboard'
                            }, '📋 Paste'),
                            h('button', {
                                type: 'button',
                                className: 'px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shrink-0 transition-colors',
                                onClick: () => openPicker('content', recipe.chapterUrl)
                            }, '👆 Inspect Chapter')
                        ]),

                        (recipe.bookUrl || recipe.chapterUrl) && h('div', { className: 'pt-2 flex items-center justify-between' }, [
                            h('span', { className: 'text-[11px] text-slate-400' }, 'Protected by Cloudflare / Captcha?'),
                            h('button', {
                                type: 'button',
                                className: 'px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1.5 transition-colors',
                                onClick: async () => {
                                    const testUrl = recipe.chapterUrl || recipe.bookUrl;
                                    if (!testUrl) return;
                                    if (window.NativeBridge?.openInAppBrowser || window.NativeBridge?.resolveCloudflare) {
                                        toast?.('Opening in-app browser to pass verification...', 'info');
                                        try {
                                            const solver = window.NativeBridge.openInAppBrowser || window.NativeBridge.resolveCloudflare;
                                            const res = await solver(testUrl);
                                            if (res?.success || res?.status === 'ok') {
                                                toast?.('Verification successful! Clearance cookies captured.', 'success');
                                            }
                                        } catch (e) {
                                            toast?.('In-app browser closed: ' + e.message, 'warning');
                                        }
                                    } else {
                                        window.open(testUrl, '_blank');
                                    }
                                }
                            }, '🛡️ Solve Captcha (In-App Browser)')
                        ])
                    ])
                ]),

                // Card: Crawl Mode
                h('div', {
                    key: 'card-mode',
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'
                }, [
                    h('h3', { className: 'text-sm font-semibold text-white' }, '📑 Chapter Ingestion Strategy'),
                    h('div', { className: 'grid grid-cols-2 gap-3 text-xs' }, [
                        h('button', {
                            className: `p-3 rounded-xl border text-left transition-all ${recipe.mode === 'list' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`,
                            onClick: () => updateField('mode', 'list')
                        }, [
                            h('p', { className: 'font-bold' }, 'Table of Contents List'),
                            h('p', { className: 'text-[11px] opacity-75 mt-0.5' }, 'Read all links from the novel index page')
                        ]),
                        h('button', {
                            className: `p-3 rounded-xl border text-left transition-all ${recipe.mode === 'next' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`,
                            onClick: () => updateField('mode', 'next')
                        }, [
                            h('p', { className: 'font-bold' }, 'Next Chapter Buttons'),
                            h('p', { className: 'text-[11px] opacity-75 mt-0.5' }, 'Traverse sequentially via next-chapter links')
                        ])
                    ])
                ]),

                // Card: Chapter Extraction Rules
                h('div', {
                    key: 'card-chapter',
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'
                }, [
                    h('h3', { className: 'text-sm font-semibold text-white' }, '📖 Chapter Reading Elements'),
                    h('div', { className: 'space-y-3 text-xs' }, [
                        // Content Selector
                        h('div', { className: 'space-y-1' }, [
                            h('div', { className: 'flex justify-between items-center' }, [
                                h('span', { className: 'text-slate-300 font-medium' }, 'Story Prose / Main Content'),
                                h('button', {
                                    className: 'text-indigo-400 hover:text-indigo-300 font-medium',
                                    onClick: () => openPicker('content', recipe.chapterUrl, recipe.chapter?.contentSelector)
                                }, '👆 Tap to Pick')
                            ]),
                            showAdvanced && h('input', {
                                className: 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white text-xs',
                                placeholder: '.chapter-content, #story-text',
                                value: recipe.chapter?.contentSelector || '',
                                onChange: (e) => updateField('chapter.contentSelector', e.target.value)
                            })
                        ]),

                        // Title Selector
                        h('div', { className: 'space-y-1' }, [
                            h('div', { className: 'flex justify-between items-center' }, [
                                h('span', { className: 'text-slate-300 font-medium' }, 'Chapter Title'),
                                h('button', {
                                    className: 'text-indigo-400 hover:text-indigo-300 font-medium',
                                    onClick: () => openPicker('chapterTitle', recipe.chapterUrl, recipe.chapter?.titleSelector)
                                }, '👆 Tap to Pick')
                            ]),
                            showAdvanced && h('input', {
                                className: 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white text-xs',
                                placeholder: 'h1.chapter-title',
                                value: recipe.chapter?.titleSelector || '',
                                onChange: (e) => updateField('chapter.titleSelector', e.target.value)
                            })
                        ]),

                        // Elements to Remove
                        h('div', { className: 'space-y-1' }, [
                            h('div', { className: 'flex justify-between items-center' }, [
                                h('span', { className: 'text-slate-300 font-medium' }, 'Elements to Remove (Junk, Ads, Watermarks)'),
                                h('button', {
                                    className: 'text-red-400 hover:text-red-300 font-medium',
                                    onClick: () => openPicker('remove', recipe.chapterUrl)
                                }, '👆 Tap Elements to Remove')
                            ]),
                            showAdvanced && h('input', {
                                className: 'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white text-xs',
                                placeholder: '.ad-box, .notice-bar, .social-share',
                                value: recipe.chapter?.removeSelector || '',
                                onChange: (e) => updateField('chapter.removeSelector', e.target.value)
                            })
                        ])
                    ])
                ]),

                // Card: Cleanup & Pacing
                h('div', {
                    key: 'card-network',
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'
                }, [
                    h('h3', { className: 'text-sm font-semibold text-white' }, '⚙️ Courtesy Delay & Safety'),
                    h('div', { className: 'space-y-3 text-xs' }, [
                        h('label', { className: 'flex items-center gap-2 cursor-pointer text-slate-300' }, [
                            h('input', {
                                type: 'checkbox',
                                checked: recipe.cleanup?.removeNavText !== false,
                                onChange: (e) => updateField('cleanup.removeNavText', e.target.checked),
                                className: 'rounded accent-emerald-500 w-4 h-4'
                            }),
                            'Auto-remove inline "Previous / Next Chapter" buttons'
                        ]),
                        h('label', { className: 'flex items-center gap-2 cursor-pointer text-slate-300' }, [
                            h('input', {
                                type: 'checkbox',
                                checked: !!recipe.network?.skipBroken,
                                onChange: (e) => updateField('network.skipBroken', e.target.checked),
                                className: 'rounded accent-emerald-500 w-4 h-4'
                            }),
                            'Skip broken (404 / 410) chapters without pausing the crawl'
                        ]),
                        h('div', { className: 'space-y-1' }, [
                            h('div', { className: 'flex justify-between text-slate-400' }, [
                                h('span', null, 'Crawl delay between chapters:'),
                                h('span', { className: 'font-mono text-white' }, recipe.network?.delayMs ? `${recipe.network.delayMs / 1000}s` : 'Off (0s)')
                            ]),
                            h('input', {
                                type: 'range',
                                min: 0,
                                max: 10000,
                                step: 500,
                                value: recipe.network?.delayMs || 0,
                                onChange: (e) => updateField('network.delayMs', parseInt(e.target.value, 10)),
                                className: 'w-full accent-emerald-500'
                            })
                        ])
                    ])
                ]),

                // Card: Test Runner
                h('div', {
                    key: 'card-test',
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3'
                }, [
                    h('div', { className: 'flex items-center justify-between' }, [
                        h('h3', { className: 'text-sm font-semibold text-white' }, '🧪 Test Recipe Rules'),
                        h('button', {
                            className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50',
                            disabled: isTesting,
                            onClick: handleRunTest
                        }, isTesting ? 'Testing...' : '▶ Run Test')
                    ]),

                    testResult && h('div', {
                        className: 'p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2'
                    }, [
                        testResult.error && h('p', { className: 'text-red-400 font-semibold' }, `Error: ${testResult.error}`),
                        testResult.book && h('div', { className: 'text-slate-300' }, [
                            h('p', { className: 'font-bold text-white' }, `Title: ${testResult.book.title || 'Untitled'}`),
                            h('p', null, `Author: ${testResult.book.author || 'Unknown'}`),
                            h('p', null, `Chapters found: ${testResult.book.chapterCount || 0}`)
                        ]),
                        testResult.chapter && h('div', { className: 'border-t border-slate-800 pt-2 text-slate-400' }, [
                            h('p', { className: 'font-bold text-slate-200' }, `Chapter Preview: ${testResult.chapter.title || 'Chapter'}`),
                            h('p', { className: 'text-[11px] text-slate-400' }, `Word count: ${testResult.chapter.wordCount} words`),
                            h('p', { className: 'text-[11px] font-mono text-slate-400 mt-1 line-clamp-3' }, testResult.chapter.preview)
                        ])
                    ])
                ]),

                // Footer sharing actions
                h('div', {
                    key: 'footer-actions',
                    className: 'flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-xs'
                }, [
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors',
                        onClick: () => RE.Controller.copyCode(recipe, toast)
                    }, '📋 Copy Recipe Code'),
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors',
                        onClick: () => RE.Controller.exportFile(recipe, toast)
                    }, '💾 Export JSON File'),
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors',
                        onClick: handlePasteRecipeCode
                    }, '📋 Paste Recipe Code'),
                    h('label', {
                        className: 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer flex items-center transition-colors'
                    }, [
                        h('input', {
                            type: 'file',
                            accept: '.json',
                            className: 'hidden',
                            onChange: handleImportRecipeFile
                        }),
                        '📥 Import JSON File'
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 ml-auto transition-colors',
                        onClick: () => {
                            confirmAction?.({
                                title: `Delete Recipe for ${recipe.id}?`,
                                message: 'Are you sure you want to delete this custom recipe?',
                                confirmLabel: 'Delete',
                                cancelLabel: 'Cancel',
                                isDangerous: true,
                                onConfirm: async () => {
                                    await RE.remove(recipe.id);
                                    toast?.(`Deleted recipe for ${recipe.id}`, 'info');
                                    onClose?.();
                                }
                            });
                        }
                    }, '🗑 Delete')
                ]),

                // Mobile Safe Clearance Spacer
                h('div', {
                    key: 'safe-bottom-spacer',
                    className: 'h-28 w-full shrink-0'
                })
            ]),

            // Sub-Inspector Modal Overlay
            activePicker && h(SitePickerOverlay, {
                key: 'inspector-overlay',
                open: !!activePicker,
                url: activePicker.url,
                target: activePicker.target,
                initialSelector: activePicker.initialSelector,
                onClose: () => setActivePicker(null),
                toast,
                onSelect: (selData) => {
                    if (selData.target === 'content') updateField('chapter.contentSelector', selData.selector);
                    else if (selData.target === 'chapterTitle') updateField('chapter.titleSelector', selData.selector);
                    else if (selData.target === 'remove') updateField('chapter.removeSelector', (selData.selectors || []).join(', '));
                    else if (selData.target === 'chapterLinks') updateField('book.chapterLinkSelector', selData.selector);
                    toast?.(`Updated ${selData.target} selector!`, 'success');
                }
            })
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. SETTINGS RECIPE MANAGER CARD
    // ══════════════════════════════════════════════════════════════════════
    function SiteRecipeManagerCard({ toast, confirmAction, openSiteRecipeEditor }) {
        const RE = window.SiteRecipeEngine;
        const [recipes, setRecipes] = useState([]);
        const [tick, setTick] = useState(0);

        useEffect(() => {
            if (!RE) return;
            RE.ready().then(() => {
                setRecipes(RE.getAll());
            });
        }, [tick]);

        const refresh = () => setTick(t => t + 1);

        const handlePasteRecipe = async () => {
            const pasted = await RE?.Controller?.pasteCode(toast);
            if (pasted) refresh();
        };

        const handleImportFile = async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const imported = await RE?.Controller?.importFile(file, toast);
                if (imported) refresh();
            };
            input.click();
        };

        return h('div', {
            className: 'p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm'
        }, [
            h('div', { className: 'flex items-center justify-between' }, [
                h('div', null, [
                    h('h3', { className: 'text-base font-bold text-white' }, '🌐 Site Recipes & Overrides'),
                    h('p', { className: 'text-xs text-slate-400 mt-0.5' }, 'Custom extraction rules for novel websites')
                ]),
                h('div', { className: 'flex gap-2' }, [
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors',
                        onClick: handlePasteRecipe
                    }, '📋 Paste Code'),
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors',
                        onClick: handleImportFile
                    }, '📂 Open File'),
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors',
                        onClick: () => openSiteRecipeEditor?.({})
                    }, '+ New Recipe')
                ])
            ]),

            recipes.length === 0 ? h('div', {
                className: 'py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl'
            }, 'No custom site recipes yet. When importing a novel, tap the ⚙️ Site Settings button to create one.')
            : h('div', { className: 'divide-y divide-slate-800/60' }, recipes.map(r => {
                const isBuiltin = RE?.isBuiltInSite(r.id);
                return h('div', {
                    key: r.id,
                    className: 'py-3 flex items-center justify-between gap-3 text-xs'
                }, [
                    h('div', { className: 'truncate' }, [
                        h('div', { className: 'flex items-center gap-2' }, [
                            h('span', { className: 'font-bold text-white truncate' }, r.name || r.id),
                            h('span', {
                                className: `px-1.5 py-0.5 rounded text-[10px] font-medium ${isBuiltin ? 'bg-amber-950/60 text-amber-300 border border-amber-600/30' : 'bg-blue-950/60 text-blue-300 border border-blue-600/30'}`
                            }, isBuiltin ? 'Built-in Override' : 'Custom')
                        ]),
                        h('p', { className: 'text-slate-400 font-mono text-[11px] truncate mt-0.5' }, r.id)
                    ]),
                    h('div', { className: 'flex items-center gap-2 shrink-0' }, [
                        h('button', {
                            className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors',
                            onClick: () => openSiteRecipeEditor?.({ recipeId: r.id })
                        }, 'Edit'),
                        h('button', {
                            className: 'px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/20 transition-colors',
                            onClick: () => {
                                confirmAction?.({
                                    title: `Delete Recipe?`,
                                    message: `Delete recipe for "${r.id}"?`,
                                    confirmLabel: 'Delete',
                                    isDangerous: true,
                                    onConfirm: async () => {
                                        await RE.remove(r.id);
                                        refresh();
                                        toast?.(`Deleted recipe for ${r.id}`, 'info');
                                    }
                                });
                            }
                        }, '✕')
                    ])
                ]);
            }))
        ]);
    }

    if (typeof window !== 'undefined') {
        window.SitePickerOverlay = SitePickerOverlay;
        window.SiteRecipeEditor = SiteRecipeEditor;
        window.SiteRecipeManagerCard = SiteRecipeManagerCard;
    }

    return {
        SitePickerOverlay,
        SiteRecipeEditor,
        SiteRecipeManagerCard
    };
}));
