import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: 'global' // Consider changing to 'us-central1' if global continues to fail
});

export const vertexAiService = {
    async generateImage(prompt) {
        console.log(`\n📡 GCP Project: ${process.env.GCP_PROJECT_ID}`);
        console.log(`📝 Design Prompt: "${prompt}"`);

        const fullPrompt = `A single, centered, stunning graphic design asset of: ${prompt}. 
            Professional detailed illustration, silk-screen print aesthetic, bold vibrant colors, 
            intricate linework, sharp clean edges, flat design, vector art style, high-end streetwear aesthetic. 
            Solid white background. 
            NEVER generate a t-shirt, mockup, or person wearing it. 
            NO side-by-side images, no duplicates, no grid, no collage, no borders. 
            Standalone high-resolution graphic only.`;

        // Define models ordered by priority
        const modelConfigurations = [
            {
                name: "Gemini 3.1 Flash (Nano Banana 2)",
                id: "gemini-3.1-flash-image-preview",
                type: "gemini"
            },
            {
                name: "Imagen 4 Ultra",
                id: "imagen-4.0-ultra-generate-001",
                type: "imagen"
            }
        ];

        let lastError = null;

        for (const config of modelConfigurations) {
            try {
                console.log(`🚀 Attempting generation with: ${config.name}...`);

                if (config.type === "gemini") {
                    const response = await ai.models.generateContent({
                        model: config.id,
                        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                        config: {
                            responseModalities: ['IMAGE'],
                            imageConfig: {
                                aspectRatio: "1:1",
                                outputMimeType: "image/png"
                            },
                            tools: [{ googleSearch: {} }]
                        }
                    });

                    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    
                    if (!imagePart?.inlineData) {
                        const reason = response.candidates?.[0]?.finishReason || 'Unknown structural issue';
                        throw new Error(`Model refused or failed to generate image. Finish Reason: ${reason}`);
                    }

                    console.log(`✅ Success: Generated image with ${config.name}.`);
                    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

                } else if (config.type === "imagen") {
                    const response = await ai.models.generateImages({
                        model: config.id,
                        prompt: fullPrompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: '1:1',
                            outputMimeType: 'image/png'
                        }
                    });

                    const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;

                    if (!imageBytes) {
                        throw new Error('No image bytes in response payload.');
                    }

                    console.log(`✅ Success: Generated image with ${config.name} (Fallback).`);
                    return `data:image/png;base64,${imageBytes}`;
                }

            } catch (error) {
                lastError = error;
                console.error(`⚠️ ${config.name} Failed: ${error.message}`);
                console.log("🔄 Reverting to next available model...");
                // Continue to next model in the list
            }
        }

        // If we get here, all models failed
        console.error("❌ ALL models failed to generate the asset.");
        throw new Error(`Image generation failed across all models. Last error: ${lastError?.message}`);
    }
};