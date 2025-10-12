import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyRound } from 'lucide-react-native';
import LoginForm from '../components/login/LoginForm';
import PinLoginScreen from '../components/login/PinLoginScreen';
import PinSetupScreen from '../components/login/PinSetupScreen';
import GridShape from '../components/login/GridShape';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceId } from '../lib/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../lib/config';
import { cn } from '../lib/tw';

export default function HomeScreen() {
    const [activeTab, setActiveTab] = useState('email'); // 'email' or 'pin'
    const [hasPinSetup, setHasPinSetup] = useState(false);
    const [checkingPin, setCheckingPin] = useState(true);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const { isAuthenticated, setUserDirectly } = useAuth();

    useEffect(() => {
        checkPinAvailability();
    }, []);

    useEffect(() => {
        // Only redirect if authenticated AND not showing PIN setup
        if (isAuthenticated && !showPinSetup) {
            router.replace('/(tabs)/dashboard');
        }
    }, [isAuthenticated, showPinSetup]);

    const checkPinAvailability = async () => {
        try {
            // Check if PIN was previously enabled
            const pinEnabled = await AsyncStorage.getItem('PIN_ENABLED');
            
            if (pinEnabled === 'true') {
                setHasPinSetup(true);
                setActiveTab('pin'); // Default to PIN tab if available
            } else {
            }
        } catch (error) {
        } finally {
            setCheckingPin(false);
        }
    };

    const handlePinLoginSuccess = (user) => {
        // User logged in with PIN, set user directly (already verified on backend)
        setUserDirectly(user);
        router.replace('/(tabs)/dashboard');
    };

    const handleEmailLoginSuccess = async (user) => {
        // Check if PIN is already setup for this device
        const deviceId = await getDeviceId();
        
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/auth/check-pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user.id, deviceId }),
        });
        
        const data = await response.json();
        
        if (!data.hasPinSetup) {
            // Show PIN setup screen (don't set user in auth context yet)
            setCurrentUser(user);
            setShowPinSetup(true);
        } else {
            // PIN already setup, set user and go to dashboard
            setUserDirectly(user);
            router.replace('/(tabs)/dashboard');
        }
    };

    const handlePinSetupComplete = () => {
        // PIN setup complete, now set user in auth context and navigate to dashboard
        if (currentUser) {
            setUserDirectly(currentUser);
        }
        setShowPinSetup(false);
        setHasPinSetup(true);
        router.replace('/(tabs)/dashboard');
    };

    if (checkingPin) {
        return (
            <View style={cn('flex-1 justify-center items-center bg-yellow-400')}>
                <ActivityIndicator size="large" color="#000000" />
            </View>
        );
    }

    // Show PIN setup screen if needed
    if (showPinSetup && currentUser) {
        return <PinSetupScreen user={currentUser} onComplete={handlePinSetupComplete} forcedSetup={true} />;
    }

    return (
        <ScrollView style={cn('flex-1')} contentContainerStyle={{ flexGrow: 1 }}>
            {/* Background with Grid Pattern */}
            <LinearGradient
                colors={['#FBBF24', '#000000', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={cn('absolute inset-0')}
            >
                <GridShape />
            </LinearGradient>

            <View style={cn('flex-1 justify-center items-center px-6 py-8')}>
                <View style={cn('w-full max-w-md')}>
                    {/* Login Card with Tabs */}
                    <View style={cn('bg-white rounded-3xl shadow-2xl overflow-hidden')}>
                        {/* Tabs Header - Always show tabs */}
                        <View style={cn('flex-row bg-gray-50')}>
                            <TouchableOpacity
                                style={cn('flex-1 py-4 flex-row items-center justify-center relative')}
                                onPress={() => setActiveTab('email')}
                            >
                                <Text style={cn(`font-semibold ${activeTab === 'email' ? 'text-black' : 'text-gray-400'}`)}>
                                    EMAIL
                                </Text>
                                {activeTab === 'email' && (
                                    <LinearGradient
                                        colors={['#000000', '#F59E0B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('absolute bottom-0 left-0 right-0 h-1')}
                                    />
                                )}
                            </TouchableOpacity>
                            
                            <View style={cn('w-px bg-gray-200')} />
                            
                            <TouchableOpacity
                                style={cn(`flex-1 py-4 flex-row items-center justify-center relative ${!hasPinSetup ? 'opacity-50' : ''}`)}
                                onPress={() => setActiveTab('pin')}
                                disabled={!hasPinSetup}
                            >
                                <Text style={cn(`font-semibold ${activeTab === 'pin' ? 'text-black' : 'text-gray-400'}`)}>
                                    PIN
                                </Text>
                                {activeTab === 'pin' && (
                                    <LinearGradient
                                        colors={['#000000', '#F59E0B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('absolute bottom-0 left-0 right-0 h-1')}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        <View style={cn('p-8')}>
                            {activeTab === 'email' ? (
                                <LoginForm inlineMode={true} onLoginSuccess={handleEmailLoginSuccess} />
                            ) : hasPinSetup ? (
                                <PinLoginScreen 
                                    onSuccess={handlePinLoginSuccess}
                                    inlineMode={true}
                                />
                            ) : (
                                <View style={cn('py-8')}>
                                    <View style={cn('items-center mb-6')}>
                                        <View style={cn('w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4')}>
                                            <KeyRound size={40} color="#9CA3AF" />
                                        </View>
                                        <Text style={cn('text-xl font-bold text-gray-800 mb-2')}>
                                            PIN Not Set Up
                                        </Text>
                                        <Text style={cn('text-gray-600 text-center mb-6')}>
                                            Login with your email and password first to set up PIN
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setActiveTab('email')}
                                        style={cn('bg-black rounded-lg py-3 px-6')}
                                    >
                                        <Text style={cn('text-white text-center font-semibold')}>
                                            Go to Email Login
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
