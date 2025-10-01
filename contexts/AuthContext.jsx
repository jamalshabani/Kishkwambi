import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/auth-final';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthState();
    }, []);

    const checkAuthState = async () => {
        try {
            const session = await auth.getSession();
            setUser(session);
        } catch (error) {
            console.error('Auth check error:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        setLoading(true);
        
        // Force loading to false after 5 seconds as a safety net
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 5000);
        
        try {
            const result = await auth.signIn(email, password);
            clearTimeout(timeoutId); // Clear timeout since we got a result
            
            if (result.success) {
                setUser(result.user);
                setLoading(false);
            } else {
                // Set loading to false on error as well
                setLoading(false);
            }
            return result;
        } catch (error) {
            clearTimeout(timeoutId); // Clear timeout since we got an error
            setLoading(false);
            return {
                success: false,
                error: 'Network error. Please check your connection and try again.'
            };
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            const result = await auth.signOut();
            if (result.success) {
                setUser(null);
                console.log('User logged out successfully');
            } else {
                console.log('Logout failed:', result.error);
            }
            return result;
        } catch (error) {
            console.log('Logout error:', error);
            return {
                success: false,
                error: 'Failed to sign out'
            };
        } finally {
            setLoading(false);
        }
    };

    const setLoadingState = (loadingState) => {
        setLoading(loadingState);
    };

    const value = {
        user,
        loading,
        signIn,
        signOut,
        setLoadingState,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
