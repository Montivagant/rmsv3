import through2Module from "through2/through2.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const through2 = resolveCommonJsModule(through2Module);

if (!through2 || typeof through2 !== "function") {
    throw new Error("through2 polyfill: failed to load or not a function");
}

if (typeof through2.obj !== "function") {
    throw new Error("through2 polyfill: missing obj helper");
}

export default through2;
export const obj = through2.obj;

