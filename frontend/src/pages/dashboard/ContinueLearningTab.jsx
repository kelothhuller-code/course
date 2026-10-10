// src/pages/dashboard/ContinueLearningTab.jsx
import React from 'react';
import DashboardSummary from './DashboardSummary';

export default function ContinueLearningTab({ 
  profile,
  inProgressCourses = [], 
  enrolledCourses = [], 
  completedCourses = [],
  certificates = [],
  handleContinueLearning,
  setActiveTab 
}) {
  const purchasedSoftware = profile?.purchasedSoftware || [];
  const purchasedServices = profile?.purchasedServices || [];

  // Sort courses: in-progress first, then not-started, then completed
  const displayCourses = [...enrolledCourses].sort((a, b) => {
    if (a.progress > 0 && a.progress < 100 && (b.progress === 0 || b.progress === 100)) return -1;
    if (b.progress > 0 && b.progress < 100 && (a.progress === 0 || a.progress === 100)) return 1;
    if (a.progress === 0 && b.progress === 100) return -1;
    if (b.progress === 0 && a.progress === 100) return 1;
    return 0;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── User Profile Greeting Banner ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem',
        boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '1.15rem', 
            fontWeight: 800,
            flexShrink: 0 
          }}>
            {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Welcome back, {profile?.name || 'Student'}
            </h1>
            <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              {profile?.email} • <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{profile?.role === 'admin' ? 'Super Admin' : 'Student Account'}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('courses')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            My Courses ({enrolledCourses.length})
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setActiveTab('explore')}
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Explore Courses →
          </button>
        </div>
      </div>

      {/* ── 1. KPI Summary Cards & Charts ── */}
      <DashboardSummary 
        enrolledCourses={enrolledCourses}
        inProgressCourses={inProgressCourses}
        completedCourses={completedCourses}
        certificates={certificates}
      />


      {/* ── 2. My Enrolled Courses Section ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              My Courses & Learning
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Pick up right where you left off or begin your enrolled curriculum
            </p>
          </div>
          {enrolledCourses.length > 0 && (
            <button 
              className="btn btn-sm" 
              onClick={() => setActiveTab('courses')}
              style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px' }}
            >
              View All Courses ({enrolledCourses.length}) →
            </button>
          )}
        </div>

        {enrolledCourses.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '2.5rem 1.5rem', 
            textAlign: 'center',
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
          }}>
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 700 }}>
              You haven't enrolled in any courses yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Discover industry-ready workshops and masterclasses in AI, ChatGPT prompts, and full-stack development.
            </p>
            <button className="btn btn-primary" onClick={() => setActiveTab('explore')} style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}>
              Browse Available Courses →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {displayCourses.slice(0, 3).map(item => {
              const course = item.course;
              if (!course) return null;
              
              return (
                <div key={course._id} style={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '1.5rem',
                  padding: '1.25rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}>
                  <div style={{ 
                    width: '120px', 
                    height: '80px', 
                    borderRadius: '10px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#0f172a'
                  }}>
                    <img 
                      src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'} 
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <h3 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {course.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                      <span style={{ color: item.completed ? '#10b981' : '#6366f1', fontWeight: 700 }}>
                        {item.completed ? '100% Completed' : `${item.progress}% Complete`}
                      </span>
                      <span>{item.completedLessons || 0} / {item.totalLessons || '?'} Lessons</span>
                      {item.lastWatchedLesson && (
                        <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Last: {item.lastWatchedLesson.title}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ maxWidth: '420px', marginBottom: '0.85rem' }}>
                      <div className="progress-bar-container" style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div className="progress-bar-fill" style={{ width: `${item.progress}%`, height: '100%', background: item.completed ? '#10b981' : 'linear-gradient(90deg, #6366f1, #0284c7)' }}></div>
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleContinueLearning(course._id)}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {item.progress > 0 ? 'Resume Learning' : 'Start Course'} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. My Software & AI Tools Section ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Software & AI Tools
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Your purchased commercial tools, bot licenses, and production repositories
            </p>
          </div>
          <button 
            className="btn btn-sm" 
            onClick={() => setActiveTab('software')}
            style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px' }}
          >
            {purchasedSoftware.length > 0 ? `Manage Softwares (${purchasedSoftware.length}) →` : 'Browse Software Tools →'}
          </button>
        </div>

        {purchasedSoftware.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '2rem 1.5rem', 
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.3rem 0', fontWeight: 700 }}>
                Deploy WideTech AI Bots & Production Boilerplates
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, maxWidth: '520px' }}>
                Unlock AI WhatsApp assistants, high-speed lead scrapers, and full-stack MERN SaaS templates for your business.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setActiveTab('software')}
              style={{ padding: '0.55rem 1.25rem', fontWeight: 600 }}
            >
              Explore Software Catalog →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {purchasedSoftware.map((item, idx) => {
              const sw = item.softwareId || {};
              const licenseKey = item.licenseKey || `WT-SW-${idx + 100}`;

              return (
                <div key={idx} style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2,132,199,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      {sw.category || 'Software Tool'}
                    </span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0.5rem 0 0.35rem 0' }}>
                      {sw.title || 'WideTech Software'}
                    </h4>
                    <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#475569', fontFamily: 'monospace' }}>
                      License: {licenseKey}
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setActiveTab('software')}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Open Software Console →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. Custom Services & Automation Section ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Custom Services & Automation
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Custom engineering, WhatsApp bot builds, and full-stack software development
            </p>
          </div>
          <button 
            className="btn btn-sm" 
            onClick={() => setActiveTab('services')}
            style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px' }}
          >
            {purchasedServices.length > 0 ? `View Active Projects (${purchasedServices.length}) →` : 'Request Custom Service →'}
          </button>
        </div>

        {purchasedServices.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '2rem 1.5rem', 
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.3rem 0', fontWeight: 700 }}>
                Need Custom AI Automation or Bespoke Software?
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, maxWidth: '520px' }}>
                WideTech engineers build tailor-made WhatsApp bots, client management SaaS, and cross-platform mobile apps for your business.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setActiveTab('services')}
              style={{ padding: '0.55rem 1.25rem', fontWeight: 600 }}
            >
              View Service Packages →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {purchasedServices.map((item, idx) => {
              const svc = item.serviceId || {};

              return (
                <div key={idx} style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      Status: {item.status || 'Active'}
                    </span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0.5rem 0 0.35rem 0' }}>
                      {svc.title || 'Custom Engineering Project'}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                      Enquiry / Order ID: WT-SRV-{idx + 101}
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setActiveTab('services')}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    View Project Details →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}