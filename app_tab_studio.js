/**
 * app_tab_studio.js - EPUB Studio (Ebook Editor, Splitter, Merger & Moon+ Reader Sync)
 * Chimanew Elevated Dark workspace with crisp underline sub-tabs, 7px Reset button,
 * and hairline Moon+ Reader (.mrexpt) alignment workspace.
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
      setStudioSubTab = function () {},
      activeTab = 'studio'
    } = props || {};

    const handleSelectSubTab = (sub) => {
      setStudioSubTab(sub);
      try {
        localStorage.setItem('studioSubTab', sub);
        if (typeof window !== 'undefined') window.studioSubTab = sub;
      } catch (_) {}

      if (typeof window !== 'undefined' && typeof window.switchStudioSubTab === 'function') {
        window.switchStudioSubTab(sub);
      } else {
        setTimeout(() => {
          if (sub === 'edit' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
          }
          if (sub === 'split' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
          }
          if (sub === 'merge' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
          }
        }, 40);
      }
    };

    if (typeof React !== 'undefined' && React.useEffect) {
      React.useEffect(() => {
        if (activeTab !== 'studio') return;
        const timer = setTimeout(() => {
          if (studioSubTab === 'edit' && typeof window.initEpubEditor === 'function') {
            try { window.initEpubEditor(); } catch (_) {}
          }
          if (studioSubTab === 'split' && typeof window.initSplitter === 'function') {
            try { window.initSplitter(); } catch (_) {}
          }
          if (studioSubTab === 'merge' && typeof window.initMerger === 'function') {
            try { window.initMerger(); } catch (_) {}
          }
        }, 40);
        return () => clearTimeout(timer);
      }, [studioSubTab, activeTab]);
    }

    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function () {};
    const confirmAction = (typeof window !== 'undefined' && window.confirmAction) || props?.confirmAction || function (msg, cb) { if (confirm(msg)) cb(); };

    const handleResetStudio = () => {
      confirmAction('Reset current EPUB Studio tool to clean state? Any unsaved edits will be discarded.', () => {
        try {
          if (studioSubTab === 'edit') {
            const b = document.getElementById('btn-edit-reset-book');
            if (b) b.click();
            else if (typeof window.initEpubEditor === 'function') window.initEpubEditor();
          } else if (studioSubTab === 'split') {
            const b = document.getElementById('btn-reset');
            if (b) b.click();
            else if (typeof window.initSplitter === 'function') window.initSplitter();
          } else if (studioSubTab === 'merge') {
            const b = document.getElementById('btn-clear-all-merge');
            if (b) b.click();
            else if (typeof window.initMerger === 'function') window.initMerger();
          }
        } catch (e) {
          if (typeof setPanelError === 'function') setPanelError(e.message);
        }
      });
    };

    const currentHtml = studioSubTab === 'edit'
      ? (typeof window !== 'undefined' && window.editHtml ? window.editHtml : (typeof editHtml !== 'undefined' ? editHtml : ''))
      : (studioSubTab === 'split'
          ? (typeof window !== 'undefined' && window.splitHtml ? window.splitHtml : (typeof splitHtml !== 'undefined' ? splitHtml : ''))
          : (typeof window !== 'undefined' && window.mergeHtml ? window.mergeHtml : (typeof mergeHtml !== 'undefined' ? mergeHtml : '')));

    return h(React.Fragment, null,
      h('div', { className: 'omni-page-hd' },
        h('div', null,
          h('h1', { className: 'omni-page-title' }, 'Studio')
        ),
        h('div', { className: 'omni-header-actions' },
          h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            style: { color: '#F87171' },
            onClick: handleResetStudio,
            title: 'Reset active studio tool'
          }, ic('RotateCcw', 15))
        )
      ),

      h('div', { className: 'omni-underline-tabs', style: { marginBottom: 14 } },
        [
          { id: 'edit', label: 'Editor' },
          { id: 'split', label: 'Split' },
          { id: 'merge', label: 'Merge' },
          { id: 'mrexpt', label: 'Moon+ Sync' }
        ].map(t => h('button', {
          key: t.id,
          type: 'button',
          className: `omni-underline-tab ${studioSubTab === t.id ? 'active' : ''}`,
          onClick: () => handleSelectSubTab(t.id)
        }, t.label))
      ),

      studioSubTab === 'mrexpt'
        ? h(MrexptStudioPanel, { toast, confirmAction })
        : h('div', {
            className: 'studio-host',
            dangerouslySetInnerHTML: { __html: currentHtml }
          })
    );
  }

  function MrexptStudioPanel(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ic = (name, size = 16, cls = '') => (typeof window !== 'undefined' && window.ic) ? window.ic(name, size, cls) : null;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function () {};
    const ReactObj = typeof React !== 'undefined' ? React : window.React;
    const useState = ReactObj?.useState || function (init) { return [init, function () {}]; };

    const [masterFile, setMasterFile] = useState(null);
    const [sampleFile, setSampleFile] = useState(null);
    const [discardDummy, setDiscardDummy] = useState(true);
    const [targetTitle, setTargetTitle] = useState('');
    const [targetPath, setTargetPath] = useState('/storage/emulated/0/Books/Book.epub');
    const [targetBookId, setTargetBookId] = useState('');
    const [showPaste, setShowPaste] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [isDone, setIsDone] = useState(false);
    const [mergeStats, setMergeStats] = useState(null);
    const [panelNotice, setPanelNotice] = useState(null);

    const handleProcessMaster = (text, fileName) => {
      if (!text || typeof text !== 'string') { setPanelNotice({ tone: 'error', msg: 'Empty file content.' }); return; }
      const info = window.MoonReaderEngine?.inspectMrexpt?.(text);
      if (!info || info.entryCount === 0) { setPanelNotice({ tone: 'error', msg: 'No valid Moon+ Reader bookmarks detected.' }); return; }
      setMasterFile({ text, fileName: fileName || 'backup.mrexpt', info });
      setTargetTitle(info.oldTitle || '');
      setTargetPath(info.oldFilePath || ('/storage/emulated/0/Books/' + (info.oldTitle || 'Book.epub')));
      setTargetBookId(info.bookId || '');
      setIsDone(false);
      setMergeStats(null);
      setPanelNotice({ tone: 'success', msg: `Loaded ${info.entryCount} bookmarks` });
    };

    const handleProcessSample = (text, fileName) => {
      if (!text || typeof text !== 'string') return;
      const sample = window.MoonReaderEngine?.extractTemplateFromMrexpt?.(text);
      if (!sample || (!sample.bookId && !sample.title)) { setPanelNotice({ tone: 'error', msg: 'Could not detect target book info.' }); return; }
      setSampleFile({ text, fileName, sample });
      if (sample.bookId) setTargetBookId(sample.bookId);
      if (sample.title) setTargetTitle(sample.title.replace(/\s*\(\d+\)\.epub$/i, '.epub'));
      if (sample.filePath) setTargetPath(sample.filePath.replace(/\s*\(\d+\)\.epub$/i, '.epub'));
      setDiscardDummy(sample.entryCount <= 1);
      setIsDone(false);
      setPanelNotice({ tone: 'success', msg: `Captured target Book ID (${sample.bookId || 'detected'})` });
    };

    const handleProcessEpub = async (file) => {
      if (!file) return;
      const cleanFileName = file.name.replace(/\s*\(\d+\)\.epub$/i, '.epub');
      const curFolder = targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/') + 1) : '/storage/emulated/0/Books/';
      setTargetTitle(cleanFileName);
      setTargetPath(curFolder + cleanFileName);
      if (file.size) setTargetBookId(String(file.size));
      setIsDone(false);
      setPanelNotice({ tone: 'success', msg: `Captured EPUB "${cleanFileName}"` });
    };

    const handleDownloadFixed = () => {
      if (!masterFile || !masterFile.text) { setPanelNotice({ tone: 'error', msg: 'Select or paste your master backup file first.' }); return; }
      const engine = window.MoonReaderEngine;
      const epubSize = Number(targetBookId) || null;
      let updatedText = '';
      let stats = null;

      if (sampleFile?.text && engine?.mergeMrexpts) {
        stats = engine.mergeMrexpts(sampleFile.text, masterFile.text, {
          discardSampleBookmark: discardDummy,
          customBookId: targetBookId,
          customTitle: targetTitle,
          customFilePath: targetPath,
          epubFileSize: epubSize,
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
          masterBackupText: masterFile.text,
          epubFileSize: epubSize
        });
        updatedText = stats?.mergedText || '';
      } else if (engine?.migrateMrexpt) {
        updatedText = engine.migrateMrexpt(masterFile.text, { newBookId: targetBookId, newTitle: targetTitle, newFilePath: targetPath });
      }

      if (!updatedText) { setPanelNotice({ tone: 'error', msg: 'Failed to generate aligned bookmark file.' }); return; }
      const blob = new Blob([updatedText], { type: 'application/octet-stream' });
      const downloadName = (targetTitle ? targetTitle.replace(/\.epub$/i, '') : 'bookmarks') + '.mrexpt';
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
      setPanelNotice({ tone: 'success', msg: `Aligned & saved ${downloadName}` });
    };

    const folderPresets = [
      { label: '/Books/', path: '/storage/emulated/0/Books/' },
      { label: '/sdcard/Books/', path: '/sdcard/Books/' },
      { label: '/Download/', path: '/storage/emulated/0/Download/' },
      { label: '/MoonReader/', path: '/storage/emulated/0/MoonReader/' }
    ];

    const isSameIdWarning = masterFile && sampleFile && masterFile.info?.bookId && sampleFile.sample?.bookId && masterFile.info.bookId === sampleFile.sample.bookId;

    return h('div', { className: 'omni-subpage-pad', style: { paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 20px))' } },
      h('div', { style: { padding: '6px 0 14px', borderBottom: '1px solid var(--omni-hairline)' } },
        h('div', { style: { fontSize: 16, fontWeight: 750, color: 'var(--omni-text)' } }, 'Moon+ Reader (.mrexpt) Bookmark Aligner'),
        h('p', { style: { fontSize: 12.5, color: 'var(--omni-text-sub)', margin: '4px 0 0', lineHeight: 1.5 } },
          'Aligns master highlights and bookmarks to match your phone EPUB ID and folder path so Moon+ Reader imports cleanly.'
        )
      ),

      panelNotice && window.OmniInlineStrip && h(window.OmniInlineStrip, {
        message: panelNotice.msg,
        tone: panelNotice.tone,
        onDismiss: () => setPanelNotice(null)
      }),

      // Step 1: Master Backup File
      h('div', { style: { padding: '14px 0', borderBottom: '1px solid var(--omni-hairline)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('span', { className: 'omni-section-label' }, '1. Master Bookmark Backup (.mrexpt)'),
          masterFile && h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 9px', fontSize: 11 }, onClick: () => { setMasterFile(null); setIsDone(false); setMergeStats(null); } }, 'Change')
        ),
        !masterFile ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { className: 'omni-cta-row', style: { margin: 0 } },
            h('label', { className: 'omni-flat-cta', style: { cursor: 'pointer' } },
              ic('Folder', 14),
              'Pick Master .mrexpt File',
              h('input', {
                type: 'file',
                accept: '*/*',
                style: { display: 'none' },
                onChange: (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = evt => handleProcessMaster(evt.target.result, f.name);
                  r.readAsText(f);
                }
              })
            ),
            h('button', { type: 'button', className: 'omni-flat-icon-btn', style: { width: 'auto', padding: '0 14px', fontSize: 12.5, fontWeight: 600 }, onClick: () => setShowPaste(!showPaste) }, 'Paste Text')
          ),
          showPaste && h('div', null,
            h('textarea', {
              value: pastedText,
              onChange: (e) => setPastedText(e.target.value),
              placeholder: 'Paste raw .mrexpt backup content here...',
              style: { width: '100%', height: 100, background: 'var(--omni-input)', border: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, fontFamily: 'monospace', fontSize: 11.5, color: 'var(--omni-text)', outline: 'none' }
            }),
            h('button', { type: 'button', className: 'omni-flat-cta', style: { marginTop: 8, height: 36 }, onClick: () => handleProcessMaster(pastedText, 'pasted_backup.mrexpt') }, 'Load Pasted Backup')
          )
        ) : h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', null,
            h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--omni-jade)' } }, `${masterFile.fileName} (${masterFile.info.entryCount} entries)`),
            h('div', { style: { fontSize: 11.5, color: 'var(--omni-text-sub)', marginTop: 2 } }, `Source ID: ${masterFile.info.bookId || 'none'} · Title: ${masterFile.info.oldTitle || 'unknown'}`)
          ),
          ic('CheckCircle2', 18)
        )
      ),

      // Step 2: Target Edition Alignment
      masterFile && h('div', { style: { padding: '14px 0', borderBottom: '1px solid var(--omni-hairline)' } },
        h('div', { className: 'omni-section-label', style: { marginBottom: 8 } }, '2. Target Phone Edition Passport'),
        h('div', { className: 'omni-cta-row', style: { margin: '0 0 10px' } },
          h('label', { className: 'omni-flat-icon-btn', style: { flex: 1, width: 'auto', fontSize: 12, fontWeight: 600, gap: 6, padding: '0 10px' } },
            ic('Bookmark', 14),
            sampleFile ? sampleFile.fileName : 'Load Phone Sample .mrexpt',
            h('input', {
              type: 'file',
              accept: '*/*',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = evt => handleProcessSample(evt.target.result, f.name);
                r.readAsText(f);
              }
            })
          ),
          h('label', { className: 'omni-flat-icon-btn', style: { flex: 1, width: 'auto', fontSize: 12, fontWeight: 600, gap: 6, padding: '0 10px' } },
            ic('BookOpen', 14),
            'Or Pick Phone .epub',
            h('input', {
              type: 'file',
              accept: '.epub,application/epub+zip',
              style: { display: 'none' },
              onChange: (e) => { const f = e.target.files?.[0]; if (f) handleProcessEpub(f); }
            })
          )
        ),
        isSameIdWarning && h('div', { style: { fontSize: 12, color: '#FBBF24', marginBottom: 8 } },
          'Notice: Sample file has the same internal Book ID as master. Re-export a sample directly from Moon+ Reader on your phone if alignment fails.'
        ),
        sampleFile && h('div', { className: 'omni-hairline-row', style: { cursor: 'default' } },
          h('span', { style: { fontSize: 12.5, color: 'var(--omni-text)' } }, 'Discard dummy sample bookmark after capturing passport'),
          h('button', { type: 'button', className: `switch ${discardDummy ? 'on' : ''}`, onClick: () => setDiscardDummy(!discardDummy) })
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 } },
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--omni-text-sub)', marginBottom: 4 } }, 'Target Filename / Title'),
            h('div', { className: 'omni-search-bar', style: { margin: 0, height: 40 } },
              h('input', { type: 'text', value: targetTitle, onChange: (e) => setTargetTitle(e.target.value), placeholder: 'Book.epub' })
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--omni-text-sub)', marginBottom: 4 } }, 'Phone Storage File Path'),
            h('div', { className: 'omni-search-bar', style: { margin: '0 0 8px', height: 40 } },
              h('input', { type: 'text', value: targetPath, onChange: (e) => setTargetPath(e.target.value), placeholder: '/storage/emulated/0/Books/Book.epub' })
            ),
            h('div', { className: 'omni-soft-tabs', style: { padding: 0 } },
              folderPresets.map(fp => h('button', {
                key: fp.path,
                type: 'button',
                className: 'omni-soft-tab',
                style: { fontSize: 11, padding: '3px 8px' },
                onClick: () => setTargetPath(fp.path + (targetTitle || 'Book.epub'))
              }, fp.label))
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--omni-text-sub)', marginBottom: 4 } }, 'Book Size / Internal Moon+ ID'),
            h('div', { className: 'omni-search-bar', style: { margin: 0, height: 40 } },
              h('input', { type: 'text', value: targetBookId, onChange: (e) => setTargetBookId(e.target.value), placeholder: 'Optional numeric size/hash ID' })
            )
          )
        )
      ),

      // Step 3: Export Aligned Backup
      masterFile && h('div', { style: { paddingTop: 16 } },
        h('button', { type: 'button', className: 'omni-flat-cta', style: { width: '100%' }, onClick: handleDownloadFixed },
          ic('Download', 15),
          'Download Aligned .mrexpt Backup'
        ),
        isDone && mergeStats && h('div', { style: { marginTop: 10, fontSize: 12.5, color: 'var(--omni-jade)', textAlign: 'center' } },
          `Aligned ${mergeStats.totalEntries || masterFile.info.entryCount} entries successfully.`
        )
      )
    );
  }

  return { TabStudio };
}));
