import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Cloud,
  FileDown,
  FileText,
  Layers,
  Share2,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Quick Scanning",
    desc: "Capture documents instantly with smart edge detection. Perfect results every time, even in low light.",
  },
  {
    icon: <FileDown className="w-6 h-6" />,
    title: "Auto PDF Convert",
    desc: "Images are automatically converted to high-quality, shareable PDF files within seconds of capture.",
  },
  {
    icon: <Share2 className="w-6 h-6" />,
    title: "Download & Share",
    desc: "Download to your device or share instantly via WhatsApp, email, and any app on your device.",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Templates",
    desc: "Apply professional templates and overlays to your scans. Choose from curated layouts and styles.",
  },
];

const steps = [
  {
    n: "01",
    icon: <Camera className="w-7 h-7" />,
    title: "Capture",
    desc: "Point your camera at any document and tap to capture. Supports multi-page documents.",
  },
  {
    n: "02",
    icon: <Zap className="w-7 h-7" />,
    title: "Convert",
    desc: "Your photos are automatically combined and converted into a professional PDF document.",
  },
  {
    n: "03",
    icon: <Share2 className="w-7 h-7" />,
    title: "Share",
    desc: "Name your PDF, then download, view in browser, or share to WhatsApp and any app.",
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="bg-secondary pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                Free to Use · No Credit Card Required
              </Badge>
              <h1 className="font-display text-5xl sm:text-6xl font-bold text-foreground leading-tight mb-5">
                Scan.
                <span className="text-primary"> Convert.</span>
                <br />
                Share.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                Transform physical documents into professional PDFs instantly.
                Capture with your camera, convert automatically, and share
                anywhere — all in one tap.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/scan">
                  <Button
                    size="lg"
                    className="rounded-full gap-2 px-8 text-base"
                    data-ocid="hero.scan.primary_button"
                  >
                    <Camera className="w-5 h-5" />
                    Start Scanning Now
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full gap-2 px-8 text-base"
                    data-ocid="hero.dashboard.secondary_button"
                  >
                    <FileText className="w-5 h-5" />
                    My Documents
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                {["No signup required", "Works on mobile", "Instant PDF"].map(
                  (t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {t}
                    </span>
                  ),
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex justify-center"
            >
              <div className="relative">
                <img
                  src="/assets/generated/scanify-hero-phone-transparent.dim_600x700.png"
                  alt="Scanify app on phone"
                  className="w-72 sm:w-80 lg:w-96 drop-shadow-2xl"
                />
                {/* Floating badge */}
                <div className="absolute -left-4 top-24 bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      PDF Created!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      contract_2026.pdf
                    </p>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-28 bg-white rounded-2xl shadow-card px-4 py-3">
                  <p className="text-xs font-semibold text-foreground">
                    3 pages scanned
                  </p>
                  <div className="flex gap-1 mt-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-10 bg-secondary rounded border border-border"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Key Features
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to digitize, organize, and share your
              documents effortlessly.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-primary mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to your perfect PDF
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-flex">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-5 mx-auto">
                    {s.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-border mx-auto mt-6 hidden md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Cloud className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to go paperless?
            </h2>
            <p className="text-white/75 mb-8 text-lg">
              Join thousands of users who scan and share documents in seconds.
            </p>
            <Link to="/scan">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full gap-2 px-8 text-base font-semibold"
                data-ocid="cta.scan.primary_button"
              >
                <Camera className="w-5 h-5" />
                Start Scanning Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
