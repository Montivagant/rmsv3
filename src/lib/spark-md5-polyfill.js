import sparkMd5Module from "spark-md5/spark-md5.js";
import { resolveCommonJsModule } from "./polyfill-helpers.js";

const SparkMD5 = resolveCommonJsModule(sparkMd5Module);

if (!SparkMD5 || (typeof SparkMD5 !== "function" && typeof SparkMD5 !== "object")) {
    throw new Error("spark-md5 polyfill: imported value is not a function or object");
}

export default SparkMD5;
export { SparkMD5 };

