// Configuration for API endpoints
// ⚠️ CHANGE BACKEND_URL HERE - This is the single source of truth for your backend URL
export const API_CONFIG = {
    // ========================================
    // 🔧 UPDATE THIS URL TO YOUR BACKEND SERVER
    // ========================================
    // For local development with mobile device/simulator, use your computer's IP address
    // For localhost testing, use 'http://localhost:3001'
    // For production, use your production domain
    BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.12.132:3001',
    
    // Alternative URLs for different environments
    LOCAL_URL: 'http://localhost:3001',
    PRODUCTION_URL: 'https://your-production-domain.com',
    
    // Auto-detect environment
    getBackendUrl: () => {
        // In development, use the network IP for mobile devices
        // Safe check for __DEV__ to avoid runtime errors
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            return API_CONFIG.BACKEND_URL;
        }
        // In production, use the production URL
        return API_CONFIG.PRODUCTION_URL;
    }
};

export default API_CONFIG;
