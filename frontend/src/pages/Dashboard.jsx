// src/pages/dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
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

    // Use an isolated hidden iframe so React virtual DOM is never destroyed
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - WIDETECH Academy</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
            * { box-sizing: border-box; }
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { padding: 0; }
            }
          </style>
          ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('')}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 500);
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
      navigate(`/checkout/${courseId}`);
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
          
          <div className="dashboard-grid">
            
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
            <main style={{ minWidth: 0, width: '100%' }}>
              <DashboardTabs 
                activeTab={activeTab}
                inProgressCourses={inProgressCourses}
                enrolledCourses={enrolledCourses}
                completedCourses={completedCourses}
                certificates={certificates}
                enrolledEvents={enrolledEvents}
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