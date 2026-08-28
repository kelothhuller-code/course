import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LandingPage({ user, onOpenMockPayment }) {
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null); // URL of trial tutorial being watched
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, eventsData, trialsData] = await Promise.all([
          api.getCourses(),
          api.getEvents(),
          api.getTrials(),
        ]);
        setCourses(coursesData);
        setEvents(eventsData);
        setTrials(trialsData);
      } catch (err) {
        console.error('Error fetching landing page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleEnroll = async (item, type) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is already enrolled
    if (type === 'course') {
      const isAlreadyEnrolled = user.enrolledCourses?.some(c => c.courseId?._id === item._id || c.courseId === item._id);
      if (isAlreadyEnrolled) {
        navigate('/dashboard');
        return;
      }
    } else if (type === 'event') {
      const isAlreadyEnrolled = user.enrolledEvents?.some(e => e.eventId?._id === item._id || e.eventId === item._id);
      if (isAlreadyEnrolled) {
        navigate('/dashboard');
        return;
      }
    }

    if (item.price === 0 || !item.isPaid) {
      // Free registration
      try {
        if (type === 'event') {
          await api.registerFreeEvent(item._id);
          alert('Successfully registered for this free event!');
          navigate('/dashboard');
        } else {
          // Free courses logic if any
          alert('Course registration success!');
          navigate('/dashboard');
        }
      } catch (err) {
        alert(err.message || 'Registration failed');
      }
      return;
    }

    // Paid item: initiate checkout
    try {
      const paymentData = await api.initiatePayment(item._id, type);
      if (paymentData.isMock) {
        // Trigger mock payment modal in App.jsx
        onOpenMockPayment({
          txnid: paymentData.txnid,
          amount: paymentData.amount,
          productinfo: paymentData.productinfo,
          firstname: paymentData.firstname,
          email: paymentData.email,
        });
      } else {
        // Real PayU form post
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>WIDETECHNOS ACADEMY...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="badge">FUTURE OF EDUCATION</div>
        <h1>
          Master <span className="text-gradient">Artificial Intelligence</span><br />
          For Daily Life & Business
        </h1>
        <p className="hero-desc">
          Empowering everyone from kids aged 10+ to older adults to build websites, mobile apps, software, and games using cutting-edge AI. Join the revolution led by <strong>WIDETECHNOS</strong>.
        </p>
        <div className="cta-group">
          <a href="#courses" className="btn btn-primary">Browse Courses</a>
          <a href="#trials" className="btn btn-secondary">Watch Free Lessons</a>
        </div>
      </section>

      {/* Vision & Instagram Banner */}
      <section className="vision-section" id="vision">
        <div className="vision-card">
          <div className="vision-grid">
            <div>
              <div className="badge" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6', borderColor: 'rgba(236,72,153,0.3)' }}>OUR PLEDGE</div>
              <h2 className="vision-header">1,000 Jobs by 2027</h2>
              <p className="vision-text">
                WIDETECHNOS is on a mission to build a brighter future. Spearheaded by founder <strong>@videdreamer</strong> on Instagram, we aim to direct and mentor individuals to secure AI remote jobs, build startups, and create life-changing software.
              </p>
              <div className="vision-highlight-box">
                <p>
                  "AI will not replace humans, but humans using AI will replace those who do not. We make complex coding, game design, and app building accessible to children and grandparents alike."
                </p>
              </div>
              <a href="https://instagram.com/videdreamer" target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
                Follow @videdreamer on Instagram
              </a>
            </div>
            
            <div className="vision-stats">
              <div className="stat-item">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Job Opportunities Target</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">10+</div>
                <div className="stat-label">Minimum Student Age</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">2027</div>
                <div className="stat-label">Vision Deadline</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Tutorials Section */}
      <section style={{ padding: '4rem 0' }} id="trials">
        <div className="section-header">
          <h2>Free Trial Tutorials</h2>
          <p>Get started instantly with these short, bite-sized lessons. No account or payment required!</p>
        </div>
        
        <div className="grid-2">
          {trials.map(trial => (
            <div key={trial._id} className="glass-card trial-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden', background: '#1e293b', flexShrink: 0 }}>
                <img src={trial.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{trial.category}</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{trial.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{trial.description}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration: {trial.duration || '5 mins'}</span>
              </div>
              <button className="play-btn" onClick={() => setActiveVideo(trial.videoUrl)} style={{ border: 'none', cursor: 'pointer' }}>
                ▶
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* AI Courses Section */}
      <section style={{ padding: '4rem 0' }} id="courses">
        <div className="section-header">
          <h2>Our Course Packages</h2>
          <p>Carefully structured learning paths designed to take you from novice to AI developer.</p>
        </div>

        <div className="grid-3">
          {courses.map(course => {
            const isEnrolled = user && user.enrolledCourses?.some(c => c.courseId?._id === course._id || c.courseId === course._id);
            return (
              <div key={course._id} className="glass-card course-card">
                <div className="card-img-container">
                  <span className="card-tag">{course.category}</span>
                  <img src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} alt={course.title} />
                </div>
                <div className="badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.15rem 0.6rem', marginBottom: '0.5rem' }}>
                  {course.packageType} Package
                </div>
                <h3 className="card-title">{course.title}</h3>
                <p className="card-desc">{course.description}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {course.languages?.map(lang => (
                    <span key={lang} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      🌐 {lang}
                    </span>
                  ))}
                </div>
                <div className="card-meta">
                  <div className="card-price">₹{course.price}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => handleEnroll(course, 'course')}>
                    {isEnrolled ? 'Go to Course' : 'Purchase Package'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Webinars & Workshops Section */}
      <section style={{ padding: '4rem 0' }} id="events">
        <div className="section-header">
          <h2>Live Webinars & Workshops</h2>
          <p>Learn in real-time. Connect directly with AI developers and build live projects.</p>
        </div>

        <div className="grid-2">
          {events.map(event => {
            const isEnrolled = user && user.enrolledEvents?.some(e => e.eventId?._id === event._id || e.eventId === event._id);
            const dateStr = new Date(event.dateTime).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return (
              <div key={event._id} className="glass-card event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-img-container" style={{ height: '140px' }}>
                  <span className="card-tag" style={{ color: event.isPaid ? '#ec4899' : '#10b981' }}>
                    {event.type.toUpperCase()} • {event.isPaid ? `₹${event.price}` : 'FREE'}
                  </span>
                  <img src={event.thumbnail || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'} alt="" />
                </div>
                <div className="dateTime">📅 {dateStr} ({event.duration})</div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{event.title}</h3>
                <p className="card-desc" style={{ fontSize: '0.88rem' }}>{event.description}</p>
                
                <div className="card-meta" style={{ marginTop: 'auto' }}>
                  <span className="duration">Instructor: @videdreamer</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEnroll(event, 'event')}>
                    {isEnrolled ? 'Enrolled (Dashboard)' : event.isPaid ? 'Purchase Ticket' : 'Register Free'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trial Tutorial Video Modal */}
      {activeVideo && (
        <div className="modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveVideo(null)}>×</button>
            <div className="video-wrapper" style={{ margin: 0, paddingBottom: '56.25%' }}>
              <iframe
                src={activeVideo}
                title="Trial Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers for HSL colors
const varToVal = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
