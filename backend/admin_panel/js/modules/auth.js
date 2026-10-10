// Authentication Module
window.AuthModule = {
    isAuthenticated() {
        return !!API.token;
    },

    async login(email, password) {
        try {
            const data = await API.login(email, password);
            if (data && data.token) {
                if (data.role !== 'admin') {
                    return { success: false, message: 'Access Denied: You must be a Super Admin to access this control center.' };
                }
                API.setToken(data.token);
                App.navigateTo('dashboard');
                return { success: true };
            }
            return { success: false, message: data.message || 'Invalid email or password.' };
        } catch (error) {
            return { success: false, message: error.message || 'Server error occurred during authentication.' };
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