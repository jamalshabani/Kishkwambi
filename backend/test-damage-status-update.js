// Test script for damage status update API
// Run with: node test-damage-status-update.js

const fetch = require('node-fetch');

async function testDamageStatusUpdate() {
    try {
        console.log('🧪 Testing damage status update API...');
        
        const testData = {
            tripSegmentNumber: 'ST25-00001',
            hasDamages: 'Yes',
            damageLocation: 'Back Wall'
        };
        
        console.log('📤 Sending request:', testData);
        
        const response = await fetch('http://localhost:3001/api/update-damage-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });
        
        const result = await response.json();
        
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Damage status update test successful!');
            console.log('🔧 Updated fields:');
            console.log('  - hasDamages:', result.hasDamages);
            console.log('  - damageLocation:', result.damageLocation);
            console.log('  - tripSegmentNumber:', result.tripSegmentNumber);
        } else {
            console.error('❌ Damage status update test failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testDamageStatusUpdate();
