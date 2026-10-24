/**
 * Printing helpers that keep the WideTech fonts in printed invoices and certificates.
 *
 * Why: when Chrome prints, it lays the page out again and may fetch the font files anew. If that
 * fetch has not finished when the print snapshot is taken (fonts are served with
 * `Cache-Control: no-cache` in many setups), the printout silently falls back to Arial/Noto.
 * Both helpers below therefore embed the self-hosted fonts as in-memory data, so printing never
 * depends on the network.
 */
const FONTS = [
  { family: 'Outfit', file: '/fonts/outfit-latin-var.woff2', weight: '500 800' },
  { family: 'Plus Jakarta Sans', file: '/fonts/plus-jakarta-sans-latin-var.woff2', weight: '400 700' },
];

let dataUrlsPromise = null;
/** Fonts as data: URLs (fetched once per page load). Resolves to [] if fetching fails. */
const fontDataUrls = () => {
  if (!dataUrlsPromise) {
    dataUrlsPromise = Promise.all(FONTS.map(async (f) => {
      const blob = await (await fetch(f.file)).blob();
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { ...f, url };
    })).catch(() => { dataUrlsPromise = null; return []; });
  }
  return dataUrlsPromise;
};

/** @font-face rules; uses embedded data when available, else absolute URLs. */
export const fontFaceCss = (embedded = [], origin = window.location.origin) => FONTS.map((f) => {
  const src = embedded.find((e) => e.family === f.family)?.url || `${origin}${f.file}`;
  return `@font-face { font-family: '${f.family}'; font-style: normal; font-weight: ${f.weight}; font-display: block; src: url('${src}') format('woff2'); }`;
}).join('\n');

let pageFontsPromise = null;
/**
 * Adds the site fonts to the current page from in-memory data (binary FontFace sources), so a
 * print of this page (window.print or Ctrl+P) keeps them. Safe to call many times.
 */
export const ensurePrintFonts = () => {
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return Promise.resolve();
  if (!pageFontsPromise) {
    pageFontsPromise = Promise.all(FONTS.map(async (f) => {
      const buf = await (await fetch(f.file)).arrayBuffer();
      const face = new FontFace(f.family, buf, { weight: f.weight, style: 'normal' });
      await face.load();
      document.fonts.add(face);
    })).catch(() => { pageFontsPromise = null; });
  }
  return pageFontsPromise;
};

const escapeTitle = (t) => String(t || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/**
 * Print a self-contained HTML document in a hidden iframe with the site fonts embedded.
 * `pageCss` should contain the @page rule; margin: 0 also removes the browser header/footer.
 */
export async function printDocument({ title, html, css = '', pageCss = '@page { size: A4; margin: 12mm; }' }) {
  const embedded = await fontDataUrls();
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'Print preview';
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeTitle(title)}</title>
<style>${fontFaceCss(embedded)}
${pageCss}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a; }
${css}</style></head><body>${html}</body></html>`);
  doc.close();

  const cleanup = () => setTimeout(() => frame.remove(), 1500);
  const go = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      cleanup();
    }
  };
  const fonts = frame.contentWindow.document.fonts;
  if (fonts && fonts.load) {
    Promise.all([fonts.load("600 16px 'Outfit'"), fonts.load("400 16px 'Plus Jakarta Sans'")])
      .then(() => fonts.ready)
      .catch(() => {})
      .then(() => setTimeout(go, 50));
  } else {
    setTimeout(go, 600);
  }
}
