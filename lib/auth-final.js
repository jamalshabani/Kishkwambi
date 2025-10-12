// React Native authentication using backend API
import { API_CONFIG } from './config';

const BACKEND_URL = API_CONFIG.BACKEND_URL;

// Simple in-memory session storage (will be lost on app restart)
let currentSession = null;

export const auth = {
    // Sign in with email and password
    async signIn(email, password) {
        try {
            // Simulate API call delay for better UX
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();

            if (data.success) {
                currentSession = data.user;
                return {
                    success: true,
                    user: data.user
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Unable to connect to server. Please try again later.'
            };
        }
    },

    // Sign out
    async signOut() {
        try {
            currentSession = null;
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to Logout'
            };
        }
    },

    // Get current session
    async getSession() {
        try {
            return currentSession;
        } catch (error) {
            return null;
        }
    },

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            if (!currentSession) {
                return {
                    success: false,
                    error: 'User not Authenticated'
                };
            }

            const response = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userId: currentSession.id,
                    currentPassword, 
                    newPassword 
                }),
            });
            
            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    message: 'Password Changed Successfully'
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Unable to Connect to Server. Please try again later.'
            };
        }
    },

    // Sign in with PIN
    async signInWithPin(deviceId, pin) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deviceId, pin }),
            });
            
            const data = await response.json();

            if (data.success) {
                currentSession = data.user;
                return {
                    success: true,
                    user: data.user
                };
            } else {
                return {
                    success: false,
                    error: data.error,
                    attemptsRemaining: data.attemptsRemaining,
                    isLockedOut: response.status === 429,
                    lockoutMinutes: data.lockoutMinutes || data.remainingMinutes
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Unable to Connect to Server. Please try again later.'
            };
        }
    },

    // Check if PIN is setup for device
    async checkPinSetup(userId, deviceId) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/check-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, deviceId }),
            });
            
            const data = await response.json();

            return {
                success: true,
                hasPinSetup: data.hasPinSetup || false
            };
        } catch (error) {
            return {
                success: false,
                hasPinSetup: false
            };
        }
    },

    // Setup PIN for device
    async setupPin(userId, deviceId, pin, deviceName) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/setup-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, deviceId, pin, deviceName }),
            });
            
            const data = await response.json();

            return {
                success: data.success,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            return {
                success: false,
                error: 'Unable to Connect to Server. Please try again later.'
            };
        }
    },

    // Remove PIN for device
    async removePin(userId, deviceId) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/remove-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, deviceId }),
            });
            
            const data = await response.json();

            return {
                success: data.success,
                message: data.message,
                error: data.error
            };
        } catch (error) {
            return {
                success: false,
                error: 'Unable to Connect to Server. Please try again later.'
            };
        }
    }
};
