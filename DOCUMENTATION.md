# Gemini Translator & EPUB Studio — Technical Documentation & Architecture Reference

> **Version:** 4.1.0  
> **Repository:** [ExZyO/Gemini-Translator](https://github.com/ExZyO/Gemini-Translator)  
> **Tech Stack:** Vanilla JavaScript (ES Modules), React 18, Tailwind CSS, JSZip, PDF.js, jsPDF, jEpub, docx, Service Worker (PWA)  
> **Runtime Environment:** 100% Client-side (Zero backend server required)

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Codebase Architecture & File Structure](#2-codebase-architecture--file-structure)
3. [Core Translation Engine](#3-core-translation-engine)
   - [Supported Translation Providers](#supported-translation-providers)
   - [Prompt Engineering & Structure](#prompt-engineering--structure)
   - [Context-Aware Rolling Memory System](#context-aware-rolling-memory-system)
   - [Streaming Sliding Window Delimiter Parser](#streaming-sliding-window-delimiter-parser)
   - [Parallel Batch Processing Engine](#parallel-batch-processing-engine)
   - [Session Management & Auto-Resume](#session-management--auto-resume)
4. [Document Ingestion & True EPUB Translation](#4-document-ingestion--true-epub-translation)
   - [Plain Text Ingestion](#plain-text-ingestion)
   - [PDF Ingestion (PDF.js)](#pdf-ingestion-pdfjs)
   - [True EPUB Translation Engine (DOM Node TreeWalker)](#true-epub-translation-engine-dom-node-treewalker)
5. [Document Exporting & Multi-Format Builders](#5-document-exporting--multi-format-builders)
   - [EPUB Generator (jEpub & Modified ZIP Container)](#epub-generator-jepub--modified-zip-container)
   - [PDF Generator (jsPDF)](#pdf-generator-jspdf)
   - [DOCX Generator (docx.js)](#docx-generator-docxjs)
6. [EPUB Studio: Splitter & Merger](#6-epub-studio-splitter--merger)
   - [EPUB Splitter (`splitter.js`)](#epub-splitter-splitterjs)
   - [Smart Novel Merger (`merger.js`)](#smart-novel-merger-mergerjs)
7. [Glossary & Profile Management](#7-glossary--profile-management)
8. [PWA & Offline Service Worker](#8-pwa--offline-service-worker)
9. [External Dependencies & CDN Map](#9-external-dependencies--cdn-map)
10. [Legacy / Development Utility Scripts](#10-legacy--development-utility-scripts)
11. [Roadmap & Modernization Opportunities](#11-roadmap--modernization-opportunities)

---

## 1. System Overview

**Gemini Translator** is a fully client-side, browser-native translation workstation and EPUB manipulation suite. Designed originally for web novel translation and ebook editing, it operates with zero server backend: all API calls to Google Gemini, DeepL, and LibreTranslate are executed directly from the user's browser, keeping user API keys and book data strictly on the local machine.

### Key Capabilities
- **Multi-Provider AI Translation:** Google Gemini (with real-time streaming SSE, dynamic model retrieval, and rolling plot/terminology context), DeepL (Free & Pro tiers), and LibreTranslate (public or self-hosted instances).
- **True EPUB Translation:** Parses EPUB XHTML files into live DOM nodes, extracts and translates textual content, and reinjects the translated text directly into the original document tree—preserving 100% of formatting, CSS styling, inline spans, and embedded illustrations.
- **Multi-Format Ingestion:** Raw Text, `.txt`, `.pdf` (via PDF.js layout-aware parser), and `.epub` (via JSZip).
- **Multi-Format Exporting:** `.epub` (clean EPUB 3.0 or modified original ZIP), `.pdf` (paginated via jsPDF), `.docx` (Microsoft Word documents via docx.js), and clipboard TXT.
- **EPUB Studio Suite:**
  - **Splitter:** Splits large EPUBs by chapter count, target file size (MB), custom range (e.g., Ch 1–100), or granular custom selection with batch renaming, CSS reading themes, and cover overrides.
  - **Merger:** Combines multiple EPUB volumes into a unified omnibus edition, automatically resolving ID/href namespace collisions and creating hierarchical multi-level Tables of Contents (NCX & EPUB 3 NavDoc).
- **Glossary & Instruction Profiles:** Persistent local storage of custom translation rules, terminology dictionaries, and default profiles.
- **Fail-Safe Translation & Resume:** Progress is hashed and saved chunk-by-chunk to `localStorage`, allowing users to pause or resume interrupted translations seamlessly.

---

## 2. Codebase Architecture & File Structure

```
Gemini-Translator/
├── index.html            # Core SPA entry point, React 18 root, translation engine & UI
├── epub_studio_ui.js     # Template literals exporting HTML markup for Splitter & Merger tabs
├── splitter.js           # EPUB splitting engine, chapter parser, zip compressor, themes
├── merger.js             # EPUB merger engine, TOC tree builder, namespace collision handler
├── utils.js              # Shared EPUB & DOM helpers (sanitizeFilename, setSmartTitle, etc.)
├── GlossaryManager.jsx   # Standalone React prototype component for glossary UI (reference)
├── manifest.json         # PWA Web App Manifest (standalone display, theme colors, icons)
├── sw.js                 # PWA Service Worker (v4) with CDN asset caching & API bypass
├── service-worker.js     # Alternate PWA Service Worker (v2) with stale-while-revalidate
├── jszip.min.js          # Local JSZip bundle (fallback / worker resource)
├── jepub.min.js          # Local jEpub bundle for EPUB 3 generation
├── ejs.min.js            # Embedded JavaScript templating library
├── test_logic.js         # Unit test verifying Gemini stream delimiter parsing & context extraction
├── check.js              # Quick Node.js syntax & compilation validator for index.html
├── test_syntax.js        # Helper script extracting module script from index.html
├── bracket.js            # AST parenthesis/bracket balance scanner
├── fix_react.py          # Python patch script used during initial React component refactoring
└── DOCUMENTATION.md      # Comprehensive technical documentation & architectural manual
```

---

## 3. Core Translation Engine

### Supported Translation Providers

1. **Google Gemini (`provider === 'gemini'`):**
   - **Direct Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
   - **Streaming Endpoint (SSE):** `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
   - **Dynamic Model Fetching:** Queries the Gemini models endpoint (`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`) to retrieve all available text generation models for the user's API key.
   - **Default Models:** `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.5-pro` (with custom model name override support).
   - **Resilience:** Built-in `fetchRetry` mechanism with exponential backoff (up to 5 retries on HTTP 429 rate limit or 5xx server errors).

2. **DeepL (`provider === 'deepl'`):**
   - Standard API: `https://api.deepl.com/v2/translate`
   - Free Tier API: `https://api-free.deepl.com/v2/translate` (automatically routed if API key ends in `:fx`).
   - Uses `DEEPL_LANG_MAP` for language code normalisation.

3. **LibreTranslate (`provider === 'libre'`):**
   - Configurable host URL (default `https://libretranslate.com` or custom self-hosted instance).
   - Uses `LIBRE_LANG_MAP` for language code translation.

---

### Prompt Engineering & Structure

Prompts are dynamically constructed via `buildPrompt()`:

```javascript
const buildPrompt = (text, srcLang, tgtLang, glossary, instructions, context) => {
  let p = `Please translate the following text${srcLang && srcLang !== 'Auto-detect' ? ' from ' + srcLang : ''} into ${tgtLang}. IMPORTANT: Preserve all original paragraph breaks and line breaks exactly.\n\n${text}\n\n`;
  if (glossary.trim()) p = `Use this Terminology Guide for specific terms.\n---\nTerminology Guide:\n${glossary.trim()}\n---\n\n` + p;
  if (instructions.trim()) p = `Additional instructions: ${instructions.trim()}\n\n` + p;

  if (context !== undefined) {
    p = `TRANSLATION CONTEXT (from previously translated sections):\n${context || 'None yet.'}\n\nUse the above context to maintain consistency in character names, tone, terminology, and narrative flow. Do NOT repeat the context.\n\n` + p;
    p += `Provide ONLY the ${tgtLang} translation, followed EXACTLY by the delimiter "\n---CONTEXT_UPDATE---\n", followed by a brief updated context summary (max 100 words) capturing key characters, plot points, and tone including this new section.`;
  } else {
    p += `Provide ONLY the ${tgtLang} translation. No commentary.`;
  }
  return p;
};
```

---

### Context-Aware Rolling Memory System

When translating multi-chapter books or long documents, character names, pronouns, honorifics, and plot elements often get mistranslated across chunk boundaries if chunks are processed independently.

The **Context-Aware Engine** solves this by:
1. Translating chunks sequentially.
2. Instructing Gemini to output the translated chunk, followed by the delimiter `\n---CONTEXT_UPDATE---\n`, followed by a concise 100-word running summary of characters, ongoing plot, and tone.
3. Extracting the new context summary and feeding it into the prompt of the next chunk.
4. Keeping the running context updated throughout all chapters of the book.

---

### Streaming Sliding Window Delimiter Parser

During SSE streaming with Gemini, tokens arrive piece-by-piece. Because the delimiter `---CONTEXT_UPDATE---` can arrive split across arbitrary network packet boundaries (e.g. `---CONT` followed by `EXT_UPD` followed by `ATE---`), emitting chunks prematurely would cause delimiter text to leak into the user-visible translation.

`streamGemini` implements a **40-character sliding window buffer**:
1. Incoming tokens are appended to `slidingWindow`.
2. As long as no delimiter is matched, tokens beyond the last 40 characters are safely emitted via `onChunk(safeToEmit)`.
3. When the regex `/\n*---CONTEXT_UPDATE---\n*/i` matches inside `slidingWindow`, the text before the match is emitted, and the remainder is switched into `isContextContext = true` to capture the summary without displaying it in the output text area.

---

### Parallel Batch Processing Engine

When **Context-Aware Mode** is disabled (e.g. for quick translations or non-narrative texts), Gemini Translator activates `batchParallel()`:
- Chunks are distributed across a configurable concurrency pool (1 to 10 concurrent requests, default 3).
- Uses `Promise.allSettled()` in batches to translate multiple chapters simultaneously, significantly reducing processing time for large documents.

---

### Session Management & Auto-Resume

- Every document produces a deterministic hash ID (`generateJobId(text)`).
- As each chunk or chapter completes, the current translation text, running context, chapter index, and chunk index are serialized to `localStorage`.
- If the tab is refreshed, the browser crashes, or the user cancels and returns later, the system detects the saved session and displays a **Resume** button to continue from the exact chunk where it left off.

---

## 4. Document Ingestion & True EPUB Translation

### Plain Text Ingestion
- Read directly via `FileReader.readAsText()`.
- Cleaned via `cleanText()` to normalize carriage returns (`\r\n` -> `\n`) and condense excessive consecutive blank lines.
- Chunked by `splitChunks()` respecting `MAX_PAYLOAD` (60,000 characters) and breaking cleanly on `\n\n`, `\n`, or sentence boundaries (`. `, `? `, `! `).

### PDF Ingestion (PDF.js)
- Loaded via `pdfjsLib.getDocument()`.
- Iterates over all pages, extracts text items and their geometric transform coordinates (`transform[5]` for Y, `transform[4]` for X).
- Intelligently reconstructs line breaks and paragraph separations based on spatial vertical distance (`it.height * 0.4` for newlines, `it.height * 1.2` for paragraph breaks).

### True EPUB Translation Engine (DOM Node TreeWalker)
Unlike naive translators that extract raw plaintext and destroy the book's internal HTML tags, Gemini Translator features a **True EPUB Engine**:

```
[EPUB (.epub)] 
      │ (JSZip.loadAsync)
      ▼
[Parse OPF Spine & Manifest]
      │
      ▼
[DOMParser: Parse XHTML Chapter Documents]
      │
      ▼
[extractTextNodes: TreeWalker extracts visible text nodes (NodeFilter.SHOW_TEXT)]
      │
      ▼
[Bundle Text Nodes into Translation Chunks (~1,000 chars)]
      │
      ▼
[AI Translation (Gemini / DeepL / Libre)]
      │
      ▼
[Map Translated Lines back to original DOM Text Nodes]
      │
      ▼
[Update XHTML Document inside original JSZip Archive]
      │
      ▼
[Export exact original EPUB structure with translated contents]
```

**Benefits of True EPUB Translation:**
- Retains all CSS styling, typography, colors, and fonts.
- Preserves all embedded cover art, chapter illustrations, and formatting tags (`<em>`, `<strong>`, `<blockquote>`, `<table>`, `Ruby/Furigana`).
- Retains internal book navigation and chapter links.

---

## 5. Document Exporting & Multi-Format Builders

### EPUB Generator (jEpub & Modified ZIP Container)
- **Direct EPUB Mode:** If translating from an existing `.epub`, the modified in-memory `JSZip` container (`window.currentTranslatedZip`) is directly packaged, preserving original metadata, cover, and assets.
- **Generated EPUB Mode:** If translating from text or PDF, generates a compliant EPUB 3.0 file using `jEpub`, configuring metadata, unique UUIDs (`urn:uuid`), author, language, and chapter sections.

### PDF Generator (jsPDF)
- Utilizes `jspdf.umd.min.js`.
- Automatically calculates page dimensions, margins, line heights, font sizing, and page overflows (`doc.splitTextToSize`).
- Inserts clean chapter title headers and automatic page breaks between chapters.

### DOCX Generator (docx.js)
- Utilizes `window.docx` (`Document`, `Packer`, `Paragraph`, `TextRun`, `HeadingLevel`, `PageBreak`).
- Structures chapters with Heading 1 styles, paragraph spacing, and page breaks before each chapter.

---

## 6. EPUB Studio: Splitter & Merger

### EPUB Splitter (`splitter.js`)

Located under the **Split EPUB** tab, this tool dissects large EPUB files into smaller volumes.

#### Splitting Modes:
1. **Extract Range:** Specify starting and ending chapter numbers (e.g. Ch 1 to Ch 50).
2. **By Chapter Count:** Automatically partition the book into chunks of $N$ chapters per book (e.g. 100 chapters per volume).
3. **By Target File Size (MB):** Partitions the book dynamically so each generated `.epub` stays under a specific size (e.g. 20MB per volume).
4. **Custom Selection:** Granular chapter checkbox tree with:
   - Search/filter by title.
   - Batch renaming pattern (`Chapter {n} - {original}`).
   - Instant chapter text preview modal.
   - Undo/Redo stack for checkbox selections (`Ctrl+Z` / `Ctrl+Y`).

#### Advanced Splitter Features:
- **Front Matter Detection:** Automatically recognizes and preserves cover pages, copyright notices, TOCs, prefaces, and series pages across all split volumes.
- **Custom Cover Replacement:** Inject custom PNG/JPG/WebP covers directly into the OPF manifest and spine.
- **Keep Only Text Mode:** Strips non-essential assets (images, custom fonts, CSS) to create lightweight, high-speed ebooks.
- **Reading Theme Injection:** Injects dark mode (`#1a1a2e`), sepia mode (`#f4ecd8`), or large-text styles into every XHTML chapter.
- **Web Worker Compression:** Defers JSZip compression to background web workers to keep the UI smooth.
- **EPUB Structure Validator:** Validates mimetype, `container.xml`, OPF manifest consistency, and spine references before download.
- **Plain ZIP Export:** Allows exporting extracted chapters as a standard `.zip` of standalone XHTML files.
- **Web Share API:** Shares generated books directly on mobile devices supporting `navigator.share`.

---

### Smart Novel Merger (`merger.js`)

Located under the **Merge EPUB** tab, this tool combines multiple EPUB volumes into a single consolidated book.

#### Core Technical Challenges Handled:
1. **ID & Href Namespace Collisions:** When merging multiple books that all have files named `chapter1.xhtml` or IDs named `item1`, files and IDs are rewritten with unique prefixes (`b${bookIndex}_${originalId}`).
2. **Relative Link & Asset Rewriting:** All internal `<a href="...">`, `<img src="...">`, and CSS `@import` links are parsed via `resolveRelativePath()` and remapped to the new unified archive structure.
3. **Hierarchical Table of Contents Merging:**
   - **EPUB 2 NCX (`toc.ncx`):** Wraps each sub-book's `navPoint` elements inside a parent master `navPoint` representing the volume/book label.
   - **EPUB 3 NavDoc (`nav.xhtml`):** Nests each sub-book's `<li>` items under a collapsible `<ol>` list.
4. **Metadata & Cover Management:** Allows customizing the unified book title, author (`dc:creator`), publisher (`dc:publisher`), language (`dc:language`), and custom cover image.
5. **Drag-and-Drop Reordering:** Visual list allowing books to be reordered via drag-and-drop or Up/Down buttons before merging.

---

## 7. Glossary & Profile Management

- **Glossary Injection:** Custom terminology pairs (e.g., character names, kingdom names, fantasy terms) are injected directly into the Gemini translation prompt.
- **Profile Storage:** Profiles (containing terminology and custom instructions) are saved to `localStorage` under `savedGlossaries`.
- **Default Profiles:** Users can mark a profile as default so it automatically applies on application load.
- **Import/Export:** Profiles can be exported as `glossaries_backup.json` or imported from JSON files.
- **File Upload:** Upload raw glossary files (`.txt`, `.md`, `.json`, `.csv`, `.xml`, `.html`).

---

## 8. PWA & Offline Service Worker

The application includes two service worker implementations:
- `sw.js`: Service worker (`gemini-translator-v4`) caching core files, fonts, and external CDN scripts, while bypassing translation API domains.
- `service-worker.js`: Alternative worker with stale-while-revalidate strategy for CDN assets.
- `manifest.json`: Defines app metadata, theme color (`#4f46e5`), background color (`#f9fafb`), and standalone display mode for desktop and mobile home screen installation.

---

## 9. External Dependencies & CDN Map

| Library | Version | CDN / Source | Purpose |
|---|---|---|---|
| **React** | 18.2.0 | `https://esm.sh/react@18.2.0` | Declarative UI and state management |
| **ReactDOM** | 18.2.0 | `https://esm.sh/react-dom@18.2.0/client` | Client-side DOM renderer |
| **Lucide Icons** | 0.372.0 | `https://esm.sh/lucide-react@0.372.0` | UI icons |
| **Tailwind CSS** | CDN v3 | `https://cdn.tailwindcss.com` | Utility-first responsive styling |
| **JSZip** | 3.10.1 | `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` | EPUB zip decompression & recompression |
| **PDF.js** | 2.16.105 | `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js` | Client-side PDF text and coordinate extraction |
| **jsPDF** | 2.5.1 | `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | Client-side PDF document generation |
| **jEpub** | Latest | `https://cdn.jsdelivr.net/npm/jepub/dist/jepub.min.js` | EPUB 3.0 generation from text |
| **docx** | 8.5.0 | `https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js` | Client-side Microsoft Word DOCX generator |
| **EJS** | 3.1.9 | `https://cdnjs.cloudflare.com/ajax/libs/ejs/3.1.9/ejs.min.js` | Templating helper |
| **Inter Font** | Google Fonts | `https://fonts.googleapis.com` | Typography |

---

## 10. Legacy / Development Utility Scripts

| File | Type | Description |
|---|---|---|
| `check.js` | Node.js | Tests syntax validity of the `<script type="module">` block in `index.html`. |
| `test_logic.js` | Node.js | Simulates SSE stream chunk tokens to verify that `---CONTEXT_UPDATE---` is properly captured without leaking into output. |
| `bracket.js` | Node.js | Bracket stack scanner used to debug nested parenthesis matching in JSX/hyperscript. |
| `test.js` / `test_syntax.js` | Node.js | Extracts `<script>` content to `temp.js` for AST validation. |
| `fix_react.py` | Python | Script used previously to wrap the top-level app render in `React.Fragment`. |
| `GlossaryManager.jsx` | React JSX | Early standalone prototype of the glossary manager component. |

---

## 11. Roadmap & Modernization Opportunities

1. **Gemini Model Defaults & Pricing Constants:**
   - Update model defaults and cost estimation constants in `index.html` (e.g. `gemini-2.5-flash`, `gemini-2.5-pro`, or latest 2026 Gemini 3 series).
2. **Service Worker Consolidation:**
   - Unify `sw.js` and `service-worker.js` into a single canonical service worker file.
3. **EPUB Studio Studio Standalone Link:**
   - Check `./EPUB-Studio/index.html` relative link in `index.html` line 1023 to ensure self-contained routing or redirect within the SPA.
4. **Enhanced Translation Formats:**
   - Add support for Markdown (`.md`) and SubRip Subtitle (`.srt`) direct translation.
5. **Modern Build System (Optional):**
   - If migrating from browser-native ESM to a bundled architecture in the future, Vite + React + TypeScript could be introduced while maintaining zero-backend static deployment to GitHub Pages.
