import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  FileText,
  Image,
  Users,
  BarChart3,
  Trash2,
  X,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";

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
}

const docIcons: Record<DocType, typeof FileText> = {
  proposal: FileText,
  flyer: Image,
  attendance: Users,
  report: BarChart3,
};

const docColors: Record<DocType, string> = {
  proposal: "bg-primary",
  flyer: "bg-secondary",
  attendance: "bg-accent",
  report: "bg-primary",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-secondary text-secondary-foreground",
  ongoing: "bg-accent text-accent-foreground",
  completed: "bg-muted text-foreground",
};

const sampleEvents: EventData[] = [
  {
    id: "1",
    name: "Annual Tech Symposium",
    date: "2026-04-15",
    venue: "Main Auditorium",
    status: "upcoming",
    description: "A day-long technology conference featuring keynote speakers and workshops.",
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
    description: "Three-day cultural festival with performances, art, and food stalls.",
    documents: [
      { id: "d3", type: "attendance", title: "Volunteer Roster", createdAt: "2026-04-01" },
    ],
  },
];

const EventsPage = () => {
  const [events, setEvents] = useState<EventData[]>(sampleEvents);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ name: "", date: "", venue: "", description: "" });
  const [linkingEventId, setLinkingEventId] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({ type: "proposal" as DocType, title: "" });

  const createEvent = () => {
    if (!newEvent.name) return;
    const event: EventData = {
      id: Date.now().toString(),
      name: newEvent.name,
      date: newEvent.date,
      venue: newEvent.venue,
      status: "upcoming",
      description: newEvent.description,
      documents: [],
    };
    setEvents((prev) => [event, ...prev]);
    setNewEvent({ name: "", date: "", venue: "", description: "" });
    setShowCreate(false);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const linkDocument = (eventId: string) => {
    if (!newDoc.title) return;
    const doc: LinkedDoc = {
      id: Date.now().toString(),
      type: newDoc.type,
      title: newDoc.title,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, documents: [...e.documents, doc] } : e))
    );
    setNewDoc({ type: "proposal", title: "" });
    setLinkingEventId(null);
  };

  const unlinkDocument = (eventId: string, docId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, documents: e.documents.filter((d) => d.id !== docId) } : e
      )
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
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
          <h1 className="text-xl font-bold uppercase tracking-tight">Events</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="brutal-btn-primary flex items-center gap-2 py-2"
        >
          {showCreate ? <X className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={3} />}
          {showCreate ? "Cancel" : "New Event"}
        </button>
      </motion.header>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="brutal-card mb-8 max-w-2xl"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <h3 className="font-bold uppercase text-sm mb-4">Create Event</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                className="brutal-input"
                placeholder="Event Name"
                value={newEvent.name}
                onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                type="date"
                className="brutal-input"
                value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
              />
              <input
                className="brutal-input"
                placeholder="Venue"
                value={newEvent.venue}
                onChange={(e) => setNewEvent((p) => ({ ...p, venue: e.target.value }))}
              />
              <input
                className="brutal-input"
                placeholder="Short description"
                value={newEvent.description}
                onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <button onClick={createEvent} className="brutal-btn-secondary py-2 text-xs">
              Create
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List */}
      <motion.div
        className="space-y-4 max-w-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {events.length === 0 && (
          <div className="brutal-card text-center py-16">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold uppercase">No events yet</p>
            <p className="font-mono text-sm text-muted-foreground mt-1">Create your first event to get started.</p>
          </div>
        )}

        {events.map((event) => {
          const isExpanded = expandedId === event.id;
          return (
            <motion.div key={event.id} className="brutal-card !p-0 overflow-hidden" layout>
              {/* Event Header */}
              <div
                className="p-5 cursor-pointer flex items-start justify-between gap-4"
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold uppercase text-lg truncate">{event.name}</h3>
                    <span className={`brutal-border px-2 py-0.5 text-xs font-bold uppercase ${statusColors[event.status]}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {event.date || "No date"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.venue || "No venue"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5" /> {event.documents.length} docs
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvent(event.id);
                    }}
                    className="brutal-btn-outline py-1.5 px-2 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t-2 border-foreground"
                  >
                    <div className="p-5">
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                      )}

                      {/* Linked Documents */}
                      <div className="mb-4">
                        <h4 className="font-bold uppercase text-xs tracking-wider mb-3">Linked Documents</h4>
                        {event.documents.length === 0 ? (
                          <p className="text-sm text-muted-foreground font-mono">No documents linked yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {event.documents.map((doc) => {
                              const Icon = docIcons[doc.type];
                              return (
                                <div
                                  key={doc.id}
                                  className="brutal-border p-3 bg-muted/20 flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 ${docColors[doc.type]} brutal-border flex items-center justify-center shrink-0`}>
                                      <Icon className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs uppercase truncate">{doc.title}</p>
                                      <p className="font-mono text-xs text-muted-foreground">{doc.type} · {doc.createdAt}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => unlinkDocument(event.id, doc.id)}
                                    className="text-destructive hover:opacity-70"
                                  >
                                    <X className="w-4 h-4" strokeWidth={2.5} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Link New Document */}
                      {linkingEventId === event.id ? (
                        <div className="brutal-border p-3 bg-muted/10 flex flex-col sm:flex-row gap-2">
                          <select
                            className="brutal-input py-2 text-sm"
                            value={newDoc.type}
                            onChange={(e) => setNewDoc((p) => ({ ...p, type: e.target.value as DocType }))}
                          >
                            <option value="proposal">Proposal</option>
                            <option value="flyer">Flyer</option>
                            <option value="attendance">Attendance</option>
                            <option value="report">Report</option>
                          </select>
                          <input
                            className="brutal-input py-2 text-sm flex-1"
                            placeholder="Document title"
                            value={newDoc.title}
                            onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => linkDocument(event.id)} className="brutal-btn-secondary py-2 px-4 text-xs">
                              Add
                            </button>
                            <button onClick={() => setLinkingEventId(null)} className="brutal-btn-outline py-2 px-3 text-xs">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLinkingEventId(event.id)}
                          className="brutal-btn-outline py-2 text-xs flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                          Link Document
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default EventsPage;
