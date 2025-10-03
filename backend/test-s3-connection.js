// Test S3 connection and credentials
require('dotenv').config();
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
    try {
        console.log('🧪 Testing S3 connection...');
        
        // Create S3 client
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        console.log('📋 AWS Configuration:');
        console.log('  Region:', process.env.AWS_REGION);
        console.log('  Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
        console.log('  Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
        console.log('  Bucket Name:', process.env.S3_BUCKET_NAME);

        // Test 1: List buckets
        console.log('\n🔍 Testing bucket access...');
        const listCommand = new ListBucketsCommand({});
        const listResult = await s3Client.send(listCommand);
        
        console.log('✅ Successfully connected to AWS S3!');
        console.log('📦 Available buckets:');
        listResult.Buckets.forEach(bucket => {
            console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
        });

        // Test 2: Check if our bucket exists
        const bucketName = process.env.S3_BUCKET_NAME;
        const bucketExists = listResult.Buckets.some(bucket => bucket.Name === bucketName);
        
        if (bucketExists) {
            console.log(`✅ Bucket "${bucketName}" exists!`);
        } else {
            console.log(`❌ Bucket "${bucketName}" not found!`);
            console.log('💡 Please create the bucket in AWS Console or check the name.');
        }

        // Test 3: Try to upload a test file
        console.log('\n📤 Testing file upload...');
        const testKey = 'test-connection.txt';
        const testContent = 'This is a test file to verify S3 upload works.';
        
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain',
        });

        await s3Client.send(putCommand);
        console.log(`✅ Successfully uploaded test file: ${testKey}`);
        
        // Test 4: Generate public URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
        console.log(`🌐 Public URL: ${publicUrl}`);

    } catch (error) {
        console.error('❌ S3 connection test failed:', error);
        
        if (error.name === 'CredentialsProviderError') {
            console.log('💡 Check your AWS credentials in .env file');
        } else if (error.name === 'NoSuchBucket') {
            console.log('💡 The S3 bucket does not exist. Please create it first.');
        } else if (error.name === 'AccessDenied') {
            console.log('💡 Access denied. Check your IAM permissions.');
        } else {
            console.log('💡 Error details:', error.message);
        }
    }
}

testS3Connection();
