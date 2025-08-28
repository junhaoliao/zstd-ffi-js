import {
    describe,
    expect,
    test,
} from "vitest";


describe("ZstdDecompressor", () => {
    test("should be exported from /index.js", async () => {
        const module = await import("../dist/index.js");
        expect(typeof module.ZstdDecompressor).toBe("function");
        expect(typeof module.ZstdDecompressor.create).toBe("function");
    });

    test("should be exported from /decompressor/index.js", async () => {
        const module = await import("../dist/decompressor/index.js");
        expect(typeof module.ZstdDecompressor).toBe("function");
        expect(typeof module.ZstdDecompressor.create).toBe("function");
    });

    test("should be exported as default from /decompressor/index.js", async () => {
        const module = await import("../dist/decompressor/index.js");
        expect(module.default.name).toBe("ZstdDecompressor");
        expect(typeof module.default).toBe("function");
        expect(typeof module.default.create).toBe("function");
    });

    test("should be exported from /decompressor/ZstdDecompressor.js", async () => {
        const module = await import("../dist/decompressor/ZstdDecompressor.js");
        expect(typeof module.default).toBe("function");
        expect(typeof module.default.create).toBe("function");
    });
});
