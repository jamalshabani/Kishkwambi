import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';
import { useTheme } from '../../contexts/ThemeContext';
import { ClipboardList, User } from 'lucide-react-native';

export default function TabLayout() {
    const { isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderTopColor: isDark ? '#374151' : '#E5E7EB',
                    borderTopWidth: 1,
                    height: 100,
                    paddingBottom: 16,
                    paddingTop: 16,
                    paddingHorizontal: 20,
                    shadowColor: isDark ? '#000000' : '#000000',
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 4,
                    elevation: 8,
                },
                tabBarActiveTintColor: '#F59E0B',
                tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
                tabBarLabelStyle: {
                    fontSize: 13,
                    fontWeight: '700',
                    marginTop: 6,
                },
                tabBarIconStyle: {
                    marginTop: 2,
                    marginBottom: 2,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Arrival Inspection',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={cn('items-center justify-center')}>
                            {focused ? (
                                <LinearGradient
                                    colors={['#F59E0B', '#92400E']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('w-10 h-10 rounded-xl items-center justify-center')}
                                >
                                    <ClipboardList 
                                        size={24} 
                                        color="#FFFFFF"
                                        strokeWidth={2.5}
                                    />
                                </LinearGradient>
                            ) : (
                                <View style={cn('w-10 h-10 rounded-xl items-center justify-center')}>
                                    <ClipboardList 
                                        size={24} 
                                        color={color}
                                        strokeWidth={2}
                                    />
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={cn('items-center justify-center')}>
                            {focused ? (
                                <LinearGradient
                                    colors={['#F59E0B', '#92400E']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={cn('w-10 h-10 rounded-xl items-center justify-center')}
                                >
                                    <User 
                                        size={24} 
                                        color="#FFFFFF"
                                        strokeWidth={2.5}
                                    />
                                </LinearGradient>
                            ) : (
                                <View style={cn('w-10 h-10 rounded-xl items-center justify-center')}>
                                    <User 
                                        size={24} 
                                        color={color}
                                        strokeWidth={2}
                                    />
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
