import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get a unique device identifier that persists across app sessions
 * but is reset when the app is uninstalled
 * @returns {Promise<string>} A unique device identifier
 */
export async function getDeviceId() {
    try {
        // Check if we already have a stored device ID
        let deviceId = await AsyncStorage.getItem('DEVICE_ID');
        
        if (deviceId) {
            return deviceId;
        }

        // Try to get expo-application's installation ID (most reliable)
        if (Application && Application.getInstallationIdAsync) {
            const installationId = await Application.getInstallationIdAsync();
            if (installationId) {
                // Store it for future use
                await AsyncStorage.setItem('DEVICE_ID', installationId);
                return installationId;
            }
        }
    } catch (error) {
        // Silently handle error - will use fallback
    }
    
    // Fallback: Generate and store our own UUID
    let deviceId = await AsyncStorage.getItem('DEVICE_ID');
    
    if (!deviceId) {
        // Generate a UUID v4
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        
        await AsyncStorage.setItem('DEVICE_ID', deviceId);
    }
    
    return deviceId;
}

/**
 * Get device name for display purposes
 * @returns {Promise<string>} Device name or 'Unknown Device'
 */
export async function getDeviceName() {
    try {
        const deviceName = await Application.getDeviceNameAsync();
        return deviceName || 'Unknown Device';
    } catch (error) {
        return 'Unknown Device';
    }
}

/**
 * Clear device-specific data (useful for testing or logout)
 */
export async function clearDeviceData() {
    try {
        await AsyncStorage.removeItem('DEVICE_ID');
        await AsyncStorage.removeItem('PIN_ENABLED');
    } catch (error) {
        console.error('Error clearing device data:', error);
    }
}

