import { X } from "lucide-react";
import { useState } from "react";
import { useListActiveAds } from "../hooks/useQueries";

export default function AdBanner() {
  const { data: ads } = useListActiveAds();
  const [dismissed, setDismissed] = useState<bigint[]>([]);

  const visibleAds = (ads ?? []).filter((ad) => !dismissed.includes(ad.id));
  if (visibleAds.length === 0) return null;

  const ad = visibleAds[0];

  return (
    <div className="bg-secondary border-b border-border" data-ocid="ad.toast">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <a
          href={ad.linkUrl || "/"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {ad.title}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
            Sponsored
          </span>
        </a>
        <button
          type="button"
          onClick={() => setDismissed((prev) => [...prev, ad.id])}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Dismiss ad"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
