/**
 * Gemini Translator - System Diagnostics & Telemetry Logger
 * Manages KeyPool leasing, error tracking, and event ring buffers
 */
(function(window) {
    const maskKey = (k) => (!k ? '' : (k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k));

    /**
     * Wireless Local Wi-Fi Telemetry Dispatcher (Method 2)
     * Streams real-time diagnostics, crawler events, and errors to PC Agent
     */
    window.sendTelemetry = function(tag, message, data) {
      try {
        const enabled = localStorage.getItem('telemetry_enabled') !== 'false';
        const serverUrl = localStorage.getItem('telemetry_server_url') || 'http://192.168.1.216:9090';
        if (!enabled || !serverUrl) return;

        const endpoint = serverUrl.replace(/\/+$/, '') + '/log';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: tag || 'APP',
            message: message || '',
            data: data || null,
            timestamp: Date.now()
          })
        }).catch(() => {});
      } catch (e) {}
    };

    // Auto-stream console warnings & errors to PC Agent
    const _origWarn = console.warn;
    const _origError = console.error;
    console.warn = function(...args) {
      _origWarn.apply(console, args);
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        window.sendTelemetry('WARN', msg);
      } catch(e) {}
    };
    console.error = function(...args) {
      _origError.apply(console, args);
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        window.sendTelemetry('ERROR', msg);
      } catch(e) {}
    };

    window.AppLogger = {
      logs: [],
      maxLogs: 250,
      listeners: new Set(),
      log(level, tag, message, details = null) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = { time, level, tag, message, details };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) this.logs.shift();
        const detailStr = details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : '';
        console.log(`[${time}][${tag}] ${message}`, detailStr);
        this.listeners.forEach(fn => { try { fn([...this.logs]); } catch(e) {} });
        window.sendTelemetry(tag, `[${level.toUpperCase()}] ${message}`, details);
      },
      subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
      },
      getFormattedText() {
        if (this.logs.length === 0) return 'No diagnostic events recorded.';
        return this.logs.map(l => {
          const det = l.details ? ' ' + (typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details)) : '';
          return `[${l.time}][${l.level.toUpperCase()}][${l.tag}] ${l.message}${det}`;
        }).join('\n');
      },
      clear() {
        this.logs = [];
        this.listeners.forEach(fn => { try { fn([]); } catch(e) {} });
      }
    };

    const KeyPool = {
      inUse: new Set(),
      coolingUntil: new Map(),
      lastIndex: 0,
      lastLeaseTime: 0,

      async acquireKey(rawKeys, failingKey = null) {
        if (!rawKeys || rawKeys.length === 0) return null;
        // Automatic deduplication: keep only unique physical API keys
        const seen = new Set();
        const keys = [];
        for (const k of rawKeys) {
          if (k?.key && k.key.trim() && !seen.has(k.key.trim())) {
            seen.add(k.key.trim());
            keys.push(k);
          }
        }
        if (keys.length === 0) return null;
        if (keys.length === 1) return keys[0].key;

        // Adaptive Anti-stampede pacing:
        // Healthy state (zero rate-limits): 40ms micro-gap (100% instant full speed for 3.5-flash-lite)
        // Rate-limited state (keys actively cooling): 350ms spacing to prevent retry stampedes
        const hasCoolingKeys = Array.from(this.coolingUntil.values()).some(t => t > Date.now());
        const minGap = hasCoolingKeys ? 350 : 40;
        const elapsedSinceLastLease = Date.now() - (this.lastLeaseTime || 0);
        if (elapsedSinceLastLease < minGap) {
          await new Promise(r => setTimeout(r, minGap - elapsedSinceLastLease));
        }

        const now = Date.now();
        if (failingKey) {
          // Desynchronize retry waves: 15s base + 0 to 4s random jitter so workers never wake up simultaneously
          const jitter = Math.floor(Math.random() * 4000);
          const totalCoolMs = 15000 + jitter;
          this.coolingUntil.set(failingKey, now + totalCoolMs);
          window.AppLogger?.log('warn', 'KeyPool', `Key ${maskKey(failingKey)} hit 429 rate-limit. Cooling for ${(totalCoolMs / 1000).toFixed(1)}s.`);
          this.inUse.delete(failingKey);
        }

        const total = keys.length;

        // Circular Round-Robin search: check keys starting from (lastIndex + 1)
        for (let wait = 0; wait < 20; wait++) {
          const currentTime = Date.now();

          // 1. Find the next idle, non-cooling, non-failing key in circular sequence
          for (let step = 1; step <= total; step++) {
            const idx = (this.lastIndex + step) % total;
            const k = keys[idx];
            if (k?.key && k.key !== failingKey && !this.inUse.has(k.key)) {
              const coolTime = this.coolingUntil.get(k.key) || 0;
              if (currentTime >= coolTime) {
                this.lastIndex = idx;
                this.lastLeaseTime = Date.now();
                this.inUse.add(k.key);
                window.AppLogger?.log('info', 'KeyPool', `Leased idle key #${idx + 1} ${maskKey(k.key)} (${this.inUse.size}/${total} in-flight)`);
                return k.key;
              }
            }
          }

          // 2. If all keys are in-flight or cooling, pause 1.0s and re-evaluate
          await new Promise(r => setTimeout(r, 1000));
        }

        // Absolute fallback: pick next non-failing key
        for (let step = 1; step <= total; step++) {
          const idx = (this.lastIndex + step) % total;
          const k = keys[idx];
          if (k?.key && k.key !== failingKey && !this.inUse.has(k.key)) {
            this.lastIndex = idx;
            this.lastLeaseTime = Date.now();
            this.inUse.add(k.key);
            window.AppLogger?.log('info', 'KeyPool', `Leased fallback key #${idx + 1} ${maskKey(k.key)}`);
            return k.key;
          }
        }
        return keys[0]?.key || null;
      },

      releaseKey(key) {
        if (key) {
          this.inUse.delete(key);
          window.AppLogger?.log('info', 'KeyPool', `Released key ${maskKey(key)} (${this.inUse.size} in-flight)`);
        }
      }
    };

  window.maskKey = maskKey;
  window.KeyPool = KeyPool;
})(window);
