import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { cn } from '../../lib/tw';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react-native';

const Dashboard = () => {
    const { user, isAuthenticated, loading } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const [containerNumber, setContainerNumber] = useState('');

    // Animation values
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

    if (loading) {
        return (
            <View style={cn('flex-1 justify-center items-center bg-gray-100')}>
                <Text style={cn('text-lg text-gray-600')}>Loading...</Text>
            </View>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (!user) {
        return (
            <View style={cn('flex-1 justify-center items-center bg-gray-100')}>
                <Text style={cn('text-lg text-gray-600')}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
            <StatusBar style={isDark ? "light" : "dark"} />
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                    Arrival Inspection
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
            <ScrollView style={cn('flex-1')}>
                <View style={cn('p-6')}>
                   
                    {/* Main Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`)}>
                        {/* Pre-Arrival Checklist */}
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                            Pre-Arrival Checklist
                        </Text>

                        {/* Checklist Items */}
                        <View style={cn('mb-6')}>
                            {/* Item 1 */}
                            <View style={cn(`${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 flex-row items-center mb-3`)}>
                                <View style={cn('w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3')}>
                                    <Text style={cn('text-white font-bold')}>✓</Text>
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    Verify the <Text style={cn('font-bold')}>Expiration Date</Text> of the Depot Allocation Document.
                                </Text>
                            </View>

                            {/* Item 2 */}
                            <View style={cn(`${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 flex-row items-center mb-3`)}>
                                <View style={cn('w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3')}>
                                    <Text style={cn('text-white font-bold')}>↻</Text>
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    Confirm the <Text style={cn('font-bold')}>Correctness</Text> of the Depot Allocation Document details.
                                </Text>
                            </View>

                            {/* Item 3 */}
                            <View style={cn(`${isDark ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4 flex-row items-center`)}>
                                <View style={cn('w-8 h-8 bg-purple-500 rounded-full items-center justify-center mr-3')}>
                                    <Text style={cn('text-white font-bold')}>⚡</Text>
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    Ready to begin? <Text style={cn('font-bold')}>Enter the container number</Text> to proceed.
                                </Text>
                            </View>
                        </View>

                        {/* Container Check */}
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                            Container Check
                        </Text>

                        {/* Container Number Input */}
                        <View style={cn('mb-4')}>
                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-2`)}>
                                Container Number <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <TextInput
                                style={cn(`border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'} rounded-lg px-4 py-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`)}
                                placeholder="Enter container number"
                                value={containerNumber}
                                onChangeText={setContainerNumber}
                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                            />
                        </View>

                        {/* Check Button */}
                        <Button
                            onPress={() => {
                                // Handle container check
                                console.log('Checking container:', containerNumber);
                            }}
                            className="w-full rounded-lg"
                            style={{
                                background: 'linear-gradient(90deg, #F59E0B 0%, #92400E 100%)',
                            }}
                        >
                            Check Container Number
                        </Button>
                    </View>
                </View>
            </ScrollView>

        </SafeAreaView>
    );
};

export default Dashboard;
