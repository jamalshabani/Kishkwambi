import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepEightInsidePhoto = ({ onBack, containerData, onNavigateToStepNine, onNavigateToDamagePhotos, onNavigateToInspectionRemarks, onNavigateToDamagePhotosDirect }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
    const [insidePhotoData, setInsidePhotoData] = useState(null);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const cameraRef = useRef(null);

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
                console.log('📸 Inside photo taken successfully');
            }
        } catch (error) {
            console.error('❌ Error taking inside photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const uploadInsidePhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            console.log('📸 Uploading inside photo to S3...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: `data:image/jpeg;base64,${imageBase64}`,
                type: 'image/jpeg',
                name: 'inside_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'inside');
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-inside-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-inside-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Inside photo uploaded successfully to S3:', result.insidePhoto);
                return { success: true, insidePhoto: result.insidePhoto };
            } else {
                console.error('❌ Failed to upload inside photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading inside photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Information', 'Please take a photo of the container inside.');
            return;
        }

        try {
            setIsProcessing(true);
            console.log('📸 Starting inside photo upload...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            console.log('📊 Base64 data length:', image?.length);
            
            // Create form data for upload - React Native compatible approach
            const formData = new FormData();
            
            // Create a file-like object from base64 data
            const fileData = {
                uri: `data:image/jpeg;base64,${image}`,
                type: 'image/jpeg',
                name: 'inside_photo.jpg',
            };
            
            formData.append('photos', fileData);
            formData.append('tripSegmentNumber', containerData?.tripSegmentNumber || '');
            formData.append('containerNumber', containerData?.containerNumber || '');
            formData.append('photoType', 'container');
            formData.append('containerPhotoLocation', 'Container Inside');
            
            console.log('📊 File data created for upload');
            
            // Upload to Backblaze B2 and save to database
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-container-photos`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
                console.log('✅ Inside photo uploaded successfully:', uploadResult);
                
                // Calculate file size from base64 data (approximate)
                const fileSize = Math.round((image.length * 3) / 4);
                console.log('📊 Estimated file size:', fileSize, 'bytes');
                
                // Store the upload result for later use
                setInsidePhotoData({
                    ...containerData,
                    insidePhoto: image,
                    insidePhotoUploadResult: uploadResult,
                    insidePhotoSize: fileSize
                });
                
                // Automatically set container load status to "Empty" in database
                try {
                    console.log('🔧 Setting container load status to Empty...');
                    
                    const loadStatusResponse = await fetch(`${BACKEND_URL}/api/update-container-load-status`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            tripSegmentNumber: containerData?.tripSegmentNumber,
                            containerLoadStatus: 'Empty'
                        }),
                    });
                    
                    const loadStatusResult = await loadStatusResponse.json();
                    
                    if (loadStatusResult.success) {
                        console.log('✅ Container load status set to Empty successfully:', loadStatusResult);
                    } else {
                        console.error('❌ Failed to set container load status:', loadStatusResult.error);
                    }
                } catch (error) {
                    console.error('❌ Error setting container load status:', error);
                }
                
                // Show damage check modal after successful upload
                setShowDamageModal(true);
            } else {
                console.error('❌ Failed to upload inside photo:', uploadResult.error);
                Alert.alert('Upload Error', 'Failed to upload inside photo. Please try again.');
            }
            
        } catch (error) {
            console.error('❌ Error uploading inside photo:', error);
            Alert.alert('Error', 'An error occurred while uploading the photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };


    const checkOverallDamageStatusAndNavigate = async (finalPhotoData) => {
        try {
            console.log('🔍 Checking overall damage status...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Check damage status from database
            const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData?.tripSegmentNumber}/damage-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('📊 Overall damage status:', result.hasDamages);
                
                if (result.hasDamages === 'Yes') {
                    // There are damages - show Inspection Remarks screen
                    if (onNavigateToInspectionRemarks) {
                        onNavigateToInspectionRemarks(finalPhotoData);
                    }
                } else {
                    // No damages - skip Inspection Remarks and go directly to Driver Details
                    if (onNavigateToStepNine) {
                        onNavigateToStepNine(finalPhotoData);
                    }
                }
            } else {
                console.error('❌ Failed to check damage status:', result.error);
                // Default to showing Inspection Remarks if we can't check
                if (onNavigateToInspectionRemarks) {
                    onNavigateToInspectionRemarks(finalPhotoData);
                }
            }
            
        } catch (error) {
            console.error('❌ Error checking damage status:', error);
            // Default to showing Inspection Remarks if there's an error
            if (onNavigateToInspectionRemarks) {
                onNavigateToInspectionRemarks(finalPhotoData);
            }
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
                        damageLocation: 'Container Inside'
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
                    ...insidePhotoData,
                    hasInsideDamage: 'Yes'
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
            // No damage - check overall damage status before proceeding
            const finalPhotoData = {
                ...insidePhotoData,
                hasInsideDamage: 'No'
            };

            // Check if there are any damages in the entire inspection
            await checkOverallDamageStatusAndNavigate(finalPhotoData);
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
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Inside
                    </Text>
                </View>

                {/* Timer Display and Navigation Buttons */}
                <View style={cn('flex-row items-center')}>
                    {/* Timer Display */}
                    <TimerDisplay />

                    {/* Go to Damage Photos Button */}
                    <TouchableOpacity 
                        onPress={() => onNavigateToDamagePhotosDirect && onNavigateToDamagePhotosDirect({})}
                        style={cn(`mr-3 px-3 py-1 rounded-lg ${isDark ? 'bg-red-600' : 'bg-red-500'}`)}
                    >
                        <Text style={cn('text-white text-sm font-medium')}>
                            Go to Damage Photos
                        </Text>
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
                    
                    {/* Container Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Container Number and Trip Segment Display */}
                        <View style={cn('absolute top-4 left-4 right-4')}>
                            <View style={cn(`p-4 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`)}>
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
                        </View>

                        {/* Container Guide Frame */}
                        <View style={cn('relative')}>
                            {/* Container Rectangle Outline */}
                            <View
                                style={[
                                    cn('border-2 border-green-500 bg-green-500/10'),
                                    {
                                        width: 280,
                                        height: 420,
                                        borderRadius: 8,
                                    }
                                ]}
                            />

                            {/* Corner Brackets */}
                            {/* Top Left */}
                            <View
                                style={[
                                    cn('absolute -top-2 -left-2'),
                                    {
                                        width: 20,
                                        height: 20,
                                        borderTopWidth: 3,
                                        borderLeftWidth: 3,
                                        borderTopColor: '#10b981',
                                        borderLeftColor: '#10b981',
                                    }
                                ]}
                            />
                            {/* Top Right */}
                            <View
                                style={[
                                    cn('absolute -top-2 -right-2'),
                                    {
                                        width: 20,
                                        height: 20,
                                        borderTopWidth: 3,
                                        borderRightWidth: 3,
                                        borderTopColor: '#10b981',
                                        borderRightColor: '#10b981',
                                    }
                                ]}
                            />
                            {/* Bottom Left */}
                            <View
                                style={[
                                    cn('absolute -bottom-2 -left-2'),
                                    {
                                        width: 20,
                                        height: 20,
                                        borderBottomWidth: 3,
                                        borderLeftWidth: 3,
                                        borderBottomColor: '#10b981',
                                        borderLeftColor: '#10b981',
                                    }
                                ]}
                            />
                            {/* Bottom Right */}
                            <View
                                style={[
                                    cn('absolute -bottom-2 -right-2'),
                                    {
                                        width: 20,
                                        height: 20,
                                        borderBottomWidth: 3,
                                        borderRightWidth: 3,
                                        borderBottomColor: '#10b981',
                                        borderRightColor: '#10b981',
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
                // Photo Preview
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

                        {/* Photo Preview Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Inside Photo
                            </Text>
                            
                            <TouchableOpacity
                                onPress={() => setShowZoomModal(true)}
                                style={cn('relative')}
                            >
                                <Image 
                                    source={{ uri: `data:image/jpeg;base64,${image}` }} 
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
                        source={{ uri: `data:image/jpeg;base64,${image}` }} 
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
                                Is the Inside damaged?
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

export default StepEightInsidePhoto;
