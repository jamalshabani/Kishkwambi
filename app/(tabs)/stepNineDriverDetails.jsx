import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Eye, X, ArrowLeft, Camera, User, CreditCard, Phone, Mail } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepNineDriverDetails = ({ onBack, containerData, onComplete }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [facing, setFacing] = useState('front');
    const [driverData, setDriverData] = useState(null);
    const cameraRef = useRef(null);

    // Driver details state
    const [driverDetails, setDriverDetails] = useState({
        fullName: '',
        idNumber: '',
        phoneNumber: '',
        email: '',
        licenseNumber: '',
        licenseExpiry: ''
    });

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

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: true,
            });

            if (photo?.uri) {
                setImage(photo.base64);
                console.log('📸 Driver license photo taken successfully');

                // Call Vision AI to extract driver details
                await extractDriverDetails(photo.base64);
            }
        } catch (error) {
            console.error('❌ Error taking driver license photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const extractDriverDetails = async (base64Image) => {
        try {
            setIsRecognizing(true);
            console.log('🔍 Calling Vision AI for driver license recognition...');

            const BACKEND_URL = API_CONFIG.getBackendUrl();

            const response = await fetch(`${BACKEND_URL}/api/vision/extract-driver-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
            });

            const result = await response.json();
            console.log('📊 Vision AI response:', result);

            if (result.success && result.data) {
                const extractedData = result.data;
                setDriverDetails(prev => ({
                    ...prev,
                    fullName: extractedData.fullName || prev.fullName,
                    idNumber: extractedData.idNumber || prev.idNumber,
                    phoneNumber: extractedData.phoneNumber || prev.phoneNumber,
                    email: extractedData.email || prev.email,
                    licenseNumber: extractedData.licenseNumber || prev.licenseNumber,
                    licenseExpiry: extractedData.licenseExpiry || prev.licenseExpiry
                }));
                console.log('✅ Driver details extracted successfully');
            } else {
                console.log('⚠️ No driver details extracted, manual input required');
            }
        } catch (error) {
            console.error('❌ Error extracting driver details:', error);
            Alert.alert('Recognition Error', 'Failed to extract driver details. Please enter manually.');
        } finally {
            setIsRecognizing(false);
        }
    };

    const uploadDriverPhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            console.log('📸 Uploading driver photo to S3...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: `data:image/jpeg;base64,${imageBase64}`,
                type: 'image/jpeg',
                name: 'driver_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'driver');
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-driver-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-driver-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Driver photo uploaded successfully to S3:', result.driverPhoto);
                return { success: true, driverPhoto: result.driverPhoto };
            } else {
                console.error('❌ Failed to upload driver photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading driver photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const handleComplete = async () => {
        // Validate required fields
        if (!driverDetails.fullName || !driverDetails.licenseNumber) {
            Alert.alert('Missing Information', 'Please enter driver name and license number.');
            return;
        }

        setIsProcessing(true);

        try {
            let driverPhotoUrl = null;
            
            // Upload driver photo to S3 if available
            if (image) {
                const uploadResult = await uploadDriverPhotoToS3(image, containerData?.tripSegmentNumber);
                if (uploadResult.success) {
                    driverPhotoUrl = uploadResult.driverPhoto;
                } else {
                    Alert.alert('Upload Warning', 'Failed to upload driver photo, but continuing with details.');
                }
            }

            // Prepare complete data
            const completeData = {
                ...containerData,
                driverDetails: {
                    ...driverDetails,
                    photo: driverPhotoUrl
                }
            };
            
            // Save driver data to state for navigation
            setDriverData(completeData);

            console.log('✅ Driver details completed successfully');
            
            // Navigate to completion
            if (onComplete) {
                onComplete(completeData);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while completing driver details. Please try again.');
            console.error('❌ Error in handleComplete:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInputChange = (field, value) => {
        setDriverDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!permission) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={cn('flex-1 justify-center items-center')}>
                    <Text style={cn('text-lg text-gray-600 mb-4')}>Requesting camera permission...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={cn('flex-1 justify-center items-center px-6')}>
                    <Text style={cn(`text-lg text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`)}>
                        Camera permission is required to take driver license photo
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={cn('bg-blue-500 px-6 py-3 rounded-lg')}
                    >
                        <Text style={cn('text-white font-semibold')}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center shadow-sm`)}>
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={onBack}
                    style={cn('mr-4 p-2')}
                >
                    <ArrowLeft size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                    Driver Details
                </Text>

                {/* Complete Inspection Button */}
                <TouchableOpacity
                    onPress={() => onComplete && onComplete(driverData)}
                    style={cn('mr-3 px-3 py-2 rounded-lg bg-green-500')}
                >
                    <Text style={cn('text-white font-semibold text-sm')}>Complete</Text>
                </TouchableOpacity>

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
                        {isDark ? <Sun size={20} color="#9CA3AF" /> : <Moon size={20} color="#6B7280" />}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <KeyboardAvoidingView 
                style={cn('flex-1')} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
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

                        {/* Driver Photo Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Driver License Photo
                            </Text>
                            
                            {!image ? (
                                <TouchableOpacity
                                    onPress={takePicture}
                                    disabled={isProcessing}
                                    style={cn(`w-full h-48 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'} items-center justify-center ${isProcessing ? 'opacity-50' : ''}`)}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator size="large" color="#6B7280" />
                                    ) : (
                                        <>
                                            <Camera size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            <Text style={cn(`text-lg font-semibold mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                Take Driver License Photo
                                            </Text>
                                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`)}>
                                                AI will extract details automatically
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <View>
                                    <TouchableOpacity
                                        onPress={() => setShowZoomModal(true)}
                                        style={cn('relative')}
                                    >
                                        <Image 
                                            source={{ uri: `data:image/jpeg;base64,${image}` }} 
                                            style={cn('w-full h-48 rounded-lg')} 
                                        />
                                        <View style={cn('absolute inset-0 bg-black/30 rounded-lg items-center justify-center')}>
                                            <Eye size={32} color="white" />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    <View style={cn('flex-row mt-4 gap-2')}>
                                        <TouchableOpacity
                                            onPress={() => setImage(null)}
                                            style={cn('flex-1 bg-red-500 px-4 py-2 rounded-lg items-center')}
                                        >
                                            <Text style={cn('text-white font-semibold')}>Retake</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={takePicture}
                                            disabled={isProcessing}
                                            style={cn(`flex-1 bg-blue-500 px-4 py-2 rounded-lg items-center ${isProcessing ? 'opacity-50' : ''}`)}
                                        >
                                            <Text style={cn('text-white font-semibold')}>Retake</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {isRecognizing && (
                                <View style={cn('mt-4 p-3 bg-blue-100 rounded-lg')}>
                                    <View style={cn('flex-row items-center')}>
                                        <ActivityIndicator size="small" color="#3B82F6" style={cn('mr-2')} />
                                        <Text style={cn('text-blue-800 font-medium')}>
                                            Extracting driver details...
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Driver Details Form */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Driver Information
                            </Text>

                            {/* Full Name */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Full Name *
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <User size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="Enter full name"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.fullName}
                                        onChangeText={(value) => handleInputChange('fullName', value)}
                                    />
                                </View>
                            </View>

                            {/* ID Number */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    ID Number
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <CreditCard size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="Enter ID number"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.idNumber}
                                        onChangeText={(value) => handleInputChange('idNumber', value)}
                                    />
                                </View>
                            </View>

                            {/* Phone Number */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Phone Number
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <Phone size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="Enter phone number"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.phoneNumber}
                                        onChangeText={(value) => handleInputChange('phoneNumber', value)}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            {/* Email */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    Email
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <Mail size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="Enter email address"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.email}
                                        onChangeText={(value) => handleInputChange('email', value)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            {/* License Number */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    License Number *
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <CreditCard size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="Enter license number"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.licenseNumber}
                                        onChangeText={(value) => handleInputChange('licenseNumber', value)}
                                    />
                                </View>
                            </View>

                            {/* License Expiry */}
                            <View style={cn('mb-4')}>
                                <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                    License Expiry
                                </Text>
                                <View style={cn(`flex-row items-center px-3 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`)}>
                                    <CreditCard size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={cn('mr-3')} />
                                    <TextInput
                                        style={cn(`flex-1 ${isDark ? 'text-white' : 'text-black'}`)}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={driverDetails.licenseExpiry}
                                        onChangeText={(value) => handleInputChange('licenseExpiry', value)}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Complete Button */}
                        <View style={cn('flex-row justify-between mt-4 pb-6')}>
                            <TouchableOpacity
                                onPress={handleComplete}
                                disabled={isProcessing || !driverDetails.fullName || !driverDetails.licenseNumber}
                                style={cn(`flex-1 rounded-lg overflow-hidden ${(isProcessing || !driverDetails.fullName || !driverDetails.licenseNumber) ? 'opacity-50' : ''}`)}
                            >
                                <LinearGradient
                                    colors={(isProcessing || !driverDetails.fullName || !driverDetails.licenseNumber) ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    {isProcessing ? (
                                        <View style={cn('flex-row items-center')}>
                                            <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                            <Text style={cn('text-white font-bold')}>Processing...</Text>
                                        </View>
                                    ) : (
                                        <Text style={cn('text-white font-bold')}>Complete Inspection</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Zoom Modal */}
            <Modal
                visible={showZoomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowZoomModal(false)}
            >
                <View style={cn('flex-1 bg-black items-center justify-center')}>
                    <TouchableOpacity
                        onPress={() => setShowZoomModal(false)}
                        style={cn('absolute top-12 right-6 z-10')}
                    >
                        <X size={32} color="white" />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: `data:image/jpeg;base64,${image}` }} 
                        style={cn('w-full h-full')} 
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepNineDriverDetails;
