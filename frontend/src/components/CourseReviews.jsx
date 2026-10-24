import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './CourseReviews.css';

export default function CourseReviews({ courseId, user }) {
  const [stats, setStats] = useState({ totalReviews: 0, avgRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [headline, setHeadline] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.getCourseReviews(courseId);
      if (res.success) {
        setStats(res.stats);
        setReviews(res.reviews);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchReviews();
    }
  }, [courseId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('Please enter your review comment.');
      return;
    }
    try {
      setSubmitting(true);
      setMessage('');
      const res = await api.createCourseReview({
        courseId,
        rating,
        headline,
        comment
      });
      if (res.success) {
        setMessage('✅ Thank you! Your review has been posted.');
        setHeadline('');
        setComment('');
        setShowForm(false);
        fetchReviews();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (num) => {
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  };

  return (
    <div className="reviews-container">
      <div className="reviews-header">
        <div>
          <h3 className="reviews-title">
            Student Reviews & Ratings
          </h3>
          <p className="reviews-subtitle">
            Real feedback from verified enrolled students
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="reviews-btn-write"
          >
            {showForm ? 'Cancel Review' : '✍️ Write a Review'}
          </button>
        )}
      </div>

      {message && (
        <div style={{ padding: '0.8rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Review Form Modal/Section */}
      {showForm && (
        <form onSubmit={handleSubmitReview} style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.8rem 0', color: '#0f172a', fontSize: '1rem' }}>Leave Your Feedback</h4>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Rating</label>
            <div style={{ display: 'flex', gap: '0.4rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ fontSize: '1.5rem', color: star <= rating ? '#f59e0b' : '#cbd5e1' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Review Headline (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Life changing course! Clear explanation."
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>Detailed Review</label>
            <textarea
              rows="3"
              placeholder="Share what you liked most about this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.6rem 1.4rem',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {/* Aggregate Stats Summary — only shown once real reviews exist (no fake default rating) */}
      {stats.totalReviews > 0 && (
      <div className="reviews-stats-card">
        <div className="reviews-score-box">
          <div className="reviews-score-num">
            {stats.avgRating}
          </div>
          <div className="reviews-score-stars">
            {renderStars(Math.round(stats.avgRating || 0))}
          </div>
          <div className="reviews-score-count">
            {stats.totalReviews} Verified Review{stats.totalReviews === 1 ? '' : 's'}
          </div>
        </div>

        <div className="reviews-bars-list">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star] || 0;
            const pct = Math.round((count / stats.totalReviews) * 100);
            return (
              <div key={star} className="reviews-bar-row">
                <span className="reviews-bar-label">{star} ★</span>
                <div className="reviews-bar-track">
                  <div className="reviews-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="reviews-bar-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Review Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
          No reviews yet. Be the first student to review this course!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((r) => (
            <div key={r._id} style={{
              padding: '1.2rem',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary))',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    {r.userId?.name ? r.userId.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                      {r.userId?.name || 'Verified Student'}
                    </div>
                    {r.isVerifiedPurchase && (
                      <span style={{ fontSize: '0.73rem', background: '#ecfdf5', color: '#047857', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                        ✓ Verified Student
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: '#f59e0b', fontSize: '1rem' }}>
                  {renderStars(r.rating)}
                </div>
              </div>

              {r.headline && (
                <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0.4rem 0 0.2rem 0' }}>
                  {r.headline}
                </h5>
              )}
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {r.comment}
              </p>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
