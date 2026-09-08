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
    }
};