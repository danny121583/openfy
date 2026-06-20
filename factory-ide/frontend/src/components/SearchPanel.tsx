import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, FileText, Loader2 } from "lucide-react";
import { useSearch, SearchResult } from "../hooks/useSearch";

interface SearchPanelProps {
  width: number;
  onOpenFile: (path: string) => void;
}

export function SearchPanel({ width, onOpenFile }: SearchPanelProps) {
  const {
    query, setQuery,
    results, searching, totalMatches,
    caseSensitive, setCaseSensitive,
    useRegex, setUseRegex,
    search
  } = useSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(val);
    }, 300);
  };

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  // Auto-expand all files on new results
  useEffect(() => {
    setExpandedFiles(new Set(results.map(r => r.file)));
  }, [results]);

  return (
    <div style={{
      width: `${width}px`,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--bg-panel)",
      borderRight: "1px solid var(--border-color)",
      overflow: "hidden",
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-color)"
      }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Search
        </span>
      </div>

      {/* Search input */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "var(--bg-input)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "0 8px"
        }}>
          <SearchIcon size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search files..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "12px",
              padding: "6px 0",
              outline: "none",
              fontFamily: "inherit"
            }}
          />
          {searching && <Loader2 size={12} className="spin" style={{ color: "var(--accent-neon)" }} />}
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
          <ToggleButton
            label="Aa"
            active={caseSensitive}
            onClick={() => { setCaseSensitive(!caseSensitive); search(query); }}
            tooltip="Match Case"
          />
          <ToggleButton
            label=".*"
            active={useRegex}
            onClick={() => { setUseRegex(!useRegex); search(query); }}
            tooltip="Use Regex"
          />
        </div>

        {/* Results count */}
        {query && !searching && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
            {totalMatches} result{totalMatches !== 1 ? "s" : ""} in {results.length} file{results.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {!query && (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
            <SearchIcon size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <div>Type to search across workspace</div>
          </div>
        )}

        {results.map((result) => (
          <FileResultGroup
            key={result.file}
            result={result}
            expanded={expandedFiles.has(result.file)}
            onToggle={() => toggleFile(result.file)}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    </div>
  );
}

function ToggleButton({ label, active, onClick, tooltip }: { label: string; active: boolean; onClick: () => void; tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        padding: "2px 6px",
        borderRadius: "3px",
        border: active ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
        background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
        color: active ? "var(--accent-primary)" : "var(--text-muted)",
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.12s ease"
      }}
    >
      {label}
    </button>
  );
}

function FileResultGroup({ result, expanded, onToggle, onOpenFile }: {
  result: SearchResult;
  expanded: boolean;
  onToggle: () => void;
  onOpenFile: (path: string) => void;
}) {
  const fileName = result.file.split("/").pop() || result.file;
  const dirPath = result.file.substring(0, result.file.lastIndexOf("/")) || "/";

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "4px 12px",
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "12px",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{expanded ? "▾" : "▸"}</span>
        <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>{fileName}</span>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {dirPath}
        </span>
        <span style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          background: "rgba(255,255,255,0.06)",
          padding: "1px 5px",
          borderRadius: "8px",
          flexShrink: 0
        }}>
          {result.matches.length}
        </span>
      </button>

      {expanded && (
        <div style={{ paddingLeft: "32px" }}>
          {result.matches.map((match, i) => (
            <button
              key={i}
              onClick={() => onOpenFile(result.file)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "3px 12px 3px 0",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "11px",
                textAlign: "left",
                fontFamily: "var(--font-mono)"
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ color: "var(--text-muted)", minWidth: "28px", textAlign: "right", flexShrink: 0 }}>
                {match.line}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {match.content.trim()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
