declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: any[]): any;
    exec(sql: string, params?: any[]): any[];
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
  }

  interface Statement {
    run(params?: any[]): any;
    get(params?: any[]): any;
    getAsObject(params?: any[]): any;
    all(params?: any[]): any[];
    step(): boolean;
    reset(): void;
    free(): void;
  }

  interface InitSqlJs {
    (config?: any): Promise<{
      Database: new (data?: Uint8Array) => Database;
    }>;
  }

  const initSqlJs: InitSqlJs;
  export = initSqlJs;
}