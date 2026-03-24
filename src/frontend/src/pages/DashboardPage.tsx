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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  Crown,
  Download,
  FileText,
  FolderOpen,
  Images,
  Loader2,
  Lock,
  Search,
  Settings,
  Share2,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Entry } from "../backend.d";
import AdBanner from "../components/AdBanner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteScan,
  useGetCallerPremiumStatus,
  useListScans,
} from "../hooks/useQueries";
import { formatFileSize, formatTimestamp } from "../utils/pdfGenerator";

type DateFilter = "all" | "today" | "week" | "month";
type SortOrder = "newest" | "oldest" | "name";

function matchesDateFilter(ts: bigint, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const ms = Number(ts / BigInt(1_000_000));
  if (ms === 0) return false;
  const now = Date.now();
  const day = 86400_000;
  switch (filter) {
    case "today":
      return now - ms < day;
    case "week":
      return now - ms < day * 7;
    case "month":
      return now - ms < day * 30;
    default:
      return true;
  }
}

export default function DashboardPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  if (!identity) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          Sign in Required
        </h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Please sign in to view your saved documents.
        </p>
        <Button
          onClick={() => navigate({ to: "/login" })}
          className="rounded-full px-6"
          data-ocid="dashboard.login.primary_button"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const navigate = useNavigate();
  const { data: scans, isLoading } = useListScans();
  const { data: isPremium } = useGetCallerPremiumStatus();
  const deleteScan = useDeleteScan();

  const [localScans, _setLocalScans] = useState<
    Array<{
      id: string;
      name: string;
      dataUrl: string;
      date: string;
      type?: string;
    }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("scanify_scans") ?? "[]").slice(
        0,
        4,
      );
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showPinSettings, setShowPinSettings] = useState(false);

  const filteredScans = useMemo(() => {
    if (!scans) return [];
    let result = scans.filter((s) => {
      const matchName = s.name.toLowerCase().includes(search.toLowerCase());
      const matchDate = matchesDateFilter(s.timestamp, dateFilter);
      return matchName && matchDate;
    });
    result = [...result].sort((a, b) => {
      if (sortOrder === "newest") return Number(b.timestamp - a.timestamp);
      if (sortOrder === "oldest") return Number(a.timestamp - b.timestamp);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [scans, search, dateFilter, sortOrder]);

  const handleDelete = async (scan: Entry) => {
    if (!confirm(`Delete "${scan.name}"? This cannot be undone.`)) return;
    try {
      await deleteScan.mutateAsync(scan.id);
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDownload = (_scan: Entry) => {
    toast.info("Download available for locally generated PDFs.");
  };

  const handleShare = (scan: Entry) => {
    const text = `Check out my document: ${scan.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-secondary dark:bg-background">
      <AdBanner />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Recent Scans from local device */}
        {localScans.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <Images className="w-4 h-4 text-primary" />
                Recent Scans
              </h2>
              <button
                type="button"
                onClick={() => navigate({ to: "/gallery" })}
                className="text-xs text-primary hover:underline font-medium"
                data-ocid="dashboard.gallery.link"
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {localScans.map((scan, i) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => navigate({ to: "/gallery" })}
                  className="group relative rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all"
                  style={{ aspectRatio: "3/4" }}
                  data-ocid={`dashboard.recent.item.${i + 1}`}
                >
                  <img
                    src={scan.dataUrl}
                    alt={scan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[9px] font-medium truncate">
                      {scan.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              My Documents
              {isPremium && (
                <Badge className="bg-yellow-500 text-white border-0 gap-1">
                  <Crown className="w-3 h-3" /> Premium
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isLoading
                ? "Loading…"
                : `${filteredScans.length} of ${scans?.length ?? 0} document${(scans?.length ?? 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPinSettings(true)}
              className="rounded-xl"
              aria-label="PIN Settings"
              data-ocid="dashboard.pin_settings.button"
            >
              <Lock className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/premium" })}
              className="rounded-xl gap-1.5"
              data-ocid="dashboard.premium.button"
            >
              <Crown className="w-4 h-4 text-yellow-500" />
              {isPremium ? "Premium" : "Upgrade"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/read-document" })}
              className="rounded-full gap-2"
              data-ocid="dashboard.read_document.button"
            >
              <BookOpen className="w-4 h-4" />
              Read Doc
            </Button>
            <Button
              onClick={() => navigate({ to: "/scan" })}
              className="rounded-full gap-2"
              data-ocid="dashboard.new_scan.button"
            >
              New Scan
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
              data-ocid="dashboard.search.input"
            />
          </div>
          <Select
            value={dateFilter}
            onValueChange={(v) => setDateFilter(v as DateFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-36 rounded-xl"
              data-ocid="dashboard.date_filter.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger
              className="w-full sm:w-40 rounded-xl"
              data-ocid="dashboard.sort.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="space-y-3" data-ocid="dashboard.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && filteredScans.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
            data-ocid="dashboard.scans.empty_state"
          >
            <FolderOpen className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              {search || dateFilter !== "all"
                ? "No matching documents"
                : "No documents yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {search || dateFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Scan a document and save it to see it here."}
            </p>
            {!search && dateFilter === "all" && (
              <Button
                onClick={() => navigate({ to: "/scan" })}
                className="rounded-full gap-2"
                data-ocid="dashboard.start_scan.button"
              >
                Start Scanning
              </Button>
            )}
          </motion.div>
        )}

        {!isLoading && filteredScans.length > 0 && (
          <div className="space-y-3" data-ocid="dashboard.scans.list">
            {filteredScans.map((scan, idx) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white dark:bg-card rounded-2xl border border-border shadow-card p-4 flex items-center gap-4"
                data-ocid={`dashboard.scans.item.${idx + 1}`}
              >
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {scan.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(scan.timestamp)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(scan.sizeBytes)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(scan)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    aria-label="Download"
                    data-ocid={`dashboard.scans.download_button.${idx + 1}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(scan)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    aria-label="Share"
                    data-ocid={`dashboard.scans.share_button.${idx + 1}`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(scan)}
                    disabled={deleteScan.isPending}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Delete"
                    data-ocid={`dashboard.scans.delete_button.${idx + 1}`}
                  >
                    {deleteScan.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showPinSettings && (
        <PinSettingsModal onClose={() => setShowPinSettings(false)} />
      )}
    </div>
  );
}

function PinSettingsModal({ onClose }: { onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const hasPin = !!localStorage.getItem("scanify_pin");

  const handleSave = () => {
    setError("");
    if (hasPin) {
      if (currentPin !== localStorage.getItem("scanify_pin")) {
        setError("Current PIN is incorrect");
        return;
      }
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError("PIN must be 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    localStorage.setItem("scanify_pin", newPin);
    toast.success("PIN saved!");
    onClose();
  };

  const handleRemove = () => {
    if (hasPin && currentPin !== localStorage.getItem("scanify_pin")) {
      setError("Current PIN is incorrect");
      return;
    }
    localStorage.removeItem("scanify_pin");
    toast.success("PIN removed");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm rounded-2xl"
        data-ocid="dashboard.pin.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {hasPin ? "Change PIN" : "Set PIN Lock"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {hasPin && (
            <div>
              <Label className="text-xs">Current PIN</Label>
              <Input
                type="password"
                maxLength={4}
                value={currentPin}
                onChange={(e) =>
                  setCurrentPin(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Enter current PIN"
                className="mt-1 rounded-xl tracking-widest text-center"
                data-ocid="dashboard.pin.current.input"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">New PIN (4 digits)</Label>
            <Input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="●●●●"
              className="mt-1 rounded-xl tracking-widest text-center"
              data-ocid="dashboard.pin.new.input"
            />
          </div>
          <div>
            <Label className="text-xs">Confirm New PIN</Label>
            <Input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="●●●●"
              className="mt-1 rounded-xl tracking-widest text-center"
              data-ocid="dashboard.pin.confirm.input"
            />
          </div>
          {error && (
            <p
              className="text-xs text-destructive"
              data-ocid="dashboard.pin.error_state"
            >
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {hasPin && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl"
                onClick={handleRemove}
                data-ocid="dashboard.pin.remove.delete_button"
              >
                Remove PIN
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              data-ocid="dashboard.pin.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              onClick={handleSave}
              data-ocid="dashboard.pin.save_button"
            >
              Save PIN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
