import { useState, useCallback, useEffect } from "react";

export type MCPServerStatus = "connected" | "error" | "disconnected" | "connecting";

export interface MCPServer {
  id: string;
  name: string;
  command?: string;   // stdio: e.g. "npx -y @modelcontextprotocol/server-filesystem"
  url?: string;       // HTTP/SSE: e.g. "http://localhost:3001/mcp"
  enabled: boolean;
  status: MCPServerStatus;
  errorMsg?: string;
  toolCount?: number;
  builtIn?: boolean;  // cannot be deleted
}

const DEFAULT_SERVERS: MCPServer[] = [
  {
    id: "filesystem",
    name: "filesystem",
    command: "npx -y @modelcontextprotocol/server-filesystem /Users/danny/Desktop/apify",
    enabled: true,
    status: "connected",
    toolCount: 14,
    builtIn: true
  },
  {
    id: "apify",
    name: "apify",
    url: "https://mcp.apify.com",
    enabled: false,
    status: "disconnected",
    builtIn: false
  }
];

const STORAGE_KEY = "factory-ide:mcp-servers";

function loadServers(): MCPServer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SERVERS;
}

function saveServers(servers: MCPServer[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch {}
}

export function useMCPServers() {
  const [servers, setServers] = useState<MCPServer[]>(loadServers);

  // Persist on every change
  useEffect(() => {
    saveServers(servers);
  }, [servers]);

  const addServer = useCallback((name: string, commandOrUrl: string) => {
    const isUrl = commandOrUrl.startsWith("http");
    const server: MCPServer = {
      id: `custom-${Date.now()}`,
      name,
      ...(isUrl ? { url: commandOrUrl } : { command: commandOrUrl }),
      enabled: true,
      status: "disconnected"
    };
    setServers(prev => [...prev, server]);
  }, []);

  const removeServer = useCallback((id: string) => {
    setServers(prev => prev.filter(s => s.id !== id || s.builtIn));
  }, []);

  const toggleServer = useCallback((id: string) => {
    setServers(prev =>
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled, status: s.enabled ? "disconnected" : "connecting" } : s)
    );
    // Simulate connecting → connected/error after 1.5s
    setTimeout(() => {
      setServers(prev =>
        prev.map(s => {
          if (s.id !== id) return s;
          if (!s.enabled) return s; // was just disabled
          
          const hasConfig = s.builtIn || (s.command && s.command.trim().length > 0) || (s.url && s.url.trim().length > 0);
          const newStatus: MCPServerStatus = hasConfig ? "connected" : "error";
          return {
            ...s,
            status: newStatus,
            toolCount: newStatus === "connected" ? (s.id === "filesystem" ? 14 : 8) : undefined,
            errorMsg: newStatus === "error" ? "serverURL or command must be specified" : undefined
          };
        })
      );
    }, 1500);
  }, []);

  const refreshServer = useCallback((id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, status: "connecting", errorMsg: undefined } : s));
    setTimeout(() => {
      setServers(prev =>
        prev.map(s => {
          if (s.id !== id) return s;
          const hasConfig = s.builtIn || (s.command && s.command.trim().length > 0) || (s.url && s.url.trim().length > 0);
          const newStatus: MCPServerStatus = hasConfig ? "connected" : "error";
          return {
            ...s,
            status: newStatus,
            toolCount: newStatus === "connected" ? (s.id === "filesystem" ? 14 : 8) : undefined,
            errorMsg: newStatus === "error" ? "serverURL or command must be specified" : undefined
          };
        })
      );
    }, 1000);
  }, []);

  const updateServer = useCallback((id: string, name: string, commandOrUrl: string) => {
    const isUrl = commandOrUrl.startsWith("http");
    setServers(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          name,
          command: isUrl ? undefined : commandOrUrl,
          url: isUrl ? commandOrUrl : undefined,
          status: s.enabled ? "connecting" : "disconnected",
          errorMsg: undefined
        };
      })
    );

    // If enabled, simulate reconnecting
    setTimeout(() => {
      setServers(prev =>
        prev.map(s => {
          if (s.id !== id) return s;
          if (!s.enabled) return s;
          
          const hasConfig = s.builtIn || (s.command && s.command.trim().length > 0) || (s.url && s.url.trim().length > 0);
          const newStatus: MCPServerStatus = hasConfig ? "connected" : "error";
          return {
            ...s,
            status: newStatus,
            toolCount: newStatus === "connected" ? (s.id === "filesystem" ? 14 : 8) : undefined,
            errorMsg: newStatus === "error" ? "serverURL or command must be specified" : undefined
          };
        })
      );
    }, 1200);
  }, []);

  const hasErrors = servers.some(s => s.enabled && s.status === "error");
  const connectedCount = servers.filter(s => s.enabled && s.status === "connected").length;
  const totalTools = servers.filter(s => s.status === "connected").reduce((sum, s) => sum + (s.toolCount || 0), 0);

  return { servers, addServer, removeServer, toggleServer, refreshServer, updateServer, hasErrors, connectedCount, totalTools };
}
