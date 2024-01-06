import { PNG } from "pngjs";

// eslint-disable-next-line no-restricted-globals
addEventListener("message", (e) => {
  const { file } = e.data;

  file.arrayBuffer().then((buffer) => {
    const png = new PNG();
    png.parse(buffer, (err, data) => {
      if (err) throw err;
      const { width, height } = png;

      let opaque = new Uint8Array(width * height);
      let loose = new Uint8Array(width * height);
      let pending = [];
      let pendingNext = [];
      let offsets = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let idx = width * y + x;
          let a = png.data[(y * width + x) * 4 + 3];
          if (a == 0) {
            let isLoose = true;

            let n0 = width * (y - 1) + x - 1;
            let nAlpha = png.data[n0 * 4 + 3];
            if (nAlpha != 0) {
              isLoose = false;
              break;
            }

            for (let k = 0; k < 8; k++) {
              let s = offsets[k][0];
              let t = offsets[k][1];
              let nX = x + s;
              let nY = y + t;
              let nIdx = width * nY + nX;
              if (nIdx >= 0 && nIdx < width * height) {
                let neighbor_alpha = png.data[nIdx * 4 + 3];
                if (neighbor_alpha != 0) {
                  isLoose = false;
                  break;
                }
              }
            }

            if (!isLoose) {
              pending.push(idx);
            } else {
              loose[idx] = 1;
            }
          } else {
            opaque[idx] = -1;
          }
        }
      }

      while (pending.length > 0) {
        pendingNext = [];

        for (let p = 0; p < pending.length; p++) {
          let idx = pending[p];
          let x = idx % width;
          let y = Math.floor(idx / width);

          let r = 0;
          let g = 0;
          let b = 0;

          let count = 0;

          for (let k = 0; k < 8; k++) {
            let s = offsets[k][0];
            let t = offsets[k][1];
            let nX = x + s;
            let nY = y + t;
            let nIdx = width * nY + nX;

            if (nIdx >= 0 && nIdx < width * height) {
              if (opaque[nIdx] & 1) {
                r += png.data[(nY * width + nX) * 4 + 0];
                g += png.data[(nY * width + nX) * 4 + 1];
                b += png.data[(nY * width + nX) * 4 + 2];

                count++;
              }
            }
          }

          if (count > 0) {
            png.data[(y * width + x) * 4 + 0] = r / count;
            png.data[(y * width + x) * 4 + 1] = g / count;
            png.data[(y * width + x) * 4 + 2] = b / count;
            png.data[(y * width + x) * 4 + 3] = 0;

            opaque[idx] = 0xfe;

            for (let k = 0; k < 8; k++) {
              let s = offsets[k][0];
              let t = offsets[k][1];
              let nX = x + s;
              let nY = y + t;

              let nIdx = width * nY + nX;
              if (nIdx >= 0 && nIdx < width * height) {
                if (loose[nIdx] == 1) {
                  pendingNext.push(nIdx);
                  loose[nIdx] = 0;
                }
              }
            }
          } else {
            pendingNext.push(idx);
          }
        }

        if (pendingNext.length > 0) {
          for (let p = 0; p < pending.length; p++) {
            let idx = pending[p];
            opaque[idx] >>= 1;
          }
        }

        pending = pendingNext;
      }

      const resultBuffer = PNG.sync.write(png);
      const blob = new Blob([resultBuffer], { type: "image/png" });
      const reader = new FileReader();
      reader.onload = function (event) {
        const dataUrl = event.target.result;
        postMessage({ dataUrl: dataUrl });
      };

      reader.readAsDataURL(blob);
    });
  });
});
