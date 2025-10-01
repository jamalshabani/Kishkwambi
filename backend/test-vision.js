const fetch = require('node-fetch');
const fs = require('fs');

async function testVision(imagePath) {
    try {
        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        console.log('Sending image to ParkPow API via backend...');
        console.log('Image size:', (base64Image.length / 1024 / 1024).toFixed(2), 'MB');
        
        const response = await fetch('http://localhost:3001/api/vision/process-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64Image }),
        });
        
        const result = await response.json();
        console.log('\n=== RESULT ===');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

const imagePath = process.argv[2];
if (!imagePath) {
    console.log('Usage: node test-vision.js <path-to-image>');
    console.log('Example: node test-vision.js container.jpg');
    process.exit(1);
}

testVision(imagePath);
