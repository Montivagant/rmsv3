import ltgtModule from "ltgt/index.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const ltgt = resolveCommonJsModule(ltgtModule);

if (!ltgt || typeof ltgt.compare !== "function") {
    throw new Error("ltgt polyfill: failed to load or missing expected exports");
}

const { compare, contains, filter } = ltgt;

export default ltgt;
export { compare, contains, filter };

