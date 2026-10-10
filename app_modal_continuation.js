(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const getH = () => (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
  const getToast = () => (window.toast || function() {});
  const ic = (name, size = 18, cls = 'shrink-0') => {
    if (typeof window !== 'undefined' && window.ic) return window.ic(name, size, cls);
    const h = getH();
    return h ? h('span', { className: cls }, '') : null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  function OngoingEpubContinuationModal(props) {
    const {
      modalData,
      onClose,
      setOngoingEpubModal,
      updateNovelFolderRecord,
      handleScanContinuationToc,
      handleSearchContinuationSources,
      handleSelectContinuationSource,
      handleExecuteContinuation
    } = props;
    if (!modalData || !modalData.isOpen) return null;
    const ongoingEpubModal = modalData;
    const h = getH();
    const toast = getToast();
    const handleClose = onClose || (() => setOngoingEpubModal(null));

    const processMrexptText = (text, fileName) => {
      if (!text || typeof text !== 'string') {
        if (typeof toast === 'function') toast('Empty file content.', 'warning');
        return;
      }
      const inspectFn = window.MoonReaderEngine?.inspectMrexpt;
      const info = inspectFn ? inspectFn(text) : null;
      const targetTitle = ongoingEpubModal.originalTitle || ongoingEpubModal.title || info?.oldTitle || '';
      const defaultFileName = ongoingEpubModal.originalFileName || ongoingEpubModal.file?.name || `${ongoingEpubModal.title || 'Novel'}.epub`;
      const defaultPath = (ongoingEpubModal.folderOptions?.folderPath ? (ongoingEpubModal.folderOptions.folderPath.replace(/\/?$/, '/') + defaultFileName) : '') || info?.oldFilePath || defaultFileName;
      setOngoingEpubModal(prev => prev ? {
        ...prev,
        showMrexptFixer: true,
        showMrexptPaste: false,
        mrexptData: {
          fileName: fileName || 'backup.mrexpt',
          rawText: text,
          info,
          targetBookId: info?.bookId || '',
          targetTitle,
          targetPath: defaultPath,
          autoMatched: false,
          isDone: false
        }
      } : null);
      if (typeof toast === 'function') {
        toast(`Loaded backup "${fileName || 'file'}" with ${info?.entryCount || 0} entries!`, 'info');
      }
    };

    const processSampleMrexpt = (text, fileName) => {
      if (!text || typeof text !== 'string') return;
      const extractFn = window.MoonReaderEngine?.extractTemplateFromMrexpt;
      const sample = extractFn ? extractFn(text) : null;
      if (!sample || (!sample.bookId && !sample.title)) {
        if (typeof toast === 'function') toast('Could not detect target book info from sample file.', 'warning');
        return;
      }
      setOngoingEpubModal(prev => {
        if (!prev || !prev.mrexptData) return prev;
        return {
          ...prev,
          mrexptData: {
            ...prev.mrexptData,
            sampleRawText: text,
            sampleFileName: fileName || 'sample.mrexpt',
            targetBookId: sample.bookId || prev.mrexptData.targetBookId,
            targetTitle: sample.title || prev.mrexptData.targetTitle,
            targetPath: sample.filePath || prev.mrexptData.targetPath,
            autoMatched: true,
            discardSampleBookmark: true
          }
        };
      });
      if (typeof toast === 'function') {
        if (sample.entryCount === 0) {
          toast(`Captured Phone Book ID (${sample.bookId}) from 0-bookmark export! Please verify Title and Folder path below.`, 'info');
        } else {
          toast(`Auto-matched target book! ID: ${sample.bookId || 'detected'}, Title: ${sample.title || 'detected'}`, 'success');
        }
      }
    };

    return h('div', {
      className: 'fullscreen-modal-overlay',
      style: {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10050,
        background: 'var(--void, #0a0a0c)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif'
      }
    },
      // Apple-style Top Navigation Bar
      h('div', {
        style: {
          height: 56,
          minHeight: 56,
          borderBottom: '1px solid var(--hairline)',
          background: 'rgba(18, 18, 22, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 2
        }
      },
        h('button', {
          type: 'button',
          style: {
            background: 'transparent',
            border: 'none',
            color: 'var(--accent, #6366f1)',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 8,
            minHeight: 44
          },
          disabled: ongoingEpubModal.isFetching,
          onClick: handleClose
        }, '‹ Back'),
        h('div', { style: { textAlign: 'center' } },
          h('div', { style: { fontWeight: 700, fontSize: 16, color: 'var(--paper)' } }, 'Continue Ongoing Novel'),
          h('div', { style: { fontSize: 11, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 } }, ic('Check', 12), ' Moon+ Reader Pro Continuity')
        ),
        !ongoingEpubModal.isFetching ? h('button', {
          type: 'button',
          className: 'icon-btn',
          style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--paper)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
          onClick: handleClose
        }, ic('X', 14)) : h('div', { style: { width: 36 } })
      ),

      // Scrollable Content with Apple Spacing & Touch Targets
      h('div', {
        className: 'custom-scrollbar',
        style: {
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px 100px',
          maxWidth: 680,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }
      },
        // 1. Novel Header Card (Apple Books presentation)
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            gap: 16,
            alignItems: 'center'
          }
        },
          ongoingEpubModal.cover ? h('img', {
            src: ongoingEpubModal.cover,
            alt: 'Cover',
            style: {
              width: 64,
              height: 88,
              borderRadius: 10,
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)'
            }
          }) : h('div', {
            style: {
              width: 64,
              height: 88,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }
          }, ic('BookOpen', 28, 'text-indigo-400')),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 700, fontSize: 16, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 4 } }, ongoingEpubModal.title),
            h('div', { style: { fontSize: 13, color: 'var(--slate)', marginBottom: 8 } }, `by ${ongoingEpubModal.author || 'Unknown'}`),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', {
                style: {
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--iris)',
                  fontWeight: 600,
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }
              }, ic('BookOpen', 12), ongoingEpubModal.highestStoryChapter > 0
                ? `${ongoingEpubModal.highestStoryChapter} chapters in EPUB (Next: Ch. ${ongoingEpubModal.startChapter || (ongoingEpubModal.highestStoryChapter + 1)})`
                : `${ongoingEpubModal.existingCount || 0} chapters in EPUB`
              ),
              h('span', {
                style: {
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  fontWeight: 600,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }
              }, ic('Check', 12), 'Book ID preserved silently')
            )
          )
        ),

        // 1b. Original EPUB Preservation Card
        h('div', {
          style: {
            background: ongoingEpubModal.file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            border: ongoingEpubModal.file ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14
          }
        },
          ongoingEpubModal.file ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }
            }, ic('Check', 20)),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#10b981' } }, 'True In-Place Continuation Active'),
              h('div', { style: { fontSize: 12, color: 'var(--paper)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                ongoingEpubModal.file.name || 'Original EPUB file linked'
              ),
              h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                '100% of photos, custom CSS styling, fonts, drop-caps, and reading bookmarks will be preserved.'
              )
            )
          ) : h('div', { style: { flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
              ic('Image', 16, 'text-indigo-400'),
              h('span', null, 'Preserve 100% Original Photos & Styles')
            ),
            h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 3, lineHeight: 1.4 } },
              'Link your original .epub file from your device so all existing illustrations, drop-caps, and custom formatting remain completely intact.'
            )
          ),
          h('label', {
            className: 'mini-btn',
            style: {
              background: ongoingEpubModal.file ? 'rgba(255, 255, 255, 0.08)' : 'var(--accent, #6366f1)',
              color: ongoingEpubModal.file ? 'var(--paper)' : '#fff',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44
            }
          },
            ongoingEpubModal.file ? [ic('Folder', 14), ' Change File'] : [ic('Folder', 14), ' Link Original EPUB'],
            h('input', {
              type: 'file',
              accept: '.epub',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.name.toLowerCase().endsWith('.epub')) {
                  return toast('Please select a valid .epub file.', 'warning');
                }
                setOngoingEpubModal(prev => prev ? { ...prev, file: f, originalFileName: f.name } : null);
                toast(`Linked "${f.name}"! Original photos and styling will be preserved.`, 'success');
              }
            })
          )
        ),

        // 1c. Designated Save Location Card
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                width: 40,
                height: 40,
                borderRadius: 10,
                background: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? '#10b981' : 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }
            }, ic('Folder', 18)),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, 'Save Location:'),
              h('div', { style: { fontSize: 12, color: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? '#10b981' : 'var(--slate)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } },
                ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.displayPath || (ongoingEpubModal.folderOptions?.treeUri ? 'Designated Device Folder' : 'Default Downloads Folder')
              ),
              h('div', { style: { fontSize: 11, color: 'var(--slate)', marginTop: 2 } },
                'Designated folder on device for Moon+ Reader continuity'
              )
            )
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--hairline)',
              color: 'var(--paper)',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            },
            onClick: async () => {
              if (window.NativeBridge && window.NativeBridge.chooseFolder) {
                try {
                  const res = await window.NativeBridge.chooseFolder();
                  if (res && res.treeUri) {
                    const fOpts = { treeUri: res.treeUri, folderPath: res.displayPath || res.treeUri };
                    setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                    if (updateNovelFolderRecord) await updateNovelFolderRecord({ id: ongoingEpubModal.uuid, title: ongoingEpubModal.title }, res.treeUri, res.displayPath || res.treeUri);
                    toast(`Location set to "${res.displayPath || 'chosen folder'}"!`, 'success');
                  }
                } catch (e) {
                  toast('Folder selection error: ' + e.message, 'error');
                }
              } else if (typeof window.showDirectoryPicker === 'function') {
                try {
                  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                  if (handle) {
                    const fOpts = { dirHandle: handle, folderPath: handle.name };
                    setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                    toast(`Location set to "${handle.name}"!`, 'success');
                  }
                } catch (e) {
                  if (e.name !== 'AbortError') toast('Folder selection error: ' + e.message, 'error');
                }
              } else {
                const cur = ongoingEpubModal.folderOptions?.folderPath || '';
                const p = window.prompt('Enter designated device folder path for EPUB:', cur);
                if (p && p.trim()) {
                  const fOpts = { subDir: p.trim(), folderPath: p.trim() };
                  setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                  if (updateNovelFolderRecord) await updateNovelFolderRecord({ id: ongoingEpubModal.uuid, title: ongoingEpubModal.title }, '', p.trim());
                  toast(`Location set to "${p.trim()}"!`, 'success');
                }
              }
            }
          }, (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? [ic('Folder', 14), ' Change Location'] : [ic('Folder', 14), ' Select Location'])
        ),

        // 2. Online Source Management & Switching Card
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          // Card Header with Active Source Indicator & Switcher Toggle
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Online Chapter Source:'),
              ongoingEpubModal.sourceUrl && h('span', {
                style: {
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }
              }, ic('Check', 11), 'Active')
            ),
            h('button', {
              type: 'button',
              style: {
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--accent, #6366f1)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              },
              onClick: () => setOngoingEpubModal(prev => prev ? { ...prev, showSourceSwitcher: !prev.showSourceSwitcher } : null)
            }, ongoingEpubModal.showSourceSwitcher ? [ic('ChevronUp', 12), ' Hide Source Chooser'] : [ic('Shuffle', 12), ' Switch Source / Search'])
          ),

          // Currently Active Source Highlight Card
          ongoingEpubModal.sourceUrl && h('div', {
            style: {
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }
          },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } },
                  ongoingEpubModal.selectedSource?.source || (() => {
                    try { return new URL(ongoingEpubModal.sourceUrl).hostname.replace(/^www\./, ''); } catch(e) { return 'Online Source'; }
                  })()
                ),
                ongoingEpubModal.totalOnlineCount > 0 && h('span', { style: { fontSize: 11.5, color: '#10b981', fontWeight: 600 } },
                  `(${ongoingEpubModal.totalOnlineCount} total chapters)`
                )
              ),
              h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                ongoingEpubModal.sourceUrl
              )
            ),
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: {
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--hairline)',
                color: 'var(--paper)',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              },
              disabled: ongoingEpubModal.isScanningToc || ongoingEpubModal.isFetching,
              onClick: () => handleScanContinuationToc && handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount)
            }, ongoingEpubModal.isScanningToc ? 'Scanning…' : [ic('RefreshCw', 12), ' Re-scan'])
          ),

          // Source Switcher Tray
          (!ongoingEpubModal.sourceUrl || ongoingEpubModal.showSourceSwitcher) && h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 4,
              paddingTop: 8,
              borderTop: '1px solid var(--hairline)'
            }
          },
            // Search Input for Alternative Sources
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                type: 'text',
                className: 'url-input',
                style: { flex: 1, fontSize: 13, height: 42, borderRadius: 10 },
                placeholder: 'Search novel title across 278+ sources…',
                value: ongoingEpubModal.searchQuery !== undefined ? ongoingEpubModal.searchQuery : (ongoingEpubModal.title || ''),
                disabled: ongoingEpubModal.isSearchingSources || ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, searchQuery: e.target.value } : null),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && handleSearchContinuationSources) {
                    const q = (ongoingEpubModal.searchQuery !== undefined ? ongoingEpubModal.searchQuery : ongoingEpubModal.title) || '';
                    if (q.trim()) handleSearchContinuationSources(q);
                  }
                }
              }),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '0 16px', height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 },
                disabled: ongoingEpubModal.isSearchingSources || ongoingEpubModal.isFetching,
                onClick: () => {
                  if (handleSearchContinuationSources) {
                    const q = (ongoingEpubModal.searchQuery !== undefined ? ongoingEpubModal.searchQuery : ongoingEpubModal.title) || '';
                    if (q.trim()) handleSearchContinuationSources(q);
                  }
                }
              }, ongoingEpubModal.isSearchingSources ? 'Searching…' : [ic('Search', 13), ' Search Sources'])
            ),

            // Live Searching Banner when 0 results yet
            ongoingEpubModal.isSearchingSources && (!ongoingEpubModal.continuationSources || ongoingEpubModal.continuationSources.length === 0) && h('div', {
              style: { padding: '16px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }
            }, 'Searching built-in sources & 278+ extensions by title…'),

            // Matched Sources List (renders immediately as partial results stream in!)
            ongoingEpubModal.continuationSources?.length > 0 && h('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 8 }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                h('div', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600 } }, 'Tap any source below to switch immediately:'),
                ongoingEpubModal.isSearchingSources && h('span', { style: { fontSize: 11, color: 'var(--iris)', fontWeight: 500 } }, 'Checking more sources…')
              ),
              h('div', {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 280,
                  overflowY: 'auto',
                  paddingRight: 2
                }
              },
                ongoingEpubModal.continuationSources.slice(0, 16).map((srcItem, sIdx) => {
                  const isSelected = ongoingEpubModal.sourceUrl === (srcItem.url || srcItem.path);
                  return h('div', {
                    key: srcItem.url || srcItem.id || sIdx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1.5px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      minHeight: 52
                    },
                    onClick: () => handleSelectContinuationSource && handleSelectContinuationSource(srcItem)
                  },
                    h('div', {
                      style: {
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isSelected ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 12,
                        flexShrink: 0
                      }
                    }, isSelected ? ic('Check', 14) : (srcItem.source ? srcItem.source.slice(0, 2).toUpperCase() : ic('Globe', 14))),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)' } }, srcItem.source || 'Source'),
                        srcItem.chapters && h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, `(${srcItem.chapters} chs)`),
                        isSelected && h('span', { style: { fontSize: 11, color: 'var(--iris)', fontWeight: 600 } }, '• Current')
                      ),
                      h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, srcItem.title || srcItem.url)
                    ),
                    isSelected && ongoingEpubModal.isScanningToc && h('span', { style: { fontSize: 11.5, color: 'var(--iris)', fontWeight: 600 } }, 'Scanning…')
                  );
                })
              )
            ),

            // Helpful feedback when search completed with 0 results
            !ongoingEpubModal.isSearchingSources && ongoingEpubModal.hasSearched && (!ongoingEpubModal.continuationSources || ongoingEpubModal.continuationSources.length === 0) && h('div', {
              style: {
                padding: '14px',
                textAlign: 'center',
                color: 'var(--slate)',
                fontSize: 12.5,
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 10,
                border: '1px dashed var(--hairline)'
              }
            }, 'No matching online sources found for this keyword. Try a shorter title, or paste the novel webpage URL directly below.'),

            // Direct Custom URL Input
            h('div', { style: { marginTop: 6 } },
              h('div', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, marginBottom: 6 } }, 'Or enter / paste any novel URL directly:'),
              h('div', { style: { display: 'flex', gap: 8 } },
                h('input', {
                  type: 'text',
                  className: 'url-input',
                  style: { flex: 1, fontSize: 13, height: 42, borderRadius: 10 },
                  placeholder: 'Paste web novel URL (https://…)',
                  value: ongoingEpubModal.sourceUrl || '',
                  disabled: ongoingEpubModal.isFetching || ongoingEpubModal.isScanningToc,
                  onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, sourceUrl: e.target.value } : null),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && ongoingEpubModal.sourceUrl?.trim() && handleScanContinuationToc) {
                      handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount);
                    }
                  }
                }),
                h('button', {
                  type: 'button',
                  className: 'mini-btn',
                  style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '0 16px', height: 42, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 },
                  disabled: !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isFetching || ongoingEpubModal.isScanningToc,
                  onClick: () => handleScanContinuationToc && handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount)
                }, ongoingEpubModal.isScanningToc ? 'Scanning…' : [ic('Search', 13), ' Use & Scan'])
              )
            )
          ),

          // Scan confirmation badge
          ongoingEpubModal.totalOnlineCount > 0 && h('div', {
            style: {
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontWeight: 600,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }
          }, ic('Check', 13), `Found ${ongoingEpubModal.totalOnlineCount} chapters online (${Math.max(0, ongoingEpubModal.totalOnlineCount - ongoingEpubModal.existingCount)} new chapters ready to fetch)`)
        ),

        // 3. Chapter Range Selector (Apple Touch Form)
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Chapter Range to Fetch:'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
            h('div', { style: { flex: 1 } },
              h('span', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, display: 'block', marginBottom: 6 } }, 'From Chapter:'),
              h('input', {
                type: 'number',
                className: 'mini-input',
                style: { width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center' },
                min: 1,
                max: ongoingEpubModal.totalOnlineCount || 9999,
                value: ongoingEpubModal.startChapter,
                disabled: ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, startChapter: parseInt(e.target.value, 10) || 1 } : null)
              })
            ),
            h('span', { style: { fontSize: 20, color: 'var(--slate)', marginTop: 22 } }, '→'),
            h('div', { style: { flex: 1 } },
              h('span', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, display: 'block', marginBottom: 6 } }, 'To Chapter:'),
              h('input', {
                type: 'number',
                className: 'mini-input',
                style: { width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center' },
                min: ongoingEpubModal.startChapter || 1,
                max: ongoingEpubModal.totalOnlineCount || 9999,
                value: ongoingEpubModal.endChapter,
                disabled: ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, endChapter: parseInt(e.target.value, 10) || 1 } : null)
              })
            )
          ),
          h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 6 } },
            ic('Info', 14, 'shrink-0 mt-0.5 text-indigo-400'),
            h('span', null, `Chapters 1 to ${Math.max(0, (ongoingEpubModal.startChapter || 1) - 1)} in your EPUB will be kept completely untouched with identical internal filenames, preserving 100% of your Moon+ Reader bookmarks, highlights, and notes.`)
          )
        ),

        // 3b. Moon+ Reader Pro Backup (.mrexpt) Helper & Fixer Card
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              ic('Bookmark', 18, 'text-indigo-400'),
              h('div', null,
                h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--paper)' } }, 'Moon+ Reader Backup (.mrexpt) Fixer'),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } }, 'Restore your bookmarks & highlights into the updated EPUB')
              )
            ),
            h('button', {
              type: 'button',
              style: {
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--accent, #6366f1)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '5px 12px',
                borderRadius: 8
              },
              onClick: () => {
                setOngoingEpubModal(prev => {
                  if (!prev) return null;
                  return { ...prev, showMrexptFixer: !prev.showMrexptFixer };
                });
              }
            }, ongoingEpubModal.showMrexptFixer ? 'Hide' : (ongoingEpubModal.mrexptData ? 'View Fixer' : 'Open Fixer'))
          ),

          (ongoingEpubModal.showMrexptFixer || ongoingEpubModal.mrexptData) && h('div', {
            style: {
              borderTop: '1px solid var(--hairline)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }
          },
            h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.4 } },
              'If Moon+ Reader says ',
              h('b', { style: { color: '#f87171' } }, '"failed, not the same book"'),
              ', it is because Moon+ Reader checks the exact filename and title recorded in the backup. Upload your ',
              h('code', { style: { background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 4 } }, '.mrexpt'),
              ' file below to match it to this updated book in 1 tap.'
            ),

            !ongoingEpubModal.mrexptData ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('label', {
                  className: 'mini-btn',
                  style: {
                    flex: 1,
                    minWidth: 200,
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px dashed var(--accent, #6366f1)',
                    color: 'var(--paper)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textAlign: 'center',
                    minHeight: 44
                  }
                },
                  [ic('Folder', 14), ' Select Backup File (Any File / .mrexpt)'],
                  h('input', {
                    type: 'file',
                    accept: '*/*',
                    style: { display: 'none' },
                    onChange: (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        processMrexptText(evt.target.result, f.name);
                      };
                      reader.readAsText(f);
                    }
                  })
                ),
                h('button', {
                  type: 'button',
                  className: 'mini-btn',
                  style: {
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--hairline)',
                    color: 'var(--paper)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 44
                  },
                  onClick: () => {
                    setOngoingEpubModal(prev => prev ? {
                      ...prev,
                      showMrexptPaste: !prev.showMrexptPaste
                    } : null);
                  }
                }, ongoingEpubModal.showMrexptPaste ? [ic('X', 13), ' Hide Paste Box'] : [ic('Clipboard', 13), ' Or Paste Text'])
              ),
              ongoingEpubModal.showMrexptPaste && h('div', {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--hairline)'
                }
              },
                h('div', { style: { fontSize: 12, color: 'var(--slate)' } }, 'Open your backup file in any text editor, copy its contents, and paste below:'),
                h('textarea', {
                  className: 'custom-scrollbar',
                  rows: 4,
                  style: {
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 8,
                    padding: 10,
                    color: 'var(--paper)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  },
                  placeholder: 'Paste the contents of your .mrexpt backup file here (starting with indent:true / trim:true / #)...',
                  value: ongoingEpubModal.pastedMrexpt || '',
                  onChange: (e) => {
                    const v = e.target.value;
                    setOngoingEpubModal(prev => prev ? { ...prev, pastedMrexpt: v } : null);
                  }
                }),
                h('button', {
                  type: 'button',
                  className: 'mini-btn',
                  style: {
                    background: 'var(--accent, #6366f1)',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  },
                  disabled: !ongoingEpubModal.pastedMrexpt?.trim(),
                  onClick: () => {
                    const text = (ongoingEpubModal.pastedMrexpt || '').trim();
                    if (!text) return toast('Please paste your .mrexpt text first.', 'warning');
                    processMrexptText(text, 'backup.mrexpt');
                  }
                }, [ic('Zap', 13), ' Parse & Fix Pasted Text'])
              )
            ) : h('div', {
              style: {
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                border: '1px solid var(--hairline)'
              }
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('div', { style: { fontSize: 12.5, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 } },
                  ic('Check', 13), `Found ${ongoingEpubModal.mrexptData.info?.entryCount || 0} bookmarks & highlights`
                ),
                h('button', {
                  type: 'button',
                  style: { background: 'transparent', border: 'none', color: 'var(--slate)', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' },
                  onClick: () => setOngoingEpubModal(prev => prev ? { ...prev, mrexptData: null } : null)
                }, 'Change File')
              ),
              ongoingEpubModal.mrexptData.info?.oldTitle && h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } },
                'Original title in backup: ', h('span', { style: { color: 'var(--paper)', fontWeight: 600 } }, ongoingEpubModal.mrexptData.info.oldTitle)
              ),
              ongoingEpubModal.mrexptData.info?.oldFilePath && h('div', { style: { fontSize: 11, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                'Original path in backup: ', h('span', { style: { color: 'var(--paper)', fontFamily: 'monospace' } }, ongoingEpubModal.mrexptData.info.oldFilePath)
              ),
              ongoingEpubModal.mrexptData.info?.bookId && h('div', { style: { fontSize: 11, color: 'var(--slate)' } },
                'Original Moon+ Reader Book ID: ', h('span', { style: { color: 'var(--accent, #6366f1)', fontWeight: 700, fontFamily: 'monospace' } }, ongoingEpubModal.mrexptData.info.bookId)
              ),

              // Compatibility Mode Switcher (Phone Passport vs Direct EPUB)
              h('div', {
                style: {
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 2
                }
              },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
                    ic('Zap', 13), 'Align to Phone Book (Fix "Not the same book")'
                  ),
                  ongoingEpubModal.mrexptData.autoMatched && h('span', {
                    style: { fontSize: 11, color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }
                  }, ic('Check', 11), `Phone ID Matched: ${ongoingEpubModal.mrexptData.targetBookId}`)
                ),

                // Sub-mode tabs: 1. Phone Stamp (Recommended) vs 2. Direct EPUB (Zero bookmarks)
                h('div', { style: { display: 'flex', gap: 6, background: 'rgba(0,0,0,0.25)', padding: 3, borderRadius: 8 } },
                  h('button', {
                    type: 'button',
                    style: {
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: ongoingEpubModal.mrexptData.alignMode !== 'direct' ? 'var(--accent, #6366f1)' : 'transparent',
                      color: ongoingEpubModal.mrexptData.alignMode !== 'direct' ? '#fff' : 'var(--slate)'
                    },
                    onClick: () => setOngoingEpubModal(prev => prev ? {
                      ...prev,
                      mrexptData: { ...prev.mrexptData, alignMode: 'passport' }
                    } : null)
                  }, 'Option A: Phone Export / 1-Tap Stamp'),
                  h('button', {
                    type: 'button',
                    style: {
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: ongoingEpubModal.mrexptData.alignMode === 'direct' ? 'var(--accent, #6366f1)' : 'transparent',
                      color: ongoingEpubModal.mrexptData.alignMode === 'direct' ? '#fff' : 'var(--slate)'
                    },
                    onClick: () => {
                      const cleanName = ongoingEpubModal.originalFileName || ongoingEpubModal.file?.name || `${ongoingEpubModal.title || 'Novel'}.epub`;
                      const folder = ongoingEpubModal.folderOptions?.folderPath || '/storage/emulated/0/Books/';
                      const p = folder.replace(/\/?$/, '/') + cleanName;
                      setOngoingEpubModal(prev => prev ? {
                        ...prev,
                        mrexptData: {
                          ...prev.mrexptData,
                          alignMode: 'direct',
                          targetTitle: cleanName,
                          targetPath: p
                        }
                      } : null);
                    }
                  }, 'Option B: Clean Book (0 Bookmarks)')
                ),

                ongoingEpubModal.mrexptData.alignMode !== 'direct' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  h('div', { style: { fontSize: 11.5, color: 'var(--slate)', lineHeight: 1.4 } },
                    'If your book on phone has bookmarks (or if you make 1 quick test highlight in it), export it from Moon+ Reader and select that file below. We will match its exact database ID and merge all your notes without duplicates:'
                  ),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('label', {
                      className: 'mini-btn',
                      style: {
                        flex: 1,
                        minWidth: 180,
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px dashed var(--accent, #6366f1)',
                        color: 'var(--paper)',
                        padding: '9px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }
                    },
                      [ic('FileText', 13), ongoingEpubModal.mrexptData.sampleFileName ? `Phone File: ${ongoingEpubModal.mrexptData.sampleFileName}` : 'Select Phone Export (.mrexpt)'],
                      h('input', {
                        type: 'file',
                        accept: '*/*',
                        style: { display: 'none' },
                        onChange: (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            processSampleMrexpt(evt.target.result, f.name);
                          };
                          reader.readAsText(f);
                        }
                      })
                    )
                  ),
                  ongoingEpubModal.mrexptData.sampleRawText && h('label', {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--paper)',
                      cursor: 'pointer',
                      marginTop: 2
                    }
                  },
                    h('input', {
                      type: 'checkbox',
                      checked: ongoingEpubModal.mrexptData.discardSampleBookmark !== false,
                      onChange: (e) => {
                        const chk = e.target.checked;
                        setOngoingEpubModal(prev => prev ? {
                          ...prev,
                          mrexptData: { ...prev.mrexptData, discardSampleBookmark: chk }
                        } : null);
                      }
                    }),
                    h('span', null, 'Discard dummy test highlight (keeps book clean if phone export was only a 1-bookmark sample)')
                  )
                ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  h('div', { style: { fontSize: 11.5, color: 'var(--slate)', lineHeight: 1.4 } },
                    'Your ebook currently has nothing in it. Pick your Android folder preset below to automatically format the file path to match your phone perfectly:'
                  ),
                  h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                    [
                      { label: '/Books/ (Default)', path: '/storage/emulated/0/Books/' },
                      { label: '/sdcard/Books/', path: '/sdcard/Books/' },
                      { label: '/sdcard/Sync/Books/', path: '/sdcard/Sync/Books/' },
                      { label: '/Download/', path: '/storage/emulated/0/Download/' },
                      { label: '/sdcard/Download/', path: '/sdcard/Download/' },
                      { label: '/MoonReader/', path: '/storage/emulated/0/MoonReader/' },
                      { label: '/sdcard/MoonReader/', path: '/sdcard/MoonReader/' }
                    ].map(preset => {
                      const cleanName = ongoingEpubModal.originalFileName || ongoingEpubModal.file?.name || `${ongoingEpubModal.title || 'Novel'}.epub`;
                      const fullP = preset.path + cleanName;
                      const isSel = ongoingEpubModal.mrexptData.targetPath?.startsWith(preset.path);
                      return h('button', {
                        key: preset.label,
                        type: 'button',
                        style: {
                          background: isSel ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSel ? '1px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                          color: isSel ? 'var(--iris)' : 'var(--slate)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '5px 10px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        },
                        onClick: () => {
                          setOngoingEpubModal(prev => prev ? {
                            ...prev,
                            mrexptData: { ...prev.mrexptData, targetPath: fullP, targetTitle: cleanName }
                          } : null);
                        }
                      }, preset.label);
                    })
                  )
                )
              ),

              // Collision warning if both files share the exact same ID
              (ongoingEpubModal.mrexptData.info?.bookId && ongoingEpubModal.mrexptData.targetBookId && ongoingEpubModal.mrexptData.info.bookId === ongoingEpubModal.mrexptData.targetBookId) && h('div', {
                style: {
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#f59e0b',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start'
                }
              },
                ic('AlertTriangle', 15, 'shrink-0 mt-0.5'),
                h('div', null,
                  h('strong', null, `Both files currently have identical Book ID (${ongoingEpubModal.mrexptData.info.bookId}). `),
                  'If your Phone Export was copied from your PC, Moon+ Reader on your phone will reject it because your phone database assigns a different ID. Make sure this file was exported directly from Moon+ Reader on your phone (Menu → Bookmarks → Export).'
                )
              ),

              // Side-by-side comparison box
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                  marginTop: 2
                }
              },
                h('div', {
                  style: {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 11.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }
                },
                  h('div', { style: { fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.05em' } }, 'Master Backup File:'),
                  h('div', { style: { color: 'var(--paper)', fontWeight: 600 } }, ongoingEpubModal.mrexptData.fileName || 'backup.mrexpt'),
                  h('div', { style: { color: 'var(--slate)' } }, `ID: ${ongoingEpubModal.mrexptData.info?.bookId || 'Unknown'}`),
                  h('div', { style: { color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `Path: ${ongoingEpubModal.mrexptData.info?.oldFilePath || 'None'}`)
                ),
                h('div', {
                  style: {
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 11.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }
                },
                  h('div', { style: { fontWeight: 700, color: '#10b981', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.05em' } }, 'Target Phone Book:'),
                  h('div', { style: { color: 'var(--paper)', fontWeight: 600 } }, ongoingEpubModal.mrexptData.targetTitle || 'Book.epub'),
                  h('div', { style: { color: 'var(--slate)' } }, `ID: ${ongoingEpubModal.mrexptData.targetBookId || 'Pending'}`),
                  h('div', { style: { color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `Path: ${ongoingEpubModal.mrexptData.targetPath}`)
                )
              ),

              // Quick Check Helper Tip (how to tap 'i' in Moon+ Reader)
              h('div', {
                style: {
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: 'var(--slate)',
                  lineHeight: 1.5,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start'
                }
              },
                ic('Info', 15, 'shrink-0 mt-0.5 text-indigo-400'),
                h('div', null,
                  h('strong', { style: { color: 'var(--paper)' } }, 'How to check your book\'s exact path in Moon+ Reader: '),
                  'Open your book on your phone → tap the center of the screen → tap the ',
                  h('strong', { style: { color: 'var(--iris)' } }, '\'i\' (Book Information)'),
                  ' icon at the top. The ',
                  h('strong', { style: { color: 'var(--paper)' } }, '\'File\''),
                  ' row shows the exact storage path Moon+ Reader uses!'
                )
              ),

              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target Moon+ Reader Book ID:'),
                h('input', {
                  type: 'text',
                  className: 'mini-input',
                  style: { height: 38, borderRadius: 8, fontSize: 13, fontFamily: 'monospace' },
                  value: ongoingEpubModal.mrexptData.targetBookId || '',
                  onChange: (e) => {
                    const val = e.target.value;
                    setOngoingEpubModal(prev => prev ? {
                      ...prev,
                      mrexptData: { ...prev.mrexptData, targetBookId: val }
                    } : null);
                  }
                }),
                h('span', { style: { fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'flex-start', gap: 4 } },
                  ic('Info', 12, 'shrink-0 mt-0.5 text-indigo-400'),
                  h('span', null, 'Moon+ Reader database ID. Auto-detected from phone export, or keep original if replacing the file on device.')
                )
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target Book Title (in Moon+ Reader):'),
                h('input', {
                  type: 'text',
                  className: 'mini-input',
                  style: { height: 38, borderRadius: 8, fontSize: 13 },
                  value: ongoingEpubModal.mrexptData.targetTitle || '',
                  onChange: (e) => {
                    const val = e.target.value;
                    setOngoingEpubModal(prev => prev ? {
                      ...prev,
                      mrexptData: { ...prev.mrexptData, targetTitle: val }
                    } : null);
                  }
                })
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target EPUB Full Device Path:'),
                h('input', {
                  type: 'text',
                  className: 'mini-input',
                  style: { height: 38, borderRadius: 8, fontSize: 13 },
                  value: ongoingEpubModal.mrexptData.targetPath || '',
                  onChange: (e) => {
                    const val = e.target.value;
                    setOngoingEpubModal(prev => prev ? {
                      ...prev,
                      mrexptData: { ...prev.mrexptData, targetPath: val }
                    } : null);
                  }
                }),
                h('span', { style: { fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'flex-start', gap: 4 } },
                  ic('Info', 12, 'shrink-0 mt-0.5 text-indigo-400'),
                  h('span', null, 'Full path on phone storage (e.g. /storage/emulated/0/Books/MyBook.epub). Matches Moon+ Reader storage.')
                )
              ),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 44,
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                },
                onClick: () => {
                  const engine = window.MoonReaderEngine;
                  let updatedText = '';
                  let mergeStats = null;

                  if (ongoingEpubModal.mrexptData.sampleRawText && engine?.mergeMrexpts) {
                    mergeStats = engine.mergeMrexpts(
                      ongoingEpubModal.mrexptData.sampleRawText,
                      ongoingEpubModal.mrexptData.rawText,
                      {
                        discardSampleBookmark: ongoingEpubModal.mrexptData.discardSampleBookmark !== false,
                        customBookId: ongoingEpubModal.mrexptData.targetBookId,
                        customTitle: ongoingEpubModal.mrexptData.targetTitle,
                        customFilePath: ongoingEpubModal.mrexptData.targetPath,
                        renumberIds: true
                      }
                    );
                    updatedText = mergeStats?.mergedText || '';
                  } else if (engine?.alignMrexptToEpub) {
                    mergeStats = engine.alignMrexptToEpub({
                      epubFileName: ongoingEpubModal.originalFileName || ongoingEpubModal.file?.name || `${ongoingEpubModal.title || 'Novel'}.epub`,
                      epubTitle: ongoingEpubModal.mrexptData.targetTitle,
                      deviceFolder: ongoingEpubModal.folderOptions?.folderPath || '/storage/emulated/0/Books/',
                      targetBookId: ongoingEpubModal.mrexptData.targetBookId,
                      masterBackupText: ongoingEpubModal.mrexptData.rawText
                    });
                    updatedText = mergeStats?.mergedText || '';
                  } else if (engine?.migrateMrexpt) {
                    updatedText = engine.migrateMrexpt(ongoingEpubModal.mrexptData.rawText, {
                      newBookId: ongoingEpubModal.mrexptData.targetBookId,
                      newTitle: ongoingEpubModal.mrexptData.targetTitle,
                      newFilePath: ongoingEpubModal.mrexptData.targetPath
                    });
                  }

                  if (!updatedText) {
                    if (typeof toast === 'function') toast('Failed to generate compatible backup text.', 'error');
                    return;
                  }

                  const blob = new Blob([updatedText], { type: 'application/octet-stream' });
                  let rawName = (ongoingEpubModal.mrexptData.fileName || 'backup.mrexpt').trim();
                  let downloadName = rawName.replace(/\.txt$/i, '').replace(/_fixed(?=\.mrexpt|$)/i, '');
                  if (!/\.mrexpt$/i.test(downloadName)) {
                    downloadName = `${downloadName}.mrexpt`;
                  }
                  if (typeof window.saveUniversalBlob === 'function') {
                    window.saveUniversalBlob(blob, downloadName, 'application/octet-stream');
                  } else {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = downloadName;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
                  }
                  setOngoingEpubModal(prev => prev ? {
                    ...prev,
                    mrexptData: { ...prev.mrexptData, isDone: true, mergeStats }
                  } : null);
                  if (typeof toast === 'function') {
                    const countMsg = mergeStats ? ` (${mergeStats.totalEntries} bookmarks aligned)` : '';
                    toast(`Downloaded "${downloadName}"${countMsg}! 100% ready for Moon+ Reader Pro.`, 'success');
                  }
                }
              }, [ic('Download', 14), ' Download Compatible .mrexpt File']),
              ongoingEpubModal.mrexptData.isDone && h('div', {
                style: {
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: 12,
                  lineHeight: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 } },
                  ic('Check', 14, 'shrink-0'),
                  h('span', null, '100% Compatible with Moon+ Reader!')
                ),
                ongoingEpubModal.mrexptData.mergeStats && h('div', { style: { fontSize: 11.5, color: 'var(--paper)', opacity: 0.9 } },
                  `Aligned ${ongoingEpubModal.mrexptData.mergeStats.totalEntries} bookmarks` +
                  (ongoingEpubModal.mrexptData.mergeStats.notesMergedCount > 0 ? `, merged ${ongoingEpubModal.mrexptData.mergeStats.notesMergedCount} personal notes` : '') +
                  (ongoingEpubModal.mrexptData.mergeStats.dummyDiscardedCount > 0 ? `, discarded ${ongoingEpubModal.mrexptData.mergeStats.dummyDiscardedCount} test stamp bookmark` : '')
                ),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                  'In Moon+ Reader Pro: open your book → tap Bookmarks → Options → Restore → pick the downloaded file. It will import with 0 errors!'
                )
              )
            )
          )
        ),

        // 4. Progress Card during fetch
        ongoingEpubModal.isFetching && h('div', {
          style: {
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 16,
            padding: '16px 18px'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, ongoingEpubModal.progress?.status || 'Fetching chapters…'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--accent, #6366f1)', fontSize: 13 } }, `${ongoingEpubModal.progress?.pct || 0}%`)
          ),
          h('div', { style: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', margin: '6px 0' } },
            h('div', { style: { height: '100%', width: `${ongoingEpubModal.progress?.pct || 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
          ),
          ongoingEpubModal.progress?.elapsed && h('div', { style: { fontSize: 11, color: 'var(--slate)', textAlign: 'right', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 } },
            ic('Clock', 11), ongoingEpubModal.progress.elapsed
          )
        )
      ),

      // Docked Bottom Action Bar (Apple Style)
      h('div', {
        style: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 76,
          background: 'rgba(18, 18, 22, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          zIndex: 3
        }
      },
        h('div', { style: { maxWidth: 680, width: '100%', display: 'flex', gap: 12 } },
          !ongoingEpubModal.isFetching && h('button', {
            type: 'button',
            style: {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--hairline)',
              color: 'var(--paper)',
              fontWeight: 600,
              fontSize: 14,
              height: 48,
              padding: '0 20px',
              borderRadius: 12,
              cursor: 'pointer'
            },
            onClick: handleClose
          }, 'Cancel'),
          h('button', {
            type: 'button',
            style: {
              flex: 1,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              height: 48,
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              cursor: (ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc) ? 'not-allowed' : 'pointer',
              opacity: (ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            },
            disabled: ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc,
            onClick: (e) => {
              if (ongoingEpubModal.isFetching || ongoingEpubModal.isScanningToc) return;
              if (handleExecuteContinuation) handleExecuteContinuation();
            }
          }, ongoingEpubModal.isFetching ? 'Fetching & Merging…' : [ic('Play', 14), ` Fetch Ch. ${ongoingEpubModal.startChapter}–${ongoingEpubModal.endChapter} & Update EPUB`])
        )
      )
    );
  }

  return { OngoingEpubContinuationModal };
}));
