/**
 * omni_book_details.js - Editorial Book Details Screen & Non-Destructive Artwork Pan/Zoom
 * Supports both Centered Book Jacket (spine sheen) and Full-Bleed Feathered Split Hero headers,
 * unboxed 4-col hairline stat strip, chapter browser, and full Book Tools & Glossary access.
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.OmniBookDetailsView = exports.OmniBookDetailsView;
    root.OmniArtworkPickerModal = exports.OmniArtworkPickerModal;
  }
  if (typeof window !== 'undefined') {
    window.OmniBookDetailsView = exports.OmniBookDetailsView;
    window.OmniArtworkPickerModal = exports.OmniArtworkPickerModal;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getH() {
    return (typeof React !== 'undefined' && React.createElement) || (typeof window !== 'undefined' && window.React?.createElement);
  }

  function getIc() {
    return (typeof window !== 'undefined' && window.ic) || function () { return null; };
  }

  function getToast() {
    return (typeof window !== 'undefined' && window.toast) || function () {};
  }

  function getResolver() {
    return (typeof window !== 'undefined' && window.ArtworkModelResolver) || null;
  }

  function folderBasename(pathStr) {
    if (!pathStr) return 'Library';
    const clean = String(pathStr).replace(/[\/\\]+$/, '');
    const idx = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
    const seg = idx >= 0 ? clean.slice(idx + 1) : clean;
    return seg ? (seg.length > 14 ? seg.slice(0, 12) + '..' : seg) : 'Library';
  }

  function OmniArtworkPickerModal(props) {
    const { isOpen, book, onClose, onSaved, setWebImportHistory } = props || {};
    if (!isOpen || !book) return null;

    const h = getH();
    const ic = getIc();
    const toast = getToast();
    const resolver = getResolver();
    const ReactObj = typeof React !== 'undefined' ? React : window.React;
    const useState = ReactObj?.useState || function (init) { return [init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const useRef = ReactObj?.useRef || function (init) { return { current: init }; };

    const merged = resolver ? resolver.mergeBookArtwork(book) : book;
    const [customCover, setCustomCover] = useState(merged.customCover || '');
    const [customBanner, setCustomBanner] = useState(merged.customBanner || '');
    const [focalX, setFocalX] = useState(Number(merged.bannerFocalX) || 0);
    const [focalY, setFocalY] = useState(Number(merged.bannerFocalY) || 0);
    const [zoom, setZoom] = useState(Math.max(1, Number(merged.bannerZoom) || 1));
    const [artworkRole, setArtworkRole] = useState(merged.artworkRole || 'auto');
    const [saving, setSaving] = useState(false);

    const dragRef = useRef({ active: false, startX: 0, startY: 0, origFx: 0, origFy: 0 });
    const previewRef = useRef(null);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        window.closeOmniArtworkPicker = () => {
          onClose?.();
          return true;
        };
      }
      return () => {
        if (typeof window !== 'undefined' && window.closeOmniArtworkPicker) {
          delete window.closeOmniArtworkPicker;
        }
      };
    }, [onClose]);

    const previewBook = Object.assign({}, book, {
      customCover,
      customBanner,
      bannerFocalX: focalX,
      bannerFocalY: focalY,
      bannerZoom: zoom,
      artworkRole
    });
    const previewBanner = resolver ? resolver.preferredBanner(previewBook) : { src: customBanner || customCover || book.cover || '', mode: 'cover' };
    const previewStyle = resolver ? resolver.getBannerImgStyle(previewBook, 0) : { width: '100%', height: '100%', objectFit: 'cover' };

    const handlePointerDown = (e) => {
      if (!previewBanner.src) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        origFx: focalX,
        origFy: focalY
      };
    };

    const handlePointerMove = (e) => {
      if (!dragRef.current.active || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragRef.current.startX) / Math.max(80, rect.width * 0.45);
      const dy = (e.clientY - dragRef.current.startY) / Math.max(60, rect.height * 0.45);
      const nextX = Math.max(-1, Math.min(1, Number((dragRef.current.origFx - dx).toFixed(3))));
      const nextY = Math.max(-1, Math.min(1, Number((dragRef.current.origFy - dy).toFixed(3))));
      setFocalX(nextX);
      setFocalY(nextY);
    };

    const handlePointerUp = () => {
      dragRef.current.active = false;
    };

    const handleLocalImagePick = async (file, target) => {
      if (!file) return;
      try {
        const compressed = resolver?.compressImageDataUrl
          ? await resolver.compressImageDataUrl(file, target === 'cover' ? 540 : 960, 0.82)
          : await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = ev => res(ev.target.result);
              r.onerror = rej;
              r.readAsDataURL(file);
            });
        if (target === 'cover') setCustomCover(compressed);
        else {
          setCustomBanner(compressed);
          if (artworkRole === 'glow') setArtworkRole('auto');
        }
        toast('Image loaded into live frame preview.', 'success');
      } catch (err) {
        toast('Failed to read image: ' + (err.message || err), 'error');
      }
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const patch = {
          customCover: customCover.trim(),
          customBanner: customBanner.trim(),
          bannerFocalX: focalX,
          bannerFocalY: focalY,
          bannerZoom: zoom,
          artworkRole
        };
        const updated = resolver
          ? await resolver.saveBookArtwork(book, patch, { setWebImportHistory })
          : Object.assign({}, book, patch);
        toast('Book artwork & frame saved!', 'success');
        if (typeof onSaved === 'function') onSaved(updated);
        if (typeof onClose === 'function') onClose();
      } catch (err) {
        toast('Failed to save artwork: ' + (err.message || err), 'error');
      } finally {
        setSaving(false);
      }
    };

    return h('div', { className: 'omni-details-screen', style: { zIndex: 1320 } },
      h('div', { className: 'omni-details-inner', style: { padding: '0 16px 40px' } },
        h('div', { className: 'omni-details-topbar', style: { paddingLeft: 0, paddingRight: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h('button', { type: 'button', className: 'omni-circle-btn', onClick: onClose }, ic('ArrowLeft', 18)),
            h('div', null,
              h('div', { style: { fontSize: 17, fontWeight: 750, color: '#F5F5F5' } }, 'Customize Cover & Banner'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } }, 'Non-destructive pan, zoom & custom art')
            )
          ),
          h('button', {
            type: 'button',
            className: 'omni-flat-cta',
            style: { flex: 'none', height: 36, padding: '0 16px', fontSize: 12.5 },
            disabled: saving,
            onClick: handleSave
          }, saving ? 'Saving...' : 'Save')
        ),

        // Interactive 16:9 Pan & Zoom Preview Frame
        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, 'Wide Backdrop Frame (Drag to Pan)'),
          h('button', {
            type: 'button',
            className: 'omni-soft-tab',
            style: { padding: '2px 8px', fontSize: 11 },
            onClick: () => { setFocalX(0); setFocalY(0); setZoom(1); }
          }, 'Reset Frame')
        ),
        h('div', {
          ref: previewRef,
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerUp,
          style: {
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#08080A',
            border: '0.6px solid rgba(255,255,255,0.16)',
            touchAction: 'none',
            cursor: previewBanner.src ? 'grab' : 'default'
          }
        },
          previewBanner.src
            ? h('img', { src: previewBanner.src, alt: 'Banner preview', style: previewStyle, draggable: false })
            : h('div', { className: 'omni-hero-glow' }),
          h('div', {
            style: {
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.72) 100%)',
              pointerEvents: 'none'
            }
          }),
          h('div', {
            style: {
              position: 'absolute',
              bottom: 10,
              left: 12,
              right: 12,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'rgba(255,255,255,0.75)',
              pointerEvents: 'none'
            }
          },
            h('span', null, `Focal (${focalX.toFixed(2)}, ${focalY.toFixed(2)})`),
            h('span', null, `Zoom ${zoom.toFixed(2)}x`)
          )
        ),

        // Zoom Slider
        h('div', { className: 'omni-hairline-row', style: { cursor: 'default', marginTop: 8 } },
          h('span', { style: { fontSize: 13, fontWeight: 600, color: '#F5F5F5', minWidth: 88 } }, `Zoom (${zoom.toFixed(2)}x)`),
          h('input', {
            type: 'range',
            min: '1.0',
            max: '2.5',
            step: '0.05',
            value: zoom,
            style: { flex: 1, accentColor: 'var(--omni-accent)' },
            onChange: (e) => setZoom(Number(e.target.value) || 1)
          })
        ),

        // Backdrop Role Selector
        h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
          h('div', { className: 'omni-section-label', style: { marginBottom: 8 } }, 'Hero Backdrop Mode'),
          h('div', { className: 'omni-soft-tabs', style: { paddingBottom: 0 } },
            [
              { id: 'auto', label: 'Banner / Auto Blur' },
              { id: 'cover_as_banner', label: 'Blurred Cover' },
              { id: 'glow', label: 'Ambient Glow Only' }
            ].map(opt => h('button', {
              key: opt.id,
              type: 'button',
              className: `omni-soft-tab ${artworkRole === opt.id ? 'active' : ''}`,
              onClick: () => setArtworkRole(opt.id)
            }, opt.label))
          )
        ),

        // Custom 2:3 Cover Input
        h('div', { style: { padding: '14px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { className: 'omni-section-label' }, 'Custom 2:3 Book Cover'),
            customCover && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { padding: '2px 8px', fontSize: 11, color: '#F87171' },
              onClick: () => setCustomCover('')
            }, 'Reset Cover')
          ),
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
            h('div', { className: 'omni-poster-frame', style: { width: 52, height: 78 } },
              (customCover || book.cover)
                ? h('img', { src: customCover || book.cover, alt: 'Cover' })
                : ic('BookOpen', 18)
            ),
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 } },
              h('div', { className: 'omni-search-bar', style: { marginBottom: 0, height: 38 } },
                h('input', {
                  type: 'text',
                  placeholder: 'Paste cover image URL...',
                  value: customCover.startsWith('data:') ? '(Local image uploaded)' : customCover,
                  onChange: (e) => setCustomCover(e.target.value)
                })
              ),
              h('label', { className: 'omni-soft-tab active', style: { display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', cursor: 'pointer' } },
                ic('Upload', 13),
                'Choose Cover Image',
                h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: (e) => handleLocalImagePick(e.target.files?.[0], 'cover') })
              )
            )
          )
        ),

        // Custom 16:9 Wide Banner Input
        h('div', { style: { padding: '14px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { className: 'omni-section-label' }, 'Custom 16:9 Wide Banner'),
            customBanner && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { padding: '2px 8px', fontSize: 11, color: '#F87171' },
              onClick: () => setCustomBanner('')
            }, 'Clear Banner')
          ),
          h('div', { className: 'omni-search-bar', style: { marginBottom: 8, height: 38 } },
            h('input', {
              type: 'text',
              placeholder: 'Paste wide banner URL...',
              value: customBanner.startsWith('data:') ? '(Local banner uploaded)' : customBanner,
              onChange: (e) => setCustomBanner(e.target.value)
            })
          ),
          h('label', { className: 'omni-soft-tab active', style: { display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', cursor: 'pointer' } },
            ic('Image', 13),
            'Choose Wide Banner Image',
            h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: (e) => handleLocalImagePick(e.target.files?.[0], 'banner') })
          )
        )
      )
    );
  }

  function OmniBookDetailsView(props) {
    const {
      novel,
      onClose,
      getNovelFolderOptions,
      setRenameModalNovel,
      setNewNovelTitleInput,
      setAssignWebsiteModalNovel,
      setNewNovelWebsiteUrlInput,
      getCustomTitle,
      loadFullNovel,
      setActiveTab,
      setStudioSubTab,
      handleCheckNovelUpdate,
      novelUpdateBadges,
      handleDownloadNewChapters,
      handleUpdateTranslateAndMakeEpub,
      handleOpenContinuationForNovel,
      handleOpenAutoGlossary,
      toggleNovelSavedSpace,
      handleSetNovelFolder,
      handleOpenNovelHealthModal,
      handleOpenDiffModal,
      handleEnrichNovelMetadata,
      handleUpgradeNovelIllustrations,
      handleSplitNovelIntoArcs,
      openSiteRecipeEditor,
      confirmAction,
      deleteNovelFromHistory,
      handleTranslateSingleChapter,
      setWebImportHistory,
      setReaderNovelId,
      setReaderNovelTitle,
      setReaderChapterIdx,
      setReaderChapters,
      setReaderOpen,
      setActiveNovelRecord
    } = props || {};

    if (!novel) return null;

    const h = getH();
    const ic = getIc();
    const toast = getToast();
    const resolver = getResolver();
    const ReactObj = typeof React !== 'undefined' ? React : window.React;
    const useState = ReactObj?.useState || function (init) { return [init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const useMemo = ReactObj?.useMemo || function (fn) { return fn(); };

    const omniPrefs = (window.OmniThemeEngine && window.OmniThemeEngine.useOmniPrefs)
      ? window.OmniThemeEngine.useOmniPrefs()
      : { detailsHeader: 'jacket', heroBlur: 24 };

    const [localNovel, setLocalNovel] = useState(novel);
    const [fullNovel, setFullNovel] = useState(null);
    const [activeSectionTab, setActiveSectionTab] = useState('chapters');
    const [chapterQuery, setChapterQuery] = useState('');
    const [chapterSortAsc, setChapterSortAsc] = useState(true);
    const [visibleChaptersLimit, setVisibleChaptersLimit] = useState(140);
    const [artworkModalOpen, setArtworkModalOpen] = useState(false);

    useEffect(() => {
      setLocalNovel(novel);
      setFullNovel(null);
      setActiveSectionTab('chapters');
      setChapterQuery('');
      setVisibleChaptersLimit(140);
      let cancelled = false;
      if (typeof loadFullNovel === 'function') {
        Promise.resolve(loadFullNovel(novel)).then(loaded => {
          if (!cancelled && loaded) {
            setFullNovel(loaded);
          }
        }).catch(() => {});
      }
      return () => { cancelled = true; };
    }, [novel]);

    const item = localNovel || novel;
    const mergedBook = Object.assign({}, item, fullNovel || {});
    const isTrans = !!mergedBook.isTranslated || (mergedBook.title || '').includes('(Translated)');
    const rawChList = useMemo(() => {
      if (isTrans && Array.isArray(mergedBook.translatedChapters) && mergedBook.translatedChapters.length > 0) {
        return mergedBook.translatedChapters;
      }
      if (Array.isArray(mergedBook.rawChapters) && mergedBook.rawChapters.length > 0) return mergedBook.rawChapters;
      if (Array.isArray(mergedBook.chapters) && mergedBook.chapters.length > 0) return mergedBook.chapters;
      if (Array.isArray(mergedBook.chapterList) && mergedBook.chapterList.length > 0) return mergedBook.chapterList;
      return [];
    }, [mergedBook, isTrans]);

    const savedProg = window.getReadingProgress ? window.getReadingProgress(item.id || item.title) : null;
    const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number' && savedProg.chapterIdx >= 0) ? savedProg.chapterIdx : 0;
    const totalCount = rawChList.length || item.chapterCount || 0;
    const pct = savedProg?.pct || (totalCount > 0 && resumeIdx > 0 ? Math.min(100, Math.round(((resumeIdx + 1) / totalCount) * 100)) : 0);

    const fOpts = typeof getNovelFolderOptions === 'function' ? getNovelFolderOptions(item) : {};
    const dispPath = item.folderPath || fOpts.folderPath || '';
    const hasFolder = !!(dispPath || item.folderTreeUri || fOpts.treeUri);
    const folderShort = hasFolder ? folderBasename(dispPath || 'Device') : 'Library';

    const badges = novelUpdateBadges;
    const badge = badges ? (badges[item.id] || badges[item.sourceUrl] || badges[item.title]) : null;
    const newCount = badge ? (badge.newCount ?? badge.count ?? 0) : 0;

    const coverSrc = resolver ? resolver.preferredCover(mergedBook) : (mergedBook.customCover || mergedBook.cover || '');
    const bannerInfo = resolver ? resolver.preferredBanner(mergedBook) : { src: coverSrc, mode: coverSrc ? 'cover' : 'glow' };
    const titleStr = window.cleanLabel ? window.cleanLabel(item.title, 'Untitled Book') : (item.title || 'Untitled Book');
    const authorStr = (window.cleanLabel && window.cleanLabel(item.author)) || 'Author';
    const statusLabel = isTrans ? 'Translated' : (item.isIncomplete ? 'Ongoing' : 'Complete');

    const ensureAndOpenReader = async (targetIdx) => {
      const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null) || item;
      let chs = (full.translatedChapters && full.translatedChapters.length > 0)
        ? full.translatedChapters
        : ((full.rawChapters && full.rawChapters.length > 0) ? full.rawChapters : (full.chapters || []));

      const hasText = chs.some(c => c && (c.text || c.content) && (c.text || c.content).trim().length > 0);
      if (!hasText) {
        let blob = full.epubBlob || item.epubBlob || null;
        if (!blob && (full.fileUri || full.displayPath || item.fileUri || item.displayPath) && window.NativeBridge?.readEpubFile) {
          try {
            blob = await window.NativeBridge.readEpubFile({
              fileUri: full.fileUri || item.fileUri || '',
              displayPath: full.displayPath || item.displayPath || '',
              fileName: full.fileName || item.fileName || ''
            });
          } catch (_) {}
        }
        if (blob) {
          try {
            const readFn = (typeof window.readEpub === 'function') ? window.readEpub : (window.DocumentParser?.parseFile || window.DocumentParser?.readEpub);
            if (readFn) {
              const parsed = await readFn(blob);
              if (parsed && parsed.chapters && parsed.chapters.length > 0) {
                chs = parsed.chapters;
                if (full.id && window.GeminiNovelDB) {
                  window.GeminiNovelDB.updateNovel(full.id, { rawChapters: parsed.chapters, chapters: parsed.chapters, epubBlob: blob }).catch(() => {});
                }
              }
            }
          } catch (_) {}
        }
      }

      if (!chs || chs.length === 0 || !chs.some(c => c && (c.text || c.content) && (c.text || c.content).trim().length > 0)) {
        toast('No chapter text cached yet. Tap "Continue Fetching Online" in Tools & Sync.', 'warning');
        return;
      }

      const cleanCh = (c) => {
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
        const raw = c?.text || c?.content || '';
        return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
      };
      const cleanedChs = chs.map(c => ({
        title: c.title,
        content: cleanCh(c),
        text: cleanCh(c),
        originalTitle: c.originalTitle || c.title,
        arc: c.arc || c.volume || '',
        volume: c.volume || c.arc || '',
        level: c.level !== undefined ? c.level : 1,
        images: Array.isArray(c.images) ? c.images : [],
        isTranslated: Boolean(c.isTranslated || isTrans)
      }));

      if (typeof setActiveNovelRecord === 'function') setActiveNovelRecord(full);
      if (typeof setReaderNovelId === 'function') setReaderNovelId(full.id || full.title);
      if (typeof setReaderNovelTitle === 'function') setReaderNovelTitle(full.title || item.title);
      if (typeof setReaderChapters === 'function') setReaderChapters(cleanedChs);

      const safeIdx = Math.max(0, Math.min(cleanedChs.length - 1, typeof targetIdx === 'number' ? targetIdx : resumeIdx));
      if (typeof setReaderChapterIdx === 'function') setReaderChapterIdx(safeIdx);
      if (typeof setReaderOpen === 'function') setReaderOpen(true);
      if (onClose) onClose();
    };

    const handleExportEpubAction = async () => {
      const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
      if (!full) { toast('Novel data not found in local store.', 'error'); return; }
      if (full.epubBlob && !full.isEdited) {
        const targetFileName = full.fileName || ((full.title || item.title || 'Novel').replace(/\.epub$/i, '') + '.epub');
        const folderOpts = window.MoonReaderEngine ? window.MoonReaderEngine.getNovelFolderOptions(full) : {};
        if (full.fileUri && !folderOpts.fileUri) folderOpts.fileUri = full.fileUri;
        if (full.displayPath && !folderOpts.displayPath) folderOpts.displayPath = full.displayPath;
        if (typeof window.saveUniversalBlob === 'function') {
          await window.saveUniversalBlob(full.epubBlob, targetFileName, 'application/epub+zip', false, folderOpts);
          toast(`Downloaded "${targetFileName}"!`, 'success');
          return;
        }
      }
      const chs = (full.translatedChapters && full.translatedChapters.length > 0) ? full.translatedChapters : (full.chapters || []);
      const isTranslatedNovel = !!(full.isTranslated || (full.translatedChapters && full.translatedChapters.length > 0));
      const exportOpts = {
        chaptersToExport: chs,
        rawBaseTitle: full.title || item.title,
        author: full.author || item.author,
        resolvedCover: coverSrc || full.cover || item.cover,
        fileName: full.title || item.title,
        isTranslated: isTranslatedNovel
      };
      if (typeof props.handleDownloadEPUB === 'function') {
        props.handleDownloadEPUB(chs, exportOpts);
      } else if (typeof window !== 'undefined' && window.ExportEngine?.Controller?.export) {
        window.ExportEngine.Controller.export('epub', exportOpts, { toast });
      }
      if (onClose) onClose();
    };

    const handleHealChaptersAction = async () => {
      try {
        const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
        if (!full) { toast('Novel data not found in local store.', 'error'); return; }
        const chs = (full.translatedChapters && full.translatedChapters.length > 0) ? full.translatedChapters : (full.chapters || []);
        if (!chs || chs.length === 0) { toast('No chapters found in this book.', 'warning'); return; }
        const hasCjkOrError = (text) => typeof text === 'string' && (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text) || /\[Error:.*?\]/i.test(text));
        const targets = [];
        chs.forEach((ch, idx) => {
          const body = ch.content || ch.text || '';
          if (hasCjkOrError(body) || (ch.originalTitle && hasCjkOrError(ch.title))) targets.push(idx);
        });
        if (targets.length === 0) {
          toast('Every chapter in this book is already 100% translated and healthy!', 'success');
          return;
        }
        toast(`Found ${targets.length} chapter(s) needing repair. Healing now...`, 'info');
        const singleChapterFn = handleTranslateSingleChapter || (typeof window !== 'undefined' && window.TranslationLoopEngine?.Controller?.executeTranslateSingleChapter);
        if (!singleChapterFn) { toast('Translation loop engine not available.', 'error'); return; }
        let healedCount = 0;
        for (let i = 0; i < targets.length; i++) {
          const chIdx = targets[i];
          const chap = chs[chIdx];
          try {
            const res = await singleChapterFn(chIdx, chap, null, 'heal');
            if (res && res.content) {
              chs[chIdx] = { ...chs[chIdx], content: res.content, text: res.content, title: res.title || chs[chIdx].title, isTranslated: true };
              healedCount++;
            }
          } catch (_) {}
        }
        full.translatedChapters = chs;
        full.epubBlob = undefined;
        full.updatedAt = Date.now();
        if (typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
          await window.GeminiNovelDB.updateNovel(full);
        }
        toast(`Healed ${healedCount} chapter(s).`, 'success');
      } catch (err) {
        toast('Batch healing stopped: ' + (err.message || err), 'warning');
      }
    };

    const handleSmartCoverAction = async () => {
      try {
        const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
        const bookTitle = (full && full.title) || item.title || 'Web Novel';
        const bookAuthor = (full && full.author) || item.author || 'Author';
        const genCoverFn = (typeof window !== 'undefined' && window.EpubEngine?.generateCoverDataUrl) || (typeof window !== 'undefined' && window.generateCoverDataUrl);
        if (!genCoverFn) { toast('Cover generator engine not ready.', 'warning'); return; }
        const newCover = await genCoverFn(bookTitle, bookAuthor);
        if (!newCover) { toast('Could not generate cover image.', 'error'); return; }
        const saved = resolver
          ? await resolver.saveBookArtwork(full || item, { customCover: newCover }, { setWebImportHistory })
          : Object.assign({}, item, { cover: newCover, customCover: newCover });
        setLocalNovel(saved);
        toast(`Generated typography cover for "${bookTitle}".`, 'success');
      } catch (err) {
        toast('Failed to generate cover: ' + (err.message || err), 'error');
      }
    };

    const hairlineRow = (iconName, title, desc, onClick, isDanger, rightText) => h('div', {
      className: 'omni-hairline-row',
      onClick
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } },
        h('span', { style: { color: isDanger ? '#F87171' : 'var(--omni-accent)', display: 'inline-flex', flexShrink: 0 } }, ic(iconName, 17)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 13.5, fontWeight: 650, color: isDanger ? '#F87171' : '#F5F5F5' } }, title),
          desc && h('div', { style: { fontSize: 11.5, color: isDanger ? 'rgba(248,113,113,0.75)' : 'rgba(255,255,255,0.48)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 } }, desc)
        )
      ),
      rightText
        ? h('span', { style: { fontSize: 11.5, fontWeight: 650, color: 'var(--omni-accent)', flexShrink: 0 } }, rightText)
        : ic('ChevronRight', 15)
    );

    const indexedChapters = useMemo(() => {
      const q = (chapterQuery || '').trim().toLowerCase();
      const mapped = rawChList.map((ch, idx) => ({
        idx,
        title: (ch && ch.title) || `Chapter ${idx + 1}`,
        words: (ch && ch.words) || 0
      }));
      const filtered = q ? mapped.filter(c => c.title.toLowerCase().includes(q) || String(c.idx + 1).includes(q)) : mapped;
      return chapterSortAsc ? filtered : [...filtered].reverse();
    }, [rawChList, chapterQuery, chapterSortAsc]);

    return h('div', { className: 'omni-details-screen' },
      h('div', { className: 'omni-details-inner' },

        // Sticky Top Controls
        h('div', { className: 'omni-details-topbar' },
          h('button', { type: 'button', className: 'omni-circle-btn translucent', title: 'Back', onClick: onClose }, ic('ArrowLeft', 18)),
          h('div', { className: 'omni-header-actions' },
            h('button', { type: 'button', className: 'omni-circle-btn translucent', title: 'Customize Cover & Banner', onClick: () => setArtworkModalOpen(true) }, ic('Image', 16)),
            h('button', {
              type: 'button',
              className: 'omni-circle-btn translucent',
              title: 'Rename Novel',
              onClick: () => {
                if (onClose) onClose();
                if (setRenameModalNovel) setRenameModalNovel(item);
                if (setNewNovelTitleInput) setNewNovelTitleInput(item.customTitle || (getCustomTitle ? getCustomTitle(item) : '') || item.title || '');
              }
            }, ic('Edit', 15))
          )
        ),

        // Dual Header: Split Hero vs Centered Book Jacket
        omniPrefs.detailsHeader === 'split'
          ? h('div', { className: 'omni-details-split-hero' },
              h('div', { className: 'omni-hero-bg' },
                bannerInfo.src
                  ? h('img', { src: bannerInfo.src, alt: '', referrerPolicy: 'no-referrer', style: resolver ? resolver.getBannerImgStyle(mergedBook, omniPrefs.heroBlur) : { width: '100%', height: '100%', objectFit: 'cover' } })
                  : h('div', { className: 'omni-hero-glow' })
              ),
              h('div', { className: 'omni-hero-vignette' }),
              h('div', { className: 'omni-details-split-content' },
                h('div', { className: 'omni-poster-frame', style: { width: 104, height: 156 } },
                  coverSrc ? h('img', { src: coverSrc, alt: titleStr, referrerPolicy: 'no-referrer' }) : h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' } }, ic('BookOpen', 28))
                ),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--omni-accent)', marginBottom: 4 } },
                    `${item.isEpub ? 'EPUB' : 'WEB NOVEL'} · ${statusLabel}`
                  ),
                  h('h1', { style: { fontSize: 21, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#FFFFFF', margin: 0 } }, titleStr),
                  h('div', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 4 } }, authorStr)
                )
              )
            )
          : h('div', { className: 'omni-details-jacket-wrap' },
              h('div', { className: 'omni-details-ambient' },
                bannerInfo.src
                  ? h('img', { src: bannerInfo.src, alt: '', referrerPolicy: 'no-referrer', style: resolver ? resolver.getBannerImgStyle(mergedBook, Math.max(18, omniPrefs.heroBlur || 24)) : { width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(26px)' } })
                  : h('div', { className: 'omni-hero-glow' })
              ),
              h('div', { className: 'omni-book-jacket', style: { position: 'relative', zIndex: 3 } },
                coverSrc ? h('img', { src: coverSrc, alt: titleStr, referrerPolicy: 'no-referrer' }) : h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)' } }, ic('BookOpen', 34))
              ),
              h('div', { style: { position: 'relative', zIndex: 3 } },
                h('h1', { style: { fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em', color: '#FFFFFF', margin: 0 } }, titleStr),
                h('div', { style: { fontSize: 13.5, fontWeight: 650, color: 'var(--omni-accent)', marginTop: 5 } }, authorStr),
                h('div', { style: { fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginTop: 6 } },
                  `${item.isEpub ? 'EPUB' : 'WEB NOVEL'} · ${totalCount} CHAPTERS · ${statusLabel}`
                )
              )
            ),

        h('div', { style: { padding: '0 16px' } },
          // Unboxed 4-Column Hairline Stats Strip
          h('div', { className: 'omni-hairline-strip' },
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, `${pct}%`),
              h('div', { className: 'omni-stat-lbl' }, 'Progress')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, `${resumeIdx + (totalCount > 0 ? 1 : 0)} / ${totalCount}`),
              h('div', { className: 'omni-stat-lbl' }, 'Read')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, statusLabel),
              h('div', { className: 'omni-stat-lbl' }, 'Status')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, folderShort),
              h('div', { className: 'omni-stat-lbl' }, 'Folder')
            )
          ),

          // Flat 8px CTA Bar
          h('div', { className: 'omni-cta-row' },
            h('button', {
              type: 'button',
              className: 'omni-flat-cta',
              onClick: () => ensureAndOpenReader(resumeIdx)
            }, ic('Play', 14), pct > 0 || resumeIdx > 0 ? `Continue · Ch. ${resumeIdx + 1}` : 'Start Reading'),
            h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Download EPUB', onClick: handleExportEpubAction }, ic('Download', 17)),
            h('button', {
              type: 'button',
              className: 'omni-flat-icon-btn',
              title: 'Check Online Updates',
              onClick: () => handleCheckNovelUpdate && handleCheckNovelUpdate(item)
            },
              ic('RefreshCw', 17),
              newCount > 0 && h('span', { style: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--omni-jade)' } })
            ),
            h('button', {
              type: 'button',
              className: `omni-flat-icon-btn ${item.inSavedSpace ? 'active' : ''}`,
              title: item.inSavedSpace ? 'In Saved Space' : 'Save to Space',
              onClick: () => {
                if (toggleNovelSavedSpace) {
                  toggleNovelSavedSpace(item.id, item);
                  setLocalNovel(prev => prev ? Object.assign({}, prev, { inSavedSpace: !prev.inSavedSpace }) : prev);
                }
              }
            }, ic('Star', 17))
          ),

          // Live Update Strip if new chapters detected
          newCount > 0 && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap', gap: 8 } },
            h('span', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--omni-jade)' } }, `${newCount} new chapter(s) available online`),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { type: 'button', className: 'omni-soft-tab active', onClick: () => { onClose?.(); handleDownloadNewChapters?.(item); } }, 'Download New'),
              h('button', { type: 'button', className: 'omni-flat-cta', style: { height: 32, padding: '0 12px', fontSize: 12 }, onClick: () => { onClose?.(); handleUpdateTranslateAndMakeEpub?.(item); } }, 'Translate & EPUB')
            )
          ),

          // Synopsis snippet if present
          mergedBook.summary && h('p', { style: { fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.62)', margin: '10px 0 6px' } }, mergedBook.summary),

          // Editorial Underline Tabs
          h('div', { className: 'omni-underline-tabs' },
            h('button', { type: 'button', className: `omni-underline-tab ${activeSectionTab === 'chapters' ? 'active' : ''}`, onClick: () => setActiveSectionTab('chapters') },
              `Chapters (${rawChList.length})`
            ),
            h('button', { type: 'button', className: `omni-underline-tab ${activeSectionTab === 'tools' ? 'active' : ''}`, onClick: () => setActiveSectionTab('tools') },
              'Tools & Sync'
            ),
            h('button', { type: 'button', className: `omni-underline-tab ${activeSectionTab === 'glossary' ? 'active' : ''}`, onClick: () => setActiveSectionTab('glossary') },
              'Glossary'
            )
          ),

          // TAB 1: Chapters
          activeSectionTab === 'chapters' && h('div', { style: { marginTop: 10 } },
            rawChList.length > 10 && h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 } },
              h('div', { className: 'omni-search-bar', style: { flex: 1, marginBottom: 0, height: 38 } },
                ic('Search', 14),
                h('input', {
                  type: 'text',
                  placeholder: 'Jump to chapter title or number...',
                  value: chapterQuery,
                  onChange: (e) => setChapterQuery(e.target.value)
                }),
                chapterQuery && h('button', { type: 'button', className: 'omni-circle-btn', style: { width: 22, height: 22 }, onClick: () => setChapterQuery('') }, ic('X', 11))
              ),
              h('button', {
                type: 'button',
                className: 'omni-flat-icon-btn',
                style: { width: 38, height: 38 },
                title: 'Reverse Chapter Order',
                onClick: () => setChapterSortAsc(v => !v)
              }, ic('ArrowUpDown', 15))
            ),
            rawChList.length === 0
              ? h('div', { style: { padding: '28px 0', textAlign: 'center', color: 'rgba(255,255,255,0.48)', fontSize: 13 } },
                  'Loading chapter index or pointer-only EPUB. Tap Start Reading to open directly.'
                )
              : h(React.Fragment, null,
                  indexedChapters.slice(0, visibleChaptersLimit).map(ch => {
                    const isRead = savedProg && ch.idx <= resumeIdx;
                    return h('div', { key: ch.idx, className: 'omni-hairline-row', onClick: () => ensureAndOpenReader(ch.idx) },
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontSize: 13.5, fontWeight: ch.idx === resumeIdx ? 750 : 550, color: ch.idx === resumeIdx ? 'var(--omni-accent)' : (isRead ? 'rgba(255,255,255,0.52)' : '#F5F5F5'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
                          ch.title
                        ),
                        h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 } },
                          `Chapter ${ch.idx + 1}${ch.words > 0 ? ` · ${ch.words.toLocaleString()} words` : ''}${ch.idx === resumeIdx ? ' · Last Read' : ''}`
                        )
                      ),
                      isRead ? ic('Check', 14) : ic('ChevronRight', 14)
                    );
                  }),
                  indexedChapters.length > visibleChaptersLimit && h('div', { style: { textAlign: 'center', padding: '16px 0' } },
                    h('button', {
                      type: 'button',
                      className: 'omni-soft-tab active',
                      onClick: () => setVisibleChaptersLimit(n => n + 200)
                    }, `Show More Chapters (${indexedChapters.length - visibleChaptersLimit} remaining)`)
                  )
                )
          ),

          // TAB 2: Tools & Sync (Preserving 100% of existing Book Menu actions)
          activeSectionTab === 'tools' && h('div', { style: { marginTop: 4 } },
            hairlineRow('Image', 'Customize Cover & Wide Banner', 'Pick custom artwork and pan/zoom the hero backdrop', () => setArtworkModalOpen(true)),
            hairlineRow('BookOpen', 'Edit in Ebook Studio', 'Edit chapters, prose, covers, and table of contents', async () => {
              const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
              if (!full) { toast('Novel data not found.', 'error'); return; }
              onClose?.();
              setActiveTab?.('studio');
              setStudioSubTab?.('edit');
              try { localStorage.setItem('activeTab', 'studio'); localStorage.setItem('studioSubTab', 'edit'); } catch (_) {}
              window.loadEpubForEditing?.(full);
            }),
            hairlineRow('Download', 'Continue Fetching Online', 'Fetch new chapters from web and append to this book', () => {
              onClose?.();
              handleOpenContinuationForNovel?.(item);
            }),
            hairlineRow('Globe', (item.sourceUrl || item.url) ? 'Change Website Source' : 'Assign Website Source', (item.sourceUrl || item.url) ? (item.sourceUrl || item.url).replace(/^https?:\/\//i, '').slice(0, 42) : 'Bind novel to an online website to fetch ongoing chapters', () => {
              onClose?.();
              setAssignWebsiteModalNovel?.(item);
              setNewNovelWebsiteUrlInput?.(item.sourceUrl || item.url || '');
            }),
            (item.sourceUrl || item.url) && /^https?:\/\//i.test(item.sourceUrl || item.url) && hairlineRow('Settings', "Site Settings for Book's Website", 'Customize HTML chapter extraction rules for this site', () => {
              const u = item.sourceUrl || item.url;
              onClose?.();
              if (typeof openSiteRecipeEditor === 'function') openSiteRecipeEditor({ url: u });
              else window.SiteRecipeEngine?.Controller?.open?.({ url: u });
            }),
            hairlineRow('Folder', 'Designated Device Folder', hasFolder ? `Linked: ${dispPath || 'Device Storage'}` : 'Set auto-export folder for Moon+ Reader continuity', () => handleSetNovelFolder?.(item), false, hasFolder ? 'Set' : null),
            (item.fileUri || item.displayPath || item.folderPath) && hairlineRow('HardDrive', 'Storage Pointer Details', item.displayPath || item.folderPath || 'Device Storage', () => {
              toast(`Linked to ${item.displayPath || item.folderPath || 'device storage'}.`, 'info');
            }),
            hairlineRow('Sparkles', 'Heal All Chapters (Save Tokens)', 'Fix untranslated leaks without re-translating healthy chapters', handleHealChaptersAction),
            hairlineRow('Image', 'Generate Smart Typography Cover', 'Render clean typographic cover art for this title', handleSmartCoverAction),
            hairlineRow('Activity', 'Novel Health & QA Audit', 'Scan for CJK leaks, empty chapters, and AI loops', () => {
              onClose?.();
              handleOpenNovelHealthModal?.(item);
            }),
            hairlineRow('GitCompare', 'Translation Diffs & History', 'Compare chapter revisions and roll back changes', async () => {
              const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
              if (full && handleOpenDiffModal) { onClose?.(); handleOpenDiffModal(0, full); }
              else toast('Novel data not found.', 'error');
            }),
            hairlineRow('Tag', 'Enrich Metadata (AniList)', 'Fetch high-res artwork, synopsis, and tags', () => {
              onClose?.();
              handleEnrichNovelMetadata?.(item);
            }),
            hairlineRow('Sparkles', 'Upgrade Illustrations', 'Replace blurry thumbnails with crisp sharp artwork', () => {
              onClose?.();
              handleUpgradeNovelIllustrations?.(item);
            }),
            hairlineRow('Scissors', 'Split into Story Arcs', 'Divide large multi-volume novel into separate books', () => {
              onClose?.();
              handleSplitNovelIntoArcs?.(item);
            }),
            hairlineRow('Trash2', 'Remove from Library', 'Move book and cached chapters into Recycle Bin', () => {
              confirmAction?.(`Remove "${titleStr}" from the library?`, async () => {
                onClose?.();
                if (deleteNovelFromHistory) await deleteNovelFromHistory(item.id);
              });
            }, true)
          ),

          // TAB 3: Glossary
          activeSectionTab === 'glossary' && h('div', { style: { marginTop: 4 } },
            hairlineRow('Sparkles', 'Auto-Build Character & Lore Glossary', 'Extract names and terms from this book with AI', async () => {
              const full = fullNovel || (loadFullNovel ? await loadFullNovel(item) : null);
              if (!full) { toast('Novel data not found.', 'error'); return; }
              onClose?.();
              handleOpenAutoGlossary?.(full);
            }),
            hairlineRow('BookOpen', 'Open Full Glossary Table Editor', 'View, filter, and lock active character terms', () => {
              onClose?.();
              if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('open-glossary-editor'));
              }
            })
          )
        ),

        h(OmniArtworkPickerModal, {
          isOpen: artworkModalOpen,
          book: mergedBook,
          setWebImportHistory,
          onClose: () => setArtworkModalOpen(false),
          onSaved: (updated) => {
            if (updated) {
              setLocalNovel(updated);
              setFullNovel(updated);
            }
          }
        })
      )
    );
  }

  return {
    OmniBookDetailsView,
    OmniArtworkPickerModal
  };
}));
