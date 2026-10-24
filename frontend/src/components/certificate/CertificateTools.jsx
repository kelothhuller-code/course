import { useEffect, useLayoutEffect, useRef } from 'react';
import PremiumCertificate from './PremiumCertificate';
import { ensurePrintFonts } from '../../utils/printDocument';

/** The certificate scaled to fit its container (keeps the exact A4 layout). */
export function ScaledCertificate({ certificate }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const apply = () => el.style.setProperty('--cert-scale', String(el.clientWidth / 1123));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Embed the fonts so Ctrl+P / Save as PDF of this page keeps them.
  useEffect(() => { ensurePrintFonts(); }, []);
  return (
    <div className="cert-frame" ref={ref}>
      <PremiumCertificate certificate={certificate} />
    </div>
  );
}
