import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator, Modal, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { API_CONFIG } from '../../lib/config';
import { Moon, Sun, Camera, Eye, X, ArrowLeft } from 'lucide-react-native';

const StepSevenLeftSidePhoto = ({ containerData, truckData, onBack, onNavigateToStepEight, onNavigateToDamagePhotos, onNavigateToDamagePhotosDirect }) => {
    const { isDark, toggleTheme } = useTheme();
    const [facing, setFacing] = useState('back');
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [leftSidePhotoData, setLeftSidePhotoData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const cameraRef = useRef(null);
    const [trailerNumber, setTrailerNumber] = useState(null);
    const [truckNumber, setTruckNumber] = useState(null);

    const [permission, requestPermission] = useCameraPermissions();

    // Camera overlay dimensions for left wall photos
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const leftWallFrameWidth = screenWidth * 0.60;
    const leftWallFrameHeight = screenHeight * 0.70;
    
    const centerX = (screenWidth - leftWallFrameWidth) / 2;
    const centerY = 80;

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

    // Restore left side photo when navigating back
    useEffect(() => {
        if (containerData?.leftSidePhoto) {
            console.log('🔄 Restoring left side photo from navigation data');
            setImage(containerData.leftSidePhoto);
        }
    }, [containerData?.leftSidePhoto]);

    if (!permission) {
        // Camera permissions are still loading
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={cn('flex-1 justify-center items-center')}>
                <Text style={cn('text-center mb-4')}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={cn('bg-blue-500 px-4 py-2 rounded')}>
                    <Text style={cn('text-white')}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
        let imageOverlayWidth = leftWallFrameWidth * scale;
        let imageOverlayHeight = leftWallFrameHeight * scale;
        imageOverlayX = Math.max(0, imageOverlayX);
        imageOverlayY = Math.max(0, imageOverlayY);
        if (imageOverlayX + imageOverlayWidth > imageWidth) imageOverlayWidth = imageWidth - imageOverlayX;
        if (imageOverlayY + imageOverlayHeight > imageHeight) imageOverlayHeight = imageHeight - imageOverlayY;
        return { x: Math.round(imageOverlayX), y: Math.round(imageOverlayY), width: Math.round(imageOverlayWidth), height: Math.round(imageOverlayHeight) };
    };

    const cropImageToLeftWallFrame = async (imageUri) => {
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
                try {
                    const fileInfo = await fetch(photo.uri);
                    const blob = await fileInfo.blob();
                    console.log(`📊 Original Left Wall photo size: ${(blob.size / 1024).toFixed(2)} KB (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (e) {}

                const croppedImage = await cropImageToLeftWallFrame(photo.uri);

                try {
                    const fileInfo = await fetch(croppedImage);
                    const blob = await fileInfo.blob();
                    const originalFileInfo = await fetch(photo.uri);
                    const originalBlob = await originalFileInfo.blob();
                    const reduction = (((originalBlob.size - blob.size) / originalBlob.size) * 100).toFixed(1);
                    console.log(`📊 Cropped Left Wall photo size: ${(blob.size / 1024).toFixed(2)} KB (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
                    console.log(`📉 Size reduction: ${reduction}% smaller after cropping`);
                } catch (e) {}

                setImage(croppedImage);
                console.log('📸 Left Wall photo taken and cropped successfully');
            }
        } catch (error) {
            console.error('❌ Error taking Left Wall photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const uploadLeftSidePhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            console.log('📸 Uploading left Wall Photo to S3...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: image,
                type: 'image/jpeg',
                name: 'left_side_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'leftSide');
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-left-side-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-left-side-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Left Wall Photo uploaded successfully to S3:', result.leftSidePhoto);
                return { success: true, leftSidePhoto: result.leftSidePhoto };
            } else {
                console.error('❌ Failed to upload left Wall Photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading left Wall Photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Information', 'Please take a photo of the container left side.');
            return;
        }

        try {
            setIsProcessing(true);
            console.log('📸 Storing Left Wall photo for batch upload');
            
            // Store the photo data for batch upload at final submit
            const photoData = {
                ...containerData,
                ...truckData,
                leftSidePhoto: image  // Store for preview and batch upload
            };
            
            setLeftSidePhotoData(photoData);
            
            console.log('✅ Left Wall photo stored successfully');
            
            // Check if Left Wall damage already exists in database
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
                
                console.log('📊 Existing damage locations:', damageLocations);
                
                // If Left Wall damage already exists, skip modal and go directly to damage photos
                if (damageLocations.includes('Left Wall')) {
                    console.log('✅ Left Wall damage already exists - navigating to damage photos');
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
            console.error('❌ Error storing Left Wall photo:', error);
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDamageResponse = async (isDamaged) => {
        setShowDamageModal(false);
        
        if (isDamaged) {
            // Update hasDamages in database to "Yes"
            try {
                console.log('🔧 Updating damage status in database...');
                
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
                        damageLocation: 'Left Wall'
                    }),
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                    console.log('✅ Damage status updated successfully:', updateResult);
                } else {
                    console.error('❌ Failed to update damage status:', updateResult.error);
                }
                
                // Use the already uploaded photo data
                const finalPhotoData = {
                    ...leftSidePhotoData,
                    hasLeftSideDamage: 'Yes'
                };
                
                // Navigate to damage photos screen instead of next step
                if (onNavigateToDamagePhotos) {
                    onNavigateToDamagePhotos(finalPhotoData);
                }
                
            } catch (error) {
                console.error('❌ Error updating damage status:', error);
                Alert.alert('Error', 'Failed to update damage status. Please try again.');
            }
        } else {
            // No damage - proceed normally using the already uploaded photo data
            const finalPhotoData = {
                ...leftSidePhotoData,
                hasLeftSideDamage: 'No'
            };

            // Navigate to next step
            if (onNavigateToStepEight) {
                onNavigateToStepEight(finalPhotoData);
            }
        }
    };


    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`flex-row items-center justify-between px-4 py-3 ${isDark ? 'bg-gray-900' : 'bg-white/10'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`)}>
                <View style={cn('flex-row items-center flex-1')}>
                    <TouchableOpacity 
                        onPress={() => {
                            // Pass containerData and truckData back for data persistence
                            if (onBack) {
                                onBack({
                                    ...containerData,
                                    ...truckData
                                });
                            }
                        }}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                        Left Wall
                    </Text>
                </View>
                
                <View style={cn('flex-row items-center')}>
                    {/* Timer Display */}
                    <TimerDisplay />
                    
                    
                    <TouchableOpacity onPress={toggleTheme} style={cn('p-2')}>
                        {isDark ? <Sun size={24} color="#F59E0B" /> : <Moon size={24} color="#1F2937" />}
                    </TouchableOpacity>
                </View>
            </View>

            {!image ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                    />

                    {/* Custom Mask Overlay */}
                    <View style={cn('absolute inset-0')} pointerEvents="box-none">
                        <View style={{ position: 'absolute', top: 0, left: 0, width: screenWidth, height: centerY + 1, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: 0, width: centerX, height: screenHeight - centerY, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX + leftWallFrameWidth, width: screenWidth - (centerX + leftWallFrameWidth), height: screenHeight - centerY, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX, width: leftWallFrameWidth, height: leftWallFrameHeight, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'transparent' }} />
                    </View>
                    
                    <View style={cn('absolute top-4 left-4 right-4 items-center')} pointerEvents="none">
                        <View style={cn('pt-2 rounded-lg')}>
                            <Text style={cn('text-white text-center text-lg font-semibold')}>
                                Capture the Left Wall of the container
                            </Text>
                        </View>
                    </View>
                    
                    <View style={cn('absolute bottom-0 left-0 bg-black right-0 pb-12 pt-1')}>
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
                                <View style={cn('flex-1 ml-4')}>
                                    <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                        Truck Number
                                    </Text>
                                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                        {containerData?.truckNumber || 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Photo Preview Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Left Wall Photo
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
                                Is the Left Side damaged?
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

export default StepSevenLeftSidePhoto;
