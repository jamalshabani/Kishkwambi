import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SelectList } from 'react-native-dropdown-select-list';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepTwoContainerDetails = ({ onBack, containerData, onNavigateToStepThree, onNavigateToDamagePhotos, onNavigateToStepThreeDirect }) => {
    const { isDark, toggleTheme } = useTheme();

    // State for back wall damage modal
    const [showFrontWallModal, setShowFrontWallModal] = useState(false);
    const [containerDetailsData, setContainerDetailsData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for missing information modal
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [missingInfoMessage, setMissingInfoMessage] = useState('');

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
    const [containerColor, setContainerColor] = useState('');
    const [containerType, setContainerType] = useState('Dry Container');
    const [containerSize, setContainerSize] = useState('45ft');

    // Color options for SelectList
    const colorOptions = [
        { key: 'Blue', value: 'Blue', hexColor: '#0B4FA3' },
        { key: 'Red', value: 'Red', hexColor: '#C62C28' },
        { key: 'Green', value: 'Green', hexColor: '#187822' },
        { key: 'Yellow', value: 'Yellow', hexColor: '#EECC4C' },
        { key: 'White', value: 'White', hexColor: '#E7E7E7' },
        { key: 'Black', value: 'Black', hexColor: '#1D1D1D' },
        { key: 'Gray', value: 'Gray', hexColor: '#6E6E70' },
        { key: 'Orange', value: 'Orange', hexColor: '#F68400' },
        { key: 'Brown', value: 'Brown', hexColor: '#9F5750' },
        { key: 'Silver', value: 'Silver', hexColor: '#A3B2C0' },
        { key: 'Other', value: 'Other', hexColor: '#666666' }
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

    // Prefill container details based on ISO code and restore previous selections
    useEffect(() => {
        // Restore container type and size from ISO code
        if (containerData?.isoCode && isoCodeMapping[containerData.isoCode]) {
            const mapping = isoCodeMapping[containerData.isoCode];
            setContainerType(mapping.type);
            setContainerSize(mapping.size);
        }

        // Restore previously selected container color when navigating back
        if (containerData?.containerColor) {
            console.log('🎨 Restoring previously selected color:', containerData.containerColor);
            setContainerColor(containerData.containerColor);
        }
    }, [containerData]);

    const handleNext = () => {
        // Validate required fields
        if (!containerColor) {
            setMissingInfoMessage('Please select a container color before proceeding.');
            setShowMissingInfoModal(true);
            return;
        }
        
        if (!containerType || !containerSize) {
            setMissingInfoMessage('Please fill in all required fields.');
            setShowMissingInfoModal(true);
            return;
        }

        // Show back wall damage modal
        setShowFrontWallModal(true);
    };

    const handleFrontWallResponse = async (isDamaged) => {
        setShowFrontWallModal(false);
        setIsSaving(true);

        const BACKEND_URL = API_CONFIG.getBackendUrl();

        // Save container details (color, type, size) to database
        try {
            console.log('💾 Saving container details to database...');

            // Get the hex code for the selected color
            const selectedColorOption = colorOptions.find(option => option.value === containerColor);
            const containerColorCode = selectedColorOption?.hexColor || '#666666';

            const updateData = {
                containerNumber: containerData?.containerNumber,
                containerColor: containerColor,
                containerColorCode: containerColorCode,
                containerType: containerType,
                containerSize: containerSize
            };

            console.log('📝 Container details to save:', updateData);

            const updateResponse = await fetch(`${BACKEND_URL}/api/update-container-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const updateResult = await updateResponse.json();

            if (updateResult.success) {
                console.log('✅ Container details saved successfully');
            } else {
                console.error('❌ Failed to save container details:', updateResult.error);
            }
        } catch (error) {
            console.error('❌ Error saving container details:', error);
        }

        // If damaged, update database with damage status
        if (isDamaged) {
            try {
                console.log('🔧 Updating damage status in database...');

                const response = await fetch(`${BACKEND_URL}/api/update-damage-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tripSegmentNumber: containerData?.tripSegmentNumber,
                        hasDamages: 'Yes',
                        damageLocation: 'Front Wall'
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    console.log('✅ Damage status updated successfully:', result);
                } else {
                    console.error('❌ Failed to update damage status:', result.error);
                    // Continue with navigation even if database update fails
                }
            } catch (error) {
                console.error('❌ Error updating damage status:', error);
                // Continue with navigation even if database update fails
            }
        }

        // Get the hex code for the selected color to include in containerDetailsData
        const selectedColorOption = colorOptions.find(option => option.value === containerColor);
        const containerColorCode = selectedColorOption?.hexColor || '#666666';

        // Prepare container data for next step
        const containerDetailsData = {
            ...containerData,
            containerColor,
            containerColorCode,
            containerType,
            containerSize,
            backWallDamaged: isDamaged
        };

        // Save container details data to state for navigation
        setContainerDetailsData(containerDetailsData);
        setIsSaving(false);

        // Navigate based on damage status
        if (isDamaged) {
            // Navigate to Damage Photos screen
            if (onNavigateToDamagePhotos) {
                onNavigateToDamagePhotos(containerDetailsData);
            }
        } else {
            // Navigate to Trailer Photo screen
            if (onNavigateToStepThree) {
                onNavigateToStepThree(containerDetailsData);
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
                        onPress={() => onBack(containerData)}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Container Details
                    </Text>
                </View>

                {/* Timer Display and Navigation Buttons */}
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

            {/* Main Content */}
            <View style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
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
                        <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                            Container Details
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Container Color */}
                            <View style={cn('mb-6')}>
                                <View style={cn('flex-row items-center mb-2')}>
                                    <Text style={cn(`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                        Container Color <Text style={cn('text-red-500')}>*</Text>
                                    </Text>
                                </View>
                                <SelectList
                                    setSelected={(val) => setContainerColor(val)}
                                    data={colorOptions}
                                    save="value"
                                    defaultOption={containerColor ? { key: containerColor, value: containerColor } : undefined}
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
                                {containerColor && (
                                    <View style={cn('mt-2 flex-row items-center')}>
                                        <Text style={cn(`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                            Selected color:
                                        </Text>
                                        {(() => {
                                            const selectedColorOption = colorOptions.find(option => option.value === containerColor);
                                            const hexCode = selectedColorOption?.hexColor || '#666666';
                                            return (
                                                <>
                                                    <View style={[cn('ml-2 w-4 h-4 rounded border'), { backgroundColor: hexCode }]} />
                                                    <Text style={cn(`ml-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                        {hexCode}
                                                    </Text>
                                                </>
                                            );
                                        })()}
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
                        </ScrollView>

                        {/* Navigation Button */}
                        <View style={cn('mt-4')}>
                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={isSaving}
                                style={cn(`w-full rounded-lg overflow-hidden ${isSaving ? 'opacity-50' : ''}`)}
                            >
                                <LinearGradient
                                    colors={isSaving ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    {isSaving ? (
                                        <View style={cn('flex-row items-center')}>
                                            <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                            <Text style={cn('text-white font-bold')}>Saving...</Text>
                                        </View>
                                    ) : (
                                        <Text style={cn('text-white font-bold')}>Next</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Front Wall Damage Modal */}
            <Modal
                visible={showFrontWallModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFrontWallModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl mx-8 p-6`)}>

                        {/* Question Text */}
                        <View style={cn('mb-6')}>
                            <Text style={cn(`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-black'} mb-2`)}>
                                Damage Check
                            </Text>
                            <Text style={cn(`text-lg font-semibold text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                Is the Front Wall damaged?
                            </Text>
                        </View>

                        {/* Yes/No Buttons */}
                        <View style={cn('flex-row gap-3')}>
                            <TouchableOpacity
                                onPress={() => handleFrontWallResponse(true)}
                                style={cn('flex-1 rounded-xl overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#EF4444', '#DC2626']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('py-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold text-lg')}>
                                        Yes
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleFrontWallResponse(false)}
                                style={cn('flex-1 rounded-xl overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('py-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold text-lg')}>
                                        No
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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

export default StepTwoContainerDetails;
