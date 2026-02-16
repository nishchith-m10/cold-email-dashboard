declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { Server } from 'http';

  export interface Request extends IncomingMessage {
    body: any;
    query: Record<string, string | string[] | undefined>;
    params: Record<string, string>;
    path: string;
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }

  export interface Response extends ServerResponse {
    json(body: any): Response;
    status(code: number): Response;
    send(body?: any): Response;
    sendStatus(code: number): Response;
    set(field: string, value: string): Response;
    header(field: string, value: string): Response;
    type(type: string): Response;
    redirect(url: string): void;
    redirect(status: number, url: string): void;
  }

  export type NextFunction = (err?: any) => void;
  export type RequestHandler = (req: Request, res: Response, next?: NextFunction) => void;

  export interface Application {
    get(path: string, ...handlers: RequestHandler[]): Application;
    post(path: string, ...handlers: RequestHandler[]): Application;
    put(path: string, ...handlers: RequestHandler[]): Application;
    delete(path: string, ...handlers: RequestHandler[]): Application;
    patch(path: string, ...handlers: RequestHandler[]): Application;
    use(...handlers: RequestHandler[]): Application;
    use(path: string, ...handlers: RequestHandler[]): Application;
    listen(port: number, callback?: () => void): Server;
    listen(port: number, hostname: string, callback?: () => void): Server;
    set(setting: string, val: any): Application;
  }

  function e(): Application;

  namespace e {
    function json(options?: any): RequestHandler;
    function urlencoded(options?: any): RequestHandler;
    function Router(): any;
  }

  export = e;
}
