import { useState, useCallback } from "react";

export interface SearchResult {
  file: string;
  matches: { line: number; content: string }[];
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        caseSensitive: String(caseSensitive),
        regex: String(useRegex)
      });

      const res = await fetch(`http://localhost:3001/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalMatches(data.totalMatches || 0);
      } else {
        setResults([]);
        setTotalMatches(0);
      }
    } catch (err) {
      console.warn("Search error:", err);
      setResults([]);
      setTotalMatches(0);
    } finally {
      setSearching(false);
    }
  }, [caseSensitive, useRegex]);

  return {
    query,
    setQuery,
    results,
    searching,
    totalMatches,
    caseSensitive,
    setCaseSensitive,
    useRegex,
    setUseRegex,
    search
  };
}
