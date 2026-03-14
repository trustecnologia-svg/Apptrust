import Jimp from 'jimp';
import path from 'path';

async function removeBackground() {
    try {
        const inputPath = 'C:/Users/User/.gemini/antigravity/brain/feefdb77-d693-4d00-b7c5-2381a60d0b0d/uploaded_image_1767124548717.png';
        const outputPath = 'c:/Users/User/Documents/hidraup/public/logo.png';

        const image = await Jimp.read(inputPath);

        // Get the background color from a corner (assume it's the background)
        const bgColor = image.getPixelColor(5, 5);
        const { r, g, b } = Jimp.intToRGBA(bgColor);

        console.log(`Background color detected: rgba(${r}, ${g}, ${b}, ${r})`);

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const currentColor = this.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(currentColor);

            // Allow some tolerance for the background color
            const tolerance = 20;
            const diffR = Math.abs(rgba.r - r);
            const diffG = Math.abs(rgba.g - g);
            const diffB = Math.abs(rgba.b - b);

            if (diffR < tolerance && diffG < tolerance && diffB < tolerance) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
            }
        });

        await image.writeAsync(outputPath);
        console.log('Successfully saved transparent logo to:', outputPath);
    } catch (error) {
        console.error('Error processing image:', error);
    }
}

removeBackground();
