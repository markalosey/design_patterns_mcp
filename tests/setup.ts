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
afterAll(async () => {
  // Wait a bit to ensure all file handles are closed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clean up temp directory
  try {
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  } catch (error) {
    console.warn('Failed to clean up temp directory:', error);
  }

  // Reset environment
  delete process.env.TEST_DB_PATH;
});