import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary explicitly using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryService = {
    /**
     * Uploads an existing image URL to Cloudinary and upscales to 4K
     */
    async uploadAndUpscaleTo4K(imageUrl, orderId) {
        try {
            // Uploads the image and applies a 4K scaling transformation
            const result = await cloudinary.uploader.upload(imageUrl, {
                folder: 'blackfeel_4k_designs',
                public_id: `order_${orderId}_4k`,
                transformation: [
                    { width: 3840, crop: "scale" }, // Upscale to 4K width (maintaining aspect ratio)
                    { quality: "auto", fetch_format: "auto" } // Automatically deliver the most efficient format (like WebP)
                ]
            });

            return result.secure_url;
        } catch (error) {
            console.error('Cloudinary 4K upload error:', error.message);
            throw error;
        }
    }
};