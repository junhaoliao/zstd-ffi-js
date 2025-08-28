import {ZstdDecompressionError} from "./index.js";
import {ZstdDecompressionErrorArgs} from "./ZstdDecompressionError.js";


interface ZstdDecompressionErrorWithDataArgs extends ZstdDecompressionErrorArgs {
    data: Uint8Array;
}

class ZstdDecompressionErrorWithData extends ZstdDecompressionError {
    data: Uint8Array;

    constructor (message: string, {code, data}: ZstdDecompressionErrorWithDataArgs) {
        super(message, {code});
        this.data = data;
    }

    override toString (): string {
        return `${super.toString()} (data.length: ${this.data.length})`;
    }
}


export default ZstdDecompressionErrorWithData;
