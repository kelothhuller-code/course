import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>WIDETECH</h3>
            <p>
              Making AI education accessible to everyone — from kids to seniors, 
              beginners to professionals.
            </p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
              Directed by @widetechai
            </p>
          </div>

          <div className="footer-links">
            <h4>Learn</h4>
            <ul>
              <li><a href="/#courses">Courses</a></li>
              <li><Link to="/all-courses">All Courses</Link></li>
              <li><a href="/#events">Workshops</a></li>
              <li><a href="/#trials">Free Tutorials</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <ul>
              <li><a href="/#about">About Us</a></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><Link to="/auth">Student Login</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Legal & Policies</h4>
            <ul>
              <li><Link to="/terms">Terms & Conditions</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/refund">Refund & Cancellation</Link></li>
              <li><Link to="/contact">Support & Help</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span>© {new Date().getFullYear()} WIDETECH Academy (WIDE VENTURES). All rights reserved.</span>
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem' }}>
              <Link to="/terms" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Terms</Link>
              <Link to="/privacy" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Privacy</Link>
              <Link to="/refund" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Refund Policy</Link>
              <Link to="/contact" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'none' }}>Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}