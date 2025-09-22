import memdownModule from "memdown/memdown.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const memdown = resolveCommonJsModule(memdownModule);

if (!memdown || typeof memdown !== "function") {
    throw new Error("memdown polyfill: failed to load or not a constructor function");
}

export default memdown;

