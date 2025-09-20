/**
 * Database Schema Migrations for Design Patterns MCP Server
 * Handles schema versioning, migration execution, and rollback
 */
import { DatabaseManager } from './database-manager';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  createdAt: Date;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executedAt: Date;
  checksum: string;
}

export class MigrationManager {
  private db: DatabaseManager;
  private migrationsPath: string;

  constructor(db: DatabaseManager, migrationsPath: string = './migrations') {
    this.db = db;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    await this.createMigrationsTable();
    logger.info('migrations', 'Migration system initialized');
  }

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at
      ON schema_migrations(executed_at);
    `;

    this.db.execute(sql);
  }

  /**
   * Get all available migrations
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    try {
      // Ensure migrations directory exists
      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true });
        return migrations;
      }

      const files = fs
        .readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migration = await this.parseMigrationFile(file);
        if (migration) {
          migrations.push(migration);
        }
      }
    } catch (error) {
      console.error('Failed to load migrations:', error);
    }

    return migrations;
  }

  /**
   * Parse migration file
   */
  private async parseMigrationFile(filename: string): Promise<Migration | null> {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      const content = fs.readFileSync(filePath, 'utf8');

      // Parse migration format: id_name.sql
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Invalid migration filename: ${filename}`);
        return null;
      }

      const [, id, name] = match;

      // Split content into up and down sections
      const sections = content.split('-- DOWN');
      const up = sections[0].trim();
      const down = sections[1]?.trim() || '';

      return {
        id,
        name,
        up,
        down,
        createdAt: fs.statSync(filePath).birthtime,
      };
    } catch (error) {
      console.error(`Failed to parse migration ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const sql =
      'SELECT id, name, executed_at, checksum FROM schema_migrations ORDER BY executed_at';
    const rows = this.db.query<MigrationRecord & { executed_at: string }>(sql);

    return rows.map(row => ({
      ...row,
      executedAt: new Date(row.executed_at),
    }));
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    return available.filter(migration => !executedIds.has(migration.id));
  }

  /**
   * Execute pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      return {
        success: true,
        message: 'No pending migrations',
        executed: [],
      };
    }

    const executed: MigrationRecord[] = [];

    try {
      for (const migration of pending) {
        await this.executeMigration(migration);
        const record = await this.recordMigration(migration);
        executed.push(record);
        logger.info('migrations', `Migration executed: ${migration.id} - ${migration.name}`);
      }

      return {
        success: true,
        message: `Successfully executed ${executed.length} migrations`,
        executed,
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executed,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    this.db.transaction(() => {
      // Execute migration SQL
      this.db.execute(migration.up);
    });
  }

  /**
   * Record migration execution
   */
  private async recordMigration(migration: Migration): Promise<MigrationRecord> {
    const checksum = this.calculateChecksum(migration.up);
    const sql = `
      INSERT INTO schema_migrations (id, name, checksum)
      VALUES (?, ?, ?)
    `;

    this.db.execute(sql, [migration.id, migration.name, checksum]);

    return {
      id: migration.id,
      name: migration.name,
      executedAt: new Date(),
      checksum,
    };
  }

  /**
   * Rollback last migration
   */
  async rollback(steps: number = 1): Promise<MigrationResult> {
    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      return {
        success: false,
        message: 'No migrations to rollback',
      };
    }

    const toRollback = executed.slice(-steps);
    const rolledBack: MigrationRecord[] = [];

    try {
      for (const record of toRollback.reverse()) {
        await this.rollbackMigration(record);
        rolledBack.push(record);
        logger.info('migrations', `Migration rolled back: ${record.id} - ${record.name}`);
      }

      return {
        success: true,
        message: `Successfully rolled back ${rolledBack.length} migrations`,
        rolledBack,
      };
    } catch (error) {
      return {
        success: false,
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rolledBack,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(record: MigrationRecord): Promise<void> {
    // Load migration file to get down SQL
    const migration = await this.getMigrationById(record.id);
    if (!migration || !migration.down) {
      throw new Error(`No rollback SQL found for migration ${record.id}`);
    }

    this.db.transaction(() => {
      // Execute rollback SQL
      this.db.execute(migration.down);

      // Remove migration record
      this.db.execute('DELETE FROM schema_migrations WHERE id = ?', [record.id]);
    });
  }

  /**
   * Get migration by ID
   */
  private async getMigrationById(id: string): Promise<Migration | null> {
    const available = await this.getAvailableMigrations();
    return available.find(m => m.id === id) || null;
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    // Simple checksum - in production, use a proper hashing algorithm
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = Date.now();
    const id = timestamp.toString();
    const filename = `${id}_${name}.sql`;
    const filePath = path.join(this.migrationsPath, filename);

    // Ensure migrations directory exists
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
    }

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- UP
-- Add your migration SQL here

-- DOWN
-- Add your rollback SQL here
`;

    fs.writeFileSync(filePath, template);
    logger.info('migrations', `Migration created: ${filePath}`);

    return filePath;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      total: available.length,
      executed: executed.length,
      pending: pending.length,
      lastExecuted: executed.length > 0 ? executed[executed.length - 1] : null,
      nextPending: pending.length > 0 ? pending[0] : null,
    };
  }

  /**
   * Validate migration integrity
   */
  async validate(): Promise<ValidationResult> {
    const available = await this.getAvailableMigrations();
    const executed = await this.getExecutedMigrations();
    const errors: string[] = [];

    // Check for missing migration files
    for (const record of executed) {
      const migration = available.find(m => m.id === record.id);
      if (!migration) {
        errors.push(`Missing migration file for executed migration: ${record.id}`);
      } else {
        // Check checksum
        const currentChecksum = this.calculateChecksum(migration.up);
        if (currentChecksum !== record.checksum) {
          errors.push(`Checksum mismatch for migration: ${record.id}`);
        }
      }
    }

    // Check for duplicate migration IDs
    const ids = new Set<string>();
    for (const migration of available) {
      if (ids.has(migration.id)) {
        errors.push(`Duplicate migration ID: ${migration.id}`);
      }
      ids.add(migration.id);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export interface MigrationResult {
  success: boolean;
  message: string;
  executed?: MigrationRecord[];
  rolledBack?: MigrationRecord[];
  error?: Error;
}

export interface MigrationStatus {
  total: number;
  executed: number;
  pending: number;
  lastExecuted: MigrationRecord | null;
  nextPending: Migration | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Initial schema migration
export const INITIAL_SCHEMA_MIGRATION: Migration = {
  id: '001',
  name: 'initial_schema',
  up: `
    -- Create patterns table
    CREATE TABLE patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      when_to_use TEXT,
      benefits TEXT,
      drawbacks TEXT,
      use_cases TEXT,
      complexity TEXT NOT NULL,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create pattern_implementations table
    CREATE TABLE pattern_implementations (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      language TEXT NOT NULL,
      approach TEXT NOT NULL,
      code TEXT NOT NULL,
      explanation TEXT NOT NULL,
      dependencies TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    );

    -- Create pattern_relationships table
    CREATE TABLE pattern_relationships (
      id TEXT PRIMARY KEY,
      source_pattern_id TEXT NOT NULL,
      target_pattern_id TEXT NOT NULL,
      type TEXT NOT NULL,
      strength REAL DEFAULT 1.0,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    );

    -- Create user_preferences table
    CREATE TABLE user_preferences (
      user_id TEXT PRIMARY KEY,
      preferences TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX idx_patterns_category ON patterns(category);
    CREATE INDEX idx_patterns_complexity ON patterns(complexity);
    CREATE INDEX idx_pattern_implementations_pattern_id ON pattern_implementations(pattern_id);
    CREATE INDEX idx_pattern_implementations_language ON pattern_implementations(language);
    CREATE INDEX idx_pattern_relationships_source ON pattern_relationships(source_pattern_id);
    CREATE INDEX idx_pattern_relationships_target ON pattern_relationships(target_pattern_id);
    CREATE INDEX idx_pattern_relationships_type ON pattern_relationships(type);
  `,
  down: `
    DROP TABLE IF EXISTS user_preferences;
    DROP TABLE IF EXISTS pattern_relationships;
    DROP TABLE IF EXISTS pattern_implementations;
    DROP TABLE IF EXISTS patterns;
  `,
  createdAt: new Date('2024-01-11T00:00:00Z'),
};

// Vector search migration
export const VECTOR_SEARCH_MIGRATION: Migration = {
  id: '002',
  name: 'vector_search_support',
  up: `
    -- Create vector embeddings table
    CREATE VIRTUAL TABLE pattern_embeddings USING vec0(
      pattern_id TEXT PRIMARY KEY,
      embedding FLOAT[384],
      model TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create search queries table for analytics
    CREATE TABLE search_queries (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      user_id TEXT,
      results_count INTEGER DEFAULT 0,
      execution_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create pattern usage analytics table
    CREATE TABLE pattern_usage (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      user_id TEXT,
      context TEXT,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    );

    -- Create indexes
    CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
    CREATE INDEX idx_pattern_usage_pattern_id ON pattern_usage(pattern_id);
    CREATE INDEX idx_pattern_usage_created_at ON pattern_usage(created_at);
  `,
  down: `
    DROP TABLE IF EXISTS pattern_usage;
    DROP TABLE IF EXISTS search_queries;
    DROP TABLE IF EXISTS pattern_embeddings;
  `,
  createdAt: new Date('2024-01-11T00:00:00Z'),
};
