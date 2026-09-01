# UI Interactions Map — index.html (root)

> Audited 2026-09-01. The root `index.html` is a single compiled React app (`h()` elements).
> `www/index.html` and `android/app/src/main/assets/public/index.html` hold the older deployed copy and differ from the root (see findings).
> The EPUB Studio container and preview modal are injected HTML from `epub_studio_ui.js` / `splitter.js` / `merger.js` — audited separately, not in this file.

## ⚠️ Critical findings (uncommitted edits vs. the deployed copy)

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **`layoutMode` is undefined** → rendering the Translate tab throws `ReferenceError`, so the app crashes to the ErrorBoundary on load (default tab is `text`) | referenced only at index.html:9454; defined nowhere, not even in `www/` |
| 2 | **`currentDisplayOutput` is undefined** → Translate tab output pane crashes on render (the real state is `assembledText`) | used at index.html:9505–9534, never declared |
| 3 | **`savedNovelsHistory` / `setSavedNovelsHistory` undefined** → Library tab crashes on render (real state is `webImportHistory`) | used at index.html:9697–9709, never declared |
| 4 | **6 handlers are referenced but never defined** → clicking throws `ReferenceError`: `handleTranslate()` (9493), `handleFileUpload` (9470), `handlePasteFromClipboard` (9468), `handleAutoDetectSplit` (9486), `handleSwapLanguages` (9428), `handleImportBackup` (9961). `handleStartTranslation`/`processFile`/`importFullBackup` exist as the intended implementations. `www/` wires the Translate button to `handleStartTranslation` — this is a regression | |
| 5 | **Toast UI not rendered** — `toast()` queues state with 3.2s auto-dismiss but no JSX renders `toasts` (www renders it at www/index.html:10810) → all toasts are invisible | |
| 6 | **Confirm dialog not rendered** — `confirmAction()` (index.html:8416) sets `showModal`/`modalMessage`/`modalCallback` but no JSX renders them (www renders it at www/index.html:10816) → all 6 confirm flows (delete key, delete profile, clear default glossary, clear history, "Clear All" library button) silently do nothing | |
| 7 | **`downloadSuccessModal` and `epubPackagingModal` state set but never rendered** (www renders the download modal) | |
| 8 | **Dead code**: `LanguageSelector` (2105–2245, searchable dropdown w/ keyboard handlers) and `secHeader` (9341) are defined but never rendered | |
| 9 | Minor: reader theme/font/size (`readerTheme`, `readerFont`, `readerFontSize`) init from localStorage but are **never persisted**; `studioSubTab` persists on init but the tab buttons never save it; `srcLang`/`tgtLang` never persist | |

---

## Interaction table

Columns: **Element / label** · **Event trigger** · **State/DOM change** · **Secondary effects**

### Global keyboard & window listeners

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Global keyboard shortcuts | `window keydown` (index.html:4169) | — | **Ctrl/Cmd+Enter** → `handleStartTranslation()`; **Ctrl/Cmd+Shift+C** → copy `assembledText` + toast; **Ctrl/Cmd+Alt+R** → `setReaderOpen(prev => !prev)`; **Escape** → closes reader modal / confirm modal / reader settings |
| PWA install prompt | `beforeinstallprompt` (3599) | `deferredPrompt` set | enables Install button pulse state |
| App installed | `appinstalled` (3601) | `deferredPrompt` cleared | toast (invisible, see finding 5) |
| Cross-module toast bridge | `app-toast` custom event (4042) | — | calls `toast(detail.msg, detail.type)` |
| Studio → Translator import | `load-extracted-text` (3621) | `setInputText(text)`, `setActiveTab('text')` | toast |
| Box resize drag | `touchmove`/`touchend` on `window` (3930–3931, during drag only) | live box height state | `localStorage.setItem('<box>BoxHeight')` on release |
| InfoTooltip responsive mode | `window resize` (2018, passive) | `isMobile` flag | — |

### Header bar

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Version badge `v8.3.3` "Check for updates" | `onClick` (9370) | `availableUpdate` set → shows banner | `NativeBridge.checkForUpdate(VERSION)`; manual toasts |
| Install App (download icon, hidden in standalone) | `onClick` (9375) | `deferredPrompt` cleared | native PWA `prompt()`; fallback `alert()` with install instructions |
| Theme toggle (Sun/Moon) | `onClick` (9380) | `setDarkMode(!darkMode)` | effect toggles `document.documentElement.classList 'dark'` + `localStorage.darkMode` |

### Update banner (rendered when `availableUpdate`)

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| "Update Now" | `onClick` (9402) | `isUpdating` flag, label → "Downloading..." | `NativeBridge.installApk(apkUrl)`; on failure opens GitHub release page |
| Dismiss (X) | `onClick` (9407) | banner unmounts | — |

### Translate tab

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Source language `<select>` | `onChange` (9423) | `setSrcLang` | **not persisted**; disabled while translating |
| Swap languages (⇄) | `onClick` (9428) ⚠️ **UNDEFINED handler** | — | crashes on click |
| Target language `<select>` | `onChange` (9435) | `setTgtLang` | **not persisted** |
| Engine button (shows model name) | `onClick` (9442) | `setActiveTab('settings')` | persisted via `activeTab` effect |
| "Clear" (source pane) | `onClick` (9467) | clears `inputText`, `chapters` | `localStorage.removeItem('inputText')` |
| "Paste" | `onClick` (9468) ⚠️ **UNDEFINED handler** | — | crashes on click |
| "File (.epub/.txt)" | `onClick` (9469) | opens file dialog | `fileInputRef.current.click()` |
| Hidden file input (`.txt,.epub,.docx,.pdf,.md,.html,.xml`) | `onChange` (9470) ⚠️ **UNDEFINED handler** | — | crashes on file select (intended: `processFile` at 9057) |
| Source textarea | `onChange` (9476) | `setInputText` | **`localStorage.setItem('inputText')` on every keystroke (no debounce)** |
| Resize bar – "Compact" | `onClick` (3997) | box height → preset default | `localStorage.setItem('<box>BoxHeight')` |
| Resize bar – "Fit Text" | `onClick` (4003) | height → `scrollHeight+25` (cap 4000) | persisted |
| Resize bar – drag handle | `onTouchStart` (4013) + window touchmove/touchend | live height (1.85× multiplier) | persisted on release |
| Resize bar – drag handle | `onDoubleClick` (4014) | toggle expanded/default | persisted |
| Resize bar – "Expand/Collapse" | `onClick` (4023) | toggle expanded/default | persisted |
| "Split Chapters" | `onClick` (9486) ⚠️ **UNDEFINED handler** | — | crashes on click |
| "Translate" (primary) | `onClick` (9493) ⚠️ **UNDEFINED handler** (`handleTranslate`) | — | crashes on click (intended: `handleStartTranslation`, 8951) |
| Output textarea | `onChange` (9523) | `setAssembledText` (editable) | not persisted |
| "Copy" | `onClick` (9509) | — | `copyText(output)` + toast |
| "Reader View" | `onClick` (9514) | `setReaderOpen(true)`, `setReaderChapterIdx(0)` | — |
| "EPUB" | `onClick` (9533) | `downloadingEpub` flag | `generateEpubFromChapters()` → `saveUniversalBlob()`; sets `epubPackagingModal` (not rendered); toast |
| "Open in Reader" | `onClick` (9538) | — | EPUB export, then `NativeBridge.openWithReader(fileName, path)` |
| "PDF" | `onClick` (9549) | `downloadingPdf` flag | jsPDF render → `saveUniversalBlob()` |
| "DOCX" | `onClick` (9554) | `downloadingDocx` flag | docx `Packer.toBlob` → `saveUniversalBlob()` |
| Input pane dropzone | `onDragOver` / `onDragLeave` / `onDrop` (9458) | `isDragOver` highlight ring | dropped file → `processFile(f)` (9057: EPUB/PDF/TXT/JSON dispatch, auto-starts translation, native `confirm()` to resume saved session) |

### Web Importer tab

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Novel URL input | `onChange` (9583) | `setWebImportUrl` | — |
| "Fetch Novel" | `onClick` (9588) | `isFetchingUrl`, `webImportStatus` live progress | `window.WebNovelImporter.importUrl(url, cb)` → `setWebImportData` + `saveNovelToHistory` (IndexedDB via `GeminiNovelDB` + `localStorage gemini_web_import_history_meta`, max 50) |
| "Include Illustrations / Images" checkbox | `onChange` (9614) | `setEpubIncludeImages` | persisted via effect; label flips "Full Media Mode"/"Text-Only Turbo Mode" |
| "Download Raw EPUB" | `onClick` (9636) | `epubPackagingModal` progress (not rendered) | `generateEpubFromChapters()` → `saveUniversalBlob()` |
| "Send to Translator" | `onClick` (9654) | `setInputText`, `setChapters`, `setActiveTab('text')` | toast |
| Info tooltip (Supported Sources) | see InfoTooltip rows | — | — |

### EPUB Studio tab

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| "Split EPUB into Volumes" | `onClick` (9675) | `setStudioSubTab('split')` | `window.switchStudioSubTab?.('split')`; effect calls `window.initSplitter()` (external `splitter.js`); **not persisted on click** |
| "Merge EPUBs into Single Book" | `onClick` (9679) | `setStudioSubTab('merge')` | same, via `window.initMerger()` (`merger.js`) |
| *(Studio container + preview modal content is injected HTML from `epub_studio_ui.js` — audited separately, not part of index.html)* | — | — | — |

### Library tab ⚠️ (crashes on render — `savedNovelsHistory` undefined)

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| "Clear All" | `onClick` (9698) ⚠️ | `confirmAction` — **no modal rendered, action never runs** | (intended: clear `savedNovelsHistory` + `localStorage.removeItem`) |
| "Translate" (per book) | `onClick` (9715) | `setInputText`, `setChapters`, `setActiveTab('text')` | — |
| "EPUB" (per book) | `onClick` (9724) | — | `generateEpubFromChapters()` → `saveUniversalBlob()` |

### Settings tab

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Active Provider `<select>` (6 providers) | `onChange` (9752) | `setProvider` | persisted via effect `translationProvider`; re-renders model selector + API key card |
| Gemini Model `<select>` | `onChange` (9763) | `setGeminiModel` | `localStorage.setItem('geminiModel')` |
| DeepSeek Model `<select>` | `onChange` (9769) | `setDeepseekModel` | `localStorage.setItem('deepseekModel')` |
| "Typewriter Streaming" checkbox | `onChange` (9776) | `setEnableStreaming` | persisted via effect |
| "Context-Aware Memory" checkbox | `onChange` (9780) | `setContextAware` | persisted via effect |
| "Extended Thinking (Reasoning)" checkbox | `onChange` (9784) | `setEnableThinking` | `localStorage.setItem('enableThinking')` |
| Parallel Concurrency `<input range 1–20>` | `onChange` (9795) | `setConcurrency` (immediate, no debounce) | persisted via effect; live "N streams" label |
| "Embed Images" toggle card | `onChange` (9813) | `setEpubIncludeImages` | persisted via effect |
| "Drop Caps" toggle card | `onChange` (9820) | `setEpubDropCaps` | persisted via effect |
| "Clean Web Junk" toggle card | `onChange` (9827) | `setEpubCleanWebArtifacts` | persisted via effect |
| "Justify Text" toggle card | `onChange` (9834) | `setEpubJustifyText` | persisted via effect |
| EPUB Font Family ×4 (Literata/Georgia/Inter/Default) | `onClick` (9847) | `setEpubFontTheme` | persisted via effect; active pill styling |
| Glossary presets "RI" / "LOTM" / "Xianxia" | `onClick` (9862–9864) | appends preset block to `terminology` | `localStorage.setItem('terminology')` + toast |
| Glossary textarea | `onChange` (9870) | `setTerminology` | **localStorage write per keystroke (no debounce)** |
| "Smart Dynamic Glossary Filtering" checkbox | `onChange` (9876) | `setSmartGlossary` | `localStorage.setItem('smartGlossary')` |
| "Clear" (glossary) | `onClick` (9879) | `setTerminology('')` | `localStorage.removeItem('terminology')` |
| Instructions presets "Literary" / "Dialogue" | `onClick` (9891–9892) | appends preset block to `customInstructions` | `localStorage.setItem('customInstructions')` + toast |
| Custom instructions textarea | `onChange` (9898) | `setCustomInstructions` | **localStorage write per keystroke (no debounce)** |
| "Add Key" | `onClick` (9911) | appends new profile to `apiKeysByProvider[provider]` | `localStorage apiKeysByProvider`; auto-set as active if none; toast |
| Key profile name input | `onChange` (9920) | `updateApiKey(...,'name')` | `localStorage apiKeysByProvider` |
| "Set Active" (per key) | `onClick` (9927) | `setActiveKey(provider, id)` | `localStorage activeKeyIds` + toast |
| Delete key (trash) | `onClick` (9928) ⚠️ | `confirmAction` — **modal never renders → delete never executes** | — |
| API key value input (password/text) | `onChange` (9935) | `updateApiKey(...,'key')` | `localStorage apiKeysByProvider` |
| Show/hide key (eye) | `onClick` (9941) | `showKeys[id]` toggle → input type flip | — |
| "Export Backup (+ Keys)" | `onClick` (9957) | — | `exportFullBackup(true)`: gathers glossaries/history/keys/models → JSON blob → native Share Sheet or download |
| "Export Safe Backup" | `onClick` (9958) | — | `exportFullBackup(false)` (no keys) |
| "Import Backup" label + hidden `.json` file input | `onChange` (9961) ⚠️ **UNDEFINED handler** | — | crashes on file select (intended: `importFullBackup`, 8384) |

### Bottom navigation bar

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Tab ×5 (Translate / Import / Studio / Library / Settings) | `onClick` (9980) | `setActiveTab(key)`; active tab highlight | `localStorage.setItem('activeTab')` + `window.scrollTo({top:0, smooth})`; effect also re-persists and re-inits Studio |

### MoonReaderModal (Reader View overlay)

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| TOC toggle (list icon) | `onClick` (3098) | `showToc` slide-over | — |
| TTS dock toggle (volume icon) | `onClick` (3110) | `showTtsBar`; starts `handlePlayPause()` if idle | speechSynthesis |
| Appearance settings (sliders icon) | `onClick` (3120) | `showSettings` drawer | — |
| Close Reader (X) | `onClick` (3127) | stops TTS + `onClose()` | `speechSynthesis.cancel()` |
| TOC chapter rows | `onClick` (3155) | `setActiveIdx`, `onChapterChange(idx)` (syncs parent `readerChapterIdx`), closes TOC | restarts TTS at sentence 0 if playing |
| Paragraph click (content) | `onClick` (3199) | matches sentence → `speakSentence(idx)`; highlights `activeSentenceIdx` | speechSynthesis; auto-scrolls reading position |
| Previous / Next Chapter | `onClick` (3214 / 3225) | `setActiveIdx ±1`, `onChapterChange` | restarts TTS if playing; disabled at bounds |
| TTS: Previous Sentence | `onClick` (3245) | `speakSentence(idx−1)` | speechSynthesis |
| TTS: Play/Pause | `onClick` (3251) | pause/resume/start; icon swap | speechSynthesis |
| TTS: Next Sentence | `onClick` (3257) | `speakSentence(idx+1)` | speechSynthesis; auto-advances chapters |
| TTS: Stop | `onClick` (3263) | `speechSynthesis.cancel()`, clears highlight | `window.__activeTtsUtterance = null` |
| TTS speed `<input range 0.5–3.0>` | `onChange` (3287) | `setTtsSpeed` | restarts current sentence at new rate if playing |
| TTS voice `<select>` | `onChange` (3299) | `setSelectedVoice` | restarts current sentence if playing; voice list from `speechSynthesis.onvoiceschanged` |
| Reader theme ×4 (Dark/OLED/Sepia/Light) | `onClick` (3319) | `setReaderTheme(t)` → parent `readerTheme` | **not persisted** (init from localStorage only) |
| Reader font ×3 (Serif/Sans/Mono) | `onClick` (3329) | `setReaderFont(f)` | **not persisted** |
| Font size − / + | `onClick` (3338 / 3343) | `setReaderFontSize(±2)`, clamp 12–36 | **not persisted** |

### InfoTooltip component (used once: Web Importer "Supported Sources")

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| Info icon button | `onClick` (2044) toggle; `onMouseEnter`/`onMouseLeave` (2045–2046, desktop hover) | `show` popover, `placement` top/bottom via `checkPlacement()` | — |
| Mobile backdrop | `onClick` (2054) | `setShow(false)` | — |
| Modal close (X) | `onClick` (2067) | `setShow(false)` | — |
| "Got it" | `onClick` (2078) | `setShow(false)` | — |

### ErrorBoundary

| Element / label | Event trigger | State/DOM change | Secondary effects |
|---|---|---|---|
| "Try Again" | `onClick` (3357) | resets `hasError` → re-renders children | — |
