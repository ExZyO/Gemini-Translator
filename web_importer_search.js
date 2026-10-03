// ══════════════════════════════════════════════════════════════════════
// MULTI-SOURCE WEB NOVEL SEARCH ENGINE
// Supports: NovelBuddy, RoyalRoad, NovelFire, NovelBin, NovelFull,
// NovelPub, FreeWebNovel, BoxNovel, ReadNovelFull, Lnori & Unified Search
// ══════════════════════════════════════════════════════════════════════
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebNovelSearch = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const fetchHtml = (url, opts) => (window.WebNovelImporter?.fetchHtml ? window.WebNovelImporter.fetchHtml(url, { isSearch: true, isCrawl: false, ...opts }) : window.fetch(url, opts).then(r => r.text()));

    // ══════════════════════════════════════════════════════════════════════
    // MULTI-SOURCE WEB NOVEL SEARCH ENGINE (NovelBuddy, RoyalRoad, NovelFire, AO3)
    // ══════════════════════════════════════════════════════════════════════
    function stripSearchHtml(str) {
        if (!str) return '';
        return str
            .replace(/<[^>]+>/g, '')
            .replace(/&#8217;/g, "'")
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function searchNovelBuddy(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = encodeURIComponent(query.trim());
        const results = [];
        const seenUrls = new Set();

        // 1. Direct Official High-Speed JSON API Query
        try {
            const apiUrl = `https://api.novelbuddy.me/titles/search?q=${cleanQ}`;
            let apiRes = null;
            try {
                const directRes = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/json, text/plain, */*' },
                    signal: AbortSignal.timeout(3500)
                });
                if (directRes.ok) {
                    apiRes = await directRes.text();
                }
            } catch (_) {}

            if (!apiRes) {
                apiRes = await fetchHtml(apiUrl, {
                    context: 'NovelBuddy API Search',
                    headers: {
                        'Referer': 'https://novelbuddy.com/',
                        'Accept': 'application/json, text/plain, */*'
                    }
                });
            }

            if (apiRes) {
                let json = null;
                try {
                    json = typeof apiRes === 'string' ? JSON.parse(apiRes) : apiRes;
                } catch (_) {}

                const items = json?.data?.items || json?.items || [];
                for (const it of items) {
                    if (!it.name || !it.url) continue;
                    const fullUrl = it.url.startsWith('http') ? it.url : `https://novelbuddy.com${it.url}`;
                    if (seenUrls.has(fullUrl)) continue;
                    seenUrls.add(fullUrl);

                    const authorStr = Array.isArray(it.authors) ? it.authors.map(a => a.name || a).filter(Boolean).join(', ') : (it.author || it.alt_name || 'NovelBuddy Author');
                    const chStr = it.stats?.chapters_count ? `${it.stats.chapters_count} chapters` : (it.displayChapters || (it.stats?.chaptersCount ? `${it.stats.chaptersCount} chapters` : ''));
                    const ratingStr = it.rating ? `${it.rating} ★` : (it.rating_avg ? `${it.rating_avg} ★` : '');

                    results.push({
                        id: it.id || ('nb_' + Math.random().toString(36).substring(2, 8)),
                        source: 'NovelBuddy',
                        title: (it.name || '').trim(),
                        url: fullUrl,
                        cover: it.cover || '',
                        author: authorStr,
                        chapters: chStr,
                        rating: ratingStr,
                        summary: it.summary ? stripSearchHtml(it.summary).substring(0, 240) + '…' : '',
                        tags: (it.genres || []).map(g => g.name || g).slice(0, 4),
                        status: it.status || ''
                    });
                }
                if (results.length > 0) {
                    return results;
                }
            }
        } catch (apiErr) {
            console.debug('[NovelBuddy] Direct API search fallback to HTML scraper:', apiErr.message);
        }

        // 2. Fallback: SSR HTML / __NEXT_DATA__
        try {
            const url = `https://novelbuddy.com/search?q=${cleanQ}`;
            const html = await fetchHtml(url, {
                context: 'NovelBuddy Web Search',
                headers: { 'Referer': 'https://novelbuddy.com/' }
            });
            if (html) {
                const nextMatch = html.match(/<script\s+id=["']__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/i);
                if (nextMatch) {
                    const data = JSON.parse(nextMatch[1]);
                    const items = data.props?.pageProps?.ssrItems || [];
                    for (const it of items) {
                        if (!it.name || !it.url) continue;
                        const fullUrl = it.url.startsWith('http') ? it.url : `https://novelbuddy.com${it.url}`;
                        if (seenUrls.has(fullUrl)) continue;
                        seenUrls.add(fullUrl);

                        results.push({
                            id: it.id || ('nb_' + Math.random().toString(36).substring(2, 8)),
                            source: 'NovelBuddy',
                            title: it.name.trim(),
                            url: fullUrl,
                            cover: it.cover || '',
                            author: Array.isArray(it.authors) ? it.authors.map(a => a.name).filter(Boolean).join(', ') : (it.author || 'NovelBuddy Author'),
                            chapters: it.displayChapters || (it.stats?.chaptersCount ? `${it.stats.chaptersCount} chapters` : ''),
                            rating: it.rating ? `${it.rating} ★` : '',
                            summary: it.summary ? stripSearchHtml(it.summary).substring(0, 240) + '…' : '',
                            tags: (it.genres || []).map(g => g.name || g).slice(0, 4),
                            status: it.status || ''
                        });
                    }
                }

                if (results.length === 0) {
                    const itemRegex = /<div class="book-item"[\s\S]*?<\/div>\s*<\/div>/gi;
                    let match;
                    while ((match = itemRegex.exec(html)) !== null) {
                        const block = match[0];
                        const linkM = block.match(/<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"/i);
                        if (!linkM) continue;
                        const imgM = block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
                        const fullUrl = linkM[1].startsWith('http') ? linkM[1] : `https://novelbuddy.me${linkM[1]}`;
                        if (seenUrls.has(fullUrl)) continue;
                        seenUrls.add(fullUrl);

                        results.push({
                            source: 'NovelBuddy',
                            title: stripSearchHtml(linkM[2]),
                            url: fullUrl,
                            cover: imgM ? imgM[1] : '',
                            author: 'NovelBuddy Author',
                            chapters: '',
                            tags: ['NovelBuddy']
                        });
                    }
                }
            }
        } catch (_) {}

        return results;
    }

    async function searchRoyalRoad(query) {
        const url = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`;
        const html = await fetchHtml(url);
        if (!html) return [];

        const results = [];
        const itemMatches = [...html.matchAll(/<div class="row fiction-list-item">([\s\S]*?)(?:<div class="row fiction-list-item"|<\/div>\s*<\/div>\s*<div class="text-center">|$)/gi)];

        for (const m of itemMatches) {
            const block = m[1];
            const titleMatch = block.match(/<h2 class="fiction-title">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
            if (!titleMatch) continue;

            const url = 'https://www.royalroad.com' + titleMatch[1];
            const title = stripSearchHtml(titleMatch[2]);

            const coverMatch = block.match(/<img[^>]+src="([^"]+)"/i);
            let cover = coverMatch ? coverMatch[1] : '';
            if (cover.includes('nocover-new-min.png')) cover = '';
            if (cover.includes('/covers-full/')) {
                cover = cover.replace(/\/covers-full\//i, '/covers-large/');
            }

            const chMatch = block.match(/(\d[\d,]*)\s*Chapters/i);
            const pageMatch = block.match(/(\d[\d,]*)\s*Pages/i);
            const chapters = chMatch ? `${chMatch[1]} chapters` : (pageMatch ? `${pageMatch[1]} pages` : '');

            const ratingMatch = block.match(/aria-label="Rating:\s*([0-9.]+)\s*out of 5"/i);
            const rating = ratingMatch ? `${ratingMatch[1]} ★` : '';

            const tags = [...block.matchAll(/class="label[^"]*fiction-tag"[^>]*>([\s\S]*?)<\/a>/gi)].map(t => stripSearchHtml(t[1])).slice(0, 4);

            const descMatch = block.match(/id="description-\d+"[^>]*>([\s\S]*?)<\/div>/i);
            const summary = descMatch ? stripSearchHtml(descMatch[1]).substring(0, 240) + '…' : '';

            results.push({
                source: 'RoyalRoad',
                title,
                url,
                cover,
                author: 'RoyalRoad Author',
                chapters,
                rating,
                tags,
                summary,
                status: block.includes('COMPLETED') ? 'Completed' : 'Ongoing'
            });
        }

        return results;
    }

    async function searchNovelFire(query) {
        const url = `https://novelfire.net/search?keyword=${encodeURIComponent(query)}`;
        const html = await fetchHtml(url, { headers: { 'Referer': 'https://novelfire.net/' } });
        if (!html) return [];

        const results = [];
        const itemMatches = [...html.matchAll(/<li class="novel-item">([\s\S]*?)<\/li>/gi)];

        for (const m of itemMatches) {
            const block = m[1];
            const linkM = block.match(/<a title="([^"]+)"\s+href="([^"]+)"/i) || block.match(/<a\s+href="([^"]+)"\s+title="([^"]+)"/i);
            if (!linkM) continue;

            const rawTitle = linkM[1].includes('/book/') ? linkM[2] : linkM[1];
            const rawHref = linkM[1].includes('/book/') ? linkM[1] : linkM[2];

            const title = stripSearchHtml(rawTitle);
            const url = rawHref.startsWith('http') ? rawHref : `https://novelfire.net${rawHref}`;

            const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
            let cover = coverM ? coverM[1] : '';
            if (cover && !cover.startsWith('http')) cover = `https://novelfire.net${cover}`;

            const chM = block.match(/(\d[\d,]*)\s*Chapters/i);
            const chapters = chM ? `${chM[1]} chapters` : '';

            const rankM = block.match(/icon-crown[^>]*><\/i>\s*([^<]+)/i);
            const rank = rankM ? stripSearchHtml(rankM[1]) : '';

            results.push({
                source: 'NovelFire',
                title,
                url,
                cover,
                author: 'NovelFire Author',
                chapters,
                rating: rank,
                tags: ['NovelFire'],
                summary: ''
            });
        }

        return results;
    }

    async function searchNovelBin(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const domains = ['https://novelbin.me', 'https://novelbin.com', 'https://novel-bin.com'];
        for (const dom of domains) {
            try {
                const url = `${dom}/search?keyword=${encodeURIComponent(cleanQ)}`;
                const html = await fetchHtml(url, { headers: { 'Referer': dom + '/' } });
                if (!html) continue;

                const results = [];
                // Pattern 1: Almanac card layout
                const cards = [...html.matchAll(/<a\s+href="([^"]+)"\s+class="[^"]*nl2-book-card[^"]*"\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
                for (const m of cards) {
                    const href = m[1];
                    const title = stripSearchHtml(m[2]);
                    const inner = m[3];
                    const coverMatch = inner.match(/<img[^>]+src="([^"]+)"/i);
                    let cover = coverMatch ? coverMatch[1] : '';
                    if (cover && !cover.startsWith('http')) cover = `${dom}${cover}`;
                    if (cover.includes('default.jpg')) cover = '';

                    const authorMatch = inner.match(/almanac-row-author">[\s\S]*?(?:<\/span>)?([^<]+)<\/span>/i);
                    const author = authorMatch ? stripSearchHtml(authorMatch[1]).trim() : '';

                    const chMatch = inner.match(/almanac-row-chapters">[\s\S]*?(?:<\/span>)?([^<]+)<\/span>/i);
                    const chapters = chMatch ? stripSearchHtml(chMatch[1]).trim() : '';

                    const fullUrl = href.startsWith('http') ? href : `${dom}${href}`;

                    results.push({
                        source: 'NovelBin',
                        title,
                        url: fullUrl,
                        cover,
                        author: author || 'NovelBin Author',
                        chapters: (chapters && chapters !== '—') ? chapters : '',
                        rating: '',
                        tags: ['NovelBin'],
                        summary: '',
                        status: 'Ongoing'
                    });
                }

                // Pattern 2: Classic NovelBin layout
                if (results.length === 0) {
                    const classicMatches = [...html.matchAll(/<div class="row">([\s\S]*?)<\/div>\s*<\/div>/gi)];
                    for (const cm of classicMatches) {
                        const block = cm[1];
                        const linkM = block.match(/<h3 class="novel-title">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
                        if (!linkM) continue;
                        const fullUrl = linkM[1].startsWith('http') ? linkM[1] : `${dom}${linkM[1]}`;
                        const title = stripSearchHtml(linkM[2]);
                        const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
                        let cover = coverM ? coverM[1] : '';
                        if (cover && !cover.startsWith('http')) cover = `${dom}${cover}`;

                        const authorM = block.match(/<span class="author">([\s\S]*?)<\/span>/i);
                        const author = authorM ? stripSearchHtml(authorM[1]) : '';

                        results.push({
                            source: 'NovelBin',
                            title,
                            url: fullUrl,
                            cover,
                            author: author || 'NovelBin Author',
                            chapters: '',
                            rating: '',
                            tags: ['NovelBin'],
                            summary: '',
                            status: 'Ongoing'
                        });
                    }
                }

                if (results.length > 0) return results;
            } catch (_) {}
        }
        return [];
    }

    async function searchNovelFull(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const domains = ['https://novelfull.com', 'https://novelfull.net'];
        for (const dom of domains) {
            try {
                const url = `${dom}/search?keyword=${encodeURIComponent(cleanQ)}`;
                const html = await fetchHtml(url, { headers: { 'Referer': dom + '/' } });
                if (!html) continue;

                const results = [];
                const itemMatches = [...html.matchAll(/<div class="row">([\s\S]*?)<\/div>\s*<\/div>/gi)];
                for (const m of itemMatches) {
                    const block = m[1];
                    const linkM = block.match(/<h3 class="novel-title">\s*<a\s+href="([^"]+)"\s+title="([^"]+)"/i) ||
                                  block.match(/<h3 class="novel-title">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
                    if (!linkM) continue;

                    const rawHref = linkM[1];
                    const rawTitle = linkM[2];
                    const fullUrl = rawHref.startsWith('http') ? rawHref : `${dom}${rawHref}`;
                    const title = stripSearchHtml(rawTitle);

                    const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
                    let cover = coverM ? coverM[1] : '';
                    if (cover && !cover.startsWith('http')) cover = `${dom}${cover}`;

                    const authorM = block.match(/<span class="author">([\s\S]*?)<\/span>/i);
                    const author = authorM ? stripSearchHtml(authorM[1]).trim() : 'NovelFull Author';

                    const chM = block.match(/class="chapter-title"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/latest-chapter">([\s\S]*?)<\/span>/i);
                    const chapters = chM ? stripSearchHtml(chM[1]).trim() : '';

                    results.push({
                        source: 'NovelFull',
                        title,
                        url: fullUrl,
                        cover,
                        author,
                        chapters,
                        rating: '',
                        tags: ['NovelFull'],
                        summary: '',
                        status: 'Ongoing'
                    });
                }
                if (results.length > 0) return results;
            } catch (_) {}
        }
        return [];
    }

    async function searchNovelPub(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const url = `https://www.novelpub.com/search?keyword=${encodeURIComponent(cleanQ)}`;
        try {
            const html = await fetchHtml(url, { headers: { 'Referer': 'https://www.novelpub.com/' } });
            if (!html) return [];

            const results = [];
            const itemMatches = [...html.matchAll(/<li class="novel-item">([\s\S]*?)<\/li>/gi)];
            for (const m of itemMatches) {
                const block = m[1];
                const linkM = block.match(/<h4 class="novel-title">\s*<a\s+href="([^"]+)"\s+title="([^"]+)"/i) ||
                              block.match(/<a\s+href="([^"]+)"\s+title="([^"]+)"/i);
                if (!linkM) continue;

                const fullUrl = linkM[1].startsWith('http') ? linkM[1] : `https://www.novelpub.com${linkM[1]}`;
                const title = stripSearchHtml(linkM[2]);

                const coverM = block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
                let cover = coverM ? coverM[1] : '';
                if (cover && !cover.startsWith('http')) cover = `https://www.novelpub.com${cover}`;

                const chM = block.match(/<span class="chapters">([\s\S]*?)<\/span>/i);
                const chapters = chM ? stripSearchHtml(chM[1]).trim() : '';

                results.push({
                    source: 'NovelPub',
                    title,
                    url: fullUrl,
                    cover,
                    author: 'NovelPub Author',
                    chapters,
                    rating: '',
                    tags: ['NovelPub'],
                    summary: '',
                    status: 'Ongoing'
                });
            }
            return results;
        } catch (_) {
            return [];
        }
    }

    async function searchFreeWebNovel(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const url = `https://freewebnovel.com/search?keyword=${encodeURIComponent(cleanQ)}`;
        try {
            const html = await fetchHtml(url, { headers: { 'Referer': 'https://freewebnovel.com/' } });
            if (!html) return [];

            const results = [];
            const itemMatches = [...html.matchAll(/<div class="li-row">([\s\S]*?)<\/div>\s*<\/div>/gi)];
            for (const m of itemMatches) {
                const block = m[1];
                const linkM = block.match(/<h3 class="tit">\s*<a\s+href="([^"]+)"\s+title="([^"]+)"/i);
                if (!linkM) continue;

                const fullUrl = linkM[1].startsWith('http') ? linkM[1] : `https://freewebnovel.com${linkM[1]}`;
                const title = stripSearchHtml(linkM[2]);

                const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
                let cover = coverM ? coverM[1] : '';
                if (cover && !cover.startsWith('http')) cover = `https://freewebnovel.com${cover}`;

                results.push({
                    source: 'FreeWebNovel',
                    title,
                    url: fullUrl,
                    cover,
                    author: 'FreeWebNovel Author',
                    chapters: '',
                    rating: '',
                    tags: ['FreeWebNovel'],
                    summary: '',
                    status: 'Ongoing'
                });
            }
            return results;
        } catch (_) {
            return [];
        }
    }

    async function searchBoxNovel(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const url = `https://boxnovel.com/?s=${encodeURIComponent(cleanQ)}&post_type=wp-manga`;
        try {
            const html = await fetchHtml(url, { headers: { 'Referer': 'https://boxnovel.com/' } });
            if (!html) return [];

            const results = [];
            const itemMatches = [...html.matchAll(/<div class="row c-tabs-item__content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi)];
            for (const m of itemMatches) {
                const block = m[1];
                const linkM = block.match(/<h3 class="h4">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
                              block.match(/<div class="post-title">\s*<h4[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
                if (!linkM) continue;

                const fullUrl = linkM[1].trim();
                const title = stripSearchHtml(linkM[2]).trim();

                const coverM = block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
                let cover = coverM ? coverM[1] : '';

                const chM = block.match(/class="font-meta chapter">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
                const chapters = chM ? stripSearchHtml(chM[1]).trim() : '';

                results.push({
                    source: 'BoxNovel',
                    title,
                    url: fullUrl,
                    cover,
                    author: 'BoxNovel Author',
                    chapters,
                    rating: '',
                    tags: ['BoxNovel'],
                    summary: '',
                    status: 'Ongoing'
                });
            }
            return results;
        } catch (_) {
            return [];
        }
    }

    async function searchReadNovelFull(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const url = `https://readnovelfull.com/search?keyword=${encodeURIComponent(cleanQ)}`;
        try {
            const html = await fetchHtml(url, { headers: { 'Referer': 'https://readnovelfull.com/' } });
            if (!html) return [];

            const results = [];
            const itemMatches = [...html.matchAll(/<div class="row">([\s\S]*?)<\/div>\s*<\/div>/gi)];
            for (const m of itemMatches) {
                const block = m[1];
                const linkM = block.match(/<h3 class="novel-title">\s*<a\s+href="([^"]+)"\s+title="([^"]+)"/i);
                if (!linkM) continue;

                const fullUrl = linkM[1].startsWith('http') ? linkM[1] : `https://readnovelfull.com${linkM[1]}`;
                const title = stripSearchHtml(linkM[2]);

                const coverM = block.match(/<img[^>]+src="([^"]+)"/i);
                let cover = coverM ? coverM[1] : '';
                if (cover && !cover.startsWith('http')) cover = `https://readnovelfull.com${cover}`;

                results.push({
                    source: 'ReadNovelFull',
                    title,
                    url: fullUrl,
                    cover,
                    author: 'ReadNovelFull Author',
                    chapters: '',
                    rating: '',
                    tags: ['ReadNovelFull'],
                    summary: '',
                    status: 'Ongoing'
                });
            }
            return results;
        } catch (_) {
            return [];
        }
    }

    async function searchLnori(query) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim().toLowerCase();

        // Check 5-minute in-memory cache of Lnori catalog to avoid redundant network overhead
        let catalog = null;
        if (typeof window !== 'undefined' && window.__lnoriLibraryCache && (Date.now() - window.__lnoriLibraryCache.timestamp < 300000)) {
            catalog = window.__lnoriLibraryCache.data;
        }

        if (!catalog || catalog.length === 0) {
            try {
                const url = 'https://lnori.com/library';
                let html = null;
                // Lnori supports direct CORS (Access-Control-Allow-Origin: *), try direct fetch first for instant response
                try {
                    const directRes = await fetch(url);
                    if (directRes.ok) {
                        html = await directRes.text();
                    }
                } catch (_) {
                    html = null;
                }

                if (!html) {
                    html = await fetchHtml(url, { headers: { 'Referer': 'https://lnori.com/' } });
                }
                if (!html) return [];

                catalog = [];
                let doc = null;
                if (typeof DOMParser !== 'undefined') {
                    try {
                        doc = new DOMParser().parseFromString(html, 'text/html');
                    } catch (_) {
                        doc = null;
                    }
                }

                if (doc) {
                    const cards = Array.from(doc.querySelectorAll('article.card'));
                    for (const card of cards) {
                        const title = (card.getAttribute('data-t') || card.querySelector('.card-title, h3, h2')?.textContent || '').trim();
                        const author = (card.getAttribute('data-a') || card.querySelector('.card-author, .author')?.textContent || 'Lnori Author').trim();
                        const rawTags = (card.getAttribute('data-tags') || '').toLowerCase();
                        const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
                        const volCount = card.getAttribute('data-v');
                        const year = card.getAttribute('data-d');

                        let cover = card.querySelector('.card-cover img, img')?.getAttribute('src') || '';
                        if (cover && cover.startsWith('/')) cover = 'https://lnori.com' + cover;

                        let href = card.querySelector('a.stretched-link, a[href*="/series/"], a[href*="/book/"], a')?.getAttribute('href') || '';
                        if (href && !href.startsWith('http')) {
                            href = 'https://lnori.com' + (href.startsWith('/') ? '' : '/') + href;
                        }

                        if (title && href) {
                            catalog.push({
                                source: 'Lnori',
                                title,
                                url: href,
                                cover,
                                author,
                                chapters: volCount ? `${volCount} volumes` : (href.includes('/series/') ? 'Series' : 'Novel'),
                                rating: year ? `★ ${year}` : '★ Lnori',
                                tags: tags.slice(0, 5),
                                summary: tags.length ? `Genres: ${tags.join(', ')}` : 'Available on Lnori Light Novels',
                                status: 'Completed'
                            });
                        }
                    }
                }

                // Fallback regex parsing if DOMParser is unavailable or returned 0 cards
                if (catalog.length === 0) {
                    const cardRegex = /<article[^>]*class=["'][^"']*\bcard\b[^"']*["']([^>]*)>([\s\S]*?)<\/article>/gi;
                    let match;
                    while ((match = cardRegex.exec(html)) !== null) {
                        const attrs = match[1];
                        const body = match[2];
                        const titleM = attrs.match(/data-t=["']([^"']+)["']/i) || body.match(/class=["'][^"']*card-title[^"']*["'][^>]*>([^<]+)<\//i);
                        const authorM = attrs.match(/data-a=["']([^"']+)["']/i) || body.match(/class=["'][^"']*card-author[^"']*["'][^>]*>([^<]+)<\//i);
                        const tagsM = attrs.match(/data-tags=["']([^"']+)["']/i);
                        const volM = attrs.match(/data-v=["']([^"']+)["']/i);
                        const yearM = attrs.match(/data-d=["']([^"']+)["']/i);
                        const coverM = body.match(/<img[^>]+src=["']([^"']+)["']/i);
                        const linkM = body.match(/<a[^>]+href=["']([^"']+)["']/i);

                        if (titleM && linkM) {
                            const title = stripSearchHtml(titleM[1]).trim();
                            let href = linkM[1].trim();
                            if (!href.startsWith('http')) href = 'https://lnori.com' + (href.startsWith('/') ? '' : '/') + href;
                            let cover = coverM ? coverM[1].trim() : '';
                            if (cover && cover.startsWith('/')) cover = 'https://lnori.com' + cover;
                            const author = authorM ? stripSearchHtml(authorM[1]).trim() : 'Lnori Author';
                            const tags = tagsM ? tagsM[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
                            const volCount = volM ? volM[1] : '';
                            const year = yearM ? yearM[1] : '';

                            catalog.push({
                                source: 'Lnori',
                                title,
                                url: href,
                                cover,
                                author,
                                chapters: volCount ? `${volCount} volumes` : (href.includes('/series/') ? 'Series' : 'Novel'),
                                rating: year ? `★ ${year}` : '★ Lnori',
                                tags: tags.slice(0, 5),
                                summary: tags.length ? `Genres: ${tags.join(', ')}` : 'Available on Lnori Light Novels',
                                status: 'Completed'
                            });
                        }
                    }
                }

                if (catalog.length > 0 && typeof window !== 'undefined') {
                    window.__lnoriLibraryCache = {
                        data: catalog,
                        timestamp: Date.now()
                    };
                }
            } catch (err) {
                console.warn('[searchLnori] Error fetching Lnori library:', err);
                return [];
            }
        }

        if (!catalog || catalog.length === 0) return [];

        // Smart substring & token filtering
        const tokens = cleanQ.split(/[\s:_\-]+/).filter(Boolean);
        return catalog.filter(n => {
            const t = (n.title || '').toLowerCase();
            const a = (n.author || '').toLowerCase();
            const tags = n.tags || [];

            // Direct substring match
            if (t.includes(cleanQ) || a.includes(cleanQ) || tags.some(tag => tag.includes(cleanQ))) return true;

            // Multi-token match: all tokens present
            if (tokens.length > 1) {
                const allTokensMatch = tokens.every(tok => t.includes(tok) || a.includes(tok) || tags.some(tag => tag.includes(tok)));
                if (allTokensMatch) return true;
            }

            return false;
        });
    }

    async function searchNovels(query, source = 'all', onPartialResults = null) {
        if (!query || !query.trim()) return [];
        const cleanQ = query.trim();
        const src = (source || 'all').replace(/[\s\-_]+/g, '').toLowerCase();

        const withTimeout = (p, ms = 20000) => Promise.race([
            p,
            new Promise(resolve => setTimeout(() => resolve([]), ms))
        ]);

        const runners = [];
        let aggregated = [];
        const seenUrls = new Set();

        const sortResults = (list) => {
            const qLower = cleanQ.toLowerCase();
            list.sort((a, b) => {
                const aTitle = (a.title || '').toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                const aExact = aTitle === qLower ? 3 : (aTitle.startsWith(qLower) ? 2 : (aTitle.includes(qLower) ? 1 : 0));
                const bExact = bTitle === qLower ? 3 : (bTitle.startsWith(qLower) ? 2 : (bTitle.includes(qLower) ? 1 : 0));
                if (bExact !== aExact) return bExact - aExact;
                const aCover = a.cover ? 1 : 0;
                const bCover = b.cover ? 1 : 0;
                return bCover - aCover;
            });
        };

        const emitPartial = () => {
            if (typeof onPartialResults === 'function') {
                try {
                    const copy = [...aggregated];
                    sortResults(copy);
                    onPartialResults(copy);
                } catch (_) {}
            }
        };

        const registerRunner = (p) => {
            const wrapped = p.then(items => {
                if (Array.isArray(items) && items.length > 0) {
                    let added = false;
                    for (const item of items) {
                        const u = (item.url || '').replace(/\/$/, '');
                        if (u && !seenUrls.has(u)) {
                            seenUrls.add(u);
                            aggregated.push(item);
                            added = true;
                        }
                    }
                    if (added) {
                        emitPartial();
                    }
                }
                return items;
            }).catch(() => []);
            runners.push(withTimeout(wrapped, 20000));
        };

        if (src === 'all' || src === 'novelbuddy') {
            registerRunner(searchNovelBuddy(cleanQ));
        }
        if (src === 'all' || src === 'royalroad') {
            registerRunner(searchRoyalRoad(cleanQ));
        }
        if (src === 'all' || src === 'novelfull') {
            registerRunner(searchNovelFull(cleanQ));
        }
        if (src === 'all' || src === 'novelbin') {
            registerRunner(searchNovelBin(cleanQ));
        }
        if (src === 'all' || src === 'novelpub') {
            registerRunner(searchNovelPub(cleanQ));
        }
        if (src === 'all' || src === 'freewebnovel') {
            registerRunner(searchFreeWebNovel(cleanQ));
        }
        if (src === 'all' || src === 'boxnovel') {
            registerRunner(searchBoxNovel(cleanQ));
        }
        if (src === 'all' || src === 'readnovelfull') {
            registerRunner(searchReadNovelFull(cleanQ));
        }
        if (src === 'all' || src === 'novelfire') {
            registerRunner(searchNovelFire(cleanQ));
        }
        if (src === 'all' || src === 'lnori') {
            registerRunner(searchLnori(cleanQ));
        }

        await Promise.allSettled(runners);
        sortResults(aggregated);
        return aggregated;
    }

  return {
    stripSearchHtml,
    searchNovelBuddy,
    searchRoyalRoad,
    searchNovelFire,
    searchNovelBin,
    searchNovelFull,
    searchNovelPub,
    searchFreeWebNovel,
    searchBoxNovel,
    searchReadNovelFull,
    searchLnori,
    searchNovels
  };
}));
