import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Download,
  MessageSquare,
  Star,
  AlignLeft,
  List,
  ChevronRight,
  RefreshCw,
  Eye,
  BarChart2,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  type: "rating" | "text" | "choice";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface GeneratedForm {
  formId: string;
  formTitle: string;
  formSubtitle: string;
  questions: Question[];
  source: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BACKEND = "http://localhost:8787";

const questionTypeIcon = (type: Question["type"]) => {
  if (type === "rating") return <Star className="w-3.5 h-3.5" />;
  if (type === "text") return <AlignLeft className="w-3.5 h-3.5" />;
  return <List className="w-3.5 h-3.5" />;
};

const questionTypeBadge = (type: Question["type"]) => {
  const base = "text-[10px] font-bold uppercase px-2 py-0.5 brutal-border flex items-center gap-1";
  if (type === "rating") return `${base} bg-yellow-100 text-yellow-800`;
  if (type === "text") return `${base} bg-blue-100 text-blue-800`;
  return `${base} bg-purple-100 text-purple-800`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FeedbackGeneratorPage = () => {
  const [form, setForm] = useState({
    eventName: "",
    eventType: "General",
    eventDate: "",
    venue: "",
    description: "",
    targetAudience: "Students and faculty",
    clubName: "",
  });

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedForm | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [responseCount, setResponseCount] = useState(0);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const publicUrl = generated
    ? `${window.location.origin}/feedback/${generated.formId}`
    : "";

  // Poll response count
  useEffect(() => {
    if (!generated) return;
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/feedback/${generated.formId}/responses`);
        const data = await res.json();
        setResponseCount(data.responses?.length ?? 0);
      } catch {
        // ignore
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [generated]);

  // Generate QR when form/url changes
  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [publicUrl]);

  const handleGenerate = async () => {
    if (!form.eventName.trim()) {
      setError("Event Name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/feedback/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setGenerated(data.form);
    } catch {
      setError("Failed to generate feedback form. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `feedback-qr-${generated?.formId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const EVENT_TYPES = [
    "General", "Technical Seminar", "Cultural Fest", "Workshop", "Sports Event",
    "Hackathon", "Guest Lecture", "Industrial Visit", "Conference", "Webinar",
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline py-2 px-3 flex items-center gap-1 text-xs">
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6" strokeWidth={2.5} />
              Feedback Generator
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              AI-generated forms · QR code sharing · Instant responses
            </p>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Input Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="brutal-card space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b-2 border-foreground">
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
              <h2 className="font-bold text-lg uppercase">Event Details</h2>
            </div>

            {/* Event Name */}
            <div>
              <label className="text-xs font-bold uppercase block mb-1.5">
                Event Name <span className="text-destructive">*</span>
              </label>
              <input
                id="feedback-event-name"
                className="brutal-input py-2.5"
                placeholder="e.g. Annual Tech Symposium 2026"
                value={form.eventName}
                onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
              />
            </div>

            {/* Event Type + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase block mb-1.5">Event Type</label>
                <select
                  id="feedback-event-type"
                  className="brutal-input py-2.5"
                  value={form.eventType}
                  onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase block mb-1.5">Event Date</label>
                <input
                  type="date"
                  id="feedback-event-date"
                  className="brutal-input py-2.5"
                  value={form.eventDate}
                  onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Venue + Club Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase block mb-1.5">Venue</label>
                <input
                  id="feedback-venue"
                  className="brutal-input py-2.5"
                  placeholder="e.g. Main Auditorium"
                  value={form.venue}
                  onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase block mb-1.5">Club / Organizer</label>
                <input
                  id="feedback-club"
                  className="brutal-input py-2.5"
                  placeholder="e.g. IEEE Student Chapter"
                  value={form.clubName}
                  onChange={(e) => setForm((p) => ({ ...p, clubName: e.target.value }))}
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-bold uppercase block mb-1.5">Target Audience</label>
              <input
                id="feedback-audience"
                className="brutal-input py-2.5"
                placeholder="e.g. Final year CSE students"
                value={form.targetAudience}
                onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold uppercase block mb-1.5">Event Description</label>
              <textarea
                id="feedback-description"
                rows={3}
                className="brutal-input resize-none py-2.5"
                placeholder="Briefly describe the event — the AI uses this to generate smarter, context-aware questions."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {error && (
              <p className="text-destructive text-xs font-bold py-2 px-3 bg-destructive/10 brutal-border">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                id="feedback-generate-btn"
                onClick={handleGenerate}
                disabled={loading}
                className="brutal-btn-primary py-3 flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Feedback Form</>
                )}
              </button>
              {generated && (
                <button
                  id="feedback-regenerate-btn"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="brutal-btn-outline py-3 px-4 flex items-center gap-1 text-xs"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Right: Generated Output ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          <AnimatePresence mode="wait">
            {!generated && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="brutal-card border-dashed min-h-[200px] flex flex-col items-center justify-center text-center gap-3 text-muted-foreground"
              >
                <QrCode className="w-12 h-12 opacity-30" strokeWidth={1.5} />
                <p className="font-mono text-sm">Fill in event details and click<br /><span className="font-bold text-foreground">"Generate Feedback Form"</span></p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="brutal-card min-h-[200px] flex flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-foreground border-t-primary rounded-full animate-spin" />
                  <Sparkles className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="font-mono text-sm font-bold uppercase tracking-wider">AI is generating questions…</p>
              </motion.div>
            )}

            {generated && !loading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* QR + Link Card */}
                <div className="brutal-card bg-foreground text-background !p-0 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* QR */}
                    <div className="flex items-center justify-center p-6 border-b-2 sm:border-b-0 sm:border-r-2 border-background/20">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Feedback QR Code"
                          className="w-32 h-32 brutal-border bg-white"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-background/10 brutal-border animate-pulse" />
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Scan to Submit Feedback</p>
                        <p className="font-bold text-sm leading-tight">{generated.formTitle}</p>
                        <p className="font-mono text-xs opacity-60 mt-2 break-all">{publicUrl}</p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          id="feedback-copy-link"
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 text-xs font-bold uppercase bg-background text-foreground brutal-border px-3 py-2 hover:bg-secondary transition-colors"
                        >
                          {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                        </button>
                        <button
                          id="feedback-download-qr"
                          onClick={handleDownloadQr}
                          className="flex items-center gap-1.5 text-xs font-bold uppercase bg-background text-foreground brutal-border px-3 py-2 hover:bg-secondary transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download QR
                        </button>
                      </div>

                      {/* Response count */}
                      <div className="flex items-center gap-2 text-xs font-mono opacity-80">
                        <BarChart2 className="w-4 h-4" />
                        <span>{responseCount} response{responseCount !== 1 ? "s" : ""} received</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions Preview */}
                <div className="brutal-card">
                  <div className="flex items-center justify-between pb-4 border-b-2 border-foreground mb-4">
                    <h3 className="font-bold uppercase text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {generated.questions.length} Questions Generated
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground bg-muted px-2 py-1 brutal-border">
                      via {generated.source}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {generated.questions.map((q, i) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 p-3 brutal-border hover:bg-muted/10 group transition-colors"
                      >
                        <span className="w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{q.label}</p>
                          {q.type === "choice" && q.options && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {q.options.map((opt) => (
                                <span key={opt} className="text-[10px] font-mono bg-muted brutal-border px-2 py-0.5">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={questionTypeBadge(q.type)}>
                          {questionTypeIcon(q.type)} {q.type}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t-2 border-foreground flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground">
                      Share the QR code or link with attendees
                    </p>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="feedback-preview-link"
                      className="flex items-center gap-1 text-xs font-bold uppercase text-primary hover:underline"
                    >
                      Preview Form <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default FeedbackGeneratorPage;
