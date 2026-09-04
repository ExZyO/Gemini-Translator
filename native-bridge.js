// Universal Native Android Superpowers & Web Ingestion Bridge
(function() {
    const isCapacitor = () => !!(window.Capacitor && window.Capacitor.Plugins);
    const getBridge = () => window.Capacitor?.Plugins?.NativeAndroidBridge;

    window.NativeBridge = {
        installApk: async (url = "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk") => {
            const bridge = getBridge();
            if (bridge && bridge.installApk) {
                return await bridge.installApk({ url });
            } else {
                // Browser fallback: trigger direct download
                window.open(url, '_blank');
            }
        },

                checkForUpdate: async (currentVersion) => {
            try {
                const parseVer = (v) => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
                const apkDownloadUrl = "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk";
                const releasePage = "https://github.com/ExZyO/Gemini-Translator/releases/tag/latest";
                let releaseNotes = '';

                // Concurrent Multi-Source Version Query (Bypasses CDN edge caching by checking all sources in parallel)
                const candidateVersions = [];

                const p1 = fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest?t=' + Date.now(), {
                    headers: { 'Accept': 'application/vnd.github.v3+json' },
                    cache: 'no-store'
                }).then(async r => {
                    if (r.ok) {
                        const d = await r.json();
                        if (d?.body) releaseNotes = d.body;
                        const m = (d.name || '').match(/v?(\d+\.\d+\.\d+)/i) || (d.tag_name || '').match(/v?(\d+\.\d+\.\d+)/i);
                        if (m) candidateVersions.push(m[1]);
                    }
                }).catch(() => {});

                const p2 = fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/version.json?t=' + Date.now(), { cache: 'no-store' })
                    .then(async r => {
                        if (r.ok) {
                            const d = await r.json();
                            if (d && d.version) candidateVersions.push(d.version);
                        }
                    }).catch(() => {});

                const p3 = fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/package.json?t=' + Date.now(), { cache: 'no-store' })
                    .then(async r => {
                        if (r.ok) {
                            const d = await r.json();
                            if (d && d.version) candidateVersions.push(d.version);
                        }
                    }).catch(() => {});

                const p4 = fetch('https://cdn.jsdelivr.net/gh/ExZyO/Gemini-Translator@main/version.json?t=' + Date.now(), { cache: 'no-store' })
                    .then(async r => {
                        if (r.ok) {
                            const d = await r.json();
                            if (d && d.version) candidateVersions.push(d.version);
                        }
                    }).catch(() => {});

                await Promise.allSettled([p1, p2, p3, p4]);

                if (candidateVersions.length === 0) return null;

                // Pick the highest version among all reporting sources (immunizes against stale CDN edge caching)
                candidateVersions.sort((a, b) => {
                    const [a1, a2, a3] = parseVer(a);
                    const [b1, b2, b3] = parseVer(b);
                    if (b1 !== a1) return b1 - a1;
                    if (b2 !== a2) return b2 - a2;
                    return b3 - a3;
                });

                const remoteVersion = candidateVersions[0];
                const [rMajor = 0, rMinor = 0, rPatch = 0] = parseVer(remoteVersion);
                const [cMajor = 0, cMinor = 0, cPatch = 0] = parseVer(currentVersion);

                let isNewer = false;
                if (rMajor > cMajor) isNewer = true;
                else if (rMajor === cMajor && rMinor > cMinor) isNewer = true;
                else if (rMajor === cMajor && rMinor === cMinor && rPatch > cPatch) isNewer = true;

                return {
                    isNewer,
                    latestVersion: 'v' + [rMajor, rMinor, rPatch].join('.'),
                    currentVersion: 'v' + [cMajor, cMinor, cPatch].join('.'),
                    releaseNotes: releaseNotes || `Gemini Translator v${rMajor}.${rMinor}.${rPatch} is available!`,
                    apkUrl: apkDownloadUrl,
                    releasePage
                };
            } catch (e) {
                console.warn('Update check failed:', e);
                return null;
            }
        },

        fetchNative: async (url) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.fetchNative) {
                    const res = await bridge.fetchNative({ url });
                    if (res && res.data) {
                        return { success: res.success, status: res.status || 200, data: res.data };
                    }
                }
            } catch (e) {
                console.warn('Native fetch bridge error:', e);
            }
            // Multi-proxy fallback with verified fast endpoints
            const proxies = [
                (u) => `https://corsproxy.org/?url=${encodeURIComponent(u)}`,
                (u) => `https://proxy.cors.sh/${u}`,
                (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
            ];
            for (const pFn of proxies) {
                try {
                    const res = await fetch(pFn(url), { signal: AbortSignal.timeout(12000) });
                    if (res.ok) {
                        const text = await res.text();
                        if (!text.includes('Error 1015') && !text.includes('401 Unauthorized')) {
                            return { success: true, status: 200, data: text };
                        }
                    }
                } catch(e) {}
            }
            throw new Error(`Failed to fetch ${url} via native bridge and proxy pool.`);
        },

        shareFile: async (fileName, path, mimeType) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.shareFile) {
                    return await bridge.shareFile({ fileName, path, mimeType });
                }
            } catch (e) {
                console.warn('Share bridge error:', e);
            }
            return false;
        },

        isAvailable: () => isCapacitor() && !!getBridge(),

        speakNative: async (text, rate = 1.0) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.speakNativeTts) {
                    await bridge.speakNativeTts({ text, rate });
                    return true;
                }
            } catch (e) {
                console.warn('Native TTS speak error:', e);
            }
            return false;
        },

        stopNativeSpeech: async () => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.stopNativeTts) {
                    await bridge.stopNativeTts();
                    return true;
                }
            } catch (e) {
                console.warn('Native TTS stop error:', e);
            }
            return false;
        },

        saveBlob: async (blob, fileName, mimeType = "application/epub+zip", openChooser = false) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.saveBlobChunk) {
                    const chunkSize = 1.5 * 1024 * 1024; // 1.5MB chunk size (prevents V8 heap memory exhaustion)
                    const totalSize = blob.size;
                    const transferId = 'xfer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                    let offset = 0;
                    let isFirst = true;

                    while (offset < totalSize) {
                        const nextOffset = Math.min(offset + chunkSize, totalSize);
                        const slice = blob.slice(offset, nextOffset);
                        const isLast = (nextOffset >= totalSize);

                        const chunkBase64 = await new Promise((res, rej) => {
                            const r = new FileReader();
                            r.onload = () => {
                                const b64 = (r.result || '').split(',')[1] || '';
                                res(b64);
                            };
                            r.onerror = rej;
                            r.readAsDataURL(slice);
                        });

                        const result = await bridge.saveBlobChunk({
                            transferId,
                            fileName,
                            chunkBase64,
                            isFirst,
                            isLast,
                            mimeType,
                            openChooser
                        });

                        if (isLast) return result;
                        isFirst = false;
                        offset = nextOffset;
                    }
                    return { success: true, fileName };
                } else if (bridge && bridge.saveAndOpenFile) {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = async () => {
                            try {
                                const base64 = (reader.result || '').split(',')[1];
                                const res = await bridge.saveAndOpenFile({ fileName, base64, mimeType, openChooser });
                                resolve(res);
                            } catch (err) {
                                console.warn('Native save fallback:', err);
                                resolve(null);
                            }
                        };
                    });
                }
            } catch (e) {
                console.warn('NativeBridge saveBlob error:', e);
            }
            // Standard Browser Fallback
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        showProgressNotification: async (title, message, progress = 0, ongoing = true) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.showProgressNotification) {
                    await bridge.showProgressNotification({ title, message, progress, ongoing });
                }
            } catch (e) {
                console.warn('Notification Bridge:', e);
            }
        },

        requestNotificationPermission: async () => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.requestNotificationPermission) {
                    const res = await bridge.requestNotificationPermission();
                    return res?.granted;
                }
            } catch (e) {
                console.warn('Native Notification Permission Bridge:', e);
            }
            try {
                if ('Notification' in window) {
                    const perm = await Notification.requestPermission();
                    return perm === 'granted';
                }
            } catch (e) {}
            return false;
        },

        showCompletionNotification: async (title = "Completed! 🎉", message = "Action finished successfully.") => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.showCompletionNotification) {
                    await bridge.showCompletionNotification({ title, message });
                    try { window.NativeBridge?.haptic?.('success'); } catch(e) {}
                    return;
                }
            } catch (e) {
                console.warn('Native Completion Notification Bridge:', e);
            }
            try {
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification(title, { body: message, icon: './icon-192.png' });
                    } else if (Notification.permission !== 'denied') {
                        const perm = await Notification.requestPermission();
                        if (perm === 'granted') {
                            new Notification(title, { body: message, icon: './icon-192.png' });
                        }
                    }
                }
            } catch (e) {
                console.warn('Web Notification Fallback:', e);
            }
            try { window.NativeBridge?.haptic?.('success'); } catch(e) {}
        },

        clearProgressNotification: async (notifyDone = false, title = "Completed! 🎉", message = "Tap to view in reader.") => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.clearProgressNotification) {
                    await bridge.clearProgressNotification({ notifyDone, title, message });
                    if (notifyDone) {
                        try { window.NativeBridge?.haptic?.('success'); } catch(e) {}
                    }
                    return;
                }
            } catch (e) {
                console.warn('Clear Notification Bridge:', e);
            }
            if (notifyDone) {
                await window.NativeBridge?.showCompletionNotification?.(title, message);
            }
        },

        openWithReader: async (fileName, path = "") => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.openWithReader) {
                    await bridge.openWithReader({ fileName, path });
                    return true;
                }
            } catch (e) {
                console.warn('Open Reader Bridge:', e);
            }
            return false;
        },

        acquireWakeLock: async () => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.acquireWakeLock) {
                    await bridge.acquireWakeLock();
                }
            } catch (e) {
                console.warn('WakeLock Bridge:', e);
            }
            try {
                if ('wakeLock' in navigator && !window.__activeScreenWakeLock) {
                    window.__activeScreenWakeLock = await navigator.wakeLock.request('screen');
                    window.__activeScreenWakeLock.addEventListener('release', () => { window.__activeScreenWakeLock = null; });
                }
            } catch (e) {
                console.warn('Screen WakeLock API:', e);
            }
        },

        releaseWakeLock: async () => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.releaseWakeLock) {
                    await bridge.releaseWakeLock();
                }
            } catch (e) {
                console.warn('WakeLock Release Bridge:', e);
            }
            try {
                if (window.__activeScreenWakeLock) {
                    await window.__activeScreenWakeLock.release();
                    window.__activeScreenWakeLock = null;
                }
            } catch (e) {
                console.warn('Screen WakeLock Release:', e);
            }
        },

        webDavRequest: async ({ url, method = 'GET', headers = {}, body = null }) => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.webDavRequestNative) {
                    const res = await bridge.webDavRequestNative({ url, method, headers, body });
                    return res;
                }
            } catch (e) {
                console.warn('Native WebDAV bridge error, trying fetch fallback:', e);
            }
            // Web / PWA fetch fallback
            const res = await fetch(url, {
                method,
                headers,
                body: body ? body : undefined
            });
            const text = await res.text();
            return { status: res.status, data: text };
        },

        haptic: async (type = 'milestone') => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.triggerHaptic) {
                    await bridge.triggerHaptic({ type });
                } else if (navigator.vibrate) {
                    if (type === 'success') navigator.vibrate([40, 60, 40]);
                    else if (type === 'error') navigator.vibrate(120);
                    else navigator.vibrate(25);
                }
            } catch (e) {
                console.warn('Haptic Bridge:', e);
            }
        },

        
        // ══════════════════════════════════════════════════════════════════════
        // TACHIYOMI / MIHON IN-APP CLOUDFLARE RESOLVER BRIDGE
        // ══════════════════════════════════════════════════════════════════════
        resolveCloudflare: async (url) => {
            const bridge = getBridge();
            if (bridge && bridge.resolveCloudflare) {
                const res = await bridge.resolveCloudflare({ url });
                return res;
            }
            throw new Error('Cloudflare Resolver requires the Native Android App.');
        },

        // ══════════════════════════════════════════════════════════════════════
        // NATIVE CORS-FREE WEB CRAWLER & MULTI-PROXY ENGINE
        // ══════════════════════════════════════════════════════════════════════
        fetchUrl: async (url, options = {}) => {
            const bridge = getBridge();
            if (bridge && bridge.fetchUrlNative) {
                const res = await bridge.fetchUrlNative({
                    url,
                    userAgent: options.userAgent || undefined,
                    headers: options.headers || {}
                });
                return {
                    ok: res.status >= 200 && res.status < 400,
                    status: res.status,
                    text: async () => res.data,
                    url: res.url,
                    cookies: res.cookies || ''
                };
            }
            
            // Browser Fallback with multi-proxy redundancy
            const proxies = [
                (u) => u, // Direct fetch
                (u) => 'https://corsproxy.io/?' + encodeURIComponent(u),
                (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
                (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u)
            ];

            let lastErr = null;
            for (const proxyFn of proxies) {
                try {
                    const target = proxyFn(url);
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
                    const res = await fetch(target, { ...options, signal: controller.signal });
                    clearTimeout(timer);
                    if (res.ok) {
                        return res;
                    }
                } catch (err) {
                    lastErr = err;
                }
            }
            throw lastErr || new Error('Failed to fetch URL across all available networks.');
        },

        downloadBinary: async (url, options = {}) => {
            const bridge = getBridge();
            if (bridge && bridge.downloadBinaryNative) {
                const res = await bridge.downloadBinaryNative({
                    url,
                    userAgent: options.userAgent || undefined
                });
                if (res && res.base64) {
                    const binaryString = atob(res.base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return bytes.buffer;
                }
            }
            
            // Browser Fallback with multi-proxy redundancy
            const proxies = [
                (u) => u,
                (u) => 'https://corsproxy.io/?' + encodeURIComponent(u),
                (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u)
            ];

            for (const proxyFn of proxies) {
                try {
                    const target = proxyFn(url);
                    const res = await fetch(target, options);
                    if (res.ok) {
                        return await res.arrayBuffer();
                    }
                } catch (err) {
                    // Try next proxy
                }
            }
            throw new Error('Could not download binary file across network.');
        },

        installApk: async (apkUrl) => {
            const bridge = getBridge();
            if (bridge && bridge.installApk) {
                return await bridge.installApk({ url: apkUrl });
            }
            window.open(apkUrl, '_blank');
        }
    };

    console.log(" Native Android Superpowers Bridge Initialized (with Multi-Proxy Redundancy)!");
})();
