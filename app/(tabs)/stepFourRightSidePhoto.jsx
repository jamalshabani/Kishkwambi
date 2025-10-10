import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { API_CONFIG } from '../../lib/config';
import { Moon, Sun, Camera, Eye, X, ArrowLeft } from 'lucide-react-native';

export default function StepFourRightSidePhoto({ containerData, trailerData, onBack, onNavigateToStepFive, onNavigateToDamagePhotos, onNavigateToDamagePhotosDirect }) {
    const { isDark, toggleTheme } = useTheme();
    const [facing, setFacing] = useState('back');
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [rightWallPhotoData, setRightWallPhotoData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [trailerNumber, setTrailerNumber] = useState(null);
    const cameraRef = useRef(null);

    // Fetch trailer number from database
    useEffect(() => {
        const fetchTrailerNumber = async () => {
            try {
                if (!containerData?.tripSegmentNumber) return;
                
                console.log('🚗 Fetching trailer number from database...');
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                
                const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData.tripSegmentNumber}/trailer-details`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.trailerNumber) {
                        console.log('✅ Trailer number fetched:', result.trailerNumber);
                        setTrailerNumber(result.trailerNumber);
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching trailer number:', error);
            }
        };
        
        fetchTrailerNumber();
    }, [containerData?.tripSegmentNumber]);

    // Restore right side photo when navigating back
    useEffect(() => {
        if (containerData?.rightWallPhoto) {
            console.log('🔄 Restoring right side photo from navigation data');
            setImage(containerData.rightWallPhoto);
        }
    }, [containerData?.rightWallPhoto]);

    const [permission, requestPermission] = useCameraPermissions();

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
                console.log('📸 Right wall photo taken successfully');
            }
        } catch (error) {
            console.error('❌ Error taking right wall photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };


    const retakePhoto = () => {
        setImage(null);
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Information', 'Please take a photo of the container right wall.');
            return;
        }

        try {
            setIsProcessing(true);
            console.log('📸 Storing right wall photo for batch upload');
            
            // Store the photo data for batch upload at final submit
            const photoData = {
                ...containerData,
                ...trailerData,
                rightWallPhoto: image  // Store for preview and batch upload
            };
            
            setRightWallPhotoData(photoData);
            
            console.log('✅ Right wall photo stored successfully');
            
            // Check if Right Wall damage already exists in database
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
                
                // If Right Wall damage already exists, skip modal and go directly to damage photos
                if (damageLocations.includes('Right Wall')) {
                    console.log('✅ Right Wall damage already exists - navigating to damage photos');
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
            console.error('❌ Error storing right wall photo:', error);
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
                        damageLocation: 'Right Wall'
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
                    ...rightWallPhotoData,
                    hasRightWallDamage: 'Yes'
                };
                
                // Navigate to damage photos screen instead of next step
                if (onNavigateToDamagePhotos) {
                    onNavigateToDamagePhotos(finalPhotoData);
                } else if (onNavigateToStepFive) {
                    onNavigateToStepFive(finalPhotoData);
                }
                
            } catch (error) {
                console.error('❌ Error updating damage status:', error);
                Alert.alert('Error', 'Failed to update damage status. Please try again.');
            }
        } else {
            // No damage - proceed normally using the already uploaded photo data
            const finalPhotoData = {
                ...rightWallPhotoData,
                hasRightWallDamage: 'No'
            };

            // Navigate to next step
            if (onNavigateToStepFive) {
                onNavigateToStepFive(finalPhotoData);
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
                        onPress={() => onBack(containerData)}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                        Right Wall
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
                        ratio="1:1"
                    />
                    
                    {/* Container Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Container Guide Frame */}
                        <View style={cn('relative')}>
                            {/* Container Rectangle Outline */}
                            <View
                                style={[
                                    cn('border-2 border-green-500 bg-green-500/10 -mt-33'),
                                    {
                                        width: Dimensions.get('window').width * 0.7,
                                        height: Dimensions.get('window').width * 1.2, // Further increased height for optimal container right wall framing
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
                                        {trailerNumber || trailerData?.trailerNumber || containerData?.trailerNumber || 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Photo Preview Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Right Wall Photo
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
                                Is the Right Wall damaged?
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
}
