// Configuration for API endpoints
export const API_CONFIG = {
    // Backend server URL - update this to your computer's IP address
    // For local development with mobile device/simulator
    BACKEND_URL: 'http://192.168.1.144:3001',
    
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
