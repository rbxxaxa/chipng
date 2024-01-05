import { PNG } from "pngjs";

// Fetch and instantiate the WebAssembly module
const response = await fetch("bleed.wasm");
const module = await WebAssembly.compileStreaming(response);
const instance = await WebAssembly.instantiate(module);

// Get the process_pixels function
const process_pixels = instance.exports.process_pixels;

// eslint-disable-next-line no-restricted-globals
addEventListener("message", (e) => {
  const { file } = e.data;

  file.arrayBuffer().then((buffer) => {
    const png = new PNG();
    png.parse(buffer, (err, data) => {
      if (err) throw err;
      const { width, height } = png;

      // Create a new PNG with the scaled dimensions
      const pngDataInWasmMemory = new Uint8Array(
        instance.exports.memory.buffer,
        0,
        png.data.length
      );
      pngDataInWasmMemory.set(png.data);

      // Call the process_pixels function
      console.log("processing...");
      process_pixels(pngDataInWasmMemory.byteOffset, png.width, png.height);
      console.log("done processing");

      // Copy the updated data to a new PNG
      const newPng = new PNG({ width: width, height: height });
      newPng.data = pngDataInWasmMemory.slice(0, png.data.length);

      const resultBuffer = PNG.sync.write(newPng);

      // // Create a new Blob from the buffer
      const blob = new Blob([resultBuffer], { type: "image/png" });

      // // Create a new FileReader
      const reader = new FileReader();

      // // Set the onload function of the reader
      reader.onload = function (event) {
        // The result attribute contains the data URL
        const dataUrl = event.target.result;

        // Send the data URL back to the main thread
        postMessage({ dataUrl: dataUrl });
      };

      // // Read the blob as a data URL
      reader.readAsDataURL(blob);
    });
  });
});
