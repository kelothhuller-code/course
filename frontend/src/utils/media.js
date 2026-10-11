/**
 * Media URL Resolver
 * Ensures uploaded thumbnails, documents (PDFs, PPTs), and software files
 * always resolve properly regardless of relative path, localhost, or production domain.
 */
export function getMediaUrl(path) {
  if (!path || typeof path !== 'string') return '';

  let trimmed = path.trim();
  if (!trimmed) return '';

  // 1. Strip dev origin (localhost:5001 or 127.0.0.1:5001) so URLs work on both production and local dev
  trimmed = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, '');

  // 2. Already an external absolute URL (Unsplash, S3, Cloudinary, data:, blob:)
  if (/^(?:https?:)?\/\/|^data:|^blob:/i.test(trimmed)) {
    return trimmed;
  }

  // 3. Ensure path starts with a single slash
  let cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // 4. In production where Nginx proxies /api/ to backend, map /uploads/ to /api/uploads/
  if (cleanPath.startsWith('/uploads/')) {
    cleanPath = `/api${cleanPath}`;
  }

  // 5. If VITE_API_URL is configured with an external production domain (e.g. 'https://api.widetech.in/api'),
  // prepend the backend origin so assets load directly from the backend server
  const apiBase = (import.meta.env.VITE_API_URL || '').trim();
  if (apiBase && /^https?:\/\//i.test(apiBase) && !/localhost|127\.0\.0\.1/i.test(apiBase)) {
    try {
      const backendOrigin = new URL(apiBase).origin;
      return `${backendOrigin}${cleanPath}`;
    } catch {
      // ignore URL parsing error
    }
  }

  return cleanPath;
}

export const FALLBACK_COURSE_THUMBNAIL = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80';
export const FALLBACK_SOFTWARE_THUMBNAIL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
export const FALLBACK_EVENT_THUMBNAIL = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
