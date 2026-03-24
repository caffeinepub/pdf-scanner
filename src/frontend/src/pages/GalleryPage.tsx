import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Pencil,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export interface LocalScan {
  id: string;
  name: string;
  dataUrl: string;
  date: string;
  type?: string;
  pages?: number;
}

const STORAGE_KEY = "scanify_scans";

export function getLocalScans(): LocalScan[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveLocalScan(scan: LocalScan) {
  const existing = getLocalScans();
  existing.unshift(scan);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteLocalScan(id: string) {
  const existing = getLocalScans().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

type SortOption = "newest" | "oldest" | "name" | "type";

interface LightboxState {
  index: number;
  scans: LocalScan[];
}

function Lightbox({
  state,
  onClose,
  onDelete,
  onRename,
}: {
  state: LightboxState;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [idx, setIdx] = useState(state.index);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const touchStartX = useRef<number | null>(null);
  const scan = state.scans[idx];

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIdx((i) => Math.min(state.scans.length - 1, i + 1)),
    [state.scans.length],
  );

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (diff < -50) next();
    if (diff > 50) prev();
    touchStartX.current = null;
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = scan.dataUrl;
    a.download = scan.name;
    a.click();
    toast.success("Download started");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const res = await fetch(scan.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], scan.name, { type: blob.type });
        await navigator.share({ files: [file], title: scan.name });
      } else {
        await navigator.clipboard.writeText(scan.name);
        toast.success("Name copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const confirmRename = () => {
    if (!newName.trim()) return;
    onRename(scan.id, newName.trim());
    setRenaming(false);
    toast.success("Renamed!");
  };

  const confirmDelete = () => {
    if (!confirm(`Delete "${scan.name}"? This cannot be undone.`)) return;
    onDelete(scan.id);
    if (state.scans.length <= 1) {
      onClose();
    } else {
      setIdx((i) => Math.min(i, state.scans.length - 2));
    }
    toast.success("Deleted");
  };

  if (!scan) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-ocid="gallery.lightbox.modal"
    >
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                className="h-7 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40 max-w-xs"
                autoFocus
                data-ocid="gallery.rename.input"
              />
              <Button
                size="sm"
                onClick={confirmRename}
                className="h-7 text-xs"
                data-ocid="gallery.rename.save_button"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRenaming(false)}
                className="h-7 text-white hover:text-white"
                data-ocid="gallery.rename.cancel_button"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-white font-medium text-sm truncate">
              {scan.name}
            </p>
          )}
          <p className="text-white/40 text-xs mt-0.5">
            {new Date(scan.date).toLocaleDateString()} · {idx + 1} /{" "}
            {state.scans.length}
            {scan.type && ` · ${scan.type}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-3 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          data-ocid="gallery.lightbox.close_button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={scan.id}
            src={scan.dataUrl}
            alt={scan.name}
            className="max-w-full max-h-full object-contain select-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.18 }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Prev / Next arrows */}
        {idx > 0 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
            data-ocid="gallery.lightbox.pagination_prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {idx < state.scans.length - 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
            data-ocid="gallery.lightbox.pagination_next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-center gap-2 px-4 py-4 bg-black/60 backdrop-blur-sm border-t border-white/10">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownload}
          className="text-white hover:text-white hover:bg-white/10 gap-1.5"
          data-ocid="gallery.lightbox.download_button"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleShare}
          className="text-white hover:text-white hover:bg-white/10 gap-1.5"
          data-ocid="gallery.lightbox.secondary_button"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setNewName(scan.name);
            setRenaming(true);
          }}
          className="text-white hover:text-white hover:bg-white/10 gap-1.5"
          data-ocid="gallery.lightbox.edit_button"
        >
          <Pencil className="w-4 h-4" />
          Rename
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={confirmDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
          data-ocid="gallery.lightbox.delete_button"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<LocalScan[]>(getLocalScans());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => setScans(getLocalScans());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = useMemo(() => {
    let result = scans.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
    );
    result = [...result].sort((a, b) => {
      if (sort === "newest")
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === "oldest")
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "type") return (a.type ?? "").localeCompare(b.type ?? "");
      return 0;
    });
    return result;
  }, [scans, search, sort]);

  const openLightbox = useCallback(
    (id: string) => {
      const idx = filtered.findIndex((s) => s.id === id);
      if (idx < 0) return;
      setLightbox({ index: idx, scans: filtered });
    },
    [filtered],
  );

  const handleDelete = (id: string) => {
    deleteLocalScan(id);
    setScans(getLocalScans());
    setLightbox((prev) =>
      prev ? { ...prev, scans: prev.scans.filter((s) => s.id !== id) } : null,
    );
  };

  const handleRename = (id: string, name: string) => {
    const all = getLocalScans().map((s) => (s.id === id ? { ...s, name } : s));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setScans(all);
    setLightbox((prev) =>
      prev
        ? {
            ...prev,
            scans: prev.scans.map((s) => (s.id === id ? { ...s, name } : s)),
          }
        : null,
    );
  };

  return (
    <>
      <AnimatePresence>
        {lightbox && (
          <Lightbox
            state={lightbox}
            onClose={() => setLightbox(null)}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-5">
            <h1 className="font-display text-2xl font-bold text-foreground">
              📸 Gallery
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {scans.length} scan{scans.length !== 1 ? "s" : ""} saved on this
              device
            </p>
          </div>

          {/* Search + Sort */}
          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scans…"
                className="pl-9 rounded-xl"
                data-ocid="gallery.search_input"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger
                className="w-36 rounded-xl"
                data-ocid="gallery.sort.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid / Empty State */}
          {filtered.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              data-ocid="gallery.empty_state"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                {search ? "No scans match your search" : "No scans yet"}
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                {search
                  ? "Try a different keyword."
                  : "Tap the camera to start scanning!"}
              </p>
              {!search && (
                <Button
                  onClick={() => navigate({ to: "/scan" })}
                  className="rounded-full px-6 gap-2"
                  data-ocid="gallery.empty.primary_button"
                >
                  <Camera className="w-4 h-4" />
                  Start Scanning
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3" data-ocid="gallery.list">
              <AnimatePresence>
                {filtered.map((scan, i) => (
                  <motion.div
                    key={scan.id}
                    className="group relative bg-card border border-border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{
                      delay: Math.min(i * 0.04, 0.25),
                      duration: 0.2,
                    }}
                    onClick={() => openLightbox(scan.id)}
                    data-ocid={`gallery.item.${i + 1}`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] overflow-hidden bg-muted">
                      <img
                        src={scan.dataUrl}
                        alt={scan.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    {/* Info */}
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">
                        {scan.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(scan.date).toLocaleDateString()}
                      </p>
                      {scan.type && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 mt-1 h-4"
                        >
                          {scan.type}
                        </Badge>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none rounded-2xl" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
