/**
 * Concatenate multiple Uint8Array chunks into a single Uint8Array.
 *
 * @param parts
 * @return The concatenated Uint8Array.
 */
const concatChunks = (parts: Uint8Array[]) :Uint8Array => {
    if (0 === parts.length) {
        return new Uint8Array(0);
    }
    if (1 === parts.length) {
        return parts[0] as Uint8Array;
    }

    const totalSize = parts.reduce((sum, p) => sum + p.byteLength, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const p of parts) {
        result.set(p, offset);
        offset += p.byteLength;
    }

    return result;
};


export {concatChunks};
