import React from 'react';
import { View, Dimensions } from 'react-native';
import { cn } from '../../lib/tw';

const GridShape = () => {
  const { width, height } = Dimensions.get('window');
  const gridSize = 60; // Size of each grid cell - increased for more prominent grid
  const gridOpacity = 0.2; // More visible grid lines
  
  const GridPattern = () => {
    const lines = [];
    const darkSquares = [];
    
    // Create horizontal lines
    for (let i = 0; i <= Math.ceil(height / gridSize); i++) {
      lines.push(
        <View
          key={`h-${i}`}
          style={[
            cn('absolute bg-white'),
            {
              top: i * gridSize,
              left: 0,
              right: 0,
              height: 0.5,
              opacity: gridOpacity,
            }
          ]}
        />
      );
    }
    
    // Create vertical lines
    for (let i = 0; i <= Math.ceil(width / gridSize); i++) {
      lines.push(
        <View
          key={`v-${i}`}
          style={[
            cn('absolute bg-white'),
            {
              left: i * gridSize,
              top: 0,
              bottom: 0,
              width: 0.5,
              opacity: gridOpacity,
            }
          ]}
        />
      );
    }
    
    // Create scattered dark squares (like in the Simba image)
    const darkSquarePositions = [
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 5, y: 1 },
      { x: 7, y: 3 },
      { x: 9, y: 1 },
      { x: 2, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 4 },
      { x: 8, y: 6 },
      { x: 1, y: 7 },
      { x: 3, y: 8 },
      { x: 5, y: 7 },
      { x: 7, y: 9 },
      { x: 2, y: 10 },
      { x: 4, y: 11 },
      { x: 6, y: 10 },
    ];
    
    darkSquarePositions.forEach((pos, index) => {
      darkSquares.push(
        <View
          key={`square-${index}`}
          style={[
            cn('absolute bg-black'),
            {
              left: pos.x * gridSize,
              top: pos.y * gridSize,
              width: gridSize,
              height: gridSize,
              opacity: 0.3,
            }
          ]}
        />
      );
    });
    
    return [...lines, ...darkSquares];
  };

  return (
    <View style={cn('absolute inset-0')}>
      <GridPattern />
    </View>
  );
};

export default GridShape;