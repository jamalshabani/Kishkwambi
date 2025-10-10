import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, Animated, Modal, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import TimerDisplay from '../../components/common/TimerDisplay';
import { API_CONFIG } from '../../lib/config';
import { Camera as CameraIcon, Sun, Moon, ArrowLeft, Eye, X } from 'lucide-react-native';

const StepOneContainerPhoto = ({ onBack, onNavigateToStepTwo, onNavigateToDamagePhotos, containerData: incomingContainerData }) => {
    const { isDark, toggleTheme } = useTheme();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorContainerNumber, setErrorContainerNumber] = useState('');
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [containerNumber, setContainerNumber] = useState(Array(11).fill(''));
    const [isoCode, setIsoCode] = useState(Array(4).fill(''));
    const [extractedData, setExtractedData] = useState({
        containerNumber: '',
        isoCode: '',
    });
    const [containerData, setContainerData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [facing, setFacing] = useState('back');
    const [showContainerModal, setShowContainerModal] = useState(false);
    const [containerModalData, setContainerModalData] = useState({ type: '', message: '' });
    const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
    const cameraRef = useRef(null);
    const containerNumberRefs = useRef([]);
    const isoCodeRefs = useRef([]);

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    // Restore container photo and data when navigating back
    useEffect(() => {
        if (incomingContainerData) {
        
            // Restore container photo
            if (incomingContainerData.containerPhoto) {
                console.log('📸 Restoring container photo');
                setImage(incomingContainerData.containerPhoto);
            }
            
            // Restore container number
            if (incomingContainerData.containerNumber) {
                console.log('📝 Restoring container number:', incomingContainerData.containerNumber);
                const containerChars = incomingContainerData.containerNumber.padEnd(11, ' ').split('').slice(0, 11);
                setContainerNumber(containerChars);
                setExtractedData(prev => ({
                    ...prev,
                    containerNumber: incomingContainerData.containerNumber
                }));
            }
            
            // Restore ISO code
            if (incomingContainerData.isoCode) {
                console.log('📝 Restoring ISO code:', incomingContainerData.isoCode);
                const isoChars = incomingContainerData.isoCode.padEnd(4, ' ').split('').slice(0, 4);
                setIsoCode(isoChars);
                setExtractedData(prev => ({
                    ...prev,
                    isoCode: incomingContainerData.isoCode
                }));
            }
            
            // Store the incoming container data
            setContainerData(incomingContainerData);
        }
    }, [incomingContainerData]);

    // Camera overlay dimensions
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const containerWidth = screenWidth * 0.85;
    const containerHeight = containerWidth * 0.94; // 2.44m × 2.59m ratio
    
    // Calculate the center position for the container frame
    const centerX = (screenWidth - containerWidth) / 2;
    const centerY = (screenHeight - containerHeight) / 2 - 80; // -80 for the -mt-20 offset

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
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.3,  // Reduced from 0.4 to 0.3 for smaller file size
                    base64: false,
                    skipProcessing: true,
                    exif: false,
                });
                
                // Get file size of original photo
                try {
                    const fileInfo = await fetch(photo.uri);
                    const blob = await fileInfo.blob();
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                    console.log(`📊 Original photo size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
                } catch (sizeError) {
                    console.warn('Could not determine original file size:', sizeError);
                }
                
                // Crop the image to the overlay area (Container Guide Frame)
                const croppedImage = await cropImageToOverlay(photo.uri);
                console.log('✂️ Cropped photo URI:', croppedImage);
                
                // Get file size of cropped photo
                try {
                    const fileInfo = await fetch(croppedImage);
                    const blob = await fileInfo.blob();
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
                    console.log(`📊 Cropped photo size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
                } catch (sizeError) {
                    console.warn('Could not determine cropped file size:', sizeError);
                }
                
                // Set the cropped image for preview
                setImage(croppedImage);
                
                // Process the cropped image with Vision AI
                await processImageWithVisionAI(croppedImage);
            } catch (error) {
                Alert.alert('Error', 'Failed to take picture');
                console.error('Camera error:', error);
            }
        }
    };

    // Function to calculate crop area based on Container Guide Frame dimensions
    const calculateCropArea = (imageWidth, imageHeight) => {
        // Calculate the aspect ratios
        const imageAspectRatio = imageWidth / imageHeight;
        const screenAspectRatio = screenWidth / screenHeight;
        
        // Determine how the camera image is displayed on screen (cover mode)
        let displayWidth, displayHeight, offsetX, offsetY;
        
        if (imageAspectRatio > screenAspectRatio) {
            // Image is wider - will be cropped on sides
            displayHeight = screenHeight;
            displayWidth = screenHeight * imageAspectRatio;
            offsetX = (displayWidth - screenWidth) / 2;
            offsetY = 0;
        } else {
            // Image is taller - will be cropped on top/bottom
            displayWidth = screenWidth;
            displayHeight = screenWidth / imageAspectRatio;
            offsetX = 0;
            offsetY = (displayHeight - screenHeight) / 2;
        }
        
        // Calculate scale factor from display to actual image
        const scale = imageWidth / displayWidth;
        
        // Calculate the actual position in the camera feed
        // centerX and centerY are screen coordinates, we need to adjust for camera offset
        const actualCenterX = centerX + offsetX;
        const actualCenterY = centerY + offsetY;
        
        // Convert to image coordinates
        let imageOverlayX = actualCenterX * scale;
        let imageOverlayY = actualCenterY * scale;
        let imageOverlayWidth = containerWidth * scale;
        let imageOverlayHeight = containerHeight * scale;
        
        // Validate and constrain crop area to image bounds
        imageOverlayX = Math.max(0, imageOverlayX);
        imageOverlayY = Math.max(0, imageOverlayY);
        
        // Ensure crop doesn't exceed image boundaries
        if (imageOverlayX + imageOverlayWidth > imageWidth) {
            imageOverlayWidth = imageWidth - imageOverlayX;
        }
        if (imageOverlayY + imageOverlayHeight > imageHeight) {
            imageOverlayHeight = imageHeight - imageOverlayY;
        }
        
        return {
            x: Math.round(imageOverlayX),
            y: Math.round(imageOverlayY),
            width: Math.round(imageOverlayWidth),
            height: Math.round(imageOverlayHeight),
            screenWidth,
            screenHeight,
            imageWidth,
            imageHeight
        };
    };

    // Function to crop image to overlay area (Container Guide Frame)
    const cropImageToOverlay = async (imageUri) => {
        try {
            console.log('✂️ Starting crop process for Container Guide Frame area...');
            
            // First, get the image dimensions
            const imageInfo = await ImageManipulator.manipulateAsync(
                imageUri,
                [],
                { format: ImageManipulator.SaveFormat.JPEG }
            );
            
            // Get the actual image dimensions
            const imageWidth = imageInfo.width;
            const imageHeight = imageInfo.height;
            
            console.log('📐 Original image dimensions:', { width: imageWidth, height: imageHeight });
            
            // Calculate crop area based on Container Guide Frame dimensions
            const cropArea = calculateCropArea(imageWidth, imageHeight);
            
            console.log('✂️ Crop area (matching Container Guide Frame):', {
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
            });
            
            // Validate crop parameters before attempting to crop
            if (cropArea.x < 0 || cropArea.y < 0 || cropArea.width <= 0 || cropArea.height <= 0) {
                console.error('❌ Invalid crop parameters:', cropArea);
                throw new Error('Invalid crop parameters: coordinates or dimensions are invalid');
            }
            
            if (cropArea.x + cropArea.width > imageWidth || cropArea.y + cropArea.height > imageHeight) {
                console.error('❌ Crop area exceeds image bounds:', {
                    cropArea,
                    imageWidth,
                    imageHeight
                });
                throw new Error('Crop area exceeds image boundaries');
            }
            
            // Use ImageManipulator to crop the image to the Container Guide Frame area
            const croppedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [
                    {
                        crop: {
                            originX: cropArea.x,
                            originY: cropArea.y,
                            width: cropArea.width,
                            height: cropArea.height,
                        },
                    },
                ],
                {
                    compress: 0.6,  // Reduced from 0.8 to 0.6 for smaller file size
                    format: ImageManipulator.SaveFormat.JPEG,
                }
            );
            
            console.log('✅ Image cropped successfully to Container Guide Frame area');
            console.log('✅ Cropped image dimensions:', { width: croppedImage.width, height: croppedImage.height });
            
            return croppedImage.uri;
        } catch (error) {
            console.error('❌ Crop error:', error);
            console.error('❌ Error details:', error.message);
            
            // Show user-friendly error message
            Alert.alert(
                'Crop Error', 
                'Unable to crop image. Using full photo instead. Please ensure the container is properly positioned in the frame.',
                [{ text: 'OK' }]
            );
            
            // Fallback to original image if cropping fails
            console.warn('⚠️ Using original image as fallback');
            return imageUri;
        }
    };

    // Helper function to determine container type from ISO code
    const getContainerTypeFromIsoCode = (isoCode) => {
        if (!isoCode) return 'Unknown Container Type';
        
        const isoCodeUpper = isoCode.toUpperCase();
        
        // Check for container type based on letter in ISO code
        if (isoCodeUpper.includes('G')) {
            return 'Dry Container';
        } else if (isoCodeUpper.includes('R')) {
            return 'Refrigerated Container';
        } else if (isoCodeUpper.includes('T')) {
            return 'Tank Container';
        } else if (isoCodeUpper.includes('P')) {
            return 'Flat Rack Container';
        } else if (isoCodeUpper.includes('U')) {
            return 'Open Top Container';
        } else if (isoCodeUpper.includes('S')) {
            return 'Named Cargo Container';
        } else if (isoCodeUpper.includes('H')) {
            return 'Thermal Container';
        } else if (isoCodeUpper.includes('V')) {
            return 'Auto Container';
        } else if (isoCodeUpper.includes('B')) {
            return 'Bulk Container';
        } else if (isoCodeUpper.includes('L')) {
            return 'Livestock Container';
        } else {
            return 'Dry Container';
        }
    };

    // Helper function to determine container size from ISO code
    const getContainerSizeFromIsoCode = (isoCode) => {
        if (isoCode.startsWith('2')) return '20ft';
        if (isoCode.startsWith('4')) return '40ft';
        if (isoCode.startsWith('5')) return '45ft';
        if (isoCode.startsWith('M')) return '48ft';
        return '40ft';
    };

    // Function to extract results from ParkRow data
    const extractParkRowResults = (parkrowData) => {
        const parkrow = parkrowData || {};
        
        const containerNumberConfidence = parkrow.containerNumberConfidence || 0;
        const isoCodeConfidence = parkrow.isoCodeConfidence || 0;
        
        console.log('=== PARKROW DETECTION RESULTS ===');
        console.log('Container Number:');
        console.log(`  ParkRow: "${parkrow.containerNumber}" (${(containerNumberConfidence * 100).toFixed(1)}%)`);
        console.log('ISO Code:');
        console.log(`  ParkRow: "${parkrow.isoCode}" (${(isoCodeConfidence * 100).toFixed(1)}%)`);
        console.log('=================================');
        
        return {
            containerNumber: parkrow.containerNumber,
            isoCode: parkrow.isoCode,
            containerNumberConfidence: containerNumberConfidence,
            isoCodeConfidence: isoCodeConfidence,
            selectedFrom: {
                containerNumber: 'ParkRow',
                isoCode: 'ParkRow'
            }
        };
    };

    // Function to validate container number against database and detect color
    const validateContainerNumber = async () => {
        setIsSubmitting(true);
        
        // Use the manually corrected container number from input fields
        const correctedContainerNumber = containerNumber.join('').trim();
        

        try {
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            console.log('🔍 Validating container number:', correctedContainerNumber);
            
            // Container validation
            const validationResponse = await fetch(`${BACKEND_URL}/api/validate-container`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    containerNumber: correctedContainerNumber,
                    containerStatus: "Not Received"
                }),
            }).then(res => res.json()).catch(err => ({
                success: false,
                error: `Validation Error: ${err.message}`
            }));
            
            console.log('🔍 Full validation response:', JSON.stringify(validationResponse, null, 2));
            
            if (validationResponse.success) {
                console.log('🔍 Container exists check:', validationResponse.exists);
                if (validationResponse.exists) {
                    // Prepare container data using corrected container number
                    const containerData = {
                        containerNumber: correctedContainerNumber,
                        isoCode: isoCode.join('').trim() || extractedData.isoCode,
                        tripSegmentNumber: validationResponse.containerData?.tripSegmentNumber || 'N/A',
                        containerPhoto: image // Include the photo for persistence
                    };
                    
                    // Save container data to state for navigation
                    setContainerData(containerData);
                    
                    // Update container information in database before navigating
                    try {
                        console.log('📝 Updating container information in database...');
                        
                        // Determine container type based on ISO code
                        const containerType = getContainerTypeFromIsoCode(containerData.isoCode);
                        
                        // Get current user's full name from auth context
                        const inspectorName = user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.name || 'Unknown Inspector';
                        
                        // Get current date
                        const inspectionDate = new Date().toISOString();
                        
                        // Determine container size based on ISO code
                        const containerSize = getContainerSizeFromIsoCode(containerData.isoCode);
                        
                        const updateData = {
                            containerNumber: correctedContainerNumber,
                            isoCode: containerData.isoCode,
                            containerType: containerType,
                            containerSize: containerSize,
                            inspectorName: inspectorName,
                            inspectionDate: inspectionDate
                        };
                        
                        console.log('📝 Update data:', updateData);
                        
                        // Call API to update container information
                        const updateResponse = await fetch(`${BACKEND_URL}/api/update-container-info`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(updateData),
                        });
                        
                        const updateResult = await updateResponse.json();
                        console.log('📝 Update response:', updateResult);
                        
                        if (updateResult.success) {
                            console.log('✅ Container information updated successfully');
                            // Photo will be uploaded at final submit
                            console.log('📸 Front wall photo stored for batch upload');
                        } else {
                            console.warn('⚠️ Failed to update container information:', updateResult.error);
                        }
                        
                    } catch (error) {
                        console.error('Error updating container information:', error);
                    }
                    
                    // Navigate to step two with container data including color
                    if (onNavigateToStepTwo) {
                        onNavigateToStepTwo(containerData);
                    }
                } else {
                    console.log('🔍 Container does not exist - showing alert');
                    console.log('🔍 About to show alert');
                    setErrorMessage('does not exists');
                    setErrorContainerNumber(correctedContainerNumber);
                    setShowErrorModal(true);
                }
            } else {
                setContainerModalData({
                    type: 'error',
                    message: validationResponse.error || 'Failed to validate container number'
                });
                setShowContainerModal(true);
            }
            
        } catch (error) {
            console.error('Container validation error:', error);
            setContainerModalData({
                type: 'error',
                message: 'Failed to validate container number. Please check your connection.'
            });
            setShowContainerModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const processImageWithVisionAI = async (imageUri) => {
        setIsProcessing(true);
        try {
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            const startTime = Date.now();
            
            console.log('🚀 Calling ParkRow API for container number and ISO code detection...');
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'container.jpg'
            });
            
            // Call ParkRow API
            const parkrowResponse = await fetch(`${BACKEND_URL}/api/vision/process-image`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }).then(res => res.json()).catch(err => ({
                success: false,
                error: `ParkRow API Error: ${err.message}`,
                data: { containerNumber: '', isoCode: '' }
            }));
            
            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log(`⏱️ Processing completed in ${processingTime}s`);
            
            // Extract ParkRow results
            const bestResults = extractParkRowResults(parkrowResponse.data);
            
            if (bestResults) {
                
                setExtractedData({
                    containerNumber: bestResults.containerNumber || '',
                    isoCode: bestResults.isoCode || ''
                });
                
                // Populate individual character arrays
                const containerChars = (bestResults.containerNumber || '').padEnd(11, ' ').split('').slice(0, 11);
                const isoChars = (bestResults.isoCode || '').padEnd(4, ' ').split('').slice(0, 4);
                setContainerNumber(containerChars);
                setIsoCode(isoChars);
            } else {
                // Fallback to empty values if no data detected
                Alert.alert('No Data Detected', 'Could not extract container information from the image. Please try again.');
                setExtractedData({ containerNumber: '', isoCode: '' });
                setContainerNumber(Array(11).fill(''));
                setIsoCode(Array(4).fill(''));
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to process image with ParkRow API';
            Alert.alert('Error', errorMessage);
            console.error('ParkRow API error:', error);
            console.error('Error stack:', error.stack);
            
            // Set empty values on error
            setExtractedData({ containerNumber: '', isoCode: '' });
            setContainerNumber(Array(11).fill(''));
            setIsoCode(Array(4).fill(''));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleContainerNumberChange = (index, value) => {
        const newContainerNumber = [...containerNumber];
        newContainerNumber[index] = value.toUpperCase().slice(-1);
        setContainerNumber(newContainerNumber);
        
        // Auto-focus next input
        if (value && index < 10) {
            containerNumberRefs.current[index + 1]?.focus();
        }
    };

    const handleIsoCodeChange = (index, value) => {
        const newIsoCode = [...isoCode];
        newIsoCode[index] = value.toUpperCase().slice(-1);
        setIsoCode(newIsoCode);
        
        // Auto-focus next input
        if (value && index < 3) {
            isoCodeRefs.current[index + 1]?.focus();
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setContainerNumber(Array(11).fill(''));
        setIsoCode(Array(4).fill(''));
        setExtractedData({
            containerNumber: '',
            isoCode: '',
        });
    };

    // Function to simulate container positioning detection

    if (!permission) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={cn('flex-1 justify-center items-center')}>
                    <Text style={cn(`text-lg ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Requesting camera permission...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={cn('flex-1 justify-center items-center p-6')}>
                    <Text style={cn(`text-lg text-center ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                        Camera permission is required to take container photos
                    </Text>
                    <Button
                        onPress={requestPermission}
                        className="w-full rounded-lg"
                        style={{
                            background: 'linear-gradient(90deg, #F59E0B 0%, #92400E 100%)',
                        }}
                    >
                        Grant Camera Permission
                    </Button>
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
                        onPress={onBack}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Front Wall
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

            {!image ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    {/* Camera View with Masked Overlay */}
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />
                    
                    {/* Custom Mask Overlay - darkens everything except the camera frame */}
                    <View style={cn('absolute inset-0')} pointerEvents="box-none">
                        {/* Top overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: screenWidth,
                                height: centerY,
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Left overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY,
                                left: 0,
                                width: centerX,
                                height: containerHeight,
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Right overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY,
                                left: centerX + containerWidth,
                                width: centerX,
                                height: containerHeight,
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Bottom overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY + containerHeight,
                                left: 0,
                                width: screenWidth,
                                height: screenHeight - (centerY + containerHeight),
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Container Guide Frame - drawn on top */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY,
                                left: centerX,
                                width: containerWidth,
                                height: containerHeight,
                                borderWidth: 2,
                                borderColor: '#10B981',
                                backgroundColor: 'transparent',
                            }}
                        />
                    </View>
                    
                    {/* Instruction Text - Above the mask */}
                    <View style={cn('absolute top-4 left-4 right-4 items-center')} pointerEvents="none">
                        <View style={cn('bg-black/70 p-6 rounded-lg')}>
                            <Text style={cn('text-white text-center text-lg font-semibold')}>
                                Make sure the Container Number is clearly visible
                            </Text>
                        </View>
                    </View>
                    
                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 bg-black/50 right-0 pb-20 pt-4')}>
                        <View style={cn('flex-row items-center justify-center px-8')}>
                            {/* Capture Button */}
                            <TouchableOpacity
                                onPress={takePicture}
                                style={cn('w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center')}
                            >
                                <View style={cn('w-16 h-16 rounded-full bg-white')} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                // Photo Preview with Controls
                <KeyboardAvoidingView 
                    style={cn('flex-1')}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView 
                        style={cn('flex-1')} 
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={cn('p-6')}>
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <View style={cn('mb-2 flex items-center justify-center')}>
                                <View style={cn('relative')}>
                                    {/* Display cropped image preview (from Container Guide Frame area) */}
                                    <Image 
                                        source={typeof image === 'string' ? { uri: image } : image} 
                                        style={{
                                            width: 280,
                                            height: 280 * 0.94, // Maintain the same aspect ratio as the Container Guide Frame
                                            borderRadius: 8,
                                        }}
                                        resizeMode="cover"
                                    />
                                    {/* Eye Icon Overlay - Click to zoom cropped photo */}
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

                            {/* Retake Button */}
                            <TouchableOpacity
                                onPress={retakePhoto}
                                style={cn('rounded-lg overflow-hidden w-full')}
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
                        </View>

                        {/* Extracted Data Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4`)}>
                            {isProcessing ? (
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
                                    {/* Container Number */}
                                    <View style={cn(`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`)}>
                                        <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`)}>
                                            Container Number
                                        </Text>
                                        <View style={cn('flex-row gap-1 flex-wrap')}>
                                            {containerNumber.map((char, index) => (
                                                <View key={index} style={cn('items-center justify-center')}>
                                                    <TextInput
                                                        ref={(ref) => (containerNumberRefs.current[index] = ref)}
                                                        value={char}
                                                        onChangeText={(value) => handleContainerNumberChange(index, value)}
                                                        style={[
                                                            cn(`w-10 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
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

                                    {/* ISO Code */}
                                    <View style={cn('flex-row gap-2 mt-2')}>
                                        {/* ISO Code */}
                                        <View style={[cn(`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`), { flex: 0.9 }]}>
                                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`)}>
                                                ISO Code
                                            </Text>
                                            <View style={cn('flex-row gap-1')}>
                                                {isoCode.map((char, index) => (
                                                    <View key={index} style={cn('items-center justify-center')}>
                                                        <TextInput
                                                            ref={(ref) => (isoCodeRefs.current[index] = ref)}
                                                            value={char}
                                                            onChangeText={(value) => handleIsoCodeChange(index, value)}
                                                            style={[
                                                                cn(`w-10 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
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
                                    </View>
                                </View>
                            )}

                            {/* Next Button */}
                            <View style={cn('mt-4')}>
                                <TouchableOpacity
                                    onPress={validateContainerNumber}
                                    disabled={isSubmitting}
                                    style={cn(`rounded-lg overflow-hidden w-full ${isSubmitting ? 'opacity-50' : ''}`)}
                                >
                                    <LinearGradient
                                        colors={isSubmitting ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        {isSubmitting ? (
                                            <View style={cn('flex-row items-center')}>
                                                <ActivityIndicator 
                                                    size="small" 
                                                    color="white" 
                                                    style={cn('mr-2')}
                                                />
                                                <Text style={cn('text-white font-bold')}>
                                                    Submitting...
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={cn('text-white font-bold')}>
                                                Next
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                           
                        </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* Zoom Modal - Shows Cropped Photo */}
            <Modal
                visible={showZoomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowZoomModal(false)}
            >
                <View style={cn('flex-1 bg-black items-center justify-center')}>
                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={() => setShowZoomModal(false)}
                        style={cn('absolute top-12 right-6 z-10 bg-white/20 rounded-full p-3')}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    {/* Full Size Cropped Image (from Container Guide Frame area) */}
                    <Image 
                        source={typeof image === 'string' ? { uri: image } : image} 
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
                <View style={cn('flex-1 bg-black/50 items-center justify-center px-6')}>
                    <View style={cn('bg-white rounded-2xl p-8 items-center max-w-sm w-full relative')}>
                        {/* Red Error Icon */}
                        <View style={cn('absolute -top-8 w-16 h-16 bg-red-500 rounded-full items-center justify-center shadow-lg')}>
                            <Text style={cn('text-white text-2xl font-bold')}>✕</Text>
                        </View>
                        
                        {/* Error Message */}
                        <Text style={cn('text-black text-lg font-semibold text-center mt-4 mb-2')}>
                            Container Number{' '}
                            <Text style={cn('text-red-500 font-bold')}>
                                {errorContainerNumber}
                            </Text>
                            {' '}{errorMessage}
                        </Text>
                        
                        {/* Additional Message */}
                        <Text style={cn('text-gray-600 text-sm text-center mb-6 font-semibold')}>
                            Verify if the Container Number is correct
                        </Text>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowErrorModal(false)}
                            style={cn('bg-red-500 px-8 py-3 rounded-lg w-full')}
                        >
                            <Text style={cn('text-white text-lg font-semibold text-center')}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Custom Container Validation Modal */}
            <Modal
                visible={showContainerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowContainerModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                {containerModalData.type === 'success' ? 'Container Found!' : 'Container Not Found'}
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                {containerModalData.message}
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowContainerModal(false)}
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

export default StepOneContainerPhoto;
