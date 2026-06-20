import { X, Award, Cpu, ShieldCheck } from "lucide-react";
import { Button, IconButton } from "./CoreUI";

interface AboutPanelProps {
  onClose: () => void;
}

export function AboutPanel({ onClose }: AboutPanelProps) {
  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        userSelect: "none"
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel animate-fade-in"
        style={{
          width: "420px",
          padding: "30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          borderRadius: "12px",
          textAlign: "center"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div style={{ alignSelf: "flex-end", marginTop: "-16px", marginRight: "-16px", marginBottom: "8px" }}>
          <IconButton icon={<X size={18} />} onClick={onClose} tooltip="Close" tooltipPosition="left" />
        </div>

        {/* Icon / Brand Circle */}
        <div 
          className="flex-center" 
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            color: "#ffffff",
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "16px",
            boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)"
          }}
        >
          🛠️
        </div>

        {/* Display Title */}
        <h1 
          style={{ 
            fontSize: "24px", 
            fontWeight: 800, 
            fontFamily: "Outfit, sans-serif", 
            letterSpacing: "-0.02em",
            margin: "0 0 4px 0",
            color: "var(--text-primary)" 
          }}
        >
          FACTORY
        </h1>

        {/* Version Badge */}
        <div 
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--accent-secondary)",
            backgroundColor: "rgba(6, 182, 212, 0.08)",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            padding: "2px 8px",
            borderRadius: "12px",
            marginBottom: "20px"
          }}
        >
          v1.0.0
        </div>

        {/* Description */}
        <p 
          style={{ 
            fontSize: "13px", 
            color: "var(--text-secondary)", 
            lineHeight: 1.5,
            margin: "0 0 24px 0",
            padding: "0 10px" 
          }}
        >
          An autonomous, pair-programming workspace built to design, compile, test, and ship agentic software, AI agents, custom widgets, and full-stack applications without limitations.
        </p>

        {/* Specs Box */}
        <div 
          style={{ 
            width: "100%", 
            backgroundColor: "rgba(255, 255, 255, 0.02)", 
            border: "1px solid var(--border-color)", 
            borderRadius: "8px", 
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Cpu size={14} /> Core Engine
            </span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>OrbitAI OS</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} /> License
            </span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Proprietary</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Award size={14} /> Host Environment
            </span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Tauri & React</span>
          </div>
        </div>

        {/* Acknowledge Button */}
        <Button variant="secondary" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
          Close
        </Button>
      </div>
    </div>
  );
}
