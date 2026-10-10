// Helper functions
window.Helpers = {
    getEmbedUrl(url) {
        if (!url) return null;
        if (url.includes('youtube.com/watch?v=')) {
            return `https://www.youtube.com/embed/${url.split('v=')[1]?.split('&')[0]}`;
        }
        if (url.includes('youtu.be/')) {
            return `https://www.youtube.com/embed/${url.split('youtu.be/')[1]?.split('?')[0]}`;
        }
        if (url.includes('drive.google.com')) {
            return url.replace('/view', '/preview');
        }
        return url;
    },

    formatDate(date) {
        return new Date(date).toLocaleDateString();
    },

    formatDateTime(date) {
        return new Date(date).toLocaleString();
    },

    extractCourses(data) {
        if (Array.isArray(data)) return data;
        if (data?.courses && Array.isArray(data.courses)) return data.courses;
        if (data?.data && Array.isArray(data.data)) return data.data;
        
        // Try to find any array property
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        return possibleArrays.length > 0 ? possibleArrays[0] : [];
    },

    safeString(str, fallback = '') {
        return str || fallback;
    },

    truncate(str, length = 80) {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    },

    getInitials(name) {
        return name?.substring(0, 2).toUpperCase() || 'U';
    }
};