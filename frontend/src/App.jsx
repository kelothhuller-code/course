import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CourseViewer from './pages/CourseViewer';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockPaymentData, setMockPaymentData] = useState(null); // { txnid, amount, productinfo, firstname, email }
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  // Process Mock Payment Simulation callback
  const handleSimulatePayment = async (status) => {
    if (!mockPaymentData || isSimulating) return;
    setIsSimulating(true);

    try {
      const response = await api.submitMockCallback(mockPaymentData.txnid, status);
      // Success or fail redirect is simulated in response
      setMockPaymentData(null);
      await refreshUser();
      
      // Navigate using the redirect URL constructed by backend
      const redirectPath = response.redirectUrl.replace('http://localhost:5173', '');
      navigate(redirectPath);
    } catch (err) {
      alert('Mock payment simulation error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#070913' }}>
        <div className="logo-text" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>WIDETECHNOS ACADEMY...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="navbar">
        <div className="container nav-container">
          <Link to="/" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="logo-text">WIDETECHNOS</span>
            <span className="logo-tagline">Vision by @videdreamer</span>
          </Link>
          
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            {user && <Link to="/dashboard" className="nav-link">My Dashboard</Link>}

            <a href="https://instagram.com/videdreamer" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: 'var(--secondary)' }}>
              Instagram
            </a>
            
            {user ? (
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">Sign Out</button>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">Login / Register</Link>
            )}
          </nav>
        </div>
      </header>

      {/* Pages Container */}
      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage user={user} onOpenMockPayment={setMockPaymentData} />} />
          <Route path="/auth" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/dashboard" element={<Dashboard user={user} onRefreshUser={refreshUser} />} />
          <Route path="/course/:id" element={<CourseViewer onRefreshUser={refreshUser} />} />
          <Route path="/super-admin" element={<AdminDashboard user={user} onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </main>

      {/* Footer Element */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>WIDETECHNOS</h3>
              <p>
                Our goal is to create 1,000 job opportunities in tech by the end of 2027 by training kids, students, professionals, and seniors to harness the capabilities of Generative AI.
              </p>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Directed by <a href="https://instagram.com/videdreamer" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>@videdreamer</a>
              </div>
            </div>

            <div className="footer-links">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/">Home Dashboard</Link></li>
                <li><a href="#courses">AI Courses</a></li>
                <li><a href="#trials">Free Lessons</a></li>
                <li><a href="#events">Live Webinars</a></li>
              </ul>
            </div>

            <div className="footer-links">
              <h4>Vision Roadmap</h4>
              <ul>
                <li>Target: 1,000 Job Openings</li>
                <li>Timeline: End of 2027</li>
                <li>Skillset: Prompting, Apps, Games</li>
                <li>Demographics: Ages 10 to 100</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} WIDETECHNOS Academy. All rights reserved. Shaped by Instagram @videdreamer.
          </div>
        </div>
      </footer>

      {/* PayU Simulation Gate Modal */}
      {mockPaymentData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setMockPaymentData(null)} disabled={isSimulating}>×</button>
            <h3 className="simulator-title">PayU Gateway Sandbox</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              You are using the integrated Mock Payment system because no merchant credentials are configured in your environmental settings.
            </p>

            <div className="simulator-meta">
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{mockPaymentData.txnid}</span>
              </div>
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Item Name:</span>
                <span style={{ fontWeight: 600 }}>{mockPaymentData.productinfo}</span>
              </div>
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Payer Name:</span>
                <span>{mockPaymentData.firstname}</span>
              </div>
              <div className="simulator-meta-row">
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <span>{mockPaymentData.email}</span>
              </div>
              <div className="simulator-meta-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>Total Amount:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>₹{mockPaymentData.amount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSimulatePayment('success')}
                disabled={isSimulating}
              >
                {isSimulating ? 'Processing Transaction...' : '✓ Simulate Successful Payment'}
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={() => handleSimulatePayment('failed')}
                disabled={isSimulating}
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                {isSimulating ? 'Processing Transaction...' : '✗ Simulate Failed Payment'}
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => setMockPaymentData(null)}
                disabled={isSimulating}
                style={{ fontSize: '0.85rem' }}
              >
                Cancel Checkout
              </button>
            </div>
          </div>
        </div>
      )}
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
