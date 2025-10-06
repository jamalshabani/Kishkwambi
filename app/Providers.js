import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { InspectionTimerProvider } from '../contexts/InspectionTimerContext';

export default function Providers({ children }) {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <InspectionTimerProvider>
                        {children}
                    </InspectionTimerProvider>
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
