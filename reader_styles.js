/**
 * Gemini Translator - Reader Pro Engine Styles
 * Crisp, responsive reader typography, color themes, and animations
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root) root.ensureReaderStyles = exports;
  if (typeof window !== 'undefined') window.ensureReaderStyles = exports;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STYLES_ID = 'gemini-reader-pro-v2-styles';
  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLES_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = STYLES_ID;
    styleEl.textContent = `
      .reader-v2-shell {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        user-select: text;
        -webkit-user-select: text;
        touch-action: pan-y;
        overflow: hidden;
        font-family: inherit;
      }
      .reader-v2-theme-black { background: #000000; color: #f3f4f6; --r-accent: #f59e0b; --r-bg: #000000; --r-card: #111111; --r-border: #222222; --r-text: #f3f4f6; --r-muted: #9ca3af; }
      .reader-v2-theme-dark { background: #0a0f1d; color: #cbd5e1; --r-accent: #60a5fa; --r-bg: #0a0f1d; --r-card: #141c2f; --r-border: #222f4c; --r-text: #cbd5e1; --r-muted: #7b8fa7; }
      .reader-v2-theme-nord { background: #242933; color: #eceff4; --r-accent: #88c0d0; --r-bg: #242933; --r-card: #2e3440; --r-border: #434c5e; --r-text: #eceff4; --r-muted: #9baec8; }
      .reader-v2-theme-sepia { background: #fbf0d9; color: #433422; --r-accent: #b45309; --r-bg: #fbf0d9; --r-card: #f3e5c8; --r-border: #e3d2b2; --r-text: #433422; --r-muted: #7d6b53; }
      .reader-v2-theme-parchment { background: #f4ecd8; color: #383226; --r-accent: #92400e; --r-bg: #f4ecd8; --r-card: #eadebe; --r-border: #dbcbb1; --r-text: #383226; --r-muted: #706551; }
      .reader-v2-theme-sage { background: #e2ece2; color: #223322; --r-accent: #15803d; --r-bg: #e2ece2; --r-card: #d3e4d3; --r-border: #bed6be; --r-text: #223322; --r-muted: #567056; }
      .reader-v2-theme-light { background: #ffffff; color: #111827; --r-accent: #4f46e5; --r-bg: #ffffff; --r-card: #f3f4f6; --r-border: #e5e7eb; --r-text: #111827; --r-muted: #6b7280; }

      .reader-v2-font-serif { font-family: 'Literata', 'Merriweather', Georgia, 'Times New Roman', serif; }
      .reader-v2-font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', 'Segoe UI', sans-serif; }
      .reader-v2-font-mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, monospace; }
      .reader-v2-font-dyslexic { font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif; }

      .reader-v2-scroll-container {
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 56px;
        box-sizing: border-box;
      }
      .reader-v2-paginated-viewport {
        flex: 1;
        min-height: 0;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        padding: 52px 32px 58px;
        user-select: text;
        -webkit-user-select: text;
        touch-action: pan-y;
        cursor: default;
      }
      .reader-v2-paginated-track {
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        column-fill: auto;
        column-gap: 60px;
        transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.25, 1);
        will-change: transform;
      }
      .reader-v2-paginated-track p {
        margin-bottom: 1.15em;
        line-height: inherit;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .reader-v2-paginated-track img {
        max-width: 100%;
        max-height: calc(100vh - 180px);
        object-fit: contain;
        display: block;
        margin: 16px auto;
        border-radius: 8px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .reader-v2-page-indicator-pill {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        color: #ffffff;
        font-size: 11.5px;
        padding: 4px 14px;
        border-radius: 14px;
        letter-spacing: 0.5px;
        font-weight: 600;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        z-index: 40;
        border: 1px solid rgba(255, 255, 255, 0.12);
        white-space: nowrap;
      }
      .reader-v2-content-box {
        margin: 0 auto;
        padding: 40px 24px 140px;
        transition: max-width 0.2s ease;
      }
      .reader-v2-w-compact { max-width: 600px; }
      .reader-v2-w-standard { max-width: 740px; }
      .reader-v2-w-wide { max-width: 960px; }
      .reader-v2-w-full { max-width: 100%; padding-left: 28px; padding-right: 28px; }

      .reader-v2-content-box p {
        margin-bottom: 1.2em;
        line-height: inherit;
        position: relative;
      }
      .reader-v2-indent p {
        text-indent: 1.8em;
      }
      .reader-v2-speaking-sentence {
        background: rgba(245, 158, 11, 0.22);
        border-radius: 4px;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.26);
        transition: background 0.15s ease;
      }
      .reader-v2-search-match {
        background: #facc15;
        color: #000000;
        font-weight: 700;
        border-radius: 2px;
        padding: 0 2px;
      }
      .reader-v2-search-match.active {
        background: #f97316;
        color: #ffffff;
        box-shadow: 0 0 0 2px #ea580c;
      }

      .reader-v2-author-note, .reader-v2-blockquote {
        text-align: left !important;
        text-align-last: left !important;
        hyphens: auto;
      }
      .reader-v2-author-note p, .reader-v2-blockquote p {
        text-align: left !important;
        text-align-last: left !important;
      }

      .reader-v2-hud-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-width: 100vw;
        box-sizing: border-box;
        z-index: 50;
        background: var(--r-card);
        border-bottom: 1px solid var(--r-border);
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
        overflow-x: hidden;
      }
      .reader-top-btn-group {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        flex-shrink: 1;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        justify-content: flex-end;
      }
      .reader-top-btn-group::-webkit-scrollbar {
        display: none;
      }
      .reader-top-btn {
        min-height: 38px;
        min-width: 38px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: 1px solid var(--r-border);
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        white-space: nowrap;
        user-select: none;
        flex-shrink: 0;
      }
      .reader-top-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--r-accent);
      }
      .reader-top-btn:active {
        transform: scale(0.96);
        background: rgba(255, 255, 255, 0.18);
      }
      .reader-top-btn.active {
        background: var(--r-accent);
        color: #ffffff;
        border-color: var(--r-accent);
      }
      .reader-top-btn-text {
        display: inline;
      }
      @media (max-width: 768px) {
        .reader-v2-hud-top {
          padding: 6px 8px;
          gap: 6px;
        }
        .reader-top-btn {
          min-height: 36px;
          min-width: 36px;
          padding: 6px 8px;
          font-size: 12.5px;
        }
      }
      @media (max-width: 640px) {
        .reader-top-btn {
          min-height: 36px;
          min-width: 36px;
          padding: 6px 7px;
          font-size: 14px;
        }
        .reader-top-btn-text {
          display: none;
        }
      }
      .reader-v2-search-bar {
        position: absolute;
        top: 58px;
        left: 50%;
        transform: translateX(-50%);
        width: min(94vw, 540px);
        z-index: 60;
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
        padding: 6px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(12px);
      }
      .reader-search-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: inherit;
        font-size: 13.5px;
        padding: 6px 4px;
        font-family: inherit;
      }
      .reader-search-nav-btn {
        min-width: 34px;
        min-height: 34px;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid var(--r-border);
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .reader-search-nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--r-accent);
      }
      .reader-search-nav-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .reader-search-nav-btn.close {
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.25);
      }
      .reader-footnote-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 3px;
        padding: 1px 5px;
        font-size: 0.72em;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--r-accent);
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid currentColor;
        border-radius: 9999px;
        cursor: pointer;
        user-select: none;
        vertical-align: super;
        line-height: 1;
        transition: all 0.15s ease;
      }
      .reader-footnote-badge:hover {
        transform: scale(1.12);
        background: var(--r-accent);
        color: #ffffff;
      }
      .reader-footnote-card {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 520px;
        width: calc(100% - 32px);
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
        padding: 14px 18px;
        z-index: 10050;
        backdrop-filter: blur(12px);
        animation: toastIn 0.2s ease-out;
      }
      .reader-v2-hud-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--r-card);
        border-top: 1px solid var(--r-border);
        box-shadow: 0 -4px 20px rgba(0,0,0,0.35);
        padding: 10px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      }
      .reader-v2-hud-hidden {
        transform: translateY(-110%);
        opacity: 0;
        pointer-events: none;
      }
      .reader-v2-hud-bottom.reader-v2-hud-hidden {
        transform: translateY(110%);
      }

      /* Floating Auto-scroll speed pill */
      .reader-v2-autoscroll-pill {
        position: absolute;
        bottom: 84px;
        right: 20px;
        z-index: 45;
        background: rgba(18, 18, 24, 0.92);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 24px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        font-size: 12.5px;
        font-weight: 600;
      }

      /* More Actions Popover Menu (...) */
      .reader-v2-more-menu {
        position: absolute;
        top: 54px;
        right: 12px;
        z-index: 70;
        background: var(--r-card);
        border: 1px solid var(--r-border);
        border-radius: 12px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
        padding: 6px;
        min-width: 230px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        backdrop-filter: blur(16px);
        animation: fadeIn 0.15s ease-out;
      }
      .reader-more-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        background: transparent;
        border: none;
        color: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        width: 100%;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .reader-more-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--r-accent);
      }
      .reader-more-divider {
        height: 1px;
        background: var(--r-border);
        margin: 4px 6px;
      }

      /* Floating TTS Audio Player Bar */
      .reader-v2-tts-bar {
        position: fixed;
        bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 520px;
        z-index: 9999;
        background: rgba(18, 20, 26, 0.96);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
        animation: toastIn 0.2s ease-out;
        user-select: none;
      }
      .tts-speaking-sentence {
        background: rgba(245, 158, 11, 0.22);
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.38);
        color: #fff;
        transition: all 0.2s ease;
      }

      /* Lightbox Modal */
      .reader-v2-lightbox {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
      }
      .reader-v2-lightbox img {
        max-width: 95vw;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 6px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      }
      /* Moon+ Reader Pro 2-Row Bottom Status Bar (Exact match to Moon+ Reader HUD) */
      .moon-reader-status-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 80;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 4px 14px 4px;
        box-sizing: border-box;
        font-size: 10.5px;
        color: rgba(255, 255, 255, 0.72);
        background: #000000;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
        letter-spacing: 0.2px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.4);
      }
      .reader-v2-theme-sepia .moon-reader-status-bar {
        background: #fbf0d9;
        color: rgba(67, 52, 34, 0.75);
        box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.05);
      }
      .reader-v2-theme-parchment .moon-reader-status-bar {
        background: #f4ecd8;
        color: rgba(56, 50, 38, 0.75);
        box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.05);
      }
      .reader-v2-theme-sage .moon-reader-status-bar {
        background: #e2ece2;
        color: rgba(34, 51, 34, 0.75);
        box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.05);
      }
      .reader-v2-theme-light .moon-reader-status-bar {
        background: #ffffff;
        color: rgba(17, 24, 39, 0.75);
        box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.06);
      }
      .reader-v2-theme-dark .moon-reader-status-bar {
        background: #0a0f1d;
        color: rgba(203, 213, 225, 0.75);
      }
      .reader-v2-theme-nord .moon-reader-status-bar {
        background: #242933;
        color: rgba(236, 239, 244, 0.75);
      }
      .moon-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        line-height: 1.35;
      }
      .moon-status-time-row {
        font-size: 10.5px;
        opacity: 0.85;
        margin-bottom: 2px;
      }
      .moon-status-meta-row {
        position: relative;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .moon-status-center-text {
        flex: 1;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 8px;
        font-weight: 500;
        letter-spacing: 0.15px;
      }
      .moon-status-pages-counter {
        flex-shrink: 0;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.25px;
        opacity: 0.95;
      }
      .moon-bottom-progress-track {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1.5px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }
      .moon-bottom-progress-fill {
        height: 100%;
        background: var(--r-accent, #60a5fa);
        transition: width 0.15s ease-out;
      }

      /* Moon+ Reader TOC Drawer Quick Scrubber Bar */
      .moon-toc-scrubber-bar {
        padding: 10px 14px 12px;
        background: var(--r-card, #12141a);
        border-top: 1px solid var(--r-border, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .moon-toc-scrubber-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .moon-scrub-jump-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--r-text, #fff);
        border-radius: 6px;
        padding: 4px 7px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
      }
      .moon-scrub-jump-btn:active {
        background: var(--r-accent, #6366f1);
        color: #fff;
      }

      /* Moon+ Reader Pro 5-Color Highlighter Palette */
      .moon-highlight-palette {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(18, 20, 26, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      }
      .moon-color-chip {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .moon-color-chip:hover {
        transform: scale(1.18);
        border-color: #fff;
      }

      /* In-Chapter Selection Toolbar & Multi-Chapter Batch Selector */
      @keyframes toolbarPopIn {
        from { opacity: 0; transform: translateY(6px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .reader-sel-btn {
        transition: transform 0.12s ease, background 0.15s ease, opacity 0.12s ease;
      }
      .reader-sel-btn:active {
        transform: scale(0.95);
      }
      .reader-sel-btn:hover {
        opacity: 0.92;
      }
      .chapter-batch-scroll-list::-webkit-scrollbar {
        width: 5px;
      }
      .chapter-batch-scroll-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      /* ── MOON+ READER 1:1 OVERLAY HUD BARS (Screenshots 1 & 2) ── */
      .moon-reader-hud-top {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 52px;
        background: #000000;
        z-index: 900;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
        transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
      }
      .moon-reader-hud-top.reader-v2-hud-hidden {
        transform: translateY(-100%);
        opacity: 0;
        pointer-events: none;
      }
      .moon-hud-back-btn, .moon-hud-menu-btn {
        background: none;
        border: none;
        color: #f3f4f6;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease;
        flex-shrink: 0;
      }
      .moon-hud-back-btn:active, .moon-hud-menu-btn:active {
        background: rgba(255, 255, 255, 0.12);
      }
      .moon-hud-title {
        flex: 1;
        margin: 0 8px;
        font-size: 15px;
        font-weight: 700;
        color: #f3f4f6;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
      }

      /* Moon+ Reader Bottom HUD Container */
      .moon-reader-hud-bottom {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #000000;
        z-index: 900;
        display: flex;
        flex-direction: column;
        padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -4px 22px rgba(0, 0, 0, 0.75);
        transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
        gap: 2px;
      }
      .moon-reader-hud-bottom.reader-v2-hud-hidden {
        transform: translateY(100%);
        opacity: 0;
        pointer-events: none;
      }

      /* Row 1: Scrubber Row (<, slider, 42% >) */
      .moon-hud-scrubber-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 2px 4px 6px;
      }
      .moon-hud-scrub-btn {
        background: none;
        border: none;
        color: #9ca3af;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: color 0.15s ease, background 0.15s ease;
      }
      .moon-hud-scrub-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .moon-hud-scrub-btn:not(:disabled):active {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
      .moon-hud-range-slider {
        flex: 1;
        height: 3px;
        accent-color: #38bdf8;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 2px;
        cursor: pointer;
        outline: none;
      }
      .moon-hud-pct-text {
        font-size: 13px;
        font-weight: 700;
        color: #e5e7eb;
        min-width: 44px;
        text-align: right;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }

      /* Rows 2 & 3: 5-Button Tool & Primary Docks */
      .moon-hud-tools-row {
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 3px 0;
      }
      .moon-hud-tool-btn {
        flex: 1;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: #d1d5db;
        cursor: pointer;
        border-radius: 8px;
        position: relative;
        transition: color 0.12s ease, background 0.12s ease, transform 0.1s ease;
      }
      .moon-hud-tool-btn:active {
        transform: scale(0.92);
        background: rgba(255, 255, 255, 0.08);
      }
      .moon-hud-tool-btn.active {
        color: #38bdf8;
      }
      .moon-font-badge {
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 800;
        font-size: 14px;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      /* Quick Font Size Pop-up Slider */
      .moon-quick-font-popup {
        position: absolute;
        bottom: 104px;
        right: 18px;
        width: 250px;
        background: rgba(18, 20, 26, 0.96);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 1000;
        animation: toolbarPopIn 0.15s ease-out;
      }
      .moon-font-step-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .moon-font-step-btn:active {
        background: #38bdf8;
        color: #000;
      }
      .moon-font-slider {
        flex: 1;
        accent-color: #38bdf8;
        cursor: pointer;
      }
      .moon-font-val {
        font-size: 12px;
        font-weight: 700;
        color: #38bdf8;
        min-width: 38px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      /* Moon+ Reader Centered Bold Chapter Header */
      .moon-chapter-header {
        text-align: center;
        padding: 28px 12px 32px;
        margin-bottom: 24px;
      }
      .moon-chapter-header-number {
        font-size: 1.85em;
        font-weight: 900;
        line-height: 1.2;
        letter-spacing: -0.3px;
        margin-bottom: 6px;
      }
      .moon-chapter-header-title {
        font-size: 1.65em;
        font-weight: 800;
        line-height: 1.28;
        opacity: 0.95;
      }
    `;
    document.head.appendChild(styleEl);
  }

  return ensureStyles;
}));
