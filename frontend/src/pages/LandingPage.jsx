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
  const navigate = useNavigate();

  // Find the featured ₹499 course - with safety check
  const featuredCourse = Array.isArray(courses) && courses.length > 0
    ? courses.find(c =>
      c.price === 499 ||
      c.title?.toLowerCase().includes('start coding') ||
      c.title?.toLowerCase().includes('beginner')
    ) || courses[0]
    : null;

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
      const [coursesData, eventsData, trialsData] = await Promise.all([
        api.getCourses(1, 9, false),
        api.getEvents(),
        api.getTrials(),
      ]);

      // Ensure courses is an array
      setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : []);
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

  const handleEnroll = async (item, type) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (type === 'course') {
      const isAlreadyEnrolled = user.enrolledCourses?.some(c =>
        c.courseId?._id === item._id || c.courseId === item._id
      );
      if (isAlreadyEnrolled) {
        navigate('/dashboard');
        return;
      }
    } else if (type === 'event') {
      const isAlreadyEnrolled = user.enrolledEvents?.some(e =>
        e.eventId?._id === item._id || e.eventId === item._id
      );
      if (isAlreadyEnrolled) {
        navigate('/dashboard');
        return;
      }
    }

    if (item.price === 0 || !item.isPaid) {
      try {
        if (type === 'event') {
          await api.registerFreeEvent(item._id);
          alert('🎉 Successfully registered for this free event!');
          navigate('/dashboard');
        } else {
          alert('🎉 Course registration success!');
          navigate('/dashboard');
        }
      } catch (err) {
        alert(err.message || 'Registration failed');
      }
      return;
    }

    try {
      const paymentData = await api.initiatePayment(item._id, type);
      if (paymentData.isMock) {
        onOpenMockPayment({
          txnid: paymentData.txnid,
          amount: paymentData.amount,
          productinfo: paymentData.productinfo,
          firstname: paymentData.firstname,
          email: paymentData.email,
        });
      } else {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.action;

        const fields = [
          'key', 'txnid', 'amount', 'productinfo',
          'firstname', 'email', 'phone', 'surl', 'furl',
          'hash', 'service_provider'
        ];

        fields.forEach(field => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = field;
          input.value = paymentData[field];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      alert(err.message || 'Payment initiation failed');
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
      <Navbar user={user} onLogout={() => {
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
        <CourseCurriculum course={featuredCourse} />
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

        <AdvancedCourses user={user} />
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