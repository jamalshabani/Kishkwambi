import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
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
    const cameraRef = useRef(null);
    const truckNumberRefs = useRef([]);
    const [trailerNumber, setTrailerNumber] = useState(null);

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

    // Restore truck photo and truck number when navigating back
    useEffect(() => {
        if (containerData?.truckPhoto) {
            console.log('🔄 Restoring truck photo from navigation data');
            setImage(containerData.truckPhoto);
        }
    }, [containerData?.truckPhoto]);
    
    useEffect(() => {
        if (containerData?.truckNumber) {
            console.log('🚛 Restoring truck number from previous data:', containerData.truckNumber);
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

    // Conditional back navigation - check if Back Wall damage exists
    const handleBackNavigation = async () => {
        try {
            console.log('🔙 Checking damage locations for conditional navigation...');
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
                console.log('📊 Damage locations:', damageLocations);
                
                // Check if "Back Wall" is in damage locations
                if (damageLocations.includes('Back Wall')) {
                    console.log('✅ Back Wall damage found - navigating to Back Wall damage photos');
                    // Navigate to Back Wall damage photos with containerData
                    if (onBackToBackWallDamage) {
                        onBackToBackWallDamage(containerData);
                    }
                } else {
                    console.log('❌ No Back Wall damage - navigating to step five (Back Wall photo)');
                    // Navigate to step five (Back Wall photo preview)
                    if (onBack) {
                        onBack();
                    }
                }
            } else {
                // If no data or error, default to step five
                console.log('⚠️ No trip segment data found - defaulting to step five');
                if (onBack) {
                    onBack();
                }
            }
        } catch (error) {
            console.error('❌ Error checking damage locations:', error);
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
            const cropArea = calculateCropArea(imageInfo.width, imageInfo.height);
            if (cropArea.x < 0 || cropArea.y < 0 || cropArea.width <= 0 || cropArea.height <= 0) return imageUri;
            if (cropArea.x + cropArea.width > imageInfo.width || cropArea.y + cropArea.height > imageInfo.height) return imageUri;
            const croppedImage = await ImageManipulator.manipulateAsync(imageUri, [{ crop: { originX: cropArea.x, originY: cropArea.y, width: cropArea.width, height: cropArea.height } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
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
                quality: 0.3,
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
                    console.log(`📊 Original truck photo size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
                } catch (sizeError) {
                    console.warn('Could not determine original file size:', sizeError);
                }

                // Crop the image to the truck frame area
                const croppedImage = await cropImageToTruckFrame(photo.uri);

                // Get file size of cropped photo
                try {
                    const fileInfo = await fetch(croppedImage);
                    const blob = await fileInfo.blob();
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                    const originalFileInfo = await fetch(photo.uri);
                    const originalBlob = await originalFileInfo.blob();
                    const reduction = (((originalBlob.size - blob.size) / originalBlob.size) * 100).toFixed(1);
                    console.log(`📊 Cropped truck photo size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
                    console.log(`📉 Size reduction: ${reduction}% smaller after cropping`);
                } catch (sizeError) {
                    console.warn('Could not determine cropped file size:', sizeError);
                }

                setImage(croppedImage);
                console.log('📸 Truck photo taken and cropped successfully');

                // Call PlateRecognizer API to extract truck number
                await recognizeTruckNumber(croppedImage);
            }
        } catch (error) {
            console.error('❌ Error taking truck photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const recognizeTruckNumber = async (imageUri) => {
        try {
            setIsRecognizingPlate(true);
            console.log('🚗 Calling PlateRecognizer API...');

            const BACKEND_URL = API_CONFIG.getBackendUrl();
            console.log('🔗 Backend URL:', BACKEND_URL);
            
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
                console.log('🚗 PlateRecognizer response:', result);

            if (result.success && result.data && result.data.licencePlate) {
                const plateNumber = result.data.licencePlate.toUpperCase();
                const confidence = result.data.confidence;
                console.log(`✅ Detected truck number: ${plateNumber} (confidence: ${confidence})`);
                
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
                console.log('❌ No truck number detected or API error');
                Alert.alert(
                    'No Truck Number Detected',
                    'No truck number was detected in the image. Please enter it manually.',
                    [{ text: 'OK' }]
                );
            }
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    console.error('❌ Plate recognition request timed out');
                    Alert.alert(
                        'Request Timeout',
                        'The request took too long. Please enter the truck number manually.',
                        [{ text: 'OK' }]
                    );
                } else {
                    throw fetchError; // Re-throw to outer catch
                }
            }
        } catch (error) {
            console.error('❌ Error recognizing truck number:', error);
            console.error('❌ Error details:', error.message);
            
            // Check if it's a network error
            if (error.message.includes('Network request failed')) {
                Alert.alert(
                    'Network Error',
                    'Cannot connect to the server. Please check your network connection and try entering the truck number manually.',
                    [{ text: 'OK' }]
                );
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
            console.log('📸 Uploading truck photo to S3...');
            
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
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-truck-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            console.log('📸 Truck number:', truckNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-truck-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Truck photo uploaded successfully to S3:', result.truckPhoto);
                return { success: true, truckPhoto: result.truckPhoto };
            } else {
                console.error('❌ Failed to upload truck photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading truck photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const saveTruckDetailsToDatabase = async (tripSegmentNumber, truckNumber, truckPhotoUrl) => {
        try {
            console.log('💾 Saving truck details to database...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            const updateData = {
                tripSegmentNumber: tripSegmentNumber,
                truckNumber: truckNumber
            };

            // Add truck photo if available
            if (truckPhotoUrl) {
                updateData.truckPhoto = truckPhotoUrl;
            }

            console.log('📊 Update data:', updateData);

            const response = await fetch(`${BACKEND_URL}/api/trip-segments/update-truck-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();
            console.log('📊 Database update response:', result);

            if (result.success) {
                console.log('✅ Truck details saved to database successfully');
                return { success: true };
            } else {
                console.error('❌ Failed to save truck details to database:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Error saving truck details to database:', error);
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
            console.log('📸 Storing truck photo for batch upload');
            
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

            console.log('✅ Truck details saved to database successfully');
            console.log('📸 Truck photo stored for batch upload');

            // Navigate to next step
            if (onNavigateToStepSeven) {
                onNavigateToStepSeven(truckData);
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
            console.error('❌ Error in handleNext:', error);
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
                >
                    <View
                        style={cn('flex-1')}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 400 }}
                        showsVerticalScrollIndicator={false}
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

                    </View>


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
        </SafeAreaView>
    );
};

export default StepSixTruckPhoto;
