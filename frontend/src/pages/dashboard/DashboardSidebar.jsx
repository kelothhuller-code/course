// src/pages/dashboard/DashboardSidebar.jsx
import React from 'react';

export default function DashboardSidebar({ 
  profile, 
  activeTab, 
  setActiveTab, 
  enrolledCourses, 
  enrolledEvents, 
  certificates 
}) {
  const menuItems = [
    { id: 'continue', icon: '▶', label: 'Continue Learning' },
    { id: 'courses', icon: '📖', label: `My Courses (${enrolledCourses.length})` },
    { id: 'events', icon: '📅', label: `Events (${enrolledEvents.length})` },
    { id: 'certs', icon: '🎓', label: `Certificates (${certificates.length})` },
    { id: 'invoices', icon: '🧾', label: 'My GST Invoices' },
    { id: 'explore', icon: '🛒', label: 'Explore' },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ id: 'gst_report', icon: '🇮🇳', label: 'GST Tax Reports' });
  }

  return (
    <aside className="glass-card sidebar-card" style={{ padding: '1.5rem', alignSelf: 'start' }}>
      <div className="profile-summary" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div className="profile-avatar" style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#fff',
          margin: '0 auto 0.75rem auto'
        }}>
          {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <h3 className="profile-name" style={{ marginBottom: '0.25rem' }}>{profile?.name}</h3>
        <div className="profile-role" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{profile?.role}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{profile?.email}</p>
      </div>
      
      <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map(item => (
          <button 
            key={item.id}
            className={`sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: activeTab === item.id ? 'var(--primary)' : 'transparent',
              color: activeTab === item.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: activeTab === item.id ? '600' : '400',
              transition: 'all var(--transition)'
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}