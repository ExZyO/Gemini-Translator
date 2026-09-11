/**
 * Gemini Translator - System Diagnostics & Telemetry Logger (v8.12.1)
 * Manages KeyPool leasing, error tracking, and universal live Wi-Fi telemetry
 */
(function(window) {
  const maskKey = (k) => (!k ? '' : (k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k));

  // Sanitize telemetry payloads: mask API keys and truncate massive novel texts
  const sanitizePayload = (obj, depth = 0) => {
    if (!obj || depth > 3) return obj;
    if (typeof obj === 'string') {
      if (/AIzaSy[A-Za-z0-9_-]{33}/.test(obj)) {
        return obj.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, (m) => maskKey(m));
      }
      if (obj.length > 300) {
        return obj.slice(0, 200) + `… [truncated ${obj.length} chars]`;
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      if (obj.length > 500) {
        return [...obj.slice(0, 500).map(item => sanitizePayload(item, depth + 1)), `… (${obj.length - 500} more items)`];
      }
      return obj.map(item => sanitizePayload(item, depth + 1));
    }
    if (typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (/key|token|auth/i.test(k) && typeof v === 'string') {
          out[k] = maskKey(v);
        } else if (/content|text|html|raw/i.test(k) && typeof v === 'string' && v.length > 200) {
          out[k] = `${v.slice(0, 100)}… (${v.length} chars)`;
        } else {
          out[k] = sanitizePayload(v, depth + 1);
        }
      }
      return out;
    }
    return obj;
  };

  // Offline queue: holds up to 100 events if PC is temporarily unreachable
  const offlineQueue = [];
  const MAX_QUEUE = 100;
  let isFlushing = false;

  /**
   * Wireless Local Wi-Fi Telemetry Dispatcher (Method 2)
   * Streams real-time diagnostics, crawler events, and UI actions to PC Agent
   */
  window.sendTelemetry = function(tag, message, data) {
    try {
      const enabled = localStorage.getItem('telemetry_enabled') !== 'false';
      const serverUrl = localStorage.getItem('telemetry_server_url') || 'http://192.168.1.216:9090';
      if (!enabled || !serverUrl) return;

      const payload = {
        tag: tag || 'APP',
        message: typeof message === 'string' ? message : JSON.stringify(message),
        data: data ? sanitizePayload(data) : null,
        timestamp: Date.now()
      };

      const endpoint = serverUrl.replace(/\/+$/, '') + '/log';

      // Send event
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(res => {
        if (res.ok && offlineQueue.length > 0 && !isFlushing) {
          flushOfflineQueue(endpoint);
        }
      }).catch(() => {
        // Queue if offline
        if (offlineQueue.length < MAX_QUEUE) {
          offlineQueue.push(payload);
        }
      });
    } catch (e) {}
  };

  const flushOfflineQueue = async (endpoint) => {
    isFlushing = true;
    try {
      while (offlineQueue.length > 0) {
        const item = offlineQueue.shift();
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        }).catch(() => {
          offlineQueue.unshift(item);
          throw new Error('Still unreachable');
        });
      }
    } catch (e) {
    } finally {
      isFlushing = false;
    }
  };

  /**
   * Standard High-Level Telemetry Helper
   * window.telemetryLog('CRAWLER', 'Scraped chapter 5', { novelId, length })
   */
  window.telemetryLog = function(category, action, details = null, level = 'info') {
    try {
      window.AppLogger?.log(level, category, action, details);
    } catch(e) {
      window.sendTelemetry(category, `[${level.toUpperCase()}] ${action}`, details);
    }
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
    maxLogs: 300,
    listeners: new Set(),
    log(level, tag, message, details = null) {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const entry = { time, level, tag, message, details: details ? sanitizePayload(details) : null };
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) this.logs.shift();
      const detailStr = details ? (typeof details === 'object' ? JSON.stringify(sanitizePayload(details)) : String(details)) : '';
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

      const hasCoolingKeys = Array.from(this.coolingUntil.values()).some(t => t > Date.now());
      const minGap = hasCoolingKeys ? 350 : 40;
      const elapsedSinceLastLease = Date.now() - (this.lastLeaseTime || 0);
      if (elapsedSinceLastLease < minGap) {
        await new Promise(r => setTimeout(r, minGap - elapsedSinceLastLease));
      }

      const now = Date.now();
      if (failingKey) {
        const jitter = Math.floor(Math.random() * 4000);
        const totalCoolMs = 15000 + jitter;
        this.coolingUntil.set(failingKey, now + totalCoolMs);
        window.AppLogger?.log('warn', 'KeyPool', `Key ${maskKey(failingKey)} hit 429 rate-limit. Cooling for ${(totalCoolMs / 1000).toFixed(1)}s.`);
        this.inUse.delete(failingKey);
      }

      const total = keys.length;

      for (let wait = 0; wait < 20; wait++) {
        const currentTime = Date.now();
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
        await new Promise(r => setTimeout(r, 1000));
      }

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

  /**
   * Universal Non-Intrusive UI Interaction Interceptor
   * Listens globally for clicks, toggles, and range sliders and emits [UI_ACTION] telemetry
   */
  if (typeof document !== 'undefined') {
    const getElementLabel = (el) => {
      if (!el) return '';
      if (el.getAttribute('data-telemetry')) return el.getAttribute('data-telemetry');
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
      if (el.getAttribute('title')) return el.getAttribute('title');

      const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt && txt.length <= 40) return txt;

      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        if (el.placeholder) return `Input (${el.placeholder})`;
        if (el.name) return `Input [${el.name}]`;
        if (el.id) return `Input #${el.id}`;
      }
      return el.id ? `#${el.id}` : (el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase());
    };

    const getContextContainer = (el) => {
      if (!el) return '';
      const card = el.closest('.card, .modal-box, dialog, .header, .top-hud, .reader-hud, [data-section]');
      if (!card) return '';
      const header = card.querySelector('.card-title, .modal-hd, .hud-title, h1, h2, h3, h4');
      if (header) {
        return (header.innerText || header.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      }
      return card.className ? card.className.split(' ')[0] : '';
    };

    // Global click delegation
    document.addEventListener('click', (e) => {
      try {
        const isDeep = localStorage.getItem('telemetry_verbose') !== 'false';
        if (!isDeep) return;

        const target = e.target.closest('button, a, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], .btn, .mini-btn, .icon-btn, .pill-btn, .tab-btn, [role="button"]');
        if (!target || target.hasAttribute('data-telemetry-ignore')) return;

        const label = getElementLabel(target);
        const ctx = getContextContainer(target);

        let detail = null;
        if (target.type === 'checkbox' || target.type === 'radio') {
          detail = { checked: target.checked };
        }

        window.sendTelemetry('UI_ACTION', `Tapped: "${label}"${ctx ? ` in [${ctx}]` : ''}`, detail);
      } catch (err) {}
    }, true);

    // Global change delegation (select, range slider, toggle)
    document.addEventListener('change', (e) => {
      try {
        const isDeep = localStorage.getItem('telemetry_verbose') !== 'false';
        if (!isDeep) return;

        const target = e.target;
        if (!target || target.hasAttribute('data-telemetry-ignore')) return;

        if (target.tagName === 'SELECT') {
          const selText = target.options[target.selectedIndex]?.text || target.value;
          const ctx = getContextContainer(target);
          window.sendTelemetry('UI_ACTION', `Selected option "${selText}" in dropdown${ctx ? ` [${ctx}]` : ''}`);
        } else if (target.type === 'range') {
          const ctx = getContextContainer(target);
          window.sendTelemetry('UI_ACTION', `Adjusted slider to ${target.value}${ctx ? ` [${ctx}]` : ''}`);
        }
      } catch (err) {}
    }, true);
  }

  window.maskKey = maskKey;
  window.KeyPool = KeyPool;
})(typeof window !== 'undefined' ? window : this);
