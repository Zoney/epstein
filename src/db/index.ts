import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "sqlite.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqliteVec.load(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite };
