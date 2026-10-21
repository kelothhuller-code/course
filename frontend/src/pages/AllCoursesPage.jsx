// src/pages/AllCoursesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import CourseSalesCard from '../components/CourseSalesCard';
import Footer from './Landing/Footer';
import './AllCoursesPage.css';

export default function AllCoursesPage({ user, onLogout }) {
  const PAGE_SIZE = 12;
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);

  // One request for the whole catalogue, in the same order as the landing carousel
  // (featured → pinned → best-selling → newest) and with data-backed badges/ratings.
  // Falls back to the paginated list endpoint if the showcase endpoint is unavailable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let list;
        try {
          const data = await api.getCourseShowcase();
          list = data.courses || [];
        } catch {
          const data = await api.getAllCoursesPaginated(1, 50, '', 'All');
          list = data.courses || [];
        }
        if (!cancelled) setAllCourses(list);
      } catch (err) {
        console.error('Error fetching courses:', err);
        if (!cancelled) setLoadError('We could not load the courses right now. Please check your connection and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Categories come from the full catalogue (previously from the filtered page, so picking a
  // category made every other category tab disappear)
  const categories = useMemo(
    () => ['All', ...new Set(allCourses.map(c => c.category).filter(Boolean))],
    [allCourses]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allCourses.filter(c =>
      (selectedCategory === 'All' || c.category === selectedCategory) &&
      (!q || [c.title, c.description, c.category].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [allCourses, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const courses = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagination = {
    currentPage,
    totalPages,
    totalItems: filtered.length,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCategory('All');
    setPage(1);
  };

  return (
    <div className="all-courses-page">
      {/* Navbar */}
      <header className="navbar navbar-scrolled">
        <div className="container nav-container">
          <Link to="/" className="navbar-brand">
            <img src="/logo.svg" alt="WideTech Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            <span className="brand-name">WIDETECH</span>
          </Link>

          <nav className="nav-links">
            <Link to="/" className="nav-link nav-home-link">Home</Link>
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
            <p>Instant access after a secure Razorpay checkout · Prices include GST · Lifetime access</p>
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
                  aria-label="Search courses"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button type="button" className="clear-search" onClick={clearSearch}>
                    ✕
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-sm">
                  Search
                </button>
              </div>
            </form>

            {categories.length > 2 && (
            <div className="filter-tabs" role="group" aria-label="Filter by category">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  className={`filter-tab ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Results Count */}
          <div className="results-count">
            {!loading && !loadError && (
              <span aria-live="polite">
                Showing {courses.length} of {pagination.totalItems} course{pagination.totalItems === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Course Grid */}
          {loading ? (
            <LoadingSpinner />
          ) : loadError ? (
            <div className="no-results" role="alert">
              <span className="no-results-icon">⚠️</span>
              <h3>Courses unavailable</h3>
              <p>{loadError}</p>
              <button onClick={() => window.location.reload()} className="btn btn-primary">Try again</button>
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
              <ul className={`sales-card-grid${courses.length < 3 ? ' is-few' : ''}`}>
                {courses.map((course, index) => (
                  <li key={course._id}>
                    <CourseSalesCard course={course} user={user} source="all_courses" headingLevel={2} priority={index < 3} />
                  </li>
                ))}
              </ul>

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

      {/* Footer identical to landing and login pages */}
      <Footer />
    </div>
  );
}