import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CourseViewer({ onRefreshUser }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLanguage, setActiveLanguage] = useState('');
  const [activeChapter, setActiveChapter] = useState(null);
  const [completedChapters, setCompletedChapters] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Fetch full secure details including videoUrls
        const courseData = await api.getCourseLearn(id);
        setCourse(courseData);
        
        // Fetch user progress from profile
        const profile = await api.getProfile();
        const enrollment = profile.enrolledCourses?.find(c => c.courseId?._id === id || c.courseId === id);
        
        if (enrollment) {
          setCompletedChapters(enrollment.completedChapters || []);
          setProgressPercent(enrollment.progress || 0);
        }

        // Set default language and chapter
        if (courseData.languages && courseData.languages.length > 0) {
          const defaultLang = courseData.languages[0];
          setActiveLanguage(defaultLang);
          
          const langContent = courseData.content?.find(c => c.language === defaultLang);
          if (langContent && langContent.chapters?.length > 0) {
            setActiveChapter(langContent.chapters[0]);
          }
        }
      } catch (err) {
        console.error('Error opening classroom:', err);
        alert('You do not have access to this course. Redirecting to dashboard...');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, navigate]);

  // Handle switching language
  const handleLanguageChange = (lang) => {
    setActiveLanguage(lang);
    const langContent = course?.content?.find(c => c.language === lang);
    if (langContent && langContent.chapters?.length > 0) {
      setActiveChapter(langContent.chapters[0]);
    }
  };

  // Toggle chapter completion checkmark
  const handleToggleComplete = async (chapterTitle, e) => {
    e.stopPropagation(); // prevent resetting the active video player
    if (isUpdatingProgress) return;
    
    setIsUpdatingProgress(true);
    const isCompletedNow = !completedChapters.includes(chapterTitle);

    try {
      const result = await api.updateProgress(id, chapterTitle, activeLanguage, isCompletedNow);
      setCompletedChapters(result.completedChapters);
      setProgressPercent(result.progress);
      
      if (result.completed) {
        alert('🎉 Congratulations! You completed this course at 100%. Your certificate is ready on the Dashboard!');
      }
      
      if (onRefreshUser) onRefreshUser();
    } catch (err) {
      alert('Could not update progress: ' + err.message);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>ENTERING CLASSROOM...</div>
      </div>
    );
  }

  const currentLanguageContent = course?.content?.find(c => c.language === activeLanguage);
  const chaptersList = currentLanguageContent?.chapters || [];

  return (
    <div className="container" style={{ flexGrow: 1 }}>
      <div className="course-viewer-layout">
        {/* Left Side: Video Player & Details */}
        <section className="player-section">
          {activeChapter ? (
            <>
              <div className="video-wrapper">
                <iframe
                  src={activeChapter.videoUrl}
                  title={activeChapter.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="learn-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h1 className="learn-title">{activeChapter.title}</h1>
                  <span className="badge" style={{ margin: 0 }}>{activeChapter.duration || 'Video'}</span>
                </div>
                <p className="learn-desc">{activeChapter.description || 'No description available.'}</p>

                {/* Drive / Materials Link */}
                {activeChapter.driveLink && (
                  <a
                    href={activeChapter.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem', display: 'inline-flex', fontSize: '1rem', gap: '0.5rem', border: '2px solid var(--secondary)', padding: '0.85rem 1.5rem' }}
                  >
                    📂 Open Study Materials & Resources
                  </a>
                )}
                
                <div className="glass-card" style={{ marginTop: '2rem', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>STUDYING COURSE</h4>
                  <h3 style={{ fontSize: '1.25rem' }}>{course?.title}</h3>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <h3>No lessons loaded</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Please select a chapter from the list to start studying.</p>
            </div>
          )}
        </section>

        {/* Right Side: Chapter List Sidebar */}
        <aside className="sidebar-chapters">
          {/* Language Selector */}
          <div className="lang-selector-container">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>LANGUAGE VERSION</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              {course?.languages?.map(lang => (
                <button
                  key={lang}
                  className={`btn btn-sm ${activeLanguage === lang ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageChange(lang)}
                  style={{ flexGrow: 1 }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Course Progress</span>
              <span className="progress-percentage">{progressPercent}%</span>
            </div>
            <div className="progress-bar-container" style={{ margin: 0 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <h3 className="sidebar-title">Lessons Outline</h3>

          <div className="chapter-list">
            {chaptersList.map((ch, idx) => {
              const isCompleted = completedChapters.includes(ch.title);
              const isActive = activeChapter && activeChapter.title === ch.title;
              
              return (
                <div 
                  key={ch._id || idx}
                  className={`chapter-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveChapter(ch)}
                >
                  <div 
                    className={`chapter-checkbox-container ${isCompleted ? 'checked' : ''}`}
                    onClick={(e) => handleToggleComplete(ch.title, e)}
                  >
                    {isCompleted && '✓'}
                  </div>
                  <div className="chapter-info">
                    <div className="chapter-title-text" style={{ color: isActive ? 'var(--secondary)' : '#fff' }}>
                      {idx + 1}. {ch.title}
                    </div>
                    <div className="chapter-duration">⏱️ {ch.duration || 'Duration not set'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
