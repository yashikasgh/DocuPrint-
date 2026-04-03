import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Download, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, downloadBase64Pdf } from "@/lib/api";
import { COLLEGE_BRAND } from "@/lib/clubs";

interface ReportState {
  collegeName: string;
  collegeAddress: string;
  clubName: string;
  authorityName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  eventSummary: string;
  totalAttendees: string;
  totalBudget: string;
  actualSpend: string;
  feedbackScore: string;
  outcomes: string;
  keyHighlights: string;
}

const initialState: ReportState = {
  collegeName: COLLEGE_BRAND.name,
  collegeAddress: COLLEGE_BRAND.address,
  clubName: "",
  authorityName: "",
  eventTitle: "",
  eventDate: "",
  venue: "",
  eventSummary: "",
  totalAttendees: "",
  totalBudget: "",
  actualSpend: "",
  feedbackScore: "",
  outcomes: "",
  keyHighlights: "",
};

const ReportGenerator = () => {
  const [data, setData] = useState<ReportState>(initialState);
  const [generatedFile, setGeneratedFile] = useState<{ fileName: string; pdfBase64: string } | null>(null);
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const chartData = useMemo(
    () => [
      { label: "Budget", value: Number(data.totalBudget || 0) },
      { label: "Spend", value: Number(data.actualSpend || 0) },
      { label: "Attendees", value: Number(data.totalAttendees || 0) },
      { label: "Feedback x10", value: Number(data.feedbackScore || 0) * 10 },
    ],
    [data.actualSpend, data.feedbackScore, data.totalAttendees, data.totalBudget]
  );

  const update = (field: keyof ReportState, value: string) => {
    setData((previous) => ({ ...previous, [field]: value }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setStatus("");

    try {
      const response = await api.generateReport({
        ...data,
        keyHighlights: data.keyHighlights
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setGeneratedFile(response);
      setStatus("Report PDF generated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate report.");
    } finally {
      setIsGenerating(false);
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
          <h1 className="text-xl font-bold uppercase tracking-tight">Report Generator</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={generateReport} className="brutal-btn-primary flex items-center gap-2 py-2" disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <BarChart3 className="h-4 w-4" strokeWidth={3} />}
            Generate PDF
          </button>
          <button
            onClick={() => generatedFile && downloadBase64Pdf(generatedFile.pdfBase64, generatedFile.fileName)}
            className="brutal-btn-secondary flex items-center gap-2 py-2"
            disabled={!generatedFile}
          >
            <Download className="h-4 w-4" strokeWidth={3} />
            Download
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div className="space-y-4" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["collegeName", "College Name", COLLEGE_BRAND.name],
              ["collegeAddress", "College Address", COLLEGE_BRAND.address],
              ["clubName", "Club Name", "Coding Club"],
              ["authorityName", "Addressed To", "The Principal"],
              ["eventTitle", "Event Title", "AI Innovation Summit"],
              ["venue", "Venue", "Seminar Hall A"],
              ["totalAttendees", "Total Attendees", "240"],
              ["totalBudget", "Budget", "50000"],
              ["actualSpend", "Actual Spend", "46200"],
              ["feedbackScore", "Feedback Score", "8.7"],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                <input
                  className="brutal-input"
                  placeholder={placeholder}
                  value={data[key as keyof ReportState]}
                  onChange={(event) => update(key as keyof ReportState, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Date</label>
            <input className="brutal-input" type="date" value={data.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Summary</label>
            <textarea className="brutal-input min-h-[110px] resize-y" value={data.eventSummary} onChange={(event) => update("eventSummary", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Outcomes</label>
            <textarea className="brutal-input min-h-[90px] resize-y" value={data.outcomes} onChange={(event) => update("outcomes", event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Key Highlights</label>
            <textarea className="brutal-input min-h-[110px] resize-y" placeholder={"One highlight per line"} value={data.keyHighlights} onChange={(event) => update("keyHighlights", event.target.value)} />
          </div>
          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </motion.div>

        <motion.div className="space-y-6" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="brutal-card">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick Analytics</p>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="brutal-card space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Report Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Attendees", data.totalAttendees || "0"],
                ["Budget", data.totalBudget ? `Rs. ${data.totalBudget}` : "Rs. 0"],
                ["Spent", data.actualSpend ? `Rs. ${data.actualSpend}` : "Rs. 0"],
                ["Feedback", data.feedbackScore || "0"],
              ].map(([label, value]) => (
                <div key={label} className="brutal-border bg-muted/20 p-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{data.eventSummary || "Use this page to collect the key report data, then let the backend render a formal PDF with highlights and analytics."}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportGenerator;
