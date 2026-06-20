import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  direction?: "vertical" | "horizontal";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  style?: React.CSSProperties;
}

export function ResizeHandle({
  direction = "vertical",
  onResize,
  onResizeEnd,
  style
}: ResizeHandleProps) {
  const isDragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastPos.current = direction === "vertical" ? e.clientX : e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const pos = direction === "vertical" ? ev.clientX : ev.clientY;
        const delta = pos - lastPos.current;
        lastPos.current = pos;
        onResize(delta);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onResizeEnd?.();
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, onResize, onResizeEnd]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: direction === "vertical" ? "6px" : "100%",
        height: direction === "vertical" ? "100%" : "6px",
        cursor: direction === "vertical" ? "col-resize" : "row-resize",
        backgroundColor: "transparent",
        position: "relative",
        margin: direction === "vertical" ? "0 -3px" : "-3px 0",
        flexShrink: 0,
        zIndex: 100,
        ...style
      }}
    >
      {/* Visible hover indicator */}
      <div
        style={{
          position: "absolute",
          top: direction === "vertical" ? 0 : "50%",
          left: direction === "vertical" ? "50%" : 0,
          transform: direction === "vertical" ? "translateX(-50%)" : "translateY(-50%)",
          width: direction === "vertical" ? "2px" : "100%",
          height: direction === "vertical" ? "100%" : "2px",
          transition: "background-color 0.15s ease"
        }}
        className="resize-handle-indicator"
      />
    </div>
  );
}
