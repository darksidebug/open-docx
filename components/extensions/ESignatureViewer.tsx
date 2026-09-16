import React, { useCallback, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, MoveDiagonal, PenLine, Trash2, Upload } from "lucide-react";
import SignaturePad from "./SignaturePad";
import FontFamily from "../ui/toolbars/FontFamily";
import FontSize from "../ui/toolbars/FontSize";
import { useEditorStore } from "@/store/useEditorStore";
import { useDebounce } from "@/hooks/useDebounce";

const ESignatureViewer: React.FC<NodeViewProps> = (props) => {
  const { editor, fontSizes } = useEditorStore();
  const { node, updateAttributes, deleteNode, selected } = props;
  const [isResizing, setIsResizing] = useState(false);
  const [isMovingImage, setIsMovingImage] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { width, height, src } = node.attrs;
  const isNameEmpty = node.content.size === 0;
  const imageX = node.attrs.imageX || 0;
  const imageY = node.attrs.imageY || 0;
  const alignment = node.attrs.alignment || "left";
  const isActive = selected || isResizing || isMovingImage;

  const handleSetFontSize = useDebounce((size: string) => {
    editor?.chain()?.focus()?.setFontSize(`${size?.toString()?.trim()}px`)?.run()
  }, 300);

  // Nudges the image within its own fixed-size box (e.g. to use the slack
  // space `object-fit: contain` leaves when the image's aspect ratio doesn't
  // match the box's) — a local, in-frame adjustment, not a page position.
  const handleImageDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!src) return;
      e.preventDefault();
      e.stopPropagation();
      setIsMovingImage(true);

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startImageX = imageX;
      const startImageY = imageY;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextImageX = startImageX + (moveEvent.clientX - startClientX);
        const nextImageY = startImageY + (moveEvent.clientY - startClientY);
        // Clamped so the image can't be dragged comically far past its box
        // (object-position has no inherent limit of its own).
        updateAttributes({
          imageX: Math.round(Math.max(-width / 2, Math.min(width / 2, nextImageX))),
          imageY: Math.round(Math.max(-height / 2, Math.min(height / 2, nextImageY))),
        });
      };

      const handlePointerUp = () => {
        setIsMovingImage(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [src, width, height, imageX, imageY, updateAttributes],
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
    <NodeViewWrapper as="div" style={getContainerStyle()} className="my-4 group">
      <div
        style={{ width }}
        className={`relative rounded border-2 border-dashed bg-white p-1.5 ${
          isActive ? "border-blue-400" : "border-transparent"
        }`}
        // Everything in this block is decorative chrome, not editable
        // content — EXCEPT the <NodeViewContent> further down, which
        // overrides this back to editable for just its own DOM node (a
        // standard, browser-supported "editable island" nested inside a
        // non-editable ancestor).
        contentEditable={false}
      >
        {/* Hover/selected toolbar */}
        <div
          className={`absolute z-20 -top-7 left-0 flex items-center gap-x-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "left" })}
            className={`rounded p-1.25 hover:bg-zinc-200 ${alignment === "left" ? "text-blue-500 bg-zinc-200" : "text-gray-600"}`}
            title="Align Left"
          >
            <AlignLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "center" })}
            className={`rounded p-1.25 hover:bg-zinc-200 ${alignment === "center" ? "text-blue-500 bg-zinc-200" : "text-gray-600"}`}
            title="Align Center"
          >
            <AlignCenter className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ alignment: "right" })}
            className={`rounded p-1.25 hover:bg-zinc-200 ${alignment === "right" ? "text-blue-500 bg-zinc-200" : "text-gray-600"}`}
            title="Align Right"
          >
            <AlignRight className="size-3.5" />
          </button>
          <div className="h-4 w-px bg-gray-200 mx-0.5" />
          <button
            type="button"
            onClick={() => setShowPad(true)}
            className="rounded p-1.25 text-gray-600 hover:bg-zinc-200"
            title={src ? "Re-draw" : "Draw"}
          >
            <PenLine className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1.25 text-gray-600 hover:bg-zinc-200"
            title={src ? "Replace with an uploaded image" : "Upload an image"}
          >
            <Upload className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="rounded p-1.25 text-red-500 hover:bg-red-50"
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
        <div style={{ height }} className='relative z-2 overflow-hidden bg-white'>
          {src ? (
            <img
              src={src}
              alt="Signature"
              className="size-full object-contain cursor-move"
              style={{ 
                objectPosition: `calc(50% + ${imageX}px) calc(50% + ${imageY}px)`, 
                mixBlendMode: 'multiply',
                filter: 'contrast(150%) brightness(110%)' // Forces light grey background to pure white
              }}
              draggable={false}
              onPointerDown={handleImageDragStart}
            />
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
            className={`absolute bottom-0.5 right-0.5 rounded bg-white/90 p-0.5 shadow transition-opacity cursor-nw-resize ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Drag to resize"
          >
            <MoveDiagonal className="size-3 text-gray-500" />
          </div>
        </div>

        {/* Signer's typed name — real editable ProseMirror content (not a
            plain attribute), so marks like bold apply to it normally via
            the editor's own toolbar/shortcuts. */}
        <div className="relative z-1 border-b border-gray-500 pb-0.5">
          {isNameEmpty && (
            <span className="pointer-events-none absolute inset-0 text-center text-gray-400">
              Enter your name
            </span>
          )}
          <NodeViewContent
            as="div"
            // NodeViewContent doesn't set contentEditable itself — without
            // this, it inherits `false` from the wrapping div above (which
            // needs to stay non-editable for the image/buttons/caption
            // around it), so nothing could be typed here at all.
            contentEditable
            className="min-h-[1.2em] w-full text-center outline-none bg-transparent"
          />
        </div>

        {/* Fixed caption */}
        <div className="mt-1 text-center text-gray-500">Name and e-Signature</div>

        {showPad && <SignaturePad onSave={handleSaveSignature} onCancel={() => setShowPad(false)} />}
      </div>
    </NodeViewWrapper>
  );
};

export default ESignatureViewer;
