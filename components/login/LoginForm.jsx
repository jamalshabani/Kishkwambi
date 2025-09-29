import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import InputFieldWithNoLabel from '../common/InputFieldWithNoLabel';
import Button from '../common/Button';
import GridShape from './GridShape';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        // Simulate login process
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Here you would typically make an API call to authenticate
            console.log('Login attempt:', { email, password });
            // For now, just show success
            setError('Login successful! (Demo)');
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
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
                                <InputFieldWithNoLabel
                                    placeholder="Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Password Field */}
                            <View style={cn('mb-6')}>
                                <Text style={cn('text-sm font-bold text-gray-800 mb-2')}>
                                    Password <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <InputFieldWithNoLabel
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            {/* Error Message */}
                            {error && (
                                <View style={cn('bg-red-500 rounded-md py-2 px-2 mb-6')}>
                                    <Text style={cn('text-white text-center font-bold text-sm')}>
                                        {error}
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
                                    {loading ? 'Submitting...' : 'Login'}
                                </Button>
                            </View>

                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default LoginForm;