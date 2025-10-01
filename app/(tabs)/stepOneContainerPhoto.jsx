import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import { Camera as CameraIcon, Image as ImageIcon, Sun, Moon, ArrowLeft, RotateCcw, Eye, X } from 'lucide-react-native';

const StepOneContainerPhoto = ({ onBack }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [containerNumber, setContainerNumber] = useState(Array(11).fill(''));
    const [isoCode, setIsoCode] = useState(Array(4).fill(''));
    const [extractedData, setExtractedData] = useState({
        containerNumber: '',
        isoCode: '',
        containerColor: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
    const cameraRef = useRef(null);
    const containerNumberRefs = useRef([]);
    const isoCodeRefs = useRef([]);

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

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: true,
                    //shutterSound: false,
                });
                setImage(photo.uri);
                await processImageWithVisionAI(photo.base64);
            } catch (error) {
                Alert.alert('Error', 'Failed to take picture');
                console.error('Camera error:', error);
            }
        }
    };

    const pickImage = async () => {
       
    };

    const processImageWithVisionAI = async (base64Image) => {
        setIsProcessing(true);
        try {
            // Call backend API endpoint
            const BACKEND_URL = 'http://192.168.12.134:3001'; // Your backend URL
            
            console.log('Sending image to Vision API...');
            
            const response = await fetch(`${BACKEND_URL}/api/vision/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            // Check if response is ok
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend error response:', errorText);
                throw new Error(`Backend returned ${response.status}: ${errorText.substring(0, 100)}`);
            }

            // Try to parse JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Backend returned non-JSON response. Make sure the server is running correctly.');
            }

            const result = await response.json();
            console.log('Vision API result:', result);
            
            if (result.success && result.data) {
                const extractedInfo = result.data;
                console.log('Detected text:', extractedInfo.rawText);
                console.log('Extracted info:', extractedInfo);
                
                setExtractedData({
                    containerNumber: extractedInfo.containerNumber,
                    isoCode: extractedInfo.isoCode,
                    containerColor: extractedInfo.containerColor
                });
                
                // Populate individual character arrays
                const containerChars = extractedInfo.containerNumber.padEnd(11, ' ').split('').slice(0, 11);
                const isoChars = extractedInfo.isoCode.padEnd(4, ' ').split('').slice(0, 4);
                setContainerNumber(containerChars);
                setIsoCode(isoChars);
            } else {
                // Fallback to empty values if no text detected
                Alert.alert('No Text Detected', result.error || 'Could not extract text from the image. Please try again.');
                setExtractedData({ containerNumber: '', isoCode: '', containerColor: '' });
                setContainerNumber(Array(11).fill(''));
                setIsoCode(Array(4).fill(''));
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to process image with Vision AI';
            Alert.alert('Error', errorMessage);
            console.error('Vision AI error:', error);
            console.error('Error stack:', error.stack);
            
            // Set empty values on error
            setExtractedData({ containerNumber: '', isoCode: '', containerColor: '' });
            setContainerNumber(Array(11).fill(''));
            setIsoCode(Array(4).fill(''));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleContainerNumberChange = (index, value) => {
        const newContainerNumber = [...containerNumber];
        newContainerNumber[index] = value.toUpperCase().slice(-1);
        setContainerNumber(newContainerNumber);
        
        // Auto-focus next input
        if (value && index < 10) {
            containerNumberRefs.current[index + 1]?.focus();
        }
    };

    const handleIsoCodeChange = (index, value) => {
        const newIsoCode = [...isoCode];
        newIsoCode[index] = value.toUpperCase().slice(-1);
        setIsoCode(newIsoCode);
        
        // Auto-focus next input
        if (value && index < 3) {
            isoCodeRefs.current[index + 1]?.focus();
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setContainerNumber(Array(11).fill(''));
        setIsoCode(Array(4).fill(''));
        setExtractedData({
            containerNumber: '',
            isoCode: '',
            containerColor: ''
        });
    };

    if (!permission) {
        return (
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
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
            <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)} edges={['top']}>
                <StatusBar style={isDark ? "light" : "dark"} />
                <View style={cn('flex-1 justify-center items-center p-6')}>
                    <Text style={cn(`text-lg text-center ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                        Camera permission is required to take container photos
                    </Text>
                    <Button
                        onPress={requestPermission}
                        className="w-full rounded-lg"
                        style={{
                            background: 'linear-gradient(90deg, #F59E0B 0%, #92400E 100%)',
                        }}
                    >
                        Grant Camera Permission
                    </Button>
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
                    Container Photo
                </Text>

                {/* Theme Switcher */}
                <Animated.View
                    style={{
                        transform: [
                            { scale: themeButtonScale },
                            { rotate: themeIconRotation.interpolate({
                                inputRange: [0, 360],
                                outputRange: ['0deg', '360deg']
                            })}
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

            {!image ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />
                    
                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 right-0 bg-black/50 pb-8 pt-4')}>
                        <View style={cn('flex-row items-center justify-between px-8')}>
                            {/* Gallery Button */}
                            <TouchableOpacity
                                onPress={pickImage}
                                style={cn('w-12 h-12 rounded-lg bg-white/20 items-center justify-center')}
                            >
                                <ImageIcon size={24} color="white" />
                            </TouchableOpacity>
                            
                            {/* Capture Button */}
                            <TouchableOpacity
                                onPress={takePicture}
                                style={cn('w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center')}
                            >
                                <View style={cn('w-16 h-16 rounded-full bg-white')} />
                            </TouchableOpacity>
                            
                            {/* Camera Toggle Button */}
                            <TouchableOpacity
                                onPress={toggleCameraFacing}
                                style={cn('w-12 h-12 rounded-lg bg-white/20 items-center justify-center')}
                            >
                                <RotateCcw size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                // Photo Preview with Controls
                <KeyboardAvoidingView 
                    style={cn('flex-1')}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView 
                        style={cn('flex-1')} 
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 400 }}
                    >
                        <View style={cn('p-6')}>
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                            <View style={cn('mb-2 flex items-center justify-center')}>
                                <View style={cn('relative')}>
                                    <Image source={{ uri: image }} style={cn('w-[200px] h-[200px] rounded-lg')} />
                                    {/* Eye Icon Overlay */}
                                    <TouchableOpacity
                                        onPress={() => setShowZoomModal(true)}
                                        style={cn('absolute inset-0 items-center justify-center')}
                                    >
                                        <View style={cn('bg-black/50 rounded-full p-3')}>
                                            <Eye size={32} color="white" />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Retake Button */}
                            <TouchableOpacity
                                onPress={retakePhoto}
                                style={cn('rounded-lg overflow-hidden w-full')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold')}>Retake Photo</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Extracted Data Section */}
                        <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4`)}>
                            {isProcessing ? (
                                <View style={cn('items-center py-8')}>
                                    <Text style={cn(`text-lg ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                                        Processing with Vision AI...
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    {/* Container Number */}
                                    <View style={cn(`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} mb-2`)}>
                                        <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`)}>
                                            Container Number
                                        </Text>
                                        <View style={cn('flex-row gap-1 flex-wrap')}>
                                            {containerNumber.map((char, index) => (
                                                <View key={index} style={cn('items-center justify-center')}>
                                                    <TextInput
                                                        ref={(ref) => (containerNumberRefs.current[index] = ref)}
                                                        value={char}
                                                        onChangeText={(value) => handleContainerNumberChange(index, value)}
                                                        style={[
                                                            cn(`w-10 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
                                                            { 
                                                                textAlignVertical: 'center',
                                                                padding: 0,
                                                                margin: 0,
                                                                lineHeight: 25,
                                                                includeFontPadding: false
                                                            }
                                                        ]}
                                                        maxLength={1}
                                                        autoCapitalize="characters"
                                                        selectTextOnFocus
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {/* ISO Code and Container Color Row */}
                                    <View style={cn('flex-row gap-2')}>
                                        {/* ISO Code */}
                                        <View style={[cn(`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`), { flex: 0.9 }]}>
                                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`)}>
                                                ISO Code
                                            </Text>
                                            <View style={cn('flex-row gap-1')}>
                                                {isoCode.map((char, index) => (
                                                    <View key={index} style={cn('items-center justify-center')}>
                                                        <TextInput
                                                            ref={(ref) => (isoCodeRefs.current[index] = ref)}
                                                            value={char}
                                                            onChangeText={(value) => handleIsoCodeChange(index, value)}
                                                            style={[
                                                                cn(`w-10 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
                                                                { 
                                                                    textAlignVertical: 'center',
                                                                    padding: 0,
                                                                    margin: 0,
                                                                    lineHeight: 25,
                                                                    includeFontPadding: false
                                                                }
                                                            ]}
                                                            maxLength={1}
                                                            autoCapitalize="characters"
                                                            selectTextOnFocus
                                                        />
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Container Color */}
                                        <View style={[cn(`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`), { flex: 0.4 }]}>
                                            <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`)}>
                                                Color
                                            </Text>
                                            <Text style={cn(`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                                                {extractedData.containerColor || 'Not detected'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
                        source={{ uri: image }} 
                        style={cn('w-full h-full')}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepOneContainerPhoto;
