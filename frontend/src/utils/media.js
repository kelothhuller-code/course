/**
 * Media URL Resolver
 * Ensures uploaded thumbnails, documents (PDFs, PPTs), and software files
 * always resolve properly regardless of relative path, localhost, or production domain.
 */
export function getMediaUrl(path) {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  if (!trimmed) return '';

  // Already an absolute URL, data URI, or blob
  if (/^(?:https?:)?\/\/|^data:|^blob:/i.test(trimmed)) {
    return trimmed;
  }

  // Retrieve base API url (e.g. 'http://localhost:5001/api' or 'https://widetech.in/api' or '/api')
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').trim();

  // Strip trailing /api or /api/ to get backend root origin
  const origin = apiBase.replace(/\/api\/?$/i, '');

  // Ensure path starts with a single slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If origin is non-empty (like http://localhost:5001), prepend it
  if (origin && !origin.startsWith('/')) {
    return `${origin}${cleanPath}`;
  }

  // Fallback to relative path if on same-origin production proxy
  return cleanPath;
}

export const FALLBACK_COURSE_THUMBNAIL = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80';
export const FALLBACK_SOFTWARE_THUMBNAIL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
export const FALLBACK_EVENT_THUMBNAIL = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
