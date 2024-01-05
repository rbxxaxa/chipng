import Container from "react-bootstrap/Container";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { memo, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker.js";
import { on } from "process";
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

function ImageInput({ addImage, removeImage }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        const id = uuidv4();
        processTaskWithWorker({ file: file }, (dataUrl) => {
          addImage(id, file.name, dataUrl);
        });
      });
    },
    [addImage]
  );

  const onRemove = useCallback((id) => {
    removeImage(id);
  }, []);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/png": [".png"],
    },
  });

  return (
    <div {...getRootProps()} style={{ width: "100vw", height: "100vh" }}>
      <input {...getInputProps()} />
      <button type="button" onClick={open}>
        Open File Dialog
      </button>
    </div>
  );
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

function App() {
  const [images, setImages] = useState({});

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

  return (
    <Container fluid className="p-3">
      <ImageInput addImage={addImage} removeImage={removeImage} />
      <button onClick={onExport}>Export</button>
    </Container>
  );
}

export default App;
