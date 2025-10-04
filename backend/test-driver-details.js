const fs = require('fs');
const path = require('path');

// Test script for Google Vision AI driver details extraction
async function testDriverDetailsExtraction() {
    try {
        console.log('🧪 Testing Google Vision AI Driver Details Extraction...\n');

        // Test with a sample base64 image (1x1 pixel PNG)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        console.log('📸 Test image base64 length:', testImageBase64.length);
        console.log('📸 Test image base64 preview:', testImageBase64.substring(0, 50) + '...');

        // Make request to the Vision AI endpoint
        const response = await fetch('http://localhost:3001/api/vision/extract-driver-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Image: testImageBase64
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
            }
        } catch (parseError) {
            console.log('\n❌ Failed to parse JSON response:', parseError.message);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Test with a real image file if it exists
async function testWithRealImage() {
    try {
        console.log('\n🖼️  Testing with real image file...');
        
        // Look for any image files in the backend directory
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        const files = fs.readdirSync(__dirname);
        const imageFile = files.find(file => 
            imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );

        if (!imageFile) {
            console.log('ℹ️  No image files found in backend directory');
            return;
        }

        console.log(`📸 Found image file: ${imageFile}`);
        
        // Read and convert image to base64
        const imagePath = path.join(__dirname, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        
        console.log(`📸 Image size: ${imageBuffer.length} bytes`);
        console.log(`📸 Base64 length: ${imageBase64.length} characters`);

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
            }
        } catch (parseError) {
            console.log('\n❌ Failed to parse JSON response:', parseError.message);
        }

    } catch (error) {
        console.error('\n❌ Real image test failed:', error.message);
    }
}

// Test the Vision AI client directly
async function testVisionAIDirectly() {
    try {
        console.log('\n🔬 Testing Google Vision AI Client Directly...');
        
        // Load environment variables
        require('dotenv').config();
        
        const vision = require('@google-cloud/vision');
        const client = new vision.ImageAnnotatorClient({
            apiKey: process.env.GOOGLE_VISION_API_KEY,
        });

        console.log('✅ Vision AI client initialized');
        console.log('🔑 API Key configured:', process.env.GOOGLE_VISION_API_KEY ? 'Yes' : 'No');

        // Test with sample image
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const image = {
            content: testImageBase64,
        };

        console.log('📸 Testing text detection...');
        const [result] = await client.textDetection(image);
        const detections = result.textAnnotations;
        
        console.log('📊 Detection results:');
        console.log(`  Total detections: ${detections.length}`);
        
        if (detections.length > 0) {
            console.log('\n📝 Detected text:');
            detections.forEach((detection, index) => {
                console.log(`  ${index + 1}. ${detection.description}`);
            });
        } else {
            console.log('ℹ️  No text detected in test image');
        }

    } catch (error) {
        console.error('\n❌ Direct Vision AI test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Google Vision AI Tests\n');
    console.log('=' .repeat(60));
    
    // Test 1: Basic endpoint test
    await testDriverDetailsExtraction();
    
    console.log('\n' + '=' .repeat(60));
    
    // Test 2: Test with real image if available
    await testWithRealImage();
    
    console.log('\n' + '=' .repeat(60));
    
    // Test 3: Direct Vision AI client test
    await testVisionAIDirectly();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
