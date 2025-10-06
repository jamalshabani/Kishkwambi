import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X, ImageIcon, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepSixTruckPhoto = ({ onBack, containerData, onNavigateToStepSeven, onNavigateToStepSevenDirect }) => {
    const { isDark, toggleTheme } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [truckNumber, setTruckNumber] = useState(Array(7).fill(''));
    const [extractedData, setExtractedData] = useState({
        truckNumber: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizingPlate, setIsRecognizingPlate] = useState(false);
    const [facing, setFacing] = useState('back');
    const [truckPhotoData, setTruckPhotoData] = useState(null);
    const cameraRef = useRef(null);
    const truckNumberRefs = useRef([]);

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

    const handleTruckNumberChange = (index, value) => {
        const newTruckNumber = [...truckNumber];
        newTruckNumber[index] = value.toUpperCase();
        setTruckNumber(newTruckNumber);

        // Auto-focus next input
        if (value && index < truckNumber.length - 1) {
            truckNumberRefs.current[index + 1]?.focus();
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
                console.log('📸 Truck photo taken successfully');

                // Call PlateRecognizer API to extract truck number
                await recognizeTruckNumber(photo.base64);
            }
        } catch (error) {
            console.error('❌ Error taking truck photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const recognizeTruckNumber = async (base64Image) => {
        try {
            setIsRecognizingPlate(true);
            console.log('🚗 Calling PlateRecognizer API...');

            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            const response = await fetch(`${BACKEND_URL}/api/plate-recognizer/recognize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    base64Image: base64Image,
                }),
            });

            const result = await response.json();
            console.log('🚗 PlateRecognizer response:', result);

            if (result.success && result.data && result.data.licencePlate) {
                const plateNumber = result.data.licencePlate.toUpperCase();
                const confidence = result.data.confidence;
                console.log(`✅ Detected truck number: ${plateNumber} (confidence: ${confidence})`);
                
                // Update extracted data
                setExtractedData({
                    truckNumber: plateNumber,
                });

                // Auto-fill the truck number inputs
                const plateArray = plateNumber.split('');
                const newTruckNumber = Array(7).fill('');

                // Fill the array with detected characters (already uppercase from backend)
                for (let i = 0; i < Math.min(plateArray.length, 7); i++) {
                    newTruckNumber[i] = plateArray[i];
                }

                setTruckNumber(newTruckNumber);
            } else {
                console.log('❌ No truck number detected or API error');
                Alert.alert(
                    'No Truck Number Detected',
                    'No truck number was detected in the image. Please enter it manually.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('❌ Error recognizing truck number:', error);
            Alert.alert(
                'Recognition Error',
                'Failed to recognize truck number. Please enter it manually.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsRecognizingPlate(false);
        }
    };

    const uploadTruckPhotoToS3 = async (imageBase64, tripSegmentNumber, truckNumber) => {
        try {
            console.log('📸 Uploading truck photo to S3...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: `data:image/jpeg;base64,${imageBase64}`,
                type: 'image/jpeg',
                name: 'truck_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'truck');
            formData.append('truckNumber', truckNumber);
            
            console.log('📸 Uploading to:', `${BACKEND_URL}/api/upload/s3-truck-photo`);
            console.log('📸 Trip segment:', tripSegmentNumber);
            console.log('📸 Truck number:', truckNumber);
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-truck-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                console.log('✅ Truck photo uploaded successfully to S3:', result.truckPhoto);
                return { success: true, truckPhoto: result.truckPhoto };
            } else {
                console.error('❌ Failed to upload truck photo to S3:', result.error);
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('❌ Error uploading truck photo to S3:', error);
            return { success: false, error: error.message };
        }
    };

    const saveTruckDetailsToDatabase = async (tripSegmentNumber, truckNumber, truckPhotoUrl) => {
        try {
            console.log('💾 Saving truck details to database...');
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            const updateData = {
                tripSegmentNumber: tripSegmentNumber,
                truckNumber: truckNumber
            };

            // Add truck photo if available
            if (truckPhotoUrl) {
                updateData.truckPhoto = truckPhotoUrl;
            }

            console.log('📊 Update data:', updateData);

            const response = await fetch(`${BACKEND_URL}/api/trip-segments/update-truck-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();
            console.log('📊 Database update response:', result);

            if (result.success) {
                console.log('✅ Truck details saved to database successfully');
                return { success: true };
            } else {
                console.error('❌ Failed to save truck details to database:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Error saving truck details to database:', error);
            return { success: false, error: error.message };
        }
    };

    const handleNext = async () => {
        if (!image) {
            Alert.alert('Missing Photo', 'Please take a truck photo before proceeding.');
            return;
        }

        const currentTruckNumber = truckNumber.join('').toUpperCase();
        if (!currentTruckNumber || currentTruckNumber.length === 0) {
            Alert.alert('Missing Truck Number', 'Please enter the truck number before proceeding.');
            return;
        }

        setIsProcessing(true);

        try {
            // Upload truck photo to S3 with truck number
            const uploadResult = await uploadTruckPhotoToS3(image, containerData?.tripSegmentNumber, currentTruckNumber);
            
            if (uploadResult.success) {
                console.log('✅ Truck photo uploaded to S3 successfully');
                
                // Save truck details to database
                const saveResult = await saveTruckDetailsToDatabase(
                    containerData?.tripSegmentNumber, 
                    currentTruckNumber, 
                    uploadResult.truckPhoto
                );
                
                if (!saveResult.success) {
                    Alert.alert('Database Error', 'Failed to save truck details. Please try again.');
                    return;
                }
                
                // Prepare truck data for next step with S3 reference
                const truckData = {
                    ...containerData,
                    truckPhoto: uploadResult.truckPhoto, // Use S3 reference instead of base64
                    truckNumber: currentTruckNumber
                };
                
                // Save truck photo data to state for navigation
                setTruckPhotoData(truckData);

                console.log('✅ Truck details completed and saved to database successfully');

                // Navigate to next step
                if (onNavigateToStepSeven) {
                    onNavigateToStepSeven(truckData);
                }
            } else {
                Alert.alert('Upload Failed', `Failed to upload truck photo: ${uploadResult.error}`);
                console.error('❌ S3 upload failed:', uploadResult.error);
            }
        } catch (error) {
            Alert.alert('Upload Error', 'An error occurred while uploading truck photo. Please try again.');
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
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Back Button and Title */}
                <View style={cn('flex-row items-center flex-1')}>
                    <TouchableOpacity 
                        onPress={onBack}
                        style={cn('mr-4 p-2')}
                    >
                        <ArrowLeft size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>

                    {/* Title */}
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Truck Photo
                    </Text>
                </View>

                {/* Timer Display and Navigation Buttons */}
                <View style={cn('flex-row items-center')}>
                    {/* Timer Display */}
                    <TimerDisplay />

                    {/* Go to Step 7 Button */}
                    <TouchableOpacity 
                        onPress={() => onNavigateToStepSevenDirect && onNavigateToStepSevenDirect({})}
                        style={cn(`mr-3 px-3 py-1 rounded-lg ${isDark ? 'bg-blue-600' : 'bg-blue-500'}`)}
                    >
                        <Text style={cn('text-white text-sm font-medium')}>
                            Go to Step 7
                        </Text>
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
                            {isDark ? <Sun size={20} color="#9CA3AF" /> : <Moon size={20} color="#6B7280" />}
                        </TouchableOpacity>
                    </Animated.View>
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
                                        height: 420,
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
                                    onPress={() => {
                                        setImage(null);
                                        setTruckNumber(Array(7).fill(''));
                                        setExtractedData({ truckNumber: '' });
                                    }}
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

                                {/* Truck Number Input */}
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
                                                    Truck Number
                                                </Text>
                                            </View>
                                            <View style={cn('flex-row gap-1 flex-wrap')}>
                                                {truckNumber.map((char, index) => (
                                                    <View key={index} style={cn('items-center justify-center')}>
                                                        <TextInput
                                                            ref={(ref) => (truckNumberRefs.current[index] = ref)}
                                                            value={char}
                                                            onChangeText={(value) => handleTruckNumberChange(index, value)}
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
                    <TouchableOpacity
                        onPress={() => setShowZoomModal(false)}
                        style={cn('absolute top-12 right-6 z-10')}
                    >
                        <X size={32} color="white" />
                    </TouchableOpacity>
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

export default StepSixTruckPhoto;
