/**
 * Configure CORS for Cloudflare R2 bucket
 * Run this script once to set up proper CORS headers
 * 
 * Usage: node scripts/configure-r2-cors.js
 */

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    }
});

const corsConfiguration = {
    CORSRules: [
        {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
            AllowedOrigins: ['*'], // In production, replace with your specific domain
            ExposeHeaders: ['ETag', 'Content-Length'],
            MaxAgeSeconds: 3000,
        },
    ],
};

async function configureCors() {
    try {
        console.log('🔧 Configuring CORS for R2 bucket...');
        
        const command = new PutBucketCorsCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET,
            CORSConfiguration: corsConfiguration,
        });

        await s3Client.send(command);
        
        console.log('✅ CORS configuration applied successfully!');
        console.log('📝 Allowed origins: * (all origins)');
        console.log('📝 Allowed methods: GET, PUT, POST, HEAD');
        console.log('📝 Allowed headers: * (all headers)');
        console.log('\n⚠️  In production, replace "*" with your specific domain for better security.');
    } catch (error) {
        console.error('❌ Failed to configure CORS:', error.message);
        console.error('Full error:', error);
        console.log('\n💡 Make sure your R2 credentials are correctly set in .env file');
    }
}

configureCors();
