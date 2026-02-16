declare module 'pino' {
  interface Logger {
    info(msg: string, ...args: any[]): void;
    info(obj: object, msg?: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    error(obj: object, msg?: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    warn(obj: object, msg?: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    debug(obj: object, msg?: string, ...args: any[]): void;
    fatal(msg: string, ...args: any[]): void;
    fatal(obj: object, msg?: string, ...args: any[]): void;
    child(bindings: Record<string, any>): Logger;
    level: string;
  }

  interface LoggerOptions {
    level?: string;
    transport?: {
      target: string;
      options?: Record<string, any>;
    };
    timestamp?: boolean | (() => string);
    base?: Record<string, any>;
    [key: string]: any;
  }

  function pino(opts?: LoggerOptions): Logger;

  namespace pino {
    const stdTimeFunctions: {
      epochTime: () => string;
      unixTime: () => string;
      nullTime: () => string;
      isoTime: () => string;
    };
    type Logger = pino.Logger;
  }

  export = pino;
}
