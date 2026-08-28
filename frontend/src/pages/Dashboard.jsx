import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard({ user, onRefreshUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // courses, events, certs
  const [selectedCert, setSelectedCert] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error('Error fetching dashboard profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  // Display success/failure messages from search query params after redirecting from PayU sandbox
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      alert('Success! Your payment was verified and enrollment completed.');
      // Clean query params
      navigate('/dashboard', { replace: true });
      if (onRefreshUser) onRefreshUser();
    } else if (paymentStatus === 'failed') {
      alert('Payment failed or cancelled. Please try again.');
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate, onRefreshUser]);

  const viewCertificate = async (courseId) => {
    setCertLoading(true);
    try {
      const certData = await api.getCertificate(courseId);
      setSelectedCert(certData);
    } catch (err) {
      alert(err.message || 'Could not load certificate');
    } finally {
      setCertLoading(false);
    }
  };

  const handlePrintCert = () => {
    const printContent = document.getElementById('cert-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    // Refresh to restore React tree
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>LOADING DASHBOARD...</div>
      </div>
    );
  }

  const enrolledCourses = profile?.enrolledCourses || [];
  const enrolledEvents = profile?.enrolledEvents || [];
  const completedCourses = enrolledCourses.filter(c => c.completed);

  return (
    <div className="container" style={{ flexGrow: 1 }}>
      <div className="dashboard-grid">
        {/* Sidebar Profile Card */}
        <aside className="glass-card sidebar-card">
          <div className="profile-summary">
            <div className="profile-avatar">
              {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <h3 className="profile-name">{profile?.name}</h3>
            <div className="profile-role">{profile?.role}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{profile?.email}</p>
          </div>
          
          <nav className="sidebar-menu">
            <button 
              className={`sidebar-btn ${activeTab === 'courses' ? 'active' : ''}`}
              onClick={() => setActiveTab('courses')}
            >
              📖 My Courses ({enrolledCourses.length})
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              📅 Webinars & Workshops ({enrolledEvents.length})
            </button>
            <button 
              className={`sidebar-btn ${activeTab === 'certs' ? 'active' : ''}`}
              onClick={() => setActiveTab('certs')}
            >
              🎓 Certificates ({completedCourses.length})
            </button>
          </nav>
        </aside>

        {/* Main Dashboard Panel */}
        <main>
          {activeTab === 'courses' && (
            <div>
              <h2 className="dashboard-title">Enrolled Courses</h2>
              {enrolledCourses.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You are not enrolled in any courses yet.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/')}>Explore AI Courses</button>
                </div>
              ) : (
                <div className="grid-2">
                  {enrolledCourses.map(item => {
                    const c = item.courseId;
                    if (!c) return null;
                    return (
                      <div key={c._id} className="glass-card course-card">
                        <div className="card-img-container" style={{ height: '140px' }}>
                          <span className="card-tag">{c.category}</span>
                          <img src={c.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} alt="" />
                        </div>
                        <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{c.title}</h3>
                        
                        <div style={{ marginBottom: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Overall Progress</span>
                            <span className="progress-percentage">{item.progress}%</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${item.progress}%` }}></div>
                          </div>
                        </div>

                        <div className="card-meta">
                          {item.completed ? (
                            <button className="btn btn-accent btn-sm" onClick={() => viewCertificate(c._id)} disabled={certLoading}>
                              View Certificate
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: In Progress</span>
                          )}
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/course/${c._id}`)}>
                            {item.progress > 0 ? 'Continue' : 'Start Study'}
                          </button>
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
              <h2 className="dashboard-title">My Webinars & Workshops</h2>
              {enrolledEvents.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't registered for any events yet.</p>
                  <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Live Events</button>
                </div>
              ) : (
                <div className="grid-2">
                  {enrolledEvents.map(item => {
                    const e = item.eventId;
                    if (!e) return null;
                    const dateStr = new Date(e.dateTime).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    return (
                      <div key={e._id} className="glass-card event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="dateTime">📅 {dateStr}</div>
                        <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{e.title}</h3>
                        <p className="card-desc" style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>{e.description}</p>
                        
                        <div className="card-meta" style={{ marginTop: 'auto' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                            {e.type.toUpperCase()} ({e.duration})
                          </span>
                          {e.meetingLink ? (
                            <a href={e.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                              🔗 Join Event URL
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
              <h2 className="dashboard-title">Acquired Certificates</h2>
              {completedCourses.length === 0 ? (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Complete a course 100% to earn your credentials!</p>
                </div>
              ) : (
                <div className="grid-2">
                  {completedCourses.map(item => {
                    const c = item.courseId;
                    if (!c) return null;
                    return (
                      <div key={c._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{c.title}</h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Completed: {new Date(item.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="btn btn-accent btn-sm" onClick={() => viewCertificate(c._id)} disabled={certLoading}>
                          Show Credentials
                        </button>
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
        <div className="modal-overlay" onClick={() => setSelectedCert(null)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCert(null)}>×</button>
            <div className="certificate-preview-container">
              {/* Certificate content inside print container */}
              <div id="cert-print-area">
                <div className="certificate-card" style={{ color: '#fff', fontStyle: 'normal' }}>
                  <div className="cert-logo">WIDETECHNOS ACADEMY</div>
                  <div className="cert-tagline">Certificate of Accomplishment</div>
                  
                  <div className="cert-recipient">
                    <div className="cert-to">This is proudly presented to</div>
                    <div className="cert-name">{selectedCert.userName}</div>
                  </div>

                  <div className="cert-statement">
                    for the successful completion and mastery of all required elements of the AI development curriculum in:
                    <h4 className="cert-title" style={{ margin: '0.75rem 0', textTransform: 'uppercase' }}>{selectedCert.courseTitle}</h4>
                  </div>

                  <div className="cert-footer">
                    <div className="cert-sign">
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 'bold', fontStyle: 'italic', fontSize: '1rem', color: '#c084fc', marginBottom: '0.25rem' }}>@videdreamer</div>
                      <div className="cert-sign-name">VIDE DREAMER</div>
                      <div className="cert-sign-title">Lead Instructor, WIDETECHNOS</div>
                    </div>
                    <div className="cert-id-section">
                      <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        Date: {new Date(selectedCert.completedAt).toLocaleDateString()}
                      </div>
                      <div className="cert-id">ID: {selectedCert.certificateId}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={handlePrintCert}>
                  🖨️ Print / Download PDF
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedCert(null)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
