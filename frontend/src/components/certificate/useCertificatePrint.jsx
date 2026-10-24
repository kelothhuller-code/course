import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SITE_NAME } from '../../config/site';
import PremiumCertificate from './PremiumCertificate';
import { ensurePrintFonts } from '../../utils/printDocument';

/**
 * Prints one certificate on a single A4 landscape page with margin 0 (which also removes the
 * browser's URL/date header and footer). The site fonts are embedded from memory first
 * (see ensurePrintFonts) so the printout never falls back to Arial, and printing waits until the
 * fonts and the QR code are ready.
 */
export function useCertificatePrint() {
  const [cert, setCert] = useState(null);
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (!cert) return undefined;
    let node = document.getElementById('wt-print-portal');
    if (!node) {
      node = document.createElement('div');
      node.id = 'wt-print-portal';
      document.body.appendChild(node);
    }
    setHost(node);
    const style = document.createElement('style');
    style.id = 'wt-cert-page';
    style.textContent = '@page { size: A4 landscape; margin: 0; }';
    document.head.appendChild(style);
    const prevTitle = document.title;
    document.title = `${SITE_NAME} certificate ${cert.certificateId || ''}`.trim();
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      document.documentElement.classList.remove('wt-print-cert');
      style.remove();
      document.title = prevTitle;
      setCert(null);
    };
    let cancelled = false;
    const waitQr = () => new Promise((resolve) => {
      let tries = 0;
      const check = () => {
        if (node.querySelector('.cert-qr svg') || tries++ > 30) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
    (async () => {
      try { await ensurePrintFonts(); await document.fonts?.ready; } catch { /* ignore */ }
      await waitQr();
      if (cancelled) return;
      document.documentElement.classList.add('wt-print-cert');
      window.addEventListener('afterprint', cleanup);
      window.print();
      // Some browsers do not fire afterprint; print() is blocking in most, so clean up after it.
      setTimeout(() => { if (document.documentElement.classList.contains('wt-print-cert')) cleanup(); }, 1000);
    })();
    return () => { cancelled = true; };
  }, [cert]);

  const print = useCallback((c) => setCert(c), []);
  const portal = cert && host ? createPortal(<PremiumCertificate certificate={cert} />, host) : null;
  return { print, portal, printing: Boolean(cert) };
}
