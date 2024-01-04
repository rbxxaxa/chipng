import { PNG } from "pngjs";

function create2DArray(height, width, init) {
  var arr = [];
  for (var y = 0; y < height; y++) {
    arr[y] = [];
    var row = arr[y];
    for (var x = 0; x < width; x++) {
      row[x] = init;
    }
  }

  return arr;
}

// eslint-disable-next-line no-restricted-globals
addEventListener("message", (e) => {
  const { file } = e.data;

  file.arrayBuffer().then((buffer) => {
    const png = new PNG();
    png.parse(buffer, (err, data) => {
      if (err) throw err;
      const { width, height } = png;

      var opaque = create2DArray(height, width, 0);
      var loose = create2DArray(height, width, false);
      var pending = [];
      var pendingNext = [];
      var offsets = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];

      // Create a new PNG with the scaled dimensions
      const newPng = new PNG({ width: width, height: height });
      // copy over the old image
      png.bitblt(newPng, 0, 0, width, height, 0, 0);

      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var a = png.data[(y * width + x) * 4 + 3];
          if (a == 0) {
            var isLoose = true;

            for (var k = 0; k < 8; k++) {
              var s = offsets[k][0];
              var t = offsets[k][1];
              var nX = x + s;
              var nY = y + t;
              if (nX >= 0 && nX < width && nY >= 0 && nY < height) {
                var neighbor_alpha = png.data[(nY * width + nX) * 4 + 3];

                if (neighbor_alpha != 0) {
                  isLoose = false;
                  break;
                }
              }
            }

            if (!isLoose) {
              pending.push({ x: x, y: y });
            } else {
              loose[y][x] = true;
            }
          } else {
            opaque[y][x] = -1;
          }
        }
      }

      while (pending.length > 0) {
        pendingNext = [];

        for (var p = 0; p < pending.length; p++) {
          var coord = pending[p];
          var x = coord.x;
          var y = coord.y;

          var r = 0;
          var g = 0;
          var b = 0;

          var count = 0;

          for (var k = 0; k < 8; k++) {
            var s = offsets[k][0];
            var t = offsets[k][1];
            var nX = x + s;
            var nY = y + t;

            if (nX >= 0 && nX < width && nY >= 0 && nY < height) {
              if (opaque[nY][nX] & 1) {
                r += newPng.data[(nY * width + nX) * 4 + 0];
                g += newPng.data[(nY * width + nX) * 4 + 1];
                b += newPng.data[(nY * width + nX) * 4 + 2];

                count++;
              }
            }
          }

          if (count > 0) {
            newPng.data[(y * width + x) * 4 + 0] = r / count;
            newPng.data[(y * width + x) * 4 + 1] = g / count;
            newPng.data[(y * width + x) * 4 + 2] = b / count;
            newPng.data[(y * width + x) * 4 + 3] = 0;

            opaque[y][x] = 0xfe;

            for (var k = 0; k < 8; k++) {
              var s = offsets[k][0];
              var t = offsets[k][1];
              var nX = x + s;
              var nY = y + t;

              if (nX >= 0 && nX < width && nY >= 0 && nY < height) {
                if (loose[nY][nX]) {
                  pendingNext.push({ x: nX, y: nY });
                  loose[nY][nX] = false;
                }
              }
            }
          } else {
            pendingNext.push({ x: x, y: y });
          }
        }

        if (pendingNext.length > 0) {
          for (var p = 0; p < pending.length; p++) {
            var coord = pending[p];
            opaque[coord.y][coord.x] >>= 1;
          }
        }

        pending = pendingNext;
      }

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
