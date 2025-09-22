// Test setup file
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const TEST_DATA_DIR = join(__dirname, 'temp');
const MAIN_DB_PATH = join(__dirname, '..', 'data', 'design-patterns.db');
const TEST_DB_PATH = join(TEST_DATA_DIR, 'test-patterns.db');

// Create test database directory and copy main database for tests
beforeAll(() => {
  // Create temp directory
  mkdirSync(TEST_DATA_DIR, { recursive: true });

  // Copy main database to test location if it exists
  if (existsSync(MAIN_DB_PATH)) {
    copyFileSync(MAIN_DB_PATH, TEST_DB_PATH);
  }

  // Set test environment variable
  process.env.NODE_ENV = 'test';
  process.env.TEST_DB_PATH = TEST_DB_PATH;
});

// Reset test environment before each test
beforeEach(() => {
  // Clear any test-specific caches
  if ((global as any).testCache) {
    (global as any).testCache.clear();
  }
});

// Clean up after tests
afterAll(() => {
  // Clean up temp directory
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });

  // Reset environment
  delete process.env.TEST_DB_PATH;
});