// Test with a real image file
require('dotenv').config();
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testRealImageUpload() {
    try {
        console.log('🧪 Testing with a real image file...');
        
        // Create a larger test image (1x1 pixel PNG with more data)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync('test-real-image.png', testImageBuffer);
        
        console.log('📸 Test image size:', testImageBuffer.length, 'bytes');
        
        const formData = new FormData();
        formData.append('photos', fs.createReadStream('test-real-image.png'), {
            filename: 'test-real-image.png',
            contentType: 'image/png'
        });
        formData.append('tripSegmentNumber', 'ST25-00002');
        formData.append('containerNumber', 'BSIU2253788');
        formData.append('photoType', 'container');
        formData.append('containerPhotoLocation', 'Container Back Wall');
        
        console.log('📤 Uploading to S3...');
        
        const response = await fetch('http://localhost:3001/api/upload/s3-container-photos', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Upload successful!');
            console.log('🌐 Image URL:', result.containerPhotos[0].containerPhotoPath);
            console.log('📏 File size:', result.containerPhotos[0].containerPhotoSize, 'bytes');
            
            // Test if the image is accessible
            console.log('🔍 Testing image accessibility...');
            const imageResponse = await fetch(result.containerPhotos[0].containerPhotoPath);
            if (imageResponse.ok) {
                console.log('✅ Image is accessible in browser!');
                console.log('📊 Response headers:', Object.fromEntries(imageResponse.headers.entries()));
            } else {
                console.log('❌ Image not accessible:', imageResponse.status);
            }
        } else {
            console.error('❌ Upload failed:', result.error);
        }
        
        // Clean up
        fs.unlinkSync('test-real-image.png');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testRealImageUpload();
