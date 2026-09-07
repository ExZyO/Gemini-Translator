# Gemini Translator — Master Feature Roadmap & To-Do List

> **Persistent Location**: Saved in Project Root (`ROADMAP.md`) & Agent Brain (`ROADMAP.md`)  
> **Status**: Active Living Document  
> **Target Milestones**: v8.11.0 – v8.16.0  

---

## 📋 Table of Contents
1. [Library & Novel Tracking (Mihon / Komikku Architecture)](#1-library--novel-tracking-mihon--komikku-architecture)
2. [Immersive Reader & Audio (Moon+ Reader & Legado Architecture)](#2-immersive-reader--audio-moon-reader--legado-architecture)
3. [Smart Crawling & Source Extensions](#3-smart-crawling--source-extensions)
4. [Advanced AI Translation & Story Intelligence](#4-advanced-ai-translation--story-intelligence)
5. [Automated Cloud Sync & Multi-Device Continuity](#5-automated-cloud-sync--multi-device-continuity)
6. [Implementation Status & Prioritization Matrix](#6-implementation-status--prioritization-matrix)

---

## 1. Library & Novel Tracking (Mihon / Komikku Architecture)

### 🔄 1.1 1-Tap "Check for New Chapters" (Novel Update Tracking)
- [ ] **Technical Architecture**:
  - Since novels stored in `GeminiNovelDB` now retain `sourceUrl`, `totalChapterCount`, `chapterList`, and source parser ID, add a **"Check for Updates"** button (and pull-to-refresh gesture) in the Library view.
  - When triggered for a novel:
    1. Fetches only the novel index page (TOC).
    2. Compares existing chapter URLs/numbers with the remote list.
    3. If new chapters exist (e.g. library has chapters 1–200, remote has 205), queues *only* the 5 new chapters (201–205) for crawling.
    4. Automatically appends downloaded chapters to the existing record in `GeminiNovelDB` and updates the chapter count without modifying or re-downloading previously translated or cached chapters.
- [ ] **UI/UX**:
  - Library card badge: `✨ +5 New Chapters Available`.
  - Batch "Update All Followed Novels" button in Library header with throttling to avoid IP bans.

### 🔖 1.2 Reading Progress & Bookmark Cloud Sync
- [ ] **Technical Architecture**:
  - Track reader state in real-time: `{ novelId, chapterIndex, scrollPercentage, lastReadTimestamp }`.
  - Sync reader state to Google Drive private application data (`drive.appdata/reading_state.json`) or WebDAV.
  - On launch or when switching devices (phone, tablet, desktop PWA), detect newer remote timestamps and offer: *"Resume reading Chapter 42 (68%) from your tablet?"*
- [ ] **UI/UX**:
  - Subtle progress bar on each library novel card showing % completion.
  - Seamless jump-to-last-read button on book cards.

---

## 2. Immersive Reader & Audio (Moon+ Reader & Legado Architecture)

### 🎧 2.1 Background Neural Text-to-Speech (TTS) / Audiobook Mode
- [ ] **Technical Architecture**:
  - **Tier 1 (Offline / Zero-latency)**: Native Web Speech API (`window.speechSynthesis`) with voice selection, pitch, and rate sliders.
  - **Tier 2 (High Fidelity Neural)**: Edge TTS / Gemini Audio API integration for ultra-natural reading voices.
  - **Android MediaSession Integration**:
    - Connect with `navigator.mediaSession` to provide Android system notifications, lock screen audio controls (Play/Pause, Seek, Previous/Next Chapter), and Bluetooth headset button handling.
    - Implement audio ducking and auto-pause on incoming calls.
  - **Sentence Highlighting**:
    - Synchronize TTS utterance boundaries (`onboundary` event) to auto-scroll and highlight the currently spoken sentence in the reader.

### 🌐 2.2 Bilingual / Parallel Reading View & Tap-to-Reveal
- [ ] **Technical Architecture**:
  - Reader toggle: `[ English Only ] | [ Parallel / Bilingual ] | [ Raw Source ]`.
  - In Parallel mode, render alternating synchronized blocks (Raw JA/ZH/KO on top/left, English translation below/right).
  - **Tap-to-Inspect**: Tap any translated paragraph in standard mode to pop up the original raw source text underneath.
  - Crucial for light novel readers to inspect raw terminology, cultivation realm names, wordplay, and nuances without leaving the reading flow.

### 💡 2.3 Interactive Lore & Glossary Tooltips
- [ ] **Technical Architecture**:
  - In the EPUB Reader modal, parse text against active glossary terms.
  - Automatically wrap matching entities with interactive, unobtrusive underlines (`<span class="lore-term" data-term="...">`).
  - **Click/Tap Behavior**:
    - Tapping a character name, cultivation stage, or artifact opens a sleek floating card displaying:
      - Canonical English name + Raw Kanji/Hanzi.
      - Category (Character, Organization, Technique, Location).
      - Section notes or faction details from the glossary.
    - Zero navigation required; dismisses on outside tap without losing scroll position.

### 🔄 2.4 1-Tap Paragraph Retranslate ("Retry with AI")
- [ ] **Technical Architecture**:
  - Tap any translated paragraph in Moon Reader to open a context chip: **"Retry Paragraph"**.
  - Re-prompts the AI with fresh instructions or updated glossary constraints for that single paragraph without retranslating the whole chapter.

---

## 3. Smart Crawling & Source Extensions

### 🛠️ 3.1 Custom CSS / Selector Rule Builder
- [ ] **Technical Architecture**:
  - Visual selector generator for unsupported or obscure novel websites.
  - Users enter:
    - Base URL / Chapter URL pattern.
    - Title selector (e.g. `h1.chapter-title`).
    - Chapter content selector (e.g. `#chapter-content`, `.entry-content`, `article.content`).
    - Exclude / noise selectors (e.g. `.ad-box`, `div.author-notes`).
    - Next Chapter URL selector or Regex.
  - **Live Preview Sandbox**: Tests the selectors against 1 sample chapter and displays clean extracted text before saving.
  - Saved as custom reusable crawler presets in `localStorage` and synced via Cloud Backup.

### 🌓 3.2 Auto-Image Upscaling & Dark Mode Illustration Filter
- [ ] **Technical Architecture**:
  - Web-scraped light novel illustrations frequently have blinding white canvas backgrounds.
  - In Dark/AMOLED reader themes, provide an **"Intelligent Illustration Filter"**:
    - CSS blend-mode or soft inversion (`filter: brightness(0.85) contrast(1.1)`) for line art.
    - Subtle rounded dark framing around embedded novel pictures.
    - Optional local bilinear/bicubic canvas upscale for pixelated thumbnail-sized novel scans.

### 🎨 3.3 AI Cover Art & Scene Illustrations
- [ ] **Technical Architecture**:
  - **Smart Cover Generator**: Gemini extracts novel themes, protagonist traits, and genre to generate an aesthetic cover art plate, styling title typography automatically.
  - **Climax Illustration Plates**: Generate and insert high-resolution story illustrations at major chapter turning points directly into the EPUB layout.

---

## 4. Advanced AI Translation & Story Intelligence

### 🚻 4.3 Anti-Pronoun Drift / Character Gender Lock System
- [ ] **The Problem**:
  - Web novels in Chinese, Korean, and Japanese constantly drop subject pronouns (zero-anaphora) or contain author Pinyin typos (`他` vs `她`), causing AI translation engines to flip character genders across sentences (e.g., calling female leads "he/him").
- [ ] **Technical Architecture (4 Layers)**:
  - **Phase 1: Storage & Character Registry Schema**:
    - Add `characterLocks` array to `GeminiNovelDB` novel records and `localStorage` (`{ id, name, gender, pronouns, sourceTerms, aliases, notes }`).
    - Sync locks with Glossary profiles (`savedGlossaries`).
  - **Phase 2: UI Drawer & 1-Tap AI Scanner**:
    - "Character & Gender Locks" drawer inside the Glossary tab with search, filters, and manual editor modal.
    - "🔍 Auto-Scan Characters" button utilizing Gemini to scan synopsis/TOC/Chapter 1 and auto-populate the cast registry with review modal.
  - **Phase 3: Prompt-Level Immutable Enforcement**:
    - Inject strict `[GENDER & PRONOUN LOCK PROTOCOL]` into system instructions across Gemini (`buildPrompt`), OpenAI/DeepSeek (`buildContextPrompt`), and Claude.
    - Dynamic chunk-level filtering to pass only characters appearing in active and adjacent text chunks.
  - **Phase 4: Deterministic Local Auditor & Moon Reader Quick Fix**:
    - Post-translation proximity validator in `parseTranslationOutput` to auto-correct slips before saving.
    - 1-tap "🚻 Fix Pronoun Drift" context action in Moon Reader to instantly fix a paragraph, update IndexedDB, and lock the gender permanently.

### 📖 4.1 Volume Summarizer & "Previously On..." Generator
- [ ] **Technical Architecture**:
  - For long running web novels (500+ chapters), readers often return after weeks and forget secondary character plots.
  - 1-Click **"Generate Story Recap"**:
    - Prompts Gemini with the last N chapters (or existing chapter summaries).
    - Produces a concise, spoiler-free "Previously On..." recap covering current arcs, character status, and active cliffhangers.
  - Injected as a Prologue page when exporting to EPUB.

### 🕸️ 4.2 Interactive Character Relationship Map Generator
- [ ] **Technical Architecture**:
  - Uses active glossary and translated chapters to prompt Gemini for a structured relationship graph (`[Character A] -- "Allies" --> [Character B]`).
  - Automatically renders interactive **Mermaid Diagrams** or SVG node networks directly inside the novel's detail view.

### 🎭 4.4 Genre Tone Presets (Style Switcher)
- [ ] **Technical Architecture**:
  - One-click prompt profiles tailored for specific web novel genres:
    - **Xianxia / Wuxia**: Strict Daoist terms, sect etiquette, archaic honorifics (*"Fellow Daoist"*, *"Junior Brother"*).
    - **LitRPG / System**: Formats status menus, level-ups, and notifications into stylish highlighted CSS callout boxes in the EPUB.
    - **Korean Modern Fantasy / Hunter**: Fast-paced, punchy dialogue with guild/dungeon terminology.

---

## 5. Automated Cloud Sync & Multi-Device Continuity

### ⏰ 5.1 Periodic Background Auto-Sync
- [ ] **Technical Architecture**:
  - In addition to triggering on translation completion, add an automated scheduling engine (`[ On Every Translation ]`, `[ Daily ]`, `[ Weekly ]`).
  - Native Android WorkManager / Capacitor background runner performing silent incremental backups to Google Drive / WebDAV.

### 📡 5.2 Built-in OPDS Server & Send-to-Kindle Integration
- [ ] **Technical Architecture**:
  - **OPDS Catalog Feed**: Lightweight local HTTP catalog server allowing Moon+ Reader Pro, Mihon, and KOReader to browse the library and download new EPUBs wirelessly.
  - **1-Click Send-to-Kindle**: Direct SMTP / mailto link packaging finalized EPUBs straight to the user's `@kindle.com` address.

---

## 6. Implementation Status & Prioritization Matrix

| Feature | Target Version | Complexity | Status |
| :--- | :--- | :--- | :--- |
| **Throttled Crawl Persistence (60 FPS)** | v8.10.1 | Medium | ✅ **Done** |
| **Crash-Proof Resume & Amber Badges** | v8.10.1 | Medium | ✅ **Done** |
| **Mihon-Style 1-Tap Google Drive File Backup** | v8.10.1 | Medium | ✅ **Done** |
| **COTE Section XVI Consistency Rule Verified** | v8.10.1 | Low | ✅ **Done** |
| **Anti-Pronoun Drift / Gender Lock System** | v8.11.0 | Medium | 📋 Planned (Ready) |
| **1-Tap Check for New Chapters (Delta Crawl)** | v8.11.0 | Medium | 📋 Planned |
| **Bilingual / Parallel Reading & Reveal Mode** | v8.12.0 | Low | 📋 Planned |
| **Interactive Lore & Glossary Tooltips** | v8.12.0 | Medium | 📋 Planned |
| **Background Web Speech TTS & MediaSession** | v8.13.0 | Medium | 📋 Planned |
| **1-Tap Paragraph Retranslate ("Retry with AI")** | v8.13.0 | Low | 📋 Planned |
| **Custom CSS Selector Crawler Builder** | v8.14.0 | High | 📋 Planned |
| **Reading Position & Bookmark Drive Sync** | v8.14.0 | Medium | 📋 Planned |
| **Story Recap ("Previously On...") Generator** | v8.15.0 | Medium | 📋 Planned |
| **Character Relationship Map (Mermaid)** | v8.15.0 | Medium | 📋 Planned |
| **Dark Theme Illustration Filter** | v8.15.0 | Low | 📋 Planned |
| **OPDS Catalog & Send-to-Kindle Delivery** | v8.16.0 | Medium | 📋 Planned |
| **AI Cover Art & Climax Scene Plates** | v8.16.0 | Medium | 📋 Planned |
| **Genre Tone Presets (Style Switcher)** | v8.16.0 | Low | 📋 Planned |
| **Periodic Background Auto-Sync** | v8.16.0 | Medium | 📋 Planned |

---
*Roadmap updated: September 2026. This document is permanently preserved in the repository root and agent knowledge base.*
