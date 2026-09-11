# Gemini Translator — Master Plan v3

> **Location**: Project Root (`ROADMAP.md`)  
> **Status**: Active Living Document  
> **Target Milestones**: v8.11.0 – v8.30.0  
> **Total**: 70 features · 30 OSS libraries · 10 shipped

---

## 📋 Table of Contents

1. [⚡ User Priority Fast Track (32 Features)](#-user-priority-fast-track-32-features)
2. [OSS Integration Map (30 Libraries)](#oss-integration-map)
3. [§1 Infrastructure Upgrades (v8.11)](#1-infrastructure-upgrades-v811)
4. [§2 Library & Novel Tracking (v8.11–8.12)](#2-library--novel-tracking)
5. [§3 Immersive Reader & Audio (v8.12–8.13)](#3-immersive-reader--audio)
6. [§4 Smart Crawling & Source Extensions (v8.14)](#4-smart-crawling--source-extensions)
7. [§5 AI Translation & Story Intelligence (v8.15–8.19)](#5-ai-translation--story-intelligence)
8. [§6 Cloud Sync & Multi-Device (v8.14–8.16)](#6-cloud-sync--multi-device)
9. [§7 Crawl Intelligence & Novel Management (v8.20–8.21)](#7-crawl-intelligence--novel-management)
10. [§8 Reader Intelligence & Social (v8.22–8.25)](#8-reader-intelligence--social)
11. [§9 AI Generation, Export & Platform (v8.25–8.28)](#9-ai-generation-export--platform)
12. [§10 Accessibility & Platform (v8.29–8.30)](#10-accessibility--platform)
13. [Prioritization Matrix (71 features)](#prioritization-matrix)
14. [Dependency Graph](#dependency-graph)

---

## ⚡ User Priority Fast Track (32 Features)

> **Execution Directive**: These 32 features represent the primary focus queue requested by the user. They are delivered sequentially one by one with zero regression, preserving working crawlers and incorporating strategic open-source merges.

| # | Feature Code | Feature Title | Target Version | Strategic Architecture / Replacement | Status |
|---|:---|:---|:---|:---|:---|
| 1 | **§4.1** | LNReader Plugin Architecture | v8.14.0 | Standardized source plugin interface; keeps existing built-in crawlers primary | 📋 Planned |
| 2 | **§4.1b** | Universal Fallback Parser | v8.11.1 | `@mozilla/readability` + DOMPurify; falls back ONLY when existing crawlers don't match | ✅ Shipped |
| 3 | **§5.4** | Language Learning Mode & FSRS | v8.17.0 | `ts-fsrs` (modern Anki scheduler) + Kuromoji / Hanzi dictionary popups | 📋 Planned |
| 4 | **§5.8** | Smart Glossary Auto-Builder | v8.19.0 | Automated pre-read entity extractor populating book profiles | 📋 Planned |
| 5 | **§5.9** | Translation Proofreader QA | v8.11.2 | Merged into Unified Health & QA Suite (CJK leak detection, loop guard) | ✅ Shipped |
| 6 | **§5.10** | Cultural Context Footnotes | v8.19.0 | `[¹]` explanatory popover tooltips for cultural lore and slang | 📋 Planned |
| 7 | **§5.11** | Auto-Chapter Descriptive Subtitle Naming | v8.19.0 | AI generates descriptive, spoiler-safe chapter subtitles (e.g. "Ch 147 — The Witch's Tea Party") | 📋 Planned |
| 8 | **§7.1** | Novel Health & Audit Report | v8.11.2 | Merged into Unified Health & QA Suite (detects missing chapters, empty text, HTML junk) | ✅ Shipped |
| 9 | **§7.2** | Cost & Time Estimator | v8.20.0 | Word and token cost calculator before kicking off batch translations | 📋 Planned |
| 10 | **§7.3** | Smart Arc Splitter | v8.20.0 | Arc boundary detection + per-volume EPUB export | 📋 Planned |
| 11 | **§7.4** | Metadata Enrichment | v8.20.0 | AniList, MAL, NovelUpdates synopsis and tag scraper | 📋 Planned |
| 12 | **§7.5** | Anti-MTL Quality Gate | v8.11.2 | Merged into Unified Health & QA Suite (coherence scoring, AI refusal detector) | ✅ Shipped |
| 13 | **§8.1** | AI Chat Companion | v8.22.0 | Spoiler-safe conversational AI loaded only with chapters 1 → current | 📋 Planned |
| 14 | **§8.2** | Translation Memory Bank | v8.11.3 | Exact and fuzzy caching (>90%) to save 30-50% on token costs | ✅ Shipped |
| 15 | **§8.6** | Translation Snapshots & Diffs | v8.11.3 | `diff-match-patch` for inline green/red word diffs and 1-tap rollbacks | ✅ Shipped |
| 16 | **§8.8** | Auto-Synopsis Generator | v8.24.0 | AI reads first chapters to synthesize book synopsis and genre tags | 📋 Planned |
| 17 | **§8.9** | Cross-Novel Universal Search | v8.24.0 | `FlexSearch` (15ms full-text index) + `Fuse.js` (fuzzy matching) across library | 📋 Planned |
| 18 | **§8.10** | Smart Paragraph Merging | v8.24.0 | Collapses 1-line Chinese web novel breaks into flowing literary prose | 📋 Planned |
| 19 | **§8.11** | Reading Stats Heatmap Dashboard | v8.25.0 | GitHub-style reading streak heatmap + `Chart.js` words/day charts | 📋 Planned |
| 20 | **§9.4** | Import from Other Apps | v8.26.0 | Importer for Mihon, LNReader, Calibre, and Kindle clippings | 📋 Planned |
| 21 | **§9.7** | Smart Bookmarks + AI Moments | v8.27.0 | Auto-tags `#plot-twist` `#fight-scene` with AI recap per bookmark | 📋 Planned |
| 22 | **§9.8** | Collaborative Translation Sharing | v8.27.0 | Shareable link / QR export and forkable translation packages | 📋 Planned |
| 23 | **§9.9** | Complete Audiobook Export | v8.28.0 | Full novel audio generation into .MP3 or .M4B with chapter markers | 📋 Planned |
| 24 | **§9.10** | Semantic Scene Search | v8.28.0 | Embedding cosine similarity ("Find the scene where Rem confesses") | 📋 Planned |
| 25 | **§9.11** | Smart Push Notifications | v8.28.0 | Capacitor local notifications for reading streaks and new chapters | 📋 Planned |
| 26 | **§10.1** | On-Device Offline Translation | v8.29.0 | Native Chrome 138+ / Edge Built-in AI (0 KB, free, private, offline) | 📋 Planned |
| 27 | **§10.4** | Tracker Auto-Sync | v8.29.0 | AniList / MyAnimeList GraphQL progress synchronization | 📋 Planned |
| 28 | **§10.5** | Reading List / "Plan to Read" | v8.29.0 | Unified with Dexie `status: 'plan_to_read'` index (zero new storage overhead) | 📋 Planned |
| 29 | **§10.8** | Deep Linking & URL Scheme | v8.29.0 | `gemini-translator://novel/rezero/chapter/52` deep link routing | 📋 Planned |
| 30 | **§10.9** | Browser Extension Mode | v8.30.0 | Chrome/Firefox extension translating arbitrary foreign web pages in-place | 📋 Planned |
| 31 | **§10.11** | AI Voice Cloning for Dialogue | v8.30.0 | Per-character dialogue voices during narration | 📋 Planned |
| 32 | **§10.12** | Reading History Timeline | v8.30.0 | Visual nostalgic reading memory timeline powered by `dayjs` | 📋 Planned |

---

## OSS Integration Map

### Core (18 libraries)

| Library | npm Package | Size | License | Used By |
|---|---|---|---|---|
| **foliate-js** | git submodule | ~50 KB | MIT | Reader rebuild, annotations, search, pagination |
| **Dexie.js** | `dexie` | ~32 KB | Apache-2.0 | ALL IndexedDB, reactive queries, schema migrations |
| **fflate** | `fflate` | ~8-30 KB | MIT | EPUB gen/parse (replaces JSZip) |
| **he** | `he` | ~5 KB | MIT | HTML entity decoding (fixes `&#8216;` bug) |
| **DOMPurify** | `dompurify` | ~15 KB | Apache-2.0 | Sanitize crawled HTML, XSS prevention |
| **@mozilla/readability** | `@mozilla/readability` | ~20 KB | Apache-2.0 | Universal fallback parser for any website |
| **Fuse.js** | `fuse.js` | ~5 KB | Apache-2.0 | Library search, cross-novel search |
| **diff-match-patch-es** | `diff-match-patch-es` | ~8 KB | Apache-2.0 | Translation diffs, battle mode |
| **Chart.js** | `chart.js` | ~65 KB | MIT | Stats dashboard, heatmaps |
| **kuromoji** | `kuromoji` | ~20 MB dict | Apache-2.0 | Japanese tokenization |
| **Kuroshiro** | `kuroshiro` | ~10 KB | MIT | Furigana ruby generation |
| **hanzi** | `hanzi` | ~5 MB dict | MIT | Chinese segmentation, CC-CEDICT |
| **cc-cedict** | `cc-cedict` | ~5 MB dict | MIT | Chinese-English dictionary |
| **jmdict-simplified-node** | `jmdict-simplified-node` | ~40 MB dict | CC-BY-SA | Japanese-English dictionary |
| **ts-fsrs** | `ts-fsrs` | ~15 KB | MIT | Spaced repetition flashcards |
| **webdav** | `webdav` | ~30 KB | MIT | WebDAV cloud sync |
| **edge-tts-node** | `edge-tts-node` | ~10 KB | MIT | Free neural TTS (300+ voices) |
| **Web Speech API** | native | 0 KB | — | Basic TTS, sentence boundary sync |

### Extended (12 libraries)

| Library | npm Package | Size | License | Used By |
|---|---|---|---|---|
| **Comlink** | `comlink` | 1.1 KB | Apache-2.0 | Web Worker communication (non-blocking UI) |
| **Workbox** | `workbox-*` | ~20 KB | MIT | PWA offline caching strategies |
| **dexie-export-import** | `dexie-export-import` | ~5 KB | Apache-2.0 | One-line DB backup/restore |
| **lz-string** | `lz-string` | ~5 KB | MIT | Text compression (70% smaller storage) |
| **node-vibrant** | `node-vibrant` | ~15 KB | MIT | Extract dominant colors from cover art |
| **SortableJS** | `sortablejs` | ~10 KB | MIT | Drag-drop reorder (queue, library) |
| **dayjs** | `dayjs` | 2 KB | MIT | Date formatting ("3 days ago") |
| **Tesseract.js** | `tesseract.js` | ~200 KB | Apache-2.0 | Offline OCR (100+ languages, WASM) |
| **Mermaid.js** | `mermaid` | ~300 KB | MIT | Character relationship diagrams |
| **markdown-it** | `markdown-it` | ~30 KB | MIT | Wiki/notes rendering |
| **compromise** | `compromise` | ~200 KB | MIT | English NLP (name extraction) |
| **FlexSearch** | `flexsearch` | ~6 KB | Apache-2.0 | Full-text search (100K+ docs) |

**Total bundle (excluding dictionaries): ~330 KB gzipped**

---

## 1. Infrastructure Upgrades (v8.11)

### 🔧 1.0 IndexedDB → Dexie.js Migration
**v8.11.0 · Medium · ✅ Shipped** · OSS: `dexie`

Replace raw IndexedDB with Dexie.js for both databases.
1. Download offline vendored `vendor/dexie.min.js`
2. Define schema in `db_engine.js`: `GeminiTranslatorNovelDB` (v3 & v4) and `GeminiTranslatorDB` (v1) with secondary indexes (`id, title, status, sourceUrl, addedAt, deletedAt, timestamp`)
3. Seamless fallback and custom change events (`gemini:novel-db-change`)

**Deps**: None · **Breaks**: Nothing — wraps existing DBs seamlessly

### 📦 1.0b JSZip → fflate
**v8.11.0 · Low · ✅ Shipped** · OSS: `fflate`

2-10x faster EPUB gen, non-blocking, smaller bundle.
1. Vendored offline `vendor/fflate.min.js`
2. Integrated `zipSync` into `epub_engine.js` with STORE level 0 for mimetype and level 6 for content
3. Integrated `unzipSync` into `web_importer.js` for instant EPUB unpacking

### 🧹 1.0c Add he.js + DOMPurify
**v8.11.0 · Low · ✅ Shipped** · OSS: `he`, `dompurify`

Fix HTML entity bug, add proper sanitization.
1. `he.decode()` — fixes `&#8216;` → `'` across chapter titles and text
2. `DOMPurify.sanitize(html)` for all crawled and imported content

---

## 2. Library & Novel Tracking

### 🔄 2.1 Delta Crawl ("Check for New Chapters")
**v8.11.0 · Medium · ✅ Shipped**

Fetch only new chapters, not entire novel. Selective deduplication in `crawlWithPlugin`, returning combined chapter list without re-downloading existing chapters.

### 🔖 2.2 Reading Progress & Bookmark Cloud Sync
**v8.14.0 · Medium · 📋 Planned** · OSS: `webdav`

Track `{ novelId, chapterIndex, scrollPct, lastReadTs }`. Sync to Google Drive/WebDAV. "Resume from other device?"

### 🚻 2.3 Anti-Pronoun Drift / Gender Lock
**v8.11.0 · Medium · ✅ Shipped**

Lock character genders. Auto-detect genders from glossary annotations. Injected `=== GENDER LOCK PROTOCOL (ANTI-PRONOUN DRIFT) ===` into `buildPrompt()`. 1-tap `⚥ He↔She` pronoun swap in Reader HUD.

---

## 3. Immersive Reader & Audio

### 📖 3.1 Reader Rebuild → foliate-js
**v8.12.0 · High · 📋 Planned** · OSS: `foliate-js`

Replace `reader_engine.js` entirely. Pagination, annotations, search, themes, font customization. Keep our translation UI on top.

### 🌐 3.2 Bilingual / Parallel Reading
**v8.12.0 · Low · 📋 Planned**

Toggle: `[ English ] | [ Parallel ] | [ Source ]`. Tap-to-inspect paragraph alignment. **Deps**: §3.1

### 💡 3.3 Glossary Tooltips in Reader
**v8.12.0 · Medium · 📋 Planned**

Tap character names → floating glossary card with canonical name + source term. Uses foliate overlayer. **Deps**: §3.1

### 🎧 3.4 Neural TTS / Audiobook Mode
**v8.13.0 · Medium · 📋 Planned** · OSS: Web Speech API + `edge-tts-node`

Tier 1: `speechSynthesis` (zero deps, word highlighting via `onboundary`). Tier 2: Edge TTS (300+ neural voices, free). Android lock screen controls via `navigator.mediaSession`. **Deps**: §3.1

### 🔄 3.5 1-Tap Paragraph Retranslate
**v8.13.0 · Low · 📋 Planned**

Long-press paragraph → "Retry Translation" → send to Gemini with glossary + context → replace in-place. **Deps**: §3.1

---

## 4. Smart Crawling & Source Extensions

### 🛠️ 4.1 LNReader Plugin Architecture
**v8.14.0 · High · 📋 Planned** · Ref: LNReader plugin system

Standard `SourcePlugin` interface: `search()`, `getNovelDetails()`, `getChapterContent()`. Refactor existing crawlers as built-in plugins. User-installable community plugins via URL. **Deps**: §1.0

### 🧹 4.1b Universal Fallback Parser 🔥 [PRIORITY]
**v8.11.1 · Low · ✅ Shipped** · OSS: `@mozilla/readability`, `dompurify`

Universal fallback reader parser using Mozilla's Readability engine.
**CRAWLER ROUTING & PRESERVATION PRIORITY:**
1. **Existing Custom Built-in Crawlers (Primary)**: WitchCult, Syosetu, Kakuyomu, RoyalRoad, etc., remain 100% active, untouched, and first in line.
2. **LNReader Community Plugins (Secondary)**: 278 specialized community sources handle specific novel domains.
3. **Universal Readability Parser (Final Fallback)**: When no custom crawler or LNReader plugin matches the target URL, Readability extracts clean chapter title and article body from any arbitrary website with zero configuration. **Deps**: None

### 🎨 4.2 Custom CSS Selector Crawler Builder
**v8.14.0 · High · 📋 Planned**

Visual tool: enter base URL, title selector, content selector, next-chapter selector. Live preview. Export/import as JSON. **Deps**: §4.1

### 🌓 4.3 Dark Mode Illustration Filter
**v8.15.0 · Low · 📋 Planned**

CSS: `.reader-dark img { filter: brightness(0.85) contrast(1.1); }`. Toggle on/off. **Deps**: §3.1

---

## 5. AI Translation & Story Intelligence

### 📖 5.1 Story Recap ("Previously On...")
**v8.15.0 · Medium · 📋 Planned**

Appears when >24h since last read. Gemini summarizes last 3-5 chapters: events, tensions, character status. Cached in Dexie. **Deps**: §1.0

### 🕸️ 5.2 Character Relationship Map
**v8.15.0 · Medium · 📋 Planned** · OSS: `mermaid`

Gemini extracts relationships → Mermaid graph. Tap node → wiki card. Updates incrementally. **Deps**: §1.0

### 🎭 5.3 Genre Tone Presets
**v8.16.0 · Low · 📋 Planned**

Presets: 📚 Published LN, ⚔️ Xianxia, 🎮 LitRPG, 🗡️ Korean Hunter, 🎓 Study Mode. Injected into `buildPrompt()`. Custom preset editor.

### 🎓 5.4 Language Learning Mode
**v8.17.0 · High · 📋 Planned** · OSS: `kuromoji`, `kuroshiro`, `hanzi`, `cc-cedict`, `jmdict-simplified-node`, `ts-fsrs`

Tap-to-dictionary (JP/CN/KR). Furigana rendering. Vocabulary collector. SRS flashcards from reading context. Progressive immersion (4 levels). **Deps**: §3.1, §1.0

### 🔄 5.5 Name Consistency Enforcer
**v8.17.0 · Medium · 📋 Planned** · OSS: `fuse.js`, `compromise`

Scan chapters for proper nouns. Fuzzy-cluster similar names. Dashboard + batch normalize. Auto-add to glossary. **Deps**: §1.0

### 📖 5.6 Auto-Generated Character Wiki
**v8.18.0 · High · 📋 Planned** · OSS: `markdown-it`

Gemini extracts characters/locations/terms per chapter. Incremental wiki in Dexie. Spoiler filter (only up to current chapter). Popup cards in reader. **Deps**: §1.0, §3.1

### ⚔️ 5.7 Translation Battle Mode
**v8.18.0 · Medium · 📋 Planned** · OSS: `diff-match-patch-es`

Run 2-3 engines in parallel. Side-by-side diff comparison. AI judges fluency/accuracy/style. Auto-stitch best paragraphs.

### 🧬 5.8 Smart Glossary Auto-Builder
**v8.19.0 · Medium · 📋 Planned**

AI pre-reads Ch 1-2, extracts names/honorifics/terms as JSON. User reviews in approval modal. Glossary locked in from chapter 1.

### 🧬 5.8 Smart Glossary Auto-Builder 🔥 [PRIORITY]
**v8.19.0 · Medium · 📋 Planned**

AI pre-reads Ch 1-2, extracts character names, aliases, honorifics, and lore terms as structured JSON. User reviews in approval modal. Glossary and gender profiles are locked in from chapter 1.

### 🔍 5.9 Translation Proofreader QA 🔥 [PRIORITY]
**v8.19.0 · Medium · 📋 Planned** · *Architecturally Merged with §7.1 & §7.5 into Unified Novel Health & QA Suite*

Automated pre- and post-translation QA auditor: checks paragraph count parity, detects untranslated CJK Hanzi/Kanji leaks, catches repetitive loops, and flags AI refusals. One-click "Retranslate Flagged Paragraphs". **Deps**: §1.0

### 📝 5.10 Cultural Context Footnotes 🔥 [PRIORITY]
**v8.19.0 · Medium · 📋 Planned**

AI detects culturally specific idioms, untranslatable wordplay, and mythological references, inserting clickable `[¹]` footnote tags with floating definition cards in the reader. Can be toggled on/off in typography settings. **Deps**: §3.1

### ✏️ 5.11 Auto-Chapter Descriptive Subtitle Naming 🔥 [PRIORITY]
**v8.19.0 · Low · 📋 Planned** · OSS: Native LLM

Replaces uninformative raw numbers or blank author chapter titles (e.g. `第147章`, `147話`, or `Chapter 147`) with descriptive, spoiler-aware literary subtitles matching the novel's prose style.
- *Example Source:* `第147章` $\rightarrow$ *With §5.11:* `Chapter 147 — The Witch's Tea Party and the Lion's Roar`
- Renders in Reader HUD, Table of Contents drawer, and exported EPUB metadata. Accept, edit, or batch-apply per novel. **Deps**: §1.0

---

## 6. Cloud Sync & Multi-Device

### ⏰ 6.1 Background Auto-Sync
**v8.16.0 · Medium · 📋 Planned** · OSS: `@capacitor/background-runner`, `webdav`, `dexie-export-import`

Scheduling: On Every Translation / Daily / Weekly. Incremental backup via `dexie-export-import`. Targets: Google Drive, WebDAV. **Deps**: §1.0

### 📡 6.2 OPDS Server & Send-to-Kindle
**v8.16.0 · Medium · 📋 Planned**

OPDS feed for Moon+ Reader/KOReader. Send-to-Kindle via `@kindle.com` email.

### 🎨 6.3 AI Cover Art
**v8.16.0 · Medium · 📋 Planned** · OSS: `node-vibrant`

Gemini Imagen generates cover art. `node-vibrant` extracts color palette for per-novel UI theming (Spotify-style).

---

## 7. Crawl Intelligence & Novel Management

### 🏥 7.1 Novel Health Report 🔥 [PRIORITY]
**v8.20.0 · Medium · 📋 Planned** · *Architecturally Merged with §5.9 & §7.5 into Unified Health & QA Suite*

Post-crawl & library diagnostic: missing chapters, duplicates, empty chapters, encoding issues, image audit. "484 crawled · ✅ 480 healthy · ⚠️ 3 short · ❌ 1 missing"

### 💰 7.2 Cost & Time Estimator 🔥 [PRIORITY]
**v8.20.0 · Low · 📋 Planned**

Count words, estimate tokens, show cost per engine. Suggest optimal strategy.

### 📐 7.3 Smart Arc Splitter 🔥 [PRIORITY]
**v8.20.0 · Medium · 📋 Planned**

Gemini detects arc boundaries. Library shows volumes. Per-volume EPUB export. **Deps**: §1.0

### 🏷️ 7.4 Metadata Enrichment 🔥 [PRIORITY]
**v8.20.0 · Medium · 📋 Planned**

Auto-fetch from NovelUpdates, MAL, AniList: genre tags, ratings, synopsis, anime adaptation links. **Deps**: §1.0

### 🛡️ 7.5 Anti-MTL Quality Gate 🔥 [PRIORITY]
**v8.21.0 · Medium · 📋 Planned** · *Architecturally Merged with §5.9 & §7.1 into Unified Health & QA Suite*

Auto-flag low quality (coherence, completeness, CJK leaks). Detect quota degradation. **Deps**: §5.9

### 🎭 7.6 Reading Mood Matcher
**v8.21.0 · Medium · 📋 Planned**

"I want something light" → AI scans library + recommends. Time-aware. Re-engagement nudges. **Deps**: §1.0

---

## 8. Reader Intelligence & Social

### 💬 8.1 AI Chat Companion (Spoiler-Safe) 🔥 [PRIORITY]
**v8.22.0 · Medium · 📋 Planned**

"Ask" button in reader. Gemini loaded with chapters 1→current only. Chat history per-novel. **Deps**: §1.0, §3.1

### 🗄️ 8.2 Translation Memory Bank 🔥 [PRIORITY]
**v8.11.3 · High · ✅ Shipped** · Dexie IndexedDB + Dice Bigram Fuzzy Cache (≥90%)

Cache every source→translation pair. Exact match = zero cost (100% token savings). Fuzzy match (≥90%) = reference context. Settings metrics dashboard + TMX export/import. **Deps**: §1.0

### 🌙 8.3 Translation Queue & Overnight Scheduler
**v8.22.0 · Medium · 📋 Planned** · OSS: `sortablejs`, `@capacitor/background-runner`

Queue UI with drag-to-reorder. Sequential execution. Smart quota management. Push notification on completion. **Deps**: §1.0

### 💬 8.4 Smart Dialogue Formatter
**v8.23.0 · Medium · 📋 Planned**

Prompt: format dialogue with proper quotes, paragraph breaks per speaker. Post-processing merge. Toggle per novel.

### 🖼️ 8.5 Image OCR Translation
**v8.23.0 · Medium · 📋 Planned** · OSS: `tesseract.js` (offline) or Gemini Vision (online)

Detect images with text. Extract via Tesseract.js (free, offline) or Gemini Vision. Translate. Display as caption/overlay.

### 📸 8.6 Translation Snapshots & Versions 🔥 [PRIORITY]
**v8.11.3 · Medium · ✅ Shipped** · OSS: Google `diff-match-patch`

Save chapter translation versions in Dexie DB. Semantic diff view (word-by-word) with AMOLED green additions & red strikethroughs. 1-tap instant rollback. **Deps**: §1.0

### 📅 8.7 Novel Completion Predictor
**v8.24.0 · Low · 📋 Planned**

Track author release frequency. "Updates every 2.3 days · Est. completion: March 2027." Hiatus warning. **Deps**: §2.1

### 📝 8.8 Auto-Synopsis Generator 🔥 [PRIORITY]
**v8.24.0 · Low · 📋 Planned**

Gemini reads first 3-5 chapters → synopsis, genre tags, tagline. Auto-fill library card. **Deps**: §1.0

### 🔎 8.9 Cross-Novel Universal Search 🔥 [PRIORITY]
**v8.24.0 · Medium · 📋 Planned** · OSS: `flexsearch`, `fuse.js`

FlexSearch indexes all translated chapters. Fuse.js for fuzzy title/author matching. Results grouped by novel + context snippet (15ms search across 1,000+ chapters). **Deps**: §1.0

### 📐 8.10 Smart Paragraph Merging 🔥 [PRIORITY]
**v8.24.0 · Medium · 📋 Planned**

Fix one-sentence paragraphs (CN novels). AI merges into flowing prose. Normalize scene breaks. Toggle per novel.

### 📊 8.11 Stats Dashboard 🔥 [PRIORITY]
**v8.25.0 · Medium · 📋 Planned** · OSS: `chart.js`, `dayjs`

GitHub-style streak heatmap. Words/day chart. Engine usage pie. Money saved calculation. Milestones. **Deps**: §1.0

---

## 9. AI Generation, Export & Platform

### 🎨 9.1 AI Scene Illustrator
**v8.25.0 · High · 📋 Planned** · OSS: Gemini Imagen

"Illustrate This" → anime-style scene art. Character consistency from wiki. Gallery view. **Deps**: §5.6

### 📖 9.2 Text Simplification (ESL)
**v8.25.0 · Low · 📋 Planned**

Easy (A2-B1) / Standard / Literary. Prompt modifier per novel.

### 🌐 9.3 Static Website Export
**v8.26.0 · Medium · 📋 Planned**

One-click → hostable site with TOC, navigation, search, dark mode. Deploy to GitHub Pages.

### 📦 9.4 Import from Other Apps 🔥 [PRIORITY]
**v8.26.0 · High · 📋 Planned**

Parse Mihon protobuf, LNReader JSON, Calibre SQLite, Kindle clippings, NovelUpdates list. **Deps**: §1.0

### 🎯 9.5 Adaptive Translation Quality
**v8.26.0 · Medium · 📋 Planned**

AI classifies chapter: action→Pro, dialogue→Flash, filler→Lite. User sets quality floor. Cost tracking.

### ✍️ 9.6 Style Analyzer & Matcher
**v8.27.0 · Medium · 📋 Planned**

Gemini analyzes author's voice → Style Profile. Inject into every prompt for consistency. **Deps**: §1.0

### 🔖 9.7 Smart Bookmarks + AI Tags 🔥 [PRIORITY]
**v8.27.0 · Medium · 📋 Planned**

Bookmark → auto-tag `#plot-twist` `#fight-scene`. AI summary per bookmark. Gallery of best moments. **Deps**: §3.1, §1.0

### 👥 9.8 Translation Sharing 🔥 [PRIORITY]
**v8.27.0 · High · 📋 Planned**

Shareable link/QR. Collaborative editing. Translation fork → merge. Credit system.

### 🎧 9.9 Audiobook Export (MP3/M4B) 🔥 [PRIORITY]
**v8.28.0 · High · 📋 Planned** · OSS: `edge-tts-node`

Synthesize all chapters. Export MP3 per chapter or M4B with chapter markers. ID3 metadata. **Deps**: §3.4

### 🧭 9.10 Semantic Scene Search 🔥 [PRIORITY]
**v8.28.0 · Medium · 📋 Planned** · OSS: Gemini Embeddings

"Find the scene where Rem confesses" → cosine similarity on paragraph embeddings. Cross-novel. **Deps**: §1.0

### 🔔 9.11 Smart Notifications 🔥 [PRIORITY]
**v8.28.0 · Medium · 📋 Planned** · OSS: `@capacitor/local-notifications`

Context-aware: "Continue Re:Zero Ch 52?", "3 chapters from finishing Arc 3!", "Streak at risk!" **Deps**: §1.0

---

## 10. Accessibility & Platform (v8.29–8.30)

### 🧠 10.1 On-Device Offline Translation 🔥 [PRIORITY]
**v8.29.0 · Medium · 📋 Planned** · OSS: Native Chrome/Edge Translation API (0 KB)

Chrome 138+ and Edge 148+ ship built-in local translation: 37-145 languages, free, private, offline, zero API cost. Add as Tier 0 engine. `self.ai.translator.create({ sourceLanguage: 'ja', targetLanguage: 'en' })`. Use as free fallback when Gemini quota exhausted.

### 👁️ 10.2 Accessibility / Dyslexia Support
**v8.29.0 · Medium · 📋 Planned** · OSS: OpenDyslexic font (free)

OpenDyslexic, Lexend, Atkinson Hyperlegible fonts. Bionic Reading (bold first letters). Line Focus (dim other lines). Adjustable letter/word spacing. Color overlays (sepia, green tint). **Deps**: §3.1

### ⏱️ 10.3 Focus / Pomodoro Reading Timer
**v8.29.0 · Low · 📋 Planned**

25min read → break → resume cycle. Session tracking: "You read 1h 23m today." Streak protection.

### 📱 10.4 Novel Tracker Integration 🔥 [PRIORITY]
**v8.29.0 · Medium · 📋 Planned** · OSS: AniList GraphQL API (free)

Sync reading progress to AniList / MAL / NovelUpdates. Auto-update status + chapter count. Pull recommendations from tracker.

### 📋 10.5 Reading List / "Plan to Read" 🔥 [PRIORITY]
**v8.29.0 · Low · 📋 Planned**

Separate wishlist from library. Unified with Dexie `status: 'plan_to_read'` index. Add from URL without crawling. Import from NovelUpdates reading list. **Deps**: §1.0

### 🔒 10.6 Encrypted Library / App Lock
**v8.29.0 · Medium · 📋 Planned** · OSS: Web Crypto API (native)

PIN / biometric lock on app launch. Encrypt stored novels in IndexedDB. Privacy for shared devices.

### 🎮 10.7 Reading Gamification / Achievements
**v8.29.0 · Medium · 📋 Planned**

📚 Bookworm: 100 chapters in one day. 🌍 Polyglot: translated from 3 languages. 🔥 On Fire: 30-day streak. 💎 Quality King: 0 QA flags in 50 chapters. XP system, levels, badges. **Deps**: §8.11

### 🔗 10.8 Deep Linking / URL Scheme 🔥 [PRIORITY]
**v8.29.0 · Low · 📋 Planned** · OSS: Capacitor Deep Links

`gemini-translator://novel/rezero/chapter/52`. Share chapter locations via link. Open from notifications directly to correct chapter.

### 🌐 10.9 Browser Extension Mode 🔥 [PRIORITY]
**v8.30.0 · High · 📋 Planned**

Chrome/Firefox extension: translate ANY webpage in-place. Select text → translate inline. Uses your Gemini API key.

### 🤖 10.10 AI Voice Cloning for TTS 🔥 [PRIORITY]
**v8.30.0 · High · 📋 Planned**

Clone narrator voice. Different voice per character in dialogue. Consistent voice across all chapters. **Deps**: §3.4

### 📄 10.11 PDF Export
**v8.30.0 · Medium · 📋 Planned** · OSS: `pdf-lib` (~100 KB)

Export translated novels as formatted PDF. Page numbers, margins, headers. Print-ready for physical copies.

### ⏪ 10.12 Reading History Timeline 🔥 [PRIORITY]
**v8.30.0 · Medium · 📋 Planned** · OSS: `dayjs`

Visual timeline of everything read + when. "On this day last year you started Re:Zero." Nostalgia + re-read suggestions. **Deps**: §1.0

### 🌡️ 10.13 Translation Confidence Heatmap
**v8.29.0 · Low · 📋 Planned**

AI rates its own confidence per sentence during translation. Reader color-tint: 🟢 high, 🟡 moderate, 🔴 low confidence. Tap red/yellow → see original source text. "Suggest better translation" → manual fix saved to glossary. Trivial prompt change: add "rate confidence 1-10 per sentence" to `buildPrompt()`.

### 📊 10.14 Novel Intelligence Dashboard
**v8.30.0 · Medium · 📋 Planned** · OSS: `chart.js`

AI analyzes full novel and generates: pacing graph (action density per chapter), character screen time (stacked area chart), mood timeline (comedy→dark→action shifts), arc boundaries (auto-detected), translation quality trend. Per-novel analytics beyond the global stats dashboard. **Deps**: §1.0

---

## Prioritization Matrix

| # | Feature | Version | Complexity | OSS Library | Status |
|---|:---|:---|:---|:---|:---|
| — | Throttled Crawl Persistence | v8.10.1 | Medium | — | ✅ Done |
| — | Crash-Proof Resume | v8.10.1 | Medium | — | ✅ Done |
| — | 1-Tap Google Drive Backup | v8.10.1 | Medium | — | ✅ Done |
| — | COTE Consistency Rule | v8.10.1 | Low | — | ✅ Done |
| # | Feature | Version | Complexity | OSS Library | Status |
|---|:---|:---|:---|:---|:---|
| — | Throttled Crawl Persistence | v8.10.1 | Medium | — | ✅ Done |
| — | Crash-Proof Resume | v8.10.1 | Medium | — | ✅ Done |
| — | 1-Tap Google Drive Backup | v8.10.1 | Medium | — | ✅ Done |
| — | COTE Consistency Rule | v8.10.1 | Low | — | ✅ Done |
| 1 | IndexedDB → Dexie.js | v8.11.0 | Medium | `dexie` | ✅ Shipped |
| 2 | JSZip → fflate | v8.11.0 | Low | `fflate` | ✅ Shipped |
| 3 | he.js + DOMPurify | v8.11.0 | Low | `he` `dompurify` | ✅ Shipped |
| 4 | Gender Lock Protocol | v8.11.0 | Medium | — | ✅ Shipped |
| 5 | Delta Crawl | v8.11.0 | Medium | — | ✅ Shipped |
| 6 | Reader → foliate-js | v8.12.0 | High | `foliate-js` | 📋 Planned |
| 7 | Bilingual Reading | v8.12.0 | Low | — | 📋 Planned |
| 8 | Glossary Tooltips | v8.12.0 | Medium | — | 📋 Planned |
| 9 | TTS / Audiobook | v8.13.0 | Medium | Web Speech + `edge-tts` | 📋 Planned |
| 10 | 1-Tap Retranslate | v8.13.0 | Low | — | 📋 Planned |
| 11 | Plugin Architecture 🔥 | v8.14.0 | High | LNReader ref | 📋 Priority |
| 12 | Readability Fallback 🔥 | v8.11.1 | Low | `@mozilla/readability` | ✅ Shipped |
| 13 | CSS Selector Builder | v8.14.0 | High | — | 📋 Planned |
| 14 | Reading Position Sync | v8.14.0 | Medium | `webdav` | 📋 Planned |
| 15 | Story Recap | v8.15.0 | Medium | — | 📋 Planned |
| 16 | Relationship Map | v8.15.0 | Medium | `mermaid` | 📋 Planned |
| 17 | Dark Illustration Filter | v8.15.0 | Low | — | 📋 Planned |
| 18 | OPDS + Kindle | v8.16.0 | Medium | — | 📋 Planned |
| 19 | AI Cover Art | v8.16.0 | Medium | `node-vibrant` | 📋 Planned |
| 20 | Genre Tone Presets | v8.16.0 | Low | — | 📋 Planned |
| 21 | Background Auto-Sync | v8.16.0 | Medium | `dexie-export-import` | 📋 Planned |
| 22 | Language Learning 🔥 | v8.17.0 | High | `kuromoji` `kuroshiro` `jmdict` `cc-cedict` `ts-fsrs` | 📋 Priority |
| 23 | Name Enforcer | v8.17.0 | Medium | `fuse.js` `compromise` | 📋 Planned |
| 24 | Character Wiki | v8.18.0 | High | `markdown-it` | 📋 Planned |
| 25 | Translation Battle | v8.18.0 | Medium | `diff-match-patch-es` | 📋 Planned |
| 26 | Glossary Auto-Builder 🔥 | v8.19.0 | Medium | — | 📋 Priority |
| 27 | Proofreader QA 🔥 | v8.19.0 | Medium | Unified Health Suite | 📋 Priority |
| 28 | Cultural Footnotes 🔥 | v8.19.0 | Medium | — | 📋 Priority |
| 29 | Auto-Chapter Naming 🔥 | v8.19.0 | Low | — | 📋 Priority |
| 30 | Novel Health Report 🔥 | v8.20.0 | Medium | Unified Health Suite | 📋 Priority |
| 31 | Cost Estimator 🔥 | v8.20.0 | Low | — | 📋 Priority |
| 32 | Arc Splitter 🔥 | v8.20.0 | Medium | — | 📋 Priority |
| 33 | Metadata Enrichment 🔥 | v8.20.0 | Medium | — | 📋 Priority |
| 34 | Quality Gate 🔥 | v8.21.0 | Medium | Unified Health Suite | 📋 Priority |
| 35 | Mood Matcher | v8.21.0 | Medium | — | 📋 Planned |
| 36 | AI Chat Companion 🔥 | v8.22.0 | Medium | — | 📋 Priority |
| 37 | Translation Memory 🔥 | v8.11.3 | High | Dexie + Dice | ✅ Shipped |
| 38 | Overnight Queue | v8.22.0 | Medium | `sortablejs` | 📋 Planned |
| 39 | Dialogue Formatter | v8.23.0 | Medium | — | 📋 Planned |
| 40 | Image OCR | v8.23.0 | Medium | `tesseract.js` | 📋 Planned |
| 41 | Translation Snapshots 🔥 | v8.11.3 | Medium | Google `diff-match-patch` | ✅ Shipped |
| 42 | Completion Predictor | v8.24.0 | Low | — | 📋 Planned |
| 43 | Auto-Synopsis 🔥 | v8.24.0 | Low | — | 📋 Priority |
| 44 | Cross-Novel Search 🔥 | v8.24.0 | Medium | `flexsearch` `fuse.js` | 📋 Priority |
| 45 | Paragraph Merging 🔥 | v8.24.0 | Medium | — | 📋 Priority |
| 46 | Stats Dashboard 🔥 | v8.25.0 | Medium | `chart.js` `dayjs` | 📋 Priority |
| 47 | AI Illustrator | v8.25.0 | High | Gemini Imagen | 📋 Planned |
| 48 | ESL Simplification | v8.25.0 | Low | — | 📋 Planned |
| 49 | Static Website Export | v8.26.0 | Medium | — | 📋 Planned |
| 50 | Import from Other Apps 🔥 | v8.26.0 | High | — | 📋 Priority |
| 51 | Adaptive Quality | v8.26.0 | Medium | — | 📋 Planned |
| 52 | Style Analyzer | v8.27.0 | Medium | — | 📋 Planned |
| 53 | Smart Bookmarks 🔥 | v8.27.0 | Medium | — | 📋 Priority |
| 54 | Collaboration 🔥 | v8.27.0 | High | — | 📋 Priority |
| 55 | Audiobook Export 🔥 | v8.28.0 | High | `edge-tts` | 📋 Priority |
| 56 | Semantic Search 🔥 | v8.28.0 | Medium | Gemini Embeddings | 📋 Priority |
| 57 | Smart Notifications 🔥 | v8.28.0 | Medium | Capacitor Notif. | 📋 Priority |
| 58 | On-Device Translation 🔥 | v8.29.0 | Medium | Chrome/Edge native | 📋 Priority |
| 59 | Accessibility/Dyslexia | v8.29.0 | Medium | OpenDyslexic | 📋 Planned |
| 60 | Pomodoro Timer | v8.29.0 | Low | — | 📋 Planned |
| 61 | Tracker Integration 🔥 | v8.29.0 | Medium | AniList API | 📋 Priority |
| 62 | Plan to Read List 🔥 | v8.29.0 | Low | — | 📋 Priority |
| 63 | Encrypted Library | v8.29.0 | Medium | Web Crypto | 📋 Planned |
| 64 | Gamification | v8.29.0 | Medium | — | 📋 Planned |
| 65 | Deep Linking 🔥 | v8.29.0 | Low | Capacitor | 📋 Priority |
| 66 | Browser Extension 🔥 | v8.30.0 | High | — | 📋 Priority |
| 67 | Voice Cloning TTS 🔥 | v8.30.0 | High | — | 📋 Priority |
| 68 | PDF Export | v8.30.0 | Medium | `pdf-lib` | 📋 Planned |
| 69 | Reading History Timeline 🔥 | v8.30.0 | Medium | `dayjs` | 📋 Priority |
| 70 | Confidence Heatmap | v8.29.0 | Low | — | 📋 Planned |
| 71 | Novel Intelligence Dashboard | v8.30.0 | Medium | `chart.js` | 📋 Planned |

---

## Dependency Graph

```mermaid
graph TD
    A["§1.0 Dexie.js"] --> B["§2.1 Delta Crawl"]
    A --> C["§2.3 Gender Lock"]
    A --> D["§5.1 Story Recap"]
    A --> E["§5.4 Language Learning"]
    A --> F["§5.5 Name Enforcer"]
    A --> G["§5.6 Character Wiki"]
    A --> H["§8.2 Translation Memory"]
    A --> I["§8.11 Stats Dashboard"]
    A --> J2["§8.6 Snapshots"]
    A --> K2["§10.5 Plan to Read"]
    A --> L2["§10.12 History Timeline"]
    
    J["§3.1 Reader foliate-js"] --> K["§3.2 Bilingual"]
    J --> L["§3.3 Glossary Tooltips"]
    J --> M["§3.4 TTS"]
    J --> N["§3.5 Retranslate"]
    J --> O["§4.3 Dark Illustrations"]
    J --> E
    J --> G
    J --> P2["§8.1 AI Chat"]
    J --> Q2["§10.2 Accessibility"]
    
    P["§4.1 Plugin Architecture"] --> Q["§4.1b Readability"]
    P --> R["§4.2 CSS Builder"]
    
    B --> S["§8.7 Completion Predictor"]
    G --> T["§5.2 Relationship Map"]
    G --> U["§9.1 AI Illustrator"]
    
    V["§5.9 Proofreader"] --> W["§7.5 Quality Gate"]
    M --> X["§9.9 Audiobook Export"]
    M --> Y["§10.10 Voice Cloning"]
    I --> Z["§10.7 Gamification"]
```

---

*Master Plan v3 — Updated September 10, 2026*  
*70 features · 30 OSS libraries · v8.11 → v8.30*  
*This is the single source of truth for all planned development.*
