const fs = require('fs');
const path = require('path');

console.log('🔧 Environment Setup Helper');
console.log('==========================');

const envPath = path.join(__dirname, '.env');

// Check if .env file exists
if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    
    // Read and check for environment variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('EXPO_PUBLIC_BACKEND_URL=')) {
        console.log('✅ EXPO_PUBLIC_BACKEND_URL is configured');
    } else {
        console.log('❌ EXPO_PUBLIC_BACKEND_URL is missing from .env file');
        console.log('📝 Please add the following line to your .env file:');
        console.log('EXPO_PUBLIC_BACKEND_URL=http://your-server-ip:3001');
    }
    
    if (envContent.includes('PLATERECOGNIZER_API_KEY=')) {
        console.log('✅ PLATERECOGNIZER_API_KEY is configured');
    } else {
        console.log('❌ PLATERECOGNIZER_API_KEY is missing from .env file');
        console.log('📝 Please add the following line to your .env file:');
        console.log('PLATERECOGNIZER_API_KEY=your_actual_api_key_here');
    }
} else {
    console.log('❌ .env file does not exist');
    console.log('📝 Creating .env file template...');
    
    const envTemplate = `# MongoDB Configuration
MONGODB_URI=mongodb://admin:puxvox-zAddov-3cytna@102.177.84.123:27017/
PORT=3000

# Backend URL (for photo references - should match your server's public URL)
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000

# Google Vision API Key
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here

# PlateRecognizer API Key
PLATERECOGNIZER_API_KEY=your_platerecognizer_api_key_here

# ParkRow API Configuration
PARKROW_API_URL=https://api.parkrow.com/v1/ocr
PARKPOW_API_KEY=your_parkpow_api_key_here`;

    try {
        fs.writeFileSync(envPath, envTemplate);
        console.log('✅ .env file created successfully');
        console.log('📝 Please edit the .env file and add your actual API keys');
    } catch (error) {
        console.log('❌ Failed to create .env file:', error.message);
        console.log('📝 Please manually create a .env file with the following content:');
        console.log(envTemplate);
    }
}

console.log('\n📖 For detailed setup instructions, see: PLATERECOGNIZER_SETUP.md');
console.log('🧪 To test the API, run: node test-platerecognizer.js');
