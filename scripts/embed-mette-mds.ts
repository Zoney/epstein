import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { OpenRouter } from "@openrouter/sdk";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const MD_DIR = path.resolve("storage/mette-mds");
const DB_PATH = path.resolve("sqlite.db");
const CHUNK_SIZE = 1500;
const BATCH_SIZE = 20;
const DELAY_MS = 200;

function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 50);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.OPENROUTE_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTE_API_KEY is not set in .env");
    process.exit(1);
  }

  const openrouter = new OpenRouter({ apiKey });

  if (!existsSync(MD_DIR)) {
    console.error(`Markdown directory not found: ${MD_DIR}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  sqliteVec.load(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS mette_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pdf_file TEXT NOT NULL,
      text TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  const mdFiles = (await readdir(MD_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();
  console.log(`Found ${mdFiles.length} markdown files`);

  const processed = new Set<string>();
  const rows = db
    .prepare("SELECT DISTINCT pdf_file FROM mette_chunks")
    .all() as { pdf_file: string }[];
  for (const row of rows) {
    processed.add(row.pdf_file);
  }
  console.log(`Already processed: ${processed.size} files`);

  let dimensions: number | null = null;
  let insertVecStmt: Database.Statement | null = null;
  let totalChunks = 0;

  const insertChunk = db.prepare(
    "INSERT INTO mette_chunks (pdf_file, text, chunk_index) VALUES (?, ?, ?)"
  );

  for (let i = 0; i < mdFiles.length; i++) {
    const mdFile = mdFiles[i];
    const pdfFile = mdFile.replace(/\.md$/, ".pdf");

    if (processed.has(pdfFile)) {
      continue;
    }

    const content = await readFile(path.join(MD_DIR, mdFile), "utf-8");
    const chunks = chunkText(content, CHUNK_SIZE);

    if (chunks.length === 0) {
      console.log(
        `[${i + 1}/${mdFiles.length}] ${mdFile} → skipped (no content)`
      );
      continue;
    }

    for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
      const batch = chunks.slice(b, b + BATCH_SIZE);

      const response = await openrouter.embeddings.generate({
        model: "qwen/qwen3-embedding-8b",
        input: batch,
        encodingFormat: "float",
      });

      if (typeof response === "string") {
        console.error("Unexpected string response from API");
        continue;
      }

      if (dimensions === null) {
        dimensions = (response.data[0].embedding as number[]).length;
        console.log(`Embedding dimensions: ${dimensions}`);
        db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS mette_vec USING vec0(
            id TEXT PRIMARY KEY,
            embedding FLOAT[${dimensions}]
          )
        `);
        insertVecStmt = db.prepare(
          "INSERT INTO mette_vec (id, embedding) VALUES (?, ?)"
        );
      }

      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = b + j;
        const emb = response.data[j].embedding;
        const vec = typeof emb === "string" ? JSON.parse(emb) as number[] : emb;

        const result = insertChunk.run(pdfFile, batch[j], chunkIndex);
        const chunkId = result.lastInsertRowid.toString();

        insertVecStmt!.run(chunkId, new Float32Array(vec));
        totalChunks++;
      }

      if (b + BATCH_SIZE < chunks.length) {
        await sleep(DELAY_MS);
      }
    }

    console.log(
      `[${i + 1}/${mdFiles.length}] ${mdFile} → ${chunks.length} chunks`
    );
  }

  db.close();
  console.log(`\nDone. Total new chunks embedded: ${totalChunks}`);
}

main();
