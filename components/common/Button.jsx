import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/tw';

const Button = ({ 
  children, 
  onPress, 
  disabled = false, 
  size = "md", 
  variant = "primary",
  className = "",
  ...props 
}) => {
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-6 py-4 text-base",
    lg: "px-8 py-5 text-lg",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={cn(`rounded-lg overflow-hidden ${className}`)}
        {...props}
      >
        <LinearGradient
          colors={['#F59E0B', '#000000']} // from-yellow-500 to-black
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cn(`${sizeClasses[size]} items-center justify-center ${disabled ? 'opacity-50' : ''}`)}
        >
          <Text style={cn(`text-white font-semibold ${textSizeClasses[size]}`)}>
            {children}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === "outline") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={cn(`${sizeClasses[size]} bg-white border border-gray-300 rounded-lg items-center justify-center ${disabled ? 'opacity-50' : ''} ${className}`)}
        {...props}
      >
        <Text style={cn(`text-gray-700 font-medium ${textSizeClasses[size]}`)}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
};

export default Button;