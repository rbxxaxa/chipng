import Container from "react-bootstrap/Container";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { memo, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Create a worker pool
const workerPool = [];
const maxWorkers = Math.max(1, navigator.hardwareConcurrency - 1);

const images = [];

for (let i = 0; i < maxWorkers; i++) {
  const worker = new Worker();
  workerPool.push(worker);
}

let taskQueue = [];
function onProcessTaskWithWorker() {
  const worker = workerPool.find((worker) => !worker.busy);

  if (worker) {
    let task = taskQueue.shift();
    if (task) {
      worker.busy = true;
      worker.onmessage = (e) => {
        worker.busy = false;

        const { dataUrl } = e.data;
        task.setDataUrl(dataUrl);

        console.log("tasks left: ", taskQueue.length);
        if (taskQueue.length > 0) {
          onProcessTaskWithWorker();
        }
      };
      worker.postMessage(task.file);
    }
  }
}

function processTaskWithWorker(file, setDataUrl) {
  taskQueue.push({ file, setDataUrl });
  onProcessTaskWithWorker();
}

function exportImages(images) {
  const zip = new JSZip();
  const filenames = {};

  Object.entries(images).forEach(([id, { filename, dataUrl }]) => {
    const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");

    // Check for duplicate filenames
    if (filenames[filename]) {
      const dotIndex = filename.lastIndexOf(".");
      const name = filename.substring(0, dotIndex);
      const extension = filename.substring(dotIndex);
      filename = `${name}(${filenames[filename]})${extension}`;
      filenames[filename]++;
    } else {
      filenames[filename] = 1;
    }

    zip.file(filename, base64Data, { base64: true });
  });

  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, "images.zip");
  });
}

function ImageEntry({ imageUrl, fileName, removeImage }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1em",
      }}
    >
      <img
        src={imageUrl}
        alt={fileName}
        style={{ width: "100px", height: "100px", objectFit: "cover" }}
      />
      <span>{fileName}</span>
      <button onClick={() => removeImage(fileName)}>Remove</button>
    </div>
  );
}

function App() {
  const [images, setImages] = useState({});
  const [isDragActive, setDragActive] = useState(false);

  const addImage = useCallback((id, filename, dataUrl) => {
    setImages((prevState) => ({ ...prevState, [id]: { filename, dataUrl } }));
  }, []);

  const removeImage = useCallback((id) => {
    setImages((prevState) => {
      const newState = { ...prevState };
      delete newState[id];
      return newState;
    });
  }, []);

  const onExport = useCallback(() => {
    exportImages(images);
  }, [images]);

  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        const id = uuidv4();
        processTaskWithWorker({ file: file }, (dataUrl) => {
          addImage(id, file.name, dataUrl);
        });
      });
      setDragActive(false);
    },
    [addImage, setDragActive]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragOver: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/png": [".png"],
    },
  });

  return (
    <div>
      {isDragActive && (
        <div className="drag-text text-center">
          <span className="red-text display-1">血</span>
          <br />
          <span className="display-6"> drag .png files here! </span>
        </div>
      )}

      <div
        {...getRootProps()}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: isDragActive ? 1 : -1,
        }}
      >
        <input {...getInputProps()} />
      </div>

      <div className={isDragActive ? "drag-blur" : ""}>
        <div class="container-md">
          <h1 className="display-1 text-center title" aria-label="chipng">
            <span className="red-text">血chi</span>png
          </h1>
          <p className="text-center display-6" style={{ marginBottom: "1em" }}>
            a tool for <span className="red-text bold-text">bleeding</span>{" "}
            pixels
            <sup>
              <a
                href="https://medium.com/roblox-development/fixing-images-in-roblox-ui-to-look-good-2e0a7880b1ec"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                [1]
              </a>
              <a
                href="https://github.com/urraka/alpha-bleeding"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                [2]
              </a>
            </sup>
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={open}
            aria-label="select .png files"
          >
            select .png files
          </button>
          or simply drag them into this window.
          <br />
          afterwards
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExport}
            aria-label="export"
          >
            export
          </button>{" "}
          them into your computer.
          {/* <div
            className="container.fluid"
            style={{
              backgroundColor: "#FFFFFF",
              height: "70vh",
              overflowY: "auto",
              minHeight: "400px",
              pointerEvents: "none",
            }}
          ></div> */}
          {/* {Object.entries(images).map(([id, { filename, dataUrl }]) => (
              <ImageEntry
                key={id}
                imageUrl={dataUrl}
                fileName={filename}
                removeImage={removeImage}
              />
            ))} */}
        </div>
      </div>
    </div>
  );
}

export default App;
