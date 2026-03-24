import { useCallback, useEffect, useRef, useState } from "react";

export type DetectionState = "idle" | "scanning" | "found" | "ready";

export interface Corner {
  x: number; // 0..1 relative to display canvas
  y: number;
}

export interface DocumentDetectorResult {
  state: DetectionState;
  corners: Corner[] | null;
}

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onAutoCapture?: () => void;
  autoCapture?: boolean;
}

const DETECT_W = 320;
const DETECT_H = 240;
const STABLE_MS = 1500;

function toGrayscale(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

function sobelEdge(gray: Uint8Array, w: number, h: number): Uint8Array {
  const edges = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] +
        -2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] +
        -gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] +
        -2 * gray[(y - 1) * w + x] +
        -gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * w + x] = mag > 30 ? 255 : 0;
    }
  }
  return edges;
}

function findDocumentCorners(
  edges: Uint8Array,
  w: number,
  h: number,
): Corner[] | null {
  // Scan inward from each edge to find the first strong edge row/col
  const threshold = 0.04; // fraction of row/col pixels that must be edges
  const minEdgePx = 3;

  let top = -1;
  let bottom = -1;
  let left = -1;
  let right = -1;

  // top
  for (let y = 2; y < h - 2 && top === -1; y++) {
    let cnt = 0;
    for (let x = 0; x < w; x++) if (edges[y * w + x]) cnt++;
    if (cnt / w > threshold && cnt >= minEdgePx) top = y;
  }
  // bottom
  for (let y = h - 3; y > 2 && bottom === -1; y--) {
    let cnt = 0;
    for (let x = 0; x < w; x++) if (edges[y * w + x]) cnt++;
    if (cnt / w > threshold && cnt >= minEdgePx) bottom = y;
  }
  // left
  for (let x = 2; x < w - 2 && left === -1; x++) {
    let cnt = 0;
    for (let y = 0; y < h; y++) if (edges[y * w + x]) cnt++;
    if (cnt / h > threshold && cnt >= minEdgePx) left = x;
  }
  // right
  for (let x = w - 3; x > 2 && right === -1; x--) {
    let cnt = 0;
    for (let y = 0; y < h; y++) if (edges[y * w + x]) cnt++;
    if (cnt / h > threshold && cnt >= minEdgePx) right = x;
  }

  if (top === -1 || bottom === -1 || left === -1 || right === -1) return null;

  const minW = w * 0.2;
  const minH = h * 0.2;
  if (right - left < minW || bottom - top < minH) return null;

  return [
    { x: left / w, y: top / h },
    { x: right / w, y: top / h },
    { x: right / w, y: bottom / h },
    { x: left / w, y: bottom / h },
  ];
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  corners: Corner[] | null,
  state: DetectionState,
  showGrid: boolean,
) {
  ctx.clearRect(0, 0, w, h);

  if (corners && (state === "found" || state === "ready")) {
    const pts = corners.map((c) => ({ x: c.x * w, y: c.y * h }));
    const isReady = state === "ready";
    const color = isReady ? "#00ff88" : "#22dd66";
    const lineWidth = isReady ? 2.5 : 2;

    // Glow shadow
    if (isReady) {
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 12;
    }

    // Quad outline
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (!isReady) {
      ctx.setLineDash([8, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Corner circles
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      if (isReady) {
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 16;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else {
    // Draw corner bracket guides
    const i = w * 0.075;
    const bLen = w * 0.14;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    const drawBracket = (ox: number, oy: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(ox, oy + dy * bLen);
      ctx.lineTo(ox, oy);
      ctx.lineTo(ox + dx * bLen, oy);
      ctx.stroke();
    };
    drawBracket(i, i, 1, 1);
    drawBracket(w - i, i, -1, 1);
    drawBracket(i, h - i, 1, -1);
    drawBracket(w - i, h - i, -1, -1);
  }

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    for (let f = 1; f <= 2; f++) {
      ctx.beginPath();
      ctx.moveTo((w * f) / 3, 0);
      ctx.lineTo((w * f) / 3, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h * f) / 3);
      ctx.lineTo(w, (h * f) / 3);
      ctx.stroke();
    }
  }
}

export function useDocumentDetector({
  videoRef,
  overlayCanvasRef,
  isActive,
  onAutoCapture,
  autoCapture = false,
}: Options): DocumentDetectorResult {
  const [state, setState] = useState<DetectionState>("idle");
  const [corners, setCorners] = useState<Corner[] | null>(null);

  const rafRef = useRef<number>(0);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const autoCapturedRef = useRef(false);
  const showGridRef = useRef(false);
  const autoCaptureRef = useRef(autoCapture);
  autoCaptureRef.current = autoCapture;

  const detect = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !overlay || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    // Ensure offscreen canvas
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
      offscreenRef.current.width = DETECT_W;
      offscreenRef.current.height = DETECT_H;
    }
    const offscreen = offscreenRef.current;
    const octx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!octx) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    octx.drawImage(video, 0, 0, DETECT_W, DETECT_H);
    const imgData = octx.getImageData(0, 0, DETECT_W, DETECT_H);
    const gray = toGrayscale(imgData.data, DETECT_W, DETECT_H);
    const edges = sobelEdge(gray, DETECT_W, DETECT_H);
    const detected = findDocumentCorners(edges, DETECT_W, DETECT_H);

    const ow = overlay.width;
    const oh = overlay.height;
    const octxDraw = overlay.getContext("2d");
    if (!octxDraw) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = Date.now();

    if (detected) {
      if (!stableStartRef.current) stableStartRef.current = now;
      const elapsed = now - stableStartRef.current;
      let newState: DetectionState = elapsed >= STABLE_MS ? "ready" : "found";

      setCorners(detected);
      setState(newState);
      drawOverlay(octxDraw, ow, oh, detected, newState, showGridRef.current);

      if (
        newState === "ready" &&
        autoCaptureRef.current &&
        !autoCapturedRef.current
      ) {
        autoCapturedRef.current = true;
        onAutoCapture?.();
      }
      if (newState !== "ready") autoCapturedRef.current = false;
    } else {
      stableStartRef.current = null;
      autoCapturedRef.current = false;
      setCorners(null);
      setState("scanning");
      drawOverlay(octxDraw, ow, oh, null, "scanning", showGridRef.current);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef, overlayCanvasRef, onAutoCapture]);

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      setState("idle");
      setCorners(null);
      stableStartRef.current = null;
      autoCapturedRef.current = false;
      // Clear overlay
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        const ctx = overlay.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
      return;
    }
    setState("scanning");
    rafRef.current = requestAnimationFrame(detect);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, detect, overlayCanvasRef]);

  return { state, corners };
}
