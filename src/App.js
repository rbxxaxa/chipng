import Container from 'react-bootstrap/Container';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { memo, useEffect } from 'react';
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker.js';

function LoadedImageFile(props) {
  const { entry, onRemove } = props;
  const [fileData, setFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageData, setImageData] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const reader = new FileReader();
    const worker = new Worker()


    worker.onmessage = (event) => {
      const { imageData } = event.data;

      // Create a canvas and get its 2D context
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set the canvas dimensions to the image dimensions
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      // Draw the image data onto the canvas
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL();

      setImageData(imageData);
      setDataUrl(dataUrl);
    };

    worker.postMessage({ file: entry.file });
  }, [entry]);

  if (isLoading) {
    return (
      <div>
        <div>{entry.file.name}</div>
        <div>Loading...</div>
        {dataUrl && <img src={dataUrl} alt="Loaded content" />}
      </div>
    );
  }

  return (
    <div>
      <div>{entry.file.name}</div>
      <button onClick={() => onRemove(entry.id)}>Remove</button>
    </div>
  );
}
LoadedImageFile = memo(LoadedImageFile);

function MyDropzone() {
  var [entries, setEntries] = useState([]);

  const onDrop = useCallback(acceptedFiles => {
    setEntries(prevState => [
      ...prevState,
      ...acceptedFiles.map(file => ({
        id: uuidv4(),
        file: file,
      })),
    ]);
  }, []);

  const onRemove = useCallback(id => {
    setEntries(prevState => prevState.filter(entry => entry.id !== id));
  }, []);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/png": [".png"],
    }
  });

  return (
    <div {...getRootProps()} style={{ width: "100vw", height: "100vh" }}>
      <input {...getInputProps()} />
      <button type="button" onClick={open}>
        Open File Dialog
      </button>
      {entries.map(entry => (
        <LoadedImageFile key={entry.id} entry={entry} onRemove={onRemove} />
      ))}
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