import React from 'react';
import { getMediaUrl, FALLBACK_EVENT_THUMBNAIL } from '../../utils/media';

export default function EventsSection({ events, user, handleEnroll }) {
  if (!events || events.length === 0) return null;

  return (
    <section className="events-section" id="events">
      <div className="container">
        <div className="section-label">LIVE EVENTS</div>
        <h2 className="section-title">Learn Live. Build Together.</h2>
        <div className="events-grid">
          {events.slice(0, 4).map(event => {
            const isEnrolled = user && user.enrolledEvents?.some(e => e.eventId?._id === event._id || e.eventId === event._id);
            const dateStr = new Date(event.dateTime).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return (
              <div key={event._id} className="event-card">
                <div className="event-img">
                  <img 
                    src={getMediaUrl(event.thumbnail) || FALLBACK_EVENT_THUMBNAIL} 
                    alt={event.title} 
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_EVENT_THUMBNAIL;
                    }}
                  />
                </div>
                <div className="event-date">📅 {dateStr} ({event.duration || '1hr'})</div>
                <h3 className="event-title">{event.title}</h3>
                <p className="event-desc">{event.description}</p>
                <div className="event-meta">
                  <span className="event-instructor">👨‍🏫 @widetechai</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEnroll(event, 'event')}>
                    {isEnrolled ? '✅ Enrolled' : event.isPaid ? '🎫 Buy Ticket' : '🎉 Register Free'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}