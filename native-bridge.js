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

        checkForUpdate: async (currentVersion = "6.9.5") => {
            try {
                let remoteVersion = null;
                let releaseNotes = '';

                // Source 1: Check GitHub Releases metadata
                try {
                    const res = await fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest', {
                        headers: { 'Accept': 'application/vnd.github.v3+json' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        releaseNotes = data.body || '';
                        const titleMatch = (data.name || '').match(/v?(\d+\.\d+\.\d+)/i);
                        if (titleMatch) remoteVersion = titleMatch[1];
                    }
                } catch (re) {}

                // Source 2: Check raw package.json (no rate limits)
                if (!remoteVersion) {
                    try {
                        const pkgRes = await fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/package.json?t=' + Date.now());
                        if (pkgRes.ok) {
                            const pkgData = await pkgRes.json();
                            if (pkgData.version && pkgData.version !== '1.0.0') {
                                remoteVersion = pkgData.version;
                            }
                        }
                    } catch (pe) {}
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

                return {
                    isNewer,
                    latestVersion: 'v' + [rMajor, rMinor, rPatch].join('.'),
                    currentVersion: 'v' + [cMajor, cMinor, cPatch].join('.'),
                    releaseNotes,
                    apkUrl: "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk",
                    releasePage: "https://github.com/ExZyO/Gemini-Translator/releases/tag/latest"
                };
            } catch (e) {
                console.warn('Update check failed:', e);
                return null;
            }
        },

        isAvailable: () => isCapacitor() && !!getBridge(),

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

        clearProgressNotification: async (notifyDone = false, title = "Completed! ✨", message = "Tap to view in reader.") => {
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
                    const res = await fetch(target, options);
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
        }
    };

    console.log("⚡ Native Android Superpowers Bridge Initialized (with Multi-Proxy Redundancy)!");
})();
