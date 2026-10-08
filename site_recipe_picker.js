/**
 * Site Recipe Visual Picker Engine (Zero-Build UMD)
 * Interactive tap-to-pick selector generator with sandboxed iframe preview
 */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
        if (typeof global !== 'undefined') {
            global.SitePicker = module.exports;
            global.SiteRecipePicker = module.exports;
        }
    } else {
        root.SitePicker = factory();
        root.SiteRecipePicker = root.SitePicker;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function cssEscape(str) {
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            return CSS.escape(str);
        }
        return String(str).replace(/([ !"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    function isStableClass(c) {
        if (!c || typeof c !== 'string') return false;
        if (/^gt-pick/.test(c)) return false;
        if (/\d{3,}/.test(c)) return false;
        if (c.length > 40) return false;

        const lower = c.toLowerCase();
        const volatile = [
            'active', 'selected', 'hover', 'focus', 'show', 'open', 'odd', 'even',
            'first', 'last', 'clearfix', 'row', 'hidden', 'visible', 'loading'
        ];
        if (volatile.includes(lower)) return false;
        if (/^(col[-_]|container[-_]|ng-|css-|sc-|jsx-)/i.test(c)) return false;
        return true;
    }

    function isStableId(id) {
        if (!id || typeof id !== 'string') return false;
        if (id.length > 50) return false;
        if (/\d{4,}/.test(id)) return false;
        if (/^[a-f0-9\-]{16,}$/i.test(id)) return false;
        if (/^gt-pick/.test(id)) return false;
        return true;
    }

    function step(el) {
        if (!el || !el.tagName) return '*';
        const tag = el.tagName.toLowerCase();
        if (el.id && isStableId(el.id)) {
            return tag + '#' + cssEscape(el.id);
        }
        const classes = Array.from(el.classList || [])
            .filter(isStableClass)
            .slice(0, 2);
        if (classes.length > 0) {
            return tag + '.' + classes.map(cssEscape).join('.');
        }
        return tag;
    }

    function queryCount(doc, selector) {
        if (!doc || !selector) return 0;
        try {
            if (typeof window !== 'undefined' && typeof window.safeQuerySelectorAll === 'function') {
                const matches = window.safeQuerySelectorAll(selector, doc);
                return matches ? matches.length : 0;
            }
            return doc.querySelectorAll(selector).length;
        } catch (_) {
            return 0;
        }
    }

    function queryAll(doc, selector) {
        if (!doc || !selector) return [];
        try {
            if (typeof window !== 'undefined' && typeof window.safeQuerySelectorAll === 'function') {
                const matches = window.safeQuerySelectorAll(selector, doc);
                return matches ? Array.from(matches) : [];
            }
            return Array.from(doc.querySelectorAll(selector));
        } catch (_) {
            return [];
        }
    }

    function uniqueSelector(el, doc) {
        if (!el || !el.tagName) return '';
        const targetDoc = doc || el.ownerDocument;
        if (!targetDoc) return el.tagName.toLowerCase();

        // 1. Unique stable ID check
        if (el.id && isStableId(el.id)) {
            const idSel = '#' + cssEscape(el.id);
            if (queryCount(targetDoc, idSel) === 1) {
                return idSel;
            }
        }

        // 2. Ascend parent chain
        const parts = [step(el)];
        let cur = el;
        let depth = 0;

        while (queryCount(targetDoc, parts.join(' ')) !== 1 && cur.parentElement && depth < 6) {
            cur = cur.parentElement;
            depth++;
            const parentTag = (cur.tagName || '').toLowerCase();
            if (parentTag === 'body' || parentTag === 'html') break;

            parts.unshift(step(cur));
            if (cur.id && isStableId(cur.id)) break;
        }

        let fullSel = parts.join(' ');
        if (queryCount(targetDoc, fullSel) === 1) {
            return fullSel;
        }

        // 3. Fallback to :nth-of-type
        if (el.parentElement) {
            let index = 1;
            let sibling = el.previousElementSibling;
            while (sibling) {
                if (sibling.tagName === el.tagName) index++;
                sibling = sibling.previousElementSibling;
            }
            const indexedLast = parts[parts.length - 1] + `:nth-of-type(${index})`;
            const indexedParts = [...parts.slice(0, -1), indexedLast];
            const indexedSel = indexedParts.join(' ');
            if (queryCount(targetDoc, indexedSel) === 1) {
                return indexedSel;
            }
            return indexedSel;
        }

        return fullSel;
    }

    function groupSelector(aEl, level, doc) {
        if (!aEl) return { selector: 'a[href]', count: 0 };
        const targetDoc = doc || aEl.ownerDocument;
        const link = aEl.tagName.toLowerCase() === 'a' ? aEl : aEl.closest('a[href]');
        if (!link) return { selector: 'a[href]', count: 0 };

        const ancestors = [];
        let curr = link.parentElement;
        while (curr && ancestors.length < 5) {
            const tag = (curr.tagName || '').toLowerCase();
            if (tag === 'body' || tag === 'html') break;
            ancestors.push(curr);
            curr = curr.parentElement;
        }

        const startIdx = Math.max(0, Math.min(level || 0, ancestors.length - 1));
        for (let i = startIdx; i < ancestors.length; i++) {
            const ancestor = ancestors[i];
            const ancestorSel = uniqueSelector(ancestor, targetDoc);
            const candidateSel = ancestorSel + ' a[href]';
            const count = queryCount(targetDoc, candidateSel);
            if (count >= 2) {
                return { selector: candidateSel, count, container: ancestor };
            }
        }

        // Fallback: look for closest list/table/nav container
        const container = link.closest('ul, ol, table, nav, section, div');
        if (container) {
            const containerSel = uniqueSelector(container, targetDoc);
            const candidateSel = containerSel + ' a[href]';
            const count = queryCount(targetDoc, candidateSel);
            if (count >= 2) {
                return { selector: candidateSel, count, container };
            }
        }

        return { selector: 'a[href]', count: queryCount(targetDoc, 'a[href]') };
    }

    function buildPreviewDoc(html, baseUrl) {
        let cleanHtml = html || '';
        if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            try {
                cleanHtml = window.DOMPurify.sanitize(cleanHtml, {
                    WHOLE_DOCUMENT: true,
                    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
                    FORBID_ATTR: ['srcset', 'on*']
                });
            } catch (e) {
                console.warn('[SitePicker] DOMPurify error, using raw html:', e);
            }
        }

        const baseTag = baseUrl ? `<base href="${baseUrl}">` : '';
        const styleTag = `
<style>
.gt-pick-hover { outline: 2px dashed #3b82f6 !important; outline-offset: 1px !important; }
.gt-pick-sel { outline: 3px solid #22c55e !important; outline-offset: 2px !important; background: rgba(34, 197, 94, 0.12) !important; }
.gt-pick-remove { outline: 3px solid #ef4444 !important; outline-offset: 2px !important; background: rgba(239, 68, 68, 0.15) !important; opacity: 0.6 !important; }
a { pointer-events: auto !important; }
html, body { cursor: pointer !important; }
</style>`;

        if (cleanHtml.includes('</head>')) {
            cleanHtml = cleanHtml.replace('</head>', `${baseTag}${styleTag}</head>`);
        } else if (cleanHtml.includes('<body')) {
            cleanHtml = cleanHtml.replace('<body', `${baseTag}${styleTag}<body`);
        } else {
            cleanHtml = `${baseTag}${styleTag}` + cleanHtml;
        }

        return cleanHtml;
    }

    function attach(iframe, options = {}) {
        const { target, onChange, initialSelector } = options;
        let activeDoc = null;
        try {
            activeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        } catch (e) {
            console.warn('[SitePicker] Failed to access iframe document:', e);
            return null;
        }

        if (!activeDoc) return null;

        let selectedElements = [];
        let ancestorStack = [];
        let currentStackIndex = 0;
        let groupLevel = 0;
        let removeSelectors = Array.isArray(options.initialRemoveSelectors) ? [...options.initialRemoveSelectors] : [];

        function clearHighlights() {
            if (!activeDoc) return;
            const highlighted = activeDoc.querySelectorAll('.gt-pick-hover, .gt-pick-sel, .gt-pick-remove');
            for (const el of highlighted) {
                el.classList.remove('gt-pick-hover', 'gt-pick-sel', 'gt-pick-remove');
            }
        }

        function highlightElements(els, className) {
            for (const el of els) {
                if (el && el.classList) el.classList.add(className);
            }
        }

        function handleClick(e) {
            e.preventDefault();
            e.stopPropagation();

            const clicked = e.target;
            if (!clicked || clicked === activeDoc.body || clicked === activeDoc.documentElement) return;

            if (target === 'chapterLinks') {
                const link = clicked.closest('a[href]') || clicked;
                groupLevel = 0;
                const grp = groupSelector(link, groupLevel, activeDoc);
                clearHighlights();
                selectedElements = queryAll(activeDoc, grp.selector);
                highlightElements(selectedElements, 'gt-pick-sel');

                const links = selectedElements;
                const first = links.length > 0 ? (links[0].textContent || '').trim() : '';
                const last = links.length > 1 ? (links[links.length - 1].textContent || '').trim() : '';

                onChange?.({
                    selector: grp.selector,
                    count: grp.count,
                    first,
                    last,
                    target
                });
                return;
            }

            if (target === 'remove') {
                const sel = uniqueSelector(clicked, activeDoc);
                if (clicked.classList.contains('gt-pick-remove')) {
                    clicked.classList.remove('gt-pick-remove');
                    removeSelectors = removeSelectors.filter(s => s !== sel);
                } else {
                    clicked.classList.add('gt-pick-remove');
                    if (!removeSelectors.includes(sel)) removeSelectors.push(sel);
                }
                onChange?.({
                    selectors: removeSelectors,
                    count: removeSelectors.length,
                    target
                });
                return;
            }

            // Single target selection (content, title, author, cover, etc.)
            ancestorStack = [];
            let curr = clicked;
            while (curr && curr !== activeDoc.body && curr !== activeDoc.documentElement && ancestorStack.length < 8) {
                ancestorStack.push(curr);
                curr = curr.parentElement;
            }
            currentStackIndex = 0;

            const selected = ancestorStack[0];
            const sel = uniqueSelector(selected, activeDoc);
            clearHighlights();
            selected.classList.add('gt-pick-sel');
            selectedElements = [selected];

            const sampleText = (selected.textContent || '').trim().slice(0, 300);
            const words = sampleText.split(/\s+/).filter(Boolean).length;
            const count = queryCount(activeDoc, sel);

            onChange?.({
                selector: sel,
                count,
                sampleText,
                words,
                target
            });
        }

        function handleMouseOver(e) {
            const targetEl = e.target;
            if (!targetEl || targetEl === activeDoc.body || targetEl === activeDoc.documentElement) return;
            targetEl.classList.add('gt-pick-hover');
        }

        function handleMouseOut(e) {
            const targetEl = e.target;
            if (targetEl && targetEl.classList) {
                targetEl.classList.remove('gt-pick-hover');
            }
        }

        // Attach listeners to iframe document
        activeDoc.addEventListener('click', handleClick, true);
        activeDoc.addEventListener('mouseover', handleMouseOver, true);
        activeDoc.addEventListener('mouseout', handleMouseOut, true);

        // Apply initial selector if provided
        if (initialSelector) {
            applySelector(initialSelector);
        }

        function applySelector(selector) {
            if (!activeDoc || !selector) return;
            clearHighlights();
            const matches = queryAll(activeDoc, selector);
            selectedElements = matches;
            const cls = (target === 'remove') ? 'gt-pick-remove' : 'gt-pick-sel';
            highlightElements(matches, cls);
        }

        function bigger() {
            if (target === 'chapterLinks') {
                groupLevel++;
                if (selectedElements.length > 0) {
                    const first = selectedElements[0];
                    const grp = groupSelector(first, groupLevel, activeDoc);
                    clearHighlights();
                    selectedElements = queryAll(activeDoc, grp.selector);
                    highlightElements(selectedElements, 'gt-pick-sel');
                    onChange?.({
                        selector: grp.selector,
                        count: grp.count,
                        first: selectedElements[0]?.textContent?.trim() || '',
                        last: selectedElements[selectedElements.length - 1]?.textContent?.trim() || '',
                        target
                    });
                }
                return;
            }

            if (ancestorStack.length > 0 && currentStackIndex < ancestorStack.length - 1) {
                currentStackIndex++;
                const parentEl = ancestorStack[currentStackIndex];
                const sel = uniqueSelector(parentEl, activeDoc);
                clearHighlights();
                parentEl.classList.add('gt-pick-sel');
                selectedElements = [parentEl];

                const sampleText = (parentEl.textContent || '').trim().slice(0, 300);
                const words = sampleText.split(/\s+/).filter(Boolean).length;
                onChange?.({
                    selector: sel,
                    count: queryCount(activeDoc, sel),
                    sampleText,
                    words,
                    target
                });
            }
        }

        function smaller() {
            if (target === 'chapterLinks') {
                if (groupLevel > 0) {
                    groupLevel--;
                    if (selectedElements.length > 0) {
                        const first = selectedElements[0];
                        const grp = groupSelector(first, groupLevel, activeDoc);
                        clearHighlights();
                        selectedElements = queryAll(activeDoc, grp.selector);
                        highlightElements(selectedElements, 'gt-pick-sel');
                        onChange?.({
                            selector: grp.selector,
                            count: grp.count,
                            first: selectedElements[0]?.textContent?.trim() || '',
                            last: selectedElements[selectedElements.length - 1]?.textContent?.trim() || '',
                            target
                        });
                    }
                }
                return;
            }

            if (currentStackIndex > 0) {
                currentStackIndex--;
                const childEl = ancestorStack[currentStackIndex];
                const sel = uniqueSelector(childEl, activeDoc);
                clearHighlights();
                childEl.classList.add('gt-pick-sel');
                selectedElements = [childEl];

                const sampleText = (childEl.textContent || '').trim().slice(0, 300);
                const words = sampleText.split(/\s+/).filter(Boolean).length;
                onChange?.({
                    selector: sel,
                    count: queryCount(activeDoc, sel),
                    sampleText,
                    words,
                    target
                });
            }
        }

        function detach() {
            if (!activeDoc) return;
            activeDoc.removeEventListener('click', handleClick, true);
            activeDoc.removeEventListener('mouseover', handleMouseOver, true);
            activeDoc.removeEventListener('mouseout', handleMouseOut, true);
            clearHighlights();
            activeDoc = null;
        }

        return {
            bigger,
            smaller,
            applySelector,
            clearHighlights,
            detach
        };
    }

    return {
        buildPreviewDoc,
        uniqueSelector,
        groupSelector,
        isStableClass,
        isStableId,
        attach
    };
}));
