/**
 * vendor/foliate/foliate_bridge.js
 * Bridges Foliate-js (<foliate-view>, paginator, overlayer) with Gemini Translator
 */
import './view.js';
import * as CFI from './epubcfi.js';
import { Overlayer } from './overlayer.js';

class FoliateReaderBridge {
  constructor() {
    this.CFI = CFI;
    this.Overlayer = Overlayer;
    this.isSupported = typeof customElements !== 'undefined';
  }

  /**
   * Constructs a virtual Foliate Book object from raw chapters or text
   * @param {Array<{ title: string, text: string, arc?: string, volume?: string }>} chapters
   * @param {Object} [metadata]
   */
  createVirtualBook(chapters, metadata = {}) {
    const safeChapters = Array.isArray(chapters) ? chapters : [];
    const toc = safeChapters.map((ch, idx) => ({
      label: ch.title || `Chapter ${idx + 1}`,
      href: `ch_${idx}.xhtml`
    }));

    const sections = safeChapters.map((ch, idx) => {
      const href = `ch_${idx}.xhtml`;
      const paragraphs = (ch.text || '').split(/\r?\n/).map(p => p.trim()).filter(Boolean);
      const parasHtml = paragraphs.map((p, pIdx) => {
        if (/^!\[(.*?)\]\((.*?)\)$/.test(p)) {
          const m = p.match(/^!\[(.*?)\]\((.*?)\)$/);
          return `<div class="reader-img-wrap"><img src="${m[2]}" alt="${m[1]}" /></div>`;
        }
        return `<p id="p_${pIdx}" class="reader-para">${p}</p>`;
      }).join('\n');

      const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <title>${ch.title || 'Chapter'}</title>
</head>
<body>
  <div class="chapter-header">
    ${ch.arc ? `<div class="chapter-arc">${ch.arc}</div>` : ''}
    <h1 class="chapter-title">${ch.title || 'Chapter'}</h1>
  </div>
  <div class="chapter-content">
    ${parasHtml}
  </div>
</body>
</html>`;

      return {
        id: `section_${idx}`,
        href,
        load: () => xhtml,
        createDocument: () => new DOMParser().parseFromString(xhtml, 'application/xhtml+xml'),
        size: xhtml.length
      };
    });

    return {
      metadata: {
        title: metadata.title || 'Novel',
        author: metadata.author || 'Author',
        language: metadata.language || 'en'
      },
      toc,
      sections,
      rendition: {
        layout: 'reflowable',
        flow: metadata.flow || 'paginated'
      },
      resolveHref: (href) => href,
      splitTOCHref: (href) => [href, ''],
      getTOCFragment: () => null
    };
  }

  /**
   * Creates and initializes a <foliate-view> custom element inside a container
   */
  async mount(container, book, options = {}) {
    if (!container) return null;
    container.innerHTML = '';

    const view = document.createElement('foliate-view');
    view.style.width = '100%';
    view.style.height = '100%';
    view.style.display = 'block';

    container.appendChild(view);

    await view.open(book);

    if (options.flow) {
      view.renderer?.setAttribute('flow', options.flow);
    }

    if (options.styles) {
      view.setStyles?.(options.styles);
    }

    return view;
  }
}

window.FoliateBridge = new FoliateReaderBridge();
console.log('⚡ [Foliate Bridge] Foliate-js engine ready for dual-mode reading');
