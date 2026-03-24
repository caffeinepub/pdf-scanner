import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import { SiFacebook, SiGithub, SiX } from "react-icons/si";

export default function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  return (
    <footer className="bg-foreground text-primary-foreground mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">Scanify</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              to="/"
              className="text-white/70 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/scan"
              className="text-white/70 hover:text-white transition-colors"
            >
              Scanner
            </Link>
            <Link
              to="/dashboard"
              className="text-white/70 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/"
              className="text-white/70 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/"
              className="text-white/70 hover:text-white transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter/X"
              className="text-white/50 hover:text-white transition-colors"
            >
              <SiX className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="text-white/50 hover:text-white transition-colors"
            >
              <SiFacebook className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-white/50 hover:text-white transition-colors"
            >
              <SiGithub className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-white/50">
          © {year}. Built with ❤️ using{" "}
          <a
            href={caffeineUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/80"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
