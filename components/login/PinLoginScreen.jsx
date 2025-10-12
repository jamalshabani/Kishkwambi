import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { cn } from '../../lib/tw';
import GridShape from './GridShape';
import { API_CONFIG } from '../../lib/config';
import { getDeviceId } from '../../lib/deviceId';

const BACKEND_URL = API_CONFIG.BACKEND_URL;

const PinLoginScreen = ({ onSuccess, onBackToLogin, inlineMode = false }) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState(null);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutMinutes, setLockoutMinutes] = useState(0);
    
    const pinRefs = [useRef(), useRef(), useRef(), useRef()];
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    // Auto-focus first input on mount
    useEffect(() => {
        setTimeout(() => {
            pinRefs[0].current?.focus();
        }, 300);
    }, []);

    // Auto-dismiss error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handlePinChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) {
            return;
        }

        const currentPin = [...pin];
        currentPin[index] = value;
        setPin(currentPin);

        // Auto-focus next input
        if (value && index < 3) {
            pinRefs[index + 1].current?.focus();
        }

        // Auto-submit when PIN is complete
        if (index === 3 && value) {
            submitPin(currentPin.join(''));
        }
    };

    const handleKeyPress = (index, key) => {
        if (key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs[index - 1].current?.focus();
        }
    };

    const submitPin = async (pinValue) => {
        if (pinValue.length !== 4) {
            setError('Please enter a 4-digit PIN');
            return;
        }

        setLoading(true);
        try {
            const deviceId = await getDeviceId();

            const response = await fetch(`${BACKEND_URL}/api/auth/login-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceId,
                    pin: pinValue
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Reset lockout state
                setIsLockedOut(false);
                setAttemptsRemaining(null);
                
                // Call success callback with user data
                if (onSuccess) {
                    onSuccess(data.user);
                }
            } else {
                // Handle different error types
                if (response.status === 429) {
                    // Lockout error
                    setIsLockedOut(true);
                    setLockoutMinutes(data.lockoutMinutes || data.remainingMinutes || 0);
                    setError(data.error || 'Too many failed attempts');
                } else {
                    // Regular error with attempt tracking
                    setIsLockedOut(false);
                    setAttemptsRemaining(data.attemptsRemaining ?? null);
                    setError(data.error || 'Invalid PIN');
                }
                
                shake();
                // Clear PIN inputs
                setPin(['', '', '', '']);
                pinRefs[0].current?.focus();
            }
        } catch (error) {
            setError('Unable to connect to server. Please try again.');
            shake();
            // Clear PIN inputs
            setPin(['', '', '', '']);
            pinRefs[0].current?.focus();
        } finally {
            setLoading(false);
        }
    };

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const renderPinInputs = () => (
        <View style={cn('flex-row justify-center gap-4')}>
            {pin.map((digit, index) => (
                <Animated.View
                    key={index}
                    style={{
                        transform: [{ translateX: shakeAnimation }]
                    }}
                >
                    <LinearGradient
                        colors={digit ? ['#000000', '#F59E0B'] : ['#E5E7EB', '#E5E7EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={cn('w-16 h-16 rounded-2xl p-[2px]')}
                    >
                        <TextInput
                            ref={pinRefs[index]}
                            style={cn('w-full h-full rounded-2xl bg-white text-center text-2xl font-bold text-gray-800')}
                            maxLength={1}
                            keyboardType="number-pad"
                            value={digit}
                            onChangeText={(value) => handlePinChange(index, value)}
                            onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                            secureTextEntry={true}
                            editable={!loading}
                        />
                    </LinearGradient>
                </Animated.View>
            ))}
        </View>
    );

    // Inline mode (for tabbed interface)
    if (inlineMode) {
        return (
            <View>
                {/* Header */}
                <View style={cn('mb-6')}>
                    <Text style={cn('text-2xl font-bold text-gray-800 text-center mb-2')}>
                        Enter Your PIN
                    </Text>
                    <Text style={cn('text-sm text-gray-500 text-center')}>
                        Enter your 4-digit PIN to login
                    </Text>
                </View>

                {/* Divider */}
                <View style={cn('border-t border-gray-200 mb-8')} />

                {/* PIN Input */}
                <View style={cn('mb-8')}>
                    {renderPinInputs()}
                </View>

                {/* Error Message */}
                {error && (
                    <View style={cn(`${isLockedOut ? 'bg-orange-50' : 'bg-red-50'} rounded-lg p-4 mb-6`)}>
                        <View style={cn('flex-row items-center mb-2')}>
                            <AlertCircle size={20} color={isLockedOut ? "#F97316" : "#EF4444"} style={cn('mr-2')} />
                            <Text style={cn(`${isLockedOut ? 'text-orange-600' : 'text-red-600'} flex-1 text-sm font-bold`)}>
                                {isLockedOut ? '⏱️ Account Locked' : '❌ Invalid PIN'}
                            </Text>
                        </View>
                        <Text style={cn(`${isLockedOut ? 'text-orange-600' : 'text-red-600'} text-sm`)}>
                            {error}
                        </Text>
                        {!isLockedOut && attemptsRemaining !== null && attemptsRemaining > 0 && (
                            <View style={cn('mt-3 pt-3 border-t border-red-200')}>
                                <View style={cn('flex-row items-center')}>
                                    <View style={cn('flex-1')}>
                                        <View style={cn('h-2 bg-red-200 rounded-full overflow-hidden')}>
                                            <View 
                                                style={{
                                                    height: '100%',
                                                    width: `${(attemptsRemaining / 5) * 100}%`,
                                                    backgroundColor: '#EF4444'
                                                }}
                                            />
                                        </View>
                                    </View>
                                    <Text style={cn('text-red-600 text-xs font-bold ml-3')}>
                                        {attemptsRemaining}/{5}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Loading State */}
                {loading && (
                    <View style={cn('mb-6 flex-row justify-center')}>
                        <ActivityIndicator size="small" color="#000000" />
                        <Text style={cn('text-gray-500 text-sm ml-2')}>
                            Verifying PIN...
                        </Text>
                    </View>
                )}

                {/* Security Info */}
                {!error && !loading && (
                    <LinearGradient
                        colors={['#000000', '#F59E0B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={cn('rounded-lg p-3 mb-4')}
                    >
                        <Text style={cn('text-white text-xs text-center font-medium')}>
                            After 5 failed attempts, your account will be temporarily locked
                        </Text>
                    </LinearGradient>
                )}
            </View>
        );
    }

    // Full screen mode (standalone)
    return (
        <ScrollView style={cn('flex-1')} contentContainerStyle={{ flexGrow: 1 }}>
            <LinearGradient
                colors={['#FBBF24', '#000000', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={cn('absolute inset-0')}
            >
                <GridShape />
            </LinearGradient>

            <View style={cn('flex-1 justify-center items-center px-6')}>
                <View style={cn('w-full max-w-md')}>
                    <View style={cn('bg-white rounded-3xl shadow-2xl p-8')}>
                        {/* Header Icon */}
                        <View style={cn('items-center mb-6')}>
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('w-20 h-20 rounded-full items-center justify-center')}
                            >
                                {loading ? (
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                ) : (
                                    <Lock size={36} color="#FFFFFF" />
                                )}
                            </LinearGradient>
                        </View>

                        {/* Header */}
                        <View style={cn('mb-8')}>
                            <Text style={cn('text-2xl font-bold text-gray-800 text-center mb-2')}>
                                Enter Your PIN
                            </Text>
                            <Text style={cn('text-gray-600 text-center')}>
                                Enter your 4-digit PIN to login
                            </Text>
                        </View>

                        {/* PIN Input */}
                        <View style={cn('mb-8')}>
                            {renderPinInputs()}
                        </View>

                        {/* Error Message */}
                        {error && (
                            <View style={cn(`${isLockedOut ? 'bg-orange-50' : 'bg-red-50'} rounded-lg p-4 mb-6`)}>
                                <View style={cn('flex-row items-center mb-2')}>
                                    <AlertCircle size={20} color={isLockedOut ? "#F97316" : "#EF4444"} style={cn('mr-2')} />
                                    <Text style={cn(`${isLockedOut ? 'text-orange-600' : 'text-red-600'} flex-1 text-sm font-bold`)}>
                                        {isLockedOut ? '⏱️ Account Locked' : '❌ Invalid PIN'}
                                    </Text>
                                </View>
                                <Text style={cn(`${isLockedOut ? 'text-orange-600' : 'text-red-600'} text-sm`)}>
                                    {error}
                                </Text>
                                {!isLockedOut && attemptsRemaining !== null && attemptsRemaining > 0 && (
                                    <View style={cn('mt-3 pt-3 border-t border-red-200')}>
                                        <View style={cn('flex-row items-center')}>
                                    <View style={cn('flex-1')}>
                                        <View style={cn('h-2 bg-red-200 rounded-full overflow-hidden')}>
                                            <View 
                                                style={{
                                                    height: '100%',
                                                    width: `${(attemptsRemaining / 5) * 100}%`,
                                                    backgroundColor: '#EF4444'
                                                }}
                                            />
                                        </View>
                                    </View>
                                            <Text style={cn('text-red-600 text-xs font-bold ml-3')}>
                                                {attemptsRemaining}/{5}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <View style={cn('mb-6')}>
                                <Text style={cn('text-gray-500 text-sm text-center')}>
                                    Verifying PIN...
                                </Text>
                            </View>
                        )}

                        {/* Security Info */}
                        {!error && !loading && (
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('rounded-lg p-3 mb-6')}
                            >
                                <Text style={cn('text-white text-xs text-center font-medium')}>
                                    After 5 failed attempts, your account will be temporarily locked
                                </Text>
                            </LinearGradient>
                        )}

                        {/* Divider */}
                        <View style={cn('border-t border-gray-200 my-6')} />

                        {/* Back to Login Button */}
                        <TouchableOpacity 
                            onPress={onBackToLogin}
                            style={cn('flex-row items-center justify-center py-3')}
                            disabled={loading}
                        >
                            <ArrowLeft size={20} color="#6B7280" style={cn('mr-2')} />
                            <Text style={cn('text-gray-600 font-semibold')}>
                                Login with password
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Card */}
                    <View style={cn('mt-6 bg-white/90 rounded-2xl p-4')}>
                        <Text style={cn('text-gray-700 text-sm text-center')}>
                            🔒 Your PIN is securely encrypted and device-specific
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default PinLoginScreen;

