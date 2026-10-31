/**
 * Gemini Translator - Application Modals Suite
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) {
    Object.assign(root, exports);
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const getH = () => (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
  const h = (typeof React !== 'undefined' && React.createElement) ? React.createElement : (window.React ? window.React.createElement : null);
  const useState = (typeof React !== 'undefined' && React.useState) ? React.useState : (window.React ? window.React.useState : null);
  const useCallback = (typeof React !== 'undefined' && React.useCallback) ? React.useCallback : (window.React ? window.React.useCallback : null);
  const useRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef : (window.React ? window.React.useRef : null);
  const useMemo = (typeof React !== 'undefined' && React.useMemo) ? React.useMemo : (window.React ? window.React.useMemo : null);
  const useEffect = (typeof React !== 'undefined' && React.useEffect) ? React.useEffect : (window.React ? window.React.useEffect : null);
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    return h ? h('span', { className: cls }, '') : null;
  };

  function SourceExtensionsModal(props) {
    const {
      isOpen,
      onClose,
      pluginSelectedTab,
      setPluginSelectedTab,
      pluginCatalog,
      isCatalogLoading,
      pluginSearchQuery,
      setPluginSearchQuery,
      pluginSelectedLangFilter,
      setPluginSelectedLangFilter,
      installingPluginId,
      handleUninstallPlugin,
      handleInstallPlugin,
      customPluginUrl,
      setCustomPluginUrl,
      handleInstallCustomPluginUrl
    } = props;
    if (!isOpen) return null;
    const h = getH();
    const ReactComp = typeof React !== 'undefined' ? React : window.React;
    const [newRepoUrl, setNewRepoUrl] = ReactComp.useState ? ReactComp.useState('') : ['', () => {}];
    const [repoListTick, setRepoListTick] = ReactComp.useState ? ReactComp.useState(0) : [0, () => {}];

    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--void, #090d16)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    },
      // Top Full-Screen Navigation Bar (Pinned with Safe Area Insets)
      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: 'max(14px, env(safe-area-inset-top, 14px)) 16px 10px',
          borderBottom: '1px solid var(--hairline)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          gap: 12,
          flexShrink: 0
        }
      },
        // Row 1: Back button, Title, Sideload & Done buttons
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
            h('button', {
              type: 'button',
              className: 'icon-btn',
              style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--hairline)', color: 'var(--paper)', fontSize: 16, cursor: 'pointer', flexShrink: 0 },
              onClick: onClose,
              'aria-label': 'Back to Import',
              title: 'Back to Import'
            }, '←'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 800, fontSize: 16, color: 'var(--paper)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, 'Extensions & Sources'),
                h('span', { className: 'badge', style: { background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', fontSize: 10, padding: '2px 8px', borderRadius: 12 } },
                  `${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length} Installed`
                )
              ),
              h('div', { style: { fontSize: 11, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                'Mihon & LNReader compatible source extensions and built-in scrapers'
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 } },
            h('button', {
              type: 'button',
              className: `mini-btn ${pluginSelectedTab === 'custom' ? '' : 'ghost'}`,
              style: { fontSize: 11, padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap', borderColor: 'var(--hairline)' },
              onClick: () => setPluginSelectedTab(pluginSelectedTab === 'custom' ? 'installed' : 'custom')
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic(pluginSelectedTab === 'custom' ? 'X' : 'Link', 13), pluginSelectedTab === 'custom' ? 'Close Sideload' : 'Sideload')),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { fontSize: 11, padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
              onClick: onClose
            }, 'Done')
          )
        ),
        // Row 2: Pinned Segmented Tabs: Installed & Browse Catalog (Always visible at the top!)
        h('div', { className: 'seg-wide', style: { margin: '2px 0 0', width: '100%', maxWidth: 900, alignSelf: 'center' } },
          h('span', {
            className: (pluginSelectedTab === 'installed' || !pluginSelectedTab) ? 'on' : '',
            onClick: () => setPluginSelectedTab('installed')
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Check', 13), `Installed (${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length})`)),
          h('span', {
            className: pluginSelectedTab === 'catalog' ? 'on' : '',
            onClick: () => setPluginSelectedTab('catalog')
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Globe', 13), `Browse Catalog (${pluginCatalog?.length || '278+'})`)),
          pluginSelectedTab === 'custom' && h('span', {
            className: 'on',
            onClick: () => setPluginSelectedTab('custom')
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Link', 13), 'Sideload Custom'))
        )
      ),

      // Full-Screen Body Container
      h('div', {
        className: 'custom-scrollbar',
        style: {
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '16px 18px',
          maxWidth: 900,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }
      },
        // ── TAB 1: INSTALLED EXTENSIONS ──
        (pluginSelectedTab === 'installed' || !pluginSelectedTab) && (() => {
          const reg = window.sourceRegistry || window.SourceRegistry;
          const installed = reg && typeof reg.getAll === 'function' ? reg.getAll() : (reg && typeof reg.listPlugins === 'function' ? reg.listPlugins() : []);
          if (installed.length === 0) {
            return h('div', { style: { textAlign: 'center', padding: '60px 16px', color: 'var(--slate)', fontSize: 13.5 } },
              h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, ic('Plug', 36, 'text-slate-400')),
              h('div', { style: { fontWeight: 600, color: 'var(--paper)', marginBottom: 4 } }, 'No extensions installed yet'),
              h('div', { style: { fontSize: 12, maxWidth: 360, margin: '0 auto 14px', lineHeight: 1.5 } }, 'Browse the Catalog tab to add from 278+ community light novel and web novel sources!'),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700, padding: '8px 18px' },
                onClick: () => setPluginSelectedTab('catalog')
              }, 'Browse Catalog')
            );
          }
          return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            installed.map(p => {
              const isBuiltin = ['novelfire', 'lnori', 'syosetu', 'kakuyomu', 'novelbuddy', 'royalroad', 'readnovelfull', 'boxnovel', 'novelfull'].includes(p.id);
              const updateStatus = reg && typeof reg.getUpdateStatus === 'function' ? reg.getUpdateStatus(p.id, pluginCatalog) : null;
              return h('div', {
                key: p.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isBuiltin ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  transition: 'border-color 0.15s ease'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 } },
                  h('div', {
                    style: {
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: isBuiltin ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0
                    }
                  }, isBuiltin ? ic('Zap', 14, 'text-indigo-400') : ic('Plug', 14, 'text-emerald-400')),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', { style: { fontWeight: 700, fontSize: 14, color: 'var(--paper)' } }, p.name),
                      h('span', {
                        className: 'badge',
                        style: {
                          fontSize: 9.5,
                          padding: '2px 7px',
                          background: isBuiltin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isBuiltin ? 'var(--iris)' : '#10b981',
                          borderRadius: 4
                        }
                      }, isBuiltin ? 'Built-in' : 'Extension'),
                      h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, `v${p.version || '1.0.0'}`)
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } }, `ID: ${p.id}${p.site ? ` · ${p.site}` : ''}`)
                  )
                ),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  updateStatus && updateStatus.hasUpdate && h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    disabled: installingPluginId === p.id,
                    style: {
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '6px 14px',
                      fontSize: 11.5,
                      borderRadius: 6
                    },
                    onClick: () => handleInstallPlugin && handleInstallPlugin(updateStatus.pluginMeta || { id: p.id, name: p.name })
                  }, installingPluginId === p.id ? 'Updating…' : `Update to v${updateStatus.latestVersion}`),
                  !isBuiltin && h('button', {
                    type: 'button',
                    className: 'mini-btn danger',
                    style: { padding: '6px 14px', fontSize: 11.5, borderRadius: 6 },
                    onClick: () => handleUninstallPlugin && handleUninstallPlugin(p.id)
                  }, 'Uninstall')
                )
              );
            })
          );
        })(),

        // ── TAB 2: BROWSE CATALOG (278+) ──
        pluginSelectedTab === 'catalog' && h(ReactComp.Fragment, null,
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('input', {
              type: 'text',
              placeholder: 'Search 278+ source plugins by name, site, or tag...',
              value: pluginSearchQuery,
              onChange: e => setPluginSearchQuery(e.target.value),
              style: { flex: 1, padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--void)', color: 'var(--paper)' }
            }),
            pluginSearchQuery && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { padding: '6px 10px', fontSize: 11.5 },
              onClick: () => setPluginSearchQuery('')
            }, 'Clear'),
            isCatalogLoading && h('span', { style: { fontSize: 12, color: 'var(--iris)', fontWeight: 600 } }, 'Loading…')
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 2px' } },
            [
              { id: 'all', label: 'All' },
              { id: 'en', label: 'English' },
              { id: 'ja', label: 'Japanese' },
              { id: 'zh', label: 'Chinese' },
              { id: 'es', label: 'Spanish' },
              { id: 'ru', label: 'Russian' },
              { id: 'ko', label: 'Korean' }
            ].map(pill => {
              const isSel = (pluginSelectedLangFilter || 'all') === pill.id;
              return h('button', {
                key: pill.id,
                type: 'button',
                className: `mini-btn ${isSel ? '' : 'ghost'}`,
                style: {
                  fontSize: 11.5,
                  padding: '5px 12px',
                  fontWeight: isSel ? 700 : 500,
                  borderRadius: 14,
                  borderColor: isSel ? 'var(--iris)' : 'var(--hairline)',
                  background: isSel ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSel ? 'var(--iris)' : 'var(--paper-dim)'
                },
                onClick: () => setPluginSelectedLangFilter(pill.id)
              }, pill.label);
            })
          ),
          (() => {
            if (isCatalogLoading) {
              return h('div', { style: { textAlign: 'center', padding: '48px 16px', color: 'var(--slate)', fontSize: 13.5 } }, 'Fetching community plugin catalog from GitHub…');
            }
            const q = (pluginSearchQuery || '').trim().toLowerCase();
            const targetLang = (pluginSelectedLangFilter || 'all').toLowerCase();
            const list = (pluginCatalog || []).filter(p => {
              if (targetLang !== 'all') {
                const pLang = (p.lang || '').toLowerCase();
                if (targetLang === 'en' && !pLang.includes('english') && pLang !== 'en') return false;
                if (targetLang === 'ja' && !pLang.includes('日本語') && !pLang.includes('japanese') && pLang !== 'ja') return false;
                if (targetLang === 'zh' && !pLang.includes('中文') && !pLang.includes('chinese') && pLang !== 'zh') return false;
                if (targetLang === 'es' && !pLang.includes('español') && !pLang.includes('spanish') && pLang !== 'es') return false;
                if (targetLang === 'ru' && !pLang.includes('русский') && !pLang.includes('russian') && pLang !== 'ru') return false;
                if (targetLang === 'ko' && !pLang.includes('한국어') && !pLang.includes('korean') && pLang !== 'ko') return false;
              }
              if (!q) return true;
              return (p.name && p.name.toLowerCase().includes(q)) ||
                     (p.id && p.id.toLowerCase().includes(q)) ||
                     (p.lang && p.lang.toLowerCase().includes(q)) ||
                     (p.site && p.site.toLowerCase().includes(q));
            });

            if (list.length === 0) {
              return h('div', { style: { textAlign: 'center', padding: '48px 16px', color: 'var(--slate)', fontSize: 13.5 } }, 'No plugins match your search or language filter.');
            }

            return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              list.slice(0, 100).map(p => {
                const reg = window.sourceRegistry || window.SourceRegistry;
                const isInstalled = reg && typeof reg.isInstalled === 'function' ? reg.isInstalled(p.id) : false;
                const isInstalling = installingPluginId === p.id;
                const iconSrc = p.iconUrl || p.icon;
                return h('div', {
                  key: p.id,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isInstalled ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: isInstalled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--hairline)',
                    transition: 'all 0.15s ease'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 } },
                    iconSrc
                      ? h('img', { src: iconSrc, style: { width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }, onError: e => { e.target.style.display = 'none'; } })
                      : h('div', { style: { width: 36, height: 36, borderRadius: 8, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--iris)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 } }, (p.name || 'P').slice(0, 1).toUpperCase()),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                        h('span', { style: { fontWeight: 600, fontSize: 14, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
                        h('span', { className: 'badge', style: { fontSize: 9.5, padding: '1px 6px', textTransform: 'uppercase', borderRadius: 4 } }, p.lang || 'EN'),
                        p.version && h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, `v${p.version}`),
                        isInstalled && h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: 4 } }, ic('Check', 11), 'Installed')
                      ),
                      p.site && h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 } }, p.site)
                    )
                  ),
                  isInstalled ? (
                    (() => {
                      const regInst = window.sourceRegistry || window.SourceRegistry;
                      const updateStatus = regInst && typeof regInst.getUpdateStatus === 'function' ? regInst.getUpdateStatus(p.id, [p]) : null;
                      if (updateStatus && updateStatus.hasUpdate) {
                        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            disabled: isInstalling,
                            style: {
                              background: isInstalling ? 'var(--hairline)' : 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontWeight: 700,
                              padding: '6px 14px',
                              fontSize: 11.5,
                              borderRadius: 6,
                              cursor: isInstalling ? 'wait' : 'pointer'
                            },
                            onClick: () => handleInstallPlugin && handleInstallPlugin(p)
                          }, isInstalling ? 'Updating…' : `Update to v${p.version}`),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn danger',
                            style: { padding: '6px 12px', fontSize: 11.5, borderRadius: 6 },
                            onClick: () => handleUninstallPlugin && handleUninstallPlugin(p.id)
                          }, 'Uninstall')
                        );
                      }
                      return h('button', {
                        type: 'button',
                        className: 'mini-btn danger',
                        style: { padding: '6px 14px', fontSize: 11.5, borderRadius: 6 },
                        onClick: () => handleUninstallPlugin && handleUninstallPlugin(p.id)
                      }, 'Uninstall');
                    })()
                  ) : h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    disabled: isInstalling,
                    style: {
                      background: isInstalling ? 'var(--hairline)' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: isInstalling ? 'var(--slate)' : '#fff',
                      fontWeight: 700,
                      padding: '6px 16px',
                      fontSize: 12,
                      borderRadius: 6,
                      flexShrink: 0,
                      cursor: isInstalling ? 'wait' : 'pointer'
                    },
                    onClick: () => handleInstallPlugin && handleInstallPlugin(p)
                  }, isInstalling ? 'Installing…' : 'Install')
                );
              }),
              list.length > 100 && h('div', { style: { textAlign: 'center', fontSize: 11.5, color: 'var(--slate)', padding: 8 } }, `Showing top 100 of ${list.length} matching plugins. Refine search query to filter.`)
            );
          })()
        ),

        // ── TAB 3: SIDELOAD CUSTOM PLUGIN ──
        pluginSelectedTab === 'custom' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' } },
          h('div', { style: { fontSize: 12.5, color: 'var(--paper-dim)', lineHeight: 1.5 } },
            'Sideload any compliant LNReader or custom JavaScript source plugin directly from a URL (e.g. GitHub raw link or local dev server).'
          ),
          h('input', {
            type: 'text',
            placeholder: 'https://raw.githubusercontent.com/.../plugin.js',
            value: customPluginUrl,
            onChange: e => setCustomPluginUrl(e.target.value),
            style: { padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--void)', color: 'var(--paper)', fontFamily: 'monospace' }
          }),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--iris)', color: '#fff', fontWeight: 700, padding: '8px 18px', alignSelf: 'flex-start' },
            onClick: handleInstallCustomPluginUrl
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Download', 13), 'Fetch & Register Plugin')),

          // ── REPOSITORY FEEDS MANAGER ──
          h('div', { style: { marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--hairline)' } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 } },
              ic('Globe', 15, 'text-indigo-400'),
              'Plugin Repository Feeds'
            ),
            h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, marginBottom: 12 } },
              'Configure community manifest feeds for automatic source discovery and updates.'
            ),
            (() => {
              const regInst = window.sourceRegistry || window.SourceRegistry;
              const repos = (regInst && typeof regInst.getRepoUrls === 'function') ? regInst.getRepoUrls() : ['https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.dist/plugins.json'];
              return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
                repos.map((rUrl, rIdx) => {
                  const isOfficial = rUrl.includes('lnreader/lnreader-plugins');
                  return h('div', {
                    key: rIdx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--hairline)',
                      fontSize: 11.5,
                      fontFamily: 'monospace',
                      color: 'var(--paper-dim)'
                    }
                  },
                    h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } },
                      rUrl,
                      isOfficial && h('span', { style: { marginLeft: 8, fontSize: 9.5, color: 'var(--iris)', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: 4, fontFamily: 'sans-serif' } }, 'Official')
                    ),
                    !isOfficial && h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '3px 8px', fontSize: 10.5, borderRadius: 4 },
                      onClick: () => {
                        if (regInst && typeof regInst.removeRepoUrl === 'function') {
                          regInst.removeRepoUrl(rUrl);
                          setRepoListTick(t => (typeof t === 'number' ? t + 1 : 1));
                          if (typeof window.showToast === 'function') window.showToast('Repository feed removed', 'info');
                        }
                      }
                    }, 'Remove')
                  );
                })
              );
            })(),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              h('input', {
                type: 'text',
                placeholder: 'https://example.com/custom-plugins.json',
                value: newRepoUrl,
                onChange: e => setNewRepoUrl(e.target.value),
                style: { flex: 1, padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--hairline)', background: 'var(--void)', color: 'var(--paper)', fontFamily: 'monospace' }
              }),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                disabled: !newRepoUrl || !newRepoUrl.trim(),
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '7px 14px', fontSize: 12, borderRadius: 6, flexShrink: 0 },
                onClick: () => {
                  const regInst = window.sourceRegistry || window.SourceRegistry;
                  if (regInst && typeof regInst.addRepoUrl === 'function') {
                    const added = regInst.addRepoUrl(newRepoUrl.trim());
                    if (added) {
                      setNewRepoUrl('');
                      setRepoListTick(t => (typeof t === 'number' ? t + 1 : 1));
                      if (typeof window.showToast === 'function') window.showToast('Repository added! Syncing catalog...', 'success');
                      regInst.fetchCatalog();
                    } else {
                      if (typeof window.showToast === 'function') window.showToast('Repository already added or invalid', 'warning');
                    }
                  }
                }
              }, 'Add Feed')
            )
          )
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 15. EXPORT / TOOLS SHEET
  // ─────────────────────────────────────────────────────────────────────────

  return { SourceExtensionsModal };
}));
