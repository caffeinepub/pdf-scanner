function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface ProcessedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

async function processImageToJpeg(url: string): Promise<ProcessedImage> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 800;
  canvas.height = img.naturalHeight || 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(img, 0, 0);
  const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = jpegUrl.split(",")[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { bytes, width: canvas.width, height: canvas.height };
}

export async function createPdfFromDataUrls(dataUrls: string[]): Promise<Blob> {
  if (dataUrls.length === 0) throw new Error("No images provided");

  const processedImages = await Promise.all(dataUrls.map(processImageToJpeg));

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  const append = (data: string | Uint8Array) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    totalBytes += bytes.length;
  };

  const currentPos = () => totalBytes;

  const N = processedImages.length;
  const A4W = 595.28;
  const A4H = 841.89;

  // Object layout:
  // 1 = Catalog, 2 = Pages
  // [3 .. 2+N] = Page objects
  // [3+N .. 2+2N] = Content streams
  // [3+2N .. 2+3N] = Image XObjects
  const maxObjNum = 2 + 3 * N;
  const pageStart = 3;
  const contentStart = 3 + N;
  const imageStart = 3 + 2 * N;
  const objOffsets: number[] = new Array(maxObjNum + 1).fill(0);

  // Header
  append("%PDF-1.4\n");
  // Binary hint bytes
  append(new Uint8Array([37, 226, 227, 207, 211, 10]));

  // Object 1: Catalog
  objOffsets[1] = currentPos();
  append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  const kids = Array.from({ length: N }, (_, i) => `${pageStart + i} 0 R`).join(
    " ",
  );
  objOffsets[2] = currentPos();
  append(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`);

  // Page objects
  for (let i = 0; i < N; i++) {
    objOffsets[pageStart + i] = currentPos();
    append(
      `${pageStart + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4W} ${A4H}] /Contents ${contentStart + i} 0 R /Resources << /XObject << /Im${i} ${imageStart + i} 0 R >> >> >>\nendobj\n`,
    );
  }

  // Content streams
  for (let i = 0; i < N; i++) {
    const { width, height } = processedImages[i];
    let w = A4W;
    let h = (height / width) * A4W;
    if (h > A4H) {
      h = A4H;
      w = (width / height) * A4H;
    }
    const x = ((A4W - w) / 2).toFixed(4);
    const y = ((A4H - h) / 2).toFixed(4);
    const stream = `q\n${w.toFixed(4)} 0 0 ${h.toFixed(4)} ${x} ${y} cm\n/Im${i} Do\nQ\n`;
    const streamBytes = encoder.encode(stream);
    objOffsets[contentStart + i] = currentPos();
    append(
      `${contentStart + i} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`,
    );
    append(stream);
    append("endstream\nendobj\n");
  }

  // Image XObjects
  for (let i = 0; i < N; i++) {
    const { bytes, width, height } = processedImages[i];
    objOffsets[imageStart + i] = currentPos();
    append(
      `${imageStart + i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
    );
    append(bytes);
    append("\nendstream\nendobj\n");
  }

  // xref table
  const xrefOffset = currentPos();
  append(`xref\n0 ${maxObjNum + 1}\n`);
  append("0000000000 65535 f \n");
  for (let i = 1; i <= maxObjNum; i++) {
    append(`${String(objOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  // Trailer
  append(
    `trailer\n<< /Size ${maxObjNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  // Combine all chunks
  const result = new Uint8Array(totalBytes);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return new Blob([result], { type: "application/pdf" });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getDefaultFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `scan_${y}${m}${d}.pdf`;
}

export function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTimestamp(ts: bigint): string {
  // IC timestamps are nanoseconds
  const ms = Number(ts / BigInt(1_000_000));
  if (ms === 0) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
