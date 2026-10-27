# Gemini EPUB Translator & Reader

> High-Performance Web Novel Crawler, AI Translation Engine, EPUB Studio, and Moon+ Reader Reading Workstation for Android, Web, and PWA.

[![Version](https://img.shields.io/badge/version-8.22.12-blue.svg)](package.json)
[![Build](https://img.shields.io/badge/build-8523-indigo.svg)](version.json)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web%20%7C%20PWA-teal.svg)](android/)
[![Architecture](https://img.shields.io/badge/architecture-Zero--Build%20UMD-orange.svg)](app.js)
[![Database](https://img.shields.io/badge/database-IndexedDB%20(GeminiNovelDB)-green.svg)](db_engine.js)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

---

## Overview

Gemini EPUB Translator & Reader is an all-in-one local workstation for discovering, downloading, translating, editing, reading, and listening to web novels and digital documents. Built from the ground up as a zero-build client application, it operates 100% locally on your device without requiring intermediary translation backends or external cloud servers.

Whether ingesting multi-page serial web novels, translating books using cutting-edge reasoning AI models, reading with Moon+ Reader Pro vertical scroll physics, organizing libraries with wireless OPDS feeds, or listening with a zero-gap audiobook player, the application delivers a seamless, battery-efficient, and unstoppable reading experience.

---

## Key Features

### 1. High-Speed Web Novel Ingestion & Crawler
- **Multi-Site Scraper Pipeline**: Native scrapers and extensible community source plugins for major web novel platforms.
- **Resilient Multi-Page Ingestion**: Handles continuous pagination, dynamic chapter navigation, rate-limit recovery, and proxy fallbacks.
- **Illustration Preservation**: Downloads and packages embedded chapter illustrations and cover artwork directly into the resulting EPUB, preserving full image fidelity without broken links.
- **Chapter Auto-Sorting**: Intelligent chapter weight analysis that automatically detects volumes, fractional chapters, and prologue order.

### 2. Multi-Provider AI Translation Engine
- **Supported Providers**: Google Gemini (Gemini 3.8 Flash, 3.1 Pro, Flash-Lite), DeepSeek (DeepSeek Chat, DeepSeek Reasoner), OpenAI, Claude, DeepL, and LibreTranslate.
- **Context-Aware Translation**: Feeds preceding chapter summaries and ongoing narrative context to preserve voice, tone, and character personality across hundreds of chapters.
- **Thinking Mode Support**: Harnesses extended reasoning tokens for complex scene comprehension and linguistic nuance.
- **Smart Glossary & Universal Profiles**: Enforces consistent term translation, character genders, pronouns, and relationship titles.
- **Live Streaming & Metrics**: Real-time token usage meters, duration trackers, and cost estimations.

### 3. Moon+ Reader Pro Reading Experience
- **Continuous Vertical Scrolling**: Smooth vertical reading flow with fluid boundary detection. Pulling up at the end of a chapter prompts and advances to the next chapter; pulling down at the top navigates to the previous chapter.
- **Bidirectional Scroll Landing**: Navigating backward to a previous chapter lands smoothly at the exact bottom/end of that chapter with 100% reading progress recorded, matching physical book intuition.
- **Decoupled 120 FPS Chapter Scrubber**: Chapter dragging updates local slider state and preview bubbles at a locked 120 Hz without unmounting or reloading chapter text, committing the chapter jump strictly upon pointer release.
- **OLED AMOLED Pitch-Black Mode**: True `#000000` dark theme with high-contrast translucent button backdrops, high-visibility white vector iconography, and crisp border geometry.
- **Zero-Vibration Scroll Mechanics**: Single-pass layout positioning and overscroll containment that eliminate screen shaking, layout jumps, and competing scroll animations.
- **Reading Utility Suite**: In-chapter search, live font size controls, quick bookmarks, volume-aware table of contents, and integrated speech synthesizer.

### 4. Apple Design & HIG Fluid Motion Architecture
- **44x44pt Touch Targets**: Invisible hit padding on all compact controls, ensuring complete compliance with Apple Human Interface Guidelines without expanding visual clutter.
- **Zero Mobile Tap Latency**: Platform manipulation touch rules permanently eliminate mobile browser 300ms double-tap gesture disambiguation pauses.
- **Optical Typography Tracking**: Dynamic letter-spacing calibration across type scales (tight negative tracking for display headers, neutral tracking for body text, and positive tracking for sub-13px small captions).
- **System Accessibility Signals**: Dedicated adaptation for system-level reduced transparency (substituting blurs with solid surfaces) and high contrast preferences.
- **Liquid Glass Dynamic Island**: Floating bottom navigation bar with 32px translucent blur materials, specular light reflection rims, and tactile active-state press scales.

### 5. Studio EPUB Editor & Packaging
- **Typography & Formatting**: Clean drop caps, smart quotes, automated paragraph indentation, and clean web artifact removal.
- **Ongoing Book Continuation**: Scan remote sources against an existing EPUB file and append only newly published chapters directly into the file without re-downloading or re-translating existing content.
- **Volume & Arc Splitter**: Slice monolithic web novels (hundreds or thousands of chapters) into organized, lightweight story volumes with distinct titles and cover art.
- **Universal File Parser**: Ingest and convert EPUB, PDF, Word DOCX, and plain text documents into clean e-books.

### 6. Modern Audiobook Workstation
- **Built-in Poweramp Integration**: Direct broadcast trigger to launch playback immediately inside the Poweramp Android player.
- **Zero-Gap Preloading**: Pre-buffers upcoming chapters 15 seconds before the current track concludes, eliminating chapter transition pauses.
- **Playback Controls**: Precision time scrubber, 5-second skip controls, playback speed selector, and sleep timer.
- **Per-Book Resume Memory**: Preserves exact listening position down to the second in local storage.

### 7. Moon+ Reader Integration & Wireless OPDS Catalog
- **Automated Folder Binding**: Route newly exported books directly into designated Moon+ Reader library directories.
- **Local Wi-Fi Server (OPDS)**: Built-in local HTTP and OPDS feed that allows any e-reader app on your local network to browse and download books wirelessly.

### 8. Quality Assurance & Name Drift Fixer
- **Comprehensive Health Audits**: One-click scanner that checks for missing chapter number gaps, corrupt formatting, untranslated foreign character leaks, repetition loops, and duplicate chapters.
- **Automated Name Drift Fixer**: Scans entire novels to identify inconsistent character name translations and reconciles them across all chapters in a single click.
- **Translation Memory & Diff Inspector**: Compare translation revisions side-by-side with rollback capabilities and TMX export.

### 9. Cloud Sync & Safe Backup Parity
- **Multi-Cloud Support**: Synchronize your entire bookshelf, custom glossaries, reading bookmarks, and settings via WebDAV or Google Drive (Mihon / Komikku compatible schema).
- **Offline Full Backup**: Export complete JSON archive payloads that guarantee 100% round-trip fidelity across device migrations.

---

## Technical Architecture

The application is engineered according to strict production standards:

```
+------------------------------------------------------------------+
|               Gemini EPUB Translator & Reader                    |
+------------------------------------------------------------------+
| Presentation:  Pure UMD React 18, Tailwind CSS, Lucide Icons     |
| Orchestration: app.js (Lean Coordinator & Top-Level Router)       |
+------------------------------------------------------------------+
|                        Modular Domain Engines                    |
|  - WebNovelCrawlerEngine   - TranslationLoopEngine               |
|  - LibraryEngine           - BackupEngine                        |
|  - EpubEngine              - DocumentParser                      |
|  - SwiftAudioEngine        - GlossaryManagerEngine               |
|  - NovelEnrichmentEngine   - MoonReaderEngine                    |
|  - NavigationEngine        - ReaderEngine                        |
+------------------------------------------------------------------+
| Data Authority:  IndexedDB (window.GeminiNovelDB)                |
| Native Layer:    Capacitor Bridge & Native Android Background    |
|                  Foreground Service (Wakelocks & Keep-Alive)     |
+------------------------------------------------------------------+
```

### Key Engineering Principles
- **Zero-Build UMD Architecture**: Runs directly in modern browsers and Android WebView without Webpack, Vite, Rollup, or Babel compilation steps. Pure JavaScript with zero runtime JSX.
- **Single Source of Truth**: IndexedDB (`GeminiNovelDB`) acts as the sole authoritative store for all book chapters, translation sessions, reading progress, and novel archives.
- **Unstoppable Background Execution**: Mobile background tasks (batch crawling, AI translation loops, audio downloads) leverage Android foreground services and wake locks to run uninterrupted with screen locked or app backgrounded.
- **Resilient Media Pipeline**: All external asset fetching employs multi-tier proxy fallbacks to avoid dropped illustrations or blocked image connections.
- **Modular File Ceilings**: Strict architectural line limits (under 3,000 lines per file) with domain-specific modular decomposition.

---

## Installation & Deployment

### Android Application
1. Download the latest release APK from the [Releases](https://github.com/ExZyO/Gemini-Translator/releases) page.
2. Install the APK on your Android device (Android 8.0 or higher recommended).
3. Grant storage permissions for EPUB export and Moon+ Reader folder binding.

To build from source:
```bash
git clone https://github.com/ExZyO/Gemini-Translator.git
cd Gemini-Translator
npm install
npm run cap:sync
cd android
./gradlew assembleRelease
```

### Web & Self-Hosted PWA
The project can be served from any static HTTP file server:
```bash
# Using Node.js http-server or any static server
npx http-server . -p 8080
```
Open your browser to `http://localhost:8080` or host it on GitHub Pages, Cloudflare Pages, or any static hosting provider.

---

## Supported Formats

| Format | Import | Export | Notes |
|:---|:---:|:---:|:---|
| **EPUB** (.epub) | Yes | Yes | Full metadata, table of contents, and embedded illustrations |
| **PDF** (.pdf) | Yes | Yes | Extraction via PDF.js; formatted generation via jsPDF |
| **Word** (.docx) | Yes | Yes | Clean structured document export |
| **Plain Text** (.txt) | Yes | Yes | Smart chapter heading detection on import |
| **Audio** (.m4a, .mp3) | Yes | Yes | Streamable and downloadable audiobook formats with zero-gap preloading |

---

## Privacy & Disclaimer

- **100% Client-Side Processing**: Your documents, API keys, reading logs, and book contents remain strictly on your local device and your chosen personal cloud storage (Google Drive or WebDAV).
- **Personal Use Utility**: This software is provided as a formatting, translation, and reading tool for private personal use. Users are responsible for ensuring that their use of online sources complies with applicable terms of service and intellectual property laws.
- **No Content Hosting**: This repository hosts software source code only. It does not host, distribute, or index any copyrighted literary works.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
