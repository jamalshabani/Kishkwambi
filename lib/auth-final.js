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
                error: 'Failed to sign out'
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
                    error: 'User not authenticated'
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
                    message: 'Password changed successfully'
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
    }
};
