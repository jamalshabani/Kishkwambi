import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, Animated, Modal, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import { API_CONFIG } from '../../lib/config';
import { Camera as CameraIcon, Sun, Moon, ArrowLeft, Eye, X } from 'lucide-react-native';

const StepOneContainerPhoto = ({ onBack, onNavigateToStepTwo }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [containerNumber, setContainerNumber] = useState(Array(11).fill(''));
    const [isoCode, setIsoCode] = useState(Array(4).fill(''));
    const [extractedData, setExtractedData] = useState({
        containerNumber: '',
        isoCode: '',
    });
    const [comparisonResults, setComparisonResults] = useState({
        parkrow: { containerNumber: '', isoCode: '' },
        googleVision: { containerNumber: '', isoCode: '' },
        processingTime: 0
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [facing, setFacing] = useState('back');
    const [showContainerModal, setShowContainerModal] = useState(false);
    const [containerModalData, setContainerModalData] = useState({ type: '', message: '' });
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


    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: true,
                    //shutterSound: false,
                });
                
                // Crop the image to the overlay area
                const croppedImage = await cropImageToOverlay(photo.uri);
                setImage(croppedImage);
                
                // Process the cropped image
                const croppedBase64 = await convertImageToBase64(croppedImage);
                await processImageWithVisionAI(croppedBase64);
            } catch (error) {
                Alert.alert('Error', 'Failed to take picture');
                console.error('Camera error:', error);
            }
        }
    };

    // Function to crop image to overlay area
    const cropImageToOverlay = async (imageUri) => {
        try {
            // For now, we'll use the original image
            // In a real implementation, you would use react-native-image-crop-picker
            // or similar library to crop the image to the overlay dimensions
            return imageUri;
        } catch (error) {
            console.error('Crop error:', error);
            return imageUri; // Fallback to original image
        }
    };

    // Function to convert image to base64
    const convertImageToBase64 = async (imageUri) => {
        try {
            // For now, we'll use the original base64
            // In a real implementation, you would convert the cropped image to base64
            const response = await fetch(imageUri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Base64 conversion error:', error);
            return '';
        }
    };


    // Function to select the best results based on confidence scores
    const selectBestResults = (parkrowData, googleVisionData) => {
        const parkrow = parkrowData || {};
        const googleVision = googleVisionData || {};
        
        // Select container number with highest confidence
        const parkrowContainerConfidence = parkrow.containerNumberConfidence || 0;
        const googleVisionContainerConfidence = googleVision.containerNumberConfidence || 0;
        
        const bestContainerNumber = parkrowContainerConfidence > googleVisionContainerConfidence 
            ? parkrow.containerNumber 
            : googleVision.containerNumber;
        
        // Select ISO code with highest confidence
        const parkrowIsoConfidence = parkrow.isoCodeConfidence || 0;
        const googleVisionIsoConfidence = googleVision.isoCodeConfidence || 0;
        
        const bestIsoCode = parkrowIsoConfidence > googleVisionIsoConfidence 
            ? parkrow.isoCode 
            : googleVision.isoCode;
        
        console.log('=== CONFIDENCE COMPARISON ===');
        console.log('Container Number:');
        console.log(`  ParkRow: "${parkrow.containerNumber}" (${(parkrowContainerConfidence * 100).toFixed(1)}%)`);
        console.log(`  Google Vision: "${googleVision.containerNumber}" (${(googleVisionContainerConfidence * 100).toFixed(1)}%)`);
        console.log(`  Selected: "${bestContainerNumber}"`);
        console.log('ISO Code:');
        console.log(`  ParkRow: "${parkrow.isoCode}" (${(parkrowIsoConfidence * 100).toFixed(1)}%)`);
        console.log(`  Google Vision: "${googleVision.isoCode}" (${(googleVisionIsoConfidence * 100).toFixed(1)}%)`);
        console.log(`  Selected: "${bestIsoCode}"`);
        console.log('=============================');
        
        return {
            containerNumber: bestContainerNumber,
            isoCode: bestIsoCode,
            containerNumberConfidence: Math.max(parkrowContainerConfidence, googleVisionContainerConfidence),
            isoCodeConfidence: Math.max(parkrowIsoConfidence, googleVisionIsoConfidence),
            selectedFrom: {
                containerNumber: parkrowContainerConfidence > googleVisionContainerConfidence ? 'ParkRow' : 'Google Vision',
                isoCode: parkrowIsoConfidence > googleVisionIsoConfidence ? 'ParkRow' : 'Google Vision'
            }
        };
    };

    // Function to validate container number against database and detect color
    const validateContainerNumber = async () => {
        // Use the manually corrected container number from input fields
        const correctedContainerNumber = containerNumber.join('').trim();
        
        if (!correctedContainerNumber || correctedContainerNumber.length === 0) {
            Alert.alert('No Container Number', 'Please take a photo first to extract the container number or enter it manually.');
            return;
        }

        try {
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            console.log('🔍 Validating container number:', correctedContainerNumber);
            
            // Call both validation and color detection concurrently
            const [validationResponse, colorResponse] = await Promise.all([
                // Container validation
                fetch(`${BACKEND_URL}/api/validate-container`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ containerNumber: correctedContainerNumber }),
                }).then(res => res.json()).catch(err => ({
                    success: false,
                    error: `Validation Error: ${err.message}`
                })),
                
                // Color detection (only if we have an image)
                image ? fetch(`${BACKEND_URL}/api/vision/google-vision-color`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ base64Image: image }),
                }).then(res => res.json()).catch(err => ({
                    success: false,
                    error: `Color Detection Error: ${err.message}`,
                    data: { containerColor: '', colorHex: '' }
                })) : Promise.resolve({
                    success: false,
                    error: 'No image available for color detection',
                    data: { containerColor: '', colorHex: '' }
                })
            ]);

            console.log('🔍 Validation result:', validationResponse);
            console.log('🎨 Color detection result:', colorResponse);
            
            if (validationResponse.success) {
                if (validationResponse.exists) {
                    // Prepare container data with color information using corrected container number
                    const containerData = {
                        containerNumber: correctedContainerNumber,
                        isoCode: isoCode.join('').trim() || extractedData.isoCode,
                        containerColor: colorResponse.success ? colorResponse.data.containerColor : '',
                        colorHex: colorResponse.success ? colorResponse.data.colorHex : '',
                        tripSegmentNumber: validationResponse.containerData?.tripSegmentNumber || 'N/A'
                    };
                    
                    console.log('🎨 Detected color:', containerData.containerColor);
                    console.log('🎨 Color hex:', containerData.colorHex);
                    
                    // Navigate to step two with container data including color
                    if (onNavigateToStepTwo) {
                        onNavigateToStepTwo(containerData);
                    }
                } else {
                    setContainerModalData({
                        type: 'error',
                        message: validationResponse.message
                    });
                    setShowContainerModal(true);
                }
            } else {
                setContainerModalData({
                    type: 'error',
                    message: validationResponse.error || 'Failed to validate container number'
                });
                setShowContainerModal(true);
            }
            
        } catch (error) {
            console.error('Container validation error:', error);
            setContainerModalData({
                type: 'error',
                message: 'Failed to validate container number. Please check your connection.'
            });
            setShowContainerModal(true);
        }
    };

    const processImageWithVisionAI = async (base64Image) => {
        setIsProcessing(true);
        try {
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            const startTime = Date.now();
            
            console.log('🚀 Testing both ParkRow API and Google Vision AI concurrently...');
            
            // Call both APIs concurrently using Promise.all
            const [parkrowResponse, googleVisionResponse] = await Promise.all([
                // ParkRow API call
                fetch(`${BACKEND_URL}/api/vision/process-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ base64Image }),
                }).then(res => res.json()).catch(err => ({
                    success: false,
                    error: `ParkRow API Error: ${err.message}`,
                    data: { containerNumber: '', isoCode: '' }
                })),
                
                // Google Vision API call
                fetch(`${BACKEND_URL}/api/vision/google-vision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
                }).then(res => res.json()).catch(err => ({
                    success: false,
                    error: `Google Vision API Error: ${err.message}`,
                    data: { containerNumber: '', isoCode: '' }
                }))
            ]);
            
            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log('⏱️ Total processing time:', processingTime + 's');
            console.log('📊 === COMPARISON RESULTS ===');
            console.log('🔹 PARKROW API RESULT:', parkrowResponse);
            console.log('🔸 GOOGLE VISION AI RESULT:', googleVisionResponse);
            
            // Store comparison results
            setComparisonResults({
                parkrow: parkrowResponse.data || { containerNumber: '', isoCode: '' },
                googleVision: googleVisionResponse.data || { containerNumber: '', isoCode: '' },
                processingTime: parseFloat(processingTime)
            });
            
            // Select the best results based on confidence scores
            const bestResults = selectBestResults(parkrowResponse.data, googleVisionResponse.data);
            
            if (bestResults) {
                console.log('Best results selected:', bestResults);
                
                setExtractedData({
                    containerNumber: bestResults.containerNumber || '',
                    isoCode: bestResults.isoCode || ''
                });
                
                // Populate individual character arrays
                const containerChars = (bestResults.containerNumber || '').padEnd(11, ' ').split('').slice(0, 11);
                const isoChars = (bestResults.isoCode || '').padEnd(4, ' ').split('').slice(0, 4);
                setContainerNumber(containerChars);
                setIsoCode(isoChars);
            } else {
                // Fallback to empty values if no data detected
                Alert.alert('No Data Detected', 'Could not extract container information from the image. Please try again.');
                setExtractedData({ containerNumber: '', isoCode: '' });
                setContainerNumber(Array(11).fill(''));
                setIsoCode(Array(4).fill(''));
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to process image with Vision AI';
            Alert.alert('Error', errorMessage);
            console.error('Vision AI error:', error);
            console.error('Error stack:', error.stack);
            
            // Set empty values on error
            setExtractedData({ containerNumber: '', isoCode: '' });
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
        });
        setComparisonResults({
            parkrow: { containerNumber: '', isoCode: '' },
            googleVision: { containerNumber: '', isoCode: '' },
            processingTime: 0
        });
    };

    // Function to simulate container positioning detection

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
                    Container Back Wall
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
                    
                    {/* Container Guide Overlay */}
                    <View style={cn('absolute inset-0 justify-center items-center')}>
                        {/* Instruction Text */}
                        <View style={cn('absolute top-4 left-4 right-4 items-center')}>
                            <View style={cn('bg-black/70 px-6 py-3 rounded-lg')}>
                                <Text style={cn('text-white text-center text-lg font-semibold')}>
                                    Make sure the container number is clearly visible
                                </Text>
                            </View>
                            
                            {/* Skip Photo Button */}
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        const BACKEND_URL = API_CONFIG.getBackendUrl();
                                        const containerNumber = 'BSIU2253788';
                                        
                                        console.log('🔍 Fetching container info for:', containerNumber);
                                        
                                        // Fetch container information from database
                                        const response = await fetch(`${BACKEND_URL}/api/validate-container`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ containerNumber }),
                                        });
                                        
                                        const result = await response.json();
                                        console.log('📊 Database response:', result);
                                        
                                        // Set test image (placeholder)
                                        setImage('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGOUZCIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZXN0IERhdGE8L3RleHQ+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db250YWluZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=');
                                        
                                        // Set test data
                                        const testData = {
                                            containerNumber: containerNumber,
                                            isoCode: '45G1',
                                            containerColor: 'Black',
                                            colorHex: '#000000',
                                            tripSegmentNumber: result.success && result.exists ? result.containerData?.tripSegmentNumber || 'ST25-00024' : 'ST25-00024'
                                        };
                                        
                                        console.log('✅ Using test data:', testData);
                                        
                                        // Populate the extracted data
                                        setExtractedData({
                                            containerNumber: testData.containerNumber,
                                            isoCode: testData.isoCode
                                        });
                                        
                                        // Populate individual character arrays
                                        const containerChars = testData.containerNumber.padEnd(11, ' ').split('').slice(0, 11);
                                        const isoChars = testData.isoCode.padEnd(4, ' ').split('').slice(0, 4);
                                        setContainerNumber(containerChars);
                                        setIsoCode(isoChars);
                                        
                                        // Store test data for later use
                                        setComparisonResults({
                                            parkrow: { containerNumber: testData.containerNumber, isoCode: testData.isoCode },
                                            googleVision: { containerNumber: testData.containerNumber, isoCode: testData.isoCode },
                                            processingTime: 0.1
                                        });
                                        
                                    } catch (error) {
                                        console.error('❌ Error setting up test data:', error);
                                        
                                        // Fallback test data
                                        setImage('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGOUZCIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZXN0IERhdGE8L3RleHQ+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db250YWluZXIgUGhvdG88L3RleHQ+Cjwvc3ZnPgo=');
                                        
                                        const fallbackData = {
                                            containerNumber: 'BSIU2253788',
                                            isoCode: '45G1',
                                            containerColor: 'Black',
                                            colorHex: '#000000',
                                            tripSegmentNumber: 'ST25-00024'
                                        };
                                        
                                        setExtractedData({
                                            containerNumber: fallbackData.containerNumber,
                                            isoCode: fallbackData.isoCode
                                        });
                                        
                                        const containerChars = fallbackData.containerNumber.padEnd(11, ' ').split('').slice(0, 11);
                                        const isoChars = fallbackData.isoCode.padEnd(4, ' ').split('').slice(0, 4);
                                        setContainerNumber(containerChars);
                                        setIsoCode(isoChars);
                                        
                                        setComparisonResults({
                                            parkrow: { containerNumber: fallbackData.containerNumber, isoCode: fallbackData.isoCode },
                                            googleVision: { containerNumber: fallbackData.containerNumber, isoCode: fallbackData.isoCode },
                                            processingTime: 0.1
                                        });
                                    }
                                }}
                                style={cn('mt-4 rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('px-6 py-3')}
                                >
                                    <Text style={cn('text-white text-center font-semibold')}>
                                        Skip Photo - Use Test Data
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Container Guide Frame */}
                        <View style={cn('relative')}>
                            {/* Container Rectangle Outline */}
                            <View 
                                style={[
                                    cn('border-2 border-green-500 bg-green-500/10'),
                                    {
                                        width: 320,
                                        height: 298, // Adjusted for 2.44m × 2.59m ratio (0.94:1)
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
                                style={cn('w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center')}
                            >
                                <View style={cn('w-16 h-16 rounded-full bg-white')} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                // Photo Preview with Controls
                <KeyboardAvoidingView 
                    style={cn('flex-1')}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView 
                        style={cn('flex-1')} 
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
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
                                    <ActivityIndicator 
                                        size="large" 
                                        color={isDark ? '#eab308' : '#a16207'} 
                                        style={cn('mb-4')}
                                    />
                                    <Text style={cn(`text-lg ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                                        Processing...
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    {/* Container Number */}
                                    <View style={cn(`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`)}>
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

                                    {/* ISO Code */}
                                    <View style={cn('flex-row gap-2 mt-2')}>
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
                                    </View>
                                </View>
                            )}

                            {/* Next Button */}
                            <View style={cn('mt-4')}>
                                <TouchableOpacity
                                    onPress={validateContainerNumber}
                                    disabled={isProcessing}
                                    style={cn(`rounded-lg overflow-hidden w-full ${isProcessing ? 'opacity-50' : ''}`)}
                                >
                                    <LinearGradient
                                        colors={isProcessing ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('p-4 items-center')}
                                    >
                                        <Text style={cn('text-white font-bold')}>
                                            {isProcessing ? 'Processing...' : 'Next'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                           
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

            {/* Custom Container Validation Modal */}
            <Modal
                visible={showContainerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowContainerModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                {containerModalData.type === 'success' ? 'Container Found!' : 'Container Not Found'}
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                {containerModalData.message}
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowContainerModal(false)}
                            style={cn('bg-red-500 rounded-xl py-4')}
                        >
                            <Text style={cn('text-white text-center font-semibold text-base')}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepOneContainerPhoto;
