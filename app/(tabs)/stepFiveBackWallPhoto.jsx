import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepFiveBackWallPhoto = ({ onBack, onBackToRightWallDamage, containerData, onNavigateToStepSix, onNavigateToDamagePhotos, onNavigateToDamagePhotosDirect }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
    const [frontWallPhotoData, setFrontWallPhotoData] = useState(null);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const cameraRef = useRef(null);
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
            }
        };
        fetchTrailerNumber();
    }, [containerData?.tripSegmentNumber]);

    // Restore back wall photo when navigating back
    useEffect(() => {
        if (containerData?.backWallPhoto) {
            setImage(containerData.backWallPhoto);
        }
    }, [containerData?.backWallPhoto]);

    // Conditional back navigation - check if Right Wall damage exists
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
                
                // Check if "Right Wall" is in damage locations
                if (damageLocations.includes('Right Wall')) {
                    // Navigate to Right Wall damage photos with containerData
                    if (onBackToRightWallDamage) {
                        onBackToRightWallDamage(containerData);
                    }
                } else {
                    // Navigate to step four (Right Wall photo preview) with data for persistence
                    if (onBack) {
                        onBack(containerData);
                    }
                }
            } else {
                // If no data or error, default to step four with data for persistence
                if (onBack) {
                    onBack(containerData);
                }
            }
        } catch (error) {
            // On error, default to step four with data for persistence
            if (onBack) {
                onBack(containerData);
            }
        }
    };

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    // Camera overlay dimensions for back wall photos
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const backWallFrameWidth = screenWidth * 0.85;
    const backWallFrameHeight = backWallFrameWidth * 0.94;
    
    // Calculate the center position for the back wall frame
    const centerX = (screenWidth - backWallFrameWidth) / 2;
    const centerY = (screenHeight - backWallFrameHeight) / 2 - 80;

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

    // Function to calculate crop area based on back wall frame dimensions
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
        const actualCenterX = centerX + offsetX;
        const actualCenterY = centerY + offsetY;
        
        let imageOverlayX = actualCenterX * scale;
        let imageOverlayY = actualCenterY * scale;
        let imageOverlayWidth = backWallFrameWidth * scale;
        let imageOverlayHeight = backWallFrameHeight * scale;
        
        imageOverlayX = Math.max(0, imageOverlayX);
        imageOverlayY = Math.max(0, imageOverlayY);
        
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
            height: Math.round(imageOverlayHeight)
        };
    };

    // Function to crop image to back wall frame area
    const cropImageToBackWallFrame = async (imageUri) => {
        try {
            const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { format: ImageManipulator.SaveFormat.JPEG });
            const imageWidth = imageInfo.width;
            const imageHeight = imageInfo.height;
            
            const cropArea = calculateCropArea(imageWidth, imageHeight);
            
            if (cropArea.x < 0 || cropArea.y < 0 || cropArea.width <= 0 || cropArea.height <= 0) {
                return imageUri;
            }
            
            if (cropArea.x + cropArea.width > imageWidth || cropArea.y + cropArea.height > imageHeight) {
                return imageUri;
            }
            
            const croppedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ crop: { originX: cropArea.x, originY: cropArea.y, width: cropArea.width, height: cropArea.height } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            return croppedImage.uri;
        } catch (error) {
            return imageUri;
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
                } catch (sizeError) {
                }

                // Crop the image to the back wall frame area
                const croppedImage = await cropImageToBackWallFrame(photo.uri);

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
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const uploadFrontWallPhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: image,
                type: 'image/jpeg',
                name: 'front_wall_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'frontWall');
            
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-front-wall-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                return { success: true, frontWallPhoto: result.frontWallPhoto };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const handleDamageResponse = async (isDamaged) => {
        setShowDamageModal(false);
        
        if (isDamaged) {
            // Update hasDamages in database to "Yes"
            try {
                
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                
                // Update damage status to "Yes"
                const updateResponse = await fetch(`${BACKEND_URL}/api/update-damage-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tripSegmentNumber: containerData?.tripSegmentNumber,
                        hasDamages: 'Yes',
                        damageLocation: 'Back Wall'
                    }),
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                } else {
                }
                
                // Use the already uploaded photo data
                const finalPhotoData = {
                    ...frontWallPhotoData,
                    hasFrontWallDamage: 'Yes'
                };
                
                // Navigate to damage photos screen instead of next step
                if (onNavigateToDamagePhotos) {
                    onNavigateToDamagePhotos(finalPhotoData);
                }
                
            } catch (error) {
                Alert.alert('Error', 'Failed to update damage status. Please try again.');
            }
        } else {
            // No damage - proceed normally using the already uploaded photo data
            const finalPhotoData = {
                ...frontWallPhotoData,
                hasFrontWallDamage: 'No'
            };

            // Navigate to next step
            if (onNavigateToStepSix) {
                onNavigateToStepSix(finalPhotoData);
            }
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Photo', 'Please take a Back Wall photo before proceeding.');
            return;
        }

        try {
            setIsProcessing(true);
            
            // Store the photo data for batch upload at final submit
            const photoData = {
                ...containerData,
                backWallPhoto: image  // Store for preview and batch upload
            };
            
            setFrontWallPhotoData(photoData);
            
            
            // Check if Back Wall damage already exists in database
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            const damageCheckResponse = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData?.tripSegmentNumber}/damage-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (damageCheckResponse.ok) {
                const damageResult = await damageCheckResponse.json();
                const damageLocations = damageResult.damageLocations || [];
                
                
                // If Back Wall damage already exists, skip modal and go directly to damage photos
                if (damageLocations.includes('Back Wall')) {
                    if (onNavigateToDamagePhotosDirect) {
                        onNavigateToDamagePhotosDirect(photoData);
                    } else if (onNavigateToDamagePhotos) {
                        onNavigateToDamagePhotos(photoData);
                    }
                    return;
                }
            }
            
            // Show damage check modal if no existing damage
            setShowDamageModal(true);
            
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
                        Back Wall
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

                    {/* Custom Mask Overlay - darkens everything except the back wall frame */}
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
                                height: backWallFrameHeight,
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Right overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY,
                                left: centerX + backWallFrameWidth,
                                width: centerX,
                                height: backWallFrameHeight,
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Bottom overlay */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY + backWallFrameHeight,
                                left: 0,
                                width: screenWidth,
                                height: screenHeight - (centerY + backWallFrameHeight),
                                backgroundColor: 'black'
                            }}
                        />
                        
                        {/* Back Wall Frame Guide - drawn on top */}
                        <View 
                            style={{
                                position: 'absolute',
                                top: centerY,
                                left: centerX,
                                width: backWallFrameWidth,
                                height: backWallFrameHeight,
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
                                Capture the Back Wall of the container
                            </Text>
                        </View>
                    </View>
                    
                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 bg-black/50 right-0 pb-20 pt-4')}>
                        <View style={cn('flex-row items-center justify-center px-8')}>
                            {/* Capture Button */}
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
                // Photo Preview
                <ScrollView style={cn('flex-1')} showsVerticalScrollIndicator={false}>
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

                        {/* Photo Preview Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Back Wall Photo
                            </Text>
                            
                            <TouchableOpacity
                                onPress={() => setShowZoomModal(true)}
                                style={cn('relative')}
                            >
                                <Image 
                                    source={{ uri: image }} 
                                    style={cn('w-full h-64 rounded-lg')} 
                                />
                                <View style={cn('absolute inset-0 bg-black/30 rounded-lg items-center justify-center')}>
                                    <Eye size={32} color="white" />
                                </View>
                            </TouchableOpacity>

                            {/* Retake Button */}
                            <TouchableOpacity
                                onPress={() => setImage(null)}
                                style={cn('mt-4 rounded-lg overflow-hidden')}
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

                            {/* Next Button */}
                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={isProcessing}
                                style={cn(`mt-4 rounded-lg overflow-hidden ${isProcessing ? 'opacity-50' : ''}`)}
                            >
                                <LinearGradient
                                    colors={isProcessing ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    {isProcessing ? (
                                        <View style={cn('flex-row items-center')}>
                                            <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                            <Text style={cn('text-white font-bold')}>Uploading...</Text>
                                        </View>
                                    ) : (
                                        <Text style={cn('text-white font-bold')}>Next</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
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

            {/* Damage Check Modal */}
            <Modal
                visible={showDamageModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDamageModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl mx-8 p-6`)}>
                        
                        {/* Question Text */}
                        <View style={cn('mb-6')}>
                            <Text style={cn(`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-black'} mb-2`)}>
                                Damage Check
                            </Text>
                            <Text style={cn(`text-lg font-semibold text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                Is the Back Wall damaged?
                            </Text>
                        </View>
                        
                        {/* Yes/No Buttons */}
                        <View style={cn('flex-row gap-3')}>
                            <TouchableOpacity
                                onPress={() => handleDamageResponse(true)}
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
                                onPress={() => handleDamageResponse(false)}
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
        </SafeAreaView>
    );
};

export default StepFiveBackWallPhoto;
