# ZSTD FFI for JavaScript

A JavaScript/TypeScript library for working with Zstandard (zstd) compressed data using Webassembly.
Currently, it supports decompression with compression support planned for a future release.

## Features

- Fast Zstandard compression/decompression using the native Zstandard C library compiled to WebAssembly.
- Works in both browser and Node.js environments
- Supports both regular and streaming ZSTD formats, with automatic handling for decompressing 
  streaming format as a fallback when content size is not embedded in the compressed data.
- TypeScript support with full type definitions
- Modular design allowing for future expansion to include compression support

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
for (const chunk of decompressor.decompressStreaming(compressedChunks)) {
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

This library currently only supports decompression. Compression support is planned for a future release. The library has been structured to easily accommodate compression functionality when it becomes available.

## API

### ZstdDecompressor

#### `static create(): Promise<ZstdDecompressor>`

Initialize the ZSTD decompressor by loading the WASM module. Returns a promise that resolves when the module is loaded. Automatically loads the appropriate WebAssembly module for either Node.js or browser environments.

#### `decompress(dataArray: Uint8Array, uncompressedSize?: number): Uint8Array`

Decompress a compressed ZSTD buffer. If `uncompressedSize` is not provided, it will be determined automatically. If the content size is not embedded in the compressed data (including streaming format), it will automatically fall back to streaming decompression internally.

#### `decompressStreaming(dataArrayIter: Iterable<Uint8Array>): Generator<Uint8Array>`

Streaming decompression of ZSTD data. Takes an iterable of compressed data chunks and returns a generator that yields decompressed data chunks.

## Future Compression API

Compression functionality will be added in a future release with APIs such as:

- `ZstdCompressor`: A class for compressing data
- `compress(dataArray: Uint8Array, compressionLevel?: number): Uint8Array`: Compress data with an optional compression level
- `compressStreaming(dataArrayIter: Iterable<Uint8Array>, compressionLevel?: number): Generator<Uint8Array>`: Streaming compression of data

## Supported Environments

- Node.js (CommonJS and ES modules)
- Modern browsers (with ES module support)
- Web Workers

The library automatically loads the appropriate WebAssembly module for each environment at runtime.

## License

Apache-2.0