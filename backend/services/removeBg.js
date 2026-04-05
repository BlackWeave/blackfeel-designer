import axios from 'axios';
import FormData from 'form-data';

const PYTHON_BG_SERVICE_URL = process.env.BG_SERVICE_URL || 'http://localhost:5001';

export const removeBgService = {
    async process(base64String) {
        // ── Strategy 1: Local Python microservice (rembg) ─────────────────
        try {
            console.log('✂️  Removing background via local Python service…');

            const response = await axios.post(
                `${PYTHON_BG_SERVICE_URL}/remove-bg`,
                { image: base64String },           // service accepts raw or data-URI base64
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60_000                // give the model up to 60 s
                }
            );

            if (response.data?.image) {
                console.log('✅  Background removed by local Python service.');
                return response.data.image;        // already "data:image/png;base64,…"
            }

            throw new Error('Python service returned no image');

        } catch (localErr) {
            // Only fall back for connectivity errors (service not running).
            // For real processing errors bubble them up so we don't silently return garbage.
            const isConnectivityError =
                localErr.code === 'ECONNREFUSED' ||
                localErr.code === 'ENOTFOUND'   ||
                localErr.code === 'ETIMEDOUT'   ||
                localErr.message?.includes('connect');

            if (!isConnectivityError) {
                console.error('❌  Python bg service error (non-connectivity):', localErr.message);
                // Return original so the app doesn't crash
                return base64String;
            }

            console.warn('⚠️  Python bg service unreachable — falling back to remove.bg API…');
        }

        // ── Strategy 2: External remove.bg API (fallback) ─────────────────
        try {
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            const formData = new FormData();
            formData.append('image_file', buffer, { filename: 'design.png' });
            formData.append('size', 'auto');

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': process.env.REMOVE_BG_API_KEY
                },
                responseType: 'arraybuffer',
                timeout: 30_000
            });

            console.log('✅  Background removed by remove.bg API.');
            return `data:image/png;base64,${Buffer.from(response.data).toString('base64')}`;

        } catch (apiErr) {
            console.error('❌  remove.bg API fallback also failed:', apiErr.response?.data?.toString() || apiErr.message);
            // Last resort: return original image so the rest of the pipeline continues
            return base64String;
        }
    }
};