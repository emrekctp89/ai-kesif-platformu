const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Next.js uygulamasının kök dizini
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // CSS modülleri ve asset'ler için mock
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Alias'lar (eğer tsconfig.json'da varsa)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  modulePathIgnorePatterns: ['<rootDir>/e2e/'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
};

module.exports = createJestConfig(customJestConfig);
