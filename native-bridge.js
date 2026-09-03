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
                let remoteVersion = null;
                let releaseNotes = '';
                const apkDownloadUrl = "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk";
                const releasePage = "https://github.com/ExZyO/Gemini-Translator/releases/tag/latest";

                // Tier 1: GitHub Raw package.json (Unmetered static CDN, zero rate-limit 403s)
                try {
                    const rRes = await fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/package.json?t=' + Date.now(), { cache: 'no-store' });
                    if (rRes.ok) {
                        const rData = await rRes.json();
                        if (rData && rData.version) remoteVersion = rData.version;
                    }
                } catch (e1) {
                    console.warn('Tier 1 Raw update check blip:', e1);
                }

                // Tier 2: jsDelivr global edge mirror (Zero rate limits, high reliability fallback)
                if (!remoteVersion) {
                    try {
                        const cRes = await fetch('https://cdn.jsdelivr.net/gh/ExZyO/Gemini-Translator@main/package.json?t=' + Date.now(), { cache: 'no-store' });
                        if (cRes.ok) {
                            const cData = await cRes.json();
                            if (cData && cData.version) remoteVersion = cData.version;
                        }
                    } catch (e2) {
                        console.warn('Tier 2 CDN update check blip:', e2);
                    }
                }

                // Tier 3: GitHub Releases API for release notes & fallback
                try {
                    const ghRes = await fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest?t=' + Date.now(), {
                        headers: { 'Accept': 'application/vnd.github.v3+json' },
                        cache: 'no-store'
                    });
                    if (ghRes.ok) {
                        const ghData = await ghRes.json();
                        if (ghData?.body) releaseNotes = ghData.body;
                        if (!remoteVersion) {
                            const verMatch = (ghData.name || '').match(/v?(\d+\.\d+\.\d+)/i) || 
                                             (ghData.tag_name || '').match(/v?(\d+\.\d+\.\d+)/i);
                            if (verMatch) remoteVersion = verMatch[1];
                        }
                    }
                } catch (e3) {
                    // Non-fatal: release notes are optional
                }

                if (!remoteVersion) return null;

                // Strict Semver Math: remote > current
                const parseVer = (v) => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
                const [rMajor = 0, rMinor = 0, rPatch = 0] = parseVer(remoteVersion);
                const [cMajor = 0, cMinor = 0, cPatch = 0] = parseVer(currentVersion);

                let isNewer = false;
                if (rMajor > cMajor) isNewer = true;
                else if (rMajor === cMajor && rMinor > cMinor) isNewer = true;
                else if (rMajor === cMajor && rMinor === cMinor && rPatch > cPatch) isNewer = true;

                if (!isNewer) return null;

                return {
                    isNewer: true,
                    latestVersion: 'v' + [rMajor, rMinor, rPatch].join('.'),
                    currentVersion: 'v' + [cMajor, cMinor, cPatch].join('.'),
                    releaseNotes: releaseNotes || `Gemini Translator v${rMajor}.${rMinor}.${rPatch} is now available!`,
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
                    return await bridge.fetchNative({ url });
                }
            } catch (e) {
                console.warn('Native fetch bridge error:', e);
            }
            // Browser CORS fallback
            const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            let res;
            try {
                res = await fetch(proxy, { signal: controller.signal });
            } finally {
                clearTimeout(timer);
            }
            const text = await res.text();
            return { success: true, data: text };
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

        clearProgressNotification: async (notifyDone = false, title = "Completed! ", message = "Tap to view in reader.") => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.clearProgressNotification) {
                    await bridge.clearProgressNotification({ notifyDone, title, message });
                }
            } catch (e) {
                console.warn('Clear Notification Bridge:', e);
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
