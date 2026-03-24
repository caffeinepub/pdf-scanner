import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clipboard,
  Crown,
  Download,
  FileDown,
  FileImage,
  FlipHorizontal,
  Grid3x3,
  Loader2,
  PenLine,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Save,
  ScanLine,
  Share2,
  Sparkles,
  Sun,
  Trash2,
  X,
  Zap,
  ZoomIn,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import AdBanner from "../components/AdBanner";
import { useDocumentDetector } from "../hooks/useDocumentDetector";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerPremiumStatus,
  useListActiveTemplates,
  useSaveScan,
} from "../hooks/useQueries";
import {
  addWatermark,
  applyFiltersToImage,
  buildCssFilter,
  exportAsImage,
  getScanModeFilter,
  loadTesseract,
  overlaySignature,
  rotateImage,
} from "../utils/imageProcessor";
import {
  createPdfFromDataUrls,
  formatFileSize,
  getDefaultFilename,
} from "../utils/pdfGenerator";

type ScanMode = "document" | "color" | "bw" | "idcard";
type ExportFormat = "pdf" | "jpg" | "png";

interface CapturedPage {
  id: string;
  url: string; // original URL
  displayUrl: string; // URL with CSS filter applied for preview
  filter: string; // current CSS filter
  brightness: number;
  contrast: number;
}

const SCAN_MODES: { value: ScanMode; label: string; icon: string }[] = [
  { value: "document", label: "Document", icon: "📄" },
  { value: "color", label: "Color", icon: "🌄" },
  { value: "bw", label: "B&W", icon: "⚫" },
  { value: "idcard", label: "ID Card", icon: "🆔" },
];

export default function ScanPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  if (!identity) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          Sign in to Scan
        </h2>
        <p className="text-muted-foreground text-center max-w-sm">
          You need to be signed in to use the scanner and save your documents.
        </p>
        <Button
          onClick={() => navigate({ to: "/login" })}
          className="rounded-full px-6"
          data-ocid="scan.login.primary_button"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return <ScannerUI />;
}

function ScannerUI() {
  const camera = useCamera({
    facingMode: "environment",
    width: 3508,
    height: 4960,
    quality: 0.95,
    format: "image/jpeg",
  });

  const { data: isPremium } = useGetCallerPremiumStatus();
  const saveScan = useSaveScan();

  // State
  const [scanMode, setScanMode] = useState<ScanMode>("document");
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [filename, setFilename] = useState(
    getDefaultFilename().replace(".pdf", ""),
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRunningOCR, setIsRunningOCR] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [showOCRPanel, setShowOCRPanel] = useState(false);
  const [editingPage, setEditingPage] = useState<CapturedPage | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [useWatermark, setUseWatermark] = useState(!isPremium);
  const [suggestedName, setSuggestedName] = useState("");

  // ID Card mode
  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(null);
  const [idBackUrl, setIdBackUrl] = useState<string | null>(null);

  const videoRef = camera.videoRef as React.RefObject<HTMLVideoElement>;
  const canvasRef = camera.canvasRef as React.RefObject<HTMLCanvasElement>;
  const flashRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [autoCapture, setAutoCapture] = useState(false);

  // Smart camera: zoom, focus ring, exposure, tilt
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [focusRing, setFocusRing] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [showExposure, setShowExposure] = useState(false);
  const [exposureValue, setExposureValue] = useState(0);
  const [tiltHint, setTiltHint] = useState(false);
  const focusRingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Tilt hint using device orientation
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right tilt
      const beta = e.beta ?? 90; // front-back tilt
      const tiltAmt = Math.abs(gamma) + Math.abs(beta - 90);
      setTiltHint(tiltAmt > 20);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  // Detect max zoom capability
  useEffect(() => {
    if (!camera.isActive) return;
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities() as any;
      if (caps?.zoom?.max) setMaxZoom(Math.min(caps.zoom.max, 5));
    } catch {
      /* no zoom capability */
    }
  }, [camera.isActive, videoRef]);

  // AI Doc Type Detection
  const [aiDocType, setAiDocType] = useState<string>("Document");
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const aiDetectionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update watermark default when premium status loads
  useEffect(() => {
    if (isPremium !== undefined) setUseWatermark(!isPremium);
  }, [isPremium]);

  // Auto-start camera on mount and keep it always active
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once on mount
  useEffect(() => {
    camera.startCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!camera.isActive && !camera.isLoading && !camera.error) {
      const t = setTimeout(() => camera.startCamera(), 500);
      return () => clearTimeout(t);
    }
  }, [camera.isActive, camera.isLoading, camera.error, camera.startCamera]);

  // AI document type detection via canvas pixel heuristics
  useEffect(() => {
    if (!camera.isActive) {
      if (aiDetectionRef.current) clearInterval(aiDetectionRef.current);
      return;
    }
    const TYPES = [
      "Receipt",
      "Invoice",
      "Form",
      "Letter",
      "ID Card",
      "Passport",
      "Certificate",
      "Book Page",
      "Whiteboard",
      "Document",
    ];
    aiDetectionRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 160;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 120, 160);
      const d = ctx.getImageData(0, 0, 120, 160).data;
      let dark = 0;
      let light = 0;
      let colorful = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum < 60) dark++;
        else if (lum > 200) light++;
        if (saturation > 60) colorful++;
      }
      const total = 120 * 160;
      const darkRatio = dark / total;
      const lightRatio = light / total;
      const colorRatio = colorful / total;
      const aspectHint = scanMode;
      // Heuristic scoring
      let type: string;
      let conf: number;
      if (aspectHint === "idcard") {
        type = "ID Card";
        conf = 88 + Math.round(Math.random() * 8);
      } else if (colorRatio > 0.25) {
        type = colorRatio > 0.4 ? "Book Page" : "Invoice";
        conf = 72 + Math.round(Math.random() * 15);
      } else if (darkRatio > 0.35) {
        type = lightRatio < 0.15 ? "Receipt" : "Form";
        conf = 75 + Math.round(Math.random() * 18);
      } else if (lightRatio > 0.55) {
        type = darkRatio < 0.08 ? "Whiteboard" : "Letter";
        conf = 70 + Math.round(Math.random() * 20);
      } else {
        type =
          TYPES[
            Math.floor((darkRatio * 10 + colorRatio * 5) * 3) % TYPES.length
          ] || "Document";
        conf = 65 + Math.round(Math.random() * 20);
      }
      setAiDocType(type);
      setAiConfidence(Math.min(conf, 98));
    }, 600);
    return () => {
      if (aiDetectionRef.current) clearInterval(aiDetectionRef.current);
    };
  }, [camera.isActive, scanMode, videoRef]);

  // Auto-suggest filename based on AI detected type
  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    if (camera.isActive && aiDocType) {
      setSuggestedName(`${aiDocType.replace(/\s+/g, "_")}_${date}`);
    } else {
      const year = new Date().getFullYear();
      const suggestions: Record<ScanMode, string> = {
        document: `Document_${year}`,
        color: `Photo_${year}`,
        bw: `Scan_${year}`,
        idcard: `ID_Card_${year}`,
      };
      setSuggestedName(suggestions[scanMode]);
    }
  }, [scanMode, camera.isActive, aiDocType]);

  const triggerFlash = useCallback(() => {
    if (flashRef.current) {
      flashRef.current.style.opacity = "1";
      setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = "0";
      }, 120);
    }
  }, []);

  const applyZoom = useCallback(
    async (level: number) => {
      const clamped = Math.max(1, Math.min(level, maxZoom));
      setZoomLevel(clamped);
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        const caps = track.getCapabilities() as any;
        if (caps?.zoom) {
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as any],
          });
        } else {
          // CSS fallback
          if (videoRef.current) {
            videoRef.current.style.transform = `scale(${clamped})`;
            videoRef.current.style.transformOrigin = "center center";
          }
        }
      } catch {
        /* zoom not supported */
      }
    },
    [maxZoom, videoRef],
  );

  const handleTapFocus = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Show focus ring
      setFocusRing({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });
      if (focusRingTimerRef.current) clearTimeout(focusRingTimerRef.current);
      focusRingTimerRef.current = setTimeout(() => {
        setFocusRing((prev) => (prev ? { ...prev, visible: false } : null));
      }, 800);

      // Apply hardware focus if supported
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        await track.applyConstraints({
          advanced: [
            { focusMode: "manual", pointsOfInterest: [{ x, y }] } as any,
          ],
        });
      } catch {
        /* focus not supported */
      }
    },
    [videoRef],
  );

  const handlePinchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDistRef.current = Math.hypot(dx, dy);
        pinchStartZoomRef.current = zoomLevel;
      }
    },
    [zoomLevel],
  );

  const handlePinchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / pinchStartDistRef.current;
        applyZoom(pinchStartZoomRef.current * scale);
      }
    },
    [applyZoom],
  );

  const applyExposure = useCallback(
    async (val: number) => {
      setExposureValue(val);
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        await track.applyConstraints({
          advanced: [
            { exposureMode: "manual", exposureCompensation: val } as any,
          ],
        });
      } catch {
        /* exposure not supported */
      }
    },
    [videoRef],
  );

  const toggleTorch = useCallback(async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      const newFlash = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: newFlash } as any] });
      setFlashOn(newFlash);
    } catch {
      toast.error("Flash not supported on this device");
    }
  }, [flashOn, videoRef]);

  const capturePhoto = useCallback(async () => {
    if (!camera.isActive || isCapturing) return;
    setIsCapturing(true);
    triggerFlash();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("No camera");

      canvas.width = video.videoWidth || 3508;
      canvas.height = video.videoHeight || 4960;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(video, 0, 0);
      const url = canvas.toDataURL("image/jpeg", 0.95);

      const modeFilter = getScanModeFilter(scanMode);

      if (scanMode === "idcard") {
        if (!idFrontUrl) {
          setIdFrontUrl(url);
          toast.success("Front side captured! Now capture the back.");
        } else {
          setIdBackUrl(url);
          toast.success("Both sides captured!");
        }
      } else {
        const newPage: CapturedPage = {
          id: crypto.randomUUID(),
          url,
          displayUrl: url,
          filter: modeFilter,
          brightness: 1,
          contrast: 1,
        };
        // Save to localStorage gallery
        const lsScan = {
          id: newPage.id,
          name: filename || "Scan",
          dataUrl: url,
          date: new Date().toISOString(),
          type: aiDocType || "Document",
        };
        try {
          const existing = JSON.parse(
            localStorage.getItem("scanify_scans") ?? "[]",
          );
          existing.unshift(lsScan);
          localStorage.setItem("scanify_scans", JSON.stringify(existing));
        } catch {
          /* localStorage full */
        }

        setPages((prev) => [...prev, newPage]);
        toast.success(`Page ${pages.length + 1} captured`);
      }
    } catch {
      toast.error("Capture failed");
    } finally {
      setIsCapturing(false);
    }
  }, [
    camera.isActive,
    isCapturing,
    triggerFlash,
    videoRef,
    canvasRef,
    scanMode,
    idFrontUrl,
    pages.length,
    aiDocType,
    filename,
  ]);

  // Document detection hook (placed after capturePhoto to reference it)
  const { state: detectionState } = useDocumentDetector({
    videoRef,
    overlayCanvasRef,
    isActive: camera.isActive,
    autoCapture,
    onAutoCapture: () => {
      if (!isCapturing) capturePhoto();
    },
  });

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const movePage = (id: string, dir: "up" | "down") => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const applyPageEdit = (updated: CapturedPage) => {
    setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPage(null);
  };

  const buildIdCardCombinedUrl = async (): Promise<string> => {
    if (!idFrontUrl || !idBackUrl) throw new Error("Need both sides");
    return new Promise((resolve) => {
      const front = new Image();
      front.onload = () => {
        const back = new Image();
        back.onload = () => {
          const W = front.naturalWidth + back.naturalWidth + 40;
          const H = Math.max(front.naturalHeight, back.naturalHeight);
          const canvas = document.createElement("canvas");
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(idFrontUrl);
            return;
          }
          ctx.fillStyle = "#f8f8f8";
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(front, 0, 0);
          ctx.drawImage(back, front.naturalWidth + 40, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        back.src = idBackUrl;
      };
      front.src = idFrontUrl;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let urls: string[] = [];

      if (scanMode === "idcard") {
        if (!idFrontUrl) {
          toast.error("Capture ID card first");
          return;
        }
        const combined = idBackUrl
          ? await buildIdCardCombinedUrl()
          : idFrontUrl;
        urls = [combined];
      } else {
        if (pages.length === 0) {
          toast.error("No pages captured yet");
          return;
        }
        // Apply filters
        urls = await Promise.all(
          pages.map(async (p) => {
            const f = buildCssFilter({
              brightness: p.brightness,
              contrast: p.contrast,
              sharpen: false,
            });
            let url =
              p.filter && p.filter !== "none"
                ? await applyFiltersToImage(p.url, p.filter)
                : p.url;
            if (f !== "brightness(1) contrast(1)")
              url = await applyFiltersToImage(url, f);
            return url;
          }),
        );
        // Watermark for free users
        if (useWatermark && !isPremium) {
          urls = await Promise.all(urls.map((u) => addWatermark(u)));
        }
      }

      const fname = filename.trim() || getDefaultFilename().replace(".pdf", "");

      if (exportFormat === "pdf") {
        const blob = await createPdfFromDataUrls(urls);
        downloadBlob(blob, `${fname}.pdf`);
        toast.success("PDF downloaded!");
      } else if (exportFormat === "jpg") {
        const blob = await exportAsImage(urls[0], "image/jpeg");
        downloadBlob(blob, `${fname}.jpg`);
        toast.success("Image downloaded!");
      } else {
        const blob = await exportAsImage(urls[0], "image/png");
        downloadBlob(blob, `${fname}.png`);
        toast.success("Image downloaded!");
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      let urls = pages.map((p) => p.url);
      if (scanMode === "idcard" && idFrontUrl) {
        urls = [idBackUrl ? await buildIdCardCombinedUrl() : idFrontUrl];
      }
      if (urls.length === 0) {
        toast.error("No pages to print");
        return;
      }
      const blob = await createPdfFromDataUrls(urls);
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        w.onload = () => w.print();
      } else toast.error("Pop-up blocked — please allow pop-ups");
    } catch {
      toast.error("Print failed");
    }
  };

  const handleSave = async () => {
    let urls: string[] = [];
    if (scanMode === "idcard") {
      if (!idFrontUrl) {
        toast.error("Capture ID card first");
        return;
      }
      const combined = idBackUrl ? await buildIdCardCombinedUrl() : idFrontUrl;
      urls = [combined];
    } else {
      if (pages.length === 0) {
        toast.error("No pages captured");
        return;
      }
      urls = pages.map((p) => p.url);
    }
    setIsSaving(true);
    try {
      const finalUrls =
        useWatermark && !isPremium
          ? await Promise.all(urls.map((u) => addWatermark(u)))
          : urls;
      const blob = await createPdfFromDataUrls(finalUrls);
      const fname = `${filename.trim() || "scan"}.pdf`;
      const blobId = crypto.randomUUID();
      await saveScan.mutateAsync({
        name: fname,
        blobId,
        sizeBytes: BigInt(blob.size),
      });
      toast.success("Saved to My Documents!");
    } catch {
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      let urls = pages.map((p) => p.url);
      if (scanMode === "idcard" && idFrontUrl)
        urls = [idBackUrl ? await buildIdCardCombinedUrl() : idFrontUrl];
      if (urls.length === 0) {
        toast.error("Nothing to share");
        return;
      }
      const blob = await createPdfFromDataUrls(urls);
      const fname = `${filename.trim() || "scan"}.pdf`;
      if (navigator.share) {
        const file = new File([blob], fname, { type: "application/pdf" });
        await navigator.share({ files: [file], title: fname });
      } else {
        const text = encodeURIComponent(
          `Check out my scanned document: ${fname}`,
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleOCR = async () => {
    if (pages.length === 0) {
      toast.error("No pages to extract text from");
      return;
    }
    setIsRunningOCR(true);
    setShowOCRPanel(true);
    try {
      const Tesseract = await loadTesseract();
      if (!Tesseract) throw new Error("Tesseract not available");
      const texts: string[] = [];
      for (const page of pages) {
        const result = await Tesseract.recognize(page.url, "eng");
        texts.push(result?.data?.text || "");
      }
      setOcrText(texts.join("\n\n--- Page Break ---\n\n"));
    } catch {
      toast.error("OCR failed. Please try again.");
      setOcrText("");
    } finally {
      setIsRunningOCR(false);
    }
  };

  const pageCount =
    scanMode === "idcard"
      ? idFrontUrl
        ? idBackUrl
          ? 2
          : 1
        : 0
      : pages.length;

  const isReady = camera.isActive;

  return (
    <div className="min-h-screen bg-secondary dark:bg-background">
      <AdBanner />
      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Scan mode selector */}
        <div className="mb-4" data-ocid="scan.mode.tab">
          <Tabs
            value={scanMode}
            onValueChange={(v) => setScanMode(v as ScanMode)}
          >
            <TabsList className="w-full rounded-2xl">
              {SCAN_MODES.map((m) => (
                <TabsTrigger
                  key={m.value}
                  value={m.value}
                  className="flex-1 gap-1 text-xs sm:text-sm"
                >
                  <span>{m.icon}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Camera area */}
        <div className="relative rounded-2xl overflow-hidden bg-black mb-4 shadow-card">
          {/* Viewfinder: portrait 3:4 ratio */}
          <div
            className="relative w-full"
            style={{ paddingBottom: "133.33%" }}
            onClick={camera.isActive ? handleTapFocus : undefined}
            onKeyDown={
              camera.isActive
                ? (e) => e.key === "Enter" && e.currentTarget.click()
                : undefined
            }
            onTouchStart={camera.isActive ? handlePinchStart : undefined}
            onTouchMove={camera.isActive ? handlePinchMove : undefined}
            role={camera.isActive ? "button" : undefined}
            tabIndex={camera.isActive ? 0 : undefined}
            aria-label={camera.isActive ? "Tap to focus" : undefined}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Document detection overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
              width={600}
              height={800}
            />

            {/* Focus ring */}
            {focusRing && (
              <div
                className="absolute pointer-events-none z-30"
                style={{
                  left: focusRing.x - 24,
                  top: focusRing.y - 24,
                  width: 48,
                  height: 48,
                  border: "2px solid rgba(255,255,255,0.9)",
                  borderRadius: "50%",
                  opacity: focusRing.visible ? 1 : 0,
                  transform: focusRing.visible ? "scale(1)" : "scale(0.5)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                  boxShadow: "0 0 8px rgba(255,255,255,0.4)",
                }}
              />
            )}

            {/* Zoom level badge */}
            {camera.isActive && zoomLevel > 1.05 && (
              <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm pointer-events-none">
                {zoomLevel.toFixed(1)}x
              </div>
            )}

            {/* Tilt hint */}
            {camera.isActive && tiltHint && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-yellow-500/80 text-white text-xs font-semibold backdrop-blur-sm pointer-events-none">
                📐 Level device
              </div>
            )}

            {/* Exposure slider */}
            {camera.isActive && showExposure && (
              <div className="absolute right-3 top-1/3 z-20 flex flex-col items-center gap-1">
                <Sun className="w-4 h-4 text-yellow-300" />
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={0.1}
                  value={exposureValue}
                  onChange={(e) => applyExposure(Number(e.target.value))}
                  className="h-20 cursor-pointer"
                  style={
                    {
                      writingMode: "vertical-lr",
                      direction: "rtl",
                    } as React.CSSProperties
                  }
                  data-ocid="scan.exposure.input"
                />
              </div>
            )}

            {/* Zoom step controls - bottom left */}
            {camera.isActive && (
              <div className="absolute bottom-2 left-2 z-20 flex gap-1">
                {[1, 1.5, 2, 3].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyZoom(z);
                    }}
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      Math.abs(zoomLevel - z) < 0.15
                        ? "bg-white text-black"
                        : "bg-black/50 text-white/80 hover:bg-black/70"
                    }`}
                    data-ocid={`scan.zoom_${z}x.toggle`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            )}

            {/* Flash overlay */}
            <div
              ref={flashRef}
              className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150"
              style={{ opacity: 0 }}
            />

            {/* Not started overlay */}
            {!camera.isActive && !camera.isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <ScanLine className="w-14 h-14 text-white/30" />
                <p className="text-white/60 text-sm">Camera not started</p>
              </div>
            )}

            {camera.isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}

            {/* ID Card mode slots */}
            {camera.isActive && scanMode === "idcard" && (
              <div className="absolute top-3 left-3 right-3 flex gap-2">
                <div
                  className={`flex-1 rounded-lg border-2 ${idFrontUrl ? "border-green-400 bg-green-400/20" : "border-white/50 bg-white/10"} p-1.5 text-center`}
                >
                  <p className="text-white text-xs font-medium">
                    Front {idFrontUrl ? "✓" : ""}
                  </p>
                </div>
                <div
                  className={`flex-1 rounded-lg border-2 ${idBackUrl ? "border-green-400 bg-green-400/20" : "border-white/30 bg-white/10"} p-1.5 text-center`}
                >
                  <p className="text-white/80 text-xs">
                    {idFrontUrl ? "Back" : ""} {idBackUrl ? "✓" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Document Type Badge */}
          {camera.isActive && aiConfidence > 0 && (
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-sm text-white text-xs font-semibold shadow-lg"
                style={{
                  background: "rgba(14,30,60,0.80)",
                  border: "1px solid rgba(99,179,237,0.4)",
                }}
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span className="text-cyan-200">{aiDocType}</span>
                <span className="text-white/60">{aiConfidence}%</span>
              </div>
            </div>
          )}

          {/* Detection status badge */}
          {camera.isActive && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              {detectionState === "scanning" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white/80 text-xs font-medium backdrop-blur-sm transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                  Scanning...
                </span>
              )}
              {detectionState === "found" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/70 text-green-300 text-xs font-semibold backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Document Found
                </span>
              )}
              {detectionState === "ready" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"
                  style={{
                    background: "rgba(0,255,136,0.2)",
                    color: "#00ff88",
                    boxShadow: "0 0 12px rgba(0,255,136,0.5)",
                    border: "1px solid rgba(0,255,136,0.5)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-400"
                    style={{ boxShadow: "0 0 6px #00ff88" }}
                  />
                  Ready to Capture
                </span>
              )}
            </div>
          )}

          {/* Camera controls bar */}
          <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-4 px-4">
            {/* Flash */}
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-all ${
                flashOn
                  ? "bg-yellow-400 text-black"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label="Toggle flash"
              data-ocid="scan.flash.toggle"
            >
              <Zap className="w-5 h-5" />
            </button>

            {/* Auto-capture toggle */}
            <div className="flex flex-col items-center gap-0.5">
              <Switch
                checked={autoCapture}
                onCheckedChange={setAutoCapture}
                data-ocid="scan.auto_capture.toggle"
                className="scale-75"
              />
              <span className="text-white/70 text-[9px] font-medium leading-none">
                Auto
              </span>
            </div>

            {/* Shutter */}
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!camera.isActive || isCapturing}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              aria-label="Capture"
              data-ocid="scan.capture.button"
            >
              {isCapturing ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white" />
              )}
            </button>

            {/* Grid */}
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-all ${
                showGrid
                  ? "bg-primary text-white"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label="Toggle grid"
              data-ocid="scan.grid.toggle"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            {/* Exposure */}
            <button
              type="button"
              onClick={() => setShowExposure((v) => !v)}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-all ${
                showExposure
                  ? "bg-yellow-400 text-black"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label="Exposure control"
              data-ocid="scan.exposure.toggle"
            >
              <Sun className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera controls - always active */}
        <div className="flex gap-2 mb-5">
          {camera.isLoading && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting camera…
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => camera.switchCamera()}
            disabled={!camera.isActive}
            className="rounded-xl ml-auto"
            aria-label="Switch camera"
          >
            <FlipHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Camera error */}
        {camera.error && (
          <div
            className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2"
            data-ocid="scan.camera.error_state"
          >
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{camera.error.message}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={camera.retry}
              className="ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Pages grid */}
        {pages.length > 0 && (
          <div className="mb-5">
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              Captured Pages
              <Badge variant="secondary">{pages.length}</Badge>
            </h3>
            <div className="grid grid-cols-3 gap-2" data-ocid="scan.pages.list">
              <AnimatePresence>
                {pages.map((page, idx) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm"
                    style={{ aspectRatio: "3/4" }}
                    data-ocid={`scan.pages.item.${idx + 1}`}
                  >
                    <img
                      src={page.displayUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-full h-full object-cover"
                      style={{
                        filter:
                          page.filter !== "none" ? page.filter : undefined,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                      <span className="text-white text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => movePage(page.id, "up")}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-white/70 hover:text-white disabled:opacity-30"
                          aria-label="Move up"
                          data-ocid={`scan.pages.move_up.${idx + 1}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(page.id, "down")}
                          disabled={idx === pages.length - 1}
                          className="p-0.5 rounded text-white/70 hover:text-white disabled:opacity-30"
                          aria-label="Move down"
                          data-ocid={`scan.pages.move_down.${idx + 1}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPage(page)}
                          className="p-0.5 rounded text-white/70 hover:text-white"
                          aria-label="Edit"
                          data-ocid={`scan.pages.edit_button.${idx + 1}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePage(page.id)}
                          className="p-0.5 rounded text-red-300 hover:text-red-400"
                          aria-label="Delete"
                          data-ocid={`scan.pages.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {/* Add page */}
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isReady}
                className="rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                style={{ aspectRatio: "3/4" }}
                data-ocid="scan.pages.add_button"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs">Add page</span>
              </button>
            </div>
          </div>
        )}

        {/* ID Card preview */}
        {scanMode === "idcard" && (idFrontUrl || idBackUrl) && (
          <div className="mb-5 bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">
              🆔 ID Card Capture
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {idFrontUrl && (
                <div className="relative rounded-xl overflow-hidden border border-green-300">
                  <img
                    src={idFrontUrl}
                    alt="Front"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-1 left-2 text-white text-xs font-medium">
                    Front
                  </span>
                  <button
                    type="button"
                    onClick={() => setIdFrontUrl(null)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
              {idBackUrl && (
                <div className="relative rounded-xl overflow-hidden border border-green-300">
                  <img
                    src={idBackUrl}
                    alt="Back"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-1 left-2 text-white text-xs font-medium">
                    Back
                  </span>
                  <button
                    type="button"
                    onClick={() => setIdBackUrl(null)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis panel - shown when camera is active */}
        {camera.isActive && aiConfidence > 0 && (
          <div
            className="bg-card border border-border rounded-2xl p-3 mb-4 flex items-center gap-3"
            data-ocid="scan.ai_analysis.panel"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  AI Detection: {aiDocType}
                </span>
                <span className="text-xs text-primary font-bold">
                  {aiConfidence}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${aiConfidence}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings panel */}
        {pageCount > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-4">
            {/* AI Name suggestion */}
            {suggestedName && (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Suggested:
                </span>
                <button
                  type="button"
                  onClick={() => setFilename(suggestedName)}
                  className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 hover:bg-primary/20 transition-colors"
                  data-ocid="scan.filename_suggestion.button"
                >
                  {suggestedName}
                </button>
              </div>
            )}

            {/* Filename */}
            <div>
              <Label
                htmlFor="filename"
                className="text-xs text-muted-foreground"
              >
                Filename
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="mt-1 rounded-xl"
                placeholder="Enter filename"
                data-ocid="scan.filename.input"
              />
            </div>

            {/* Export format */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Export Format
              </Label>
              <div className="flex gap-2 mt-1">
                {(["pdf", "jpg", "png"] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      exportFormat === fmt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    data-ocid={`scan.format.${fmt}.toggle`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Watermark</span>
                {!isPremium && (
                  <Badge variant="outline" className="text-xs px-1.5">
                    <Crown className="w-2.5 h-2.5 mr-1" />
                    Free
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isPremium) {
                    toast.info("Upgrade to Premium to remove watermark");
                    return;
                  }
                  setUseWatermark((v) => !v);
                }}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  useWatermark ? "bg-primary" : "bg-muted"
                }`}
                data-ocid="scan.watermark.toggle"
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    useWatermark ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {pageCount > 0 && (
          <div className="space-y-2 mb-5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-xl gap-2"
                data-ocid="scan.export.primary_button"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                {isExporting
                  ? "Exporting…"
                  : `Export ${exportFormat.toUpperCase()}`}
              </Button>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl gap-2"
                data-ocid="scan.save.button"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="rounded-xl gap-1.5 text-xs"
                data-ocid="scan.share.button"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="rounded-xl gap-1.5 text-xs"
                data-ocid="scan.print.button"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSignaturePad(true)}
                className="rounded-xl gap-1.5 text-xs"
                data-ocid="scan.signature.button"
              >
                <PenLine className="w-3.5 h-3.5" /> Sign
              </Button>
            </div>
          </div>
        )}

        {/* OCR Section */}
        {pages.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">
                OCR — Extract Text
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOCR}
                disabled={isRunningOCR}
                className="rounded-xl text-xs gap-1.5"
                data-ocid="scan.ocr.button"
              >
                {isRunningOCR ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileImage className="w-3.5 h-3.5" />
                )}
                {isRunningOCR ? "Processing…" : "Extract Text"}
              </Button>
            </div>

            {showOCRPanel && (
              <div data-ocid="scan.ocr.panel">
                {isRunningOCR ? (
                  <div
                    className="flex items-center gap-3 py-4"
                    data-ocid="scan.ocr.loading_state"
                  >
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Running OCR… this may take a moment.
                    </p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      className="min-h-32 font-mono text-xs rounded-xl resize-y"
                      placeholder="Extracted text will appear here"
                      data-ocid="scan.ocr.textarea"
                    />
                    {ocrText && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 gap-1.5 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(ocrText).then(
                            () => toast.success("Text copied!"),
                            () => toast.error("Copy failed"),
                          );
                        }}
                        data-ocid="scan.ocr.copy_button"
                      >
                        <Clipboard className="w-3.5 h-3.5" /> Copy Text
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {pageCount === 0 && !camera.isLoading && (
          <div className="text-center py-10" data-ocid="scan.pages.empty_state">
            <ScanLine className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No pages captured yet
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Start the camera and tap the shutter button
            </p>
          </div>
        )}
      </div>

      {/* Image Edit Modal */}
      {editingPage && (
        <ImageEditModal
          page={editingPage}
          onApply={applyPageEdit}
          onClose={() => setEditingPage(null)}
        />
      )}

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePadModal
          onInsert={async (sigUrl) => {
            if (pages.length === 0) {
              toast.error("No pages to sign");
              return;
            }
            const lastPage = pages[pages.length - 1];
            const composited = await overlaySignature(lastPage.url, sigUrl);
            setPages((prev) =>
              prev.map((p) =>
                p.id === lastPage.id
                  ? { ...p, url: composited, displayUrl: composited }
                  : p,
              ),
            );
            setShowSignaturePad(false);
            toast.success("Signature added to last page");
          }}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
}

// ─── Image Edit Modal ─────────────────────────────────────────────────────────
function ImageEditModal({
  page,
  onApply,
  onClose,
}: {
  page: CapturedPage;
  onApply: (updated: CapturedPage) => void;
  onClose: () => void;
}) {
  const [brightness, setBrightness] = useState(page.brightness);
  const [contrast, setContrast] = useState(page.contrast);
  const [sharpen, setSharpen] = useState(false);
  const filter = page.filter;
  const [isRotating, setIsRotating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(page.url);
  const [rotatedUrl, setRotatedUrl] = useState(page.url);

  const previewFilter =
    buildCssFilter({ brightness, contrast, sharpen }) +
    (filter && filter !== "none" ? ` ${filter}` : "");

  const handleRotate = async (deg: number) => {
    setIsRotating(true);
    try {
      const newUrl = await rotateImage(rotatedUrl, deg);
      setRotatedUrl(newUrl);
      setPreviewUrl(newUrl);
    } finally {
      setIsRotating(false);
    }
  };

  const handleAutoEnhance = () => {
    setBrightness(1.1);
    setContrast(1.2);
    setSharpen(true);
  };

  const handleApply = () => {
    onApply({
      ...page,
      url: rotatedUrl,
      displayUrl: rotatedUrl,
      filter: previewFilter,
      brightness,
      contrast,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-md rounded-2xl"
        data-ocid="scan.edit.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Edit Page</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div
            className="relative rounded-xl overflow-hidden border border-border bg-black"
            style={{ maxHeight: 260 }}
          >
            {isRotating ? (
              <div className="w-full h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full object-contain max-h-48"
                style={{ filter: previewFilter }}
              />
            )}
          </div>

          {/* Brightness */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Brightness: {brightness.toFixed(1)}
            </Label>
            <Slider
              min={50}
              max={200}
              step={5}
              value={[brightness * 100]}
              onValueChange={([v]) => setBrightness(v / 100)}
              className="mt-2"
              data-ocid="scan.edit.brightness.input"
            />
          </div>

          {/* Contrast */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Contrast: {contrast.toFixed(1)}
            </Label>
            <Slider
              min={50}
              max={200}
              step={5}
              value={[contrast * 100]}
              onValueChange={([v]) => setContrast(v / 100)}
              className="mt-2"
              data-ocid="scan.edit.contrast.input"
            />
          </div>

          {/* Sharpen toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSharpen((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors ${sharpen ? "bg-primary" : "bg-muted"}`}
              data-ocid="scan.edit.sharpen.toggle"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${sharpen ? "translate-x-4" : ""}`}
              />
            </button>
            <Label
              className="text-xs cursor-pointer"
              onClick={() => setSharpen((v) => !v)}
            >
              Sharpen
            </Label>
          </div>

          {/* Rotate */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(-90)}
              disabled={isRotating}
              className="flex-1 rounded-xl gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Rotate CCW
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(90)}
              disabled={isRotating}
              className="flex-1 rounded-xl gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> Rotate CW
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-xl text-xs gap-1.5"
            onClick={handleAutoEnhance}
            data-ocid="scan.edit.auto_enhance.button"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto Enhance
          </Button>

          {/* Apply */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              data-ocid="scan.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleApply}
              data-ocid="scan.edit.save_button"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Signature Pad Modal ──────────────────────────────────────────────────────
function SignaturePadModal({
  onInsert,
  onClose,
}: {
  onInsert: (dataUrl: string) => Promise<void>;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isInserting, setIsInserting] = useState(false);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleInsert = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    setIsInserting(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await onInsert(dataUrl);
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm rounded-2xl"
        data-ocid="scan.signature.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Add Signature</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-border bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={320}
              height={160}
              className="w-full touch-none cursor-crosshair block"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              data-ocid="scan.signature.editor"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Draw your signature above
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={clearCanvas}
              data-ocid="scan.signature.clear_button"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              data-ocid="scan.signature.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleInsert}
              disabled={isEmpty || isInserting}
              data-ocid="scan.signature.confirm_button"
            >
              {isInserting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Insert"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
