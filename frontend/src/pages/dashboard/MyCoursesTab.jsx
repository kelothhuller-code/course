// src/pages/dashboard/MyCoursesTab.jsx
import React from 'react';

export default function MyCoursesTab({ 
  enrolledCourses, 
  handleContinueLearning, 
  viewCertificate,
  certLoading,
  setActiveTab 
}) {
  if (enrolledCourses.length === 0) {
    return (
      <div>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Courses</h2>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You are not enrolled in any courses yet.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('explore')}>Explore Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Courses</h2>
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
                    {(!course.isFree && course.price > 0) && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setActiveTab && setActiveTab('invoices')}
                        title="View and download GST Tax Invoice"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        GST Invoice
                      </button>
                    )}

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}