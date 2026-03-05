import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./lib/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_PATH || './data/ldc-shop.sqlite',
    },
});
