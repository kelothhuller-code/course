import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

import SiteHeader from '../components/SiteHeader';
import Seo from '../components/Seo';
import Hero from './Landing/Hero';
import { ProblemSolution, Offerings } from './Landing/StorySections';
import FeaturedCourse from './Landing/FeaturedCourse';
import CourseCurriculum from './Landing/CourseCurriculum';
import TrialTutorials from './Landing/TrialTutorials';
import EventsSection from './Landing/EventsSection';
import HowItWorks from './Landing/HowItWorks';
import ProofSection from './Landing/ProofSection';
import FAQ from './Landing/FAQ';
import FinalCTA from './Landing/FinalCTA';
import Footer from './Landing/Footer';
import VideoModal from './Landing/VideoModal';
import CourseCarousel from './Landing/CourseCarousel';
import { buildBuyingFaqs } from '../config/faqs';
import LeadMagnet from './Landing/LeadMagnet';
import FeaturedCatalog from './Landing/FeaturedCatalog';
import EnquirySection from './Landing/EnquirySection';
import StickyBuyBar from './Landing/StickyBuyBar';
import './Landing/premium.css';

export default function LandingPage({ user }) {
  const [courses, setCourses] = useState([]); // Initialize as empty array
  const [events, setEvents] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [courseTotal, setCourseTotal] = useState(0);
  const [featuredCourse, setFeaturedCourse] = useState(null);
  const [software, setSoftware] = useState([]);
  const [services, setServices] = useState([]);
  const navigate = useNavigate();

  // Fetch all data. Uses allSettled so one failing endpoint (e.g. events) no longer
  // wipes out the whole page, and the page renders immediately instead of
  // blocking behind a full-screen spinner until every request finishes.
  const fetchAllData = async () => {
    const value = (r, fallback) => (r.status === 'fulfilled' && r.value ? r.value : fallback);
    try {
      const results = await Promise.allSettled([
        api.getCourseShowcase(3),
        api.getEvents(),
        api.getTrials(),
        api.getFeaturedCourse(),
        api.getServicesList(),
        api.getSoftwareList(),
      ]);
      const coursesData = value(results[0], {});
      const eventsData = value(results[1], []);
      const trialsData = value(results[2], []);
      const featuredData = value(results[3], { featuredCourse: null });
      const svcData = value(results[4], { services: [] });
      const swData = value(results[5], { softwares: [] });

      const courseList = Array.isArray(coursesData.courses) ? coursesData.courses : [];
      setCourses(courseList);
      setCourseTotal(Number(coursesData.total) || courseList.length);

      // Determine highlighted course: explicit backend featured course, or one marked isFeatured
      setFeaturedCourse(featuredData?.featuredCourse || courseList.find(c => c.isFeatured) || null);
      setServices(Array.isArray(svcData?.services) ? svcData.services : []);
      setSoftware(Array.isArray(swData?.softwares) ? swData.softwares : []);

      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setTrials(Array.isArray(trialsData) ? trialsData : []);
    } catch (err) {
      console.error('Error fetching landing page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleEnroll = async (item, type = 'course') => {
    if (type === 'course') {
      const isAlreadyEnrolled = user?.enrolledCourses?.some(c =>
        (c.courseId?._id || c.courseId)?.toString() === item._id.toString()
      );
      if (isAlreadyEnrolled) {
        navigate(`/course/${item._id}`);
        return;
      }

      // Always navigate to the Dedicated Sales Page funnel for all non-enrolled courses (Free & Paid)
      navigate(`/sale/${item._id}`);
      return;
    } else if (type === 'event') {
      if (!user) {
        navigate('/auth');
        return;
      }
      const isAlreadyEnrolled = user.enrolledEvents?.some(e =>
        (e.eventId?._id || e.eventId)?.toString() === item._id.toString()
      );
      if (isAlreadyEnrolled) {
        navigate('/dashboard');
        return;
      }

      const isFreeEvent = !item.isPaid || item.price === 0;
      if (isFreeEvent) {
        try {
          await api.registerFreeEvent(item._id);
          alert('🎉 Successfully registered for this free event!');
          navigate('/dashboard');
        } catch (err) {
          alert(err.message || 'Registration failed');
        }
        return;
      }

      // Paid event -> navigate to checkout
      navigate(`/checkout/${item._id}`);
      return;
    }
  };

  const faqs = buildBuyingFaqs(featuredCourse, { hasFreeLesson: trials.length > 0 });

  // FAQ structured data built from the FAQ list shown on the page (Organization JSON-LD lives in index.html)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.slice(0, 10).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="landing-page lp">
      <Seo path="/" description="Practical online courses, ready-to-use business software and done-for-you services: automation, custom software and business administration." jsonLd={jsonLd} />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <SiteHeader user={user} />

      <main id="main-content">
        {/* Story: problem → solution → what you get → proof → offer → FAQ → CTA */}
        <Hero user={user} featuredCourse={featuredCourse} software={software} services={services} loading={loading} />
        <ProblemSolution />
        <Offerings courseTotal={courseTotal} softwareCount={software.length} serviceCount={services.length} />

        {/* What you get: courses (top-courses grid/mobile scroll unchanged), featured course + curriculum */}
        <CourseCarousel courses={courses} total={courseTotal} user={user} loading={loading} />
        {featuredCourse && (
          <FeaturedCourse course={featuredCourse} user={user} />
        )}
        {featuredCourse && <CourseCurriculum course={featuredCourse} />}
        <LeadMagnet trials={trials} courses={courses} />
        <TrialTutorials trials={trials} onPlayVideo={setActiveVideo} />

        {/* What you get: software & services (each hidden when empty) */}
        <FeaturedCatalog kind="software" items={software} loading={loading} />
        <FeaturedCatalog kind="service" items={services} loading={loading} />
        <HowItWorks />

        {/* Proof (no invented numbers) */}
        <ProofSection />
        <EventsSection events={events} user={user} handleEnroll={handleEnroll} />

        {/* Offer → FAQ → CTA */}
        <FinalCTA user={user} featuredCourse={featuredCourse} />
        <FAQ faqs={faqs} />
        <EnquirySection user={user} featuredCourse={featuredCourse} />
      </main>

      <Footer />

      <StickyBuyBar course={featuredCourse} user={user} />

      {activeVideo && (
        <VideoModal
          videoUrl={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
