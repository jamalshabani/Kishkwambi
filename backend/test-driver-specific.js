const fs = require('fs');
const path = require('path');

// Test script for Google Vision AI driver details extraction with driver.jpeg
async function testDriverDetailsWithDriverImage() {
    try {
        console.log('🧪 Testing Google Vision AI Driver Details Extraction with driver.jpeg...\n');

        // Check if driver.jpeg exists
        const driverImagePath = path.join(__dirname, 'driver.jpeg');
        if (!fs.existsSync(driverImagePath)) {
            console.log('❌ driver.jpeg not found in backend directory');
            return;
        }

        console.log('📸 Found driver.jpeg image');
        
        // Read and convert image to base64
        const imageBuffer = fs.readFileSync(driverImagePath);
        const imageBase64 = imageBuffer.toString('base64');
        
        console.log(`📸 Image size: ${imageBuffer.length} bytes`);
        console.log(`📸 Base64 length: ${imageBase64.length} characters`);
        console.log(`📸 Base64 preview: ${imageBase64.substring(0, 50)}...`);

        // Make request to the Vision AI endpoint
        const response = await fetch('http://localhost:3001/api/vision/extract-driver-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Image: imageBase64
            }),
        });

        console.log('\n📡 Response Status:', response.status);
        console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('\n📄 Raw Response:', responseText);

        try {
            const result = JSON.parse(responseText);
            console.log('\n✅ Parsed Response:');
            console.log(JSON.stringify(result, null, 2));
            
            if (result.success && result.data) {
                console.log('\n📋 Extracted Driver Details:');
                Object.entries(result.data).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value || 'N/A'}`);
                });
                
                if (result.rawText) {
                    console.log('\n📝 Raw Extracted Text:');
                    console.log('─'.repeat(50));
                    console.log(result.rawText);
                    console.log('─'.repeat(50));
                }
            } else if (result.success === false) {
                console.log('\n❌ Extraction failed:', result.message || result.error);
            }
        } catch (parseError) {
            console.log('\n❌ Failed to parse JSON response:', parseError.message);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Test with other available images for comparison
async function testWithOtherImages() {
    try {
        console.log('\n🖼️  Testing with other available images...');
        
        const imageFiles = ['driver1.jpeg', 'driver2.jpeg'];
        
        for (const imageFile of imageFiles) {
            const imagePath = path.join(__dirname, imageFile);
            if (!fs.existsSync(imagePath)) {
                console.log(`ℹ️  ${imageFile} not found, skipping...`);
                continue;
            }

            console.log(`\n📸 Testing with ${imageFile}...`);
            
            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            
            console.log(`📸 Image size: ${imageBuffer.length} bytes`);

            const response = await fetch('http://localhost:3001/api/vision/extract-driver-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    base64Image: imageBase64
                }),
            });

            const responseText = await response.text();
            const result = JSON.parse(responseText);
            
            if (result.success && result.rawText) {
                console.log(`✅ ${imageFile} - Text extracted successfully`);
                console.log(`📝 Sample text: ${result.rawText.substring(0, 100)}...`);
            } else {
                console.log(`❌ ${imageFile} - ${result.message || result.error}`);
            }
        }

    } catch (error) {
        console.error('\n❌ Other images test failed:', error.message);
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Google Vision AI Tests with Driver Image\n');
    console.log('=' .repeat(60));
    
    // Test 1: Driver image test
    await testDriverDetailsWithDriverImage();
    
    console.log('\n' + '=' .repeat(60));
    
    // Test 2: Other images for comparison
    await testWithOtherImages();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
