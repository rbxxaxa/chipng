import { PNG } from 'pngjs';

// eslint-disable-next-line no-restricted-globals
addEventListener('message', e => {
    const { file } = e.data;

    file.arrayBuffer().then(buffer => {
        const png = new PNG();
        png.parse(buffer, (err, data) => {
            if (err) throw err;
            const { width, height } = png;

            // Create a new PNG with the scaled dimensions
            const scaledPng = new PNG({ width: width * 2, height: height * 2 });

            // Iterate over each pixel in the original image
            for (let y = 0; y < height * 2; y++) {
                for (let x = 0; x < width * 2; x++) {
                    // Get the index in the original image data
                    const index = (Math.floor(y / 2) * width + Math.floor(x / 2)) * 4;

                    // Get the corresponding index in the scaled image data
                    const scaledIndex = (y * width * 2 + x) * 4;

                    // Copy the pixel data from the original image to the scaled image
                    scaledPng.data[scaledIndex] = png.data[index];     // R value
                    scaledPng.data[scaledIndex + 1] = png.data[index + 1]; // G value
                    scaledPng.data[scaledIndex + 2] = png.data[index + 2]; // B value
                    scaledPng.data[scaledIndex + 3] = png.data[index + 3]; // A value
                }
            }

            // Convert the scaled PNG to a buffer
            const resultBuffer = PNG.sync.write(scaledPng);

            // Create a new Blob from the buffer
            const blob = new Blob([resultBuffer], { type: 'image/png' });

            // Create a new FileReader
            const reader = new FileReader();

            // Set the onload function of the reader
            reader.onload = function (event) {
                // The result attribute contains the data URL
                const dataUrl = event.target.result;

                // Send the data URL back to the main thread
                postMessage({ dataUrl: dataUrl });
            };

            // Read the blob as a data URL
            reader.readAsDataURL(blob);
        });
    });
});