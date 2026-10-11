import React from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../../utils/media';

export default function TrialTutorials({ trials, onPlayVideo }) {
  if (!trials || trials.length === 0) return null;

  return (
    <section className="trials-section" id="trials">
      <div className="container">
        <div className="section-label">FREE TRIAL</div>
        <h2 className="section-title">Not Sure Yet? Try AI for Free.</h2>
        <p className="section-subtitle">Watch a free lesson before you decide.</p>

        <div className="trials-grid">
          {trials.slice(0, 6).map(trial => (
            <div key={trial._id} className="trial-card">
              <div className="trial-thumbnail">
                <img 
                  src={getMediaUrl(trial.thumbnail) || FALLBACK_COURSE_THUMBNAIL} 
                  alt={trial.title}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_COURSE_THUMBNAIL;
                  }}
                />
                <button 
                  className="trial-play"
                  onClick={() => onPlayVideo(trial.videoUrl)}
                  aria-label={`Play ${trial.title}`}
                >
                  ▶
                </button>
              </div>
              <div className="trial-content">
                <span className="trial-category">{trial.category || 'AI Basics'}</span>
                <h3 className="trial-title">{trial.title}</h3>
                <p className="trial-desc">{trial.description}</p>
                <span className="trial-duration">⏱️ {trial.duration || '5 mins'}</span>
              </div>
            </div>
          ))}
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