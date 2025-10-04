import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../lib/config';
import { Sun, Moon, Eye, X, ArrowLeft, Camera } from 'lucide-react-native';

const StepFiveDamagePhotos = ({ onBack, containerData, onNavigateToStepSix }) => {
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

    const uploadDamagePhotosToS3 = async (photos, tripSegmentNumber) => {
        try {
            console.log('📸 Starting S3 upload for damage photos...');
            const BACKEND_URL = API_CONFIG.getBackendUrl();

            // Create FormData for file upload
            const formData = new FormData();

            // Add all damage photos
            photos.forEach((photo, index) => {
                formData.append('photos', {
                    uri: `data:image/jpeg;base64,${photo.base64}`,
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
                quality: 0.8,
                base64: true,
            });

            if (photo?.uri) {
                const newPhoto = {
                    id: Date.now(),
                    base64: photo.base64,
                    timestamp: new Date().toLocaleTimeString()
                };

                setDamagePhotos(prev => [...prev, newPhoto]);
                console.log('📸 Front wall damage photo captured successfully');
            }
        } catch (error) {
            console.error('❌ Error capturing damage photo:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
        } finally {
            setIsProcessing(false);
            setShowCamera(false);
        }
    };

    const removePhoto = (photoId) => {
        setDamagePhotos(prev => prev.filter(photo => photo.id !== photoId));
    };

    const handleNext = async () => {
        if (damagePhotos.length === 0) {
            Alert.alert('No Photos', 'Please take at least one damage photo before proceeding.');
            return;
        }

        setIsProcessing(true);

        try {
            // Upload damage photos to S3
            const uploadResult = await uploadDamagePhotosToS3(damagePhotos, containerData?.tripSegmentNumber);
            
            if (uploadResult.success) {
                console.log('✅ Front wall damage photos uploaded to S3 successfully');

                // Prepare damage data for next step with damage photo objects
                const damageData = {
                    ...containerData,
                    frontWallDamagePhotos: uploadResult.damagePhotos, // Use damage photo objects from S3
                    frontWallDamageCount: damagePhotos.length,
                    localFrontWallDamagePhotos: damagePhotos // Keep local photos for reference
                };
                
                // Save damage data to state for navigation
                setDamageData(damageData);

                // Navigate to Step Six screen
                if (onNavigateToStepSix) {
                    onNavigateToStepSix(damageData);
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

    if (showCamera) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
                <StatusBar style={isDark ? "light" : "dark"} />

                {/* Header */}
                <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                    {/* Back Button */}
                    <TouchableOpacity 
                        onPress={() => setShowCamera(false)}
                        style={cn('mr-4 p-2')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                    </TouchableOpacity>

                    {/* Title */}
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                        Front Wall Damage Photo
                    </Text>

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
                            <Animated.View style={{ transform: [{ rotate: themeIconRotation.interpolate({
                                inputRange: [0, 360],
                                outputRange: ['0deg', '360deg']
                            }) }] }}>
                                {isDark ? <Sun size={20} color="#F59E0B" /> : <Moon size={20} color="#000" />}
                            </Animated.View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Camera View */}
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />

                    {/* Damage Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Container Number and Trip Segment Display */}
                        <View style={cn('absolute top-2 left-4 right-4')}>
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

                        {/* Damage Guide Frame */}
                        <View style={cn('relative')}>
                            {/* Damage Rectangle Outline */}
                            <View
                                style={[
                                    cn('border-2 border-red-500 bg-red-500/10'),
                                    {
                                        width: 280,
                                        height: 420,
                                        borderRadius: 8,
                                    }
                                ]}
                            />

                            {/* Corner Indicators */}
                            {/* Top Left */}
                            <View
                                style={[
                                    cn('absolute -top-2 -left-2'),
                                    {
                                        width: 20,
                                        height: 20,
                                        borderTopWidth: 3,
                                        borderLeftWidth: 3,
                                        borderTopColor: '#EF4444',
                                        borderLeftColor: '#EF4444',
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
                                        borderTopColor: '#EF4444',
                                        borderRightColor: '#EF4444',
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
                                        borderBottomColor: '#EF4444',
                                        borderLeftColor: '#EF4444',
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
                                        borderBottomColor: '#EF4444',
                                        borderRightColor: '#EF4444',
                                    }
                                ]}
                            />
                        </View>

                        {/* Instruction Text */}
                        <View style={cn('absolute bottom-32 left-4 right-4')}>
                            <Text style={cn('text-white text-center text-lg font-bold bg-black/50 px-4 py-2 rounded-lg')}>
                                Position damage within the red frame
                            </Text>
                        </View>
                    </View>

                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 right-0 bg-black/50 pb-8 pt-4')}>
                        <View style={cn('flex-row items-center justify-center px-8')}>
                            {/* Capture Button */}
                            <TouchableOpacity
                                onPress={capturePhoto}
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
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={onBack}
                    style={cn('mr-4 p-2')}
                >
                    <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                    Front Wall Damage Photos
                </Text>

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
                        <Animated.View style={{ transform: [{ rotate: themeIconRotation.interpolate({
                            inputRange: [0, 360],
                            outputRange: ['0deg', '360deg']
                        }) }] }}>
                            {isDark ? <Sun size={20} color="#F59E0B" /> : <Moon size={20} color="#000" />}
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Main Content */}
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
                        <View style={cn('flex-row items-center justify-between mb-4')}>
                            <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                Front Wall Damage Photos
                            </Text>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`)}>
                                {damagePhotos.length} photo{damagePhotos.length !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {/* Take Photo Button */}
                        <TouchableOpacity
                            onPress={takePicture}
                            style={cn('rounded-lg overflow-hidden mb-4')}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <View style={cn('flex-row items-center')}>
                                    <Camera size={20} color="white" style={cn('mr-2')} />
                                    <Text style={cn('text-white font-bold')}>
                                        {damagePhotos.length === 0 ? 'Take Damage Photo' : 'Take Another Photo'}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Photos Grid */}
                        {damagePhotos.length > 0 && (
                            <View style={cn('flex-row flex-wrap gap-2')}>
                                {damagePhotos.map((photo, index) => (
                                    <View key={photo.id} style={cn('relative')}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedImageIndex(index);
                                                setShowZoomModal(true);
                                            }}
                                        >
                                            <Image
                                                source={{ uri: `data:image/jpeg;base64,${photo.base64}` }}
                                                style={cn('w-20 h-20 rounded-lg')}
                                            />
                                            <View style={cn('absolute inset-0 bg-black/30 rounded-lg items-center justify-center')}>
                                                <Eye size={16} color="white" />
                                            </View>
                                        </TouchableOpacity>
                                        
                                        {/* Remove Button */}
                                        <TouchableOpacity
                                            onPress={() => removePhoto(photo.id)}
                                            style={cn('absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center')}
                                        >
                                            <X size={14} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Navigation Buttons */}
                    <View style={cn('flex-row justify-between mt-4 pb-6')}>
                        <TouchableOpacity
                            onPress={onBack}
                            style={cn('flex-1 mr-2 rounded-lg overflow-hidden')}
                        >
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <Text style={cn('text-white font-bold')}>Previous</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleNext}
                            disabled={damagePhotos.length === 0 || isProcessing}
                            style={cn(`flex-1 ml-2 rounded-lg overflow-hidden ${(damagePhotos.length === 0 || isProcessing) ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={(damagePhotos.length === 0 || isProcessing) ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
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
                        style={cn('absolute top-12 right-6 z-10 bg-white/20 rounded-full p-3')}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>
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

export default StepFiveDamagePhotos;
