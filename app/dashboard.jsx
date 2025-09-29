import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { cn } from '../lib/tw';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const { user, isAuthenticated, loading, signOut } = useAuth();

    React.useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/');
        }
    }, [isAuthenticated, loading]);

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
        <ScrollView style={cn('flex-1 bg-gray-100')}>
            <View style={cn('p-6')}>
                <Text style={cn('text-2xl font-bold text-gray-800 mb-6')}>
                    Welcome to Dashboard
                </Text>
                
                <View style={cn('bg-white rounded-lg p-6 mb-6')}>
                    <Text style={cn('text-lg font-semibold text-gray-700 mb-4')}>
                        User Information
                    </Text>
                    
                    <View>
                        <View style={cn('mb-2')}>
                            <Text style={cn('text-sm text-gray-600')}>
                                <Text style={cn('font-semibold')}>Name:</Text> {user.name}
                            </Text>
                        </View>
                        <View style={cn('mb-2')}>
                            <Text style={cn('text-sm text-gray-600')}>
                                <Text style={cn('font-semibold')}>Email:</Text> {user.email}
                            </Text>
                        </View>
                        <View style={cn('mb-2')}>
                            <Text style={cn('text-sm text-gray-600')}>
                                <Text style={cn('font-semibold')}>Role:</Text> {user.role}
                            </Text>
                        </View>
                        {user.phone && (
                            <View style={cn('mb-2')}>
                                <Text style={cn('text-sm text-gray-600')}>
                                    <Text style={cn('font-semibold')}>Phone:</Text> {user.phone}
                                </Text>
                            </View>
                        )}
                        {user.permissions && user.permissions.length > 0 && (
                            <View style={cn('mb-2')}>
                                <Text style={cn('text-sm text-gray-600')}>
                                    <Text style={cn('font-semibold')}>Permissions:</Text> {user.permissions.join(', ')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <Button
                    onPress={signOut}
                    variant="outline"
                    className="w-full"
                >
                    Sign Out
                </Button>
            </View>
        </ScrollView>
    );
};

export default Dashboard;
