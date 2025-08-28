import type {MainModule} from "../../dist/zstd-wasm-node.js";
import {
    Nullable,
    nullptr,
    SIZE_OF_PTR,
    SIZE_OF_SIZE_T,
} from "./typings.js";


class ZstdInBufferView {
    /** Offset of the `const void* src` struct member. */
    static readonly #SRC_OFFSET = 0;

    /** Offset of the `size_t size` struct member. */
    static readonly #SIZE_OFFSET = SIZE_OF_PTR;

    /** Offset of the `size_t pos` struct member. */
    static readonly #POS_OFFSET = SIZE_OF_PTR + SIZE_OF_SIZE_T;

    /** Size of the `ZSTD_inBuffer_s` struct. */
    static readonly #STRUCT_SIZE = SIZE_OF_PTR + SIZE_OF_SIZE_T + SIZE_OF_SIZE_T;

    readonly #module: MainModule;

    readonly #heap: Uint8Array;

    readonly #heapView: DataView;

    readonly #ptr: number;

    readonly #bufferPtr: number;

    /**
     * @param module
     * @param ptr
     * @param bufferPtr
     * @param size
     * @throws {Error} if failed to allocate memory.
     */
    private constructor (module: MainModule, ptr: number, bufferPtr: number, size: number) {
        this.#module = module;
        this.#ptr = ptr;
        this.#bufferPtr = bufferPtr;

        // Emscripten does not define HEAPU8.buffer as ArrayBuffer in the generated types.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const heapBuffer = module.HEAPU8.buffer as ArrayBuffer;
        this.#heap = new Uint8Array(heapBuffer);

        this.#heapView = new DataView(heapBuffer);
        this.#heapView.setUint32(ptr + ZstdInBufferView.#SRC_OFFSET, bufferPtr, true);
        this.#heapView.setUint32(ptr + ZstdInBufferView.#SIZE_OFFSET, size, true);
        this.#heapView.setUint32(ptr + ZstdInBufferView.#POS_OFFSET, 0, true);
    }

    /**
     * Gets the base pointer of the `ZSTD_inBuffer_s` struct.
     *
     * @return The pointer.
     */
    get ptr (): number {
        return this.#ptr;
    }

    /**
     * Gets the size of the input buffer.
     * See `ZSTD_inBuffer_s.size` in the Zstandard API documentation.
     *
     * @return The size in bytes.
     */
    get size (): number {
        return this.#heapView.getUint32(this.#ptr + ZstdInBufferView.#SIZE_OFFSET, true);
    }

    /**
     * Gets the current position in the input buffer.
     * See `ZSTD_inBuffer_s.pos` in the Zstandard API documentation.
     *
     * @return The position in bytes.
     */
    get pos () {
        return this.#heapView.getUint32(this.#ptr + ZstdInBufferView.#POS_OFFSET, true);
    }

    /**
     * Creates a new ZstdInBufferView instance for reading input data.
     *
     * @param module
     * @param size of the input buffer to allocate.
     * @return The new instance, or null if allocation fails.
     */
    static create (module: MainModule, size: number): Nullable<ZstdInBufferView> {
        const viewPtr = module._malloc(ZstdInBufferView.#STRUCT_SIZE);
        if (nullptr === viewPtr) {
            console.error("Failed to allocate input buffer view struct");

            return null;
        }

        const srcPtr = module._malloc(size);
        if (nullptr === srcPtr) {
            console.error("Failed to allocate input buffer");
            module._free(viewPtr);

            return null;
        }

        return new ZstdInBufferView(module, viewPtr, srcPtr, size);
    }

    /**
     * Reads data into the input buffer.
     *
     * @param data
     */
    readFrom (data: Uint8Array) {
        this.#heap.set(data, this.#bufferPtr);
        this.#heapView.setUint32(this.#ptr + ZstdInBufferView.#POS_OFFSET, 0, true);
        this.#heapView.setUint32(this.#ptr + ZstdInBufferView.#SIZE_OFFSET, data.byteLength, true);
    }

    /**
     * Frees the allocated memories.
     */
    destroy () {
        this.#module._free(this.#bufferPtr);
        this.#module._free(this.#ptr);
    }
}


export default ZstdInBufferView;
