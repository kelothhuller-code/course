// src/pages/dashboard/EventsTab.jsx
import React from 'react';

export default function EventsTab({ enrolledEvents, setActiveTab }) {
  if (enrolledEvents.length === 0) {
    return (
      <div>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Events</h2>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't registered for any events yet.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('explore')}>Browse Events</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>My Events</h2>
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {enrolledEvents.map(item => {
          const event = item.eventId;
          if (!event) return null;
          const dateStr = new Date(event.dateTime).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          return (
            <div key={event._id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div className="dateTime" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem' }}>📅 {dateStr}</div>
              <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{event.title}</h3>
              <p className="card-desc" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', flex: 1 }}>
                {event.description}
              </p>
              
              <div className="card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
                  {event.type?.toUpperCase()} ({event.duration})
                </span>
                {event.meetingLink ? (
                  <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                    🔗 Join Event
                  </a>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}