import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FlipHorizontal,
  QrCode,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQRScanner } from "../qr-code/useQRScanner";

export default function QRScannerPage() {
  const scanner = useQRScanner({
    facingMode: "environment",
    scanInterval: 150,
    maxResults: 20,
  });

  const videoRef = scanner.videoRef as React.RefObject<HTMLVideoElement>;
  const canvasRef = scanner.canvasRef as React.RefObject<HTMLCanvasElement>;

  const latestResult = scanner.qrResults[0] ?? null;
  const prevResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (latestResult && latestResult.data !== prevResultRef.current) {
      prevResultRef.current = latestResult.data;
      toast.success("QR / Barcode detected!", { duration: 2000 });
    }
  }, [latestResult]);

  const isUrl = (s: string) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              QR & Barcode Scanner
            </h1>
            <p className="text-xs text-muted-foreground">
              Point camera at any QR code or barcode
            </p>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square mb-4 shadow-card">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner frame overlay */}
          {scanner.isActive && (
            <div className="absolute inset-0 pointer-events-none">
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                role="presentation"
              >
                {/* corner brackets */}
                {[
                  [
                    [15, 25],
                    [15, 15],
                    [25, 15],
                  ],
                  [
                    [75, 15],
                    [85, 15],
                    [85, 25],
                  ],
                  [
                    [15, 75],
                    [15, 85],
                    [25, 85],
                  ],
                  [
                    [75, 85],
                    [85, 85],
                    [85, 75],
                  ],
                ].map((pts) => (
                  <polyline
                    key={pts[0].join(",")}
                    points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill="none"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                ))}
                {/* scanning line */}
                <line
                  x1="20"
                  y1="50"
                  x2="80"
                  y2="50"
                  stroke="oklch(0.65 0.2 262.9 / 0.8)"
                  strokeWidth="0.5"
                  className="origin-center animate-pulse"
                />
              </svg>
            </div>
          )}

          {/* Not started overlay */}
          {!scanner.isActive && !scanner.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <QrCode className="w-16 h-16 text-white/40" />
              <p className="text-white/70 text-sm">Camera not started</p>
            </div>
          )}

          {/* Loading */}
          {scanner.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Latest result flash */}
          <AnimatePresence>
            {latestResult && (
              <motion.div
                key={latestResult.data}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-white text-xs truncate flex-1">
                  {latestResult.data}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Camera controls */}
        <div className="flex gap-2 mb-5">
          {!scanner.isScanning ? (
            <Button
              onClick={scanner.startScanning}
              disabled={!scanner.isReady}
              className="flex-1 gap-2 rounded-xl"
              data-ocid="qr.start_scan.button"
            >
              <Camera className="w-4 h-4" />
              Start Scanner
            </Button>
          ) : (
            <Button
              onClick={scanner.stopScanning}
              variant="destructive"
              className="flex-1 gap-2 rounded-xl"
              data-ocid="qr.stop_scan.button"
            >
              Stop Scanner
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={scanner.switchCamera}
            disabled={!scanner.isActive}
            className="rounded-xl"
            aria-label="Switch camera"
            data-ocid="qr.switch_camera.button"
          >
            <FlipHorizontal className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scanner.clearResults}
            disabled={scanner.qrResults.length === 0}
            className="rounded-xl"
            aria-label="Clear results"
            data-ocid="qr.clear.button"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Error */}
        {scanner.error && (
          <div
            className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2"
            data-ocid="qr.error_state"
          >
            <p className="text-destructive text-sm">{scanner.error.message}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={scanner.retry}
              className="ml-auto gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </Button>
          </div>
        )}

        {/* Results list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-sm">
              Scan Results
            </h2>
            <Badge variant="secondary">{scanner.qrResults.length}</Badge>
          </div>

          {scanner.qrResults.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl border border-dashed border-border"
              data-ocid="qr.results.empty_state"
            >
              <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No results yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Scan a QR code or barcode to see results
              </p>
            </div>
          ) : (
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-2">
                <AnimatePresence initial={false}>
                  {scanner.qrResults.map((result, idx) => (
                    <motion.div
                      key={`${result.data}-${result.timestamp}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-card border border-border rounded-xl p-3"
                      data-ocid={`qr.results.item.${idx + 1}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground break-all line-clamp-2">
                            {result.data}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(result.data)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            aria-label="Copy"
                            data-ocid={`qr.copy.button.${idx + 1}`}
                          >
                            <ClipboardCopy className="w-3.5 h-3.5" />
                          </button>
                          {isUrl(result.data) && (
                            <a
                              href={result.data}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                              aria-label="Open link"
                              data-ocid={`qr.open_link.button.${idx + 1}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {isUrl(result.data) && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          URL
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
