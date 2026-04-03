import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileBarChart, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const PostEventSummaryPage = () => {
  const [form, setForm] = useState({
    clubName: "",
    eventTitle: "",
    eventDate: "",
    venue: "",
    totalRegistrations: "",
    totalAttendees: "",
    totalBudget: "",
    actualSpend: "",
    feedbackScore: "",
    highlights: "",
    outcomes: "",
    imageCaptions: "",
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const generateSummary = async () => {
    setIsLoading(true);
    setStatus("");

    try {
      const response = await api.compileSummary({
        ...form,
        highlights: form.highlights.split("\n").map((item) => item.trim()).filter(Boolean),
        outcomes: form.outcomes.split("\n").map((item) => item.trim()).filter(Boolean),
        imageCaptions: form.imageCaptions.split("\n").map((item) => item.trim()).filter(Boolean),
      });
      setResult(response);
      setStatus("Post-event summary generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to build post-event summary.");
    } finally {
      setIsLoading(false);
    }
  };

  const recommendations = (result?.recommendations as string[] | undefined) || [];
  const executiveSummary = (result?.executiveSummary as string[] | undefined) || [];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header className="mb-8 flex items-center justify-between" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">Post-Event Summary</h1>
        </div>
        <button onClick={generateSummary} className="brutal-btn-primary flex items-center gap-2 py-2" disabled={isLoading}>
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <FileBarChart className="h-4 w-4" strokeWidth={3} />}
          Generate Summary
        </button>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["clubName", "Club Name"],
              ["eventTitle", "Event Title"],
              ["venue", "Venue"],
              ["totalRegistrations", "Registrations"],
              ["totalAttendees", "Attendees"],
              ["totalBudget", "Approved Budget"],
              ["actualSpend", "Actual Spend"],
              ["feedbackScore", "Feedback Score"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                <input className="brutal-input" value={form[key as keyof typeof form]} onChange={(event) => update(key as keyof typeof form, event.target.value)} />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Date</label>
            <input className="brutal-input" type="date" value={form.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Highlights</label>
            <textarea className="brutal-input min-h-[100px] resize-y" value={form.highlights} onChange={(event) => update("highlights", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Outcomes</label>
            <textarea className="brutal-input min-h-[100px] resize-y" value={form.outcomes} onChange={(event) => update("outcomes", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Image Captions</label>
            <textarea className="brutal-input min-h-[90px] resize-y" value={form.imageCaptions} onChange={(event) => update("imageCaptions", event.target.value)} />
          </div>
          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </div>

        <div className="space-y-6">
          <div className="brutal-card">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Executive Summary</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              {executiveSummary.length > 0 ? executiveSummary.map((item) => <p key={item}>{item}</p>) : <p>Generate the summary to compile attendance, budget, and feedback into a clean post-event wrap-up.</p>}
            </div>
          </div>
          <div className="brutal-card">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Recommendations</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              {recommendations.length > 0 ? recommendations.map((item) => <p key={item}>- {item}</p>) : <p>Recommendations will appear here after the analytics are generated.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostEventSummaryPage;
