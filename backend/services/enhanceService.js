import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { imageStorage } from './imageStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execPromise = util.promisify(exec);

export const enhanceService = {
    /**
     * Downloads the original image, enhances it via the local python script, 
     * and uploads the print-ready enhanced image to R2.
     * @param {string} imageUrl URL of the processed image
     * @param {string} targetKey The destination key in R2
     * @returns {Promise<string>} The new R2 URL
     */
    async enhanceAndUploadToR2(imageUrl, fileName, folder = 'finals') {
        const tempId = uuid();
        const inputPath = path.join(os.tmpdir(), `${tempId}_in.png`);
        const outputPath = path.join(os.tmpdir(), `${tempId}_out.png`);

        try {
            console.log(`Downloading image for enhancement: ${imageUrl}`);
            // 1. Download image
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(inputPath, Buffer.from(response.data));

            // 2. Resolve paths for the script and python binary
            const pythonBin = path.resolve(__dirname, '../python-ai/venv/bin/python');
            const scriptPath = path.resolve(__dirname, '../../enhance_script2.py');

            // 3. Execute the python enhancement script
            console.log(`Executing python enhancement script on ${inputPath}...`);
            const { stdout, stderr } = await execPromise(
                `"${pythonBin}" "${scriptPath}" "${inputPath}" -o "${outputPath}"`
            );
            
            console.log('Enhancement Script Output:', stdout);
            if (stderr) console.error('Enhancement Script Stderr:', stderr);

            // 4. Read the enhanced image
            const enhancedBuffer = await fs.readFile(outputPath);

            // 5. Upload directly to R2
            console.log(`Uploading enhanced print-ready image to R2: ${folder}/${fileName}`);
            const r2Url = await imageStorage.uploadBuffer(enhancedBuffer, fileName, folder);

            return r2Url;
        } catch (error) {
            console.error('Error in enhanceAndUploadToR2:', error.message);
            throw error;
        } finally {
            // Clean up temporary files
            try {
                await fs.unlink(inputPath).catch(() => {});
                await fs.unlink(outputPath).catch(() => {});
            } catch (cleanupError) {
                console.error('Failed to clean up temp files:', cleanupError.message);
            }
        }
    }
};
