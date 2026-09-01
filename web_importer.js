// Universal Web Novel & Fanfiction Importer (AO3, Lofter, Syosetu & Multi-Site)
(function() {

    // ══════════════════════════════════════════════════════════════════════
    // URL DETECTION & ROUTING
    // ══════════════════════════════════════════════════════════════════════
    function detectUrlType(url) {
        if (!url || typeof url !== 'string') return 'unknown';
        const clean = url.trim().toLowerCase();
        if (clean.includes('archiveofourown.org')) return 'ao3';
        if (clean.includes('witchculttranslation.com')) return 'witchcult';
        if (clean.includes('lofter.com')) return 'lofter';
        if (clean.includes('tumblr.com')) return 'tumblr';
        if (clean.includes('syosetu.com')) return 'syosetu';
        if (clean.includes('pixiv.net')) return 'pixiv';
        if (clean.includes('kakuyomu.jp')) return 'kakuyomu';
        if (clean.includes('royalroad.com')) return 'royalroad';
        return 'universal';
    }

    
    // ══════════════════════════════════════════════════════════════════════
        // ══════════════════════════════════════════════════════════════════════
        // ══════════════════════════════════════════════════════════════════════
    // 8. WITCH CULT TRANSLATION (FULL SERIES RE:ZERO WEB NOVEL CRAWLER)
    // ══════════════════════════════════════════════════════════════════════
    async function importWitchCult(url, progressCb) {
        progressCb?.('Connecting to Witch Cult Translations...', 5);

        const cleanHtml = (html) => {
            return html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<div[^>]*class="[^"]*(?:sharedaddy|wpcnt|nav-links|post-navigation)[^"]*"[\s\S]*?<\/div>/gi, '')
                .replace(/<p[^>]*>[\s\S]*?Next Post[\s\S]*?<\/p>/gi, '')
                .replace(/<p[^>]*>[\s\S]*?Previous Post[\s\S]*?<\/p>/gi, '')
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&#8216;/g, "'")
                .replace(/&#8217;/g, "'")
                .replace(/&#8220;/g, '"')
                .replace(/&#8221;/g, '"')
                .replace(/&#8211;/g, '–')
                .replace(/&amp;/g, '&')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        };

        const fetchPage = async (pageUrl) => {
            if (window.NativeBridge && window.NativeBridge.fetchNative) {
                const res = await window.NativeBridge.fetchNative(pageUrl);
                return res.data || '';
            }
            const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(pageUrl);
            const res = await fetch(proxy);
            return await res.text();
        };

        const targetSlug = url.replace(/\/$/, '').split('/').filter(Boolean).pop();

        // 1. Fetch Master Table of Contents
        progressCb?.('Discovering all chapters from Master Table of Contents...', 15);
        let chapterList = [];
        try {
            const tocHtml = await fetchPage('https://witchculttranslation.com/table-of-content/');
            const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            const allLinks = [];
            while ((m = linkRegex.exec(tocHtml)) !== null) {
                const href = m[1].replace(/\/$/, '') + '/';
                const text = m[2].replace(/<[^>]+>/g, '').trim()
                    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/&amp;/g, '&');
                if (href.includes('witchculttranslation.com/20') && !allLinks.some(l => l.href === href)) {
                    allLinks.push({ href, text });
                }
            }

            let targetIdx = 0;
            if (targetSlug && targetSlug !== 'table-of-content') {
                const foundIdx = allLinks.findIndex(l => l.href.includes(targetSlug));
                if (foundIdx !== -1) targetIdx = foundIdx;
            }

            // Crawl from target chapter onward (Entire Arc / Series)
            for (let i = targetIdx; i < allLinks.length; i++) {
                chapterList.push(allLinks[i]);
            }
        } catch (tocErr) {
            console.warn('Witch Cult TOC discovery error:', tocErr);
        }

        if (chapterList.length === 0) {
            chapterList = [{ href: url, text: 'Re:Zero Chapter' }];
        }

        progressCb?.(`Discovered ${chapterList.length} chapters! Starting fast multi-stream crawler...`, 25);

        const chapters = [];
        const batchSize = 5; // Fast concurrent chunks

        for (let i = 0; i < chapterList.length; i += batchSize) {
            const chunk = chapterList.slice(i, i + batchSize);
            const promises = chunk.map(async (ch, cIdx) => {
                try {
                    const html = await fetchPage(ch.href);
                    const cMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                    const txt = cleanHtml(cMatch ? cMatch[1] : html);
                    if (txt.length > 50) {
                        return { idx: i + cIdx, title: ch.text, text: txt };
                    }
                } catch (e) {
                    console.warn(`Failed chapter ${ch.href}:`, e);
                }
                return null;
            });

            const results = await Promise.all(promises);
            for (const r of results) {
                if (r) chapters.push(r);
            }

            const currentCount = Math.min(i + batchSize, chapterList.length);
            const pct = Math.round(25 + ((currentCount / chapterList.length) * 70));
            progressCb?.(`Crawled ${chapters.length}/${chapterList.length} chapters (${chunk[0]?.text || ''})...`, pct);
        }

        chapters.sort((a, b) => a.idx - b.idx);
        progressCb?.(`Successfully compiled all ${chapters.length} Re:Zero chapters into book!`, 100);

        return {
            title: 'Re:Zero Web Novel — ' + (chapterList[0]?.text || 'Complete Series'),
            author: 'Tappei Nagatsuki (Witch Cult Translations)',
            summary: `Re:Zero Starting Life in Another World Web Novel. ${chapters.length} complete chapters starting from ${chapterList[0]?.text}.`,
            tags: ['Re:Zero', 'Witch Cult Translations', 'Web Novel'],
            chapters: chapters.map(c => ({ title: c.title, text: c.text })),
            isEpub: false,
            sourceUrl: url
        };
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

        // Check if Cloudflare challenged the request
        if (html.includes('_cf_chl_opt') || html.includes('Shields are up!') || html.includes('cf-browser-verification')) {
            if (window.NativeBridge?.isAvailable()) {
                progressCb?.('Solving Cloudflare challenge with In-App Resolver...', 50);
                const resolved = await window.NativeBridge.resolveCloudflare(fullWorkUrl);
                if (resolved && resolved.html) {
                    html = resolved.html;
                } else {
                    throw new Error('Cloudflare verification was cancelled.');
                }
            } else {
                throw new Error('Cloudflare challenged the web proxy. Please use the GeminiTranslator.apk on Android (with built-in In-App Cloudflare Resolver) or choose the AO3 .epub file directly.');
            }
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
            function cleanHtmlText(raw) {
        if (!raw) return '';
        return raw
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    async function importLofter(url, progressCb) {
        progressCb?.('Connecting to NetEase Lofter...', 15);

        const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
        
        // Extract permalink e.g. 1f0ed043_2b7da38f6
        const permalinkMatch = url.match(/\/post\/([a-zA-Z0-9_-]+)/i);
        const permalink = permalinkMatch ? permalinkMatch[1] : '';

        const frontUrl = permalink ? `https://www.lofter.com/front/post/${permalink}` : url;
        const res = await window.NativeBridge.fetchUrl(frontUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });
        const html = await res.text();

        let title = 'Lofter Novel';
        let author = 'Lofter Author';
        let tags = [];
        let collectionId = null;
        let mainText = '';

        const startIdx = html.indexOf('window.__initialize_data__');
        if (startIdx !== -1) {
            try {
                const endIdx = html.indexOf('</script>', startIdx);
                const scriptBlock = html.substring(startIdx, endIdx);
                const jsonStr = scriptBlock.replace('window.__initialize_data__ = ', '').trim().replace(/;$/, '');
                const data = JSON.parse(jsonStr);

                const blogInfo = data.postData?.data?.blogInfo;
                if (blogInfo?.blogNickName) author = blogInfo.blogNickName;

                const pv = data.postData?.data?.postData?.postView;
                if (pv) {
                    if (pv.title && pv.title.trim()) title = pv.title.trim();
                    else if (pv.digest) title = pv.digest.substring(0, 40);

                    if (pv.collectionId) collectionId = pv.collectionId;
                    if (Array.isArray(pv.tagList)) tags = pv.tagList;

                    const rawContent = pv.textPostView?.content || pv.content || '';
                    if (rawContent) mainText = cleanHtmlText(rawContent);
                }
            } catch (e) {
                console.warn('Lofter JSON init parse error:', e);
            }
        }

        const chapters = [];

        // If part of a multi-chapter series (合集)
        if (collectionId) {
            progressCb?.('Found Lofter series! Crawling all chapters...', 35);
            try {
                const collUrl = `https://www.lofter.com/front/blog/collection/share?collectionId=${collectionId}`;
                const collRes = await window.NativeBridge.fetchUrl(collUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });
                const collHtml = await collRes.text();
                
                const cStart = collHtml.indexOf('window.__initialize_data__');
                if (cStart !== -1) {
                    const cEnd = collHtml.indexOf('</script>', cStart);
                    const cData = JSON.parse(collHtml.substring(cStart, cEnd).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));

                    const seriesName = cData.data?.collection?.name || title;
                    if (seriesName) title = seriesName;

                    const rawPosts = cData.data?.posts || [];
                    if (rawPosts.length > 0) {
                        progressCb?.(`Found ${rawPosts.length} chapters in "${seriesName}". Ingesting full series...`, 45);

                        for (let i = 0; i < rawPosts.length; i++) {
                            const item = rawPosts[i];
                            const chTitle = item.title || `Chapter ${i + 1}`;
                            const chPermalink = item.permalink;

                            if (chPermalink === permalink && mainText) {
                                chapters.push({ title: chTitle, text: mainText });
                            } else {
                                try {
                                    const postUrl = `https://www.lofter.com/front/post/${chPermalink}`;
                                    const pRes = await window.NativeBridge.fetchUrl(postUrl, { userAgent: mobileUA, headers: { 'Referer': 'https://www.lofter.com/' } });
                                    const pHtml = await pRes.text();
                                    const pStart = pHtml.indexOf('window.__initialize_data__');
                                    let chText = '';
                                    if (pStart !== -1) {
                                        const pEnd = pHtml.indexOf('</script>', pStart);
                                        const pData = JSON.parse(pHtml.substring(pStart, pEnd).replace('window.__initialize_data__ = ', '').trim().replace(/;$/, ''));
                                        const pPv = pData.postData?.data?.postData?.postView;
                                        const raw = pPv?.textPostView?.content || pPv?.content || '';
                                        if (raw) chText = cleanHtmlText(raw);
                                    }
                                    if (!chText && item.digest) chText = cleanHtmlText(item.digest);
                                    if (chText) {
                                        chapters.push({ title: chTitle, text: chText });
                                    }
                                } catch (e) {
                                    console.warn(`Error on chapter ${i + 1}:`, e.message);
                                }
                            }
                            progressCb?.(`Loaded chapter ${i + 1}/${rawPosts.length}: "${chTitle}"`, Math.round(45 + ((i + 1) / rawPosts.length) * 50));
                        }
                    }
                }
            } catch (collErr) {
                console.warn('Collection crawl error:', collErr);
            }
        }

        if (chapters.length === 0 && mainText) {
            chapters.push({ title, text: mainText });
        }

        progressCb?.(`Successfully loaded full series "${title}" with ${chapters.length} chapter(s)!`, 100);

        return {
            title,
            author,
            summary: chapters[0]?.text?.substring(0, 300) + '...',
            tags,
            chapters,
            rawZip: null,
            isEpub: false,
            sourceUrl: url
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
        const jszip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!jszip) throw new Error('JSZip library not initialized.');
        const zip = await jszip.loadAsync(buffer);
        
        // Find container.xml
        const cf = zip.file('META-INF/container.xml');
        if (!cf) throw new Error('Invalid EPUB: META-INF/container.xml missing');
        const cc = await cf.async('text');
        const cd = new DOMParser().parseFromString(cc, 'text/xml');
        const rp = cd.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf';
        const od = rp.includes('/') ? rp.substring(0, rp.lastIndexOf('/') + 1) : '';
        
        let of2 = zip.file(rp);
        if (!of2) {
            // Try fallback paths for OPF
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
        opf.querySelectorAll('manifest item').forEach(it => {
            manifestMap[it.getAttribute('id')] = it.getAttribute('href');
        });

        const chapters = [];
        for (let i = 0; i < spineItems.length; i++) {
            const id = spineItems[i].getAttribute('idref');
            const href = manifestMap[id];
            if (!href) continue;
            
            const filePath = od ? (od + href) : href;
            let chFile = zip.file(filePath) || zip.file(href);
            if (!chFile) continue;

            const chHtml = await chFile.async('text');
            const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
            const heading = chDoc.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]')?.textContent?.trim() || `Chapter ${chapters.length + 1}`;
            const bodyText = chDoc.body?.textContent?.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() || '';

            if (bodyText.length > 30) {
                chapters.push({
                    title: heading,
                    text: bodyText,
                    doc: chDoc,
                    zipPath: filePath
                });
            }
        }

        if (chapters.length === 0) {
            throw new Error('No readable chapters found in this EPUB file.');
        }

        progressCb?.(`Successfully loaded ${chapters.length} chapter(s)!`, 100);
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
