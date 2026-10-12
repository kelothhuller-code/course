import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CourseViewer from './pages/CourseViewer';
import Checkout from './pages/Checkout';
import CertificateVerify from './pages/CertificateVerify';
import AllCoursesPage from './pages/AllCoursesPage';
import CoursePreview from './pages/CoursePreview';
import CourseSalesPage from './pages/CourseSalesPage';
import EventViewer from './pages/EventViewer';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundPage from './pages/RefundPage';
import ContactPage from './pages/ContactPage';
import WhatsAppButton from './components/WhatsAppButton';


function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockPaymentData, setMockPaymentData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const navigate = useNavigate();

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getProfile();
      setUser(data);
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    refreshUser();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      localStorage.removeItem('token');
    }
    setUser(null);
    navigate('/');
  };

  const handleSimulatePayment = async (status) => {
    if (!mockPaymentData || isSimulating) return;
    setIsSimulating(true);

    try {
      const response = await api.submitMockCallback(mockPaymentData.txnid, status);
      setMockPaymentData(null);
      await refreshUser();
      const redirectPath = response.redirectUrl 
        ? response.redirectUrl.replace(/^https?:\/\/[^\/]+/, '') 
        : '/dashboard';
      navigate(redirectPath);
    } catch (err) {
      alert('Mock payment simulation error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>WIDETECH ACADEMY...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      

      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage user={user} onOpenMockPayment={setMockPaymentData} />} />
          <Route path="/auth" element={<AuthPage user={user} onLogout={handleLogout} onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/dashboard" element={<Dashboard user={user} onRefreshUser={refreshUser} />} />
          <Route path="/certificate/verify/:certificateId" element={<CertificateVerify />} />
          <Route 
            path="/checkout/:id" 
            element={<Checkout user={user} onRefreshUser={refreshUser} />} 
          />
          <Route path="/sale/:id" element={<CourseSalesPage user={user} />} />
          <Route path="/course/:id/preview" element={<CourseSalesPage user={user} />} />
          <Route 
            path="/course/:id" 
            element={<CourseViewer user={user} onRefreshUser={refreshUser} />} 
          />
          <Route path="/all-courses" element={<AllCoursesPage user={user} onLogout={handleLogout} />} />
          <Route path="/event/:id/room" element={<EventViewer user={user} />} />
          <Route path="/terms" element={<TermsPage user={user} />} />
          <Route path="/privacy" element={<PrivacyPage user={user} />} />
          <Route path="/refund" element={<RefundPage user={user} />} />
          <Route path="/contact" element={<ContactPage user={user} />} />

        </Routes>
      </main>


      {mockPaymentData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setMockPaymentData(null)} disabled={isSimulating}>×</button>
            <h3 className="simulator-title">💳 Payment Sandbox</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              🧪 This is a mock payment simulator for testing purposes.
            </p>
            <div className="simulator-meta">
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{mockPaymentData.txnid}</span>
              </div>
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Item:</span>
                <span style={{ fontWeight: 600 }}>{mockPaymentData.productinfo}</span>
              </div>
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                <span>{mockPaymentData.firstname}</span>
              </div>
              <div className="simulator-meta-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>Amount:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>₹{mockPaymentData.amount}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => handleSimulatePayment('success')} disabled={isSimulating}>
                {isSimulating ? 'Processing...' : '✅ Simulate Success'}
              </button>
              <button className="btn btn-secondary" onClick={() => handleSimulatePayment('failed')} disabled={isSimulating} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                {isSimulating ? 'Processing...' : '❌ Simulate Failure'}
              </button>
              <button className="btn btn-secondary" onClick={() => setMockPaymentData(null)} disabled={isSimulating} style={{ fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating WhatsApp Desk */}
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}