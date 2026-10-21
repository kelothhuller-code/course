import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// Import sub-components
import Navbar from './Landing/Navbar';
import Hero from './Landing/Hero';
import FeaturedCourse from './Landing/FeaturedCourse';
import CourseCurriculum from './Landing/CourseCurriculum';
import TrialTutorials from './Landing/TrialTutorials';
import EventsSection from './Landing/EventsSection';
import HowItWorks from './Landing/HowItWorks';
import FounderSection from './Landing/FounderSection';
import Testimonials from './Landing/Testimonials';
import FAQ from './Landing/FAQ';
import FinalCTA from './Landing/FinalCTA';
import Footer from './Landing/Footer';
import VideoModal from './Landing/VideoModal';
import CourseCarousel from './Landing/CourseCarousel';
import { buildBuyingFaqs } from '../config/faqs';
import LeadMagnet from './Landing/LeadMagnet';
import SoftwareShowcase from './Landing/SoftwareShowcase';
import ServicesShowcase from './Landing/ServicesShowcase';
import EnquirySection from './Landing/EnquirySection';
import StickyBuyBar from './Landing/StickyBuyBar';

export default function LandingPage({ user }) {
  const [courses, setCourses] = useState([]); // Initialize as empty array
  const [events, setEvents] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [courseTotal, setCourseTotal] = useState(0);
  const [featuredCourse, setFeaturedCourse] = useState(null);
  const [hasServices, setHasServices] = useState(false);
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
        api.getAllServices(),
      ]);
      const coursesData = value(results[0], {});
      const eventsData = value(results[1], []);
      const trialsData = value(results[2], []);
      const featuredData = value(results[3], { featuredCourse: null });
      const svcData = value(results[4], { services: [] });

      const courseList = Array.isArray(coursesData.courses) ? coursesData.courses : [];
      setCourses(courseList);
      setCourseTotal(Number(coursesData.total) || courseList.length);

      // Determine highlighted course: explicit backend featured course, or one marked isFeatured
      setFeaturedCourse(featuredData?.featuredCourse || courseList.find(c => c.isFeatured) || null);
      setHasServices(Array.isArray(svcData?.services) && svcData.services.length > 0);

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

  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar
        user={user}
        featuredCourse={featuredCourse}
        hasServices={hasServices}
        hasEvents={events.length > 0}
        onLogout={async () => {
          try {
            await api.logout();
          } catch {
            localStorage.removeItem('token');
          }
          navigate('/');
        }}
      />

      <main id="main-content">
        {/* 1. Clear promise + price + buy button above the fold */}
        <Hero user={user} featuredCourse={featuredCourse} loading={loading} />

        {/* 1b. Top courses carousel (up to 3, featured first) + "View all courses" */}
        <CourseCarousel courses={courses} total={courseTotal} user={user} loading={loading} />

        {/* 2. The offer: what you get, price, curriculum */}
        {featuredCourse && (
          <FeaturedCourse course={featuredCourse} user={user} handleEnroll={handleEnroll} />
        )}
        {featuredCourse && <CourseCurriculum course={featuredCourse} />}

        {/* 3. Try before buying, how buying works, who is behind it.
            BuildJourney / WhyAI / AudienceSection / LearningPaths were removed from the page:
            they pitched an AI-website course for kids (age 10+) that is not in the live
            catalogue, which confused visitors arriving for the actual course. The components
            are kept in ./Landing if a matching course is launched again. */}
        <TrialTutorials trials={trials} onPlayVideo={setActiveVideo} />
        <HowItWorks />
        <FounderSection />
        <Testimonials />

        {/* 5. Software & services for businesses */}
        <SoftwareShowcase />
        <ServicesShowcase />

        <EventsSection events={events} user={user} handleEnroll={handleEnroll} />

        {/* 6. Objection handling, final CTA, enquiries */}
        <FAQ faqs={faqs} />
        <FinalCTA user={user} featuredCourse={featuredCourse} />
        <EnquirySection user={user} featuredCourse={featuredCourse} />
        <LeadMagnet />
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
