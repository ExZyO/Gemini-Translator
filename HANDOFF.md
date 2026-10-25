# Handoff

> Generated: 2026-10-25T18:38:00Z  
> Project: c:\Users\M7 Surface\Documents\Antigravity\Gemini EPUB WEBSITE 2026 September  
> Session summary: Resolved reader progress bar layout and Moon+ Reader Pro vertical scroll parity, audited application against Apple Design and HIG standards, and prepared Phases 2 and 3 of the fluid motion roadmap.

## Goal

Bring the reader view to complete parity with Moon+ Reader Pro in continuous vertical scrolling mode (pulling past bounds smoothly navigates between chapters, landing at the bottom when navigating backward, with 120Hz decoupled scrubber physics and zero layout vibration), and execute a comprehensive Apple Human Interface Guidelines (HIG) and fluid motion audit across the application, implementing all phases of the resulting roadmap.

## Current State

**Working:**
- Chapter progress bar in reader HUD stretches full width (100% end-to-end) across `.moon-hud-scrubber-row` with refined thumb and track styling.
- Moon+ Reader Pro continuous vertical scrolling parity: pulling up past the end of a chapter prompts and switches to the next chapter; navigating backward to the previous chapter lands precisely at the bottom/end of that chapter with 100% progress recorded.
- Reader layout vibration eliminated: consolidated scroll restoration into a single synchronous layout pass, disabled competing `scroll-behavior: smooth`, and contained overscroll with `overscroll-behavior-y: contain`.
- Chapter scrubber dragging decoupled from parent chapter loading state: dragging updates local slider state and preview tooltip bubble at 120 FPS; chapter switch only commits on pointer release (`onPointerUp`, `onTouchEnd`).
- Reader HUD buttons on pure OLED black (`#000000`) styled with translucent background (`rgba(255, 255, 255, 0.14)`), clear borders (`rgba(255, 255, 255, 0.25)`), and forced white SVG icons for high-contrast visibility.
- Restored missing `ChevronLeft` and `ChevronRight` SVG paths in `icons.js`.
- Apple Design (`apple-design` by Emil Kowalski) and Apple HIG (`apple-hig` by Dick Wu) skills installed into `.agents/skills/` and global config.
- Apple Design & HIG Architecture Audit completed and saved to `apple_design_and_hig_audit_report.md` (overall score 87.5/100).
- Phase 1 Apple Polish implemented and deployed in v8.22.10 (Build 8521, commit `afd02fd`):
  - 44x44pt touch target expansion via invisible `::after` pseudo-elements on all compact icon buttons (`.icon-btn`, `.version-chip`, `.moon-hud-scrub-btn`, `.moon-hud-back-btn`, `.moon-hud-menu-btn`).
  - Added `touch-action: manipulation` to eliminate 300ms mobile tap delays.
  - Optical typography tracking: calibrated sub-13px small text (`.tl-subtitle`, `.version-chip`, `.nav-label`, `.moon-hud-pct-text`) to positive tracking (`+0.015em`).
  - Accessibility media overrides implemented for `@media (prefers-reduced-transparency: reduce)` and `@media (prefers-contrast: more)`.
- Working tree is clean on `main` at commit `afd02fd`. Release APK compiled, verified, and installed on connected device (Samsung Galaxy S24 Ultra at `192.168.1.202:5555`).

**Broken / Pending Next Work:**
- Phase 2 Apple Polish: 31 occurrences of generic `transition: all` in `app.css` and 5 occurrences in `reader_styles.js` cause unnecessary browser style recalculations and composite thrashing; need replacement with specific compositor-friendly properties (`transform`, `opacity`, `background-color`, `border-color`, `box-shadow`, `color`).
- Screen reader accessibility: several icon-only buttons across reader HUD and modals lack explicit `aria-label` attributes.
- Phase 3 Apple Polish: mobile bottom sheet modals (`.modal-box` on screens <= 768px) currently use fixed CSS keyframe animations rather than 1:1 direct manipulation touch dragging with velocity handoff and momentum projection (`project(initialVelocity)`).
- Reader boundary overscroll pull gestures currently use static CSS scaling rather than progressive elastic rubber-banding (`rubberband(overshoot, dimension)`).

## Files in Play

| File | Why It Matters |
|------|---------------|
| `app.css` | Primary stylesheet; houses global UI transitions, modal bottom sheets, responsive rules, and accessibility tokens. |
| `reader_styles.js` | Reader-specific stylesheet; styles chapter scrubber, HUD toolbars, swipe cards, and OLED mode contrast. |
| `reader_engine.js` | Core reading engine; orchestrates continuous vertical scroll layout, bidirectional chapter positioning, and scroll restoration. |
| `moon_reader_engine.js` | Houses `BottomHud`, scrubber decoupled state, and `SwipeHandler.createGestureTracker` for pull-to-next/prev chapter gestures. |
| `navigation_engine.js` | Navigation, gestures, liquid glass dock, and deep links; ideal location for mobile bottom sheet swipe-to-dismiss controller. |
| `app_modals.js` | Modal dialog container rendering all application modals and sheets; needs `aria-label` parity on close buttons. |
| `icons.js` | Central SVG icon dictionary; provides icon paths for buttons across the app. |
| `version.json` | Authoritative version manifest for updates and releases. |
| `package.json` | Authoritative project version metadata. |
| `app.js` | Main app orchestrator and in-memory version check. |
| `sw.js` | Service worker cache versioning. |
| `index.html` | Asset cache-busting query strings. |
| `android/app/build.gradle` | Android APK release versionCode and versionName. |

## What Has Been Tried (and Why It Failed)

### Attempt 1: CSS Smooth Scrolling on Reader Container
- **What:** Left `scroll-behavior: smooth;` on `.reader-v2-scroll-container` while programmatically restoring scroll position during chapter switches.
- **Why it failed:** Chromium's smooth scroll interpolator animated `scrollTop` concurrently while new chapter text and images were mounting and shifting container dimensions. Combined with cascading timeouts, this triggered violent layout jitter and screen shaking.
- **Resolution:** Removed `scroll-behavior: smooth;` from the container, added `overscroll-behavior-y: contain;`, and consolidated scroll restoration into a single synchronous layout pass.

### Attempt 2: Calling Parent `changeChapter` Directly Inside Scrubber `onChange`
- **What:** Bound `<input type="range">` scrubber `onChange` directly to the parent chapter navigation handler.
- **Why it failed:** In React 18, `onChange` fires on every move event. Dragging the scrubber triggered 50-60 full chapter DOM re-renders per second, locking up the main thread and making dragging feel unresponsive.
- **Resolution:** Decoupled scrubber dragging into local state inside `BottomHud`, updating a floating preview tooltip bubble at 120 FPS during drag, and committing the chapter switch strictly on pointer release (`onPointerUp`, `onTouchEnd`).

### Attempt 3: React State Dispatches on `touchmove` for Pull Gestures
- **What:** Dispatched React state (`setPullPrompt`) inside `SwipeHandler.onTouchMove` to show the pull-to-next chapter release prompt.
- **Why it failed:** Triggered high-frequency React component re-renders during active touch gestures.
- **Resolution:** Replaced state dispatches with direct DOM `.active-release` class toggling on `#moon-reader-pull-next` and `#moon-reader-pull-prev`.

## Current Best Theory

Following the completed Phase 1 release, the remaining work should be executed in two targeted, isolated batches:
1. **Phase 2 (Composite Transitions & Accessibility)**:
   - Systematically replace all 31 `transition: all` lines in `app.css` and 5 lines in `reader_styles.js` with compositor-friendly properties (`transform`, `opacity`, `background-color`, `border-color`, `box-shadow`, `color`).
   - Add explicit `aria-label` attributes to icon-only buttons across `moon_reader_engine.js` and `app_modals.js` to achieve full WCAG/Apple HIG VoiceOver & TalkBack parity.
2. **Phase 3 (Interactive Sheet Springs & Elastic Overscroll)**:
   - Add Apple-style elastic rubber-banding (`rubberband(overshoot, dimension) = (overshoot * D * 0.55) / (D + 0.55 * |overshoot|)`) to `SwipeHandler.createGestureTracker` in `moon_reader_engine.js` so overscroll pull cards stretch with physical resistance and snap back gracefully.
   - Add a delegated sheet-drag controller in `navigation_engine.js` for mobile bottom sheets (`.modal-box` on width <= 768px), supporting 1:1 direct tracking on `.modal-hd`, velocity tracking, and exponential-decay momentum projection (`project(releaseVelocity)`) to dismiss or snap back.

## Next Steps

1. **Phase 2 Execution**:
   - In `app.css`, replace all `transition: all` occurrences (lines 589, 604, 617, 657, 676, 686, 1024, 1098, 1140, 1156, 1168, 1182, 1186, 1232, 1236, 1241, 1560, 1594, 1629, 1655, 1712, 1742, 1890, 1913, 2074, 2231, 2275, 2332, 2372, 2398, 2428).
   - In `reader_styles.js`, replace all `transition: all` occurrences (lines 301, 332, 471, 728, 1227).
   - In `moon_reader_engine.js` and `app_modals.js`, add `aria-label` attributes to icon buttons.
2. **Phase 3 Execution**:
   - In `moon_reader_engine.js`, update `updateVisuals` and `clearVisuals` in `SwipeHandler.createGestureTracker` to apply rubber-band translation transforms to `#moon-reader-pull-next` and `#moon-reader-pull-prev`.
   - In `navigation_engine.js`, implement `NavigationEngine.initModalSheetGestures()` with direct 1:1 pointer tracking, velocity calculation, momentum projection, and spring dismiss/restore.
   - In `app.css`, add visual grab handle styling (`.modal-hd::before`) for mobile bottom sheets.
3. **Verification & Deployment Pipeline**:
   - Run `node --check` across modified JavaScript files.
   - Run `node scratch/audit_tab_props.js`.
   - Run `node scratch/test_tab_renders.js`.
   - Check line counts (Rule 2.7: strictly under 3,000 lines per file).
   - Verify zero emojis across code, UI, and commits.
   - Synchronize version bump across all 6 files (`package.json`, `app.js`, `sw.js`, `index.html`, `version.json`, `android/app/build.gradle`).
   - Run `npm run cap:sync`.
   - Compile release APK via `cd android; .\gradlew.bat assembleRelease`.
   - Install over wireless ADB via `node scratch/phone_adb.js install -r android/app/build/outputs/apk/release/app-release.apk`.
   - Commit and push to GitHub `main`.
   - Deliver Two-Tier Release Notes to Exile.

## Key Constraints and Context

- **User Identity**: ALWAYS address the user as **Exile** at the very beginning of every response.
- **Tone & Language**: ALWAYS speak in plain, clear, non-technical everyday language for Tier 1 notes.
- **Copyright Protection**: NEVER quote copyrighted novel titles or story text.
- **Emoji Prohibition**: Strictly NO EMOJIS anywhere across chat, UI, code, or commits.
- **Zero-Build Architecture**: Pure UMD browser/Android zero-build architecture (`React.createElement` or `h()`, zero JSX, zero bundlers, no ES module imports/exports in browser files).
- **Single Source of Truth**: `window.GeminiNovelDB` (IndexedDB) is the sole authoritative store for all book chapters, reading progress, and novel records.
- **Line Count Hard Ceiling (Rule 2.7)**: Hard limit of 3,000 lines for any JavaScript file.
- **6-File Synchronized Release Parity**: Every batch must bump all 6 version files in lockstep.
- **Git Protection**: Never commit local rule files (`GEMINI.md`, `AGENTS.md`) or sensitive credentials.
- **Device Connection**: Samsung Galaxy S24 Ultra connected at `192.168.1.202:5555` via wireless ADB (`scratch/phone_adb.js`).
