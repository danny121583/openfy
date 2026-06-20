import React from "react";

// --- REUSABLE BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({ variant = "primary", icon, children, className = "", style, ...props }: ButtonProps) {
  const getStyleClass = () => {
    switch (variant) {
      case "primary": return "btn-primary";
      case "danger": return "btn-secondary"; // Modified styling override
      case "ghost": return "";
      default: return "btn-secondary";
    }
  };

  const ghostStyles: React.CSSProperties = variant === "ghost" ? {
    padding: "6px 12px",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "var(--transition-smooth)"
  } : {};

  // Red text for danger variant
  const dangerStyles: React.CSSProperties = variant === "danger" ? {
    borderColor: "var(--accent-red)",
    color: "var(--accent-red)"
  } : {};

  const combinedStyles = {
    ...ghostStyles,
    ...dangerStyles,
    ...style
  };

  return (
    <button 
      className={`${getStyleClass()} ${className}`} 
      style={combinedStyles}
      {...props}
    >
      {icon && <span className="flex-center">{icon}</span>}
      {children}
    </button>
  );
}

// --- REUSABLE CARD / PANEL ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  children: React.ReactNode;
}

export function Card({ glass = false, children, className = "", style, ...props }: CardProps) {
  const combinedStyles = {
    padding: "16px",
    ...style
  };

  return (
    <div 
      className={`${glass ? "glass-panel" : "glass-card"} ${className}`} 
      style={combinedStyles}
      {...props}
    >
      {children}
    </div>
  );
}

// --- REUSABLE TEXT INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      {label && <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</label>}
      <input style={style} {...props} />
      {error && <span style={{ fontSize: "11px", color: "var(--accent-red)" }}>{error}</span>}
    </div>
  );
}

// --- REUSABLE ICON BUTTON ---
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
}

export function IconButton({ icon, tooltip, tooltipPosition = "top", style, className = "", ...props }: IconButtonProps) {
  return (
    <button 
      className={`flex-center ${className}`} 
      data-tooltip={tooltip}
      data-tooltip-position={tooltipPosition}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "4px",
        color: "var(--text-secondary)",
        transition: "var(--transition-smooth)",
        ...style
      }}
      {...props}
    >
      {icon}
    </button>
  );
}

// --- REUSABLE BADGE ---
interface BadgeProps {
  color?: "indigo" | "cyan" | "green" | "red" | "yellow";
  children: React.ReactNode;
}

export function Badge({ color = "indigo", children }: BadgeProps) {
  const getColorValue = () => {
    switch (color) {
      case "cyan": return "var(--accent-secondary)";
      case "green": return "var(--accent-green)";
      case "red": return "var(--accent-red)";
      case "yellow": return "var(--accent-yellow)";
      default: return "var(--accent-primary)";
    }
  };

  return (
    <span style={{
      fontSize: "11px",
      fontWeight: 500,
      padding: "2px 8px",
      borderRadius: "12px",
      backgroundColor: `rgba(255, 255, 255, 0.04)`,
      border: `1px solid ${getColorValue()}`,
      color: getColorValue(),
      whiteSpace: "nowrap"
    }}>
      {children}
    </span>
  );
}
