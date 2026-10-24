import crypto from 'crypto';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';

// ---- Certificate IDs -------------------------------------------------------------------------
// New IDs are random (80 bits, Crockford base32, no look-alike characters), e.g. WTC-7K2Q-F9XA-B3HC-4DPR.
// They are assigned once and never change. Older IDs (WTA-2026-AI-123456) were sequential-looking
// and guessable; they are replaced the next time the owner opens the certificate, and the old ID
// keeps verifying (with the learner's name masked) so certificates already shared stay valid.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const newCertificateId = () => {
  const bytes = crypto.randomBytes(10);
  let bits = 0; let value = 0; let out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return `WTC-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
};
export const CERT_ID_RE = /^WTC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
const isLegacyId = (id) => !CERT_ID_RE.test(String(id || ''));

const maskName = (name = '') => String(name).split(/\s+/).filter(Boolean)
  .map((w) => (w.length <= 2 ? `${w[0]}*` : `${w[0]}${'*'.repeat(Math.min(w.length - 2, 6))}${w[w.length - 1]}`)).join(' ');

// ---- Course facts printed on the certificate (from real course data) ---------------------------
const toSeconds = (d) => {
  const parts = String(d || '').trim().split(':').map((n) => Number.parseInt(n, 10));
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
};
export const courseFacts = (course) => {
  if (!course) return { modules: 0, lessons: 0, durationLabel: '' };
  const lang = (course.content || [])[0];
  const chapters = lang?.chapters || [];
  let lessons = 0; let secs = 0;
  for (const ch of chapters) {
    if (Array.isArray(ch.lessons) && ch.lessons.length) {
      lessons += ch.lessons.length;
      for (const l of ch.lessons) secs += toSeconds(l.duration);
    } else {
      lessons += 1;
    }
    secs += toSeconds(ch.duration);
  }
  if (!secs) secs = toSeconds(course.duration);
  const h = Math.floor(secs / 3600); const m = Math.round((secs % 3600) / 60);
  const durationLabel = secs ? (h ? `${h} hr${h > 1 ? 's' : ''}${m ? ` ${m} min` : ''}` : `${m || 1} min`) : '';
  return { modules: chapters.length, lessons, durationLabel };
};

const certView = (cert, course) => ({
  _id: cert._id,
  certificateId: cert.certificateId,
  userName: cert.userName,
  courseTitle: cert.courseTitle,
  courseId: cert.courseId?._id || cert.courseId,
  issuedAt: cert.issuedAt,
  ...courseFacts(course),
});

/** Gives an existing certificate an unguessable ID (once). The old ID still verifies. */
const upgradeLegacyId = async (cert) => {
  if (!isLegacyId(cert.certificateId)) return cert;
  for (let i = 0; i < 3; i += 1) {
    try {
      const old = cert.certificateId;
      cert.legacyCertificateId = old;
      cert.certificateId = newCertificateId();
      await cert.save();
      await User.updateOne({ _id: cert.userId, 'certificates.certificateId': old }, { $set: { 'certificates.$.certificateId': cert.certificateId } });
      return cert;
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }
  }
  return cert;
};

// Core certificate creation helper that can be called by controller or progress completion
export const createCertificateForUser = async (userId, courseId, courseTitle, issuedAt) => {
  const user = await User.findById(userId);
  const course = await Course.findById(courseId);
  if (!user || !course) throw new Error('User or course not found');

  const existing = await Certificate.findOne({ userId, courseId });
  if (existing) return upgradeLegacyId(existing);

  for (let i = 0; i < 3; i += 1) {
    const certificateId = newCertificateId();
    try {
      const certificate = await Certificate.create({
        userId,
        courseId,
        certificateId,
        courseTitle: courseTitle || course.title,
        userName: user.name,
        userEmail: user.email,
        issuedAt: issuedAt || new Date(),
      });
      await User.updateOne({ _id: userId }, {
        $push: { certificates: { courseId, certificateId, issuedAt: certificate.issuedAt, courseTitle: certificate.courseTitle } },
      });
      return certificate;
    } catch (e) {
      if (e?.code !== 11000) throw e;
      const raced = await Certificate.findOne({ userId, courseId });
      if (raced) return raced; // another request created it first
    }
  }
  throw new Error('Could not create certificate');
};

/**
 * Lazily issues certificates for courses the user already completed (either progress system)
 * but that have no certificate record yet, e.g. completions from before certificates existed.
 */
export const ensureCertificates = async (userId) => {
  const [user, progress, certs] = await Promise.all([
    User.findById(userId).select('enrolledCourses').lean(),
    Progress.find({ userId, completed: true }).select('courseId completedAt').lean(),
    Certificate.find({ userId }).select('courseId').lean(),
  ]);
  if (!user) return;
  const have = new Set(certs.map((c) => String(c.courseId)));
  const done = new Map();
  for (const e of user.enrolledCourses || []) if (e.completed && e.courseId) done.set(String(e.courseId), e.completedAt);
  for (const p of progress) if (p.courseId && !done.has(String(p.courseId))) done.set(String(p.courseId), p.completedAt);
  for (const [courseId, completedAt] of done) {
    if (have.has(courseId)) continue;
    try { await createCertificateForUser(userId, courseId, undefined, completedAt || undefined); } catch (e) { console.error('Lazy certificate error:', e.message); }
  }
};

// Get user's certificates
export const getCertificates = async (req, res) => {
  try {
    const userId = req.user._id;
    await ensureCertificates(userId);
    const list = await Certificate.find({ userId }).populate('courseId', 'title thumbnail description content duration').sort({ issuedAt: -1 });
    const certificates = [];
    for (const c of list) {
      await upgradeLegacyId(c);
      const course = c.courseId && typeof c.courseId === 'object' ? c.courseId : null;
      certificates.push({ ...certView(c, course), course: course ? { _id: course._id, title: course.title, thumbnail: course.thumbnail } : null });
    }
    res.json({ certificates });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
};

// Get certificate for a specific course (own certificates only)
export const getCertificateByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!/^[a-f0-9]{24}$/i.test(String(courseId))) return res.status(400).json({ success: false, message: 'Invalid course id' });
    const userId = req.user._id;
    let certificate = await Certificate.findOne({ userId, courseId });
    if (!certificate) {
      await ensureCertificates(userId);
      certificate = await Certificate.findOne({ userId, courseId });
    }
    if (!certificate) return res.status(404).json({ success: false, message: 'Finish the course to get your certificate.' });
    await upgradeLegacyId(certificate);
    const course = await Course.findById(courseId).select('title content duration').lean();
    res.json({ certificate: certView(certificate, course) });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificate' });
  }
};

// Verify certificate by ID (public route). Shows only what is printed on the certificate.
export const verifyCertificate = async (req, res) => {
  try {
    const raw = String(req.params.certificateId || '').trim().toUpperCase().slice(0, 40);
    if (!/^[A-Z0-9-]{6,40}$/.test(raw)) return res.status(404).json({ valid: false, message: 'Certificate not found' });
    let legacy = false;
    let certificate = await Certificate.findOne({ certificateId: raw });
    if (!certificate) {
      certificate = await Certificate.findOne({ legacyCertificateId: raw });
      legacy = Boolean(certificate);
    }
    if (!certificate) return res.status(404).json({ valid: false, message: 'Certificate not found' });
    const course = await Course.findById(certificate.courseId).select('title content duration').lean();
    const view = certView(certificate, course);
    res.set('Cache-Control', 'no-store');
    res.json({
      valid: true,
      certificate: {
        id: legacy ? raw : view.certificateId,
        userName: legacy ? maskName(view.userName) : view.userName,
        courseTitle: view.courseTitle,
        issuedAt: view.issuedAt,
        modules: view.modules,
        durationLabel: view.durationLabel,
        issuer: 'WideTech',
        legacyId: legacy,
      },
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify certificate' });
  }
};

// Generate certificate (admin only)
export const generateCertificate = async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) return res.status(400).json({ success: false, message: 'userId and courseId are required' });
    const certificate = await createCertificateForUser(userId, courseId);
    res.status(201).json({ message: 'Certificate generated successfully', certificate });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate certificate' });
  }
};
