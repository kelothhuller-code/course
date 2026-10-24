import { useEffect } from 'react';
import { SITE_NAME, SITE_URL } from '../config/site';

const DEFAULT_DESCRIPTION = 'WideTech: practical online courses, ready-to-use business software and done-for-you services (automation, custom software, business administration).';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const setMeta = (attr, key, content) => {
  if (content === undefined || content === null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/**
 * Per-page <title>, description, canonical, Open Graph/Twitter tags and optional JSON-LD.
 * The SPA updates these on navigation; index.html holds the generic defaults.
 */
export function usePageMeta({ title, description, image, path, type = 'website', jsonLd } = {}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Courses, Software & Business Services`;
    const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160);
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = image ? (image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`) : DEFAULT_IMAGE;
    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let script = null;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.page = 'true';
      script.textContent = ld.replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }
    return () => { if (script) script.remove(); };
  }, [title, description, image, path, type, ld]);
}

export default function Seo(props) {
  usePageMeta(props);
  return null;
}
