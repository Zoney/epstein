import { sqlite } from ".";

/**
 * Creates a virtual table for vector similarity search using sqlite-vec.
 *
 * Usage:
 *   createVecTable("embeddings", 1536); // for OpenAI ada-002 dimensions
 *   insertVec("embeddings", "row-id-1", [0.1, 0.2, ...]);
 *   searchVec("embeddings", [0.1, 0.2, ...], 10);
 */

export function createVecTable(name: string, dimensions: number) {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ${name} USING vec0(
      id TEXT PRIMARY KEY,
      embedding FLOAT[${dimensions}]
    )
  `);
}

export function insertVec(table: string, id: string, embedding: number[]) {
  const stmt = sqlite.prepare(
    `INSERT INTO ${table} (id, embedding) VALUES (?, ?)`
  );
  stmt.run(id, new Float32Array(embedding));
}

export function searchVec(
  table: string,
  query: number[],
  limit: number = 10
): { id: string; distance: number }[] {
  const stmt = sqlite.prepare(`
    SELECT id, distance
    FROM ${table}
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `);
  return stmt.all(new Float32Array(query), limit) as {
    id: string;
    distance: number;
  }[];
}
