/**
 * Site Recipe Editor and Settings Management UI (Zero-Build UMD React)
 * Features visual tap-to-pick inspector, rule testing, and backup integration
 */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['react'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const r = (typeof root !== 'undefined' && root.React) ? root.React : (typeof global !== 'undefined' ? global.React : null);
        module.exports = factory(r);
    } else {
        const exports = factory(root.React);
        root.SiteRecipeEditor = exports.SiteRecipeEditor;
        root.SiteRecipeManagerCard = exports.SiteRecipeManagerCard;
        root.SitePickerOverlay = exports.SitePickerOverlay;
    }
}(typeof self !== 'undefined' ? self : this, function (React) {
    'use strict';
    const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : window.React?.createElement;
    const { useState, useEffect, useRef, useCallback } = React || window.React;

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
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [previewHtml, setPreviewHtml] = useState('');
        const [selection, setSelection] = useState(null);
        const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'list'
        const [parsedItems, setParsedItems] = useState([]);
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
                let rawHtml = '';
                if (window.WebNovelImporter?.fetchHtml) {
                    rawHtml = await window.WebNovelImporter.fetchHtml(url, { context: 'SitePickerPreview' });
                } else if (window.NativeBridge?.fetchNative) {
                    const res = await window.NativeBridge.fetchNative(url);
                    rawHtml = (res && res.data) ? (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)) : '';
                } else if (typeof window.fetchRetry === 'function') {
                    const resp = await window.fetchRetry(url);
                    rawHtml = await resp.text();
                } else {
                    const resp = await fetch(url);
                    rawHtml = await resp.text();
                }

                if (!rawHtml || typeof rawHtml !== 'string' || !rawHtml.trim()) {
                    throw new Error('Received empty response from website.');
                }

                // Check for Cloudflare / anti-bot challenge
                const isChallenge = /checking your browser|just a moment|cf-turnstile|cf-challenge|challenge-platform/i.test(rawHtml);
                if (isChallenge) {
                    setError('This website is protected by Cloudflare verification.');
                }

                const parseCandidateElements = (htmlText) => {
                    try {
                        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
                        if (target === 'chapterLinks') {
                            const links = Array.from(doc.querySelectorAll('a[href]'))
                                .map(a => {
                                    const t = (a.textContent || '').trim();
                                    const h = a.getAttribute('href') || '';
                                    const sel = window.SitePicker?.uniqueSelector?.(a, doc) || 'a';
                                    return { title: t, href: h, selector: sel, rawEl: a };
                                })
                                .filter(l => l.title.length > 0 && l.title.length < 160 && !/^(javascript:|#|mailto:)/i.test(l.href));
                            setParsedItems(links);
                        } else if (target === 'content') {
                            const candidates = [];
                            const standardSelectors = ['#content', '.chapter-content', '.entry-content', '#chapter-content', '#story-text', 'article', '.content', '.text-content', '#text', '.chapter-text', '.reading-content'];
                            for (const s of standardSelectors) {
                                const el = doc.querySelector(s);
                                if (el) {
                                    const t = (el.textContent || '').trim();
                                    const wc = t ? t.split(/\s+/).length : 0;
                                    if (wc > 30) {
                                        candidates.push({ selector: s, words: wc, preview: t.slice(0, 180) });
                                    }
                                }
                            }
                            if (candidates.length === 0) {
                                const blocks = Array.from(doc.querySelectorAll('div, article, section, main, p'));
                                for (const b of blocks) {
                                    const t = (b.textContent || '').trim();
                                    const wc = t ? t.split(/\s+/).length : 0;
                                    if (wc > 60) {
                                        candidates.push({
                                            selector: window.SitePicker?.uniqueSelector?.(b, doc) || b.tagName.toLowerCase(),
                                            words: wc,
                                            preview: t.slice(0, 180)
                                        });
                                    }
                                }
                                candidates.sort((a, b) => b.words - a.words);
                            }
                            setParsedItems(candidates.slice(0, 10));
                        }
                    } catch (parseErr) {
                        console.warn('[SitePicker] Error parsing elements list:', parseErr);
                    }
                };

                // Extract element candidates for the clean List View fallback
                parseCandidateElements(rawHtml);

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
            if (!open) return;
            loadPreview();
            return () => {
                pickerHandleRef.current?.detach?.();
            };
        }, [url, open]);

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

        const handleOpenCaptchaSolver = async () => {
            const solver = window.NativeBridge?.openInAppBrowser || window.NativeBridge?.resolveCloudflare;
            if (solver) {
                toast?.('Opening in-app browser to pass verification...', 'info');
                try {
                    const res = await solver(url);
                    if (res?.success || res?.status === 'ok') {
                        if (res?.html && typeof res.html === 'string' && res.html.length > 300 && !/cf-turnstile|challenges\.cloudflare\.com|just a moment|<title>attention required/i.test(res.html)) {
                            toast?.('Verification passed! Loaded page content.', 'success');
                            setError(null);
                            setLoading(false);
                            try {
                                const doc = new DOMParser().parseFromString(res.html, 'text/html');
                                if (target === 'chapterLinks') {
                                    const links = Array.from(doc.querySelectorAll('a[href]'))
                                        .map(a => ({
                                            title: (a.textContent || '').trim(),
                                            href: a.getAttribute('href') || '',
                                            selector: window.SitePicker?.uniqueSelector?.(a, doc) || 'a',
                                            rawEl: a
                                        }))
                                        .filter(l => l.title.length > 0 && l.title.length < 160 && !/^(javascript:|#|mailto:)/i.test(l.href));
                                    setParsedItems(links);
                                } else if (target === 'content') {
                                    const blocks = Array.from(doc.querySelectorAll('div, article, section, main, p'));
                                    const candidates = [];
                                    for (const b of blocks) {
                                        const t = (b.textContent || '').trim();
                                        const wc = t ? t.split(/\s+/).length : 0;
                                        if (wc > 50) {
                                            candidates.push({
                                                selector: window.SitePicker?.uniqueSelector?.(b, doc) || b.tagName.toLowerCase(),
                                                words: wc,
                                                preview: t.slice(0, 180)
                                            });
                                        }
                                    }
                                    candidates.sort((a, b) => b.words - a.words);
                                    setParsedItems(candidates.slice(0, 10));
                                }
                            } catch (_) {}
                            const built = window.SitePicker?.buildPreviewDoc?.(res.html, url) || res.html;
                            setPreviewHtml(built);
                        } else {
                            toast?.('Verification passed! Reloading preview...', 'success');
                            setTimeout(() => {
                                loadPreview();
                            }, 500);
                        }
                    }
                } catch (e) {
                    toast?.('In-app browser: ' + e.message, 'warning');
                }
            } else {
                window.open(url, '_blank');
            }
        };

        useEffect(() => {
            const onKeyDown = (e) => {
                if (e.key === 'Escape' || e.key === 'Esc') {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose?.();
                }
            };
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        }, [onClose]);

        if (!open) return null;

        return h('div', {
            className: 'fixed inset-0 z-[10060] bg-black/80 flex flex-col backdrop-blur-sm animate-fade-in'
        }, [
            // Top Bar
            h('div', {
                key: 'topbar',
                className: 'py-2.5 px-3 md:px-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between text-white shrink-0 shadow-lg gap-2',
                style: {
                    paddingTop: 'max(14px, env(safe-area-inset-top, 16px))',
                    paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
                    paddingRight: 'max(12px, env(safe-area-inset-right, 12px))'
                }
            }, [
                h('div', { className: 'flex items-center gap-2 min-w-0 truncate' }, [
                    h('span', { className: 'text-amber-400 font-bold text-xs md:text-sm tracking-wide uppercase shrink-0' }, '👆 Inspector'),
                    h('span', { className: 'text-slate-400 text-[11px] md:text-xs truncate hidden sm:inline' }, targetLabels[target] || 'Tap an element on the page')
                ]),

                // Center: View Mode Toggle (Visual Page vs Clean Elements List)
                parsedItems.length > 0 && h('div', { className: 'flex rounded-xl bg-slate-800 p-0.5 border border-slate-700 text-xs shrink-0 order-last sm:order-none w-full sm:w-auto justify-center' }, [
                    h('button', {
                        type: 'button',
                        className: `flex-1 sm:flex-initial px-2.5 py-1 rounded-lg transition-all text-xs ${viewMode === 'visual' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'}`,
                        onClick: () => setViewMode('visual')
                    }, '🌐 Page View'),
                    h('button', {
                        type: 'button',
                        className: `flex-1 sm:flex-initial px-2.5 py-1 rounded-lg transition-all text-xs ${viewMode === 'list' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'}`,
                        onClick: () => setViewMode('list')
                    }, target === 'chapterLinks' ? `📑 Chapters (${parsedItems.length})` : `📖 Story Prose (${parsedItems.length})`)
                ]),

                // Right action buttons
                h('div', { className: 'flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0' }, [
                    h('button', {
                        type: 'button',
                        className: 'px-2 py-1 rounded-lg text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors hidden sm:inline-flex items-center gap-1',
                        onClick: handleOpenCaptchaSolver,
                        title: 'Solve Cloudflare verification in in-app browser'
                    }, '🛡️ Captcha'),
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-300 transition-colors shadow-sm cursor-pointer',
                        onClick: onClose
                    }, '✕ Cancel'),
                    h('button', {
                        type: 'button',
                        className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm',
                        onClick: handleUseSelection
                    }, '✓ Use This')
                ])
            ]),

            // Middle: Visual Iframe OR Clean Elements List
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
                    className: 'absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/95'
                }, [
                    h('div', { className: 'max-w-md p-6 rounded-2xl bg-slate-900 border border-amber-500/30 text-white space-y-4' }, [
                        h('p', { className: 'text-amber-400 font-semibold text-sm' }, '⚠️ Could not load website preview'),
                        h('p', { className: 'text-xs text-slate-300' }, error),
                        h('div', { className: 'flex flex-wrap gap-2 justify-center pt-2' }, [
                            h('button', {
                                type: 'button',
                                className: 'px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors',
                                onClick: loadPreview
                            }, '🔄 Try Again'),
                            h('button', {
                                type: 'button',
                                className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex items-center gap-1.5 shadow-sm',
                                onClick: handleOpenCaptchaSolver
                            }, '🛡️ Solve in In-App Browser'),
                            parsedItems.length > 0 && h('button', {
                                type: 'button',
                                className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors',
                                onClick: () => { setError(null); setViewMode('list'); }
                            }, '📑 View Extracted Elements')
                        ])
                    ])
                ]),

                // 1. Visual Web View (Sandboxed-clean Iframe)
                viewMode === 'visual' && h('iframe', {
                    key: 'iframe',
                    ref: iframeRef,
                    srcDoc: previewHtml,
                    className: 'w-full h-full border-none bg-slate-950',
                    onLoad: onIframeLoad
                }),

                // 2. Extracted Elements List View (Zero-Fail Alternative)
                viewMode === 'list' && h('div', {
                    key: 'list-view',
                    className: 'w-full h-full overflow-y-auto p-4 max-w-2xl mx-auto space-y-3'
                }, [
                    h('div', { className: 'p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between' }, [
                        h('span', null, target === 'chapterLinks' ? `Discovered ${parsedItems.length} chapter links. Tap one to select:` : `Discovered ${parsedItems.length} story text candidates. Tap one to select:`),
                        selection && h('span', { className: 'text-emerald-400 font-bold' }, '✓ Element Selected!')
                    ]),
                    parsedItems.map((item, idx) => {
                        const isSelected = selection?.selector === item.selector;
                        if (target === 'chapterLinks') {
                            return h('button', {
                                key: `item-${idx}`,
                                type: 'button',
                                className: `w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-xs ${isSelected ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`,
                                onClick: () => {
                                    setSelection({
                                        selector: item.selector,
                                        count: parsedItems.length,
                                        first: parsedItems[0]?.title || '',
                                        last: parsedItems[parsedItems.length - 1]?.title || '',
                                        target
                                    });
                                }
                            }, [
                                h('div', { className: 'truncate' }, [
                                    h('p', { className: 'font-medium truncate' }, item.title),
                                    h('p', { className: 'text-[11px] text-slate-500 font-mono truncate mt-0.5' }, item.href)
                                ]),
                                isSelected ? h('span', { className: 'text-emerald-400 text-xs font-bold shrink-0' }, '✓ Selected') : h('span', { className: 'text-slate-500 text-xs shrink-0' }, 'Tap to Pick')
                            ]);
                        } else {
                            return h('button', {
                                key: `item-${idx}`,
                                type: 'button',
                                className: `w-full p-3.5 rounded-xl border text-left transition-all space-y-1.5 text-xs ${isSelected ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`,
                                onClick: () => {
                                    setSelection({
                                        selector: item.selector,
                                        count: 1,
                                        words: item.words,
                                        sampleText: item.preview,
                                        target
                                    });
                                }
                            }, [
                                h('div', { className: 'flex justify-between items-center' }, [
                                    h('span', { className: 'font-mono text-indigo-400 font-bold text-xs' }, item.selector),
                                    h('span', { className: 'px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]' }, `~${item.words.toLocaleString()} words`)
                                ]),
                                h('p', { className: 'text-xs text-slate-400 line-clamp-2 leading-relaxed' }, item.preview)
                            ]);
                        }
                    })
                ])
            ]),

            // Bottom Bar (Action Toolbar)
            selection && h('div', {
                key: 'bottombar',
                className: 'h-14 px-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-white shrink-0 shadow-lg'
            }, [
                h('div', { className: 'flex items-center gap-2 truncate text-xs text-slate-300' }, [
                    selection.words ? `Selected: ~${selection.words.toLocaleString()} words` : null,
                    selection.count ? `Matches: ${selection.count}` : null,
                    selection.first ? `First: "${selection.first.slice(0, 25)}..."` : null,
                    selection.selectors ? `${selection.selectors.length} element(s) marked for removal` : null
                ].filter(Boolean).join(' • ')),
                h('div', { className: 'flex items-center gap-2' }, [
                    viewMode === 'visual' && h('button', {
                        type: 'button',
                        className: 'px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700',
                        onClick: () => pickerHandleRef.current?.bigger?.()
                    }, '⬆ Expand (Bigger)'),
                    viewMode === 'visual' && h('button', {
                        type: 'button',
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
        const RE = (typeof window !== 'undefined') ? window.SiteRecipeEngine : null;
        const [recipe, setRecipe] = useState(null);
        const [isDirty, setIsDirty] = useState(false);
        const [activePicker, setActivePicker] = useState(null); // { target, url, initialSelector }
        const [showAdvanced, setShowAdvanced] = useState(() => {
            try { return localStorage.getItem('siteRecipeAdvanced') === 'true'; } catch(e) { return false; }
        });
        const [testResult, setTestResult] = useState(null);
        const [isTesting, setIsTesting] = useState(false);
        const [isAutoDetecting, setIsAutoDetecting] = useState(false);
        const [isScouting, setIsScouting] = useState(false);
        const [scoutProgress, setScoutProgress] = useState('');
        const [autoDetectStats, setAutoDetectStats] = useState(null);
        const bookUrlInputRef = useRef(null);
        const chapterUrlInputRef = useRef(null);

        // Load / initialize recipe
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
            const normalized = RE.withDefaults(loaded);
            if (url && /^https?:\/\//i.test(url)) {
                const isBareDomain = !normalized.bookUrl || normalized.bookUrl === `https://${normalized.id}` || normalized.bookUrl === `https://${normalized.id}/`;
                if (isBareDomain || url.length > (normalized.bookUrl || '').length) {
                    normalized.bookUrl = url;
                    if (!normalized.testUrls) normalized.testUrls = {};
                    normalized.testUrls.book = url;
                }
            }
            setRecipe(normalized);
            setIsDirty(false);
            setTestResult(null);
        }, [recipeId, url]);

        const handleClosePrompt = useCallback(() => {
            if (isDirty) {
                if (typeof confirmAction === 'function') {
                    confirmAction('You have unsaved adjustments to this recipe. Discard and leave?', () => onClose?.());
                } else if (typeof window !== 'undefined' && window.confirm ? window.confirm('Discard unsaved adjustments and exit?') : true) {
                    onClose?.();
                }
            } else {
                onClose?.();
            }
        }, [isDirty, onClose, confirmAction]);

        // Escape key listener (declared unconditionally at component top)
        useEffect(() => {
            const onKeyDown = (e) => {
                if (e.key === 'Escape' || e.key === 'Esc') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClosePrompt();
                }
            };
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        }, [handleClosePrompt]);

        // Safe render guards AFTER all hooks have executed
        if (!open) return null;
        if (!RE) return null;
        if (!recipe) {
            return h('div', {
                className: 'fixed inset-0 z-[10050] bg-slate-950 flex flex-col items-center justify-center gap-3 text-white'
            }, [
                h('div', { className: 'w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin' }),
                h('p', { className: 'text-sm text-slate-400' }, 'Loading site recipe...')
            ]);
        }

        const isBuiltin = RE.isBuiltInSite(recipe.id);

        const updateField = (path, value) => {
            setRecipe(prev => {
                if (!prev) return prev;
                const next = JSON.parse(JSON.stringify(prev));
                const parts = path.split('.');
                let curr = next;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!curr[parts[i]]) curr[parts[i]] = {};
                    curr = curr[parts[i]];
                }
                curr[parts[parts.length - 1]] = value;
                if (path === 'bookUrl') {
                    if (!next.testUrls) next.testUrls = {};
                    next.testUrls.book = value;
                } else if (path === 'chapterUrl') {
                    if (!next.testUrls) next.testUrls = {};
                    next.testUrls.chapter = value;
                } else if (path === 'chapter.removeSelector') {
                    if (!next.chapter) next.chapter = {};
                    next.chapter.removeSelectors = String(value || '').split(',').map(s => s.trim()).filter(Boolean);
                }
                return next;
            });
            setIsDirty(true);
        };

        const handleSave = async () => {
            try {
                const toSave = RE.withDefaults(recipe);
                await RE.save(toSave);
                setIsDirty(false);
                toast?.(`Recipe for "${toSave.id}" saved successfully!`, 'success');
                onClose?.();
            } catch (err) {
                toast?.(`Failed to save recipe: ${err.message}`, 'error');
            }
        };

        const pasteToField = async (field) => {
            try {
                let text = '';
                if (window.NativeBridge && typeof window.NativeBridge.getClipboardText === 'function') {
                    try { text = await window.NativeBridge.getClipboardText(); } catch (e) {}
                }
                if (!text && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
                    try { text = await navigator.clipboard.readText(); } catch (e) {}
                }
                if (text && typeof text === 'string') {
                    text = text.trim();
                    if (text) {
                        if (field === 'bookUrl' && bookUrlInputRef.current) {
                            bookUrlInputRef.current.value = text;
                        }
                        if (field === 'chapterUrl' && chapterUrlInputRef.current) {
                            chapterUrlInputRef.current.value = text;
                        }
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

        const toggleAdvanced = (val) => {
            setShowAdvanced(val);
            try { localStorage.setItem('siteRecipeAdvanced', String(val)); } catch(e) {}
        };

        const handleRunTest = async () => {
            setIsTesting(true);
            setTestResult(null);
            try {
                const bUrl = recipe.bookUrl || recipe.testUrls?.book || '';
                const cUrl = recipe.chapterUrl || recipe.testUrls?.chapter || '';
                if (!bUrl && !cUrl) {
                    toast?.('Please enter a Book Overview URL or Sample Chapter URL to test.', 'warning');
                    setIsTesting(false);
                    return;
                }
                const res = await RE.testRecipe(recipe, { bookUrl: bUrl, chapterUrl: cUrl });
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

        const handleAutoDetect = async () => {
            const currentBook = (bookUrlInputRef.current?.value || recipe.bookUrl || recipe.testUrls?.book || '').trim();
            const currentChapter = (chapterUrlInputRef.current?.value || recipe.chapterUrl || recipe.testUrls?.chapter || '').trim();
            const targetUrl = currentBook || currentChapter || url;
            if (!targetUrl) {
                toast?.('Please paste a novel link in the box above first.', 'warning');
                return;
            }
            setIsAutoDetecting(true);
            setAutoDetectStats(null);
            try {
                const res = await RE.Controller.autoDetect(targetUrl, {
                    onStart: () => toast?.('⚡ AI scanning website structure & chapters...', 'info'),
                    existingBookUrl: currentBook,
                    existingChapterUrl: currentChapter
                });
                if (res && res.recipe) {
                    const resolvedBookUrl = res.recipe.bookUrl || currentBook || '';
                    const resolvedChapterUrl = res.recipe.chapterUrl || currentChapter || '';

                    setRecipe(prev => ({
                        ...prev,
                        ...res.recipe,
                        id: prev.id || res.recipe.id,
                        name: prev.name || res.recipe.name,
                        bookUrl: resolvedBookUrl,
                        chapterUrl: resolvedChapterUrl,
                        testUrls: {
                            book: resolvedBookUrl,
                            chapter: resolvedChapterUrl
                        }
                    }));
                    if (bookUrlInputRef.current && resolvedBookUrl) {
                        bookUrlInputRef.current.value = resolvedBookUrl;
                    }
                    if (chapterUrlInputRef.current && resolvedChapterUrl) {
                        chapterUrlInputRef.current.value = resolvedChapterUrl;
                    }
                    setIsDirty(true);
                    setAutoDetectStats(res.stats);
                    toast?.(`✓ Analyzed with ${res.stats?.aiEngine || 'AI'}: ${res.stats?.chaptersCount || 0} chapters & story text!`, 'success');
                }
            } catch (err) {
                toast?.(`Auto-detect: ${err.message}`, 'error');
            } finally {
                setIsAutoDetecting(false);
            }
        };

        const handleRunScout = async () => {
            const currentBook = (bookUrlInputRef.current?.value || recipe.bookUrl || recipe.testUrls?.book || url || '').trim();
            if (!currentBook) {
                toast?.('Please paste a novel link in the box below first.', 'warning');
                return;
            }
            setIsScouting(true);
            setScoutProgress('Starting Scout...');
            setAutoDetectStats(null);
            try {
                const res = await RE.Controller.scoutWebsite(currentBook, {
                    onProgress: (stage, msg) => {
                        setScoutProgress(msg);
                        toast?.(msg, 'info');
                    }
                });
                if (res && res.recipe) {
                    const resolvedBookUrl = res.recipe.bookUrl || currentBook || '';
                    const resolvedChapterUrl = res.recipe.chapterUrl || res.stats?.ch1Url || '';

                    setRecipe(prev => ({
                        ...prev,
                        ...res.recipe,
                        id: prev.id || res.recipe.id,
                        name: prev.name || res.recipe.name,
                        bookUrl: resolvedBookUrl,
                        chapterUrl: resolvedChapterUrl,
                        testUrls: {
                            book: resolvedBookUrl,
                            chapter: resolvedChapterUrl
                        }
                    }));
                    if (bookUrlInputRef.current && resolvedBookUrl) {
                        bookUrlInputRef.current.value = resolvedBookUrl;
                    }
                    if (chapterUrlInputRef.current && resolvedChapterUrl) {
                        chapterUrlInputRef.current.value = resolvedChapterUrl;
                    }
                    setIsDirty(true);
                    setAutoDetectStats({
                        ...res.stats,
                        isScout: true
                    });
                    toast?.(`✓ Autonomous Scout completed & recipe saved!`, 'success');
                }
            } catch (err) {
                toast?.(`Scout failed: ${err.message}`, 'error');
            } finally {
                setIsScouting(false);
                setScoutProgress('');
            }
        };

        const openPicker = (target, targetUrl, initialSelector) => {
            const pickUrl = targetUrl || recipe.chapterUrl || recipe.testUrls?.chapter || recipe.bookUrl || recipe.testUrls?.book || url;
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
                className: 'py-2.5 px-3 md:px-5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between shrink-0 shadow-md gap-2.5 z-20',
                style: {
                    paddingTop: 'max(14px, env(safe-area-inset-top, 16px))',
                    paddingBottom: '12px',
                    paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
                    paddingRight: 'max(12px, env(safe-area-inset-right, 12px))'
                }
            }, [
                h('div', { className: 'flex items-center gap-2.5 min-w-0 flex-1' }, [
                    h('button', {
                        type: 'button',
                        className: 'px-3.5 py-2 rounded-xl border border-slate-500 hover:border-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md',
                        onClick: handleClosePrompt,
                        title: 'Exit without saving'
                    }, [
                        renderIcon('x', 16, 'text-slate-300'),
                        '✕ Exit'
                    ]),
                    h('div', { className: 'truncate min-w-0' }, [
                        h('h2', { className: 'text-sm sm:text-base font-bold text-white truncate' }, 'Site Settings & Recipe'),
                        h('p', { className: 'text-[11px] text-slate-400 font-mono truncate' }, recipe.id)
                    ])
                ]),
                h('div', { className: 'flex items-center gap-2 shrink-0 ml-auto' }, [
                    h('label', { className: 'hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-300 cursor-pointer mr-1' }, [
                        h('input', {
                            type: 'checkbox',
                            checked: recipe.enabled !== false,
                            onChange: (e) => updateField('enabled', e.target.checked),
                            className: 'rounded accent-emerald-500 w-4 h-4'
                        }),
                        'Enabled'
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer',
                        onClick: handleSave,
                        title: 'Save settings and return'
                    }, [
                        renderIcon('check', 16, 'text-emerald-200'),
                        '✓ Save & Exit'
                    ])
                ])
            ]),

            // Scrollable Content Body
            h('div', {
                key: 'body',
                className: 'flex-1 overflow-y-auto px-4 md:px-6 overscroll-contain space-y-5 max-w-4xl mx-auto w-full',
                style: {
                    paddingTop: '16px',
                    paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 24px))'
                }
            }, [
                // Top Scroll Clearance Spacer
                h('div', {
                    key: 'safe-top-spacer',
                    className: 'h-1 w-full shrink-0'
                }),

                // Extra Inline Exit Bar for Mobile (Visible at the top of scrollable content)
                h('div', {
                    key: 'mobile-top-bar',
                    className: 'sm:hidden flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md gap-2'
                }, [
                    h('div', { className: 'flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate' }, [
                        renderIcon('sliders', 14, 'text-emerald-400 shrink-0'),
                        h('span', { className: 'truncate' }, recipe.name || recipe.id || 'Site Settings')
                    ]),
                    h('div', { className: 'flex items-center gap-2 shrink-0' }, [
                        h('button', {
                            type: 'button',
                            className: 'px-3 py-1.5 rounded-xl border border-slate-500 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer',
                            onClick: handleClosePrompt,
                            title: 'Exit without saving'
                        }, [
                            renderIcon('x', 12, 'text-slate-300'),
                            '✕ Exit'
                        ]),
                        h('button', {
                            type: 'button',
                            className: 'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-sm',
                            onClick: handleSave,
                            title: 'Save settings & exit'
                        }, [
                            renderIcon('check', 12, 'text-emerald-100'),
                            '✓ Save'
                        ])
                    ])
                ]),
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
                    className: 'p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5'
                }, [
                    h('div', { className: 'flex items-center justify-between' }, [
                        h('h3', { className: 'text-sm font-semibold text-white flex items-center gap-2' }, '🔗 Test Pages'),
                        h('span', { className: 'text-[11px] text-slate-400' }, 'Paste a book or chapter link to begin')
                    ]),

                    // ⚡ AI Auto-Detect Banner & One-Tap Action
                    h('div', {
                        className: 'p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm'
                    }, [
                        h('div', { className: 'space-y-0.5' }, [
                            h('div', { className: 'text-xs font-bold text-indigo-300 flex items-center gap-1.5' }, [
                                renderIcon('sparkles', 14, 'text-amber-400 shrink-0'),
                                '⚡ AI Smart Auto-Detect'
                            ]),
                            h('p', { className: 'text-[11px] text-slate-300 leading-relaxed' }, 'Paste your novel link below, then tap here to let AI automatically detect all chapters and story text with zero setup.')
                        ]),
                        h('div', { className: 'flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0' }, [
                            h('button', {
                                type: 'button',
                                disabled: isAutoDetecting || isScouting,
                                className: 'flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer',
                                onClick: handleAutoDetect
                            }, [
                                isAutoDetecting ? renderIcon('refresh', 13, 'animate-spin') : renderIcon('sparkles', 13),
                                isAutoDetecting ? 'Scanning...' : '⚡ Quick Auto-Detect'
                            ]),
                            h('button', {
                                type: 'button',
                                disabled: isAutoDetecting || isScouting,
                                className: 'flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer',
                                onClick: handleRunScout
                            }, [
                                isScouting ? renderIcon('refresh', 13, 'animate-spin') : renderIcon('sparkles', 13),
                                isScouting ? 'Scouting...' : '✨ Autonomous Scout'
                            ])
                        ])
                    ]),

                    // Active Scout Progress readout banner
                    (isScouting && scoutProgress) && h('div', {
                        className: 'p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2 animate-pulse shadow-inner'
                    }, [
                        renderIcon('refresh', 13, 'animate-spin text-indigo-400 shrink-0'),
                        h('span', { className: 'truncate font-medium' }, scoutProgress)
                    ]),

                    // Auto-Detect & Scout Stats Result Card
                    autoDetectStats && h('div', {
                        className: 'p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-2 animate-fade-in'
                    }, [
                        h('div', { className: 'flex items-center justify-between gap-2' }, [
                            h('div', { className: 'space-y-0.5 truncate' }, [
                                h('p', { className: 'font-bold flex items-center gap-1.5 text-emerald-300' }, [
                                    renderIcon('check', 13, 'text-emerald-400 shrink-0'),
                                    `Scouted via ${autoDetectStats.aiEngine || 'AI'}: ${autoDetectStats.chaptersCount} chapters (~${(autoDetectStats.sampleWords || 0).toLocaleString()} words)`
                                ]),
                                autoDetectStats.firstChapterName && h('p', { className: 'text-[11px] text-emerald-400/80 truncate' }, `First chapter: "${autoDetectStats.firstChapterName}"`)
                            ]),
                            autoDetectStats.safeDelayMs && h('span', {
                                className: 'px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] shrink-0'
                            }, `⏱️ ${autoDetectStats.safeDelayMs}ms delay`)
                        ]),
                        autoDetectStats.preview && h('div', {
                            className: 'p-2 rounded-lg bg-black/40 border border-emerald-500/20 text-[11px] text-slate-300 font-mono line-clamp-2'
                        }, `“${autoDetectStats.preview}…”`)
                    ]),

                    h('div', { className: 'space-y-2 text-xs' }, [
                        h('label', { className: 'text-slate-400 block' }, 'Book Overview / Table of Contents URL'),
                        h('div', { className: 'flex flex-col sm:flex-row gap-2' }, [
                            h('input', {
                                ref: bookUrlInputRef,
                                type: 'text',
                                inputMode: 'url',
                                autoCapitalize: 'none',
                                autoCorrect: 'off',
                                spellCheck: false,
                                style: { userSelect: 'text', WebkitUserSelect: 'text', WebkitTouchCallout: 'default' },
                                className: 'flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 outline-none select-text cursor-text',
                                placeholder: 'https://example.com/novel/title',
                                value: (recipe.bookUrl !== undefined && recipe.bookUrl !== null) ? recipe.bookUrl : (recipe.testUrls?.book || ''),
                                onChange: (e) => updateField('bookUrl', e.target.value),
                                onInput: (e) => updateField('bookUrl', e.target.value)
                            }),
                            h('div', { className: 'flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end' }, [
                                h('button', {
                                    type: 'button',
                                    className: 'flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer',
                                    onClick: () => pasteToField('bookUrl'),
                                    title: 'Paste URL from clipboard'
                                }, '📋 Paste'),
                                h('button', {
                                    type: 'button',
                                    className: 'flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs transition-colors cursor-pointer text-center',
                                    onClick: () => openPicker('chapterLinks', recipe.bookUrl || recipe.testUrls?.book)
                                }, '👆 Inspect TOC')
                            ])
                        ]),

                        h('label', { className: 'text-slate-400 block pt-1' }, 'Sample Chapter URL'),
                        h('div', { className: 'flex flex-col sm:flex-row gap-2' }, [
                            h('input', {
                                ref: chapterUrlInputRef,
                                type: 'text',
                                inputMode: 'url',
                                autoCapitalize: 'none',
                                autoCorrect: 'off',
                                spellCheck: false,
                                style: { userSelect: 'text', WebkitUserSelect: 'text', WebkitTouchCallout: 'default' },
                                className: 'flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 outline-none select-text cursor-text',
                                placeholder: 'https://example.com/novel/title/chapter-1',
                                value: (recipe.chapterUrl !== undefined && recipe.chapterUrl !== null) ? recipe.chapterUrl : (recipe.testUrls?.chapter || ''),
                                onChange: (e) => updateField('chapterUrl', e.target.value),
                                onInput: (e) => updateField('chapterUrl', e.target.value)
                            }),
                            h('div', { className: 'flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end' }, [
                                h('button', {
                                    type: 'button',
                                    className: 'flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer',
                                    onClick: () => pasteToField('chapterUrl'),
                                    title: 'Paste URL from clipboard'
                                }, '📋 Paste'),
                                h('button', {
                                    type: 'button',
                                    className: 'flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs transition-colors cursor-pointer text-center',
                                    onClick: () => openPicker('content', recipe.chapterUrl || recipe.testUrls?.chapter)
                                }, '👆 Inspect Chapter')
                            ])
                        ]),

                        (recipe.bookUrl || recipe.chapterUrl || recipe.testUrls?.book || recipe.testUrls?.chapter) && h('div', { className: 'pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2' }, [
                            h('span', { className: 'text-[11px] text-slate-400' }, 'Protected by Cloudflare / Captcha?'),
                            h('button', {
                                type: 'button',
                                className: 'w-full sm:w-auto px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer',
                                onClick: async () => {
                                    const testUrl = recipe.chapterUrl || recipe.testUrls?.chapter || recipe.bookUrl || recipe.testUrls?.book;
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
                            h('p', { className: 'text-[11px] text-slate-400' }, `Word count: ${testResult.chapter.words || testResult.chapter.wordCount || 0} words`),
                            h('p', { className: 'text-[11px] font-mono text-slate-400 mt-1 line-clamp-3' }, testResult.chapter.preview)
                        ])
                    ])
                ]),

                // Footer sharing actions
                h('div', {
                    key: 'footer-actions',
                    className: 'flex flex-col gap-3 pt-3 border-t border-slate-800 text-xs'
                }, [
                    h('div', { className: 'grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full' }, [
                        h('button', {
                            type: 'button',
                            className: 'px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors text-center text-xs font-medium cursor-pointer',
                            onClick: () => RE.Controller.copyCode(recipe, toast)
                        }, '📋 Copy Code'),
                        h('button', {
                            type: 'button',
                            className: 'px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors text-center text-xs font-medium cursor-pointer',
                            onClick: () => RE.Controller.exportFile(recipe, toast)
                        }, '💾 Export JSON'),
                        h('button', {
                            type: 'button',
                            className: 'px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors text-center text-xs font-medium cursor-pointer',
                            onClick: handlePasteRecipeCode
                        }, '📋 Paste Code'),
                        h('label', {
                            className: 'px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-500 cursor-pointer flex items-center justify-center transition-colors text-xs font-medium',
                            title: 'Import recipe JSON'
                        }, [
                            h('input', {
                                type: 'file',
                                accept: '.json',
                                className: 'hidden',
                                onChange: handleImportRecipeFile
                            }),
                            '📥 Import JSON'
                        ])
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'w-full px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 border border-red-500/30 text-red-300 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs',
                        onClick: () => {
                            confirmAction?.(`Are you sure you want to delete the recipe for "${recipe.id}"?`, async () => {
                                await RE.remove(recipe.id);
                                toast?.(`Deleted recipe for ${recipe.id}`, 'info');
                                onClose?.();
                            });
                        }
                    }, '🗑 Delete Recipe')
                ]),

                // Mobile Safe Clearance Spacer
                h('div', {
                    key: 'safe-bottom-spacer',
                    className: 'h-28 w-full shrink-0'
                })
            ]),

            // Sticky Bottom Action Bar (Always visible)
            h('div', {
                key: 'bottom-bar',
                className: 'px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-2xl z-20',
                style: {
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                    paddingTop: '12px',
                    paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
                    paddingRight: 'max(16px, env(safe-area-inset-right, 16px))'
                }
            }, [
                h('button', {
                    type: 'button',
                    className: 'px-4 py-2.5 rounded-xl border border-slate-500 hover:border-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-md',
                    onClick: handleClosePrompt,
                    title: 'Exit without saving changes'
                }, [
                    renderIcon('x', 16, 'text-slate-300'),
                    '✕ Exit'
                ]),
                h('div', { className: 'flex items-center gap-2.5' }, [
                    h('label', { className: 'hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-300 cursor-pointer mr-1' }, [
                        h('input', {
                            type: 'checkbox',
                            checked: recipe.enabled !== false,
                            onChange: (e) => updateField('enabled', e.target.checked),
                            className: 'rounded accent-emerald-500 w-4 h-4'
                        }),
                        'Enabled'
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg',
                        onClick: handleSave,
                        title: 'Save all recipe settings and return'
                    }, [
                        renderIcon('check', 16, 'text-emerald-200'),
                        '✓ Save Settings & Exit'
                    ])
                ])
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
            h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' }, [
                h('div', { className: 'min-w-0' }, [
                    h('h3', { className: 'text-base font-bold text-white' }, '🌐 Site Recipes & Overrides'),
                    h('p', { className: 'text-xs text-slate-400 mt-0.5' }, 'Custom extraction rules for novel websites')
                ]),
                h('div', { className: 'flex flex-wrap items-center gap-2' }, [
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-medium text-slate-200 transition-colors cursor-pointer',
                        onClick: handlePasteRecipe
                    }, '📋 Paste Code'),
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-medium text-slate-200 transition-colors cursor-pointer',
                        onClick: handleImportFile
                    }, '📂 Open File'),
                    h('button', {
                        className: 'px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white transition-colors cursor-pointer',
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
                            title: 'Delete recipe',
                            onClick: () => {
                                confirmAction?.(`Delete recipe for "${r.id}"?`, async () => {
                                    await RE.remove(r.id);
                                    refresh();
                                    toast?.(`Deleted recipe for ${r.id}`, 'info');
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
