import type {MainModule} from "../dist/ZstdDecompressor-node.js";
import {
    Nullable,
    nullptr,
    SIZE_OF_PTR,
    SIZE_OF_SIZE_T,
} from "./typings.js";


class ZstdOutBufferView {
    /** Offset of the `void* dst` struct member. */
    static readonly #DST_OFFSET = 0;

    /** Offset of the `size_t size` struct member. */
    static readonly #SIZE_OFFSET = SIZE_OF_PTR;

    /** Offset of the `size_t pos` struct member. */
    static readonly #POS_OFFSET = SIZE_OF_PTR + SIZE_OF_SIZE_T;

    /** Size of the `ZSTD_outBuffer_s` struct. */
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
    private constructor (module: MainModule, ptr:number, bufferPtr: number, size: number) {
        this.#module = module;
        this.#ptr = ptr;
        this.#bufferPtr = bufferPtr;

        // Emscripten does not define HEAPU8.buffer as ArrayBuffer in the generated types.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const heapBuffer = module.HEAPU8.buffer as ArrayBuffer;
        this.#heap = new Uint8Array(heapBuffer);

        this.#heapView = new DataView(heapBuffer);
        this.#heapView.setUint32(ptr + ZstdOutBufferView.#DST_OFFSET, bufferPtr, true);
        this.#heapView.setUint32(ptr + ZstdOutBufferView.#SIZE_OFFSET, size, true);
        this.#heapView.setUint32(ptr + ZstdOutBufferView.#POS_OFFSET, 0, true);
    }

    /**
     * Gets the base pointer of the `ZSTD_outBuffer_s` struct.
     *
     * @return The pointer.
     */
    get ptr ():number {
        return this.#ptr;
    }

    /**
     * Gets the position in output buffer where writing stopped.
     * See `ZSTD_outBuffer_s.pos` in the Zstandard API documentation.
     *
     * @return The position in bytes.
     */
    get pos () {
        return this.#heapView.getUint32(this.#ptr + ZstdOutBufferView.#POS_OFFSET, true);
    }

    /**
     * Creates a new ZstdOutBufferView instance for writing output data.
     *
     * @param module
     * @param size of the output buffer to allocate.
     * @return The new instance, or null if allocation fails.
     */
    static create (module: MainModule, size: number): Nullable<ZstdOutBufferView> {
        const viewPtr = module._malloc(ZstdOutBufferView.#STRUCT_SIZE);
        if (nullptr === viewPtr) {
            console.error("Failed to allocate output buffer view struct");

            return null;
        }

        const bufferPtr = module._malloc(size);
        if (nullptr === bufferPtr) {
            console.error("Failed to allocate output buffer");
            module._free(viewPtr);

            return null;
        }

        return new ZstdOutBufferView(module, viewPtr, bufferPtr, size);
    }

    /**
     * Dumps the current content of the output buffer up to the current position.
     *
     * @return A array containing the data from the output buffer.
     */
    dump (): Uint8Array {
        return this.#heap.slice(this.#bufferPtr, this.#bufferPtr + this.pos);
    }

    /**
     * Resets the position to zero.
     */
    reset () {
        this.#heapView.setUint32(this.#ptr + ZstdOutBufferView.#POS_OFFSET, 0, true);
    }

    /**
     * Frees the allocated memories.
     */
    destroy () {
        this.#module._free(this.#bufferPtr);
        this.#module._free(this.#ptr);
    }
}


export default ZstdOutBufferView;
