const fs = require('fs');
const path = require('path');

// Test Google Vision AI using REST API directly
async function testVisionAIREST() {
    try {
        console.log('🧪 Testing Google Vision AI with REST API...\n');
        
        // Load environment variables
        require('dotenv').config();
        
        const apiKey = process.env.GOOGLE_VISION_API_KEY;
        if (!apiKey) {
            console.log('❌ GOOGLE_VISION_API_KEY not found in environment variables');
            return;
        }

        console.log('✅ API Key configured:', apiKey ? 'Yes' : 'No');

        // Test with a real image file
        const imageFiles = fs.readdirSync(__dirname).filter(file => 
            ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].some(ext => file.toLowerCase().endsWith(ext))
        );

        if (imageFiles.length === 0) {
            console.log('❌ No image files found for testing');
            return;
        }

        const imageFile = imageFiles[0];
        console.log(`📸 Using image file: ${imageFile}`);
        
        const imagePath = path.join(__dirname, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        
        console.log(`📸 Image size: ${imageBuffer.length} bytes`);
        console.log(`📸 Base64 length: ${imageBase64.length} characters`);

        // Prepare the request body
        const requestBody = {
            requests: [
                {
                    image: {
                        content: imageBase64
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 10
                        }
                    ]
                }
            ]
        };

        console.log('\n📡 Making request to Google Vision AI REST API...');
        
        // Make the request
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('📡 Response Status:', response.status);
        console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('\n📄 Raw Response:', responseText);

        try {
            const result = JSON.parse(responseText);
            console.log('\n✅ Parsed Response:');
            console.log(JSON.stringify(result, null, 2));
            
            if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
                const textAnnotations = result.responses[0].textAnnotations;
                console.log(`\n📝 Found ${textAnnotations.length} text annotations:`);
                
                textAnnotations.forEach((annotation, index) => {
                    console.log(`  ${index + 1}. ${annotation.description}`);
                });
            } else if (result.error) {
                console.log('\n❌ API Error:', result.error);
            } else {
                console.log('\nℹ️  No text detected in image');
            }
        } catch (parseError) {
            console.log('\n❌ Failed to parse JSON response:', parseError.message);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testVisionAIREST().catch(console.error);
