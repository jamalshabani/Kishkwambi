import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, Camera, ArrowLeft } from 'lucide-react-native';

export default function StepFourRightSidePhoto({ containerData, trailerData, onBack, onNavigateToStepFive }) {
    const { isDark, toggleTheme } = useTheme();
    const [facing, setFacing] = useState('back');
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [rightSidePhotoData, setRightSidePhotoData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef(null);

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
        if (cameraRef.current) {
            try {
                setIsProcessing(true);
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: true,
                });
                
                if (photo) {
                    setImage(photo.uri);
                    console.log('📸 Container right side photo taken successfully');
                }
            } catch (error) {
                console.error('❌ Error taking photo:', error);
                Alert.alert('Error', 'Failed to take photo. Please try again.');
            } finally {
                setIsProcessing(false);
            }
        }
    };


    const retakePhoto = () => {
        setImage(null);
    };

    const handleNext = () => {
        if (!image) {
            Alert.alert('Missing Information', 'Please take a photo of the container right side.');
            return;
        }

        // Prepare right side photo data for next step
        const rightSidePhotoData = {
            ...containerData,
            ...trailerData,
            rightSidePhoto: image
        };
        
        // Save right side photo data to state for navigation
        setRightSidePhotoData(rightSidePhotoData);

        // Navigate to next step
        if (onNavigateToStepFive) {
            onNavigateToStepFive(rightSidePhotoData);
        }
    };

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`)} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <View style={cn(`flex-row items-center justify-between px-4 py-3 ${isDark ? 'bg-gray-900' : 'bg-white/10'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`)}>
                <View style={cn('flex-row items-center')}>
                    {/* Back Button */}
                    <TouchableOpacity 
                        onPress={onBack}
                        style={cn('mr-4 p-2')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F59E0B' : '#1F2937'} />
                    </TouchableOpacity>
                    
                    <Text style={cn(`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                        Right Side Photo
                    </Text>
                </View>
                
                {/* Go to Step 6 Button */}
                <TouchableOpacity
                    onPress={() => onNavigateToStepFive && onNavigateToStepFive(rightSidePhotoData)}
                    style={cn('mr-3 px-3 py-2 rounded-lg bg-blue-500')}
                >
                    <Text style={cn('text-white font-semibold text-sm')}>Go to Step 6</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={toggleTheme} style={cn('p-2')}>
                    {isDark ? <Sun size={24} color="#F59E0B" /> : <Moon size={24} color="#1F2937" />}
                </TouchableOpacity>
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
                                        height: 420, // Further increased height for optimal container right side framing
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
                <ScrollView style={cn('flex-1')} showsVerticalScrollIndicator={false}>
                    <View style={cn('px-4 py-4')}>
                        {/* Photo Preview */}
                        <View style={cn(`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`)}>
                            <TouchableOpacity onPress={() => setShowZoomModal(true)}>
                                <Image source={{ uri: image }} style={cn('w-full h-96')} resizeMode="cover" />
                            </TouchableOpacity>
                        </View>

                        {/* Retake Button */}
                        <TouchableOpacity
                            onPress={retakePhoto}
                            style={cn('mt-4 rounded-lg overflow-hidden')}
                        >
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <Text style={cn('text-white font-bold')}>Retake Photo</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Navigation Buttons */}
                        <View style={cn('flex-row justify-between mt-4')}>
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
                                disabled={!image}
                                style={cn(`flex-1 ml-2 rounded-lg overflow-hidden ${!image ? 'opacity-50' : ''}`)}
                            >
                                <LinearGradient
                                    colors={!image ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
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
            )}

            {/* Zoom Modal */}
            {showZoomModal && (
                <View style={cn('absolute inset-0 bg-black justify-center items-center')}>
                    <TouchableOpacity
                        style={cn('absolute inset-0')}
                        onPress={() => setShowZoomModal(false)}
                    />
                    <Image source={{ uri: image }} style={cn('w-11/12 h-3/4')} resizeMode="contain" />
                </View>
            )}
        </SafeAreaView>
    );
}
