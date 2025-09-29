import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { cn } from '../lib/tw';

export default function RootLayout() {
  return (
    <View style={cn('flex-1 bg-[#BC8405]')}>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </View>
  );
}