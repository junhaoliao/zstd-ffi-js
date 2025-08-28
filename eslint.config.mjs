import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
import StylisticConfigArray from "eslint-config-yscope/StylisticConfigArray.mjs";
import TsConfigArray, {createTsConfigOverride} from "eslint-config-yscope/TsConfigArray.mjs";


const EslintConfig = [
    {
        ignores: [
            "dist/",
            "node_modules/",
            "build/",
        ],
    },
    CommonConfig,
    ...TsConfigArray,
    createTsConfigOverride(
        ["tests/**"],
        "tsconfig.test.json"
    ),
    ...StylisticConfigArray,
    {
        rules: {
            "no-underscore-dangle": [
                "error",
                {
                    allow: [
                        "_free",
                        "_malloc",
                        "_ZSTD_createDCtx",
                        "_ZSTD_decompress",
                        "_ZSTD_decompressStream",
                        "_ZSTD_DStreamInSize",
                        "_ZSTD_DStreamOutSize",
                        "_ZSTD_findDecompressedSize",
                        "_ZSTD_freeDCtx",
                        "_ZSTD_isError",
                        "_ZSTD_getErrorName",
                    ],
                },
            ],
            "new-cap": [
                "error",
                {
                    capIsNewExceptions: [
                        "UTF8ToString",
                    ],
                },
            ],
        },
    },
];

export default EslintConfig;
