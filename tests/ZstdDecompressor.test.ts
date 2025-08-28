import * as fs from "node:fs";
import {constants as HTTP_CONSTANTS} from "node:http2";
import * as https from "node:https";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";

import * as tar from "tar";
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ZSTD_FFI_JS_ERROR,
    ZstdDecompressionErrorWithData,
} from "../src/decompressor/error/index.js";
import {ZstdDecompressor} from "../src/decompressor/index.js";
import {concatChunks} from "../src/utils.js";


const SIMPLE_STRING = "Hello, world!";
const TEST_DATA_DIR = path.join(os.tmpdir(), "zstd-ffi-js-test-data");

/**
 * List of test files that populated after the download.
 */
let testFiles: string[];

/**
 * Create an iterable from a Uint8Array.
 *
 * @param data
 * @param chunkSize
 * @yields Uint8Array chunks.
 */
const createIterable = function *(data: Uint8Array, chunkSize = 1024): Iterable<Uint8Array> {
    let offset = 0;
    while (offset < data.length) {
        const end = Math.min(offset + chunkSize, data.length);
        yield data.slice(offset, end);
        offset = end;
    }
};

/**
 * Concatenate chunks from an iterable.
 *
 * @param chunks
 * @return The concatenated Uint8Array.
 */
const concatChunksFromIter = (chunks: Iterable<Uint8Array>): Uint8Array => (
    concatChunks(Array.from(chunks))
);

/**
 * Download and extract a tar.gz file.
 *
 * @param url
 * @param extractPath
 */
const downloadAndExtract = async (url: string, extractPath: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (res) => {
            if (HTTP_CONSTANTS.HTTP_STATUS_OK !== res.statusCode) {
                reject(new Error(`Download failed: ${res.statusCode}`));

                return;
            }

            res.pipe(zlib.createGunzip())
                .pipe(tar.extract({cwd: extractPath}))
                .on("finish", () => {
                    resolve(true);
                })
                .on("error", reject);
        });

        request.on("error", reject);
    });
};

await (async () => {
    if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, {recursive: true});
    }
    fs.mkdirSync(TEST_DATA_DIR, {recursive: true});

    console.log(`Downloading test data to ${TEST_DATA_DIR}...`);
    await downloadAndExtract("https://corpus.canterbury.ac.nz/resources/cantrbry.tar.gz", TEST_DATA_DIR);
    testFiles = fs.readdirSync(TEST_DATA_DIR);
})();

/**
 * Test decompression helper.
 *
 * @param originalData
 */
const testDecompression = async (originalData: Uint8Array) => {
    const compressedData = zlib.zstdCompressSync(originalData);
    const decompressor = await ZstdDecompressor.create();

    // normal decompression
    expect(decompressor.decompress(compressedData)).toStrictEqual(originalData);

    const incompleteCompressedData = compressedData.subarray(0, compressedData.length - 1);
    try {
        decompressor.decompress(incompleteCompressedData);
    } catch (e: unknown) {
        expect(e).toBeInstanceOf(ZstdDecompressionErrorWithData);
        if (e instanceof ZstdDecompressionErrorWithData) {
            expect(e.code).toBe(ZSTD_FFI_JS_ERROR.READ_ERROR);
            expect(e.data).toBeInstanceOf(Uint8Array);
            expect(e.toString()).toMatch(/Premature end/);
        }
    }
};

/**
 * Test streaming decompression helper.
 *
 * @param originalData
 */
const testStreamingDecompression = async (originalData: Uint8Array) => {
    const compressedData = zlib.zstdCompressSync(originalData);
    const decompressor = await ZstdDecompressor.create();

    // streaming decompression
    let iter = decompressor.decompressStream(createIterable(compressedData));
    expect(concatChunksFromIter(iter)).toStrictEqual(originalData);

    const incompleteCompressedData = compressedData.subarray(0, compressedData.length - 1);
    iter = decompressor.decompressStream(createIterable(incompleteCompressedData));
    expect(() => concatChunksFromIter(iter)).toThrow(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        expect.objectContaining({code: ZSTD_FFI_JS_ERROR.READ_ERROR})
    );
};

describe("decompress", () => {
    it("should handle a simple string", async () => {
        await testDecompression(new TextEncoder().encode(SIMPLE_STRING));
    });

    for (const file of testFiles) {
        it(`should handle file: ${file}`, async () => {
            const data = new Uint8Array(fs.readFileSync(path.join(TEST_DATA_DIR, file)));
            await testDecompression(data);
        });
    }
});

describe("decompressStream", () => {
    it("should handle a simple string", async () => {
        await testStreamingDecompression(new TextEncoder().encode(SIMPLE_STRING));
    });

    for (const file of testFiles) {
        it(`should handle file: ${file}`, async () => {
            const data = new Uint8Array(fs.readFileSync(path.join(TEST_DATA_DIR, file)));
            await testStreamingDecompression(data);
        });
    }
});
