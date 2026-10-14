import { connectDb } from "./config/db";
import { env } from "./config/env";
import { createApp } from "./app";

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
