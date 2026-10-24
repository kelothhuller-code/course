import { daysUntil } from './format';

/** Plain-language status of a licence plus a colour tone. */
export function licenceStatus(l) {
  if (l.revoked) return { label: 'Revoked', tone: 'danger' };
  if (l.lifetime) return { label: 'Lifetime', tone: 'success' };
  if (l.expired) return { label: 'Expired', tone: 'danger' };
  const d = daysUntil(l.expiresAt);
  if (d !== null && d <= 14) return { label: 'Expiring soon', tone: 'warning' };
  return { label: 'Active', tone: 'success' };
}

export const maskKey = (key = '') => {
  const k = String(key);
  if (k.length <= 4) return '••••';
  const parts = k.split('-');
  if (parts.length > 1) return parts.map((p, i) => (i === parts.length - 1 || (i === 0 && /^[A-Z]{2,4}$/.test(p)) ? p : '•'.repeat(Math.min(p.length, 5)))).join('-');
  return `${'•'.repeat(Math.max(4, k.length - 4))}${k.slice(-4)}`;
};
