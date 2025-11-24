/** @format */

import type { RequestHandler } from "express";
import type { RepositoryStorage } from "../storage/repositoryStorage";

export interface RouteContext {
  storage: RepositoryStorage;
  requireAuth: RequestHandler;
  requireRole: (roles: string[]) => RequestHandler;
}
