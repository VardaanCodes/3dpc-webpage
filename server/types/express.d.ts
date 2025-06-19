import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      email: string;
      role: string;
      fileUploadsUsed?: number | null;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        fileUploadsUsed?: number | null;
      };
    }
  }
}

export {};