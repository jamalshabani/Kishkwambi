import React, { useState } from 'react';
import { TextInput, View, Text } from 'react-native';
import { cn } from '../../lib/tw';

const InputFieldWithNoLabel = ({ 
  placeholder, 
  value, 
  onChangeText, 
  secureTextEntry = false, 
  error, 
  className = "",
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={cn('w-full')}>
      <TextInput
        style={cn(`h-12 w-full rounded-md border px-4 py-2.5 pb-4 text-sm bg-transparent text-gray-800 border-gray-300 shadow-sm ${
          isFocused ? 'border-yellow-800 border-2' : ''
        } ${error ? 'border-red-500' : ''} ${className}`)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <Text style={cn('text-xs font-bold text-red-600 mt-1')}>
          {error}
        </Text>
      )}
    </View>
  );
};

export default InputFieldWithNoLabel;