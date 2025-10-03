// Test script for S3 photo uploads
// Run with: node test-s3-damage-upload.js

const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testS3DamageUpload() {
    try {
        console.log('🧪 Testing S3 damage photo upload...');
        
        // Create a test image file (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync('test-damage.png', testImageBuffer);
        
        const formData = new FormData();
        formData.append('photos', fs.createReadStream('test-damage.png'), {
            filename: 'test-damage.png',
            contentType: 'image/png'
        });
        formData.append('tripSegmentNumber', 'ST25-00001');
        formData.append('containerNumber', 'BSIU2253788');
        formData.append('damageLocation', 'Container Door');
        
        const response = await fetch('http://localhost:3001/api/upload/s3-damage-photos', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        console.log('📊 Damage Photos Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Damage photos test successful!');
            console.log('📸 Damage photos structure:');
            result.damagePhotos.forEach((photo, index) => {
                console.log(`  Photo ${index + 1}:`, {
                    damageLocation: photo.damageLocation,
                    damagePhotoPath: photo.damagePhotoPath,
                    damagePhotoSize: photo.damagePhotoSize
                });
            });
        } else {
            console.error('❌ Damage photos test failed:', result.error);
        }
        
        // Clean up
        fs.unlinkSync('test-damage.png');
        
    } catch (error) {
        console.error('❌ Damage photos test error:', error);
    }
}

async function testS3ContainerUpload() {
    try {
        console.log('\n🧪 Testing S3 container photo upload...');
        
        // Create a test image file (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync('test-container.png', testImageBuffer);
        
        const formData = new FormData();
        formData.append('photos', fs.createReadStream('test-container.png'), {
            filename: 'test-container.png',
            contentType: 'image/png'
        });
        formData.append('tripSegmentNumber', 'ST25-00001');
        formData.append('containerNumber', 'BSIU2253788');
        formData.append('photoType', 'container');
        formData.append('containerPhotoLocation', 'Container Back Wall');
        
        const response = await fetch('http://localhost:3001/api/upload/s3-container-photos', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        console.log('📊 Container Photos Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Container photos test successful!');
            console.log('📸 Container photos structure:');
            result.containerPhotos.forEach((photo, index) => {
                console.log(`  Photo ${index + 1}:`, {
                    containerPhotoLocation: photo.containerPhotoLocation,
                    containerPhotoPath: photo.containerPhotoPath,
                    containerPhotoSize: photo.containerPhotoSize
                });
            });
        } else {
            console.error('❌ Container photos test failed:', result.error);
        }
        
        // Clean up
        fs.unlinkSync('test-container.png');
        
    } catch (error) {
        console.error('❌ Container photos test error:', error);
    }
}

async function runAllTests() {
    await testS3DamageUpload();
    await testS3ContainerUpload();
}

runAllTests();
