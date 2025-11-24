/** @format */

import { Router } from "express";
import type { RouteContext } from "../context";

export function createClubRouter({ storage }: RouteContext) {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const clubs = await storage.getAllClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const clubs = await storage.searchClubs(query);
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
}
