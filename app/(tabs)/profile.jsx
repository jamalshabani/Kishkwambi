import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { cn } from '../../lib/tw';
import Button from '../../components/common/Button';
import InputFieldWithNoLabel from '../../components/common/InputFieldWithNoLabel';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, User } from 'lucide-react-native';

const Profile = () => {
    const { user, signOut, loading } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            return;
        }

        setPasswordLoading(true);
        try {
            // Simulate password change API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('Password change request:', { currentPassword, newPassword });
            // Reset fields after successful change
            setCurrentPassword('');
            setNewPassword('');
        } catch (error) {
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
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
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
                            { scale: themeButtonScale },
                            { rotate: themeIconRotation.interpolate({
                                inputRange: [0, 360],
                                outputRange: ['0deg', '360deg']
                            })}
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
            <View style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <View style={cn('p-6')}>
                    {/* User Information Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`)}>
                        {/* Username */}
                        <View style={cn(`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Full name
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.name || "Laura Rivas"}
                            </Text>
                        </View>

                        {/* Email */}
                        <View style={cn(`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Email
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.email || "laura@gmail.com"}
                            </Text>
                        </View>

                        {/* Role */}
                        <View style={cn(`px-6 py-3 ${isDark ? 'border-gray-700' : 'border-gray-100'} flex-row items-center justify-between`)}>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                Role
                            </Text>
                            <Text style={cn(`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-black'}`)}>
                                {user?.role || "Inspector"}
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
                            <InputFieldWithNoLabel
                                placeholder="Current Password"
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={true}
                            />
                        </View>

                        {/* New Password */}
                        <View style={cn('mb-4')}>
                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-black'} mb-2`)}>
                                New Password <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <InputFieldWithNoLabel
                                placeholder="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={true}
                            />
                        </View>

                        {/* Change Password Button */}
                        <Button
                            onPress={handleChangePassword}
                            disabled={passwordLoading || !currentPassword || !newPassword}
                            className="w-full rounded-lg"
                            style={{
                                background: 'linear-gradient(90deg, #F59E0B 0%, #92400E 100%)',
                            }}
                        >
                            {passwordLoading ? 'Changing...' : 'Change Password'}
                        </Button>


                    {/* Logout Button */}
                    <View style={cn('mt-6')}>
                        <Button
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
                            className="w-full rounded-lg"
                            style={{
                                background: 'linear-gradient(90deg, #F59E0B 0%, #92400E 100%)',
                            }}
                        >
                            {loading ? 'Logging out...' : 'Logout'}
                        </Button>
                    </View>
                    </View>

                </View>
            </View>
        </SafeAreaView>
    );
};

export default Profile;
