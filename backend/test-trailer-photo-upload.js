// Test script for trailer photo upload to S3
// Run with: node test-trailer-photo-upload.js

const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testTrailerPhotoUpload() {
    try {
        console.log('🧪 Testing trailer photo upload to S3...');
        
        // Create a test image file (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync('test-trailer.png', testImageBuffer);
        
        const formData = new FormData();
        formData.append('photo', fs.createReadStream('test-trailer.png'), {
            filename: 'test-trailer.png',
            contentType: 'image/png'
        });
        formData.append('tripSegmentNumber', 'ST25-00001');
        formData.append('photoType', 'trailer');
        
        console.log('📤 Uploading trailer photo to S3...');
        
        const response = await fetch('http://localhost:3001/api/upload/s3-trailer-photo', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Trailer photo upload test successful!');
            console.log('📸 Trailer photo details:');
            console.log('  - S3 URL:', result.trailerPhoto);
            console.log('  - Trip Segment:', result.tripSegmentNumber);
            
            // Verify the structure
            if (result.trailerPhoto && result.trailerPhoto.includes('s3.eu-north-1.amazonaws.com')) {
                console.log('✅ S3 URL is valid!');
            } else {
                console.log('❌ S3 URL is invalid!');
            }
        } else {
            console.error('❌ Trailer photo upload test failed:', result.error);
        }
        
        // Clean up
        fs.unlinkSync('test-trailer.png');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testTrailerPhotoUpload();
