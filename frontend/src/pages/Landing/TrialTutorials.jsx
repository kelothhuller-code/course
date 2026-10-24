import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';

export default function TrialTutorials({ trials, onPlayVideo }) {
  if (!trials || trials.length === 0) return null;

  return (
    <section className="trials-section" id="trials">
      <div className="container">
        <div className="section-label">FREE TRIAL</div>
        <h2 className="section-title">Not Sure Yet? Watch a Free Lesson.</h2>
        <p className="section-subtitle">Watch a free lesson before you decide.</p>

        <div className="trials-grid">
          {trials.slice(0, 6).map(trial => {
            const hasVideo = Boolean(trial.videoUrl);
            return (
              <a 
                key={trial._id} 
                href={trial.videoUrl || '#'} 
                target={hasVideo ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="trial-card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                onClick={(e) => {
                  if (!hasVideo && onPlayVideo) {
                    e.preventDefault();
                    onPlayVideo(trial.videoUrl);
                  }
                }}
              >
                <div className="trial-thumbnail">
                  <img 
                    src={getMediaUrl(trial.thumbnail) || FALLBACK_COURSE_THUMBNAIL} 
                    alt={trial.title}
                    width="640"
                    height="360"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_COURSE_THUMBNAIL;
                    }}
                  />
                  <div className="trial-play" aria-label={`Watch ${trial.title}`}>
                    ▶
                  </div>
                </div>
                <div className="trial-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span className="trial-category">{trial.category || 'Free Tutorial'}</span>
                  <h3 className="trial-title">{trial.title}</h3>
                  <p className="trial-desc">{trial.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem' }}>
                    <span className="trial-duration">⏱️ {trial.duration || 'Free'}</span>
                    <span style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ▶ Watch on YouTube ↗
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="trials-cta">
          <Link to="/auth" className="btn btn-secondary">
            Explore More Free Tutorials →
          </Link>
        </div>
      </div>
    </section>
  );
}