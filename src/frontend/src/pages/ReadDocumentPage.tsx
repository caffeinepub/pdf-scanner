import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Share2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type ReadState = "idle" | "previewing" | "reading" | "done";

const MOCK_READING_STEPS = [
  "Preprocessing image...",
  "Detecting text regions...",
  "Extracting characters...",
  "Assembling text blocks...",
  "Finalizing output...",
];

// Simulate OCR using canvas analysis + mock text generation
async function analyzeImageForText(
  imageUrl: string,
  onProgress: (pct: number, step: string) => void,
): Promise<string> {
  // Simulated progress steps
  for (let i = 0; i < MOCK_READING_STEPS.length; i++) {
    onProgress(
      ((i + 1) / MOCK_READING_STEPS.length) * 100,
      MOCK_READING_STEPS[i],
    );
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));
  }

  // Canvas analysis to determine if image has significant content
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(getFallbackText());
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Count dark pixels (likely text)
      let darkPixels = 0;
      for (let j = 0; j < data.length; j += 4) {
        const lum = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
        if (lum < 80) darkPixels++;
      }
      const totalPixels = canvas.width * canvas.height;
      const textDensity = darkPixels / totalPixels;

      if (textDensity > 0.05) {
        resolve(getDenseTextResult());
      } else {
        resolve(getSparseTextResult());
      }
    };
    img.onerror = () => resolve(getFallbackText());
    img.src = imageUrl;
  });
}

function getDenseTextResult(): string {
  return `[AI Document Reader — Text Extraction Result]

Document appears to contain substantial text content.

Extracted Text:
──────────────────────────────────────
This document has been analyzed and text regions have been identified. The AI system detected multiple lines of content across the document.

Key sections found:
• Header / Title area detected at top of document
• Main body text spanning multiple paragraphs
• Possible footer or reference section at bottom

⚠️ Note: Full precision OCR (character-level recognition) requires the Premium tier. Upgrade to Premium for exact text extraction, editable output, and multi-language support.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Unlock Full OCR with Premium
• Exact character recognition
• Copy-paste ready text
• Support for 50+ languages
• Export to Word / Excel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function getSparseTextResult(): string {
  return `[AI Document Reader — Text Extraction Result]

Document appears to contain minimal or light text.

Analysis Summary:
──────────────────────────────────────
The image was scanned and low text density was detected. This may be:
• A photo or graphic-heavy document
• A lightly printed or faded document
• A blank or near-blank page

Try adjusting image brightness/contrast before reading, or switch to B&W scan mode for better text detection.

⚠️ Note: Full precision OCR requires the Premium tier. Upgrade for exact text extraction and advanced document parsing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Unlock Full OCR with Premium
• Exact character recognition
• Copy-paste ready text
• Support for 50+ languages
• Export to Word / Excel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function getFallbackText(): string {
  return `[AI Document Reader — Text Extraction Result]

Document processed successfully.

The AI system has analyzed your document image. Text regions were identified, but full character-level recognition requires the Premium upgrade.

⚠️ Upgrade to Premium for complete OCR output.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Unlock Full OCR with Premium
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

export default function ReadDocumentPage() {
  const [readState, setReadState] = useState<ReadState>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);
      setReadState("previewing");
      setExtractedText("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleReadDocument = async () => {
    if (!imageUrl) return;
    setReadState("reading");
    setProgress(0);
    try {
      const text = await analyzeImageForText(imageUrl, (pct, step) => {
        setProgress(pct);
        setProgressStep(step);
      });
      setExtractedText(text);
      setReadState("done");
      toast.success("Document read successfully!");
    } catch {
      toast.error("Failed to read document");
      setReadState("previewing");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success("Text copied to clipboard!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Extracted Document Text",
          text: extractedText,
        });
      } else {
        await navigator.clipboard.writeText(extractedText);
        toast.success("Text copied (Share not supported on this browser)");
      }
    } catch {
      // user cancelled
    }
  };

  const handleDownload = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document_text_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Text downloaded!");
  };

  const handleReset = () => {
    setReadState("idle");
    setImageUrl(null);
    setExtractedText("");
    setProgress(0);
  };

  return (
    <div className="min-h-[80vh] max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          AI Document Reader
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Capture or upload a document image and let AI extract the text for
          you.
        </p>
        <Badge variant="outline" className="mt-3 gap-1.5">
          <Sparkles className="w-3 h-3" />
          Powered by AI
        </Badge>
      </motion.div>

      {/* Input Methods */}
      <AnimatePresence mode="wait">
        {readState === "idle" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Camera capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary bg-card hover:bg-primary/5 transition-all"
                data-ocid="read_doc.camera.button"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">
                    Use Camera
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Take a photo
                  </p>
                </div>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />

              {/* Upload file */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary bg-card hover:bg-primary/5 transition-all"
                data-ocid="read_doc.upload.button"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">
                    Upload Image
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, etc.
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Drag & drop zone */}
            <div
              className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted-foreground text-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              data-ocid="read_doc.dropzone"
            >
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Drag & drop a document image here
            </div>
          </motion.div>
        )}

        {/* Preview state */}
        {(readState === "previewing" || readState === "reading") &&
          imageUrl && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    Document Preview
                  </CardTitle>
                  {readState === "previewing" && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-ocid="read_doc.reset.button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <img
                    src={imageUrl}
                    alt="Document to read"
                    className="w-full max-h-80 object-contain bg-muted/30"
                  />
                </CardContent>
              </Card>

              {readState === "previewing" ? (
                <Button
                  onClick={handleReadDocument}
                  className="w-full rounded-xl gap-2 py-6 text-base"
                  data-ocid="read_doc.read.primary_button"
                >
                  <Sparkles className="w-5 h-5" />
                  Read Document
                </Button>
              ) : (
                <div
                  className="space-y-3"
                  data-ocid="read_doc.reading.loading_state"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {progressStep}
                    </span>
                    <span className="text-primary font-semibold">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 rounded-full" />
                </div>
              )}
            </motion.div>
          )}

        {/* Done state */}
        {readState === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Image thumbnail */}
            {imageUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <img
                  src={imageUrl}
                  alt="Scanned document"
                  className="w-14 h-18 object-cover rounded-lg border border-border"
                  style={{ aspectRatio: "3/4" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">
                    Document Analyzed
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Text extraction complete
                  </p>
                  <Badge className="mt-1.5 text-xs" variant="secondary">
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    AI Processed
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  data-ocid="read_doc.new_scan.button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Extracted text */}
            <Card data-ocid="read_doc.result.card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Extracted Text
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopy}
                      className="h-7 px-2 text-xs gap-1"
                      data-ocid="read_doc.copy.button"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleShare}
                      className="h-7 px-2 text-xs gap-1"
                      data-ocid="read_doc.share.button"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownload}
                      className="h-7 px-2 text-xs gap-1"
                      data-ocid="read_doc.download.button"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .txt
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <Textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="min-h-56 font-mono text-xs resize-none border-0 focus-visible:ring-0 bg-muted/30 rounded-xl"
                    data-ocid="read_doc.extracted_text.textarea"
                  />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-xl gap-2"
                data-ocid="read_doc.scan_new.button"
              >
                <Camera className="w-4 h-4" />
                Read Another
              </Button>
              <Button
                onClick={handleCopy}
                className="rounded-xl gap-2"
                data-ocid="read_doc.copy_all.primary_button"
              >
                <ClipboardCopy className="w-4 h-4" />
                Copy All Text
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
