import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const InspectionTimerContext = createContext();

export const useInspectionTimer = () => {
    const context = useContext(InspectionTimerContext);
    if (!context) {
        throw new Error('useInspectionTimer must be used within an InspectionTimerProvider');
    }
    return context;
};

export const InspectionTimerProvider = ({ children }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
    const [startTime, setStartTime] = useState(null);
    const intervalRef = useRef(null);

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Start the timer
    const startTimer = () => {
        if (!isRunning) {
            const now = Date.now();
            setStartTime(now);
            setIsRunning(true);
            setTimeElapsed(0);
            
            intervalRef.current = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
            
            console.log('⏱️ Inspection timer started');
        }
    };

    // Stop the timer
    const stopTimer = () => {
        if (isRunning) {
            setIsRunning(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            
            const finalTime = formatTime(timeElapsed);
            console.log('⏱️ Inspection timer stopped. Total time:', finalTime);
            return finalTime;
        }
        return formatTime(timeElapsed);
    };

    // Reset the timer
    const resetTimer = () => {
        setIsRunning(false);
        setTimeElapsed(0);
        setStartTime(null);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        console.log('⏱️ Inspection timer reset');
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const value = {
        isRunning,
        timeElapsed,
        formattedTime: formatTime(timeElapsed),
        startTimer,
        stopTimer,
        resetTimer,
        startTime
    };

    return (
        <InspectionTimerContext.Provider value={value}>
            {children}
        </InspectionTimerContext.Provider>
    );
};
