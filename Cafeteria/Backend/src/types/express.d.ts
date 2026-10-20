import { Request } from 'express';

declare module 'express' {
  interface Request {
    params: { [key: string]: string };
  }
}
