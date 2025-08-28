import {ZstdDecompressionError} from "./index";
import {ZstdDecompressionErrorArgs} from "./ZstdDecompressionError";


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
