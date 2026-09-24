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
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = window.toast || function() {};
    const ic = window.ic || function() { return null; };
    const btn = window.btn || function(p, ...ch) { return h('button', p, ...ch); };

    const switchRow = (label, checked, onChange) => h('div', { className: 'set-row' },
      h('span', { className: 'l' }, label),
      h('button', { type: 'button', className: `switch ${checked ? 'on' : ''}`, onClick: () => onChange(!checked), 'aria-pressed': checked })
    );

    const chipSelectStyle = { background: 'var(--void)', border: '1px solid var(--hairline)', color: 'var(--paper-dim)', borderRadius: 8, padding: '4px 6px', fontSize: 11, outline: 'none', maxWidth: 170 };
    const fontThemes = [{ id: 'literata', label: 'Literata' }, { id: 'georgia', label: 'Georgia' }, { id: 'inter', label: 'Inter' }, { id: 'none', label: 'Default' }];

    const {
      appVersion,
      appVersionCode,
      checkForAppUpdate,
      downloadedOnly,
      setDownloadedOnly,
      incognitoMode,
      setIncognitoMode,
      settingsCategory,
      setSettingsCategory,
      provider,
      setProvider,
      apiKeysByProvider,
      activeKeyIds,
      showKeys,
      setShowKeys,
      addApiKey,
      deleteApiKey,
      updateApiKey,
      setActiveKey,
      testSingleKey,
      handleTestAllKeys,
      keyHealth,
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
      tmStats,
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
      storageDiag,
      storageLoading,
      refreshStorageDiag,
      history,
      webImportHistory,
      exportFullBackup,
      importFullBackup,
      pasteAndRestoreBackup,
      trashCount,
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
      DEFAULT_GEMINI_MODELS,
      DEFAULT_DEEPSEEK_MODELS
    } = props;

                  const SETTINGS_CATEGORIES = [
                { id: 'engine', label: '🌐 Engine & Keys' },
                { id: 'quality', label: '🩺 Quality & TM' },
                { id: 'display', label: '🎨 Reader & Display' },
                { id: 'backup', label: '💾 Backup & Storage' },
                { id: 'all', label: '📋 All Settings' }
              ];

              return h(React.Fragment, null,
                // Top Quick Status & Mihon-Style Toggles
                h('div', {
                  className: 'card',
                  style: {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    marginBottom: 10,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 18 } }, '📱'),
                      h('div', null,
                        h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)' } }, 'Gemini Novel Studio & Reader'),
                        h('div', { style: { fontSize: 10.5, color: 'var(--slate)' } }, `v${appVersion} (Build ${appVersionCode || 8228}) · Pure AMOLED Black`)
                      )
                    ),
                    h('button', {
                      type: 'button',
                      className: 'chip-act',
                      style: { fontSize: 10.5, padding: '3px 8px' },
                      onClick: () => checkForAppUpdate(true)
                    }, '🔄 Updates')
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                    h('div', {
                      style: {
                        background: downloadedOnly ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: downloadedOnly ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--hairline)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      },
                      onClick: () => {
                        const next = !downloadedOnly;
                        setDownloadedOnly(next);
                        localStorage.setItem('downloadedOnly', String(next));
                        toast(next ? '📥 Downloaded only: ON' : '📥 Downloaded only: OFF', 'info');
                      }
                    },
                      h('div', { style: { fontSize: 11.5, fontWeight: 600, color: downloadedOnly ? 'var(--iris)' : 'var(--paper)' } }, '📥 Downloaded only'),
                      h('button', { type: 'button', className: `switch ${downloadedOnly ? 'on' : ''}`, style: { pointerEvents: 'none' } })
                    ),
                    h('div', {
                      style: {
                        background: incognitoMode ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: incognitoMode ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid var(--hairline)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      },
                      onClick: () => {
                        const next = !incognitoMode;
                        setIncognitoMode(next);
                        localStorage.setItem('incognitoMode', String(next));
                        toast(next ? '🕶️ Incognito mode: ON (history paused)' : '🕶️ Incognito mode: OFF', 'info');
                      }
                    },
                      h('div', { style: { fontSize: 11.5, fontWeight: 600, color: incognitoMode ? '#ec4899' : 'var(--paper)' } }, '🕶️ Incognito mode'),
                      h('button', { type: 'button', className: `switch ${incognitoMode ? 'on' : ''}`, style: { pointerEvents: 'none' } })
                    ),
                    h('div', {
                      style: {
                        background: enableStreaming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: enableStreaming ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--hairline)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      },
                      onClick: () => {
                        const next = !enableStreaming;
                        setEnableStreaming(next);
                        toast(next ? '⚡ Typewriter streaming: ON' : '⚡ Typewriter streaming: OFF', 'info');
                      }
                    },
                      h('div', { style: { fontSize: 11.5, fontWeight: 600, color: enableStreaming ? '#10b981' : 'var(--paper)' } }, '⚡ Stream tokens'),
                      h('button', { type: 'button', className: `switch ${enableStreaming ? 'on' : ''}`, style: { pointerEvents: 'none' } })
                    ),
                    h('div', {
                      style: {
                        background: enableThinking ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: enableThinking ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--hairline)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      },
                      onClick: () => {
                        const next = !enableThinking;
                        setEnableThinking(next);
                        localStorage.setItem('enableThinking', String(next));
                        toast(next ? '🧠 Extended Thinking: ON' : '🧠 Extended Thinking: OFF', 'info');
                      }
                    },
                      h('div', { style: { fontSize: 11.5, fontWeight: 600, color: enableThinking ? '#c084fc' : 'var(--paper)' } }, '🧠 Thinking AI'),
                      h('button', { type: 'button', className: `switch ${enableThinking ? 'on' : ''}`, style: { pointerEvents: 'none' } })
                    )
                  )
                ),

                // Settings Category Group Switcher
                h('div', {
                  style: {
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    paddingBottom: 8,
                    marginBottom: 12,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none'
                  }
                },
                  SETTINGS_CATEGORIES.map(cat => {
                    const isCatActive = settingsCategory === cat.id;
                    return h('button', {
                      key: cat.id,
                      type: 'button',
                      className: `chip-act ${isCatActive ? 'active' : ''}`,
                      style: {
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: isCatActive ? 700 : 500,
                        whiteSpace: 'nowrap',
                        borderRadius: 20,
                        background: isCatActive ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                        color: isCatActive ? '#fff' : 'var(--slate)',
                        border: isCatActive ? '1px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        flexShrink: 0
                      },
                      onClick: () => {
                        setSettingsCategory(cat.id);
                        try { localStorage.setItem('gemini_settings_category', cat.id); } catch(e) {}
                      }
                    }, cat.label);
                  })
                ),

                // ═══ GROUP 1: ENGINE & API KEYS ═══
                (settingsCategory === 'engine' || settingsCategory === 'all') && h(React.Fragment, null,
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'TRANSLATION ENGINE')
                ),
                h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, provider.toUpperCase())
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Engine Configuration')),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Active Provider'),
                  h('select', { className: 'chip', style: chipSelectStyle, value: provider, onChange: e => setProvider(e.target.value) },
                    h('option', { value: 'gemini' }, 'Gemini'),
                    h('option', { value: 'deepseek' }, 'DeepSeek'),
                    h('option', { value: 'openai' }, 'OpenAI'),
                    h('option', { value: 'claude' }, 'Claude'),
                    h('option', { value: 'deepl' }, 'DeepL'),
                    h('option', { value: 'libre' }, 'LibreTranslate')
                  )
                ),
                provider === 'gemini' && h(React.Fragment, null,
                  h('div', { className: 'set-row' },
                    h('span', { className: 'l' }, 'Gemini Model'),
                    h('select', { 
                      className: 'chip', 
                      style: chipSelectStyle, 
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
                      h('option', { value: 'custom' }, '✍️ Custom Model (Enter Manually…)')
                    )
                  ),
                  useCustomModel && h('div', { className: 'set-row', style: { paddingTop: 4 } },
                    h('span', { className: 'l', style: { fontSize: 11, color: 'var(--slate)' } }, 'Custom Model ID'),
                    h('input', {
                      type: 'text',
                      placeholder: 'e.g. gemini-3.8-flash',
                      value: customModel,
                      onChange: e => {
                        const val = e.target.value.trim();
                        setCustomModel(val);
                        localStorage.setItem('customModel', val);
                      },
                      style: {
                        background: 'var(--void)',
                        border: '1px solid var(--accent, #6366f1)',
                        color: 'var(--paper)',
                        borderRadius: 8,
                        padding: '5px 8px',
                        fontSize: 11,
                        outline: 'none',
                        width: 180,
                        fontFamily: "'IBM Plex Mono', monospace"
                      }
                    })
                  )
                ),
                provider === 'deepseek' && h(React.Fragment, null,
                  h('div', { className: 'set-row' },
                    h('span', { className: 'l' }, 'DeepSeek Model'),
                    h('select', { 
                      className: 'chip', 
                      style: chipSelectStyle, 
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
                      h('option', { value: 'custom' }, '✍️ Custom Model (Enter Manually…)')
                    )
                  ),
                  useCustomDeepseekModel && h('div', { className: 'set-row', style: { paddingTop: 4 } },
                    h('span', { className: 'l', style: { fontSize: 11, color: 'var(--slate)' } }, 'Custom DeepSeek ID'),
                    h('input', {
                      type: 'text',
                      placeholder: 'e.g. deepseek-chat',
                      value: customDeepseekModel,
                      onChange: e => {
                        const val = e.target.value.trim();
                        setCustomDeepseekModel(val);
                        localStorage.setItem('customDeepseekModel', val);
                      },
                      style: {
                        background: 'var(--void)',
                        border: '1px solid var(--accent, #6366f1)',
                        color: 'var(--paper)',
                        borderRadius: 8,
                        padding: '5px 8px',
                        fontSize: 11,
                        outline: 'none',
                        width: 180,
                        fontFamily: "'IBM Plex Mono', monospace"
                      }
                    })
                  )
                ),
                provider === 'libre' && h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'LibreTranslate URL'),
                  h('input', { type: 'text', value: libreUrl, onChange: e => { setLibreUrl(e.target.value); localStorage.setItem('libreUrl', e.target.value); }, style: { background: 'var(--void)', border: '1px solid var(--hairline)', color: 'var(--paper-dim)', borderRadius: 8, padding: '5px 8px', fontSize: 11, outline: 'none', maxWidth: 200, fontFamily: "'IBM Plex Mono', monospace" } })
                ),
                switchRow('Typewriter Streaming', enableStreaming, setEnableStreaming),
                switchRow('Extended Thinking', enableThinking, (v) => { setEnableThinking(v); localStorage.setItem('enableThinking', v); }),
                switchRow('Strict Model (No Fallbacks)', strictModel, (v) => { setStrictModel(v); localStorage.setItem('strictModel', String(v)); }),
                switchRow('Context-Aware Memory', contextAware, setContextAware),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Parallel Streams'),
                  h('div', { className: 'slider-row', style: { flex: 1, maxWidth: 190 } },
                    h('input', { type: 'range', min: 1, max: 20, value: concurrency, onChange: e => setConcurrency(parseInt(e.target.value)) }),
                    h('span', { className: 'val' }, concurrency)
                  )
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Chunk Size Preset'),
                  h('select', {
                    value: chunkSizePreset,
                    onChange: e => {
                      setChunkSizePreset(e.target.value);
                      localStorage.setItem('chunkSizePreset', e.target.value);
                    },
                    style: {
                      background: 'var(--void)',
                      border: '1px solid var(--hairline)',
                      color: 'var(--paper)',
                      borderRadius: 8,
                      padding: '5px 8px',
                      fontSize: 12,
                      outline: 'none',
                      fontFamily: "'IBM Plex Mono', monospace"
                    }
                  },
                    h('option', { value: 'turbo' }, '⚡ Turbo (Max words/req)'),
                    h('option', { value: 'large' }, '📖 Large (~3,500 chars)'),
                    h('option', { value: 'medium' }, '⚖️ Medium (~2,500 chars)'),
                    h('option', { value: 'small' }, '🐢 Small (~1,800 chars)')
                  )
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Source Plugins (LNReader)'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    onClick: handleOpenSourcePluginsModal
                  }, `🔌 Browse Sources (${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length})`)
                )
              ),

              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'API KEYS & ROTATION')
                )
              ),
              h('div', { className: 'card' },
                (() => {
                  const provKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
                  const uniqueCount = new Set(provKeys.map(k => k.key.trim())).size;
                  const hasDuplicates = provKeys.length > uniqueCount;
                  return h('div', { className: 'card-title', style: { flexWrap: 'wrap', gap: 6 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                      h('span', null, `API Keys (${provider.toUpperCase()}) · ${provKeys.length} slots (${uniqueCount} unique)`),
                      hasDuplicates && h('span', { className: 'badge', style: { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid currentColor', fontSize: 10 } }, `⚠️ ${provKeys.length - uniqueCount} duplicate(s)`)
                    ),
                  h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      title: 'Copy all active keys for this provider to clipboard',
                      onClick: () => {
                        const allK = (apiKeysByProvider[provider] || []).map(k => (k.key || '').trim()).filter(Boolean);
                        if (allK.length === 0) { toast('No keys to copy', 'info'); return; }
                        navigator.clipboard.writeText(allK.join('\n')).then(() => toast(`📋 Copied all ${allK.length} keys to clipboard!`, 'success'));
                      }
                    }, '📋 Copy All'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid currentColor', fontWeight: 600 },
                      disabled: testingKeys,
                      onClick: () => handleTestAllKeys(provider)
                    }, testingKeys ? 'Testing…' : '⚡ Test All Keys'),
                    h('button', { type: 'button', className: 'mini-btn', style: { background: 'var(--accent, #6366f1)', color: '#fff' }, onClick: () => setBulkKeyModalOpen(true) }, '⚡ Bulk Paste'),
                    h('button', { type: 'button', className: 'mini-btn', onClick: () => addApiKey(provider) }, '+ Add')
                  )
                );
                })(),
                (apiKeysByProvider[provider] || []).map(k => {
                  const allProvKeys = apiKeysByProvider[provider] || [];
                  const isActive = (activeKeyIds[provider] === k.id) || (allProvKeys.length === 1);
                  const isVisible = showKeys[k.id] || false;
                  const firstWithThisKey = allProvKeys.find(other => other.key && k.key && other.key.trim() === k.key.trim());
                  const isDuplicate = firstWithThisKey && firstWithThisKey.id !== k.id;
                  return h('div', { key: k.id, style: { padding: '6px 0', borderBottom: '1px solid rgba(36,39,48,.5)' } },
                    h('div', { className: 'set-row' },
                      h('input', { type: 'text', value: k.name || '', onChange: e => updateApiKey(provider, k.id, 'name', e.target.value), placeholder: 'Key profile name…', style: { background: 'transparent', border: 'none', color: 'var(--paper)', fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, outline: 'none' } }),
                      isActive
                        ? h('span', { className: 'badge' }, 'Active')
                        : h('button', { type: 'button', className: 'chip-act', onClick: () => setActiveKey(provider, k.id) }, 'Set Active'),
                      isDuplicate && h('span', { className: 'badge', style: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid currentColor', fontSize: 10 } }, '⚠️ Duplicate'),
                      h('button', {
                        type: 'button',
                        className: 'icon-btn',
                        style: { width: 30, height: 30, color: '#10b981' },
                        title: 'Test this API key latency and validity',
                        disabled: !k.key || keyHealth[k.id]?.status === 'testing',
                        onClick: () => testSingleKey(provider, k.key, k.id)
                      }, keyHealth[k.id]?.status === 'testing' ? '⏳' : '⚡'),
                      h('button', {
                        type: 'button',
                        className: 'icon-btn',
                        style: { width: 30, height: 30 },
                        title: 'Copy this key to clipboard',
                        disabled: !k.key,
                        onClick: () => {
                          if (!k.key) return;
                          navigator.clipboard.writeText(k.key).then(() => toast('Key copied to clipboard!', 'success')).catch(() => toast('Could not copy key', 'error'));
                        }
                      }, '📋'),
                      h('button', {
                        type: 'button',
                        className: 'icon-btn',
                        style: { width: 30, height: 30 },
                        title: 'Paste key from clipboard',
                        onClick: async () => {
                          try {
                            const clipText = await navigator.clipboard.readText();
                            if (clipText && clipText.trim()) {
                              updateApiKey(provider, k.id, 'key', clipText.trim());
                              toast('Pasted key from clipboard!', 'success');
                            } else {
                              toast('Clipboard is empty', 'info');
                            }
                          } catch(err) {
                            toast('Clipboard access denied. Please paste manually.', 'error');
                          }
                        }
                      }, '📥'),
                      h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, title: isVisible ? 'Hide key' : 'Show key', onClick: () => setShowKeys(prev => ({ ...prev, [k.id]: !isVisible })) }, isVisible ? '🙈' : '👁'),
                      h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, title: 'Delete key', onClick: () => deleteApiKey(provider, k.id) }, '🗑')
                    ),
                    h('div', { style: { position: 'relative' } },
                      h('input', {
                        type: isVisible ? 'text' : 'password', value: k.key || '',
                        onChange: e => updateApiKey(provider, k.id, 'key', e.target.value),
                        placeholder: `Enter ${provider.toUpperCase()} API Key…`,
                        style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '9px 12px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                      }),
                      (() => {
                        const hInfo = keyHealth[k.id];
                        const poolStatus = window.KeyPool?.getKeyStatus?.(k.key);
                        if (!hInfo && (!poolStatus || (!poolStatus.inFlight && !poolStatus.isCooling))) {
                          return null;
                        }
                        const statusType = hInfo?.status || (poolStatus?.isCooling ? 'cooling' : (poolStatus?.inFlight ? 'inflight' : 'idle'));
                        let msg = hInfo?.message;
                        if (!msg && poolStatus?.isCooling) {
                          msg = `⏳ In-Flight Cooldown (${poolStatus.coolSecondsRemaining}s remaining)`;
                        } else if (!msg && poolStatus?.inFlight) {
                          msg = `⚡ In-Flight (Leased by active worker)`;
                        }

                        const bgMap = {
                          ok: 'rgba(16, 185, 129, 0.15)',
                          cooling: 'rgba(245, 158, 11, 0.15)',
                          exhausted: 'rgba(239, 68, 68, 0.2)',
                          inflight: 'rgba(99, 102, 241, 0.15)',
                          testing: 'rgba(99, 102, 241, 0.15)',
                          error: 'rgba(239, 68, 68, 0.15)'
                        };
                        const colorMap = {
                          ok: '#34d399',
                          cooling: '#fbbf24',
                          exhausted: '#f87171',
                          inflight: '#818cf8',
                          testing: '#818cf8',
                          error: '#f87171'
                        };

                        return h('div', {
                          style: {
                            marginTop: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '5px 8px',
                            borderRadius: 6,
                            background: bgMap[statusType] || bgMap.error,
                            color: colorMap[statusType] || colorMap.error,
                            border: `1px solid ${colorMap[statusType] || colorMap.error}33`,
                            wordBreak: 'break-word',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }
                        },
                          h('span', null, msg),
                          h('button', {
                            type: 'button',
                            style: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 10, opacity: 0.85, textDecoration: 'underline' },
                            onClick: () => testSingleKey(provider, k.key, k.id)
                          }, 'Re-test')
                        );
                      })()
                    )
                  );
                })
              )
            ),

            // ═══ GROUP 2: QUALITY & TM ═══
            (settingsCategory === 'quality' || settingsCategory === 'all') && h(React.Fragment, null,
              // ── QUALITY ASSURANCE & NOVEL HEALTH ──
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'QUALITY ASSURANCE & NOVEL HEALTH')
                ),
                h('span', { style: { fontSize: 10, color: healthAuditEnabled ? '#10b981' : 'var(--slate)', fontWeight: 600 } }, healthAuditEnabled ? 'ACTIVE' : 'DISABLED')
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Novel Diagnostics & Proofreader (§5.9 + §7.1 + §7.5)')),
                switchRow('Novel Health Auditor', healthAuditEnabled, (v) => { setHealthAuditEnabled(v); localStorage.setItem('healthAuditEnabled', String(v)); }),
                switchRow('Translation QA Proofreader', qaProofreaderEnabled, (v) => { setQaProofreaderEnabled(v); localStorage.setItem('qaProofreaderEnabled', String(v)); }),
                switchRow('CJK Untranslated Leak Detector', cjkLeakCheckEnabled, (v) => { setCjkLeakCheckEnabled(v); localStorage.setItem('cjkLeakCheckEnabled', String(v)); }),
                switchRow('Anti-MTL AI Refusal & Loop Gate', antiMtlGateEnabled, (v) => { setAntiMtlGateEnabled(v); localStorage.setItem('antiMtlGateEnabled', String(v)); }),
                switchRow('Cultural Lore & Footnotes (§5.10 / §7.3)', culturalFootnotesEnabled, (v) => { setCulturalFootnotesEnabled(v); localStorage.setItem('culturalFootnotesEnabled', String(v)); })
              ),

              // ── TRANSLATION MEMORY & REVISION DIFFS (§8.2 + §8.6) ──
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'TRANSLATION MEMORY & REVISION DIFFS')
                ),
                h('span', { style: { fontSize: 10, color: (translationMemoryEnabled || snapshotsEnabled) ? '#10b981' : 'var(--slate)', fontWeight: 600 } }, (translationMemoryEnabled || snapshotsEnabled) ? 'ACTIVE' : 'DISABLED')
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Translation Memory & Snapshots (§8.2 + §8.6)')),
                switchRow('Translation Memory Bank (Exact & Fuzzy Cache)', translationMemoryEnabled, (v) => {
                  setTranslationMemoryEnabled(v);
                  window.__translationMemoryEnabled = v;
                  localStorage.setItem('translationMemoryEnabled', String(v));
                }),
                switchRow('Automatic Chapter Snapshots & Diffs', snapshotsEnabled, (v) => {
                  setSnapshotsEnabled(v);
                  localStorage.setItem('snapshotsEnabled', String(v));
                }),
                h('div', { style: { padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '8px' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' } }, 'TM CACHE METRICS'),
                    h('button', {
                      type: 'button',
                      className: 'btn-ghost',
                      style: { fontSize: 10, padding: '2px 8px' },
                      onClick: refreshTmStats
                    }, '↻ Refresh')
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 11, marginBottom: '10px' } },
                    h('div', { style: { background: 'var(--card-bg)', padding: '6px 8px', borderRadius: '4px' } },
                      h('div', { style: { color: 'var(--slate)', fontSize: 10 } }, 'Indexed Segments'),
                      h('div', { style: { fontWeight: 700, color: '#6ee7b7' } }, tmStats.totalUnits || 0)
                    ),
                    h('div', { style: { background: 'var(--card-bg)', padding: '6px 8px', borderRadius: '4px' } },
                      h('div', { style: { color: 'var(--slate)', fontSize: 10 } }, 'Tokens Saved'),
                      h('div', { style: { fontWeight: 700, color: '#38bdf8' } }, `~${(tmStats.tokensSaved || 0).toLocaleString()}`)
                    ),
                    h('div', { style: { background: 'var(--card-bg)', padding: '6px 8px', borderRadius: '4px' } },
                      h('div', { style: { color: 'var(--slate)', fontSize: 10 } }, 'Exact Cache Hits'),
                      h('div', { style: { fontWeight: 700, color: '#a78bfa' } }, tmStats.exactHits || 0)
                    ),
                    h('div', { style: { background: 'var(--card-bg)', padding: '6px 8px', borderRadius: '4px' } },
                      h('div', { style: { color: 'var(--slate)', fontSize: 10 } }, 'Fuzzy References'),
                      h('div', { style: { fontWeight: 700, color: '#fbbf24' } }, tmStats.fuzzyHits || 0)
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', {
                      type: 'button',
                      className: 'btn-secondary',
                      style: { flex: 1, fontSize: 11, padding: '6px' },
                      onClick: handleExportTmx
                    }, '📥 Export TMX'),
                    h('button', {
                      type: 'button',
                      className: 'btn-secondary',
                      style: { flex: 1, fontSize: 11, padding: '6px', color: '#f87171' },
                      onClick: handleClearTm
                    }, '🗑 Clear TM')
                  )
                )
              )
            ),

            // ═══ GROUP 3: READER & DISPLAY ═══
            (settingsCategory === 'display' || settingsCategory === 'all') && h(React.Fragment, null,
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'APPEARANCE & DISPLAY')
                ),
                h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, amoledMode ? 'AMOLED' : 'DARK')
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Theme & Reader Formatting')),
                switchRow('AMOLED Pitch Black (Pure #000000)', amoledMode, (v) => {
                  setAmoledMode(v);
                  localStorage.setItem('amoledMode', String(v));
                  if (v) {
                    document.documentElement.setAttribute('data-theme', 'amoled');
                    document.body.classList.add('theme-amoled');
                  } else {
                    document.documentElement.removeAttribute('data-theme');
                    document.body.classList.remove('theme-amoled');
                  }
                }),
                switchRow('Embed Images in EPUB', epubIncludeImages, setEpubIncludeImages),
                switchRow('Drop Caps', epubDropCaps, setEpubDropCaps),
                switchRow('Smart Quotes', epubSmartQuotes, setEpubSmartQuotes),
                switchRow('Clean Web Junk', epubCleanWebArtifacts, setEpubCleanWebArtifacts),
                switchRow('Justify Text', epubJustifyText, setEpubJustifyText),
                switchRow('Fixed Book Filename (Title.epub)', epubFixedFilename, setEpubFixedFilename),
                h('div', { className: 'seg', style: { paddingTop: 8 } },
                  fontThemes.map(f => h('button', { key: f.id, type: 'button', className: `seg-btn ${epubFontTheme === f.id ? 'on' : ''}`, onClick: () => setEpubFontTheme(f.id) }, f.label))
                )
              ),

              // ── MOON+ READER & E-READER CONNECTIVITY SECTION ──
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'MOON+ READER & E-READER CONNECTIVITY')
                ),
                h('span', { style: { fontSize: 10, color: opdsRunning ? '#10b981' : 'var(--slate)', fontWeight: 600 } }, opdsRunning ? 'ONLINE' : 'STOPPED')
              ),
              h('div', { className: 'card', style: { border: opdsRunning ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--hairline)' } },
                h('div', { className: 'card-title', style: { flexWrap: 'wrap', gap: 6 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, '📡 Moon+ Reader OPDS Catalog Feed'),
                    opdsRunning && h('span', { className: 'badge', style: { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid currentColor', fontSize: 10 } }, '🟢 Active')
                  ),
                  h('span', { className: 'count' }, 'OPDS 1.2 Protocol')
                ),
                h('div', { style: { fontSize: 11, color: 'var(--slate)', lineHeight: 1.45, marginBottom: 8 } },
                  'Run a lightweight local OPDS catalog feed directly inside the app. Moon+ Reader Pro (and other e-readers) can connect wirelessly via Net Library to browse your library and download or update novels with 1-tap.'
                ),
                switchRow('Enable Local OPDS Feed', opdsRunning, toggleOpdsServer),
                opdsRunning && h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
                  h('div', { style: { background: 'var(--panel)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--hairline)' } },
                    h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'LOCAL DEVICE URL (MOON+ READER ON THIS PHONE)'),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('input', {
                        type: 'text',
                        readOnly: true,
                        value: opdsUrl || 'http://127.0.0.1:8080/opds',
                        style: { flex: 1, padding: '6px 8px', fontSize: 12, fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--paper)' }
                      }),
                      h('button', {
                        type: 'button',
                        className: 'chip-act',
                        onClick: () => {
                          navigator.clipboard?.writeText(opdsUrl || 'http://127.0.0.1:8080/opds');
                          toast('Copied OPDS URL!', 'success');
                        }
                      }, '📋 Copy')
                    )
                  ),
                  opdsWifiUrl && h('div', { style: { background: 'var(--panel)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--hairline)' } },
                    h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'WI-FI NETWORK URL (OTHER DEVICES / TABLET / E-INK)'),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('input', {
                        type: 'text',
                        readOnly: true,
                        value: opdsWifiUrl,
                        style: { flex: 1, padding: '6px 8px', fontSize: 12, fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--paper)' }
                      }),
                      h('button', {
                        type: 'button',
                        className: 'chip-act',
                        onClick: () => {
                          navigator.clipboard?.writeText(opdsWifiUrl);
                          toast('Copied Wi-Fi OPDS URL!', 'success');
                        }
                      }, '📋 Copy')
                    )
                  ),
                  h('div', { style: { fontSize: 11, color: 'var(--slate)', lineHeight: 1.4, padding: '4px 2px' } },
                    '💡 In Moon+ Reader Pro: Open side menu ➔ "Net Library" ➔ tap "Add new catalog" ➔ enter the URL above and name it "Gemini Translator".'
                  )
                )
              )
            ),

            // ═══ GROUP 4: BACKUP, HARDWARE & SYSTEM ═══
            (settingsCategory === 'backup' || settingsCategory === 'all') && h(React.Fragment, null,
              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'HARDWARE & DIAGNOSTICS')
                )
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Device Lock & Telemetry')),
                switchRow('Keep Screen & Device Awake (WakeLock)', deviceWakeLock, (v) => {
                  setDeviceWakeLock(v);
                  localStorage.setItem('deviceWakeLock', String(v));
                  if (!v && window.NativeBridge?.releaseWakeLock) {
                    window.NativeBridge.releaseWakeLock();
                  }
                }),
                switchRow('Show Live Logs on Translate Tab', showLiveLogs, setShowLiveLogs),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'System & API Logs'),
                  h('button', { type: 'button', className: 'chip-act', onClick: () => setLogsModalOpen(true) }, '📜 View Live Logs')
                )
              ),

              // ── LIVE AGENT TELEMETRY & DEBUGGING (METHOD 2) CARD ──
              h('div', { className: 'card', style: { border: telemetryEnabled ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--hairline)' } },
                h('div', { className: 'card-title', style: { flexWrap: 'wrap', gap: 6 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, '📡 Live Agent Telemetry & Debugging (Method 2)'),
                    telemetryStatus === 'connected' && h('span', { className: 'badge', style: { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid currentColor', fontSize: 10 } }, '🟢 Connected')
                  ),
                  h('span', { className: 'count' }, 'Wireless Local Wi-Fi')
                ),
                h('div', { style: { fontSize: 11, color: 'var(--slate)', lineHeight: 1.45, marginBottom: 8 } },
                  'Streams real-time novel scraping progress, Cloudflare rate limits, API rotation events, and network errors wirelessly to your PC developer assistant.'
                ),
                switchRow('Stream Real-time Logs to Agent (PC)', telemetryEnabled, (v) => {
                  setTelemetryEnabled(v);
                  localStorage.setItem('telemetry_enabled', String(v));
                  window.updateTelemetryConfig?.({ enabled: v });
                  toast(v ? 'Live telemetry enabled! Logs stream to PC.' : 'Live telemetry disabled (zero overhead).', 'info');
                }),
                switchRow('🔬 Deep Debugging (All Buttons & Backgrounds)', telemetryVerbose, (v) => {
                  setTelemetryVerbose(v);
                  localStorage.setItem('telemetry_verbose', String(v));
                  window.updateTelemetryConfig?.({ verbose: v });
                  window.telemetryLog?.('CONFIG', `Deep Debugging set to ${v}`);
                  toast(v ? '🔬 Deep Debugging enabled! All buttons & background actions logged.' : 'Standard telemetry enabled.', 'info');
                }),
                h('div', { style: { marginTop: 8 } },
                  h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'PC TELEMETRY SERVER URL'),
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
                    style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                  })
                ),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                  h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    style: { flex: 1, textAlign: 'center', background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
                    disabled: telemetryTesting,
                    onClick: handleTestTelemetryConnection
                  }, telemetryTesting ? 'Testing…' : '⚡ Test Connection to Agent'),
                  h('button', {
                    type: 'button',
                    className: 'mini-btn ghost',
                    style: { textAlign: 'center' },
                    onClick: handleClearTelemetryServer
                  }, '🧹 Clear Server Logs')
                ),
                telemetryStatusMsg && h('div', {
                  style: {
                    fontSize: 11,
                    marginTop: 8,
                    padding: '8px 10px',
                    borderRadius: 4,
                    background: telemetryStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: telemetryStatus === 'connected' ? '#34d399' : '#f87171',
                    border: `1px solid ${telemetryStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }
                }, telemetryStatusMsg)
              ),

              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'CLOUD BACKUP & RESTORE')
                ),
                h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, cloudProvider === 'gdrive' ? 'GOOGLE DRIVE' : 'NEXTCLOUD / NAS')
              ),
              h('div', { className: 'card' },
                // Segmented Switcher
                h('div', { style: { display: 'flex', border: '1px solid var(--hairline)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 } },
                  h('button', {
                    type: 'button',
                    style: {
                      flex: 1,
                      padding: '8px 10px',
                      background: cloudProvider === 'gdrive' ? 'var(--ember-2)' : 'transparent',
                      color: cloudProvider === 'gdrive' ? 'var(--paper)' : 'var(--slate)',
                      border: 'none',
                      borderRight: '1px solid var(--hairline)',
                      fontWeight: cloudProvider === 'gdrive' ? 600 : 400,
                      fontSize: 11,
                      cursor: 'pointer'
                    },
                    onClick: () => setCloudProvider('gdrive')
                  }, 'Google Drive (Mihon/Komikku)'),
                  h('button', {
                    type: 'button',
                    style: {
                      flex: 1,
                      padding: '8px 10px',
                      background: cloudProvider === 'webdav' ? 'var(--ember-2)' : 'transparent',
                      color: cloudProvider === 'webdav' ? 'var(--paper)' : 'var(--slate)',
                      border: 'none',
                      fontWeight: cloudProvider === 'webdav' ? 600 : 400,
                      fontSize: 11,
                      cursor: 'pointer'
                    },
                    onClick: () => setCloudProvider('webdav')
                  }, 'WebDAV (Nextcloud/NAS)')
                ),

                cloudProvider === 'gdrive' ? (
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                    // Primary Hero Card: Mihon/Komikku Standard 1-Tap Drive Backup (Zero Setup)
                    h('div', {
                      style: {
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.28)',
                        borderRadius: 6,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }
                    },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        h('span', { style: { fontSize: 12, fontWeight: 700, color: 'var(--iris)' } }, '📁 1-Tap Google Drive Backup (Mihon Style)'),
                        h('span', { style: { fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 } }, '✨ Zero Setup')
                      ),
                      h('p', { style: { fontSize: 11, color: 'var(--slate)', margin: 0, lineHeight: 1.45 } },
                        'Save and restore your entire novel library, translation history, and glossaries directly into your Google Drive folder using Android\'s system storage (exactly like Mihon and Komikku). No Google Developer account, tokens, or Client IDs needed!'
                      ),
                      h('div', { style: { display: 'flex', gap: 8, marginTop: 2 } },
                        h('button', {
                          type: 'button',
                          className: 'mini-btn',
                          style: { flex: 1, textAlign: 'center', background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '9px 12px' },
                          onClick: backupToGoogleDriveFile
                        }, '💾 Save to Drive Folder'),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { flex: 1, textAlign: 'center', padding: '9px 12px' },
                          onClick: () => document.getElementById('full-backup-input')?.click()
                        }, '📥 Restore from File')
                      )
                    ),

                    // Advanced: Direct Google Cloud OAuth API Sync
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 } },
                      h('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--paper-dim)' } }, '☁️ Direct Google Cloud API Sync (Advanced)'),
                      h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Requires OAuth Client ID')
                    ),

                    // Connection Status Box
                    h('div', {
                      style: {
                        background: 'var(--ember-2)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }
                    },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                        h('span', {
                          style: {
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: gdriveConnected ? '#22c55e' : '#64748b'
                          }
                        }),
                        h('div', null,
                          h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--paper)' } },
                            gdriveConnected ? (gdriveUser?.displayName || gdriveUser?.emailAddress || 'Connected to Google Drive') : 'Not Connected (Direct API)'
                          ),
                          h('div', { style: { fontSize: 10, color: 'var(--slate)' } },
                            gdriveConnected ? (gdriveUser?.emailAddress || 'Google Cloud OAuth active') : 'Optional background REST API sync'
                          )
                        )
                      ),
                      gdriveConnected ? (
                        h('button', {
                          type: 'button',
                          className: 'mini-btn danger',
                          style: { padding: '4px 8px', fontSize: 10 },
                          onClick: disconnectGoogleDrive
                        }, 'Disconnect')
                      ) : (
                        h('button', {
                          type: 'button',
                          className: 'mini-btn',
                          style: { background: 'var(--ember-1)', color: 'var(--paper-dim)', border: '1px solid var(--hairline)', padding: '6px 10px', fontSize: 10.5 },
                          onClick: connectGoogleDrive
                        }, 'Connect OAuth')
                      )
                    ),

                    // Quota display
                    gdriveConnected && gdriveUser && (gdriveUser.quotaLimit > 0 || gdriveUser.storageQuota) && h('div', {
                      style: { fontSize: 10, color: 'var(--slate)', display: 'flex', justifyContent: 'space-between', padding: '0 2px' }
                    },
                      h('span', null, 'Storage Quota:'),
                      h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } },
                        window.GoogleDriveSync?.formatQuota?.(gdriveUser.storageQuota || gdriveUser) || ''
                      )
                    ),

                    // Folder mode choice
                    h('div', { className: 'set-row', style: { padding: '6px 0' } },
                      h('span', { className: 'l', style: { fontSize: 11 } }, 'Drive Storage Mode:'),
                      h('select', {
                        className: 'chip',
                        style: chipSelectStyle,
                        value: gdriveFolderMode,
                        onChange: e => setGdriveFolderMode(e.target.value)
                      },
                        h('option', { value: 'appDataFolder' }, 'Private App Folder (drive.appdata)'),
                        h('option', { value: 'visibleFolder' }, 'GeminiTranslator Folder (drive.file)')
                      )
                    ),

                    switchRow('Auto-Backup on Translation Finish', gdriveAutoSync, (v) => {
                      setGdriveAutoSync(v);
                      localStorage.setItem('gdrive_auto_sync', String(v));
                    }),

                    h('div', { className: 'set-row', style: { padding: '4px 0' } },
                      h('span', { className: 'l', style: { fontSize: 11 } }, 'Last Drive Sync:'),
                      h('span', { className: 'count', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 } }, gdriveLastSync || 'Never synced')
                    ),

                    h('div', { className: 'toolbar-group', style: { width: '100%', marginTop: 6 } },
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center' },
                        disabled: gdriveTesting || !gdriveConnected,
                        onClick: testGoogleDriveConnection
                      }, gdriveTesting ? 'Testing…' : '⚡ Test Link'),
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center', fontWeight: 600, color: 'var(--iris)' },
                        disabled: gdriveSyncing || !gdriveConnected,
                        onClick: backupToGoogleDrive
                      }, gdriveSyncing ? 'Syncing…' : '☁️ Backup Now'),
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center' },
                        disabled: gdriveSyncing || !gdriveConnected,
                        onClick: restoreFromGoogleDrive
                      }, '📥 Restore'),
                      h('button', {
                        type: 'button',
                        style: { width: 36, textAlign: 'center', fontSize: 13 },
                        title: 'Client ID & Direct Token Settings',
                        onClick: () => setGdriveConfigModalOpen(true)
                      }, '⚙️')
                    )
                  )
                ) : (
                  // WEBDAV UI
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                    h('div', { className: 'card-title' },
                      h('span', null, 'WebDAV Cloud Auto-Sync'),
                      h('span', { className: 'count' }, 'Nextcloud · ownCloud · WebDAV NAS')
                    ),
                    h('div', null,
                      h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'SERVER WEBDAV URL'),
                      h('input', {
                        type: 'text',
                        placeholder: 'https://cloud.example.com/remote.php/dav/files/username/',
                        value: webdavUrl,
                        onChange: e => setWebdavUrl(e.target.value.trim()),
                        style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 12px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                      })
                    ),
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                      h('div', null,
                        h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'USERNAME'),
                        h('input', {
                          type: 'text',
                          placeholder: 'Username',
                          value: webdavUser,
                          onChange: e => setWebdavUser(e.target.value.trim()),
                          style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                        })
                      ),
                      h('div', null,
                        h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'APP PASSWORD / TOKEN'),
                        h('input', {
                          type: 'password',
                          placeholder: 'App Password / Token',
                          value: webdavPass,
                          onChange: e => setWebdavPass(e.target.value.trim()),
                          style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                        })
                      )
                    ),
                    h('div', null,
                      h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'REMOTE FOLDER NAME'),
                      h('input', {
                        type: 'text',
                        placeholder: 'GeminiTranslator',
                        value: webdavPath,
                        onChange: e => setWebdavPath(e.target.value.trim()),
                        style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
                      })
                    ),
                    switchRow('Auto-Backup on Translation Finish', webdavAutoSync, (v) => {
                      setWebdavAutoSync(v);
                      localStorage.setItem('webdavAutoSync', String(v));
                    }),
                    h('div', { className: 'set-row', style: { padding: '4px 0' } },
                      h('span', { className: 'l', style: { fontSize: 11 } }, 'Last Cloud Sync:'),
                      h('span', { className: 'count', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 } }, webdavLastSync || 'Never synced')
                    ),
                    h('div', { className: 'toolbar-group', style: { width: '100%', marginTop: 6 } },
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center' },
                        disabled: webdavTesting,
                        onClick: testWebDavConnection
                      }, webdavTesting ? 'Testing…' : '⚡ Test Link'),
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center', fontWeight: 600, color: 'var(--iris)' },
                        disabled: webdavSyncing,
                        onClick: backupToWebDav
                      }, webdavSyncing ? 'Syncing…' : '☁️ Backup Now'),
                      h('button', {
                        type: 'button',
                        style: { flex: 1, textAlign: 'center' },
                        disabled: webdavSyncing,
                        onClick: restoreFromWebDav
                      }, '📥 Restore')
                    )
                  )
                )
              ),

              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'LOCAL ARCHIVE & STORAGE')
                )
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' },
                  h('span', null, 'Local Storage & Memory Diagnostics'),
                  h('span', { className: 'count', style: { color: storageDiag.pct > 80 ? '#f87171' : 'var(--pine)' } },
                    storageLoading ? 'Estimating…' : (storageDiag.available ? `${storageDiag.usedMB} MB used (${storageDiag.pct}%)` : 'Estimates Ready')
                  )
                ),
                h('div', { style: { fontSize: 12, color: 'var(--slate)', marginBottom: 10, lineHeight: 1.4 } },
                  'Monitor device storage allocated to offline novels, cached audiobook audio, translation memory, and recycle bin.'
                ),
                storageDiag.available && h('div', {
                  style: {
                    width: '100%',
                    height: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 12
                  }
                },
                  h('div', {
                    style: {
                      width: `${Math.max(1, storageDiag.pct)}%`,
                      height: '100%',
                      background: storageDiag.pct > 85 ? '#ef4444' : storageDiag.pct > 65 ? '#f59e0b' : 'var(--iris)',
                      transition: 'width 0.3s ease'
                    }
                  })
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 } },
                  h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px' } },
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Books in Library'),
                    h('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--paper)', marginTop: 2 } }, `📚 ${webImportHistory?.length || 0}`)
                  ),
                  h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px' } },
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Audiobook Tracks'),
                    h('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--paper)', marginTop: 2 } }, `🎧 ${(window.SwiftAudioEngine?.Library?.getAllBooks?.() || []).length || 0}`)
                  ),
                  h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px' } },
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Recycle Bin'),
                    h('div', { style: { fontSize: 15, fontWeight: 700, color: trashCount > 0 ? '#f87171' : 'var(--paper)', marginTop: 2 } }, `🗑️ ${trashCount} item${trashCount === 1 ? '' : 's'}`)
                  ),
                  h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px' } },
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Estimated Quota'),
                    h('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--paper)', marginTop: 2 } }, storageDiag.available ? `${(storageDiag.quotaMB / 1024).toFixed(1)} GB` : 'Device Managed')
                  )
                ),
                h('div', { className: 'toolbar-group', style: { width: '100%' } },
                  h('button', {
                    type: 'button',
                    style: { flex: 1, textAlign: 'center' },
                    disabled: storageLoading,
                    onClick: () => refreshStorageDiag()
                  }, storageLoading ? 'Estimating…' : '🔄 Refresh Storage'),
                  h('button', {
                    type: 'button',
                    style: { flex: 1, textAlign: 'center', color: trashCount > 0 ? '#f87171' : 'var(--slate)' },
                    disabled: trashCount === 0,
                    onClick: () => {
                      if (trashCount === 0) return toast('Recycle bin is already empty.', 'info');
                      confirmAction(`Permanently empty ${trashCount} item(s) from Recycle Bin? This cannot be undone.`, async () => {
                        await handleEmptyTrash();
                        await refreshStorageDiag();
                      });
                    }
                  }, '🗑️ Empty Recycle Bin'),
                  h('button', {
                    type: 'button',
                    style: { flex: 1, textAlign: 'center' },
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
                  }, '🧹 Clear Session Cache')
                )
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' },
                  h('span', null, 'Full App Backup & Restore'),
                  h('span', { className: 'count' }, 'Library · Settings · Keys')
                ),
                h('div', { className: 'toolbar-group', style: { width: '100%', marginTop: 8 } },
                  h('button', { type: 'button', style: { flex: 1, textAlign: 'center' }, onClick: () => exportFullBackup(true) }, 'Export + Keys'),
                  h('button', { type: 'button', style: { flex: 1, textAlign: 'center' }, onClick: () => exportFullBackup(false) }, 'Export Safe'),
                  h('label', { style: { flex: 1, textAlign: 'center', cursor: 'pointer' } },
                    'Import File',
                    h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: (e) => { const f = e.target.files && e.target.files[0]; if (f) importFullBackup({ target: { files: [f] } }); } })
                  ),
                  h('button', { type: 'button', style: { flex: 1, textAlign: 'center' }, onClick: pasteAndRestoreBackup }, 'Paste & Restore')
                )
              ),

              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'TEXT-TO-SPEECH & VOICES')
                ),
                h('span', { style: { fontSize: 10, color: 'var(--iris)' } }, 'Moon+ Reader & SherpaTTS')
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'Voice & Offline Speech Engine')),
                h('div', { style: { fontSize: 12.5, color: 'var(--slate)', marginBottom: 12, lineHeight: 1.5 } },
                  'Configure your Text-to-Speech voice, offline neural Piper/SherpaTTS models (e.g. Callum), and Android system speech.'
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Select Voice & Speech Engine'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    onClick: () => {
                      if (window.__openVoiceModal) window.__openVoiceModal();
                      else if (window.NativeBridge?.openTtsSettings) window.NativeBridge.openTtsSettings();
                      else toast('Open any book in Reader and tap 🎙 Voice to choose voices.', 'info');
                    }
                  }, '🎙 Voice Manager')
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Android System TTS Settings'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    onClick: () => {
                      if (window.NativeBridge?.openTtsSettings) {
                        window.NativeBridge.openTtsSettings();
                      } else {
                        toast('Open phone Settings > Accessibility > Text-to-Speech to select SherpaTTS/Piper models.', 'info');
                      }
                    }
                  }, '⚙ Open Android TTS Settings')
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Default Voice Mode'),
                  h('span', { className: 'count', style: { color: 'var(--pine)' } }, 'System Default (Android Settings)')
                )
              ),

              h('div', { className: 'sec-banner' },
                h('div', { style: { display: 'flex', alignItems: 'center' } },
                  h('span', { className: 'sec-tag' }, '//'),
                  h('span', { className: 'sec-title' }, 'SYSTEM & BUILD')
                ),
                h('span', { style: { fontSize: 10, color: 'var(--iris)' } }, `v${appVersion}`)
              ),
              h('div', { className: 'card' },
                h('div', { className: 'card-title' }, h('span', null, 'App Version & Runtime')),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Check for updates'), h('button', { type: 'button', className: 'chip-act', onClick: () => checkForAppUpdate(true) }, `v${appVersion} (Build ${appVersionCode})`)),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Force Refresh & Clear Stale Cache'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' },
                    onClick: async () => {
                      try {
                        if ('serviceWorker' in navigator) {
                          const regs = await navigator.serviceWorker.getRegistrations();
                          for (let reg of regs) await reg.unregister();
                        }
                        if ('caches' in window) {
                          const keys = await caches.keys();
                          for (let key of keys) await caches.delete(key);
                        }
                      } catch (e) {}
                      localStorage.setItem('gemini_force_reload', Date.now());
                      window.location.reload(true);
                    }
                  }, '🔄 Force Clear Cache')
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Notifications & Sound'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    onClick: async () => {
                      const granted = await window.NativeBridge?.requestNotificationPermission?.();
                      if (granted) {
                        toast('Notifications enabled! 🎉', 'success');
                        window.NativeBridge?.showCompletionNotification?.('Gemini Notifications Active 🔔', 'Completion alerts with sound & vibration are ready.');
                      } else {
                        toast('Notification permission not granted. Check Android App Permissions.', 'warning');
                      }
                    }
                  }, '🔔 Enable Alerts')
                ),
                h('div', { className: 'set-row' },
                  h('span', { className: 'l' }, 'Background Execution (Battery)'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    onClick: async () => {
                      const isIgnored = await window.NativeBridge?.isBatteryOptimizationIgnored?.();
                      if (isIgnored) {
                        toast('Battery optimization is already unrestricted! App will run uninterrupted in background.', 'success');
                      } else {
                        toast('Opening Battery Settings — select "Unrestricted" / "Don\'t optimize" for uninterrupted background downloads & translations.', 'info');
                        await window.NativeBridge?.requestIgnoreBatteryOptimizations?.();
                      }
                    }
                  }, '🔋 Unrestricted Battery')
                ),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Install App (PWA)'), h('button', { type: 'button', className: 'chip-act', onClick: handleInstallPWA }, 'Install')),
                h('div', { className: 'set-row' }, h('span', { className: 'l' }, 'Keyboard Shortcuts'), h('span', { className: 'count' }, 'Ctrl+Enter · Ctrl+Shift+C · Ctrl+Alt+R'))
              )
            )
          );
  }

  return { TabSettings };
}));
