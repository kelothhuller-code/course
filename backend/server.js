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
import uploadRoutes from './routes/uploadRoutes.js';
import softwareRoutes from './routes/softwareRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import licenseRoutes, { accountRouter as licenseAccountRoutes } from './routes/licenseRoutes.js';
import adminLicensingRoutes from './routes/adminLicensingRoutes.js';
import { publicCategoryRouter, adminCatalogRouter } from './routes/catalogRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import homeRoutes, { invalidateHomeOnWrite } from './routes/homeRoutes.js';

import helmet from 'helmet';
import compression from 'compression';
import { apiNoStoreByDefault } from './middleware/cache.js';
import rateLimit from 'express-rate-limit';
import { sanitizeNoSql } from './middleware/noSqlSanitizer.js';
import { protect } from './middleware/auth.js';

// Setup for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
// Also fallback load standard .env if present
// Import models for seeding
import Course from './models/Course.js';
import User from './models/User.js';

const app = express();

// Behind Nginx (see nginx-production.conf) every request arrives from 127.0.0.1.
// Without this, express-rate-limit keys ALL visitors on the proxy IP, so e.g. 15 failed
// logins by anyone would lock out every user site-wide for 15 minutes.
app.set('trust proxy', process.env.TRUST_PROXY_HOPS !== undefined ? Number(process.env.TRUST_PROXY_HOPS) : 1);

const isDev = process.env.NODE_ENV !== 'production';
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

// Configure CORS to strictly allow authorized production and dev origins
const allowedOrigins = [
  'https://widetech.in',
  'https://www.widetech.in',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  (process.env.FRONTEND_URL || '').replace(/\/+$/, '')
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // In development only localhost origins are added. Previously *any* origin was
    // reflected with credentials whenever NODE_ENV was not exactly 'production'.
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*') || (isDev && isLocalOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error('CORS access blocked by WIDETECH security policy: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'] // lets the dashboard name downloaded files
};

// Compress JSON / text responses (gzip). Nginx can also compress, but this keeps API
// responses small even when the server config doesn't (see docs/PERFORMANCE.md).
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    // Leave file downloads / ranged requests (course materials, software packages) untouched
    if (req.headers.range || res.getHeader('Content-Disposition')) return false;
    return compression.filter(req, res);
  },
}));

// Mount CORS before all routes and rate limiters
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// Security Middleware: Rate Limiters (skip OPTIONS preflight)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 300,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 15,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many authentication attempts, please try again after 15 minutes.' }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Too many payment requests, please try again later.' }
});

// Public enquiry/contact forms: stop spam floods without affecting normal visitors
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 10,
  skip: (req) => req.method !== 'POST',
  message: { message: 'Too many enquiries from this IP, please try again in a few minutes or email us directly.' }
});

// Middleware
// PayU response comes as urlencoded postback form data, so we must support urlencoded parser
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// NoSQL Operator Injection Sanitizer
app.use(sanitizeNoSql);

// Rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payment', paymentLimiter);
app.use(['/api/leads/contact', '/api/leads/enquiry', '/api/software/enquire', '/api/services/enquire'], enquiryLimiter);



// Standardize API Error Responses to { success: false, message: "..." }
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      if (body.success === undefined) {
        body.success = false;
      }
      if (!body.message && body.error) {
        body.message = typeof body.error === 'string' ? body.error : 'An error occurred';
      }
      if (!body.error && body.message) {
        body.error = typeof body.message === 'string' ? body.message : 'An error occurred';
      }
    }
    return originalJson.call(this, body);
  };
  next();
});

// Private Storage Architecture:
// 1. Reroute legacy material URL requests to the authenticated streaming controller
app.get(['/uploads/materials/:filename', '/api/uploads/materials/:filename'], (req, res) => {
  const inlineQuery = req.query.inline ? `?inline=${req.query.inline}` : '';
  res.redirect(307, `/api/upload/material/download/${encodeURIComponent(req.params.filename)}${inlineQuery}`);
});

// 2. Block direct static access to software packages (must use /api/software/:id/download)
app.all(['/uploads/software*', '/api/uploads/software*'], (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Access denied: Software packages are secured in private storage. Please download via /api/software/:id/download with active credentials.'
  });
});

// 3. Static serving restricted strictly to public thumbnails (images).
// Uploaded file names are unique (timestamp + random suffix) and never overwritten, so they can
// be cached for 7 days by browsers and Cloudflare.
const serveThumbnails = express.static(path.join(__dirname, 'public', 'uploads', 'thumbnails'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
});
app.use('/uploads/thumbnails', serveThumbnails);
app.use('/api/uploads/thumbnails', serveThumbnails);

// Serve static files from 'public' (js, css, images) without 301 redirects
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));

// Configurable Secret Admin Portal Route (defaults to 'wide-hq-portal')
const rawAdminPath = (process.env.ADMIN_SECRET_PATH || 'wide-hq-portal').replace(/^\/+|\/+$/g, '');
const adminSecretPath = rawAdminPath.length > 0 ? rawAdminPath : 'wide-hq-portal';

// Serve Admin Panel Assets strictly from private directory (NOT accessible via public/)
const adminPanelDir = path.join(__dirname, 'admin_panel');

// 1. Force trailing slash for admin portal so browser resolves relative assets (./css, ./js) correctly
app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, '');
  if (normalizedPath === `/${adminSecretPath}` && !req.path.endsWith('/')) {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `/${adminSecretPath}/${query}`);
  }
  next();
});

// 2. Static assets for the admin panel (js, css, images)
app.use(`/${adminSecretPath}`, express.static(adminPanelDir));

// 3. Admin Frontend Page Entry Route
app.get([`/${adminSecretPath}/`, `/${adminSecretPath}/*`], (req, res) => {
  res.removeHeader('Content-Security-Policy');
  res.sendFile(path.join(adminPanelDir, 'index.html'));
});

// Explicitly ensure standard '/admin' returns 404 so crawlers/bots cannot probe it
if (adminSecretPath !== 'admin') {
  app.all(['/admin', '/admin/*'], (req, res) => {
    res.status(404).json({ message: 'Route not found - /admin' });
  });
}

// API caching: private/no-store unless a public route opts in (middleware/cache.js), and drop the
// cached homepage payload after any successful change to catalog data.
app.use('/api', apiNoStoreByDefault);
app.use('/api', invalidateHomeOnWrite);

// Mount API routes
app.use('/api/home', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin/gst', gstRoutes);
app.use('/api/admin/licensing', adminLicensingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/license/v1', licenseRoutes); // public licence API for desktop apps (own rate limits)
app.use('/api/account', licenseAccountRoutes);
app.use('/api/categories', publicCategoryRouter);
app.use('/api/admin/catalog', adminCatalogRouter);
app.use('/api/analytics', analyticsRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to WideTech Official Backend API' });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found - ${req.originalUrl}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Disallowed CORS origins are a client policy issue, not a server crash
  if (err && typeof err.message === 'string' && err.message.startsWith('CORS access blocked')) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
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