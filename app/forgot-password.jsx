import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from "../lib/tw";
import InputFieldWithNoLabel from '../components/common/InputFieldWithNoLabel';
import Button from '../components/common/Button';
import GridShape from '../components/login/GridShape';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        // Basic validation
        if (!email) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        // Simulate password reset process
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Here you would typically make an API call to send reset email
            console.log('Password reset request for:', email);
            setSuccess('Password reset instructions have been sent to your email!');
        } catch (err) {
            setError('Failed to send reset email. Please try again.');
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
                    {/* Forgot Password Card */}
                    <View style={cn('bg-white rounded-lg shadow-2xl p-8 border border-gray-200')}>
                        {/* Header */}
                        <View style={cn('mb-5')}>
                            <Text style={cn('text-xl font-semibold text-black mb-2')}>
                                Reset Password
                            </Text>
                            <Text style={cn('text-sm text-gray-500')}>
                                Enter your email to reset your password!
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
                                    placeholder="Enter your email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
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

                            {/* Success Message */}
                            {success && (
                                <View style={cn('bg-green-500 rounded-md py-2 px-2 mb-6')}>
                                    <Text style={cn('text-white text-center font-bold text-sm')}>
                                        {success}
                                    </Text>
                                </View>
                            )}

                            {/* Reset Password Button */}
                            <View style={cn('mb-6')}>
                                <Button
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                    size="md"
                                    className="w-full"
                                >
                                    {loading ? 'Sending...' : 'Reset Password'}
                                </Button>
                            </View>

                            {/* Back to Login Link */}
                            <View style={cn('items-start')}>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={cn('text-sm text-black')}>
                                        ← Back to Login
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

export default ForgotPasswordScreen;
