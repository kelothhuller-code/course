import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// Import sub-components
import Navbar from './Landing/Navbar';
import Hero from './Landing/Hero';
import TrustStrip from './Landing/TrustStrip';
import FeaturedCourse from './Landing/FeaturedCourse';
import BuildJourney from './Landing/BuildJourney';
import CourseCurriculum from './Landing/CourseCurriculum';
import WhyAI from './Landing/WhyAI';
import TrialTutorials from './Landing/TrialTutorials';
import LearningPaths from './Landing/LearningPaths';
import EventsSection from './Landing/EventsSection';
import AudienceSection from './Landing/AudienceSection';
import HowItWorks from './Landing/HowItWorks';
import FounderSection from './Landing/FounderSection';
import FAQ from './Landing/FAQ';
import FinalCTA from './Landing/FinalCTA';
import Footer from './Landing/Footer';
import VideoModal from './Landing/VideoModal';
import AdvancedCourses from './Landing/AdvancedCourses';
import CourseGrid from './Landing/CourseGrid';
import LeadMagnet from './Landing/LeadMagnet';
import SoftwareShowcase from './Landing/SoftwareShowcase';
import ServicesShowcase from './Landing/ServicesShowcase';

export default function LandingPage({ user, onOpenMockPayment }) {
  const [courses, setCourses] = useState([]); // Initialize as empty array
  const [events, setEvents] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [featuredCourse, setFeaturedCourse] = useState(null);
  const navigate = useNavigate();

  // Fetch courses with pagination
  const fetchCourses = async (page = 1, showAll = false) => {
    try {
      const data = await api.getCourses(page, 9, showAll);
      // Ensure data.courses is an array
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
      setShowAllCourses(data.showAll || false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]); // Set empty array on error
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [coursesData, eventsData, trialsData, featuredData] = await Promise.all([
        api.getCourses(1, 3, false),
        api.getEvents(),
        api.getTrials(),
        api.getFeaturedCourse().catch(() => ({ featuredCourse: null }))
      ]);

      const courseList = Array.isArray(coursesData.courses) ? coursesData.courses : [];
      setCourses(courseList);
      
      // Determine highlighted course: explicit backend featured course, or one marked isFeatured
      if (featuredData && featuredData.featuredCourse) {
        setFeaturedCourse(featuredData.featuredCourse);
      } else {
        const found = courseList.find(c => c.isFeatured) || null;
        setFeaturedCourse(found);
      }

      setPagination(coursesData.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      });
      setShowAllCourses(coursesData.showAll || false);

      // Ensure events and trials are arrays
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setTrials(Array.isArray(trialsData) ? trialsData : []);
    } catch (err) {
      console.error('Error fetching landing page data:', err);
      setCourses([]);
      setEvents([]);
      setTrials([]);
      setFeaturedCourse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handlePageChange = (newPage) => {
    fetchCourses(newPage, showAllCourses);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowAll = () => {
    fetchCourses(1, true);
  };

  const handleShowPaginated = () => {
    fetchCourses(1, false);
  };

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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#F8FAFC'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#4F46E5',
          animation: 'pulse 1.5s infinite'
        }}>
          WIDETECHNOS ACADEMY
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <Navbar user={user} featuredCourse={featuredCourse} onLogout={() => {
        localStorage.removeItem('token');
        navigate('/');
      }} />

      <main>
        <Hero user={user} handleEnroll={handleEnroll} featuredCourse={featuredCourse} />
        <TrustStrip />
        <FeaturedCourse
          course={featuredCourse}
          user={user}
          handleEnroll={handleEnroll}
        />
        <BuildJourney />
        {featuredCourse && (
          <CourseCurriculum course={featuredCourse} />
        )}
        <WhyAI />
        <TrialTutorials
          trials={trials}
          onPlayVideo={setActiveVideo}
        />

        {/* Course Grid with Pagination */}
        <CourseGrid
          courses={courses}
          user={user}
          handleEnroll={handleEnroll}
          pagination={pagination}
          onPageChange={handlePageChange}
          onShowAll={handleShowAll}
          onShowPaginated={handleShowPaginated}
          showAll={showAllCourses}
        />

        {/* ── WideTech Software Products & Commercial Tools ── */}
        <SoftwareShowcase />

        {/* ── WideTech Custom Engineering & AI Bot Automation Services ── */}
        <ServicesShowcase />

        <LearningPaths />
        <EventsSection
          events={events}
          user={user}
          handleEnroll={handleEnroll}
        />
        <AudienceSection />
        <HowItWorks />
        <FounderSection />
        <FAQ />
        <FinalCTA
          user={user}
          handleEnroll={handleEnroll}
          featuredCourse={featuredCourse}
        />
        <LeadMagnet />
      </main>

      <Footer />

      {activeVideo && (
        <VideoModal
          videoUrl={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}