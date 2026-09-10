import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';

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
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>ENTERING CLASSROOM...</div>
        </div>
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

  console.log('Current Language:', activeLanguage);
  console.log('Lessons List:', lessonsList);
  console.log('Active Lesson:', activeLesson);
  console.log('Completed Lessons:', courseProgress?.completedLessons);

  return (
    <>
      <NavHeader user={user} onLogout={handleLogout} />
      <div className="landing-page" style={{ paddingTop: '0.5rem' }}>
        <div className="container" style={{ flexGrow: 1, paddingBottom: '2rem' }}>
          {/* Course Breadcrumb */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{course?.title || 'Course'}</span>
          </div>

          <div className="course-viewer-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
            {/* Left Side: Video Player & Details */}
            <section className="player-section">
              {activeLesson ? (
                <>
                  <div className="video-wrapper" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius)', background: '#000' }}>
                    {activeLesson.videoUrl ? (
                      <iframe
                        ref={iframeRef}
                        src={activeLesson.videoUrl}
                        title={activeLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
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
                  <div className="learn-details" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h1 className="learn-title" style={{ fontSize: '1.5rem', fontWeight: '700' }}>{activeLesson.title}</h1>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ 
                          background: 'var(--primary)',
                          color: '#fff',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '40px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>{activeLesson.duration || 'Video'}</span>
                        <button
                          onClick={handleToggleComplete}
                          className={`btn btn-sm ${isLessonCompleted(activeLesson._id) ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.35rem 0.85rem',
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
                      </div>
                    </div>
                    <p className="learn-desc" style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.7' }}>
                      {activeLesson.description || 'No description available.'}
                    </p>

                    {activeLesson.driveLink && (
                      <a
                        href={activeLesson.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ 
                          marginTop: '1rem', 
                          display: 'inline-flex', 
                          fontSize: '1rem', 
                          gap: '0.5rem', 
                          border: '2px solid var(--secondary)', 
                          padding: '0.85rem 1.5rem',
                          textDecoration: 'none'
                        }}
                        onClick={handleMaterialOpen}
                      >
                        📂 Open Study Materials & Resources
                      </a>
                    )}
                    
                    <div className="glass-card" style={{ marginTop: '2rem', padding: '1rem 1.25rem' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>STUDYING COURSE</h4>
                      <h3 style={{ fontSize: '1.25rem' }}>{course?.title}</h3>
                    </div>

                    {/* Comments Section with Tabs */}
                    <div className="comments-section" style={{ marginTop: '2rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>💬 Questions & Discussion</h3>
                      </div>

                      {/* Tab Navigation */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <button
                          onClick={() => setCommentTab('public')}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: commentTab === 'public' ? '2px solid var(--primary)' : 'none',
                            color: commentTab === 'public' ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: commentTab === 'public' ? '600' : '400',
                            fontSize: '0.9rem'
                          }}
                        >
                          Public Discussion
                        </button>
                        <button
                          onClick={() => setCommentTab('my')}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: commentTab === 'my' ? '2px solid var(--primary)' : 'none',
                            color: commentTab === 'my' ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: commentTab === 'my' ? '600' : '400',
                            fontSize: '0.9rem'
                          }}
                        >
                          My Comments & Replies
                        </button>
                      </div>

                      {/* Comment Form - Only show in Public tab */}
                      {commentTab === 'public' && (
                        <form onSubmit={handleCommentSubmit} style={{ marginBottom: '1.5rem' }}>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Ask a question or share your thoughts..."
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius)',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--text-primary)',
                              minHeight: '80px',
                              resize: 'vertical',
                              fontFamily: 'inherit',
                              fontSize: '0.95rem'
                            }}
                          />
                          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                            Post Comment
                          </button>
                        </form>
                      )}

                      {/* Reply Form - Show in both tabs when replying */}
                      {replyingTo && (
                        <div style={{ 
                          marginBottom: '1.5rem', 
                          padding: '1rem', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius)',
                          backgroundColor: 'var(--background)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold' }}>Replying to comment</span>
                            <button 
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
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
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

                      {/* Render Comments based on active tab */}
                      {commentTab === 'public' ? (
                        // Public Discussion Tab
                        <>
                          {commentsLoading && commentPage === 1 ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                              <div className="logo-text" style={{ animation: 'pulse 1.5s infinite' }}>Loading comments...</div>
                            </div>
                          ) : (
                            <>
                              {comments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                  No comments yet. Be the first to ask a question!
                                </div>
                              ) : (
                                comments.map(comment => renderCommentWithReplies(comment))
                              )}
                              
                              {commentPage < totalCommentPages && (
                                <button 
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
                        // My Comments Tab
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
                  </div>
                </>
              ) : (
                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <h3>No lessons loaded</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Please select a lesson from the list to start studying.</p>
                </div>
              )}
            </section>

            {/* Right Side: Lesson List Sidebar */}
            <aside className="sidebar-chapters" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
              <Link to="/dashboard" className="btn btn-secondary btn-sm" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem',
                width: '100%',
                justifyContent: 'center',
                textDecoration: 'none'
              }}>
                ← Back to Dashboard
              </Link>

              <div className="lang-selector-container" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>LANGUAGE VERSION</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {course?.languages?.map(lang => (
                    <button
                      key={lang}
                      className={`btn btn-sm ${activeLanguage === lang ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleLanguageChange(lang)}
                      style={{ flexGrow: 1, fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Course Progress</span>
                  <span className="progress-percentage" style={{ fontWeight: '600', color: 'var(--primary)' }}>{progressPercent}%</span>
                </div>
                <div className="progress-bar-container" style={{ margin: 0, height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {courseProgress?.completedLessons?.length || 0} / {courseProgress?.totalLessons || lessonsList.length} lessons completed
                </div>
              </div>

              <h3 className="sidebar-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Course Lessons</h3>

              <div className="lesson-list" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                {lessonsList && lessonsList.length > 0 ? (
                  lessonsList.map((lesson, idx) => {
                    const isActive = activeLesson && activeLesson._id === lesson._id;
                    const isCompleted = isLessonCompleted(lesson._id);
                    
                    return (
                      <div 
                        key={lesson._id || idx}
                        className={`lesson-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleLessonSelect(lesson)}
                        style={{
                          padding: '0.75rem',
                          margin: '0.25rem 0',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                          transition: 'background-color 0.2s',
                          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '24px' }}>
                          {idx + 1}.
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? '600' : '400',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {lesson.title || `Lesson ${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            ⏱️ {lesson.duration || 'N/A'}
                          </div>
                        </div>
                        {isCompleted && (
                          <span style={{ color: '#10b981', fontSize: '1rem', flexShrink: 0 }}>✓</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No lessons available for this language
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}