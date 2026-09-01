// Universal Native Android Superpowers Bridge
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
        }
    };

    console.log("⚡ Native Android Superpowers Bridge Initialized!");
})();
