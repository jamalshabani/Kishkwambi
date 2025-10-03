// Simple S3 test - only test upload permissions
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testS3Upload() {
    try {
        console.log('🧪 Testing S3 upload permissions...');
        
        // Create S3 client
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const bucketName = process.env.S3_BUCKET_NAME;
        console.log('📦 Target bucket:', bucketName);
        console.log('🌍 Region:', process.env.AWS_REGION);

        // Test upload a simple file
        const testKey = 'test-upload.txt';
        const testContent = 'This is a test file to verify S3 upload works.';
        
        console.log('📤 Attempting to upload test file...');
        
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain',
            // Remove ACL since bucket doesn't allow ACLs
        });

        const result = await s3Client.send(putCommand);
        console.log('✅ Upload successful!');
        console.log('📊 Upload result:', result);
        
        // Generate public URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
        console.log(`🌐 Public URL: ${publicUrl}`);
        
        // Test if we can access the file
        console.log('🔍 Testing file access...');
        const response = await fetch(publicUrl);
        if (response.ok) {
            console.log('✅ File is publicly accessible!');
        } else {
            console.log('❌ File is not publicly accessible. Status:', response.status);
        }

    } catch (error) {
        console.error('❌ S3 upload test failed:', error);
        
        if (error.name === 'NoSuchBucket') {
            console.log('💡 The S3 bucket does not exist. Please create it first.');
            console.log('💡 Go to AWS Console > S3 > Create bucket > Name: simba-terminal-photos');
        } else if (error.name === 'AccessDenied') {
            console.log('💡 Access denied. Your IAM user needs these permissions:');
            console.log('   - s3:PutObject');
            console.log('   - s3:PutObjectAcl');
            console.log('   - s3:GetObject');
        } else if (error.name === 'CredentialsProviderError') {
            console.log('💡 Check your AWS credentials in .env file');
        } else {
            console.log('💡 Error details:', error.message);
        }
    }
}

testS3Upload();
