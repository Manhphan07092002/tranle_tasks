export interface DbCall {
  sql: string;
  params: any[];
}

type GetHandler = (sql: string, params: any[]) => any;
type AllHandler = (sql: string, params: any[]) => any[] | undefined;

export class FakeDb {
  calls: DbCall[] = [];
  private getHandlers: GetHandler[] = [];
  private allHandlers: AllHandler[] = [];

  onGet(...handlers: GetHandler[]) {
    this.getHandlers.push(...handlers);
    return this;
  }

  onAll(...handlers: AllHandler[]) {
    this.allHandlers.push(...handlers);
    return this;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    this.calls.push({ sql, params });
    for (const handler of this.getHandlers) {
      const result = handler(sql, params);
      if (result !== undefined) return result;
    }
    return undefined;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    this.calls.push({ sql, params });
    for (const handler of this.allHandlers) {
      const result = handler(sql, params);
      if (result !== undefined) return result;
    }
    return [];
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    this.calls.push({ sql, params });
    return { changes: 1 };
  }

  async exec(): Promise<void> {
    return;
  }

  count(sqlIncludes: string): number {
    return this.calls.filter((c) => c.sql.includes(sqlIncludes)).length;
  }

  findCall(sqlIncludes: string): DbCall | undefined {
    return this.calls.find((c) => c.sql.includes(sqlIncludes));
  }
}