import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Routes imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import trialRoutes from './routes/trialRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import enrollRoutes from './routes/enrollRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitizeNoSql } from './middleware/noSqlSanitizer.js';

// Import models for seeding
import Course from './models/Course.js';
import User from './models/User.js';

dotenv.config();

const app = express();

// Security Middleware: Helmet HTTP Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "*", "data:", "blob:", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https:", "*"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "*"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
      connectSrc: ["'self'", "*"]
    }
  }
}));

// Security Middleware: Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many payment requests, please try again later.' }
});

// Middleware
// PayU response comes as urlencoded postback form data, so we must support urlencoded parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NoSQL Operator Injection Sanitizer
app.use(sanitizeNoSql);

// Rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payment', paymentLimiter);

// Configure CORS to allow frontend calls
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Setup for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from 'public' (js, css, images) without 301 redirects
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));

// Admin Frontend Page Route (Served only when no static file matched)
app.get(['/admin', '/admin/'], (req, res) => {
  res.removeHeader('Content-Security-Policy');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin/gst', gstRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/reviews', reviewRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to WIDETECHNOS Academy Backend API' });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found - ${req.originalUrl}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Seed Database Function
async function seedDatabase() {
  try {
    // Check if courses exist
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      console.log('📦 Seeding database with initial data...');

      // Add your seed data here if needed
      // Example seed data - modify as needed for your app
      const sampleCourse = {
        title: 'Sample AI Course',
        description: 'This is a sample course to get you started with AI development.',
        type: 'Course',
        category: 'AI Development',
        isFree: true,
        price: 0,
        discountedPrice: 0,
        languages: ['English'],
        content: [
          {
            language: 'English',
            chapters: [
              {
                title: 'Introduction',
                description: 'Introduction to AI',
                duration: '10:00',
                lessons: [
                  {
                    title: 'What is AI?',
                    description: 'Understanding Artificial Intelligence',
                    videoUrl: 'https://www.youtube.com/embed/sample1',
                    duration: '5:00'
                  },
                  {
                    title: 'AI Applications',
                    description: 'Real-world applications of AI',
                    videoUrl: 'https://www.youtube.com/embed/sample2',
                    duration: '5:00'
                  }
                ]
              }
            ]
          }
        ]
      };

      // Uncomment to add seed data
      // await Course.create(sampleCourse);

      console.log('✅ Database seeded successfully');
    } else {
      console.log(`📚 Database already has ${courseCount} courses, skipping seed`);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Database connection
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/widetechnos';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB database connected successfully');
    
    // Clean up legacy non-sparse subdocument index on users if present
    try {
      await mongoose.connection.collection('users').dropIndex('certificates.certificateId_1');
      console.log('🧹 Cleaned legacy certificates.certificateId_1 index from users collection');
    } catch (idxErr) {
      // Index was already dropped or did not exist
    }

    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Express server running on port ${PORT}`);
      console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      const isRzpLive = process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder');
      console.log(`💳 Gateway: ${isRzpLive ? `Razorpay Active (${process.env.RAZORPAY_KEY_ID})` : 'Mock Test Mode'}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Database connection error: ${err.message}`);
    process.exit(1);
  });