import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Crown,
  FileText,
  Images,
  Menu,
  Moon,
  QrCode,
  ScanLine,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerAdmin } from "../hooks/useQueries";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("scanify_theme") === "dark" ||
      (!localStorage.getItem("scanify_theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const { identity, clear, loginStatus } = useInternetIdentity();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAuthenticated = !!identity;
  const { data: isAdmin } = useIsCallerAdmin();

  // Apply dark mode on mount and when toggled
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.setItem("scanify_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      qc.clear();
      navigate({ to: "/" });
    } else {
      navigate({ to: "/login" });
    }
  };

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Scanner", to: "/scan" },
    { label: "My Documents", to: "/dashboard" },
    { label: "QR Scanner", to: "/qr-scanner" },
    { label: "Read Document", to: "/read-document" },
    { label: "Gallery", to: "/gallery" },
    ...(isAuthenticated ? [{ label: "Premium", to: "/premium" }] : []),
    ...(isAdmin ? [{ label: "Admin", to: "/admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-border shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-display font-bold text-xl text-foreground"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-primary-foreground" />
            </div>
            Scanify
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-primary [&.active]:font-semibold"
                data-ocid={`nav.${link.label.toLowerCase().replace(/\s+/g, "_")}.link`}
              >
                {link.label === "QR Scanner" ? (
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    {link.label}
                  </span>
                ) : link.label === "Read Document" ? (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {link.label}
                  </span>
                ) : link.label === "Gallery" ? (
                  <span className="flex items-center gap-1">
                    <Images className="w-3.5 h-3.5" />
                    {link.label}
                  </span>
                ) : link.label === "Premium" ? (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Crown className="w-3.5 h-3.5" />
                    {link.label}
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            ))}
          </nav>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setIsDark((v) => !v)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              data-ocid="nav.dark_mode.toggle"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {isAuthenticated && (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <FileText className="w-4 h-4" />
                  My Docs
                </Button>
              </Link>
            )}
            <Button
              onClick={handleAuth}
              disabled={loginStatus === "logging-in"}
              size="sm"
              className="rounded-full px-5"
              data-ocid="nav.auth.button"
            >
              {loginStatus === "logging-in"
                ? "Logging in…"
                : isAuthenticated
                  ? "Logout"
                  : "Get Started"}
            </Button>
          </div>

          {/* Mobile right actions */}
          <div className="md:hidden flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsDark((v) => !v)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
              data-ocid="nav.mobile.dark_mode.toggle"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-border">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors [&.active]:text-primary [&.active]:bg-secondary"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                onClick={() => {
                  handleAuth();
                  setMenuOpen(false);
                }}
                disabled={loginStatus === "logging-in"}
                className="mt-2 rounded-full"
                data-ocid="nav.mobile.auth.button"
              >
                {loginStatus === "logging-in"
                  ? "Logging in…"
                  : isAuthenticated
                    ? "Logout"
                    : "Get Started"}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
