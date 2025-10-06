import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../lib/config';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, ArrowLeft, Check } from 'lucide-react-native';

const StepEightHalfInspectionRemarks = ({ onBack, containerData, onNavigateToStepNine }) => {
    const { isDark, toggleTheme } = useTheme();
    const [inspectionRemarks, setInspectionRemarks] = useState('');

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

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

    const handleNext = async () => {
        try {
            // Save damage remarks to database
            if (inspectionRemarks.trim()) {
                console.log('💾 Saving damage remarks to database...');
                
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                
                const response = await fetch(`${BACKEND_URL}/api/update-damage-remarks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tripSegmentNumber: containerData?.tripSegmentNumber,
                        damageRemarks: inspectionRemarks.trim()
                    }),
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Damage remarks saved successfully:', result);
                } else {
                    console.error('❌ Failed to save damage remarks:', result.error);
                }
            }
            
            // Prepare data for next step
            const remarksData = {
                ...containerData,
                damageRemarks: inspectionRemarks.trim()
            };
            
            // Navigate to Driver Details screen
            if (onNavigateToStepNine) {
                onNavigateToStepNine(remarksData);
            }
            
        } catch (error) {
            console.error('❌ Error saving damage remarks:', error);
            // Still navigate even if saving fails
            const remarksData = {
                ...containerData,
                damageRemarks: inspectionRemarks.trim()
            };
            
            if (onNavigateToStepNine) {
                onNavigateToStepNine(remarksData);
            }
        }
    };

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Back Button and Title */}
                <View style={cn('flex-row items-center flex-1')}>
                    <TouchableOpacity
                        onPress={onBack}
                        style={cn('mr-4 p-2')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                    </TouchableOpacity>

                    {/* Title */}
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Inspection Remarks
                    </Text>
                </View>

                {/* Timer Display and Theme Switcher */}
                <View style={cn('flex-row items-center')}>
                    {/* Timer Display */}
                    <TimerDisplay />

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
            </View>

            <ScrollView style={cn('flex-1')} showsVerticalScrollIndicator={false}>
                <View style={cn('p-6')}>
                    {/* Container Number and Trip Segment Display */}
                    <View style={cn(`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`)}>
                        <View style={cn('flex-row items-center justify-between')}>
                            <View style={cn('flex-1')}>
                                <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                    Container Number
                                </Text>
                                <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                    {containerData?.containerNumber || 'N/A'}
                                </Text>
                            </View>
                            <View style={cn('flex-1 ml-4')}>
                                <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                    Trip Segment
                                </Text>
                                <Text style={cn(`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                    {containerData?.tripSegmentNumber || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Main Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`)}>
                        {/* Pre-Arrival Checklist */}
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                            Inspection Checklist
                        </Text>

                        {/* Checklist Items */}
                        <View style={cn('mb-6')}>
                            {/* Item 1 */}
                            <View style={cn(`${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 flex-row items-center mb-3`)}>
                                <View style={cn('w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3')}>
                                    <Check size={16} color="white" />
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    The <Text style={cn('font-bold')}>Depot Allocation</Text> is valid.
                                </Text>
                            </View>
                        </View>

                        {/* Inspection Remarks Section */}
                        <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                            Damage Remarks <Text style={cn('text-red-500')}>*</Text>
                        </Text>

                        <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`)}>
                            Enter short description of the damages
                        </Text>

                        {/* Remarks Text Input */}
                        <TextInput
                            style={cn(`
                                w-full h-32 p-4 rounded-lg border text-base
                                ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-gray-50 border-gray-300 text-black placeholder-gray-500'
                                }
                            `)}
                            placeholder="Enter damage remarks..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            value={inspectionRemarks}
                            onChangeText={setInspectionRemarks}
                            multiline={true}
                            textAlignVertical="top"
                        />

                        {/* Navigation Button */}
                        <View style={cn('flex-row justify-center mt-4')}>
                            <TouchableOpacity
                                onPress={handleNext}
                                style={cn('w-full rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold text-lg')}>
                                        Next
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default StepEightHalfInspectionRemarks;
