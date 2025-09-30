import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { cn } from '../lib/tw';
import Providers from './Providers';

export default function RootLayout() {
    return (
        <Providers>
            <View style={cn('flex-1 bg-[#BC8405]')}>
                <Stack>
                    <Stack.Screen 
                        name="index" 
                        options={{ 
                            headerShown: false,
                        }} 
                    />
                    <Stack.Screen 
                        name="forgot-password" 
                        options={{ 
                            headerShown: false,
                        }} 
                    />
                    <Stack.Screen 
                        name="(tabs)" 
                        options={{ 
                            headerShown: false,
                        }} 
                    />
                </Stack>
                <StatusBar style="light" backgroundColor="#FFFFFF" />
            </View>
        </Providers>
    );
}