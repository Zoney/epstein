import { NextRequest, NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";
import { sqlite } from "@/db";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTE_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { query, limit = 20 } = await req.json();

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const response = await openrouter.embeddings.generate({
    model: "qwen/qwen3-embedding-8b",
    input: query,
    encodingFormat: "float",
  });

  if (typeof response === "string") {
    return NextResponse.json({ error: "embedding failed" }, { status: 502 });
  }

  const emb = response.data[0].embedding;
  const queryVec = typeof emb === "string" ? (JSON.parse(emb) as number[]) : emb;

  try {
    const vecResults = sqlite
      .prepare(
        `SELECT id, distance
         FROM mette_vec
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`
      )
      .all(new Float32Array(queryVec), limit) as {
      id: string;
      distance: number;
    }[];

    if (vecResults.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const ids = vecResults.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const chunks = sqlite
      .prepare(
        `SELECT id, pdf_file, text, chunk_index
         FROM mette_chunks
         WHERE id IN (${placeholders})`
      )
      .all(...ids) as {
      id: number;
      pdf_file: string;
      text: string;
      chunk_index: number;
    }[];

    const chunkMap = new Map(chunks.map((c) => [c.id.toString(), c]));
    const results = vecResults.map((v) => ({
      ...chunkMap.get(v.id),
      distance: v.distance,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
