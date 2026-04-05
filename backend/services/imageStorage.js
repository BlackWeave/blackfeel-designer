import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import sharp from 'sharp';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    }
});

export const imageStorage = {
    async uploadFromUrl(imageUrl, folder = 'designs') {
        try {
            // Download image
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

            // Optimize with Sharp
            const optimized = await sharp(Buffer.from(response.data))
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // Upload to R2 with CORS headers
            const fileName = `${folder}/${uuid()}.webp`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                Key: fileName,
                Body: optimized,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'access-control-allow-origin': '*'
                }
            }));

            const cdnUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
            return cdnUrl;
        } catch (error) {
            console.error('Image upload error:', error.message);
            throw new Error('Failed to upload image: ' + error.message);
        }
    },

    async uploadBase64(base64String, folder = 'designs') {
        try {
            // Strip the data URL prefix
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            // Optimize with Sharp
            const optimized = await sharp(buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const fileName = `${folder}/${uuid()}.webp`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                Key: fileName,
                Body: optimized,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'access-control-allow-origin': '*'
                }
            }));

            return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
        } catch (error) {
            console.error('Base64 upload error:', error.message);
            throw new Error('Failed to upload base64 image: ' + error.message);
        }
    },

    async uploadBuffer(buffer, fileName, folder = 'designs') {
        try {
            const key = `${folder}/${fileName}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'access-control-allow-origin': '*'
                }
            }));

            const cdnUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
            return cdnUrl;
        } catch (error) {
            console.error('Buffer upload error:', error.message);
            throw new Error('Failed to upload buffer: ' + error.message);
        }
    },

    async downloadAndUploadToR2(url, targetKey) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET,
                Key: targetKey,
                Body: buffer,
                ContentType: 'image/png', // Cloudinary might return PNG or WEBP depending on format: auto, but let's stick to high res png if possible or whatever it returns
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'access-control-allow-origin': '*'
                }
            }));

            return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${targetKey}`;
        } catch (error) {
            console.error('downloadAndUploadToR2 error:', error.message);
            throw error;
        }
    }
};
