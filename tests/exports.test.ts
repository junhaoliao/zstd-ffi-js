import {
    describe,
    expect,
    it,
} from "vitest";


describe("ZstdDecompressor", () => {
    it("should be exported from /index.js", async () => {
        const module = await import("../src/index.js");
        const instance = await module.ZstdDecompressor.create();
        expect(instance).toBeInstanceOf(module.ZstdDecompressor);
    });

    it("should be exported from /decompressor/index.js", async () => {
        const module = await import("../src/decompressor/index.js");
        const instance = await module.ZstdDecompressor.create();
        expect(instance).toBeInstanceOf(module.ZstdDecompressor);
    });

    it("should be exported as default from /decompressor/index.js", async () => {
        const module = await import("../src/decompressor/index.js");
        const instance = await module.default.create();
        expect(instance).toBeInstanceOf(module.ZstdDecompressor);
    });

    it("should be exported as default from /decompressor/ZstdDecompressor.js", async () => {
        const module = await import("../src/decompressor/ZstdDecompressor.js");
        const instance = await module.default.create();
        expect(instance).toBeInstanceOf(module.default);
    });
});
