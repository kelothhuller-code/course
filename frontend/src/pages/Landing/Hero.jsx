import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero({ user, handleEnroll, featuredCourse }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">🚀 AI LEARNING FOR AGE 10+</div>
            <h1 className="hero-title">
              Learn to Build with AI.
              <br />
              <span className="hero-highlight">Even If You've Never Coded Before.</span>
            </h1>
            <p className="hero-description">
              Learn how to use AI as your coding partner to create, customize and publish your first website — 
              step by step, without needing prior coding experience.
            </p>
            <div className="hero-ctas">
              {featuredCourse ? (
                <Link 
                  to={user ? '/dashboard' : '/auth'} 
                  className="btn btn-primary btn-lg"
                  onClick={(e) => {
                    if (user && featuredCourse) {
                      e.preventDefault();
                      handleEnroll(featuredCourse, 'course');
                    }
                  }}
                >
                  {featuredCourse.title} — {featuredCourse.isFree ? 'Free' : `₹${featuredCourse.discountedPrice || featuredCourse.price}`}
                </Link>
              ) : (
                <a href="#courses" className="btn btn-primary btn-lg">
                  Explore All Courses →
                </a>
              )}
              <a href="#trials" className="btn btn-secondary btn-lg">
                Watch Free Tutorial
              </a>
            </div>
            <div className="hero-trust">
              <span>✓ Beginner-friendly</span>
              <span>✓ Step-by-step</span>
              <span>✓ No prior coding required</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-card">
              <div className="visual-flow">
                <div className="flow-step">
                  <span className="flow-icon">💡</span>
                  <span className="flow-label">Idea</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-icon">🤖</span>
                  <span className="flow-label">AI</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-icon">💻</span>
                  <span className="flow-label">Code</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-icon">🌐</span>
                  <span className="flow-label">Website</span>
                </div>
              </div>
              <div className="visual-badge">From idea → live website</div>
              <div className="visual-preview">
                <div className="preview-browser">
                  <div className="browser-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="browser-content">
                    <div className="preview-site">
                      <div className="site-header">✨ My AI Website</div>
                      <div className="site-body">
                        <div className="site-line"></div>
                        <div className="site-line"></div>
                        <div className="site-line short"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}