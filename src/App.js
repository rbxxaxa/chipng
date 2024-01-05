import Container from "react-bootstrap/Container";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { memo, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker.js";
import { on } from "process";

// Create a worker pool
const workerPool = [];
const maxWorkers = navigator.hardwareConcurrency - 1;

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

function LoadedImageFile(props) {
  const { entry, onRemove } = props;
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const reader = new FileReader();

    processTaskWithWorker({ file: entry.file }, setDataUrl);
  }, [entry]);

  if (!dataUrl) {
    return (
      <div>
        <div>{entry.file.name}</div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div>{entry.file.name}</div>
      <button onClick={() => onRemove(entry.id)}>Remove</button>
      {dataUrl && (
        <img
          src={dataUrl}
          alt="Loaded content"
          style={{ border: "1px solid black" }}
        />
      )}
    </div>
  );
}
LoadedImageFile = memo(LoadedImageFile);

function MyDropzone() {
  var [entries, setEntries] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setEntries((prevState) => [
      ...prevState,
      ...acceptedFiles.map((file) => ({
        id: uuidv4(),
        file: file,
      })),
    ]);
  }, []);

  const onRemove = useCallback((id) => {
    setEntries((prevState) => prevState.filter((entry) => entry.id !== id));
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
      <Row xs={1} md={4} className="g-4">
        {entries.map((entry) => (
          <Col>
            <LoadedImageFile key={entry.id} entry={entry} onRemove={onRemove} />
          </Col>
        ))}
      </Row>
    </div>
  );
}

function BasicExample() {
  return (
    <Container className="p-3">
      <MyDropzone />
    </Container>
  );
}

export default BasicExample;
