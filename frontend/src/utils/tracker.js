// In-app Visitor & Checkout Drop-off Tracker
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');

// Generate or retrieve persistent session ID for the current browser session
function getSessionId() {
  try {
    let sid = sessionStorage.getItem('wt_session_id');
    if (!sid) {
      sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('wt_session_id', sid);
    }
    return sid;
  } catch (e) {
    return 'sid_fallback_' + Math.random().toString(36).substring(2, 9);
  }
}

// Detect basic device category
function getDeviceType() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export const tracker = {
  getSessionId,

  /**
   * Track page visit
   * @param {string} path - current pathname + search
   * @param {string} pageTitle - title of the page
   * @param {string} [courseId] - optional course ID if on a course page
   */
  trackPageView(path, pageTitle, courseId = null) {
    if (typeof window === 'undefined') return;

    // Skip tracking for admin paths
    const currentPath = path || window.location.pathname;
    if (currentPath.includes('admin') || currentPath.includes('/wide-admin-portal')) {
      return;
    }

    const payload = {
      path: currentPath,
      pageTitle: pageTitle || document.title,
      referrer: document.referrer || '',
      sessionId: getSessionId(),
      device: getDeviceType(),
      courseId: courseId || null
    };

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(`${BASE_URL}/analytics/track-view`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Silently catch tracking errors so they never disrupt user experience
      });
    } catch (e) {
      // Swallowed
    }
  },

  /**
   * Track checkout step & lead info
   * @param {Object} data
   * @param {string} data.courseId
   * @param {string} [data.courseTitle]
   * @param {number} [data.amount]
   * @param {string} [data.buyerName]
   * @param {string} [data.buyerEmail]
   * @param {string} [data.buyerPhone]
   * @param {string} [data.buyerState]
   * @param {'entered_checkout'|'filled_contact'|'initiated_payment'|'payment_failed'} data.step
   */
  trackCheckoutStep(data) {
    if (typeof window === 'undefined') return;

    const payload = {
      sessionId: getSessionId(),
      courseId: data.courseId || null,
      courseTitle: data.courseTitle || '',
      amount: data.amount || 0,
      buyerName: data.buyerName || '',
      buyerEmail: data.buyerEmail || '',
      buyerPhone: data.buyerPhone || '',
      buyerState: data.buyerState || '',
      step: data.step || 'entered_checkout'
    };

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(`${BASE_URL}/analytics/track-checkout-step`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch (e) {
      // Swallowed
    }
  }
};

export default tracker;
