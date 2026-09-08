const BASE_URL = 'http://localhost:5000/api';

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

  // Courses
  getCourses: async () => {
    const res = await fetch(`${BASE_URL}/courses`, {
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
  initiatePayment: async (itemId, itemType) => {
    const res = await fetch(`${BASE_URL}/payment/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ itemId, itemType }),
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

  // Admin: User Management
  adminGetUsers: async () => {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  adminGetTransactions: async () => {
    const res = await fetch(`${BASE_URL}/admin/transactions`, {
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

  // Get all courses (alias for getCourses)
  getAllCourses: async () => {
    console.log('dfdf')
    const response = await fetch(`${BASE_URL}/courses`, {
      method: 'GET',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  }
};