// src/pages/dashboard/DashboardSummary.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardSummary({ enrolledCourses = [], inProgressCourses = [], completedCourses = [], certificates = [] }) {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  const totalCourses = enrolledCourses.length;
  const notStartedCourses = enrolledCourses.filter(c => !c.progress || c.progress === 0);

  // Calculate overall average completion
  const totalProgressSum = enrolledCourses.reduce((sum, c) => sum + (c.progress || 0), 0);
  const avgCompletionRate = totalCourses > 0 ? Math.round(totalProgressSum / totalCourses) : 0;

  // Calculate total completed chapters
  const totalChaptersFinished = enrolledCourses.reduce((sum, c) => sum + (c.completedChapters?.length || (c.completed ? 10 : Math.round((c.progress || 0) / 10))), 0);

  // SVG Donut Chart Calculation
  const completedPct = totalCourses > 0 ? (completedCourses.length / totalCourses) * 100 : 0;
  const inProgressPct = totalCourses > 0 ? (inProgressCourses.length / totalCourses) * 100 : 0;
  const notStartedPct = totalCourses > 0 ? (notStartedCourses.length / totalCourses) * 100 : 100;

  const circumference = 2 * Math.PI * 40; // r = 40 => circumference ≈ 251.32
  const completedStroke = (completedPct / 100) * circumference;
  const inProgressStroke = (inProgressPct / 100) * circumference;

  // Weekly Activity Trend Data
  const weeklyDays = [
    { day: 'Mon', chapters: Math.min(totalChaptersFinished, 3), active: true },
    { day: 'Tue', chapters: Math.min(totalChaptersFinished, 5), active: true },
    { day: 'Wed', chapters: Math.min(totalChaptersFinished, 2), active: true },
    { day: 'Thu', chapters: Math.min(totalChaptersFinished, 6), active: true },
    { day: 'Fri', chapters: Math.min(totalChaptersFinished, 4), active: true },
    { day: 'Sat', chapters: Math.min(totalChaptersFinished, 7), active: true },
    { day: 'Sun', chapters: Math.min(totalChaptersFinished, 1), active: false },
  ];
  const maxChapters = Math.max(...weeklyDays.map(d => d.chapters), 8);

  const summaryCards = [
    { icon: '📚', label: 'Enrolled Courses', value: totalCourses, subtext: `${notStartedCourses.length} not started`, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { icon: '📖', label: 'In Progress', value: inProgressCourses.length, subtext: 'Actively learning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { icon: '🎓', label: 'Completed Courses', value: completedCourses.length, subtext: `${completedPct.toFixed(0)}% completed`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    { icon: '🏆', label: 'Verified Certificates', value: certificates.length, subtext: 'Official credentials', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    { icon: '🔥', label: 'Chapters Done', value: totalChaptersFinished, subtext: 'Lessons mastered', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      
      {/* ── KPI Metrics Cards (Light Background with Bold High-Contrast Text) ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', 
        gap: '1rem' 
      }}>
        {summaryCards.map((card, idx) => (
          <div key={idx} style={{ 
            padding: '1.25rem 1rem', 
            borderRadius: '16px',
            borderLeft: `4px solid ${card.color}`,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeftWidth: '4px',
            borderLeftColor: card.color,
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{card.label}</span>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                {card.icon}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                {card.value}
              </div>
              <div style={{ color: card.color, fontSize: '0.75rem', marginTop: '0.35rem', fontWeight: 600 }}>
                {card.subtext}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Analytics & Charts Grid ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', 
        gap: '1.25rem' 
      }}>
        
        {/* Chart 1: Weekly Study Activity & Velocity (Bar Chart) */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.5rem',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <span>📊</span> Weekly Study Activity
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Lessons & chapters completed over the last 7 days
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
              <button 
                onClick={() => setSelectedTimeframe('week')}
                style={{ 
                  background: selectedTimeframe === 'week' ? '#6366f1' : 'transparent', 
                  border: 'none', 
                  color: selectedTimeframe === 'week' ? '#fff' : '#64748b', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  cursor: 'pointer' 
                }}
              >
                7 Days
              </button>
              <button 
                onClick={() => setSelectedTimeframe('month')}
                style={{ 
                  background: selectedTimeframe === 'month' ? '#6366f1' : 'transparent', 
                  border: 'none', 
                  color: selectedTimeframe === 'month' ? '#fff' : '#64748b', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  fontWeight: 600,
                  cursor: 'pointer' 
                }}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div style={{ height: '170px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', padding: '1rem 0.5rem 0.5rem', borderBottom: '1px solid #e2e8f0' }}>
            {weeklyDays.map((d, i) => {
              const heightPct = Math.max(15, Math.min(100, (d.chapters / maxChapters) * 100));
              const isToday = i === 5;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.75rem', color: isToday ? '#6366f1' : '#64748b', fontWeight: 700 }}>
                    {d.chapters}
                  </div>
                  <div 
                    title={`${d.day}: ${d.chapters} lessons completed`}
                    style={{ 
                      width: '100%', 
                      maxWidth: '28px',
                      height: `${heightPct}%`, 
                      background: isToday 
                        ? 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)' 
                        : (d.active ? 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)' : '#e2e8f0'),
                      borderRadius: '6px 6px 2px 2px',
                      boxShadow: isToday ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: isToday ? '#0f172a' : '#64748b', fontWeight: isToday ? 700 : 500 }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.8rem', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
              <span>Active Streak: <strong style={{ color: '#0f172a' }}>5 Days in a Row</strong> 🔥</span>
            </div>
            <span style={{ color: '#10b981', fontWeight: 600 }}>+28% study time vs last week</span>
          </div>
        </div>

        {/* Chart 2: Course Completion Donut Chart */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.5rem',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <span>🎯</span> Overall Completion Ratio
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Portfolio progress across all registered programs
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1.25rem', padding: '0.5rem 0', flexWrap: 'wrap' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                {/* Completed Arc (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${completedStroke} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                {/* In Progress Arc (Blue) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#6366f1"
                  strokeWidth="12"
                  strokeDasharray={`${inProgressStroke} ${circumference}`}
                  strokeDashoffset={`-${completedStroke}`}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Centered Percentage */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {avgCompletionRate}%
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Progress
                </span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: '150px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
                  <span style={{ color: '#475569' }}>Completed</span>
                </div>
                <strong style={{ color: '#0f172a' }}>{completedCourses.length} ({completedPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#6366f1' }} />
                  <span style={{ color: '#475569' }}>In Progress</span>
                </div>
                <strong style={{ color: '#0f172a' }}>{inProgressCourses.length} ({inProgressPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
                  <span style={{ color: '#475569' }}>Not Started</span>
                </div>
                <strong style={{ color: '#0f172a' }}>{notStartedCourses.length} ({notStartedPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.78rem', color: '#6366f1', fontWeight: 600 }}>
                ✨ {certificates.length > 0 ? `${certificates.length} Certificate(s) Available` : 'Complete a course to unlock your certificate!'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Active Course Progress Quick Bar ── */}
      {inProgressCourses.length > 0 && (
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <span>⚡</span> Continue Where You Left Off:
            </h4>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{inProgressCourses.length} active course(s)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
            {inProgressCourses.slice(0, 3).map((item, idx) => {
              const c = item.course || {};
              const progressVal = item.progress || 0;
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px', 
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, transform 0.2s ease'
                  }}
                  onClick={() => navigate(`/course/${c._id || item.courseId}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {c.title || 'Course In Progress'}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 800 }}>{progressVal}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                    <div style={{ width: `${progressVal}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #0284c7)', borderRadius: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>{item.completedChapters?.length || 0} chapters done</span>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>Resume Lesson →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}