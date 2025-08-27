import type {MainModule} from "../dist/ZstdDecompressor-node.js";
import {nullptr} from "./typings.js";
import ZstdInBufferView from "./ZstdInBufferView.js";
import ZstdOutBufferView from "./ZstdOutBufferView.js";


// Zstandard return values
const ZSTD_CONTENTSIZE_UNKNOWN = -1n;
const ZSTD_CONTENTSIZE_ERROR = -2n;


class ZstdDecompressor {
    readonly #module: MainModule;

    readonly #heap: Uint8Array;

    readonly #DEC_STREAM_IN_SIZE: number;

    readonly #DEC_STREAM_OUT_SIZE: number;


    private constructor (module: MainModule) {
        this.#module = module;

        this.#DEC_STREAM_IN_SIZE = module._ZSTD_DStreamInSize();
        this.#DEC_STREAM_OUT_SIZE = module._ZSTD_DStreamOutSize();

        // Emscripten does not define HEAPU8.buffer as ArrayBuffer in the generated types.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.#heap = new Uint8Array(module.HEAPU8.buffer as ArrayBuffer);
    }

    /**
     * Initialize the ZSTD decompressor by loading the WASM module.
     *
     * @return A promise that resolves when the WASM module is loaded.
     * @throws {Error} If WebAssembly is not supported or initialization fails.
     */
    static async create () {
        if ("object" !== typeof WebAssembly) {
            throw new Error("WebAssembly support is required but not available");
        }

        try {
            // Load the appropriate WASM module based on environment.
            let module: MainModule;
            if ("undefined" !== typeof process) {
                // Node.js
                const wasmModule = await import("../dist/ZstdDecompressor-node.js");
                module = await wasmModule.default();
            } else {
                // Browser
                const wasmModule = await import("../dist/ZstdDecompressor-worker.js");
                module = await wasmModule.default();
            }

            return new ZstdDecompressor(module);
        } catch (e: unknown) {
            throw new Error(`Failed to initialize ZSTD decompressor: ${JSON.stringify(e)}`);
        }
    }

    /**
     * Decompress a compressed ZSTD buffer.
     *
     * @param dataArray The compressed data.
     * @param [uncompressedSize] The expected uncompressed size.
     * @return The decompressed data.
     * @throws {Error} if failed to allocate memory.
     */
    decompress (dataArray: Uint8Array, uncompressedSize = 0): Uint8Array {
        const compressedPtr = this.#module._malloc(dataArray.byteLength);
        if (nullptr === compressedPtr) {
            throw new Error("Failed to allocate memory for compressed data");
        }

        try {
            this.#heap.set(dataArray, compressedPtr);

            // If uncompressed size is not provided, try to determine it
            if (0 === uncompressedSize) {
                const sizeResult = this.#module._ZSTD_findDecompressedSize(
                    compressedPtr,
                    dataArray.byteLength
                );

                if (
                    sizeResult === ZSTD_CONTENTSIZE_UNKNOWN ||
                    sizeResult === ZSTD_CONTENTSIZE_ERROR
                ) {
                    // Content size unknown, use streaming decompression
                    return this.#decompressStreamingFallback(dataArray);
                }
                uncompressedSize = Number(sizeResult);
            }

            const uncompressedPtr = this.#module._malloc(uncompressedSize);
            if (nullptr === uncompressedPtr) {
                throw new Error("Failed to allocate memory for uncompressed data");
            }

            try {
                const ret = this.#module._ZSTD_decompress(
                    uncompressedPtr,
                    uncompressedSize,
                    compressedPtr,
                    dataArray.byteLength
                );

                return this.#heap.slice(uncompressedPtr, uncompressedPtr + ret);
            } finally {
                this.#module._free(uncompressedPtr);
            }
        } finally {
            this.#module._free(compressedPtr);
        }
    }

    /**
     * Streaming decompression of ZSTD data.
     *
     * @param dataArrayIter An iterable of compressed data chunks.
     * @throws {Error} If the decompressor is not initialized or heap is not available.
     * @yields Decompressed data chunks as Uint8Array.
     */
    *decompressStreaming (dataArrayIter: Iterable<Uint8Array>): Generator<Uint8Array> {
        const dCtxPtr = this.#module._ZSTD_createDCtx();
        if (nullptr === dCtxPtr) {
            throw new Error("Failed to create ZSTD decompression context");
        }

        const inBufferView = ZstdInBufferView.create(this.#module, this.#DEC_STREAM_IN_SIZE);
        if (null === inBufferView) {
            this.#module._ZSTD_freeDCtx(dCtxPtr);
            throw new Error("Failed to create input buffer");
        }

        const outBufferView = ZstdOutBufferView.create(this.#module, this.#DEC_STREAM_OUT_SIZE);
        if (null === outBufferView) {
            inBufferView.destroy();
            this.#module._ZSTD_freeDCtx(dCtxPtr);
            throw new Error("Failed to create output buffer");
        }

        try {
            for (const dataArray of dataArrayIter) {
                yield* this.#processStreamingChunk(dCtxPtr, dataArray, inBufferView, outBufferView);
            }
        } finally {
            outBufferView.destroy();
            inBufferView.destroy();
            this.#module._ZSTD_freeDCtx(dCtxPtr);
        }
    }

    /**
     * Process a single streaming chunk.
     *
     * @param dCtxPtr Decompression context pointer.
     * @param inDataArray The compressed data chunk.
     * @param inBufferView
     * @param outBufferView
     * @throws {Error} If processing fails.
     * @yields Decompressed data chunks as Uint8Array.
     */
    *#processStreamingChunk (
        dCtxPtr: number,
        inDataArray: Uint8Array,
        inBufferView: ZstdInBufferView,
        outBufferView: ZstdOutBufferView
    ): Generator<Uint8Array> {
        let inDataPos = 0;
        while (inDataPos < inDataArray.byteLength) {
            const toCopy = Math.min(inDataArray.byteLength - inDataPos, this.#DEC_STREAM_IN_SIZE);
            const inDataSliceEnd = inDataPos + toCopy;
            const inDataSlice = inDataArray.subarray(inDataPos, inDataSliceEnd);
            inDataPos = inDataSliceEnd;

            inBufferView.readFrom(inDataSlice);
            let hasError = false;
            while (false === hasError && inBufferView.pos <= inBufferView.size) {
                outBufferView.reset();
                const ret = this.#module._ZSTD_decompressStream(
                    dCtxPtr,
                    outBufferView.ptr,
                    inBufferView.ptr
                );

                if (this.#module._ZSTD_isError(ret)) {
                    const errorNamePtr = this.#module._ZSTD_getErrorName(ret);
                    console.error(`ZSTD streaming decompression error: ${ret} - ${
                        this.#module.UTF8ToString(errorNamePtr)}`);
                    hasError = true;
                }

                if (0 < outBufferView.pos) {
                    yield outBufferView.dump();
                }
            }
        }
    }

    /**
     * Fallback method for streaming decompression when content size is unknown.
     *
     * @param dataArray The compressed data as a Uint8Array.
     * @return The decompressed data as a Uint8Array.
     * @throws {Error} If decompression fails.
     */
    #decompressStreamingFallback (dataArray: Uint8Array): Uint8Array {
        const parts = Array.from(this.decompressStreaming([dataArray]));
        if (1 === parts.length) {
            return parts[0] as Uint8Array;
        }

        // Concatenate all parts.
        const totalSize = parts.reduce((sum, p) => sum + p.byteLength, 0);
        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const p of parts) {
            result.set(p, offset);
            offset += p.byteLength;
        }

        return result;
    }
}


export default ZstdDecompressor;
