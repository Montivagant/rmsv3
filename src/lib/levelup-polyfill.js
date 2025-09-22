import levelupModule from "levelup/lib/levelup.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const levelup = resolveCommonJsModule(levelupModule);

if (typeof levelup !== "function") {
    throw new Error("levelup polyfill: failed to load or not a function");
}

if (!levelup.errors) {
    throw new Error("levelup polyfill: missing expected errors export");
}

export default levelup;
export const errors = levelup.errors;

