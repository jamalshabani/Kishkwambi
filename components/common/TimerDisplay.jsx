import React from 'react';
import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useInspectionTimer } from '../../contexts/InspectionTimerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/tw';

const TimerDisplay = () => {
    const { isRunning, formattedTime } = useInspectionTimer();
    const { isDark } = useTheme();

    if (!isRunning) {
        return null;
    }

    return (
        <View style={cn('flex-row items-center')}>
            <Clock size={20} color={isDark ? "#10b981" : "#059669"} />
            <Text style={cn(`text-lg font-bold ml-2 ${isDark ? 'text-green-400' : 'text-green-600'}`)}>
                {formattedTime}
            </Text>
        </View>
    );
};

export default TimerDisplay;
