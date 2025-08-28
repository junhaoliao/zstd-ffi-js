// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    let HEAPU8: any;
    /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index.
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */
    function UTF8ToString(ptr: number, maxBytesToRead?: number | undefined, ignoreNul?: boolean | undefined): string;
}
interface WasmModule {
  _ZSTD_isError(_0: number): number;
  _ZSTD_getErrorName(_0: number): number;
  _ZSTD_createDCtx(): number;
  _ZSTD_freeDCtx(_0: number): number;
  _ZSTD_findDecompressedSize(_0: number, _1: number): BigInt;
  _ZSTD_decompress(_0: number, _1: number, _2: number, _3: number): number;
  _ZSTD_DStreamInSize(): number;
  _ZSTD_DStreamOutSize(): number;
  _ZSTD_decompressStream(_0: number, _1: number, _2: number): number;
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export type MainModule = WasmModule & typeof RuntimeExports;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
