import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: 'global'
});

export const vertexAiService = {
    async generateImage(prompt) {
        console.log(`📡 Sending search-grounded request to GCP Project: ${process.env.GCP_PROJECT_ID}`);

        const fullPrompt = `A single, centered, stunning graphic design asset of: ${prompt}. 
            Professional detailed illustration, silk-screen print aesthetic, bold vibrant colors, 
            intricate linework, sharp clean edges, flat design, vector art style, high-end streetwear aesthetic. 
            Solid white background. 
            NEVER generate a t-shirt, mockup, or person wearing it. 
            NO side-by-side images, no duplicates, no grid, no collage, no borders. 
            Standalone high-resolution graphic only.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-image-preview',
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                config: {
                    responseModalities: ['IMAGE'],
                    imageConfig: {
                        aspectRatio: "1:1",
                        outputMimeType: "image/png"
                    },
                    // The CORRECT syntax for Search Grounding in the new SDK
                    tools: [
                        { googleSearch: {} }
                    ]
                }
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (!imagePart || !imagePart.inlineData) {
                throw new Error('No image returned. Check safety filters or billing.');
            }

            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } catch (error) {
            console.error('Vertex AI Service Error:', error.message);
            throw error;
        }
    }
};