// TypeScript matcher typing for jest-axe in Vitest environment

import type { AxeResults } from 'jest-axe';

declare module 'vitest' {
  interface Assertion {
    // Allow both no-arg and with-results signatures (jest-axe supports passing AxeResults or DOM node)
    toHaveNoViolations(expected?: AxeResults | Element | DocumentFragment | null): void;
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(expected?: AxeResults | Element | DocumentFragment | null): void;
  }
}
