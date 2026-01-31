import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const example = sqliteTable("example", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const metteChunks = sqliteTable("mette_chunks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pdfFile: text("pdf_file").notNull(),
  text: text("text").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
