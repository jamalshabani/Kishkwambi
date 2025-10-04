const fs = require('fs');
const path = require('path');

// Simple test for Google Vision AI with different approaches
async function testVisionAI() {
    try {
        console.log('🧪 Testing Google Vision AI with different approaches...\n');
        
        // Load environment variables
        require('dotenv').config();
        
        const vision = require('@google-cloud/vision');
        const client = new vision.ImageAnnotatorClient({
            apiKey: process.env.GOOGLE_VISION_API_KEY,
        });

        console.log('✅ Vision AI client initialized');
        console.log('🔑 API Key configured:', process.env.GOOGLE_VISION_API_KEY ? 'Yes' : 'No');

        // Test 1: Try with a simple base64 string
        console.log('\n📸 Test 1: Simple base64 string');
        try {
            const simpleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            const image1 = {
                content: simpleBase64,
            };
            
            const [result1] = await client.textDetection(image1);
            console.log('✅ Simple base64 worked!');
            console.log('Detections:', result1.textAnnotations.length);
        } catch (error) {
            console.log('❌ Simple base64 failed:', error.message);
        }

        // Test 2: Try with Buffer.from()
        console.log('\n📸 Test 2: Buffer.from() approach');
        try {
            const simpleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            const image2 = {
                content: Buffer.from(simpleBase64, 'base64'),
            };
            
            const [result2] = await client.textDetection(image2);
            console.log('✅ Buffer approach worked!');
            console.log('Detections:', result2.textAnnotations.length);
        } catch (error) {
            console.log('❌ Buffer approach failed:', error.message);
        }

        // Test 3: Try with a real image file
        console.log('\n📸 Test 3: Real image file');
        try {
            const imageFiles = fs.readdirSync(__dirname).filter(file => 
                ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].some(ext => file.toLowerCase().endsWith(ext))
            );

            if (imageFiles.length > 0) {
                const imageFile = imageFiles[0];
                console.log(`Using image file: ${imageFile}`);
                
                const imagePath = path.join(__dirname, imageFile);
                const imageBuffer = fs.readFileSync(imagePath);
                
                const image3 = {
                    content: imageBuffer,
                };
                
                const [result3] = await client.textDetection(image3);
                console.log('✅ Real image file worked!');
                console.log('Detections:', result3.textAnnotations.length);
                
                if (result3.textAnnotations.length > 0) {
                    console.log('\n📝 Extracted text:');
                    result3.textAnnotations.forEach((detection, index) => {
                        console.log(`  ${index + 1}. ${detection.description}`);
                    });
                }
            } else {
                console.log('ℹ️  No image files found for testing');
            }
        } catch (error) {
            console.log('❌ Real image file failed:', error.message);
        }

        // Test 4: Try with base64 from real image
        console.log('\n📸 Test 4: Base64 from real image');
        try {
            const imageFiles = fs.readdirSync(__dirname).filter(file => 
                ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].some(ext => file.toLowerCase().endsWith(ext))
            );

            if (imageFiles.length > 0) {
                const imageFile = imageFiles[0];
                const imagePath = path.join(__dirname, imageFile);
                const imageBuffer = fs.readFileSync(imagePath);
                const imageBase64 = imageBuffer.toString('base64');
                
                console.log(`Base64 length: ${imageBase64.length}`);
                
                const image4 = {
                    content: imageBase64,
                };
                
                const [result4] = await client.textDetection(image4);
                console.log('✅ Base64 from real image worked!');
                console.log('Detections:', result4.textAnnotations.length);
                
                if (result4.textAnnotations.length > 0) {
                    console.log('\n📝 Extracted text:');
                    result4.textAnnotations.forEach((detection, index) => {
                        console.log(`  ${index + 1}. ${detection.description}`);
                    });
                }
            }
        } catch (error) {
            console.log('❌ Base64 from real image failed:', error.message);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testVisionAI().catch(console.error);
