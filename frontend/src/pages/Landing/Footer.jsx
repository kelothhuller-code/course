import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>WIDETECHNOS</h3>
            <p>
              Making AI education accessible to everyone — from kids to seniors, 
              beginners to professionals.
            </p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
              Directed by @widetechai
            </p>
          </div>
          <div className="footer-links">
            <h4>Learn</h4>
            <ul>
              <li><a href="#courses">Courses</a></li>
              <li><a href="#events">Workshops</a></li>
              <li><a href="#trials">Free Tutorials</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><Link to="/auth">Login</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Connect</h4>
            <ul>
              <li><a href="mailto:hello@widetechnos.com">Email Us</a></li>
              <li><a href="https://instagram.com/widetechai" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} WIDETECHNOS Academy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}