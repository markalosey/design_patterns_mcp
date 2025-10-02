import { join } from 'path';
import { existsSync } from 'fs';

export function getTestDatabasePath(): string {
  if (process.env.TEST_DB_PATH && existsSync(process.env.TEST_DB_PATH)) {
    return process.env.TEST_DB_PATH;
  }
  
  const mainDbPath = join(__dirname, '..', '..', 'data', 'design-patterns.db');
  if (existsSync(mainDbPath)) {
    return mainDbPath;
  }
  
  throw new Error('Test database not found. Run setup first or ensure main database exists.');
}

export function getTestDatabaseConfig(readonly: boolean = true) {
  return {
    filename: getTestDatabasePath(),
    options: {
      readonly,
      fileMustExist: true
    }
  };
}
