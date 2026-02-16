declare module 'archiver' {
  import { Transform } from 'stream';
  
  interface ArchiverOptions {
    zlib?: { level?: number };
    [key: string]: any;
  }

  interface Archiver extends Transform {
    append(source: string | Buffer | NodeJS.ReadableStream, data: { name: string; [key: string]: any }): this;
    directory(dirpath: string, destpath: string | false): this;
    finalize(): Promise<void>;
    pointer(): number;
    abort(): this;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;
  export = archiver;
}
