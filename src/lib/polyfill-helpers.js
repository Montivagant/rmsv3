/**
 * Common helpers for wrapping legacy CommonJS modules in ES module friendly shims.
 */
export function resolveCommonJsModule(mod) {
    if (mod && typeof mod === 'object' && 'default' in mod && mod.default != null) {
        return mod.default;
    }
    return mod;
}

