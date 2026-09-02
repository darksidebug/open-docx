import React, { useRef, useState, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveDiagonal,
  Trash2
} from "lucide-react";

const ImageResizeViewer: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, deleteNode, selected } = props;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const alignment = node.attrs.alignment || "center";
  const width = node.attrs.width || "100%";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = imageRef.current?.offsetWidth || 300;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentX = moveEvent.clientX;
        const newWidth = Math.max(100, startWidth + (currentX - startX));
        updateAttributes({ width: `${newWidth}px` });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes]
  );

  const getContainerStyle = (): React.CSSProperties => {
    switch (alignment) {
      case "left":
        return { display: "flex", justifyContent: "flex-start" };
      case "right":
        return { display: "flex", justifyContent: "flex-end" };
      case "center":
      default:
        return { display: "flex", justifyContent: "center" };
    }
  };

  return (
    <NodeViewWrapper style={getContainerStyle()} className="my-4">
      <div
        className={`relative group inline-block ${
          selected ? "ring-2 ring-blue-500 ring-offset-2 rounded" : ""
        }`}
        style={{ width: width, maxWidth: "100%" }}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || ""}
          className="w-full h-auto block rounded"
        />

        <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-zinc-800 p-1.5 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 z-10 after:content-[''] after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-4">
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "left" })}
            className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
              alignment === "left" ? "text-blue-500 bg-zinc-100" : "text-zinc-600 dark:text-zinc-300"
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "center" })}
            className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
              alignment === "center" ? "text-blue-500 bg-zinc-100" : "text-zinc-600 dark:text-zinc-300"
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "right" })}
            className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
              alignment === "right" ? "text-blue-500 bg-zinc-100" : "text-zinc-600 dark:text-zinc-300"
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={deleteNode}
            className="p-1.5 rounded hover:bg-red-500 text-red-500 hover:text-white dark:hover:bg-red-950/30"
            title="Delete Image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div
          onMouseDown={handleMouseDown}
          className={`absolute bottom-2 right-2 p-1 rounded-md bg-white/90 dark:bg-zinc-800/90 shadow cursor-se-resize transition-opacity ${
            selected || isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Drag to resize"
        >
          <MoveDiagonal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default ImageResizeViewer;