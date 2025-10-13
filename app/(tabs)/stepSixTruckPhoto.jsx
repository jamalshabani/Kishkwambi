import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X, ImageIcon, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepSixTruckPhoto = ({ onBack, onBackToBackWallDamage, containerData, onNavigateToStepSeven, onNavigateToStepSevenDirect }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [truckNumber, setTruckNumber] = useState(Array(7).fill(''));
    const [extractedData, setExtractedData] = useState({
        truckNumber: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizingPlate, setIsRecognizingPlate] = useState(false);
    const [facing, setFacing] = useState('back');
    const [truckPhotoData, setTruckPhotoData] = useState(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const cameraRef = useRef(null);
    const truckNumberRefs = useRef([]);
    const scrollViewRef = useRef(null);
    const [trailerNumber, setTrailerNumber] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalData, setErrorModalData] = useState({ title: '', message: '' });

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

    // Restore truck photo and truck number when navigating back
    useEffect(() => {
        if (containerData?.truckPhoto) {
            setImage(containerData.truckPhoto);
        }
    }, [containerData?.truckPhoto]);
    
    useEffect(() => {
        if (containerData?.truckNumber) {
            // Convert truck number string to array for the inputs
            const truckNumberArray = containerData.truckNumber.split('');
            // Pad with empty strings if needed
            while (truckNumberArray.length < 7) {
                truckNumberArray.push('');
            }
            setTruckNumber(truckNumberArray);
            setExtractedData({ truckNumber: containerData.truckNumber });
        }
    }, [containerData?.truckNumber]);

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

    // Conditional back navigation - check if Back Wall damage exists
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
                
                // Check if "Back Wall" is in damage locations
                if (damageLocations.includes('Back Wall')) {
                    // Navigate to Back Wall damage photos with containerData
                    if (onBackToBackWallDamage) {
                        onBackToBackWallDamage(containerData);
                    }
                } else {
                    // Navigate to step five (Back Wall photo preview)
                    if (onBack) {
                        onBack();
                    }
                }
            } else {
                // If no data or error, default to step five
                if (onBack) {
                    onBack();
                }
            }
        } catch (error) {
            // On error, default to step five
            if (onBack) {
                onBack();
            }
        }
    };

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    // Camera overlay dimensions for truck photos
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const truckFrameWidth = screenWidth * 0.85;
    const truckFrameHeight = truckFrameWidth * 0.94;
    
    const centerX = (screenWidth - truckFrameWidth) / 2;
    const centerY = (screenHeight - truckFrameHeight) / 2 - 80;

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

    // Function to calculate crop area
    const calculateCropArea = (imageWidth, imageHeight) => {
        const imageAspectRatio = imageWidth / imageHeight;
        const screenAspectRatio = screenWidth / screenHeight;
        let displayWidth, displayHeight, offsetX, offsetY;
        if (imageAspectRatio > screenAspectRatio) {
            displayHeight = screenHeight;
            displayWidth = screenHeight * imageAspectRatio;
            offsetX = (displayWidth - screenWidth) / 2;
            offsetY = 0;
        } else {
            displayWidth = screenWidth;
            displayHeight = screenWidth / imageAspectRatio;
            offsetX = 0;
            offsetY = (displayHeight - screenHeight) / 2;
        }
        const scale = imageWidth / displayWidth;
        let imageOverlayX = (centerX + offsetX) * scale;
        let imageOverlayY = (centerY + offsetY) * scale;
        let imageOverlayWidth = truckFrameWidth * scale;
        let imageOverlayHeight = truckFrameHeight * scale;
        imageOverlayX = Math.max(0, imageOverlayX);
        imageOverlayY = Math.max(0, imageOverlayY);
        if (imageOverlayX + imageOverlayWidth > imageWidth) imageOverlayWidth = imageWidth - imageOverlayX;
        if (imageOverlayY + imageOverlayHeight > imageHeight) imageOverlayHeight = imageHeight - imageOverlayY;
        return { x: Math.round(imageOverlayX), y: Math.round(imageOverlayY), width: Math.round(imageOverlayWidth), height: Math.round(imageOverlayHeight) };
    };

    const cropImageToTruckFrame = async (imageUri) => {
        try {
            const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { format: ImageManipulator.SaveFormat.JPEG });
            const imageWidth = imageInfo.width;
            const imageHeight = imageInfo.height;
            
            // Log size before cropping
            let beforeCropSize = 0;
            try {
                const beforeInfo = await fetch(imageUri);
                const beforeBlob = await beforeInfo.blob();
                beforeCropSize = beforeBlob.size;
                console.log(`📊 BEFORE CROP: ${imageWidth}x${imageHeight}, ${(beforeCropSize / 1024 / 1024).toFixed(2)}MB`);
            } catch (e) {}
            
            const cropArea = calculateCropArea(imageWidth, imageHeight);
            
            if (cropArea.x < 0 || cropArea.y < 0 || cropArea.width <= 0 || cropArea.height <= 0) {
                console.log('⚠️ Invalid crop area, skipping crop');
                return imageUri;
            }
            if (cropArea.x + cropArea.width > imageWidth || cropArea.y + cropArea.height > imageHeight) {
                console.log('⚠️ Crop area exceeds image bounds, skipping crop');
                return imageUri;
            }
            
            const croppedImage = await ImageManipulator.manipulateAsync(
                imageUri, 
                [{ crop: { originX: cropArea.x, originY: cropArea.y, width: cropArea.width, height: cropArea.height } }], 
                { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG } // No compression during crop
            );
            
            // Log size after cropping
            try {
                const afterInfo = await fetch(croppedImage.uri);
                const afterBlob = await afterInfo.blob();
                const reduction = beforeCropSize > 0 ? ((1 - afterBlob.size / beforeCropSize) * 100).toFixed(1) : 0;
                console.log(`📊 AFTER CROP: ${cropArea.width}x${cropArea.height}, ${(afterBlob.size / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
            } catch (e) {}
            
            return croppedImage.uri;
        } catch (error) {
            console.error('❌ Crop error:', error);
            return imageUri;
        }
    };

    const handleTruckNumberChange = (index, value) => {
        const newTruckNumber = [...truckNumber];
        newTruckNumber[index] = value.toUpperCase();
        setTruckNumber(newTruckNumber);

        // Auto-focus next input
        if (value && index < truckNumber.length - 1) {
            truckNumberRefs.current[index + 1]?.focus();
        }
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.6,
                base64: false,
                skipProcessing: true,
                exif: false,
            });

            if (photo?.uri) {
                // Get file size of original photo
                try {
                    const fileInfo = await fetch(photo.uri);
                    const blob = await fileInfo.blob();
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                } catch (sizeError) {
                }

                // Crop the image to the truck frame area
                const croppedImage = await cropImageToTruckFrame(photo.uri);

                // Wait to ensure the cropped file is fully written to disk
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Get file size of cropped photo
                try {
                    const fileInfo = await fetch(croppedImage);
                    const blob = await fileInfo.blob();
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                    const originalFileInfo = await fetch(photo.uri);
                    const originalBlob = await originalFileInfo.blob();
                    const reduction = (((originalBlob.size - blob.size) / originalBlob.size) * 100).toFixed(1);
                } catch (sizeError) {
                }

                setImage(croppedImage);

                // Call PlateRecognizer API to extract truck number
                await recognizeTruckNumber(croppedImage);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const recognizeTruckNumber = async (imageUri) => {
        try {
            setIsRecognizingPlate(true);

            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Verify the file exists before sending
            try {
                const testFetch = await fetch(imageUri);
            } catch (testError) {
                throw new Error('Cropped image file is not accessible yet');
            }
            
            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'truck.jpg'
            });
            
            // Add timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            try {
                const response = await fetch(`${BACKEND_URL}/api/plate-recognizer/recognize`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);

                const result = await response.json();

            if (result.success && result.data && result.data.licencePlate) {
                const plateNumber = result.data.licencePlate.toUpperCase();
                const confidence = result.data.confidence;
                
                // Update extracted data
                setExtractedData({
                    truckNumber: plateNumber,
                });

                // Auto-fill the truck number inputs
                const plateArray = plateNumber.split('');
                const newTruckNumber = Array(7).fill('');

                // Fill the array with detected characters (already uppercase from backend)
                for (let i = 0; i < Math.min(plateArray.length, 7); i++) {
                    newTruckNumber[i] = plateArray[i];
                }

                setTruckNumber(newTruckNumber);
            } else {
                Alert.alert(
                    'No Truck Number Detected',
                    'No truck number was detected in the image. Please enter it manually.',
                    [{ text: 'OK' }]
                );
            }
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    // Use styled modal instead of Alert
                    setErrorModalData({
                        title: 'Request Timeout',
                        message: 'The request took too long. Please enter the truck number manually.'
                    });
                    setShowErrorModal(true);
                } else {
                    throw fetchError; // Re-throw to outer catch
                }
            }
        } catch (error) {
            
            // Check if it's a network error
            if (error.message.includes('Network request failed')) {
                setErrorModalData({
                    title: 'Network Error',
                    message: 'Try taking the photo again or enter the truck number manually.'
                });
                setShowErrorModal(true);
            } else {
                Alert.alert(
                    'Recognition Error',
                    'Failed to recognize truck number. Please enter it manually.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsRecognizingPlate(false);
        }
    };

    const uploadTruckPhotoToS3 = async (imageBase64, tripSegmentNumber, truckNumber) => {
        try {
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: image,
                type: 'image/jpeg',
                name: 'truck_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'truck');
            formData.append('truckNumber', truckNumber);
            
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-truck-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                return { success: true, truckPhoto: result.truckPhoto };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const saveTruckDetailsToDatabase = async (tripSegmentNumber, truckNumber, truckPhotoUrl) => {
        try {
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            const updateData = {
                tripSegmentNumber: tripSegmentNumber,
                truckNumber: truckNumber
            };

            // Add truck photo if available
            if (truckPhotoUrl) {
                updateData.truckPhoto = truckPhotoUrl;
            }


            const response = await fetch(`${BACKEND_URL}/api/trip-segments/update-truck-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();

            if (result.success) {
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Photo', 'Please take a truck photo before proceeding.');
            return;
        }

        const currentTruckNumber = truckNumber.join('').toUpperCase();
        if (!currentTruckNumber || currentTruckNumber.length === 0) {
            Alert.alert('Missing Truck Number', 'Please enter the truck number before proceeding.');
            return;
        }

        setIsProcessing(true);

        try {
            
            // Save truck details to database (truck number only, photo will be uploaded at final submit)
            const saveResult = await saveTruckDetailsToDatabase(
                containerData?.tripSegmentNumber, 
                currentTruckNumber, 
                null // Photo will be uploaded at final submit
            );
            
            if (!saveResult.success) {
                Alert.alert('Database Error', 'Failed to save truck details. Please try again.');
                return;
            }
            
            // Prepare truck data for next step with photo stored for batch upload
            const truckData = {
                ...containerData,
                truckPhoto: image, // Store for preview and batch upload
                truckNumber: currentTruckNumber
            };
            
            // Save truck photo data to state for navigation
            setTruckPhotoData(truckData);


            // Navigate to next step
            if (onNavigateToStepSeven) {
                onNavigateToStepSeven(truckData);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
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
                        Camera permission is required to take photos
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
                        Truck Photo
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
                            {isDark ? <Sun size={20} color="#9CA3AF" /> : <Moon size={20} color="#6B7280" />}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {!image ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />

                    {/* Custom Mask Overlay - darkens everything except the truck frame */}
                    <View style={cn('absolute inset-0')} pointerEvents="box-none">
                        <View style={{ position: 'absolute', top: 0, left: 0, width: screenWidth, height: centerY, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: 0, width: centerX, height: truckFrameHeight, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX + truckFrameWidth, width: centerX, height: truckFrameHeight, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY + truckFrameHeight, left: 0, width: screenWidth, height: screenHeight - (centerY + truckFrameHeight), backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX, width: truckFrameWidth, height: truckFrameHeight, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'transparent' }} />
                    </View>
                    
                    <View style={cn('absolute top-4 left-4 right-4 items-center')} pointerEvents="none">
                        <View style={cn('bg-black/70 p-6 rounded-lg')}>
                            <Text style={cn('text-white text-center text-lg font-semibold')}>
                                Make sure the Truck Number is clearly visible
                            </Text>
                        </View>
                    </View>
                    
                    <View style={cn('absolute bottom-0 left-0 bg-black/50 right-0 pb-20 pt-4')}>
                        <View style={cn('flex-row items-center justify-center px-8')}>
                            <TouchableOpacity
                                onPress={takePicture}
                                disabled={isProcessing}
                                style={cn('w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center')}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#6B7280" />
                                ) : (
                                    <View style={cn('w-16 h-16 rounded-full bg-white')} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                // Photo Preview with Controls
                <KeyboardAvoidingView
                    style={cn('flex-1')}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                    enabled
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={cn('flex-1')}
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardVisible ? 300 : 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
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
                                            {containerData?.trailerNumber || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                                
                                <View style={cn('mb-2 flex items-center justify-center')}>
                                    <View style={cn('relative')}>
                                        <Image source={{ uri: image }} style={cn('w-[280px] h-[280px] rounded-lg')} />
                                        {/* Eye Icon Overlay */}
                                        <TouchableOpacity
                                            onPress={() => setShowZoomModal(true)}
                                            style={cn('absolute inset-0 items-center justify-center')}
                                        >
                                            <View style={cn('bg-black/50 rounded-full p-3')}>
                                                <Eye size={32} color="white" />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Retake Photo Button */}
                                <TouchableOpacity
                                    onPress={() => {
                                        setImage(null);
                                        setTruckNumber(Array(7).fill(''));
                                        setExtractedData({ truckNumber: '' });
                                    }}
                                    style={cn('rounded-lg overflow-hidden w-full mb-4')}
                                >
                                    <LinearGradient
                                        colors={['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        <Text style={cn('text-white font-bold')}>Retake Photo</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Truck Number Input */}
                                <View style={cn(`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`)}>
                                    {isRecognizingPlate ? (
                                        <View style={cn('items-center py-8')}>
                                            <ActivityIndicator 
                                                size="large" 
                                                color={isDark ? '#eab308' : '#a16207'} 
                                                style={cn('mb-4')}
                                            />
                                            <Text style={cn(`text-lg ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                                                Processing...
                                            </Text>
                                        </View>
                                    ) : (
                                        <View>
                                            <View style={cn('flex-row items-center justify-between mb-2')}>
                                                <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                    Truck Number
                                                </Text>
                                            </View>
                                            <View style={cn('flex-row gap-1 flex-wrap')}>
                                                {truckNumber.map((char, index) => (
                                                    <View key={index} style={cn('items-center justify-center')}>
                                                        <TextInput
                                                            ref={(ref) => (truckNumberRefs.current[index] = ref)}
                                                            value={char}
                                                            onChangeText={(value) => handleTruckNumberChange(index, value)}
                                                            onFocus={() => {
                                                                setTimeout(() => {
                                                                    scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                                                                }, 100);
                                                            }}
                                                            style={[
                                                                cn(`w-12 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
                                                                {
                                                                    textAlignVertical: 'center',
                                                                    padding: 0,
                                                                    margin: 0,
                                                                    lineHeight: 25,
                                                                    includeFontPadding: false
                                                                }
                                                            ]}
                                                            maxLength={1}
                                                            autoCapitalize="characters"
                                                            selectTextOnFocus
                                                        />
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>
                                {/* Navigation Buttons */}
                                <View style={cn('flex-row justify-between mt-4 pb-6')}>
                                    <TouchableOpacity
                                        onPress={handleNext}
                                        disabled={isRecognizingPlate || isProcessing}
                                        style={cn(`flex-1 ml-2 rounded-lg overflow-hidden ${(isRecognizingPlate || isProcessing) ? 'opacity-50' : ''}`)}
                                    >
                                        <LinearGradient
                                            colors={(isRecognizingPlate || isProcessing) ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
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
                                                <Text style={cn('text-white font-bold')}>Next</Text>
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
                        source={{ uri: image }} 
                        style={cn('w-full h-full')} 
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* Custom Error Modal */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                {errorModalData.title}
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                {errorModalData.message}
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowErrorModal(false)}
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

export default StepSixTruckPhoto;
