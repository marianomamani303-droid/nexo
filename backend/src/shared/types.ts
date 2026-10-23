export interface SessionUser {
  id: string;
  email: string;
  handle: string;
  name: string;
}

export interface Session {
  id: string;
  user: SessionUser;
}

declare module 'express-serve-static-core' {
  interface Request {
    session?: Session;
  }
}
