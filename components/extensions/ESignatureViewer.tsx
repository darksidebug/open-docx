import React, { useCallback, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Move, MoveDiagonal, PenLine, Trash2, Upload } from "lucide-react";
import SignaturePad from "./SignaturePad";

const ESignatureViewer: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, deleteNode, selected } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { x, y, width, height, src, signedBy, signedAt } = node.attrs;

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Only the box itself starts a move — buttons/handles stop propagation.
      e.preventDefault();
      setIsDragging(true);

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startX = x;
      const startY = y;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextX = Math.max(0, startX + (moveEvent.clientX - startClientX));
        const nextY = Math.max(0, startY + (moveEvent.clientY - startClientY));
        updateAttributes({ x: Math.round(nextX), y: Math.round(nextY) });
      };

      const handlePointerUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [x, y, updateAttributes],
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startWidth = width;
      const startHeight = height;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.max(80, startWidth + (moveEvent.clientX - startClientX));
        const nextHeight = Math.max(40, startHeight + (moveEvent.clientY - startClientY));
        updateAttributes({ width: Math.round(nextWidth), height: Math.round(nextHeight) });
      };

      const handlePointerUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [width, height, updateAttributes],
  );

  const handleSaveSignature = useCallback(
    (dataUrl: string) => {
      updateAttributes({ src: dataUrl, signedAt: new Date().toISOString() });
      setShowPad(false);
    },
    [updateAttributes],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-selecting the same file later
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          updateAttributes({ src: reader.result, signedAt: new Date().toISOString() });
        }
      };
      reader.readAsDataURL(file);
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      style={{ position: "absolute", left: x, top: y, width, height, zIndex: selected ? 20 : 10 }}
      className="group"
    >
      <div
        onPointerDown={handleDragStart}
        className={`relative size-full cursor-move rounded border-2 border-dashed bg-white/80 ${
          selected || isDragging ? "border-blue-400" : "border-gray-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          onPointerDown={(e) => e.stopPropagation()}
        />

        {src ? (
          <img src={src} alt="Signature" className="size-full object-contain p-1" draggable={false} />
        ) : (
          <div
            className="flex size-full flex-col items-center justify-center gap-y-1 text-gray-400"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPad(true);
                }}
                className="flex flex-col items-center gap-y-0.5 hover:text-blue-500"
              >
                <PenLine className="size-4" />
                <span className="text-[10px]">Draw</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-y-0.5 hover:text-blue-500"
              >
                <Upload className="size-4" />
                <span className="text-[10px]">Upload</span>
              </button>
            </div>
          </div>
        )}

        {/* Hover/selected toolbar */}
        <div
          className={`absolute -top-9 left-0 flex items-center gap-x-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg transition-opacity ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Move className="size-3.5 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowPad(true)}
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title={src ? "Re-draw" : "Draw"}
          >
            <PenLine className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            title={src ? "Replace with an uploaded image" : "Upload an image"}
          >
            <Upload className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="rounded p-1 text-red-500 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {showPad && <SignaturePad onSave={handleSaveSignature} onCancel={() => setShowPad(false)} />}

        {src && (signedBy || signedAt) && (
          <div className="absolute -bottom-4 left-0 whitespace-nowrap text-[10px] text-gray-400">
            {signedBy ? `Signed by ${signedBy}` : "Signed"}
            {signedAt ? ` · ${new Date(signedAt).toLocaleDateString()}` : ""}
          </div>
        )}

        {/* Resize handle */}
        <div
          onPointerDown={handleResizeStart}
          className={`absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 shadow transition-opacity ${
            selected || isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Drag to resize"
        >
          <MoveDiagonal className="size-3 text-gray-500" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default ESignatureViewer;
