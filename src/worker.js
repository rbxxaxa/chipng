import { PNG } from "pngjs";

// This file uses the same algorithm as https://github.com/urraka/alpha-bleeding/tree/master

// eslint-disable-next-line no-restricted-globals
addEventListener("message", (e) => {
  const { file } = e.data;

  file
    .arrayBuffer()
    .then((buffer) => {
      const png = new PNG();
      png.parse(buffer, (err) => {
        let data = png.data;
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
            let a = data[idx * 4 + 3];
            if (a == 0) {
              let isLoose = true;

              for (let k = 0; k < 8; k++) {
                let s = offsets[k][0];
                let t = offsets[k][1];
                let nX = x + s;
                let nY = y + t;
                let nIdx = width * nY + nX;
                if (nIdx >= 0 && nIdx < width * height) {
                  let neighborAlpha = data[nIdx * 4 + 3];

                  if (neighborAlpha != 0) {
                    isLoose = false;
                    break;
                  }
                }
              }

              if (!isLoose) {
                pending.push({ x: x, y: y });
              } else {
                loose[idx] = 1;
              }
            } else {
              opaque[idx] = 0xff;
            }
          }
        }

        while (pending.length > 0) {
          pendingNext = [];

          for (let p = 0; p < pending.length; p++) {
            let coord = pending[p];
            let x = coord.x;
            let y = coord.y;
            let idx = width * y + x;

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
                  r += data[nIdx * 4 + 0];
                  g += data[nIdx * 4 + 1];
                  b += data[nIdx * 4 + 2];

                  count++;
                }
              }
            }

            if (count > 0) {
              data[idx * 4 + 0] = r / count;
              data[idx * 4 + 1] = g / count;
              data[idx * 4 + 2] = b / count;
              data[idx * 4 + 3] = 0;
              opaque[idx] = 0xfe;

              for (let k = 0; k < 8; k++) {
                let s = offsets[k][0];
                let t = offsets[k][1];
                let nX = x + s;
                let nY = y + t;
                let nIdx = width * nY + nX;

                if (nIdx >= 0 && nIdx < width * height) {
                  if (loose[nIdx]) {
                    pendingNext.push({ x: nX, y: nY });
                    loose[nIdx] = 0;
                  }
                }
              }
            } else {
              pendingNext.push({ x: x, y: y });
            }
          }

          if (pendingNext.length > 0) {
            for (let p = 0; p < pending.length; p++) {
              let coord = pending[p];
              let idx = width * coord.y + coord.x;
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
    })
    .catch((error) => {
      console.error(error);
      postMessage({ error: error.toString() });
    });
});
