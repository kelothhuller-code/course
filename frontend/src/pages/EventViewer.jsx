import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import NavHeader from './NavHeader';

export default function EventViewer({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [accessData, setAccessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { user: 'System', text: 'Welcome to the live session chat! Type your questions below.' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const fetchAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getEventAccess(id);
        if (data.success) {
          setAccessData(data);
        } else {
          setError(data.message || 'Access denied');
        }
      } catch (err) {
        setError(err.message || 'Unable to access workshop. Please check your registration.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [id]);

  // Countdown calculations
  useEffect(() => {
    if (!accessData?.dateTime) return;
    const interval = setInterval(() => {
      const target = new Date(accessData.dateTime).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ liveNow: true });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, liveNow: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [accessData]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages(prev => [...prev, {
      user: user?.name || accessData?.userName || 'Student',
      text: newMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewMsg('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>⏳ Loading Live Workshop Access...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
        <NavHeader user={user} />
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.8rem' }}>Access Restricted</h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>{error}</p>
          <Link to="/all-courses" style={{ padding: '0.75rem 1.5rem', background: '#4f46e5', color: '#fff', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
            Explore Events & Workshops
          </Link>
        </div>
      </div>
    );
  }

  // Build Jitsi Room URL
  const roomName = `Workshop_${accessData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${accessData.eventId}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(accessData.userName || 'Student')}"`;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <NavHeader user={user} />

      {/* Workshop Banner Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ffffff', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', background: '#22c55e', color: '#ffffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              🔴 LIVE WORKSHOP ROOM
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>{accessData.title}</h1>
            <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '0.3rem' }}>
              Instructor: WIDETECHNOS Academy • Scheduled: {new Date(accessData.dateTime).toLocaleString()} ({accessData.duration || '1.5 Hours'})
            </div>
          </div>

          {/* Countdown timer pill */}
          {timeLeft && !timeLeft.liveNow && (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.8rem 1.2rem', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Starts In</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
                {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Workshop Area */}
      <div style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '1.5rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: accessData.meetingType === 'embed_youtube' ? '1fr 340px' : '1fr', gap: '1.5rem' }}>
        
        {/* Stream / Meeting Canvas */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '560px' }}>
          
          {accessData.meetingType === 'jitsi' ? (
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '600px' }}>
              <iframe
                src={jitsiUrl}
                title={accessData.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; display-capture; autoplay; clipboard-write"
              />
            </div>
          ) : accessData.meetingType === 'embed_youtube' ? (
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              <iframe
                src={accessData.streamUrl || accessData.meetingLink}
                title={accessData.title}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>External Meeting Link Ready</h2>
              <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                Click below to join the live workshop room directly via Zoom / Google Meet.
              </p>
              {accessData.meetingPasscode && (
                <div style={{ marginBottom: '1.5rem', padding: '0.6rem 1.2rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                  Passcode: <span style={{ color: '#4f46e5' }}>{accessData.meetingPasscode}</span>
                </div>
              )}
              <a
                href={accessData.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff', borderRadius: '8px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}
              >
                🚀 Launch Live Workshop Room
              </a>
            </div>
          )}
        </div>

        {/* Live Chat Box (Visible for Youtube embed mode) */}
        {accessData.meetingType === 'embed_youtube' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💬 Live Q&A Chat</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>● Connected</span>
            </div>

            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#f8fafc' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: msg.user === 'System' ? '#6366f1' : '#0f172a' }}>{msg.user}</span>
                    <span>{msg.time || ''}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} style={{ padding: '0.8rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Ask a question..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                style={{ flex: 1, padding: '0.55rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                style={{ padding: '0.55rem 1rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
