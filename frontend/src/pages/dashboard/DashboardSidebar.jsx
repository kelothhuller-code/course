// src/pages/dashboard/DashboardSidebar.jsx
import React from 'react';

// Standard SVG Stroke Icons
const NavIcons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  software: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  services: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  events: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  certs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  invoices: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  explore: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  gst_report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
};

export default function DashboardSidebar({
  profile,
  activeTab,
  setActiveTab,
  enrolledCourses = [],
  enrolledEvents = [],
  certificates = []
}) {
  const currentTab = activeTab === 'continue' ? 'dashboard' : activeTab;

  const menuItems = [
    { id: 'dashboard', icon: NavIcons.dashboard, label: 'Dashboard' },
    { id: 'courses', icon: NavIcons.courses, label: 'My Courses', count: enrolledCourses.length },
    { id: 'explore', icon: NavIcons.explore, label: 'Explore Courses' },
    { id: 'events', icon: NavIcons.events, label: 'Live Workshops', count: enrolledEvents.length },
    { id: 'certs', icon: NavIcons.certs, label: 'Certificates', count: certificates.length },
    { id: 'software', icon: NavIcons.software, label: 'Software & Tools', count: profile?.purchasedSoftware?.length || 0 },
    { id: 'services', icon: NavIcons.services, label: 'Services & Automation', count: profile?.purchasedServices?.length || 0 },
    { id: 'invoices', icon: NavIcons.invoices, label: 'My GST Invoices' },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ id: 'gst_report', icon: NavIcons.gst_report, label: 'GST Tax Reports' });
  }

  return (
    <aside className="glass-card sidebar-card dashboard-sidebar">
      <div className="profile-summary">
        <div className="profile-avatar">
          {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{profile?.name}</h3>
          <div className="profile-role">Student</div>
          <p className="profile-email">{profile?.email}</p>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="sidebar-btn-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {item.icon}
            </span>
            <span className="sidebar-btn-label" style={{ flex: 1 }}>
              {item.label}
            </span>
            {item.count !== undefined && item.count > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '10px',
                background: currentTab === item.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: currentTab === item.id ? '#ffffff' : '#475569'
              }}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}