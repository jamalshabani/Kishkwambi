// Configuration for API endpoints
// ⚠️ CHANGE BACKEND_URL HERE - This is the single source of truth for your backend URL
export const API_CONFIG = {
    // ========================================
    // 🔧 UPDATE THIS URL TO YOUR BACKEND SERVER
    // ========================================
    // For local development with mobile device/simulator, use your computer's IP address
    // For localhost testing, use 'http://localhost:3000'
    // For production, use your production domain
    BACKEND_URL: 'http://192.168.1.144:3000',
    //BACKEND_URL: 'https://www7-backend.kanzidata.com',
    
    // Alternative URLs for different environments
    LOCAL_URL: 'http://192.168.1.144:3000',
    //LOCAL_URL: 'https://www7-backend.kanzidata.com',

    PRODUCTION_URL: 'http://192.168.1.144:3000',
    //PRODUCTION_URL: 'https://www7-backend.kanzidata.com',
    
    // Auto-detect environment
    getBackendUrl: () => {
        // In development, use the network IP for mobile devices
        // Safe check for __DEV__ to avoid runtime errors
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            return API_CONFIG.LOCAL_URL;
        }
        // In production, use the production URL
        return API_CONFIG.PRODUCTION_URL;
    }
};

export default API_CONFIG;
