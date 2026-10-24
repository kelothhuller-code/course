/**
 * HTTP caching helpers for the API.
 *
 * - Every /api response defaults to `Cache-Control: private, no-store` so user data (profile,
 *   orders, licences, admin screens) is never stored by a browser cache, Nginx or Cloudflare.
 * - A few public, identical-for-everyone GET endpoints opt in to a short shared cache with
 *   `publicCache()` (60 s by default). They only do so for anonymous requests: when the request
 *   carries a token (Authorization header or `token` cookie) the private default is kept.
 */

export const PUBLIC_API_MAX_AGE = 60;
export const PUBLIC_API_CACHE = `public, max-age=${PUBLIC_API_MAX_AGE}, stale-while-revalidate=300`;

export const hasCredentials = (req) =>
  Boolean(req.headers.authorization) || /(?:^|;\s*)token=/.test(req.headers.cookie || '');

/** Mount on /api before the routes. Routes may override with res.set('Cache-Control', ...). */
export const apiNoStoreByDefault = (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
};

/**
 * Route middleware: short public cache for anonymous GET/HEAD requests only.
 * Responses with an error status are switched back to no-store just before sending.
 */
export const publicCache = (seconds = PUBLIC_API_MAX_AGE) => (req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !hasCredentials(req)) {
    res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=300`);
    res.vary('Authorization');
    const writeHead = res.writeHead;
    res.writeHead = function patchedWriteHead(...args) {
      if (res.statusCode >= 400) res.set('Cache-Control', 'private, no-store');
      return writeHead.apply(this, args);
    };
  }
  next();
};
