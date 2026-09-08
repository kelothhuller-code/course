// src/pages/dashboard/ContinueLearningTab.jsx
import React from 'react';

export default function ContinueLearningTab({ 
  inProgressCourses, 
  enrolledCourses, 
  handleContinueLearning,
  setActiveTab 
}) {
  if (inProgressCourses.length === 0) {
    return (
      <div>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Continue Learning</h2>
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
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Continue Learning</h2>
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
    </div>
  );
}