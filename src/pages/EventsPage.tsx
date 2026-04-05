import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  MapPin,
  FileText,
  Image as ImageIcon,
  Users,
  BarChart3,
  Trash2,
  X,
  Link2,
  MessageSquare,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from "date-fns";

type DocType = "proposal" | "flyer" | "attendance" | "report";

interface LinkedDoc {
  id: string;
  type: DocType;
  title: string;
  createdAt: string;
}

interface EventData {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: "upcoming" | "ongoing" | "completed";
  description: string;
  documents: LinkedDoc[];
  notes: string;
}

const docIcons: Record<DocType, typeof FileText> = {
  proposal: FileText,
  flyer: ImageIcon,
  attendance: Users,
  report: BarChart3,
};

const docColors: Record<DocType, string> = {
  proposal: "bg-primary",
  flyer: "bg-secondary",
  attendance: "bg-accent",
  report: "bg-primary",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sampleEvents: EventData[] = [
  {
    id: "1",
    name: "Annual Tech Symposium",
    date: "2026-04-15",
    venue: "Main Auditorium",
    status: "upcoming",
    description: "A day-long technology conference featuring keynote speakers.",
    notes: "Remember to bring extra HDMI cables.",
    documents: [
      { id: "d1", type: "proposal", title: "Event Proposal v1", createdAt: "2026-03-20" },
      { id: "d2", type: "flyer", title: "Promo Flyer", createdAt: "2026-03-25" },
    ],
  },
  {
    id: "2",
    name: "Spring Cultural Fest",
    date: "2026-05-10",
    venue: "Open Grounds",
    status: "upcoming",
    description: "Three-day cultural festival with performances, art.",
    notes: "",
    documents: [
      { id: "d3", type: "attendance", title: "Volunteer Roster", createdAt: "2026-04-01" },
    ],
  },
];

const EventsPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date("2026-04-01T00:00:00"));
  const [events, setEvents] = useState<EventData[]>(sampleEvents);
  
  // Modals state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  
  // Form states
  const [newEvent, setNewEvent] = useState({ name: "", time: "", venue: "", description: "" });
  const [newDoc, setNewDoc] = useState({ type: "proposal" as DocType, title: "" });
  const [isLinkingDoc, setIsLinkingDoc] = useState(false);
  const [noteEdit, setNoteEdit] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Feedback state
  type FeedbackState = "idle" | "loading" | "done" | "error";
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<{
    formId: string;
    formTitle: string;
    questions: { id: string; type: string; label: string }[];
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset feedback panel when switching events
  useEffect(() => {
    setFeedbackState("idle");
    setFeedbackOpen(false);
    setFeedbackForm(null);
    setQrDataUrl("");
  }, [selectedEvent?.id]);

  const generateFeedback = async () => {
    if (!selectedEvent) return;
    setFeedbackState("loading");
    setFeedbackOpen(true);
    try {
      const res = await fetch("http://localhost:8787/api/feedback/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: selectedEvent.name,
          eventDate: selectedEvent.date,
          venue: selectedEvent.venue,
          description: selectedEvent.description,
          eventType: "General",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const form = data.form;
      setFeedbackForm(form);
      const url = `${window.location.origin}/feedback/${form.formId}`;
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(qr);
      setFeedbackState("done");
    } catch {
      setFeedbackState("error");
    }
  };

  const feedbackPublicUrl = feedbackForm
    ? `${window.location.origin}/feedback/${feedbackForm.formId}`
    : "";

  const handleCopyFeedbackLink = async () => {
    if (!feedbackPublicUrl) return;
    await navigator.clipboard.writeText(feedbackPublicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !feedbackForm) return;
    const link = document.createElement("a");
    link.download = `feedback-qr-${feedbackForm.formId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const daysInCalendar = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => isSameDay(parseISO(e.date), day));
  };

  // Event Handlers
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setNewEvent({ name: "", time: "10:00", venue: "", description: "" });
    setShowAddEvent(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: EventData) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const createEvent = () => {
    if (!newEvent.name || !selectedDate) return;
    const eventObj: EventData = {
      id: Date.now().toString(),
      name: newEvent.name,
      date: format(selectedDate, "yyyy-MM-dd"),
      venue: newEvent.venue,
      status: "upcoming",
      description: newEvent.description,
      documents: [],
      notes: "",
    };
    setEvents((prev) => [...prev, eventObj]);
    setShowAddEvent(false);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedEvent(null);
  };

  const linkDocument = () => {
    if (!newDoc.title || !selectedEvent) return;
    const doc: LinkedDoc = {
      id: Date.now().toString(),
      type: newDoc.type,
      title: newDoc.title,
      createdAt: format(new Date(), "yyyy-MM-dd"),
    };
    const updatedEvent = { ...selectedEvent, documents: [...selectedEvent.documents, doc] };
    
    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)));
    setSelectedEvent(updatedEvent);
    setNewDoc({ type: "proposal", title: "" });
    setIsLinkingDoc(false);
  };

  const unlinkDocument = (docId: string) => {
    if (!selectedEvent) return;
    const updatedEvent = {
        ...selectedEvent,
        documents: selectedEvent.documents.filter((d) => d.id !== docId)
    };
    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)));
    setSelectedEvent(updatedEvent);
  };
  
  const saveNotes = () => {
      if(!selectedEvent) return;
      const updatedEvent = { ...selectedEvent, notes: noteEdit };
      setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)));
      setSelectedEvent(updatedEvent);
      setIsEditingNote(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      {/* Header */}
      <motion.header
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline py-2 px-3 flex items-center gap-1 text-xs">
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Calendar</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center brutal-border bg-card p-1">
                <button onClick={prevMonth} className="p-1 hover:bg-muted transition-colors cursor-pointer active:scale-95">
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5}/>
                </button>
                <div className="w-36 text-center font-bold uppercase tracking-widest text-sm">
                    {format(currentMonth, "MMMM yyyy")}
                </div>
                <button onClick={nextMonth} className="p-1 hover:bg-muted transition-colors cursor-pointer active:scale-95">
                    <ChevronRight className="w-5 h-5" strokeWidth={2.5}/>
                </button>
            </div>
            <button onClick={goToToday} className="brutal-btn-secondary py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                Today
            </button>
        </div>
      </motion.header>

      {/* Calendar Grid */}
      <motion.div
        className="max-w-6xl mx-auto brutal-card !p-0 overflow-hidden"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-7 border-b-2 border-foreground bg-muted/30">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-3 text-center font-bold uppercase text-xs tracking-wider border-r-2 border-foreground last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 bg-card">
          {daysInCalendar.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isTargetMonth = isSameMonth(day, monthStart);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[120px] p-2 border-b-2 border-r-2 border-foreground cursor-pointer group transition-colors
                  ${!isTargetMonth ? "bg-muted/40 text-muted-foreground" : "hover:bg-accent/10"}
                  ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                    <span className={`
                      text-sm font-bold w-7 h-7 flex items-center justify-center rounded-none
                      ${today ? "bg-primary text-primary-foreground brutal-border" : ""}
                    `}>
                      {format(day, "d")}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] uppercase font-bold text-muted-foreground transition-opacity">
                        Add
                    </span>
                </div>
                
                <div className="space-y-1.5 mt-2">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={(e) => handleEventClick(e, evt)}
                      className="px-1.5 py-1 text-xs font-bold truncate bg-secondary text-secondary-foreground brutal-border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-[1px]"
                    >
                      {evt.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Event Dialog */}
      <AnimatePresence>
        {showAddEvent && selectedDate && (
          <>
            <motion.div 
               className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowAddEvent(false)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md brutal-card z-50 p-6"
              initial={{ opacity: 0, y: "-40%", x: "-50%" }}
              animate={{ opacity: 1, y: "-50%", x: "-50%" }}
              exit={{ opacity: 0, y: "-40%", x: "-50%" }}
            >
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-xl uppercase">New Event</h3>
                 <button onClick={() => setShowAddEvent(false)} className="hover:text-destructive"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="font-mono text-sm mb-4 pb-2 border-b-2 border-foreground">
                  <span className="font-bold uppercase pr-2">Date:</span> 
                  {format(selectedDate, "EEEE, MMMM do, yyyy")}
              </div>

              <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold uppercase block mb-1">Event Name</label>
                    <input autoFocus className="brutal-input py-2" placeholder="e.g. Board Meeting" value={newEvent.name} onChange={(e) => setNewEvent(p => ({...p, name: e.target.value}))} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase block mb-1">Venue (Optional)</label>
                    <input className="brutal-input py-2 flex-1" placeholder="e.g. Conference Room A" value={newEvent.venue} onChange={(e) => setNewEvent(p => ({...p, venue: e.target.value}))} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase block mb-1">Description (Optional)</label>
                    <textarea rows={2} className="brutal-input py-2 resize-none" placeholder="Brief details about the event" value={newEvent.description} onChange={(e) => setNewEvent(p => ({...p, description: e.target.value}))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setShowAddEvent(false)} className="brutal-btn-outline py-2">Cancel</button>
                 <button onClick={createEvent} className="brutal-btn-primary py-2">Create Event</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detailed Event Dialog */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div 
               className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setSelectedEvent(null)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto brutal-card z-50 !p-0"
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            >
               {/* Modal Header */}
               <div className="bg-primary text-primary-foreground p-6 border-b-2 border-foreground flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold uppercase break-words pr-8">{selectedEvent.name}</h2>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm font-mono font-bold">
                            <span className="flex items-center gap-1.5 bg-background text-foreground px-2 py-0.5 brutal-border"><CalendarIcon className="w-4 h-4"/> {format(parseISO(selectedEvent.date), "MMMM d, yyyy")}</span>
                            {selectedEvent.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {selectedEvent.venue}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => deleteEvent(selectedEvent.id)} className="p-2 brutal-border bg-card text-destructive hover:bg-destructive hover:text-white transition-colors" title="Delete Event">
                            <Trash2 className="w-4 h-4" strokeWidth={3}/>
                        </button>
                        <button onClick={() => setSelectedEvent(null)} className="p-2 brutal-border bg-card text-foreground hover:bg-muted transition-colors">
                            <X className="w-4 h-4" strokeWidth={3}/>
                        </button>
                    </div>
               </div>

               {/* Modal Body */}
               <div className="p-6 space-y-8">
                   {/* Description Section */}
                   {selectedEvent.description && (
                       <div>
                           {/* <h4 className="font-bold uppercase text-xs tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Description</h4> */}
                           <p className="text-sm border-l-4 border-primary pl-3 py-1 font-medium leading-relaxed">{selectedEvent.description}</p>
                       </div>
                   )}

                   {/* Notes Section */}
                   <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold uppercase text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4"/> Notes
                            </h4>
                            {!isEditingNote && (
                                <button onClick={() => { setNoteEdit(selectedEvent.notes || ""); setIsEditingNote(true); }} className="text-xs font-bold uppercase text-primary hover:underline">
                                    {selectedEvent.notes ? "Edit" : "Add Note"}
                                </button>
                            )}
                        </div>
                        
                        {isEditingNote ? (
                            <div className="space-y-2">
                                <textarea 
                                    className="brutal-input text-sm min-h-[100px]" 
                                    value={noteEdit} 
                                    onChange={(e) => setNoteEdit(e.target.value)}
                                    placeholder="Write details, minutes, or thoughts..."
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsEditingNote(false)} className="text-xs brutal-btn-outline py-1 px-3">Cancel</button>
                                    <button onClick={saveNotes} className="text-xs brutal-btn-primary py-1 px-3">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-muted/30 brutal-border p-4 min-h-[80px] text-sm whitespace-pre-wrap">
                                {selectedEvent.notes ? selectedEvent.notes : <span className="text-muted-foreground italic font-mono">No notes recorded.</span>}
                            </div>
                        )}
                   </div>

                   {/* Documents Section */}
                   <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold uppercase text-sm flex items-center gap-2">
                                <Link2 className="w-4 h-4"/> Attached Documents
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {selectedEvent.documents.map((doc) => {
                                const Icon = docIcons[doc.type];
                                return (
                                <div key={doc.id} className="brutal-border p-3 flex items-center justify-between gap-2 group hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 ${docColors[doc.type]} brutal-border flex items-center justify-center shrink-0`}>
                                            <Icon className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs uppercase truncate">{doc.title}</p>
                                            <p className="font-mono text-[10px] text-muted-foreground">{doc.type} · {doc.createdAt}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => unlinkDocument(doc.id)} className="block sm:hidden group-hover:block text-destructive hover:scale-110 transition-transform">
                                        <X className="w-4 h-4" strokeWidth={3} />
                                    </button>
                                </div>
                                );
                            })}
                        </div>

                        {/* Link new document */}
                        {isLinkingDoc ? (
                            <div className="brutal-border p-3 bg-card flex flex-col gap-3">
                                <span className="text-xs font-bold uppercase">Attach Document</span>
                                <div className="flex gap-2">
                                    <select
                                        className="brutal-input py-1.5 text-xs w-1/3"
                                        value={newDoc.type}
                                        onChange={(e) => setNewDoc((p) => ({ ...p, type: e.target.value as DocType }))}
                                    >
                                        <option value="proposal">Proposal</option>
                                        <option value="flyer">Flyer</option>
                                        <option value="attendance">Attendance</option>
                                        <option value="report">Report</option>
                                    </select>
                                    <input
                                        className="brutal-input py-1.5 text-xs flex-1"
                                        placeholder="Document title"
                                        value={newDoc.title}
                                        onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsLinkingDoc(false)} className="brutal-btn-outline py-1.5 px-3 text-xs">Cancel</button>
                                    <button onClick={linkDocument} className="brutal-btn-secondary py-1.5 px-3 text-xs">Attach</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsLinkingDoc(true)} className="brutal-btn-outline w-full py-3 text-xs border-dashed text-muted-foreground hover:text-foreground hover:border-solid hover:bg-muted/10">
                                + Attach File
                            </button>
                        )}
                   </div>

                   {/* ── Feedback Form Section ─────────────────────────── */}
                   <div className="border-t-2 border-foreground pt-6">
                     <div className="flex items-center justify-between mb-3">
                       <h4 className="font-bold uppercase text-sm flex items-center gap-2">
                         <MessageSquare className="w-4 h-4" /> Feedback Form
                       </h4>
                       {feedbackState === "done" && (
                         <button
                           onClick={() => setFeedbackOpen((p) => !p)}
                           className="text-xs font-bold uppercase text-primary flex items-center gap-1 hover:underline"
                         >
                           {feedbackOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</> : <><ChevronDown className="w-3.5 h-3.5" /> Show</>}
                         </button>
                       )}
                     </div>

                     {/* Generate button — shown when idle or error */}
                     {(feedbackState === "idle" || feedbackState === "error") && (
                       <div className="space-y-2">
                         {feedbackState === "error" && (
                           <p className="text-destructive text-xs font-bold px-3 py-2 bg-destructive/10 brutal-border">
                             Failed to generate. Make sure the backend is running.
                           </p>
                         )}
                         <button
                           id="event-card-generate-feedback"
                           onClick={generateFeedback}
                           className="brutal-btn-secondary w-full py-3 text-xs flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                         >
                           <Sparkles className="w-4 h-4" />
                           Generate Feedback Form + QR Code
                         </button>
                       </div>
                     )}

                     {/* Loading spinner */}
                     {feedbackState === "loading" && (
                       <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="brutal-border bg-muted/20 px-4 py-5 flex items-center gap-3"
                       >
                         <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                         <div>
                           <p className="text-sm font-bold">AI is generating questions…</p>
                           <p className="text-xs font-mono text-muted-foreground mt-0.5">Based on: {selectedEvent.name}</p>
                         </div>
                       </motion.div>
                     )}

                     {/* Done: QR + questions */}
                     {feedbackState === "done" && feedbackForm && (
                       <AnimatePresence>
                         {feedbackOpen && (
                           <motion.div
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: "auto" }}
                             exit={{ opacity: 0, height: 0 }}
                             className="overflow-hidden"
                           >
                             {/* QR Card */}
                             <div className="brutal-border bg-foreground text-background p-4 flex gap-4 items-start mb-4">
                               <div className="shrink-0">
                                 {qrDataUrl ? (
                                   <img src={qrDataUrl} alt="Feedback QR" className="w-24 h-24 bg-white brutal-border" />
                                 ) : (
                                   <div className="w-24 h-24 bg-background/10 brutal-border animate-pulse" />
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-mono uppercase opacity-60 mb-1">Scan to submit feedback</p>
                                 <p className="font-bold text-sm leading-snug">{feedbackForm.formTitle}</p>
                                 <p className="font-mono text-[10px] opacity-50 mt-1 break-all">{feedbackPublicUrl}</p>
                                 <div className="flex gap-2 mt-3 flex-wrap">
                                   <button
                                     onClick={handleCopyFeedbackLink}
                                     className="flex items-center gap-1 text-[10px] font-bold uppercase bg-background text-foreground brutal-border px-2 py-1.5 hover:bg-secondary transition-colors"
                                   >
                                     {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
                                   </button>
                                   <button
                                     onClick={handleDownloadQr}
                                     className="flex items-center gap-1 text-[10px] font-bold uppercase bg-background text-foreground brutal-border px-2 py-1.5 hover:bg-secondary transition-colors"
                                   >
                                     <Download className="w-3 h-3" /> Download QR
                                   </button>
                                   <a
                                     href={feedbackPublicUrl}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center gap-1 text-[10px] font-bold uppercase bg-background text-foreground brutal-border px-2 py-1.5 hover:bg-secondary transition-colors"
                                   >
                                     <QrCode className="w-3 h-3" /> Open Form
                                   </a>
                                 </div>
                               </div>
                             </div>

                             {/* Questions preview */}
                             <div className="space-y-2">
                               <p className="text-xs font-bold uppercase text-muted-foreground">{feedbackForm.questions.length} Questions Generated</p>
                               {feedbackForm.questions.map((q, i) => (
                                 <div key={q.id} className="flex items-start gap-2 brutal-border p-2.5 bg-muted/5">
                                   <span className="w-5 h-5 bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                   <span className="text-xs leading-snug">{q.label}</span>
                                   <span className="ml-auto text-[9px] font-mono bg-muted brutal-border px-1.5 py-0.5 uppercase shrink-0">{q.type}</span>
                                 </div>
                               ))}
                             </div>

                             <button
                               onClick={() => { setFeedbackState("idle"); setFeedbackForm(null); setQrDataUrl(""); }}
                               className="mt-3 text-xs font-bold text-muted-foreground hover:text-destructive underline"
                             >
                               Regenerate
                             </button>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     )}
                   </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
