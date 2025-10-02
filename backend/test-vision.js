const fetch = require('node-fetch');
const fs = require('fs');

async function testVision(imagePath) {
    try {
        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        console.log('🚀 Testing both ParkRow API and Google Vision AI concurrently...');
        console.log('📏 Image size:', (base64Image.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('');
        
        const startTime = Date.now();
        
        // Call both APIs concurrently using Promise.all
        const [parkrowResponse, googleVisionResponse] = await Promise.all([
            // ParkRow API call
            fetch('http://localhost:3001/api/vision/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
            }).then(res => res.json()).catch(err => ({
                success: false,
                error: `ParkRow API Error: ${err.message}`,
                data: { containerNumber: '', isoCode: '', containerColor: '' }
            })),
            
            // Google Vision AI with Color Detection call
            fetch('http://localhost:3001/api/vision/google-vision-color', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ base64Image }),
            }).then(res => res.json()).catch(err => ({
                success: false,
                error: `Google Vision API Error: ${err.message}`,
                data: { containerNumber: '', isoCode: '', containerColor: '', colorHex: '' }
            }))
        ]);
        
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('⏱️  Total processing time:', processingTime + 's');
        console.log('');
        
        // Display results side by side
        console.log('📊 === COMPARISON RESULTS ===');
        console.log('');
        
        console.log('🔹 PARKROW API RESULT:');
        console.log(JSON.stringify(parkrowResponse, null, 2));
        console.log('');
        
        console.log('🔸 GOOGLE VISION AI RESULT:');
        console.log(JSON.stringify(googleVisionResponse, null, 2));
        console.log('');
        
        // Compare results
        console.log('🔍 === COMPARISON ANALYSIS ===');
        compareResults(parkrowResponse, googleVisionResponse);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function compareResults(parkrowResult, googleVisionResult) {
    const parkrowData = parkrowResult.data || {};
    const googleData = googleVisionResult.data || {};
    
    const fields = ['containerNumber', 'isoCode', 'containerColor'];
    
    fields.forEach(field => {
        const parkrowValue = parkrowData[field] || '';
        const googleValue = googleData[field] || '';
        
        if (parkrowValue && googleValue) {
            if (parkrowValue === googleValue) {
                console.log(`✅ ${field}: Both APIs agree - "${parkrowValue}"`);
            } else {
                console.log(`⚠️  ${field}: Disagreement`);
                console.log(`   ParkRow: "${parkrowValue}"`);
                console.log(`   Google:  "${googleValue}"`);
            }
        } else if (parkrowValue && !googleValue) {
            console.log(`🔹 ${field}: Only ParkRow detected - "${parkrowValue}"`);
        } else if (!parkrowValue && googleValue) {
            console.log(`🔸 ${field}: Only Google detected - "${googleValue}"`);
        } else {
            console.log(`❌ ${field}: Neither API detected`);
        }
    });
    
    // Special color analysis section
    console.log('');
    console.log('🎨 === COLOR ANALYSIS ===');
    
    const parkrowColor = parkrowData.containerColor || '';
    const googleColor = googleData.containerColor || '';
    const googleColorHex = googleData.colorHex || '';
    const googleColorDetails = googleData.colorDetails || null;
    
    if (googleColor) {
        console.log(`🔸 Google Vision detected color: "${googleColor}"`);
        if (googleColorHex) {
            console.log(`   Color Hex: ${googleColorHex}`);
        }
        if (googleColorDetails) {
            console.log(`   RGB: (${googleColorDetails.rgb.red}, ${googleColorDetails.rgb.green}, ${googleColorDetails.rgb.blue})`);
            console.log(`   Score: ${googleColorDetails.score}`);
            console.log(`   Pixel Fraction: ${googleColorDetails.pixelFraction}`);
        }
    } else {
        console.log('❌ Google Vision did not detect any color');
    }
    
    if (parkrowColor) {
        console.log(`🔹 ParkRow detected color: "${parkrowColor}"`);
    } else {
        console.log('❌ ParkRow did not detect any color');
    }
    
    // Color comparison
    if (parkrowColor && googleColor) {
        if (parkrowColor.toLowerCase() === googleColor.toLowerCase()) {
            console.log('✅ Color detection: Both APIs agree!');
        } else {
            console.log('⚠️  Color detection: APIs disagree');
            console.log(`   ParkRow: "${parkrowColor}"`);
            console.log(`   Google:  "${googleColor}"`);
        }
    }
    
    console.log('');
    console.log('📈 === SUMMARY ===');
    const parkrowSuccess = fields.some(field => parkrowData[field]);
    const googleSuccess = fields.some(field => googleData[field]);
    
    if (parkrowSuccess && googleSuccess) {
        console.log('🎉 Both APIs successfully detected container information');
    } else if (parkrowSuccess) {
        console.log('🔹 Only ParkRow API detected container information');
    } else if (googleSuccess) {
        console.log('🔸 Only Google Vision AI detected container information');
    } else {
        console.log('❌ Neither API detected container information');
    }
    
    // Color detection summary
    console.log('');
    console.log('🎨 === COLOR DETECTION SUMMARY ===');
    if (googleColor) {
        console.log('✅ Google Vision AI successfully detected container color');
        console.log(`   Detected: "${googleColor}" (${googleColorHex})`);
    } else {
        console.log('❌ Google Vision AI failed to detect container color');
    }
}

const imagePath = process.argv[2];
if (!imagePath) {
    console.log('Usage: node test-vision.js <path-to-image>');
    console.log('Example: node test-vision.js container.jpg');
    process.exit(1);
}

testVision(imagePath);
