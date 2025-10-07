import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '../../lib/tw';
import Button from '../common/Button';
import GridShape from './GridShape';
import { useAuth } from '../../contexts/AuthContext';

// Global error store that persists across re-renders
let globalError = '';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [forceRender, setForceRender] = useState(0);
    const [focusedField, setFocusedField] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, loading, isAuthenticated, setLoadingState } = useAuth();
    const errorRef = useRef('');

    // Redirect if already logged in
    React.useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(tabs)/dashboard');
        }
    }, [isAuthenticated]);


    // Auto-dismiss error after 2 seconds
    React.useEffect(() => {
        if (error || globalError) {
            const timer = setTimeout(() => {
                setError('');
                globalError = '';
                errorRef.current = '';
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [error, globalError]);


    const handleLogin = async () => {
        setError('');
        globalError = '';
        errorRef.current = '';

        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        const result = await signIn(email, password);

        if (result.success) {
            // Clear any previous errors
            setError('');
            globalError = '';
            errorRef.current = '';
        } else {
            // Handle specific error messages
            switch (result.error) {
                case 'Email and password are required':
                    const errorMsg1 = 'Please fill in all fields';
                    globalError = errorMsg1;
                    setError(errorMsg1);
                    errorRef.current = errorMsg1;
                    setForceRender(prev => prev + 1);
                    break;
                case 'Invalid email address':
                    const errorMsg2 = 'No account found with this email address';
                    globalError = errorMsg2;
                    setError(errorMsg2);
                    errorRef.current = errorMsg2;
                    setForceRender(prev => prev + 1);
                    break;
                case 'Account is deactivated. Please contact administrator.':
                    const errorMsg3 = 'Your account has been deactivated. Please contact administrator.';
                    globalError = errorMsg3;
                    setError(errorMsg3);
                    errorRef.current = errorMsg3;
                    setForceRender(prev => prev + 1);
                    break;
                case 'Invalid password':
                    const errorMsg4 = 'Incorrect password. Please try again.';
                    globalError = errorMsg4;
                    setError(errorMsg4);
                    errorRef.current = errorMsg4;
                    setForceRender(prev => prev + 1);
                    break;
                case 'Failed to fetch users from database':
                    const errorMsg5 = 'Unable to connect to server. Please try again later.';
                    globalError = errorMsg5;
                    setError(errorMsg5);
                    errorRef.current = errorMsg5;
                    setForceRender(prev => prev + 1);
                    break;
                case 'Unable to connect to server. Please try again later.':
                    const errorMsg6 = 'Unable to connect to server. Please check your internet connection and try again.';
                    globalError = errorMsg6;
                    setError(errorMsg6);
                    errorRef.current = errorMsg6;
                    setForceRender(prev => prev + 1);
                    break;
                default:
                    const errorMsg7 = result.error || 'Login failed. Please try again.';
                    globalError = errorMsg7;
                    setError(errorMsg7);
                    errorRef.current = errorMsg7;
                    setForceRender(prev => prev + 1);
            }
        }

        // Loading state is managed by AuthContext
    };

    return (
        <ScrollView style={cn('flex-1')} contentContainerStyle={{ flexGrow: 1 }}>
            {/* Background with Grid Pattern */}
            <LinearGradient
                colors={['#FBBF24', '#000000', '#FBBF24']} // yellow-400, black, yellow-400
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={cn('absolute inset-0')}
            >
                <GridShape />
            </LinearGradient>


            <View style={cn('flex-1 justify-center items-center px-6')}>
                <View style={cn('w-full max-w-md')}>
                    {/* Login Card */}
                    <View style={cn('bg-white rounded-lg shadow-2xl p-8 border border-gray-200')}>
                        {/* Header */}
                        <View style={cn('mb-5')}>
                            <Text style={cn('text-xl font-semibold text-gray-800 mb-2')}>
                                Login
                            </Text>
                            <Text style={cn('text-sm text-gray-500')}>
                                Enter your email and password to sign in!
                            </Text>
                        </View>

                        {/* Divider */}
                        <View style={cn('border-t border-gray-200 mb-6')} />

                        {/* Form */}
                        <View>
                            {/* Email Field */}
                            <View style={cn('mb-6')}>
                                <Text style={cn('text-sm font-bold text-gray-800 mb-2')}>
                                    Email <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <View style={cn('rounded-lg overflow-hidden')}>
                                    <LinearGradient
                                        colors={focusedField === 'email' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-[2px] rounded-lg')}
                                    >
                                        <TextInput
                                            style={cn(`px-3 py-3 rounded-lg bg-gray-50 text-black ${focusedField === 'email' ? '' : 'border'} ${focusedField === 'email' ? '' : 'border-gray-300'}`)}
                                            placeholder="Email"
                                            placeholderTextColor="#6B7280"
                                            value={email}
                                            onChangeText={setEmail}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* Password Field */}
                            <View style={cn('mb-6')}>
                                <Text style={cn('text-sm font-bold text-gray-800 mb-2')}>
                                    Password <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <View style={cn('rounded-lg overflow-hidden')}>
                                    <LinearGradient
                                        colors={focusedField === 'password' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-[2px] rounded-lg')}
                                    >
                                        <View style={cn('relative')}>
                                            <TextInput
                                                style={cn(`px-3 py-3 pr-12 rounded-lg bg-gray-50 text-black ${focusedField === 'password' ? '' : 'border'} ${focusedField === 'password' ? '' : 'border-gray-300'}`)}
                                                placeholder="Password"
                                                placeholderTextColor="#6B7280"
                                                value={password}
                                                onChangeText={setPassword}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                secureTextEntry={!showPassword}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={cn('absolute right-3 top-1/2 -translate-y-1/2 p-1')}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={20} color="#6B7280" />
                                                ) : (
                                                    <Eye size={20} color="#6B7280" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                </View>
                            </View>


                            {/* Error Message */}
                            {(error || errorRef.current || globalError) && (
                                <View style={cn('bg-red-500 rounded-md py-3 px-4 mb-6')}>
                                    <Text style={cn('text-white text-center font-bold text-sm')}>
                                        {error || errorRef.current || globalError}
                                    </Text>
                                </View>
                            )}


                            {/* Login Button */}
                            <View style={cn('mb-6')}>
                                <Button
                                    onPress={handleLogin}
                                    disabled={loading}
                                    size="md"
                                    className="w-full"
                                >
                                    {loading ? (
                                        <View style={cn('flex-row items-center justify-center')}>
                                            <ActivityIndicator 
                                                size="small" 
                                                color="#FFFFFF" 
                                                style={cn('mr-2')}
                                            />
                                            <Text style={cn('text-white font-semibold')}>
                                                Submitting...
                                            </Text>
                                        </View>
                                    ) : (
                                        'Login'
                                    )}
                                </Button>
                            </View>

                            {/* Direct Dashboard Button */}
                            <View style={cn('items-center mb-4')}>
                                <TouchableOpacity 
                                    onPress={async () => {
                                        // Auto-login with admin credentials
                                        const result = await signIn('admin@a.com', 'test1234');
                                        if (result.success) {
                                            router.replace('/(tabs)/dashboard');
                                        }
                                    }}
                                    style={cn('px-6 py-3 bg-gray-100 rounded-lg border border-gray-300')}
                                >
                                    <Text style={cn('text-sm font-medium text-gray-700')}>
                                        Go to Dashboard
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default LoginForm;