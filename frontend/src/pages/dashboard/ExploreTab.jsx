// src/pages/dashboard/ExploreTab.jsx
import React from 'react';

export default function ExploreTab({ 
  allCourses, 
  enrolledCourseIds, 
  enrolledCourses,
  handleContinueLearning, 
  handleStartLearning,
  viewCertificate,
  navigate 
}) {
  return (
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
                  
                  <div className="card-meta" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => navigate(`/sale/${course._id}`)}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                    >
                      🌐 Sale Page
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}