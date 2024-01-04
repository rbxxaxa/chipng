import Container from 'react-bootstrap/Container';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

function MyDropzone() {
  var [files, setFiles] = useState([]);
  const onDrop = useCallback(acceptedFiles => {
    setFiles(prevState => [...prevState, ...acceptedFiles]);
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/png': [],
    },
    onDrop,
  })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {
        isDragActive ?
          <p>Drop the files here ...</p> :
          <p>Drag 'n' drop some files here, or click to select files</p>
      }
    </div>
  )
}

function BasicExample() {
  console.log("BasicExample");
  return (
    <Container className="p-3">
      <MyDropzone />
    </Container>
  );
}

export default BasicExample;