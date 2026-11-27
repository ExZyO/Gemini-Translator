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
        className: 'omni-sheet-backdrop',
        style: { zIndex: 10045 },
        onClick: close
      },
        h('div', {
          className: 'omni-sheet',
          style: { display: 'flex', flexDirection: 'column' },
          onClick: e => e.stopPropagation()
        },
          h('div', { className: 'p-sheet-handle' }),
          h('div', { className: 'modal-hd', style: { padding: '8px 16px 12px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--p-accent)' } },
              ic('RefreshCw', 19),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 15.5, color: 'var(--p-ink)' } }, 'Select Update Source'),
                h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)' } }, novel.title || 'Novel')
              )
            ),
            h('button', { type: 'button', className: 'p-icon-btn', onClick: close, title: 'Close' }, ic('X', 17))
          ),
          h('div', { className: 'modal-bd', style: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 } },
            h('button', {
              type: 'button',
              style: {
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                background: 'var(--p-accent-soft)',
                border: 'none',
                boxShadow: 'inset 0 0 0 1.5px var(--p-accent)',
                color: 'var(--p-ink)',
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
              h('span', { style: { color: 'var(--p-accent)', flexShrink: 0 } }, ic('Zap', 20)),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--p-ink)' } }, 'Check All Sources'),
                h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)' } }, 'Query all website sources at once and pick newest chapters')
              )
            ),
            h('div', { className: 'p-section-label', style: { padding: '4px 0 0' } }, 'Or Choose Website'),
            h('div', { style: { display: 'flex', flexDirection: 'column', maxHeight: 240, overflowY: 'auto' } },
              sources.map((s, idx) => {
                const sUrl = typeof s === 'string' ? s : s.url;
                let host = sUrl;
                try { host = new URL(sUrl).hostname.replace(/^www\./i, ''); } catch(e) {}
                const isActive = (typeof s === 'object' && s.active) || sUrl === novel.sourceUrl;
                return h('button', {
                  key: `src_${idx}`,
                  type: 'button',
                  className: 'p-row',
                  style: { paddingLeft: 0, paddingRight: 0 },
                  onClick: () => {
                    close();
                    onSelect(sUrl, false);
                  }
                },
                  h('span', { style: { color: isActive ? 'var(--p-accent)' : 'var(--p-dim)', flexShrink: 0 } }, ic('Globe', 16)),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { className: 'p-row-title' }, host),
                      isActive && h('span', { className: 'badge', style: { background: 'var(--p-accent-soft)', color: 'var(--p-accent)' } }, 'Primary')
                    ),
                    h('div', { className: 'p-row-sub', style: { fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sUrl)
                  ),
                  ic('ChevronRight', 15)
                );
              })
            )
          ),
          h('div', { style: { padding: '8px 16px', display: 'flex', justifyContent: 'flex-end' } },
            h('button', { type: 'button', className: 'p-pill-btn', onClick: close }, 'Cancel')
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

    return h('div', { className: 'omni-sheet-backdrop', style: { zIndex: 10045 }, onClick: onClose },
      h('div', { className: 'omni-sheet', style: { display: 'flex', flexDirection: 'column' }, onClick: e => e.stopPropagation() },
        h('div', { className: 'p-sheet-handle' }),
        h('div', { className: 'modal-hd', style: { padding: '8px 16px 12px', borderBottom: '1px solid var(--p-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--p-accent)' } },
            ic('Globe', 19),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 15.5, color: 'var(--p-ink)' } }, 'Manage Website Sources'),
              h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)' } }, 'Connect this ebook to online sources')
            )
          ),
          h('button', { type: 'button', className: 'p-icon-btn', onClick: onClose, title: 'Close' }, ic('X', 17))
        ),
        h('div', { className: 'modal-bd', style: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--p-input, #171A21)',
              padding: '10px 12px',
              borderRadius: 14
            }
          },
            novel.cover
              ? h('img', { src: novel.cover, style: { width: 34, height: 46, objectFit: 'cover', borderRadius: 6, flexShrink: 0 } })
              : h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 46, background: 'rgba(255,255,255,0.06)', borderRadius: 6, flexShrink: 0, color: 'var(--p-accent)' } }, ic('BookOpen', 18)),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 650, fontSize: 13.5, color: 'var(--p-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, novel.title || 'Novel'),
              h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)' } }, `${novel.chapterCount || 0} chapters · ${sourcesList.length} saved source(s)`)
            )
          ),
          sourcesList.length > 0 && h('div', null,
            h('div', { className: 'p-section-label', style: { padding: '2px 0 6px' } }, 'Saved Website Sources'),
            h('div', { style: { display: 'flex', flexDirection: 'column', maxHeight: 190, overflowY: 'auto' } },
              sourcesList.map((s, idx) => {
                const sUrl = typeof s === 'string' ? s : s.url;
                let host = sUrl;
                try { host = new URL(sUrl).hostname.replace(/^www\./i, ''); } catch(e) {}
                const isActive = (typeof s === 'object' && s.active) || sUrl === novel.sourceUrl;
                return h('div', {
                  key: `saved_src_${idx}`,
                  className: 'omni-hairline-row',
                  style: { paddingLeft: 0, paddingRight: 0 }
                },
                  h('span', { style: { color: isActive ? 'var(--p-accent)' : 'var(--p-dim)', flexShrink: 0 } }, ic('Globe', 15)),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { className: 'p-row-title', style: { fontSize: 13 } }, host),
                      isActive ? h('span', { className: 'badge', style: { background: 'var(--p-accent-soft)', color: 'var(--p-accent)' } }, 'Primary') : null
                    ),
                    h('div', { className: 'p-row-sub', style: { fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sUrl)
                  ),
                  !isActive && h('button', {
                    type: 'button',
                    className: 'p-pill-btn',
                    style: { height: 28, fontSize: 11, padding: '0 10px' },
                    onClick: () => handleMakePrimary(sUrl),
                    title: 'Set as primary update source'
                  }, 'Primary'),
                  sourcesList.length > 1 && h('button', {
                    type: 'button',
                    className: 'p-icon-btn',
                    style: { minWidth: 30, minHeight: 30, color: '#FCA5A5' },
                    onClick: () => handleRemove(sUrl),
                    title: 'Remove this source'
                  }, ic('Trash2', 14))
                );
              })
            )
          ),
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--p-ink)', marginBottom: 6 } }, 'Add Website Source'),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                type: 'text',
                className: 'p-input',
                style: { flex: 1, fontSize: 13 },
                value: value || '',
                placeholder: 'https://example.com/novel/...',
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
                className: 'p-pill-btn',
                disabled: !(value || '').trim() || !/^https?:\/\//i.test((value || '').trim()),
                onClick: handleAddSource
              }, '+ Add')
            )
          ),
          h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)', lineHeight: 1.45 } },
            'When you export or restore this EPUB, website links are saved inside it so future updates can find new chapters automatically.'
          )
        ),
        h('div', { style: { padding: '10px 16px', borderTop: '1px solid var(--p-hairline)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'p-pill-btn', onClick: onClose }, 'Close'),
          h('button', {
            type: 'button',
            className: 'p-pill-btn is-primary',
            style: { height: 38, minHeight: 38 },
            onClick: () => handleSave(true)
          }, ic('Download', 13), 'Save & Fetch')
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
