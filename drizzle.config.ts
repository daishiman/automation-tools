import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 環境変数の読み込み
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/infrastructure/database/drizzle/**/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./local-db.sqlite",
  },
  verbose: true,
  strict: true,
});
