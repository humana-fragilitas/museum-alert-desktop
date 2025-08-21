const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const esModules = ['@angular', 'rxjs', 'tslib', '@ngx-translate', '@aws-amplify', 'aws-amplify'].join('|');

module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [`<rootDir>/node_modules/(?!${esModules})`],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './src/tsconfig.spec.json',
      },
    ],
    '^.+\\.js$': 'ts-jest',
  },
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/src/',
    }),
    // Handle CSS and other asset imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  // Prevent Haste module name collisions
  haste: {
    enableSymlinks: false,
  },
  // Set the root directory to the project root, not src
  rootDir: '.',
  // Specify where to look for tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/?(*.)(spec|test).(js|jsx|ts|tsx)'
  ],
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/polyfills-test.ts'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/polyfills*.ts',
    '!src/environments/**',
    '!src/**/*.spec.ts',
    '!src/**/*.mock.ts',
    '!src/test-setup.ts'
  ],
};
