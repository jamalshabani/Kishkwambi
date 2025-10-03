import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react-native';

const StepThreeDriverDetails = ({ onBack, containerData }) => {
    const { isDark, toggleTheme } = useTheme();
    
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
    
    // Form state
    const [driverFirstName, setDriverFirstName] = useState('');
    const [driverLastName, setDriverLastName] = useState('');
    const [driverPhoneNumber, setDriverPhoneNumber] = useState('');
    const [driverLicenceNumber, setDriverLicenceNumber] = useState('');
    const [transporterName, setTransporterName] = useState('');
    
    const handleNext = () => {
        // Validate required fields
        if (!driverFirstName.trim() || !driverLastName.trim() || !driverPhoneNumber.trim() || 
            !driverLicenceNumber.trim() || !transporterName.trim()) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }
        
        // TODO: Navigate to next step or save data
        Alert.alert('Success', 'Driver details saved successfully!');
    };
    
    const handlePrevious = () => {
        onBack();
    };

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                    Driver Details
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
            <View style={cn(`flex-1 mt-6 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <View style={cn('p-6')}>
                    {/* Main Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`)}>
                        <Text style={cn(`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-black'}`)}>
                            Driver Details
                        </Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Driver First Name */}
                            <View style={cn('mb-6')}>
                                <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver First Name <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <TextInput
                                    value={driverFirstName}
                                    onChangeText={setDriverFirstName}
                                    placeholder="Enter driver first name"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
                                />
                            </View>

                            {/* Driver Last Name */}
                            <View style={cn('mb-6')}>
                                <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver Last Name <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <TextInput
                                    value={driverLastName}
                                    onChangeText={setDriverLastName}
                                    placeholder="Enter driver last name"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
                                />
                            </View>

                            {/* Driver Phone Number */}
                            <View style={cn('mb-6')}>
                                <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver Phone Number <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <TextInput
                                    value={driverPhoneNumber}
                                    onChangeText={setDriverPhoneNumber}
                                    placeholder="Enter driver phone number"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    keyboardType="phone-pad"
                                    style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
                                />
                            </View>

                            {/* Driver Licence Number */}
                            <View style={cn('mb-6')}>
                                <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver Licence Number <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <TextInput
                                    value={driverLicenceNumber}
                                    onChangeText={setDriverLicenceNumber}
                                    placeholder="Enter driver licence number"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
                                />
                            </View>

                            {/* Transporter Name */}
                            <View style={cn('mb-8')}>
                                <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Transporter Name <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                <TextInput
                                    value={transporterName}
                                    onChangeText={setTransporterName}
                                    placeholder="Enter transporter name"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
                                />
                            </View>
                        </ScrollView>

                        {/* Navigation Buttons */}
                        <View style={cn('flex-row justify-between mt-6')}>
                            <TouchableOpacity
                                onPress={handlePrevious}
                                style={cn('flex-1 mr-2 rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#000000', '#F59E0B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold')}>Previous</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={handleNext}
                                style={cn('flex-1 ml-2 rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold')}>Next</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default StepThreeDriverDetails;
