import React, { useCallback, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, MoveDiagonal, PenLine, Trash2, Upload } from "lucide-react";
import SignaturePad from "./SignaturePad";

const ESignatureViewer: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, deleteNode, selected } = props;
  const [isResizing, setIsResizing] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { width, height, src, name } = node.attrs;
  const alignment = node.attrs.alignment || "left";
  const isActive = selected || isResizing;

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

  const getContainerStyle = (): React.CSSProperties => {
    switch (alignment) {
      case "center":
        return { display: "flex", justifyContent: "center" };
      case "right":
        return { display: "flex", justifyContent: "flex-end" };
      case "left":
      default:
        return { display: "flex", justifyContent: "flex-start" };
    }
  };

  return (
    <NodeViewWrapper as="div" contentEditable={false} style={getContainerStyle()} className="my-4 group">
      <div
        style={{ width }}
        className={`relative rounded border-2 border-dashed bg-white/80 p-1.5 ${
          isActive ? "border-blue-400" : "border-transparent"
        }`}
      >
        {/* Hover/selected toolbar */}
        <div
          className={`absolute -top-9 left-0 flex items-center gap-x-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "left" })}
            className={`rounded p-1 hover:bg-gray-100 ${alignment === "left" ? "text-blue-500 bg-gray-100" : "text-gray-600"}`}
            title="Align Left"
          >
            <AlignLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "center" })}
            className={`rounded p-1 hover:bg-gray-100 ${alignment === "center" ? "text-blue-500 bg-gray-100" : "text-gray-600"}`}
            title="Align Center"
          >
            <AlignCenter className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "right" })}
            className={`rounded p-1 hover:bg-gray-100 ${alignment === "right" ? "text-blue-500 bg-gray-100" : "text-gray-600"}`}
            title="Align Right"
          >
            <AlignRight className="size-3.5" />
          </button>
          <div className="h-4 w-px bg-gray-200 mx-0.5" />
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          onPointerDown={(e) => e.stopPropagation()}
        />

        {/* Signature image area */}
        <div style={{ height }} className="relative">
          {src ? (
            <img src={src} alt="Signature" className="size-full object-contain" draggable={false} />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-y-1 text-gray-400">
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

          {/* Resize handle (resizes the image area only) */}
          <div
            onPointerDown={handleResizeStart}
            className={`absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 shadow transition-opacity ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Drag to resize"
          >
            <MoveDiagonal className="size-3 text-gray-500" />
          </div>
        </div>

        {/* Signer's typed name, on an underlined line beneath the image */}
        <input
          type="text"
          value={name || ""}
          onChange={(e) => updateAttributes({ name: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Enter your name"
          draggable={false}
          className="w-full border-0 border-b border-gray-500 bg-transparent text-center text-[13px] outline-none placeholder:text-gray-400 pb-0.5"
        />

        {/* Fixed caption */}
        <div className="mt-1 text-center text-[10px] text-gray-500">Name and Signature</div>

        {showPad && <SignaturePad onSave={handleSaveSignature} onCancel={() => setShowPad(false)} />}
      </div>
    </NodeViewWrapper>
  );
};

export default ESignatureViewer;
