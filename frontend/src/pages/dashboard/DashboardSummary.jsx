// src/pages/dashboard/DashboardSummary.jsx
import React from 'react';

export default function DashboardSummary({ enrolledCourses, inProgressCourses, completedCourses, certificates }) {
  const summaryCards = [
    { icon: '📚', label: 'My Courses', value: enrolledCourses.length },
    { icon: '📖', label: 'In Progress', value: inProgressCourses.length },
    { icon: '🎓', label: 'Completed', value: completedCourses.length },
    { icon: '🏆', label: 'Certificates', value: certificates.length },
  ];

  return (
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
  );
}