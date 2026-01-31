"use client";

import { useState } from "react";

type SearchResult = {
  id: number;
  pdf_file: string;
  text: string;
  chunk_index: number;
  distance: number;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">
          Epstein Files Search
        </h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="flex-1 rounded-lg border border-input bg-card px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {searched && results.length === 0 && (
          <p className="text-muted-foreground">No results found.</p>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {result.pdf_file}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    distance: {result.distance?.toFixed(4)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-card-foreground">
                  {result.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
