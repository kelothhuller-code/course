// src/pages/AllCoursesPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { SkeletonGrid } from '../components/Skeleton';
import SiteHeader from '../components/SiteHeader';
import Icon from '../components/Icon';
import { usePageMeta } from '../components/Seo';
import CourseSalesCard from '../components/CourseSalesCard';
import Footer from './Landing/Footer';
import './AllCoursesPage.css';
import './Catalog/catalog.css';

export default function AllCoursesPage({ user, onLogout }) {
  const PAGE_SIZE = 12;
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [params, setParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(() => params.get('category') || 'All');
  const [adminCategories, setAdminCategories] = useState([]);

  usePageMeta({
    title: selectedCategory !== 'All' ? `${selectedCategory} courses` : 'All courses',
    description: 'Browse practical, self-paced online courses with instant access, lifetime validity and secure checkout. Prices include GST.',
    path: '/all-courses',
  });

  // Category order and names are managed in the admin panel (Categories → Courses)
  useEffect(() => {
    let alive = true;
    api.getCategories('course')
      .then((d) => alive && setAdminCategories(Array.isArray(d?.categories) ? d.categories.map((c) => c.name) : []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);
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
    () => {
      const used = new Set(allCourses.map(c => c.category).filter(Boolean));
      const ordered = adminCategories.filter(n => used.has(n));
      return ['All', ...ordered, ...[...used].filter(n => !ordered.includes(n))];
    },
    [allCourses, adminCategories]
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
    const next = new URLSearchParams(params);
    if (category && category !== 'All') next.set('category', category); else next.delete('category');
    setParams(next, { replace: true });
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
      <a href="#main-content" className="skip-link">Skip to content</a>
      <SiteHeader user={user} onLogout={onLogout} />

      <section className="cat-hero all-courses-hero">
        <div className="container">
          <nav aria-label="Breadcrumb" className="cat-crumbs"><Link to="/">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">Courses</span></nav>
          <p className="wt-eyebrow">Courses</p>
          <h1 className="wt-h1">Learn something practical</h1>
          <p className="wt-lead">Self-paced courses with instant access after a secure Razorpay checkout. Prices include GST, lifetime access.</p>
        </div>
      </section>

      <main className="all-courses-main" id="main-content" tabIndex={-1}>
        <div className="container">
          {/* Search & Filter Section */}
          <div className="all-courses-toolbar">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-wrapper">
                <span className="search-icon"><Icon name="search" size={18} /></span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search courses..."
                  aria-label="Search courses"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button type="button" className="clear-search" onClick={clearSearch} aria-label="Clear search">
                    <Icon name="close" size={16} />
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
            <SkeletonGrid count={6} label="Loading courses…" />
          ) : loadError ? (
            <div className="no-results" role="alert">
              <span className="wt-icon-tile no-results-icon"><Icon name="info" size={24} /></span>
              <h3>Courses unavailable</h3>
              <p>{loadError}</p>
              <button onClick={() => window.location.reload()} className="btn btn-primary">Try again</button>
            </div>
          ) : courses.length === 0 ? (
            <div className="no-results">
              <span className="wt-icon-tile no-results-icon"><Icon name="book" size={24} /></span>
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
                    <Icon name="arrow-left" size={16} /> Previous
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
                    Next <Icon name="arrow-right" size={16} />
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