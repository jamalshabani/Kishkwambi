import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { ArrowLeft, Sun, Moon } from 'lucide-react-native';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { API_CONFIG } from '../../lib/config';

const StepDepotAllocationPhoto = ({ onBack, containerData }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('back');
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef(null);

    // Camera overlay dimensions for depot allocation photos
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const depotFrameWidth = screenWidth * 0.80; // 80% of screen width
    const depotFrameHeight = screenHeight * 0.70; // 70% of screen height for document
    
    // Calculate the center position for the depot allocation frame
    const centerX = (screenWidth - depotFrameWidth) / 2;
    const centerY = 80; // Position from top

    // Function to calculate crop area based on depot allocation frame dimensions
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
        let imageOverlayWidth = depotFrameWidth * scale;
        let imageOverlayHeight = depotFrameHeight * scale;
        
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

    // Function to crop image to depot allocation frame area
    const cropImageToDepotFrame = async (imageUri) => {
        try {
            const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { format: ImageManipulator.SaveFormat.JPEG });
            const imageWidth = imageInfo.width;
            const imageHeight = imageInfo.height;
            
            const cropArea = calculateCropArea(imageWidth, imageHeight);
            
            if (cropArea.x < 0 || cropArea.y < 0 || cropArea.width <= 0 || cropArea.height <= 0) {
                console.log('⚠️ Invalid crop area, skipping crop');
                return imageUri;
            }
            
            if (cropArea.x + cropArea.width > imageWidth || cropArea.y + cropArea.height > imageHeight) {
                console.log('⚠️ Crop area exceeds image bounds, skipping crop');
                return imageUri;
            }
            
            const croppedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ crop: { originX: cropArea.x, originY: cropArea.y, width: cropArea.width, height: cropArea.height } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            // Resize the cropped image to optimize file size
            const resizedImage = await ImageManipulator.manipulateAsync(
                croppedImage.uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            return resizedImage.uri;
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
                quality: 0.6,
                base64: false,
                skipProcessing: true,
                exif: false,
            });

            if (photo?.uri) {
                // Crop the image to the depot allocation frame area
                const croppedImage = await cropImageToDepotFrame(photo.uri);
                
                console.log('📸 Photo taken and cropped:', croppedImage);
                // Navigate back with photo data
                onBack(croppedImage);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const flipCamera = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

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
                        Depot Allocation
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

            {/* Full Screen Camera View */}
            <View style={cn('flex-1')}>
                <CameraView
                    ref={cameraRef}
                    style={cn('flex-1')}
                    facing={facing}
                />

                {/* Custom Mask Overlay - darkens everything except the depot allocation frame */}
                <View style={cn('absolute inset-0')} pointerEvents="box-none">
                    {/* Top overlay */}
                    <View 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: screenWidth,
                            height: centerY + 1,
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
                            height: screenHeight - centerY,
                            backgroundColor: 'black'
                        }}
                    />
                    
                    {/* Right overlay */}
                    <View 
                        style={{
                            position: 'absolute',
                            top: centerY,
                            left: centerX + depotFrameWidth,
                            width: screenWidth - (centerX + depotFrameWidth),
                            height: screenHeight - centerY,
                            backgroundColor: 'black'
                        }}
                    />
                    
                    {/* Bottom overlay */}
                    <View 
                        style={{
                            position: 'absolute',
                            top: centerY + depotFrameHeight,
                            left: 0,
                            width: screenWidth,
                            height: screenHeight - (centerY + depotFrameHeight),
                            backgroundColor: 'black'
                        }}
                    />
                    
                    {/* Depot Allocation Frame Guide - green outline with 80% opacity */}
                    <View 
                        style={{
                            position: 'absolute',
                            top: centerY,
                            left: centerX,
                            width: depotFrameWidth,
                            height: depotFrameHeight,
                            borderWidth: 2,
                            borderColor: 'rgba(34, 197, 94, 0.8)', // Green with 80% opacity
                            backgroundColor: 'transparent',
                        }}
                    />
                </View>
                
                {/* Instruction Text - Above the mask */}
                <View style={cn('absolute top-4 left-4 right-4 items-center')} pointerEvents="none">
                    <View style={cn('pt-2 rounded-lg')}>
                        <Text style={cn('text-white text-center text-lg font-semibold')}>
                            Capture the Depot Allocation document
                        </Text>
                    </View>
                </View>
                
                {/* Camera Controls Overlay */}
                <View style={cn('absolute bottom-0 left-0 bg-black/50 right-0 pb-12')}>
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
        </SafeAreaView>
    );
};

export default StepDepotAllocationPhoto;
