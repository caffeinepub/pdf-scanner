import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  Crown,
  ExternalLink,
  Loader2,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerPremiumStatus,
  useMarkCallerPremium,
} from "../hooks/useQueries";

const BENEFITS = [
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: "No watermark on documents",
  },
  { icon: <Zap className="w-4 h-4" />, label: "Unlimited scans" },
  { icon: <Shield className="w-4 h-4" />, label: "Advanced AI features" },
  { icon: <Crown className="w-4 h-4" />, label: "Priority support" },
  {
    icon: <Check className="w-4 h-4" />,
    label: "Batch scanning & multi-page PDF",
  },
  { icon: <Check className="w-4 h-4" />, label: "Cloud backup & sync" },
];

const UPI_ID = "6205850061@axl";
const AMOUNT = 100;
const UPI_LINK = `upi://pay?pa=${UPI_ID}&pn=Scanify&am=${AMOUNT}&cu=INR&tn=ScanifyPremium`;

const PAYMENT_APPS = [
  {
    name: "Google Pay",
    color: "#4285F4",
    link: UPI_LINK,
    emoji: "🟢",
  },
  {
    name: "PhonePe",
    color: "#5F259F",
    link: UPI_LINK,
    emoji: "💜",
  },
  {
    name: "Paytm",
    color: "#00BAF2",
    link: UPI_LINK,
    emoji: "💙",
  },
  {
    name: "BHIM",
    color: "#007FFF",
    link: UPI_LINK,
    emoji: "🔵",
  },
];

export default function PremiumPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: isPremium, isLoading } = useGetCallerPremiumStatus();
  const markPremium = useMarkCallerPremium();

  const [upiRef, setUpiRef] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handlePaymentApp = (link: string) => {
    window.location.href = link;
  };

  const handleVerify = async () => {
    if (!upiRef.trim()) {
      toast.error("Please enter your UPI transaction ID");
      return;
    }
    setVerifying(true);
    try {
      await markPremium.mutateAsync({
        amount: BigInt(AMOUNT),
        upiRef: upiRef.trim(),
      });
      toast.success("🎉 Welcome to Premium! Enjoy all features.");
      setUpiRef("");
    } catch {
      toast.error("Verification failed. Please contact support.");
    } finally {
      setVerifying(false);
    }
  };

  if (!identity) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Crown className="w-12 h-12 text-yellow-500" />
        <h2 className="font-display text-xl font-semibold">
          Sign in to upgrade
        </h2>
        <Button
          onClick={() => navigate({ to: "/login" })}
          className="rounded-full px-6"
          data-ocid="premium.login.primary_button"
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary dark:bg-background">
      <div className="max-w-xl mx-auto px-4 py-10">
        {isPremium ? (
          <PremiumBadgeSection />
        ) : (
          <UpgradeSection
            upiRef={upiRef}
            setUpiRef={setUpiRef}
            verifying={verifying}
            onPaymentApp={handlePaymentApp}
            onVerify={handleVerify}
          />
        )}
      </div>
    </div>
  );
}

function PremiumBadgeSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-10"
      data-ocid="premium.active.card"
    >
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg">
        <Crown className="w-12 h-12 text-white" />
      </div>
      <Badge className="mb-4 px-4 py-1 text-sm bg-yellow-500 text-white border-0">
        ✨ Premium Member
      </Badge>
      <h1 className="font-display text-3xl font-bold text-foreground mb-3">
        You're Premium!
      </h1>
      <p className="text-muted-foreground mb-8">
        Enjoy all Scanify premium features.
      </p>
      <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
        {BENEFITS.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              {b.icon}
            </div>
            <span className="text-sm text-foreground">{b.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function UpgradeSection({
  upiRef,
  setUpiRef,
  verifying,
  onPaymentApp,
  onVerify,
}: {
  upiRef: string;
  setUpiRef: (v: string) => void;
  verifying: boolean;
  onPaymentApp: (link: string) => void;
  onVerify: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4 shadow-card">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Upgrade to Premium
        </h1>
        <p className="text-muted-foreground">
          One-time payment. Unlock everything forever.
        </p>
      </div>

      {/* Benefits */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
        <h2 className="font-semibold text-foreground text-sm mb-2">
          What you get
        </h2>
        {BENEFITS.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {b.icon}
            </div>
            <span className="text-sm text-foreground">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Price card */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-5 mb-5 text-white text-center">
        <p className="text-white/70 text-sm mb-1">One-time price</p>
        <p className="text-4xl font-display font-bold">₹100</p>
        <p className="text-white/70 text-xs mt-1">
          No subscription. Pay once, use forever.
        </p>
      </div>

      {/* UPI Payment */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <h2 className="font-semibold text-foreground mb-1">Pay via UPI</h2>
        <p className="text-xs text-muted-foreground mb-4">
          UPI ID:{" "}
          <span className="font-mono font-medium text-foreground">
            {UPI_ID}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAYMENT_APPS.map((app) => (
            <Button
              key={app.name}
              variant="outline"
              className="h-12 gap-2 rounded-xl justify-start"
              onClick={() => onPaymentApp(app.link)}
              data-ocid={`premium.${app.name.toLowerCase().replace(/\s/g, "_")}.button`}
            >
              <span className="text-lg">{app.emoji}</span>
              <span className="text-sm font-medium">{app.name}</span>
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
          <Smartphone className="w-3 h-3" />
          Opens payment app on mobile. On desktop, use UPI ID manually.
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Or{" "}
          <a href={UPI_LINK} className="underline text-primary">
            click here
          </a>{" "}
          to pay.
        </p>
      </div>

      {/* Verify payment */}
      <div
        className="bg-card border border-border rounded-2xl p-5"
        data-ocid="premium.verify.card"
      >
        <h2 className="font-semibold text-foreground mb-1">Verify Payment</h2>
        <p className="text-xs text-muted-foreground mb-4">
          After completing payment, enter the UPI transaction ID from your
          payment app.
        </p>
        <Separator className="mb-4" />
        <div className="space-y-3">
          <div>
            <Label htmlFor="upi-ref" className="text-xs">
              UPI Transaction ID *
            </Label>
            <Input
              id="upi-ref"
              placeholder="e.g. 123456789012"
              value={upiRef}
              onChange={(e) => setUpiRef(e.target.value)}
              className="mt-1 rounded-xl"
              data-ocid="premium.upi_ref.input"
            />
          </div>
          <Button
            onClick={onVerify}
            disabled={verifying || !upiRef.trim()}
            className="w-full rounded-xl gap-2"
            data-ocid="premium.verify.primary_button"
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {verifying ? "Verifying…" : "Verify & Activate Premium"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
