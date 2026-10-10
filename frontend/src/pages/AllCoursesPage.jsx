// src/pages/AllCoursesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './AllCoursesPage.css';

export default function AllCoursesPage({ user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const navigate = useNavigate();

  // Fetch courses with pagination and search
  const fetchCourses = useCallback(async (page = 1, search = '', category = 'All') => {
    try {
      setLoading(true);
      const data = await api.getAllCoursesPaginated(page, 12, search, category);
      setCourses(data.courses || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false
      });

      // Extract unique categories
      if (data.courses) {
        const uniqueCategories = ['All', ...new Set(data.courses.map(c => c.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses(1, '', 'All');
  }, [fetchCourses]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses(1, searchTerm, selectedCategory);
  };

  // Handle category filter
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchCourses(1, searchTerm, category);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchCourses(newPage, searchTerm, selectedCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle enroll
  const handleEnroll = async (course) => {
    const isAlreadyEnrolled = user?.enrolledCourses?.some(c =>
      (c.courseId?._id || c.courseId)?.toString() === course._id.toString()
    );

    if (isAlreadyEnrolled) {
      navigate(`/course/${course._id}`);
      return;
    }

    // Always navigate to the Dedicated Sales Page funnel for all non-enrolled courses (Free & Paid)
    navigate(`/sale/${course._id}`);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    fetchCourses(1, '', selectedCategory);
  };

  return (
    <div className="all-courses-page">
      {/* Navbar */}
      <header className="navbar navbar-scrolled">
        <div className="container nav-container">
          <Link to="/" className="navbar-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="WideTech Logo" style={{ width: '38px', height: '32px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className="brand-name" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>WIDETECH</span>
              <span className="brand-tagline" style={{ fontSize: '0.68rem', letterSpacing: '1.2px', opacity: 0.8 }}>ACADEMY</span>
            </div>
          </Link>

          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            {user && <Link to="/dashboard" className="nav-link">Dashboard</Link>}
            <a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer" className="nav-link instagram-link">
              Instagram
            </a>
            {user ? (
              <button onClick={onLogout} className="btn btn-secondary btn-sm">👋 Sign Out</button>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">🚀 Join Free</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="all-courses-main">
        <div className="container">
          {/* Page Header */}
          <div className="all-courses-header">
            <h1>All Courses</h1>
            <p>Discover our complete library of AI learning courses</p>
          </div>

          {/* Search & Filter Section */}
          <div className="all-courses-toolbar">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button type="button" className="clear-search" onClick={clearSearch}>
                    ✕
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
              </div>
            </form>

            <div className="filter-tabs">
              {categories.map(category => (
                <button
                  key={category}
                  className={`filter-tab ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="results-count">
            {!loading && (
              <span>
                Showing {courses.length} of {pagination.totalItems} courses
              </span>
            )}
          </div>

          {/* Course Grid */}
          {loading ? (
            <div className="loading-spinner-container">
              <div className="loading-spinner"></div>
              <p>Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">📚</span>
              <h3>No courses found</h3>
              <p>Try adjusting your search or filter criteria</p>
              <button onClick={clearSearch} className="btn btn-secondary">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="course-grid">
                {courses.map(course => (
                  <div key={course._id} className="course-card">
                    <div className="card-img">
                      <img
                        src={course.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'}
                        alt={course.title}
                        loading="lazy"
                      />
                      {course.category && (
                        <span className="card-tag">{course.category}</span>
                      )}
                      {course.isPopular && (
                        <span className="card-badge popular">⭐ Popular</span>
                      )}
                    </div>
                    <div className="course-card-content">
                      <h3 className="card-title">{course.title}</h3>
                      <p className="card-desc">{course.description}</p>
                      <div className="card-languages">
                        {course.languages?.slice(0, 3).map(lang => (
                          <span key={lang} className="language-pill">🌐 {lang}</span>
                        ))}
                      </div>
                      <div className="card-meta">
                        <div className="card-price">
                          {course.discountedPrice && course.discountedPrice < course.price ? (
                            <span>
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.35rem' }}>
                                ₹{course.price}
                              </span>
                              ₹{course.discountedPrice}
                            </span>
                          ) : (
                            <span>{course.isFree || course.price === 0 ? 'Free' : `₹${course.price}`}</span>
                          )}
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEnroll(course)}
                        >
                          {user?.enrolledCourses?.some(c => (c.courseId?._id || c.courseId)?.toString() === course._id.toString())
                            ? '📖 Continue'
                            : (course.isFree || course.price === 0 ? '🎯 Enroll Free' : '🛒 Enroll Now')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>

                  <div className="pagination-pages">
                    {[...Array(pagination.totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Show first, last, current, and neighbors
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        Math.abs(pageNum - pagination.currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            className={`page-number ${pagination.currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === 2 && pagination.currentPage > 3 ||
                        pageNum === pagination.totalPages - 1 && pagination.currentPage < pagination.totalPages - 2
                      ) {
                        return <span key={pageNum} className="page-ellipsis">…</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>WIDETECH</h3>
              <p>
                Making AI education accessible to everyone — from kids to seniors,
                beginners to professionals.
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                Directed by @widetechai
              </p>
            </div>
            <div className="footer-links">
              <h4>Learn</h4>
              <ul>
                <li><Link to="/#courses">Courses</Link></li>
                <li><Link to="/#events">Workshops</Link></li>
                <li><Link to="/#trials">Free Tutorials</Link></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><Link to="/#about">About</Link></li>
                <li><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><Link to="/auth">Login</Link></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Connect</h4>
              <ul>
                <li><a href="mailto:hello@widetech.in">Email Us</a></li>
                <li><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            © {new Date().getFullYear()} WIDETECH Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}