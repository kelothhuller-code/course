// Authentication Module
window.AuthModule = {
    isAuthenticated() {
        return !!API.token;
    },

    async login(email, password) {
        try {
            const data = await API.login(email, password);
            if (data.token) {
                API.setToken(data.token);
                App.navigateTo('dashboard');
                return { success: true };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout() {
        API.setToken(null);
        App.navigateTo('login');
    },

    getCurrentUser() {
        // Could decode JWT here if needed
        return null;
    }
};