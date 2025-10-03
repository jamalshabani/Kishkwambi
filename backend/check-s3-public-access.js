// Check S3 bucket public access configuration
require('dotenv').config();
const { S3Client, GetObjectCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');

async function checkS3PublicAccess() {
    try {
        console.log('🔍 Checking S3 bucket public access configuration...');
        
        const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const bucketName = process.env.S3_BUCKET_NAME;
        const testKey = 'container-photos/ST25-00024/photos_1759493294300.jpg';
        
        console.log('📦 Bucket:', bucketName);
        console.log('🔑 Test key:', testKey);
        console.log('🌍 Region:', process.env.AWS_REGION);

        // Test 1: Try to get the object directly
        console.log('\n📤 Testing direct object access...');
        try {
            const getCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: testKey,
            });
            
            const result = await s3Client.send(getCommand);
            console.log('✅ Object exists and is accessible via API');
            console.log('📊 Content-Type:', result.ContentType);
            console.log('📊 Content-Length:', result.ContentLength);
        } catch (error) {
            console.log('❌ Object not accessible via API:', error.message);
        }

        // Test 2: Check bucket policy
        console.log('\n📋 Checking bucket policy...');
        try {
            const policyCommand = new GetBucketPolicyCommand({
                Bucket: bucketName,
            });
            
            const policyResult = await s3Client.send(policyCommand);
            console.log('✅ Bucket policy exists:');
            console.log(JSON.stringify(JSON.parse(policyResult.Policy), null, 2));
        } catch (error) {
            if (error.name === 'NoSuchBucketPolicy') {
                console.log('❌ No bucket policy found - this is likely the issue!');
            } else {
                console.log('❌ Error checking bucket policy:', error.message);
            }
        }

        // Test 3: Generate the public URL
        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${testKey}`;
        console.log('\n🌐 Public URL:', publicUrl);
        
        // Test 4: Try to fetch the URL
        console.log('🔍 Testing public URL access...');
        try {
            const response = await fetch(publicUrl);
            console.log('📊 Response status:', response.status);
            console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                console.log('✅ Public URL is accessible!');
            } else {
                console.log('❌ Public URL returned error:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('❌ Error fetching public URL:', error.message);
        }

    } catch (error) {
        console.error('❌ Error checking S3 configuration:', error);
    }
}

checkS3PublicAccess();
