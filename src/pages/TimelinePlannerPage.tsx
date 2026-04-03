import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarRange, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const TimelinePlannerPage = () => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [scale, setScale] = useState("medium");
  const [timeline, setTimeline] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateTimeline = async () => {
    setIsLoading(true);
    setStatus("");

    try {
      const response = await api.generateTimeline({ eventTitle, eventDate, scale });
      setTimeline(response.timeline);
      setStatus("Timeline generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Timeline generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header className="mb-8 flex items-center justify-between" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">Activity Timelines</h1>
        </div>
        <button onClick={generateTimeline} className="brutal-btn-primary flex items-center gap-2 py-2" disabled={isLoading}>
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <CalendarRange className="h-4 w-4" strokeWidth={3} />}
          Generate Timeline
        </button>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Title</label>
            <input className="brutal-input" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Date</label>
            <input className="brutal-input" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Scale</label>
            <select className="brutal-input" value={scale} onChange={(event) => setScale(event.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </div>

        <div className="brutal-card">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Milestones</p>
          <div className="mt-6 space-y-4">
            {timeline.length > 0 ? (
              timeline.map((item) => (
                <div key={String(item.id)} className="brutal-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-bold uppercase">{String(item.label)}</p>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{String(item.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{String(item.date)} | Owner: {String(item.owner)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Generate the event timeline to get planning, execution, and post-event milestone suggestions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePlannerPage;
