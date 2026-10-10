/**
 * app_tab_studio.js - Tab 3 (EPUB Studio / Ebook Editor, Splitter & Merger) for Gemini Translator
 * Provides the sub-tab navigator and host mounting container for:
 *   1. Edit Ebook (epub_editor.js)
 *   2. Split into Volumes (splitter.js)
 *   3. Merge into One Book (merger.js)
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

  function TabStudio(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ic = (name, size = 16, cls = '') => (typeof window !== 'undefined' && window.ic) ? window.ic(name, size, cls) : null;

    const {
      studioSubTab = (typeof window !== 'undefined' && window.studioSubTab) || 'split',
      setStudioSubTab = function() {},
      activeTab = 'studio'
    } = props || {};

    const handleSelectSubTab = (sub) => {
      setStudioSubTab(sub);
      try {
        localStorage.setItem('studioSubTab', sub);
        if (typeof window !== 'undefined') window.studioSubTab = sub;
      } catch (e) {}

      if (typeof window !== 'undefined' && typeof window.switchStudioSubTab === 'function') {
        window.switchStudioSubTab(sub);
      } else {
        setTimeout(() => {
          if (sub === 'edit' && typeof window !== 'undefined' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
          }
          if (sub === 'split' && typeof window !== 'undefined' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
          }
          if (sub === 'merge' && typeof window !== 'undefined' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
          }
        }, 40);
      }
    };

    // Sub-tab auto-initialization effect
    if (typeof React !== 'undefined' && React.useEffect) {
      React.useEffect(() => {
        if (activeTab !== 'studio') return;
        const timer = setTimeout(() => {
          if (studioSubTab === 'edit' && typeof window !== 'undefined' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
          }
          if (studioSubTab === 'split' && typeof window !== 'undefined' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
          }
          if (studioSubTab === 'merge' && typeof window !== 'undefined' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
          }
        }, 40);
        return () => clearTimeout(timer);
      }, [studioSubTab, activeTab]);
    }

    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function() {};
    const confirmAction = (typeof window !== 'undefined' && window.confirmAction) || props?.confirmAction || function(msg, cb) { if (confirm(msg)) cb(); };

    const handleResetStudio = () => {
      confirmAction('Reset current EPUB Studio tool to clean state? Any unsaved edits will be discarded.', () => {
        try {
          if (studioSubTab === 'edit') {
            const btn = document.getElementById('btn-edit-reset-book');
            if (btn) btn.click();
            else if (typeof window.initEpubEditor === 'function') window.initEpubEditor();
          } else if (studioSubTab === 'split') {
            const btn = document.getElementById('btn-reset');
            if (btn) btn.click();
            else if (typeof window.initSplitter === 'function') window.initSplitter();
          } else if (studioSubTab === 'merge') {
            const btn = document.getElementById('btn-clear-all-merge');
            if (btn) btn.click();
            else if (typeof window.initMerger === 'function') window.initMerger();
          }
          toast('Studio tool reset to clean state.', 'info');
        } catch (e) {
          toast('Studio reset: ' + e.message, 'warning');
        }
      });
    };

    const currentHtml = studioSubTab === 'edit'
      ? (typeof window !== 'undefined' && window.editHtml ? window.editHtml : (typeof editHtml !== 'undefined' ? editHtml : ''))
      : (studioSubTab === 'split'
          ? (typeof window !== 'undefined' && window.splitHtml ? window.splitHtml : (typeof splitHtml !== 'undefined' ? splitHtml : ''))
          : (typeof window !== 'undefined' && window.mergeHtml ? window.mergeHtml : (typeof mergeHtml !== 'undefined' ? mergeHtml : '')));

    return h(React.Fragment, null,
      // Apple-style Header
      h('div', { className: 'apple-page-header', style: { marginBottom: 14 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 } },
          h('div', null,
            h('h1', { style: { fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: '0 0 2px' } }, 'Studio'),
            h('p', { style: { fontSize: 13, color: '#94A3B8', margin: 0 } }, 'WYSIWYG editor, volume splitter, book merger & Moon+ Reader bookmark studio')
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: {
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              whiteSpace: 'nowrap'
            },
            onClick: handleResetStudio,
            title: 'Reset active studio tool and close open files'
          },
            ic('RotateCcw', 12, 'mr-1 text-red-400'),
            'Reset Studio'
          )
        )
      ),
      h('div', { style: { marginBottom: 12 } },
        h('div', { className: 'studio-pill-bar', style: { width: '100%', margin: 0 } },
          h('button', {
            type: 'button',
            className: `studio-pill-btn ${studioSubTab === 'edit' ? 'active' : ''}`,
            onClick: () => handleSelectSubTab('edit'),
            title: 'Full WYSIWYG and chapter prose editor'
          },
            ic('Edit', 14, 'shrink-0'),
            h('span', null, 'Edit Ebook')
          ),
          h('button', {
            type: 'button',
            className: `studio-pill-btn ${studioSubTab === 'split' ? 'active' : ''}`,
            onClick: () => handleSelectSubTab('split'),
            title: 'Split continuous web novels into volumes'
          },
            ic('Scissors', 14, 'shrink-0'),
            h('span', null, 'Split Volumes')
          ),
          h('button', {
            type: 'button',
            className: `studio-pill-btn ${studioSubTab === 'merge' ? 'active' : ''}`,
            onClick: () => handleSelectSubTab('merge'),
            title: 'Merge multiple EPUB volumes into one consolidated book'
          },
            ic('BookOpen', 14, 'shrink-0'),
            h('span', null, 'Merge Books')
          ),
          h('button', {
            type: 'button',
            className: `studio-pill-btn ${studioSubTab === 'mrexpt' ? 'active' : ''}`,
            onClick: () => handleSelectSubTab('mrexpt'),
            title: 'Fix "Not the same book" import errors & align Moon+ Reader bookmarks (.mrexpt)'
          },
            ic('Bookmark', 14, 'shrink-0'),
            h('span', null, 'Bookmarks (.mrexpt)')
          )
        )
      ),
      studioSubTab === 'mrexpt'
        ? h(MrexptStudioPanel, { toast, confirmAction })
        : h('div', {
            className: 'studio-host studio-canvas',
            dangerouslySetInnerHTML: {
              __html: currentHtml
            }
          })
    );
  }

  function MrexptStudioPanel(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ic = (name, size = 16, cls = '') => (typeof window !== 'undefined' && window.ic) ? window.ic(name, size, cls) : null;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function() {};

    const [masterFile, setMasterFile] = React.useState(null);
    const [alignMode, setAlignMode] = React.useState('passport'); // 'passport' | 'direct'
    const [sampleFile, setSampleFile] = React.useState(null);
    const [discardDummy, setDiscardDummy] = React.useState(true);
    const [targetTitle, setTargetTitle] = React.useState('');
    const [targetPath, setTargetPath] = React.useState('/storage/emulated/0/Books/Book.epub');
    const [targetBookId, setTargetBookId] = React.useState('');
    const [showPaste, setShowPaste] = React.useState(false);
    const [pastedText, setPastedText] = React.useState('');
    const [isDone, setIsDone] = React.useState(false);
    const [mergeStats, setMergeStats] = React.useState(null);

    const handleProcessMaster = (text, fileName) => {
      if (!text || typeof text !== 'string') return toast('Empty file content.', 'warning');
      const inspectFn = window.MoonReaderEngine?.inspectMrexpt;
      const info = inspectFn ? inspectFn(text) : null;
      if (!info || info.entryCount === 0) {
        return toast('No valid Moon+ Reader bookmarks detected in this file.', 'warning');
      }
      setMasterFile({ text, fileName: fileName || 'backup.mrexpt', info });
      setTargetTitle(info.oldTitle || '');
      setTargetPath(info.oldFilePath || ('/storage/emulated/0/Books/' + (info.oldTitle || 'Book.epub')));
      setTargetBookId(info.bookId || '');
      setIsDone(false);
      setMergeStats(null);
      toast(`Loaded ${info.entryCount} bookmarks from "${fileName || 'backup'}"!`, 'success');
    };

    const handleProcessSample = (text, fileName) => {
      if (!text || typeof text !== 'string') return;
      const extractFn = window.MoonReaderEngine?.extractTemplateFromMrexpt;
      const sample = extractFn ? extractFn(text) : null;
      if (!sample || (!sample.bookId && !sample.title)) {
        return toast('Could not detect target book info from sample file.', 'warning');
      }
      setSampleFile({ text, fileName, sample });
      if (sample.bookId) setTargetBookId(sample.bookId);
      if (sample.title) setTargetTitle(sample.title);
      if (sample.filePath) setTargetPath(sample.filePath);
      setIsDone(false);
      if (sample.entryCount === 0) {
        toast(`Captured Phone Book ID (${sample.bookId}) from 0-bookmark export! Please verify Title and Folder path below.`, 'info');
      } else {
        toast(`Phone passport matched! ID: ${sample.bookId || 'detected'}, Title: ${sample.title || 'detected'}`, 'success');
      }
    };

    const handleProcessEpub = async (file) => {
      if (!file) return;
      let title = file.name.replace(/\.epub$/i, '');
      try {
        if (typeof window.readEpub === 'function') {
          const zip = await window.readEpub(file);
          if (zip && zip.title) title = zip.title;
        }
      } catch (e) {}
      const cleanFileName = file.name;
      const folder = '/storage/emulated/0/Books/';
      setTargetTitle(cleanFileName);
      setTargetPath(folder + cleanFileName);
      setIsDone(false);
      toast(`Matched EPUB "${cleanFileName}"!`, 'info');
    };

    const handleDownloadFixed = () => {
      if (!masterFile || !masterFile.text) {
        return toast('Please select or paste your master backup file first.', 'warning');
      }
      const engine = window.MoonReaderEngine;
      let updatedText = '';
      let stats = null;

      if (sampleFile && sampleFile.text && engine?.mergeMrexpts) {
        stats = engine.mergeMrexpts(sampleFile.text, masterFile.text, {
          discardSampleBookmark: discardDummy,
          customBookId: targetBookId,
          customTitle: targetTitle,
          customFilePath: targetPath,
          renumberIds: true
        });
        updatedText = stats?.mergedText || '';
      } else if (engine?.alignMrexptToEpub) {
        const folder = targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/') + 1) : '/storage/emulated/0/Books/';
        stats = engine.alignMrexptToEpub({
          epubFileName: targetTitle || 'Book.epub',
          epubTitle: targetTitle,
          deviceFolder: folder,
          targetBookId,
          masterBackupText: masterFile.text
        });
        updatedText = stats?.mergedText || '';
      } else if (engine?.migrateMrexpt) {
        updatedText = engine.migrateMrexpt(masterFile.text, {
          newBookId: targetBookId,
          newTitle: targetTitle,
          newFilePath: targetPath
        });
      }

      if (!updatedText) {
        return toast('Failed to generate compatible backup file.', 'error');
      }

      const blob = new Blob([updatedText], { type: 'application/octet-stream' });
      let downloadName = (targetTitle ? targetTitle.replace(/\.epub$/i, '') : 'bookmarks') + '.mrexpt';
      if (typeof window.saveUniversalBlob === 'function') {
        window.saveUniversalBlob(blob, downloadName, 'application/octet-stream');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = downloadName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }
      setIsDone(true);
      setMergeStats(stats);
      const countMsg = stats ? ` (${stats.totalEntries} bookmarks aligned)` : '';
      toast(`Downloaded "${downloadName}"${countMsg}! 100% ready for Moon+ Reader.`, 'success');
    };

    const isSameIdWarning = masterFile && sampleFile && masterFile.info?.bookId && sampleFile.sample?.bookId && masterFile.info.bookId === sampleFile.sample.bookId;

    const folderPresets = [
      { label: '/Books/ (Default)', path: '/storage/emulated/0/Books/' },
      { label: '/sdcard/Books/', path: '/sdcard/Books/' },
      { label: '/sdcard/Sync/Books/', path: '/sdcard/Sync/Books/' },
      { label: '/Download/', path: '/storage/emulated/0/Download/' },
      { label: '/sdcard/Download/', path: '/sdcard/Download/' },
      { label: '/MoonReader/', path: '/storage/emulated/0/MoonReader/' },
      { label: '/sdcard/MoonReader/', path: '/sdcard/MoonReader/' }
    ];

    return h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 720,
        margin: '0 auto',
        padding: '8px 4px 60px'
      }
    },
      // Header Banner
      h('div', {
        style: {
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 16,
          padding: '18px 20px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start'
        }
      },
        h('div', {
          style: {
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--accent, #6366f1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }
        }, ic('Bookmark', 22)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 16, fontWeight: 700, color: 'var(--paper)', marginBottom: 4 } }, 'Moon+ Reader (.mrexpt) Studio'),
          h('div', { style: { fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.5 } },
            'Moon+ Reader Pro refuses to import bookmarks if the phone file path or internal database ID does not match. This studio aligns your master backup to your phone book so it imports cleanly with 100% success.'
          )
        )
      ),

      // 1. Master Backup File Card
      h('div', {
        style: {
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--hairline)',
          borderRadius: 16,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
            ic('FileText', 16, 'text-indigo-400'),
            '1. Master Bookmark Backup (.mrexpt)'
          ),
          masterFile && h('button', {
            type: 'button',
            style: { background: 'transparent', border: 'none', color: 'var(--slate)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
            onClick: () => { setMasterFile(null); setIsDone(false); setMergeStats(null); }
          }, 'Change File')
        ),

        !masterFile ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('label', {
              className: 'mini-btn',
              style: {
                flex: 1,
                minWidth: 200,
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px dashed var(--accent, #6366f1)',
                color: 'var(--paper)',
                padding: '14px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textAlign: 'center',
                minHeight: 48
              }
            },
              [ic('Folder', 16), ' Select Master Backup File (.mrexpt)'],
              h('input', {
                type: 'file',
                accept: '*/*',
                style: { display: 'none' },
                onChange: (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => handleProcessMaster(evt.target.result, f.name);
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
                minHeight: 48
              },
              onClick: () => setShowPaste(prev => !prev)
            }, showPaste ? [ic('X', 14), ' Hide Paste Box'] : [ic('Clipboard', 14), ' Or Paste Text'])
          ),

          showPaste && h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'rgba(0,0,0,0.3)',
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--hairline)'
            }
          },
            h('textarea', {
              rows: 4,
              style: {
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--paper)',
                fontSize: 12,
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none'
              },
              placeholder: 'Paste the contents of your .mrexpt backup file here (starting with indent:false / trim:false / #)...',
              value: pastedText,
              onChange: (e) => setPastedText(e.target.value)
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
                alignSelf: 'flex-start'
              },
              disabled: !pastedText.trim(),
              onClick: () => handleProcessMaster(pastedText.trim(), 'pasted_backup.mrexpt')
            }, [ic('Zap', 13), ' Parse Pasted Text'])
          )
        ) : h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '1px solid var(--hairline)'
          }
        },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 } },
            ic('Check', 14), `Found ${masterFile.info?.entryCount || 0} bookmarks & highlights`
          ),
          masterFile.info?.oldTitle && h('div', { style: { fontSize: 12, color: 'var(--slate)' } },
            'Recorded Title: ', h('span', { style: { color: 'var(--paper)', fontWeight: 600 } }, masterFile.info.oldTitle)
          ),
          masterFile.info?.oldFilePath && h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            'Recorded Path: ', h('span', { style: { color: 'var(--paper)', fontFamily: 'monospace' } }, masterFile.info.oldFilePath)
          ),
          masterFile.info?.bookId && h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } },
            'Moon+ Reader Book ID in file: ', h('span', { style: { color: 'var(--iris)', fontWeight: 700, fontFamily: 'monospace' } }, masterFile.info.bookId)
          )
        )
      ),

      // 2. Alignment & Matching Mode Card
      masterFile && h('div', {
        style: {
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--hairline)',
          borderRadius: 16,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }
      },
        h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
          ic('Zap', 16, 'text-emerald-400'),
          '2. Match to Target Phone Book'
        ),

        // Sub-mode tabs
        h('div', { style: { display: 'flex', gap: 6, background: 'rgba(0,0,0,0.25)', padding: 3, borderRadius: 8 } },
          h('button', {
            type: 'button',
            style: {
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: alignMode !== 'direct' ? 'var(--accent, #6366f1)' : 'transparent',
              color: alignMode !== 'direct' ? '#fff' : 'var(--slate)'
            },
            onClick: () => setAlignMode('passport')
          }, 'Option A: Phone Export / 1-Bookmark Stamp (Recommended)'),
          h('button', {
            type: 'button',
            style: {
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: alignMode === 'direct' ? 'var(--accent, #6366f1)' : 'transparent',
              color: alignMode === 'direct' ? '#fff' : 'var(--slate)'
            },
            onClick: () => setAlignMode('direct')
          }, 'Option B: Clean Book (0 Bookmarks on Device)')
        ),

        alignMode !== 'direct' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.5 } },
            'Open your book in Moon+ Reader on your phone. If it has bookmarks, export them. If it has 0 bookmarks, create 1 temporary highlight on any word, tap Bookmarks → Export. Drop that export file below to instantly capture your phone credentials:'
          ),
          h('label', {
            className: 'mini-btn',
            style: {
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px dashed var(--accent, #6366f1)',
              color: 'var(--paper)',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }
          },
            [ic('FileText', 14), sampleFile ? `Phone File: ${sampleFile.fileName}` : 'Pick Phone Export File (.mrexpt)'],
            h('input', {
              type: 'file',
              accept: '*/*',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (evt) => handleProcessSample(evt.target.result, f.name);
                reader.readAsText(f);
              }
            })
          ),
          sampleFile && h('label', {
            style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--paper)', cursor: 'pointer', marginTop: 2 }
          },
            h('input', {
              type: 'checkbox',
              checked: discardDummy,
              onChange: (e) => setDiscardDummy(e.target.checked)
            }),
            h('span', null, 'Discard dummy test highlight (keeps your book completely clean if you only created 1 test bookmark)')
          )
        ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.5 } },
            'Your ebook has 0 bookmarks on your phone. Drop the .epub file below to detect the exact title and pick your Android storage folder:'
          ),
          h('label', {
            className: 'mini-btn',
            style: {
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px dashed #10b981',
              color: 'var(--paper)',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }
          },
            [ic('BookOpen', 14), targetTitle ? `Selected EPUB: ${targetTitle}` : 'Drop Target .epub File Here'],
            h('input', {
              type: 'file',
              accept: '.epub',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (f) handleProcessEpub(f);
              }
            })
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            folderPresets.map(preset => {
              const fullP = preset.path + (targetTitle || 'Book.epub');
              const isSel = targetPath.startsWith(preset.path);
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
                  setTargetPath(fullP);
                }
              }, preset.label);
            })
          )
        ),

        // Collision warning if both files share the exact same ID
        isSameIdWarning && h('div', {
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
            h('strong', null, `Both files currently have identical Book ID (${masterFile.info?.bookId}). `),
            'If your Phone Export was copied from your PC, Moon+ Reader on your phone will reject it because your phone database assigns a different ID. Make sure this file was exported directly from Moon+ Reader on your phone (Menu → Bookmarks → Export).'
          )
        ),

        // Side-by-side comparison box
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
            marginTop: 4
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
            h('div', { style: { color: 'var(--paper)', fontWeight: 600 } }, masterFile.fileName),
            h('div', { style: { color: 'var(--slate)' } }, `ID: ${masterFile.info?.bookId || 'Unknown'}`),
            h('div', { style: { color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `Path: ${masterFile.info?.oldFilePath || 'None'}`)
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
            h('div', { style: { color: 'var(--paper)', fontWeight: 600 } }, targetTitle || 'Book.epub'),
            h('div', { style: { color: 'var(--slate)' } }, `ID: ${targetBookId || 'Pending'}`),
            h('div', { style: { color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `Path: ${targetPath}`)
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

        // Target Metadata Inputs
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 } },
          h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target Moon+ Reader Book ID:'),
          h('input', {
            type: 'text',
            className: 'mini-input',
            style: { height: 38, borderRadius: 8, fontSize: 13, fontFamily: 'monospace' },
            value: targetBookId,
            onChange: (e) => setTargetBookId(e.target.value)
          }),
          h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Auto-matched from phone export, or keep original if replacing file on device.')
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target Book Title:'),
          h('input', {
            type: 'text',
            className: 'mini-input',
            style: { height: 38, borderRadius: 8, fontSize: 13 },
            value: targetTitle,
            onChange: (e) => setTargetTitle(e.target.value)
          })
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          h('label', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--slate)' } }, 'Target Full Device File Path:'),
          h('input', {
            type: 'text',
            className: 'mini-input',
            style: { height: 38, borderRadius: 8, fontSize: 13 },
            value: targetPath,
            onChange: (e) => setTargetPath(e.target.value)
          })
        ),

        // 3. Download Action Button
        h('button', {
          type: 'button',
          className: 'mini-btn',
          style: {
            background: 'linear-gradient(90deg, #10b981, #059669)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 48,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
          },
          onClick: handleDownloadFixed
        }, [ic('Download', 16), ' Download Compatible .mrexpt File']),

        isDone && h('div', {
          style: {
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: 12.5,
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 } },
            ic('Check', 16, 'shrink-0'),
            'Ready to import into Moon+ Reader Pro!'
          ),
          mergeStats && h('div', { style: { fontSize: 12, color: 'var(--paper)', opacity: 0.9 } },
            `Aligned ${mergeStats.totalEntries} bookmarks & highlights` +
            (mergeStats.notesMergedCount > 0 ? `, merged ${mergeStats.notesMergedCount} personal notes` : '') +
            (mergeStats.dummyDiscardedCount > 0 ? `, discarded ${mergeStats.dummyDiscardedCount} dummy test bookmark` : '')
          ),
          h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 2 } },
            'Open your book in Moon+ Reader Pro → tap screen center → Bookmark icon → Options → Restore → select the downloaded file. It will import without any errors!'
          )
        )
      )
    );
  }

  return { TabStudio, MrexptStudioPanel };
}));

