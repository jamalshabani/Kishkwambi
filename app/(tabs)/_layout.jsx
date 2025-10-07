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
import StepFourDamagePhotos from './stepFourDamagePhotos';
import StepFiveBackWallPhoto from './stepFiveBackWallPhoto';
import StepFiveDamagePhotos from './stepFiveDamagePhotos';
import StepSixTruckPhoto from './stepSixTruckPhoto';
import StepSevenLeftSidePhoto from './stepSevenLeftSidePhoto';
import StepSevenDamagePhotos from './stepSevenDamagePhotos';
import StepEightInsidePhoto from './stepEightInsidePhoto';
import StepEightDamagePhotos from './stepEightDamagePhotos';
import StepEightHalfInspectionRemarks from './stepEightHalfInspectionRemarks';
import StepNineDriverDetails from './stepNineDriverDetails';
import InspectionSuccess from './inspectionSuccess';

export default function TabLayout() {
    const { isDark } = useTheme();
    const { isAuthenticated, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [containerData, setContainerData] = useState(null);
    const [damagePhotosData, setDamagePhotosData] = useState(null);
    const [trailerData, setTrailerData] = useState(null);
    const [rightSidePhotoData, setRightSidePhotoData] = useState(null);
    const [rightSideDamagePhotosData, setRightSideDamagePhotosData] = useState(null);
    const [frontWallDamagePhotosData, setFrontWallDamagePhotosData] = useState(null);
    const [frontWallPhotoData, setFrontWallPhotoData] = useState(null);
    const [truckPhotoData, setTruckPhotoData] = useState(null);
    const [leftSidePhotoData, setLeftSidePhotoData] = useState(null);
    const [leftSideDamagePhotosData, setLeftSideDamagePhotosData] = useState(null);
    const [insidePhotoData, setInsidePhotoData] = useState(null);
    const [insideDamagePhotosData, setInsideDamagePhotosData] = useState(null);
    const [inspectionRemarksData, setInspectionRemarksData] = useState(null);
    const [driverData, setDriverData] = useState(null);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [inspectionData, setInspectionData] = useState(null);

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

    const navigateBackToDashboardFromStepOne = () => {
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

    const navigateToStepFourDamagePhotos = (data) => {
        setRightSideDamagePhotosData(data);
        setActiveTab('stepFourDamagePhotos');
    };

    const navigateToStepFiveDamagePhotos = (data) => {
        setFrontWallDamagePhotosData(data);
        setActiveTab('stepFiveDamagePhotos');
    };

    const navigateBackToStepThree = () => {
        setActiveTab('stepThreeTrailerPhoto');
    };

    const navigateBackToStepFour = () => {
        setActiveTab('stepFourRightSidePhoto');
    };

    const navigateToStepFive = (data) => {
        setFrontWallPhotoData(data);
        setActiveTab('stepFiveBackWallPhoto');
    };

    const navigateToStepSix = (data) => {
        setTruckPhotoData(data);
        setActiveTab('stepSixTruckPhoto');
    };

    const navigateBackToStepFive = () => {
        setActiveTab('stepFiveBackWallPhoto');
    };

    const navigateToStepSeven = (data) => {
        setLeftSidePhotoData(data);
        setActiveTab('stepSevenLeftSidePhoto');
    };

    const navigateToStepSevenDamagePhotos = (data) => {
        setLeftSideDamagePhotosData(data);
        setActiveTab('stepSevenDamagePhotos');
    };

    const navigateBackToStepSix = () => {
        setActiveTab('stepSixTruckPhoto');
    };

    const navigateToStepEight = (data) => {
        setInsidePhotoData(data);
        setActiveTab('stepEightInsidePhoto');
    };

    const navigateBackToStepSeven = () => {
        setActiveTab('stepSevenLeftSidePhoto');
    };

    const navigateToStepEightDamagePhotos = (data) => {
        setInsideDamagePhotosData(data);
        setActiveTab('stepEightDamagePhotos');
    };

    const navigateToInspectionRemarks = (data) => {
        setInspectionRemarksData(data);
        setActiveTab('stepEightHalfInspectionRemarks');
    };

    const navigateToStepNine = (data) => {
        setDriverData(data);
        setActiveTab('stepNineDriverDetails');
    };

    const navigateBackToStepEight = () => {
        setActiveTab('stepEightInsidePhoto');
    };

    const navigateBackToInspectionRemarks = () => {
        setActiveTab('stepEightHalfInspectionRemarks');
    };

    const navigateToComplete = (data) => {
        // Handle completion - could show summary or redirect to dashboard
        setActiveTab('dashboard');
        // Reset all data
        setContainerData(null);
        setDamagePhotosData(null);
        setTrailerData(null);
        setRightSidePhotoData(null);
        setRightSideDamagePhotosData(null);
        setFrontWallDamagePhotosData(null);
        setFrontWallPhotoData(null);
        setTruckPhotoData(null);
        setLeftSidePhotoData(null);
        setLeftSideDamagePhotosData(null);
        setInsidePhotoData(null);
        setInsideDamagePhotosData(null);
        setInspectionRemarksData(null);
        setDriverData(null);
    };

    const navigateToSuccess = (data) => {
        setInspectionData(data);
        setShowSuccessScreen(true);
    };

    const navigateBackToDashboard = () => {
        setShowSuccessScreen(false);
        setInspectionData(null);
        setActiveTab('dashboard');
        // Reset all data
        setContainerData(null);
        setDamagePhotosData(null);
        setTrailerData(null);
        setRightSidePhotoData(null);
        setRightSideDamagePhotosData(null);
        setFrontWallDamagePhotosData(null);
        setFrontWallPhotoData(null);
        setTruckPhotoData(null);
        setLeftSidePhotoData(null);
        setLeftSideDamagePhotosData(null);
        setInsidePhotoData(null);
        setInsideDamagePhotosData(null);
        setInspectionRemarksData(null);
        setDriverData(null);
    };

    const renderContent = () => {
        // Show success screen if active
        if (showSuccessScreen) {
            return <InspectionSuccess onBackToDashboard={navigateBackToDashboard} inspectionData={inspectionData} />;
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard onTakePhoto={navigateToStepOne} onGoToStepOne={navigateToStepOne} />;
            case 'profile':
                return <Profile />;
            case 'stepOneContainerPhoto':
                return <StepOneContainerPhoto onBack={navigateBackToDashboardFromStepOne} onNavigateToStepTwo={navigateToStepTwo} onNavigateToDamagePhotos={navigateToDamagePhotos} />;
            case 'stepTwoContainerDetails':
                return <StepTwoContainerDetails onBack={navigateBackToStepOne} containerData={containerData} onNavigateToStepThree={navigateToStepThree} onNavigateToDamagePhotos={navigateToDamagePhotos} onNavigateToStepThreeDirect={navigateToStepThree} />;
            case 'stepOneDamagePhotos':
                return <StepOneDamagePhotos onBack={navigateBackToStepTwo} containerData={damagePhotosData} onNavigateToStepThree={navigateToStepThree} onNavigateToStepTwo={navigateToStepTwo} />;
            case 'stepThreeTrailerPhoto':
                return <StepThreeTrailerPhoto onBack={navigateBackToDamagePhotos} containerData={trailerData} onNavigateToStepFour={navigateToStepFour} onNavigateToStepFourDirect={navigateToStepFour} />;
            case 'stepFourRightSidePhoto':
                return <StepFourRightSidePhoto onBack={navigateBackToStepThree} containerData={containerData} trailerData={trailerData} onNavigateToStepFive={navigateToStepFive} onNavigateToDamagePhotos={navigateToStepFourDamagePhotos} onNavigateToDamagePhotosDirect={navigateToStepFourDamagePhotos} />;
            case 'stepFourDamagePhotos':
                return <StepFourDamagePhotos onBack={navigateBackToStepFour} containerData={rightSideDamagePhotosData} onNavigateToStepFive={navigateToStepFive} onNavigateToStepFiveDirect={navigateToStepFive} />;
            case 'stepFiveDamagePhotos':
                return <StepFiveDamagePhotos onBack={navigateBackToStepFive} containerData={frontWallDamagePhotosData} onNavigateToStepSix={navigateToStepSix} onNavigateToStepSixDirect={navigateToStepSix} />;
            case 'stepFiveBackWallPhoto':
                return <StepFiveBackWallPhoto onBack={navigateBackToStepFour} containerData={frontWallPhotoData} onNavigateToStepSix={navigateToStepSix} onNavigateToDamagePhotos={navigateToStepFiveDamagePhotos} onNavigateToDamagePhotosDirect={navigateToStepFiveDamagePhotos} />;
            case 'stepSixTruckPhoto':
                return <StepSixTruckPhoto onBack={navigateBackToStepFive} containerData={truckPhotoData} onNavigateToStepSeven={navigateToStepSeven} onNavigateToStepSevenDirect={navigateToStepSeven} />;
            case 'stepSevenLeftSidePhoto':
                return <StepSevenLeftSidePhoto onBack={navigateBackToStepSix} containerData={leftSidePhotoData} truckData={truckPhotoData} onNavigateToStepEight={navigateToStepEight} onNavigateToDamagePhotos={navigateToStepSevenDamagePhotos} onNavigateToDamagePhotosDirect={navigateToStepSevenDamagePhotos} />;
            case 'stepSevenDamagePhotos':
                return <StepSevenDamagePhotos onBack={navigateBackToStepSeven} containerData={leftSideDamagePhotosData} onNavigateToStepEight={navigateToStepEight} onNavigateToStepEightDirect={navigateToStepEight} />;
            case 'stepEightInsidePhoto':
                return <StepEightInsidePhoto onBack={navigateBackToStepSeven} containerData={insidePhotoData} onNavigateToStepNine={navigateToStepNine} onNavigateToDamagePhotos={navigateToStepEightDamagePhotos} onNavigateToInspectionRemarks={navigateToInspectionRemarks} onNavigateToDamagePhotosDirect={navigateToStepEightDamagePhotos} />;
            case 'stepEightDamagePhotos':
                return <StepEightDamagePhotos onBack={navigateBackToStepEight} containerData={insideDamagePhotosData} onNavigateToStepNine={navigateToStepNine} onNavigateToInspectionRemarks={navigateToInspectionRemarks} onNavigateToStepNineDirect={navigateToStepNine} />;
            case 'stepEightHalfInspectionRemarks':
                return <StepEightHalfInspectionRemarks onBack={navigateBackToStepEight} containerData={inspectionRemarksData} onNavigateToStepNine={navigateToStepNine} />;
            case 'stepNineDriverDetails':
                return <StepNineDriverDetails onBack={navigateBackToInspectionRemarks} containerData={driverData} onComplete={navigateToComplete} onShowSuccess={navigateToSuccess} />;
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

            {/* Tab Bar - Hidden for all step screens and success screen */}
            {!activeTab.startsWith('step') && !showSuccessScreen && (
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
