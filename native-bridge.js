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
                let isApkReady = false;
                let apkDownloadUrl = "https://github.com/ExZyO/Gemini-Translator/releases/download/latest/GeminiTranslator.apk";

                // Step 1: Query GitHub Releases directly for the latest published release and APK
                try {
                    const res = await fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest?t=' + Date.now(), {
                        headers: { 'Accept': 'application/vnd.github.v3+json' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        releaseNotes = data.body || '';

                        const apkAsset = Array.isArray(data.assets) && data.assets.find(a => 
                            (a.name === 'GeminiTranslator.apk' || a.name.endsWith('.apk')) && 
                            a.state === 'uploaded' && 
                            a.size > 1000000
                        );

                        if (apkAsset) {
                            isApkReady = true;
                            if (apkAsset.browser_download_url) {
                                apkDownloadUrl = apkAsset.browser_download_url;
                            }
                            const verMatch = (data.name || '').match(/v?(\d+\.\d+\.\d+)/i) || 
                                             (data.tag_name || '').match(/v?(\d+\.\d+\.\d+)/i) ||
                                             (data.body || '').match(/v?(\d+\.\d+\.\d+)/i);
                            if (verMatch) remoteVersion = verMatch[1];
                        }
                    }
                } catch (re) {
                    console.warn('GitHub Releases check error:', re);
                }

                // If no published APK asset is ready on GitHub Releases, do not show update
                if (!remoteVersion || !isApkReady) return null;

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
                    isNewer,
                    latestVersion: 'v' + [rMajor, rMinor, rPatch].join('.'),
                    currentVersion: 'v' + [cMajor, cMinor, cPatch].join('.'),
                    releaseNotes,
                    apkUrl: apkDownloadUrl,
                    releasePage: "https://github.com/ExZyO/Gemini-Translator/releases/tag/latest"
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
            const res = await fetch(proxy);
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

        saveBlob: async (blob, fileName, mimeType = "application/epub+zip") => {
            try {
                const bridge = getBridge();
                if (bridge && bridge.saveAndOpenFile) {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = async () => {
                            try {
                                const base64 = (reader.result || '').split(',')[1];
                                const res = await bridge.saveAndOpenFile({ fileName, base64, mimeType });
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
