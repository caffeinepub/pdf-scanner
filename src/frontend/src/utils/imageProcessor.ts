/**
 * imageProcessor.ts — canvas-based image processing utilities
 */

export function getScanModeFilter(mode: string): string {
  switch (mode) {
    case "document":
      return "grayscale(0.3) contrast(1.4) brightness(1.05)";
    case "bw":
      return "grayscale(1) contrast(2) brightness(1.1)";
    case "color":
      return "none";
    case "idcard":
      return "contrast(1.2) saturate(1.1)";
    default:
      return "none";
  }
}

export function buildCssFilter({
  brightness,
  contrast,
  sharpen,
}: {
  brightness: number;
  contrast: number;
  sharpen: boolean;
}): string {
  let f = `brightness(${brightness}) contrast(${contrast})`;
  if (sharpen) f += " contrast(1.15) saturate(1.1)";
  return f;
}

export async function addWatermark(
  dataUrl: string,
  text = "Scanify",
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      ctx.save();
      const size = Math.max(40, Math.floor(canvas.width / 15));
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillStyle = "rgba(160,160,160,0.30)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);
      // Tile watermark
      const step = size * 5;
      for (let y = -canvas.height; y < canvas.height; y += step) {
        for (let x = -canvas.width; x < canvas.width; x += step) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

export async function rotateImage(
  dataUrl: string,
  degrees: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const rad = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = img.naturalWidth * cos + img.naturalHeight * sin;
      const h = img.naturalWidth * sin + img.naturalHeight * cos;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

export async function overlaySignature(
  imageDataUrl: string,
  sigDataUrl: string,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sig = new Image();
      sig.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const sigW = canvas.width * 0.3;
        const sigH = (sig.naturalHeight / sig.naturalWidth) * sigW;
        const x = canvas.width - sigW - canvas.width * 0.02;
        const y = canvas.height - sigH - canvas.height * 0.02;
        ctx.globalAlpha = 0.75;
        ctx.drawImage(sig, x, y, sigW, sigH);
        ctx.globalAlpha = 1;
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      sig.src = sigDataUrl;
    };
    img.src = imageDataUrl;
  });
}

export async function applyFiltersToImage(
  dataUrl: string,
  filterStr: string,
): Promise<string> {
  if (!filterStr || filterStr === "none") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.filter = filterStr;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

export async function cropImage(
  dataUrl: string,
  crop: { x: number; y: number; width: number; height: number }, // 0-1 fractions
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const sx = crop.x * img.naturalWidth;
      const sy = crop.y * img.naturalHeight;
      const sw = crop.width * img.naturalWidth;
      const sh = crop.height * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

export async function exportAsImage(
  dataUrl: string,
  format: "image/jpeg" | "image/png",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to export"));
        },
        format,
        0.92,
      );
    };
    img.src = dataUrl;
  });
}

declare global {
  interface Window {
    Tesseract: any;
  }
}

export async function loadTesseract(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Browser only");
  if (window.Tesseract) return window.Tesseract;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("[data-tesseract]");
    if (existing) {
      // Already loading, wait
      const poll = setInterval(() => {
        if (window.Tesseract) {
          clearInterval(poll);
          resolve(window.Tesseract);
        }
      }, 200);
      return;
    }
    const script = document.createElement("script");
    script.setAttribute("data-tesseract", "1");
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Failed to load Tesseract.js"));
    document.head.appendChild(script);
  });
}
