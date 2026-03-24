import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, ScanLine } from "lucide-react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) navigate({ to: "/dashboard" });
  }, [identity, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (e: any) {
      console.error("Login error", e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-secondary px-4">
      <div className="bg-white rounded-3xl shadow-card border border-border p-8 sm:p-12 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ScanLine className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground mb-8">
          Sign in to access your scanned documents, save PDFs to the cloud, and
          manage your account.
        </p>

        <Button
          onClick={handleLogin}
          disabled={loginStatus === "logging-in"}
          size="lg"
          className="w-full rounded-full gap-2 text-base"
          data-ocid="login.submit_button"
        >
          {loginStatus === "logging-in" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" /> Sign In with Internet Identity
            </>
          )}
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          Secure, passwordless authentication. Your documents stay private.
        </p>

        <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
          {[
            ["🔒", "Private", "End-to-end secure"],
            ["⚡", "Instant", "No password needed"],
            ["☁️", "Cloud", "Access anywhere"],
          ].map(([emoji, title, sub]) => (
            <div key={title}>
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs font-semibold text-foreground">
                {title}
              </div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
