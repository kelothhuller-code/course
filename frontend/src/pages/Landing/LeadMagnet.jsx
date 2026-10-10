import React, { useState } from 'react';
import { api } from '../../api';

export default function LeadMagnet() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await api.submitLead(email.trim(), name.trim(), 'landing_page');
      setStatus('success');
      setMessage(res.message);
      setEmail('');
      setName('');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <section className="lead-magnet-section">
      <div className="lead-magnet-bg-glow" aria-hidden="true" />
      <div className="lead-magnet-container">
        <div className="lead-magnet-badge">🎁 Free Resource</div>
        <h2 className="lead-magnet-title">
          Get Our Free <span className="lead-magnet-highlight">AI Starter Toolkit</span>
        </h2>
        <p className="lead-magnet-desc">
          Get our curated AI Resource Guide — top tools, free prompts,
          and a clear learning roadmap delivered straight to your inbox. Zero cost, zero spam.
        </p>

        <div className="lead-magnet-perks">
          {['📋 AI Tools Cheat Sheet', '💡 Free Prompt Library', '🗺️ Free Learning Roadmap', '🎥 Bonus Lesson Videos'].map(p => (
            <span key={p} className="lead-magnet-perk">{p}</span>
          ))}
        </div>

        {status === 'success' ? (
          <div className="lead-success">
            <div className="lead-success-icon">🎉</div>
            <h3>You're on the list!</h3>
            <p>{message}</p>
          </div>
        ) : (
          <form className="lead-magnet-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="lead-magnet-input"
              placeholder="Your first name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              type="email"
              className="lead-magnet-input"
              placeholder="Your best email address *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="lead-magnet-btn"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending...' : '📬 Send Me the Free Toolkit'}
            </button>
            {status === 'error' && (
              <p className="lead-error">{message}</p>
            )}
            <p className="lead-privacy">🔒 No spam, ever. Unsubscribe anytime.</p>
          </form>
        )}
      </div>

      <style>{`
        .lead-magnet-section {
          position: relative;
          overflow: hidden;
          padding: 5rem 1.5rem;
          background: linear-gradient(160deg, #0a0f1e 0%, #070913 100%);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .lead-magnet-bg-glow {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 400px;
          background: radial-gradient(ellipse at center, rgba(108,71,255,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .lead-magnet-container {
          position: relative;
          max-width: 640px;
          margin: 0 auto;
          text-align: center;
        }
        .lead-magnet-badge {
          display: inline-block;
          padding: 0.35rem 1rem;
          background: rgba(108,71,255,0.15);
          border: 1px solid rgba(108,71,255,0.4);
          border-radius: 30px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #a78bfa;
          letter-spacing: 0.08em;
          margin-bottom: 1.25rem;
          text-transform: uppercase;
        }
        .lead-magnet-title {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 900;
          color: #fff;
          margin: 0 0 1rem;
          line-height: 1.25;
        }
        .lead-magnet-highlight {
          background: linear-gradient(135deg, #a78bfa, #6c47ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lead-magnet-desc {
          font-size: 1rem;
          color: #8892a4;
          line-height: 1.7;
          margin: 0 0 1.75rem;
        }
        .lead-magnet-perks {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.6rem;
          margin-bottom: 2rem;
        }
        .lead-magnet-perk {
          padding: 0.4rem 0.9rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          font-size: 0.82rem;
          color: #c4c9d8;
        }
        .lead-magnet-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-width: 440px;
          margin: 0 auto;
        }
        .lead-magnet-input {
          padding: 0.8rem 1.1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #e8eaf0;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .lead-magnet-input::placeholder { color: #5a6476; }
        .lead-magnet-input:focus { border-color: rgba(108,71,255,0.5); }
        .lead-magnet-btn {
          padding: 0.9rem 1.5rem;
          background: linear-gradient(135deg, #6c47ff, #9333ea);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 4px 20px rgba(108,71,255,0.3);
        }
        .lead-magnet-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(108,71,255,0.45); }
        .lead-magnet-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .lead-privacy { font-size: 0.76rem; color: #5a6476; margin: 0.25rem 0 0; }
        .lead-error { font-size: 0.82rem; color: #ef4444; margin: 0; }
        .lead-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 16px;
          max-width: 400px;
          margin: 0 auto;
        }
        .lead-success-icon { font-size: 2.5rem; }
        .lead-success h3 { color: #10b981; margin: 0; font-size: 1.2rem; }
        .lead-success p { color: #8892a4; margin: 0; font-size: 0.9rem; }
      `}</style>
    </section>
  );
}
