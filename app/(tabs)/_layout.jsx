import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowBigRight, User } from 'lucide-react-native';
import Dashboard from './dashboard';
import Profile from './profile';
import StepOneContainerPhoto from './stepOneContainerPhoto';
import StepTwoContainerDetails from './stepTwoContainerDetails';
import StepOneDamagePhotos from './stepOneDamagePhotos';
import StepThreeTrailerPhoto from './stepThreeTrailerPhoto';
import StepFourRightSidePhoto from './stepFourRightSidePhoto';

export default function TabLayout() {
    const { isDark } = useTheme();
    const { isAuthenticated, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [containerData, setContainerData] = useState(null);
    const [damagePhotosData, setDamagePhotosData] = useState(null);
    const [trailerData, setTrailerData] = useState(null);
    const [rightSidePhotoData, setRightSidePhotoData] = useState(null);
    const [driverData, setDriverData] = useState(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated, loading]);

    // Show loading while checking authentication
    if (loading) {
        return null; // or a loading component
    }

    const switchTab = (tabKey) => {
        if (tabKey === activeTab) return;
        setActiveTab(tabKey);
    };

    const renderTabIcon = (icon, title, tabKey) => {
        const isActive = activeTab === tabKey || (tabKey === 'dashboard' && activeTab === 'stepOneContainerPhoto');

        return (
            <TouchableOpacity
                onPress={() => switchTab(tabKey)}
                style={cn('flex-1 items-center justify-center py-2')}
            >
                <View style={cn('items-center justify-center')}>
                    {isActive ? (
                        <LinearGradient
                            colors={['#000000', '#F59E0B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={cn('w-24 h-12 rounded-xl items-center justify-center')}
                        >
                            {icon}
                        </LinearGradient>
                    ) : (
                        <View style={cn('w-10 h-10 rounded-xl items-center justify-center')}>
                            {icon}
                        </View>
                    )}
                </View>
                <Text style={cn(`text-xs font-extrabold mt-1 ${isActive ? 'text-[#F59E0B]' : (isDark ? 'text-gray-400' : 'text-gray-600')}`)}>
                    {title}
                </Text>
            </TouchableOpacity>
        );
    };

    const navigateToStepOne = () => {
        setActiveTab('stepOneContainerPhoto');
    };

    const navigateBackToDashboard = () => {
        setActiveTab('dashboard');
        setContainerData(null);
    };

    const navigateToStepTwo = (data) => {
        setContainerData(data);
        setActiveTab('stepTwoContainerDetails');
    };

    const navigateBackToStepOne = () => {
        setActiveTab('stepOneContainerPhoto');
    };

    const navigateToStepThree = (data) => {
        setTrailerData(data);
        setActiveTab('stepThreeTrailerPhoto');
    };

    const navigateToDamagePhotos = (data) => {
        setDamagePhotosData(data);
        setActiveTab('stepOneDamagePhotos');
    };

    const navigateBackToStepTwo = () => {
        setActiveTab('stepTwoContainerDetails');
    };

    const navigateBackToDamagePhotos = () => {
        setActiveTab('stepOneDamagePhotos');
    };

    const navigateToStepFour = (data) => {
        setRightSidePhotoData(data);
        setActiveTab('stepFourRightSidePhoto');
    };

    const navigateBackToStepThree = () => {
        setActiveTab('stepThreeTrailerPhoto');
    };

    const navigateToStepFive = (data) => {
        // TODO: Add next screen later
        console.log('Navigate to step five:', data);
    };

    const navigateBackToStepFour = () => {
        setActiveTab('stepThreeTrailerPhoto');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard onTakePhoto={navigateToStepOne} />;
            case 'profile':
                return <Profile />;
            case 'stepOneContainerPhoto':
                return <StepOneContainerPhoto onBack={navigateBackToDashboard} onNavigateToStepTwo={navigateToStepTwo} />;
            case 'stepTwoContainerDetails':
                return <StepTwoContainerDetails onBack={navigateBackToStepOne} containerData={containerData} onNavigateToStepThree={navigateToStepThree} onNavigateToDamagePhotos={navigateToDamagePhotos} />;
            case 'stepOneDamagePhotos':
                return <StepOneDamagePhotos onBack={navigateBackToStepTwo} containerData={damagePhotosData} onNavigateToStepThree={navigateToStepThree} />;
            case 'stepThreeTrailerPhoto':
                return <StepThreeTrailerPhoto onBack={navigateBackToDamagePhotos} containerData={trailerData} onNavigateToStepFour={navigateToStepFour} />;
            case 'stepFourRightSidePhoto':
                return <StepFourRightSidePhoto onBack={navigateBackToStepThree} containerData={containerData} trailerData={trailerData} onNavigateToStepFive={navigateToStepFive} />;
            default:
                return <Dashboard onTakePhoto={navigateToStepOne} />;
        }
    };

    return (
        <View style={cn('flex-1')}>
            {/* Main Content */}
            <View style={cn('flex-1')}>
                {renderContent()}
            </View>

            {/* Tab Bar - Hidden for container photo, details, damage photos, trailer photo, and right side photo screens */}
            {activeTab !== 'stepOneContainerPhoto' && activeTab !== 'stepTwoContainerDetails' && activeTab !== 'stepOneDamagePhotos' && activeTab !== 'stepThreeTrailerPhoto' && activeTab !== 'stepFourRightSidePhoto' && (
                <View style={cn(`border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-lg`)}>
                    <View style={cn('flex-row h-24 px-5')}>
                        {renderTabIcon(
                            <ArrowBigRight 
                                size={24} 
                                color={(activeTab === 'dashboard' || activeTab === 'stepOneContainerPhoto') ? "#FFFFFF" : (isDark ? '#9CA3AF' : '#6B7280')}
                                strokeWidth={(activeTab === 'dashboard' || activeTab === 'stepOneContainerPhoto') ? 2.5 : 2}
                            />,
                            'Arrival Inspection',
                            'dashboard'
                        )}
                        {renderTabIcon(
                            <User 
                                size={24} 
                                color={activeTab === 'profile' ? "#FFFFFF" : (isDark ? '#9CA3AF' : '#6B7280')}
                                strokeWidth={activeTab === 'profile' ? 2.5 : 2}
                            />,
                            'Profile',
                            'profile'
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}
