import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

// Get user's certificates
export const getCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await Certificate.find({ userId })
      .populate('courseId', 'title thumbnail description')
      .sort({ issuedAt: -1 });

    res.json({ certificates });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

// Get certificate for a specific course
export const getCertificateByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const certificate = await Certificate.findOne({ userId, courseId });
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ certificate });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
};

// Verify certificate by ID (public route)
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('courseId', 'title description')
      .populate('userId', 'name email');

    if (!certificate) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Certificate not found or invalid' 
      });
    }

    res.json({
      valid: true,
      certificate: {
        id: certificate.certificateId,
        userName: certificate.userName,
        courseTitle: certificate.courseTitle,
        issuedAt: certificate.issuedAt,
        issuer: 'WideTechnos Academy'
      }
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
};

// Core certificate creation helper that can be called by controller or progress completion
export const createCertificateForUser = async (userId, courseId, courseTitle) => {
  const user = await User.findById(userId);
  const course = await Course.findById(courseId);

  if (!user || !course) {
    throw new Error('User or course not found');
  }

  // Check if certificate already exists
  const existing = await Certificate.findOne({ userId, courseId });
  if (existing) {
    return existing;
  }

  const certificateId = `WTA-${new Date().getFullYear()}-AI-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  const certificate = new Certificate({
    userId,
    courseId,
    certificateId,
    courseTitle: courseTitle || course.title,
    userName: user.name,
    userEmail: user.email,
    issuedAt: new Date()
  });

  await certificate.save();

  // Add to user's certificates
  user.certificates = user.certificates || [];
  user.certificates.push({
    courseId,
    certificateId,
    issuedAt: new Date(),
    courseTitle: courseTitle || course.title
  });
  await user.save();

  return certificate;
};

// Generate certificate (admin/instructor only)
export const generateCertificate = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: 'userId and courseId are required' });
    }

    const certificate = await createCertificateForUser(userId, courseId);

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate
    });

  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate certificate' });
  }
};