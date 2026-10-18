# Gemini EPUB Translator & Reader

> High-Performance Web Novel Crawler, AI Translation Engine, EPUB Studio, and Audiobook Workstation for Android, Web, and PWA.

[![Version](https://img.shields.io/badge/version-8.21.81-blue.svg)](package.json)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web%20%7C%20PWA-teal.svg)](android/)
[![Architecture](https://img.shields.io/badge/architecture-Zero--Build%20UMD-orange.svg)](app.js)
[![Database](https://img.shields.io/badge/database-IndexedDB%20(GeminiNovelDB)-green.svg)](db_engine.js)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

---

## Overview

Gemini EPUB Translator & Reader is an all-in-one workstation for discovering, downloading, translating, editing, reading, and listening to web novels and digital documents. Built from the ground up as a zero-build client application, it operates 100% locally on your device without requiring intermediary translation backends or external servers.

Whether ingesting multi-page serial web novels, translating books using cutting-edge reasoning AI models, organizing libraries for Moon+ Reader, or listening with a zero-gap audiobook player, the application delivers a seamless, battery-efficient, and unstoppable reading experience.

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

### 3. Studio EPUB Editor & Packaging
- **Typography & Formatting**: Clean drop caps, smart quotes, automated paragraph indentation, and clean web artifact removal.
- **Ongoing Book Continuation**: Scan remote sources against an existing EPUB file and append only newly published chapters directly into the file without re-downloading or re-translating existing content.
- **Volume & Arc Splitter**: Slice monolithic web novels (hundreds or thousands of chapters) into organized, lightweight story volumes with distinct titles and cover art.
- **Universal File Parser**: Ingest and convert EPUB, PDF, Word DOCX, and plain text documents into clean e-books.

### 4. Modern Audiobook Workstation
- **Built-in Poweramp Integration**: Direct broadcast trigger to launch playback immediately inside the Poweramp Android player.
- **Zero-Gap Preloading**: Pre-buffers upcoming chapters 15 seconds before the current track concludes, eliminating chapter transition pauses.
- **Playback Controls**: Precision time scrubber, 5-second skip controls, playback speed selector, and sleep timer.
- **Per-Book Resume Memory**: Preserves exact listening position down to the second in local storage.

### 5. Moon+ Reader Integration & Wireless OPDS Catalog
- **Automated Folder Binding**: Route newly exported books directly into designated Moon+ Reader library directories.
- **Local Wi-Fi Server (OPDS)**: Built-in local HTTP and OPDS feed that allows any e-reader app on your local network to browse and download books wirelessly.

### 6. Quality Assurance & Name Drift Fixer
- **Comprehensive Health Audits**: One-click scanner that checks for missing chapter number gaps, corrupt formatting, untranslated foreign character leaks, repetition loops, and duplicate chapters.
- **Automated Name Drift Fixer**: Scans entire novels to identify inconsistent character name translations and reconciles them across all chapters in a single click.
- **Translation Memory & Diff Inspector**: Compare translation revisions side-by-side with rollback capabilities and TMX export.

### 7. Cloud Sync & Safe Backup
- **Multi-Cloud Support**: Synchronize your entire bookshelf, custom glossaries, reading bookmarks, and settings via WebDAV or Google Drive.
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
+------------------------------------------------------------------+
| Data Authority:  IndexedDB (window.GeminiNovelDB)                |
| Native Layer:    Capacitor Bridge & Native Android Background    |
|                  Foreground Service (Wakelocks & Keep-Alive)     |
+------------------------------------------------------------------+
```

### Key Engineering Principles
- **Zero-Build UMD Architecture**: Runs directly in modern browsers and Android WebView without Webpack, Vite, or Babel compilation steps.
- **Single Source of Truth**: IndexedDB (`GeminiNovelDB`) acts as the authoritative store for all book chapters, translation sessions, reading progress, and novel archives.
- **Unstoppable Background Execution**: Mobile background tasks (batch crawling, AI translation loops, audio downloads) leverage Android foreground services and wake locks to run uninterrupted with screen locked or app backgrounded.
- **Resilient Media Pipeline**: All external asset fetching employs multi-tier proxy fallbacks to avoid dropped illustrations or blocked image connections.

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
Open your browser to `http://localhost:8080` or host it on GitHub Pages / Cloudflare Pages.

---

## Supported Formats

| Format | Import | Export | Notes |
|:---|:---:|:---:|:---|
| **EPUB** (.epub) | Yes | Yes | Full metadata, table of contents, and embedded illustrations |
| **PDF** (.pdf) | Yes | Yes | Extraction via PDF.js; formatted generation via jsPDF |
| **Word** (.docx) | Yes | Yes | Clean structured document export |
| **Plain Text** (.txt) | Yes | Yes | Smart chapter heading detection on import |
| **Audio** (.m4a, .mp3) | Yes | Yes | Streamable and downloadable audiobook formats |

---

## Privacy & Disclaimer

- **100% Client-Side Processing**: Your documents, API keys, reading logs, and book contents remain strictly on your local device and your chosen personal cloud storage (Google Drive or WebDAV).
- **Personal Use Utility**: This software is provided as a formatting, translation, and reading tool for private personal use. Users are responsible for ensuring that their use of online sources complies with applicable terms of service and intellectual property laws.
- **No Content Hosting**: This repository hosts software source code only. It does not host, distribute, or index any copyrighted literary works.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
