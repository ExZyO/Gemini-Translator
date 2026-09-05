// ══════════════════════════════════════════════════════════════════════════
// Universal Light Novel & Fanfiction Crawler Engine (lncrawl Architecture)
// Supports: AO3, Lofter, WitchCult, Syosetu, Kakuyomu, RoyalRoad, ScribbleHub,
// NovelFull, Madara WP Novels, Blogspot, 69shu/Biquge, Tumblr & Universal
// ══════════════════════════════════════════════════════════════════════════
(function() {

    // ══════════════════════════════════════════════════════════════════════
    // 1. BEST-QUALITY IMAGE EXTRACTION (Original Lossless Illustrations)
    // ══════════════════════════════════════════════════════════════════════
    function getBestImageUrl(imgTagOrObj, baseUrl) {
        if (!imgTagOrObj) return '';
        let src = '';
        let orig = '';
        let large = '';
        let actual = '';
        let srcset = '';

        if (typeof imgTagOrObj === 'string') {
            const tag = imgTagOrObj;
            orig = (tag.match(/data-orig-file=["']([^"']+)["']/i) || [])[1] || '';
            large = (tag.match(/data-large-file=["']([^"']+)["']/i) || [])[1] || '';
            actual = (tag.match(/data-(?:original|actualsrc|src|lazy-src)=["']([^"']+)["']/i) || [])[1] || '';
            srcset = (tag.match(/srcset=["']([^"']+)["']/i) || [])[1] || '';
            src = (tag.match(/src=["']([^"']+)["']/i) || [])[1] || '';
        } else if (typeof imgTagOrObj === 'object') {
            orig = imgTagOrObj.getAttribute?.('data-orig-file') || '';
            large = imgTagOrObj.getAttribute?.('data-large-file') || '';
            actual = imgTagOrObj.getAttribute?.('data-original') || imgTagOrObj.getAttribute?.('data-actualsrc') || imgTagOrObj.getAttribute?.('data-src') || '';
            srcset = imgTagOrObj.getAttribute?.('srcset') || '';
            src = imgTagOrObj.getAttribute?.('src') || '';
        }

        let best = orig || large || actual;

        if (!best && srcset) {
            const entries = srcset.split(',').map(s => s.trim().split(/\s+/)).filter(e => e.length > 0);
            if (entries.length > 0) {
                entries.sort((a, b) => {
                    const valA = parseInt(a[1] || '0', 10);
                    const valB = parseInt(b[1] || '0', 10);
                    return valB - valA;
                });
                best = entries[0][0];
            }
        }

        if (!best) best = src;
        if (!best || best.startsWith('data:image/svg') || 
            best.includes('avatar') || best.includes('emoji') || best.includes('gravatar') ||
            best.includes('s.w.org') || best.includes('pixel.wp.com') || best.includes('widgets') ||
            best.includes('badge') || best.includes('button') || best.includes('icon') ||
            best.includes('paypal') || best.includes('patreon') || best.includes('discord') ||
            best.includes('sharedaddy') || best.includes('logo') || best.includes('banner') ||
            best.includes('smilies') || best.includes('reaction') || best.includes('jp-carousel') ||
            best.includes('advertisement') || best.includes('rating')) return '';

        // Resolve relative URLs if baseUrl provided & aggressively sanitize malformed host/path spaces (e.g., 'https://img. lnori. com/ 13125-06. jpg')
        best = best.trim()
            .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, '')) // Remove spaces inside hostname
            .replace(/^https?:\/\/[^\/]+\/\s+/i, (m) => m.trim()) // Remove leading slash spaces
            .replace(/\s+/g, '') // Strip remaining interior whitespace in image URL
            .replace(/\.jppg$/i, '.jpg');

        if (baseUrl && (best.startsWith('/') || best.startsWith('./') || !/^https?:\/\//i.test(best))) {
            try {
                best = new URL(best, baseUrl).href;
            } catch (e) {}
        } else if (best.startsWith('//')) {
            best = 'https:' + best;
        }

        // Strip resize/thumbnail query params for full original uncompressed resolution
        if (best.includes('wp.com') || best.includes('wordpress.com') || best.includes('witchculttranslation.com')) {
            best = best.replace(/\?w=\d+.*$/i, '').replace(/\?resize=\d+.*$/i, '').replace(/\?fit=\d+.*$/i, '');
        } else if (best.includes('127.net') || best.includes('lofter.com')) {
            best = best.replace(/\?imageView.*$/i, '');
        } else if (best.includes('tumblr.com')) {
            best = best.replace(/_\d+\.(jpg|png|webp|gif)/i, '_1280.$1');
        }

        return best.trim();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. TEXT CLEANING & ILLUSTRATION PRESERVATION
    // ══════════════════════════════════════════════════════════════════════
    function cleanChapterHtmlWithImages(html, baseUrl) {
        if (!html) return '';

        let processed = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<div[^>]*class="[^"]*(?:sharedaddy|wpcnt|nav-links|post-navigation|likes-widget|ads|advertisement|report-chapter)[^"]*"[\s\S]*?<\/div>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?Next Post[\s\S]*?<\/p>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?Previous Post[\s\S]*?<\/p>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?(?:Read light novel|Lightnovelpub|NovelFull|Boxnovel)[\s\S]*?<\/p>/gi, '');

        // 1. Convert linked image wrappers <a href="..."><img .../></a> or <a href="...">[Download Image]</a>
        processed = processed.replace(/<a\s+([^>]+)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
            const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
            const dataSrcMatch = attrs.match(/data-(?:original|src|url)=["']([^"']+)["']/i);
            let targetUrl = hrefMatch ? hrefMatch[1] : (dataSrcMatch ? dataSrcMatch[1] : '');

            const isImageLink = /\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"']*)?$/i.test(targetUrl) || 
                                /<img\b/i.test(inner) || 
                                /[\[\(]?\s*(?:Download|View|High-Res|Full Size|Original)\s*(?:Image|Illustration|Art|Resolution)?[\]\)]?/i.test(inner.trim());

            if (isImageLink) {
                let imgUrl = '';
                if (/<img\b/i.test(inner)) {
                    imgUrl = getBestImageUrl(inner, baseUrl);
                }
                if (!imgUrl && targetUrl) {
                    // Aggressively clean spaces, host spaces (e.g. 'https://img. lnori. com/ 13125-06. jpg') and typos
                    imgUrl = targetUrl.trim()
                        .replace(/^(https?:\/\/)([^/]+)/i, (m, proto, host) => proto + host.replace(/\s+/g, ''))
                        .replace(/\s+/g, '')
                        .replace(/\?w=\d+.*$/i, '').replace(/\?resize=\d+.*$/i, '').replace(/\?fit=\d+.*$/i, '');

                    if (baseUrl && (imgUrl.startsWith('/') || imgUrl.startsWith('./') || !/^https?:\/\//i.test(imgUrl))) {
                        try { imgUrl = new URL(imgUrl, baseUrl).href; } catch (e) {}
                    } else if (imgUrl.startsWith('//')) {
                        imgUrl = 'https:' + imgUrl;
                    }
                    imgUrl = imgUrl.replace(/\.jppg$/i, '.jpg');
                }
                if (imgUrl && (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('data:image/'))) {
                    return '\n\n![Illustration](' + imgUrl.trim() + ')\n\n';
                }
            }
            return match;
        });

        // 2. Preserve remaining direct <img> tags
        processed = processed.replace(/<img\b[^>]*>/gi, (match) => {
            const bestUrl = getBestImageUrl(match, baseUrl);
            if (bestUrl && (bestUrl.startsWith('http://') || bestUrl.startsWith('https://') || bestUrl.startsWith('data:image/'))) {
                return '\n\n![Illustration](' + bestUrl + ')\n\n';
            }
            return '';
        });

        // 3. Strip all residual "[Download Image]", "Download Image", "[View Image]" anchor text artifacts
        processed = processed.replace(/[\[\(]?\s*(?:Download|View|High-Res|Full Size|Original)\s*(?:Image|Illustration|Art|Resolution)?[\]\)]?/gi, '');

        return processed
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n### $1\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&#8216;/g, "'")
            .replace(/&#8217;/g, "'")
            .replace(/&#8220;/g, '"')
            .replace(/&#8221;/g, '"')
            .replace(/&#8211;/g, '–')
            .replace(/&#8212;/g, '—')
            .replace(/&#8230;/g, '…')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s+\n/g, '\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. UNIFIED HTTP NETWORK CLIENT (LOCAL DIRECT PROXY, NATIVE BRIDGE & MULTI-PROXY)
    // ══════════════════════════════════════════════════════════════════════
    let localProxyState = null; // null = unverified, true = active, false = unavailable
    let lastLocalProxyCheck = 0;

    function isBlockOrChallenge(text) {
        if (!text || typeof text !== 'string' || text.length < 80) return true;
        const lower = text.toLowerCase();
        // Detect genuine Cloudflare rate limit (1015) or block/challenge pages
        if (lower.includes('error 1015') || (lower.includes('rate limit') && lower.includes('cloudflare'))) return true;
        if (lower.includes('<title>just a moment...</title>') || lower.includes('attention required! | cloudflare') || lower.includes('cf-browser-verification')) return true;
        if (lower.includes('401 unauthorized') || lower.includes('403 forbidden')) return true;
        // If it's a tiny page containing Cloudflare challenge scripts without chapter content, it's a challenge interstitial
        if (text.length < 3000 && lower.includes('/cdn-cgi/challenge-platform') && !lower.includes('id="content"') && !lower.includes('class="chapter-content"') && !lower.includes('class="entry-content"')) return true;
        return false;
    }

    async function fetchHtml(url, options = {}) {
        const timeoutMs = options.timeout || 25000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        // 1. Android Native Bridge (Zero CORS / Full Chromium Engine)
        if (window.NativeBridge && window.NativeBridge.fetchNative) {
            try {
                const res = await Promise.race([
                    window.NativeBridge.fetchNative(url, options),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Native fetch timed out')), timeoutMs))
                ]);
                if (res && res.data) {
                    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    if (!isBlockOrChallenge(text)) {
                        clearTimeout(timer);
                        return text;
                    }
                }
            } catch (e) {
                console.warn('NativeBridge fetch error, fallback to proxy:', e);
            }
        }

        // 2. High-Speed Local Direct-Socket Proxy (lncrawl Parity on Desktop)
        // Runs on http://127.0.0.1:9090 when running alongside telemetry-server.js
        const now = Date.now();
        if (localProxyState !== false || (now - lastLocalProxyCheck > 30000)) {
            try {
                lastLocalProxyCheck = now;
                const localCtrl = new AbortController();
                const localTimer = setTimeout(() => localCtrl.abort(), 6500);
                const localRes = await fetch(`http://127.0.0.1:9090/proxy?url=${encodeURIComponent(url)}`, {
                    signal: localCtrl.signal,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body
                });
                clearTimeout(localTimer);
                if (localRes.ok) {
                    const text = await localRes.text();
                    if (!isBlockOrChallenge(text)) {
                        localProxyState = true;
                        clearTimeout(timer);
                        return text;
                    } else {
                        console.warn('[Local Proxy] Cloudflare challenge or block encountered, failing over to public proxy pool...');
                    }
                }
            } catch (localErr) {
                if (localProxyState === null) {
                    localProxyState = false;
                }
            }
        }

        // 3. Tiered Public Proxy Failover Pool (Fast sub-second proxies prioritized)
        const proxyPool = [
            (u) => `https://corsproxy.org/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
        ];

        for (let i = 0; i < proxyPool.length; i++) {
            const proxyFn = proxyPool[i];
            let proxyTimer = null;
            let onParentAbort = null;
            try {
                const proxyCtrl = new AbortController();
                proxyTimer = setTimeout(() => proxyCtrl.abort(), 3500); // Strict 3.5s per proxy attempt

                onParentAbort = () => {
                    clearTimeout(proxyTimer);
                    proxyCtrl.abort();
                };
                controller.signal.addEventListener('abort', onParentAbort, { once: true });

                const fetchOpts = {
                    signal: proxyCtrl.signal,
                    headers: options.headers || {}
                };
                if (options.method) fetchOpts.method = options.method;
                if (options.body) fetchOpts.body = options.body;

                const res = await fetch(proxyFn(url), fetchOpts);

                if (res.ok) {
                    const text = await res.text();
                    if (isBlockOrChallenge(text)) {
                        console.warn('[Proxy Failover] Cloudflare challenge or block detected, switching to next proxy...');
                        continue;
                    }
                    clearTimeout(timer);
                    return text;
                }
            } catch (proxyErr) {
                // Strict 3.5s timeout aborts immediately and switches to next proxy without stalling
            } finally {
                if (proxyTimer) clearTimeout(proxyTimer);
                if (onParentAbort) controller.signal.removeEventListener('abort', onParentAbort);
            }
        }

        clearTimeout(timer);
        throw new Error(`Failed to fetch ${url}. All proxies exhausted or rate-limited.`);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. PARALLEL WORKER POOL ENGINE (LNCRAWL STREAMING & RESUMABLE SESSIONS)
    // ══════════════════════════════════════════════════════════════════════
    let activeCrawlController = null;

    function createCrawlController(options = {}) {
        const abortController = new AbortController();
        activeCrawlController = {
            isPaused: false,
            isCancelled: false,
            tocOnly: !!options.tocOnly,
            abortController,
            initialChapters: options.initialChapters || (options.resumeSession ? (options.resumeSession.downloadedChapters || options.resumeSession.chapters || options.resumeSession.rawChapters) : []) || [],
            chapterList: options.chapterList || options.resumeSession?.chapterList || [],
            onChapterDone: options.onChapterDone || null,
            novelMeta: options.novelMeta || {}
        };
        return activeCrawlController;
    }

    async function crawlChapterPool(chapterList, extractContentFn, concurrency = 4, progressCb, meta = {}, poolOptions = {}) {
        const ctrl = activeCrawlController || { isPaused: false, isCancelled: false, initialChapters: [] };
        if (meta && typeof meta === 'object') {
            ctrl.novelMeta = { ...(ctrl.novelMeta || {}), ...meta };
        }

        // Fast-path: TOC-only check for updates
        if (ctrl.tocOnly) {
            progressCb?.(` Table of contents verified: ${chapterList.length} remote chapters found.`, 100);
            ctrl.chapterList = chapterList;
            ctrl.totalChapterCount = chapterList.length;
            return { chapters: [], totalWords: 0, chapterList, totalChapterCount: chapterList.length };
        }

        // Restore downloaded chapters if resuming from a previous or paused session or incremental update
        const chapters = Array.isArray(ctrl.initialChapters) ? ctrl.initialChapters.map((c, i) => ({ ...c, idx: c.idx !== undefined ? c.idx : i })) : [];
        const completedIndices = new Set(chapters.map(c => c.idx));

        // Also match existing chapters by URL and normalized title for robust incremental updates
        const completedUrls = new Set(chapters.map(c => c.url).filter(Boolean));
        const completedTitles = new Set(chapters.map(c => (c.title || '').trim().toLowerCase()).filter(Boolean));

        for (let i = 0; i < chapterList.length; i++) {
            const item = chapterList[i];
            if (item && ((item.url && completedUrls.has(item.url)) || (item.title && completedTitles.has(item.title.trim().toLowerCase())))) {
                completedIndices.add(i);
            }
        }
        let completedCount = completedIndices.size;

        // Build resilient work queue of all pending chapter indices so NO chapter is ever skipped
        const pendingQueue = [];
        for (let i = 0; i < chapterList.length; i++) {
            if (!completedIndices.has(i)) {
                pendingQueue.push(i);
            }
        }

        const interRequestDelay = poolOptions.delayMs !== undefined ? poolOptions.delayMs : 100;
        let totalWordsEstimate = chapters.reduce((acc, c) => acc + (c.words || (c.text ? c.text.split(/\s+/).filter(Boolean).length : 0)), 0);
        let totalImagesCount = chapters.reduce((acc, c) => acc + ((c.text && c.text.match(/!\[Illustration\]/g)) || []).length, 0);
        let wakeLockObj = null;

        try {
            window.NativeBridge?.acquireWakeLock?.();
            if (typeof navigator !== 'undefined' && navigator.wakeLock) {
                try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e) {}
            }
        } catch(e) {}

        let lastNotifTime = 0;
        const startTime = Date.now();
        let isBackingOff = false;

        window.sendTelemetry?.('CRAWL', `Starting ingestion pool (${concurrency} workers, ${interRequestDelay}ms delay) for ${chapterList.length} chapters: ${meta?.title || 'Novel'}`);

        const worker = async () => {
            while (pendingQueue.length > 0) {
                if (ctrl.isPaused || ctrl.isCancelled) break;

                // If another worker encountered a rate limit (e.g. 1015), wait for cooldown
                while (isBackingOff && !ctrl.isPaused && !ctrl.isCancelled) {
                    await new Promise(r => setTimeout(r, 600));
                }

                if (ctrl.isPaused || ctrl.isCancelled) break;

                const currentIndex = pendingQueue.shift();
                if (currentIndex === undefined) break;
                if (completedIndices.has(currentIndex)) continue;

                const item = chapterList[currentIndex];
                let attempts = 0;
                let chData = null;
                let rateLimitDetected = false;

                while (attempts < 4 && !chData && !ctrl.isPaused && !ctrl.isCancelled) {
                    attempts++;
                    try {
                        // Polite inter-request pacing
                        await new Promise(r => setTimeout(r, interRequestDelay));
                        if (ctrl.isPaused || ctrl.isCancelled) break;

                        chData = await extractContentFn(item, currentIndex);
                        if (ctrl.isPaused || ctrl.isCancelled) break;

                        // Validate content: reject Cloudflare Error 1015 rate-limit block pages
                        if (chData && chData.text) {
                            const sample = chData.text.slice(0, 350).toLowerCase();
                            if (sample.includes('error 1015') || (sample.includes('rate limit') && sample.includes('cloudflare'))) {
                                rateLimitDetected = true;
                                chData = null;
                            }
                        }
                    } catch (fetchErr) {
                        const errMsg = String(fetchErr?.message || '').toLowerCase();
                        if (errMsg.includes('1015') || errMsg.includes('rate limit') || errMsg.includes('429')) {
                            rateLimitDetected = true;
                        } else if (attempts < 4) {
                            await new Promise(r => setTimeout(r, 600 * attempts));
                        }
                    }

                    if (rateLimitDetected && !ctrl.isPaused && !ctrl.isCancelled) {
                        rateLimitDetected = false;
                        isBackingOff = true;
                        const cooldownSec = Math.min(20, 6 + (attempts * 4));
                        console.warn(`[Cloudflare Rate Limit 1015] detected on chapter ${currentIndex + 1}. Cooling down ${cooldownSec}s...`);
                        window.sendTelemetry?.('CLOUDFLARE_1015', `Cloudflare 1015 rate limit on Ch ${currentIndex + 1}. Cooldown: ${cooldownSec}s...`);
                        for (let c = cooldownSec; c > 0; c--) {
                            if (ctrl.isPaused || ctrl.isCancelled) break;
                            progressCb?.(`⏳ Cloudflare rate limit (1015) cooldown: resuming in ${c}s... (${completedIndices.size}/${chapterList.length} ch done)`);
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        isBackingOff = false;
                    }
                }

                if (ctrl.isPaused || ctrl.isCancelled) break;

                if (chData && chData.text && chData.text.length > 30) {
                    const words = chData.text.split(/\s+/).filter(Boolean).length;
                    const imgCount = (chData.text.match(/!\[Illustration\]/g) || []).length;
                    totalImagesCount += imgCount;
                    totalWordsEstimate += words;
                    const newChapterObj = {
                        idx: currentIndex,
                        title: chData.title || item.title || `Chapter ${currentIndex + 1}`,
                        text: chData.text,
                        content: chData.text,
                        words
                    };
                    chapters.push(newChapterObj);
                    completedIndices.add(currentIndex);

                    window.sendTelemetry?.('CHAPTER_OK', `Saved Ch ${currentIndex + 1}/${chapterList.length}: ${newChapterObj.title} (${words}w, ${completedIndices.size}/${chapterList.length} done)`);

                    if (ctrl.onChapterDone && !ctrl.isPaused && !ctrl.isCancelled) {
                        try {
                            ctrl.onChapterDone(newChapterObj, chapters, {
                                current: completedIndices.size,
                                completedCount: completedIndices.size,
                                total: chapterList.length,
                                totalCount: chapterList.length,
                                totalWords: totalWordsEstimate,
                                chapterList: chapterList,
                                title: ctrl.novelMeta?.title || meta?.title || '',
                                author: ctrl.novelMeta?.author || meta?.author || '',
                                summary: ctrl.novelMeta?.summary || meta?.summary || ''
                            });
                        } catch (cbErr) {
                            console.warn('onChapterDone callback error:', cbErr);
                        }
                    }
                } else if (!ctrl.isPaused && !ctrl.isCancelled) {
                    // Re-queue chapter so it is never lost or skipped
                    console.warn(`Chapter ${currentIndex + 1} incomplete/rate-limited; re-queueing to retry.`);
                    window.sendTelemetry?.('CHAPTER_RETRY', `Ch ${currentIndex + 1} incomplete or rate-limited; re-queued to retry.`);
                    pendingQueue.push(currentIndex);
                    await new Promise(r => setTimeout(r, 1200));
                }

                completedCount = completedIndices.size;
                const pct = Math.min(99, Math.round(15 + ((completedCount / chapterList.length) * 84)));
                const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
                const min = Math.floor(elapsedSec / 60);
                const sec = elapsedSec % 60;
                const timeStr = (min > 0 ? `${min}m ` : '') + `${sec}s`;
                const speed = (completedCount / elapsedSec).toFixed(1);

                if (!ctrl.isPaused && !ctrl.isCancelled) {
                    progressCb?.(` Ingested: ${chapters.length}/${chapterList.length} ch (${pct}%) • ${timeStr} (${speed} ch/s) • ~${totalWordsEstimate.toLocaleString()} words`, pct);

                    const now = Date.now();
                    if (now - lastNotifTime > 2000 || completedCount === chapterList.length) {
                        lastNotifTime = now;
                        window.NativeBridge?.showProgressNotification?.('Gemini Web Importer', `Ingesting novel: ${chapters.length}/${chapterList.length} ch (${pct}%) • ${timeStr}`, pct, true);
                    }
                }

                if (ctrl.isPaused || ctrl.isCancelled) {
                    break;
                }
            }
        };

        try {
            const workers = Array.from({ length: Math.min(concurrency, chapterList.length) }, () => worker());
            await Promise.all(workers);
        } finally {
            try {
                if (wakeLockObj) { wakeLockObj.release().catch(() => {}); }
                window.NativeBridge?.releaseWakeLock?.();
                if (!ctrl.isPaused && !ctrl.isCancelled) {
                    window.NativeBridge?.clearProgressNotification?.(true, 'Novel Ingestion Complete! ', `${chapters.length} chapters downloaded and saved.`);
                    window.sendTelemetry?.('CRAWL_DONE', `Novel ingestion completed: ${chapters.length} chapters downloaded and saved.`);
                } else if (ctrl.isPaused) {
                    window.NativeBridge?.clearProgressNotification?.(false);
                    window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', `Paused at ${chapters.length}/${chapterList.length} chapters. Saved to Library.`);
                    window.sendTelemetry?.('CRAWL_PAUSED', `Novel ingestion paused at ${chapters.length}/${chapterList.length} chapters. Saved to Library.`);
                } else if (ctrl.isCancelled) {
                    window.NativeBridge?.clearProgressNotification?.(false);
                    window.sendTelemetry?.('CRAWL_CANCELLED', `Novel ingestion cancelled.`);
                }
            } catch(e) {}
        }

        chapters.sort((a, b) => a.idx - b.idx);
        return { 
            chapters, 
            totalWords: totalWordsEstimate, 
            totalImages: totalImagesCount,
            isPaused: !!ctrl.isPaused,
            isCancelled: !!ctrl.isCancelled
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. SITE SOURCE CRAWLERS (LNCRAWL TEMPLATE DRIVEN)
    // ══════════════════════════════════════════════════════════════════════

    // --- A. WITCH CULT TRANSLATIONS (Re:Zero Web Novel Pipeline) ---
    async function crawlWitchCult(url, progressCb) {
        progressCb?.('Connecting to Witch Cult Translations...', 5);
        const targetSlug = url.replace(/\/$/, '').split('/').filter(Boolean).pop();

        progressCb?.(' Indexing chapters from Witch Cult Translations...', 10);
        let chapterList = [];
        try {
            const isArcPage = url.includes('/arc-') || url.includes('witchculttranslation.com/arc');
            let targetHtml = '';
            if (isArcPage) {
                try {
                    targetHtml = await fetchHtml(url);
                } catch(e) {}
            }
            if (!targetHtml) {
                targetHtml = await fetchHtml('https://witchculttranslation.com/table-of-content/');
            }

            const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            const allLinks = [];
            while ((m = linkRegex.exec(targetHtml)) !== null) {
                const href = m[1].replace(/\/$/, '') + '/';
                const text = m[2].replace(/<[^>]+>/g, '').trim()
                    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&amp;/g, '&');
                if ((href.includes('witchculttranslation.com/20') || href.includes('witchculttranslation.com/arc-')) && !allLinks.some(l => l.href === href)) {
                    allLinks.push({ href, text });
                }
            }

            let targetIdx = 0;
            if (targetSlug && targetSlug !== 'table-of-content' && !isArcPage) {
                const foundIdx = allLinks.findIndex(l => l.href.includes(targetSlug));
                if (foundIdx !== -1) targetIdx = foundIdx;
            }

            for (let i = targetIdx; i < allLinks.length; i++) {
                chapterList.push({ url: allLinks[i].href, title: allLinks[i].text || `Chapter ${i + 1}` });
            }
        } catch (tocErr) {
            console.warn('Witch Cult TOC discovery error:', tocErr);
        }

        if (chapterList.length === 0) chapterList = [{ url, title: 'Re:Zero Chapter' }];

        progressCb?.(` Discovered ${chapterList.length} chapters! Launching continuous streaming pipeline...`, 15);

        const { chapters, totalWords, totalImages } = await crawlChapterPool(
            chapterList,
            async (item) => {
                const html = await fetchHtml(item.url);
                const cMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                const txt = cleanChapterHtmlWithImages(cMatch ? cMatch[1] : html);
                return { title: item.title, text: txt };
            },
            12,
            progressCb
        );

        progressCb?.(` Compiled ${chapters.length} Re:Zero chapters with ${totalImages} illustrations! (~${totalWords.toLocaleString()} words)`, 100);

        return {
            title: 'Re:Zero Web Novel — ' + (chapterList[0]?.title || 'Complete Edition'),
            author: 'Tappei Nagatsuki (Witch Cult Translations)',
            summary: `Re:Zero Starting Life in Another World Web Novel. ${chapters.length} complete chapters (~${totalWords.toLocaleString()} words, ${totalImages} illustrations) starting from ${chapterList[0]?.title}.`,
            tags: ['Re:Zero', 'Witch Cult Translations', 'Web Novel', 'Complete Edition'],
            chapters: chapters.map(c => ({ title: c.title, text: c.text })),
            isEpub: false,
            sourceUrl: url
        };
    }

    // --- B. AO3 (Archive of Our Own - 1-Shot Official EPUB & Full Work Engine) ---
    const normalizeImportedChapterForDedup = (text) => String(text || '')
        .replace(/!\[Illustration\]\([^)]*\)/gi, '![illustration]')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase();

    const appendUniqueImportedChapter = (chapters, chapter, seenKeys) => {
        if (!chapter || !chapter.text || chapter.text.length <= 30) return;
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
        if (typeof stripFn === 'function' && chapter.title) {
            chapter.text = stripFn(chapter.text, chapter.title, chapter.originalTitle);
        }
        const key = normalizeImportedChapterForDedup(chapter.text);
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);
        chapters.push(chapter);
    };

    async function crawlAO3(url, progressCb) {
        progressCb?.('Analyzing AO3 work URL...', 10);
        const match = url.match(/works\/(\d+)/);
        if (!match) throw new Error('Invalid AO3 URL. Could not find work ID.');
        const workId = match[1];

        // 1-Shot Official EPUB
        progressCb?.('Fetching full work EPUB from AO3...', 25);
        const epubUrl = `https://download.archiveofourown.org/downloads/${workId}/work.epub`;
        try {
            if (window.NativeBridge && window.NativeBridge.downloadBinary) {
                const buffer = await window.NativeBridge.downloadBinary(epubUrl);
                if (buffer && buffer.byteLength > 1000) {
                    progressCb?.('Parsing official AO3 EPUB package...', 60);
                    return await importEpubBuffer(buffer, `AO3_${workId}.epub`, progressCb);
                }
            }
        } catch (epubErr) {
            console.warn('Direct AO3 EPUB fetch failed, falling back to full-work HTML:', epubErr);
        }

        // Adult Full Work HTML
        progressCb?.('Fetching complete work HTML from AO3 (Adult Bypass)...', 40);
        const fullWorkUrl = `https://archiveofourown.org/works/${workId}?view_full_work=true&view_adult=true`;
        const html = await fetchHtml(fullWorkUrl);

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const title = doc.querySelector('h2.title, .title.heading')?.textContent?.trim() || `AO3 Work ${workId}`;
        const author = doc.querySelector('a[rel="author"]')?.textContent?.trim() || 'AO3 Author';
        const summary = doc.querySelector('.summary .userstuff')?.textContent?.trim() || '';
        
        const tags = [];
        doc.querySelectorAll('dd.fandom a, dd.rating a, dd.warning a, dd.relationship a, dd.character a, dd.freeform a').forEach(a => {
            if (a.textContent?.trim()) tags.push(a.textContent.trim());
        });

        // AO3 full-work pages expose the same body through nested `.userstuff`
        // elements. Only consume top-level chapter wrappers; combining those
        // with direct `.userstuff` nodes duplicates the authored chapter.
        let chapterNodes = Array.from(doc.querySelectorAll('#chapters > .chapter'));
        if (chapterNodes.length === 0) chapterNodes = Array.from(doc.querySelectorAll('#chapters .chapter'));
        const chapters = [];
        const seenChapterKeys = new Set();

        if (chapterNodes.length > 0) {
            chapterNodes.forEach((cn, idx) => {
                const heading = cn.querySelector('h3.title, h3.heading, h2.title, h1.title, .title.heading')?.textContent?.trim() || `Chapter ${idx + 1}`;
                const contentEl = cn.querySelector('.userstuff') || cn.querySelector('div[role="article"]') || cn;
                const text = cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '');
                appendUniqueImportedChapter(chapters, { title: heading, text }, seenChapterKeys);
            });
        } else {
            const contentEl = doc.querySelector('#chapters .userstuff, .userstuff[role="article"], .work.meta .userstuff') || doc.body;
            appendUniqueImportedChapter(chapters, { title, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') }, seenChapterKeys);
        }

        progressCb?.(`Loaded ${chapters.length} chapters from AO3!`, 100);
        return { title, author, summary, tags, chapters, isEpub: false, sourceUrl: url };
    }

    // --- C. ROYAL ROAD & SCRIBBLEHUB TEMPLATE ---
    async function crawlRoyalRoad(url, progressCb) {
        progressCb?.('Fetching novel info from RoyalRoad...', 15);
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1')?.textContent?.trim() || 'RoyalRoad Novel';
        const author = doc.querySelector('.fic-header h4 a, a[href*="/profile/"]')?.textContent?.trim() || 'Author';
        const summary = doc.querySelector('.description .hidden-content, .description')?.textContent?.trim() || '';

        const tags = [];
        doc.querySelectorAll('.tags .tag, .fiction-tag').forEach(t => {
            const txt = t.textContent?.trim();
            if (txt) tags.push(txt);
        });

        const chapterLinks = [];
        doc.querySelectorAll('table#chapters tbody tr[data-url], .chapter-row a[href*="/chapter/"]').forEach(el => {
            const href = el.getAttribute('data-url') || el.getAttribute('href');
            const linkText = el.querySelector('a')?.textContent?.trim() || el.textContent?.trim();
            if (href) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://www.royalroad.com').href;
                chapterLinks.push({ url: fullUrl, title: linkText });
            }
        });

        if (chapterLinks.length === 0) {
            chapterLinks.push({ url, title: 'Chapter 1' });
        }

        progressCb?.(`Found ${chapterLinks.length} chapters on RoyalRoad! Fetching in parallel...`, 25);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url);
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('.chapter-inner, .chapter-content') || chDoc.body;
                const txt = cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '');
                return { title: item.title, text: txt };
            },
            12,
            progressCb
        );

        progressCb?.(` Loaded ${chapters.length} RoyalRoad chapters (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, isEpub: false, sourceUrl: url };
    }

    // --- D. SYOSETU (小説家になろう) & KAKUYOMU (カクヨム) ---
    async function crawlSyosetu(url, progressCb) {
        progressCb?.('Connecting to Syosetu / Kakuyomu...', 15);
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('.novel_title, h1, .widget-toc-main-header')?.textContent?.trim() || 'Japanese Web Novel';
        const author = doc.querySelector('.novel_writername, .writer, .partialGiftWidget_authorName')?.textContent?.trim() || 'Author';
        const summary = doc.querySelector('#novel_ex, .widget-toc-workIntroduction')?.textContent?.trim() || '';

        const indexLinks = [];
        const baseUrl = url.endsWith('/') ? url : url + '/';

        doc.querySelectorAll('.novel_sublist2 .subtitle a, .index_box a, .widget-toc-items a').forEach(a => {
            const href = a.getAttribute('href');
            if (href) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                indexLinks.push({ url: fullUrl, title: a.textContent?.trim() });
            }
        });

        if (indexLinks.length === 0) {
            const body = doc.querySelector('#novel_honbun, .novel_honbun, .widget-episodeBody') || doc.body;
            return {
                title,
                author,
                summary,
                tags: ['Syosetu', 'Web Novel'],
                chapters: [{ title, text: cleanChapterHtmlWithImages(body.innerHTML || body.textContent || '') }],
                isEpub: false,
                sourceUrl: url
            };
        }

        progressCb?.(`Found ${indexLinks.length} Syosetu chapters! Fetching in parallel...`, 25);

        const { chapters, totalWords } = await crawlChapterPool(
            indexLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url);
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const chBody = chDoc.querySelector('#novel_honbun, .novel_honbun, .widget-episodeBody') || chDoc.body;
                return { title: item.title, text: cleanChapterHtmlWithImages(chBody.innerHTML || chBody.textContent || '') };
            },
            12,
            progressCb
        );

        progressCb?.(` Loaded ${chapters.length} Syosetu chapters (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags: ['Syosetu', 'Japanese Light Novel'], chapters, isEpub: false, sourceUrl: url };
    }

    // --- E. NOVELFULL & BOXNOVEL & READLIGHTNOVEL TEMPLATE ---
    async function crawlNovelFull(url, progressCb) {
        progressCb?.('Connecting to NovelFull / BoxNovel...', 15);
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h3.title, .books .desc h3, .novel-title')?.textContent?.trim() || 'Novel';
        const author = doc.querySelector('.info div:has(h3:contains("Author")) a, .author a, .info a[href*="/author/"]')?.textContent?.trim() || 'Author';
        const summary = doc.querySelector('.desc-text, #tab-description, .summary')?.textContent?.trim() || '';

        const tags = [];
        doc.querySelectorAll('.info a[href*="/genre/"], .tags a').forEach(t => {
            if (t.textContent?.trim()) tags.push(t.textContent.trim());
        });

        let chapterLinks = [];
        const novelId = (html.match(/data-novel-id=["'](\d+)["']/i) || html.match(/novelId\s*=\s*['"]?(\d+)['"]?/i) || [])[1];

        if (novelId) {
            progressCb?.('Fetching complete chapter index from AJAX archive...', 25);
            try {
                const origin = new URL(url).origin;
                const archiveHtml = await fetchHtml(`${origin}/ajax/chapter-archive?novelId=${novelId}`);
                const aDoc = new DOMParser().parseFromString(archiveHtml, 'text/html');
                aDoc.querySelectorAll('ul.list-chapter li a, a[href*="/chapter"]').forEach(a => {
                    const href = a.getAttribute('href');
                    if (href) {
                        const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                        chapterLinks.push({ url: fullUrl, title: a.textContent?.trim() || a.getAttribute('title') });
                    }
                });
            } catch (e) {
                console.warn('NovelFull AJAX archive error:', e);
            }
        }

        if (chapterLinks.length === 0) {
            const origin = new URL(url).origin;
            doc.querySelectorAll('.list-chapter li a, .panel-chapter a, a[href*="/chapter-"]').forEach(a => {
                const href = a.getAttribute('href');
                if (href) {
                    const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                    if (!chapterLinks.some(l => l.url === fullUrl)) {
                        chapterLinks.push({ url: fullUrl, title: a.textContent?.trim() });
                    }
                }
            });
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters! Fetching in parallel...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url);
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('#chapter-content, .chapter-content, #chr-content, .chr-c') || chDoc.body;
                return { title: item.title, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') };
            },
            12,
            progressCb
        );

        progressCb?.(` Loaded ${chapters.length} chapters (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, isEpub: false, sourceUrl: url };
    }

    // --- E1. NOVELBIN & MVLEMPYR TEMPLATE (novel-bin.com, novelbin.me, mvlempyr.com) ---
    async function crawlNovelBin(url, progressCb) {
        progressCb?.('Connecting to NovelBin...', 15);
        const origin = new URL(url).origin;
        
        let bookUrl = url.trim().replace(/\/chapter[-/].*$/i, '');
        if (bookUrl.endsWith('/chapters')) {
            bookUrl = bookUrl.replace(/\/chapters$/, '');
        }

        const html = await fetchHtml(bookUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('meta[property="og:novel:novel_name"]')?.getAttribute('content')?.trim() ||
                      doc.querySelector('h3.title, .books .desc h3, .novel-title, h1')?.textContent?.trim() || 'NovelBin Novel';
        const author = doc.querySelector('meta[property="og:novel:author"]')?.getAttribute('content')?.trim() ||
                       doc.querySelector('.info li:has(h3) a, .info a[href*="/author/"], .author a')?.textContent?.trim() || 'Author';
        const summary = doc.querySelector('.desc-text, #tab-description, .summary')?.textContent?.trim() || '';

        const tags = [];
        doc.querySelectorAll('.info a[href*="/genre/"], .tags a').forEach(t => {
            const txt = t.textContent?.trim();
            if (txt && !tags.includes(txt)) tags.push(txt);
        });

        // Check if TOC is already known from resume session
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [NovelBin] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else {
            // First check if novel has AJAX chapter archive (NovelBin backend)
            const novelId = (html.match(/data-novel-id=["'](\d+)["']/i) || html.match(/novelId\s*=\s*['"]?(\d+)['"]?/i) || html.match(/id=["']novel_id["'][^>]*value=["'](\d+)["']/i) || [])[1];
            if (novelId) {
                try {
                    progressCb?.('Fetching complete chapter index from AJAX archive...', 25);
                    const archiveHtml = await fetchHtml(`${origin}/ajax/chapter-archive?novelId=${novelId}`);
                    const aDoc = new DOMParser().parseFromString(archiveHtml, 'text/html');
                    const seen = new Set();
                    aDoc.querySelectorAll('ul.list-chapter li a, a[href*="/chapter"]').forEach(a => {
                        const href = a.getAttribute('href');
                        if (href && !seen.has(href)) {
                            seen.add(href);
                            const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                            chapterLinks.push({ url: fullUrl, title: a.textContent?.trim() || a.getAttribute('title') });
                        }
                    });
                } catch (ajaxErr) {
                    console.warn('NovelBin AJAX archive error, fallback to page DOM:', ajaxErr);
                }
            }

            // If not found via AJAX, extract from page DOM (.list-chapter or a[href*="/chapter-"])
            if (chapterLinks.length === 0) {
                const seen = new Set();
                const aTags = Array.from(doc.querySelectorAll('.list-chapter a, ul.list-chapter li a, a[href*="/chapter-"]'));
                for (const a of aTags) {
                    if (a.closest('header, footer, nav, #header')) continue;
                    const href = a.getAttribute('href');
                    if (href && !seen.has(href)) {
                        seen.add(href);
                        const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                        const chTitle = a.getAttribute('title') || a.querySelector('.nchr-text')?.textContent?.trim() || a.textContent?.trim();
                        chapterLinks.push({ url: fullUrl, title: chTitle });
                    }
                }
            }

            // Natural sort by chapter number to guarantee correct chronological order
            if (chapterLinks.length > 1) {
                const getChWeight = (item, idx) => {
                    const t = (item.title || '').trim().toLowerCase();
                    if (/^(prologue|preface|intro|foreword|序章|序)\b/i.test(t)) return -999999 + idx * 0.001;
                    if (/^(epilogue|afterword|postscript|终章|尾声)\b/i.test(t) && !/chapter\s*\d+/i.test(t)) return 999999 + idx * 0.001;
                    const m = (item.title || '').match(/(?:chapter|ch\.?|ep\.?|part)\s*(\d+(?:\.\d+)?)/i) || (item.url || '').match(/\/chapter-(\d+(?:\.\d+)?)/i);
                    return m ? parseFloat(m[1]) : idx;
                };
                chapterLinks.sort((a, b) => getChWeight(a, 0) - getChWeight(b, 0));
            }
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters on NovelBin! Ingesting in parallel...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url);
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('#chr-content, .chr-c, #chapter-content, .chapter-content') || chDoc.body;
                
                // Clean ads, scripts, and reporting widgets
                contentEl.querySelectorAll('.ads, .ad, [class*="advertisement"], script, style, .report-chapter, .desc-text').forEach(e => e.remove());
                
                // Remove repeated "Chapter X" first-line headers if present
                const firstChild = contentEl.firstElementChild;
                if (firstChild && /^\s*chapter\s+\d+/i.test(firstChild.textContent.trim())) {
                    firstChild.remove();
                }

                const chTitle = chDoc.querySelector('.chr-title, .chapter-title, h2')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') };
            },
            8,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 100 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from NovelBin (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    // --- F. NOVELFIRE TEMPLATE (novelfire.net) ---
    async function crawlNovelFire(url, progressCb) {
        progressCb?.('Connecting to NovelFire...', 15);
        const origin = new URL(url).origin;
        
        let bookUrl = url.trim().replace(/\/chapter[-/].*$/i, '');
        if (bookUrl.endsWith('/chapters')) {
            bookUrl = bookUrl.replace(/\/chapters$/, '');
        }

        const html = await fetchHtml(bookUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1.novel-title, h1, .book-title')?.textContent?.trim() || 'NovelFire Novel';
        const author = doc.querySelector('span[itemprop="author"], .author a, a[href*="/author/"]')?.textContent?.trim() || 'Author';
        const summary = doc.querySelector('.description, .summary, .synopsis, #tab-description')?.textContent?.trim() || '';

        const tags = [];
        doc.querySelectorAll('a[href*="/genre/"], a[href*="/tag/"], .categories a').forEach(t => {
            const txt = t.textContent?.trim();
            if (txt && !tags.includes(txt)) tags.push(txt);
        });

        // Check if TOC is already known (e.g. from an existing or resumed session)
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [NovelFire] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else {
            // Scan all chapter pages through pagination
            const seenUrls = new Set();
            let volUrl = `${bookUrl}/chapters`;
            let pageNum = 1;

            progressCb?.('Scanning NovelFire chapter archive...', 20);

            while (volUrl) {
                if (activeCrawlController?.isPaused || activeCrawlController?.isCancelled) break;
                try {
                    progressCb?.(`Scanning NovelFire chapters (Page ${pageNum})...`, Math.min(28, 20 + pageNum));
                    
                    // Polite 180ms delay between TOC pages to avoid Cloudflare Error 1015 rate limit
                    await new Promise(r => setTimeout(r, 180));
                    if (activeCrawlController?.isPaused || activeCrawlController?.isCancelled) break;

                    const chPageHtml = await fetchHtml(volUrl);
                    if (chPageHtml.includes('Error 1015') || (chPageHtml.includes('rate limit') && chPageHtml.includes('Cloudflare'))) {
                        console.warn(`[NovelFire TOC] Rate limit 1015 on page ${pageNum}. Cooling down 3.5s...`);
                        progressCb?.(`⚠️ Rate limit (1015) on page ${pageNum}. Pausing 3.5s to cool down...`);
                        await new Promise(r => setTimeout(r, 3500));
                        continue; // Retry this page
                    }

                    const pDoc = new DOMParser().parseFromString(chPageHtml, 'text/html');
                    
                    // Target specifically the chapter archive list to ignore "Latest Release" teaser links in the header
                    let aTags = Array.from(pDoc.querySelectorAll('#chpagedlist ul.chapter-list li a, ul.chapter-list li a, .list-chapter li a'));
                    if (aTags.length === 0) {
                        aTags = Array.from(pDoc.querySelectorAll('.chapter-list a, .chapters-list a, #tab-chapters a'));
                    }
                    if (aTags.length === 0) {
                        aTags = Array.from(pDoc.querySelectorAll('a[href*="/chapter-"]')).filter(a => !a.closest('header, footer, nav, .latest, .filters, #header'));
                    }

                    let pageFound = 0;
                    for (const a of aTags) {
                        const href = a.getAttribute('href');
                        if (href && !seenUrls.has(href)) {
                            seenUrls.add(href);
                            const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                            const chTitle = a.getAttribute('title') || a.querySelector('.chapter-title')?.textContent?.trim() || a.textContent?.trim();
                            chapterLinks.push({ url: fullUrl, title: chTitle });
                            pageFound++;
                        }
                    }

                    if (pageFound === 0) break;

                    const nextA = pDoc.querySelector('a.page-link[rel="next"], .pagination a[rel="next"]');
                    if (nextA && nextA.getAttribute('href')) {
                        const nextHref = nextA.getAttribute('href');
                        volUrl = nextHref.startsWith('http') ? nextHref : new URL(nextHref, origin).href;
                        pageNum++;
                    } else {
                        volUrl = null;
                    }
                } catch (pageErr) {
                    console.warn(`NovelFire page ${pageNum} fetch error:`, pageErr);
                    // If error is rate-limit related, wait and retry up to once
                    if (String(pageErr?.message || '').includes('1015')) {
                        await new Promise(r => setTimeout(r, 3500));
                        continue;
                    }
                    break;
                }
            }

            // Fallback: check chapters directly on book page if /chapters wasn't reached
            if (chapterLinks.length === 0) {
                let fallbackTags = Array.from(doc.querySelectorAll('#chpagedlist ul.chapter-list li a, ul.chapter-list li a, .list-chapter li a'));
                if (fallbackTags.length === 0) {
                    fallbackTags = Array.from(doc.querySelectorAll('a[href*="/chapter-"]')).filter(a => !a.closest('header, footer, nav, .latest, .filters, #header'));
                }
                fallbackTags.forEach(a => {
                    const href = a.getAttribute('href');
                    if (href && !seenUrls.has(href)) {
                        seenUrls.add(href);
                        const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                        chapterLinks.push({ url: fullUrl, title: a.getAttribute('title') || a.textContent?.trim() });
                    }
                });
            }

            if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

            // Self-healing: if the first link is an out-of-order high chapter (e.g. Chapter 861 preceding Chapter 1), auto-sort naturally
            if (chapterLinks.length > 2) {
                const getChWeight = (item, idx) => {
                    const t = (item.title || '').trim().toLowerCase();
                    if (/^(prologue|preface|intro|foreword|序章|序)\b/i.test(t)) return -999999 + idx * 0.001;
                    if (/^(epilogue|afterword|postscript|终章|尾声)\b/i.test(t) && !/chapter\s*\d+/i.test(t)) return 999999 + idx * 0.001;
                    const m = (item.title || '').match(/(?:chapter|ch\.?|ep\.?|part)\s*(\d+(?:\.\d+)?)/i) || (item.url || '').match(/\/chapter-(\d+(?:\.\d+)?)/i);
                    return m ? parseFloat(m[1]) : idx;
                };
                const firstW = getChWeight(chapterLinks[0], 0);
                const secondW = getChWeight(chapterLinks[1], 1);
                if (firstW > secondW && firstW > 20) {
                    console.log(` [NovelFire] Detected out-of-order teaser link (${chapterLinks[0].title}), sorting chapters naturally.`);
                    chapterLinks.sort((a, b) => getChWeight(a, 0) - getChWeight(b, 0));
                }
            }
        }

        progressCb?.(`Found ${chapterLinks.length} chapters on NovelFire! Fetching chapters...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url);
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('div#content, .chapter-content, #chr-content, .chr-c') || chDoc.body;
                
                // Clean ads, scripts, and reporting widgets
                contentEl.querySelectorAll('.ads, .ad, [class*="advertisement"], script, style, .report-chapter, .desc-text').forEach(e => e.remove());
                
                // Remove repeated "Chapter X" first-line headers
                const firstChild = contentEl.firstElementChild;
                if (firstChild && /^\s*chapter\s+\d+/i.test(firstChild.textContent.trim())) {
                    firstChild.remove();
                }

                const chTitle = chDoc.querySelector('.chapter-title')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') };
            },
            3,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 250 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from NovelFire (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    // --- F. LOFTER (乐乎 WITH HIGH-RES ARTWORK) ---
    async function crawlLofter(url, progressCb) {
        progressCb?.('Connecting to NetEase Lofter...', 15);
        const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
        const permalinkMatch = url.match(/\/post\/([a-zA-Z0-9_-]+)/i);
        const permalink = permalinkMatch ? permalinkMatch[1] : '';

        const frontUrl = permalink ? `https://www.lofter.com/front/post/${permalink}` : url;
        const html = await fetchHtml(frontUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });

        let title = 'Lofter Novel';
        let author = 'Lofter Author';
        let tags = [];
        let collectionId = null;
        let mainText = '';

        const startIdx = html.indexOf('window.__initialize_data__');
        if (startIdx !== -1) {
            try {
                const endIdx = html.indexOf('</script>', startIdx);
                const data = JSON.parse(html.substring(startIdx, endIdx).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));
                const blogInfo = data.postData?.data?.blogInfo;
                if (blogInfo?.blogNickName) author = blogInfo.blogNickName;

                const pv = data.postData?.data?.postData?.postView;
                if (pv) {
                    if (pv.title && pv.title.trim()) title = pv.title.trim();
                    else if (pv.digest) title = pv.digest.substring(0, 40);

                    if (pv.collectionId) collectionId = pv.collectionId;
                    if (Array.isArray(pv.tagList)) tags = pv.tagList;

                    let rawContent = pv.textPostView?.content || pv.content || '';
                    if (Array.isArray(pv.photoList) && pv.photoList.length > 0) {
                        const photoImgs = pv.photoList.map(p => {
                            const rawUrl = p.originUrl || p.rawUrl || p.url || '';
                            const clean = rawUrl.replace(/\?imageView.*$/i, '');
                            return clean ? `\n\n![Illustration](${clean})\n\n` : '';
                        }).join('');
                        rawContent = photoImgs + rawContent;
                    }
                    if (rawContent) mainText = cleanChapterHtmlWithImages(rawContent);
                }
            } catch (e) {
                console.warn('Lofter JSON parse error:', e);
            }
        }

        const chapters = [];
        if (collectionId) {
            progressCb?.('Found Lofter series! Crawling all chapters in series...', 30);
            try {
                const collUrl = `https://www.lofter.com/front/blog/collection/share?collectionId=${collectionId}`;
                const collHtml = await fetchHtml(collUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });
                const cStart = collHtml.indexOf('window.__initialize_data__');
                if (cStart !== -1) {
                    const cEnd = collHtml.indexOf('</script>', cStart);
                    const cData = JSON.parse(collHtml.substring(cStart, cEnd).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));
                    const seriesName = cData.data?.collection?.name || title;
                    if (seriesName) title = seriesName;

                    const rawPosts = cData.data?.posts || [];
                    const postItems = rawPosts.map((item, idx) => ({
                        item,
                        permalink: item.permalink,
                        title: item.title || `Chapter ${idx + 1}`,
                        url: `https://www.lofter.com/front/post/${item.permalink}`
                    }));

                    const { chapters: poolChapters } = await crawlChapterPool(
                        postItems,
                        async (pObj) => {
                            const { item, permalink: pLink, title: chTitle } = pObj;
                            if (pLink === permalink && mainText) {
                                return { title: chTitle, text: mainText };
                            }
                            try {
                                const postUrl = `https://www.lofter.com/front/post/${pLink}`;
                                const pHtml = await fetchHtml(postUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });
                                const pStart = pHtml.indexOf('window.__initialize_data__');
                                let chText = '';
                                if (pStart !== -1) {
                                    const pEnd = pHtml.indexOf('</script>', pStart);
                                    const pData = JSON.parse(pHtml.substring(pStart, pEnd).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));
                                    const pPv = pData.postData?.data?.postData?.postView;
                                    let raw = pPv?.textPostView?.content || pPv?.content || '';
                                    if (Array.isArray(pPv?.photoList) && pPv.photoList.length > 0) {
                                        const photoImgs = pPv.photoList.map(p => {
                                            const rawUrl = p.originUrl || p.rawUrl || p.url || '';
                                            return rawUrl ? `\n\n![Illustration](${rawUrl.replace(/\?imageView.*$/i, '')})\n\n` : '';
                                        }).join('');
                                        raw = photoImgs + raw;
                                    }
                                    if (raw) chText = cleanChapterHtmlWithImages(raw);
                                }
                                if (!chText && item.digest) chText = cleanChapterHtmlWithImages(item.digest);
                                return { title: chTitle, text: chText || '' };
                            } catch (e) {
                                return { title: chTitle, text: item.digest ? cleanChapterHtmlWithImages(item.digest) : '' };
                            }
                        },
                        8,
                        progressCb
                    );
                    chapters.push(...poolChapters.filter(c => c && c.text));
                }
            } catch (e) {}
        }

        if (chapters.length === 0 && mainText) {
            chapters.push({ title, text: mainText });
        }

        progressCb?.(` Loaded ${chapters.length} Lofter chapters!`, 100);
        return { title, author, summary: chapters[0]?.text?.substring(0, 300) + '...', tags, chapters, isEpub: false, sourceUrl: url };
    }

    // --- G. UNIVERSAL HEURISTIC SCRAPER (FALLBACK ENGINE) ---
    // Pixiv exposes novel text and ordered series entries through its AJAX endpoints.
    async function fetchPixivJson(endpoint) {
        const endpointName = endpoint.includes('/series_content/') ? 'series chapter index' : endpoint.includes('/series/') ? 'series details' : 'novel content';
        const options = {
            timeout: 30000,
            headers: { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://www.pixiv.net/' },
            userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36'
        };
        // fetchUrlNative is the Android path that can reuse WebView cookies after verification.
        let raw;
        if (window.NativeBridge?.fetchUrl) {
            const response = await window.NativeBridge.fetchUrl(endpoint, options);
            if (!response?.ok) throw new Error(`Pixiv ${endpointName} returned HTTP ${response?.status || 'error'}.`);
            raw = await response.text();
        } else {
            raw = await fetchHtml(endpoint, options);
        }
        let payload;
        try { payload = JSON.parse(raw); } catch (e) {
            throw new Error(`Pixiv ${endpointName} request did not return JSON. It may require a logged-in browser session, VPN, or Android network access.`);
        }
        if (payload?.error) throw new Error(payload.message || 'Pixiv rejected the request.');
        return payload?.body ?? payload;
    }

    function cleanPixivContent(content) {
        if (!content) return '';
        const value = String(content).replace(/\r\n?/g, '\n').trim();
        return /<[^>]+>/.test(value) ? cleanChapterHtmlWithImages(value) : value
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    }

    async function crawlPixiv(url, progressCb) {
        const parsed = new URL(url);
        const novelId = parsed.pathname.match(/\/novel\/show\.php$/i) ? parsed.searchParams.get('id') : null;
        const seriesId = parsed.pathname.match(/\/novel\/series\/(\d+)/i)?.[1] || null;
        if (!novelId && !seriesId) throw new Error('Pixiv URL must be a novel or novel series URL.');

        progressCb?.('Connecting to Pixiv...', 8);
        let firstNovel = null;
        let resolvedSeriesId = seriesId;
        let pixivVerified = false;
        if (novelId) {
            try {
                firstNovel = await fetchPixivJson(`https://www.pixiv.net/ajax/novel/${novelId}?lang=en`);
            } catch (firstError) {
                if (!window.NativeBridge?.resolveCloudflare) throw firstError;
                progressCb?.('Pixiv requires verification. Complete the check in the Android window...', 10);
                await window.NativeBridge.resolveCloudflare(`https://www.pixiv.net/novel/show.php?id=${encodeURIComponent(novelId)}`);
                pixivVerified = true;
                progressCb?.('Verification complete. Retrying Pixiv...', 12);
                firstNovel = await fetchPixivJson(`https://www.pixiv.net/ajax/novel/${novelId}?lang=en`);
            }
            resolvedSeriesId = firstNovel?.seriesNavData?.seriesId || firstNovel?.seriesId || null;
        }

        let seriesInfo = null;
        const chapterList = [];
        if (resolvedSeriesId) {
            try {
                seriesInfo = await fetchPixivJson(`https://www.pixiv.net/ajax/novel/series/${resolvedSeriesId}?lang=en`);
            } catch (seriesError) {
                if (pixivVerified || !window.NativeBridge?.resolveCloudflare) throw seriesError;
                progressCb?.('Pixiv requires verification. Complete the check in the Android window...', 10);
                await window.NativeBridge.resolveCloudflare(`https://www.pixiv.net/novel/series/${encodeURIComponent(resolvedSeriesId)}`);
                pixivVerified = true;
                progressCb?.('Verification complete. Retrying Pixiv...', 12);
                seriesInfo = await fetchPixivJson(`https://www.pixiv.net/ajax/novel/series/${resolvedSeriesId}?lang=en`);
            }
            progressCb?.('Reading Pixiv series chapter index...', 15);
            const seen = new Set();
            // Pixiv currently rejects series_content requests above 30 items.
            const limit = 30;
            let lastOrder = 0;
            for (let page = 0; page < 100; page++) {
                const data = await fetchPixivJson(`https://www.pixiv.net/ajax/novel/series_content/${resolvedSeriesId}?limit=${limit}&last_order=${lastOrder}&order_by=asc&lang=en`);
                const items = data?.page?.seriesContents || data?.seriesContents || [];
                if (!Array.isArray(items) || !items.length) break;
                for (const item of items) {
                    const id = String(item.id || item.novelId || item.novel_id || '');
                    if (!id || seen.has(id) || item.available === false) continue;
                    seen.add(id);
                    chapterList.push({ id, title: item.title || item.name || `Chapter ${chapterList.length + 1}`, order: Number(item.order ?? item.seriesOrder ?? chapterList.length) });
                }
                const nextOrder = Number(items[items.length - 1]?.order ?? items[items.length - 1]?.seriesOrder ?? (lastOrder + items.length));
                if (items.length < limit || nextOrder <= lastOrder) break;
                lastOrder = nextOrder;
                progressCb?.(`Found ${chapterList.length} Pixiv chapters...`, Math.min(28, 15 + page * 3));
            }
        }
        if (!chapterList.length && novelId) chapterList.push({ id: String(novelId), title: firstNovel?.title || 'Chapter 1', order: 0 });
        if (!chapterList.length) throw new Error('No readable chapters were found in this Pixiv series.');
        chapterList.sort((a, b) => a.order - b.order);
        progressCb?.(`Found ${chapterList.length} Pixiv chapters. Downloading all chapters...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(chapterList, async (item) => {
            const detail = item.id === String(novelId) && firstNovel ? firstNovel : await fetchPixivJson(`https://www.pixiv.net/ajax/novel/${item.id}?lang=en`);
            return { title: item.title || detail?.title, text: cleanPixivContent(detail?.content || detail?.novel?.content || '') };
        }, 8, progressCb);

        if (!chapters.length) throw new Error('Pixiv chapters were found, but their content could not be read.');
        const title = seriesInfo?.title || firstNovel?.seriesNavData?.title || firstNovel?.title || 'Pixiv Novel';
        const author = seriesInfo?.userName || firstNovel?.userName || 'Pixiv Author';
        progressCb?.(`Loaded ${chapters.length}/${chapterList.length} Pixiv chapters (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary: seriesInfo?.caption || firstNovel?.description || 'Imported from Pixiv', tags: ['Pixiv', 'Web Novel'], chapters, isEpub: false, sourceUrl: url };
    }

    // --- G. NOVELBUDDY TEMPLATE (novelbuddy.me / novelbuddy.com) ---
    async function crawlNovelBuddy(url, progressCb) {
        progressCb?.('Connecting to NovelBuddy...', 15);
        let bookUrl = url.trim().replace(/\/chapter[-/].*$/i, '');
        const origin = new URL(url).origin;

        const html = await fetchHtml(bookUrl, { headers: { 'Referer': 'https://novelbuddy.me/' } });
        const doc = new DOMParser().parseFromString(html, 'text/html');

        let nextData = null;
        try {
            const nextMatch = html.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
            if (nextMatch) nextData = JSON.parse(nextMatch[1]);
        } catch (_) {}

        const manga = nextData?.props?.pageProps?.initialManga || {};
        const apiUrl = nextData?.props?.pageProps?.siteConfig?.apiUrl || 'https://api.novelbuddy.me';
        const mangaId = manga.id || (html.match(/["'](?:mangaId|id)["']\s*:\s*["']([a-zA-Z0-9_-]{6,16})["']/i) || [])[1];

        const title = manga.name || doc.querySelector('h1')?.textContent?.trim() || 'NovelBuddy Novel';
        const author = Array.isArray(manga.authors) ? manga.authors.map(a => a.name).filter(Boolean).join(', ') : (doc.querySelector('.authors, .author')?.textContent?.trim() || 'NovelBuddy Author');
        const summary = manga.summary || doc.querySelector('.summary, .description, #summary')?.textContent?.trim() || '';
        const tags = (manga.genres || []).map(g => g.name || g).concat(['NovelBuddy', 'Web Novel']);

        // Check if TOC is already known from resume session
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [NovelBuddy] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else if (mangaId) {
            // First fetch complete chapter index via official REST API
            try {
                progressCb?.('Fetching complete chapter index from NovelBuddy API...', 25);
                const resText = await fetchHtml(`${apiUrl}/titles/${mangaId}/chapters`, {
                    headers: { 'Referer': bookUrl }
                });
                const resJson = JSON.parse(resText);
                const chItems = resJson?.data?.chapters || (Array.isArray(resJson?.data) ? resJson.data : []);
                if (Array.isArray(chItems) && chItems.length > 0) {
                    chapterLinks = chItems.map(c => ({
                        id: c.id,
                        mangaId: mangaId,
                        title: c.name || `Chapter ${c.number || ''}`,
                        number: typeof c.number === 'number' ? c.number : parseFloat(c.number || '0'),
                        url: c.url ? (c.url.startsWith('http') ? c.url : new URL(c.url, origin).href) : ''
                    }));
                }
            } catch (apiErr) {
                console.warn('NovelBuddy API chapter list error, fallback to page props:', apiErr);
            }
        }

        // Fallback to initialManga.chapters or page DOM if API was unavailable
        if (chapterLinks.length === 0 && Array.isArray(manga.chapters) && manga.chapters.length > 0) {
            chapterLinks = manga.chapters.map(c => ({
                id: c.id,
                mangaId: mangaId,
                title: c.name || `Chapter ${c.number || ''}`,
                number: typeof c.number === 'number' ? c.number : parseFloat(c.number || '0'),
                url: c.slug ? `${origin}/${manga.slug || 'novel'}/${c.slug}` : ''
            }));
        }
        if (chapterLinks.length === 0) {
            const seen = new Set();
            doc.querySelectorAll('a[href*="/chapter-"], .chapter-list a, ul.chapters a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !seen.has(href)) {
                    seen.add(href);
                    const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                    const chTitle = a.textContent?.trim() || a.getAttribute('title') || `Chapter ${chapterLinks.length + 1}`;
                    chapterLinks.push({ url: fullUrl, title: chTitle });
                }
            });
        }

        // Chronological natural sort
        if (chapterLinks.length > 1) {
            chapterLinks.sort((a, b) => {
                if (typeof a.number === 'number' && typeof b.number === 'number' && a.number !== b.number) {
                    return a.number - b.number;
                }
                const mA = (a.title || '').match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i) || (a.url || '').match(/chapter-(\d+(?:\.\d+)?)/i);
                const mB = (b.title || '').match(/(?:chapter|ch\.?)\s*(\d+(?:\.\d+)?)/i) || (b.url || '').match(/chapter-(\d+(?:\.\d+)?)/i);
                return (mA ? parseFloat(mA[1]) : 0) - (mB ? parseFloat(mB[1]) : 0);
            });
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters on NovelBuddy! Ingesting in parallel...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                // High-speed direct REST API attempt
                if (item.mangaId && item.id) {
                    try {
                        const chRes = await fetchHtml(`${apiUrl}/titles/${item.mangaId}/chapters/${item.id}`, {
                            headers: { 'Referer': item.url || bookUrl }
                        });
                        const chJson = JSON.parse(chRes);
                        const chObj = chJson?.data?.chapter || chJson?.data;
                        const contentHtml = chObj?.content;
                        if (contentHtml && contentHtml.length > 50) {
                            return { title: chObj.name || item.title, text: cleanChapterHtmlWithImages(contentHtml) };
                        }
                    } catch (_) {}
                }

                // SSR __NEXT_DATA__ or HTML DOM fallback
                const chHtml = await fetchHtml(item.url, { headers: { 'Referer': bookUrl } });
                const chNext = chHtml.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
                if (chNext) {
                    try {
                        const chJson = JSON.parse(chNext[1]);
                        const initCh = chJson?.props?.pageProps?.initialChapter;
                        if (initCh?.content && initCh.content.length > 50) {
                            return { title: initCh.name || item.title, text: cleanChapterHtmlWithImages(initCh.content) };
                        }
                    } catch (_) {}
                }

                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('#chapter-article, .chapter-content, .content-inner, .reading-content, .novel-tts-content') || chDoc.body;
                contentEl.querySelectorAll('.ads, .ad, [class*="advertisement"], script, style, .report-chapter, .desc-text').forEach(e => e.remove());
                const chTitle = chDoc.querySelector('h1, h2, .chapter-title')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') };
            },
            8,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 50 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from NovelBuddy (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    // --- H. LNORI TEMPLATE (lnori.org / lnori.com - Single Book & Multi-Volume Series) ---
    async function crawlLnori(url, progressCb, options = {}) {
        progressCb?.('Connecting to Lnori...', 15);
        let origin = 'https://lnori.org';
        try { origin = new URL(url).origin; } catch (e) {}
        const isSeries = url.includes('/series/');

        function parseChaptersFromBookHtml(bookHtml, bookPageUrl) {
            const bDoc = new DOMParser().parseFromString(bookHtml, 'text/html');
            let sections = Array.from(bDoc.querySelectorAll('section.chapter, section[id^="page"], div.chapter-content, div.reading-content, article'));
            
            // Fallback: If no dedicated chapter sections found, check __NEXT_DATA__ SSR JSON
            if (sections.length === 0) {
                const nextDataMatch = bookHtml.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
                if (nextDataMatch) {
                    try {
                        const json = JSON.parse(nextDataMatch[1]);
                        const pageProps = json?.props?.pageProps;
                        const book = pageProps?.book || pageProps?.initialBook || pageProps;
                        const chaptersData = book?.chapters || pageProps?.chapters || [];
                        if (Array.isArray(chaptersData) && chaptersData.length > 0) {
                            window.AppLogger?.log('info', 'Lnori', `Found ${chaptersData.length} chapters in SSR __NEXT_DATA__ JSON`);
                            return chaptersData.map((ch, idx) => ({
                                title: ch.name || ch.title || `Chapter ${idx + 1}`,
                                text: cleanChapterHtmlWithImages(ch.content || ch.html || '', bookPageUrl),
                                url: `${bookPageUrl}#${ch.id || idx}`
                            }));
                        }
                    } catch (e) {
                        window.AppLogger?.log('warn', 'Lnori', `Failed to parse __NEXT_DATA__: ${e.message}`);
                    }
                }
                
                // Fallback 2: Parse main body container directly
                const mainBody = bDoc.querySelector('#chapter-article, .book-content, main, article, body');
                if (mainBody) {
                    sections = [mainBody];
                }
            }

            const extracted = [];
            sections.forEach((sec, idx) => {
                const titleEl = sec.querySelector('.chapter-title, h1, h2, h3, h4');
                let chTitle = titleEl?.textContent?.trim();
                if (!chTitle) {
                    const imgAlt = sec.querySelector('img')?.getAttribute('alt');
                    if (imgAlt) {
                        chTitle = imgAlt.replace(/\s*-\s*\d+$/, '').trim();
                    } else {
                        chTitle = idx === 0 ? 'Cover' : `Part ${idx + 1}`;
                    }
                }
                const cleaned = cleanChapterHtmlWithImages(sec.innerHTML, bookPageUrl);
                if (cleaned.length > 15 || /!\[Illustration\]/i.test(cleaned)) {
                    extracted.push({
                        title: chTitle,
                        text: cleaned,
                        url: `${bookPageUrl}#${sec.id || idx}`
                    });
                }
            });

            window.AppLogger?.log('info', 'Lnori', `Extracted ${extracted.length} chapters/parts from ${bookPageUrl}`);
            return extracted;
        }

        if (!isSeries) {
            // Single Book / Volume page (/book/{id}/{slug})
            progressCb?.('Ingesting entire Lnori book volume...', 25);
            window.AppLogger?.log('info', 'Lnori', `Fetching Lnori URL: ${url}`);
            const html = await fetchHtml(url, { headers: { 'Referer': origin + '/' } });
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const title = doc.querySelector('title')?.textContent?.replace(/\s*-\s*Lnori\s*$/i, '').trim() || doc.querySelector('h1')?.textContent?.trim() || 'Lnori Book';
            const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || doc.querySelector('.author')?.textContent?.trim() || 'Lnori Author';
            const summary = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 'Imported from Lnori';
            const tags = ['Lnori', 'Light Novel', 'Illustrated'];

            const bookChapters = parseChaptersFromBookHtml(html, url);
            const totalWords = bookChapters.reduce((sum, c) => sum + (c.text.trim().split(/\s+/).filter(Boolean).length || 0), 0);
            progressCb?.(`Parsed ${bookChapters.length} illustrated chapters from Lnori volume (~${totalWords.toLocaleString()} words)!`, 100);

            return {
                title,
                author,
                summary,
                tags,
                chapters: bookChapters,
                chapterList: bookChapters.map(c => ({ url: c.url, title: c.title })),
                totalChapterCount: bookChapters.length,
                isEpub: false,
                sourceUrl: url
            };
        } else {
            // Series page (/series/{id}/{slug})
            progressCb?.('Reading Lnori series volume index...', 20);
            const html = await fetchHtml(url, { headers: { 'Referer': origin + '/' } });
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const title = doc.querySelector('h1, title')?.textContent?.replace(/\s*-\s*Lnori\s*$/i, '').trim() || 'Lnori Series';
            const author = doc.querySelector('meta[name="author"], .author')?.textContent?.trim() || 'Lnori Author';
            const summary = doc.querySelector('.description, .synopsis, meta[name="description"]')?.textContent?.trim() || 'Imported from Lnori Series';
            const tags = ['Lnori', 'Light Novel Series', 'Illustrated'];

            // Find all book / volume links
            const bookUrls = [];
            const seen = new Set();
            doc.querySelectorAll('a[href*="/book/"]').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !seen.has(href)) {
                    seen.add(href);
                    const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                    const bookTitle = a.textContent?.trim() || `Volume ${bookUrls.length + 1}`;
                    bookUrls.push({ url: fullUrl, title: bookTitle });
                }
            });

            if (bookUrls.length === 0) throw new Error('No readable volumes found for this Lnori series.');

            if (activeCrawlController?.tocOnly) {
                progressCb?.(` Found ${bookUrls.length} volumes in Lnori series.`, 100);
                return {
                    title,
                    author,
                    summary,
                    tags,
                    chapters: [],
                    chapterList: bookUrls,
                    totalChapterCount: bookUrls.length,
                    isEpub: false,
                    sourceUrl: url
                };
            }

            progressCb?.(`Found ${bookUrls.length} volumes in Lnori series! Ingesting volumes concurrently...`, 30);

            // Max-speed concurrent volume fetching with crawlChapterPool
            const { chapters: volumeResults } = await crawlChapterPool(
                bookUrls,
                async (bItem) => {
                    const bHtml = await fetchHtml(bItem.url, { headers: { 'Referer': url } });
                    const volChs = parseChaptersFromBookHtml(bHtml, bItem.url);
                    // Return concatenated text block so crawlChapterPool validation passes (chData.text.length > 30)
                    const fullVolText = volChs.map(c => `### ${c.title}\n\n${c.text}`).join('\n\n---\n\n');
                    return {
                        title: bItem.title,
                        text: fullVolText,
                        volChapters: volChs
                    };
                },
                8, // Max-speed concurrency limit 8
                progressCb,
                { title, author, summary, chapterList: bookUrls },
                { delayMs: 40 } // Fast 40ms micro-delay between worker bursts
            );

            let allChapters = [];
            volumeResults.forEach(v => {
                if (v && Array.isArray(v.volChapters)) {
                    allChapters = allChapters.concat(v.volChapters);
                }
            });

            // Sync controller expected count to actual extracted individual chapters so ingestion finishes 100%
            if (activeCrawlController) {
                activeCrawlController.totalChapterCount = allChapters.length;
            }

            const totalWords = allChapters.reduce((sum, c) => sum + (c.text.trim().split(/\s+/).filter(Boolean).length || 0), 0);
            progressCb?.(` Loaded ${allChapters.length} chapters across ${bookUrls.length} Lnori volumes (~${totalWords.toLocaleString()} words)!`, 100);
            return {
                title,
                author,
                summary,
                tags,
                chapters: allChapters,
                chapterList: allChapters.map(c => ({ url: c.url, title: c.title })),
                totalChapterCount: allChapters.length,
                isEpub: false,
                sourceUrl: url
            };
        }
    }

    // --- I. WUXIA BOX TEMPLATE (wuxiabox.com / wuxiap.com / wuxiaclick.com) ---
    async function crawlWuxiaBox(url, progressCb) {
        progressCb?.('Connecting to Wuxia Box...', 15);
        let bookUrl = url.trim().replace(/_\d+\.html$/i, '.html');
        const origin = new URL(url).origin;

        const html = await fetchHtml(bookUrl, { headers: { 'Referer': 'https://www.wuxiabox.com/' } });
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1, .novel-title')?.textContent?.trim() || 'Wuxia Box Novel';
        const author = doc.querySelector('a[href*="/author/"], .author, meta[property="books:author"]')?.textContent?.trim() || 
                       html.match(/Author[：:]\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.trim() || 
                       html.match(/Author[：:]\s*([^<\n]+)/i)?.[1]?.trim() || 'Wuxia Box Author';
        const summary = doc.querySelector('#intro, .intro, .synopsis, .description')?.textContent?.trim() || '';
        const tags = ['Wuxia Box', 'Web Novel'];

        // Check if TOC is already known
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [WuxiaBox] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else {
            const seen = new Set();
            doc.querySelectorAll('a[href*="_"]').forEach(a => {
                const href = a.getAttribute('href');
                const m = href?.match(/_(\d+)\.html/);
                if (m && !seen.has(href)) {
                    seen.add(href);
                    const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                    const chTitle = a.querySelector('small')?.textContent?.trim() || a.textContent?.replace(/\s+/g, ' ').trim() || `Chapter ${m[1]}`;
                    chapterLinks.push({ url: fullUrl, title: chTitle, order: parseInt(m[1], 10) });
                }
            });
            chapterLinks.sort((a, b) => a.order - b.order);
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters on Wuxia Box! Ingesting in parallel...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url, { headers: { 'Referer': bookUrl } });
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const contentEl = chDoc.querySelector('section.page-in.content-wrap, #chapter-article section.page-in, #chapter-article, #content, .chapter-content') || chDoc.body;
                
                contentEl.querySelectorAll('.chapter-header, .recommends, .control-action, .ads, .ad, script, style, .report-chapter').forEach(e => e.remove());
                const chTitle = chDoc.querySelector('.titles h2, .chapter-header h2, h2, h1')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(contentEl.innerHTML || contentEl.textContent || '') };
            },
            8,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 100 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from Wuxia Box (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    // --- J. WTR-LAB TEMPLATE (wtr-lab.com - High-Speed Clean AI JSON API) ---
    async function crawlWtrLab(url, progressCb) {
        progressCb?.('Connecting to WTR-LAB...', 15);
        let bookUrl = url.trim().replace(/\/chapter[-/].*$/i, '');
        const origin = 'https://wtr-lab.com';

        const html = await fetchHtml(bookUrl, { headers: { 'Referer': 'https://wtr-lab.com/' } });
        let nextData = null;
        try {
            const nextMatch = html.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
            if (nextMatch) nextData = JSON.parse(nextMatch[1]);
        } catch (_) {}

        const serieData = nextData?.props?.pageProps?.serie?.serie_data || {};
        const rawId = serieData.raw_id || serieData.id || (bookUrl.match(/\/novel\/(\d+)/i) || [])[1];

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const title = serieData.data?.title || serieData.title || doc.querySelector('h1')?.textContent?.trim() || 'WTR-LAB Novel';
        const author = serieData.data?.author || serieData.author || 'WTR-LAB Author';
        const summary = serieData.data?.description || doc.querySelector('.description, .synopsis')?.textContent?.trim() || '';
        const tags = (serieData.tags || []).map(t => String(t)).concat(['WTR-LAB', 'Web Novel']);

        // Check if TOC is already known
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [WTR-LAB] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else if (rawId) {
            try {
                progressCb?.('Fetching complete chapter index from WTR-LAB API...', 25);
                const listText = await fetchHtml(`https://wtr-lab.com/api/chapters/${rawId}`, {
                    headers: { 'Referer': bookUrl }
                });
                const listJson = JSON.parse(listText);
                const chList = listJson.chapters || [];
                chList.sort((a, b) => (a.order || 0) - (b.order || 0));
                chapterLinks = chList.map(ch => ({
                    id: ch.id,
                    rawId: rawId,
                    order: ch.order,
                    title: ch.title || ch.name || `Section ${ch.order}`,
                    url: `https://wtr-lab.com/en/novel/${rawId}/${serieData.slug || 'novel'}/chapter-${ch.order}`
                }));
            } catch (apiErr) {
                console.warn('WTR-LAB chapters API error:', apiErr);
            }
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters on WTR-LAB! Ingesting via reader API...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                // Direct POST /api/reader/get API call for pristine paragraph text
                try {
                    const resText = await fetchHtml('https://wtr-lab.com/api/reader/get', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Referer': item.url || bookUrl
                        },
                        body: JSON.stringify({
                            translate: 'ai',
                            language: 'en',
                            raw_id: item.rawId,
                            chapter_no: item.order
                        })
                    });
                    const resJson = JSON.parse(resText);
                    const bodyLines = resJson?.data?.data?.body;
                    if (Array.isArray(bodyLines) && bodyLines.length > 0) {
                        const chTitle = resJson?.chapter?.title || item.title;
                        const bodyHtml = bodyLines.map(line => `<p>${line}</p>`).join('\n');
                        return { title: chTitle, text: cleanChapterHtmlWithImages(bodyHtml) };
                    }
                } catch (_) {}

                // Fallback to chapter page HTML
                const chHtml = await fetchHtml(item.url, { headers: { 'Referer': bookUrl } });
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const bodyEl = chDoc.querySelector('.chapter-body, .reader-body, main, article') || chDoc.body;
                bodyEl.querySelectorAll('script, style, nav, footer, header, .ads').forEach(e => e.remove());
                const chTitle = chDoc.querySelector('h1, h2, .chapter-title')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(bodyEl.innerHTML || bodyEl.textContent || '') };
            },
            6,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 150 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from WTR-LAB (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    // --- K. FUCKNOVELPIA TEMPLATE (fucknovelpia.com - WAF Referer Protected) ---
    async function crawlFuckNovelPia(url, progressCb) {
        progressCb?.('Connecting to FuckNovelPia...', 15);
        let bookUrl = url.trim().replace(/\/chapter\.php.*$/i, '');
        const origin = 'https://fucknovelpia.com';

        const html = await fetchHtml(bookUrl, { headers: { 'Referer': 'https://fucknovelpia.com/' } });
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1')?.textContent?.trim() || 'FuckNovelPia Novel';
        const author = doc.querySelector('.author, .byline, meta[name="author"]')?.getAttribute?.('content') || doc.querySelector('.author, .byline')?.textContent?.trim() || 'FuckNovelPia Author';
        const summary = doc.querySelector('.synopsis, .description, meta[name="description"]')?.getAttribute?.('content') || doc.querySelector('.synopsis, .description')?.textContent?.trim() || '';
        const tags = ['FuckNovelPia', 'Korean Web Novel'];

        // Check if TOC is already known
        let chapterLinks = [];
        const existingTOC = activeCrawlController?.chapterList || activeCrawlController?.novelMeta?.chapterList;
        if (existingTOC && Array.isArray(existingTOC) && existingTOC.length > 5) {
            console.log(`⚡ [FuckNovelPia] Reusing pre-indexed TOC (${existingTOC.length} chapters) for resume session.`);
            chapterLinks = [...existingTOC];
        } else {
            const seen = new Set();
            doc.querySelectorAll('a[href*="chapter.php"], a[href*="/chapter-"]').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !seen.has(href)) {
                    seen.add(href);
                    const fullUrl = href.startsWith('http') ? href : new URL(href, origin).href;
                    const chTitle = a.textContent?.replace(/\s+/g, ' ').trim() || `Chapter ${chapterLinks.length + 1}`;
                    chapterLinks.push({ url: fullUrl, title: chTitle });
                }
            });

            // Natural sort by chapter number
            if (chapterLinks.length > 1) {
                chapterLinks.sort((a, b) => {
                    const mA = a.url.match(/ch=(\d+)/i) || a.title.match(/(?:chapter|ch\.?)\s*(\d+)/i);
                    const mB = b.url.match(/ch=(\d+)/i) || b.title.match(/(?:chapter|ch\.?)\s*(\d+)/i);
                    const nA = mA ? parseInt(mA[1], 10) : 0;
                    const nB = mB ? parseInt(mB[1], 10) : 0;
                    return nA - nB;
                });
            }
        }

        if (chapterLinks.length === 0) chapterLinks = [{ url, title: 'Chapter 1' }];

        progressCb?.(`Found ${chapterLinks.length} chapters on FuckNovelPia! Ingesting in parallel...`, 30);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item) => {
                const chHtml = await fetchHtml(item.url, { headers: { 'Referer': bookUrl } });
                const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                const readerEl = chDoc.querySelector('.reader-wrap .reader, .reader, #reader') || chDoc.body;
                
                readerEl.querySelectorAll('.control-group, .control-action, script, style, .ads, .ad').forEach(e => e.remove());
                const chTitle = readerEl.querySelector('h1')?.textContent?.trim() || item.title;
                return { title: chTitle, text: cleanChapterHtmlWithImages(readerEl.innerHTML || readerEl.textContent || '') };
            },
            6,
            progressCb,
            { title, author, summary, chapterList: chapterLinks },
            { delayMs: 120 }
        );

        progressCb?.(` Loaded ${chapters.length}/${chapterLinks.length} chapters from FuckNovelPia (~${totalWords.toLocaleString()} words)!`, 100);
        return { title, author, summary, tags, chapters, chapterList: chapterLinks, totalChapterCount: chapterLinks.length, isEpub: false, sourceUrl: url };
    }

    async function crawlUniversal(url, progressCb) {
        progressCb?.('Analyzing web page structure with Universal Readability Engine...', 20);
        const html = await fetchHtml(url);
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('title, h1, .title, meta[property="og:title"]')?.textContent?.trim() || 'Web Novel';
        const author = doc.querySelector('meta[name="author"], .author, .byline')?.getAttribute('content') || doc.querySelector('.author, .byline')?.textContent?.trim() || 'Author';

        doc.querySelectorAll('script, style, nav, footer, header, .advertisement, .ads, .comment').forEach(el => el.remove());

        const chapterLinks = [];
        const baseUrl = url.endsWith('/') ? url : url + '/';
        doc.querySelectorAll('a[href*="chapter"], a[href*="ch-"], .chapter-list a, .toc a').forEach(a => {
            const href = a.getAttribute('href');
            const linkText = a.textContent?.trim();
            if (href && linkText && linkText.length < 100 && /\b(?:chapter|ch|episode|act|part|第)\b/i.test(linkText)) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                if (!chapterLinks.some(l => l.url === fullUrl)) {
                    chapterLinks.push({ url: fullUrl, title: linkText });
                }
            }
        });

        if (chapterLinks.length > 3) {
            progressCb?.(`Discovered TOC with ${chapterLinks.length} chapters! Ingesting...`, 35);
            const { chapters } = await crawlChapterPool(
                chapterLinks,
                async (item) => {
                    const chHtml = await fetchHtml(item.url);
                    const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                    chDoc.querySelectorAll('script, style, nav, footer, header, .ads').forEach(el => el.remove());
                    const el = chDoc.querySelector('article, main, .post-content, .entry-content, #content, .content') || chDoc.body;
                    return { title: item.title, text: cleanChapterHtmlWithImages(el.innerHTML || el.textContent || '') };
                },
                12,
                progressCb
            );
            return { title, author, summary: `Imported from ${url}`, tags: ['Web Novel'], chapters, isEpub: false, sourceUrl: url };
        }

        // Single article / chapter extraction
        const articleEl = doc.querySelector('article, main, .post-content, .entry-content, #content, .content, .post') || doc.body;
        const text = cleanChapterHtmlWithImages(articleEl.innerHTML || articleEl.textContent || '');

        progressCb?.(`Extracted article (${text.length} characters)`, 100);
        return {
            title,
            author,
            summary: text.substring(0, 250) + '...',
            tags: ['Web Article'],
            chapters: [{ title, text }],
            isEpub: false,
            sourceUrl: url
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. DIRECT EPUB BUFFER PARSER
    // ══════════════════════════════════════════════════════════════════════
    async function importEpubBuffer(buffer, fileName = "Novel.epub", progressCb) {
        progressCb?.('Parsing EPUB package...', 30);
        const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!JSZipClass) throw new Error('JSZip library not initialized.');
        const zip = await new JSZipClass().loadAsync(buffer);
        
        const cf = zip.file('META-INF/container.xml');
        if (!cf) throw new Error('Invalid EPUB: META-INF/container.xml missing');
        const cc = await cf.async('text');
        const cd = new DOMParser().parseFromString(cc, 'text/xml');
        const rp = cd.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf';
        const od = rp.includes('/') ? rp.substring(0, rp.lastIndexOf('/') + 1) : '';
        
        let of2 = zip.file(rp);
        if (!of2) {
            const opfCandidates = Object.keys(zip.files).filter(k => k.endsWith('.opf'));
            if (opfCandidates.length > 0) of2 = zip.file(opfCandidates[0]);
        }
        if (!of2) throw new Error('Package OPF file not found in EPUB');

        const oc = await of2.async('text');
        const opf = new DOMParser().parseFromString(oc, 'text/xml');
        const title = opf.querySelector('title')?.textContent?.trim() || fileName.replace(/\.epub$/i, '');
        const author = opf.querySelector('creator')?.textContent?.trim() || 'Author';
        const description = opf.querySelector('description')?.textContent?.trim() || '';

        const spineItems = Array.from(opf.querySelectorAll('spine itemref'));
        const manifestMap = {};
        const manifestMeta = {};
        opf.querySelectorAll('manifest item').forEach(it => {
            const id = it.getAttribute('id');
            manifestMap[id] = it.getAttribute('href');
            manifestMeta[id] = {
                mediaType: (it.getAttribute('media-type') || '').toLowerCase(),
                properties: (it.getAttribute('properties') || '').toLowerCase()
            };
        });

        const chapters = [];
        const seenChapterKeys = new Set();
        for (let i = 0; i < spineItems.length; i++) {
            const id = spineItems[i].getAttribute('idref');
            const href = manifestMap[id];
            if (!href) continue;

            const meta = manifestMeta[id] || {};
            const hrefPath = href.split('#')[0];
            if (meta.properties.split(/\s+/).includes('nav') ||
                !['application/xhtml+xml', 'text/html'].includes(meta.mediaType) ||
                /(?:^|\/)(?:nav|toc|table[-_ ]?of[-_ ]?contents)(?:[-_.]|\/|$)/i.test(hrefPath)) continue;
            
            const filePath = od ? (od + hrefPath) : hrefPath;
            let decodedFilePath = filePath;
            try { decodedFilePath = decodeURIComponent(filePath); } catch (e) {}
            let chFile = zip.file(filePath) || zip.file(hrefPath) || zip.file(decodedFilePath);
            if (!chFile) continue;

            const chHtml = await chFile.async('text');
            const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
            const headingEl = chDoc.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
            let heading = headingEl?.textContent?.trim() || `Chapter ${chapters.length + 1}`;
            if (headingEl && headingEl.parentNode) {
                headingEl.parentNode.removeChild(headingEl);
            }
            let bodyText = cleanChapterHtmlWithImages(chDoc.body?.innerHTML || chDoc.body?.textContent || '');

            // AO3 / EPUB metadata & summary chapter disambiguation:
            // If heading matches the novel title and contains summary, notes, or tags, label it "Summary"
            const lowerBody = (bodyText || '').toLowerCase();
            const isSummaryBlock = chDoc.querySelector('.meta, .tags, [class*="summary"], [class*="preface"], dl.tags') ||
                                   /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:summary|synopsis|warning|notes|author'?s?\s*note|简介|内容简介|前言|文案)[:：\s]/i.test(bodyText || '') ||
                                   lowerBody.includes('summary:') || lowerBody.includes('notes:') || lowerBody.includes('tags:');
            if ((heading.toLowerCase() === title.toLowerCase() || !heading || /^chapter\s+\d+$/i.test(heading)) && isSummaryBlock) {
                heading = 'Summary';
            }

            // Note: Do not attach chDoc (DOM Document) as it prevents IndexedDB structured cloning
            appendUniqueImportedChapter(chapters, {
                title: heading,
                text: bodyText,
                zipPath: filePath
            }, seenChapterKeys);
        }

        if (chapters.length === 0) {
            throw new Error('No readable chapters found in this EPUB file.');
        }

        progressCb?.(`Successfully loaded ${chapters.length} chapter(s)!`, 100);
        return {
            title,
            author,
            summary: description || `Imported from ${fileName}`,
            tags: ['EPUB Book', author],
            chapters,
            rawZip: zip,
            isEpub: true,
            sourceUrl: fileName
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. ROUTER DISPATCHER
    // ══════════════════════════════════════════════════════════════════════
    function detectUrlType(url) {
        if (!url || typeof url !== 'string') return 'unknown';
        const clean = url.trim().toLowerCase();
        if (clean.includes('novelbuddy.') || clean.includes('novel-buddy.')) return 'novelbuddy';
        if (clean.includes('lnori.')) return 'lnori';
        if (clean.includes('wuxiabox.com') || clean.includes('wuxiap.com') || clean.includes('wuxiaclick.com')) return 'wuxiabox';
        if (clean.includes('wtr-lab.com') || clean.includes('wtrlab.com')) return 'wtrlab';
        if (clean.includes('fucknovelpia.com') || clean.includes('novelpia.com')) return 'fucknovelpia';
        if (clean.includes('novel-bin.') || clean.includes('novelbin.') || clean.includes('mvlempyr.')) return 'novelbin';
        if (clean.includes('novelfire.')) return 'novelfire';
        if (clean.includes('archiveofourown.org')) return 'ao3';
        if (clean.includes('witchculttranslation.com')) return 'witchcult';
        if (clean.includes('lofter.com')) return 'lofter';
        if (clean.includes('royalroad.com') || clean.includes('scribblehub.com')) return 'royalroad';
        if (clean.includes('syosetu.com') || clean.includes('kakuyomu.jp')) return 'syosetu';
        if (clean.includes('novelfull.com') || clean.includes('boxnovel.com') || clean.includes('readlightnovel') || clean.includes('allnovelfull.') || clean.includes('readnovelfull.') || clean.includes('freewebnovel.') || clean.includes('lightnovelpub.')) return 'novelfull';
        if (clean.includes('pixiv.net/novel/')) return 'pixiv';
        return 'universal';
    }

    window.WebNovelImporter = {
        importEpubBuffer,
        detectType: detectUrlType,
        getBestImageUrl,
        cleanChapterHtmlWithImages,
        pause: () => {
            if (activeCrawlController) {
                activeCrawlController.isPaused = true;
                try { activeCrawlController.abortController?.abort(); } catch(e) {}
                try { window.NativeBridge?.releaseWakeLock?.(); } catch(e) {}
                return true;
            }
            return false;
        },
        cancel: () => {
            if (activeCrawlController) {
                activeCrawlController.isCancelled = true;
                try { activeCrawlController.abortController?.abort(); } catch(e) {}
                try { window.NativeBridge?.releaseWakeLock?.(); } catch(e) {}
                return true;
            }
            return false;
        },
        getActiveController: () => activeCrawlController,
        importUrl: async (url, progressCb, options = {}) => {
            if (!url || !url.trim()) throw new Error('Please enter a valid novel URL.');
            createCrawlController(options);
            const type = detectUrlType(url);
            console.log(`⚡ [LNCrawl Engine] Importing ${type.toUpperCase()} URL: ${url}`);

            let result;
            if (type === 'novelbuddy') result = await crawlNovelBuddy(url, progressCb);
            else if (type === 'lnori') result = await crawlLnori(url, progressCb, options);
            else if (type === 'wuxiabox') result = await crawlWuxiaBox(url, progressCb);
            else if (type === 'wtrlab') result = await crawlWtrLab(url, progressCb);
            else if (type === 'fucknovelpia') result = await crawlFuckNovelPia(url, progressCb);
            else if (type === 'novelbin') result = await crawlNovelBin(url, progressCb);
            else if (type === 'novelfire') result = await crawlNovelFire(url, progressCb);
            else if (type === 'witchcult') result = await crawlWitchCult(url, progressCb);
            else if (type === 'ao3') result = await crawlAO3(url, progressCb);
            else if (type === 'royalroad') result = await crawlRoyalRoad(url, progressCb);
            else if (type === 'syosetu') result = await crawlSyosetu(url, progressCb);
            else if (type === 'novelfull') result = await crawlNovelFull(url, progressCb);
            else if (type === 'lofter') result = await crawlLofter(url, progressCb);
            else if (type === 'pixiv') result = await crawlPixiv(url, progressCb);
            else result = await crawlUniversal(url, progressCb);

            if (result && activeCrawlController) {
                result.isPaused = !!activeCrawlController.isPaused;
                result.isCancelled = !!activeCrawlController.isCancelled;
                result.totalChapterCount = result.totalChapterCount || activeCrawlController.totalChapterCount || (activeCrawlController.chapterList ? activeCrawlController.chapterList.length : (result.chapterList ? result.chapterList.length : (result.chapters ? result.chapters.length : 0)));
                result.chapterList = result.chapterList || activeCrawlController.chapterList || [];
            }
            return result;
        },
        checkNovelUpdates: async (novelRecord, progressCb) => {
            if (!novelRecord || !novelRecord.sourceUrl) {
                return { hasUpdates: false, error: 'No remote source URL associated with this novel.' };
            }
            try {
                progressCb?.(`Checking remote chapters for "${novelRecord.title || 'novel'}"...`, 15);
                const remote = await window.WebNovelImporter.importUrl(novelRecord.sourceUrl, progressCb, { tocOnly: true });
                const remoteCount = (remote && typeof remote.totalChapterCount === 'number')
                    ? remote.totalChapterCount
                    : (remote?.chapterList ? remote.chapterList.length : (remote?.chapters ? remote.chapters.length : 0));
                if (!remote || remoteCount === 0) {
                    return { hasUpdates: false, error: 'Failed to retrieve remote table of contents.' };
                }
                const localChapters = novelRecord.rawChapters || novelRecord.chapters || [];
                const localCount = novelRecord.chapterCount || localChapters.length;
                const hasUpdates = remoteCount > localCount;
                const newCount = Math.max(0, remoteCount - localCount);
                return {
                    hasUpdates,
                    newCount,
                    localCount,
                    remoteCount,
                    remoteChapterList: remote.chapterList || [],
                    remoteTitle: remote.title || novelRecord.title
                };
            } catch (err) {
                return { hasUpdates: false, error: err.message };
            }
        }
    };

    console.log(" LightNovel-Crawler Multi-Source Ingestion Engine Active!");
})();
