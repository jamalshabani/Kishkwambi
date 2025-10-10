import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { useInspectionTimer } from '../../contexts/InspectionTimerContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X, Camera, User, CreditCard, Phone, Mail, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepNineDriverDetails = ({ onBack, containerData, onComplete, onShowSuccess }) => {
    const { isDark, toggleTheme } = useTheme();
    const { stopTimer, resetTimer } = useInspectionTimer();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [facing, setFacing] = useState('back');
    const [driverData, setDriverData] = useState(null);
    const cameraRef = useRef(null);
    const [trailerNumber, setTrailerNumber] = useState(null);
    const [truckNumber, setTruckNumber] = useState(null);

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
                console.error('❌ Error fetching trailer number:', error);
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
                console.error('❌ Error fetching truck number:', error);
            }
        };
        fetchTruckNumber();
    }, [containerData?.tripSegmentNumber]);

    // Driver details state
    const [driverDetails, setDriverDetails] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        licenseNumber: '',
        transporterName: 'Local Transporter'
    });

    // Focus states for gradient borders
    const [focusedField, setFocusedField] = useState(null);

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

    const openCamera = () => {
        setShowCamera(true);
        setShowForm(false);
    };

    const openForm = () => {
        setShowForm(true);
        setShowCamera(false);
    };


    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.4,
                base64: false,
                skipProcessing: true,
                exif: false,
            });

            if (photo?.uri) {
                setImage(photo.uri);
                setShowCamera(false);
                console.log('📸 Driver license photo taken successfully');

                // Show extraction loading
                setIsExtracting(true);
                
                // Call Vision AI to extract driver details
                await extractDriverDetails(photo.base64);
                
                // Automatically show the form with extracted data
                setShowForm(true);
            }
        } catch (error) {
            console.error('❌ Error taking driver license photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
            setIsExtracting(false);
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
                
                // Helper function to capitalize first letter of each word
                const capitalizeWords = (text) => {
                    if (!text) return '';
                    return text.toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                };
                
                setDriverDetails(prev => ({
                    ...prev,
                    firstName: capitalizeWords(extractedData.firstName || extractedData.fullName?.split(' ')[0] || prev.firstName),
                    lastName: capitalizeWords(extractedData.lastName || extractedData.fullName?.split(' ').slice(1).join(' ') || prev.lastName),
                    phoneNumber: extractedData.phoneNumber || prev.phoneNumber,
                    licenseNumber: extractedData.licenseNumber || prev.licenseNumber,
                    transporterName: capitalizeWords(extractedData.transporterName || prev.transporterName)
                }));
                console.log('✅ Driver details extracted and formatted successfully');
            } else {
                console.log('⚠️ No driver details extracted, manual input required');
                Alert.alert(
                    'Manual Input Required',
                    'Unable to extract driver details from the photo. Please enter the information manually.',
                    [{ text: 'OK' }]
                );
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
                uri: image,
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

    const saveDriverDetailsToDatabase = async (tripSegmentNumber, driverDetails, driverPhotoUrl) => {
        try {
            console.log('💾 Saving driver details to database...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Get current date in dd/mm/yyyy format
            const currentDate = new Date();
            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const year = currentDate.getFullYear();
            const inspectionDate = `${day}/${month}/${year}`;
            
            // Get current timestamp
            const gateInTimeStamp = currentDate.toISOString();
            
            // Stop the timer and get the inspection time
            const inspectionTime = stopTimer();
            console.log('⏱️ Inspection completed in:', inspectionTime);
            
            // Determine inwardLOLOBalance based on container size
            let inwardLOLOBalance = 150000; // Default for 40ft
            if (containerData?.containerSize === '40ft') {
                inwardLOLOBalance = 150000;
            } else if (containerData?.containerSize === '20ft') {
                inwardLOLOBalance = 75000;
            }
            
            const updateData = {
                tripSegmentNumber: tripSegmentNumber,
                transporterName: "Local Transporter",
                driverFirstName: driverDetails.firstName,
                driverLastName: driverDetails.lastName,
                driverLicenceNumber: driverDetails.licenseNumber,
                driverPhoneNumber: driverDetails.phoneNumber,
                containerStatus: "Pending",
                inspectionDate: inspectionDate,
                inspectionTime: inspectionTime,
                finalApproval: false,
                gateInTimeStamp: gateInTimeStamp,
                inwardLOLOBalance: inwardLOLOBalance
            };

            // Add driver photo if available
            if (driverPhotoUrl) {
                updateData.driverPhoto = driverPhotoUrl;
            }

            console.log('📊 Update data:', updateData);

            const response = await fetch(`${BACKEND_URL}/api/trip-segments/update-driver-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();
            console.log('📊 Database update response:', result);

            if (result.success) {
                console.log('✅ Driver details saved to database successfully');
                return { success: true };
            } else {
                console.error('❌ Failed to save driver details to database:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Error saving driver details to database:', error);
            return { success: false, error: error.message };
        }
    };

    const handleComplete = async () => {
        // Validate required fields
        if (!driverDetails.firstName || !driverDetails.lastName || !driverDetails.phoneNumber || 
            !driverDetails.licenseNumber) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }

        // Validate trip segment number
        if (!containerData?.tripSegmentNumber) {
            Alert.alert('Missing Trip Segment', 'Trip segment information is missing. Please go back and try again.');
            console.error('❌ Missing tripSegmentNumber:', containerData);
            return;
        }

        //console.log('📊 Container data:', containerData);
        console.log('📊 Trip segment number:', containerData?.tripSegmentNumber);

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

            // Save driver details to database
            const saveResult = await saveDriverDetailsToDatabase(containerData?.tripSegmentNumber, driverDetails, driverPhotoUrl);
            
            if (!saveResult.success) {
                Alert.alert('Database Error', 'Failed to save driver details. Please try again.');
                return;
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

            console.log('✅ Driver details completed and saved to database successfully');
            
            // Reset the timer after successful completion
            resetTimer();
            
            // Show success screen
            if (onShowSuccess) {
                onShowSuccess(completeData);
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
                        style={cn('rounded-lg overflow-hidden')}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={cn('px-6 py-3 items-center')}
                        >
                            <Text style={cn('text-white font-semibold')}>Grant Permission</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                        Driver Details
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
                            {isDark ? <Sun size={20} color="#9CA3AF" /> : <Moon size={20} color="#6B7280" />}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {!showCamera && !showForm ? (
                // Initial Selection Screen
                <View style={cn('flex-1 items-center p-6')}>
                    {/* Container Number and Trip Segment Display */}
                    <View style={cn(`mb-8 p-6 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border w-full`)}>
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
                        <View style={cn('flex-row items-center mt-3')}>
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

                    {/* Selection Buttons */}
                    <View style={cn('w-full')}>
                        {/* Take Driver License Photo Button */}
                        <TouchableOpacity
                            onPress={openCamera}
                            disabled={isProcessing}
                            style={cn(`w-full rounded-lg overflow-hidden mb-4 ${isProcessing ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-6 items-center')}
                            >
                                <Camera size={32} color="white" style={cn('mb-2')} />
                                <Text style={cn('text-white font-bold text-lg')}>Take Driver Licence Photo</Text>
                                <Text style={cn('text-white/80 text-sm mt-1')}>
                                    AI will extract details automatically
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* OR Divider */}
                        <View style={cn('flex-row items-center my-6')}>
                            <View style={cn(`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`)} />
                            <Text style={cn(`px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`)}>OR</Text>
                            <View style={cn(`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`)} />
                        </View>

                        {/* Enter Driver Details Button */}
                        <TouchableOpacity
                            onPress={openForm}
                            disabled={isProcessing}
                            style={cn(`w-full rounded-lg overflow-hidden ${isProcessing ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-6 items-center')}
                            >
                                <User size={32} color="white" style={cn('mb-2')} />
                                <Text style={cn('text-white font-bold text-lg')}>Enter Driver Details</Text>
                                <Text style={cn('text-white/80 text-sm mt-1')}>
                                    Fill in driver information manually
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : showCamera ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />

                    {/* Driver License Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Driver License Guide Frame */}
                        <View style={cn('relative')}>
                            {/* Driver License Rectangle Outline - 85.60mm x 54.00mm */}
                            <View
                                style={[
                                    cn('border-2 border-green-500 bg-green-500/10'),
                                    {
                                        width: Dimensions.get('window').width * 0.8, // 80% of screen width
                                        height: (Dimensions.get('window').width * 0.8) / 1.583, // Maintain driver's license aspect ratio (85.60mm x 54.00mm)
                                        borderRadius: 8,
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 right-0 bg-black/50 pb-8 pt-4')}>
                        <View style={cn('flex-row items-center justify-center px-8')}>
                            {/* Capture Button */}
                            <TouchableOpacity
                                onPress={takePicture}
                                disabled={isProcessing}
                                style={cn('w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center')}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <View style={cn('w-16 h-16 rounded-full bg-white')} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                // Form View
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

                            {/* Driver Photo Section (if taken) */}
                            {image && (
                                <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                                    <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                        Driver License Photo
                                    </Text>
                                    
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
                                            onPress={openCamera}
                                            style={cn('flex-1 rounded-lg overflow-hidden')}
                                        >
                                            <LinearGradient
                                                colors={['#000000', '#F59E0B']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={cn('p-4 items-center')}
                                            >
                                                <Text style={cn('text-white font-semibold')}>Retake Photo</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>

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
                            )}

                            {/* Driver Details Form */}
                            <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                                <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver Information
                                </Text>

                                {/* Driver First Name */}
                                <View style={cn('mb-4')}>
                                    <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Driver First Name <Text style={cn('text-red-500')}>*</Text>
                                    </Text>
                                    <View style={cn('rounded-lg overflow-hidden')}>
                                        <LinearGradient
                                            colors={focusedField === 'firstName' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-[2px] rounded-lg')}
                                        >
                                            <TextInput
                                                style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'firstName' ? '' : 'border'} ${focusedField === 'firstName' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                placeholder="Enter driver first name"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                value={driverDetails.firstName}
                                                onChangeText={(value) => handleInputChange('firstName', value)}
                                                onFocus={() => setFocusedField('firstName')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </LinearGradient>
                                    </View>
                                </View>

                                {/* Driver Last Name */}
                                <View style={cn('mb-4')}>
                                    <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Driver Last Name <Text style={cn('text-red-500')}>*</Text>
                                    </Text>
                                    <View style={cn('rounded-lg overflow-hidden')}>
                                        <LinearGradient
                                            colors={focusedField === 'lastName' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-[2px] rounded-lg')}
                                        >
                                            <TextInput
                                                style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'lastName' ? '' : 'border'} ${focusedField === 'lastName' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                placeholder="Enter driver last name"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                value={driverDetails.lastName}
                                                onChangeText={(value) => handleInputChange('lastName', value)}
                                                onFocus={() => setFocusedField('lastName')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </LinearGradient>
                                    </View>
                                </View>


                                {/* Driver License Number */}
                                <View style={cn('mb-4')}>
                                    <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Driver License Number <Text style={cn('text-red-500')}>*</Text>
                                    </Text>
                                    <View style={cn('rounded-lg overflow-hidden')}>
                                        <LinearGradient
                                            colors={focusedField === 'licenseNumber' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-[2px] rounded-lg')}
                                        >
                                            <TextInput
                                                style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'licenseNumber' ? '' : 'border'} ${focusedField === 'licenseNumber' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                placeholder="Enter driver license number"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                value={driverDetails.licenseNumber}
                                                onChangeText={(value) => handleInputChange('licenseNumber', value)}
                                                keyboardType="phone-pad"
                                                onFocus={() => setFocusedField('licenseNumber')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </LinearGradient>
                                    </View>
                                </View>

                                {/* Driver Phone Number */}
                                <View style={cn('mb-4')}>
                                    <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Driver Phone Number <Text style={cn('text-red-500')}>*</Text>
                                    </Text>
                                    <View style={cn('rounded-lg overflow-hidden')}>
                                        <LinearGradient
                                            colors={focusedField === 'phoneNumber' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-[2px] rounded-lg')}
                                        >
                                            <TextInput
                                                style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'phoneNumber' ? '' : 'border'} ${focusedField === 'phoneNumber' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                placeholder="Enter driver phone number"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                value={driverDetails.phoneNumber}
                                                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                                                keyboardType="phone-pad"
                                                onFocus={() => setFocusedField('phoneNumber')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </LinearGradient>
                                    </View>
                                </View>


                            {/* Action Buttons */}
                            <View style={cn('flex-row gap-4 mb-6')}>
                                <TouchableOpacity
                                    onPress={() => setShowForm(false)}
                                    style={cn('flex-1 rounded-lg overflow-hidden')}
                                >
                                    <LinearGradient
                                        colors={['#000000', '#F59E0B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('px-4 py-4 items-center')}
                                    >
                                        <Text style={cn('text-white font-bold')}>Previous</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={handleComplete}
                                    disabled={isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                             !driverDetails.phoneNumber || !driverDetails.licenseNumber}
                                    style={cn(`flex-1 rounded-lg overflow-hidden ${(isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                             !driverDetails.phoneNumber || !driverDetails.licenseNumber) ? 'opacity-50' : ''}`)}
                                >
                                    <LinearGradient
                                        colors={(isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                                !driverDetails.phoneNumber || !driverDetails.licenseNumber) ? 
                                                ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        {isProcessing ? (
                                            <View style={cn('flex-row items-center')}>
                                                <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                                <Text style={cn('text-white font-bold')}>Submitting...</Text>
                                            </View>
                                        ) : (
                                            <Text style={cn('text-white font-bold')}>Submit</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                            </View>


                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

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

            {/* Extraction Loading Overlay */}
            {isExtracting && (
                <Modal
                    visible={isExtracting}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={cn('flex-1 bg-black/80 items-center justify-center')}>
                        <View style={cn('bg-white rounded-lg p-8 items-center mx-8')}>
                            <ActivityIndicator size="large" color="#F59E0B" style={cn('mb-4')} />
                            <Text style={cn('text-lg font-bold text-gray-800 mb-2')}>
                                Processing Photo
                            </Text>
                            <Text style={cn('text-sm text-gray-600 text-center')}>
                                Extracting driver details from license...
                            </Text>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
};

export default StepNineDriverDetails;
