import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export function useFileSystem() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [rootName, setRootName] = useState<string>("");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [fileCache, setFileCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;

  // Fetch file tree from backend (or Tauri)
  const refreshFileTree = useCallback(async () => {
    setLoading(true);
    try {
      if (isTauri) {
        const result = await invoke<{ tree: FileNode[]; rootName: string }>("native_read_directory");
        setFileTree(result.tree);
        setRootName(result.rootName);
      } else {
        const res = await fetch("/api/files");
        if (res.ok) {
          const data = await res.json();
          setFileTree(data.tree);
          setRootName(data.rootName || "");
        } else {
          // No workspace open or backend unavailable — show empty state
          setFileTree([]);
          setRootName("");
        }
      }
    } catch (err) {
      console.warn("File tree read error:", err);
      setFileTree([]);
      setRootName("");
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  useEffect(() => {
    refreshFileTree();
  }, [refreshFileTree]);

  // Open file helper
  const openFile = useCallback(async (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActiveFile(path);

    if (fileCache[path]) return;

    try {
      if (isTauri) {
        const isImage = /\.(png|jpe?g|gif|ico|webp)$/i.test(path);
        if (isImage) {
          const bytes = await invoke<number[]>("native_read_binary_file", { path });
          const ext = path.substring(path.lastIndexOf(".") + 1).toLowerCase();
          const mimeType = ext === "jpg" ? "image/jpeg" : ext === "ico" ? "image/x-icon" : `image/${ext}`;
          
          const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          setFileCache((prev) => ({ ...prev, [path]: dataUrl }));
        } else {
          const content = await invoke<string>("native_read_file", { path });
          setFileCache((prev) => ({ ...prev, [path]: content }));
        }
      } else {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
        if (res.ok) {
          const data = await res.json();
          setFileCache((prev) => ({ ...prev, [path]: data.content }));
        } else {
          setFileCache((prev) => ({ ...prev, [path]: `// Could not load ${path}` }));
        }
      }
    } catch (err) {
      console.warn("File read error:", err);
      setFileCache((prev) => ({ ...prev, [path]: `// Error loading ${path}` }));
    }
  }, [openTabs, fileCache, isTauri]);

  // Close file helper
  const closeFile = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const nextTabs = prev.filter((t) => t !== path);
      if (activeFile === path) {
        setActiveFile(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null);
      }
      return nextTabs;
    });
  }, [activeFile]);

  // Save file helper
  const saveFile = useCallback(async (path: string, content: string) => {
    setFileCache((prev) => ({ ...prev, [path]: content }));
    try {
      if (isTauri) {
        await invoke("native_write_file", { path, content });
      } else {
        await fetch("/api/files/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content })
        });
      }
    } catch (e) {
      console.warn("Local storage fallback or Tauri save error:", e);
    }
  }, [isTauri]);
  // Close folder/workspace helper
  const closeFolder = useCallback(() => {
    setFileTree([]);
    setActiveFile(null);
    setOpenTabs([]);
    setFileCache({});
  }, []);

  // Select folder helper via native OS picker
  const selectFolder = useCallback(async () => {
    if (isTauri) {
      try {
        const selected = await invoke<string | null>("native_select_directory");
        if (selected) {
          setOpenTabs([]);
          setActiveFile(null);
          setFileCache({});
          await refreshFileTree();
        }
      } catch (err) {
        console.warn("Failed to select native directory:", err);
      }
    } else {
      // Web browser mode connected to local Express backend dev server
      try {
        const res = await fetch("http://localhost:3001/api/workspace/open", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOpenTabs([]);
            setActiveFile(null);
            setFileCache({});
            await refreshFileTree();
          }
        }
      } catch (err) {
        console.warn("Failed to select native directory via local backend:", err);
      }
    }
  }, [isTauri, refreshFileTree]);

  // Delete file or folder
  const deletePath = useCallback(async (path: string) => {
    try {
      if (isTauri) {
        await invoke("native_delete_path", { path });
      } else {
        await fetch("/api/files/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path })
        });
      }
      closeFile(path);
      await refreshFileTree();
    } catch (err) {
      console.error("Failed to delete path:", err);
    }
  }, [isTauri, closeFile, refreshFileTree]);

  // Rename file or folder
  const renamePath = useCallback(async (oldPath: string, newPath: string) => {
    try {
      if (isTauri) {
        await invoke("native_rename_path", { oldPath, newPath });
      } else {
        await fetch("/api/files/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath, newPath })
        });
      }
      
      setOpenTabs((prev) => prev.map((t) => (t === oldPath ? newPath : t)));
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
      if (fileCache[oldPath]) {
        setFileCache((prev) => {
          const next = { ...prev };
          next[newPath] = next[oldPath];
          delete next[oldPath];
          return next;
        });
      }

      await refreshFileTree();
    } catch (err) {
      console.error("Failed to rename path:", err);
    }
  }, [isTauri, activeFile, fileCache, refreshFileTree]);

  // Create folder
  const createFolder = useCallback(async (path: string) => {
    try {
      if (isTauri) {
        await invoke("native_create_directory", { path });
      } else {
        await fetch("/api/files/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path })
        });
      }
      await refreshFileTree();
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  }, [isTauri, refreshFileTree]);

  return {
    fileTree,
    rootName,
    activeFile,
    openTabs,
    fileCache,
    loading,
    openFile,
    closeFile,
    saveFile,
    refreshFileTree,
    closeFolder,
    selectFolder,
    deletePath,
    renamePath,
    createFolder
  };
}
