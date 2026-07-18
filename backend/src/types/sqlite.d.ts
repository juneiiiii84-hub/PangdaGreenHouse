declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      get(...params: any[]): any;
      all(...params: any[]): any[];
      run(...params: any[]): {
        changes: number;
        lastInsertRowid: number | bigint;
      };
    };
  }
}
