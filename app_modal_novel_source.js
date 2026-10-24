/**
 * Gemini EPUB Translator - Novel Multi-Source Selection & Assignment Modal
 * Module: app_modal_novel_source.js
 * 
 * Provides:
 * - promptMultiSourceUpdate: Fast dialog to choose between "Check All Sources" or an individual website source
 * - NovelAssignWebsiteModal: Full management dialog to add, switch primary, and remove website links
 */

(function(window) {
  'use strict';

  /**
   * Prompts Exile with a clean dialog to select a source or check all sources
   */
  function promptMultiSourceUpdate(novel, onSelect) {
    if (!novel) return;
    const sources = Array.isArray(novel.sources) && novel.sources.length > 0
      ? novel.sources
      : (novel.sourceUrl ? [{ url: novel.sourceUrl, label: 'Primary Source', active: true }] : []);

    if (sources.length <= 1) {
      onSelect(sources[0] ? (typeof sources[0] === 'string' ? sources[0] : sources[0].url) : null, false);
      return;
    }

    let container = document.getElementById('gemini-multi-source-modal-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gemini-multi-source-modal-root';
      document.body.appendChild(container);
    }

    const close = () => {
      if (container) {
        try {
          if (window.ReactDOM && window.ReactDOM.unmountComponentAtNode) {
            window.ReactDOM.unmountComponentAtNode(container);
          }
        } catch(e) {}
        container.remove();
      }
    };

    const h = (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
    const ic = (name, size = 16, cls = '') => (typeof window.ic === 'function' ? window.ic(name, size, cls) : null);

    const Dialog = () => {
      return h('div', {
        className: 'modal-overlay',
        style: { zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        onClick: close
      },
        h('div', {
          className: 'modal-box',
          style: { maxWidth: 460, width: '92vw', borderRadius: 16, overflow: 'hidden' },
          onClick: e => e.stopPropagation()
        },
          h('div', { className: 'modal-hd', style: { padding: '16px 20px', borderBottom: '1px solid var(--hairline)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              ic('RefreshCw', 20, 'text-indigo-400'),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 15, color: 'var(--paper)' } }, 'Select Update Source'),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } }, novel.title || 'Novel')
              )
            ),
            h('button', { type: 'button', className: 'icon-btn', onClick: close, title: 'Close' }, ic('X', 16))
          ),
          h('div', { className: 'modal-bd', style: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 } },
            h('button', {
              type: 'button',
              className: 'chip-act',
              style: {
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                border: '1px solid var(--iris, #6366f1)',
                color: 'var(--paper)',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer'
              },
              onClick: () => {
                close();
                onSelect(null, true);
              }
            },
              ic('Zap', 22, 'text-amber-400'),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, 'Check All Sources'),
                h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Query all website sources at once and use whichever site has the newest chapters')
              )
            ),
            h('div', { style: { fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Or Choose Individual Website:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' } },
              sources.map((s, idx) => {
                const sUrl = typeof s === 'string' ? s : s.url;
                let host = sUrl;
                try { host = new URL(sUrl).hostname.replace(/^www\./i, ''); } catch(e) {}
                const isActive = (typeof s === 'object' && s.active) || sUrl === novel.sourceUrl;
                return h('button', {
                  key: `src_${idx}`,
                  type: 'button',
                  className: 'chip-act',
                  style: {
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid var(--iris)' : '1px solid var(--hairline)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer'
                  },
                  onClick: () => {
                    close();
                    onSelect(sUrl, false);
                  }
                },
                  ic('Globe', 16, isActive ? 'text-indigo-400' : 'text-slate-400'),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontWeight: 600, fontSize: 12.5, color: 'var(--paper)' } }, host),
                      isActive && h('span', { style: { fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.25)', color: '#818cf8', fontWeight: 600 } }, 'Primary')
                    ),
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sUrl)
                  ),
                  ic('ChevronRight', 14, 'text-slate-500')
                );
              })
            )
          ),
          h('div', { className: 'modal-ft', style: { padding: '12px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end' } },
            h('button', { type: 'button', className: 'mini-btn ghost', onClick: close }, 'Cancel')
          )
        )
      );
    };

    if (window.ReactDOM && window.ReactDOM.render) {
      window.ReactDOM.render(h(Dialog), container);
    } else if (window.ReactDOM && window.ReactDOM.createRoot) {
      const root = window.ReactDOM.createRoot(container);
      root.render(h(Dialog));
    }
  }

  /**
   * Enhanced Multi-Source Assign Website Modal Component
   */
  function NovelAssignWebsiteModal(props) {
    const { novel, onClose, value, setValue, onSave, onSaveAndContinue } = props;
    if (!novel) return null;
    const h = (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
    const ic = (name, size = 16, cls = '') => (typeof window.ic === 'function' ? window.ic(name, size, cls) : null);
    const toast = window.toast || function() {};
    const LibraryEngine = window.LibraryEngine;

    const [sourcesList, setSourcesList] = (typeof React !== 'undefined' && React.useState)
      ? React.useState(() => {
          const list = Array.isArray(novel.sources) && novel.sources.length > 0
            ? [...novel.sources]
            : (novel.sourceUrl ? [{ url: novel.sourceUrl, label: 'Primary Source', active: true }] : []);
          return list;
        })
      : [[], () => {}];

    const handleAddSource = async () => {
      const trimmed = (value || '').trim();
      if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
        toast('Please enter a valid website URL starting with https://', 'warning');
        return;
      }
      if (LibraryEngine?.assignNovelSourceUrl) {
        await LibraryEngine.assignNovelSourceUrl(novel, trimmed, {
          toast,
          onUpdateHistory: props.setWebImportHistory
        });
      }
      setSourcesList(prev => {
        const next = prev.map(s => ({ ...(typeof s === 'string' ? { url: s } : s), active: false }));
        next.push({ url: trimmed, label: `Source ${next.length + 1}`, active: true });
        return next;
      });
      setValue('');
    };

    const handleMakePrimary = async (sUrl) => {
      if (LibraryEngine?.setActiveNovelSource) {
        await LibraryEngine.setActiveNovelSource(novel, sUrl, {
          toast,
          onUpdateHistory: props.setWebImportHistory
        });
      }
      setSourcesList(prev => prev.map(s => {
        const url = typeof s === 'string' ? s : s.url;
        return { ...(typeof s === 'string' ? { url: s } : s), active: url === sUrl };
      }));
    };

    const handleRemove = async (sUrl) => {
      if (LibraryEngine?.removeNovelSource) {
        await LibraryEngine.removeNovelSource(novel, sUrl, {
          toast,
          onUpdateHistory: props.setWebImportHistory
        });
      }
      setSourcesList(prev => prev.filter(s => (typeof s === 'string' ? s : s.url) !== sUrl));
    };

    const handleSave = (andContinue = false) => {
      const trimmed = (value || '').trim();
      if (trimmed && /^https?:\/\//i.test(trimmed)) {
        if (andContinue && onSaveAndContinue) onSaveAndContinue(novel, trimmed);
        else if (onSave) onSave(novel, trimmed);
      } else if (sourcesList.length > 0) {
        const activeS = sourcesList.find(s => typeof s === 'object' && s.active) || sourcesList[0];
        const activeUrl = typeof activeS === 'string' ? activeS : activeS?.url;
        if (activeUrl) {
          if (andContinue && onSaveAndContinue) onSaveAndContinue(novel, activeUrl);
          else if (onSave) onSave(novel, activeUrl);
        }
      }
      onClose();
    };

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 500, width: '92vw', borderRadius: 16 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd', style: { padding: '16px 20px', borderBottom: '1px solid var(--hairline)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            ic('Globe', 20, 'text-indigo-400'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 15, color: 'var(--paper)' } }, 'Manage Website Sources'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Connect this ebook to one or more online novel websites')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose, title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd', style: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--hairline)'
            }
          },
            novel.cover
              ? h('img', { src: novel.cover, style: { width: 34, height: 46, objectFit: 'cover', borderRadius: 4, flexShrink: 0 } })
              : h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 46, background: 'rgba(255,255,255,0.05)', borderRadius: 4, flexShrink: 0, color: 'var(--iris)' } }, ic('BookOpen', 18)),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 600, fontSize: 13.5, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, novel.title || 'Novel'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, `${novel.chapterCount || 0} chapters saved locally • ${sourcesList.length} saved source(s)`)
            )
          ),
          sourcesList.length > 0 && h('div', null,
            h('div', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Saved Website Sources:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' } },
              sourcesList.map((s, idx) => {
                const sUrl = typeof s === 'string' ? s : s.url;
                let host = sUrl;
                try { host = new URL(sUrl).hostname.replace(/^www\./i, ''); } catch(e) {}
                const isActive = (typeof s === 'object' && s.active) || sUrl === novel.sourceUrl;
                return h('div', {
                  key: `saved_src_${idx}`,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--hairline)'
                  }
                },
                  ic('Globe', 15, isActive ? 'text-indigo-400' : 'text-slate-400'),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontWeight: 600, fontSize: 12, color: 'var(--paper)' } }, host),
                      isActive ? h('span', { style: { fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600 } }, 'Primary') : null
                    ),
                    h('div', { style: { fontSize: 10.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sUrl)
                  ),
                  !isActive && h('button', {
                    type: 'button',
                    className: 'mini-btn ghost',
                    style: { fontSize: 11, padding: '3px 8px' },
                    onClick: () => handleMakePrimary(sUrl),
                    title: 'Set as primary update source'
                  }, 'Make Primary'),
                  sourcesList.length > 1 && h('button', {
                    type: 'button',
                    className: 'icon-btn',
                    style: { width: 26, height: 26, color: '#f87171' },
                    onClick: () => handleRemove(sUrl),
                    title: 'Remove this source'
                  }, ic('Trash2', 13))
                );
              })
            )
          ),
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--paper)', marginBottom: 6 } }, 'Add New Website Source:'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                type: 'text',
                className: 'url-input',
                style: { flex: 1, fontSize: 13, height: 40, borderRadius: 10 },
                value: value || '',
                placeholder: 'Paste novel URL (e.g. https://royalroad.com/fiction/...)',
                onChange: e => setValue(e.target.value),
                onKeyDown: e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSource();
                  }
                }
              }),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { background: 'rgba(255,255,255,0.08)', color: 'var(--paper)', border: '1px solid var(--hairline)' },
                disabled: !(value || '').trim() || !/^https?:\/\//i.test((value || '').trim()),
                onClick: handleAddSource
              }, '+ Add')
            )
          ),
          h('div', { style: { fontSize: 11, color: 'var(--slate)', lineHeight: 1.4 } },
            'When you export or restore this EPUB, all website links are saved invisibly. You can choose which website to check when updating chapters.'
          )
        ),
        h('div', { className: 'modal-ft', style: { padding: '12px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'mini-btn ghost', onClick: onClose }, 'Close'),
          h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
            onClick: () => handleSave(true)
          }, [ic('Download', 13), ' Save & Continue Fetching'])
        )
      )
    );
  }

  if (typeof window !== 'undefined') {
    window.promptMultiSourceUpdate = promptMultiSourceUpdate;
    window.NovelSourceManagerModal = NovelAssignWebsiteModal;
    window.NovelAssignWebsiteModal = NovelAssignWebsiteModal;
    if (window.LibraryEngine) {
      window.LibraryEngine.promptMultiSourceUpdate = promptMultiSourceUpdate;
      window.LibraryEngine.NovelAssignWebsiteModal = NovelAssignWebsiteModal;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { promptMultiSourceUpdate, NovelAssignWebsiteModal };
  }
})(typeof window !== 'undefined' ? window : this);
