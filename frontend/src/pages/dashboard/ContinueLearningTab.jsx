// src/pages/dashboard/ContinueLearningTab.jsx
import React from 'react';
import DashboardSummary from './DashboardSummary';

export default function ContinueLearningTab({ 
  inProgressCourses = [], 
  enrolledCourses = [], 
  completedCourses = [],
  certificates = [],
  handleContinueLearning,
  setActiveTab 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Summary KPI Cards & Charts (Strictly under Dashboard tab) ── */}
      <DashboardSummary 
        enrolledCourses={enrolledCourses}
        inProgressCourses={inProgressCourses}
        completedCourses={completedCourses}
        certificates={certificates}
      />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="section-title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              ⚡ Continue Learning
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Pick up right where you left off
            </p>
          </div>
          {enrolledCourses.length > 0 && (
            <button 
              className="btn btn-sm" 
              onClick={() => setActiveTab('courses')}
              style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', border: '1px solid #e2e8f0', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px' }}
            >
              View All Courses ({enrolledCourses.length}) →
            </button>
          )}
        </div>

        {inProgressCourses.length === 0 ? (
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '2.5rem 1.5rem', 
            textAlign: 'center',
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              {enrolledCourses.length === 0 ? '🎒' : '🎉'}
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.5rem', fontWeight: 700 }}>
              {enrolledCourses.length === 0 ? 
                "You haven't enrolled in any courses yet." : 
                "All your active courses are 100% completed!"
              }
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              {enrolledCourses.length === 0 ?
                "Discover industry-ready workshops and masterclasses in AI, ChatGPT prompts, and full-stack development." :
                "Great job! Download your certificates or explore new masterclasses to level up further."
              }
            </p>
            <button className="btn btn-primary" onClick={() => setActiveTab('explore')} style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}>
              Browse Available Courses →
            </button>
          </div>
        ) : (
          <div className="continue-learning-grid" style={{ display: 'grid', gap: '1.25rem' }}>
            {inProgressCourses.map(item => {
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
                    <h3 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.35rem' }}>{course.title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                      <span style={{ color: '#6366f1', fontWeight: 700 }}>📊 {item.progress}% Complete</span>
                      <span>✅ {item.completedLessons || 0} / {item.totalLessons || '?'} Lessons</span>
                      {item.lastWatchedLesson && (
                        <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>▶ Last: {item.lastWatchedLesson.title}</span>
                      )}
                    </div>
                    
                    <div style={{ maxWidth: '420px', marginBottom: '0.85rem' }}>
                      <div className="progress-bar-container" style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div className="progress-bar-fill" style={{ width: `${item.progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #0284c7)' }}></div>
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleContinueLearning(course._id)}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      ▶ Resume Learning
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}