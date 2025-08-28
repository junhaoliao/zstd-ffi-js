# ZSTD FFI for JavaScript

A JavaScript/TypeScript library for working with Zstandard (zstd) compressed data using Webassembly.
Currently, it supports decompression with compression support planned for a future release.

## Features

- Fast Zstandard decompression using the native Zstandard C library compiled to WebAssembly
- Works in both browser and Node.js environments
- Supports both regular and streaming ZSTD formats, with automatic handling for decompressing 
  streaming format as a fallback when content size is not embedded in the compressed data
- TypeScript support with full type definitions
- Modular design allowing for future expansion to include compression support
- Comprehensive error handling with partial data recovery capabilities

## Installation

```bash
npm install @yscope/zstd-ffi-js
```

## Usage

### Basic Decompression

```javascript
import { ZstdDecompressor } from '@yscope/zstd-ffi-js';

// Create and initialize the decompressor
const decompressor = await ZstdDecompressor.create();

// Decompress data (works with both regular and streaming format)
const compressedData = new Uint8Array([/* your compressed data */]);
const decompressedData = decompressor.decompress(compressedData);
```

### Streaming Decompression

```javascript
import { ZstdDecompressor } from '@yscope/zstd-ffi-js';

const decompressor = await ZstdDecompressor.create();

const compressedChunks = [
  new Uint8Array([/* chunk 1 */]),
  new Uint8Array([/* chunk 2 */]),
  // ... more chunks
];

const decompressedChunks = [];
for (const chunk of decompressor.decompressStream(compressedChunks)) {
  decompressedChunks.push(chunk);
}

// Concatenate all chunks if needed
const fullData = new Uint8Array(decompressedChunks.reduce((acc, chunk) => acc + chunk.length, 0));
let offset = 0;
for (const chunk of decompressedChunks) {
  fullData.set(chunk, offset);
  offset += chunk.length;
}
```

### Error Handling with Partial Data Recovery

When decompression fails, you can recover any successfully processed data:

```javascript
import { 
  ZstdDecompressor, 
  ZstdDecompressionErrorWithData 
} from '@yscope/zstd-ffi-js';

const decompressor = await ZstdDecompressor.create();
const incompleteCompressedData = new Uint8Array([/* incomplete data */]);

try {
  const result = decompressor.decompress(incompleteCompressedData);
  console.log('Decompression successful:', result);
} catch (error) {
  if (error instanceof ZstdDecompressionErrorWithData) {
    console.log('Partial data recovered:', error.data);
    console.log('Error code:', error.code);
  } else {
    console.error('Decompression failed:', error);
  }
}
```

### Complete Example

```javascript
import { readFileSync } from 'node:fs';
import { ZstdDecompressor } from '@yscope/zstd-ffi-js';

const main = async () => {
    const decompressor = await ZstdDecompressor.create();
    const compressedData = readFileSync('./file.zst');
    const decompressedData = decompressor.decompress(compressedData);
    console.log(new TextDecoder().decode(decompressedData));
};

await main();
```

## Building from Source

### Build Requirements

Before building the library, ensure you have the following requirements installed:

- **Python** 3.10 or higher
- **Task** 3.40 or higher ([installation instructions](https://taskfile.dev/installation/))
- **CMake** 3.16 or higher
- **Git**
- **Node.js** and **npm** (latest LTS version recommended)

The build process will automatically download and set up the Emscripten SDK, so you don't need to install it separately.

### Building

To build the library from source:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

This will use Task to:
1. Download and set up Emscripten SDK
2. Download Zstandard library
3. Compile the Zstandard library with Emscripten to WebAssembly
4. Generate separate WebAssembly modules for Node.js and browser environments
5. Compile TypeScript files

## Future Compression Support

This library currently only supports decompression. Compression support is planned for a future release.

## API

### ZstdDecompressor

#### `static create(): Promise<ZstdDecompressor>`

Initialize the ZSTD decompressor by loading the WASM module. Returns a promise that resolves when the module is loaded.
Automatically loads the appropriate WebAssembly module for either Node.js or browser environments.

#### `decompress(dataArray: Uint8Array, uncompressedSize?: number): Uint8Array`

Decompress a compressed ZSTD buffer. If `uncompressedSize` is not provided, it will be determined automatically. If the
content size is not embedded in the compressed data (including streaming format), it will automatically fall back to
streaming decompression internally.

In case of decompression failure with partial data processed, a `ZstdDecompressionErrorWithData` will be thrown which
contains the partially decompressed data.

#### `decompressStream(dataArrayIter: Iterable<Uint8Array>): Generator<Uint8Array>`

Streaming decompression of ZSTD data. Takes an iterable of compressed data chunks and returns a generator that yields
decompressed data chunks.

Throws `ZstdDecompressionError` or `ZstdDecompressionErrorWithData` on failure.

## Error Handling

### `ZstdDecompressionError`

Base error class for decompression failures.

### `ZstdDecompressionErrorWithData`

Extended error class that includes partially decompressed data when available. This allows recovery of any successfully
processed data even when decompression fails.

Properties:
- `message`: Error message
- `code`: Error code from `ZSTD_FFI_JS_ERROR`
- `data`: Partially decompressed data (Uint8Array)
- `cause`: Original error that caused the failure (if available)

## Future Compression API

Compression functionality will be added in a future release with APIs such as:

- `ZstdCompressor`: A class for compressing data
- `compress(dataArray: Uint8Array, compressionLevel?: number): Uint8Array`: Compress data with an optional compression
  level
- `compressStream(dataArrayIter: Iterable<Uint8Array>, compressionLevel?: number): Generator<Uint8Array>`: Streaming
  compression of data

This library currently only supports decompression. Compression support is planned for a future release. The library has
been structured to easily accommodate compression functionality when it becomes available.

## Supported Environments

- Node.js (CommonJS and ES modules)
- Modern browsers (with ES module support)
- Web Workers

The library automatically loads the appropriate WebAssembly module for each environment at runtime.

## Release Process

To create a new release:

1. Update the version in `package.json`
2. Create a new GitHub release with a tag that matches the version in `package.json` (e.g., `v1.2.3`)
3. The GitHub Actions workflow will automatically publish the new version to npm

You can also manually publish a release by running:
```bash
npm run release
```

Note: This command will only work if there are no uncommitted changes in the repository.

## License

Apache-2.0