import type {MainModule} from "../../dist/zstd-wasm-node.js";
import {concatChunks} from "../utils";
import {
    ZSTD_FFI_JS_ERROR,
    ZstdDecompressionError,
} from "./error";
import ZstdDecompressionErrorWithData from "./error/ZstdDecompressionErrorWithData";
import {nullptr} from "./typings.js";
import ZstdInBufferView from "./ZstdInBufferView.js";
import ZstdOutBufferView from "./ZstdOutBufferView.js";


// Zstandard API return values
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
            // Load the appropriate WASM module based on the environment.
            let module: MainModule;
            if ("undefined" !== typeof process) {
                // Node.js
                const wasmModule = await import("../../dist/zstd-wasm-node.js");
                module = await wasmModule.default();
            } else {
                // Browser
                const wasmModule = await import("../../dist/zstd-wasm-worker.js");
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
     * @throws {Error} If failed to allocate memory.
     * @throws {ZstdDecompressionError} if reading input fails.
     * @yields Decompressed data chunks as Uint8Array.
     */
    *decompressStream (dataArrayIter: Iterable<Uint8Array>): Generator<Uint8Array> {
        const {dCtxPtr, inBufferView, outBufferView} = this.#initializeDecompressionContext();

        try {
            let numReadSizeHint = 0;
            for (const inDataArray of dataArrayIter) {
                let inDataPos = 0;
                while (inDataPos < inDataArray.byteLength) {
                    const toCopy = Math.min(
                        inDataArray.byteLength - inDataPos,
                        this.#DEC_STREAM_IN_SIZE
                    );
                    const inDataSliceEnd = inDataPos + toCopy;
                    const inDataSlice = inDataArray.subarray(inDataPos, inDataSliceEnd);
                    inDataPos = inDataSliceEnd;
                    numReadSizeHint = yield* this.#processStreamingChunk(
                        dCtxPtr,
                        inDataSlice,
                        inBufferView,
                        outBufferView
                    );
                }
            }
            if (0 !== numReadSizeHint) {
                throw new ZstdDecompressionError(
                    "Premature end",
                    {code: ZSTD_FFI_JS_ERROR.READ_ERROR}
                );
            }
        } finally {
            outBufferView.destroy();
            inBufferView.destroy();
            this.#module._ZSTD_freeDCtx(dCtxPtr);
        }
    }

    /**
     * Initializes the decompression context by creating the necessary resources for decompression.
     *
     * @return An object containing:
     * - dCtxPtr: The pointer to the decompression context.
     * - inBufferView: The input buffer view, wrapping a memory-backed buffer.
     * - outBufferView: The output buffer view, wrapping a memory-backed buffer.
     * @throws {Error} If failed to allocate memory.
     */
    #initializeDecompressionContext () {
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

        return {dCtxPtr, inBufferView, outBufferView};
    }

    /**
     * Process a single streaming chunk.
     *
     * @param dCtxPtr Decompression context pointer.
     * @param inDataArray The compressed data chunk.
     * @param inBufferView
     * @param outBufferView
     * @return Recommended read size of the next input chunk. When non-zero, more data is expected.
     * @throws {ZstdDecompressionError} if decoding fails.
     * @yields Decompressed data chunks as Uint8Array.
     */
    *#processStreamingChunk (
        dCtxPtr: number,
        inDataArray: Uint8Array,
        inBufferView: ZstdInBufferView,
        outBufferView: ZstdOutBufferView
    ): Generator<Uint8Array, number> {
        let ret = 0;

        inBufferView.readFrom(inDataArray);
        while (inBufferView.pos < inBufferView.size) {
            outBufferView.reset();
            ret = this.#module._ZSTD_decompressStream(
                dCtxPtr,
                outBufferView.ptr,
                inBufferView.ptr
            );

            if (0 < outBufferView.pos) {
                yield outBufferView.dump();
            }

            if (this.#module._ZSTD_isError(ret)) {
                const errorNamePtr = this.#module._ZSTD_getErrorName(ret);
                throw new ZstdDecompressionError(this.#module.UTF8ToString(errorNamePtr), {
                    code: ZSTD_FFI_JS_ERROR.DECODING_ERROR,
                });
            }
        }

        return ret;
    }

    /**
     * Fallback method for streaming decompression when content size is unknown.
     *
     * @param dataArray The compressed data as a Uint8Array.
     * @return The decompressed data as a Uint8Array.
     * @throws {ZstdDecompressionError} If streaming decompression fails.
     */
    #decompressStreamingFallback (dataArray: Uint8Array): Uint8Array {
        const parts: Uint8Array[] = [];
        try {
            for (const chunk of this.decompressStream([dataArray])) {
                parts.push(chunk);
            }
        } catch (e: unknown) {
            const message = e instanceof ZstdDecompressionError ?
                e.message :
                "Unknown error";
            const code = e instanceof ZstdDecompressionError ?
                e.code :
                ZSTD_FFI_JS_ERROR.DECODING_ERROR;
            const partial = concatChunks(parts);

            throw new ZstdDecompressionErrorWithData(
                `Decompression failed: ${message}`,
                {
                    cause: e,
                    code: code,
                    data: partial,
                }
            );
        }

        // No error → concatenate all parts
        return concatChunks(parts);
    }
}


export default ZstdDecompressor;
