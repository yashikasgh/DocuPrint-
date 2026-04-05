import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Send,
  MessageSquare,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  type: "rating" | "text" | "choice";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface FeedbackForm {
  formId: string;
  formTitle: string;
  formSubtitle: string;
  questions: Question[];
  eventName: string;
  eventDate: string;
  venue: string;
  clubName: string;
}

type Answers = Record<string, string | number>;

// ─── Sub-components ───────────────────────────────────────────────────────────
const StarRating = ({
  questionId,
  value,
  onChange,
}: {
  questionId: string;
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-2 mt-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          id={`star-${questionId}-${star}`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm font-bold ml-2 text-muted-foreground">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const FeedbackFormPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const [formData, setFormData] = useState<FeedbackForm | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [answers, setAnswers] = useState<Answers>({});
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!formId) return;
    (async () => {
      try {
        const res = await apiFetch(`/feedback/${formId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setFormData(data.form);
        setLoadState("loaded");
      } catch {
        setLoadState("error");
      }
    })();
  }, [formId]);

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!formData) return;
    setSubmitError("");

    // Validate required fields
    const errors: Record<string, boolean> = {};
    formData.questions.forEach((q) => {
      if (q.required && (answers[q.id] === undefined || answers[q.id] === "")) {
        errors[q.id] = true;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstErrorId = Object.keys(errors)[0];
      document.getElementById(`q-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitState("submitting");
    try {
      const res = await apiFetch(`/feedback/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Submission failed");
      }
      setSubmitState("done");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submission failed");
      setSubmitState("error");
    }
  };

  // ── Loading ──
  if (loadState === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-mono text-sm text-muted-foreground uppercase tracking-widest">Loading form…</p>
      </div>
    );
  }

  // ── Error ──
  if (loadState === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive" strokeWidth={1.5} />
        <h1 className="text-2xl font-bold uppercase">Form Not Found</h1>
        <p className="font-mono text-sm text-muted-foreground max-w-sm">
          This feedback form may have expired or the link is incorrect. Please ask the organizer for a new link.
        </p>
      </div>
    );
  }

  // ── Success ──
  if (submitState === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="w-24 h-24 bg-primary brutal-border flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-primary-foreground" strokeWidth={2} />
          </div>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <h1 className="text-3xl font-bold uppercase">Thank You!</h1>
          <p className="font-mono text-sm text-muted-foreground mt-3 max-w-sm mx-auto">
            Your feedback for <strong>{formData?.eventName}</strong> has been submitted successfully.
          </p>
          <p className="font-mono text-xs text-muted-foreground mt-4 opacity-60">
            Your response helps organizers improve future events.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-foreground text-background py-10 px-6 md:px-10 border-b-4 border-foreground">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5" strokeWidth={2} />
            <span className="text-xs font-mono uppercase tracking-widest opacity-70">Feedback Form</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold uppercase leading-tight">
            {formData!.formTitle}
          </h1>
          <p className="mt-2 font-mono text-sm opacity-70">{formData!.formSubtitle}</p>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-3 mt-5">
            {formData!.eventDate && (
              <span className="text-xs font-bold bg-background/10 border border-background/20 px-3 py-1 font-mono">
                📅 {formData!.eventDate}
              </span>
            )}
            {formData!.venue && (
              <span className="text-xs font-bold bg-background/10 border border-background/20 px-3 py-1 font-mono">
                📍 {formData!.venue}
              </span>
            )}
            {formData!.clubName && (
              <span className="text-xs font-bold bg-background/10 border border-background/20 px-3 py-1 font-mono">
                🏛 {formData!.clubName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {formData!.questions.map((q, i) => (
          <motion.div
            key={q.id}
            id={`q-${q.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`brutal-card transition-all ${
              validationErrors[q.id] ? "border-destructive ring-2 ring-destructive ring-offset-1" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <label className="font-bold text-sm leading-snug flex-1">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-foreground text-background text-xs mr-2 shrink-0">
                  {i + 1}
                </span>
                {q.label}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </label>
            </div>

            {/* Rating */}
            {q.type === "rating" && (
              <StarRating
                questionId={q.id}
                value={Number(answers[q.id] ?? 0)}
                onChange={(v) => setAnswer(q.id, v)}
              />
            )}

            {/* Text */}
            {q.type === "text" && (
              <textarea
                id={`input-${q.id}`}
                rows={3}
                className="brutal-input resize-none text-sm mt-1"
                placeholder={q.placeholder || "Write your response here…"}
                value={String(answers[q.id] ?? "")}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
            )}

            {/* Choice */}
            {q.type === "choice" && q.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    id={`choice-${q.id}-${opt.replace(/\s+/g, "-")}`}
                    onClick={() => setAnswer(q.id, opt)}
                    className={`text-sm text-left px-4 py-3 brutal-border font-medium transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                      answers[q.id] === opt
                        ? "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-card hover:bg-muted/30"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-current rounded-full flex items-center justify-center shrink-0 ${answers[q.id] === opt ? "bg-primary-foreground" : ""}`}>
                        {answers[q.id] === opt && <span className="w-2 h-2 rounded-full bg-primary block" />}
                      </span>
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {validationErrors[q.id] && (
              <p className="text-destructive text-xs font-bold mt-2">This field is required.</p>
            )}
          </motion.div>
        ))}

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: formData!.questions.length * 0.07 + 0.1 }}
          className="pt-2"
        >
          {submitState === "error" && (
            <p className="text-destructive text-xs font-bold mb-3 px-3 py-2 bg-destructive/10 brutal-border">
              {submitError || "Submission failed. Please try again."}
            </p>
          )}
          <button
            id="feedback-submit-btn"
            onClick={handleSubmit}
            disabled={submitState === "submitting"}
            className="brutal-btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitState === "submitting" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="w-5 h-5" /> Submit Feedback <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-xs font-mono text-muted-foreground mt-4">
            Your response is anonymous and helps improve future events.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
