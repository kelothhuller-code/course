import Icon from './Icon';
import { INSTAGRAM_FOLLOWERS_TEXT, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/site';
import './InstagramCard.css';

/**
 * Lightweight Instagram trust card: a plain link, no embed, no runtime scraping.
 * Handle and the optional follower text come from VITE_INSTAGRAM_HANDLE and
 * VITE_INSTAGRAM_FOLLOWERS_TEXT (src/config/site.js); the follower text is shown only if set.
 */
export default function InstagramCard({ compact = false, title = 'Follow us on Instagram' }) {
  if (!INSTAGRAM_URL) return null;
  return (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`ig-card ${compact ? 'ig-card--compact' : ''}`}>
      <span className="ig-card-logo" aria-hidden="true"><Icon name="instagram" size={compact ? 22 : 30} /></span>
      <span className="ig-card-text">
        <strong>{title} <span className="ig-card-handle">@{INSTAGRAM_HANDLE}</span></strong>
        <small>
          {INSTAGRAM_FOLLOWERS_TEXT ? `${INSTAGRAM_FOLLOWERS_TEXT} · ` : ''}Behind the scenes, updates and new launches
        </small>
      </span>
      <span className="ig-card-cta">Follow <Icon name="external" size={16} /></span>
      <span className="sr-only">(opens Instagram in a new tab)</span>
    </a>
  );
}
