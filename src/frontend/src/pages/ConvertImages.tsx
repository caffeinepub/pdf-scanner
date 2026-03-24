import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileImage,
  ImagePlus,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type Format = "PDF" | "PNG" | "JPG";
type Status = "idle" | "processing" | "done" | "error";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

// ─── Minimal PDF Builder ──────────────────────────────────────────────────────
async function imageToJpegDataUrl(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.9),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function buildPdf(files: SelectedFile[]): Promise<Blob> {
  const PAGE_W = 595;
  const PAGE_H = 842;

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];

  const push = (str: string) => {
    const bytes = enc.encode(str);
    parts.push(bytes);
    offset += bytes.length;
    return offset;
  };

  const pushBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    offset += bytes.length;
  };

  push("%PDF-1.4\n");

  const images = await Promise.all(
    files.map((f) => imageToJpegDataUrl(f.file)),
  );

  const n = images.length;
  const catalogId = 1;
  const pagesId = 2;
  const firstPageId = 3;
  const firstImageId = firstPageId + n;

  offsets[catalogId] = offset;
  push(
    `${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`,
  );

  const pageRefs = Array.from(
    { length: n },
    (_, i) => `${firstPageId + i} 0 R`,
  ).join(" ");
  offsets[pagesId] = offset;
  push(
    `${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${n} >>\nendobj\n`,
  );

  const contentIds: number[] = [];
  const contentStartId = firstImageId + n;

  for (let i = 0; i < n; i++) {
    const imgId = firstImageId + i;
    const pageId = firstPageId + i;
    const contentId = contentStartId + i;
    contentIds.push(contentId);

    const { width: iw, height: ih } = images[i];
    const scaleX = PAGE_W / iw;
    const scaleY = PAGE_H / ih;
    const scale = Math.min(scaleX, scaleY, 1);
    const dw = Math.round(iw * scale);
    const dh = Math.round(ih * scale);
    const dx = Math.round((PAGE_W - dw) / 2);
    const dy = Math.round((PAGE_H - dh) / 2);

    offsets[pageId] = offset;
    push(
      `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const stream = `q ${dw} 0 0 ${dh} ${dx} ${dy} cm /Im${i} Do Q`;
    const streamBytes = enc.encode(stream);
    offsets[contentId] = offset;
    push(`${contentId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
    pushBytes(streamBytes);
    push("\nendstream\nendobj\n");
  }

  for (let i = 0; i < n; i++) {
    const imgId = firstImageId + i;
    const { dataUrl, width: iw, height: ih } = images[i];
    const base64 = dataUrl.split(",")[1];
    const jpegBytes = base64ToBytes(base64);

    offsets[imgId] = offset;
    push(
      `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    );
    pushBytes(jpegBytes);
    push("\nendstream\nendobj\n");
  }

  const xrefOffset = offset;
  const totalObjs = contentStartId + n;
  push(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    const off = offsets[i] ?? 0;
    push(`${off.toString().padStart(10, "0")} 00000 n \n`);
  }

  push(
    `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return new Blob([result], { type: "application/pdf" });
}

async function convertToFormat(
  file: File,
  format: "PNG" | "JPG",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      if (format === "JPG") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Conversion failed"));
        },
        format === "PNG" ? "image/png" : "image/jpeg",
        0.92,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConvertImages() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [format, setFormat] = useState<Format>("PDF");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const items: SelectedFile[] = [];
    for (const f of Array.from(newFiles)) {
      if (!f.type.startsWith("image/")) continue;
      items.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }
    setFiles((prev) => [...prev, ...items]);
    setStatus("idle");
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const reset = () => {
    for (const f of files) URL.revokeObjectURL(f.previewUrl);
    setFiles([]);
    setStatus("idle");
    setProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleConvert = async () => {
    if (!files.length) {
      toast.error("Please select at least one image.");
      return;
    }
    setStatus("processing");
    setProgress(0);
    try {
      if (format === "PDF") {
        setProgress(30);
        const blob = await buildPdf(files);
        setProgress(90);
        triggerDownload(blob, `scanify-images-${Date.now()}.pdf`);
        setProgress(100);
      } else {
        for (let i = 0; i < files.length; i++) {
          const blob = await convertToFormat(files[i].file, format);
          const ext = format.toLowerCase();
          const name = files[i].file.name.replace(/\.[^.]+$/, "");
          triggerDownload(blob, `${name}-converted.${ext}`);
          setProgress(Math.round(((i + 1) / files.length) * 100));
          if (i < files.length - 1)
            await new Promise((r) => setTimeout(r, 300));
        }
      }
      setStatus("done");
      toast.success(
        format === "PDF"
          ? "PDF downloaded successfully!"
          : `${files.length} image(s) converted and downloaded!`,
      );
    } catch (err) {
      console.error(err);
      setStatus("error");
      toast.error("Conversion failed. Please try again.");
    }
  };

  const formats: Format[] = ["PDF", "PNG", "JPG"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <FileImage className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Convert Images
          </h1>
          <p className="text-muted-foreground text-base">
            Select pictures and convert them to PDF, PNG, or JPG instantly
          </p>
        </motion.div>

        {/* Format Selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-8"
          data-ocid="convert.format.tab"
        >
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              data-ocid={`convert.${f.toLowerCase()}.toggle`}
              className={`px-6 py-2 rounded-full text-sm font-semibold border transition-all ${
                format === f
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: file input handles keyboard */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-ocid="convert.dropzone"
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/60 hover:bg-accent/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
              data-ocid="convert.upload_button"
            />
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  dragging ? "bg-primary/20" : "bg-muted"
                }`}
              >
                <Upload
                  className={`w-7 h-7 transition-colors ${
                    dragging ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {dragging ? "Drop images here" : "Drag & drop images here"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or{" "}
                  <span className="text-primary font-medium underline underline-offset-2">
                    browse files
                  </span>{" "}
                  to select
                </p>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Supports JPG, PNG, WEBP, GIF, BMP — multiple files allowed
              </p>
            </div>
          </div>
        </motion.div>

        {/* Thumbnails Grid */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              key="thumbs"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary font-bold">{files.length}</span>{" "}
                  image{files.length !== 1 ? "s" : ""} selected
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  data-ocid="convert.add_more.button"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Add more
                </button>
              </div>
              <div
                className="grid grid-cols-3 sm:grid-cols-4 gap-3"
                data-ocid="convert.list"
              >
                <AnimatePresence>
                  {files.map((f, idx) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.2 }}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-sm"
                      data-ocid={`convert.item.${idx + 1}`}
                    >
                      <img
                        src={f.previewUrl}
                        alt={f.file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(f.id);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        data-ocid={`convert.delete_button.${idx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1 pt-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-[10px] truncate leading-tight">
                          {f.file.name}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <AnimatePresence>
          {status === "processing" && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-2"
              data-ocid="convert.loading_state"
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  Converting…
                </span>
                <span className="text-primary font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success / Error feedback */}
        <AnimatePresence>
          {status === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
              data-ocid="convert.success_state"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                Conversion complete! Your file(s) have been downloaded.
              </p>
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
              data-ocid="convert.error_state"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                Conversion failed. Please try again with valid image files.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={handleConvert}
            disabled={status === "processing" || files.length === 0}
            className="flex-1 h-12 text-base font-semibold rounded-xl gap-2"
            data-ocid="convert.submit_button"
          >
            {status === "processing" ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Converting…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Convert & Download as {format}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={reset}
            disabled={status === "processing"}
            className="sm:w-auto h-12 rounded-xl gap-2"
            data-ocid="convert.cancel_button"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </motion.div>

        {/* Empty state hint */}
        {files.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground/60 mt-6"
            data-ocid="convert.empty_state"
          >
            No images selected yet. Drop files above or click to browse.
          </motion.p>
        )}
      </div>
    </div>
  );
}
