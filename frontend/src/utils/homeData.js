import { api } from '../api';

/**
 * Homepage data: one GET /api/home request (started as early as possible and shared), falling
 * back to the individual endpoints if /api/home is unavailable (e.g. an older backend).
 * Resolves to { courses, courseTotal, featuredCourse, events, trials, software, softwareTotal,
 * services, servicesTotal, enquiryForm }.
 */
let homePromise = null;

const legacyHome = async () => {
  const value = (r, fallback) => (r.status === 'fulfilled' && r.value ? r.value : fallback);
  const results = await Promise.allSettled([
    api.getCourseShowcase(3),
    api.getEvents(),
    api.getTrials(),
    api.getFeaturedCourse(),
    api.getServicesList(),
    api.getSoftwareList(),
  ]);
  const coursesData = value(results[0], {});
  const courses = Array.isArray(coursesData.courses) ? coursesData.courses : [];
  const services = value(results[4], {}).services || [];
  const software = value(results[5], {}).softwares || [];
  return {
    courses,
    courseTotal: Number(coursesData.total) || courses.length,
    featuredCourse: value(results[3], {}).featuredCourse || null,
    events: value(results[1], []),
    trials: value(results[2], []),
    services,
    servicesTotal: services.length,
    software,
    softwareTotal: software.length,
    enquiryForm: null,
  };
};

export const loadHomeData = () => {
  if (!homePromise) {
    homePromise = api.getHome()
      .then((d) => (d && Array.isArray(d.courses) ? d : legacyHome()))
      .catch(() => legacyHome())
      .catch((err) => {
        homePromise = null;
        throw err;
      });
  }
  return homePromise;
};

/** Forget the cached data (e.g. after the user logs in/out and comes back to the homepage). */
export const resetHomeData = () => {
  homePromise = null;
};
