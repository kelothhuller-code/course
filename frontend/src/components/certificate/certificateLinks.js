import { SITE_NAME } from '../../config/site';

/** Public verification page for a certificate ID. */
export const verifyUrlFor = (id) => `${window.location.origin}/verify/${encodeURIComponent(id)}`;

/** LinkedIn "Add to profile" link (official add-certification URL, no API key needed). */
export function linkedInAddUrl(c) {
  const issued = c.issuedAt ? new Date(c.issuedAt) : new Date();
  const q = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: c.courseTitle || 'Course certificate',
    organizationName: SITE_NAME,
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
    certUrl: verifyUrlFor(c.certificateId || c.id),
    certId: c.certificateId || c.id || '',
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}
