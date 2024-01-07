import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";
import { memo, useEffect, useRef } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./worker.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CloseButton } from "react-bootstrap";

// Create a worker pool
const workerPool = [];
const maxWorkers = Math.max(1, navigator.hardwareConcurrency - 1);

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
        if (e.data.error) {
          worker.busy = false;
          task.onImageProcessed(true, null);
          if (taskQueue.length > 0) {
            onProcessTaskWithWorker();
          }
        } else {
          worker.busy = false;
          const { dataUrl } = e.data;
          task.onImageProcessed(false, dataUrl);
          if (taskQueue.length > 0) {
            onProcessTaskWithWorker();
          }
        }
      };
      worker.postMessage(task.file);
    }
  }
}

function processTaskWithWorker(file, onImageProcessed) {
  taskQueue.push({ file, onImageProcessed });
  onProcessTaskWithWorker();
}

const exportImages = async (images, setIsExportInProgress) => {
  setIsExportInProgress(true);

  // Short delay here so that react has time to update the UI
  await new Promise((resolve) => setTimeout(resolve, 100));

  const entries = Object.entries(images);
  const validEntries = entries.filter(
    ([_id, entry]) => !entry.isInvalid && entry.isProcessed
  );

  if (validEntries.length === 1) {
    // If there's only one file, download it as a png
    const [_id, { filename, _dataUrl, _isProcessed, processedDataUrl }] =
      validEntries[0];
    const link = document.createElement("a");
    link.href = processedDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // If there's more than one file, proceed with creating a zip
    const zip = new JSZip();
    const filenames = {};

    validEntries.forEach(
      ([_id, { filename, _dataUrl, isProcessed, processedDataUrl }]) => {
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

        const base64Data = processedDataUrl.replace(
          /^data:image\/(png|jpg);base64,/,
          ""
        );
        zip.file(filename, base64Data, { base64: true });
      }
    );

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "images.zip");
  }

  setIsExportInProgress(false);
};

const ImageEntry = memo(function ImageEntry({
  id,
  dataUrl,
  fileName,
  isProcessed,
  isInvalid,
  processedDataUrl,
  removeImage,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.5em",
        marginTop: "0.5em",
        padding: "0.5em",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.4)",
        height: "4em",
      }}
    >
      <div height="4em">
        <img
          src={isProcessed ? processedDataUrl : dataUrl}
          alt={fileName}
          draggable="false"
          style={{
            width: "3em",
            height: "3em",
            objectFit: "cover",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.8)",
            marginRight: "1em",
            opacity: isProcessed ? 1 : 0.5,
          }}
        />

        <div style={{ display: "inline", alignItems: "center" }}>
          <span
            style={{
              textAlign: "left",
              whiteSpace: "nowrap",
              textDecoration: isInvalid ? "line-through" : "none",
            }}
          >
            {fileName}
          </span>
          {isInvalid && (
            <span
              style={{
                marginLeft: "10px",
                color: "red",
              }}
            >
              Cannot be processed
            </span>
          )}
        </div>
      </div>
      <CloseButton
        variant="white"
        style={{ paddingRight: "2em" }}
        height="1em"
        width="1em"
        onClick={() => removeImage(id)}
        aria-label="Remove"
      />
    </div>
  );
});

function App() {
  const [images, setImages] = useState({});
  const [isDragActive, setDragActive] = useState(false);
  const [isExportInProgress, setIsExportInProgress] = useState(false);

  const addImage = useCallback(
    (id, filename, dataUrl) => {
      setImages((prevState) => ({
        ...prevState,
        [id]: {
          filename,
          dataUrl,
          isProcessed: false,
          isInvalid: false,
          processedDataUrl: null,
        },
      }));
    },
    [setImages]
  );

  const removeImage = useCallback(
    (id) => {
      setImages((prevState) => {
        const newState = { ...prevState };
        delete newState[id];
        return newState;
      });
    },
    [setImages]
  );

  const imageCount = Object.keys(images).length;
  const processedImageCount = Object.values(images).filter(
    (image) => image.isProcessed
  ).length;
  const invalidImageCount = Object.values(images).filter(
    (image) => image.isInvalid
  ).length;
  const validImageCount = imageCount - invalidImageCount;

  const onImageProcessed = useCallback(
    (id, isInvalid, processedDataUrl) => {
      setImages((prevState) => {
        if (prevState[id]) {
          if (!isInvalid) {
            const newState = { ...prevState };
            newState[id].isProcessed = true;
            newState[id].processedDataUrl = processedDataUrl;
            return newState;
          } else {
            const newState = { ...prevState };
            newState[id].isProcessed = true;
            newState[id].isInvalid = true;
            newState[id].processedDataUrl = null;
            return newState;
          }
        } else {
          return prevState;
        }
      });
    },
    [setImages]
  );

  const onImageProcessedRef = useRef(onImageProcessed);
  // Need to store in a ref because onImageProcessed relies on an image and
  // images are processed asynchronously
  useEffect(() => {
    onImageProcessedRef.current = onImageProcessed;
  }, [onImageProcessed]);

  const onDrop = useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        const id = uuidv4();
        const dataUrl = URL.createObjectURL(file);
        addImage(id, file.name, dataUrl);
        processTaskWithWorker({ file: file }, (isInvalid, processedDataUrl) => {
          onImageProcessedRef.current(id, isInvalid, processedDataUrl);
        });
      });
    },
    [addImage]
  );

  const onExport = useCallback(() => {
    exportImages(images, setIsExportInProgress);
  }, [images, setIsExportInProgress]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/png": [".png"],
    },
  });

  useEffect(() => {
    const dragOver = (e) => {
      e.preventDefault();
      setDragActive(true);
    };

    const dragLeaveOrDrop = () => {
      setDragActive(false);
    };

    window.addEventListener("dragover", dragOver);
    window.addEventListener("dragleave", dragLeaveOrDrop);
    window.addEventListener("drop", dragLeaveOrDrop);

    return () => {
      window.removeEventListener("dragover", dragOver);
      window.removeEventListener("dragleave", dragLeaveOrDrop);
      window.removeEventListener("drop", dragLeaveOrDrop);
    };
  }, []);

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

      <div
        className={isDragActive ? "drag-blur" : ""}
        style={{
          transition: "filter 0.1s ease",
          filter: isDragActive ? "blur(5px)" : "none",
        }}
      >
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
              <a
                href="https://devforum.roblox.com/t/pixelfix-remove-the-black-edges-on-scaled-images/201802"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                [3]
              </a>
            </sup>
          </p>

          <div className="button-container">
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={open}
                aria-label="select .png files"
              >
                select .png files
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <span style={{ alignSelf: "center", margin: "0.5em" }}>
                and then
              </span>{" "}
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={onExport}
                aria-label="export"
                disabled={
                  isExportInProgress ||
                  validImageCount === 0 ||
                  processedImageCount !== imageCount
                }
              >
                {processedImageCount !== imageCount
                  ? `processing ${processedImageCount} / ${imageCount} images...`
                  : validImageCount === 0
                  ? "export!"
                  : invalidImageCount === 0
                  ? `export ${validImageCount} images!`
                  : `export ${validImageCount} images! (${invalidImageCount} invalid)`}
              </button>
            </div>

            <small className="text-muted italic">
              (you can also drag images into this window!)
            </small>
          </div>

          <div
            style={{ paddingTop: "2em", maxWidth: "800px", margin: "0 auto" }}
          >
            {Object.entries(images).map(
              ([id, { filename, dataUrl, isProcessed, isInvalid }]) => (
                <ImageEntry
                  key={id}
                  id={id}
                  dataUrl={dataUrl}
                  fileName={filename}
                  isProcessed={isProcessed}
                  isInvalid={isInvalid}
                  processedDataUrl={dataUrl}
                  removeImage={removeImage}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
