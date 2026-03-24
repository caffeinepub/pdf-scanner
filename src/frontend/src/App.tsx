import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProfileSetup from "./components/ProfileSetup";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import GalleryPage from "./pages/GalleryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PremiumPage from "./pages/PremiumPage";
import QRScannerPage from "./pages/QRScannerPage";
import ReadDocumentPage from "./pages/ReadDocumentPage";
import ScanPage from "./pages/ScanPage";

// ─── PIN Lock Overlay ────────────────────────────────────────────────────
function PinLockOverlay({ onUnlock }: { onUnlock: () => void }) {
  const [entered, setEntered] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const pin = localStorage.getItem("scanify_pin") ?? "";

  const pressDigit = (d: string) => {
    if (entered.length >= 4) return;
    const next = [...entered, d];
    setEntered(next);
    setError(false);
    if (next.length === 4) {
      if (next.join("") === pin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setEntered([]), 600);
      }
    }
  };

  const backspace = () => setEntered((prev) => prev.slice(0, -1));

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-8 p-6"
      data-ocid="app.pin.modal"
    >
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Enter PIN
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your 4-digit PIN to unlock Scanify
        </p>
      </div>

      {/* Dots */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < entered.length
                ? error
                  ? "bg-destructive border-destructive"
                  : "bg-primary border-primary"
                : "border-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      {error && (
        <p
          className="text-sm text-destructive -mt-4"
          data-ocid="app.pin.error_state"
        >
          Incorrect PIN
        </p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
          (k) =>
            k === "" ? (
              <div key="empty" />
            ) : k === "del" ? (
              <button
                key="del"
                type="button"
                onClick={backspace}
                className="h-14 rounded-2xl bg-secondary hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground"
                data-ocid="app.pin.backspace.button"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                  />
                </svg>
              </button>
            ) : (
              <button
                key={k}
                type="button"
                onClick={() => pressDigit(k)}
                className="h-14 rounded-2xl bg-card border border-border hover:bg-secondary font-display text-xl font-semibold text-foreground transition-colors active:scale-95"
                data-ocid={`app.pin.digit_${k}.button`}
              >
                {k}
              </button>
            ),
        )}
      </div>
    </div>
  );
}

function RootLayout() {
  const [pinUnlocked, setPinUnlocked] = useState(() => {
    return !localStorage.getItem("scanify_pin");
  });

  // Re-check PIN on mount
  const checked = useRef(false);
  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      const hasPin = !!localStorage.getItem("scanify_pin");
      if (!hasPin) setPinUnlocked(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {!pinUnlocked && <PinLockOverlay onUnlock={() => setPinUnlocked(true)} />}
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ProfileSetup />
      <Toaster richColors />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const scanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scan",
  component: ScanPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const premiumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/premium",
  component: PremiumPage,
});

const qrScannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/qr-scanner",
  component: QRScannerPage,
});

const readDocumentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/read-document",
  component: ReadDocumentPage,
});

const galleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gallery",
  component: GalleryPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scanRoute,
  dashboardRoute,
  adminRoute,
  loginRoute,
  premiumRoute,
  qrScannerRoute,
  readDocumentRoute,
  galleryRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
