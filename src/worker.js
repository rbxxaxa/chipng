import { PNG } from 'pngjs';

// eslint-disable-next-line no-restricted-globals
addEventListener('message', e => {
    const { file } = e.data;
    console.log('file', file);
});