// Sanitizes incoming request bodies, queries, and parameters against MongoDB NoSQL operator injection ($ and .)
const sanitizeKey = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (/^\$/.test(key) || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeKey(obj[key]);
      }
    }
  }
};

export const sanitizeNoSql = (req, res, next) => {
  if (req.body) sanitizeKey(req.body);
  if (req.query) sanitizeKey(req.query);
  if (req.params) sanitizeKey(req.params);
  next();
};
