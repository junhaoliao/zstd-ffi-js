import type {MainModule} from "../../dist/zstd-wasm-node.js";
import {nullptr} from "./typings.js";
import ZstdInBufferView from "./ZstdInBufferView.js";
import ZstdOutBufferView from "./ZstdOutBufferView.js";


/**
 * Initializes a decompression context.
 *
 * @param module
 * @return An object containing the allocated decompression context.
 * @throws {Error} If failed to allocate memory.
 */
const initializeDecompressionContext = (module: MainModule) => {
    const dCtxPtr = module._ZSTD_createDCtx();
    if (nullptr === dCtxPtr) {
        throw new Error("Failed to create ZSTD decompression context");
    }

    const inBufferView = ZstdInBufferView.create(module, module._ZSTD_DStreamInSize());
    if (null === inBufferView) {
        module._ZSTD_freeDCtx(dCtxPtr);
        throw new Error("Failed to create input buffer");
    }

    const outBufferView = ZstdOutBufferView.create(module, module._ZSTD_DStreamOutSize());
    if (null === outBufferView) {
        inBufferView.destroy();
        module._ZSTD_freeDCtx(dCtxPtr);
        throw new Error("Failed to create output buffer");
    }

    return {dCtxPtr, inBufferView, outBufferView};
};

/**
 * Destroys the given decompression context.
 *
 * @param module
 * @param context
 * @param context.dCtxPtr
 * @param context.inBufferView
 * @param context.outBufferView
 */
const destroyDecompressionContext = (
    module: MainModule,
    {dCtxPtr, inBufferView, outBufferView}: {
        dCtxPtr: number;
        inBufferView: ZstdInBufferView;
        outBufferView: ZstdOutBufferView;
    }
) => {
    outBufferView.destroy();
    inBufferView.destroy();
    module._ZSTD_freeDCtx(dCtxPtr);
};

export {
    destroyDecompressionContext,
    initializeDecompressionContext,
};
