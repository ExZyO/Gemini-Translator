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
      .reader-v2-theme-black { background: #000000; color: #d1d5db; --r-accent: #f59e0b; --r-bg: #000000; --r-card: #111111; --r-border: #222222; --r-text: #d1d5db; --r-muted: #888888; }
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
    `;
    document.head.appendChild(styleEl);
  }

  return ensureStyles;
}));
