/**
 * app_tab_settings.js - Chimanew Elevated Dark Drill-Down Settings Hub
 * Presents a searchable grouped menu (Appearance & Layout, AI & Translation Engine,
 * Sync, Storage & System) using Elevated #181A20 8px panels over #0F1014 canvas, opening
 * dedicated full-screen sub-views while preserving 100% of engine, key pool, QA/TM,
 * recipe, OPDS, TTS, Cloud Sync, Storage, and System controls.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function TabSettings(props) {
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : {});
    const h = ReactObj.createElement;
    const useState = ReactObj.useState || function (v) { return [typeof v === 'function' ? v() : v, function () {}]; };
    const useEffect = ReactObj.useEffect || function () {};
    const useRef = ReactObj.useRef || function (v) { return { current: v }; };

    const toast = (typeof window !== 'undefined' && window.toast) ? window.toast : function () {};
    const ic = (typeof window !== 'undefined' && window.ic) ? window.ic : function () { return null; };

    const {
      appVersion,
      appVersionCode,
      checkForAppUpdate,
      availableUpdate,
      isUpdating,
      handlePerformUpdate,
      handleResetSettings = function () {},
      downloadedOnly,
      setDownloadedOnly,
      incognitoMode,
      setIncognitoMode,
      settingsCategory,
      setSettingsCategory,
      provider = 'gemini',
      setProvider,
      apiKeysByProvider = {},
      activeKeyIds = {},
      showKeys = {},
      setShowKeys,
      addApiKey,
      deleteApiKey,
      updateApiKey,
      setActiveKey,
      testSingleKey,
      handleTestAllKeys,
      keyHealth = {},
      setKeyHealth,
      testingKeys,
      setBulkKeyModalOpen,
      libreUrl,
      setLibreUrl,
      geminiModel,
      setGeminiModel,
      deepseekModel,
      setDeepseekModel,
      customModel,
      setCustomModel,
      useCustomModel,
      setUseCustomModel,
      customDeepseekModel,
      setCustomDeepseekModel,
      useCustomDeepseekModel,
      setUseCustomDeepseekModel,
      enableStreaming,
      setEnableStreaming,
      enableThinking,
      setEnableThinking,
      strictModel,
      setStrictModel,
      fallbackModels,
      setFallbackModels,
      concurrency,
      setConcurrency,
      contextAware,
      setContextAware,
      chunkSizePreset,
      setChunkSizePreset,
      handleOpenSourcePluginsModal,
      healthAuditEnabled,
      setHealthAuditEnabled,
      qaProofreaderEnabled,
      setQaProofreaderEnabled,
      cjkLeakCheckEnabled,
      setCjkLeakCheckEnabled,
      antiMtlGateEnabled,
      setAntiMtlGateEnabled,
      translationMemoryEnabled,
      setTranslationMemoryEnabled,
      refreshTmStats,
      tmStats = {},
      handleClearTm,
      handleExportTmx,
      snapshotsEnabled,
      setSnapshotsEnabled,
      culturalFootnotesEnabled,
      setCulturalFootnotesEnabled,
      amoledMode,
      setAmoledMode,
      deviceWakeLock,
      setDeviceWakeLock,
      epubDropCaps,
      setEpubDropCaps,
      epubSmartQuotes,
      setEpubSmartQuotes,
      epubCleanWebArtifacts,
      setEpubCleanWebArtifacts,
      epubFontTheme,
      setEpubFontTheme,
      epubJustifyText,
      setEpubJustifyText,
      epubIncludeImages,
      setEpubIncludeImages,
      epubFixedFilename,
      setEpubFixedFilename,
      storageDiag = {},
      storageLoading,
      refreshStorageDiag,
      webImportHistory,
      exportFullBackup,
      importFullBackup,
      pasteAndRestoreBackup,
      trashCount = 0,
      handleEmptyTrash,
      cloudProvider,
      setCloudProvider,
      webdavUrl,
      setWebdavUrl,
      webdavUser,
      setWebdavUser,
      webdavPass,
      setWebdavPass,
      webdavPath,
      setWebdavPath,
      webdavAutoSync,
      setWebdavAutoSync,
      webdavTesting,
      webdavSyncing,
      webdavLastSync,
      testWebDavConnection,
      backupToWebDav,
      restoreFromWebDav,
      gdriveConnected,
      gdriveUser,
      gdriveFolderMode,
      setGdriveFolderMode,
      gdriveAutoSync,
      setGdriveAutoSync,
      gdriveLastSync,
      gdriveTesting,
      gdriveSyncing,
      setGdriveConfigModalOpen,
      testGoogleDriveConnection,
      backupToGoogleDrive,
      restoreFromGoogleDrive,
      connectGoogleDrive,
      backupToGoogleDriveFile,
      disconnectGoogleDrive,
      opdsRunning,
      opdsUrl,
      opdsWifiUrl,
      toggleOpdsServer,
      telemetryEnabled,
      setTelemetryEnabled,
      telemetryVerbose,
      setTelemetryVerbose,
      telemetryServerUrl,
      setTelemetryServerUrl,
      telemetryTesting,
      telemetryStatus,
      telemetryStatusMsg,
      handleTestTelemetryConnection,
      handleClearTelemetryServer,
      showLiveLogs,
      setShowLiveLogs,
      setLogsModalOpen,
      handleInstallPWA,
      confirmAction,
      openSiteRecipeEditor,
      DEFAULT_GEMINI_MODELS = [],
      DEFAULT_DEEPSEEK_MODELS = []
    } = props;

    const ThemeEngine = (typeof window !== 'undefined' && window.OmniThemeEngine) ? window.OmniThemeEngine : null;
    const omniPrefs = ThemeEngine && typeof ThemeEngine.useOmniPrefs === 'function'
      ? ThemeEngine.useOmniPrefs()
      : { themeId: 'WHITE', libraryLayout: 'editorial', detailsHeader: 'split', discoverLayout: 'sources', amoledCanvas: false, heroBlur: 24 };
    const activePalette = ThemeEngine && typeof ThemeEngine.getPalette === 'function'
      ? ThemeEngine.getPalette(omniPrefs.themeId, omniPrefs)
      : { id: 'WHITE', name: 'Monochrome', accent: '#F5F6F8', variant: '#AEB4C2', onAccent: '#0F1014' };

    const [activeSubView, setActiveSubView] = useState(null);
    const [settingsQuery, setSettingsQuery] = useState('');
    const [newFallbackModelText, setNewFallbackModelText] = useState('');
    const [pointerMode, setPointerMode] = useState(() => {
      try { return localStorage.getItem('gemini_storage_pointer_mode') !== 'false'; } catch (_) { return true; }
    });
    const [updateGraceWindow, setUpdateGraceWindow] = useState(() => {
      try { return localStorage.getItem('gemini_update_grace_window') === 'true'; } catch (_) { return false; }
    });
    const [optimizingStorage, setOptimizingStorage] = useState(false);

    const activeSubViewRef = useRef(activeSubView);
    activeSubViewRef.current = activeSubView;

    // Register Android back button drill-out handler (Settings Sub-Page -> Settings Hub)
    useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      window.exitSettingsSubView = () => {
        if (activeSubViewRef.current) {
          setActiveSubView(null);
          return true;
        }
        return false;
      };
      return () => {
        if (window.exitSettingsSubView) delete window.exitSettingsSubView;
      };
    }, []);

    useEffect(() => {
      if (!activeSubView || typeof window === 'undefined' || !window.OmniBackStack?.push) return undefined;
      return window.OmniBackStack.push('settings-subview', () => {
        setActiveSubView(null);
        return true;
      });
    }, [activeSubView]);

    // Keep legacy settingsCategory in sync if another caller sets it
    useEffect(() => {
      if (settingsCategory && settingsCategory !== 'all') {
        const valid = ['engine', 'sources', 'quality', 'display', 'backup', 'system', 'visual'];
        if (valid.includes(settingsCategory)) {
          setActiveSubView(settingsCategory);
          if (typeof setSettingsCategory === 'function') setSettingsCategory('all');
        }
      }
    }, [settingsCategory]);

    const handleOptimizeStorage = async () => {
      if (!window.GeminiNovelDB) return;
      if (!window.NativeBridge || !window.NativeBridge.readEpubFile) {
        toast('Storage optimization to disk pointers is only supported on Android with active file access.', 'info');
        return;
      }
      setOptimizingStorage(true);
      try {
        const all = await window.GeminiNovelDB.getAllNovels();
        let count = 0;
        let skipped = 0;
        for (const novel of (all || [])) {
          const uri = novel.fileUri || novel.folderOptions?.fileUri;
          const path = novel.displayPath || novel.folderOptions?.displayPath;
          const hasDiskPath = Boolean((uri && uri.trim().length > 5) || (path && path.trim().length > 5));
          const hasFullChapters = Array.isArray(novel.chapters) && novel.chapters.some(c => c && (c.text || c.content));
          if (hasDiskPath && hasFullChapters && !novel.isEdited) {
            let verifiedOnDisk = false;
            try {
              const testBlob = await window.NativeBridge.readEpubFile({
                fileUri: uri,
                displayPath: path,
                fileName: novel.fileName || ''
              });
              if (testBlob && testBlob.size > 2000) verifiedOnDisk = true;
            } catch (_) {
              verifiedOnDisk = false;
            }
            if (!verifiedOnDisk) {
              skipped++;
              continue;
            }
            const lightweight = novel.chapters.map(c => ({
              idx: c.idx !== undefined ? c.idx : 0,
              title: c.title || 'Chapter',
              url: c.url || '',
              words: c.words || 0
            }));
            await window.GeminiNovelDB.saveNovel({
              ...novel,
              isPointerOnly: true,
              chapters: lightweight,
              rawChapters: lightweight,
              epubBlob: undefined
            });
            count++;
          }
        }
        if (typeof refreshStorageDiag === 'function') refreshStorageDiag();
        if (count > 0) {
          toast(`Storage optimized! Converted ${count} verified book${count === 1 ? '' : 's'} to lightweight pointers.${skipped > 0 ? ` (${skipped} books kept full text safely)` : ''}`, 'success');
        } else if (skipped > 0) {
          toast(`Kept ${skipped} book${skipped === 1 ? '' : 's'} fully stored to prevent data loss (disk files not found).`, 'info');
        } else {
          toast('All books are already optimized or safely stored.', 'info');
        }
      } catch (err) {
        toast('Optimization error: ' + err.message, 'error');
      } finally {
        setOptimizingStorage(false);
      }
    };

    const handleAddFallbackModel = (modelName) => {
      const clean = (modelName || '').trim();
      if (!clean) return;
      const currentList = Array.isArray(fallbackModels) ? fallbackModels : ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      if (!currentList.includes(clean)) {
        const updated = [...currentList, clean];
        if (setFallbackModels) setFallbackModels(updated);
        try {
          localStorage.setItem('fallback_models', JSON.stringify(updated));
          localStorage.setItem('fallbackModels', JSON.stringify(updated));
        } catch (_) {}
        toast(`Added ${clean} to fallback ladder.`, 'info');
      } else {
        toast(`${clean} is already in the fallback ladder.`, 'info');
      }
    };

    const handleRemoveFallbackModel = (idx) => {
      const currentList = Array.isArray(fallbackModels) ? fallbackModels : ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      const updated = currentList.filter((_, i) => i !== idx);
      if (setFallbackModels) setFallbackModels(updated);
      try {
        localStorage.setItem('fallback_models', JSON.stringify(updated));
        localStorage.setItem('fallbackModels', JSON.stringify(updated));
      } catch (_) {}
    };

    const handleMoveFallbackModel = (idx, direction) => {
      const currentList = Array.isArray(fallbackModels) ? [...fallbackModels] : ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= currentList.length) return;
      const temp = currentList[idx];
      currentList[idx] = currentList[targetIdx];
      currentList[targetIdx] = temp;
      if (setFallbackModels) setFallbackModels(currentList);
      try {
        localStorage.setItem('fallback_models', JSON.stringify(currentList));
        localStorage.setItem('fallbackModels', JSON.stringify(currentList));
      } catch (_) {}
    };

    const handleResetFallbackLadder = () => {
      const defaults = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      if (setFallbackModels) setFallbackModels(defaults);
      try {
        localStorage.setItem('fallback_models', JSON.stringify(defaults));
        localStorage.setItem('fallbackModels', JSON.stringify(defaults));
      } catch (_) {}
      toast('Reset fallback ladder to defaults.', 'info');
    };

    const fontThemes = [
      { id: 'literata', label: 'Literata' },
      { id: 'georgia', label: 'Georgia' },
      { id: 'inter', label: 'Inter' },
      { id: 'none', label: 'Default' }
    ];

    const inputStyle = {
      background: 'var(--omni-input, #1B1D24)',
      border: '1px solid var(--omni-border, #363A48)',
      color: 'var(--omni-text, #F5F6F8)',
      borderRadius: 6,
      padding: '8px 10px',
      fontSize: 12,
      outline: 'none',
      fontFamily: "'IBM Plex Mono', monospace"
    };

    const selectStyle = {
      background: 'var(--omni-control, #23262F)',
      border: '1px solid var(--omni-border, #363A48)',
      color: 'var(--omni-text, #F5F6F8)',
      borderRadius: 6,
      padding: '7px 10px',
      fontSize: 12.5,
      fontWeight: 600,
      outline: 'none',
      maxWidth: 210,
      cursor: 'pointer'
    };

    const ghostBtnStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '8px 13px',
      borderRadius: 999,
      background: 'rgba(255, 255, 255, 0.08)',
      border: 'none',
      color: 'var(--p-ink, #F5F6F8)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer'
    };

    const primaryBtnStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '10px 16px',
      borderRadius: 999,
      background: 'var(--p-accent, var(--omni-accent, #E8C26A))',
      color: 'var(--p-accent-ink, #111318)',
      border: 'none',
      fontSize: 12.5,
      fontWeight: 750,
      cursor: 'pointer'
    };

    const switchRow = (label, checked, onChange, subtitle) => h('div', {
      className: 'omni-hairline-row',
      style: { justifyContent: 'space-between', padding: '14px 0', cursor: 'pointer' },
      onClick: () => onChange(!checked)
    },
      h('div', { style: { minWidth: 0, flex: 1, paddingRight: 12 } },
        h('div', { style: { fontSize: 13.5, fontWeight: 500, color: 'var(--omni-text)' } }, label),
        subtitle && h('div', { style: { fontSize: 11, color: 'var(--omni-text-sub)', marginTop: 2, lineHeight: 1.35 } }, subtitle)
      ),
      h('button', {
        type: 'button',
        className: `switch ${checked ? 'on' : ''}`,
        onClick: (e) => { e.stopPropagation(); onChange(!checked); },
        'aria-pressed': !!checked
      })
    );

    const subHeader = (title, subtitle, rightNode) => h('div', {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 14,
        background: 'var(--p-canvas, #111318)',
        borderBottom: '1px solid var(--p-hairline, rgba(255,255,255,0.065))',
        padding: '6px 0 12px',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } },
        h('button', {
          type: 'button',
          className: 'omni-circle-btn',
          onClick: () => setActiveSubView(null),
          'aria-label': 'Back to Settings',
          style: { color: 'var(--omni-text)' }
        }, ic('ArrowLeft', 18)),
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { fontSize: 16.5, fontWeight: 750, color: 'var(--omni-text)', letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, title),
          subtitle && h('div', { style: { fontSize: 11, color: 'var(--omni-text-sub)' } }, subtitle)
        )
      ),
      rightNode || null
    );

    const sectionTitle = (text, rightBadge) => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '1px solid var(--omni-hairline, #262A36)'
      }
    },
      h('span', {
        style: {
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.11em',
          textTransform: 'uppercase',
          color: 'var(--omni-text-sub)'
        }
      }, text),
      rightBadge ? h('span', { style: { fontSize: 10.5, fontWeight: 600, color: activePalette.accent } }, rightBadge) : null
    );

    // ── Sub-View 1: Visual Presentation & Colors ──
    if (activeSubView === 'visual') {
      if (typeof window !== 'undefined' && window.OmniVisualSettingsScreen) {
        return h(window.OmniVisualSettingsScreen, {
          onBack: () => setActiveSubView(null),
          amoledMode,
          setAmoledMode
        });
      }
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Visual Presentation & Colors', 'Palette & Layouts'),
        h('div', { style: { padding: '24px 0', color: 'var(--omni-text-sub)', fontSize: 13 } }, 'Visual customizer module loading...')
      );
    }

    // ── Sub-View 2: Reader, EPUB & Speech ──
    if (activeSubView === 'display') {
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Reader, EPUB & Speech', `${amoledMode ? 'AMOLED' : 'Elevated Dark'} · ${epubFontTheme || 'Literata'} · ${opdsRunning ? 'OPDS Online' : 'OPDS Idle'}`),

        sectionTitle('THEME & EPUB TYPOGRAPHY', amoledMode ? 'AMOLED' : 'ELEVATED DARK'),
        switchRow('AMOLED Pitch-Black Canvas (#000000)', amoledMode, (v) => {
          setAmoledMode(v);
          try {
            localStorage.setItem('amoledMode', String(v));
            localStorage.setItem('omni_amoled_canvas', String(v));
            ThemeEngine?.setPref?.('amoledCanvas', Boolean(v));
          } catch (_) {}
          if (v) {
            document.documentElement.setAttribute('data-theme', 'amoled');
            document.body?.classList?.add('theme-amoled');
          } else {
            document.documentElement.removeAttribute('data-theme');
            document.body?.classList?.remove('theme-amoled');
          }
        }, 'True black #000000 page background while keeping panels and buttons elevated'),
        switchRow('Embed Images in EPUB', epubIncludeImages, setEpubIncludeImages),
        switchRow('Drop Caps', epubDropCaps, setEpubDropCaps),
        switchRow('Smart Quotes', epubSmartQuotes, setEpubSmartQuotes),
        switchRow('Clean Web Junk', epubCleanWebArtifacts, setEpubCleanWebArtifacts),
        switchRow('Justify Text', epubJustifyText, setEpubJustifyText),
        switchRow('Fixed Book Filename (Title.epub)', epubFixedFilename, setEpubFixedFilename),
        h('div', { style: { padding: '14px 0', borderBottom: '0.6px solid rgba(255,255,255,0.08)' } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 8 } }, 'Reader & Export Font Family'),
          h('div', { className: 'seg' },
            fontThemes.map(f => h('button', {
              key: f.id,
              type: 'button',
              className: `seg-btn ${epubFontTheme === f.id ? 'on' : ''}`,
              onClick: () => setEpubFontTheme(f.id)
            }, f.label))
          )
        ),

        sectionTitle('MOON+ READER & OPDS CATALOG', opdsRunning ? 'ONLINE' : 'STOPPED'),
        h('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, padding: '4px 0 8px' } },
          'Run a lightweight local OPDS 1.2 feed inside the app so Moon+ Reader Pro and other e-readers can browse and download novels directly over Wi-Fi.'
        ),
        switchRow('Enable Local OPDS Feed', opdsRunning, toggleOpdsServer),
        opdsRunning && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', null,
            h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'LOCAL DEVICE URL (MOON+ READER ON THIS PHONE)'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', { type: 'text', readOnly: true, value: opdsUrl || 'http://127.0.0.1:8080/opds', style: { ...inputStyle, flex: 1 } }),
              h('button', {
                type: 'button',
                style: ghostBtnStyle,
                onClick: () => {
                  navigator.clipboard?.writeText(opdsUrl || 'http://127.0.0.1:8080/opds');
                  toast('Copied OPDS URL!', 'success');
                }
              }, ic('Copy', 13), 'Copy')
            )
          ),
          opdsWifiUrl && h('div', null,
            h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'WI-FI NETWORK URL (TABLET / E-INK)'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', { type: 'text', readOnly: true, value: opdsWifiUrl, style: { ...inputStyle, flex: 1 } }),
              h('button', {
                type: 'button',
                style: ghostBtnStyle,
                onClick: () => {
                  navigator.clipboard?.writeText(opdsWifiUrl);
                  toast('Copied Wi-Fi OPDS URL!', 'success');
                }
              }, ic('Copy', 13), 'Copy')
            )
          ),
          h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.48)', lineHeight: 1.45 } },
            'In Moon+ Reader Pro: Open side menu -> Net Library -> tap Add new catalog -> enter the URL above.'
          )
        ),

        sectionTitle('TEXT-TO-SPEECH & OFFLINE VOICES', 'SherpaTTS · Android'),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('div', null,
            h('div', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Voice & Offline Speech Engine'),
            h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.48)', marginTop: 2 } }, 'Select neural Piper/SherpaTTS models and reading voice')
          ),
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: () => {
              if (window.__openVoiceModal) window.__openVoiceModal();
              else if (window.NativeBridge?.openTtsSettings) window.NativeBridge.openTtsSettings();
              else toast('Open any book in Reader and tap Voice to choose voices.', 'info');
            }
          }, ic('Volume2', 13), 'Voice Manager')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Android System TTS Settings'),
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: () => {
              if (window.NativeBridge?.openTtsSettings) window.NativeBridge.openTtsSettings();
              else toast('Open phone Settings > Accessibility > Text-to-Speech to select SherpaTTS/Piper models.', 'info');
            }
          }, ic('Settings', 13), 'Open TTS Settings')
        )
      );
    }

    // ── Sub-View 3: AI Provider, Models & API Keys ──
    if (activeSubView === 'engine') {
      const provKeysRaw = apiKeysByProvider[provider] || [];
      const provKeysNonEmpty = provKeysRaw.filter(k => k.key && k.key.trim());
      const uniqueCount = new Set(provKeysNonEmpty.map(k => k.key.trim())).size;
      const hasDuplicates = provKeysNonEmpty.length > uniqueCount;

      return h('div', { style: { paddingBottom: 32 } },
        subHeader('AI Provider, Models & API Keys', `${provider.toUpperCase()} · ${provKeysNonEmpty.length} key slots (${uniqueCount} unique)`),

        sectionTitle('PROVIDER & MODEL SELECTION', provider.toUpperCase()),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '13px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Active Provider'),
          h('select', { style: selectStyle, value: provider, onChange: e => setProvider(e.target.value) },
            h('option', { value: 'gemini' }, 'Gemini'),
            h('option', { value: 'deepseek' }, 'DeepSeek'),
            h('option', { value: 'openai' }, 'OpenAI'),
            h('option', { value: 'claude' }, 'Claude'),
            h('option', { value: 'deepl' }, 'DeepL'),
            h('option', { value: 'libre' }, 'LibreTranslate')
          )
        ),

        provider === 'gemini' && h(React.Fragment, null,
          h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '13px 0' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Gemini Model'),
            h('select', {
              style: selectStyle,
              value: useCustomModel ? 'custom' : geminiModel,
              onChange: e => {
                if (e.target.value === 'custom') {
                  setUseCustomModel(true);
                  localStorage.setItem('useCustomModel', 'true');
                } else {
                  setUseCustomModel(false);
                  localStorage.setItem('useCustomModel', 'false');
                  setGeminiModel(e.target.value);
                  localStorage.setItem('geminiModel', e.target.value);
                }
              }
            },
              DEFAULT_GEMINI_MODELS.map(m => h('option', { key: m.id, value: m.id }, m.name)),
              h('option', { value: 'custom' }, 'Custom Model (Enter Manually...)')
            )
          ),
          useCustomModel && h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '12px 0' } },
            h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.6)' } }, 'Custom Model ID'),
            h('input', {
              type: 'text',
              placeholder: 'e.g. gemini-3.8-flash',
              value: customModel,
              onChange: e => {
                const val = e.target.value.trim();
                setCustomModel(val);
                localStorage.setItem('customModel', val);
              },
              style: { ...inputStyle, width: 195, borderColor: activePalette.accent }
            })
          )
        ),

        provider === 'deepseek' && h(React.Fragment, null,
          h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '13px 0' } },
            h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'DeepSeek Model'),
            h('select', {
              style: selectStyle,
              value: useCustomDeepseekModel ? 'custom' : deepseekModel,
              onChange: e => {
                if (e.target.value === 'custom') {
                  setUseCustomDeepseekModel(true);
                  localStorage.setItem('useCustomDeepseekModel', 'true');
                } else {
                  setUseCustomDeepseekModel(false);
                  localStorage.setItem('useCustomDeepseekModel', 'false');
                  setDeepseekModel(e.target.value);
                  localStorage.setItem('deepseekModel', e.target.value);
                }
              }
            },
              DEFAULT_DEEPSEEK_MODELS.map(m => h('option', { key: m.id, value: m.id }, m.name)),
              h('option', { value: 'custom' }, 'Custom Model (Enter Manually...)')
            )
          ),
          useCustomDeepseekModel && h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '12px 0' } },
            h('span', { style: { fontSize: 12, color: 'rgba(255,255,255,0.6)' } }, 'Custom DeepSeek ID'),
            h('input', {
              type: 'text',
              placeholder: 'e.g. deepseek-chat',
              value: customDeepseekModel,
              onChange: e => {
                const val = e.target.value.trim();
                setCustomDeepseekModel(val);
                localStorage.setItem('customDeepseekModel', val);
              },
              style: { ...inputStyle, width: 195, borderColor: activePalette.accent }
            })
          )
        ),

        provider === 'libre' && h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '13px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'LibreTranslate URL'),
          h('input', {
            type: 'text',
            value: libreUrl,
            onChange: e => { setLibreUrl(e.target.value); localStorage.setItem('libreUrl', e.target.value); },
            style: { ...inputStyle, maxWidth: 210 }
          })
        ),

        switchRow('Typewriter Streaming', enableStreaming, setEnableStreaming),
        switchRow('Extended Thinking', enableThinking, (v) => { setEnableThinking(v); localStorage.setItem('enableThinking', String(v)); }),
        switchRow('Strict Model (No Fallbacks)', strictModel, (v) => { setStrictModel(v); localStorage.setItem('strictModel', String(v)); }),

        strictModel ? h('div', {
          style: {
            padding: '12px 0',
            borderBottom: '0.6px solid rgba(255,255,255,0.08)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.5
          }
        },
          h('strong', { style: { color: activePalette.accent } }, 'Model Locked: '),
          'Strict Mode is active. Fallback cascading is disabled; the engine waits and rotates keys on your chosen model.'
        ) : h('div', {
          style: {
            padding: '4px 0 10px',
            borderBottom: '0.6px solid rgba(255,255,255,0.08)'
          }
        },
          window.OmniWaterfallList
            ? h(window.OmniWaterfallList, {
                fallbackModels: fallbackModels,
                setFallbackModels: setFallbackModels,
                onReset: handleResetFallbackLadder
              })
            : null
        ),

        sectionTitle('PERFORMANCE & SOURCES', `Concurrency ${concurrency}`),
        switchRow('Context-Aware Memory', contextAware, setContextAware),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Parallel Streams'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, width: 190 } },
            h('input', {
              type: 'range',
              min: 1,
              max: 20,
              value: concurrency,
              onChange: e => setConcurrency(parseInt(e.target.value, 10)),
              style: { flex: 1, accentColor: activePalette.accent }
            }),
            h('span', { style: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: activePalette.accent, minWidth: 22, textAlign: 'right' } }, concurrency)
          )
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Chunk Size Preset'),
          h('select', {
            style: selectStyle,
            value: chunkSizePreset,
            onChange: e => {
              setChunkSizePreset(e.target.value);
              localStorage.setItem('chunkSizePreset', e.target.value);
            }
          },
            h('option', { value: 'turbo' }, 'Turbo (Max words/req)'),
            h('option', { value: 'large' }, 'Large (~3,500 chars)'),
            h('option', { value: 'medium' }, 'Medium (~2,500 chars)'),
            h('option', { value: 'small' }, 'Small (~1,800 chars)')
          )
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Source Plugins (LNReader)'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: handleOpenSourcePluginsModal },
            ic('Compass', 13), `Browse (${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length})`)
        ),

        sectionTitle(`API KEYS (${provider.toUpperCase()}) · ${provKeysNonEmpty.length} SLOTS (${uniqueCount} UNIQUE)`, hasDuplicates ? 'DUPLICATES' : null),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 0 12px', borderBottom: '0.6px solid rgba(255,255,255,0.08)' } },
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: () => {
              const allK = (apiKeysByProvider[provider] || []).map(k => (k.key || '').trim()).filter(Boolean);
              if (allK.length === 0) return toast('No keys to copy', 'info');
              navigator.clipboard?.writeText(allK.join('\n')).then(() => toast(`Copied all ${allK.length} keys to clipboard!`, 'success'));
            }
          }, ic('Copy', 12), 'Copy All'),
          h('button', {
            type: 'button',
            style: { ...ghostBtnStyle, color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.35)' },
            disabled: testingKeys,
            onClick: () => handleTestAllKeys(provider)
          }, ic('Zap', 12), testingKeys ? 'Testing...' : 'Test All Keys'),
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: () => {
              window.KeyPool?.clearCooldowns?.();
              if (typeof setKeyHealth === 'function') setKeyHealth({});
              toast('Cleared all key cooldowns and locks!', 'success');
            }
          }, ic('RotateCcw', 12), 'Clear Cooldowns'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: () => setBulkKeyModalOpen(true) }, ic('Clipboard', 12), 'Bulk Paste'),
          h('button', { type: 'button', style: primaryBtnStyle, onClick: () => addApiKey(provider) }, '+ Add Key')
        ),

        provKeysRaw.map(k => {
          const isActive = (activeKeyIds[provider] === k.id) || (provKeysRaw.length === 1);
          const isVisible = showKeys[k.id] || false;
          const firstWithThisKey = provKeysRaw.find(other => other.key && k.key && other.key.trim() === k.key.trim());
          const isDuplicate = firstWithThisKey && firstWithThisKey.id !== k.id;
          const hInfo = keyHealth[k.id];
          const poolStatus = window.KeyPool?.getKeyStatus?.(k.key);
          const showPoolBar = Boolean(hInfo || (poolStatus && (poolStatus.inFlight || poolStatus.isCooling)));
          const statusType = hInfo?.status || (poolStatus?.isCooling ? 'cooling' : (poolStatus?.inFlight ? 'inflight' : 'idle'));
          let statusMsg = hInfo?.message;
          if (!statusMsg && poolStatus?.isCooling) {
            const rem = poolStatus.coolSecondsRemaining || 0;
            const remLabel = rem > 120 ? `${Math.round(rem / 60)}m` : `${rem}s`;
            statusMsg = `In-Flight Cooldown (${remLabel} remaining)`;
          } else if (!statusMsg && poolStatus?.inFlight) {
            statusMsg = 'In-Flight (Leased by active worker)';
          }
          const colorMap = { ok: '#34D399', cooling: '#fbbf24', exhausted: '#f87171', inflight: activePalette.accent, testing: activePalette.accent, error: '#f87171' };

          return h('div', {
            key: k.id,
            style: { padding: '12px 0', borderBottom: '0.6px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
              h('input', {
                type: 'text',
                value: k.name || '',
                onChange: e => updateApiKey(provider, k.id, 'name', e.target.value),
                placeholder: 'Profile name (e.g. Work, Key 1)...',
                style: { ...inputStyle, flex: 1, minWidth: 110, fontFamily: 'inherit', fontWeight: 600 }
              }),
              isActive
                ? h('span', { style: { fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 5, background: activePalette.accent, color: activePalette.onAccent } }, 'Active')
                : h('button', { type: 'button', style: { ...ghostBtnStyle, padding: '5px 10px', fontSize: 11 }, onClick: () => setActiveKey(provider, k.id) }, 'Set Active'),
              isDuplicate && h('span', { style: { fontSize: 10.5, fontWeight: 700, color: '#f87171' } }, 'Duplicate'),
              h('button', {
                type: 'button',
                className: 'omni-circle-btn',
                disabled: !k.key || keyHealth[k.id]?.status === 'testing',
                onClick: () => testSingleKey(provider, k.key, k.id),
                title: 'Test key',
                style: { color: '#34D399' }
              }, keyHealth[k.id]?.status === 'testing' ? ic('Loader2', 14) : ic('Zap', 14)),
              h('button', {
                type: 'button',
                className: 'omni-circle-btn',
                disabled: !k.key,
                onClick: () => {
                  if (!k.key) return;
                  navigator.clipboard?.writeText(k.key).then(() => toast('Key copied to clipboard!', 'success')).catch(() => toast('Could not copy key', 'error'));
                },
                title: 'Copy key'
              }, ic('Copy', 14)),
              h('button', {
                type: 'button',
                className: 'omni-circle-btn',
                onClick: async () => {
                  try {
                    const clipText = await navigator.clipboard.readText();
                    if (clipText && clipText.trim()) {
                      updateApiKey(provider, k.id, 'key', clipText.trim());
                      toast('Pasted key from clipboard!', 'success');
                    } else {
                      toast('Clipboard is empty', 'info');
                    }
                  } catch (_) {
                    toast('Clipboard access denied. Please paste manually.', 'error');
                  }
                },
                title: 'Paste key'
              }, ic('Clipboard', 14)),
              h('button', {
                type: 'button',
                className: 'omni-circle-btn',
                onClick: () => setShowKeys(prev => ({ ...prev, [k.id]: !isVisible })),
                title: isVisible ? 'Hide key' : 'Show key'
              }, isVisible ? ic('EyeOff', 14) : ic('Eye', 14)),
              h('button', {
                type: 'button',
                className: 'omni-circle-btn',
                onClick: () => deleteApiKey(provider, k.id),
                title: 'Delete key',
                style: { color: '#f87171' }
              }, ic('Trash2', 14))
            ),
            h('input', {
              type: isVisible ? 'text' : 'password',
              value: k.key || '',
              onChange: e => updateApiKey(provider, k.id, 'key', e.target.value),
              placeholder: `Enter ${provider.toUpperCase()} API Key...`,
              style: { ...inputStyle, width: '100%' }
            }),
            showPoolBar && h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 11,
                fontWeight: 600,
                color: colorMap[statusType] || '#f87171'
              }
            },
              h('span', null, statusMsg),
              h('button', {
                type: 'button',
                onClick: () => testSingleKey(provider, k.key, k.id),
                style: { background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', fontSize: 10.5, cursor: 'pointer' }
              }, 'Re-test')
            )
          );
        })
      );
    }

    // ── Sub-View 4: Quality & Translation Memory ──
    if (activeSubView === 'quality') {
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Quality & Translation Memory', `${healthAuditEnabled ? 'Audit Active' : 'Audit Off'} · ${tmStats.totalUnits || 0} cached segments`),

        sectionTitle('QUALITY ASSURANCE & PROOFREADING', healthAuditEnabled ? 'ACTIVE' : 'DISABLED'),
        switchRow('Novel Health Auditor', healthAuditEnabled, (v) => { setHealthAuditEnabled(v); localStorage.setItem('healthAuditEnabled', String(v)); }),
        switchRow('Translation QA Proofreader', qaProofreaderEnabled, (v) => { setQaProofreaderEnabled(v); localStorage.setItem('qaProofreaderEnabled', String(v)); }),
        switchRow('CJK Untranslated Leak Detector', cjkLeakCheckEnabled, (v) => { setCjkLeakCheckEnabled(v); localStorage.setItem('cjkLeakCheckEnabled', String(v)); }),
        switchRow('Anti-MTL AI Refusal & Loop Gate', antiMtlGateEnabled, (v) => { setAntiMtlGateEnabled(v); localStorage.setItem('antiMtlGateEnabled', String(v)); }),
        switchRow('Cultural Lore & Footnotes', culturalFootnotesEnabled, (v) => { setCulturalFootnotesEnabled(v); localStorage.setItem('culturalFootnotesEnabled', String(v)); }),

        sectionTitle('TRANSLATION MEMORY & SNAPSHOTS', (translationMemoryEnabled || snapshotsEnabled) ? 'ACTIVE' : 'DISABLED'),
        switchRow('Translation Memory Bank (Exact & Fuzzy Cache)', translationMemoryEnabled, (v) => {
          setTranslationMemoryEnabled(v);
          window.__translationMemoryEnabled = v;
          localStorage.setItem('translationMemoryEnabled', String(v));
        }),
        switchRow('Automatic Chapter Snapshots & Diffs', snapshotsEnabled, (v) => {
          setSnapshotsEnabled(v);
          localStorage.setItem('snapshotsEnabled', String(v));
        }),

        h('div', { className: 'omni-hairline-strip', style: { marginTop: 14, marginBottom: 14 } },
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${tmStats.totalUnits || 0}`), h('div', { className: 'omni-stat-lbl' }, 'Segments')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${(tmStats.tokensSaved || 0).toLocaleString()}`), h('div', { className: 'omni-stat-lbl' }, 'Tokens Saved')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${tmStats.exactHits || 0}`), h('div', { className: 'omni-stat-lbl' }, 'Exact Hits')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${tmStats.fuzzyHits || 0}`), h('div', { className: 'omni-stat-lbl' }, 'Fuzzy Refs'))
        ),

        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, onClick: refreshTmStats }, ic('RefreshCw', 13), 'Refresh'),
          h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, onClick: handleExportTmx }, ic('Download', 13), 'Export TMX'),
          h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1, color: '#f87171' }, onClick: handleClearTm }, ic('Trash2', 13), 'Clear TM')
        )
      );
    }

    // ── Sub-View 5: Sources & Scraping Recipes ──
    if (activeSubView === 'sources') {
      const sourceCount = ((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length;
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Sources & Scraping Recipes', `${sourceCount} registered source plugins`),

        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('div', null,
            h('div', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'LNReader Source Plugins'),
            h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.48)', marginTop: 2 } }, 'Manage community source adapters and active site connectors')
          ),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: handleOpenSourcePluginsModal }, ic('Compass', 13), `Browse (${sourceCount})`)
        ),

        sectionTitle('CUSTOM SITES & SCRAPING RECIPES', null),
        (typeof window !== 'undefined' && window.SiteRecipeManagerCard)
          ? h(window.SiteRecipeManagerCard, {
              openSiteRecipeEditor: openSiteRecipeEditor || props.openSiteRecipeEditor,
              toast: props.toast || toast,
              confirmAction: props.confirmAction || confirmAction
            })
          : h('div', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.5)', padding: '12px 0' } }, 'Site recipe manager ready.')
      );
    }

    // ── Sub-View 6: Cloud Sync, Storage & Full Backup ──
    if (activeSubView === 'backup') {
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Cloud Sync, Storage & Backup', `${cloudProvider === 'gdrive' ? 'Google Drive' : 'WebDAV'} · ${webImportHistory?.length || 0} books`),

        sectionTitle('CLOUD BACKUP & SYNC', cloudProvider === 'gdrive' ? 'GOOGLE DRIVE' : 'WEBDAV / NAS'),
        h('div', { className: 'seg', style: { marginBottom: 14 } },
          h('button', { type: 'button', className: `seg-btn ${cloudProvider === 'gdrive' ? 'on' : ''}`, onClick: () => setCloudProvider('gdrive') }, 'Google Drive Sync'),
          h('button', { type: 'button', className: `seg-btn ${cloudProvider === 'webdav' ? 'on' : ''}`, onClick: () => setCloudProvider('webdav') }, 'WebDAV (Nextcloud / NAS)')
        ),

        cloudProvider === 'gdrive' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: '0.6px solid rgba(255,255,255,0.08)' } },
          h('div', { style: { padding: '8px 0' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
              h('span', { style: { fontSize: 13, fontWeight: 700, color: '#F5F5F5' } }, '1-Tap Google Drive Backup'),
              h('span', { style: { fontSize: 10.5, color: '#34D399', fontWeight: 700 } }, 'Zero Setup')
            ),
            h('p', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.55)', margin: '0 0 10px', lineHeight: 1.45 } },
              'Save and restore your full library, settings, and glossaries directly to a Drive folder via system storage.'
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { type: 'button', style: { ...primaryBtnStyle, flex: 1 }, onClick: backupToGoogleDriveFile }, ic('Save', 13), 'Save to Drive Folder'),
              h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, onClick: () => document.getElementById('full-backup-input')?.click() }, ic('Download', 13), 'Restore File')
            )
          ),

          h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '12px 0' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { width: 8, height: 8, borderRadius: 2, background: gdriveConnected ? '#34D399' : 'var(--omni-text-muted)' } }),
              h('div', null,
                h('div', { style: { fontSize: 12.5, fontWeight: 600, color: '#F5F5F5' } },
                  gdriveConnected ? (gdriveUser?.displayName || gdriveUser?.emailAddress || 'Connected to Google Drive') : 'Not Connected (Direct OAuth API)'
                ),
                h('div', { style: { fontSize: 10.5, color: 'rgba(255,255,255,0.48)' } },
                  gdriveConnected ? (gdriveUser?.emailAddress || 'Google Cloud OAuth active') : 'Optional background REST API sync'
                )
              )
            ),
            gdriveConnected
              ? h('button', { type: 'button', style: { ...ghostBtnStyle, color: '#f87171', padding: '6px 10px', fontSize: 11 }, onClick: disconnectGoogleDrive }, 'Disconnect')
              : h('button', { type: 'button', style: { ...ghostBtnStyle, padding: '6px 10px', fontSize: 11 }, onClick: connectGoogleDrive }, 'Connect OAuth')
          ),

          gdriveConnected && gdriveUser && (gdriveUser.quotaLimit > 0 || gdriveUser.storageQuota) && h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.55)' } },
            h('span', null, 'Drive Quota'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } }, window.GoogleDriveSync?.formatQuota?.(gdriveUser.storageQuota || gdriveUser) || '')
          ),

          h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '12px 0' } },
            h('span', { style: { fontSize: 12.5, color: '#F5F5F5' } }, 'Drive Storage Mode'),
            h('select', { style: selectStyle, value: gdriveFolderMode, onChange: e => setGdriveFolderMode(e.target.value) },
              h('option', { value: 'appDataFolder' }, 'Private App Folder (drive.appdata)'),
              h('option', { value: 'visibleFolder' }, 'GeminiTranslator Folder (drive.file)')
            )
          ),

          switchRow('Auto-Backup on Translation Finish', gdriveAutoSync, (v) => {
            setGdriveAutoSync(v);
            localStorage.setItem('gdrive_auto_sync', String(v));
          }),

          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } },
            h('span', null, 'Last Drive Sync'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } }, gdriveLastSync || 'Never synced')
          ),

          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: gdriveTesting || !gdriveConnected, onClick: testGoogleDriveConnection }, ic('Zap', 12), gdriveTesting ? 'Testing...' : 'Test'),
            h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: gdriveSyncing || !gdriveConnected, onClick: backupToGoogleDrive }, ic('Upload', 12), gdriveSyncing ? 'Syncing...' : 'Backup'),
            h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: gdriveSyncing || !gdriveConnected, onClick: restoreFromGoogleDrive }, ic('Download', 12), 'Restore'),
            h('button', { type: 'button', style: ghostBtnStyle, onClick: () => setGdriveConfigModalOpen(true), title: 'Client ID Settings' }, ic('Settings', 14))
          )
        ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: '0.6px solid rgba(255,255,255,0.08)' } },
          h('div', null,
            h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'SERVER WEBDAV URL'),
            h('input', { type: 'text', placeholder: 'https://cloud.example.com/remote.php/dav/files/username/', value: webdavUrl, onChange: e => setWebdavUrl(e.target.value.trim()), style: { ...inputStyle, width: '100%' } })
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            h('div', null,
              h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'USERNAME'),
              h('input', { type: 'text', placeholder: 'Username', value: webdavUser, onChange: e => setWebdavUser(e.target.value.trim()), style: { ...inputStyle, width: '100%' } })
            ),
            h('div', null,
              h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'APP PASSWORD'),
              h('input', { type: 'password', placeholder: 'App Password / Token', value: webdavPass, onChange: e => setWebdavPass(e.target.value.trim()), style: { ...inputStyle, width: '100%' } })
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)', marginBottom: 4 } }, 'REMOTE FOLDER NAME'),
            h('input', { type: 'text', placeholder: 'GeminiTranslator', value: webdavPath, onChange: e => setWebdavPath(e.target.value.trim()), style: { ...inputStyle, width: '100%' } })
          ),
          switchRow('Auto-Backup on Translation Finish', webdavAutoSync, (v) => {
            setWebdavAutoSync(v);
            localStorage.setItem('webdavAutoSync', String(v));
          }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } },
            h('span', null, 'Last Cloud Sync'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } }, webdavLastSync || 'Never synced')
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: webdavTesting, onClick: testWebDavConnection }, ic('Zap', 12), webdavTesting ? 'Testing...' : 'Test Link'),
            h('button', { type: 'button', style: { ...primaryBtnStyle, flex: 1 }, disabled: webdavSyncing, onClick: backupToWebDav }, ic('Upload', 12), webdavSyncing ? 'Syncing...' : 'Backup'),
            h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: webdavSyncing, onClick: restoreFromWebDav }, ic('Download', 12), 'Restore')
          )
        ),

        sectionTitle('LOCAL ARCHIVE & STORAGE', storageLoading ? 'Estimating...' : (storageDiag.available ? `${storageDiag.usedMB} MB (${storageDiag.pct}%)` : 'Ready')),
        storageDiag.available && h('div', {
          style: { width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }
        },
          h('div', { style: { width: `${Math.max(1, storageDiag.pct)}%`, height: '100%', background: storageDiag.pct > 85 ? '#ef4444' : activePalette.accent } })
        ),
        h('div', { className: 'omni-hairline-strip', style: { marginBottom: 12 } },
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${webImportHistory?.length || 0}`), h('div', { className: 'omni-stat-lbl' }, 'Books')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, `${(window.SwiftAudioEngine?.Library?.getAllBooks?.() || []).length || 0}`), h('div', { className: 'omni-stat-lbl' }, 'Audio')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val', style: { color: trashCount > 0 ? '#f87171' : undefined } }, `${trashCount}`), h('div', { className: 'omni-stat-lbl' }, 'Trash')),
          h('div', { className: 'omni-stat-cell' }, h('div', { className: 'omni-stat-val' }, storageDiag.available ? `${(storageDiag.quotaMB / 1024).toFixed(1)}G` : 'Auto'), h('div', { className: 'omni-stat-lbl' }, 'Quota'))
        ),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
          h('button', { type: 'button', style: { ...ghostBtnStyle, flex: 1 }, disabled: storageLoading, onClick: () => refreshStorageDiag() }, ic('RefreshCw', 12), storageLoading ? 'Estimating...' : 'Refresh'),
          h('button', {
            type: 'button',
            style: { ...ghostBtnStyle, flex: 1, color: trashCount > 0 ? '#f87171' : 'rgba(255,255,255,0.4)' },
            disabled: trashCount === 0,
            onClick: () => {
              if (trashCount === 0) return toast('Recycle bin is already empty.', 'info');
              confirmAction(`Permanently empty ${trashCount} item(s) from Recycle Bin? This cannot be undone.`, async () => {
                await handleEmptyTrash();
                await refreshStorageDiag();
              });
            }
          }, ic('Trash2', 12), 'Empty Trash'),
          h('button', {
            type: 'button',
            style: { ...ghostBtnStyle, flex: 1 },
            onClick: () => {
              try {
                sessionStorage.clear();
                if (window.crawlCache) window.crawlCache = {};
                toast('Session and temporary cache cleared! Saved novels and settings remain safe.', 'success');
                refreshStorageDiag();
              } catch (e) {
                toast('Cache clear error: ' + e.message, 'error');
              }
            }
          }, ic('RotateCcw', 12), 'Clear Cache')
        ),
        switchRow('Pointer Mode: Zero-Waste Storage', pointerMode, (v) => {
          setPointerMode(v);
          localStorage.setItem('gemini_storage_pointer_mode', String(v));
          toast(v ? 'Pointer Mode: ON (links directly to disk files to save 99% storage)' : 'Pointer Mode: OFF (stores full text in app database)', 'info');
        }),
        switchRow('Smart Update Cache (15 min grace window)', updateGraceWindow, (v) => {
          setUpdateGraceWindow(v);
          localStorage.setItem('gemini_update_grace_window', String(v));
          toast(v ? 'Smart Update Cache: ON (skips books checked within 15 min)' : 'Smart Update Cache: OFF (always checks freshly)', 'info');
        }),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('div', { style: { minWidth: 0, flex: 1, paddingRight: 10 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Clean Up Internal Storage'),
            h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.48)', marginTop: 2 } }, 'Converts exported books into lightweight file pointers')
          ),
          h('button', { type: 'button', style: ghostBtnStyle, disabled: optimizingStorage, onClick: handleOptimizeStorage }, ic('Zap', 12), optimizingStorage ? 'Optimizing...' : 'Optimize Now')
        ),

        sectionTitle('FULL APP BACKUP & RESTORE', 'JSON + Keys + Artwork'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4 } },
          h('button', { type: 'button', style: primaryBtnStyle, onClick: () => exportFullBackup(true) }, ic('Save', 13), 'Export + Keys'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: () => exportFullBackup(false) }, ic('FileDown', 13), 'Export Safe'),
          h('label', { style: { ...ghostBtnStyle, cursor: 'pointer' } },
            ic('Upload', 13), 'Import File',
            h('input', {
              id: 'full-backup-input',
              type: 'file',
              accept: '.json',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files && e.target.files[0];
                if (f) importFullBackup({ target: { files: [f] } });
              }
            })
          ),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: pasteAndRestoreBackup }, ic('Clipboard', 13), 'Paste & Restore')
        )
      );
    }

    // ── Sub-View 7: Hardware, Telemetry & App Build ──
    if (activeSubView === 'system') {
      return h('div', { style: { paddingBottom: 32 } },
        subHeader('Hardware, Telemetry & System', `v${appVersion} (Build ${appVersionCode || 8564})`),

        availableUpdate && h('div', {
          style: {
            padding: '12px 0',
            borderBottom: '0.6px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }
        },
          h('div', null,
            h('div', { style: { fontSize: 13, fontWeight: 700, color: '#34D399' } }, `Update Ready: v${availableUpdate.version || ''}`),
            h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.55)' } }, 'Tap Install to update cleanly.')
          ),
          typeof handlePerformUpdate === 'function' && h('button', {
            type: 'button',
            style: primaryBtnStyle,
            disabled: !!isUpdating,
            onClick: handlePerformUpdate
          }, isUpdating ? 'Updating...' : 'Install Update')
        ),

        sectionTitle('HARDWARE & KEEP-AWAKE', null),
        switchRow('Keep Screen & Device Awake (WakeLock)', deviceWakeLock, (v) => {
          setDeviceWakeLock(v);
          localStorage.setItem('deviceWakeLock', String(v));
          if (!v && window.NativeBridge?.releaseWakeLock) window.NativeBridge.releaseWakeLock();
        }),
        switchRow('Show Live Logs on Translate Tab', showLiveLogs, setShowLiveLogs),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'System & API Logs'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: () => setLogsModalOpen(true) }, ic('FileText', 13), 'View Live Logs')
        ),

        sectionTitle('LIVE AGENT TELEMETRY (LOCAL WI-FI)', telemetryStatus === 'connected' ? 'CONNECTED' : null),
        switchRow('Stream Real-time Logs to Agent (PC)', telemetryEnabled, (v) => {
          setTelemetryEnabled(v);
          localStorage.setItem('telemetry_enabled', String(v));
          window.updateTelemetryConfig?.({ enabled: v });
          toast(v ? 'Live telemetry enabled!' : 'Live telemetry disabled.', 'info');
        }),
        switchRow('Deep Debugging (Buttons & Background)', telemetryVerbose, (v) => {
          setTelemetryVerbose(v);
          localStorage.setItem('telemetry_verbose', String(v));
          window.updateTelemetryConfig?.({ verbose: v });
          window.telemetryLog?.('CONFIG', `Deep Debugging set to ${v}`);
          toast(v ? 'Deep Debugging enabled!' : 'Standard telemetry enabled.', 'info');
        }),
        h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.48)' } }, 'PC TELEMETRY SERVER URL'),
          h('input', {
            type: 'text',
            placeholder: 'http://192.168.1.216:9090',
            value: telemetryServerUrl,
            onChange: e => {
              const val = e.target.value.trim();
              setTelemetryServerUrl(val);
              localStorage.setItem('telemetry_server_url', val);
              window.updateTelemetryConfig?.({ serverUrl: val });
            },
            style: { ...inputStyle, width: '100%' }
          }),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', style: { ...primaryBtnStyle, flex: 1 }, disabled: telemetryTesting, onClick: handleTestTelemetryConnection }, ic('Zap', 12), telemetryTesting ? 'Testing...' : 'Test Connection'),
            h('button', { type: 'button', style: ghostBtnStyle, onClick: handleClearTelemetryServer }, ic('Trash2', 12), 'Clear Logs')
          ),
          telemetryStatusMsg && h('div', { style: { fontSize: 11, color: telemetryStatus === 'connected' ? '#34D399' : '#f87171' } }, telemetryStatusMsg)
        ),

        sectionTitle('APP BUILD & ANDROID PERMISSIONS', `v${appVersion}`),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Check for App Updates'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: () => checkForAppUpdate(true) }, ic('RefreshCw', 13), `v${appVersion} (${appVersionCode || 8564})`)
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Notifications & Completion Alerts'),
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: async () => {
              const granted = await window.NativeBridge?.requestNotificationPermission?.();
              if (granted) {
                toast('Notifications enabled!', 'success');
                window.NativeBridge?.showCompletionNotification?.('Gemini Notifications Active', 'Completion alerts with sound & vibration are ready.');
              } else {
                toast('Notification permission not granted. Check Android App Permissions.', 'warning');
              }
            }
          }, ic('AlertCircle', 13), 'Enable Alerts')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Background Execution (Battery)'),
          h('button', {
            type: 'button',
            style: ghostBtnStyle,
            onClick: async () => {
              const isIgnored = await window.NativeBridge?.isBatteryOptimizationIgnored?.();
              if (isIgnored) {
                toast('Battery optimization is already unrestricted!', 'success');
              } else {
                toast('Opening Battery Settings - select Unrestricted for uninterrupted background tasks.', 'info');
                await window.NativeBridge?.requestIgnoreBatteryOptimizations?.();
              }
            }
          }, ic('Zap', 13), 'Unrestricted')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Install Web App (PWA)'),
          h('button', { type: 'button', style: ghostBtnStyle, onClick: handleInstallPWA }, 'Install')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Force Refresh & Clear Stale Cache'),
          h('button', {
            type: 'button',
            style: { ...ghostBtnStyle, color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' },
            onClick: async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const reg of regs) await reg.unregister();
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  for (const key of keys) await caches.delete(key);
                }
              } catch (_) {}
              localStorage.setItem('gemini_force_reload', Date.now());
              window.location.reload(true);
            }
          }, ic('RefreshCw', 13), 'Force Clear Cache')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Reset Settings to Defaults'),
          h('button', { type: 'button', style: { ...ghostBtnStyle, color: '#f87171' }, onClick: handleResetSettings }, ic('RotateCcw', 13), 'Reset Settings')
        ),
        h('div', { className: 'omni-hairline-row', style: { justifyContent: 'space-between', padding: '14px 0' } },
          h('span', { style: { fontSize: 13.5, fontWeight: 500, color: '#F5F5F5' } }, 'Keyboard Shortcuts'),
          h('span', { style: { fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.5)' } }, 'Ctrl+Enter · Ctrl+Shift+C · Ctrl+Alt+R')
        )
      );
    }

    // ── Main Drill-Down Settings Hub ──
    const provKeysCount = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim()).length;
    const activeModelDisplay = provider === 'gemini'
      ? (useCustomModel ? (customModel || 'Custom') : geminiModel)
      : (provider === 'deepseek' ? (useCustomDeepseekModel ? (customDeepseekModel || 'Custom') : deepseekModel) : provider);
    const sourceCount = ((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length;

    const MENU_GROUPS = [
      {
        heading: 'APPEARANCE & LAYOUT',
        rows: [
          {
            id: 'visual',
            icon: 'Palette',
            title: 'Visual Presentation & Colors',
            sub: `${activePalette.name} · ${omniPrefs.libraryLayout === 'editorial' ? 'Editorial' : 'Minimal'} · ${omniPrefs.detailsHeader === 'jacket' ? 'Jacket' : 'Split'} · ${omniPrefs.discoverLayout === 'sources' ? 'Sources' : (omniPrefs.discoverLayout === 'grid' ? 'Grid' : 'Rails')}`,
            keywords: 'palette monochrome gold ocean violet custom hex theme blur sheen radius carousel editorial minimal layout wireframe showcase amoled'
          },
          {
            id: 'display',
            icon: 'BookOpen',
            title: 'Reader, EPUB & Speech',
            sub: `${amoledMode ? 'AMOLED Pitch Black' : 'Elevated Dark'} · ${epubFontTheme || 'Literata'} · OPDS ${opdsRunning ? 'Online' : 'Idle'} · Voices`,
            keywords: 'amoled black epub images drop caps smart quotes clean web justify filename font literata georgia moon reader opds catalog feed tts voice sherpatts piper'
          }
        ]
      },
      {
        heading: 'AI & TRANSLATION ENGINE',
        rows: [
          {
            id: 'engine',
            icon: 'Brain',
            title: 'AI Provider, Models & API Keys',
            sub: `${(provider || 'gemini').toUpperCase()} · ${activeModelDisplay} · ${provKeysCount} key slot${provKeysCount === 1 ? '' : 's'}`,
            keywords: 'provider gemini deepseek openai claude deepl libre model custom model id streaming thinking strict fallback ladder concurrency parallel streams chunk size api keys bulk paste cooldown rotation'
          },
          {
            id: 'quality',
            icon: 'Shield',
            title: 'Quality & Translation Memory',
            sub: `${healthAuditEnabled ? 'Audit Active' : 'Audit Off'} · ${tmStats.totalUnits || 0} TM segments · ${snapshotsEnabled ? 'Snapshots On' : 'Snapshots Off'}`,
            keywords: 'quality health auditor proofreader cjk leak anti mtl footnotes translation memory tm cache snapshots diffs export tmx clear'
          },
          {
            id: 'sources',
            icon: 'Compass',
            title: 'Sources & Scraping Recipes',
            sub: `${sourceCount} LNReader plugins · Custom site extraction rules`,
            keywords: 'sources lnreader plugins custom sites scraping recipes extractor css selector'
          }
        ]
      },
      {
        heading: 'SYNC, STORAGE & SYSTEM',
        rows: [
          {
            id: 'backup',
            icon: 'Cloud',
            title: 'Cloud Sync, Storage & Backup',
            sub: `${cloudProvider === 'gdrive' ? 'Google Drive' : 'WebDAV'} · ${storageDiag.available ? `${storageDiag.usedMB} MB used` : `${webImportHistory?.length || 0} books`} · Full JSON Export`,
            keywords: 'cloud google drive oauth 1-tap webdav nextcloud nas storage diagnostics pointer mode optimize recycle bin trash export import backup restore'
          },
          {
            id: 'system',
            icon: 'Settings',
            title: 'Hardware, Telemetry & System',
            sub: `v${appVersion} (Build ${appVersionCode || 8564}) · WakeLock ${deviceWakeLock ? 'On' : 'Off'}`,
            keywords: 'wakelock keep awake live logs telemetry server debugging update apk force clear cache notifications battery unrestricted pwa install reset shortcuts'
          }
        ]
      }
    ];

    const q = settingsQuery.trim().toLowerCase();

    return h('div', { style: { paddingBottom: 32 } },
      // Header Row
      h('div', { className: 'omni-page-hd' },
        h('div', { style: { minWidth: 0 } },
          h('h1', { className: 'omni-page-title' }, 'Settings'),
          h('div', { className: 'omni-page-sub' }, `v${appVersion} (Build ${appVersionCode || 8564}) · ${amoledMode ? 'AMOLED Pitch Black' : 'Elevated Dark'}`)
        ),
        h('div', { className: 'omni-header-actions' },
          h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            onClick: () => checkForAppUpdate(true),
            title: 'Check for updates'
          }, ic('RefreshCw', 16)),
          h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            onClick: handleResetSettings,
            title: 'Reset settings to defaults'
          }, ic('RotateCcw', 16))
        )
      ),

      // Update ready hairline notice (only shown when remote update is detected)
      availableUpdate && h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 0',
          marginBottom: 12,
          borderTop: '0.6px solid rgba(255,255,255,0.08)',
          borderBottom: '0.6px solid rgba(255,255,255,0.08)'
        }
      },
        h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#34D399' } }, `Update v${availableUpdate.version || ''} available`),
        typeof handlePerformUpdate === 'function' && h('button', {
          type: 'button',
          style: { ...primaryBtnStyle, padding: '6px 12px', fontSize: 11.5 },
          disabled: !!isUpdating,
          onClick: handlePerformUpdate
        }, isUpdating ? 'Updating...' : 'Install')
      ),

      // Flat 6px Search Bar
      h('div', { className: 'omni-search-bar', style: { marginBottom: 14 } },
        ic('Search', 15),
        h('input', {
          type: 'search',
          placeholder: 'Search themes, models, keys, OPDS, backup, WakeLock...',
          value: settingsQuery,
          onChange: e => setSettingsQuery(e.target.value)
        }),
        settingsQuery && h('button', {
          type: 'button',
          onClick: () => setSettingsQuery(''),
          style: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 2 }
        }, ic('X', 14))
      ),

      // Compact Quick Status Toggles (when search is empty)
      !q && h('div', {
        style: {
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          paddingBottom: 14,
          borderBottom: '0.6px solid rgba(255, 255, 255, 0.08)'
        }
      },
        [
          {
            label: 'Downloaded Only',
            active: !!downloadedOnly,
            icon: 'Download',
            onToggle: () => {
              const next = !downloadedOnly;
              setDownloadedOnly(next);
              localStorage.setItem('downloadedOnly', String(next));
            }
          },
          {
            label: 'Incognito',
            active: !!incognitoMode,
            icon: 'EyeOff',
            onToggle: () => {
              const next = !incognitoMode;
              setIncognitoMode(next);
              localStorage.setItem('incognitoMode', String(next));
            }
          },
          {
            label: 'Stream',
            active: !!enableStreaming,
            icon: 'Zap',
            onToggle: () => {
              const next = !enableStreaming;
              setEnableStreaming(next);
            }
          },
          {
            label: 'Thinking',
            active: !!enableThinking,
            icon: 'Brain',
            onToggle: () => {
              const next = !enableThinking;
              setEnableThinking(next);
              localStorage.setItem('enableThinking', String(next));
            }
          }
        ].map(chip => h('button', {
          key: chip.label,
          type: 'button',
          onClick: chip.onToggle,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 13px',
            borderRadius: 999,
            background: chip.active ? activePalette.accent : 'rgba(255, 255, 255, 0.07)',
            color: chip.active ? activePalette.onAccent : 'var(--p-ink, #F5F6F8)',
            border: 'none',
            fontSize: 12,
            fontWeight: chip.active ? 750 : 600,
            cursor: 'pointer'
          }
        }, ic(chip.icon, 13), chip.label))
      ),

      // Names-Only Edge-to-Edge Hairline Menu Groups (Zero Boxed Outlines)
      MENU_GROUPS.map(group => {
        const filteredRows = group.rows.filter(r => {
          if (!q) return true;
          return (
            r.title.toLowerCase().includes(q) ||
            r.sub.toLowerCase().includes(q) ||
            r.keywords.toLowerCase().includes(q)
          );
        });
        if (filteredRows.length === 0) return null;

        return h('div', { key: group.heading, style: { marginTop: 18 } },
          h('div', { className: 'p-section-label', style: { padding: '6px 2px 6px' } }, group.heading),
          h('div', null,
            filteredRows.map((row) => h('button', {
              key: row.id,
              type: 'button',
              className: 'p-row',
              onClick: () => setActiveSubView(row.id)
            },
              h('span', {
                style: {
                  color: activePalette.accent,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  flexShrink: 0
                }
              }, ic(row.icon, 19)),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { className: 'p-row-title' }, row.title)
              ),
              h('span', { style: { color: 'var(--p-dim)', flexShrink: 0 } }, ic('ChevronRight', 17))
            ))
          )
        );
      })
    );
  }

  return { TabSettings };
}));
