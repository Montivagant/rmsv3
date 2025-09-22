import levelCodecModule from "level-codec/index.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const Codec = resolveCommonJsModule(levelCodecModule);

if (!Codec || typeof Codec !== "function") {
    throw new Error("level-codec polyfill: failed to load or not a function");
}

export default Codec;

