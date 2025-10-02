import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SelectList } from 'react-native-dropdown-select-list';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, ArrowLeft } from 'lucide-react-native';

const StepTwoContainerDetails = ({ onBack, containerData, onNavigateToStepThree }) => {
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
    const [containerColor, setContainerColor] = useState('Silver');
    const [containerType, setContainerType] = useState('Dry Container');
    const [containerSize, setContainerSize] = useState('45ft');
    const [containerLoadStatus, setContainerLoadStatus] = useState('Empty');
    
    // Color options for SelectList
    const colorOptions = [
        { key: 'Blue', value: 'Blue' },
        { key: 'Red', value: 'Red' },
        { key: 'Green', value: 'Green' },
        { key: 'Yellow', value: 'Yellow' },
        { key: 'White', value: 'White' },
        { key: 'Black', value: 'Black' },
        { key: 'Gray', value: 'Gray' },
        { key: 'Orange', value: 'Orange' },
        { key: 'Brown', value: 'Brown' },
        { key: 'Silver', value: 'Silver' },
        { key: 'Other', value: 'Other' }
    ];
    
    // ISO code mapping for container type and size based on BIC standards
    // Format: [Length][Height][Type][Characteristics]
    const isoCodeMapping = {
        // 20ft containers (Length: 2)
        '22G1': { type: 'Dry Container', size: '20ft', height: '8ft 6in' },
        '25G1': { type: 'Dry Container', size: '20ft', height: '9ft 6in' },
        '22R1': { type: 'Refrigerated Container', size: '20ft', height: '8ft 6in' },
        '25R1': { type: 'Refrigerated Container', size: '20ft', height: '9ft 6in' },
        '22U1': { type: 'Open Top Container', size: '20ft', height: '8ft 6in' },
        '25U1': { type: 'Open Top Container', size: '20ft', height: '9ft 6in' },
        '22P1': { type: 'Platform Container', size: '20ft', height: '8ft 6in' },
        '25P1': { type: 'Platform Container', size: '20ft', height: '9ft 6in' },
        '22T1': { type: 'Tank Container', size: '20ft', height: '8ft 6in' },
        '25T1': { type: 'Tank Container', size: '20ft', height: '9ft 6in' },
        
        // 40ft containers (Length: 4)
        '42G1': { type: 'Dry Container', size: '40ft', height: '8ft 6in' },
        '45G1': { type: 'Dry Container', size: '40ft', height: '9ft 6in' },
        '42R1': { type: 'Refrigerated Container', size: '40ft', height: '8ft 6in' },
        '45R1': { type: 'Refrigerated Container', size: '40ft', height: '9ft 6in' },
        '42U1': { type: 'Open Top Container', size: '40ft', height: '8ft 6in' },
        '45U1': { type: 'Open Top Container', size: '40ft', height: '9ft 6in' },
        '42P1': { type: 'Platform Container', size: '40ft', height: '8ft 6in' },
        '45P1': { type: 'Platform Container', size: '40ft', height: '9ft 6in' },
        '42T1': { type: 'Tank Container', size: '40ft', height: '8ft 6in' },
        '45T1': { type: 'Tank Container', size: '40ft', height: '9ft 6in' },
        
        // 45ft containers (Length: 5)
        '52G1': { type: 'Dry Container', size: '45ft', height: '8ft 6in' },
        '55G1': { type: 'Dry Container', size: '45ft', height: '9ft 6in' },
        '52R1': { type: 'Refrigerated Container', size: '45ft', height: '8ft 6in' },
        '55R1': { type: 'Refrigerated Container', size: '45ft', height: '9ft 6in' },
        '52U1': { type: 'Open Top Container', size: '45ft', height: '8ft 6in' },
        '55U1': { type: 'Open Top Container', size: '45ft', height: '9ft 6in' },
        '52P1': { type: 'Platform Container', size: '45ft', height: '8ft 6in' },
        '55P1': { type: 'Platform Container', size: '45ft', height: '9ft 6in' },
        '52T1': { type: 'Tank Container', size: '45ft', height: '8ft 6in' },
        '55T1': { type: 'Tank Container', size: '45ft', height: '9ft 6in' },
        
        // 48ft containers (Length: M)
        'M2G1': { type: 'Dry Container', size: '48ft', height: '8ft 6in' },
        'M5G1': { type: 'Dry Container', size: '48ft', height: '9ft 6in' },
        'M2R1': { type: 'Refrigerated Container', size: '48ft', height: '8ft 6in' },
        'M5R1': { type: 'Refrigerated Container', size: '48ft', height: '9ft 6in' },
        'M2U1': { type: 'Open Top Container', size: '48ft', height: '8ft 6in' },
        'M5U1': { type: 'Open Top Container', size: '48ft', height: '9ft 6in' },
        'M2P1': { type: 'Platform Container', size: '48ft', height: '8ft 6in' },
        'M5P1': { type: 'Platform Container', size: '48ft', height: '9ft 6in' },
        'M2T1': { type: 'Tank Container', size: '48ft', height: '8ft 6in' },
        'M5T1': { type: 'Tank Container', size: '48ft', height: '9ft 6in' },
    };
    
    // Prefill container details based on ISO code and detected color
    useEffect(() => {
        if (containerData?.isoCode && isoCodeMapping[containerData.isoCode]) {
            const mapping = isoCodeMapping[containerData.isoCode];
            setContainerType(mapping.type);
            setContainerSize(mapping.size);
        }
        
        // Prefill container color if detected
        if (containerData?.containerColor) {
            const detectedColor = containerData.containerColor;
            // Check if detected color is in our color options
            const colorOption = colorOptions.find(option => option.value === detectedColor);
            if (colorOption) {
                setContainerColor(detectedColor);
                console.log('🎨 Prefilled container color:', detectedColor);
            } else {
                console.log('🎨 Detected color not in options:', detectedColor);
                // Try to find a close match
                const colorLower = detectedColor.toLowerCase();
                const closeMatch = colorOptions.find(option => 
                    option.value.toLowerCase() === colorLower || 
                    option.value.toLowerCase().includes(colorLower) ||
                    colorLower.includes(option.value.toLowerCase())
                );
                if (closeMatch) {
                    setContainerColor(closeMatch.value);
                    console.log('🎨 Using close color match:', closeMatch.value);
                }
            }
        }
    }, [containerData]);
    
    const handleNext = () => {
        // Validate required fields
        if (!containerColor || !containerType || !containerSize || !containerLoadStatus) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }
        
        // Prepare container data for next step
        const containerDetailsData = {
            ...containerData,
            containerColor,
            containerType,
            containerSize,
            containerLoadStatus
        };
        
        // Navigate to Driver Details screen
        if (onNavigateToStepThree) {
            onNavigateToStepThree(containerDetailsData);
        }
    };
    
    const handlePrevious = () => {
        onBack();
    };

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={onBack}
                    style={cn('mr-4 p-2')}
                >
                    <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                    Container Details
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
                    {/* Main Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`)}>
                    
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
                    
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Container Color */}
                        <View style={cn('mb-6')}>
                            <View style={cn('flex-row items-center mb-2')}>
                                <Text style={cn(`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Container Color <Text style={cn('text-red-500')}>*</Text>
                                </Text>
                                {containerData?.containerColor && (
                                    <View style={cn('ml-2 px-2 py-1 bg-green-100 rounded-full')}>
                                        <Text style={cn('text-xs text-green-800 font-medium')}>
                                            Auto-detected
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <SelectList
                                setSelected={(val) => setContainerColor(val)}
                                data={colorOptions}
                                save="value"
                                defaultOption={{ key: containerColor, value: containerColor }}
                                placeholder="Select Container Color"
                                search={false}
                                boxStyles={{
                                    backgroundColor: isDark ? '#374151' : '#ffffff',
                                    borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                                inputStyles={{
                                    color: isDark ? '#ffffff' : '#000000',
                                    fontSize: 16,
                                }}
                                dropdownStyles={{
                                    backgroundColor: isDark ? '#374151' : '#ffffff',
                                    borderColor: isDark ? '#4B5563' : '#D1D5DB',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                }}
                                dropdownTextStyles={{
                                    color: isDark ? '#ffffff' : '#000000',
                                    fontSize: 16,
                                }}
                            />
                            {containerData?.colorHex && (
                                <View style={cn('mt-2 flex-row items-center')}>
                                    <Text style={cn(`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Detected color:
                                    </Text>
                                    <View style={[cn('ml-2 w-4 h-4 rounded border'), { backgroundColor: containerData.colorHex }]} />
                                    <Text style={cn(`ml-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        {containerData.colorHex}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Container Type */}
                        <View style={cn('mb-6')}>
                            <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Container Type <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <View style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`)}>
                                <Text style={cn(`${isDark ? 'text-white' : 'text-black'}`)}>{containerType}</Text>
                            </View>
                        </View>

                        {/* Container Size */}
                        <View style={cn('mb-6')}>
                            <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Container Size <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <View style={cn(`border rounded-lg p-3 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`)}>
                                <Text style={cn(`${isDark ? 'text-white' : 'text-black'}`)}>{containerSize}</Text>
                            </View>
                        </View>

                        {/* Container Load Status */}
                        <View style={cn('mb-8')}>
                            <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Container Load Status <Text style={cn('text-red-500')}>*</Text>
                            </Text>
                            <View style={cn('flex-row')}>
                                <TouchableOpacity
                                    onPress={() => setContainerLoadStatus('Empty')}
                                    style={cn('flex-1 rounded-l-lg overflow-hidden')}
                                >
                                    {containerLoadStatus === 'Empty' ? (
                                        <LinearGradient
                                            colors={['#000000', '#F59E0B']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-3 items-center')}
                                        >
                                            <Text style={cn('text-white font-semibold text-center')}>
                                                Empty
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={cn(`p-3 items-center ${isDark ? 'bg-gray-700' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`)}>
                                            <Text style={cn(`font-semibold text-center ${isDark ? 'text-white' : 'text-black'}`)}>
                                                Empty
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setContainerLoadStatus('Not Empty')}
                                    style={cn('flex-1 rounded-r-lg overflow-hidden')}
                                >
                                    {containerLoadStatus === 'Not Empty' ? (
                                        <LinearGradient
                                            colors={['#F59E0B', '#000000']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-3 items-center')}
                                        >
                                            <Text style={cn('text-white font-semibold text-center')}>
                                                Not Empty
                                            </Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={cn(`p-3 items-center ${isDark ? 'bg-gray-700' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-300'}`)}>
                                            <Text style={cn(`font-semibold text-center ${isDark ? 'text-white' : 'text-black'}`)}>
                                                Not Empty
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Navigation Buttons */}
                    <View style={cn('flex-row justify-between mt-4')}>
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

export default StepTwoContainerDetails;
