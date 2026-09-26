/**
 * Gemini EPUB Translator - Full App Backup, Restore & Cloud Sync Engine
 * Module: backup_engine.js
 * 
 * Provides:
 * - Full JSON backup generation (LocalStorage, IndexedDB, Multi-key profiles, Telemetry)
 * - Safe JSON file reading and clipboard pasting
 * - WebDAV cloud synchronization (PROPFIND, MKCOL, PUT, GET)
 * - Google Drive cloud synchronization (Mihon/Komikku standard)
 * - Comprehensive data restoration (Merging, multi-format key parsing, IndexedDB update)
 */

(function(window) {
  'use strict';

  const BackupEngine = {
    /**
     * Reads a File or Blob as UTF-8 text across browsers and mobile environments
     */
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided.'));
        if (typeof file.text === 'function') {
          file.text().then(resolve).catch(() => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          });
        } else {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        }
      });
    },

    /**
     * Safely parses JSON text with friendly error messages
     */
    parseBackup(text) {
      if (!text || typeof text !== 'string') throw new Error('Backup content is empty.');
      try {
        return JSON.parse(text.trim());
      } catch (err) {
        throw new Error('Invalid JSON format: ' + err.message);
      }
    },

    /**
     * Generates the complete backup payload object
     */
    async generatePayload(options = {}) {
      const {
        shouldIncludeKeys = false,
        version = '8.17.88',
        state = {}
      } = options;

      // 1. Saved glossaries
      const currentSavedGlossaries = (state.savedGlossaries && state.savedGlossaries.length > 0)
        ? state.savedGlossaries
        : (() => {
            try { return JSON.parse(localStorage.getItem('savedGlossaries') || '[]'); } catch (e) { return []; }
          })();

      // 2. Terminology & custom instructions
      const currentTerminology = (state.terminology && state.terminology.trim())
        ? state.terminology
        : (localStorage.getItem('terminology') || '');

      const currentInstructions = (state.customInstructions && state.customInstructions.trim())
        ? state.customInstructions
        : (localStorage.getItem('customInstructions') || '');

      // 3. Translation History (IndexedDB + fallback)
      let fullHistory = [];
      if (typeof window.dbGetAll === 'function') {
        try { fullHistory = await window.dbGetAll('history'); } catch (e) {}
      }
      if (!fullHistory || fullHistory.length === 0) {
        fullHistory = (state.history && state.history.length > 0) ? state.history : (() => {
          try { return JSON.parse(localStorage.getItem('translationHistory') || '[]'); } catch (e) { return []; }
        })();
      }

      // 4. Novel Library
      let novelLibrary = [];
      if (window.GeminiNovelDB && typeof window.GeminiNovelDB.getAllNovels === 'function') {
        try {
          novelLibrary = await window.GeminiNovelDB.getAllNovels();
        } catch (e) {
          console.warn('Backup novel library fetch error:', e);
        }
      }

      // 5. Web import metadata
      const webImportMeta = (() => {
        try {
          return JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || localStorage.getItem('gemini_web_import_history') || '[]');
        } catch (e) {
          return [];
        }
      })();

      // 6. Recent telemetry
      const recentTelemetry = (window.AppLogger && Array.isArray(window.AppLogger.logs))
        ? window.AppLogger.logs.slice(-300)
        : [];

      // 7. Base backup object
      const backup = {
        version: version || state.VERSION || '8.17.88',
        timestamp: new Date().toISOString(),
        includesApiKeys: shouldIncludeKeys,
        provider: state.provider || localStorage.getItem('translationProvider') || 'gemini',
        geminiModel: state.geminiModel || localStorage.getItem('geminiModel') || 'gemini-3.7-flash',
        deepseekModel: state.deepseekModel || localStorage.getItem('deepseekModel') || 'deepseek-chat',
        openaiModel: state.openaiModel || localStorage.getItem('openaiModel') || 'gpt-4o-mini',
        claudeModel: state.claudeModel || localStorage.getItem('claudeModel') || 'claude-3-5-sonnet-20241022',
        concurrency: state.concurrency || parseInt(localStorage.getItem('concurrency')) || 3,
        contextAware: state.contextAware !== undefined ? state.contextAware : (localStorage.getItem('contextAware') !== 'false'),
        chunkSizePreset: state.chunkSizePreset || localStorage.getItem('chunkSizePreset') || 'turbo',
        enableThinking: state.enableThinking !== undefined ? state.enableThinking : (localStorage.getItem('enableThinking') === 'true'),
        strictModel: state.strictModel !== undefined ? state.strictModel : (localStorage.getItem('strictModel') !== 'false'),
        enableStreaming: state.enableStreaming !== undefined ? state.enableStreaming : (localStorage.getItem('enableStreaming') !== 'false'),
        enableGlossary: state.enableGlossary !== undefined ? state.enableGlossary : (localStorage.getItem('enableGlossary') === 'true'),
        customModel: state.customModel || localStorage.getItem('customModel') || '',
        useCustomModel: state.useCustomModel !== undefined ? state.useCustomModel : (localStorage.getItem('useCustomModel') === 'true'),
        customDeepseekModel: state.customDeepseekModel || localStorage.getItem('customDeepseekModel') || '',
        useCustomDeepseekModel: state.useCustomDeepseekModel !== undefined ? state.useCustomDeepseekModel : (localStorage.getItem('useCustomDeepseekModel') === 'true'),
        savedGlossaries: currentSavedGlossaries,
        defaultGlossaryName: state.defaultGlossaryName || localStorage.getItem('defaultGlossaryName') || null,
        terminology: currentTerminology,
        smartGlossary: state.smartGlossary !== undefined ? state.smartGlossary : (localStorage.getItem('smartGlossary') !== 'false'),
        customInstructions: currentInstructions,
        epubDropCaps: state.epubDropCaps !== undefined ? state.epubDropCaps : (localStorage.getItem('epubDropCaps') !== 'false'),
        epubSmartQuotes: state.epubSmartQuotes !== undefined ? state.epubSmartQuotes : (localStorage.getItem('epubSmartQuotes') !== 'false'),
        epubCleanWebArtifacts: state.epubCleanWebArtifacts !== undefined ? state.epubCleanWebArtifacts : (localStorage.getItem('epubCleanWebArtifacts') !== 'false'),
        epubFontTheme: state.epubFontTheme || localStorage.getItem('epubFontTheme') || 'literata',
        epubJustifyText: state.epubJustifyText !== undefined ? state.epubJustifyText : (localStorage.getItem('epubJustifyText') !== 'false'),
        epubIncludeImages: state.epubIncludeImages !== undefined ? state.epubIncludeImages : (localStorage.getItem('epubIncludeImages') !== 'false'),
        scrapeImages: state.scrapeImages !== undefined ? state.scrapeImages : (localStorage.getItem('scrapeImages') !== 'false'),
        readerTheme: state.readerTheme || localStorage.getItem('readerTheme') || 'sepia',
        readerFont: state.readerFont || localStorage.getItem('readerFont') || 'serif',
        readerFontSize: state.readerFontSize || parseInt(localStorage.getItem('readerFontSize')) || 18,
        readerJustify: localStorage.getItem('readerJustify') !== 'false',
        translationHistory: fullHistory,
        exportHistory: JSON.parse(localStorage.getItem('exportHistory') || '[]'),
        novelLibrary,
        webImportHistory: webImportMeta,
        telemetryLogs: recentTelemetry
      };

      // 8. Optional API keys export
      if (shouldIncludeKeys) {
        const exportKeys = {};
        const apiKeysByProvider = state.apiKeysByProvider || (() => {
          try { return JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}'); } catch(e) { return {}; }
        })();

        ['gemini', 'deepseek', 'openai', 'claude', 'deepl', 'libre'].forEach(prov => {
          const legacyKey = localStorage.getItem(`${prov}ApiKey`) || (prov === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
          const profiles = (apiKeysByProvider && apiKeysByProvider[prov]) ? [...apiKeysByProvider[prov]] : [];
          if (profiles.length > 0) {
            exportKeys[prov] = profiles.map(p => {
              if (!p.key && legacyKey) return { ...p, key: legacyKey };
              return p;
            });
          } else if (legacyKey) {
            const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
            exportKeys[prov] = [{ id: `${prov}-init`, name: `Primary ${provNames[prov] || prov} Key`, key: legacyKey }];
          } else {
            exportKeys[prov] = [];
          }
        });

        backup.apiKeysByProvider = exportKeys;
        backup.activeKeyIds = state.activeKeyIds || (() => {
          try { return JSON.parse(localStorage.getItem('activeKeyIds') || '{}'); } catch(e) { return {}; }
        })();
        backup.geminiApiKey = exportKeys.gemini?.[0]?.key || localStorage.getItem('geminiApiKey') || localStorage.getItem('apiKey') || '';
        backup.deepseekApiKey = exportKeys.deepseek?.[0]?.key || localStorage.getItem('deepseekApiKey') || '';
        backup.openaiApiKey = exportKeys.openai?.[0]?.key || localStorage.getItem('openaiApiKey') || '';
        backup.claudeApiKey = exportKeys.claude?.[0]?.key || localStorage.getItem('claudeApiKey') || '';
        backup.deeplApiKey = exportKeys.deepl?.[0]?.key || localStorage.getItem('deeplApiKey') || '';
        backup.libreUrl = state.libreUrl || localStorage.getItem('libreUrl') || '';
      }

      return { backup, fullHistory, novelLibrary };
    },

    /**
     * Downloads full backup payload directly to client storage
     */
    async exportBackup(options = {}) {
      const { shouldIncludeKeys = false, version = '8.17.88', state = {} } = options;
      const { backup, fullHistory, novelLibrary } = await this.generatePayload({ shouldIncludeKeys, version, state });
      const jsonStr = JSON.stringify(backup, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `gemini_translator_backup_${shouldIncludeKeys ? 'with_keys_' : ''}${dateStr}.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });

      if (typeof window.saveUniversalBlob === 'function') {
        await window.saveUniversalBlob(blob, fileName, 'application/json');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      return {
        fileName,
        novelCount: novelLibrary.length,
        historyCount: fullHistory.length,
        hasKeys: shouldIncludeKeys
      };
    },

    /**
     * Tests WebDAV connectivity
     */
    async testWebDav({ url, user, pass }) {
      if (!url || !url.trim()) throw new Error('Please enter a WebDAV URL.');
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const headers = {};
      if (user || pass) {
        headers['Authorization'] = 'Basic ' + btoa(`${user}:${pass}`);
      }

      let res;
      if (window.NativeBridge?.webDavRequest) {
        res = await window.NativeBridge.webDavRequest({
          url: cleanUrl,
          method: 'PROPFIND',
          headers: { ...headers, 'Depth': '0' }
        });
      } else {
        const fetchRes = await fetch(cleanUrl, { method: 'GET', headers });
        res = { status: fetchRes.status };
      }

      return res;
    },

    /**
     * Uploads backup to WebDAV folder
     */
    async uploadToWebDav({ url, path = 'GeminiTranslator', user, pass, payload, version = '8.17.88' }) {
      if (!url || !url.trim()) throw new Error('Please configure WebDAV URL.');
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const targetFolder = (path || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
      const fullBackupUrl = `${cleanUrl}/${targetFolder}/backup_full.json`;
      const metaUrl = `${cleanUrl}/${targetFolder}/metadata.json`;

      const headers = { 'Content-Type': 'application/json' };
      if (user || pass) {
        headers['Authorization'] = 'Basic ' + btoa(`${user}:${pass}`);
      }

      const backupJson = JSON.stringify(payload, null, 2);
      const metaJson = JSON.stringify({
        version,
        lastSync: new Date().toISOString(),
        device: navigator.userAgent.includes('Android') ? 'Android' : 'Desktop/Web',
        novelCount: (payload.novelLibrary || []).length,
        glossaryCount: (payload.savedGlossaries || []).length
      }, null, 2);

      // 1. Try MKCOL to ensure directory exists (safe to fail if exists)
      try {
        if (window.NativeBridge?.webDavRequest) {
          await window.NativeBridge.webDavRequest({
            url: `${cleanUrl}/${targetFolder}`,
            method: 'MKCOL',
            headers
          });
        } else {
          await fetch(`${cleanUrl}/${targetFolder}`, { method: 'MKCOL', headers }).catch(() => {});
        }
      } catch (e) {}

      // 2. PUT backup payload
      let uploadRes;
      if (window.NativeBridge?.webDavRequest) {
        uploadRes = await window.NativeBridge.webDavRequest({
          url: fullBackupUrl,
          method: 'PUT',
          headers,
          body: backupJson
        });
      } else {
        const r = await fetch(fullBackupUrl, { method: 'PUT', headers, body: backupJson });
        uploadRes = { status: r.status, data: r.ok ? 'OK' : await r.text().catch(() => '') };
      }

      // 3. PUT metadata
      try {
        if (window.NativeBridge?.webDavRequest) {
          await window.NativeBridge.webDavRequest({
            url: metaUrl,
            method: 'PUT',
            headers,
            body: metaJson
          });
        } else {
          await fetch(metaUrl, { method: 'PUT', headers, body: metaJson }).catch(() => {});
        }
      } catch (e) {}

      if (uploadRes.status >= 200 && uploadRes.status < 300) {
        return { success: true, targetFolder, status: uploadRes.status };
      }
      throw new Error(`HTTP ${uploadRes.status}: ${uploadRes.data?.slice(0, 100) || 'Upload failed'}`);
    },

    /**
     * Downloads backup from WebDAV folder
     */
    async downloadFromWebDav({ url, path = 'GeminiTranslator', user, pass }) {
      if (!url || !url.trim()) throw new Error('Please configure WebDAV URL.');
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const targetFolder = (path || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
      const fullBackupUrl = `${cleanUrl}/${targetFolder}/backup_full.json`;

      const headers = {};
      if (user || pass) {
        headers['Authorization'] = 'Basic ' + btoa(`${user}:${pass}`);
      }

      let resData = null;
      let status = 0;

      if (window.NativeBridge?.webDavRequest) {
        const res = await window.NativeBridge.webDavRequest({
          url: fullBackupUrl,
          method: 'GET',
          headers
        });
        status = res.status;
        resData = res.data;
      } else {
        const res = await fetch(fullBackupUrl, { method: 'GET', headers });
        status = res.status;
        if (res.ok) resData = await res.text();
      }

      if (status !== 200 || !resData) {
        throw new Error(`HTTP ${status}: Backup file not found on WebDAV.`);
      }

      return JSON.parse(resData);
    },

    /**
     * Tests Google Drive connection via GoogleDriveSync module
     */
    async testGoogleDrive() {
      if (!window.GoogleDriveSync?.isConnected()) {
        throw new Error('Google Drive is not connected. Click "Sign in with Google" first.');
      }
      return await window.GoogleDriveSync.testConnection();
    },

    /**
     * Uploads backup to Google Drive AppData folder
     */
    async uploadToGoogleDrive(payload) {
      if (!window.GoogleDriveSync?.isConnected()) {
        throw new Error('Please connect Google Drive in Settings first.');
      }
      return await window.GoogleDriveSync.uploadBackup(payload);
    },

    /**
     * Downloads backup from Google Drive AppData folder
     */
    async downloadFromGoogleDrive() {
      if (!window.GoogleDriveSync?.isConnected()) {
        throw new Error('Please connect Google Drive in Settings first.');
      }
      return await window.GoogleDriveSync.downloadBackup();
    },

    /**
     * Applies restored data to LocalStorage, IndexedDB, and React state setters
     */
    async applyRestoredData(data, setters = {}) {
      if (!data || typeof data !== 'object') throw new Error('Invalid backup data format.');

      // 1. Array format (Glossary export)
      if (Array.isArray(data)) {
        let currentGlossaries = [];
        try { currentGlossaries = JSON.parse(localStorage.getItem('savedGlossaries') || '[]'); } catch (e) {}
        const merged = [...currentGlossaries];
        data.forEach(g => {
          if (g.name && g.content && !merged.find(x => x.name === g.name)) merged.push(g);
        });
        if (setters.setSavedGlossaries) setters.setSavedGlossaries(merged);
        localStorage.setItem('savedGlossaries', JSON.stringify(merged));
        if (merged.length > 0 && !localStorage.getItem('terminology')) {
          if (setters.setTerminology) setters.setTerminology(merged[0].content || '');
          localStorage.setItem('terminology', merged[0].content || '');
          if (setters.setActiveGlossaryId) setters.setActiveGlossaryId(merged[0].name);
        }
        return { isGlossaryOnly: true, count: data.length };
      }

      // 2. Full Backup format
      let keyCount = 0;
      let glossaryCount = 0;
      let novelCount = 0;
      const restoredKeys = {};

      if (data.savedGlossaries && Array.isArray(data.savedGlossaries)) {
        if (setters.setSavedGlossaries) setters.setSavedGlossaries(data.savedGlossaries);
        try { localStorage.setItem('savedGlossaries', JSON.stringify(data.savedGlossaries)); } catch (e) {}
        if (typeof window.dbPut === 'function') {
          data.savedGlossaries.forEach(g => window.dbPut('glossaries', g));
        }
        glossaryCount = data.savedGlossaries.length;
      }

      if (data.translationHistory && Array.isArray(data.translationHistory)) {
        if (setters.setHistory) setters.setHistory(data.translationHistory);
        try { localStorage.setItem('translationHistory', JSON.stringify(data.translationHistory.slice(0, 10))); } catch (e) {}
        if (typeof window.dbPut === 'function') {
          data.translationHistory.forEach(h => window.dbPut('history', h));
        }
      }

      if (data.exportHistory && Array.isArray(data.exportHistory)) {
        localStorage.setItem('exportHistory', JSON.stringify(data.exportHistory));
      }

      if (data.terminology !== undefined && data.terminology !== null) {
        if (setters.setTerminology) setters.setTerminology(data.terminology);
        localStorage.setItem('terminology', data.terminology);
      } else if (data.savedGlossaries && data.savedGlossaries.length > 0) {
        if (setters.setTerminology) setters.setTerminology(data.savedGlossaries[0].content || '');
        localStorage.setItem('terminology', data.savedGlossaries[0].content || '');
        if (setters.setActiveGlossaryId) setters.setActiveGlossaryId(data.savedGlossaries[0].name);
      }

      if (data.customInstructions !== undefined && data.customInstructions !== null) {
        if (setters.setCustomInstructions) setters.setCustomInstructions(data.customInstructions);
        localStorage.setItem('customInstructions', data.customInstructions);
      } else if (data.savedGlossaries && data.savedGlossaries.length > 0 && data.savedGlossaries[0].instructions) {
        if (setters.setCustomInstructions) setters.setCustomInstructions(data.savedGlossaries[0].instructions);
        localStorage.setItem('customInstructions', data.savedGlossaries[0].instructions);
      }

      if (data.defaultGlossaryName) {
        if (setters.setDefaultGlossaryName) setters.setDefaultGlossaryName(data.defaultGlossaryName);
        localStorage.setItem('defaultGlossaryName', data.defaultGlossaryName);
      }

      if (data.smartGlossary !== undefined) {
        if (setters.setSmartGlossary) setters.setSmartGlossary(data.smartGlossary);
        localStorage.setItem('smartGlossary', data.smartGlossary);
      }

      if (data.enableGlossary !== undefined) {
        if (setters.setEnableGlossary) setters.setEnableGlossary(!!data.enableGlossary);
        localStorage.setItem('enableGlossary', String(data.enableGlossary));
      }

      if (data.provider) {
        if (setters.setProvider) setters.setProvider(data.provider);
        localStorage.setItem('translationProvider', data.provider);
      }

      if (data.geminiModel) {
        if (setters.setGeminiModel) setters.setGeminiModel(data.geminiModel);
        localStorage.setItem('geminiModel', data.geminiModel);
      }

      if (data.deepseekModel) {
        if (setters.setDeepseekModel) setters.setDeepseekModel(data.deepseekModel);
        localStorage.setItem('deepseekModel', data.deepseekModel);
      }

      if (data.openaiModel) {
        if (setters.setOpenaiModel) setters.setOpenaiModel(data.openaiModel);
        localStorage.setItem('openaiModel', data.openaiModel);
      }

      if (data.claudeModel) {
        if (setters.setClaudeModel) setters.setClaudeModel(data.claudeModel);
        localStorage.setItem('claudeModel', data.claudeModel);
      }

      if (data.concurrency) {
        if (setters.setConcurrency) setters.setConcurrency(data.concurrency);
        localStorage.setItem('concurrency', String(data.concurrency));
      }

      if (data.contextAware !== undefined) {
        if (setters.setContextAware) setters.setContextAware(data.contextAware);
        localStorage.setItem('contextAware', data.contextAware);
      }

      if (data.chunkSizePreset) {
        if (setters.setChunkSizePreset) setters.setChunkSizePreset(data.chunkSizePreset);
        localStorage.setItem('chunkSizePreset', data.chunkSizePreset);
      }

      if (data.enableThinking !== undefined) {
        if (setters.setEnableThinking) setters.setEnableThinking(!!data.enableThinking);
        localStorage.setItem('enableThinking', String(data.enableThinking));
      }

      if (data.strictModel !== undefined) {
        if (setters.setStrictModel) setters.setStrictModel(!!data.strictModel);
        localStorage.setItem('strictModel', String(data.strictModel));
      }

      if (data.enableStreaming !== undefined) {
        if (setters.setEnableStreaming) setters.setEnableStreaming(!!data.enableStreaming);
        localStorage.setItem('enableStreaming', String(data.enableStreaming));
      }

      if (data.customModel !== undefined) {
        if (setters.setCustomModel) setters.setCustomModel(data.customModel);
        localStorage.setItem('customModel', data.customModel);
      }

      if (data.useCustomModel !== undefined) {
        if (setters.setUseCustomModel) setters.setUseCustomModel(!!data.useCustomModel);
        localStorage.setItem('useCustomModel', String(data.useCustomModel));
      }

      if (data.customDeepseekModel !== undefined) {
        if (setters.setCustomDeepseekModel) setters.setCustomDeepseekModel(data.customDeepseekModel);
        localStorage.setItem('customDeepseekModel', data.customDeepseekModel);
      }

      if (data.useCustomDeepseekModel !== undefined) {
        if (setters.setUseCustomDeepseekModel) setters.setUseCustomDeepseekModel(!!data.useCustomDeepseekModel);
        localStorage.setItem('useCustomDeepseekModel', String(data.useCustomDeepseekModel));
      }

      // EPUB Styling & Typography preferences
      if (data.epubDropCaps !== undefined) {
        if (setters.setEpubDropCaps) setters.setEpubDropCaps(!!data.epubDropCaps);
        localStorage.setItem('epubDropCaps', String(data.epubDropCaps));
      }
      if (data.epubSmartQuotes !== undefined) {
        if (setters.setEpubSmartQuotes) setters.setEpubSmartQuotes(!!data.epubSmartQuotes);
        localStorage.setItem('epubSmartQuotes', String(data.epubSmartQuotes));
      }
      if (data.epubCleanWebArtifacts !== undefined) {
        if (setters.setEpubCleanWebArtifacts) setters.setEpubCleanWebArtifacts(!!data.epubCleanWebArtifacts);
        localStorage.setItem('epubCleanWebArtifacts', String(data.epubCleanWebArtifacts));
      }
      if (data.epubFontTheme) {
        if (setters.setEpubFontTheme) setters.setEpubFontTheme(data.epubFontTheme);
        localStorage.setItem('epubFontTheme', data.epubFontTheme);
      }
      if (data.epubJustifyText !== undefined) {
        if (setters.setEpubJustifyText) setters.setEpubJustifyText(!!data.epubJustifyText);
        localStorage.setItem('epubJustifyText', String(data.epubJustifyText));
      }
      if (data.epubIncludeImages !== undefined) {
        if (setters.setEpubIncludeImages) setters.setEpubIncludeImages(!!data.epubIncludeImages);
        localStorage.setItem('epubIncludeImages', String(data.epubIncludeImages));
      }
      if (data.scrapeImages !== undefined) {
        if (setters.setScrapeImages) setters.setScrapeImages(!!data.scrapeImages);
        localStorage.setItem('scrapeImages', String(data.scrapeImages));
      }

      // Reader Preferences
      if (data.readerTheme) {
        if (setters.setReaderTheme) setters.setReaderTheme(data.readerTheme);
        localStorage.setItem('readerTheme', data.readerTheme);
      }
      if (data.readerFont) {
        if (setters.setReaderFont) setters.setReaderFont(data.readerFont);
        localStorage.setItem('readerFont', data.readerFont);
      }
      if (data.readerFontSize) {
        if (setters.setReaderFontSize) setters.setReaderFontSize(data.readerFontSize);
        localStorage.setItem('readerFontSize', String(data.readerFontSize));
      }
      if (data.readerJustify !== undefined) {
        localStorage.setItem('readerJustify', String(data.readerJustify));
      }

      // Novel Library Restore (Full chapters + Metadata)
      if (data.novelLibrary && Array.isArray(data.novelLibrary) && data.novelLibrary.length > 0) {
        if (window.GeminiNovelDB) {
          for (const novel of data.novelLibrary) {
            try {
              if (!novel.id) novel.id = 'novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
              await window.GeminiNovelDB.saveNovel(novel);
            } catch (e) {
              console.warn('Restore novel error:', e);
            }
          }
        }
        novelCount = data.novelLibrary.length;
      }

      if (data.webImportHistory && Array.isArray(data.webImportHistory)) {
        if (setters.setWebImportHistory) setters.setWebImportHistory(data.webImportHistory);
        try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(data.webImportHistory)); } catch (e) {}
        if (novelCount === 0) novelCount = data.webImportHistory.length;
      } else if (data.novelLibrary && Array.isArray(data.novelLibrary) && data.novelLibrary.length > 0) {
        const synthesizedMeta = data.novelLibrary.map(n => ({
          id: n.id,
          title: n.title || 'Untitled Novel',
          author: n.author || 'Author',
          summary: (n.summary || '').substring(0, 300),
          cover: n.cover || '',
          tags: n.tags || [],
          chapterCount: n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0),
          totalChapterCount: n.totalChapterCount || (n.chapterList ? n.chapterList.length : (n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0))),
          volumeCount: n.volumeCount || 0,
          wordCount: n.wordCount || 0,
          timestamp: n.timestamp || new Date().toISOString(),
          isEpub: !!n.isEpub,
          sourceUrl: n.sourceUrl || '',
          folderTreeUri: n.folderTreeUri || '',
          folderPath: n.folderPath || ''
        }));
        if (setters.setWebImportHistory) setters.setWebImportHistory(synthesizedMeta);
        try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(synthesizedMeta)); } catch (e) {}
      }

      // Telemetry Diagnostics Restore
      if (data.telemetryLogs && Array.isArray(data.telemetryLogs) && window.AppLogger) {
        window.AppLogger.logs = [...data.telemetryLogs];
        window.AppLogger.listeners.forEach(fn => { try { fn([...window.AppLogger.logs]); } catch(e) {} });
      }

      // Restore API Key Profiles (Robust Multi-Format Parsing)
      if (data.apiKeysByProvider && typeof data.apiKeysByProvider === 'object') {
        ['gemini', 'deepseek', 'openai', 'claude', 'deepl', 'libre'].forEach(prov => {
          const list = data.apiKeysByProvider[prov];
          if (Array.isArray(list) && list.length > 0) {
            restoredKeys[prov] = list.filter(k => k && (k.key || typeof k === 'string')).map((k, idx) => {
              if (typeof k === 'string') return { id: `${prov}-${Date.now()}-${idx}`, name: `${prov.toUpperCase()} Key ${idx + 1}`, key: k.trim() };
              return k;
            });
            restoredKeys[prov].forEach(k => {
              if (k.key && k.key.trim()) keyCount++;
            });
            if (restoredKeys[prov][0]?.key) {
              localStorage.setItem(`${prov}ApiKey`, restoredKeys[prov][0].key);
              if (prov === 'gemini') localStorage.setItem('apiKey', restoredKeys[prov][0].key);
            }
          }
        });
      }

      // Support Legacy Single Keys in backup
      const legacyMappings = {
        gemini: data.geminiApiKey || data.apiKey || '',
        deepseek: data.deepseekApiKey || '',
        openai: data.openaiApiKey || '',
        claude: data.claudeApiKey || '',
        deepl: data.deeplApiKey || ''
      };

      Object.entries(legacyMappings).forEach(([prov, lKey]) => {
        if (lKey && lKey.trim()) {
          localStorage.setItem(`${prov}ApiKey`, lKey);
          if (prov === 'gemini') localStorage.setItem('apiKey', lKey);
          if (!restoredKeys[prov] || restoredKeys[prov].length === 0) {
            const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
            restoredKeys[prov] = [{ id: `${prov}-init`, name: `Primary ${provNames[prov] || prov} Key`, key: lKey }];
            keyCount++;
          } else if (!restoredKeys[prov][0].key) {
            restoredKeys[prov][0].key = lKey;
            keyCount++;
          }
        }
      });

      if (Object.keys(restoredKeys).length > 0) {
        if (setters.setApiKeysByProvider) {
          setters.setApiKeysByProvider(prev => {
            const updated = { ...prev, ...restoredKeys };
            localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
            return updated;
          });
        } else {
          try {
            const cur = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
            localStorage.setItem('apiKeysByProvider', JSON.stringify({ ...cur, ...restoredKeys }));
          } catch(e) {}
        }
      }

      if (data.activeKeyIds && typeof data.activeKeyIds === 'object') {
        if (setters.setActiveKeyIds) setters.setActiveKeyIds(data.activeKeyIds);
        localStorage.setItem('activeKeyIds', JSON.stringify(data.activeKeyIds));
      }

      if (data.libreUrl) {
        if (setters.setLibreUrl) setters.setLibreUrl(data.libreUrl);
        localStorage.setItem('libreUrl', data.libreUrl);
      }

      const summaryParts = [];
      if (keyCount > 0) summaryParts.push(`${keyCount} API key(s)`);
      if (glossaryCount > 0) summaryParts.push(`${glossaryCount} glossary profile(s)`);
      else if (data.terminology && data.terminology.trim()) summaryParts.push('active glossary');
      if (data.translationHistory && data.translationHistory.length > 0) summaryParts.push(`${data.translationHistory.length} book session(s)`);
      if (novelCount > 0) summaryParts.push(`${novelCount} library novel(s)`);
      summaryParts.push('all settings & typography');

      return {
        keyCount,
        glossaryCount,
        novelCount,
        historyCount: data.translationHistory ? data.translationHistory.length : 0,
        summary: summaryParts.join(', ')
      };
    },

    /**
     * High-level WebDAV Backup coordinator
     */
    async performWebDavBackup({ webdavUrl, webdavPath, webdavUser, webdavPass, version = '8.17.88', state = {}, callbacks = {} } = {}) {
      if (!webdavUrl || !webdavUrl.trim()) {
        const err = new Error('Please configure WebDAV URL in Settings first');
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      }
      const { backup } = await this.generatePayload({ shouldIncludeKeys: true, version, state });
      const targetFolder = (webdavPath || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
      await this.uploadToWebDav({
        url: webdavUrl,
        path: targetFolder,
        user: webdavUser,
        pass: webdavPass,
        payload: backup,
        version
      });
      const timeStr = new Date().toLocaleString();
      try {
        window.NativeBridge?.showCompletionNotification?.('Cloud Backup Complete! ☁️', `Backup saved to WebDAV /${targetFolder}/.`);
      } catch (e) {}
      if (callbacks.onSuccess) callbacks.onSuccess(timeStr, targetFolder);
      return { timeStr, targetFolder };
    },

    /**
     * High-level WebDAV Restore coordinator
     */
    async performWebDavRestore({ webdavUrl, webdavPath, webdavUser, webdavPass, setters = {}, callbacks = {} } = {}) {
      if (!webdavUrl || !webdavUrl.trim()) {
        const err = new Error('Please configure WebDAV URL in Settings first');
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      }
      const targetFolder = (webdavPath || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
      const data = await this.downloadFromWebDav({
        url: webdavUrl,
        path: targetFolder,
        user: webdavUser,
        pass: webdavPass
      });
      const countNovels = (data.novelLibrary || []).length;
      const countGloss = (data.savedGlossaries || []).length;

      const confirmMsg = `Found WebDAV backup (${countNovels} novels, ${countGloss} glossaries). Restore now? This will safely merge and update your data.`;
      const shouldProceed = callbacks.confirm
        ? await callbacks.confirm(confirmMsg, countNovels, countGloss)
        : (typeof confirm === 'function' ? confirm(confirmMsg) : true);

      if (!shouldProceed) return { cancelled: true };

      const restoreSummary = await this.applyRestoredData(data, setters);
      try {
        window.NativeBridge?.showCompletionNotification?.('Cloud Restore Complete! 📥', `Restored ${countNovels} novels and ${countGloss} glossaries from WebDAV.`);
      } catch (e) {}
      if (callbacks.onSuccess) callbacks.onSuccess(countNovels, countGloss, restoreSummary);
      return { success: true, countNovels, countGloss, restoreSummary };
    },

    /**
     * High-level Google Drive Connection test
     */
    async testGoogleDriveConnection(callbacks = {}) {
      if (!window.GoogleDriveSync?.isConnected()) {
        const err = new Error('Google Drive is not connected. Click "Sign in with Google" first.');
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      }
      const res = await this.testGoogleDrive();
      if (res && res.success && res.profile) {
        if (callbacks.onSuccess) callbacks.onSuccess(res.profile);
        return res;
      }
      const err = new Error(res?.error || 'Google Drive connection failed.');
      if (callbacks.onError) callbacks.onError(err);
      throw err;
    },

    /**
     * High-level Google Drive Backup coordinator
     */
    async performGoogleDriveBackup({ includeKeys = false, version = '8.17.88', state = {}, callbacks = {} } = {}) {
      if (!window.GoogleDriveSync?.isConnected()) {
        const err = new Error('Please connect Google Drive in Settings first');
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      }
      const { backup, fullHistory, novelLibrary } = await this.generatePayload({
        shouldIncludeKeys: includeKeys,
        version,
        state
      });
      const res = await this.uploadToGoogleDrive(backup);
      if (res && res.success) {
        const timeStr = new Date().toLocaleString();
        if (callbacks.onSuccess) callbacks.onSuccess(timeStr, novelLibrary.length, fullHistory.length);
        return { success: true, timeStr, novelCount: novelLibrary.length, historyCount: fullHistory.length };
      }
      throw new Error(res?.error || 'Google Drive backup failed.');
    },

    /**
     * High-level Google Drive Restore coordinator
     */
    async performGoogleDriveRestore({ setters = {}, callbacks = {} } = {}) {
      if (!window.GoogleDriveSync?.isConnected()) {
        const err = new Error('Please connect Google Drive in Settings first');
        if (callbacks.onError) callbacks.onError(err);
        throw err;
      }
      if (callbacks.onStart) callbacks.onStart();
      const { data, meta } = await this.downloadFromGoogleDrive();
      const countNovels = (data.novelLibrary || data.novels || []).length;
      const countGloss = (data.savedGlossaries || data.glossaries || []).length;
      const backupDate = meta?.modifiedTime ? new Date(meta.modifiedTime).toLocaleString() : 'recent';

      const confirmMsg = `Found Google Drive backup (${backupDate}) with ${countNovels} novels and ${countGloss} glossaries. Restore now? This will safely merge with your local library.`;
      const shouldProceed = callbacks.confirm
        ? await callbacks.confirm(confirmMsg, countNovels, countGloss, backupDate)
        : (typeof confirm === 'function' ? confirm(confirmMsg) : true);

      if (!shouldProceed) return { cancelled: true };

      const restoreSummary = await this.applyRestoredData(data, setters);
      try {
        window.NativeBridge?.showCompletionNotification?.('Google Drive Restore Complete! 📥', `Restored ${countNovels} novels and ${countGloss} glossaries from Google Drive.`);
      } catch (e) {}
      if (callbacks.onSuccess) callbacks.onSuccess(countNovels, countGloss, restoreSummary);
      return { success: true, countNovels, countGloss, restoreSummary };
    },

    /**
     * High-level Google Drive OAuth connection flow
     */
    async connectGoogleDrive(callbacks = {}) {
      if (!window.GoogleDriveSync?.getClientId()) {
        const err = new Error('MISSING_CLIENT_ID');
        if (callbacks.onMissingClientId) callbacks.onMissingClientId();
        throw err;
      }
      if (callbacks.onStart) callbacks.onStart();
      await window.GoogleDriveSync.launchOAuthFlow();
      const testRes = await this.testGoogleDrive();
      const isConnected = !!window.GoogleDriveSync.isConnected();
      const profile = (testRes && testRes.success && testRes.profile) ? testRes.profile : null;
      if (callbacks.onSuccess) callbacks.onSuccess(profile, isConnected);
      return { isConnected, profile };
    },

    /**
     * File import backup parser and restore coordinator
     */
    async importBackupFile(file, setters = {}, callbacks = {}) {
      if (!file) throw new Error('No backup file selected.');
      const text = await this.readFileAsText(file);
      const data = this.parseBackup(text);
      const summary = await this.applyRestoredData(data, setters);
      if (callbacks.onSuccess) callbacks.onSuccess(summary);
      return summary;
    },

    /**
     * Direct clipboard / pasted text restore coordinator
     */
    async pasteAndRestoreBackup(pastedText, setters = {}, callbacks = {}) {
      if (!pastedText || !pastedText.trim()) throw new Error('No backup JSON content provided.');
      const data = this.parseBackup(pastedText.trim());
      const summary = await this.applyRestoredData(data, setters);
      if (callbacks.onSuccess) callbacks.onSuccess(summary);
      return summary;
    }
  };

  const Controller = {
    buildBackupSetters(setters = {}) {
      return {
        setSavedGlossaries: setters.setSavedGlossaries,
        setTerminology: setters.setTerminology,
        setActiveGlossaryId: setters.setActiveGlossaryId,
        setHistory: setters.setHistory,
        setCustomInstructions: setters.setCustomInstructions,
        setDefaultGlossaryName: setters.setDefaultGlossaryName,
        setSmartGlossary: setters.setSmartGlossary,
        setEnableGlossary: setters.setEnableGlossary,
        setProvider: setters.setProvider,
        setGeminiModel: setters.setGeminiModel,
        setDeepseekModel: setters.setDeepseekModel,
        setOpenaiModel: setters.setOpenaiModel,
        setClaudeModel: setters.setClaudeModel,
        setConcurrency: setters.setConcurrency,
        setContextAware: setters.setContextAware,
        setChunkSizePreset: setters.setChunkSizePreset,
        setEnableThinking: setters.setEnableThinking,
        setStrictModel: setters.setStrictModel,
        setEnableStreaming: setters.setEnableStreaming,
        setCustomModel: setters.setCustomModel,
        setUseCustomModel: setters.setUseCustomModel,
        setCustomDeepseekModel: setters.setCustomDeepseekModel,
        setUseCustomDeepseekModel: setters.setUseCustomDeepseekModel,
        setEpubDropCaps: setters.setEpubDropCaps,
        setEpubSmartQuotes: setters.setEpubSmartQuotes,
        setEpubCleanWebArtifacts: setters.setEpubCleanWebArtifacts,
        setEpubFontTheme: setters.setEpubFontTheme,
        setEpubJustifyText: setters.setEpubJustifyText,
        setEpubIncludeImages: setters.setEpubIncludeImages,
        setScrapeImages: setters.setScrapeImages,
        setReaderTheme: setters.setReaderTheme,
        setReaderFont: setters.setReaderFont,
        setReaderFontSize: setters.setReaderFontSize,
        setWebImportHistory: setters.setWebImportHistory,
        setApiKeysByProvider: setters.setApiKeysByProvider,
        setActiveKeyIds: setters.setActiveKeyIds,
        setLibreUrl: setters.setLibreUrl,
        ...setters
      };
    },

    buildBackupState(state = {}) {
      return {
        VERSION: state.VERSION || '8.17.88',
        savedGlossaries: state.savedGlossaries,
        terminology: state.terminology,
        customInstructions: state.customInstructions,
        history: state.history,
        provider: state.provider,
        geminiModel: state.geminiModel,
        deepseekModel: state.deepseekModel,
        openaiModel: state.openaiModel,
        claudeModel: state.claudeModel,
        concurrency: state.concurrency,
        contextAware: state.contextAware,
        chunkSizePreset: state.chunkSizePreset,
        enableThinking: state.enableThinking,
        strictModel: state.strictModel,
        enableStreaming: state.enableStreaming,
        enableGlossary: state.enableGlossary,
        customModel: state.customModel,
        useCustomModel: state.useCustomModel,
        customDeepseekModel: state.customDeepseekModel,
        useCustomDeepseekModel: state.useCustomDeepseekModel,
        defaultGlossaryName: state.defaultGlossaryName,
        smartGlossary: state.smartGlossary,
        epubDropCaps: state.epubDropCaps,
        epubSmartQuotes: state.epubSmartQuotes,
        epubCleanWebArtifacts: state.epubCleanWebArtifacts,
        epubFontTheme: state.epubFontTheme,
        epubJustifyText: state.epubJustifyText,
        epubIncludeImages: state.epubIncludeImages,
        scrapeImages: state.scrapeImages,
        readerTheme: state.readerTheme,
        readerFont: state.readerFont,
        readerFontSize: state.readerFontSize,
        apiKeysByProvider: state.apiKeysByProvider,
        activeKeyIds: state.activeKeyIds,
        libreUrl: state.libreUrl,
        ...state
      };
    },

    async performWebDav(type, options = {}, callbacks = {}) {
      const {
        webdavUrl = options.url || '',
        webdavPath = options.path || 'GeminiTranslator',
        webdavUser = options.user || '',
        webdavPass = options.pass || '',
        version = '8.17.88',
        state = {},
        setters = {}
      } = options;

      const toast = callbacks.toast || ((m, t) => console.log(m));
      const setSyncing = callbacks.setSyncing || callbacks.setWebdavSyncing || (() => {});
      const setTesting = callbacks.setTesting || callbacks.setWebdavTesting || (() => {});

      if (type === 'test') {
        if (!webdavUrl || !webdavUrl.trim()) {
          toast('Please enter a WebDAV URL in Settings', 'warning');
          return;
        }
        setTesting(true);
        try {
          const res = await BackupEngine.testWebDav({ url: webdavUrl, user: webdavUser, pass: webdavPass });
          if (res.status >= 200 && res.status < 400) {
            toast(`✅ Connected to WebDAV! (Status ${res.status})`, 'success');
          } else if (res.status === 401 || res.status === 403) {
            toast(`Authentication failed (HTTP ${res.status}). Check username/password.`, 'error');
          } else {
            toast(`WebDAV server responded with HTTP ${res.status}.`, 'info');
          }
          if (callbacks.onSuccess) callbacks.onSuccess(res);
          return res;
        } catch (e) {
          toast(`Connection failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setTesting(false);
        }
        return;
      }

      if (type === 'backup') {
        if (!webdavUrl || !webdavUrl.trim()) {
          toast('Please configure WebDAV URL in Settings first', 'warning');
          return;
        }
        setSyncing(true);
        try {
          const res = await BackupEngine.performWebDavBackup({
            webdavUrl,
            webdavPath,
            webdavUser,
            webdavPass,
            version,
            state,
            callbacks: {
              onSuccess: (timeStr, targetFolder) => {
                toast(`☁️ WebDAV Backup Successful! Saved to /${targetFolder}/`, 'success');
                if (callbacks.setLastSync) callbacks.setLastSync(timeStr);
                try { localStorage.setItem('webdavLastSync', timeStr); } catch (e) {}
                if (callbacks.onSuccess) callbacks.onSuccess(timeStr, targetFolder);
              }
            }
          });
          return res;
        } catch (e) {
          console.error('WebDAV Backup Error:', e);
          toast(`WebDAV Backup failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setSyncing(false);
        }
        return;
      }

      if (type === 'restore') {
        if (!webdavUrl || !webdavUrl.trim()) {
          toast('Please configure WebDAV URL in Settings first', 'warning');
          return;
        }
        setSyncing(true);
        try {
          const res = await BackupEngine.performWebDavRestore({
            webdavUrl,
            webdavPath,
            webdavUser,
            webdavPass,
            setters,
            callbacks: {
              confirm: callbacks.confirm || ((msg) => (typeof confirm === 'function' ? confirm(msg) : true)),
              onSuccess: (countNovels, countGloss, restoreSummary) => {
                toast(`Restored ${countNovels} novels and ${countGloss} glossaries from WebDAV!`, 'success');
                if (callbacks.onSuccess) callbacks.onSuccess(countNovels, countGloss, restoreSummary);
              }
            }
          });
          return res;
        } catch (e) {
          console.error('WebDAV Restore Error:', e);
          toast(`WebDAV Restore failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setSyncing(false);
        }
        return;
      }
    },

    async performGoogleDrive(type, options = {}, callbacks = {}) {
      const {
        includeKeys = false,
        version = '8.17.88',
        state = {},
        setters = {}
      } = options;

      const toast = callbacks.toast || ((m, t) => console.log(m));
      const setSyncing = callbacks.setSyncing || callbacks.setGdriveSyncing || (() => {});
      const setTesting = callbacks.setTesting || callbacks.setGdriveTesting || (() => {});

      if (type === 'test') {
        if (!window.GoogleDriveSync?.isConnected()) {
          toast('Google Drive is not connected. Click "Sign in with Google" first.', 'warning');
          return;
        }
        setTesting(true);
        try {
          const res = await BackupEngine.testGoogleDriveConnection({
            onSuccess: (profile) => {
              if (callbacks.setProfile) callbacks.setProfile(profile);
              if (callbacks.setConnected) callbacks.setConnected(true);
              toast(`✅ Connected to Google Drive! (${profile.emailAddress || profile.displayName})`, 'success');
              if (callbacks.onSuccess) callbacks.onSuccess(profile);
            }
          });
          return res;
        } catch (e) {
          toast(`Google Drive test failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setTesting(false);
        }
        return;
      }

      if (type === 'backup') {
        if (!window.GoogleDriveSync?.isConnected()) {
          toast('Please connect Google Drive in Settings first', 'warning');
          return;
        }
        setSyncing(true);
        try {
          const res = await BackupEngine.performGoogleDriveBackup({
            includeKeys,
            version,
            state,
            callbacks: {
              onSuccess: (timeStr, novelCount, historyCount) => {
                if (callbacks.setLastSync) callbacks.setLastSync(timeStr);
                toast(`☁️ Google Drive Backup Successful! (${novelCount} novels, ${historyCount} history items)`, 'success');
                if (callbacks.onSuccess) callbacks.onSuccess(timeStr, novelCount, historyCount);
              }
            }
          });
          return res;
        } catch (e) {
          console.error('Google Drive Backup Error:', e);
          toast(`Google Drive Backup failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setSyncing(false);
        }
        return;
      }

      if (type === 'restore') {
        if (!window.GoogleDriveSync?.isConnected()) {
          toast('Please connect Google Drive in Settings first', 'warning');
          return;
        }
        setSyncing(true);
        try {
          const res = await BackupEngine.performGoogleDriveRestore({
            setters,
            callbacks: {
              onStart: () => toast('Fetching backup from Google Drive…', 'info'),
              confirm: callbacks.confirm || ((msg) => (typeof confirm === 'function' ? confirm(msg) : true)),
              onSuccess: (countNovels, countGloss, restoreSummary) => {
                toast(`Restored ${countNovels} novels and ${countGloss} glossaries from Google Drive!`, 'success');
                if (callbacks.onSuccess) callbacks.onSuccess(countNovels, countGloss, restoreSummary);
              }
            }
          });
          return res;
        } catch (e) {
          console.error('Google Drive Restore Error:', e);
          toast(`Google Drive Restore failed: ${e.message}`, 'error');
          if (callbacks.onError) callbacks.onError(e);
        } finally {
          setSyncing(false);
        }
        return;
      }

      if (type === 'connect') {
        if (!window.GoogleDriveSync?.getClientId()) {
          if (callbacks.setConfigModalOpen) callbacks.setConfigModalOpen(true);
          toast('Please configure your Google OAuth Client ID or paste an Access Token.', 'info');
          return;
        }
        try {
          const res = await BackupEngine.connectGoogleDrive({
            onStart: () => toast('Opening Google Authorization window…', 'info'),
            onSuccess: (profile, isConnected) => {
              if (callbacks.setConnected) callbacks.setConnected(isConnected);
              if (profile) {
                if (callbacks.setProfile) callbacks.setProfile(profile);
                toast(`Google Drive connected as ${profile.emailAddress || profile.displayName}! 🎉`, 'success');
              } else {
                toast('Google Drive connected!', 'success');
              }
              if (callbacks.onSuccess) callbacks.onSuccess(profile, isConnected);
            }
          });
          return res;
        } catch (err) {
          if (err.message === 'MISSING_CLIENT_ID') {
            if (callbacks.setConfigModalOpen) callbacks.setConfigModalOpen(true);
          } else {
            console.warn('Google Drive Auth error:', err);
            toast(`Google Drive Sign-in: ${err.message}`, 'error');
          }
          if (callbacks.onError) callbacks.onError(err);
        }
        return;
      }

      if (type === 'disconnect') {
        window.GoogleDriveSync?.disconnect();
        if (callbacks.setConnected) callbacks.setConnected(false);
        if (callbacks.setProfile) callbacks.setProfile(null);
        toast('Google Drive disconnected.', 'info');
        if (callbacks.onSuccess) callbacks.onSuccess();
        return;
      }
    },

    async performFullBackup(type, options = {}, callbacks = {}) {
      const toast = callbacks.toast || ((m, t) => console.log(m));
      const setError = callbacks.setError || (() => {});
      const setters = options.setters || {};

      if (type === 'file' || type === 'import') {
        const file = options.file || options.event?.target?.files?.[0];
        if (!file) return;
        try {
          const res = await BackupEngine.importBackupFile(file, setters, {
            onSuccess: (summary) => {
              if (summary.isGlossaryOnly) {
                toast(`Imported ${summary.count} glossaries!`);
              } else {
                toast(`Restored ${summary.summary} successfully!`);
              }
              if (callbacks.onSuccess) callbacks.onSuccess(summary);
            }
          });
          return res;
        } catch (err) {
          console.error("Backup import error:", err);
          setError('Failed to restore backup: ' + err.message);
          toast('Failed to restore backup: ' + err.message, 'error');
          if (callbacks.onError) callbacks.onError(err);
        } finally {
          if (options.event?.target) options.event.target.value = '';
        }
        return;
      }

      if (type === 'paste' || type === 'clipboard') {
        try {
          let text = '';
          if (navigator.clipboard?.readText) {
            try { text = await navigator.clipboard.readText(); } catch (e) {}
          }
          const input = prompt('Paste your backup JSON content below:', text);
          if (!input || !input.trim()) return;
          const res = await BackupEngine.pasteAndRestoreBackup(input, setters, {
            onSuccess: (summary) => {
              if (summary.isGlossaryOnly) {
                toast(`Imported ${summary.count} glossaries!`);
              } else {
                toast(`Restored ${summary.summary} successfully!`);
              }
              if (callbacks.onSuccess) callbacks.onSuccess(summary);
            }
          });
          return res;
        } catch (err) {
          console.error("Backup paste error:", err);
          setError('Failed to parse backup JSON: ' + err.message);
          toast('Failed to parse backup JSON: ' + err.message, 'error');
          if (callbacks.onError) callbacks.onError(err);
        }
        return;
      }
    }
  };

  BackupEngine.Controller = Controller;
  if (typeof window !== 'undefined') {
    window.BackupEngine = BackupEngine;
    window.BackupEngine.Controller = Controller;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupEngine;
  }
})(typeof window !== 'undefined' ? window : this);
