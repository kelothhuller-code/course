import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getJwtSecret } from '../utils/jwtSecret.js';

// Helper to extract JWT token from Authorization header, query, or httpOnly cookie
export const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

export const protect = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Concurrent Login Restriction (F2):
      // If tokenVersion doesn't match, previous session was invalidated by another device login
      if (decoded.tokenVersion !== undefined && req.user.tokenVersion !== undefined && decoded.tokenVersion !== req.user.tokenVersion) {
        return res.status(401).json({ message: 'Session expired: You have been logged in on another device.' });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Optional auth - doesn't require authentication but sets user if token exists
export const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token is invalid, but we don't care for optional auth
      console.log('Optional auth: Invalid token');
    }
  }
  next();
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAdminEmail = () => {
  let email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    const envPaths = [
      path.join(__dirname, '..', '.env'),
      path.join(process.cwd(), 'backend', '.env'),
      path.join(process.cwd(), '.env'),
      path.join(__dirname, '..', '..', '.env')
    ];
    for (const envPath of envPaths) {
      try {
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const m = content.match(/^\s*ADMIN_EMAIL\s*=\s*(.+)$/m);
          if (m && m[1]) {
            email = m[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
            if (email) break;
          }
        }
      } catch {}
    }
  }
  return email;
};

export const isUserAdmin = (user) => {
  if (!user || !user.email) return false;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return user.email.toLowerCase().trim() === adminEmail && user.role === 'admin';
};

export const admin = (req, res, next) => {
  if (isUserAdmin(req.user)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const authenticateToken = protect;