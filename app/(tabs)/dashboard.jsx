import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useInspectionTimer } from '../../contexts/InspectionTimerContext';
import { Sun, Moon, Check, CircleCheck, Zap, Clock, X, Eye } from 'lucide-react-native';

const Dashboard = ({ onTakePhoto, onGoToStepOne, depotAllocationPhoto, onRemoveDepotPhoto, interchangeDocumentPhoto, onRemoveInterchangePhoto, tripSegmentNumber }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const { isRunning, formattedTime, startTimer } = useInspectionTimer();
    const [containerNumber, setContainerNumber] = useState('');
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [showInterchangeZoomModal, setShowInterchangeZoomModal] = useState(false);
    const [showDocumentPhotosModal, setShowDocumentPhotosModal] = useState(false);

    // Animation values
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

    const handleStartInspection = () => {
        // Validate that both document photos are taken
        if (!depotAllocationPhoto || !interchangeDocumentPhoto) {
            setShowDocumentPhotosModal(true);
            return;
        }
        
        // Start the timer
        startTimer();
        
        // Call the original onTakePhoto function
        onTakePhoto();
    };




    if (loading) {
        return (
            <View style={cn('flex-1 justify-center items-center bg-gray-100')}>
                <Text style={cn('text-lg text-gray-600')}>Loading...</Text>
            </View>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (!user) {
        return (
            <View style={cn('flex-1 justify-center items-center bg-gray-100')}>
                <Text style={cn('text-lg text-gray-600')}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}>
            <StatusBar style={isDark ? "light" : "dark"} />
            {/* Header */}
            <View style={cn(`${isDark ? 'bg-gray-900' : 'bg-white/10'} px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-300'} flex-row items-center justify-between shadow-sm`)}>
                {/* Title */}
                <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`)}>
                    Arrival Inspection
                </Text>

                {/* Timer Display and Navigation Buttons */}
                <View style={cn('flex-row items-center')}>
                    {/* Timer Display */}
                    {isRunning && (
                        <View style={cn('flex-row items-center mr-4')}>
                            <Clock size={20} color={isDark ? "#10b981" : "#059669"} />
                            <Text style={cn(`text-lg font-bold ml-2 ${isDark ? 'text-green-400' : 'text-green-600'}`)}>
                                {formattedTime}
                            </Text>
                        </View>
                    )}


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
            </View>
            
            {/* Main Content */}
            <ScrollView 
                style={cn(`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`)}
                contentContainerStyle={cn('pb-6')}
                showsVerticalScrollIndicator={false}
            >
                <View style={cn('px-6 mt-10')}>
                   
                    {/* Main Card */}
                    <View style={cn(`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`)}>
                        {/* Pre-Arrival Checklist */}
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                            Pre-Arrival Checklist
                        </Text>

                        {/* Checklist Items */}
                        <View style={cn('mb-6')}>
                            {/* Item 1 */}
                            <View style={cn(`${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 flex-row items-center mb-3`)}>
                                <View style={cn('w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3')}>
                                    <Check size={16} color="white" />
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    Verify the <Text style={cn('font-bold')}>Expiration Date</Text> and <Text style={cn('font-bold')}>Correctness</Text> of the <Text style={cn('font-bold')}>Depot Allocation</Text>.
                                </Text>
                            </View>

                            {/* Take photo of Depot Allocation */}
                            <TouchableOpacity 
                                style={cn('w-full rounded-lg overflow-hidden mb-4')}
                                onPress={() => onTakePhoto && onTakePhoto('depot-allocation')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B','#000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('p-4 items-center')}
                                >
                                    <Text style={cn('text-white font-bold text-lg')}>
                                        Take Photo of Depot Allocation
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Item 2 */}
                            <View style={cn(`${isDark ? 'bg-green-900/30 border-purple-700' : 'bg-green-50 border-purple-200'} border rounded-lg p-4 flex-row items-center`)}>
                                <View style={cn('w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3')}>
                                    <Check size={16} color="white" />
                                </View>
                                <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                    Check the <Text style={cn('font-bold')}>Interchange Document</Text> for existing damages.
                                </Text>
                            </View>
                        </View>

                        {/* Take Interchange Document Photo */}
                        <TouchableOpacity 
                            style={cn('w-full rounded-lg overflow-hidden mb-4')}
                            onPress={() => onTakePhoto && onTakePhoto('interchange-document')}
                        >
                            <LinearGradient
                                colors={['#000000','#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <Text style={cn('text-white font-bold text-lg')}>
                                    Take Photo of Interchange Document
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Photo Previews - Side by Side */}
                        {(depotAllocationPhoto || interchangeDocumentPhoto) && (
                            <View style={cn(`mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`)}>
                                <Text style={cn(`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`)}>
                                    Document Photos
                                </Text>
                                
                                <View style={cn('flex-row')}>
                                    {/* Depot Allocation Photo */}
                                    {depotAllocationPhoto && (
                                        <View style={cn('flex-1 pr-1')}>
                                            <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                Depot Allocation
                                            </Text>
                                            <View style={cn('relative')}>
                                                <Image 
                                                    source={{ uri: depotAllocationPhoto }} 
                                                    style={cn('w-full h-32 rounded-lg')} 
                                                    resizeMode="cover"
                                                />
                                                {/* Eye Icon Overlay */}
                                                <TouchableOpacity
                                                    onPress={() => setShowZoomModal(true)}
                                                    style={cn('absolute inset-0 items-center justify-center')}
                                                >
                                                    <View style={cn('bg-black/50 rounded-full p-2')}>
                                                        <Eye size={20} color="white" />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                    
                                    {/* Interchange Document Photo */}
                                    {interchangeDocumentPhoto && (
                                        <View style={cn('flex-1 pl-1')}>
                                            <Text style={cn(`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`)}>
                                                Interchange Document
                                            </Text>
                                            <View style={cn('relative')}>
                                                <Image 
                                                    source={{ uri: interchangeDocumentPhoto }} 
                                                    style={cn('w-full h-32 rounded-lg')} 
                                                    resizeMode="cover"
                                                />
                                                {/* Eye Icon Overlay */}
                                                <TouchableOpacity
                                                    onPress={() => setShowInterchangeZoomModal(true)}
                                                    style={cn('absolute inset-0 items-center justify-center')}
                                                >
                                                    <View style={cn('bg-black/50 rounded-full p-2')}>
                                                        <Eye size={20} color="white" />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Add ready to start inspection item here */}
                        
                        {/* Item 3 */}
                        <View style={cn(`${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 flex-row items-center mb-6`)}>
                            <View style={cn('w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3')}>
                                <Zap size={16} color="white" />
                            </View>
                            <Text style={cn(`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} flex-1`)}>
                                Ready to <Text style={cn('font-bold')}>Start Inspection?</Text> Click the button below to start.
                            </Text>
                        </View>

                        {/* Container Check */}
                        <Text style={cn(`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} mb-4`)}>
                            Start Arrival Inspection
                        </Text>

                        {/* Check Button */}
                        <TouchableOpacity
                            onPress={handleStartInspection}
                            disabled={isRunning}
                            style={cn(`w-full rounded-lg overflow-hidden ${isRunning ? 'opacity-50' : ''}`)}
                        >
                            <LinearGradient
                                colors={isRunning ? ['#6B7280', '#4B5563'] : ['#000000', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={cn('p-4 items-center')}
                            >
                                <Text style={cn('text-white font-bold text-lg')}>
                                    {isRunning ? `Inspection Running... ${formattedTime}` : 'Start Arrival Inspection'}
                                </Text>
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
                        style={cn('absolute top-12 right-6 z-10')}
                    >
                        <X size={32} color="white" />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: depotAllocationPhoto }} 
                        style={cn('w-full h-full')} 
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* Interchange Document Zoom Modal */}
            <Modal
                visible={showInterchangeZoomModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowInterchangeZoomModal(false)}
            >
                <View style={cn('flex-1 bg-black items-center justify-center')}>
                    <TouchableOpacity
                        onPress={() => setShowInterchangeZoomModal(false)}
                        style={cn('absolute top-12 right-6 z-10')}
                    >
                        <X size={32} color="white" />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: interchangeDocumentPhoto }} 
                        style={cn('w-full h-full')} 
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* Document Photos Required Modal */}
            <Modal
                visible={showDocumentPhotosModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDocumentPhotosModal(false)}
            >
                <View style={cn('flex-1 justify-center items-center bg-black/50')}>
                    <View style={cn('bg-white rounded-3xl mx-8 p-6')}>
                        
                        {/* Message Text */}
                        <View style={cn('mt-4 mb-6')}>
                            <Text style={cn('text-red-500 text-center text-lg font-semibold leading-6')}>
                                Document Photos Required
                            </Text>
                            <Text style={cn('text-gray-600 font-bold text-center text-sm mt-2')}>
                                Please take photos of both Depot Allocation and Interchange Document before starting the inspection.
                            </Text>
                        </View>
                        
                        {/* OK Button */}
                        <TouchableOpacity
                            onPress={() => setShowDocumentPhotosModal(false)}
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

export default Dashboard;
