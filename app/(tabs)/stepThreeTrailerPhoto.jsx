import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Eye, X, ImageIcon, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepThreeTrailerPhoto = ({ onBack, containerData, onNavigateToStepFour }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [licencePlate, setLicencePlate] = useState(Array(7).fill(''));
    const [extractedData, setExtractedData] = useState({
        licencePlate: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizingPlate, setIsRecognizingPlate] = useState(false);
    const [facing, setFacing] = useState('back');
    const [trailerData, setTrailerData] = useState(null);
    const cameraRef = useRef(null);
    const licencePlateRefs = useRef([]);

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

    const handleLicencePlateChange = (index, value) => {
        const newLicencePlate = [...licencePlate];
        newLicencePlate[index] = value.toUpperCase();
        setLicencePlate(newLicencePlate);

        // Auto-focus next input
        if (value && index < licencePlate.length - 1) {
            licencePlateRefs.current[index + 1]?.focus();
        }
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
                console.log('📸 Trailer photo taken successfully');

                // Call PlateRecognizer API to extract licence plate
                await recognizeLicencePlate(photo.base64);
            }
        } catch (error) {
            console.error('❌ Error taking trailer photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const recognizeLicencePlate = async (base64Image) => {
        try {
            setIsRecognizingPlate(true);
            console.log('🚗 Calling PlateRecognizer API...');

            const BACKEND_URL = 'http://192.168.12.134:3001'; // Update with your backend URL

            const response = await fetch(`${BACKEND_URL}/api/plate-recognizer/recognize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
            });

            const result = await response.json();
            console.log('📊 PlateRecognizer response:', result);

            if (result.success && result.data.licencePlate) {
                const detectedPlate = result.data.licencePlate;
                const confidence = result.data.confidence;

                console.log(`✅ Detected licence plate: ${detectedPlate} (confidence: ${confidence})`);

                // Auto-fill the licence plate input fields
                const plateArray = detectedPlate.split('');
                const newLicencePlate = Array(7).fill('');

                // Fill the array with detected characters (already uppercase from backend)
                for (let i = 0; i < Math.min(plateArray.length, 7); i++) {
                    newLicencePlate[i] = plateArray[i];
                }

                setLicencePlate(newLicencePlate);
            } else {
                console.log('❌ No licence plate detected or API error');
                Alert.alert(
                    'No Licence Plate Detected',
                    'Please manually enter the trailer licence plate number.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('❌ Error calling PlateRecognizer API:', error);
            Alert.alert(
                'Recognition Error',
                'Failed to recognize licence plate. Please enter manually.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsRecognizingPlate(false);
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setExtractedData({ licencePlate: '' });
        setLicencePlate(Array(7).fill(''));
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
                setImage(result.assets[0].base64);
                console.log('📷 Trailer image selected from gallery');
            }
        } catch (error) {
            console.error('❌ Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const uploadTrailerPhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            console.log('📸 Uploading trailer photo to S3...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: `data:image/jpeg;base64,${imageBase64}`,
                type: 'image/jpeg',
                name: 'trailer_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'trailer');
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-trailer-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-trailer-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Trailer photo uploaded successfully to S3:', result.trailerPhoto);
                return { success: true, trailerPhoto: result.trailerPhoto };
            } else {
                console.error('❌ Failed to upload trailer photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading trailer photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const handleNext = async () => {
        const licencePlateText = licencePlate.join('').trim();

        if (!licencePlateText || licencePlateText.length === 0) {
            Alert.alert('Missing Information', 'Please enter the trailer licence plate number.');
            return;
        }

        if (!image) {
            Alert.alert('Missing Photo', 'Please take a trailer photo before proceeding.');
            return;
        }

        setIsProcessing(true);

        try {
            // Upload trailer photo to S3
            const uploadResult = await uploadTrailerPhotoToS3(image, containerData?.tripSegmentNumber);
            
            if (uploadResult.success) {
                console.log('✅ Trailer photo uploaded to S3 successfully');
                
                // Prepare trailer data for next step with S3 reference
                const trailerData = {
                    ...containerData,
                    trailerNumber: licencePlateText,
                    trailerPhoto: uploadResult.trailerPhoto // Use S3 reference instead of base64
                };
                
                // Save trailer data to state for navigation
                setTrailerData(trailerData);

                // Navigate to next step
                if (onNavigateToStepFour) {
                    onNavigateToStepFour(trailerData);
                }
            } else {
                Alert.alert('Upload Failed', `Failed to upload trailer photo: ${uploadResult.error}`);
                console.error('❌ S3 upload failed:', uploadResult.error);
            }
        } catch (error) {
            Alert.alert('Upload Error', 'An error occurred while uploading trailer photo. Please try again.');
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
                        Camera permission is required to take trailer photos
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
                    Trailer Photo
                </Text>

                {/* Go to Step 5 Button */}
                <TouchableOpacity
                    onPress={() => onNavigateToStepFour && onNavigateToStepFour(trailerData)}
                    style={cn('mr-3 px-3 py-2 rounded-lg bg-blue-500')}
                >
                    <Text style={cn('text-white font-semibold text-sm')}>Go to Step 5</Text>
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


                        {/* Skip Photo Button */}
                        <View style={cn('absolute top-36 left-4 right-4 items-center')}>
                            <TouchableOpacity
                                onPress={() => {
                                    // Set test licence plate data
                                    const testPlate = 'T123ABC';
                                    const plateArray = testPlate.split('');
                                    const newLicencePlate = Array(7).fill('');
                                    
                                    for (let i = 0; i < Math.min(plateArray.length, 7); i++) {
                                        newLicencePlate[i] = plateArray[i];
                                    }
                                    
                                    setLicencePlate(newLicencePlate);
                                    setImage('test-image'); // Set a placeholder image
                                    console.log('📸 Skipped photo - Using test data:', testPlate);
                                }}
                                style={cn('rounded-lg overflow-hidden')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('px-6 py-3')}
                                >
                                    <Text style={cn('text-white font-bold text-center')}>
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
                // Photo Preview with Controls
                <KeyboardAvoidingView
                    style={cn('flex-1')}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                >
                    <View
                        style={cn('flex-1')}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 400 }}
                        showsVerticalScrollIndicator={false}
                    >
                        
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

                            <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                                
                                <View style={cn('mb-2 flex items-center justify-center')}>
                                    <View style={cn('relative')}>
                                        <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={cn('w-[200px] h-[200px] rounded-lg')} />
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

                                {/* Retake Photo Button */}
                                <TouchableOpacity
                                    onPress={retakePhoto}
                                    style={cn('rounded-lg overflow-hidden w-full mb-4')}
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

                                {/* Trailer Number Input */}
                                <View style={cn(`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`)}>
                                    {isRecognizingPlate ? (
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
                                            <View style={cn('flex-row items-center justify-between mb-2')}>
                                                <Text style={cn(`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                    Trailer Licence Plate
                                                </Text>
                                            </View>
                                            <View style={cn('flex-row gap-1 flex-wrap')}>
                                                {licencePlate.map((char, index) => (
                                                    <View key={index} style={cn('items-center justify-center')}>
                                                        <TextInput
                                                            ref={(ref) => (licencePlateRefs.current[index] = ref)}
                                                            value={char}
                                                            onChangeText={(value) => handleLicencePlateChange(index, value)}
                                                            style={[
                                                                cn(`w-12 h-12 border-2 ${isDark ? 'border-yellow-500 bg-gray-800 text-gray-100' : 'border-yellow-700 bg-white text-gray-800'} rounded-lg text-center text-xl font-bold`),
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
                                    )}
                                </View>
                                {/* Navigation Buttons */}
                                <View style={cn('flex-row justify-between mt-4 pb-6')}>
                                    <TouchableOpacity
                                        onPress={handleNext}
                                        disabled={isRecognizingPlate || isProcessing}
                                        style={cn(`flex-1 ml-2 rounded-lg overflow-hidden ${(isRecognizingPlate || isProcessing) ? 'opacity-50' : ''}`)}
                                    >
                                        <LinearGradient
                                            colors={(isRecognizingPlate || isProcessing) ? ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={cn('p-4 items-center')}
                                        >
                                            {isProcessing ? (
                                                <View style={cn('flex-row items-center')}>
                                                    <ActivityIndicator size="small" color="white" style={cn('mr-2')} />
                                                    <Text style={cn('text-white font-bold')}>Submitting...</Text>
                                                </View>
                                            ) : (
                                                <Text style={cn('text-white font-bold')}>Next</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>

                    </View>


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
                        source={{ uri: `data:image/jpeg;base64,${image}` }}
                        style={cn('w-full h-full')}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default StepThreeTrailerPhoto;
