import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, TextInput } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Check, AlertCircle } from 'lucide-react-native';
import { cn } from '../../lib/tw';
import Button from '../common/Button';
import GridShape from './GridShape';
import { API_CONFIG } from '../../lib/config';
import { getDeviceId, getDeviceName } from '../../lib/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = API_CONFIG.BACKEND_URL;

const PinSetupScreen = ({ user, onComplete, forcedSetup = false }) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [step, setStep] = useState('enter'); // 'enter' or 'confirm'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const pinRefs = [useRef(), useRef(), useRef(), useRef()];
    const confirmRefs = [useRef(), useRef(), useRef(), useRef()];
    
    const shakeAnimation = useRef(new Animated.Value(0)).current;
    const successAnimation = useRef(new Animated.Value(0)).current;

    // Auto-dismiss error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handlePinChange = (index, value, isConfirm = false) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) {
            return;
        }

        const currentPin = isConfirm ? [...confirmPin] : [...pin];
        const refs = isConfirm ? confirmRefs : pinRefs;
        
        currentPin[index] = value;
        
        if (isConfirm) {
            setConfirmPin(currentPin);
        } else {
            setPin(currentPin);
        }

        // Auto-focus next input
        if (value && index < 3) {
            refs[index + 1].current?.focus();
        }

        // Check if PIN is complete
        if (index === 3 && value) {
            if (isConfirm) {
                // Verify and submit PIN
                verifyAndSubmitPin(currentPin.join(''));
            } else {
                // Move to confirm step
                setTimeout(() => {
                    setStep('confirm');
                    confirmRefs[0].current?.focus();
                }, 300);
            }
        }
    };

    const handleKeyPress = (index, key, isConfirm = false) => {
        const currentPin = isConfirm ? confirmPin : pin;
        const refs = isConfirm ? confirmRefs : pinRefs;

        if (key === 'Backspace' && !currentPin[index] && index > 0) {
            refs[index - 1].current?.focus();
        }
    };

    const verifyAndSubmitPin = async (confirmedPin) => {
        const enteredPin = pin.join('');
        
        if (confirmedPin !== enteredPin) {
            setError('PINs do not match. Please try again.');
            shake();
            // Reset to step 1
            setTimeout(() => {
                setPin(['', '', '', '']);
                setConfirmPin(['', '', '', '']);
                setStep('enter');
                pinRefs[0].current?.focus();
            }, 1000);
            return;
        }

        // Setup PIN
        await setupPin(enteredPin);
    };

    const setupPin = async (pinValue) => {
        setLoading(true);
        try {
            const deviceId = await getDeviceId();
            const deviceName = await getDeviceName();

            const response = await fetch(`${BACKEND_URL}/api/auth/setup-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    deviceId,
                    pin: pinValue,
                    deviceName
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Store PIN enabled flag in AsyncStorage
                await AsyncStorage.setItem('PIN_ENABLED', 'true');
                
                setSuccess(true);
                playSuccessAnimation();
                
                setTimeout(() => {
                    if (onComplete) {
                        onComplete();
                    } else {
                        router.replace('/(tabs)/dashboard');
                    }
                }, 2000);
            } else {
                setError(data.error || 'Failed to setup PIN');
                shake();
            }
        } catch (error) {
            setError('Unable to connect to server. Please try again.');
            shake();
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

    const playSuccessAnimation = () => {
        Animated.spring(successAnimation, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    };

    const skipSetup = () => {
        if (onComplete) {
            onComplete();
        } else {
            router.replace('/(tabs)/dashboard');
        }
    };

    const renderPinInputs = (pinArray, refs, isConfirm = false) => (
        <View style={cn('flex-row justify-center gap-4')}>
            {pinArray.map((digit, index) => (
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
                            ref={refs[index]}
                            style={cn('w-full h-full rounded-2xl bg-white text-center text-2xl font-bold text-gray-800')}
                            maxLength={1}
                            keyboardType="number-pad"
                            value={digit}
                            onChangeText={(value) => handlePinChange(index, value, isConfirm)}
                            onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key, isConfirm)}
                            secureTextEntry={true}
                            editable={!loading && !success}
                        />
                    </LinearGradient>
                </Animated.View>
            ))}
        </View>
    );

    if (success) {
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
                    <Animated.View
                        style={[
                            cn('bg-white rounded-3xl p-8 items-center shadow-2xl'),
                            {
                                transform: [
                                    { scale: successAnimation },
                                ]
                            }
                        ]}
                    >
                        <View style={cn('w-24 h-24 rounded-full bg-green-500 items-center justify-center mb-6')}>
                            <Check size={48} color="#FFFFFF" strokeWidth={3} />
                        </View>
                        <Text style={cn('text-2xl font-bold text-gray-800 mb-2')}>
                            PIN Setup Complete!
                        </Text>
                        <Text style={cn('text-gray-600 text-center')}>
                            You can now use your PIN for quick login
                        </Text>
                    </Animated.View>
                </View>
            </ScrollView>
        );
    }

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
                                <Lock size={36} color="#FFFFFF" />
                            </LinearGradient>
                        </View>

                        {/* Header */}
                        <View style={cn('mb-8')}>
                            <Text style={cn('text-2xl font-bold text-gray-800 text-center mb-2')}>
                                {step === 'enter' ? 'Setup Your PIN' : 'Confirm Your PIN'}
                            </Text>
                            <Text style={cn('text-gray-600 text-center')}>
                                {step === 'enter' 
                                    ? 'Create a 4-digit PIN for quick login'
                                    : 'Enter your PIN again to confirm'
                                }
                            </Text>
                        </View>

                        {/* PIN Input */}
                        <View style={cn('mb-8')}>
                            {step === 'enter' ? renderPinInputs(pin, pinRefs) : renderPinInputs(confirmPin, confirmRefs, true)}
                        </View>

                        {/* Error Message */}
                        {error && (
                            <View style={cn('bg-red-50 rounded-lg p-4 mb-6 flex-row items-center')}>
                                <AlertCircle size={20} color="#EF4444" style={cn('mr-2')} />
                                <Text style={cn('text-red-600 flex-1 text-sm font-medium')}>
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* Instructions */}
                        <View style={cn('mb-6')}>
                            <Text style={cn('text-gray-500 text-sm text-center')}>
                                {step === 'enter' 
                                    ? 'Choose a PIN that you can easily remember'
                                    : 'Make sure both PINs match'
                                }
                            </Text>
                        </View>

                        {/* Skip Button - Only show if not forced */}
                        {!forcedSetup && (
                            <TouchableOpacity 
                                onPress={skipSetup}
                                style={cn('py-3')}
                                disabled={loading}
                            >
                                <Text style={cn('text-gray-600 text-center font-semibold')}>
                                    Skip for now
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Forced setup message */}
                        {forcedSetup && (
                            <View style={cn('bg-yellow-50 rounded-lg p-3')}>
                                <Text style={cn('text-yellow-700 text-xs text-center font-medium')}>
                                    ⚠️ PIN setup is required for secure access
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Info Card */}
                    <View style={cn('mt-6 bg-white/90 rounded-2xl p-4')}>
                        <Text style={cn('text-gray-700 text-sm text-center')}>
                            💡 Your PIN is device-specific and securely encrypted
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default PinSetupScreen;

