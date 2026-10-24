import express from 'express';
import Event from '../models/Event.js';
import TrialTutorial from '../models/TrialTutorial.js';
import Software from '../models/Software.js';
import Service from '../models/Service.js';
import { getOrInitGstConfig } from './gstRoutes.js';
import { buildCourseShowcase, getFeaturedCourse } from '../utils/courseShowcase.js';
import { publicSoftware, publicService, CATALOG_SORT } from '../utils/catalog.js';
import { getPublicEnquiryForm } from '../utils/enquiryForm.js';
import { PUBLIC_API_MAX_AGE, hasCredentials } from '../middleware/cache.js';

/**
 * GET /api/home: everything the landing page needs in ONE request, instead of the 7 separate
 * calls it used to make (courses/showcase, courses/featured, events, trials, software,
 * services, leads/enquiry-form). Every visitor gets the same public data, so the result is
 * kept in memory for HOME_CACHE_TTL_MS and sent with a short public Cache-Control.
 * The old endpoints still work and are unchanged for other pages / older app builds.
 *
 * The in-memory copy is dropped whenever an admin (or anyone) changes catalog data
 * (see invalidateHomeOnWrite in server.js), so admin edits show up on the next page load.
 */
const router = express.Router();

const HOME_CACHE_TTL_MS = Math.max(0, Number(process.env.HOME_CACHE_TTL_MS ?? PUBLIC_API_MAX_AGE * 1000));
const CATALOG_LIMIT = 24; // the homepage shows at most 3 of each + the totals
const SHOWCASE_LIMIT = 3;

let cached = null; // { at, body }
let inFlight = null;
let invalidatedAt = 0;

export const invalidateHomeCache = () => {
  cached = null;
};

const publicEvent = (doc) => {
  // Same as GET /api/events for a guest: the meeting link is only for registered attendees.
  const e = doc.toObject();
  delete e.meetingLink;
  return e;
};

export const buildHomePayload = async () => {
  const [showcase, featuredCourse, events, trials, gstConfig, software, softwareTotal, services, servicesTotal, enquiryForm] =
    await Promise.all([
      buildCourseShowcase(SHOWCASE_LIMIT),
      getFeaturedCourse(),
      // Events/trials are tiny collections; kept hydrated so the JSON (incl. schema defaults)
      // is exactly what GET /api/events (as a guest) and GET /api/trials return.
      Event.find({}).sort({ dateTime: 1 }),
      TrialTutorial.find({}).sort({ createdAt: -1 }),
      getOrInitGstConfig(),
      // Hydrated (not lean) on purpose: publicSoftware/publicService rely on schema defaults
      Software.find({ status: 'active' }).sort(CATALOG_SORT).limit(CATALOG_LIMIT),
      Software.countDocuments({ status: 'active' }),
      Service.find({ status: 'active' }).sort(CATALOG_SORT).limit(CATALOG_LIMIT),
      Service.countDocuments({ status: 'active' }),
      getPublicEnquiryForm().catch((err) => {
        console.error('Home: enquiry form failed', err.message);
        return null;
      }),
    ]);

  return {
    success: true,
    courses: showcase.courses,
    courseTotal: showcase.total,
    featuredCourse,
    events: events.map(publicEvent),
    trials: trials.map((t) => t.toJSON()),
    software: software.map((d) => publicSoftware(d, gstConfig)),
    softwareTotal,
    services: services.map((d) => publicService(d, gstConfig)),
    servicesTotal,
    enquiryForm,
    generatedAt: new Date().toISOString(),
  };
};

const getHome = async () => {
  if (cached && Date.now() - cached.at < HOME_CACHE_TTL_MS) return cached.body;
  if (!inFlight) {
    const startedAt = Date.now();
    inFlight = buildHomePayload()
      .then((body) => {
        // Don't store a result that an admin edit invalidated while it was being built
        if (HOME_CACHE_TTL_MS > 0 && invalidatedAt <= startedAt) {
          cached = { at: Date.now(), body };
        }
        return body;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
};

const markInvalid = () => { invalidatedAt = Date.now(); invalidateHomeCache(); };

router.get('/', async (req, res) => {
  try {
    const body = await getHome();
    res.set('Cache-Control', `public, max-age=${PUBLIC_API_MAX_AGE}, stale-while-revalidate=300`);
    res.json(body);
  } catch (error) {
    console.error('Home payload error:', error);
    res.status(500).json({ message: 'Could not load the homepage data.' });
  }
});

// Paths whose non-GET requests can change what the homepage shows
const HOME_DATA_PREFIXES = ['/api/admin', '/api/courses', '/api/events', '/api/trials', '/api/software', '/api/services', '/api/categories', '/api/upload'];

/**
 * server.js middleware: drop the cached homepage after any successful signed-in write to catalog
 * data (admin edits, uploads, reviews). Anonymous POSTs (enquiry forms etc.) can't change what
 * the homepage shows, so they don't flush the cache. Anything else (e.g. sales counts) refreshes
 * within HOME_CACHE_TTL_MS.
 */
export const invalidateHomeOnWrite = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS'
    && hasCredentials(req)
    && HOME_DATA_PREFIXES.some((p) => req.originalUrl.startsWith(p))) {
    res.on('finish', () => { if (res.statusCode < 400) markInvalid(); });
  }
  next();
};

export default router;
