import { PNG } from 'pngjs';

// eslint-disable-next-line no-restricted-globals
addEventListener('message', e => {
    const { file } = e.data;

    file.arrayBuffer().then(buffer => {
        const png = new PNG();
        png.parse(buffer, (err, data) => {
            if (err) throw err;
            const { width, height } = png;

            const canvas = new OffscreenCanvas(width * 2, height * 2);
            const ctx = canvas.getContext('2d');

            // Create a new ImageData object with the scaled dimensions
            const scaledImage = ctx.createImageData(width * 2, height * 2);

            // Iterate over each pixel in the original image
            for (let y = 0; y < height * 2; y++) {
                for (let x = 0; x < width * 2; x++) {
                    // Get the index in the original image data
                    const index = (Math.floor(y / 2) * width + Math.floor(x / 2)) * 4;

                    // Get the corresponding index in the scaled image data
                    const scaledIndex = (y * width * 2 + x) * 4;

                    // Copy the pixel data from the original image to the scaled image
                    scaledImage.data[scaledIndex] = png.data[index];     // R value
                    scaledImage.data[scaledIndex + 1] = png.data[index + 1]; // G value
                    scaledImage.data[scaledIndex + 2] = png.data[index + 2]; // B value
                    scaledImage.data[scaledIndex + 3] = png.data[index + 3]; // A value
                }
            }

            // Put the scaled image data on the canvas
            ctx.putImageData(scaledImage, 0, 0);

            // Get a data URL of the image
            const dataUrl = canvas.convertToBlob().then(blob => {
                const dataUrl = URL.createObjectURL(blob);

                // Send the data URL back to the main thread
                postMessage({ dataUrl: dataUrl });
            });
        });
    });
});