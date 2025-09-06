module.exports = {
  ci: {
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Accessibility requirements
        'categories:accessibility': ['error', { minScore: 0.95 }],

        // Best practices
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // SEO
        'categories:seo': ['warn', { minScore: 0.8 }],

        // Bundle size thresholds
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 200000 }], // 200KB

        // Network efficiency
        'unused-css-rules': ['warn', { maxLength: 10 }],
        'unused-javascript': ['warn', { maxLength: 5 }],

        // Security headers
        'csp-xss': 'error',
        'is-on-https': 'error',
      }
    },
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'pnpm preview',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/pos',
        'http://localhost:4173/customers',
        'http://localhost:4173/inventory',
        'http://localhost:4173/dashboard'
      ]
    }
  }
};
