import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, Modal, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../lib/config';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Check, ArrowLeft } from 'lucide-react-native';

const StepEightHalfInspectionRemarks = ({ onBack, onBackToInsideDamagePhotos, containerData, onNavigateToStepNine }) => {
    const { isDark, toggleTheme } = useTheme();
    const [inspectionRemarks, setInspectionRemarks] = useState('');
    const [trailerNumber, setTrailerNumber] = useState(null);
    const [truckNumber, setTruckNumber] = useState(null);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);
    
    // State for missing information modal
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [missingInfoMessage, setMissingInfoMessage] = useState('');

    // Common damage remarks suggestions
    const damageRemarksSuggestions = [
        'No visible damage',
        'Minor scratches',
        'Dents on walls',
        'Hinge loose',
        'Rust spots visible',
        'Door latch damaged',
        'Floor panel dented',
        
        'Lock mechanism faulty',
        'Impact damage on rear',
        'Corrosion on bottom rail',
        'General wear and tear'
    ];

    // Fetch trailer number from database
    useEffect(() => {
        const fetchTrailerNumber = async () => {
            try {
                if (!containerData?.tripSegmentNumber) return;
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData.tripSegmentNumber}/trailer-details`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.trailerNumber) {
                        setTrailerNumber(result.trailerNumber);
                    }
                }
            } catch (error) {
            }
        };
        fetchTrailerNumber();
    }, [containerData?.tripSegmentNumber]);

    // Fetch truck number from database
    useEffect(() => {
        const fetchTruckNumber = async () => {
            try {
                if (!containerData?.tripSegmentNumber) return;
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData.tripSegmentNumber}/truck-details`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.truckNumber) {
                        setTruckNumber(result.truckNumber);
                    }
                }
            } catch (error) {
            }
        };
        fetchTruckNumber();
    }, [containerData?.tripSegmentNumber]);

    // Restore inspection remarks when navigating back
    useEffect(() => {
        if (containerData?.damageRemarks) {
            setInspectionRemarks(containerData.damageRemarks);
            
            // Update selected suggestions based on restored remarks
            const remarksArray = containerData.damageRemarks.split(',').map(remark => remark.trim());
            const newSelectedSuggestions = new Set();
            
            damageRemarksSuggestions.forEach(suggestion => {
                if (remarksArray.includes(suggestion)) {
                    newSelectedSuggestions.add(suggestion);
                }
            });
            
            setSelectedSuggestions(newSelectedSuggestions);
        }
    }, [containerData?.damageRemarks]);

    // Keyboard event listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

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

    // Conditional back navigation - check if Inside damage exists
    const handleBackNavigation = async () => {
        try {
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Fetch trip segment damage status to check damage locations
            const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData?.tripSegmentNumber}/damage-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch trip segment damage status');
            }
            
            const result = await response.json();
            
            if (result.success) {
                const damageLocations = result.damageLocations || [];
                
                // Check if "Inside" is in damage locations
                if (damageLocations.includes('Inside')) {
                    // Navigate to Inside damage photos with containerData
                    if (onBackToInsideDamagePhotos) {
                        onBackToInsideDamagePhotos(containerData);
                    }
                } else {
                    // Navigate to Inside photo preview with data for persistence
                    if (onBack) {
                        onBack(containerData);
                    }
                }
            } else {
                // If no data or error, default to Inside photo preview with data for persistence
                if (onBack) {
                    onBack(containerData);
                }
            }
        } catch (error) {
            // On error, default to Inside photo preview with data for persistence
            if (onBack) {
                onBack(containerData);
            }
        }
    };

    const handleRemarkSuggestion = (suggestion) => {
        const isCurrentlySelected = selectedSuggestions.has(suggestion);
        
        if (isCurrentlySelected) {
            // Remove from selected suggestions
            setSelectedSuggestions(prev => {
                const newSet = new Set(prev);
                newSet.delete(suggestion);
                return newSet;
            });
            
            // Remove from remarks text
            setInspectionRemarks(prev => {
                // Split by comma and filter out the suggestion
                const remarksArray = prev.split(',').map(remark => remark.trim());
                const filteredRemarks = remarksArray.filter(remark => remark !== suggestion);
                return filteredRemarks.join(', ');
            });
        } else {
            // Add to selected suggestions set
            setSelectedSuggestions(prev => new Set(prev).add(suggestion));
            
            // If remarks field is empty, set the suggestion directly
            if (!inspectionRemarks.trim()) {
                setInspectionRemarks(suggestion);
            } else {
                // If remarks field has content, append the suggestion with a comma and space
                setInspectionRemarks(prev => prev.trim() + ', ' + suggestion);
            }
        }
    };

    const handleNext = async () => {
        // Validate required field
        if (!inspectionRemarks.trim()) {
            setMissingInfoMessage('Please enter inspection remarks before proceeding.');
            setShowMissingInfoModal(true);
            return;
        }
        
        try {
            // Save damage remarks to database
            
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
            } else {
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
                {/* Title */}
                <View style={cn('flex-row items-center flex-1')}>
                    <TouchableOpacity 
                        onPress={handleBackNavigation}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
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

            <KeyboardAvoidingView 
                style={cn('flex-1')} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                enabled
            >
                <ScrollView 
                    ref={scrollViewRef}
                    style={cn('flex-1')} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardVisible ? 300 : 20 }}
                    scrollEnabled={true}
                    bounces={true}
                >
                    <View style={cn('p-6')}>
                        {/* Container Number and Trip Segment Display */}
                        <View style={cn(`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`)}>
                            <View style={cn('flex-row items-center justify-between mb-3')}>
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
                            <View style={cn('flex-row items-center')}>
                                <View style={cn('flex-1')}>
                                    <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                        Trailer Number
                                    </Text>
                                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                        {trailerNumber || containerData?.trailerNumber || 'N/A'}
                                    </Text>
                                </View>
                                <View style={cn('flex-1 ml-4')}>
                                    <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                        Truck Number
                                    </Text>
                                    <Text style={cn(`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                        {truckNumber || containerData?.truckNumber || 'N/A'}
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

                            {/* Remarks Text Input with Suggestions */}
                            <View style={cn(`
                                w-full rounded-lg border relative
                                ${isDark
                                    ? 'bg-gray-700 border-gray-600'
                                    : 'bg-gray-50 border-gray-300'
                                }
                            `)}>
                                <TextInput
                                    style={cn(`
                                        w-full h-48 p-4 text-base
                                        ${isDark ? 'text-white' : 'text-black'}
                                    `)}
                                    placeholder="Enter damage remarks..."
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={inspectionRemarks}
                                    onChangeText={(text) => {
                                        setInspectionRemarks(text);
                                        
                                        // Update selected suggestions based on text content
                                        const remarksArray = text.split(',').map(remark => remark.trim());
                                        const newSelectedSuggestions = new Set();
                                        
                                        damageRemarksSuggestions.forEach(suggestion => {
                                            if (remarksArray.includes(suggestion)) {
                                                newSelectedSuggestions.add(suggestion);
                                            }
                                        });
                                        
                                        setSelectedSuggestions(newSelectedSuggestions);
                                    }}
                                    onFocus={() => {
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                                        }, 100);
                                    }}
                                    multiline={true}
                                    textAlignVertical="top"
                                    returnKeyType="default"
                                    blurOnSubmit={false}
                                />
                                
                                {/* Quick Suggestions Inside Input - Three Rows */}
                                <View>
                                    <View style={cn('absolute bottom-2 left-2 right-2')}>
                                        <View style={cn('gap-1')}>
                                            {/* Row 1 */}
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingRight: 8 }}
                                            >
                                                <View style={cn('flex-row gap-1')}>
                                                    {damageRemarksSuggestions.slice(0, 4).map((suggestion, index) => {
                                                        const isSelected = selectedSuggestions.has(suggestion);
                                                        return (
                                                            <TouchableOpacity
                                                                key={index}
                                                                onPress={() => handleRemarkSuggestion(suggestion)}
                                                                style={cn(`
                                                                    px-2 py-1 rounded-full border
                                                                    ${isSelected 
                                                                        ? (isDark 
                                                                            ? 'bg-yellow-700 border-yellow-500' 
                                                                            : 'bg-yellow-700 border-yellow-400')
                                                                        : (isDark 
                                                                            ? 'bg-gray-600 border-gray-500' 
                                                                            : 'bg-white border-gray-200')
                                                                    }
                                                                `)}
                                                            >
                                                                <Text style={cn(`
                                                                    text-xs font-medium
                                                                    ${isSelected 
                                                                        ? 'text-white' 
                                                                        : (isDark ? 'text-gray-200' : 'text-gray-600')
                                                                    }
                                                                `)}>
                                                                    {suggestion}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                            
                                            {/* Row 2 */}
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingRight: 8 }}
                                            >
                                                <View style={cn('flex-row gap-1')}>
                                                    {damageRemarksSuggestions.slice(4, 8).map((suggestion, index) => {
                                                        const isSelected = selectedSuggestions.has(suggestion);
                                                        return (
                                                            <TouchableOpacity
                                                                key={index + 4}
                                                                onPress={() => handleRemarkSuggestion(suggestion)}
                                                                style={cn(`
                                                                    px-2 py-1 rounded-full border
                                                                    ${isSelected 
                                                                        ? (isDark 
                                                                            ? 'bg-yellow-700 border-yellow-500' 
                                                                            : 'bg-yellow-700 border-yellow-400')
                                                                        : (isDark 
                                                                            ? 'bg-gray-600 border-gray-500' 
                                                                            : 'bg-white border-gray-200')
                                                                    }
                                                                `)}
                                                            >
                                                                <Text style={cn(`
                                                                    text-xs font-medium
                                                                    ${isSelected 
                                                                        ? 'text-white' 
                                                                        : (isDark ? 'text-gray-200' : 'text-gray-600')
                                                                    }
                                                                `)}>
                                                                    {suggestion}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                            
                                            {/* Row 3 */}
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingRight: 8 }}
                                            >
                                                <View style={cn('flex-row gap-1')}>
                                                    {damageRemarksSuggestions.slice(8, 12).map((suggestion, index) => {
                                                        const isSelected = selectedSuggestions.has(suggestion);
                                                        return (
                                                            <TouchableOpacity
                                                                key={index + 8}
                                                                onPress={() => handleRemarkSuggestion(suggestion)}
                                                                style={cn(`
                                                                    px-2 py-1 rounded-full border
                                                                    ${isSelected 
                                                                        ? (isDark 
                                                                            ? 'bg-yellow-700 border-yellow-500' 
                                                                            : 'bg-yellow-700 border-yellow-500')
                                                                        : (isDark 
                                                                            ? 'bg-gray-600 border-gray-500' 
                                                                            : 'bg-white border-gray-200')
                                                                    }
                                                                `)}
                                                            >
                                                                <Text style={cn(`
                                                                    text-xs font-medium
                                                                    ${isSelected 
                                                                        ? 'text-white' 
                                                                        : (isDark ? 'text-gray-200' : 'text-gray-600')
                                                                    }
                                                                `)}>
                                                                    {suggestion}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                            
                                            {/* Row 4 */}
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ paddingRight: 8 }}
                                            >
                                                <View style={cn('flex-row gap-1')}>
                                                    {damageRemarksSuggestions.slice(12, 16).map((suggestion, index) => {
                                                        const isSelected = selectedSuggestions.has(suggestion);
                                                        return (
                                                            <TouchableOpacity
                                                                key={index + 12}
                                                                onPress={() => handleRemarkSuggestion(suggestion)}
                                                                style={cn(`
                                                                    px-2 py-1 rounded-full border
                                                                    ${isSelected 
                                                                        ? (isDark 
                                                                            ? 'bg-yellow-700 border-yellow-500' 
                                                                            : 'bg-yellow-700 border-yellow-500')
                                                                        : (isDark 
                                                                            ? 'bg-gray-600 border-gray-500' 
                                                                            : 'bg-white border-gray-200')
                                                                    }
                                                                `)}
                                                            >
                                                                <Text style={cn(`
                                                                    text-xs font-medium
                                                                    ${isSelected 
                                                                        ? 'text-white' 
                                                                        : (isDark ? 'text-gray-200' : 'text-gray-600')
                                                                    }
                                                                `)}>
                                                                    {suggestion}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </View>
                                    </View>
                                </View>
                            </View>

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
            </KeyboardAvoidingView>

            {/* Missing Information Modal */}
            <Modal
                visible={showMissingInfoModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMissingInfoModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                Missing Information
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                {missingInfoMessage}
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowMissingInfoModal(false)}
                            style={cn('bg-red-500 rounded-xl py-4')}
                        >
                            <Text style={cn('text-white text-center font-semibold text-base')}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepEightHalfInspectionRemarks;
