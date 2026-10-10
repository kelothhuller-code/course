import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero({ user, handleEnroll, featuredCourse }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">🚀 AI EDUCATION • SOFTWARE PRODUCTS • BOT AUTOMATION</div>
            <h1 className="hero-title">
              Build & Automate with AI.
              <br />
              <span className="hero-highlight">Learn the Tech or Let Us Build It for You.</span>
            </h1>
            <p className="hero-description">
              Master cutting-edge AI prompts, coding workflows, and bot automations — or deploy WideTech's ready-to-run commercial software systems and bespoke app engineering.
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
                  Explore AI Courses →
                </a>
              )}
              <a href="#software" className="btn btn-secondary btn-lg">
                View Software & Bots
              </a>
            </div>
            <div className="hero-trust">
              <span>✓ Practical AI Masterclasses</span>
              <span>✓ Ready-to-Deploy Software</span>
              <span>✓ Custom Bot Engineering</span>
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