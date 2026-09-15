import React, { useRef, useState, useCallback, useEffect } from "react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Crops a canvas down to the bounding box of its non-transparent pixels
 * (plus a small padding), so the exported image's own bounds tightly wrap
 * the drawn ink instead of whatever blank margin happens to surround it on
 * the drawing pad. Without this, the signature can look off-center in its
 * frame even though the frame itself centers the image — the image's own
 * pixel bounds just aren't centered on the ink.
 */
function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return canvas; // nothing drawn

  const padding = 6;
  const trimmedX = Math.max(0, minX - padding);
  const trimmedY = Math.max(0, minY - padding);
  const trimmedWidth = Math.min(width, maxX + padding) - trimmedX + 1;
  const trimmedHeight = Math.min(height, maxY + padding) - trimmedY + 1;

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  trimmedCanvas
    .getContext("2d")
    ?.drawImage(canvas, trimmedX, trimmedY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

  return trimmedCanvas;
}

/** A small canvas-based "draw your signature" popover — mouse or touch. */
const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2937";
  }, []);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      drawingRef.current = true;
      lastPointRef.current = getPoint(e);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [getPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPointRef.current) return;

      const point = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      setIsEmpty(false);
    },
    [getPoint],
  );

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(trimCanvas(canvas).toDataURL("image/png"));
  }, [isEmpty, onSave]);

  return (
    <div
      className="absolute z-30 rounded-lg border border-gray-300 bg-white p-2 shadow-2xl"
      style={{ top: "100%", left: 0, marginTop: 4 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <canvas
        ref={canvasRef}
        width={280}
        height={120}
        className="cursor-crosshair rounded border border-dashed border-gray-300 bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="mt-1.5 flex items-center justify-between gap-x-2">
        <button
          type="button"
          onClick={handleClear}
          className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          Clear
        </button>
        <div className="flex items-center gap-x-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
