
/**
 * Compresses an image file by resizing it and converting to JPEG.
 * @param file The file to compress
 * @param maxWidth Max width (default 1280)
 * @param maxHeight Max height (default 1280)
 * @param quality JPEG quality (0 to 1, default 0.7)
 * @returns Promise resolving to the compressed base64 string
 */
export const compressImage = (
    file: File,
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.7
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to JPEG with quality reduced
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
