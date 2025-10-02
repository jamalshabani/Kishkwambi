const fs = require('fs');
const path = require('path');

async function testPlateRecognizer() {
    try {
        console.log('🚗 Testing PlateRecognizer API...');
        
        // Read a test image file (you can replace this with an actual trailer photo)
        const imagePath = path.join(__dirname, 'truck1.jpg');
        
        if (!fs.existsSync(imagePath)) {
            console.log('❌ Test image not found. Please add a trailer photo named "truck1.jpg" to the backend directory.');
            return;
        }
        
        // Convert image to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        console.log('📸 Image loaded, calling PlateRecognizer API...');
        
        // Call the PlateRecognizer API endpoint
        const response = await fetch('http://localhost:3001/api/plate-recognizer/recognize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64Image }),
        });
        
        const result = await response.json();
        
        console.log('=== PLATERECOGNIZER TEST RESULT ===');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success && result.data.licencePlate) {
            console.log(`✅ Successfully detected licence plate: ${result.data.licencePlate}`);
            if (result.data.confidence) {
                console.log(`📊 Confidence: ${(result.data.confidence * 100).toFixed(1)}%`);
            } else {
                console.log(`📊 Confidence: ${(result.data.rawResponse.results[0].score * 100).toFixed(1)}%`);
            }
        } else {
            console.log('❌ No licence plate detected or API error');
        }
        
    } catch (error) {
        console.error('❌ Error testing PlateRecognizer:', error);
    }
}

// Run the test
testPlateRecognizer();
