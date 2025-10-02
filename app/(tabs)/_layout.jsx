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
import StepThreeTrailerPhoto from './stepThreeTrailerPhoto';

export default function TabLayout() {
    const { isDark } = useTheme();
    const { isAuthenticated, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [containerData, setContainerData] = useState(null);
    const [trailerData, setTrailerData] = useState(null);
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
        const color = isActive ? '#F59E0B' : (isDark ? '#9CA3AF' : '#6B7280');

        return (
            <TouchableOpacity
                onPress={() => switchTab(tabKey)}
                style={cn('flex-1 items-center justify-center py-2')}
            >
                <View style={cn('items-center justify-center')}>
                    {isActive ? (
                        <LinearGradient
                            colors={['#F59E0B', '#92400E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={cn('w-10 h-10 rounded-xl items-center justify-center')}
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

    const navigateBackToStepTwo = () => {
        setActiveTab('stepTwoContainerDetails');
    };

    const navigateToStepFour = (data) => {
        // TODO: Add driver details screen later
        console.log('Navigate to driver details:', data);
    };

    const navigateBackToStepThree = () => {
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
                return <StepTwoContainerDetails onBack={navigateBackToStepOne} containerData={containerData} onNavigateToStepThree={navigateToStepThree} />;
            case 'stepThreeTrailerPhoto':
                return <StepThreeTrailerPhoto onBack={navigateBackToStepTwo} containerData={trailerData} onNavigateToStepFour={navigateToStepFour} />;
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

            {/* Tab Bar - Hidden for container photo, details, and trailer photo screens */}
            {activeTab !== 'stepOneContainerPhoto' && activeTab !== 'stepTwoContainerDetails' && activeTab !== 'stepThreeTrailerPhoto' && (
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
