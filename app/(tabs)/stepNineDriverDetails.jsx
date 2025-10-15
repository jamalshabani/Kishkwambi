import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { useInspectionTimer } from '../../contexts/InspectionTimerContext';
import TimerDisplay from '../../components/common/TimerDisplay';
import { Sun, Moon, Eye, X, Camera, User, CreditCard, Phone, Mail, ArrowLeft } from 'lucide-react-native';
import { API_CONFIG } from '../../lib/config';

const StepNineDriverDetails = ({ onBack, containerData, onComplete, onShowSuccess, onUpdateUploadProgress }) => {
    const { isDark, toggleTheme } = useTheme();
    const { stopTimer, resetTimer } = useInspectionTimer();
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [facing, setFacing] = useState('back');
    const [driverData, setDriverData] = useState(null);
    const cameraRef = useRef(null);
    const [trailerNumber, setTrailerNumber] = useState(null);
    const [truckNumber, setTruckNumber] = useState(null);

    // Fetch trailer number from database
    useEffect(() => {
        const fetchTrailerNumber = async () => {
            try {
                if (!containerData?.tripSegmentNumber) return;
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData.tripSegmentNumber}/trailer-details`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.trailerNumber) {
                        setTrailerNumber(result.trailerNumber);
                    }
                }
            } catch (error) {
            }
        };
        fetchTrailerNumber();
    }, [containerData?.tripSegmentNumber]);

    // Fetch truck number from database
    useEffect(() => {
        const fetchTruckNumber = async () => {
            try {
                if (!containerData?.tripSegmentNumber) return;
                const BACKEND_URL = API_CONFIG.getBackendUrl();
                const response = await fetch(`${BACKEND_URL}/api/trip-segments/${containerData.tripSegmentNumber}/truck-details`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.truckNumber) {
                        setTruckNumber(result.truckNumber);
                    }
                }
            } catch (error) {
            }
        };
        fetchTruckNumber();
    }, [containerData?.tripSegmentNumber]);

    // Driver details state
    const [driverDetails, setDriverDetails] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '+255',
        licenseNumber: '',
        transporterName: 'Local Transporter'
    });

    // Error modal state
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalData, setErrorModalData] = useState({ title: '', message: '' });

    // Focus states for gradient borders
    const [focusedField, setFocusedField] = useState(null);

    // Animation values for theme switcher
    const themeIconRotation = useRef(new Animated.Value(0)).current;
    const themeButtonScale = useRef(new Animated.Value(1)).current;

    // Camera overlay dimensions (matching Front Wall)
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const licenseFrameWidth = screenWidth * 0.85;
    const licenseFrameHeight = licenseFrameWidth * 0.94;
    const centerX = (screenWidth - licenseFrameWidth) / 2;
    const centerY = (screenHeight - licenseFrameHeight) / 2 - 80;

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
        let imageOverlayX = (centerX + offsetX) * scale;
        let imageOverlayY = (centerY + offsetY) * scale;
        let imageOverlayWidth = licenseFrameWidth * scale;
        let imageOverlayHeight = licenseFrameHeight * scale;
        imageOverlayX = Math.max(0, imageOverlayX);
        imageOverlayY = Math.max(0, imageOverlayY);
        if (imageOverlayX + imageOverlayWidth > imageWidth) imageOverlayWidth = imageWidth - imageOverlayX;
        if (imageOverlayY + imageOverlayHeight > imageHeight) imageOverlayHeight = imageHeight - imageOverlayY;
        return { x: Math.round(imageOverlayX), y: Math.round(imageOverlayY), width: Math.round(imageOverlayWidth), height: Math.round(imageOverlayHeight) };
    };

    const cropImageToLicenseFrame = async (imageUri) => {
        try {
            const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { format: ImageManipulator.SaveFormat.JPEG });
            const imageWidth = imageInfo.width;
            const imageHeight = imageInfo.height;
            
            // Log size before cropping
            let beforeCropSize = 0;
            try {
                const beforeInfo = await fetch(imageUri);
                const beforeBlob = await beforeInfo.blob();
                beforeCropSize = beforeBlob.size;
                console.log(`📊 BEFORE CROP: ${imageWidth}x${imageHeight}, ${(beforeCropSize / 1024 / 1024).toFixed(2)}MB`);
            } catch (e) {}
            
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
                { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG } // No compression during crop
            );
            
            // Log size after cropping
            try {
                const afterInfo = await fetch(croppedImage.uri);
                const afterBlob = await afterInfo.blob();
                const reduction = beforeCropSize > 0 ? ((1 - afterBlob.size / beforeCropSize) * 100).toFixed(1) : 0;
                console.log(`📊 AFTER CROP: ${cropArea.width}x${cropArea.height}, ${(afterBlob.size / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
            } catch (e) {}
            
            return croppedImage.uri;
        } catch (error) {
            console.error('❌ Crop error:', error);
            return imageUri;
        }
    };

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

    const openCamera = () => {
        setShowCamera(true);
        setShowForm(false);
    };

    const openForm = () => {
        setShowForm(true);
        setShowCamera(false);
    };


    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            setIsProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.6,
                base64: true, // Enable base64 for Vision AI
                skipProcessing: true,
                exif: false,
            });

            if (photo?.uri) {
                // Get file size of original photo
                try {
                    const fileInfo = await fetch(photo.uri);
                    const blob = await fileInfo.blob();
                } catch (e) {}

                // Crop the image to the license frame area
                const croppedImage = await cropImageToLicenseFrame(photo.uri);

                // Wait to ensure the cropped file is fully written to disk
                await new Promise(resolve => setTimeout(resolve, 500));

                // Resize image to optimal size for OCR (faster upload and processing)
                const resizedImage = await ImageManipulator.manipulateAsync(
                    croppedImage,
                    [{ resize: { width: 1024 } }], // Resize to max width 1024px
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );

                // Wait to ensure the resized file is fully written to disk
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Get file size comparison
                try {
                    const fileInfo = await fetch(resizedImage.uri);
                    const blob = await fileInfo.blob();
                    const originalFileInfo = await fetch(photo.uri);
                    const originalBlob = await originalFileInfo.blob();
                    const reduction = (((originalBlob.size - blob.size) / originalBlob.size) * 100).toFixed(1);
                    console.log(`📊 Optimized driver license for OCR: ${resizedImage.width}x${resizedImage.height}, ${reduction}% size reduction`);
                } catch (e) {}

                setImage(resizedImage.uri);
                setShowCamera(false);

                // Show extraction loading
                setIsExtracting(true);
                
                // Call Vision AI to extract driver details (use optimized base64)
                await extractDriverDetails(resizedImage.base64);
                
                // Automatically show the form with extracted data
                setShowForm(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsProcessing(false);
            setIsExtracting(false);
        }
    };

    const extractDriverDetails = async (base64Image) => {
        try {
            setIsRecognizing(true);

            const BACKEND_URL = API_CONFIG.getBackendUrl();

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(`${BACKEND_URL}/api/vision/extract-driver-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (result.success && result.data) {
                const extractedData = result.data;
                
                // Helper function to capitalize first letter of each word
                const capitalizeWords = (text) => {
                    if (!text) return '';
                    return text.toLowerCase()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                };
                
                setDriverDetails(prev => ({
                    ...prev,
                    firstName: capitalizeWords(extractedData.firstName || extractedData.fullName?.split(' ')[0] || prev.firstName),
                    lastName: capitalizeWords(extractedData.lastName || extractedData.fullName?.split(' ').slice(1).join(' ') || prev.lastName),
                    phoneNumber: extractedData.phoneNumber || prev.phoneNumber,
                    licenseNumber: extractedData.licenseNumber || prev.licenseNumber,
                    transporterName: capitalizeWords(extractedData.transporterName || prev.transporterName)
                }));
            } else {
                setErrorModalData({
                    title: 'Manual Input Required',
                    message: 'Unable to extract driver details from the photo. Please enter the information manually.'
                });
                setShowErrorModal(true);
            }
        } catch (error) {
            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                setErrorModalData({
                    title: 'Request Timed Out',
                    message: 'The recognition took too long. Please enter the driver details manually.'
                });
            } else {
                setErrorModalData({
                    title: 'Recognition Error',
                    message: 'Failed to extract driver details. Please enter manually.'
                });
            }
            setShowErrorModal(true);
        } finally {
            setIsRecognizing(false);
        }
    };

    const uploadDriverPhotoToS3 = async (imageBase64, tripSegmentNumber) => {
        try {
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Create FormData for file upload
            const formData = new FormData();
            
            // Add the image file
            formData.append('photo', {
                uri: image,
                type: 'image/jpeg',
                name: 'driver_photo.jpg'
            });
            
            // Add metadata
            formData.append('tripSegmentNumber', tripSegmentNumber);
            formData.append('photoType', 'driver');
            
            
            const uploadResponse = await fetch(`${BACKEND_URL}/api/upload/s3-driver-photo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            const result = await uploadResponse.json();
            
            if (result.success) {
                return { success: true, driverPhoto: result.driverPhoto };
            } else {
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    /**
     * Resize and compress image to reduce file size
     * Process: Resize → Compress
     * @param {string} imageUri - URI of the image to resize and compress
     * @param {number} quality - Compression quality (0.0 to 1.0, default 0.6)
     * @param {number} maxWidth - Maximum width (default 1920)
     * @param {number} maxHeight - Maximum height (default 1080)
     * @returns {Promise<string>} - URI of the processed image
     */
    const compressImage = async (imageUri, quality = 0.6, maxWidth = 1920, maxHeight = 1080) => {
        try {
            // Get original image info
            const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {});
            const originalWidth = imageInfo.width;
            const originalHeight = imageInfo.height;
            
            // Get original file size
            let originalSize = 0;
            try {
                const originalInfo = await fetch(imageUri);
                const originalBlob = await originalInfo.blob();
                originalSize = originalBlob.size;
                console.log(`📊 BEFORE RESIZE: ${originalWidth}x${originalHeight}, ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
            } catch (e) {}
            
            // Calculate new dimensions (maintain aspect ratio)
            let newWidth = originalWidth;
            let newHeight = originalHeight;
            
            // Only resize if image is larger than max dimensions
            if (originalWidth > maxWidth || originalHeight > maxHeight) {
                const widthRatio = maxWidth / originalWidth;
                const heightRatio = maxHeight / originalHeight;
                const ratio = Math.min(widthRatio, heightRatio);
                
                newWidth = Math.round(originalWidth * ratio);
                newHeight = Math.round(originalHeight * ratio);
            }
            
            // Prepare transformations
            const transformations = [];
            if (newWidth < originalWidth) {
                transformations.push({ resize: { width: newWidth } });
            }
            
            // Apply resize and compression
            const processed = await ImageManipulator.manipulateAsync(
                imageUri,
                transformations,
                {
                    compress: quality,
                    format: ImageManipulator.SaveFormat.JPEG
                }
            );
            
            // Log final result
            try {
                const processedInfo = await fetch(processed.uri);
                const processedBlob = await processedInfo.blob();
                const reduction = originalSize > 0 ? ((1 - processedBlob.size / originalSize) * 100).toFixed(1) : 0;
                console.log(`📊 AFTER RESIZE & COMPRESS: ${newWidth}x${newHeight}, ${(processedBlob.size / 1024 / 1024).toFixed(2)}MB`);
                console.log(`✅ TOTAL REDUCTION: ${reduction}%`);
                console.log('─────────────────────────────────');
            } catch (e) {}
            
            return processed.uri;
        } catch (error) {
            console.error('❌ Resize/Compression error:', error);
            return imageUri;
        }
    };

    const uploadAllPhotosToArrivedContainers = async (tripSegmentNumber, containerData, progressCallback) => {
        try {
            console.log('🚀 uploadAllPhotosToArrivedContainers called');
            console.log('📋 Trip Segment:', tripSegmentNumber);
            console.log('📋 Container Data keys:', Object.keys(containerData || {}));
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            console.log('🌐 Backend URL:', BACKEND_URL);
            
            const formData = new FormData();
            
            // Add trip segment number
            formData.append('tripSegmentNumber', tripSegmentNumber);
            
            // Collect all photos with their types
            const photos = [];
            
            console.log('📸 Compressing photos before upload...');
            
            // Compress and add Container photo
            if (containerData?.containerPhoto) {
                const compressedUri = await compressImage(containerData.containerPhoto);
                photos.push({ uri: compressedUri, type: 'ContainerPhoto' });
            }
            
            // Compress and add Trailer photo
            if (containerData?.trailerPhoto) {
                const compressedUri = await compressImage(containerData.trailerPhoto);
                photos.push({ uri: compressedUri, type: 'TrailerPhoto' });
            }
            
            // Compress and add Right wall photo
            if (containerData?.rightWallPhoto) {
                const compressedUri = await compressImage(containerData.rightWallPhoto);
                photos.push({ uri: compressedUri, type: 'RightWallPhoto' });
            }
            
            // Compress and add Back wall photo
            if (containerData?.backWallPhoto) {
                const compressedUri = await compressImage(containerData.backWallPhoto);
                photos.push({ uri: compressedUri, type: 'BackWallPhoto' });
            }
            
            // Compress and add Truck photo
            if (containerData?.truckPhoto) {
                const compressedUri = await compressImage(containerData.truckPhoto);
                photos.push({ uri: compressedUri, type: 'TruckPhoto' });
            }
            
            // Compress and add Left side photo
            if (containerData?.leftSidePhoto) {
                const compressedUri = await compressImage(containerData.leftSidePhoto);
                photos.push({ uri: compressedUri, type: 'LeftSidePhoto' });
            }
            
            // Compress and add Inside photo
            if (containerData?.insidePhoto) {
                const compressedUri = await compressImage(containerData.insidePhoto);
                photos.push({ uri: compressedUri, type: 'InsidePhoto' });
            }
            
            // Compress and add Damage photos from all locations
            const damagePhotos = [];
            if (containerData?.frontWallDamagePhotos && containerData.frontWallDamagePhotos.length > 0) {
                for (const photo of containerData.frontWallDamagePhotos) {
                    const compressedUri = await compressImage(photo.uri);
                    damagePhotos.push({ uri: compressedUri, location: 'FrontWall' });
                }
            }
            if (containerData?.rightWallDamagePhotos && containerData.rightWallDamagePhotos.length > 0) {
                for (const photo of containerData.rightWallDamagePhotos) {
                    const compressedUri = await compressImage(photo.uri);
                    damagePhotos.push({ uri: compressedUri, location: 'RightWall' });
                }
            }
            if (containerData?.backWallDamagePhotos && containerData.backWallDamagePhotos.length > 0) {
                for (const photo of containerData.backWallDamagePhotos) {
                    const compressedUri = await compressImage(photo.uri);
                    damagePhotos.push({ uri: compressedUri, location: 'BackWall' });
                }
            }
            if (containerData?.leftWallDamagePhotos && containerData.leftWallDamagePhotos.length > 0) {
                for (const photo of containerData.leftWallDamagePhotos) {
                    const compressedUri = await compressImage(photo.uri);
                    damagePhotos.push({ uri: compressedUri, location: 'LeftWall' });
                }
            }
            if (containerData?.insideDamagePhotos && containerData.insideDamagePhotos.length > 0) {
                for (const photo of containerData.insideDamagePhotos) {
                    const compressedUri = await compressImage(photo.uri);
                    damagePhotos.push({ uri: compressedUri, location: 'Inside' });
                }
            }
            
            // Compress and add Driver license photo
            if (image) {
                const compressedUri = await compressImage(image);
                photos.push({ uri: compressedUri, type: 'DriverLicensePhoto' });
            }
            
            console.log(`✅ Compressed ${photos.length} main photos and ${damagePhotos.length} damage photos`);
            console.log('📋 Main photos:', photos.map(p => p.type).join(', '));
            console.log('📋 Damage photos locations:', damagePhotos.map(p => p.location).join(', '));
            
            const totalPhotos = photos.length + damagePhotos.length;
            console.log(`📊 Total photos to upload: ${totalPhotos}`);
            
            // Update progress: preparing upload
            if (progressCallback) {
                progressCallback(0, totalPhotos);
            }
            
            // Add all photos to formData
            console.log('📦 Adding photos to FormData...');
            photos.forEach((photo, index) => {
                console.log(`  Adding photo ${index + 1}: ${photo.type} from ${photo.uri.substring(0, 50)}...`);
                formData.append('photos', {
                    uri: photo.uri,
                    type: 'image/jpeg',
                    name: `photo_${index}.jpg`
                });
                formData.append('photoTypes', photo.type);
            });
            
            // Add damage photos
            console.log('📦 Adding damage photos to FormData...');
            damagePhotos.forEach((photo, index) => {
                console.log(`  Adding damage photo ${index + 1}: ${photo.location} from ${photo.uri.substring(0, 50)}...`);
                formData.append('damagePhotos', {
                    uri: photo.uri,
                    type: 'image/jpeg',
                    name: `damage_${index}.jpg`
                });
                formData.append('damageLocations', photo.location);
            });
            
            // Simulate progress during upload (since we can't track individual photo uploads in one request)
            let currentPhotoCount = 0;
            const progressInterval = setInterval(() => {
                // Increment progress gradually, simulating one photo at a time
                if (progressCallback && currentPhotoCount < totalPhotos - 1) {
                    currentPhotoCount += 1;
                    progressCallback(currentPhotoCount, totalPhotos);
                }
            }, 500); // Update every 500ms to simulate individual photo uploads
            
            
            // Add timeout to the request (5 minutes for large uploads)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
            
            console.log(`📤 Uploading to: ${BACKEND_URL}/api/upload/batch-photos-arrived-containers`);
            console.log(`📊 Uploading ${totalPhotos} photos (${photos.length} main + ${damagePhotos.length} damage)...`);
            
            try {
                // Don't set Content-Type manually - let React Native set it with the boundary
                const response = await fetch(`${BACKEND_URL}/api/upload/batch-photos-arrived-containers`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
                
                console.log(`📥 Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Server error: ${response.status} - ${errorText}`);
                    throw new Error(`Server responded with status ${response.status}: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('📦 Upload result:', JSON.stringify(result, null, 2));
            
                if (result.success) {
                    // Update to 100% progress
                    if (progressCallback) {
                        progressCallback(totalPhotos, totalPhotos);
                    }
                    return { success: true, photoReferences: result.photoReferences };
                } else {
                    return { success: false, error: result.error };
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
                
                if (fetchError.name === 'AbortError') {
                    return { success: false, error: 'Upload timed out. This may happen with many large photos. Please check your connection and try again.' };
                }
                throw fetchError;
            }
            
        } catch (error) {
            console.error('❌ Upload exception:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            
            // Provide more helpful error messages
            let errorMessage = error.message;
            if (error.message.includes('Network request failed')) {
                errorMessage = 'Cannot connect to server. Please check:\n1. Your device is on the same network\n2. Backend server is running\n3. Backend URL is correct: ' + API_CONFIG.getBackendUrl();
            } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and backend server.';
            }
            
            return { success: false, error: errorMessage };
        }
    };

    const saveDriverDetailsToDatabase = async (tripSegmentNumber, driverDetails, driverPhotoUrl) => {
        try {
            
            const BACKEND_URL = API_CONFIG.getBackendUrl();
            
            // Get current date in dd/mm/yyyy format
            const currentDate = new Date();
            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const year = currentDate.getFullYear();
            const inspectionDate = `${day}/${month}/${year}`;
            
            // Get current timestamp
            const gateInTimeStamp = currentDate.toISOString();
            
            // Stop the timer and get the inspection time
            const inspectionTime = stopTimer();
            
            // Determine inwardLOLOBalance based on container size
            let inwardLOLOBalance = 150000; // Default for 40ft
            if (containerData?.containerSize === '40ft') {
                inwardLOLOBalance = 150000;
            } else if (containerData?.containerSize === '20ft') {
inwardLOLOBalance = 75000;
            }
            
            const updateData = {
                tripSegmentNumber: tripSegmentNumber,
                transporterName: "Local Transporter",
                driverFirstName: driverDetails.firstName,
                driverLastName: driverDetails.lastName,
                driverLicenceNumber: driverDetails.licenseNumber,
                driverPhoneNumber: driverDetails.phoneNumber.replace(/\s/g, ''), // Remove spaces before saving
                containerStatus: "Pending",
                inspectionDate: inspectionDate,
                inspectionTime: inspectionTime,
                finalApproval: false,
                gateInTimeStamp: gateInTimeStamp,
                inwardLOLOBalance: inwardLOLOBalance
            };

            // Add driver photo if available
            if (driverPhotoUrl) {
                updateData.driverPhoto = driverPhotoUrl;
            }


            const response = await fetch(`${BACKEND_URL}/api/trip-segments/update-driver-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const result = await response.json();

            if (result.success) {
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const handleComplete = async () => {
        // Validate required fields
        if (!driverDetails.firstName || !driverDetails.lastName || !driverDetails.phoneNumber || 
            !driverDetails.licenseNumber) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }

        // Validate trip segment number
        if (!containerData?.tripSegmentNumber) {
            Alert.alert('Missing Trip Segment', 'Trip segment information is missing. Please go back and try again.');
            return;
        }

        //console.log('📊 Container data:', containerData);

        setIsProcessing(true);

        try {
            // Stop the timer FIRST to get inspection time before showing success screen
            const inspectionTime = stopTimer();
            
            // Prepare complete data with inspection time
            const completeData = {
                ...containerData,
                driverDetails: {
                    ...driverDetails,
                },
                inspectionTime: inspectionTime // Add inspection time to data
            };
            
            // Show success screen FIRST (with upload progress at 0%)
            if (onShowSuccess) {
                onShowSuccess(completeData);
            }
            
            // Small delay to ensure success screen is rendered
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Upload all photos to InspectionPhotos folder with progress updates
            console.log('📤 Starting batch photo upload...');
            const uploadResult = await uploadAllPhotosToArrivedContainers(
                containerData?.tripSegmentNumber, 
                containerData,
                onUpdateUploadProgress
            );
            
            console.log('📤 Upload result:', uploadResult);
            
            if (!uploadResult.success) {
                console.error('❌ Upload failed:', uploadResult.error);
                setErrorModalData({
                    title: 'Upload Error',
                    message: uploadResult.error || 'Failed to upload photos. Please try again.'
                });
                setShowErrorModal(true);
                return;
            }
            
            console.log('✅ Photos uploaded successfully');

            // Save driver details to database
            console.log('💾 Saving driver details to database...');
            const saveResult = await saveDriverDetailsToDatabase(containerData?.tripSegmentNumber, driverDetails, null);
            
            if (!saveResult.success) {
                console.error('❌ Database save failed:', saveResult.error);
                setErrorModalData({
                    title: 'Database Error',
                    message: saveResult.error || 'Failed to save driver details. Please try again.'
                });
                setShowErrorModal(true);
                return;
            }

            console.log('✅ Driver details saved successfully');
            
        } catch (error) {
            console.error('❌ Exception in handleComplete:', error);
            setErrorModalData({
                title: 'Error',
                message: error.message || 'An error occurred while completing driver details. Please try again.'
            });
            setShowErrorModal(true);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInputChange = (field, value) => {
        // Validation for Driver Licence Number: only allow 10 digits
        if (field === 'licenseNumber') {
            // Only allow numbers
            const numericValue = value.replace(/[^0-9]/g, '');
            // Limit to 10 digits
            const limitedValue = numericValue.slice(0, 10);
            
            setDriverDetails(prev => ({
                ...prev,
                [field]: limitedValue
            }));
        } 
        // Validation for Phone Number: format +255 ### ### ###
        else if (field === 'phoneNumber') {
            // Remove the fixed prefix +255 to get only user input
            let userInput = value.replace('+255 ', '').replace('+255', '');
            
            // Remove all non-numeric characters from user input
            const numericValue = userInput.replace(/[^0-9]/g, '');
            
            // Limit to 9 digits
            const limitedDigits = numericValue.slice(0, 9);
            
            // Format as +255 ### ### ###
            let formattedValue = '+255';
            if (limitedDigits.length > 0) {
                if (limitedDigits.length <= 3) {
                    formattedValue += ' ' + limitedDigits;
                } else if (limitedDigits.length <= 6) {
                    formattedValue += ' ' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3);
                } else {
                    formattedValue += ' ' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3, 6) + ' ' + limitedDigits.slice(6);
                }
            }
            
            setDriverDetails(prev => ({
                ...prev,
                [field]: formattedValue
            }));
        } 
        else {
            setDriverDetails(prev => ({
                ...prev,
                [field]: value
            }));
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
                        Camera permission is required to take driver license photo
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={cn('rounded-lg overflow-hidden')}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={cn('px-6 py-3 items-center')}
                        >
                            <Text style={cn('text-white font-semibold')}>Grant Permission</Text>
                        </LinearGradient>
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
                        onPress={() => onBack(containerData)}
                        style={cn('mr-3 p-1')}
                    >
                        <ArrowLeft size={24} color={isDark ? '#F3F4F6' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                        Driver Details
                    </Text>
                </View>

                {/* Timer Display and Theme Switcher */}
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
                            {isDark ? <Sun size={20} color="#9CA3AF" /> : <Moon size={20} color="#6B7280" />}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {!showCamera && !showForm ? (
                // Initial Selection Screen
                <View style={cn('flex-1 items-center p-6')}>
                    {/* Container Number and Trip Segment Display */}
                    <View style={cn(`mb-8 p-6 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border w-full`)}>
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
                        <View style={cn('flex-row items-center mt-3')}>
                            <View style={cn('flex-1')}>
                                <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                    Trailer Number
                                </Text>
                                <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                    {trailerNumber || containerData?.trailerNumber || 'N/A'}
                                </Text>
                            </View>
                            <View style={cn('flex-1 ml-4')}>
                                <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                    Truck Number
                                </Text>
                                <Text style={cn(`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                    {truckNumber || containerData?.truckNumber || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Selection Buttons */}
                    <View style={cn('w-full')}>
                        {/* Take Driver License Photo Button */}
                        <TouchableOpacity
                            onPress={openCamera}
                            disabled={isProcessing}
                            style={cn(`w-full rounded-lg overflow-hidden mb-4 ${isProcessing ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-6 items-center')}
                            >
                                <Camera size={32} color="white" style={cn('mb-2')} />
                                <Text style={cn('text-white font-bold text-lg')}>Take Driver Licence Photo</Text>
                                <Text style={cn('text-white/80 text-sm mt-1')}>
                                    AI will extract details automatically
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* OR Divider */}
                        <View style={cn('flex-row items-center my-6')}>
                            <View style={cn(`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`)} />
                            <Text style={cn(`px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`)}>OR</Text>
                            <View style={cn(`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`)} />
                        </View>

                        {/* Enter Driver Details Button */}
                        <TouchableOpacity
                            onPress={openForm}
                            disabled={isProcessing}
                            style={cn(`w-full rounded-lg overflow-hidden ${isProcessing ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-6 items-center')}
                            >
                                <User size={32} color="white" style={cn('mb-2')} />
                                <Text style={cn('text-white font-bold text-lg')}>Enter Driver Details</Text>
                                <Text style={cn('text-white/80 text-sm mt-1')}>
                                    Fill in driver information manually
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : showCamera ? (
                // Full Screen Camera View
                <View style={cn('flex-1')}>
                    <CameraView
                        ref={cameraRef}
                        style={cn('flex-1')}
                        facing={facing}
                        ratio="1:1"
                    />

                    {/* Custom Mask Overlay - matching Front Wall */}
                    <View style={cn('absolute inset-0')} pointerEvents="box-none">
                        <View style={{ position: 'absolute', top: 0, left: 0, width: screenWidth, height: centerY, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: 0, width: centerX, height: licenseFrameHeight, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX + licenseFrameWidth, width: centerX, height: licenseFrameHeight, backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY + licenseFrameHeight, left: 0, width: screenWidth, height: screenHeight - (centerY + licenseFrameHeight), backgroundColor: 'black' }} />
                        <View style={{ position: 'absolute', top: centerY, left: centerX, width: licenseFrameWidth, height: licenseFrameHeight, borderWidth: 2, borderColor: '#10B981', backgroundColor: 'transparent' }} />
                    </View>
                    
                    <View style={cn('absolute top-4 left-4 right-4 items-center')} pointerEvents="none">
                        <View style={cn('bg-black/70 p-6 rounded-lg')}>
                            <Text style={cn('text-white text-center text-lg font-semibold')}>
                                Make sure the Driver License is clearly visible
                            </Text>
                        </View>
                    </View>
                    
                    {/* Camera Controls Overlay */}
                    <View style={cn('absolute bottom-0 left-0 bg-black/50 right-0 pb-20 pt-4')}>
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
            ) : (
                // Form View
                <KeyboardAvoidingView 
                    style={cn('flex-1')} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView style={cn('flex-1')} showsVerticalScrollIndicator={false}>
                        <View style={cn('p-6')}>
                            {/* Container Number and Trip Segment Display */}
                            <View style={cn(`mb-6 p-4 rounded-lg ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`)}>
                                <View style={cn('flex-row items-center justify-between mb-3')}>
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
                                <View style={cn('flex-row items-center')}>
                                    <View style={cn('flex-1')}>
                                        <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                            Trailer Number
                                        </Text>
                                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`)}>
                                            {trailerNumber || containerData?.trailerNumber || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={cn('flex-1 ml-4')}>
                                        <Text style={cn(`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`)}>
                                            Truck Number
                                        </Text>
                                        <Text style={cn(`text-lg font-semibold ${isDark ? 'text-white' : 'text-black'}`)}>
                                            {truckNumber || containerData?.truckNumber || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Driver Details Form */}
                            <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 mb-6`)}>
                                <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Driver Information
                                </Text>

                                {/* Row 1: Driver First Name and Last Name */}
                                <View style={cn('flex-row gap-2 mb-4')}>
                                    {/* Driver First Name */}
                                    <View style={cn('flex-1')}>
                                        <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                            First Name <Text style={cn('text-red-500')}>*</Text>
                                        </Text>
                                        <View style={cn('rounded-lg overflow-hidden')}>
                                            <LinearGradient
                                                colors={focusedField === 'firstName' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={cn('p-[2px] rounded-lg')}
                                            >
                                                <TextInput
                                                    style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'firstName' ? '' : 'border'} ${focusedField === 'firstName' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                    placeholder="First name"
                                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                    value={driverDetails.firstName}
                                                    onChangeText={(value) => handleInputChange('firstName', value)}
                                                    onFocus={() => setFocusedField('firstName')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </LinearGradient>
                                        </View>
                                    </View>

                                    {/* Driver Last Name */}
                                    <View style={cn('flex-1')}>
                                        <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                            Last Name <Text style={cn('text-red-500')}>*</Text>
                                        </Text>
                                        <View style={cn('rounded-lg overflow-hidden')}>
                                            <LinearGradient
                                                colors={focusedField === 'lastName' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={cn('p-[2px] rounded-lg')}
                                            >
                                                <TextInput
                                                    style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'lastName' ? '' : 'border'} ${focusedField === 'lastName' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                    placeholder="Last name"
                                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                    value={driverDetails.lastName}
                                                    onChangeText={(value) => handleInputChange('lastName', value)}
                                                    onFocus={() => setFocusedField('lastName')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </View>

                                {/* Row 2: Driver Licence Number and Phone Number */}
                                <View style={cn('flex-row gap-2 mb-4')}>
                                    {/* Driver Licence Number */}
                                    <View style={cn('flex-1')}>
                                        <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                            Licence Number <Text style={cn('text-red-500')}>*</Text>
                                        </Text>
                                        <View style={cn('rounded-lg overflow-hidden')}>
                                            <LinearGradient
                                                colors={focusedField === 'licenseNumber' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={cn('p-[2px] rounded-lg')}
                                            >
                                                <TextInput
                                                    style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'licenseNumber' ? '' : 'border'} ${focusedField === 'licenseNumber' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                    placeholder="Licence #"
                                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                    value={driverDetails.licenseNumber}
                                                    onChangeText={(value) => handleInputChange('licenseNumber', value)}
                                                    keyboardType="numeric"
                                                    maxLength={10}
                                                    onFocus={() => setFocusedField('licenseNumber')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </LinearGradient>
                                        </View>
                                    </View>

                                    {/* Driver Phone Number */}
                                    <View style={cn('flex-1')}>
                                        <Text style={cn(`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                            Phone Number <Text style={cn('text-red-500')}>*</Text>
                                        </Text>
                                        <View style={cn('rounded-lg overflow-hidden')}>
                                            <LinearGradient
                                                colors={focusedField === 'phoneNumber' ? ['#000000', '#F59E0B'] : ['transparent', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={cn('p-[2px] rounded-lg')}
                                            >
                                                <TextInput
                                                    style={cn(`px-3 py-3 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-black'} ${focusedField === 'phoneNumber' ? '' : 'border'} ${focusedField === 'phoneNumber' ? '' : (isDark ? 'border-gray-600' : 'border-gray-300')}`)}
                                                    placeholder="+255 ### ### ###"
                                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                    value={driverDetails.phoneNumber}
                                                    onChangeText={(value) => handleInputChange('phoneNumber', value)}
                                                    keyboardType="numeric"
                                                    maxLength={16}
                                                    onFocus={() => setFocusedField('phoneNumber')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </View>


                            {/* Action Buttons */}
                            <View style={cn('flex-row gap-4 mb-6')}>
                                <TouchableOpacity
                                    onPress={() => setShowForm(false)}
                                    style={cn('flex-1 rounded-lg overflow-hidden')}
                                >
                                    <LinearGradient
                                        colors={['#000000', '#F59E0B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={cn('px-4 py-4 items-center')}
                                    >
                                        <Text style={cn('text-white font-bold')}>Previous</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={handleComplete}
                                    disabled={isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                             !driverDetails.phoneNumber || !driverDetails.licenseNumber}
                                    style={cn(`flex-1 rounded-lg overflow-hidden ${(isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                             !driverDetails.phoneNumber || !driverDetails.licenseNumber) ? 'opacity-50' : ''}`)}
                                >
                                    <LinearGradient
                                        colors={(isProcessing || !driverDetails.firstName || !driverDetails.lastName || 
                                                !driverDetails.phoneNumber || !driverDetails.licenseNumber) ? 
                                                ['#9CA3AF', '#6B7280'] : ['#F59E0B', '#000000']}
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
                                            <Text style={cn('text-white font-bold')}>Submit</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                            </View>


                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* Extraction Loading Overlay */}
            {isExtracting && (
                <Modal
                    visible={isExtracting}
                    transparent={true}
                    animationType="fade"
                >
                    <View style={cn('flex-1 bg-black/80 items-center justify-center')}>
                        <View style={cn('bg-white rounded-lg p-8 items-center mx-8')}>
                            <ActivityIndicator size="large" color="#F59E0B" style={cn('mb-4')} />
                            <Text style={cn('text-lg font-bold text-gray-800 mb-2')}>
                                Processing Photo
                            </Text>
                            <Text style={cn('text-sm text-gray-600 text-center')}>
                                Extracting driver details from license...
                            </Text>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Error Modal - Consistent styling with Container Not Found */}
            <Modal
                visible={showErrorModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                {errorModalData.title}
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                {errorModalData.message}
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowErrorModal(false)}
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

export default StepNineDriverDetails;
