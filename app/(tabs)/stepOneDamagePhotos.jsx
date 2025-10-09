import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { API_CONFIG } from '../../lib/config';
import { Sun, Moon, Eye, X, Camera, ArrowLeft } from 'lucide-react-native';

const StepOneDamagePhotos = ({ onBack, containerData, onNavigateToStepThree, onNavigateToStepTwo }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [damagePhotos, setDamagePhotos] = useState([]);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef(null);
    const [damageData, setDamageData] = useState(null);

    // Restore damage photos when navigating back
    useEffect(() => {
        if (containerData?.frontWallDamagePhotos && containerData.frontWallDamagePhotos.length > 0) {
            console.log('📸 Restoring Front Wall damage photos from previous data');
            console.log('📸 Number of photos to restore:', containerData.frontWallDamagePhotos.length);
            // Convert stored photos back to format expected by the component
            const restoredPhotos = containerData.frontWallDamagePhotos.map((photo, index) => ({
                id: photo.id || Date.now() + index, // Ensure each photo has a unique id
                uri: photo.uri || `data:image/jpeg;base64,${photo.base64}`,
                base64: photo.base64,
                timestamp: photo.timestamp || new Date().toISOString()
            }));
            setDamagePhotos(restoredPhotos);
            console.log('✅ Damage photos restored successfully');
        } else {
            console.log('⚠️ No Front Wall damage photos to restore');
        }
    }, [containerData]);

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


    // Function to upload damage photos to S3
    const uploadDamagePhotosToS3 = async (photos, tripSegmentNumber) => {
        try {
            console.log('📸 Uploading damage photos to S3...');

            const BACKEND_URL = API_CONFIG.getBackendUrl();

            // Create FormData for file upload
            const formData = new FormData();

            // Add all damage photos
            photos.forEach((photo, index) => {
                formData.append('photos', {
                    uri: photo.uri,
                    type: 'image/jpeg',
                    name: `damage_${index + 1}.jpg`
                });
            });

            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('containerNumber', containerData?.containerNumber || '');
            formData.append('damageLocation', 'Front Wall'); // Set damage location to Front Wall

            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-damage-photos`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            console.log('📸 Photo count:', photos.length);

            const response = await fetch(`${BACKEND_URL}/api/upload/s3-damage-photos`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Damage photos uploaded successfully to S3:', result.damagePhotos);
                return { success: true, damagePhotos: result.damagePhotos };
            } else {
                console.error('❌ Failed to upload damage photos to S3:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Error uploading damage photos to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const takePicture = () => {
        setShowCamera(true);
    };

    const capturePhoto = async () => {
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
                const newPhoto = {
                    id: Date.now(),
                    uri: photo.uri,
                    base64: photo.base64,
                    timestamp: new Date().toISOString()
                };

                setDamagePhotos(prev => [...prev, newPhoto]);
                console.log('📸 Damage photo taken successfully');
                setShowCamera(false);
            }
        } catch (error) {
            console.error('❌ Error taking damage photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const removePhoto = (photoId) => {
        setDamagePhotos(prev => prev.filter(photo => photo.id !== photoId));
    };


    const handleNext = async () => {
        if (damagePhotos.length === 0) {
            Alert.alert('Missing Photos', 'Please take at least one damage photo before proceeding.');
            return;
        }

        setIsProcessing(true);

        try {
            // Upload damage photos to S3
            const uploadResult = await uploadDamagePhotosToS3(damagePhotos, containerData?.tripSegmentNumber);

            if (uploadResult.success) {
                console.log('✅ Damage photos uploaded to S3 successfully');

                // Prepare damage data for next step with damage photo objects
                const damageData = {
                    ...containerData,
                    damagePhotos: uploadResult.damagePhotos, // Use damage photo objects from S3
                    damageCount: damagePhotos.length,
                    frontWallDamagePhotos: damagePhotos // Store for data persistence when navigating back
                };
                
                // Save damage data to state for navigation
                setDamageData(damageData);

                // Navigate to Trailer Photo screen
                if (onNavigateToStepThree) {
                    onNavigateToStepThree(damageData);
                }
            } else {
                Alert.alert('Upload Failed', `Failed to upload damage photos: ${uploadResult.error}`);
                console.error('❌ S3 upload failed:', uploadResult.error);
            }
        } catch (error) {
            Alert.alert('Upload Error', 'An error occurred while uploading damage photos. Please try again.');
            console.error('❌ Error in handleNext:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const openZoomModal = (index) => {
        setSelectedImageIndex(index);
        setShowZoomModal(true);
    };

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
                        Camera permission is required to take damage photos
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={cn('bg-blue-600 px-6 py-3 rounded-lg')}
                    >
                        <Text style={cn('text-white font-semibold text-center')}>
                            Grant Camera Permission
                        </Text>
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

            {!showCamera ? (

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


                        {/* Damage Photos Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Damage Photos
                            </Text>


                            {/* Photos Grid */}
                            {damagePhotos.length > 0 && (
                                <View style={cn('mb-4')}>
                                    <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                        Photos Taken ({damagePhotos.length})
                                    </Text>
                                    <View style={cn('flex-row flex-wrap gap-2')}>
                                        {damagePhotos.map((photo, index) => (
                                            <View key={photo.id} style={cn('relative')}>
                                                <TouchableOpacity
                                                    onPress={() => openZoomModal(index)}
                                                    style={cn('relative')}
                                                >
                                                    <Image
                                                        source={{ uri: `data:image/jpeg;base64,${photo.base64}` }}
                                                        style={cn('w-20 h-20 rounded-lg')}
                                                    />
                                                    <View style={cn('absolute inset-0 bg-black/30 rounded-lg items-center justify-center')}>
                                                        <Eye size={16} color="white" />
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => removePhoto(photo.id)}
                                                    style={cn('absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center')}
                                                >
                                                    <X size={12} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Camera Controls */}
                            <View style={cn('flex-row items-center justify-center')}>
                                {/* Camera Button */}
                                <TouchableOpacity
                                    onPress={takePicture}
                                    disabled={isProcessing}
                                    style={cn('w-full rounded-lg overflow-hidden')}
                                >
                                    <LinearGradient
                                        colors={isProcessing ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <>
                                                <Text style={cn('text-white font-semibold text-base')}>Take Damage Photo</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                            </View>
                            {/* Navigation Button */}
                            <View style={cn('flex-row justify-center mt-4')}>
                                <TouchableOpacity
                                    onPress={handleNext}
                                    disabled={isProcessing || damagePhotos.length === 0}
                                    style={cn(`w-full rounded-lg overflow-hidden ${(isProcessing || damagePhotos.length === 0) ? 'opacity-50' : ''}`)}
                                >
                                    <LinearGradient
                                        colors={(isProcessing || damagePhotos.length === 0) ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        {isProcessing ? (
                                            <View style={cn('flex-row items-center')}>
                                                <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                                <Text style={cn('text-white font-bold')}>Uploading...</Text>
                                            </View>
                                        ) : damagePhotos.length === 0 ? (
                                            <Text style={cn('text-white font-bold')}>Take at least one photo to continue</Text>
                                        ) : (
                                            <Text style={cn('text-white font-bold')}>Next</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>


                    </View>
                </ScrollView>
            ) : (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />

                    {/* Damage Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Instruction Text */}
                        <View style={cn('absolute top-4 left-4 right-4 items-center')}>
                            <View style={cn('bg-black/70 px-6 py-3 rounded-lg')}>
                                <Text style={cn('text-white text-center text-lg font-semibold')}>
                                    Take clear photos of the damage
                                </Text>
                            </View>
                        </View>

                        {/* Camera Controls */}
                        <View style={cn('absolute bottom-8 left-0 right-0 items-center')}>
                            <TouchableOpacity
                                onPress={capturePhoto}
                                disabled={isProcessing}
                                style={cn(`w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center ${isProcessing ? 'opacity-50' : ''}`)}
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
            )}

            {/* Zoom Modal */}
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

                    {/* Full Size Image */}
                    <Image
                        source={{ uri: `data:image/jpeg;base64,${damagePhotos[selectedImageIndex]?.base64}` }}
                        style={cn('w-full h-full')}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

        </SafeAreaView>
    );
};

export default StepOneDamagePhotos;
