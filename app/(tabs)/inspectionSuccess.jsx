import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, Home, Clock, Sun, Moon, Upload } from 'lucide-react-native';

const InspectionSuccess = ({ onBackToDashboard, inspectionData, uploadProgress, isUploading }) => {
    const { isDark, toggleTheme } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Animation values
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const checkmarkOpacity = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentTranslateY = useRef(new Animated.Value(30)).current;
    
    // Theme switcher animation values
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Only animate when upload is complete
        if (!isUploading && uploadProgress.percentage >= 100) {
            setShowSuccess(true);
            // Animate checkmark
            Animated.sequence([
                Animated.delay(300),
                Animated.parallel([
                    Animated.timing(checkmarkScale, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(checkmarkOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(200),
                // Animate content
                Animated.parallel([
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(contentTranslateY, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }
    }, [isUploading, uploadProgress]);

    const handleBackToDashboard = () => {
        if (onBackToDashboard) {
            onBackToDashboard();
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
                <View style={cn('flex-row items-center flex-1')}>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Inspection Complete
                    </Text>
                </View>

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
            <View style={cn('flex-1 justify-center items-center p-6')}>
                {isUploading || !showSuccess ? (
                    // Upload Progress Screen
                    <View style={cn('items-center w-full')}>
                        <View style={cn('w-32 h-32 rounded-full items-center justify-center mb-6')}>
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                style={cn('w-32 h-32 rounded-full items-center justify-center')}
                            >
                                <Upload size={60} color="white" />
                            </LinearGradient>
                        </View>

                        <Text style={cn(`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                            Uploading Photos
                        </Text>

                        <Text style={cn(`text-lg text-center mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                            Please wait while we save your inspection...
                        </Text>

                        {/* Progress Bar */}
                        <View style={cn('w-full mb-4')}>
                            <View style={cn(`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`)}>
                                <View
                                    style={[
                                        cn('h-full rounded-full'),
                                        { width: `${uploadProgress.percentage}%` }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('h-full')}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={cn(`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                            {Math.round(uploadProgress.percentage)}%
                        </Text>

                        <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                            {Math.round(uploadProgress.current)} of {uploadProgress.total} photos uploaded
                        </Text>
                    </View>
                ) : (
                    // Success Screen
                    <>
                        {/* Success Animation */}
                        <Animated.View
                            style={[
                                cn('items-center mb-8'),
                                {
                                    opacity: checkmarkOpacity,
                                    transform: [{ scale: checkmarkScale }],
                                },
                            ]}
                        >
                            <View style={cn('w-32 h-32 rounded-full items-center justify-center mb-4 mt-4')}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={cn('w-32 h-32 rounded-full items-center justify-center')}
                                >
                                    <CheckCircle size={80} color="white" />
                                </LinearGradient>
                            </View>
                        </Animated.View>

                        {/* Success Content */}
                        <Animated.View
                            style={[
                                cn('items-center'),
                                {
                                    opacity: contentOpacity,
                                    transform: [{ translateY: contentTranslateY }],
                                },
                            ]}
                        >
                    <Text style={cn(`text-3xl font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                        Inspection Complete!
                    </Text>
                    
                    <Text style={cn(`text-lg text-center mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                        Container inspection has been successfully submitted.
                    </Text>

                    {/* Inspection Details Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mb-8 w-full`)}>
                        <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                            Inspection Summary
                        </Text>
                        
                        <View>
                            <View style={cn('flex-row items-center justify-between mb-2 gap-16')}>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Container Number:
                                </Text>
                                <Text style={cn(`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                                    {inspectionData?.containerNumber || 'N/A'}
                                </Text>
                            </View>
                            
                            <View style={cn('flex-row items-center justify-between mb-2')}>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Trip Segment:
                                </Text>
                                <Text style={cn(`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                                    {inspectionData?.tripSegmentNumber || 'N/A'}
                                </Text>
                            </View>
                            
                            <View style={cn('flex-row items-center justify-between mb-2')}>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Driver:
                                </Text>
                                <Text style={cn(`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                                    {inspectionData?.driverDetails?.firstName} {inspectionData?.driverDetails?.lastName}
                                </Text>
                            </View>
                            
                            <View style={cn('flex-row items-center justify-between')}>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Inspection Duration:
                                </Text>
                                <Text style={cn(`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`)}>
                                    {inspectionData?.inspectionTime || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={cn('w-full')}>
                        <TouchableOpacity
                            onPress={handleBackToDashboard}
                            style={cn('rounded-lg overflow-hidden mb-4')}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center flex-row justify-center')}
                            >
                                <Text style={cn('text-white font-bold text-lg px-16')}>
                                    Back to Dashboard
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        </View>
                    </Animated.View>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
};

export default InspectionSuccess;
