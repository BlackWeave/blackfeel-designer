export const removeBgService = {
    async process(base64String) {
        try {
            console.log('🐍 Sending image to Python rembg microservice...');

            const response = await fetch('http://127.0.0.1:5001/remove-bg', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64String })
            });

            if (!response.ok) {
                throw new Error(`Python service responded with status ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            console.log('✅ Received clean image from Python!');
            return data.image;

        } catch (error) {
            console.error('⚠️ Python background removal failed:', error.message);
            // Fallback: return original image if removal fails so the app doesn't crash
            return base64String;
        }
    }
};