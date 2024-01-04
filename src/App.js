import Container from 'react-bootstrap/Container';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { memo, useEffect } from 'react';
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker.js';

function LoadedImageFile(props) {
  const { entry, onRemove } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const reader = new FileReader();
    const worker = new Worker()

    worker.onmessage = (event) => {
      const { dataUrl } = event.data;
      setDataUrl(dataUrl);
      setIsLoading(false);
    };

    worker.postMessage({ file: entry.file });
  }, [entry]);

  if (isLoading) {
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
      {dataUrl && <img src={dataUrl} alt="Loaded content" style={{ border: '1px solid black' }} />}
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