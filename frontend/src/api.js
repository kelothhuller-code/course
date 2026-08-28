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

  submitMockCallback: async (txnid, status) => {
    const res = await fetch(`${BASE_URL}/payment/mock-callback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ txnid, status }),
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
  }
};
