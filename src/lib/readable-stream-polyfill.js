import readableStreamModule from "readable-stream/readable.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const ReadableStream = resolveCommonJsModule(readableStreamModule);

if (!ReadableStream) {
    throw new Error("readable-stream polyfill: failed to load");
}

const { Readable, Writable, Duplex, Transform, PassThrough } = ReadableStream;

export default ReadableStream;
export { Readable, Writable, Duplex, Transform, PassThrough };

