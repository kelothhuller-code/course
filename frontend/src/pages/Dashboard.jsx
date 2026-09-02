import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';

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

  // Fetch learning data
  const fetchLearningData = useCallback(async () => {
    console.log('dfdfdf')
    try {
      const [learning, courses, certs] = await Promise.all([
        api.getMyLearning().catch(() => ({ courses: [], events: [] })),
        api.getAllCourses().catch(() => []),
        api.getCertificates().catch(() => ({ certificates: [] }))
      ]);
      
      setMyLearning({
        ...learning,
        certificates: certs.certificates || []
      });
      setAllCourses(Array.isArray(courses) ? courses : []);
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

 // In Dashboard.js, update the viewCertificate function:
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

  const enrolledCourses = myLearning?.courses || [];
  const enrolledEvents = myLearning?.events || [];
  const completedCourses = enrolledCourses.filter(c => c.completed);
  const inProgressCourses = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
  const certificates = myLearning?.certificates || [];
  const enrolledCourseIds = new Set(enrolledCourses.map(c => c.course?._id || c.courseId));

  // Summary stats
  const summaryCards = [
    { icon: '📚', label: 'My Courses', value: enrolledCourses.length },
    { icon: '📖', label: 'In Progress', value: inProgressCourses.length },
    { icon: '🎓', label: 'Completed', value: completedCourses.length },
    { icon: '🏆', label: 'Certificates', value: certificates.length },
  ];

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="landing-page" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ flexGrow: 1, paddingBottom: '2rem' }}>
          {/* Dashboard Summary Cards */}
          <div className="dashboard-summary" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {summaryCards.map((card, idx) => (
              <div key={idx} className="glass-card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '2rem' }}>{card.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{card.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
            {/* Sidebar */}
            <aside className="glass-card sidebar-card" style={{ padding: '1.5rem', alignSelf: 'start' }}>
              <div className="profile-summary" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="profile-avatar" style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#fff',
                  margin: '0 auto 0.75rem auto'
                }}>
                  {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <h3 className="profile-name" style={{ marginBottom: '0.25rem' }}>{profile?.name}</h3>
                <div className="profile-role" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{profile?.role}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{profile?.email}</p>
              </div>
              
              <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className={`sidebar-btn ${activeTab === 'continue' ? 'active' : ''}`}
                  onClick={() => setActiveTab('continue')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: activeTab === 'continue' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'continue' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === 'continue' ? '600' : '400',
                    transition: 'all var(--transition)'
                  }}
                >
                  ▶ Continue Learning
                </button>
                <button 
                  className={`sidebar-btn ${activeTab === 'courses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('courses')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: activeTab === 'courses' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'courses' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === 'courses' ? '600' : '400',
                    transition: 'all var(--transition)'
                  }}
                >
                  📖 My Courses ({enrolledCourses.length})
                </button>
                <button 
                  className={`sidebar-btn ${activeTab === 'events' ? 'active' : ''}`}
                  onClick={() => setActiveTab('events')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: activeTab === 'events' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'events' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === 'events' ? '600' : '400',
                    transition: 'all var(--transition)'
                  }}
                >
                  📅 Events ({enrolledEvents.length})
                </button>
                <button 
                  className={`sidebar-btn ${activeTab === 'certs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('certs')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: activeTab === 'certs' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'certs' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === 'certs' ? '600' : '400',
                    transition: 'all var(--transition)'
                  }}
                >
                  🎓 Certificates ({certificates.length})
                </button>
                <button 
                  className={`sidebar-btn ${activeTab === 'explore' ? 'active' : ''}`}
                  onClick={() => setActiveTab('explore')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: activeTab === 'explore' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'explore' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === 'explore' ? '600' : '400',
                    transition: 'all var(--transition)'
                  }}
                >
                  🛒 Explore
                </button>
              </nav>
            </aside>

            {/* Main Content */}
            <main>
              {activeTab === 'continue' && (
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Continue Learning</h2>
                  {inProgressCourses.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {enrolledCourses.length === 0 ? 
                          "You haven't enrolled in any courses yet. Explore our courses!" : 
                          "All your courses are completed! 🎉"
                        }
                      </p>
                      <button className="btn btn-primary" onClick={() => setActiveTab('explore')}>
                        Explore Courses
                      </button>
                    </div>
                  ) : (
                    <div className="continue-learning-grid" style={{ display: 'grid', gap: '1.5rem' }}>
                      {inProgressCourses.map(item => {
                        const course = item.course;
                        if (!course) return null;
                        
                        return (
                          <div key={course._id} className="glass-card continue-card" style={{ 
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '1.5rem',
                            padding: '1.5rem',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ 
                              width: '120px', 
                              height: '80px', 
                              borderRadius: 'var(--radius)',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              <img 
                                src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                                alt={course.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{course.title}</h3>
                              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                <span>📊 {item.progress}% Complete</span>
                                <span>✅ {item.completedLessons || 0} / {item.totalLessons || '?'} Lessons</span>
                                {item.lastWatchedLesson && (
                                  <span>▶ Last: {item.lastWatchedLesson.title}</span>
                                )}
                              </div>
                              <div style={{ marginTop: '0.5rem', maxWidth: '400px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                                  <span className="progress-percentage">{item.progress}%</span>
                                </div>
                                <div className="progress-bar-container" style={{ margin: '0.25rem 0 0.5rem 0' }}>
                                  <div className="progress-bar-fill" style={{ width: `${item.progress}%` }}></div>
                                </div>
                              </div>
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleContinueLearning(course._id)}
                              >
                                ▶ Continue Learning
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'courses' && (
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Courses</h2>
                  {enrolledCourses.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You are not enrolled in any courses yet.</p>
                      <button className="btn btn-primary" onClick={() => setActiveTab('explore')}>Explore Courses</button>
                    </div>
                  ) : (
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {enrolledCourses.map(item => {
                        const course = item.course;
                        if (!course) return null;
                        
                        return (
                          <div key={course._id} className="glass-card course-card" style={{ overflow: 'hidden' }}>
                            <div className="card-img-container" style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                              <span className="card-tag" style={{
                                position: 'absolute',
                                top: '0.75rem',
                                right: '0.75rem',
                                background: course.price === 0 || course.isFree ? 'var(--accent)' : 'var(--primary)',
                                color: '#fff',
                                padding: '0.2rem 0.75rem',
                                borderRadius: '40px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                zIndex: 1
                              }}>
                                {course.price === 0 || course.isFree ? 'FREE' : 'PAID'}
                              </span>
                              <img 
                                src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                                alt={course.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ padding: '1.25rem' }}>
                              <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{course.title}</h3>
                              
                              <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                                  <span className="progress-percentage">{item.progress}%</span>
                                </div>
                                <div className="progress-bar-container">
                                  <div className="progress-bar-fill" style={{ width: `${item.progress}%` }}></div>
                                </div>
                              </div>

                              <div className="card-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {item.completed ? (
                                  <button className="btn btn-accent btn-sm" onClick={() => viewCertificate(course._id)} disabled={certLoading}>
                                    View Certificate
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: In Progress</span>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={() => handleContinueLearning(course._id)}>
                                  {item.progress > 0 ? 'Continue' : 'Start Study'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Events</h2>
                  {enrolledEvents.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't registered for any events yet.</p>
                      <button className="btn btn-primary" onClick={() => setActiveTab('explore')}>Browse Events</button>
                    </div>
                  ) : (
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {enrolledEvents.map(item => {
                        const event = item.eventId;
                        if (!event) return null;
                        const dateStr = new Date(event.dateTime).toLocaleString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        return (
                          <div key={event._id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                            <div className="dateTime" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem' }}>📅 {dateStr}</div>
                            <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{event.title}</h3>
                            <p className="card-desc" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', flex: 1 }}>
                              {event.description}
                            </p>
                            
                            <div className="card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                                {event.type?.toUpperCase()} ({event.duration})
                              </span>
                              {event.meetingLink ? (
                                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                  🔗 Join Event
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'certs' && (
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Certificates</h2>
                  {certificates.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Complete a course 100% to earn your credentials!
                      </p>
                      <button className="btn btn-primary" onClick={() => setActiveTab('courses')}>
                        View My Courses
                      </button>
                    </div>
                  ) : (
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {certificates.map(cert => (
                        <div key={cert._id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{cert.courseTitle}</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              ID: {cert.certificateId}
                            </p>
                          </div>
                          <button 
                            className="btn btn-accent btn-sm" 
                            onClick={() => setSelectedCert(cert)} 
                            disabled={certLoading}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'explore' && (
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Explore Courses</h2>
                  <p className="section-subtitle" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    Discover new courses to advance your skills
                  </p>
                  
                  {allCourses.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>No courses available at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {allCourses.map(course => {
                        const isEnrolled = enrolledCourseIds.has(course._id);
                        const isCompleted = enrolledCourses.some(c => 
                          (c.course?._id === course._id || c.courseId === course._id) && c.completed
                        );
                        
                        return (
                          <div key={course._id} className="glass-card course-card" style={{ overflow: 'hidden' }}>
                            <div className="card-img-container" style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                              <span className="card-tag" style={{
                                position: 'absolute',
                                top: '0.75rem',
                                right: '0.75rem',
                                background: course.price === 0 || course.isFree ? 'var(--accent)' : 'var(--primary)',
                                color: '#fff',
                                padding: '0.2rem 0.75rem',
                                borderRadius: '40px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                zIndex: 1
                              }}>
                                {course.price === 0 || course.isFree ? 'FREE' : '₹' + (course.discountedPrice || course.price)}
                              </span>
                              <img 
                                src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                                alt={course.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ padding: '1.25rem' }}>
                              <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{course.title}</h3>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {course.description?.substring(0, 80)}...
                              </p>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                <span>📚 {course.languages?.length || 0} Languages</span>
                                <span style={{ marginLeft: '1rem' }}>⏱️ {course.duration || 'Self-paced'}</span>
                              </div>
                              
                              <div className="card-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isCompleted ? (
                                  <button className="btn btn-accent btn-sm" onClick={() => viewCertificate(course._id)}>
                                    View Certificate
                                  </button>
                                ) : isEnrolled ? (
                                  <button className="btn btn-primary btn-sm" onClick={() => handleContinueLearning(course._id)}>
                                    Continue Learning
                                  </button>
                                ) : (course.price === 0 || course.isFree) ? (
                                  <button className="btn btn-primary btn-sm" onClick={() => handleStartLearning(course._id)}>
                                    Enroll Free
                                  </button>
                                ) : (
                                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/checkout/${course._id}`)}>
                                    Buy Now - ₹{course.discountedPrice || course.price}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>

          {/* Certificate Modal */}
          {selectedCert && (
            <div className="modal-overlay" onClick={() => setSelectedCert(null)} style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}>
              <div className="modal-content" style={{ 
                background: 'var(--background-white)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '700px',
                width: '100%',
                padding: '2rem',
                position: 'relative'
              }} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedCert(null)} style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}>×</button>
                
                <div className="certificate-preview-container">
                  <div id="cert-print-area">
                    <div className="certificate-card" style={{ 
                      padding: '2rem',
                      background: 'linear-gradient(135deg, #1a1a2e, #2d1b4e)',
                      borderRadius: 'var(--radius-lg)',
                      color: '#fff',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                        WIDETECHNOS ACADEMY
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>
                        Certificate of Accomplishment
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>This is proudly presented to</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c084fc', margin: '0.25rem 0' }}>
                          {selectedCert.userName || profile?.name}
                        </div>
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>for completing</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.25rem 0' }}>
                          {selectedCert.courseTitle}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <div>
                          <div>Date: {new Date(selectedCert.issuedAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>ID: {selectedCert.certificateId}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Verified ✓</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={handlePrintCert}>
                      🖨️ Print / Download PDF
                    </button>
                    <button className="btn btn-secondary" onClick={() => setSelectedCert(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}