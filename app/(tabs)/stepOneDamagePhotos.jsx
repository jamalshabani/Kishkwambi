import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Eye, X, ImageIcon, ArrowLeft, Camera } from 'lucide-react-native';

const StepOneDamagePhotos = ({ onBack, containerData, onNavigateToStepThree }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [damagePhotos, setDamagePhotos] = useState([]);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
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
                const newPhoto = {
                    id: Date.now(),
                    base64: photo.base64,
                    timestamp: new Date().toISOString()
                };
                
                setDamagePhotos(prev => [...prev, newPhoto]);
                console.log('📸 Damage photo taken successfully');
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

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const newPhoto = {
                    id: Date.now(),
                    base64: result.assets[0].base64,
                    timestamp: new Date().toISOString()
                };
                
                setDamagePhotos(prev => [...prev, newPhoto]);
                console.log('📷 Damage image selected from gallery');
            }
        } catch (error) {
            console.error('❌ Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const handleNext = () => {
        if (damagePhotos.length === 0) {
            Alert.alert('Missing Photos', 'Please take at least one damage photo before proceeding.');
            return;
        }

        // Prepare damage data for next step
        const damageData = {
            ...containerData,
            damagePhotos: damagePhotos,
            damageCount: damagePhotos.length
        };

        // Navigate to Trailer Photo screen
        if (onNavigateToStepThree) {
            onNavigateToStepThree(damageData);
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
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={onBack}
                    style={cn('mr-4 p-2')}
                >
                    <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex-1`)}>
                    Damage Photos
                </Text>

                {/* Theme Switcher */}
                <Animated.View
                    style={{
                        transform: [
                            { scale: themeButtonScale },
                            {
                                rotate: themeIconRotation.interpolate({
                                    inputRange: [0, 360],
                                    outputRange: ['0deg', '360deg']
                                })
                            }
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
                            Back Wall Damage Photos
                        </Text>
                        
                        <Text style={cn(`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                            Take photos of the damaged areas on the back wall. You can take multiple photos from different angles.
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
                        <View style={cn('flex-row items-center justify-between')}>
                            {/* Gallery Button */}
                            <TouchableOpacity
                                onPress={pickImage}
                                style={cn('flex-1 mr-2 rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#6B7280', '#4B5563']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-3 items-center')}
                                >
                                    <ImageIcon size={20} color="white" />
                                    <Text style={cn('text-white font-semibold text-sm mt-1')}>Gallery</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Camera Button */}
                            <TouchableOpacity
                                onPress={takePicture}
                                disabled={isProcessing}
                                style={cn('flex-1 ml-2 rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={isProcessing ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-3 items-center')}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Camera size={20} color="white" />
                                            <Text style={cn('text-white font-semibold text-sm mt-1')}>Take Photo</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Navigation Buttons */}
                    <View style={cn('flex-row justify-between')}>
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
                            style={cn('flex-1 ml-2 rounded-lg overflow-hidden')}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <Text style={cn('text-white font-bold')}>Next</Text>
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
