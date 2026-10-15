import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import campaignRoutes from "./routes/campaigns";
import submissionRoutes from "./routes/submissions";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api/submissions", submissionRoutes);

  // Must be last: unmatched routes, then the central error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
