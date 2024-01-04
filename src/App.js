import Container from "react-bootstrap/Container";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { memo, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker.js";

// Create a worker pool
const workerPool = [];
const maxWorkers = 128; // Maximum number of concurrent workers

for (let i = 0; i < maxWorkers; i++) {
  const worker = new Worker();
  workerPool.push(worker);
}

function processTaskWithWorker(task, setDataUrl) {
  // Find an idle worker
  const worker = workerPool.find((worker) => !worker.busy);

  console.log("finding worker...");
  if (worker) {
    // Mark the worker as busy
    worker.busy = true;

    // Listen for the worker to finish processing the task
    worker.onmessage = (e) => {
      // Mark the worker as idle
      worker.busy = false;
      console.log(worker.busy);

      const { dataUrl } = e.data;
      setDataUrl(dataUrl);
    };

    // Process the task with the worker
    worker.postMessage(task);
  } else {
    // All workers are busy, retry after a delay
    setTimeout(() => processTaskWithWorker(task, setDataUrl), 50);
  }
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

  console.log(dataUrl);

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
