// Mutation testing configuration for A+ quality
export default {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  
  // Target critical business logic for mutation testing
  mutate: [
    'src/events/**/*.ts',
    'src/loyalty/**/*.ts', 
    'src/inventory/**/*.ts',
    'src/schemas/**/*.ts',
    'src/lib/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**/*'
  ],
  
  // Mutation testing thresholds for A+ quality
  thresholds: {
    high: 90,
    low: 80,
    break: 75
  },
  
  // Configure mutation operators
  mutator: {
    plugins: [
      '@stryker-mutator/typescript-checker',
      {
        name: '@stryker-mutator/typescript-checker',
        options: {
          prioritizePerformanceOverAccuracy: false
        }
      }
    ]
  },

  // Test runner configuration
  testRunnerNodeArgs: ['--loader=tsx'],
  vitest: {
    configFile: 'vite.config.ts'
  },

  // Performance optimization
  maxConcurrentTestRunners: 4,
  timeoutMS: 30000,
  timeoutFactor: 1.5,

  // Quality gates
  dashboard: {
    project: 'github.com/rmsv3/restaurant-pos',
    version: process.env.GITHUB_SHA || 'main'
  }
};
