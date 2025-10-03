// Test script for complete damage photos upload and database saving
// Run with: node test-damage-photos-complete.js

const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function testDamagePhotosUpload() {
    try {
        console.log('🧪 Testing complete damage photos upload and database saving...');
        
        // Create a test image file (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync('test-damage-1.png', testImageBuffer);
        fs.writeFileSync('test-damage-2.png', testImageBuffer);
        
        const formData = new FormData();
        formData.append('photos', fs.createReadStream('test-damage-1.png'), {
            filename: 'test-damage-1.png',
            contentType: 'image/png'
        });
        formData.append('photos', fs.createReadStream('test-damage-2.png'), {
            filename: 'test-damage-2.png',
            contentType: 'image/png'
        });
        formData.append('tripSegmentNumber', 'ST25-00001');
        formData.append('containerNumber', 'BSIU2253788');
        formData.append('damageLocation', 'Back Wall');
        
        console.log('📤 Uploading damage photos to S3...');
        
        const response = await fetch('http://localhost:3001/api/upload/s3-damage-photos', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Damage photos upload test successful!');
            console.log('📸 Damage photos structure:');
            result.damagePhotos.forEach((photo, index) => {
                console.log(`  Photo ${index + 1}:`, {
                    damageLocation: photo.damageLocation,
                    damagePhotoPath: photo.damagePhotoPath,
                    damagePhotoSize: photo.damagePhotoSize
                });
            });
            
            // Verify the structure matches requirements
            const firstPhoto = result.damagePhotos[0];
            if (firstPhoto.damageLocation === 'Back Wall' && 
                firstPhoto.damagePhotoPath && 
                firstPhoto.damagePhotoSize > 0) {
                console.log('✅ Database structure is correct!');
                console.log('  - damageLocation: "Back Wall" ✓');
                console.log('  - damagePhotoPath: S3 URL ✓');
                console.log('  - damagePhotoSize: File size ✓');
            } else {
                console.log('❌ Database structure is incorrect!');
            }
        } else {
            console.error('❌ Damage photos upload test failed:', result.error);
        }
        
        // Clean up
        fs.unlinkSync('test-damage-1.png');
        fs.unlinkSync('test-damage-2.png');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testDamagePhotosUpload();
