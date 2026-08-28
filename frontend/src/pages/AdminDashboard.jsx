import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminDashboard({ user, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('course');

  // ─── Inline Admin Login Gate ────────────────────────────────
  const [localUser, setLocalUser] = useState(user);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Keep in sync if parent user changes (e.g. token refresh)
  useEffect(() => { setLocalUser(user); }, [user]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await api.login(loginEmail, loginPassword);
      if (data.role !== 'admin') {
        setLoginError('Access denied. You do not have admin privileges.');
        return;
      }
      localStorage.setItem('token', data.token);
      setLocalUser(data);
      if (onLoginSuccess) onLoginSuccess(data);
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Show inline login gate if not authenticated or not admin
  if (!localUser || localUser.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '20px',
          padding: '2.5rem',
          boxShadow: '0 20px 50px rgba(139,92,246,0.15)'
        }}>
          {/* Lock icon header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', margin: '0 auto 1rem auto',
              boxShadow: '0 0 25px rgba(139,92,246,0.5)'
            }}>🔐</div>
            <h2 style={{ fontFamily: 'var(--font-header)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              Super Admin Access
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This area is restricted to platform administrators only.
            </p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
              color: '#fca5a5', fontSize: '0.9rem', textAlign: 'center'
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>
                USERNAME / EMAIL
              </label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="Enter admin username"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  padding: '0.85rem 1rem', color: '#fff', fontSize: '1rem',
                  outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  padding: '0.85rem 1rem', color: '#fff', fontSize: '1rem',
                  outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%', padding: '1rem',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '1.05rem', fontWeight: '700', cursor: loginLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
                opacity: loginLoading ? 0.7 : 1, transition: 'all 0.2s'
              }}
            >
              {loginLoading ? 'Verifying...' : '🔓 Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }


  // ─── Course Form State ─────────────────────────────────────
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState('AI Development');
  const [packageType, setPackageType] = useState('Starter');
  const [coursePrice, setCoursePrice] = useState(499);
  const [courseThumb, setCourseThumb] = useState('');
  const [courseLanguages, setCourseLanguages] = useState(['English']);
  const [newLanguage, setNewLanguage] = useState('');
  const [courseContent, setCourseContent] = useState([{
    language: 'English',
    chapters: [{ title: '', description: '', videoUrl: '', driveLink: '', duration: '' }]
  }]);

  // ─── Event Form State ──────────────────────────────────────
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('webinar');
  const [eventIsPaid, setEventIsPaid] = useState(false);
  const [eventPrice, setEventPrice] = useState(199);
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventDuration, setEventDuration] = useState('1 Hour');
  const [eventMeetingLink, setEventMeetingLink] = useState('https://meet.google.com/');
  const [eventThumb, setEventThumb] = useState('');

  // ─── Trial Form State ──────────────────────────────────────
  const [trialTitle, setTrialTitle] = useState('');
  const [trialDesc, setTrialDesc] = useState('');
  const [trialVideo, setTrialVideo] = useState('https://www.youtube.com/embed/');
  const [trialCategory, setTrialCategory] = useState('AI Tools');
  const [trialDuration, setTrialDuration] = useState('5 Mins');
  const [trialThumb, setTrialThumb] = useState('');
  const [existingTrials, setExistingTrials] = useState([]);

  // ─── Users & Transactions ──────────────────────────────────
  const [allUsers, setAllUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [txnsLoading, setTxnsLoading] = useState(false);

  // ─── Fetch helpers ─────────────────────────────────────────
  const fetchTrials = async () => {
    try { setExistingTrials(await api.getTrials()); } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try { setAllUsers(await api.adminGetUsers()); } catch (e) { console.error(e); } finally { setUsersLoading(false); }
  };

  const fetchTransactions = async () => {
    setTxnsLoading(true);
    try { setAllTransactions(await api.adminGetTransactions()); } catch (e) { console.error(e); } finally { setTxnsLoading(false); }
  };

  useEffect(() => {
    if (user?.role === 'admin') { fetchTrials(); fetchUsers(); fetchTransactions(); }
  }, [user]);

  // ─── Course Handlers ───────────────────────────────────────
  const addLanguageToCourse = () => {
    if (!newLanguage.trim() || courseLanguages.includes(newLanguage.trim())) return;
    const lang = newLanguage.trim();
    setCourseLanguages([...courseLanguages, lang]);
    setCourseContent([...courseContent, { language: lang, chapters: [{ title: '', description: '', videoUrl: '', driveLink: '', duration: '' }] }]);
    setNewLanguage('');
  };

  const removeLanguageFromCourse = (lang) => {
    if (lang === 'English') return;
    setCourseLanguages(courseLanguages.filter(l => l !== lang));
    setCourseContent(courseContent.filter(c => c.language !== lang));
  };

  const handleChapterChange = (langIdx, chapIdx, field, val) => {
    const updated = [...courseContent];
    updated[langIdx].chapters[chapIdx][field] = val;
    setCourseContent(updated);
  };

  const addChapter = (langIdx) => {
    const updated = [...courseContent];
    updated[langIdx].chapters.push({ title: '', description: '', videoUrl: '', driveLink: '', duration: '' });
    setCourseContent(updated);
  };

  const removeChapter = (langIdx, chapIdx) => {
    const updated = [...courseContent];
    updated[langIdx].chapters.splice(chapIdx, 1);
    setCourseContent(updated);
  };

  // ─── Submit Handlers ───────────────────────────────────────
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateCourse({
        title: courseTitle, description: courseDesc, category: courseCategory,
        packageType, price: Number(coursePrice),
        thumbnail: courseThumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        languages: courseLanguages, content: courseContent
      });
      alert('✅ Course created successfully!');
      setCourseTitle(''); setCourseDesc(''); setCourseThumb('');
      setCourseLanguages(['English']);
      setCourseContent([{ language: 'English', chapters: [{ title: '', description: '', videoUrl: '', driveLink: '', duration: '' }] }]);
    } catch (err) { alert('❌ Error: ' + err.message); }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateEvent({
        title: eventTitle, description: eventDesc, type: eventType,
        isPaid: eventIsPaid, price: eventIsPaid ? Number(eventPrice) : 0,
        dateTime: new Date(eventDateTime), meetingLink: eventMeetingLink,
        duration: eventDuration,
        thumbnail: eventThumb || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
      });
      alert('✅ Event created successfully!');
      setEventTitle(''); setEventDesc(''); setEventDateTime(''); setEventMeetingLink('https://meet.google.com/');
    } catch (err) { alert('❌ Error: ' + err.message); }
  };

  const handleTrialSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateTrial({
        title: trialTitle, description: trialDesc, videoUrl: trialVideo,
        category: trialCategory, duration: trialDuration,
        thumbnail: trialThumb || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
      });
      alert('✅ Trial lesson added!');
      setTrialTitle(''); setTrialDesc(''); setTrialVideo('https://www.youtube.com/embed/'); setTrialThumb('');
      fetchTrials();
    } catch (err) { alert('❌ Error: ' + err.message); }
  };

  const handleTrialDelete = async (id) => {
    if (!window.confirm('Delete this trial lesson?')) return;
    try { await api.adminDeleteTrial(id); fetchTrials(); } catch (err) { alert('❌ Delete failed: ' + err.message); }
  };

  const handleRevokeEnrollment = async (userId, courseId, userName, courseTitle) => {
    if (!window.confirm(`Remove "${courseTitle}" enrollment from ${userName}?`)) return;
    try {
      await api.adminRevokeEnrollment(userId, courseId);
      alert('✅ Enrollment revoked successfully!');
      fetchUsers();
    } catch (err) { alert('❌ Error: ' + err.message); }
  };

  // ─── Shared input style helper ─────────────────────────────
  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '0.9rem 1.1rem',
    color: '#fff',
    fontSize: '1rem',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
    color: '#94a3b8'
  };

  const tabs = [
    { id: 'course', icon: '📖', label: 'Add Course' },
    { id: 'event', icon: '📅', label: 'Add Event' },
    { id: 'trial', icon: '▶️', label: 'Trial Lessons' },
    { id: 'users', icon: '👥', label: 'All Users' },
    { id: 'transactions', icon: '💳', label: 'Transactions' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="badge" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>⚙️ SUPER ADMIN PANEL</div>
          <h1 style={{ fontFamily: 'var(--font-header)', fontSize: '2.25rem', marginBottom: '0.5rem' }}>
            WIDETECHNOS <span className="text-gradient">Content Manager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Welcome, <strong style={{ color: '#fff' }}>{user?.name}</strong>. Manage all platform content from here.
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                  : 'rgba(255,255,255,0.04)',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                padding: '0.9rem 1.4rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 15px rgba(139,92,246,0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════ TAB: ADD COURSE ══════ */}
        {activeTab === 'course' && (
          <form onSubmit={handleCourseSubmit} className="glass-card" style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>📖 Create New AI Course Package</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>COURSE TITLE</label>
                <input style={inputStyle} required value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="e.g. AI for Daily Life" />
              </div>
              <div>
                <label style={labelStyle}>CATEGORY</label>
                <select style={inputStyle} value={courseCategory} onChange={e => setCourseCategory(e.target.value)}>
                  <option>AI Development</option>
                  <option>AI in Daily Life</option>
                  <option>AI for Kids (10+)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea style={{ ...inputStyle, minHeight: '90px', fontFamily: 'inherit', resize: 'vertical' }} required value={courseDesc} onChange={e => setCourseDesc(e.target.value)} placeholder="What will students learn?" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>PACKAGE TYPE</label>
                <select style={inputStyle} value={packageType} onChange={e => setPackageType(e.target.value)}>
                  <option value="Starter">⭐ Starter</option>
                  <option value="Professional">⭐⭐ Professional</option>
                  <option value="Master">⭐⭐⭐ Master</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>PRICE (₹)</label>
                <input style={inputStyle} type="number" required value={coursePrice} onChange={e => setCoursePrice(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>THUMBNAIL URL</label>
                <input style={inputStyle} value={courseThumb} onChange={e => setCourseThumb(e.target.value)} placeholder="Image URL" />
              </div>
            </div>

            {/* Languages */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <label style={labelStyle}>🌐 LANGUAGE VERSIONS</label>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input style={{ ...inputStyle, maxWidth: '280px' }} value={newLanguage} onChange={e => setNewLanguage(e.target.value)} placeholder="e.g. Hindi, Tamil, Spanish…" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLanguageToCourse}>+ Add</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {courseLanguages.map(lang => (
                  <span key={lang} className="language-pill">
                    {lang}
                    {lang !== 'English' && <span onClick={() => removeLanguageFromCourse(lang)} style={{ cursor: 'pointer', marginLeft: '4px' }}>×</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Chapter Builder */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>📝 Chapter Content Builder</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Add video lessons for each language. Paste YouTube embed links. Optionally add a Google Drive link for study materials.
              </p>

              {courseContent.map((langBlock, langIdx) => (
                <div key={langBlock.language} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--secondary)', marginBottom: '1rem', fontSize: '1.05rem' }}>🌐 {langBlock.language} — Lessons</h4>

                  {langBlock.chapters.map((chap, chapIdx) => (
                    <div key={chapIdx} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem', border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.9rem' }}>Lesson #{chapIdx + 1}</span>
                        {langBlock.chapters.length > 1 && (
                          <button type="button" onClick={() => removeChapter(langIdx, chapIdx)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input style={inputStyle} required value={chap.title} onChange={e => handleChapterChange(langIdx, chapIdx, 'title', e.target.value)} placeholder="Lesson Title" />
                        <input style={inputStyle} value={chap.duration} onChange={e => handleChapterChange(langIdx, chapIdx, 'duration', e.target.value)} placeholder="Duration e.g. 12:30" />
                      </div>
                      <input style={{ ...inputStyle, marginBottom: '0.75rem' }} required value={chap.videoUrl} onChange={e => handleChapterChange(langIdx, chapIdx, 'videoUrl', e.target.value)} placeholder="🎬 YouTube Embed URL (https://www.youtube.com/embed/...)" />
                      <input style={{ ...inputStyle, marginBottom: '0.75rem' }} value={chap.driveLink} onChange={e => handleChapterChange(langIdx, chapIdx, 'driveLink', e.target.value)} placeholder="📂 Google Drive Materials Link (optional)" />
                      <input style={inputStyle} value={chap.description} onChange={e => handleChapterChange(langIdx, chapIdx, 'description', e.target.value)} placeholder="Short lesson summary" />
                    </div>
                  ))}

                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => addChapter(langIdx)} style={{ fontSize: '0.9rem' }}>
                    + Add Another Lesson
                  </button>
                </div>
              ))}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
              🚀 Publish Course Package
            </button>
          </form>
        )}

        {/* ══════ TAB: ADD EVENT ══════ */}
        {activeTab === 'event' && (
          <form onSubmit={handleEventSubmit} className="glass-card" style={{ padding: '2.5rem', maxWidth: '750px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>📅 Publish Webinar or Workshop</h2>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>EVENT TITLE</label>
              <input style={inputStyle} required value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="e.g. Live AI Game Building Workshop" />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }} required value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="What will attendees learn or do?" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>EVENT TYPE</label>
                <select style={inputStyle} value={eventType} onChange={e => setEventType(e.target.value)}>
                  <option value="webinar">🎤 Webinar</option>
                  <option value="workshop">🔧 Workshop</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>DURATION</label>
                <input style={inputStyle} required value={eventDuration} onChange={e => setEventDuration(e.target.value)} placeholder="e.g. 1.5 Hours" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={eventIsPaid} onChange={e => setEventIsPaid(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  Paid Event (add ticket price)
                </label>
                {eventIsPaid && (
                  <input style={{ ...inputStyle, marginTop: '0.5rem' }} type="number" required value={eventPrice} onChange={e => setEventPrice(e.target.value)} placeholder="Price in ₹" />
                )}
              </div>
              <div>
                <label style={labelStyle}>DATE & TIME</label>
                <input style={inputStyle} type="datetime-local" required value={eventDateTime} onChange={e => setEventDateTime(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>🔗 MEETING LINK (ZOOM / GOOGLE MEET)</label>
                <input style={inputStyle} required value={eventMeetingLink} onChange={e => setEventMeetingLink(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>BANNER IMAGE URL</label>
                <input style={inputStyle} value={eventThumb} onChange={e => setEventThumb(e.target.value)} placeholder="Optional thumbnail" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
              🚀 Publish Live Session
            </button>
          </form>
        )}

        {/* ══════ TAB: TRIAL LESSONS ══════ */}
        {activeTab === 'trial' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <form onSubmit={handleTrialSubmit} className="glass-card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '2rem', fontSize: '1.6rem' }}>▶️ Add Free Trial Lesson</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div><label style={labelStyle}>TITLE</label><input style={inputStyle} required value={trialTitle} onChange={e => setTrialTitle(e.target.value)} placeholder="e.g. AI in 5 Minutes" /></div>
                <div><label style={labelStyle}>CATEGORY</label><input style={inputStyle} required value={trialCategory} onChange={e => setTrialCategory(e.target.value)} placeholder="e.g. AI Tools" /></div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>DESCRIPTION</label>
                <input style={inputStyle} required value={trialDesc} onChange={e => setTrialDesc(e.target.value)} placeholder="One-line hook for this lesson" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div><label style={labelStyle}>🎬 VIDEO EMBED URL</label><input style={inputStyle} required value={trialVideo} onChange={e => setTrialVideo(e.target.value)} /></div>
                <div><label style={labelStyle}>DURATION</label><input style={inputStyle} required value={trialDuration} onChange={e => setTrialDuration(e.target.value)} placeholder="5 Mins" /></div>
                <div><label style={labelStyle}>COVER THUMBNAIL</label><input style={inputStyle} value={trialThumb} onChange={e => setTrialThumb(e.target.value)} placeholder="Image URL" /></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                ✅ Add Free Lesson
              </button>
            </form>

            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Active Free Lessons ({existingTrials.length})</h3>
              {existingTrials.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No trial lessons yet.</p>
              ) : (
                existingTrials.map(t => (
                  <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ color: 'var(--secondary)', marginBottom: '0.15rem' }}>{t.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category} • {t.duration}</p>
                    </div>
                    <button onClick={() => handleTrialDelete(t._id)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '600' }}>
                      🗑 Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════ TAB: ALL USERS ══════ */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem' }}>👥 All Registered Users</h2>
              <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>🔄 Refresh</button>
            </div>

            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Loading users...</div>
            ) : allUsers.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users registered yet.</div>
            ) : (
              allUsers.map(u => (
                <div key={u._id} className="glass-card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1rem', color: '#fff' }}>
                          {u.name?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <span style={{ background: u.role === 'admin' ? 'rgba(139,92,246,0.2)' : 'rgba(6,182,212,0.15)', border: `1px solid ${u.role === 'admin' ? 'rgba(139,92,246,0.4)' : 'rgba(6,182,212,0.3)'}`, borderRadius: '999px', padding: '0.15rem 0.65rem', fontSize: '0.75rem', fontWeight: '700', color: u.role === 'admin' ? '#c084fc' : 'var(--secondary)', textTransform: 'uppercase' }}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Joined: {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {u.enrolledCourses?.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '600' }}>
                        ENROLLED COURSES ({u.enrolledCourses.length}):
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {u.enrolledCourses.map(ec => {
                          const course = ec.courseId;
                          if (!course) return null;
                          return (
                            <div key={ec._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.4rem 0.85rem' }}>
                              <span style={{ fontSize: '0.85rem' }}>
                                <strong>{course.title}</strong>
                                <span style={{ color: 'var(--secondary)', marginLeft: '0.4rem' }}>{ec.progress}%</span>
                              </span>
                              <button
                                onClick={() => handleRevokeEnrollment(u._id, course._id, u.name, course.title)}
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '5px', color: '#ef4444', cursor: 'pointer', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: '700' }}
                              >
                                Revoke
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!u.enrolledCourses || u.enrolledCourses.length === 0) && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No courses purchased yet.</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════ TAB: TRANSACTIONS ══════ */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem' }}>💳 Transaction History</h2>
              <button className="btn btn-secondary btn-sm" onClick={fetchTransactions}>🔄 Refresh</button>
            </div>

            {txnsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Loading transactions...</div>
            ) : allTransactions.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions recorded yet.</div>
            ) : (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 0.75fr 0.75fr', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span>Transaction ID</span>
                  <span>User</span>
                  <span>Item Type</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>

                {allTransactions.map(txn => (
                  <div key={txn._id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 0.75fr 0.75fr', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{txn.txnid}</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{txn.userId?.name || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{txn.userId?.email || ''}</div>
                    </div>
                    <span style={{ fontSize: '0.9rem', textTransform: 'capitalize', color: txn.itemType === 'course' ? 'var(--secondary)' : 'var(--accent)' }}>
                      {txn.itemType === 'course' ? '📖 Course' : '📅 Event'}
                    </span>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>₹{txn.amount}</span>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      background: txn.status === 'success' ? 'rgba(16,185,129,0.15)' : txn.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: txn.status === 'success' ? '#10b981' : txn.status === 'failed' ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${txn.status === 'success' ? 'rgba(16,185,129,0.3)' : txn.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      textTransform: 'uppercase'
                    }}>
                      {txn.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
