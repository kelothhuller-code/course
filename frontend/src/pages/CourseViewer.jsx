import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMediaUrl, FALLBACK_COURSE_THUMBNAIL } from '../utils/media';

export default function CourseViewer({ user, onRefreshUser }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLanguage, setActiveLanguage] = useState('');
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [courseProgress, setCourseProgress] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [totalCommentPages, setTotalCommentPages] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [videoProgressTimer, setVideoProgressTimer] = useState(null);
  const [commentTab, setCommentTab] = useState('public'); // 'public' or 'my'
  const [activeViewerTab, setActiveViewerTab] = useState('chapters'); // 'chapters' | 'discussion' | 'followup' | 'resources'
  const [userComments, setUserComments] = useState([]);
  const iframeRef = useRef(null);
  const navigate = useNavigate();

  // Load course and progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const courseData = await api.getCourseLearn(id);
        console.log('Full Course Data:', courseData);
        console.log('Content array:', courseData?.content);
        setCourse(courseData);
        
        let defaultLang = courseData.languages?.[0] || '';
        console.log('Default Language:', defaultLang);
        
        let progressData = null;
        try {
          progressData = await api.getCourseProgress(id);
          console.log('Progress Data:', progressData);
          
          if (progressData) {
            progressData.completedLessons = Array.isArray(progressData.completedLessons) 
              ? progressData.completedLessons 
              : [];
            progressData.completedChapters = Array.isArray(progressData.completedChapters)
              ? progressData.completedChapters
              : [];
          }
          
          setCourseProgress(progressData);
          setProgressPercent(progressData?.progress || 0);
          
          if (progressData?.activeLanguage) {
            defaultLang = progressData.activeLanguage;
          }
        } catch (err) {
          console.error('Error fetching progress:', err);
          setCourseProgress({
            completedLessons: [],
            completedChapters: [],
            progress: 0
          });
        }
        
        setActiveLanguage(defaultLang);
        
        const langContent = courseData.content?.find(c => c.language === defaultLang);
        console.log('Language Content:', langContent);
        console.log('Chapters (which are actually lessons):', langContent?.chapters);
        
        if (langContent?.chapters?.length > 0) {
          let targetLesson = null;
          
          if (progressData?.lastWatchedLesson) {
            const lessonId = progressData.lastWatchedLesson.id;
            console.log('Last watched lesson ID:', lessonId);
            
            for (const chapter of langContent.chapters) {
              if (chapter._id === lessonId) {
                targetLesson = chapter;
                console.log('Found last watched lesson:', chapter);
                break;
              }
            }
          }
          
          if (!targetLesson) {
            targetLesson = langContent.chapters[0];
            console.log('Using first lesson:', targetLesson);
          }
          
          console.log('Setting active lesson:', targetLesson);
          setActiveChapter(targetLesson);
          setActiveLesson(targetLesson);
        } else {
          console.log('No chapters found for language:', defaultLang);
        }
        
      } catch (err) {
        console.error('Error opening classroom:', err);
        alert('You do not have access to this course. Redirecting to dashboard...');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const loadComments = useCallback(async (page = 1) => {
    if (!activeLesson) return;
    setCommentsLoading(true);
    try {
      const data = await api.getComments(id, activeLesson._id, page);
      
      // Process comments to ensure replies are properly structured
      const processedComments = (data.comments || []).map(comment => ({
        ...comment,
        replies: Array.isArray(comment.replies) ? comment.replies : [],
        replyCount: comment.replyCount || (Array.isArray(comment.replies) ? comment.replies.length : 0)
      }));
      
      if (page === 1) {
        setComments(processedComments);
      } else {
        setComments(prev => [...prev, ...processedComments]);
      }
      setTotalCommentPages(data.pagination?.pages || 1);
      setCommentPage(page);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [activeLesson, id]);

  const loadUserComments = useCallback(async () => {
    if (!activeLesson || !user) return;
    try {
      const data = await api.getComments(id, activeLesson._id, 1);
      const allComments = data.comments || [];
      
      const userCommentsList = allComments.filter(comment => 
        comment.userId?._id === user.id
      );
      
      const userCommentIds = userCommentsList.map(c => c._id);
      const repliesToUser = allComments.filter(comment => 
        comment.parentCommentId && userCommentIds.includes(comment.parentCommentId)
      );
      
      const allUserRelated = [...userCommentsList, ...repliesToUser];
      allUserRelated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const processedUserComments = allUserRelated.map(comment => ({
        ...comment,
        replies: Array.isArray(comment.replies) ? comment.replies : [],
        replyCount: comment.replyCount || (Array.isArray(comment.replies) ? comment.replies.length : 0)
      }));
      
      setUserComments(processedUserComments);
    } catch (err) {
      console.error('Error loading user comments:', err);
    }
  }, [activeLesson, id, user]);

  // Load comments when lesson changes
  useEffect(() => {
    if (activeLesson && course) {
      loadComments(1);
      loadUserComments();
    }
  }, [activeLesson, course, loadComments, loadUserComments]);

  // Handle manual lesson completion
  const handleToggleComplete = async () => {
    if (!activeLesson || !course) return;
    try {
      const isCurrentlyCompleted = isLessonCompleted(activeLesson._id);
      const targetLessonId = activeLesson._id;

      const res = await api.updateVideoProgress(id, targetLessonId, {
        completed: !isCurrentlyCompleted,
        videoProgressPercent: !isCurrentlyCompleted ? 100 : 0,
        chapterId: activeChapter?._id
      });

      // Refresh progress from server
      const progress = await api.getCourseProgress(id);
      if (progress) {
        progress.completedLessons = Array.isArray(progress.completedLessons)
          ? progress.completedLessons
          : [];
        setCourseProgress(progress);
        setProgressPercent(progress?.progress || 0);
      }

      if (onRefreshUser) onRefreshUser();

      if (!isCurrentlyCompleted && (progress?.progress === 100 || res?.progress === 100)) {
        alert('🎉 Congratulations! You have completed all lessons in this course! Your certificate has been issued.');
      }
    } catch (err) {
      console.error('Error toggling lesson completion:', err);
      alert('Failed to update lesson completion: ' + (err.message || 'Error'));
    }
  };

  // Handle language change
  const handleLanguageChange = (lang) => {
    console.log('Changing language to:', lang);
    setActiveLanguage(lang);
    const langContent = course?.content?.find(c => c.language === lang);
    console.log('Language content for', lang, ':', langContent);
    
    if (langContent?.chapters?.length > 0) {
      const firstLesson = langContent.chapters[0];
      console.log('First lesson:', firstLesson);
      setActiveChapter(firstLesson);
      setActiveLesson(firstLesson);
    } else {
      console.log('No chapters found for language:', lang);
      setActiveChapter(null);
      setActiveLesson(null);
    }
  };

  // Handle lesson selection
  const handleLessonSelect = (lesson) => {
    console.log('Lesson selected:', lesson);
    
    if (!lesson) {
      console.log('No lesson provided');
      return;
    }
    
    setActiveChapter(lesson);
    setActiveLesson(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle video progress tracking
  const handleVideoProgress = useCallback(async (data) => {
    if (!activeLesson || !course) return;
    
    if (videoProgressTimer) {
      clearTimeout(videoProgressTimer);
    }
    
    const timer = setTimeout(async () => {
      try {
        await api.updateVideoProgress(id, activeLesson._id, {
          videoProgressSeconds: data.currentTime || 0,
          videoDurationSeconds: data.duration || 0,
          videoProgressPercent: data.percent || 0,
          chapterId: activeChapter?._id
        });
        
        const progress = await api.getCourseProgress(id);
        if (progress) {
          progress.completedLessons = Array.isArray(progress.completedLessons) 
            ? progress.completedLessons 
            : [];
          progress.completedChapters = Array.isArray(progress.completedChapters)
            ? progress.completedChapters
            : [];
        }
        setCourseProgress(progress);
        setProgressPercent(progress?.progress || 0);
        setCompletedChapters(progress?.completedChapters || []);
        
        if (onRefreshUser) onRefreshUser();
      } catch (err) {
        console.error('Error updating video progress:', err);
      }
    }, 5000);
    
    setVideoProgressTimer(timer);
  }, [activeLesson, activeChapter, course, id, onRefreshUser]);

  // Handle material open tracking
  const handleMaterialOpen = useCallback(async () => {
    if (!activeLesson || !course) return;
    try {
      await api.trackMaterialOpen(id, activeLesson._id);
    } catch (err) {
      console.error('Error tracking material open:', err);
    }
  }, [activeLesson, course, id]);

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      const response = await api.createComment(id, activeLesson._id, {
        text: newComment,
        isQuestion: false
      });
      console.log('Comment created:', response);
      setNewComment('');
      await loadComments(1);
      await loadUserComments();
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !replyingTo) return;
    
    try {
      const response = await api.createComment(id, activeLesson._id, {
        text: replyText,
        parentCommentId: replyingTo
      });
      console.log('Reply created:', response);
      setReplyText('');
      setReplyingTo(null);
      await loadComments(1);
      await loadUserComments();
    } catch (err) {
      alert('Failed to post reply: ' + err.message);
    }
  };

  // Handle comment like
  const handleLikeComment = async (commentId) => {
    try {
      await api.toggleLike(commentId);
      await loadComments(commentPage);
      await loadUserComments();
    } catch (err) {
      alert('Failed to like comment: ' + err.message);
    }
  };

  // Handle comment delete
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      await loadComments(1);
      await loadUserComments();
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onRefreshUser) onRefreshUser();
    navigate('/');
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (videoProgressTimer) {
        clearTimeout(videoProgressTimer);
      }
    };
  }, [videoProgressTimer]);

  if (loading) {
    return (
      <>
        <NavHeader user={user} onLogout={handleLogout} />
        <LoadingSpinner />
      </>
    );
  }

  const currentLanguageContent = course?.content?.find(c => c.language === activeLanguage);
  const lessonsList = currentLanguageContent?.chapters || [];

  const isLessonCompleted = (lessonId) => {
    if (!courseProgress?.completedLessons) return false;
    if (!Array.isArray(courseProgress.completedLessons)) return false;
    return courseProgress.completedLessons.includes(lessonId);
  };

  // Helper to render a single comment with its replies
  const renderCommentWithReplies = (comment, isReply = false) => {
    const commentReplies = Array.isArray(comment.replies) ? comment.replies : [];
    
    return (
      <div key={comment._id} className="comment-item" style={{
        marginBottom: isReply ? '0.5rem' : '1rem',
        padding: isReply ? '0.75rem' : '1rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        backgroundColor: comment.isPinned ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
        marginLeft: isReply ? '1.5rem' : '0',
        borderLeft: isReply ? '2px solid var(--border)' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <strong>{comment.userId?.name || 'Unknown User'}</strong>
              {comment.isPinned && <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>📌 Pinned</span>}
              {comment.isQuestion && <span style={{ color: 'var(--secondary)', fontSize: '0.7rem' }}>❓ Question</span>}
              {comment.isResolved && <span style={{ color: '#10b981', fontSize: '0.7rem' }}>✅ Resolved</span>}
            </div>
            <p style={{ margin: '0.25rem 0', lineHeight: '1.6' }}>{comment.text}</p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
              <button 
                onClick={() => handleLikeComment(comment._id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}
              >
                👍 {comment.likeCount || 0}
              </button>
              {!isReply && (
                <button 
                  onClick={() => setReplyingTo(comment._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                >
                  Reply
                </button>
              )}
              {(comment.userId?._id === user?.id) && (
                <button 
                  onClick={() => handleDeleteComment(comment._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          {!isReply && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
              {commentReplies.length} replies
            </span>
          )}
        </div>

        {/* Render replies */}
        {!isReply && commentReplies.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            {commentReplies.map(reply => renderCommentWithReplies(reply, true))}
          </div>
        )}
      </div>
    );
  };

  const currentLessonIdx = lessonsList.findIndex(l => (l._id || l) === (activeLesson?._id || activeLesson));
  const prevLesson = currentLessonIdx > 0 ? lessonsList[currentLessonIdx - 1] : null;
  const nextLesson = currentLessonIdx >= 0 && currentLessonIdx < lessonsList.length - 1 ? lessonsList[currentLessonIdx + 1] : null;
  const isAdmin = user?.role === 'admin';
  const isNextLocked = !isAdmin && nextLesson && !isLessonCompleted(activeLesson?._id);

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="landing-page" style={{ paddingTop: '0.5rem' }}>
        <div className="container" style={{ flexGrow: 1, paddingBottom: '2.5rem' }}>
          {/* Breadcrumb Navigation - Clean and non-redundant */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap'
          }}>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <Link to="/all-courses" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Courses</Link>
            <span>›</span>
            <span style={{ 
              color: 'var(--text-primary)', 
              fontWeight: '600',
              maxWidth: '320px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {course?.title || 'Course'}
            </span>
          </div>

          <div className="course-viewer-layout">
            <section className="player-section">
              {activeLesson ? (
                <>
                  {/* Cinema Video Player */}
                  <div className="video-wrapper">
                    {activeLesson.videoUrl ? (
                      <iframe
                        ref={iframeRef}
                        src={activeLesson.videoUrl}
                        title={activeLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#fff',
                        background: '#1a1a1a'
                      }}>
                        <p>No video URL available for this lesson</p>
                      </div>
                    )}
                  </div>

                  {/* Lesson Meta Header */}
                  <div className="learn-details" style={{ marginTop: '0.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: '0.75rem', 
                      flexWrap: 'wrap', 
                      gap: '0.75rem' 
                    }}>
                      <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span className="badge" style={{ 
                            background: 'var(--primary)',
                            color: '#fff',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '40px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            ⏱️ {activeLesson.duration ? (activeLesson.duration.toLowerCase().includes('m') ? activeLesson.duration : `${activeLesson.duration} mins`) : 'Video Lesson'}
                          </span>
                          {currentLessonIdx >= 0 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Lesson {currentLessonIdx + 1} of {lessonsList.length}
                            </span>
                          )}
                        </div>
                        <h1 className="learn-title" style={{ 
                          fontSize: 'clamp(1.25rem, 2.5vw, 1.65rem)', 
                          fontWeight: '700', 
                          margin: 0,
                          lineHeight: '1.3',
                          wordBreak: 'break-word'
                        }}>
                          {activeLesson.title}
                        </h1>
                      </div>

                      {/* Action Bar: Prev, Mark Complete, Next */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {prevLesson && (
                          <button
                            type="button"
                            onClick={() => handleLessonSelect(prevLesson)}
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              fontSize: '0.8rem', 
                              padding: '0.4rem 0.75rem', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem' 
                            }}
                            title="Previous lesson"
                          >
                            ← Prev
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleToggleComplete}
                          className={`btn btn-sm ${isLessonCompleted(activeLesson._id) ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            fontSize: '0.82rem',
                            padding: '0.4rem 0.95rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            borderColor: isLessonCompleted(activeLesson._id) ? '#10b981' : undefined,
                            color: isLessonCompleted(activeLesson._id) ? '#10b981' : undefined,
                            fontWeight: '600'
                          }}
                        >
                          {isLessonCompleted(activeLesson._id) ? '✓ Completed' : 'Mark as Complete'}
                        </button>
                        {nextLesson && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isNextLocked) {
                                alert('🔒 Next Lesson Locked: Please finish and mark the current lesson as complete to unlock.');
                                return;
                              }
                              handleLessonSelect(nextLesson);
                            }}
                            className={`btn btn-sm ${isNextLocked ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ 
                              fontSize: '0.8rem', 
                              padding: '0.4rem 0.75rem', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem',
                              opacity: isNextLocked ? 0.75 : 1
                            }}
                            title={isNextLocked ? 'Complete current lesson to unlock next' : 'Next lesson'}
                          >
                            Next → {isNextLocked ? '🔒' : ''}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="learn-desc" style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.98rem', 
                      lineHeight: '1.7',
                      margin: '0.5rem 0 1rem 0'
                    }}>
                      {activeLesson.description || 'No description provided for this lesson.'}
                    </p>

                    {/* Navigation Bar under Course Description */}
                    <div className="viewer-tabs-nav">
                      <button
                        type="button"
                        onClick={() => setActiveViewerTab('chapters')}
                        className={`viewer-tab-btn ${activeViewerTab === 'chapters' ? 'active' : ''}`}
                      >
                        <span className="tab-icon">📑</span>
                        <span className="tab-title">Curriculum</span>
                        <span className="tab-pill-badge">{lessonsList.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveViewerTab('discussion')}
                        className={`viewer-tab-btn ${activeViewerTab === 'discussion' ? 'active' : ''}`}
                      >
                        <span className="tab-icon">💬</span>
                        <span className="tab-title">Discussion & Q&A</span>
                        {comments.length > 0 && <span className="tab-pill-badge">{comments.length}</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveViewerTab('followup')}
                        className={`viewer-tab-btn ${activeViewerTab === 'followup' ? 'active' : ''}`}
                      >
                        <span className="tab-icon">🚀</span>
                        <span className="tab-title">Follow-up Paths</span>
                        {course?.continuationCourses?.length > 0 && (
                          <span className="tab-pill-badge highlight">{course.continuationCourses.length}</span>
                        )}
                      </button>

                      {(activeLesson.driveLink || (activeLesson.materials && activeLesson.materials.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => setActiveViewerTab('resources')}
                          className={`viewer-tab-btn ${activeViewerTab === 'resources' ? 'active' : ''}`}
                        >
                          <span className="tab-icon">📂</span>
                          <span className="tab-title">Study Materials</span>
                          {activeLesson.materials?.length > 0 && (
                            <span className="tab-pill-badge">{activeLesson.materials.length}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Tab 1: Chapters & Curriculum */}
                    {activeViewerTab === 'chapters' && (
                      <div className="viewer-tab-pane" style={{ animation: 'fadeIn 0.2s ease' }}>
                        {/* Course Progress & Language Header Card */}
                        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            {/* Course Progress */}
                            <div style={{ flex: '1 1 260px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Course Completion</span>
                                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{progressPercent}%</span>
                              </div>
                              <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${progressPercent}%`, 
                                  height: '100%', 
                                  background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', 
                                  borderRadius: '6px', 
                                  transition: 'width 0.4s ease' 
                                }}></div>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                {courseProgress?.completedLessons?.length || 0} of {lessonsList.length} lessons finished
                                {progressPercent === 100 && (
                                  <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: '600' }}>
                                    🏆 All Lessons Completed!
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Language Version Selector */}
                            {course?.languages && course.languages.length > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  Language:
                                </span>
                                {course.languages.map(lang => (
                                  <button
                                    key={lang}
                                    type="button"
                                    className={`btn btn-sm ${activeLanguage === lang ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => handleLanguageChange(lang)}
                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '20px' }}
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Lesson List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {lessonsList && lessonsList.length > 0 ? (
                            lessonsList.map((lesson, idx) => {
                              const isActive = activeLesson && activeLesson._id === lesson._id;
                              const isCompleted = isLessonCompleted(lesson._id);
                              // Chapter Drip Gating: Lesson 0 is unlocked; lesson N requires lesson N-1 completed
                              const isLocked = !isAdmin && idx > 0 && !isLessonCompleted(lessonsList[idx - 1]._id);

                              return (
                                <div
                                  key={lesson._id || idx}
                                  className={`lesson-card-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                                  onClick={() => {
                                    if (isLocked) {
                                      alert('🔒 Lesson Locked: Please finish and mark the previous lesson as complete to unlock this chapter.');
                                      return;
                                    }
                                    handleLessonSelect(lesson);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.9rem 1.15rem',
                                    borderRadius: '12px',
                                    border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                    background: isActive 
                                      ? 'rgba(99, 102, 241, 0.08)' 
                                      : (isLocked ? 'rgba(15, 23, 42, 0.02)' : 'var(--bg-card)'),
                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                    opacity: isLocked ? 0.6 : 1,
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 240px', minWidth: 0 }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      flexShrink: 0,
                                      background: isCompleted ? '#10b981' : (isActive ? 'var(--primary)' : 'var(--border-color)'),
                                      color: (isCompleted || isActive) ? '#fff' : 'var(--text-muted)'
                                    }}>
                                      {isCompleted ? '✓' : (isLocked ? '🔒' : (idx + 1))}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{
                                        fontSize: '0.95rem',
                                        fontWeight: isActive ? '700' : '500',
                                        color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.4'
                                      }}>
                                        {lesson.title || `Lesson ${idx + 1}`}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>⏱️ {lesson.duration || 'Video'}</span>
                                        {isLocked && <span style={{ color: '#ef4444' }}>• Prerequisite required</span>}
                                        {isActive && <span style={{ color: 'var(--primary)', fontWeight: '600' }}>• Currently Watching</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                    {isCompleted && (
                                      <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: '#10b981',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '20px'
                                      }}>
                                        ✓ Completed
                                      </span>
                                    )}
                                    {isActive && (
                                      <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--primary)',
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '20px'
                                      }}>
                                        ▶ Playing
                                      </span>
                                    )}
                                    {!isActive && !isLocked && !isCompleted && (
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Play →
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No lessons found for this language version.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Discussion & Q&A */}
                    {activeViewerTab === 'discussion' && (
                      <div className="viewer-tab-pane" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '1rem',
                          borderBottom: '1px solid var(--border-color)',
                          paddingBottom: '0.75rem',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>💬 Questions & Discussion</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Discuss concepts and ask instructor questions for this lesson.
                            </p>
                          </div>

                          {/* Sub Tabs: Public vs My */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setCommentTab('public')}
                              style={{
                                padding: '0.4rem 0.85rem',
                                background: commentTab === 'public' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                border: '1px solid',
                                borderColor: commentTab === 'public' ? 'var(--primary)' : 'var(--border-color)',
                                borderRadius: '20px',
                                color: commentTab === 'public' ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: commentTab === 'public' ? '600' : '400',
                                fontSize: '0.85rem'
                              }}
                            >
                              Public Discussion
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentTab('my')}
                              style={{
                                padding: '0.4rem 0.85rem',
                                background: commentTab === 'my' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                border: '1px solid',
                                borderColor: commentTab === 'my' ? 'var(--primary)' : 'var(--border-color)',
                                borderRadius: '20px',
                                color: commentTab === 'my' ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: commentTab === 'my' ? '600' : '400',
                                fontSize: '0.85rem'
                              }}
                            >
                              My Questions & Replies
                            </button>
                          </div>
                        </div>

                        {/* Comment Form - In Public tab */}
                        {commentTab === 'public' && (
                          <form onSubmit={handleCommentSubmit} style={{ marginBottom: '1.5rem' }}>
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Ask a question or share your insights on this lesson..."
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '0.85rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-primary)',
                                minHeight: '80px',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem'
                              }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem' }}>
                              Post Question / Comment
                            </button>
                          </form>
                        )}

                        {/* Reply Form */}
                        {replyingTo && (
                          <div style={{ 
                            marginBottom: '1.5rem', 
                            padding: '1rem', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '12px',
                            backgroundColor: 'var(--background)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Replying to comment</span>
                              <button 
                                type="button"
                                onClick={() => setReplyingTo(null)} 
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                            <form onSubmit={handleReplySubmit}>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--background-white)',
                                  color: 'var(--text-primary)',
                                  minHeight: '60px',
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                  fontSize: '0.95rem'
                                }}
                              />
                              <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>
                                Post Reply
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Comment Threads */}
                        {commentTab === 'public' ? (
                          <>
                            {commentsLoading && commentPage === 1 ? (
                              <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>Loading comments...</div>
                              </div>
                            ) : (
                              <>
                                {comments.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No questions or discussions yet. Be the first to start the conversation!
                                  </div>
                                ) : (
                                  comments.map(comment => renderCommentWithReplies(comment))
                                )}
                                
                                {commentPage < totalCommentPages && (
                                  <button 
                                    type="button"
                                    onClick={() => loadComments(commentPage + 1)}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    disabled={commentsLoading}
                                  >
                                    {commentsLoading ? 'Loading...' : 'Load More Comments'}
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {userComments.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                You haven't made any comments or replies yet.
                              </div>
                            ) : (
                              userComments.map(comment => renderCommentWithReplies(comment))
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Follow-up & Next Steps ("with follow up screen at last") */}
                    {activeViewerTab === 'followup' && (
                      <div className="viewer-tab-pane" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🚀</span> Follow-up & Next Step Programs
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Upgrade your skillset with our mapped continuation pathways designed to take your practical knowledge to the next level.
                          </p>
                        </div>

                        {course?.continuationCourses && course.continuationCourses.length > 0 ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.25rem'
                          }}>
                            {course.continuationCourses.map(nextC => (
                              <div
                                key={nextC._id || nextC}
                                className="glass-card"
                                style={{
                                  borderRadius: '16px',
                                  border: '1px solid rgba(168, 85, 247, 0.35)',
                                  background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.08))',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  minWidth: 0,
                                  overflow: 'hidden'
                                }}
                              >
                                {nextC.thumbnail && (
                                  <div style={{ width: '100%', height: '140px', overflow: 'hidden', background: '#0f172a' }}>
                                    <img
                                      src={getMediaUrl(nextC.thumbnail) || FALLBACK_COURSE_THUMBNAIL}
                                      alt={nextC.title || 'Course thumbnail'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = FALLBACK_COURSE_THUMBNAIL;
                                      }}
                                    />
                                  </div>
                                )}
                                <div style={{ padding: '1.25rem' }}>
                                  <div style={{
                                    display: 'inline-block',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    color: '#7c3aed',
                                    background: 'rgba(124, 58, 237, 0.1)',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '20px',
                                    marginBottom: '0.75rem'
                                  }}>
                                    Recommended Next Step
                                  </div>
                                  <h4 style={{
                                    fontSize: '1.15rem',
                                    fontWeight: '700',
                                    margin: '0 0 0.5rem 0',
                                    color: 'var(--text-primary)',
                                    lineHeight: '1.4',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                  }}>
                                    {nextC.title || 'Advanced Masterclass'}
                                  </h4>
                                  <p style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: '1.5',
                                    margin: '0 0 1.25rem 0'
                                  }}>
                                    {nextC.subtitle || nextC.description?.substring(0, 110) || 'Step-by-step follow-up curriculum mapped to accelerate your practical implementation.'}
                                  </p>

                                  <Link
                                    to={`/sale/${nextC._id || nextC}`}
                                    className="btn btn-primary"
                                    style={{
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      textAlign: 'center',
                                      justifyContent: 'center',
                                      padding: '0.65rem 1rem',
                                      borderRadius: '10px',
                                      fontWeight: '600',
                                      fontSize: '0.9rem',
                                      textDecoration: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    <span>Explore Program</span> →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '16px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎓</div>
                            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>You're On The Right Track!</h4>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem', lineHeight: '1.6' }}>
                              You are currently studying the main curriculum. Complete all chapters to earn your verified certificate. Check our course catalog for complementary programs.
                            </p>
                            <Link to="/all-courses" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                              Browse All Available Courses
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Study Materials & Resources */}
                    {activeViewerTab === 'resources' && (activeLesson?.driveLink || (activeLesson?.materials && activeLesson.materials.length > 0)) && (
                      <div className="viewer-tab-pane" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>📂</span> Lesson Study Materials & Resources
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                            Reference materials, project source files, spreadsheets, notes and cheatsheets for <strong>{activeLesson.title}</strong>.
                          </p>

                          {activeLesson.driveLink && (
                            <div style={{ marginBottom: activeLesson.materials?.length > 0 ? '1.25rem' : 0 }}>
                              <a
                                href={getMediaUrl(activeLesson.driveLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.75rem 1.25rem',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  textDecoration: 'none'
                                }}
                                onClick={handleMaterialOpen}
                              >
                                📥 Open Lesson File / Notes (Drive or Server)
                              </a>
                            </div>
                          )}

                          {activeLesson.materials && activeLesson.materials.length > 0 && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem' }}>Attached Documents:</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {activeLesson.materials.map((mat, i) => (
                                  <a
                                    key={i}
                                    href={getMediaUrl(mat.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '0.6rem 1rem',
                                      borderRadius: '10px',
                                      fontSize: '0.88rem',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <span>📄 {mat.title || `Resource File ${i + 1}`}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Download / View ↗</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <h3>No lessons loaded</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Please select a lesson to start studying.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}