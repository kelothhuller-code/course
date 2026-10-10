// API Module
window.API = {
    token: localStorage.getItem('adminToken') || null,

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('adminToken', token);
        } else {
            localStorage.removeItem('adminToken');
        }
    },

    async request(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            AuthModule.logout();
            throw new Error('Unauthorized');
        }

        return response;
    },

    async get(url) {
        const response = await this.request(url);
        return response.json();
    },

    async post(url, data) {
        const response = await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async put(url, data) {
        const response = await this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async patch(url, data) {
        const response = await this.request(url, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async delete(url) {
        const response = await this.request(url, {
            method: 'DELETE'
        });
        return response.json();
    },
    // Add these to your API module
getCourseStats(courseId) {
    return this.get(`/api/admin/courses/${courseId}/stats`);
},

getEventStats(eventId) {
    return this.get(`/api/admin/events/${eventId}/stats`);
},

getTutorialStats(tutorialId) {
    return this.get(`/api/admin/trials/${tutorialId}/stats`);
},
// Add these to your API module
getCourseAnalytics(courseId) {
    return this.get(`/api/admin/courses/${courseId}/analytics`);
},

getCourseComments(courseId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/admin/courses/${courseId}/comments?${params}`);
},

getEventAnalytics(eventId) {
    return this.get(`/api/admin/events/${eventId}/analytics`);
},

pinComment(commentId) {
    return this.patch(`/api/admin/comments/${commentId}/pin`, {});
},

resolveComment(commentId) {
    return this.patch(`/api/admin/comments/${commentId}/resolve`, {});
},

deleteCommentAdmin(commentId) {
    return this.delete(`/api/admin/comments/${commentId}`);
},

replyAsAdmin(courseId, commentId, text) {
    return this.post(`/api/admin/courses/${courseId}/comments/${commentId}/reply`, { text });
},broadcastEventEmail(eventId, payload) {
    return this.post(`/api/admin/events/${eventId}/broadcast`, payload);
},
    // Specific endpoints
    login(email, password) {
        return this.post('/api/auth/login', { email, password });
    },

    getDashboard() {
        return this.get('/api/admin/dashboard');
    },

    getCourses() {
        return this.get('/api/courses');
    },

    getCourseContent(courseId) {
        return this.get(`/api/admin/courses/${courseId}/content`);
    },

    getCourseStats(courseId) {
        return this.get(`/api/admin/courses/${courseId}/stats`);
    },

    getUsers() {
        return this.get('/api/admin/users');
    },

    getUser(userId) {
        return this.get(`/api/admin/users/${userId}`);
    },

    getReferrals() {
        return this.get('/api/admin/referrals');
    },

    settleAffiliate(userId, amount) {
        return this.post(`/api/admin/affiliates/${userId}/settle`, { amount });
    },

    updateCommentStatus(commentId, status) {
        return this.patch(`/api/admin/comments/${commentId}/status`, { status });
    },

    replyToComment(commentId, text) {
        return this.post(`/api/admin/comments/${commentId}/reply`, { text });
    },

    sendEmail({ recipientEmail, subject, message, isBroadcast }) {
        return this.post('/api/admin/send-email', { recipientEmail, subject, message, isBroadcast });
    },

    testSmtp(testEmail) {
        return this.post('/api/admin/test-smtp', { testEmail });
    }
};