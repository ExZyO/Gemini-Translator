/**
 * Site Recipe Editor and Settings Management UI (Zero-Build UMD React)
 * Clean borderless Charcoal / AMOLED phone-first layout with visual element inspector,
 * AI Auto-Scout, rule testing, and full backup/sharing parity.
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
    const R = (typeof React !== 'undefined' && React) ? React : (typeof window !== 'undefined' ? window.React : {});
    const h = R.createElement;
    const { useState, useEffect, useRef, useCallback } = R;

    function ic(name, size = 16, cls = '') {
        if (typeof window !== 'undefined' && window.ic) {
            return window.ic(name, size, cls);
        }
        return null;
    }

    const monoFont = "'IBM Plex Mono', monospace";

    // ══════════════════════════════════════════════════════════════════════
    // 1. VISUAL PICKER OVERLAY (Sandboxed Iframe + Clean Elements List)
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
            remove: 'Tap elements to remove',
            bookTitle: 'Tap the book title',
            author: 'Tap the author name',
            cover: 'Tap the book cover image',
            summary: 'Tap the summary text',
            chapterLinks: 'Tap one chapter link',
            tocNextPage: 'Tap Next page in chapter list',
            nextLink: 'Tap Next chapter button'
        };

        const extractCandidates = (htmlText) => {
            try {
                const doc = new DOMParser().parseFromString(htmlText, 'text/html');
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

                if (/checking your browser|just a moment|cf-turnstile|cf-challenge|challenge-platform/i.test(rawHtml)) {
                    setError('This website is protected by verification.');
                }

                extractCandidates(rawHtml);
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
                    onChange: (selData) => setSelection(selData)
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
                            extractCandidates(res.html);
                            const built = window.SitePicker?.buildPreviewDoc?.(res.html, url) || res.html;
                            setPreviewHtml(built);
                        } else {
                            toast?.('Verification passed! Reloading preview...', 'success');
                            setTimeout(() => { loadPreview(); }, 500);
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
            'data-modal': 'site-picker-overlay',
            style: {
                position: 'fixed',
                inset: 0,
                zIndex: 10060,
                background: 'var(--p-canvas, #111318)',
                color: 'var(--p-ink, #F5F6F8)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }
        }, [
            // Topbar
            h('div', { key: 'topbar', className: 'p-topbar' }, [
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 } }, [
                    h('button', {
                        type: 'button',
                        className: 'p-icon-btn',
                        onClick: onClose,
                        title: 'Cancel inspector',
                        'aria-label': 'Cancel inspector'
                    }, ic('ArrowLeft', 19)),
                    h('div', { style: { minWidth: 0 } }, [
                        h('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--p-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, 'Element Inspector'),
                        h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, targetLabels[target] || 'Tap an element')
                    ])
                ]),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } }, [
                    h('button', {
                        type: 'button',
                        className: 'p-icon-btn',
                        onClick: handleOpenCaptchaSolver,
                        title: 'Open in-app browser check'
                    }, ic('Shield', 17)),
                    h('button', {
                        type: 'button',
                        className: 'p-pill-btn is-primary',
                        style: { height: 34, padding: '0 14px', fontSize: 12.5 },
                        onClick: handleUseSelection
                    }, ic('Check', 14), 'Use This')
                ])
            ]),

            // Underline View Mode Switcher (when candidates extracted)
            parsedItems.length > 0 && h('div', { key: 'viewtabs', className: 'omni-underline-tabs' }, [
                h('button', {
                    type: 'button',
                    className: `omni-underline-tab ${viewMode === 'visual' ? 'active' : ''}`,
                    onClick: () => setViewMode('visual')
                }, ic('Globe', 14), 'Page View'),
                h('button', {
                    type: 'button',
                    className: `omni-underline-tab ${viewMode === 'list' ? 'active' : ''}`,
                    onClick: () => setViewMode('list')
                }, ic(target === 'chapterLinks' ? 'List' : 'BookOpen', 14), target === 'chapterLinks' ? `Chapters (${parsedItems.length})` : `Story Text (${parsedItems.length})`)
            ]),

            // Body
            h('div', {
                key: 'body',
                style: {
                    position: 'relative',
                    flex: 1,
                    minHeight: 0,
                    background: 'var(--p-canvas, #111318)',
                    overflow: 'hidden'
                }
            }, [
                loading && h('div', {
                    key: 'loading',
                    style: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        background: 'var(--p-canvas, #111318)',
                        zIndex: 10
                    }
                }, [
                    ic('Loader2', 26, 'animate-spin'),
                    h('div', { style: { fontSize: 13.5, color: 'var(--p-muted)' } }, 'Loading page preview...')
                ]),

                error && h('div', {
                    key: 'error',
                    style: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                        textAlign: 'center',
                        background: 'var(--p-canvas, #111318)',
                        zIndex: 10,
                        gap: 14
                    }
                }, [
                    ic('AlertTriangle', 28),
                    h('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--p-ink)' } }, 'Could not load website preview'),
                    h('div', { style: { fontSize: 13, color: 'var(--p-muted)', maxWidth: 320, lineHeight: 1.5 } }, error),
                    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' } }, [
                        h('button', { type: 'button', className: 'p-pill-btn', onClick: loadPreview }, ic('RefreshCw', 13), 'Try Again'),
                        h('button', { type: 'button', className: 'p-pill-btn is-primary', onClick: handleOpenCaptchaSolver }, ic('Shield', 13), 'Open Browser Check'),
                        parsedItems.length > 0 && h('button', {
                            type: 'button',
                            className: 'p-pill-btn',
                            onClick: () => { setError(null); setViewMode('list'); }
                        }, ic('List', 13), 'Extracted List')
                    ])
                ]),

                viewMode === 'visual' && h('iframe', {
                    key: 'iframe',
                    ref: iframeRef,
                    srcDoc: previewHtml,
                    style: { width: '100%', height: '100%', border: 'none', background: '#FFFFFF' },
                    onLoad: onIframeLoad
                }),

                viewMode === 'list' && h('div', {
                    key: 'list-view',
                    style: {
                        width: '100%',
                        height: '100%',
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        padding: '8px 0 36px'
                    }
                }, [
                    h('div', { className: 'omni-inline-strip' }, [
                        h('span', null, target === 'chapterLinks' ? `Found ${parsedItems.length} chapter links` : `Found ${parsedItems.length} story text candidates`),
                        selection && h('span', { style: { color: 'var(--p-accent)', fontWeight: 700 } }, 'Selected')
                    ]),
                    parsedItems.map((item, idx) => {
                        const isSelected = selection?.selector === item.selector;
                        if (target === 'chapterLinks') {
                            return h('button', {
                                key: `item-${idx}`,
                                type: 'button',
                                className: 'p-row',
                                style: { background: isSelected ? 'var(--p-accent-soft)' : 'transparent' },
                                onClick: () => setSelection({
                                    selector: item.selector,
                                    count: parsedItems.length,
                                    first: parsedItems[0]?.title || '',
                                    last: parsedItems[parsedItems.length - 1]?.title || '',
                                    target
                                })
                            }, [
                                h('div', { style: { flex: 1, minWidth: 0 } }, [
                                    h('div', { className: 'p-row-title', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, item.title),
                                    h('div', { className: 'p-row-sub', style: { fontFamily: monoFont, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, item.href)
                                ]),
                                isSelected
                                    ? h('span', { style: { color: 'var(--p-accent)', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, 'Picked')
                                    : h('span', { style: { color: 'var(--p-dim)', fontSize: 12, flexShrink: 0 } }, 'Pick')
                            ]);
                        }
                        return h('button', {
                            key: `item-${idx}`,
                            type: 'button',
                            className: 'p-row',
                            style: {
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                gap: 5,
                                background: isSelected ? 'var(--p-accent-soft)' : 'transparent'
                            },
                            onClick: () => setSelection({
                                selector: item.selector,
                                count: 1,
                                words: item.words,
                                sampleText: item.preview,
                                target
                            })
                        }, [
                            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, [
                                h('span', { style: { fontFamily: monoFont, fontSize: 12, fontWeight: 700, color: 'var(--p-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.selector),
                                h('span', { className: 'badge' }, `~${item.words.toLocaleString()} words`)
                            ]),
                            h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, item.preview)
                        ]);
                    })
                ])
            ]),

            // Bottom selection bar
            selection && h('div', {
                key: 'bottombar',
                style: {
                    padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
                    background: 'var(--p-surface, #1A1D24)',
                    borderTop: '1px solid var(--p-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexShrink: 0
                }
            }, [
                h('div', { style: { fontSize: 12, color: 'var(--p-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 } }, [
                    selection.words ? `Selected: ~${selection.words.toLocaleString()} words` : null,
                    selection.count ? `Matches: ${selection.count}` : null,
                    selection.first ? `First: "${selection.first.slice(0, 25)}..."` : null,
                    selection.selectors ? `${selection.selectors.length} element(s) to remove` : null
                ].filter(Boolean).join(' · ')),
                viewMode === 'visual' && h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } }, [
                    h('button', { type: 'button', className: 'p-pill-btn', style: { height: 30, fontSize: 11.5, padding: '0 10px' }, onClick: () => pickerHandleRef.current?.bigger?.() }, 'Expand'),
                    h('button', { type: 'button', className: 'p-pill-btn', style: { height: 30, fontSize: 11.5, padding: '0 10px' }, onClick: () => pickerHandleRef.current?.smaller?.() }, 'Narrow')
                ])
            ])
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. SITE RECIPE EDITOR FULLSCREEN VIEW (Unboxed Charcoal / AMOLED UI)
    // ══════════════════════════════════════════════════════════════════════
    function SiteRecipeEditor({ open, url, recipeId, onClose, toast, confirmAction }) {
        const RE = (typeof window !== 'undefined') ? window.SiteRecipeEngine : null;
        const [recipe, setRecipe] = useState(null);
        const [isDirty, setIsDirty] = useState(false);
        const [activePicker, setActivePicker] = useState(null);
        const [showAdvanced, setShowAdvanced] = useState(() => {
            try { return localStorage.getItem('siteRecipeAdvanced') === 'true'; } catch (e) { return false; }
        });
        const [testResult, setTestResult] = useState(null);
        const [isTesting, setIsTesting] = useState(false);
        const [isAutoDetecting, setIsAutoDetecting] = useState(false);
        const [isScouting, setIsScouting] = useState(false);
        const [scoutProgress, setScoutProgress] = useState('');
        const [autoDetectStats, setAutoDetectStats] = useState(null);
        const [showExitConfirm, setShowExitConfirm] = useState(false);
        const bookUrlInputRef = useRef(null);
        const chapterUrlInputRef = useRef(null);

        useEffect(() => {
            if (!RE) return;
            let loaded = null;
            if (recipeId) loaded = RE.get(recipeId);
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
            setShowExitConfirm(false);
        }, [recipeId, url]);

        const handleClosePrompt = useCallback(() => {
            if (isDirty) {
                setShowExitConfirm(true);
            } else {
                onClose?.();
            }
        }, [isDirty, onClose]);

        useEffect(() => {
            const onKeyDown = (e) => {
                if (e.key === 'Escape' || e.key === 'Esc') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (showExitConfirm) setShowExitConfirm(false);
                    else handleClosePrompt();
                }
            };
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        }, [handleClosePrompt, showExitConfirm]);

        useEffect(() => {
            if (!open || typeof window === 'undefined' || !window.OmniBackStack?.push) return undefined;
            return window.OmniBackStack.push('site-recipe-editor', () => {
                if (showExitConfirm) {
                    setShowExitConfirm(false);
                    return true;
                }
                if (activePicker) {
                    setActivePicker(null);
                    return true;
                }
                handleClosePrompt();
                return true;
            });
        }, [open, showExitConfirm, activePicker, handleClosePrompt]);

        if (!open || !RE) return null;

        if (!recipe) {
            return h('div', {
                'data-modal': 'site-recipe-editor',
                style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10050,
                    background: 'var(--p-canvas, #111318)',
                    color: 'var(--p-ink, #F5F6F8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12
                }
            }, [
                ic('Loader2', 24, 'animate-spin'),
                h('p', { style: { fontSize: 13.5, color: 'var(--p-muted)' } }, 'Loading site recipe...')
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
                        if (field === 'bookUrl' && bookUrlInputRef.current) bookUrlInputRef.current.value = text;
                        if (field === 'chapterUrl' && chapterUrlInputRef.current) chapterUrlInputRef.current.value = text;
                        updateField(field, text);
                        toast?.('Pasted link!', 'success');
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
                if (!code || typeof code !== 'string' || !code.trim()) {
                    toast?.('Clipboard is empty. Copy a recipe code or JSON first!', 'warning');
                    return;
                }
                code = code.trim();
                let imported = null;
                if (code.startsWith('{')) imported = JSON.parse(code);
                else if (RE.decodeShareCode) imported = RE.decodeShareCode(code);
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
            try { localStorage.setItem('siteRecipeAdvanced', String(val)); } catch (e) {}
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
                toast?.('Please paste a novel link below first.', 'warning');
                return;
            }
            setIsAutoDetecting(true);
            setAutoDetectStats(null);
            try {
                const res = await RE.Controller.autoDetect(targetUrl, {
                    onStart: () => toast?.('AI scanning website structure & chapters...', 'info'),
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
                        testUrls: { book: resolvedBookUrl, chapter: resolvedChapterUrl }
                    }));
                    if (bookUrlInputRef.current && resolvedBookUrl) bookUrlInputRef.current.value = resolvedBookUrl;
                    if (chapterUrlInputRef.current && resolvedChapterUrl) chapterUrlInputRef.current.value = resolvedChapterUrl;
                    setIsDirty(true);
                    setAutoDetectStats(res.stats);
                    toast?.(`Analyzed with ${res.stats?.aiEngine || 'AI'}: ${res.stats?.chaptersCount || 0} chapters!`, 'success');
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
                toast?.('Please paste a novel link below first.', 'warning');
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
                        testUrls: { book: resolvedBookUrl, chapter: resolvedChapterUrl }
                    }));
                    if (bookUrlInputRef.current && resolvedBookUrl) bookUrlInputRef.current.value = resolvedBookUrl;
                    if (chapterUrlInputRef.current && resolvedChapterUrl) chapterUrlInputRef.current.value = resolvedChapterUrl;
                    setIsDirty(true);
                    setAutoDetectStats({ ...res.stats, isScout: true });
                    toast?.('Autonomous Scout completed & recipe saved!', 'success');
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
                toast?.('Please enter a test URL above before picking.', 'warning');
                return;
            }
            setActivePicker({ target, url: pickUrl, initialSelector });
        };

        const currentBookUrl = (recipe.bookUrl !== undefined && recipe.bookUrl !== null) ? recipe.bookUrl : (recipe.testUrls?.book || '');
        const currentChapterUrl = (recipe.chapterUrl !== undefined && recipe.chapterUrl !== null) ? recipe.chapterUrl : (recipe.testUrls?.chapter || '');
        const hasAnyTestUrl = Boolean(currentBookUrl || currentChapterUrl);

        return h('div', {
            'data-modal': 'site-recipe-editor',
            style: {
                position: 'fixed',
                inset: 0,
                zIndex: 10050,
                background: 'var(--p-canvas, #111318)',
                color: 'var(--p-ink, #F5F6F8)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }
        }, [
            // Single Clean Sticky Topbar
            h('div', { key: 'header', className: 'p-topbar' }, [
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 } }, [
                    h('button', {
                        type: 'button',
                        className: 'p-icon-btn',
                        onClick: handleClosePrompt,
                        title: 'Back',
                        'aria-label': 'Close site recipe editor'
                    }, ic('ArrowLeft', 19)),
                    h('div', { style: { minWidth: 0 } }, [
                        h('div', { className: 'p-topbar-title', style: { fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, 'Site Settings & Recipe'),
                        h('div', { style: { fontSize: 11, fontFamily: monoFont, color: 'var(--p-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, recipe.name || recipe.id)
                    ])
                ]),
                h('button', {
                    type: 'button',
                    className: 'p-pill-btn is-primary',
                    style: { height: 34, padding: '0 15px', fontSize: 13 },
                    onClick: handleSave
                }, ic('Check', 14), 'Save')
            ]),

            // Scrollable Unboxed Content Body
            h('div', {
                key: 'body',
                'data-scroll': 'recipe-body',
                style: {
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 24px))'
                }
            }, [
                // Quiet inline notice strip
                h('div', { key: 'banner', className: 'omni-inline-strip', style: { marginTop: 12, lineHeight: 1.45 } },
                    isBuiltin
                        ? 'Built-in site: fields you customize override the default parser. Leave blank to keep standard extraction.'
                        : 'Custom website: paste a novel link below and tap Auto-Detect or Visual Pick to capture chapters and story text.'
                ),

                // Primary Toggles (Clean Hairline Switches)
                h('div', { key: 'toggles', style: { borderBottom: '1px solid var(--p-hairline)', marginTop: 4 } }, [
                    h('div', {
                        className: 'set-row',
                        onClick: () => updateField('enabled', recipe.enabled === false)
                    }, [
                        h('div', { style: { minWidth: 0, flex: 1 } }, [
                            h('div', { className: 'l' }, 'Enable Custom Recipe'),
                            h('div', { className: 'p-row-sub' }, recipe.id)
                        ]),
                        h('button', {
                            type: 'button',
                            className: `p-switch ${recipe.enabled !== false ? 'on' : ''}`,
                            'aria-pressed': recipe.enabled !== false,
                            onClick: (e) => { e.stopPropagation(); updateField('enabled', recipe.enabled === false); }
                        }, h('span', { className: 'p-switch-knob' }))
                    ]),
                    h('div', {
                        className: 'set-row',
                        onClick: () => toggleAdvanced(!showAdvanced)
                    }, [
                        h('div', { style: { minWidth: 0, flex: 1 } }, [
                            h('div', { className: 'l' }, 'Show CSS Selector Fields'),
                            h('div', { className: 'p-row-sub' }, 'Edit raw selectors manually alongside visual picking')
                        ]),
                        h('button', {
                            type: 'button',
                            className: `p-switch ${showAdvanced ? 'on' : ''}`,
                            'aria-pressed': !!showAdvanced,
                            onClick: (e) => { e.stopPropagation(); toggleAdvanced(!showAdvanced); }
                        }, h('span', { className: 'p-switch-knob' }))
                    ])
                ]),

                // Test Pages Section
                h('div', { key: 'sec-urls', className: 'p-section-label' }, 'Test Pages & URLs'),
                h('div', { key: 'urls-body', style: { padding: '0 16px 18px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', flexDirection: 'column', gap: 12 } }, [
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, [
                        h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)', fontWeight: 600 } }, 'Book Overview / Table of Contents URL'),
                        h('input', {
                            ref: bookUrlInputRef,
                            type: 'text',
                            inputMode: 'url',
                            autoCapitalize: 'none',
                            autoCorrect: 'off',
                            spellCheck: false,
                            className: 'p-input',
                            style: { fontFamily: monoFont, fontSize: 12.5 },
                            placeholder: 'https://example.com/novel/title',
                            value: currentBookUrl,
                            onChange: (e) => updateField('bookUrl', e.target.value),
                            onInput: (e) => updateField('bookUrl', e.target.value)
                        }),
                        h('div', { style: { display: 'flex', gap: 8 } }, [
                            h('button', { type: 'button', className: 'p-pill-btn', style: { flex: 1 }, onClick: () => pasteToField('bookUrl') }, ic('Clipboard', 13), 'Paste Link'),
                            h('button', { type: 'button', className: 'p-pill-btn', style: { flex: 1 }, onClick: () => openPicker('chapterLinks', currentBookUrl) }, ic('Search', 13), 'Inspect TOC')
                        ])
                    ]),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 } }, [
                        h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)', fontWeight: 600 } }, 'Sample Chapter URL'),
                        h('input', {
                            ref: chapterUrlInputRef,
                            type: 'text',
                            inputMode: 'url',
                            autoCapitalize: 'none',
                            autoCorrect: 'off',
                            spellCheck: false,
                            className: 'p-input',
                            style: { fontFamily: monoFont, fontSize: 12.5 },
                            placeholder: 'https://example.com/novel/title/chapter-1',
                            value: currentChapterUrl,
                            onChange: (e) => updateField('chapterUrl', e.target.value),
                            onInput: (e) => updateField('chapterUrl', e.target.value)
                        }),
                        h('div', { style: { display: 'flex', gap: 8 } }, [
                            h('button', { type: 'button', className: 'p-pill-btn', style: { flex: 1 }, onClick: () => pasteToField('chapterUrl') }, ic('Clipboard', 13), 'Paste Link'),
                            h('button', { type: 'button', className: 'p-pill-btn', style: { flex: 1 }, onClick: () => openPicker('content', currentChapterUrl) }, ic('Search', 13), 'Inspect Chapter')
                        ])
                    ]),
                    hasAnyTestUrl && h('button', {
                        type: 'button',
                        className: 'p-pill-btn',
                        style: { width: '100%', height: 38 },
                        onClick: async () => {
                            const testUrl = currentChapterUrl || currentBookUrl;
                            if (!testUrl) return;
                            const solver = window.NativeBridge?.openInAppBrowser || window.NativeBridge?.resolveCloudflare;
                            if (solver) {
                                toast?.('Opening in-app browser to pass verification...', 'info');
                                try {
                                    const res = await solver(testUrl);
                                    if (res?.success || res?.status === 'ok') toast?.('Verification passed!', 'success');
                                } catch (e) {
                                    toast?.('In-app browser closed: ' + e.message, 'warning');
                                }
                            } else {
                                window.open(testUrl, '_blank');
                            }
                        }
                    }, ic('Shield', 14), 'Open In-App Browser Check')
                ]),

                // AI Smart Auto-Detect
                h('div', { key: 'sec-ai', className: 'p-section-label' }, 'AI Auto-Detect'),
                h('div', { key: 'ai-body', style: { padding: '0 16px 18px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', flexDirection: 'column', gap: 10 } }, [
                    h('div', {
                        style: {
                            background: 'var(--p-surface, #1A1D24)',
                            borderRadius: 16,
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }
                    }, [
                        h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--p-ink)', display: 'flex', alignItems: 'center', gap: 7 } }, [
                            ic('Sparkles', 15),
                            'Automatic Structure Detection'
                        ]),
                        h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)', lineHeight: 1.45 } },
                            'Let AI inspect the URL above to discover chapters, story text, and cleanup rules automatically.'
                        ),
                        h('div', { style: { display: 'flex', gap: 8 } }, [
                            h('button', {
                                type: 'button',
                                className: 'p-pill-btn',
                                style: { flex: 1, height: 38 },
                                disabled: isAutoDetecting || isScouting,
                                onClick: handleAutoDetect
                            }, isAutoDetecting ? ic('Loader2', 13, 'animate-spin') : ic('Sparkles', 13), isAutoDetecting ? 'Scanning...' : 'Quick Detect'),
                            h('button', {
                                type: 'button',
                                className: 'p-pill-btn is-primary',
                                style: { flex: 1, height: 38, minHeight: 38 },
                                disabled: isAutoDetecting || isScouting,
                                onClick: handleRunScout
                            }, isScouting ? ic('Loader2', 13, 'animate-spin') : ic('Compass', 13), isScouting ? 'Scouting...' : 'Auto-Scout')
                        ])
                    ]),
                    isScouting && scoutProgress && h('div', { className: 'omni-inline-strip', style: { margin: 0 } }, [
                        ic('Loader2', 14, 'animate-spin'),
                        h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, scoutProgress)
                    ]),
                    autoDetectStats && h('div', { className: 'omni-inline-strip is-success', style: { margin: 0, flexDirection: 'column', alignItems: 'stretch', gap: 6 } }, [
                        h('div', { style: { fontWeight: 700 } }, `Detected ${autoDetectStats.chaptersCount || 0} chapters (~${(autoDetectStats.sampleWords || 0).toLocaleString()} words)`),
                        autoDetectStats.firstChapterName && h('div', { style: { fontSize: 11.5, opacity: 0.85 } }, `First: "${autoDetectStats.firstChapterName}"`),
                        autoDetectStats.preview && h('div', { style: { fontSize: 11.5, fontFamily: monoFont, opacity: 0.8 } }, autoDetectStats.preview.slice(0, 140))
                    ])
                ]),

                // Chapter Ingestion Strategy
                h('div', { key: 'sec-mode', className: 'p-section-label' }, 'Chapter Ingestion Strategy'),
                h('div', { key: 'mode-body', className: 'visual-tile-grid', style: { borderBottom: '1px solid var(--p-hairline)', paddingBottom: 18 } }, [
                    h('button', {
                        type: 'button',
                        className: `visual-tile ${recipe.mode === 'list' ? 'is-active' : ''}`,
                        onClick: () => updateField('mode', 'list')
                    }, [
                        h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--p-ink)' } }, 'Chapter List'),
                        h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)', lineHeight: 1.35 } }, 'Read links from novel table of contents')
                    ]),
                    h('button', {
                        type: 'button',
                        className: `visual-tile ${recipe.mode === 'next' ? 'is-active' : ''}`,
                        onClick: () => updateField('mode', 'next')
                    }, [
                        h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--p-ink)' } }, 'Next Buttons'),
                        h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)', lineHeight: 1.35 } }, 'Follow next-chapter links one by one')
                    ])
                ]),

                // Chapter Reading Elements
                h('div', { key: 'sec-el', className: 'p-section-label' }, 'Chapter Reading Elements'),
                h('div', { key: 'el-body', style: { borderBottom: '1px solid var(--p-hairline)' } }, [
                    // Content selector
                    h('div', { style: { padding: '10px 16px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', flexDirection: 'column', gap: 8 } }, [
                        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } }, [
                            h('div', { style: { minWidth: 0 } }, [
                                h('div', { className: 'p-row-title' }, 'Story Prose / Content'),
                                h('div', { className: 'p-row-sub', style: { fontFamily: monoFont, fontSize: 11 } }, recipe.chapter?.contentSelector || 'Auto-detect')
                            ]),
                            h('button', {
                                type: 'button',
                                className: 'p-pill-btn',
                                style: { color: 'var(--p-accent)' },
                                onClick: () => openPicker('content', currentChapterUrl, recipe.chapter?.contentSelector)
                            }, ic('Search', 13), 'Pick')
                        ]),
                        showAdvanced && h('input', {
                            type: 'text',
                            className: 'p-input',
                            style: { fontFamily: monoFont, fontSize: 12 },
                            placeholder: '.chapter-content, #story-text',
                            value: recipe.chapter?.contentSelector || '',
                            onChange: (e) => updateField('chapter.contentSelector', e.target.value)
                        })
                    ]),
                    // Title selector
                    h('div', { style: { padding: '10px 16px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', flexDirection: 'column', gap: 8 } }, [
                        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } }, [
                            h('div', { style: { minWidth: 0 } }, [
                                h('div', { className: 'p-row-title' }, 'Chapter Title'),
                                h('div', { className: 'p-row-sub', style: { fontFamily: monoFont, fontSize: 11 } }, recipe.chapter?.titleSelector || 'Auto-detect')
                            ]),
                            h('button', {
                                type: 'button',
                                className: 'p-pill-btn',
                                style: { color: 'var(--p-accent)' },
                                onClick: () => openPicker('chapterTitle', currentChapterUrl, recipe.chapter?.titleSelector)
                            }, ic('Search', 13), 'Pick')
                        ]),
                        showAdvanced && h('input', {
                            type: 'text',
                            className: 'p-input',
                            style: { fontFamily: monoFont, fontSize: 12 },
                            placeholder: 'h1.chapter-title',
                            value: recipe.chapter?.titleSelector || '',
                            onChange: (e) => updateField('chapter.titleSelector', e.target.value)
                        })
                    ]),
                    // Remove selector
                    h('div', { style: { padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 } }, [
                        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } }, [
                            h('div', { style: { minWidth: 0 } }, [
                                h('div', { className: 'p-row-title' }, 'Elements to Remove'),
                                h('div', { className: 'p-row-sub', style: { fontFamily: monoFont, fontSize: 11 } }, recipe.chapter?.removeSelector || 'Ads, notices & watermarks')
                            ]),
                            h('button', {
                                type: 'button',
                                className: 'p-pill-btn is-danger',
                                onClick: () => openPicker('remove', currentChapterUrl)
                            }, ic('Trash2', 13), 'Remove')
                        ]),
                        showAdvanced && h('input', {
                            type: 'text',
                            className: 'p-input',
                            style: { fontFamily: monoFont, fontSize: 12 },
                            placeholder: '.ad-box, .notice-bar, .social-share',
                            value: recipe.chapter?.removeSelector || '',
                            onChange: (e) => updateField('chapter.removeSelector', e.target.value)
                        })
                    ])
                ]),

                // Courtesy Delay & Safety
                h('div', { key: 'sec-net', className: 'p-section-label' }, 'Courtesy Delay & Safety'),
                h('div', { key: 'net-body', style: { borderBottom: '1px solid var(--p-hairline)' } }, [
                    h('div', { className: 'set-row', onClick: () => updateField('cleanup.removeNavText', recipe.cleanup?.removeNavText === false) }, [
                        h('span', { className: 'l' }, 'Remove inline Prev / Next nav text'),
                        h('button', {
                            type: 'button',
                            className: `p-switch ${recipe.cleanup?.removeNavText !== false ? 'on' : ''}`,
                            onClick: (e) => { e.stopPropagation(); updateField('cleanup.removeNavText', recipe.cleanup?.removeNavText === false); }
                        }, h('span', { className: 'p-switch-knob' }))
                    ]),
                    h('div', { className: 'set-row', onClick: () => updateField('network.skipBroken', !recipe.network?.skipBroken) }, [
                        h('span', { className: 'l' }, 'Skip broken 404 chapters'),
                        h('button', {
                            type: 'button',
                            className: `p-switch ${recipe.network?.skipBroken ? 'on' : ''}`,
                            onClick: (e) => { e.stopPropagation(); updateField('network.skipBroken', !recipe.network?.skipBroken); }
                        }, h('span', { className: 'p-switch-knob' }))
                    ]),
                    h('div', { style: { padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 } }, [
                        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 } }, [
                            h('span', { style: { color: 'var(--p-ink)' } }, 'Delay between chapters'),
                            h('span', { style: { fontFamily: monoFont, color: 'var(--p-accent)', fontWeight: 700 } }, recipe.network?.delayMs ? `${recipe.network.delayMs / 1000}s` : 'Off (0s)')
                        ]),
                        h('input', {
                            type: 'range',
                            min: 0,
                            max: 10000,
                            step: 500,
                            value: recipe.network?.delayMs || 0,
                            onChange: (e) => updateField('network.delayMs', parseInt(e.target.value, 10)),
                            style: { width: '100%', accentColor: 'var(--p-accent)' }
                        })
                    ])
                ]),

                // Test Recipe Rules
                h('div', { key: 'sec-test', className: 'omni-section-label-row' }, [
                    h('span', { className: 'omni-section-label' }, 'Test Recipe Rules'),
                    h('button', {
                        type: 'button',
                        className: 'p-pill-btn is-primary',
                        style: { height: 32, minHeight: 32, padding: '0 14px', fontSize: 12 },
                        disabled: isTesting,
                        onClick: handleRunTest
                    }, ic('Play', 12), isTesting ? 'Testing...' : 'Run Test')
                ]),
                testResult && h('div', {
                    key: 'test-res',
                    style: {
                        margin: '4px 16px 14px',
                        padding: 14,
                        borderRadius: 14,
                        background: 'var(--p-surface, #1A1D24)',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: 'var(--p-muted)'
                    }
                }, [
                    testResult.error && h('div', { style: { color: '#FCA5A5', fontWeight: 700 } }, `Error: ${testResult.error}`),
                    testResult.book && h('div', { style: { marginBottom: 8 } }, [
                        h('div', { style: { fontWeight: 700, color: 'var(--p-ink)' } }, `Title: ${testResult.book.title || 'Untitled'}`),
                        h('div', null, `Author: ${testResult.book.author || 'Unknown'} · Chapters: ${testResult.book.chapterCount || 0}`)
                    ]),
                    testResult.chapter && h('div', { style: { paddingTop: 8, borderTop: '1px solid var(--p-hairline)' } }, [
                        h('div', { style: { fontWeight: 700, color: 'var(--p-ink)' } }, `Preview: ${testResult.chapter.title || 'Chapter'} (${testResult.chapter.words || testResult.chapter.wordCount || 0} words)`),
                        h('div', { style: { fontFamily: monoFont, fontSize: 11.5, marginTop: 4 } }, String(testResult.chapter.preview || '').slice(0, 220))
                    ])
                ]),

                // Share & Manage Actions (Clean Hairline Rows)
                h('div', { key: 'sec-share', className: 'p-section-label' }, 'Share & Manage Recipe'),
                h('div', { key: 'share-list' }, [
                    h('button', { type: 'button', className: 'p-row', onClick: () => RE.Controller.copyCode(recipe, toast) }, [
                        ic('Copy', 17),
                        h('div', { style: { flex: 1 } }, h('div', { className: 'p-row-title' }, 'Copy Share Code'))
                    ]),
                    h('button', { type: 'button', className: 'p-row', onClick: () => RE.Controller.exportFile(recipe, toast) }, [
                        ic('Download', 17),
                        h('div', { style: { flex: 1 } }, h('div', { className: 'p-row-title' }, 'Export Recipe JSON'))
                    ]),
                    h('button', { type: 'button', className: 'p-row', onClick: handlePasteRecipeCode }, [
                        ic('Clipboard', 17),
                        h('div', { style: { flex: 1 } }, h('div', { className: 'p-row-title' }, 'Paste Recipe Code'))
                    ]),
                    h('label', { className: 'p-row', style: { cursor: 'pointer' } }, [
                        ic('Upload', 17),
                        h('div', { style: { flex: 1 } }, h('div', { className: 'p-row-title' }, 'Import Recipe JSON')),
                        h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: handleImportRecipeFile })
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'p-row',
                        style: { color: '#FCA5A5' },
                        onClick: () => {
                            confirmAction?.(`Delete recipe for "${recipe.id}"?`, async () => {
                                await RE.remove(recipe.id);
                                toast?.(`Deleted recipe for ${recipe.id}`, 'info');
                                onClose?.();
                            });
                        }
                    }, [
                        ic('Trash2', 17),
                        h('div', { style: { flex: 1 } }, h('div', { className: 'p-row-title', style: { color: '#FCA5A5' } }, 'Delete Recipe'))
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
            }),

            // Unsaved Changes Exit Confirmation Bottom Sheet
            showExitConfirm && h('div', {
                key: 'exit-confirm-modal',
                className: 'omni-sheet-backdrop',
                style: { position: 'fixed', inset: 0, zIndex: 10100 },
                onClick: () => setShowExitConfirm(false)
            }, [
                h('div', {
                    className: 'omni-sheet',
                    style: { padding: '12px 20px calc(24px + env(safe-area-inset-bottom, 0px))' },
                    onClick: (e) => e.stopPropagation()
                }, [
                    h('div', { className: 'p-sheet-handle' }),
                    h('div', { style: { fontSize: 17, fontWeight: 700, color: 'var(--p-ink)', marginBottom: 6 } }, 'Exit Without Saving?'),
                    h('div', { style: { fontSize: 13.5, color: 'var(--p-muted)', lineHeight: 1.45, marginBottom: 18 } },
                        'You have unsaved changes to this site recipe. Leave now to discard them.'
                    ),
                    h('div', { style: { display: 'flex', gap: 10 } }, [
                        h('button', {
                            type: 'button',
                            className: 'p-pill-btn',
                            style: { flex: 1, height: 42 },
                            onClick: () => setShowExitConfirm(false)
                        }, 'Keep Editing'),
                        h('button', {
                            type: 'button',
                            className: 'p-pill-btn is-danger',
                            style: { flex: 1, height: 42 },
                            onClick: () => { setShowExitConfirm(false); onClose?.(); }
                        }, 'Discard')
                    ])
                ])
            ])
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. SETTINGS RECIPE MANAGER LIST (Completely Unboxed)
    // ══════════════════════════════════════════════════════════════════════
    function SiteRecipeManagerCard({ toast, confirmAction, openSiteRecipeEditor }) {
        const RE = window.SiteRecipeEngine;
        const [recipes, setRecipes] = useState([]);
        const [tick, setTick] = useState(0);

        useEffect(() => {
            if (!RE) return;
            RE.ready().then(() => setRecipes(RE.getAll()));
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

        return h('div', { style: { paddingTop: 6 } }, [
            h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)', marginBottom: 12, lineHeight: 1.45 } },
                'Custom HTML extraction rules and cleanup overrides for websites.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } }, [
                h('button', {
                    type: 'button',
                    className: 'p-pill-btn is-primary',
                    style: { height: 34, minHeight: 34, padding: '0 14px', fontSize: 12.5 },
                    onClick: () => openSiteRecipeEditor?.({})
                }, ic('Plus', 14), 'New Recipe'),
                h('button', {
                    type: 'button',
                    className: 'p-pill-btn',
                    onClick: handlePasteRecipe
                }, ic('Clipboard', 13), 'Paste Code'),
                h('button', {
                    type: 'button',
                    className: 'p-pill-btn',
                    onClick: handleImportFile
                }, ic('Folder', 13), 'Import File')
            ]),

            recipes.length === 0 ? h('div', {
                style: { padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--p-dim)' }
            }, 'No custom site recipes yet. Tap New Recipe above to create one.')
            : h('div', null, recipes.map(r => {
                const isBuiltin = RE?.isBuiltInSite(r.id);
                return h('div', {
                    key: r.id,
                    className: 'omni-hairline-row',
                    onClick: () => openSiteRecipeEditor?.({ recipeId: r.id })
                }, [
                    h('div', { style: { flex: 1, minWidth: 0 } }, [
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, [
                            h('span', { className: 'p-row-title', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, r.name || r.id),
                            h('span', { className: 'badge' }, isBuiltin ? 'Override' : 'Custom')
                        ]),
                        h('div', { className: 'p-row-sub', style: { fontFamily: monoFont, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, r.id)
                    ]),
                    h('button', {
                        type: 'button',
                        className: 'p-icon-btn',
                        style: { color: '#FCA5A5' },
                        title: 'Delete recipe',
                        onClick: (e) => {
                            e.stopPropagation();
                            confirmAction?.(`Delete recipe for "${r.id}"?`, async () => {
                                await RE.remove(r.id);
                                refresh();
                                toast?.(`Deleted recipe for ${r.id}`, 'info');
                            });
                        }
                    }, ic('Trash2', 16))
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
