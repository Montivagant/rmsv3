import dequeModule from "double-ended-queue/js/deque.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const Deque = resolveCommonJsModule(dequeModule);

if (typeof Deque !== "function") {
    throw new Error("double-ended-queue polyfill: failed to load or not a constructor function");
}

export default Deque;

