import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarRange, LoaderCircle, Check, Loader, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const TimelinePlannerPage = () => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [scale, setScale] = useState("medium");
  const [timeline, setTimeline] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to calculate dynamic status based on milestone date
  const calculateDynamicStatus = (milestoneDate: string): "completed" | "ongoing" | "pending" => {
    if (!milestoneDate) return "pending";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const milestone = new Date(milestoneDate);
    milestone.setHours(0, 0, 0, 0);

    if (milestone < today) {
      return "completed";
    } else if (milestone.getTime() === today.getTime()) {
      return "ongoing";
    } else {
      return "pending";
    }
  };

  const generateTimeline = async () => {
    setIsLoading(true);
    setStatus("");

    try {
      const response = await api.generateTimeline({ eventTitle, eventDate, scale });
      setTimeline(response.timeline);
      setStatus("✓ Timeline generated successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate timeline. Please try again.";
      setStatus(`✗ ${errorMessage}`);
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
            <label htmlFor="timeline-event-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Title</label>
            <input id="timeline-event-title" className="brutal-input" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
          </div>
          <div>
            <label htmlFor="timeline-event-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Date</label>
            <input id="timeline-event-date" className="brutal-input" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </div>
          <div>
            <label htmlFor="timeline-event-scale" className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Scale</label>
            <select id="timeline-event-scale" className="brutal-input" value={scale} onChange={(event) => setScale(event.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          {status && (
            <motion.p
              className={`font-mono text-xs px-3 py-2 rounded ${status.startsWith("✗") ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {status}
            </motion.p>
          )}
        </div>

        <div className="brutal-card">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Milestones</p>
            {timeline.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-green-500 border border-background"></div>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 border border-background"></div>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Ongoing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-gray-400 border border-background"></div>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Pending</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 relative min-h-[200px] flex items-center">
            {/* Vertical timeline line */}
            {timeline.length > 0 && (
              <div className="absolute left-[10px] top-0 bottom-0 w-1 bg-gradient-to-b from-muted-foreground/60 to-muted-foreground/25"></div>
            )}

            {isLoading ? (
              <motion.div
                className="flex w-full flex-col items-center justify-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <LoaderCircle className="h-8 w-8 text-muted-foreground" strokeWidth={2} />
                </motion.div>
                <p className="font-mono text-sm text-muted-foreground">Generating timeline...</p>
              </motion.div>
            ) : timeline.length > 0 ? (
              <motion.div
                className="w-full space-y-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {timeline.map((item, index) => {
                  // Calculate dynamic status based on milestone date, override AI-generated status
                  const dynamicStatus = calculateDynamicStatus(String(item.date || ""));
                  const labelText = item.label ? String(item.label) : "Untitled";
                  const dateText = item.date ? String(item.date) : "No date";
                  const ownerText = item.owner ? String(item.owner) : "Unassigned";
                  const statusColor =
                    dynamicStatus === "completed"
                      ? "bg-green-500"
                      : dynamicStatus === "ongoing"
                      ? "bg-yellow-500"
                      : "bg-gray-400";
                  const milestoneCardClass =
                    dynamicStatus === "completed"
                      ? "bg-green-500/10 hover:bg-green-500/15"
                      : "bg-muted/20 hover:bg-muted/30";
                  const statusBadgeClass =
                    dynamicStatus === "completed"
                      ? "bg-green-500/20 text-green-700"
                      : dynamicStatus === "ongoing"
                      ? "bg-yellow-500/20 text-yellow-700"
                      : "bg-gray-500/20 text-gray-700";

                  const getStatusIcon = () => {
                    switch (dynamicStatus) {
                      case "completed":
                        return <Check className="h-4 w-4 text-white" strokeWidth={3} />;
                      case "ongoing":
                        return <Loader className="h-4 w-4 text-white animate-spin" strokeWidth={2.5} />;
                      case "pending":
                        return <Clock className="h-4 w-4 text-white" strokeWidth={2.5} />;
                      default:
                        return null;
                    }
                  };

                  return (
                    <motion.div
                      key={String(item.id)}
                      className={`relative pl-10 ${index !== timeline.length - 1 ? "mb-10" : ""}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {/* Circular dot indicator with status icon */}
                      <div className={`absolute left-0 top-1.5 h-6 w-6 rounded-full ${statusColor} border-2 border-background shadow-md transition-transform duration-200 hover:scale-110 flex items-center justify-center`}>
                        {getStatusIcon()}
                      </div>

                      {/* Content card with hover effect */}
                      <div className={`brutal-border p-4 transition-all duration-200 hover:shadow-md ${milestoneCardClass}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-sm font-bold uppercase leading-snug flex-1">{labelText}</h3>
                          <span className={`font-mono text-[10px] uppercase px-2.5 py-1.5 rounded font-semibold w-fit ${statusBadgeClass}`}>{dynamicStatus}</span>
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-mono text-muted-foreground">{dateText}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Owner:</span> {ownerText}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                Generate the event timeline to get planning, execution, and post-event milestone suggestions.
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePlannerPage;
