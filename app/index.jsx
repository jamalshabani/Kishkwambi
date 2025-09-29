import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import LoginForm from '../components/login/LoginForm';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
    const { isAuthenticated, loading } = useAuth();

    // No redirect - stay on login screen even when authenticated

    return <LoginForm />;
}
