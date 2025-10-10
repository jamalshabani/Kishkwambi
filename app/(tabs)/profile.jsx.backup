import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { cn } from '../../lib/tw';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, User, Eye, EyeOff } from 'lucide-react-native';

const Profile = () => {
    const { user, signOut, loading, changePassword } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showPasswordErrorModal, setShowPasswordErrorModal] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
    const [showPasswordSuccessModal, setShowPasswordSuccessModal] = useState(false);

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            return;
        }

        if (newPassword.length < 6) {
            setPasswordErrorMessage('New password must be at least 6 characters long');
            setShowPasswordErrorModal(true);
            return;
        }

        setPasswordLoading(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            
            if (result.success) {
                setShowPasswordSuccessModal(true);
                // Reset fields after successful change
                setCurrentPassword('');
                setNewPassword('');
                setShowCurrentPassword(false);
                setShowNewPassword(false);
            } else {
                setPasswordErrorMessage(result.error || 'Failed to change password');
                setShowPasswordErrorModal(true);
            }
        } catch (error) {
            setPasswordErrorMessage('An error occurred while changing password');
            setShowPasswordErrorModal(true);
            console.error('Password change error:', error);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleThemeToggle = () => {
        // Scale down animation
        Animated.sequence([
            Animated.timing(themeButtonScale, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(themeButtonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            })
        ]).start();

        // Rotation animation
        Animated.timing(themeIconRotation, {
            toValue: themeIconRotation._value + 180,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Toggle theme
        toggleTheme();
    };

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                    Profile
                </Text>

                {/* Theme Switcher */}
                <Animated.View
                    style={{
                        transform: [
                            { scale: themeButtonScale }
                        ]
                    }}
                >
                    <TouchableOpacity 
                        onPress={handleThemeToggle}
                        style={cn('p-2')}
                    >
                        {isDark ? (
                            <Sun size={24} color="#6B7280" />
                        ) : (
                            <Moon size={24} color="#6B7280" />
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Main Content */}
            <KeyboardAvoidingView 
                style={cn('flex-1')}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    style={cn('flex-1')}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={cn('p-6')}>
                    {/* User Information Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`)}>
                        {/* Username */}
                        <View style={cn(`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Full name
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.name || "Simba Terminals"}
                            </Text>
                        </View>

                        {/* Email */}
                        <View style={cn(`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Email
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.email || "info@sscs.co.tz"}
                            </Text>
                        </View>

                        {/* Role */}
                        <View style={cn(`px-6 py-3 ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Role
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.role || "Admin"}
                            </Text>
                        </View>
                    </View>

                    {/* Password Change Section */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mt-4`)}>
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-black'} mb-4`)}>
                            Change Password
                        </Text>
                        
                        {/* Current Password */}
                        <View style={cn('mb-4')}>
                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-black'} mb-2`)}>
                                Current Password <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <View style={cn('rounded-lg overflow-hidden')}>
                                <LinearGradient
                                    colors={focusedField === 'currentPassword' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-[2px] rounded-lg')}
                                >
                                    <View style={cn(`flex-row items-center rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} ${focusedField === 'currentPassword' ? '' : 'border'} ${focusedField === 'currentPassword' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}>
                                        <TextInput
                                            style={cn(`flex-1 px-3 py-3 ${isDark ? 'text-white' : 'text-black'}`)}
                                            placeholder="Current Password"
                                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            value={currentPassword}
                                            onChangeText={setCurrentPassword}
                                            onFocus={() => setFocusedField('currentPassword')}
                                            onBlur={() => setFocusedField(null)}
                                            secureTextEntry={!showCurrentPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                            style={cn('px-3 py-3')}
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            ) : (
                                                <Eye size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={cn('mb-4')}>
                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-black'} mb-2`)}>
                                New Password <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <View style={cn('rounded-lg overflow-hidden')}>
                                <LinearGradient
                                    colors={focusedField === 'newPassword' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-[2px] rounded-lg')}
                                >
                                    <View style={cn(`flex-row items-center rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} ${focusedField === 'newPassword' ? '' : 'border'} ${focusedField === 'newPassword' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}>
                                        <TextInput
                                            style={cn(`flex-1 px-3 py-3 ${isDark ? 'text-white' : 'text-black'}`)}
                                            placeholder="New Password"
                                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            onFocus={() => setFocusedField('newPassword')}
                                            onBlur={() => setFocusedField(null)}
                                            secureTextEntry={!showNewPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowNewPassword(!showNewPassword)}
                                            style={cn('px-3 py-3')}
                                        >
                                            {showNewPassword ? (
                                                <EyeOff size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            ) : (
                                                <Eye size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Change Password Button */}
                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={passwordLoading || !currentPassword || !newPassword}
                            style={cn(`w-full rounded-lg overflow-hidden ${(passwordLoading || !currentPassword || !newPassword) ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('px-6 py-4 items-center justify-center')}
                            >
                                <Text style={cn('text-white font-semibold text-base')}>
                                    {passwordLoading ? 'Changing...' : 'Change Password'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>


                    {/* Logout Button */}
                    <View style={cn('mt-6')}>
                        <TouchableOpacity
                            onPress={async () => {
                                try {
                                    const result = await signOut();
                                    if (result.success) {
                                        console.log('Logout successful');
                                    } else {
                                        console.log('Logout failed:', result.error);
                                    }
                                } catch (error) {
                                    console.log('Logout error:', error);
                                }
                            }}
                            disabled={loading}
                            style={cn(`w-full rounded-lg overflow-hidden ${loading ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('px-6 py-4 items-center justify-center')}
                            >
                                <Text style={cn('text-white font-semibold text-base')}>
                                    {loading ? 'Logging out...' : 'Logout'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    </View>

                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Password Error Modal */}
            <Modal
                visible={showPasswordErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordErrorModal(false)}
            >
                <View style={cn('flex-1 bg-black/50 items-center justify-center px-6')}>
                    <View style={cn('bg-white rounded-2xl p-8 items-center max-w-sm w-full relative')}>
                        {/* Red Error Icon */}
                        <View style={cn('absolute -top-8 w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-lg')}>
                            <Text style={cn('text-white text-2xl font-bold')}>✕</Text>
                        </View>
                        
                        {/* Error Message */}
                        <Text style={cn('text-black text-lg font-semibold text-center mt-4 mb-2')}>
                            Password Change Failed
                        </Text>
                        
                        {/* Additional Message */}
                        <Text style={cn('text-gray-600 text-sm text-center mb-6 font-semibold')}>
                            {passwordErrorMessage}
                        </Text>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowPasswordErrorModal(false)}
                            style={cn('bg-red-500 px-8 py-3 rounded-lg w-full')}
                        >
                            <Text style={cn('text-white text-lg font-semibold text-center')}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Password Success Modal */}
            <Modal
                visible={showPasswordSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordSuccessModal(false)}
            >
                <View style={cn('flex-1 bg-black/50 items-center justify-center px-6')}>
                    <View style={cn('bg-white rounded-2xl p-8 items-center max-w-sm w-full relative')}>
                        {/* Green Success Icon */}
                        <View style={cn('absolute -top-8 w-16 h-16 bg-green-500 rounded-full items-center justify-center shadow-lg')}>
                            <Text style={cn('text-white text-2xl font-bold')}>✓</Text>
                        </View>
                        
                        {/* Success Message */}
                        <Text style={cn('text-black text-lg font-semibold text-center mt-4 mb-2')}>
                            Password Changed Successfully
                        </Text>
                        
                        {/* Additional Message */}
                        <Text style={cn('text-gray-600 text-sm text-center mb-6 font-semibold')}>
                            Your password has been updated successfully
                        </Text>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowPasswordSuccessModal(false)}
                            style={cn('bg-green-500 px-8 py-3 rounded-lg w-full')}
                        >
                            <Text style={cn('text-white text-lg font-semibold text-center')}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Profile;
