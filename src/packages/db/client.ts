import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
dotenv.config({ path: "/Users/ramkrishnayadav/ai-engineering/.env" });

export const db = drizzle(process.env.DATABASE_URL!);

export default db;
