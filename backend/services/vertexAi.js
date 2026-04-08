import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: 'global' // Consider changing to 'us-central1' if global continues to fail
});

// Add this above your vertexAiService
async function dynamicSanitizePrompt(originalPrompt, aiInstance) {
    console.log(`\n🔄 IP Filter Triggered. Dynamically sanitizing prompt: "${originalPrompt}"...`);

    const systemInstruction = `
        You are an expert image generation prompt engineer. 
        The user's original prompt was rejected by an image generator because it contained 
        copyrighted, trademarked, or restricted IP names (like Marvel characters, actors, or brands).
        
        Your job is to rewrite the prompt to describe the VISUAL ARCHETYPES of those characters 
        or subjects without using ANY of their actual names. 
        
        Example Input: "Thor fighting the Hulk in New York"
        Example Output: "A golden-haired Norse thunder god in silver armor with a red cape fighting a massive, raging, green-skinned muscular giant in a modern city street."
        
        ONLY output the rewritten prompt. Do not add any conversational text.
    `;

    try {
        const response = await aiInstance.models.generateContent({
            // Using a fast, cheap model for the text translation
            model: "gemini-2.5-flash", // or your preferred flash model
            contents: [{ role: 'user', parts: [{ text: originalPrompt }] }],
            config: {
                systemInstruction: { parts: [{ text: systemInstruction }] },
                // Optional: Enable search if you want it to look up obscure characters
                tools: [{ googleSearch: {} }],
                temperature: 0.3 // Keep it focused
            }
        });

        const sanitizedPrompt = response.text.trim();
        console.log(`✨ Sanitized Prompt: "${sanitizedPrompt}"`);
        return sanitizedPrompt;

    } catch (error) {
        console.error("⚠️ Failed to sanitize prompt dynamically.", error);
        // Fallback to the original if the text model fails, though it will likely fail image gen again
        return originalPrompt;
    }
}

export const vertexAiService = {
    async generateImage(userPrompt) {
        console.log(`\n📡 GCP Project: ${process.env.GCP_PROJECT_ID}`);

        let currentPrompt = userPrompt;
        let hasSanitized = false; // Flag to prevent infinite retry loops

        const getFullPrompt = (basePrompt) => `A single, centered, stunning graphic design asset of: ${basePrompt}. 
            Professional detailed illustration, silk-screen print aesthetic, bold vibrant colors, 
            intricate linework, sharp clean edges, flat design, vector art style, high-end streetwear aesthetic. 
            Solid white background. 
            NEVER generate a t-shirt, mockup, or person wearing it. 
            NO side-by-side images, no duplicates, no grid, no collage, no borders. 
            Standalone high-resolution graphic only.`;

        const modelConfigurations = [
            { name: "Gemini 3.1 Flash (Nano Banana 2)", id: "gemini-3.1-flash-image-preview", type: "gemini" },
            { name: "Imagen 4 Ultra", id: "imagen-4.0-ultra-generate-001", type: "imagen" }
        ];

        // We wrap the generation in a while loop to allow for one retry after sanitization
        while (true) {
            let fullPrompt = getFullPrompt(currentPrompt);
            console.log(`📝 Attempting with Prompt: "${currentPrompt}"`);

            for (const config of modelConfigurations) {
                try {
                    console.log(`🚀 Attempting generation with: ${config.name}...`);

                    if (config.type === "gemini") {
                        const response = await ai.models.generateContent({
                            model: config.id,
                            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                            config: {
                                responseModalities: ['IMAGE'],
                                imageConfig: { aspectRatio: "1:1", outputMimeType: "image/png" },
                                // Loosening safety settings helps reduce false positives
                                safetySettings: [
                                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
                                ]
                            }
                        });

                        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

                        if (!imagePart?.inlineData) {
                            const reason = response.candidates?.[0]?.finishReason || 'Unknown';
                            throw new Error(`Finish Reason: ${reason}`);
                        }

                        console.log(`✅ Success: Generated image with ${config.name}.`);
                        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

                    } else if (config.type === "imagen") {
                        const response = await ai.models.generateImages({
                            model: config.id,
                            prompt: fullPrompt,
                            config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/png' }
                        });

                        const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
                        if (!imageBytes) throw new Error('No image bytes in response payload.');

                        console.log(`✅ Success: Generated image with ${config.name} (Fallback).`);
                        return `data:image/png;base64,${imageBytes}`;
                    }

                } catch (error) {
                    console.error(`⚠️ ${config.name} Failed: ${error.message}`);

                    // Check if the error is likely due to IP/Safety AND we haven't sanitized yet
                    const isSafetyError = error.message.includes('PROHIBITED_CONTENT') ||
                        error.message.includes('No image bytes');

                    if (isSafetyError && !hasSanitized) {
                        console.log("🛑 Blocked by safety/IP filters. Breaking model loop to sanitize prompt...");
                        break; // Break the inner model loop so we can sanitize and retry
                    }

                    console.log("🔄 Reverting to next available model...");
                }
            } // End of Model Loop

            // If we successfully generated, or if we've already tried sanitizing, exit the while loop
            if (hasSanitized) {
                console.error("❌ ALL models failed even after sanitization.");
                throw new Error("Image generation failed across all models after prompt sanitization.");
            }

            // If we get here, it means we hit a safety error and need to sanitize
            currentPrompt = await dynamicSanitizePrompt(userPrompt, ai);
            hasSanitized = true; // Set flag so we only retry once

        } // End of While Loop
    },

    async editImage(userPrompt, referenceImageBase64) {
        console.log(`\n📡 GCP Project: ${process.env.GCP_PROJECT_ID} - EDIT MODE`);

        const fullPrompt = `Edit the provided image according to these instructions: "${userPrompt}". 
            Maintain the original professional detailed illustration style, vector art aesthetic, and clean edges. 
            Solid white background. Standalone high-resolution graphic only. Do not change parts of the image that the prompt does not mention.`;

        try {
            // Using Gemini 3.1 Flash Image Preview for Image-to-Image
            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-image-preview",
                contents: [{
                    role: 'user',
                    parts: [
                        { text: fullPrompt },
                        { inlineData: { mimeType: 'image/png', data: referenceImageBase64 } }
                    ]
                }],
                config: {
                    responseModalities: ['IMAGE'],
                    imageConfig: { aspectRatio: "1:1", outputMimeType: "image/png" },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
                    ]
                }
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (!imagePart?.inlineData) {
                const reason = response.candidates?.[0]?.finishReason || 'Unknown';
                throw new Error(`Finish Reason: ${reason}`);
            }

            console.log(`✅ Success: Edited image with Gemini.`);
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } catch (error) {
            console.error(`⚠️ Edit Generation Failed: ${error.message}`);
            throw new Error("Failed to edit image. " + error.message);
        }
    }
};