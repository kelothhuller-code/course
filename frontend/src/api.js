const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');

// Automatically include credentials (httpOnly cookies) for all API requests
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init = {}) {
    const urlStr = typeof resource === 'string' ? resource : resource?.url || '';
    if (urlStr.includes('/api') || urlStr.startsWith(BASE_URL)) {
      return originalFetch.call(this, resource, {
        credentials: 'include',
        ...init,
      });
    }
    return originalFetch.apply(this, arguments);
  };
}

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong');
  }
  return response.json();
};

export const api = {
  // Authentication
  logout: async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (e) {
      // ignore network issues
    }
    localStorage.removeItem('token');
  },

  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  register: async (name, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  getProfile: async () => {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Forgot Password Flow
  forgotPassword: async (email) => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  resetPassword: async (email, otp, newPassword) => {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  // Courses
  getCourses: async (page = 1, limit = 9, showAll = false) => {
    const res = await fetch(`${BASE_URL}/courses?page=${page}&limit=${limit}&showAll=${showAll}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getAllCourses: async () => {
    const res = await fetch(`${BASE_URL}/courses/all`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getFeaturedCourse: async () => {
    const res = await fetch(`${BASE_URL}/courses/featured`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getAllCoursesPaginated: async (page = 1, limit = 12, search = '', category = 'All') => {
    try {
      console.log('bbbbb')
      const queryParams = new URLSearchParams({
        page,
        limit,
        search: search || '',
        category: category || 'All'
      });

      const response = await fetch(
        `${BASE_URL}/courses/paginated?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();

      return {
        courses: Array.isArray(data.courses) ? data.courses : [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    } catch (error) {
      console.error('Error in getAllCoursesPaginated:', error);
      return {
        courses: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }
  },

  getCourse: async (id) => {
    const res = await fetch(`${BASE_URL}/courses/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getCourseLearn: async (id) => {
    const res = await fetch(`${BASE_URL}/courses/${id}/learn`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  updateProgress: async (courseId, chapterTitle, language, completed) => {
    const res = await fetch(`${BASE_URL}/courses/${courseId}/progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ chapterTitle, language, completed }),
    });
    return handleResponse(res);
  },

  getCertificate: async (courseId) => {
    const res = await fetch(`${BASE_URL}/courses/${courseId}/certificate`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Events (Webinars/Workshops)
  getEvents: async () => {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getEvent: async (id) => {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  registerFreeEvent: async (eventId) => {
    const res = await fetch(`${BASE_URL}/events/${eventId}/register-free`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Trial Tutorials
  getTrials: async () => {
    const res = await fetch(`${BASE_URL}/trials`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Payments
  createRazorpayOrder: async (orderData) => {
    const res = await fetch(`${BASE_URL}/payment/razorpay/create-order`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(orderData),
    });
    return handleResponse(res);
  },

  verifyRazorpayPayment: async (paymentData) => {
    const res = await fetch(`${BASE_URL}/payment/razorpay/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleResponse(res);
  },

  initiatePayment: async (itemId, itemType, couponCode = null, billingDetails = {}) => {
    const res = await fetch(`${BASE_URL}/payment/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, itemType, couponCode, ...billingDetails }),
    });
    return handleResponse(res);
  },

  validateCoupon: async (code, courseId) => {
    const res = await fetch(`${BASE_URL}/payment/validate-coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code, courseId }),
    });
    return handleResponse(res);
  },

  mockPaymentCallback: async (txnid, status) => {
    const res = await fetch(`${BASE_URL}/payment/mock-callback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ txnid, status }),
    });
    return handleResponse(res);
  },

  submitMockCallback: async (txnid, status) => {
    return api.mockPaymentCallback(txnid, status);
  },

  // Enroll Free
  enrollFree: async (itemId) => {
    const res = await fetch(`${BASE_URL}/enroll/free`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId }),
    });
    return handleResponse(res);
  },

  // Admin Controls
  adminCreateCourse: async (courseData) => {
    const res = await fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(courseData),
    });
    return handleResponse(res);
  },

  adminCreateEvent: async (eventData) => {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(eventData),
    });
    return handleResponse(res);
  },

  adminCreateTrial: async (trialData) => {
    const res = await fetch(`${BASE_URL}/trials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(trialData),
    });
    return handleResponse(res);
  },

  adminDeleteTrial: async (trialId) => {
    const res = await fetch(`${BASE_URL}/trials/${trialId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Admin: User Management with pagination and search
  adminGetUsers: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${BASE_URL}/admin/users?${query}` : `${BASE_URL}/admin/users`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  adminGetTransactions: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${BASE_URL}/admin/transactions?${query}` : `${BASE_URL}/admin/transactions`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  adminGetGstBills: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${BASE_URL}/admin/gst/bills?${query}` : `${BASE_URL}/admin/gst/bills`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  adminRevokeEnrollment: async (userId, courseId) => {
    const res = await fetch(`${BASE_URL}/admin/revoke-enrollment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId, courseId }),
    });
    return handleResponse(res);
  },

  // ========== NEW LMS METHODS ==========

  // Get user's learning overview
  getMyLearning: async () => {
    const response = await fetch(`${BASE_URL}/progress/my-learning`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch learning data');
    return response.json();
  },

  // Get course progress
  getCourseProgress: async (courseId) => {
    const response = await fetch(`${BASE_URL}/progress/courses/${courseId}/progress`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch course progress');
    return response.json();
  },

  // Update video progress
  updateVideoProgress: async (courseId, lessonId, data) => {
    const response = await fetch(`${BASE_URL}/progress/courses/${courseId}/lessons/${lessonId}/video-progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update video progress');
    return response.json();
  },

  // Track material opened
  trackMaterialOpen: async (courseId, lessonId) => {
    const response = await fetch(`${BASE_URL}/progress/courses/${courseId}/lessons/${lessonId}/material-open`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to track material access');
    return response.json();
  },

  // Get lesson comments
  getComments: async (courseId, lessonId, page = 1, limit = 20) => {
    const response = await fetch(
      `${BASE_URL}/comments/courses/${courseId}/lessons/${lessonId}/comments?page=${page}&limit=${limit}`,
      { headers: getHeaders() }
    );
    console.log(response)
    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  },

  // Create comment
  createComment: async (courseId, lessonId, data) => {
    const response = await fetch(`${BASE_URL}/comments/courses/${courseId}/lessons/${lessonId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create comment');
    return response.json();
  },

  // Update comment
  updateComment: async (commentId, data) => {
    const response = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update comment');
    return response.json();
  },

  // Delete comment
  deleteComment: async (commentId) => {
    const response = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete comment');
    return response.json();
  },

  // Toggle like on comment
  toggleLike: async (commentId) => {
    const response = await fetch(`${BASE_URL}/comments/${commentId}/like`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to toggle like');
    return response.json();
  },

  // Mark question as resolved
  markResolved: async (commentId) => {
    const response = await fetch(`${BASE_URL}/comments/${commentId}/resolve`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to mark as resolved');
    return response.json();
  },

  // Get all certificates
  getCertificates: async () => {
    const response = await fetch(`${BASE_URL}/certificates`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch certificates');
    return response.json();
  },

  // Get certificate for a course
  getCertificateByCourse: async (courseId) => {
    const response = await fetch(`${BASE_URL}/certificates/courses/${courseId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch certificate');
    return response.json();
  },

  // Verify certificate (public)
  verifyCertificate: async (certificateId) => {
    const response = await fetch(`${BASE_URL}/certificates/verify/${certificateId}`);
    if (!response.ok) throw new Error('Failed to verify certificate');
    return response.json();
  },

  // Submit lead / email capture
  submitLead: async (email, name = '', source = 'landing_page') => {
    const res = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, name, source }),
    });
    return handleResponse(res);
  },

  // Submit Contact Us inquiry
  submitContactForm: async (data) => {
    const res = await fetch(`${BASE_URL}/leads/contact`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Dedicated Course Sales Page
  getCourseSalesPage: async (slugOrId) => {
    const res = await fetch(`${BASE_URL}/courses/sales/${slugOrId}`);
    return handleResponse(res);
  },

  // GST & Tax Reporting API
  getGstConfig: async () => {
    const res = await fetch(`${BASE_URL}/admin/gst/config`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  updateGstConfig: async (configData) => {
    const res = await fetch(`${BASE_URL}/admin/gst/config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(configData)
    });
    return handleResponse(res);
  },

  getGstReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/admin/gst/report?${query}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getInvoiceDetails: async (txnid) => {
    const res = await fetch(`${BASE_URL}/payment/invoice/${txnid}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getMyInvoices: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${BASE_URL}/payment/my-invoices?${query}` : `${BASE_URL}/payment/my-invoices`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  refundTransaction: async (txnId, refundData = {}) => {
    const res = await fetch(`${BASE_URL}/admin/transactions/${txnId}/refund`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(refundData)
    });
    return handleResponse(res);
  },

  adminUpdateCourse: async (id, courseData) => {
    const res = await fetch(`${BASE_URL}/courses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(courseData)
    });
    return handleResponse(res);
  },

  // Reviews & Ratings
  getCourseReviews: async (courseId) => {
    const res = await fetch(`${BASE_URL}/reviews/course/${courseId}`);
    return handleResponse(res);
  },

  createCourseReview: async (reviewData) => {
    const res = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reviewData)
    });
    return handleResponse(res);
  },

  // Secure Video Stream Token
  getVideoToken: async (courseId, videoUrl) => {
    const res = await fetch(`${BASE_URL}/courses/${courseId}/video-token`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ videoUrl })
    });
    return handleResponse(res);
  },

  // Live Event & Workshop Access
  getEventAccess: async (eventId) => {
    const res = await fetch(`${BASE_URL}/events/${eventId}/access`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getEventAttendees: async (eventId) => {
    const res = await fetch(`${BASE_URL}/events/${eventId}/attendees`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Software Products & AI Tools
  getAllSoftware: async () => {
    const res = await fetch(`${BASE_URL}/software`);
    return handleResponse(res);
  },

  getSoftwareById: async (id) => {
    const res = await fetch(`${BASE_URL}/software/${id}`);
    return handleResponse(res);
  },

  unlockSoftware: async (id) => {
    const res = await fetch(`${BASE_URL}/software/${id}/unlock`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // AI Services & Bot Automation
  getAllServices: async () => {
    const res = await fetch(`${BASE_URL}/services`);
    return handleResponse(res);
  },

  getServiceById: async (id) => {
    const res = await fetch(`${BASE_URL}/services/${id}`);
    return handleResponse(res);
  },

  submitServiceEnquiry: async (data) => {
    const res = await fetch(`${BASE_URL}/services/enquire`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  submitSoftwareEnquiry: async (data) => {
    const res = await fetch(`${BASE_URL}/software/enquire`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  }
};