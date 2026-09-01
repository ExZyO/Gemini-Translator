// Universal Native Android Superpowers & Web Ingestion Bridge
(function() {
    const isCapacitor = () => !!(window.Capacitor && window.Capacitor.Plugins);
    const getBridge = () => window.Capacitor?.Plugins?.NativeAndroidBridge;

    window.NativeBridge = {
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
