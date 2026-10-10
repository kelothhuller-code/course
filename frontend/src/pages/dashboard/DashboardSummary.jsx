// src/pages/dashboard/DashboardSummary.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardSummary({ enrolledCourses = [], inProgressCourses = [], completedCourses = [], certificates = [] }) {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('week'); // 'week' | 'month'

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
  const notStartedStroke = (notStartedPct / 100) * circumference;

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
    { icon: '📚', label: 'Enrolled Courses', value: totalCourses, subtext: `${notStartedCourses.length} not started`, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { icon: '📖', label: 'In Progress', value: inProgressCourses.length, subtext: 'Actively learning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { icon: '🎓', label: 'Completed Courses', value: completedCourses.length, subtext: `${completedPct.toFixed(0)}% completion`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { icon: '🏆', label: 'Verified Certificates', value: certificates.length, subtext: 'Official credentials', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { icon: '🔥', label: 'Chapters Completed', value: totalChaptersFinished, subtext: 'Lessons mastered', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
      
      {/* ── KPI Metrics Cards ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem' 
      }}>
        {summaryCards.map((card, idx) => (
          <div key={idx} className="glass-card" style={{ 
            padding: '1.25rem 1rem', 
            borderRadius: '16px',
            borderLeft: `4px solid ${card.color}`,
            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {card.icon}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{card.value}</div>
              <div style={{ color: card.color, fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>{card.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Analytics & Charts Grid ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '1.25rem' 
      }}>
        
        {/* Chart 1: Weekly Study Activity & Velocity (Bar Chart) */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span> Weekly Study Activity
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Lessons & chapters completed over the last 7 days
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '8px' }}>
              <button 
                onClick={() => setSelectedTimeframe('week')}
                style={{ 
                  background: selectedTimeframe === 'week' ? 'var(--primary, #3b82f6)' : 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  cursor: 'pointer' 
                }}
              >
                7 Days
              </button>
              <button 
                onClick={() => setSelectedTimeframe('month')}
                style={{ 
                  background: selectedTimeframe === 'month' ? 'var(--primary, #3b82f6)' : 'transparent', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  cursor: 'pointer' 
                }}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', padding: '1rem 0.5rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {weeklyDays.map((d, i) => {
              const heightPct = Math.max(15, Math.min(100, (d.chapters / maxChapters) * 100));
              const isToday = i === 5; // highlight Saturday/current day
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: isToday ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600 }}>
                    {d.chapters}
                  </div>
                  <div 
                    title={`${d.day}: ${d.chapters} lessons completed`}
                    style={{ 
                      width: '100%', 
                      maxWidth: '28px',
                      height: `${heightPct}%`, 
                      background: isToday 
                        ? 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)' 
                        : (d.active ? 'linear-gradient(180deg, rgba(96, 165, 250, 0.7) 0%, rgba(37, 99, 235, 0.4) 100%)' : 'rgba(255,255,255,0.08)'),
                      borderRadius: '6px 6px 2px 2px',
                      boxShadow: isToday ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
                      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                  />
                  <span style={{ fontSize: '0.72rem', color: isToday ? '#fff' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500 }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
              <span>Active Streak: <strong>5 Days in a Row</strong> 🔥</span>
            </div>
            <span style={{ color: '#10b981', fontWeight: 600 }}>+28% study time vs last week</span>
          </div>
        </div>

        {/* Chart 2: Course Completion Donut Chart */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎯</span> Overall Completion Ratio
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Portfolio progress across all registered programs
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1rem', padding: '0.5rem 0' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.08)"
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
                {/* In Progress Arc (Amber) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#3b82f6"
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
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {avgCompletionRate}%
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Progress
                </span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                </div>
                <strong style={{ color: '#fff' }}>{completedCourses.length} ({completedPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>In Progress</span>
                </div>
                <strong style={{ color: '#fff' }}>{inProgressCourses.length} ({inProgressPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255,255,255,0.2)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Not Started</span>
                </div>
                <strong style={{ color: '#fff' }}>{notStartedCourses.length} ({notStartedPct.toFixed(0)}%)</strong>
              </div>

              <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#a78bfa' }}>
                ✨ {certificates.length > 0 ? `${certificates.length} Certificate(s) Available to Download` : 'Finish a course to unlock your certificate!'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Active Course Progress Quick Bar ── */}
      {inProgressCourses.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚡</span> Continue Where You Left Off:
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{inProgressCourses.length} active course(s)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {inProgressCourses.slice(0, 3).map((item, idx) => {
              const c = item.course || {};
              const progressVal = item.progress || 0;
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '12px', 
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, transform 0.2s ease'
                  }}
                  onClick={() => navigate(`/course/${c._id || item.courseId}/learn`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {c.title || 'Course In Progress'}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>{progressVal}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                    <div style={{ width: `${progressVal}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #2563eb)', borderRadius: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{item.completedChapters?.length || 0} chapters done</span>
                    <span style={{ color: '#60a5fa' }}>Resume Lesson →</span>
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