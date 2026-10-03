// ══════════════════════════════════════════════════════════════════════════
// Universal Light Novel & Fanfiction Crawler Engine (lncrawl Architecture)
// Supports: AO3, Lofter, WitchCult, Syosetu, Kakuyomu, RoyalRoad, ScribbleHub,
// NovelFull, Madara WP Novels, Blogspot, 69shu/Biquge, Tumblr & Universal
// ══════════════════════════════════════════════════════════════════════════
(function() {
    if (typeof window === 'undefined' && typeof global !== 'undefined') {
        global.window = global;
    }

    function decodeHtmlEntities(text) {
        if (!text) return '';
        let decoded = String(text);
        decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
            const code = parseInt(dec, 10);
            if (code === 8216) return "‘";
            if (code === 8217) return "’";
            if (code === 8220) return "“";
            if (code === 8221) return "”";
            if (code === 8211) return "–";
            if (code === 8212) return "—";
            if (code === 8230) return "…";
            try { return String.fromCharCode(code); } catch(e) { return _; }
        });
        decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return _; }
        });
        return decoded
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;|&#039;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&hellip;/g, '…')
            .replace(/&lsquo;/g, "‘")
            .replace(/&rsquo;/g, "’")
            .replace(/&ldquo;/g, '“')
            .replace(/&rdquo;/g, '”');
    }
    if (typeof window !== 'undefined') window.decodeHtmlEntities = decodeHtmlEntities;


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
            best.includes('the-artifice.com') ||
            best.includes('jp.png') || best.includes('France-Flag') || best.includes('flag') ||
            best.includes('Pin.png') || best.includes('pin.png') || best.includes('Satella_Pin') || best.includes('Emilia_Pin') ||
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
        } else if (best.includes('royalroad') && best.includes('/covers-full/')) {
            best = best.replace(/\/covers-full\//i, '/covers-large/');
        } else if (/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i.test(best)) {
            best = best.replace(/(?:https?:)?\/\/img\.lnori\.(?:com|org)\/(\d+)-(?:01|1)\.(?:jpg|jpeg|png|webp|avif|jxl)/i, 'https://cdn.lnori.com/volume/$1.jpg');
        }

        if (typeof window !== 'undefined' && window.getHighResIllustration) {
            const highRes = window.getHighResIllustration(best);
            if (highRes) best = highRes;
        }

        return best.trim();
    }

    function extractPageCover(doc, baseUrl, customCover) {
        if (customCover && typeof customCover === 'string' && customCover.trim()) {
            try { return new URL(customCover.trim(), baseUrl).href; } catch (_) { return customCover.trim(); }
        }
        if (!doc) return '';
        try {
            let og = doc.querySelector('meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"], meta[name="twitter:image"]')?.getAttribute('content');
            if (og && og.trim() && !og.includes('placeholder') && !og.includes('default-avatar') && !og.includes('logo') && !og.includes('favicon')) {
                // RoyalRoad covers: upgrade /covers-full/ to /covers-large/ for lossless 3x resolution
                if (og.includes('royalroad') && og.includes('/covers-full/')) {
                    og = og.replace(/\/covers-full\//i, '/covers-large/');
                }
                try { return new URL(og.trim(), baseUrl).href; } catch (_) { return og.trim(); }
            }
            const img = doc.querySelector('.book-cover img, .cover img, .novel-cover img, .manga-cover img, img.cover, .thumb img, .book-info-pic img, .fixed-img img, #bookCover img, .fic-header img, img[data-type="cover"], img[alt*="cover" i], img[src*="cover" i]');
            if (img) {
                let src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src');
                if (src && src.trim() && !src.includes('placeholder') && !src.includes('logo')) {
                    if (src.includes('royalroad') && src.includes('/covers-full/')) {
                        src = src.replace(/\/covers-full\//i, '/covers-large/');
                    }
                    try { return new URL(src.trim(), baseUrl).href; } catch (_) { return src.trim(); }
                }
            }
        } catch (_) {}
        return '';
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. TEXT CLEANING & ILLUSTRATION PRESERVATION
    // ══════════════════════════════════════════════════════════════════════
    function cleanChapterHtmlWithImages(html, baseUrl) {
        if (!html) return '';

        const trapCleaner = (typeof window !== 'undefined' && window.stripInvisibleTrapsAndWatermarks) 
            ? window.stripInvisibleTrapsAndWatermarks 
            : (typeof stripInvisibleTrapsAndWatermarks === 'function' ? stripInvisibleTrapsAndWatermarks : null);
        if (trapCleaner) {
            html = trapCleaner(html);
        }

        if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            try {
                html = window.DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: [
                        'p', 'br', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'i', 'em', 'strong',
                        'a', 'blockquote', 'hr', 'div', 'span', 'ruby', 'rt', 'rp',
                        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'code', 'pre', 's', 'del', 'strike', 'sub', 'sup'
                    ],
                    ALLOWED_ATTR: ['src', 'href', 'alt', 'title', 'class', 'style', 'data-src', 'data-original', 'data-url', 'data-orig-file', 'data-large-file', 'srcset', 'data-lazy-src', 'data-actualsrc', 'th', 'data-th', 'width', 'height']
                });
            } catch (_) {}
        }

        let processed = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<div[^>]*class="[^"]*(?:sharedaddy|wpcnt|nav-links|post-navigation|likes-widget|ads|advertisement|report-chapter)[^"]*"[\s\S]*?<\/div>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?Next Post[\s\S]*?<\/p>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?Previous Post[\s\S]*?<\/p>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?(?:Read light novel|Lightnovelpub|NovelFull|Boxnovel)[\s\S]*?<\/p>/gi, '')
            .replace(/<p[^>]*>\s*<img[^>]*the-artifice\.com[^>]*>\s*<\/p>/gi, '')
            .replace(/<img[^>]*the-artifice\.com[^>]*>/gi, '')
            .replace(/!\[.*?\]\(https?:\/\/[^\s)]*the-artifice\.com[^\s)]*\)/gi, '');

        // 0. Filter out visually hidden elements and anti-scraper traps (matching browser rendering)
        processed = processed
            .replace(/<[^>]*(?:display:\s*none|opacity:\s*0|font-size:\s*0|visibility:\s*hidden)[^>]*>[\s\S]*?<\/[a-z0-9]+>/gi, '')
            .replace(/<p[^>]*>[\s\S]*?(?:This story has been stolen from Royal Road|This novel is published on Royal Road|unlawfully lifted without the author's consent|Report any appearances on Amazon|Support the author by reading on Royal Road|If you encounter this story on Amazon)[\s\S]*?<\/p>/gi, '')
            .replace(/<div[^>]*>[\s\S]*?(?:This story has been stolen from Royal Road|This novel is published on Royal Road|unlawfully lifted without the author's consent|Report any appearances on Amazon|Support the author by reading on Royal Road)[\s\S]*?<\/div>/gi, '');

        // 1. Convert linked image wrappers <a href="..."><img .../></a> or <a href="...">[Download Image]</a>
        processed = processed.replace(/<a\s+([^>]+)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
            const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
            const dataSrcMatch = attrs.match(/data-(?:original|src|url)=["']([^"']+)["']/i);
            let targetUrl = hrefMatch ? hrefMatch[1] : (dataSrcMatch ? dataSrcMatch[1] : '');

            const isImageLink = /\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"']*)?$/i.test(targetUrl) || 
                                /<img\b/i.test(inner) || 
                                /^[\[\(]?\s*(?:Download|View|Click to view|High-Res|Full Size|Original)?\s*(?:Image|Illustration|Art|Artwork|Resolution|Photo|Picture)\s*[\]\)]?$/i.test(inner.trim());

            if (isImageLink) {
                let imgUrl = '';
                if (/<img\b/i.test(inner)) {
                    imgUrl = getBestImageUrl(inner, baseUrl);
                }
                if (!imgUrl && targetUrl) {
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
                    let finalUrl = imgUrl.trim();
                    const thMatch = (inner || '').match(/\b(?:data-)?th=["']([^"']+)["']/i);
                    const altMatch = (inner || '').match(/\balt=["']([^"']+)["']/i);
                    const altText = altMatch ? altMatch[1].trim() : 'Illustration';
                    if (thMatch && !finalUrl.includes('data:image/') && !finalUrl.includes('#th=') && !finalUrl.includes('?th=')) {
                        finalUrl += '#th=' + thMatch[1];
                    }
                    return '\n\n![' + altText + '](' + finalUrl + ')\n\n';
                }
            }
            return match;
        });

        // 2. Preserve remaining direct <img> tags
        processed = processed.replace(/<img\b[^>]*>/gi, (match) => {
            let bestUrl = getBestImageUrl(match, baseUrl);
            const thMatch = match.match(/\b(?:data-)?th=["']([^"']+)["']/i);
            const altMatch = match.match(/\balt=["']([^"']+)["']/i);
            const altText = altMatch ? altMatch[1].trim() : 'Illustration';
            if (bestUrl && (bestUrl.startsWith('http://') || bestUrl.startsWith('https://') || bestUrl.startsWith('data:image/'))) {
                if (thMatch && !bestUrl.includes('data:image/') && !bestUrl.includes('#th=') && !bestUrl.includes('?th=')) {
                    bestUrl += '#th=' + thMatch[1];
                }
                return '\n\n![' + altText + '](' + bestUrl + ')\n\n';
            }
            return '';
        });

        // 3. Strip residual image anchor text artifacts
        processed = processed
            .replace(/(?<!\!)[\[\(]\s*(?:Download|View|Click to view|High-Res|Full Size|Original)?\s*(?:Image|Illustration|Artwork|Resolution|Photo|Picture)\s*[\]\)]/gi, '')
            .replace(/\b(?:Download|View|Click to view)\s+(?:High-Res\s+|Full Size\s+|Original\s+)?(?:Image|Illustration|Artwork|Photo|Picture)\b/gi, '')
            .replace(/\b(?:High-Res|Full Size)\s+(?:Image|Illustration|Artwork|Photo|Picture)\b/gi, '')
            .replace(/!\(https?:\/\/[^\s)]*the-artifice\.com[^\s)]*\)/gi, '');

        // 4. Preserve Scene Break Dividers (<hr> and decorative symbol dividers)
        processed = processed
            .replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
            .replace(/<(?:p|div|center|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|div|center|h[1-6])>/gi, (m, inner) => {
                const stripped = inner.replace(/<[^>]+>/g, '').trim();
                if (/^(?:(?:\*[\s\u00A0]*){3,}|\*{3,}|(?:-[\s\u00A0]*){3,}|-{3,}|(?:_[\s\u00A0]*){3,}|_{3,}|(?:=[\s\u00A0]*){3,}|={3,}|(?:~[\s\u00A0]*){3,}|~{3,}|(?:\.[\s\u00A0]*){3,}|\u2026{2,}|\u2014{2,}|(?:–[\s\u00A0]*){2,}|(?:#[\s\u00A0]*){3,}|(?:◆[\s\u00A0]*){2,}|(?:◇[\s\u00A0]*){2,}|(?:✦[\s\u00A0]*){2,}|(?:★[\s\u00A0]*){2,}|(?:☆[\s\u00A0]*){2,}|(?:•[\s\u00A0]*){3,}|(?:·[\s\u00A0]*){3,})$/.test(stripped) || stripped === '---' || stripped === '***' || stripped === '___' || stripped === '===') {
                    return '\n\n---\n\n';
                }
                return m;
            })
            .replace(/<(?:strong|b|em|i)\b[^>]*>\s*(?:(?:\*[\s\u00A0]*){2,}|(?:-[\s\u00A0]*){2,}|(?:_[\s\u00A0]*){2,})\s*<\/(?:strong|b|em|i)>/gi, (m) => m.replace(/<[^>]+>/g, ''));

        // 5. Preserve Alignment (Center & Right)
        processed = processed
            .replace(/<(?:p|div)\b[^>]*class="[^"]*(?:text-center|align-center|aligncenter|has-text-align-center|center)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return '\n\n' + parts.map(p => `[center]${p.trim()}[/center]`).join('\n') + '\n\n';
            })
            .replace(/<(?:p|div)\b[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return '\n\n' + parts.map(p => `[center]${p.trim()}[/center]`).join('\n') + '\n\n';
            })
            .replace(/<center\b[^>]*>([\s\S]*?)<\/center>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return '\n\n' + parts.map(p => `[center]${p.trim()}[/center]`).join('\n') + '\n\n';
            })
            .replace(/<(?:p|div)\b[^>]*class="[^"]*(?:text-right|align-right|has-text-align-right)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return '\n\n' + parts.map(p => `[right]${p.trim()}[/right]`).join('\n') + '\n\n';
            })
            .replace(/<(?:p|div)\b[^>]*style="[^"]*text-align:\s*right[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return '\n\n' + parts.map(p => `[right]${p.trim()}[/right]`).join('\n') + '\n\n';
            });

        // 6. Preserve Blockquotes & Author Notes
        processed = processed.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, inner) => {
            const lines = inner
                .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
                .replace(/<br\s*[\/]?>/gi, '\n')
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean);
            if (lines.length === 0) return '';
            return '\n\n' + lines.map(l => '> ' + l).join('\n') + '\n\n';
        });

        // 7. Preserve Tables (LitRPG stat screens, character sheets)
        processed = processed.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (match, inner) => {
            const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
            if (rows.length === 0) return '';
            const mdRows = [];
            rows.forEach((r, rIdx) => {
                const cells = [...r[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(c => c[1].replace(/<[^>]+>/g, '').trim());
                if (cells.length > 0) {
                    mdRows.push('| ' + cells.join(' | ') + ' |');
                    if (rIdx === 0) {
                        mdRows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
                    }
                }
            });
            return mdRows.length > 0 ? '\n\n' + mdRows.join('\n') + '\n\n' : match;
        });

        // 8. Preserve Inline Formatting (bold, italic, strikethrough, code, ruby)
        processed = processed
            .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return parts.map(p => {
                    const cleanP = p.replace(/^(&gt;|>)\s*/, '').trim();
                    if (/^(?:(?:\*[\s\u00A0]*){2,}|(?:-[\s\u00A0]*){2,}|(?:_[\s\u00A0]*){2,})$/.test(cleanP)) return cleanP;
                    return cleanP ? `**${cleanP}**` : '';
                }).join('<br>');
            })
            .replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (m, inner) => {
                const parts = inner.split(/<br\s*[\/]?>/gi);
                return parts.map(p => {
                    const cleanP = p.replace(/^(&gt;|>)\s*/, '').trim();
                    if (/^(?:(?:\*[\s\u00A0]*){2,}|(?:-[\s\u00A0]*){2,}|(?:_[\s\u00A0]*){2,})$/.test(cleanP)) return cleanP;
                    return cleanP ? `*${cleanP}*` : '';
                }).join('<br>');
            })
            .replace(/<(?:s|del|strike)\b[^>]*>([\s\S]*?)<\/(?:s|del|strike)>/gi, '~~$1~~')
            .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
            .replace(/<ruby\b[^>]*>([\s\S]*?)<rt\b[^>]*>([\s\S]*?)<\/rt><\/ruby>/gi, '$1($2)');

        // 9. Preserve Headings
        processed = processed.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n### $1\n\n');

        // 10. Convert Paragraphs & Line Breaks, then strip residual wrapper tags
        let decoded = processed
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '');

        if (typeof window !== 'undefined' && window.he && typeof window.he.decode === 'function') {
            try {
                decoded = window.he.decode(decoded);
            } catch (_) {}
        } else {
            decoded = decoded
                .replace(/&#8216;/g, "'")
                .replace(/&#8217;/g, "'")
                .replace(/&#8220;/g, '"')
                .replace(/&#8221;/g, '"')
                .replace(/&#8211;/g, '–')
                .replace(/&#8212;/g, '—')
                .replace(/&#8230;/g, '…')
                .replace(/&hellip;/g, '…')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&nbsp;/g, ' ');
        }

        const cleanedFinal = decoded
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s+\n/g, '\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return trapCleaner ? trapCleaner(cleanedFinal) : cleanedFinal;
    }

    if (typeof window !== 'undefined') {
        window.decodeHtmlEntities = function(text) {
            if (!text) return '';
            if (window.he && typeof window.he.decode === 'function') {
                try { return window.he.decode(String(text)); } catch(_) {}
            }
            return String(text)
                .replace(/&#8216;/g, "'")
                .replace(/&#8217;/g, "'")
                .replace(/&#8220;/g, '"')
                .replace(/&#8221;/g, '"')
                .replace(/&#8211;/g, '–')
                .replace(/&#8212;/g, '—')
                .replace(/&#8230;/g, '…')
                .replace(/&hellip;/g, '…')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&nbsp;/g, ' ');
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2.5 "CHAMELEON" ADAPTIVE CONTENT EXTRACTION ENGINE
    // ══════════════════════════════════════════════════════════════════════
    const ChameleonExtractor = {
        scoreElement: function(el) {
            if (!el || el.nodeType !== 1) return -9999;
            const tagName = el.tagName.toLowerCase();
            if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe', 'svg', 'form'].includes(tagName)) {
                return -9999;
            }

            let score = 0;
            const text = el.textContent || '';
            const cleanText = text.trim();
            if (cleanText.length < 50) return -100;

            // 1. Paragraph density and length
            const paragraphs = el.querySelectorAll ? el.querySelectorAll('p') : [];
            let validPCount = 0;
            paragraphs.forEach(p => {
                const pLen = (p.textContent || '').trim().length;
                if (pLen > 25) {
                    validPCount++;
                    score += Math.min(25, Math.round(pLen / 20));
                }
            });
            score += validPCount * 15;

            // 2. Line break handling if paragraph tags are absent
            if (validPCount === 0 && el.querySelectorAll) {
                const brCount = el.querySelectorAll('br').length;
                if (brCount >= 5 && cleanText.length > 200) {
                    score += Math.min(150, brCount * 10);
                }
            }

            // 3. Text to HTML ratio
            const htmlLen = (el.innerHTML || '').length || 1;
            const textLen = cleanText.length;
            const ratio = textLen / htmlLen;
            score += Math.round(ratio * 50);

            // 4. Anchor penalty (if more than 25% of text is links)
            const links = el.querySelectorAll ? el.querySelectorAll('a') : [];
            let linkTextLen = 0;
            links.forEach(a => { linkTextLen += (a.textContent || '').length; });
            const linkRatio = textLen > 0 ? (linkTextLen / textLen) : 0;
            if (linkRatio > 0.25) {
                score -= Math.round(linkRatio * 400);
            }

            // 5. Positive class/id indicators
            const idAndClass = `${el.id || ''} ${el.className || ''}`.toLowerCase();
            if (/\b(?:chapter|entry-content|post-content|read-content|chapter-content|text-content|article-content|novel-content|story-content|read-container|content-body|body-content|ep-content|c-content|fr-view)\b/i.test(idAndClass)) {
                score += 200;
            }
            if (/\b(?:content|reading|chapter|prose|reader)\b/i.test(idAndClass)) {
                score += 80;
            }

            // 6. Negative class/id indicators
            if (/\b(?:comment|reply|footer|header|nav|menu|sidebar|widget|ad|ads|advertisement|social|share|recommend|related|author-box|login|signup)\b/i.test(idAndClass)) {
                score -= 250;
            }

            return score;
        },

        findBestContentNode: function(docOrHtml) {
            let doc = docOrHtml;
            if (typeof docOrHtml === 'string') {
                if (typeof DOMParser !== 'undefined') {
                    doc = new DOMParser().parseFromString(docOrHtml, 'text/html');
                } else {
                    return null;
                }
            }
            if (!doc || !doc.body) return null;

            // Clone to avoid mutating original
            let workingBody;
            try {
                workingBody = doc.body.cloneNode(true);
            } catch (_) {
                workingBody = doc.body;
            }

            // Strip non-content junk
            try {
                workingBody.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header, form, .ad, .ads, .sidebar, .comments, #comments').forEach(el => el.remove());
            } catch (_) {}

            const candidates = workingBody.querySelectorAll(
                'article, main, section, div, [id*="content"], [class*="content"], [id*="chapter"], [class*="chapter"], [id*="novel"], [class*="novel"], [id*="story"], [class*="story"], [id*="post"], [class*="post"], [id*="entry"], [class*="entry"], [id*="read"], [class*="read"]'
            );

            let bestNode = null;
            let bestScore = -9999;

            candidates.forEach(el => {
                const s = ChameleonExtractor.scoreElement(el);
                if (s > bestScore) {
                    bestScore = s;
                    bestNode = el;
                }
            });

            // Tighten to highest scoring descendant if child retains >= 85% score
            if (bestNode && bestNode.children) {
                let candidateChild = null;
                for (let i = 0; i < bestNode.children.length; i++) {
                    const ch = bestNode.children[i];
                    const chScore = ChameleonExtractor.scoreElement(ch);
                    if (chScore > 100 && chScore >= bestScore * 0.85) {
                        candidateChild = ch;
                        break;
                    }
                }
                if (candidateChild) {
                    bestNode = candidateChild;
                }
            }

            if (!bestNode || bestScore < 60) {
                bestNode = workingBody.querySelector('article, main, .post-content, .entry-content, #content, .content') || workingBody;
            }

            return bestNode;
        },

        extractArticle: function(docOrHtml, baseUrl = '') {
            let doc = docOrHtml;
            if (typeof docOrHtml === 'string') {
                if (typeof DOMParser !== 'undefined') {
                    doc = new DOMParser().parseFromString(docOrHtml, 'text/html');
                } else {
                    return { title: '', text: docOrHtml, html: docOrHtml, score: 0 };
                }
            }
            if (!doc) return { title: '', text: '', html: '', score: 0 };

            // Extract title candidate
            let title = '';
            const titleEl = doc.querySelector('h1.entry-title, h1.chapter-title, h1.post-title, h1, h2.chapter-title, h2.entry-title, title');
            if (titleEl) {
                title = (titleEl.textContent || '').trim();
                const cleanFn = (typeof cleanChapterTitle === 'function') ? cleanChapterTitle : ((typeof window !== 'undefined' && window.cleanChapterTitle) ? window.cleanChapterTitle : null);
                if (cleanFn) {
                    title = cleanFn(title);
                } else {
                    title = title.replace(/\s*[-|–—:•~]\s*(?:Novel\s*Fire|Novelfire|Read\s+Novel\s+Online|Novel\s+Updates|WuxiaWorld|Lightnovel|Webnovel).*$/i, '').trim();
                }
            }

            const bestNode = ChameleonExtractor.findBestContentNode(doc);
            if (!bestNode) {
                return { title, text: '', html: '', score: 0 };
            }

            const rawHtml = bestNode.innerHTML || bestNode.textContent || '';
            let cleanedText = cleanChapterHtmlWithImages(rawHtml, baseUrl);

            const trapCleaner = (typeof window !== 'undefined' && window.stripInvisibleTrapsAndWatermarks) ? window.stripInvisibleTrapsAndWatermarks : (typeof stripInvisibleTrapsAndWatermarks === 'function' ? stripInvisibleTrapsAndWatermarks : null);
            if (typeof trapCleaner === 'function') {
                cleanedText = trapCleaner(cleanedText);
            }

            const score = ChameleonExtractor.scoreElement(bestNode);
            return {
                title,
                text: cleanedText,
                html: rawHtml,
                score
            };
        }
    };

    if (typeof window !== 'undefined') {
        window.ChameleonExtractor = ChameleonExtractor;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. UNIFIED HTTP NETWORK CLIENT (LOCAL DIRECT PROXY, NATIVE BRIDGE & MULTI-PROXY)
    // ══════════════════════════════════════════════════════════════════════
    let localProxyState = null; // null = unverified, true = active, false = unavailable
    let lastLocalProxyCheck = 0;

    function detectBlockOrChallenge(text) {
        if (!text || typeof text !== 'string') return { blocked: true, type: 'empty' };
        const trimmed = text.trim();
        const lower = text.toLowerCase();

        // 1. JSON API bypass: Valid JSON responses from NovelBuddy/crawlers are never Cloudflare HTML challenge pages
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            if (!lower.includes('error 1015') && !lower.includes('error 429') && !lower.includes('access denied')) {
                return { blocked: false, type: null };
            }
        }

        if (text.length < 80) return { blocked: true, type: 'empty_or_short' };

        // 2. Legitimate content bypass: If the page has rich novel content, chapter body, or SSR data, it is NOT a challenge
        const hasChapterContent = lower.includes('d-chapter-content') ||
            lower.includes('chapter-container') ||
            lower.includes('class="chapter-title"') ||
            lower.includes('class="chapter-content"') ||
            lower.includes('class="content-inner"') ||
            lower.includes('class="content-body"') ||
            lower.includes('class="reading-content"') ||
            lower.includes('class="entry-content"') ||
            lower.includes('class="chapter-body"') ||
            lower.includes('class="novel-info"') ||
            lower.includes('class="book-info"') ||
            lower.includes('id="chapter-article"') ||
            lower.includes('id="chapter-container"') ||
            lower.includes('id="content"') ||
            lower.includes('id="chapter-content"') ||
            lower.includes('id="chr-content"') ||
            lower.includes('class="chr-c"') ||
            lower.includes('__next_data__') ||
            lower.includes('novel_honbun') ||
            lower.includes('p-novel__body') ||
            lower.includes('widget-episodebody') ||
            lower.includes('chapter-list') ||
            lower.includes('list-chapter');

        if (hasChapterContent && !lower.includes('<title>just a moment...</title>') && !lower.includes('<title>attention required! | cloudflare</title>')) {
            return { blocked: false, type: null };
        }

        // Detect genuine Cloudflare rate limit (1015) or block/challenge pages
        if (lower.includes('error 1015') || (lower.includes('rate limit') && lower.includes('cloudflare')) || lower.includes('error 429') || lower.includes('too many requests')) {
            return { blocked: true, type: 'rate_limit', label: 'Cloudflare 1015 / 429 Rate Limit' };
        }

        // Genuine Cloudflare challenge pages: title "Just a moment...", Cloudflare attention required, or challenge platform scripts on short pages without chapter text
        if (!hasChapterContent && (
            lower.includes('<title>just a moment...</title>') ||
            lower.includes('<title>attention required! | cloudflare</title>') ||
            lower.includes('attention required! | cloudflare') ||
            lower.includes('cf-browser-verification') ||
            lower.includes('shields are up!') ||
            (text.length < 3500 && (lower.includes('challenges.cloudflare.com/turnstile') || lower.includes('cf-turnstile-wrapper') || lower.includes('cf_chl_')))
        )) {
            return { blocked: true, type: 'turnstile', label: 'Cloudflare Turnstile Verification' };
        }

        if (lower.includes('401 unauthorized') || lower.includes('403 forbidden') || lower.includes('access denied') || (text.length < 2500 && lower.includes('checking your browser'))) {
            return { blocked: true, type: 'waf_block', label: 'Access Denied / Security Firewall' };
        }

        if (lower.includes('301 moved permanently') || lower.includes('hide.mn') || (lower.includes('error code: 522') && lower.includes('cloudflare'))) {
            return { blocked: true, type: 'proxy_dead', label: 'CORS Proxy Error / Redirect' };
        }

        if (lower.includes('play.google.com') || lower.includes('gamesappsbookskids') || lower.includes('not yet media ltd') || lower.includes('com.royalroad.app')) {
            return { blocked: true, type: 'app_store_redirect', label: 'App Store Redirect Trap' };
        }

        if (text.length < 3500 && (
            lower.includes('<title>loading...</title>') ||
            lower.includes('<title>redirecting to') ||
            lower.includes('window.location.href = "https://novelphoenix.com') ||
            lower.includes('window.location.href = "https://readnovel.site') ||
            (lower.includes('http-equiv="refresh"') && lower.includes('url='))
        )) {
            return { blocked: true, type: 'redirect_trap', label: 'Redirect / Loading Spinner Trap' };
        }

        return { blocked: false, type: null };
    }

    function isBlockOrChallenge(text) {
        return detectBlockOrChallenge(text).blocked;
    }

    async function fetchHtml(url, options = {}) {
        // Distinguish crawl chapter fetches from searches, metadata probes, and TOC checks:
        // A request should only be aborted by activeCrawlController if:
        // 1. It is explicitly part of a crawl (options.isCrawl === true), OR
        // 2. It is not an explicit search/probe AND activeCrawlController is currently running a crawl.
        const isSearchOrProbe = Boolean(
            options.isSearch ||
            (options.context && /search|catalog|probe|ping|check|audio/i.test(options.context))
        );
        const crawlCtrl = (!isSearchOrProbe && typeof activeCrawlController !== 'undefined') ? activeCrawlController : null;
        const externalSignal = options.signal || (crawlCtrl && (crawlCtrl.isCancelled || crawlCtrl.isPaused) ? crawlCtrl.abortController?.signal : null);
        const isUserAborted = () => Boolean(
            (externalSignal && externalSignal.aborted) ||
            (options.signal && options.signal.aborted) ||
            (crawlCtrl && (crawlCtrl.isCancelled || crawlCtrl.isPaused))
        );

        if (isUserAborted()) {
            const abortErr = new Error('Fetch aborted by user');
            abortErr.name = 'AbortError';
            throw abortErr;
        }

        const timeoutMs = options.timeout || 25000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const startTime = Date.now();
        const context = options.context || options.why || 'General Crawl';
        let lastDetectedBlock = null;

        let onExternalAbort = null;
        if (externalSignal) {
            onExternalAbort = () => controller.abort();
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }

        window.sendTelemetry?.('FETCH_REQ', `[${context}] Fetching: ${url}`, {
            url,
            context,
            timeoutMs
        });

        // Anti-redirect desktop headers for NovelFire and similar sites that return mobile redirect traps:
        const isNovelFire = (typeof url === 'string') && url.includes('novelfire.');
        if (isNovelFire) {
            const isNative = typeof window !== 'undefined' && window.NativeBridge && window.NativeBridge.fetchNative;
            if (!isNative) {
                const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
                options.headers = Object.assign({
                    'User-Agent': desktopUa,
                    'Referer': 'https://novelfire.net/'
                }, options.headers || {});
            } else {
                options.headers = Object.assign({
                    'Referer': 'https://novelfire.net/'
                }, options.headers || {});
                if (options.headers && options.headers['User-Agent']) delete options.headers['User-Agent'];
            }
        }

        // 1. Android Native Bridge (Zero CORS / Full Chromium Engine) - Always Tier 1 on Android App
        if (window.NativeBridge && window.NativeBridge.fetchNative) {
            try {
                if (isUserAborted()) {
                    const abortErr = new Error('Fetch aborted by user');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }
                const res = await Promise.race([
                    window.NativeBridge.fetchNative(url, options),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Native fetch timed out')), timeoutMs))
                ]);
                if (res && res.data) {
                    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    const blockCheck = detectBlockOrChallenge(text);
                    if (!blockCheck.blocked) {
                        clearTimeout(timer);
                        if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                        const latency = Date.now() - startTime;
                        window.sendTelemetry?.('FETCH_OK', `[${context}] Fetched via Android Native Bridge in ${latency}ms (${text.length.toLocaleString()} chars): ${url}`, {
                            url,
                            context,
                            tier: 'NativeBridge',
                            latencyMs: latency,
                            charCount: text.length
                        });
                        return text;
                    } else {
                        lastDetectedBlock = blockCheck;
                    }
                }
            } catch (e) {
                if (isUserAborted()) {
                    clearTimeout(timer);
                    if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                    const abortErr = new Error('Fetch aborted by user');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }
                console.warn('NativeBridge fetch error, fallback to proxy:', e);
                window.sendTelemetry?.('FETCH_WARN', `[${context}] NativeBridge failed, falling back to local proxy: ${e.message}`, { url, context, error: e.message });
            }
        }

        // 2. Direct Fetch Fast-Path (For browser/desktop where Native Bridge is absent)
        if (!window.NativeBridge?.fetchNative) {
            try {
                if (!controller.signal.aborted && !isUserAborted()) {
                    const directCtrl = new AbortController();
                    const directTimer = setTimeout(() => directCtrl.abort(), 2800);
                    const directOpts = {
                        signal: directCtrl.signal,
                        headers: options.headers || {},
                        method: options.method || 'GET'
                    };
                    if (options.body) directOpts.body = options.body;
                    const directRes = await fetch(url, directOpts);
                    clearTimeout(directTimer);
                    if (directRes.ok) {
                        const text = await directRes.text();
                        const blockCheck = detectBlockOrChallenge(text);
                        if (!blockCheck.blocked) {
                            clearTimeout(timer);
                            if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                            const latency = Date.now() - startTime;
                            window.sendTelemetry?.('FETCH_OK', `[${context}] Fetched directly in ${latency}ms (${text.length.toLocaleString()} chars): ${url}`, {
                                url,
                                context,
                                tier: 'DirectFetch',
                                latencyMs: latency,
                                charCount: text.length
                            });
                            return text;
                        }
                    }
                }
            } catch (_) {}
        }

        // 2. High-Speed Local Direct-Socket Proxy (lncrawl Parity on Desktop)
        // Runs on http://127.0.0.1:9090 when running alongside telemetry_server.js
        const now = Date.now();
        if (localProxyState !== false || (now - lastLocalProxyCheck > 30000)) {
            try {
                if (isUserAborted()) {
                    const abortErr = new Error('Fetch aborted by user');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }
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
                    const blockCheck = detectBlockOrChallenge(text);
                    if (!blockCheck.blocked) {
                        localProxyState = true;
                        clearTimeout(timer);
                        if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                        const latency = Date.now() - startTime;
                        window.sendTelemetry?.('FETCH_OK', `[${context}] Fetched via Local Direct Proxy (port 9090) in ${latency}ms (${text.length.toLocaleString()} chars): ${url}`, {
                            url,
                            context,
                            tier: 'LocalProxy',
                            latencyMs: latency,
                            charCount: text.length
                        });
                        return text;
                    } else {
                        lastDetectedBlock = blockCheck;
                        console.warn('[Local Proxy] Cloudflare challenge or block encountered, failing over to public proxy pool...');
                        window.sendTelemetry?.('FETCH_WARN', `[${context}] Local proxy hit Cloudflare challenge (${blockCheck.label}), failing over to public proxies`, { url, context });
                    }
                }
            } catch (localErr) {
                if (isUserAborted()) {
                    clearTimeout(timer);
                    if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                    const abortErr = new Error('Fetch aborted by user');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }
                if (localProxyState === null) {
                    localProxyState = false;
                }
            }
        }

        // 3. Tiered Public Proxy Failover Pool (Fast sub-second proxies prioritized)
        const proxyPool = [
            { name: 'corsproxy.io', getUrl: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
            { name: 'allorigins.win', getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
            { name: 'codetabs', getUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
        ];

        for (let i = 0; i < proxyPool.length; i++) {
            if (isUserAborted()) break;
            const proxy = proxyPool[i];
            let proxyTimer = null;
            let onParentAbort = null;
            try {
                const proxyCtrl = new AbortController();
                proxyTimer = setTimeout(() => proxyCtrl.abort(), 7500);

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

                const res = await fetch(proxy.getUrl(url), fetchOpts);

                if (res.ok) {
                    const text = await res.text();
                    const blockCheck = detectBlockOrChallenge(text);
                    if (blockCheck.blocked) {
                        lastDetectedBlock = blockCheck;
                        console.warn(`[Proxy Failover] Cloudflare challenge on ${proxy.name} (${blockCheck.label}), switching...`);
                        window.sendTelemetry?.('FETCH_WARN', `[${context}] ${proxy.name} returned challenge page (${blockCheck.label}), switching to next proxy`, { url, context, proxy: proxy.name });
                        continue;
                    }
                    clearTimeout(timer);
                    if (onParentAbort) controller.signal.removeEventListener('abort', onParentAbort);
                    if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                    const latency = Date.now() - startTime;
                    window.sendTelemetry?.('FETCH_OK', `[${context}] Fetched via ${proxy.name} in ${latency}ms (${text.length.toLocaleString()} chars): ${url}`, {
                        url,
                        context,
                        tier: proxy.name,
                        latencyMs: latency,
                        charCount: text.length
                    });
                    return text;
                }
            } catch (proxyErr) {
                if (isUserAborted()) {
                    clearTimeout(timer);
                    if (onParentAbort) controller.signal.removeEventListener('abort', onParentAbort);
                    if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
                    const abortErr = new Error('Fetch aborted by user');
                    abortErr.name = 'AbortError';
                    throw abortErr;
                }
                // Timeout on this proxy, try next proxy
            } finally {
                if (proxyTimer) clearTimeout(proxyTimer);
                if (onParentAbort) controller.signal.removeEventListener('abort', onParentAbort);
            }
        }

        clearTimeout(timer);
        if (onExternalAbort && externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
        if (isUserAborted()) {
            const abortErr = new Error('Fetch aborted by user');
            abortErr.name = 'AbortError';
            throw abortErr;
        }
        let errMsg = `Failed to fetch ${url}. All proxies exhausted or rate-limited.`;
        let isCloudflare = false;
        let challengeType = null;
        if (lastDetectedBlock && lastDetectedBlock.type) {
            if (lastDetectedBlock.type === 'turnstile') {
                errMsg = `Cloudflare Turnstile verification challenge active on remote host. Human verification required.`;
                isCloudflare = true;
                challengeType = 'turnstile';
            } else if (lastDetectedBlock.type === 'rate_limit') {
                errMsg = `Cloudflare rate-limit (Error 1015 / 429) active on remote host. Temporary cooldown needed.`;
                isCloudflare = true;
                challengeType = 'rate_limit';
            } else if (lastDetectedBlock.type === 'waf_block') {
                errMsg = `Firewall block (403 Forbidden / Access Denied) encountered on remote host.`;
                isCloudflare = true;
                challengeType = 'waf_block';
            }
        }
        const err = new Error(errMsg);
        err.isCloudflare = isCloudflare;
        err.challengeType = challengeType;
        err.targetUrl = url;
        window.sendTelemetry?.('FETCH_FAIL', `[${context}] All network tiers failed for: ${url} (${Date.now() - startTime}ms total, reason: ${challengeType || 'exhausted'})`, {
            url,
            context,
            challengeType,
            totalDurationMs: Date.now() - startTime
        });
        throw err;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3.5 ADAPTIVE SPEED CONTROLLER (COURTESY CRAWLING & LATENCY PACING)
    // ══════════════════════════════════════════════════════════════════════
    class AdaptiveSpeedController {
        constructor(baseConcurrency = 4, baseDelayMs = 100) {
            this.baseConcurrency = Math.max(1, baseConcurrency);
            this.currentConcurrency = this.baseConcurrency;
            this.baseDelayMs = Math.max(0, baseDelayMs);
            this.currentDelayMs = this.baseDelayMs;
            this.successStreak = 0;
            this.failureStreak = 0;
            this.latencies = [];
            this.isBackingOff = false;
        }

        recordSuccess(latencyMs = 200) {
            this.latencies.push(latencyMs);
            if (this.latencies.length > 10) this.latencies.shift();
            this.failureStreak = 0;
            this.successStreak++;

            // If cruising smoothly with fast latency, rapidly recover toward base speed
            if (this.currentDelayMs > this.baseDelayMs) {
                this.currentDelayMs = Math.max(this.baseDelayMs, Math.round(this.currentDelayMs * 0.5));
                if (this.currentDelayMs <= this.baseDelayMs + 20) {
                    this.currentDelayMs = this.baseDelayMs;
                }
            }
        }

        recordThrottle(reason = 'rate_limit', errStatus = 429) {
            const reasonStr = String(reason || '').toLowerCase();
            const isGenuineRateLimit = errStatus === 429 || errStatus === 1015 || reasonStr.includes('1015') || reasonStr.includes('rate limit') || reasonStr.includes('too many requests') || reasonStr.includes('status 429');
            if (!isGenuineRateLimit) return; // Do not throttle global pacing for transient network hiccups or 500 retries

            this.failureStreak++;
            this.successStreak = 0;
            this.currentDelayMs = Math.min(250, Math.max(120, this.currentDelayMs + 40));
        }

        getPacingDelay() {
            if (this.currentDelayMs <= 15) return 0;
            return this.currentDelayMs;
        }

        isThrottled() {
            return false;
        }
    }

    if (typeof window !== 'undefined') {
        window.AdaptiveSpeedController = AdaptiveSpeedController;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. PARALLEL WORKER POOL ENGINE (LNCRAWL STREAMING & RESUMABLE SESSIONS)
    // ══════════════════════════════════════════════════════════════════════
    let activeCrawlController = null;

    function resetCrawlController() {
        if (activeCrawlController) {
            try { activeCrawlController.abortController?.abort(); } catch (e) {}
            activeCrawlController = null;
        }
        return true;
    }

    function createCrawlController(options = {}) {
        const abortController = new AbortController();
        const isUpdate = !!options.isUpdate;
        const refreshToc = !!options.refreshToc;
        const tocOnly = !!options.tocOnly;
        const reuseToc = !!options.reuseToc && !isUpdate && !refreshToc && !tocOnly;

        activeCrawlController = {
            isPaused: false,
            isCancelled: false,
            tocOnly,
            refreshToc,
            isUpdate,
            reuseToc,
            abortController,
            initialChapters: options.initialChapters || (options.resumeSession ? (options.resumeSession.downloadedChapters || options.resumeSession.chapters || options.resumeSession.rawChapters) : []) || [],
            chapterList: (isUpdate || refreshToc || tocOnly) ? (options.chapterList || []) : (options.chapterList || options.resumeSession?.chapterList || []),
            chapterRange: options.chapterRange || null,
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
        const normalizeTitleForMatching = (t) => {
            let s = (t || '').toLowerCase();
            s = s.replace(/\s*[\-|–—]\s*(?:witch\s*cult\s*translations|translation\s*chicken|eminent\s*translations|rem\s*on\s*water).*$/i, '');
            s = s.replace(/^arc\s*\d+[\s,:\-–—]+/i, '');
            s = s.replace(/[–—\-_,:]+/g, ' ');
            return s.replace(/\s+/g, ' ').trim();
        };

        const existingByUrl = new Map();
        const existingByNormTitle = new Map();
        const existingByExactTitle = new Map();

        const initialChapters = Array.isArray(ctrl.initialChapters) ? ctrl.initialChapters : [];
        for (const c of initialChapters) {
            if (c.url) existingByUrl.set(c.url.replace(/\/$/, ''), c);
            if (c.title) {
                const norm = normalizeTitleForMatching(c.title);
                if (norm) existingByNormTitle.set(norm, c);
                existingByExactTitle.set(c.title.trim().toLowerCase(), c);
            }
        }

        const chapterRange = ctrl.chapterRange || poolOptions.chapterRange || null;
        const hasRange = !!(chapterRange && typeof chapterRange.start === 'number' && chapterRange.start > 0);
        let rangeStart = 0;
        let rangeEnd = chapterList.length - 1;
        let isPreSliced = false;

        if (hasRange) {
            if ((chapterRange.start - 1) >= chapterList.length) {
                console.log(`⚡ [Crawl Pool] Chapter list has ${chapterList.length} items for requested range ${chapterRange.start}–${chapterRange.end || 'end'} (pre-filtered). Processing all supplied items.`);
                isPreSliced = true;
                rangeStart = 0;
                rangeEnd = chapterList.length - 1;
            } else {
                rangeStart = Math.max(0, chapterRange.start - 1);
                rangeEnd = (typeof chapterRange.end === 'number' && chapterRange.end > 0)
                    ? Math.min(chapterList.length - 1, chapterRange.end - 1)
                    : (chapterList.length - 1);
            }
        }
        const targetChapterCount = Math.max(1, rangeEnd - rangeStart + 1);

        const chapters = [];
        const completedIndices = new Set();

        for (let i = rangeStart; i <= rangeEnd; i++) {
            const item = chapterList[i];
            if (!item) continue;
            const cleanItemUrl = item.url ? item.url.replace(/\/$/, '') : '';
            const normItemTitle = normalizeTitleForMatching(item.title);
            const exactItemTitle = (item.title || '').trim().toLowerCase();

            const match = (cleanItemUrl && existingByUrl.get(cleanItemUrl)) ||
                          (exactItemTitle && existingByExactTitle.get(exactItemTitle)) ||
                          (normItemTitle && existingByNormTitle.get(normItemTitle));

            const isPlaceholder = match && (match.isPlaceholder === true || 
                                           (match.text && (match.text.includes('could not be retrieved from remote source') || match.text.includes('Network error') || match.text.includes('Chapter download failed') || match.text.includes('All proxies exhausted'))));

            if (match && !isPlaceholder && (match.text || match.content) && (match.text || match.content).length > 20) {
                completedIndices.add(i);
                chapters.push({
                    ...match,
                    idx: i,
                    url: item.url || match.url || '',
                    title: item.title || match.title,
                    arc: item.arc || match.arc || '',
                    volume: item.volume || match.volume || ''
                });
            }
        }
        let completedCount = completedIndices.size;

        // Build resilient work queue of all pending chapter indices so NO chapter is ever skipped
        const pendingQueue = [];
        const chapterRetryCounts = new Map();
        for (let i = rangeStart; i <= rangeEnd; i++) {
            if (!completedIndices.has(i)) {
                pendingQueue.push(i);
            }
        }

        const baseDelay = poolOptions.delayMs !== undefined ? poolOptions.delayMs : 100;
        const speedCtrl = new AdaptiveSpeedController(concurrency, baseDelay);
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
        let consecutiveFailures = 0;

        window.sendTelemetry?.('CRAWL', `Starting ingestion pool (${concurrency} workers, ${baseDelay}ms base delay) for ${hasRange ? `${targetChapterCount} chapters (Ch. ${rangeStart + 1}–${rangeEnd + 1})` : `${chapterList.length} chapters`}: ${meta?.title || 'Novel'}`);

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
                        // Polite adaptive inter-request pacing
                        const currentDelay = speedCtrl.getPacingDelay();
                        if (speedCtrl.isThrottled()) {
                            progressCb?.(`🚦 Adaptive speed control active (${currentDelay}ms pacing)... (${completedIndices.size}/${chapterList.length} ch done)`);
                        }
                        if (currentDelay > 15) {
                            await new Promise(r => setTimeout(r, currentDelay));
                        }
                        if (ctrl.isPaused || ctrl.isCancelled) break;

                        const reqStart = Date.now();
                        chData = await extractContentFn(item, currentIndex);
                        if (ctrl.isPaused || ctrl.isCancelled) break;

                        // Validate content: reject Cloudflare Error 1015 rate-limit block pages
                        if (chData && chData.text) {
                            const sample = chData.text.slice(0, 350).toLowerCase();
                            if (sample.includes('error 1015') || (sample.includes('rate limit') && sample.includes('cloudflare'))) {
                                rateLimitDetected = true;
                                speedCtrl.recordThrottle('cloudflare_1015', 1015);
                                chData = null;
                            } else {
                                speedCtrl.recordSuccess(Date.now() - reqStart);
                            }
                        }
                    } catch (fetchErr) {
                        const errMsg = String(fetchErr?.message || '').toLowerCase();
                        if (errMsg.includes('1015') || errMsg.includes('rate limit') || errMsg.includes('429') || errMsg.includes('too many requests')) {
                            rateLimitDetected = true;
                            speedCtrl.recordThrottle(errMsg, 429);
                        } else {
                            if (attempts < 4) {
                                const backoffDelay = Math.min(2500, (500 * Math.pow(2, attempts - 1)) + (Math.random() * 200));
                                await new Promise(r => setTimeout(r, backoffDelay));
                            }
                        }
                    }

                    if (rateLimitDetected && !ctrl.isPaused && !ctrl.isCancelled) {
                        rateLimitDetected = false;
                        isBackingOff = true;
                        const cooldownSec = Math.min(4, 2 + attempts);
                        console.warn(`[Cloudflare Rate Limit 1015] detected on chapter ${currentIndex + 1}. Cooling down ${cooldownSec}s...`);
                        window.sendTelemetry?.('CLOUDFLARE_1015', `Cloudflare 1015 rate limit on Ch ${currentIndex + 1}. Cooldown: ${cooldownSec}s...`);
                        for (let c = cooldownSec; c > 0; c--) {
                            if (ctrl.isPaused || ctrl.isCancelled) break;
                            progressCb?.(`⏳ Rate limit cooldown: resuming in ${c}s... (${completedIndices.size}/${chapterList.length} ch done)`);
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        isBackingOff = false;
                    }
                }

                let chapterSaved = false;
                if (chData && (chData.text || chData.content)) {
                    let chapterText = chData.text || chData.content || '';
                    const trapCleaner = (typeof window !== 'undefined' && window.stripInvisibleTrapsAndWatermarks) ? window.stripInvisibleTrapsAndWatermarks : (typeof stripInvisibleTrapsAndWatermarks === 'function' ? stripInvisibleTrapsAndWatermarks : null);
                    if (typeof trapCleaner === 'function') {
                        chapterText = trapCleaner(chapterText);
                    }
                    const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
                    const cleanFn = (typeof cleanChapterTitle === 'function') ? cleanChapterTitle : ((typeof window !== 'undefined' && window.cleanChapterTitle) ? window.cleanChapterTitle : null);
                    const rawChTitle = chData.title || item.title || `Chapter ${currentIndex + 1}`;
                    const novelTitle = ctrl.novelMeta?.title || meta?.title || '';
                    const chTitle = cleanFn ? cleanFn(rawChTitle, novelTitle) : rawChTitle;
                    if (typeof stripFn === 'function' && chTitle) {
                        chapterText = stripFn(chapterText, chTitle, chData.originalTitle);
                    }
                    const words = chapterText.split(/\s+/).filter(Boolean).length;
                    const rawClean = chapterText.replace(/<[^>]+>/g, '').trim();
                    if ((words < 5 || rawClean.length < 35) && !chData.isPlaceholder) {
                        console.warn(`[Crawl Pool] Chapter ${currentIndex + 1} content rejected as empty/truncated (${words}w, ${rawClean.length}c). Triggering retry...`);
                    } else {
                        const imgCount = (chapterText.match(/!\[Illustration\]/g) || []).length;
                        totalImagesCount += imgCount;
                        totalWordsEstimate += words;
                        const newChapterObj = {
                            idx: isPreSliced ? (chapterRange.start - 1 + currentIndex) : currentIndex,
                            url: item.url || '',
                            title: chTitle,
                            text: chapterText,
                            content: chapterText,
                            words,
                            arc: chData.arc || item.arc || '',
                            volume: chData.volume || item.volume || ''
                        };
                        chapters.push(newChapterObj);
                        completedIndices.add(currentIndex);

                        window.sendTelemetry?.('CHAPTER_OK', `Saved Ch ${currentIndex + 1}/${chapterList.length}: ${newChapterObj.title} (${words}w, ${completedIndices.size}/${targetChapterCount} done)`);

                        if (ctrl.onChapterDone && !ctrl.isPaused && !ctrl.isCancelled) {
                            try {
                                ctrl.onChapterDone(newChapterObj, chapters, {
                                    current: completedIndices.size,
                                    completedCount: completedIndices.size,
                                    total: targetChapterCount,
                                    totalCount: targetChapterCount,
                                    totalWords: totalWordsEstimate,
                                    chapterList: chapterList,
                                    title: ctrl.novelMeta?.title || meta?.title || '',
                                    author: ctrl.novelMeta?.author || meta?.author || '',
                                    summary: ctrl.novelMeta?.summary || meta?.summary || '',
                                    cover: ctrl.novelMeta?.cover || meta?.cover || ''
                                });
                            } catch (cbErr) {
                                console.warn('onChapterDone callback error:', cbErr);
                            }
                        }
                        chapterSaved = true;
                    }
                }
                
                if (!chapterSaved && !ctrl.isPaused && !ctrl.isCancelled) {
                    const retries = (chapterRetryCounts.get(currentIndex) || 0) + 1;
                    chapterRetryCounts.set(currentIndex, retries);
                    if (retries <= 3) {
                        const retryBackoff = Math.min(2500, (600 * Math.pow(2, retries - 1)) + (Math.random() * 200));
                        console.warn(`Chapter ${currentIndex + 1} incomplete/rate-limited; retry ${retries}/3 in ${Math.round(retryBackoff)}ms.`);
                        window.sendTelemetry?.('CHAPTER_RETRY', `Ch ${currentIndex + 1} retry ${retries}/3 in ${Math.round(retryBackoff)}ms.`);
                        pendingQueue.push(currentIndex);
                        await new Promise(r => setTimeout(r, retryBackoff));
                    } else {
                        consecutiveFailures++;
                        console.warn(`Chapter ${currentIndex + 1} failed after 3 retries (consecutive failures: ${consecutiveFailures}).`);

                        if (consecutiveFailures >= 3) {
                            console.warn(`[Circuit Breaker] 3 consecutive chapters failed. Auto-pausing crawl session to protect novel data.`);
                            window.sendTelemetry?.('CIRCUIT_BREAKER', `Auto-paused: 3 consecutive chapters failed.`, { currentIndex, novel: meta?.title });
                            ctrl.isPaused = true;
                            ctrl.circuitBreakerTripped = true;
                            ctrl.pauseReason = '3 consecutive chapters unreachable (remote block or connection drop).';
                            progressCb?.(`⏸ Auto-paused to protect novel: 3 consecutive chapters unreachable. Progress saved.`);
                            pendingQueue.unshift(currentIndex);
                            break;
                        }

                        console.warn(`Chapter ${currentIndex + 1} failed after 3 retries; generating placeholder.`);
                        const placeholder = {
                            idx: currentIndex,
                            title: item.title || `Chapter ${currentIndex + 1}`,
                            text: `<p>[Chapter content could not be retrieved from remote source: ${item.url || 'Network error'}]</p>`,
                            content: `<p>[Chapter content could not be retrieved from remote source: ${item.url || 'Network error'}]</p>`,
                            words: 10,
                            isPlaceholder: true
                        };
                        chapters.push(placeholder);
                        completedIndices.add(currentIndex);
                    }
                }

                completedCount = completedIndices.size;
                const pct = Math.min(99, Math.round(15 + ((completedCount / targetChapterCount) * 84)));
                const elapsedSec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
                const min = Math.floor(elapsedSec / 60);
                const sec = elapsedSec % 60;
                const timeStr = (min > 0 ? `${min}m ` : '') + `${sec}s`;
                const speed = (completedCount / elapsedSec).toFixed(1);

                if (!ctrl.isPaused && !ctrl.isCancelled) {
                    const progressLabel = hasRange
                        ? ` Ingested: ${completedCount}/${targetChapterCount} new ch (Ch. ${rangeStart + 1}–${rangeEnd + 1}) (${pct}%) • ${timeStr} (${speed} ch/s) • ~${totalWordsEstimate.toLocaleString()} words`
                        : ` Ingested: ${chapters.length}/${chapterList.length} ch (${pct}%) • ${timeStr} (${speed} ch/s) • ~${totalWordsEstimate.toLocaleString()} words`;
                    progressCb?.(progressLabel, pct);

                    const now = Date.now();
                    if (now - lastNotifTime > 2000 || completedCount === targetChapterCount) {
                        lastNotifTime = now;
                        window.NativeBridge?.showProgressNotification?.('Gemini Web Importer', `Ingesting novel: ${completedCount}/${targetChapterCount} ch (${pct}%) • ${timeStr}`, pct, true);
                    }
                }

                if (ctrl.isPaused || ctrl.isCancelled) {
                    break;
                }
            }
        };

        try {
            const workers = Array.from({ length: Math.min(concurrency, pendingQueue.length || 1) }, () => worker());
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
                    window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', `Paused at ${chapters.length}/${targetChapterCount} chapters. Saved to Library.`);
                    window.sendTelemetry?.('CRAWL_PAUSED', `Novel ingestion paused at ${chapters.length}/${targetChapterCount} chapters. Saved to Library.`);
                } else if (ctrl.isCancelled) {
                    window.NativeBridge?.clearProgressNotification?.(false);
                    window.sendTelemetry?.('CRAWL_CANCELLED', `Novel ingestion cancelled.`);
                }
            } catch(e) {}
        }

        let finalChapters = chapters;
        if (hasRange && !isPreSliced) {
            finalChapters = chapters.filter(c => c.idx >= rangeStart && c.idx <= rangeEnd);
        }
        finalChapters.sort((a, b) => a.idx - b.idx);
        return { 
            chapters: finalChapters, 
            totalWords: totalWordsEstimate, 
            totalImages: totalImagesCount,
            isPaused: !!ctrl.isPaused,
            isCancelled: !!ctrl.isCancelled
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. SITE SOURCE CRAWLERS (LNCRAWL TEMPLATE DRIVEN)
    // ══════════════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════════════
    // 5. SITE SOURCE CRAWLERS (DELEGATED TO web_importer_scrapers.js)
    // ══════════════════════════════════════════════════════════════════════
    const getScrapers = () => (typeof window !== 'undefined' && window.WebNovelScrapers) || {};
    const crawlWitchCult = (...args) => (getScrapers().crawlWitchCult ? getScrapers().crawlWitchCult(...args) : null);
    const crawlAO3 = (...args) => (getScrapers().crawlAO3 ? getScrapers().crawlAO3(...args) : null);
    const crawlRoyalRoad = (...args) => (getScrapers().crawlRoyalRoad ? getScrapers().crawlRoyalRoad(...args) : null);
    const crawlSyosetu = (...args) => (getScrapers().crawlSyosetu ? getScrapers().crawlSyosetu(...args) : null);
    const crawlNovelFull = (...args) => (getScrapers().crawlNovelFull ? getScrapers().crawlNovelFull(...args) : null);
    const crawlNovelBin = (...args) => (getScrapers().crawlNovelBin ? getScrapers().crawlNovelBin(...args) : null);
    const crawlNovelFire = (...args) => (getScrapers().crawlNovelFire ? getScrapers().crawlNovelFire(...args) : null);
    const crawlLofter = (...args) => (getScrapers().crawlLofter ? getScrapers().crawlLofter(...args) : null);
    const crawlPixiv = (...args) => (getScrapers().crawlPixiv ? getScrapers().crawlPixiv(...args) : null);
    const crawlNovelBuddy = (...args) => (getScrapers().crawlNovelBuddy ? getScrapers().crawlNovelBuddy(...args) : null);
    const crawlLnori = (...args) => (getScrapers().crawlLnori ? getScrapers().crawlLnori(...args) : null);
    const crawlWuxiaBox = (...args) => (getScrapers().crawlWuxiaBox ? getScrapers().crawlWuxiaBox(...args) : null);
    const crawlWtrLab = (...args) => (getScrapers().crawlWtrLab ? getScrapers().crawlWtrLab(...args) : null);
    const crawlFuckNovelPia = (...args) => (getScrapers().crawlFuckNovelPia ? getScrapers().crawlFuckNovelPia(...args) : null);
    const crawlUniversal = (...args) => (getScrapers().crawlUniversal ? getScrapers().crawlUniversal(...args) : null);
    const extractPdfText = (...args) => (getScrapers().extractPdfText ? getScrapers().extractPdfText(...args) : null);
    const cleanWitchCultChapter = (...args) => (getScrapers().cleanWitchCultChapter ? getScrapers().cleanWitchCultChapter(...args) : '');
    const formatCanonicalWctChapterTitle = (...args) => (getScrapers().formatCanonicalWctChapterTitle ? getScrapers().formatCanonicalWctChapterTitle(...args) : '');
    // ══════════════════════════════════════════════════════════════════════
    // 6. DIRECT EPUB BUFFER PARSER
    // ══════════════════════════════════════════════════════════════════════
    async function importEpubBuffer(buffer, fileName = "Novel.epub", progressCb) {
        progressCb?.('Parsing EPUB package with high-speed fflate...', 30);
        const fflateLib = (typeof window !== 'undefined' && window.fflate) ? window.fflate : (typeof fflate !== 'undefined' ? fflate : null);
        if (fflateLib) {
            try {
                const u8 = buffer instanceof Uint8Array ? buffer : (buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer || buffer));
                const unzipped = fflateLib.unzipSync(u8);

                const getFileText = (path) => {
                    if (!path) return null;
                    let bytes = unzipped[path];
                    if (!bytes) {
                        const lower = path.toLowerCase();
                        const k = Object.keys(unzipped).find(key => key.toLowerCase() === lower);
                        if (k) bytes = unzipped[k];
                    }
                    if (!bytes) return null;
                    return fflateLib.strFromU8(bytes);
                };

                const containerXml = getFileText('META-INF/container.xml');
                if (!containerXml) throw new Error('Invalid EPUB: META-INF/container.xml missing');
                const cd = new DOMParser().parseFromString(containerXml, 'text/xml');
                const rp = cd.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf';
                const od = rp.includes('/') ? rp.substring(0, rp.lastIndexOf('/') + 1) : '';

                let oc = getFileText(rp);
                if (!oc) {
                    const opfCandidates = Object.keys(unzipped).filter(k => k.endsWith('.opf'));
                    if (opfCandidates.length > 0) oc = getFileText(opfCandidates[0]);
                }
                if (!oc) throw new Error('Package OPF file not found in EPUB');

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
                    let chHtml = getFileText(filePath) || getFileText(hrefPath) || getFileText(decodedFilePath);
                    if (!chHtml) continue;

                    const chDoc = new DOMParser().parseFromString(chHtml, 'text/html');
                    const headingEl = chDoc.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
                    let heading = headingEl?.textContent?.trim() || `Chapter ${chapters.length + 1}`;
                    if (headingEl && headingEl.parentNode) {
                        headingEl.parentNode.removeChild(headingEl);
                    }
                    let bodyText = cleanChapterHtmlWithImages(chDoc.body?.innerHTML || chDoc.body?.textContent || '');

                    const lowerBody = (bodyText || '').toLowerCase();
                    const isSummaryBlock = chDoc.querySelector('.meta, .tags, [class*="summary"], [class*="preface"], dl.tags') ||
                                           /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:summary|synopsis|warning|notes|author'?s?\s*note|简介|内容简介|前言|文案)[:：\s]/i.test(bodyText || '') ||
                                           lowerBody.includes('summary:') || lowerBody.includes('notes:') || lowerBody.includes('tags:');
                    if ((heading.toLowerCase() === title.toLowerCase() || !heading || /^chapter\s+\d+$/i.test(heading)) && isSummaryBlock) {
                        heading = 'Summary';
                    }

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
                    rawZip: unzipped,
                    isEpub: true,
                    sourceUrl: fileName
                };
            } catch (fflateErr) {
                console.warn('[web_importer] fflate unzip fallback to JSZip:', fflateErr);
            }
        }

        const JSZipClass = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!JSZipClass) throw new Error('Neither fflate nor JSZip library initialized.');
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
        if (clean.includes('witchculttranslation.com') || clean.includes('translationchicken.com')) return 'witchcult';
        if (clean.includes('lofter.com')) return 'lofter';
        if (clean.includes('royalroad.com') || clean.includes('scribblehub.com')) return 'royalroad';
        if (clean.includes('syosetu.com') || clean.includes('syosetu.org') || clean.includes('kakuyomu.jp')) return 'syosetu';
        if (clean.includes('novelfull.com') || clean.includes('boxnovel.com') || clean.includes('readlightnovel') || clean.includes('allnovelfull.') || clean.includes('readnovelfull.') || clean.includes('freewebnovel.') || clean.includes('lightnovelpub.')) return 'novelfull';
        if (clean.includes('pixiv.net/novel/')) return 'pixiv';
        return 'universal';
    }

    // ══════════════════════════════════════════════════════════════════════
    // MULTI-SOURCE WEB NOVEL SEARCH ENGINE (DELEGATED TO web_importer_search.js)
    // ══════════════════════════════════════════════════════════════════════
    const searchNovels = (...args) => (window.WebNovelSearch?.searchNovels ? window.WebNovelSearch.searchNovels(...args) : []);
    const searchNovelBin = (...args) => (window.WebNovelSearch?.searchNovelBin ? window.WebNovelSearch.searchNovelBin(...args) : []);
    const searchLnori = (...args) => (window.WebNovelSearch?.searchLnori ? window.WebNovelSearch.searchLnori(...args) : []);

    async function crawlWithPlugin(plugin, url, progressCb, options = {}) {
        progressCb?.(`Connecting to ${plugin.name}...`, 5);
        const details = await plugin.getNovelDetails(url);
        if (!details || !details.chapters || details.chapters.length === 0) {
            throw new Error(`[${plugin.name}] Could not extract novel details or chapter list from ${url}`);
        }

        const chapterLinks = details.chapters.map((c, i) => ({
            title: c.title || `Chapter ${i + 1}`,
            url: c.url,
            arc: c.arc || c.volume || '',
            volume: c.volume || c.arc || ''
        }));

        if (options.tocOnly || activeCrawlController?.tocOnly) {
            return {
                title: details.title || 'Novel',
                author: details.author || 'Author',
                cover: details.cover || '',
                summary: details.summary || '',
                totalChapterCount: chapterLinks.length,
                chapterList: chapterLinks,
                chapters: [],
                isEpub: false,
                sourceUrl: url
            };
        }

        progressCb?.(`Found ${chapterLinks.length} chapters via ${plugin.name}! Fetching...`, 20);

        const { chapters, totalWords } = await crawlChapterPool(
            chapterLinks,
            async (item, idx) => {
                const ch = await plugin.getChapter(item.url, { title: item.title, arc: item.arc, volume: item.volume, index: idx });
                return {
                    title: ch.title || item.title,
                    text: cleanChapterHtmlWithImages(ch.content || ch.text || ''),
                    arc: ch.arc || item.arc,
                    volume: ch.volume || item.volume
                };
            },
            options.concurrency || 4,
            progressCb,
            { title: details.title, author: details.author, summary: details.summary, cover: details.cover, chapterList: chapterLinks },
            { delayMs: options.delayMs !== undefined ? options.delayMs : 250 }
        );

        return {
            title: details.title || 'Novel',
            author: details.author || 'Author',
            cover: details.cover || '',
            summary: details.summary || '',
            totalChapterCount: chapters.length,
            chapters,
            chapterList: chapterLinks,
            isEpub: false,
            sourceUrl: url
        };
    }

    window.WebNovelImporter = {
        fetchHtml,
        importEpubBuffer,
        cleanWitchCultChapter,
        formatCanonicalWctChapterTitle,
        extractPdfText,
        detectType: detectUrlType,
        getBestImageUrl,
        cleanChapterHtmlWithImages,
        extractPageCover,
        isBlockOrChallenge,
        detectBlockOrChallenge,
        crawlChapterPool,
        searchNovels,
        searchNovelBin,
        searchLnori,
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
                const oldCtrl = activeCrawlController;
                setTimeout(() => {
                    if (activeCrawlController === oldCtrl) {
                        activeCrawlController = null;
                    }
                }, 400);
                return true;
            }
            return false;
        },
        resetCrawlController: () => resetCrawlController(),
        getActiveController: () => activeCrawlController,
        importUrl: async (url, progressCb, options = {}) => {
            if (!url || !url.trim()) throw new Error('Please enter a valid novel URL.');
            createCrawlController(options);
            const type = detectUrlType(url);
            console.log(`⚡ [LNCrawl Engine] Importing ${type.toUpperCase()} URL: ${url}`);

            if (!options.tocOnly) {
                try {
                    await window.NativeBridge?.acquireWakeLock?.(`Ingesting Novel (${type.toUpperCase()})`, 'Downloading chapters in background...');
                } catch (e) {}
            }

            try {
                window.telemetryLog?.('CRAWLER', `Initiating crawl for URL: ${url} (engine: ${type || 'auto'})`, { url, type, options });
                let result;
                if (type === 'royalroad') result = await crawlRoyalRoad(url, progressCb, options);
                else if (type === 'novelfire') result = await crawlNovelFire(url, progressCb, options);
                else if (type === 'novelbuddy') result = await crawlNovelBuddy(url, progressCb, options);
                else if (type === 'lnori') result = await crawlLnori(url, progressCb, options);
                else if (type === 'wuxiabox') result = await crawlWuxiaBox(url, progressCb, options);
                else if (type === 'wtrlab') result = await crawlWtrLab(url, progressCb, options);
                else if (type === 'fucknovelpia') result = await crawlFuckNovelPia(url, progressCb, options);
                else if (type === 'novelbin') result = await crawlNovelBin(url, progressCb, options);
                else if (type === 'witchcult') result = await crawlWitchCult(url, progressCb, options);
                else if (type === 'ao3') result = await crawlAO3(url, progressCb, options);
                else if (type === 'syosetu') result = await crawlSyosetu(url, progressCb, options);
                else if (type === 'novelfull') result = await crawlNovelFull(url, progressCb, options);
                else if (type === 'lofter') result = await crawlLofter(url, progressCb, options);
                else if (type === 'pixiv') result = await crawlPixiv(url, progressCb, options);
                else {
                    const registeredPlugin = (typeof window !== 'undefined' && window.sourceRegistry) ? window.sourceRegistry.findPlugin(url) : null;
                    if (registeredPlugin && registeredPlugin.id !== 'universal') {
                        console.log(`⚡ [LNCrawl Engine] Routing to active source plugin: ${registeredPlugin.name} (${registeredPlugin.id})`);
                        result = await crawlWithPlugin(registeredPlugin, url, progressCb, options);
                    } else {
                        result = await crawlUniversal(url, progressCb, options);
                    }
                }

                if (result) {
                    result.sourceUrl = result.sourceUrl || url;
                }
                if (result && activeCrawlController) {
                    result.isPaused = !!activeCrawlController.isPaused;
                    result.isCancelled = !!activeCrawlController.isCancelled;
                    result.totalChapterCount = (typeof result.totalChapterCount === 'number' && result.totalChapterCount > 0) ? result.totalChapterCount : (activeCrawlController.totalChapterCount || (activeCrawlController.chapterList ? activeCrawlController.chapterList.length : (result.chapterList ? result.chapterList.length : (result.chapters ? result.chapters.length : 0))));
                    result.chapterList = result.chapterList || activeCrawlController.chapterList || [];
                }
                window.telemetryLog?.('CRAWLER', `Crawl complete for "${result?.title || url}": ${result?.chapters?.length || (result?.chapterList ? result.chapterList.length : 0)} chapters fetched (cancelled: ${!!result?.isCancelled})`, {
                    title: result?.title,
                    chapterCount: result?.chapters?.length,
                    author: result?.author,
                    isCancelled: !!result?.isCancelled
                });
                return result;
            } finally {
                if (options.tocOnly) {
                    try { window.NativeBridge?.releaseWakeLock?.(); } catch (e) {}
                }
                if (activeCrawlController && (activeCrawlController.isCancelled || !activeCrawlController.isPaused)) {
                    const finishedCtrl = activeCrawlController;
                    setTimeout(() => {
                        if (activeCrawlController === finishedCtrl) {
                            activeCrawlController = null;
                        }
                    }, 400);
                }
            }
        },
        checkNovelUpdates: async (novelRecord, progressCb) => {
            if (!novelRecord) return { hasUpdates: false, error: 'No novel record provided.' };

            // 1. Auto-load full novel from IndexedDB if chapters or sourceUrl are missing from a metadata stub
            if ((!novelRecord.sourceUrl || !novelRecord.rawChapters || novelRecord.rawChapters.length === 0) && typeof window !== 'undefined' && window.GeminiNovelDB) {
                try {
                    let full = null;
                    if (novelRecord.id) full = await window.GeminiNovelDB.getNovel(novelRecord.id);
                    if (!full && novelRecord.title) {
                        const targetT = (typeof window !== 'undefined' && window.normalizeTitleKey)
                            ? window.normalizeTitleKey(novelRecord.title)
                            : String(novelRecord.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                        full = all?.find(n => n.id === novelRecord.id || n.title === novelRecord.title || ((typeof window !== 'undefined' && window.normalizeTitleKey ? window.normalizeTitleKey(n.title) : String(n.title || '').toLowerCase()) === targetT));
                    }
                    if (full) {
                        novelRecord = { ...full, ...novelRecord, sourceUrl: novelRecord.sourceUrl || full.sourceUrl || full.url, rawChapters: full.rawChapters || full.chapters || novelRecord.rawChapters };
                    }
                } catch (e) {
                    console.warn('checkNovelUpdates failed to load full novel:', e);
                }
            }

            // 2. Self-heal: recover sourceUrl from chapter URLs if missing (e.g. Royal Road, NovelFire, Syosetu)
            if (!novelRecord.sourceUrl) {
                const chs = novelRecord.chapters || novelRecord.rawChapters || [];
                const chUrl = chs.find(c => c && c.url)?.url || '';
                if (chUrl.includes('royalroad.com/fiction/')) {
                    const m = chUrl.match(/(https?:\/\/[^\/]*royalroad\.com\/fiction\/\d+)/i);
                    if (m) novelRecord.sourceUrl = m[1];
                } else if (chUrl.includes('novelfire.net/book/')) {
                    const m = chUrl.match(/(https?:\/\/[^\/]*novelfire\.net\/book\/[^\/]+)/i);
                    if (m) novelRecord.sourceUrl = m[1];
                } else if (chUrl.includes('syosetu.com/')) {
                    const m = chUrl.match(/(https?:\/\/[^\/]*syosetu\.com\/[^\/]+)/i);
                    if (m) novelRecord.sourceUrl = m[1];
                } else if (chUrl.includes('lnori.')) {
                    const m = chUrl.match(/(https?:\/\/[^\/]*lnori\.(?:org|com)\/[^\/]+)/i);
                    if (m) novelRecord.sourceUrl = m[1];
                }
            }

            if (!novelRecord.sourceUrl) {
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

                // Check for Lnori multi-volume series
                const isLnori = detectUrlType(novelRecord.sourceUrl) === 'lnori';
                const isLnoriSeries = isLnori && (novelRecord.sourceUrl.includes('/series/') || !!remote.isLnoriSeries);

                if (isLnoriSeries) {
                    const localChapters = novelRecord.rawChapters || novelRecord.chapters || [];
                    const localVolSet = new Set();
                    let maxLocalVol = 0;
                    localChapters.forEach(c => {
                        const m = (c.title || '').match(/(?:Volume|Vol\.?|Book)\s*(\d+)/i);
                        if (m) {
                            const vNum = parseInt(m[1], 10);
                            if (vNum > maxLocalVol) maxLocalVol = vNum;
                            localVolSet.add(vNum);
                        }
                        if (c.url) {
                            const u = c.url.split('#')[0];
                            if (u) localVolSet.add(u);
                        }
                    });
                    let localVolCount = Math.max(localVolSet.size > 0 ? (maxLocalVol || localVolSet.size) : 0, novelRecord.volumeCount || 0);
                    const remoteVolCount = remote.volumeCount || (remote.chapterList ? remote.chapterList.length : remoteCount);

                    // Robust fallback: if local chapters were already ingested in full (~400 chapters for 15 volumes)
                    // but volumeCount wasn't recorded, treat localVolCount as remoteVolCount if chapter count is substantial
                    if (localVolCount === 0 && (novelRecord.chapterCount || localChapters.length) >= 100) {
                        localVolCount = remoteVolCount;
                    }

                    const hasUpdates = remoteVolCount > localVolCount;
                    const newCount = Math.max(0, remoteVolCount - localVolCount);
                    return {
                        hasUpdates,
                        isVolumeBased: true,
                        newCount,
                        localCount: localVolCount,
                        remoteCount: remoteVolCount,
                        remoteChapterList: remote.chapterList || [],
                        remoteTitle: remote.title || novelRecord.title
                    };
                }

                const localChapters = novelRecord.rawChapters || novelRecord.chapters || [];
                const localCount = novelRecord.chapterCount || localChapters.length;
                const hasUpdates = remoteCount > localCount;
                const newCount = Math.max(0, remoteCount - localCount);
                return {
                    hasUpdates,
                    isVolumeBased: false,
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

    if (typeof window !== 'undefined') {
        window.extractPageCover = extractPageCover;
        window.isBlockOrChallenge = isBlockOrChallenge;
        window.detectBlockOrChallenge = detectBlockOrChallenge;
        window.crawlChapterPool = crawlChapterPool;
        window.cleanChapterHtmlWithImages = cleanChapterHtmlWithImages;
        window.getBestImageUrl = getBestImageUrl;
        window.importEpubBuffer = importEpubBuffer;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            WebNovelImporter: window.WebNovelImporter,
            ChameleonExtractor,
            AdaptiveSpeedController,
            cleanChapterHtmlWithImages
        };
    }

    console.log(" LightNovel-Crawler Multi-Source Ingestion Engine Active!");
})();
