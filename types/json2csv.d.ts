declare module 'json2csv' {
  export class Parser<T = any> {
    constructor(opts?: { fields?: string[]; [key: string]: any });
    parse(data: T[]): string;
  }
}
