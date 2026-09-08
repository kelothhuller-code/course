// src/pages/dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import DashboardSummary from './dashboard/DashboardSummary';
import DashboardSidebar from './dashboard/DashboardSidebar';
import DashboardTabs from './dashboard/DashboardTabs';
import CertificateModal from './dashboard/CertificateModal';

export default function Dashboard({ user, onRefreshUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('continue');
  const [selectedCert, setSelectedCert] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const [myLearning, setMyLearning] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Memoized values to prevent unnecessary re-renders
  const enrolledCourses = myLearning?.courses || [];
  const enrolledEvents = myLearning?.events || [];
  const completedCourses = enrolledCourses.filter(c => c.completed);
  const inProgressCourses = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
  const certificates = myLearning?.certificates || [];
  const enrolledCourseIds = new Set(enrolledCourses.map(c => c.course?._id || c.courseId));

  // Fetch learning data
  const fetchLearningData = useCallback(async () => {
    try {
      const [learning, courses, certs] = await Promise.all([
        api.getMyLearning().catch(() => ({ courses: [], events: [] })),
        api.getAllCourses().catch(() => ({ courses: [] })),
        api.getCertificates().catch(() => ({ certificates: [] }))
      ]);
      
      setMyLearning({
        ...learning,
        certificates: certs.certificates || []
      });
      setAllCourses(Array.isArray(courses?.courses) ? courses.courses : []);
    } catch (err) {
      console.error('Error fetching learning data:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await api.getProfile();
        setProfile(data);
        await fetchLearningData();
      } catch (err) {
        console.error('Error fetching dashboard profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, fetchLearningData]);

  // Handle payment callback
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      alert('Success! Your payment was verified and enrollment completed.');
      navigate('/dashboard', { replace: true });
      if (onRefreshUser) onRefreshUser();
      fetchLearningData();
    } else if (paymentStatus === 'failed') {
      alert('Payment failed or cancelled. Please try again.');
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate, onRefreshUser, fetchLearningData]);

  const viewCertificate = async (courseId) => {
    setCertLoading(true);
    try {
      const certData = await api.getCertificateByCourse(courseId);
      setSelectedCert(certData.certificate);
    } catch (err) {
      alert(err.message || 'Could not load certificate');
    } finally {
      setCertLoading(false);
    }
  };

  const handlePrintCert = () => {
    const printContent = document.getElementById('cert-print-area');
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    window.location.reload();
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  const handleStartLearning = async (courseId) => {
    const course = allCourses.find(c => c._id === courseId);
    if (course?.price === 0 || course?.isFree) {
      try {
        await api.enrollFree(courseId);
        await fetchLearningData();
        navigate(`/course/${courseId}`);
      } catch (err) {
        alert(err.message);
      }
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onRefreshUser) onRefreshUser();
    navigate('/');
  };

  if (loading) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>LOADING DASHBOARD...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="landing-page" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ flexGrow: 1, paddingBottom: '2rem' }}>
          
          {/* Summary Cards */}
          <DashboardSummary 
            enrolledCourses={enrolledCourses}
            inProgressCourses={inProgressCourses}
            completedCourses={completedCourses}
            certificates={certificates}
          />

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
            
            {/* Sidebar */}
            <DashboardSidebar 
              profile={profile}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              enrolledCourses={enrolledCourses}
              enrolledEvents={enrolledEvents}
              certificates={certificates}
            />

            {/* Main Content */}
            <main>
              <DashboardTabs 
                activeTab={activeTab}
                inProgressCourses={inProgressCourses}
                enrolledCourses={enrolledCourses}
                enrolledEvents={enrolledEvents}
                certificates={certificates}
                allCourses={allCourses}
                enrolledCourseIds={enrolledCourseIds}
                handleContinueLearning={handleContinueLearning}
                handleStartLearning={handleStartLearning}
                viewCertificate={viewCertificate}
                setActiveTab={setActiveTab}
                setSelectedCert={setSelectedCert}
                certLoading={certLoading}
                navigate={navigate}
              />
            </main>
          </div>

          {/* Certificate Modal */}
          <CertificateModal 
            selectedCert={selectedCert}
            setSelectedCert={setSelectedCert}
            profile={profile}
            handlePrintCert={handlePrintCert}
          />
          
        </div>
      </div>
    </>
  );
}