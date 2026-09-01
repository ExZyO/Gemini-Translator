// Universal Web Novel & Fanfiction Importer (AO3, Lofter, Syosetu & Multi-Site)
(function() {

    // ══════════════════════════════════════════════════════════════════════
    // URL DETECTION & ROUTING
    // ══════════════════════════════════════════════════════════════════════
    function detectUrlType(url) {
        if (!url || typeof url !== 'string') return 'unknown';
        const clean = url.trim().toLowerCase();
        if (clean.includes('archiveofourown.org')) return 'ao3';
        if (clean.includes('lofter.com')) return 'lofter';
        if (clean.includes('tumblr.com')) return 'tumblr';
        if (clean.includes('syosetu.com')) return 'syosetu';
        if (clean.includes('pixiv.net')) return 'pixiv';
        if (clean.includes('kakuyomu.jp')) return 'kakuyomu';
        if (clean.includes('royalroad.com')) return 'royalroad';
        return 'universal';
    }

    // ══════════════════════════════════════════════════════════════════════
    // 1. AO3 INGESTION ENGINE (ARCHIVE OF OUR OWN)
    // ══════════════════════════════════════════════════════════════════════
    async function importAO3(url, progressCb) {
        progressCb?.('Analyzing AO3 work URL...', 10);
        
        // Extract numeric Work ID
        const match = url.match(/works\/(\d+)/);
        if (!match) throw new Error('Invalid AO3 URL. Could not find work ID.');
        const workId = match[1];

        // Step 1: Try direct 1-shot official EPUB download (Fastest, zero rate limit)
        progressCb?.('Fetching full work EPUB from AO3...', 25);
        const epubUrl = `https://download.archiveofourown.org/downloads/${workId}/work.epub`;
        
        try {
            const buffer = await window.NativeBridge.downloadBinary(epubUrl);
            if (buffer && buffer.byteLength > 1000) {
                progressCb?.('Parsing official AO3 EPUB package...', 60);
                const zip = await (window.JSZip ? window.JSZip.loadAsync(buffer) : (new JSZip()).loadAsync(buffer));
                
                // Parse OPF for metadata
                const containerXml = await zip.file('META-INF/container.xml')?.async('text');
                let opfPath = 'OEBPS/content.opf';
                if (containerXml) {
                    const parser = new DOMParser();
                    const cDoc = parser.parseFromString(containerXml, 'text/xml');
                    opfPath = cDoc.querySelector('rootfile')?.getAttribute('full-path') || opfPath;
                }

                const opfDoc = new DOMParser().parseFromString(await zip.file(opfPath).async('text'), 'text/xml');
                const title = opfDoc.querySelector('title')?.textContent?.trim() || `AO3 Work ${workId}`;
                const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'AO3 Author';
                const description = opfDoc.querySelector('description')?.textContent?.trim() || '';

                // Extract all chapter XHTML files in spine order
                const spineItems = Array.from(opfDoc.querySelectorAll('spine itemref'));
                const manifestMap = {};
                opfDoc.querySelectorAll('manifest item').forEach(it => {
                    manifestMap[it.getAttribute('id')] = it.getAttribute('href');
                });

                const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
                const chapters = [];

                for (let i = 0; i < spineItems.length; i++) {
                    const idref = spineItems[i].getAttribute('idref');
                    const href = manifestMap[idref];
                    if (!href) continue;
                    
                    const filePath = opfDir + href;
                    const chFile = zip.file(filePath);
                    if (!chFile) continue;

                    const chHtml = await chFile.async('text');
                    const chDoc = new DOMParser().parseFromString(chHtml, 'application/xhtml+xml');
                    const heading = chDoc.querySelector('h1, h2, h3, .heading')?.textContent?.trim() || `Chapter ${chapters.length + 1}`;
                    const bodyText = chDoc.body?.textContent?.trim() || '';

                    if (bodyText.length > 50) {
                        chapters.push({
                            title: heading,
                            text: bodyText,
                            doc: chDoc,
                            zipPath: filePath
                        });
                    }
                }

                progressCb?.(`Successfully imported ${chapters.length} chapters!`, 100);
                return {
                    title,
                    author,
                    summary: description,
                    tags: ['AO3', author],
                    chapters,
                    rawZip: zip,
                    isEpub: true,
                    sourceUrl: url
                };
            }
        } catch (epubErr) {
            console.warn('Direct AO3 EPUB fetch failed, falling back to full-work HTML:', epubErr);
        }

        // Step 2: Fallback to HTML ?view_full_work=true&view_adult=true
        progressCb?.('Fetching complete work HTML from AO3 (Adult Bypass)...', 40);
        const fullWorkUrl = `https://archiveofourown.org/works/${workId}?view_full_work=true&view_adult=true`;
        const res = await window.NativeBridge.fetchUrl(fullWorkUrl);
        const html = await res.text();

        // Check if Cloudflare challenged the request (happens on public web proxies)
        if (html.includes('_cf_chl_opt') || html.includes('Shields are up!') || html.includes('cf-browser-verification')) {
            throw new Error('Cloudflare challenged the web proxy. Please install the GeminiTranslator.apk on Android for direct 100% bypass without proxy blocks, or paste the text directly into the Text tab.');
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h2.title, .title.heading')?.textContent?.trim() || `AO3 Work ${workId}`;
        const author = doc.querySelector('a[rel="author"]')?.textContent?.trim() || 'AO3 Author';
        const summary = doc.querySelector('.summary .userstuff')?.textContent?.trim() || '';
        
        const tags = [];
        doc.querySelectorAll('dd.fandom a, dd.rating a, dd.warning a, dd.relationship a, dd.character a, dd.freeform a').forEach(a => {
            if (a.textContent?.trim()) tags.push(a.textContent.trim());
        });

        const chapterNodes = doc.querySelectorAll('#chapters .chapter, #chapters > .userstuff');
        const chapters = [];

        if (chapterNodes.length > 0) {
            chapterNodes.forEach((cn, idx) => {
                const heading = cn.querySelector('.title, h3.heading')?.textContent?.trim() || `Chapter ${idx + 1}`;
                const contentEl = cn.querySelector('.userstuff, div[role="article"]') || cn;
                const text = contentEl.textContent?.trim() || '';
                if (text.length > 30) {
                    chapters.push({ title: heading, text });
                }
            });
        } else {
            // Single chapter work
            const contentEl = doc.querySelector('#chapters, .userstuff[role="article"], .work.meta .userstuff') || doc.body;
            chapters.push({ title: title, text: contentEl.textContent?.trim() || '' });
        }

        progressCb?.(`Loaded ${chapters.length} chapters from AO3!`, 100);
        return {
            title,
            author,
            summary,
            tags,
            chapters,
            rawZip: null,
            isEpub: false,
            sourceUrl: url
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. LOFTER INGESTION ENGINE (乐乎)
    // ══════════════════════════════════════════════════════════════════════
    async function importLofter(url, progressCb) {
        progressCb?.('Connecting to NetEase Lofter...', 15);

        const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
        const res = await window.NativeBridge.fetchUrl(url, { userAgent: mobileUA });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('.title, h2.tit, .posttitle, h1')?.textContent?.trim() || 'Lofter Novel';
        const author = doc.querySelector('.author, .name, .blogtitle, .user-name')?.textContent?.trim() || 'Lofter Author';
        
        const tags = [];
        doc.querySelectorAll('.tag a, .opt-tag a, a[href*="/tag/"]').forEach(t => {
            const txt = t.textContent?.replace(/^#/, '').trim();
            if (txt) tags.push(txt);
        });

        const chapters = [];

        // Extract primary chapter body
        const bodyEl = doc.querySelector('.post-ctc, .text, .content, .post-text, .detail, .article-content') || doc.body;
        const mainText = bodyEl.textContent?.trim() || '';

        chapters.push({
            title: title,
            text: mainText
        });

        // Check if there are next chapter links (Series / Collection)
        const nextLink = doc.querySelector('a.next, a.nextpost, a.w-opt-next, a:has-text("下一篇"), a:has-text("下一章")')?.getAttribute('href');
        
        progressCb?.(`Loaded Lofter post: "${title}" (${mainText.length} characters)`, 100);

        return {
            title,
            author,
            summary: mainText.substring(0, 300) + '...',
            tags,
            chapters,
            rawZip: null,
            isEpub: false,
            sourceUrl: url,
            hasNext: !!nextLink
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. SYOSETU INGESTION ENGINE (小説家になろう)
    // ══════════════════════════════════════════════════════════════════════
    
    // ══════════════════════════════════════════════════════════════════════
    // 2.5 TUMBLR INGESTION ENGINE
    // ══════════════════════════════════════════════════════════════════════
    async function importTumblr(url, progressCb) {
        progressCb?.('Connecting to Tumblr...', 20);

        const res = await window.NativeBridge.fetchUrl(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title, h1, .post-title')?.textContent?.trim() || 'Tumblr Story';
        const author = doc.querySelector('meta[name="author"], meta[property="article:author"]')?.getAttribute('content') || doc.querySelector('.author, .blog-name, .post-author')?.textContent?.trim() || 'Tumblr Author';

        // Extract tags
        const tags = [];
        doc.querySelectorAll('.post-tags a, .tag, a[href*="/tagged/"]').forEach(t => {
            const txt = t.textContent?.replace(/^#/, '').trim();
            if (txt) tags.push(txt);
        });

        // Clean out junk
        doc.querySelectorAll('script, style, nav, footer, header, .like_and_reblog_buttons, .notes').forEach(el => el.remove());

        const bodyEl = doc.querySelector('article, .post-body, .body-text, .post_body, .post-content, .post, main') || doc.body;
        const mainText = bodyEl.textContent?.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() || '';

        progressCb?.(`Loaded Tumblr post: "${title}" (${mainText.length} characters)`, 100);

        return {
            title,
            author,
            summary: mainText.substring(0, 300) + '...',
            tags: tags.length > 0 ? tags : ['Tumblr', author],
            chapters: [{ title, text: mainText }],
            rawZip: null,
            isEpub: false,
            sourceUrl: url
        };
    }

    async function importSyosetu(url, progressCb) {
        progressCb?.('Connecting to Syosetu...', 20);
        const res = await window.NativeBridge.fetchUrl(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('.novel_title, h1')?.textContent?.trim() || 'Syosetu Web Novel';
        const author = doc.querySelector('.novel_writername, .writer')?.textContent?.trim() || 'Syosetu Author';
        const summary = doc.querySelector('#novel_ex')?.textContent?.trim() || '';

        const chapters = [];
        const indexLinks = Array.from(doc.querySelectorAll('.novel_sublist2 .subtitle a, .index_box a'));

        if (indexLinks.length > 0) {
            progressCb?.(`Found ${indexLinks.length} chapters on Syosetu index. Fetching...`, 40);
            const baseUrl = url.endsWith('/') ? url : url + '/';
            
            // Fetch first batch of chapters
            for (let i = 0; i < Math.min(indexLinks.length, 30); i++) {
                const chHref = indexLinks[i].getAttribute('href');
                const chUrl = chHref.startsWith('http') ? chHref : new URL(chHref, baseUrl).href;
                const chTitle = indexLinks[i].textContent?.trim() || `Chapter ${i + 1}`;
                
                progressCb?.(`Fetching chapter ${i + 1}/${indexLinks.length} (${chTitle})...`, Math.round(40 + (i / indexLinks.length) * 50));
                
                try {
                    const chRes = await window.NativeBridge.fetchUrl(chUrl);
                    const chDoc = new DOMParser().parseFromString(await chRes.text(), 'text/html');
                    const chBody = chDoc.querySelector('#novel_honbun, .novel_honbun')?.textContent?.trim() || '';
                    if (chBody) {
                        chapters.push({ title: chTitle, text: chBody });
                    }
                } catch (e) {
                    console.warn('Syosetu chapter error:', e);
                }
            }
        } else {
            // Single chapter
            const body = doc.querySelector('#novel_honbun, .novel_honbun')?.textContent?.trim() || doc.body.textContent?.trim();
            chapters.push({ title, text: body });
        }

        progressCb?.(`Loaded ${chapters.length} Syosetu chapters!`, 100);
        return {
            title,
            author,
            summary,
            tags: ['Syosetu', 'Web Novel'],
            chapters,
            rawZip: null,
            isEpub: false,
            sourceUrl: url
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. UNIVERSAL WEB NOVEL & ARTICLE SCRAPER (FALLBACK)
    // ══════════════════════════════════════════════════════════════════════
    async function importUniversal(url, progressCb) {
        progressCb?.('Scraping web page...', 30);
        const res = await window.NativeBridge.fetchUrl(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('title, h1, .title, meta[property="og:title"]')?.textContent?.trim() || 'Web Novel';
        const author = doc.querySelector('meta[name="author"], .author, .byline')?.getAttribute('content') || doc.querySelector('.author, .byline')?.textContent?.trim() || 'Online Author';
        
        // Remove junk elements
        doc.querySelectorAll('script, style, nav, footer, header, .advertisement, .ads, .comment').forEach(el => el.remove());
        
        const articleEl = doc.querySelector('article, main, .post, .content, .entry-content, #content') || doc.body;
        const text = articleEl.textContent?.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() || '';

        progressCb?.(`Extracted article (${text.length} characters)`, 100);
        return {
            title,
            author,
            summary: text.substring(0, 250) + '...',
            tags: ['Web Article'],
            chapters: [{ title, text }],
            rawZip: null,
            isEpub: false,
            sourceUrl: url
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // GLOBAL ROUTER DISPATCHER
    // ══════════════════════════════════════════════════════════════════════
    
    async function importEpubBuffer(buffer, fileName = "AO3_Work.epub", progressCb) {
        progressCb?.('Parsing EPUB package...', 30);
        const zip = await (window.JSZip ? window.JSZip.loadAsync(buffer) : (new JSZip()).loadAsync(buffer));
        
        const containerXml = await zip.file('META-INF/container.xml')?.async('text');
        let opfPath = 'OEBPS/content.opf';
        if (containerXml) {
            const parser = new DOMParser();
            const cDoc = parser.parseFromString(containerXml, 'text/xml');
            opfPath = cDoc.querySelector('rootfile')?.getAttribute('full-path') || opfPath;
        }

        const opfDoc = new DOMParser().parseFromString(await zip.file(opfPath).async('text'), 'text/xml');
        const title = opfDoc.querySelector('title')?.textContent?.trim() || fileName.replace(/\.epub$/i, '');
        const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Author';
        const description = opfDoc.querySelector('description')?.textContent?.trim() || '';

        const spineItems = Array.from(opfDoc.querySelectorAll('spine itemref'));
        const manifestMap = {};
        opfDoc.querySelectorAll('manifest item').forEach(it => {
            manifestMap[it.getAttribute('id')] = it.getAttribute('href');
        });

        const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
        const chapters = [];

        for (let i = 0; i < spineItems.length; i++) {
            const idref = spineItems[i].getAttribute('idref');
            const href = manifestMap[idref];
            if (!href) continue;
            
            const filePath = opfDir + href;
            const chFile = zip.file(filePath);
            if (!chFile) continue;

            const chHtml = await chFile.async('text');
            const chDoc = new DOMParser().parseFromString(chHtml, 'application/xhtml+xml');
            const heading = chDoc.querySelector('h1, h2, h3, .heading')?.textContent?.trim() || `Chapter ${chapters.length + 1}`;
            const bodyText = chDoc.body?.textContent?.trim() || '';

            if (bodyText.length > 50) {
                chapters.push({
                    title: heading,
                    text: bodyText,
                    doc: chDoc,
                    zipPath: filePath
                });
            }
        }

        progressCb?.(`Successfully loaded ${chapters.length} chapters!`, 100);
        return {
            title,
            author,
            summary: description || `Imported from ${fileName}`,
            tags: ['AO3 / EPUB', author],
            chapters,
            rawZip: zip,
            isEpub: true,
            sourceUrl: fileName
        };
    }

    window.WebNovelImporter = {
        importEpubBuffer,

        detectType: detectUrlType,
        
        importUrl: async (url, progressCb) => {
            if (!url || !url.trim()) throw new Error('Please enter a valid novel or fanfiction URL.');
            const type = detectUrlType(url);
            console.log(`🌐 Importing ${type.toUpperCase()} URL: ${url}`);

            if (type === 'ao3') return await importAO3(url, progressCb);
            if (type === 'lofter') return await importLofter(url, progressCb);
            if (type === 'tumblr') return await importTumblr(url, progressCb);
            if (type === 'syosetu') return await importSyosetu(url, progressCb);
            return await importUniversal(url, progressCb);
        }
    };

    console.log("⚡ Universal Web Novel & Fanfiction Importer Module Initialized!");
})();
