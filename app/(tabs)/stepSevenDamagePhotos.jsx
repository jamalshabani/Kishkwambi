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

const StepSevenDamagePhotos = ({ onBack, containerData, onNavigateToStepEight }) => {
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

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                setIsProcessing(true);
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: true,
                });
                
                if (photo?.uri) {
                    const newPhoto = {
                        uri: photo.uri,
                        base64: photo.base64,
                        timestamp: Date.now(),
                    };
                    
                    setDamagePhotos(prev => [...prev, newPhoto]);
                    setShowCamera(false);
                    console.log('📸 Damage photo taken successfully');
                }
            } catch (error) {
                console.error('❌ Error taking damage photo:', error);
                Alert.alert('Error', 'Failed to take photo. Please try again.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const pickImageFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const newPhoto = {
                    uri: asset.uri,
                    base64: asset.base64,
                    timestamp: Date.now(),
                };
                
                setDamagePhotos(prev => [...prev, newPhoto]);
                console.log('📸 Damage photo selected from gallery');
            }
        } catch (error) {
            console.error('❌ Error picking image from gallery:', error);
            Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
        }
    };

    const removePhoto = (index) => {
        setDamagePhotos(prev => prev.filter((_, i) => i !== index));
    };

    const openZoomModal = (index) => {
        setSelectedImageIndex(index);
        setShowZoomModal(true);
    };

    const uploadDamagePhotosToS3 = async (photos, tripSegmentNumber) => {
        try {
            console.log('📸 Starting S3 upload for damage photos...');
            const BACKEND_URL = API_CONFIG.getBackendUrl();

            const formData = new FormData();

            photos.forEach((photo, index) => {
                formData.append('photos', {
                    uri: `data:image/jpeg;base64,${photo.base64}`,
                    type: 'image/jpeg',
                    name: `damage_${index + 1}.jpg`
                });
            });

            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('containerNumber', containerData?.containerNumber || '');
            formData.append('damageLocation', 'Left Side'); // Set damage location to Left Side

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
                console.log('✅ Damage photos uploaded to S3 successfully');
                
                // Prepare damage data for next step with S3 references
                const damageData = {
                    ...containerData,
                    damagePhotos: uploadResult.damagePhotos, // Use S3 references instead of base64
                    damageLocation: 'Left Side'
                };
                
                // Save damage data to state for navigation
                setDamageData(damageData);

                // Navigate to next step
                if (onNavigateToStepEight) {
                    onNavigateToStepEight(damageData);
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
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center shadow-sm`)}>
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={onBack}
                    style={cn('mr-4 p-2')}
                >
                    <ArrowLeft size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                    Left Side Damage Photos
                </Text>

                {/* Theme Switcher */}
                <Animated.View
                    style={{
                        transform: [
                            { scale: themeButtonScale },
                            { rotate: themeIconRotation.interpolate({
                                inputRange: [0, 180],
                                outputRange: ['0deg', '180deg']
                            })}
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

                    {/* Instructions */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                        <Text style={cn(`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-black'}`)}>
                            Damage Documentation
                        </Text>
                        <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`)}>
                            Take clear photos of the left side damage. You can take multiple photos from different angles.
                        </Text>
                        
                        {/* Action Buttons */}
                        <View style={cn('flex-row gap-3')}>
                            <TouchableOpacity
                                onPress={() => setShowCamera(true)}
                                style={cn('flex-1 bg-blue-500 px-4 py-3 rounded-lg items-center')}
                            >
                                <View style={cn('flex-row items-center')}>
                                    <Camera size={20} color="white" style={cn('mr-2')} />
                                    <Text style={cn('text-white font-semibold')}>Take Photo</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={pickImageFromGallery}
                                style={cn('flex-1 bg-green-500 px-4 py-3 rounded-lg items-center')}
                            >
                                <Text style={cn('text-white font-semibold')}>From Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Damage Photos Grid */}
                    {damagePhotos.length > 0 && (
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                Damage Photos ({damagePhotos.length})
                            </Text>
                            
                            <View style={cn('flex-row flex-wrap gap-3')}>
                                {damagePhotos.map((photo, index) => (
                                    <View key={photo.timestamp} style={cn('relative')}>
                                        <TouchableOpacity
                                            onPress={() => openZoomModal(index)}
                                            style={cn('relative')}
                                        >
                                            <Image 
                                                source={{ uri: photo.uri }} 
                                                style={cn('w-20 h-20 rounded-lg')} 
                                            />
                                            <View style={cn('absolute inset-0 bg-black/30 rounded-lg items-center justify-center')}>
                                                <Eye size={16} color="white" />
                                            </View>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            onPress={() => removePhoto(index)}
                                            style={cn('absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center')}
                                        >
                                            <X size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Navigation Button */}
                    <View style={cn('flex-row justify-between mt-4 pb-6')}>
                        <TouchableOpacity
                            onPress={handleNext}
                            disabled={isProcessing || damagePhotos.length === 0}
                            style={cn(`flex-1 rounded-lg overflow-hidden ${(isProcessing || damagePhotos.length === 0) ? 'opacity-50' : ''}`)}
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
                                ) : (
                                    <Text style={cn('text-white font-bold')}>Next</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Camera Modal */}
            <Modal
                visible={showCamera}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCamera(false)}
            >
                <View style={cn('flex-1 bg-black')}>
                    <SafeAreaView style={cn('flex-1')}>
                        {/* Camera Header */}
                        <View style={cn('flex-row justify-between items-center p-4 bg-black/50')}>
                            <Text style={cn('text-white text-lg font-bold')}>Take Damage Photo</Text>
                            <TouchableOpacity
                                onPress={() => setShowCamera(false)}
                                style={cn('bg-black/50 rounded-full p-2')}
                            >
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        {/* Camera View */}
                        <View style={cn('flex-1')}>
                            <CameraView
                                ref={cameraRef}
                                style={cn('flex-1')}
                                facing={facing}
                                ratio="4:3"
                            />
                            
                            {/* Camera Controls */}
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
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Zoom Modal */}
            <Modal
                visible={showZoomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowZoomModal(false)}
            >
                <View style={cn('flex-1 bg-black')}>
                    <SafeAreaView style={cn('flex-1')}>
                        <View style={cn('flex-row justify-between items-center p-4')}>
                            <Text style={cn('text-white text-lg font-bold')}>Photo Preview</Text>
                            <TouchableOpacity
                                onPress={() => setShowZoomModal(false)}
                                style={cn('bg-black/50 rounded-full p-2')}
                            >
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={cn('flex-1 justify-center items-center')}>
                            <Image
                                source={{ uri: damagePhotos[selectedImageIndex]?.uri }}
                                style={cn('w-full h-3/4')}
                                resizeMode="contain"
                            />
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepSevenDamagePhotos;
