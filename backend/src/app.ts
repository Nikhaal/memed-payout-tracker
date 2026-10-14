import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);

  // Must be last: unmatched routes, then the central error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
