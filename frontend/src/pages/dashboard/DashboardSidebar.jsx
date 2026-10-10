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
    { id: 'continue', icon: '▶', label: 'Dashboard' },
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
    <aside className="glass-card sidebar-card dashboard-sidebar">
      <div className="profile-summary">
        <div className="profile-avatar">
          {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{profile?.name}</h3>
          <div className="profile-role">{profile?.role === 'admin' ? 'Super Admin' : 'Student'}</div>
          <p className="profile-email">{profile?.email}</p>
        </div>
      </div>
      
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button 
            key={item.id}
            className={`sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="sidebar-btn-icon">{item.icon}</span>
            <span className="sidebar-btn-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}