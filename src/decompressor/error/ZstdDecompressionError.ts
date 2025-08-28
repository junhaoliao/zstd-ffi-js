import {ZSTD_FFI_JS_ERROR} from "./constants";


interface ZstdDecompressionErrorArgs extends ErrorOptions {
    code: ZSTD_FFI_JS_ERROR;
}

class ZstdDecompressionError extends Error {
    code: ZSTD_FFI_JS_ERROR;

    constructor (message: string, {code}: ZstdDecompressionErrorArgs) {
        super(message);
        this.code = code;
    }

    override toString () {
        return `${super.toString()} (code: ${this.code})`;
    }
}


export type {ZstdDecompressionErrorArgs};
export default ZstdDecompressionError;
