import { useMemo, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Download, LoaderCircle, Eye } from "lucide-react";
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
import { api, downloadBase64Pdf, base64PdfToObjectUrl } from "@/lib/api";
import { CLUBS, COLLEGE_BRAND, getClubById } from "@/lib/clubs";

interface ReportState {
  collegeName: string;
  collegeAddress: string;
  clubName: string;
  clubId: string;
  authorityName: string;
  department: string;
  eventName: string;
  studentChapterName: string;
  description: string;
  eventInstructor: string;
  studentEventHead: string;
  facultyEventHead: string;
  criteria: string;
  eventFee: string;
  eventDate: string;
  eventVenue: string;
  mode: string;
  participantsRegistered: string;
  participantsAppeared: string;
  topicsCovered: string;
  eventSummary: string;
  photos: string;
  attendanceForm: string;
  attendanceFormLink: string;
  feedback: string;
  feedbackFormLink: string;
  keyHighlights: string;
  collegeLogo: string;
  clubLogo: string;
  collegeAcronym: string;
  clubAcronym: string;
  collegeBrandColor: string;
  clubBrandColor: string;
}

const initialState: ReportState = {
  collegeName: COLLEGE_BRAND.name,
  collegeAddress: COLLEGE_BRAND.address,
  clubName: CLUBS[0].name,
  clubId: CLUBS[0].id,
  authorityName: "",
  department: "",
  eventName: "",
  studentChapterName: CLUBS[0].name,
  description: "",
  eventInstructor: "",
  studentEventHead: "",
  facultyEventHead: "",
  criteria: "",
  eventFee: "",
  eventDate: "",
  eventVenue: "",
  mode: "Offline",
  participantsRegistered: "",
  participantsAppeared: "",
  topicsCovered: "",
  eventSummary: "",
  photos: "",
  attendanceForm: "",
  attendanceFormLink: "",
  feedback: "",
  feedbackFormLink: "",
  keyHighlights: "",
  collegeLogo: COLLEGE_BRAND.logoBasePath + ".png",
  clubLogo: CLUBS[0].logoBasePath + ".png",
  collegeAcronym: COLLEGE_BRAND.acronym,
  clubAcronym: CLUBS[0].acronym,
  collegeBrandColor: COLLEGE_BRAND.hex,
  clubBrandColor: CLUBS[0].hex,
};

const ReportGenerator = () => {
  const [data, setData] = useState<ReportState>(initialState);
  const [generatedFile, setGeneratedFile] = useState<{ fileName: string; pdfBase64: string } | null>(null);
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ id: string; name: string; roll: string; year?: string; branch?: string; division?: string; selected?: boolean }>>([]);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const chartData = useMemo(
    () => [
      { label: "Fee", value: Number(data.eventFee || 0) },
      { label: "Registered", value: Number(data.participantsRegistered || 0) },
      { label: "Appeared", value: Number(data.participantsAppeared || 0) },
      { label: "Feedback", value: Number(data.feedback || 0) * 10 },
    ],
    [data.eventFee, data.participantsRegistered, data.participantsAppeared, data.feedback]
  );

  const update = (field: keyof ReportState, value: string) => {
    setData((previous) => ({ ...previous, [field]: value }));
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (!reader.result || typeof reader.result !== "string") {
          reject(new Error("Unable to read file"));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const onAttendanceFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setAttendanceFile(selectedFile);
    if (!selectedFile) {
      setAttendanceRecords([]);
      return;
    }

    setStatus("Parsing attendance file...");
    try {
      const parsed = await api.parseAttendance(selectedFile);
      setAttendanceRecords(parsed.students || []);
      setStatus(`Attendance parsed: ${parsed.metadata.rowsParsed} rows`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Failed to parse attendance file.");
      setAttendanceRecords([]);
    }
  };

  const onPhotosChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setPhotoFiles(files);
    setPhotoPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setStatus("");

    const photoDataUrls = await Promise.all(photoFiles.map((file) => fileToDataUrl(file)));

    try {
      const response = await api.generateReport({
        ...data,
        attendanceRecords,
        photoDataUrls,
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

  const generatePreview = async () => {
    setIsGenerating(true);
    setStatus("");

    const photoDataUrls = await Promise.all(photoFiles.map((file) => fileToDataUrl(file)));

    try {
      const response = await api.generateReport({
        ...data,
        attendanceRecords,
        photoDataUrls,
        keyHighlights: data.keyHighlights
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setGeneratedFile(response);
      setPreviewUrl(base64PdfToObjectUrl(response.pdfBase64));
      setStatus("Preview generated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate preview.");
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
          <button onClick={generatePreview} className="brutal-btn-outline flex items-center gap-2 py-2" disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Eye className="h-4 w-4" strokeWidth={3} />}
            Preview
          </button>
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
              ["studentChapterName", "Student Chapter/Organization", CLUBS[0].name],
              ["department", "Department", "Computer Engineering"],
              ["authorityName", "Addressed To", "The Principal"],
              ["eventName", "Event Name", "Community Engagement Initiative"],
              ["eventInstructor", "Speaker/Instructor", "Dr. Smith"],
              ["studentEventHead", "Student Coordinator", "John Doe"],
              ["facultyEventHead", "Faculty Coordinator", "Prof. Johnson"],
              ["eventFee", "Event Fee (Optional)", "500"],
              ["eventDate", "Event Date", ""],
              ["eventVenue", "Event Venue", "Seminar Hall A"],
              ["participantsRegistered", "Participants Registered", "50"],
              ["participantsAppeared", "Participants Attended", "45"],
            ].map(([key, label, placeholder]) => {
              if (key === "eventDate") {
                return (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                    <input className="brutal-input" type="date" value={data.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
                  </div>
                );
              }

              if (key === "studentChapterName") {
                return (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                    <select
                      className="brutal-input"
                      value={data.clubId}
                      onChange={(event) => {
                        const selectedClub = getClubById(event.target.value);
                        update("clubId", selectedClub.id);
                        update("clubName", selectedClub.name);
                        update("studentChapterName", selectedClub.name);
                        update("clubAcronym", selectedClub.acronym);
                        update("clubBrandColor", selectedClub.hex);
                        update("clubLogo", selectedClub.logoBasePath + ".png");
                      }}
                    >
                      {CLUBS.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                  <input
                    className="brutal-input"
                    placeholder={placeholder}
                    value={data[key as keyof ReportState]}
                    onChange={(event) => update(key as keyof ReportState, event.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Mode</label>
              <select
                className="brutal-input"
                value={data.mode}
                onChange={(event) => update("mode", event.target.value)}
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Criteria</label>
              <input className="brutal-input" placeholder="Eligibility criteria" value={data.criteria} onChange={(event) => update("criteria", event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Description</label>
            <textarea className="brutal-input min-h-[90px] resize-y" placeholder="Detailed event description" value={data.description} onChange={(event) => update("description", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Topics / Activities Covered</label>
            <textarea className="brutal-input min-h-[90px] resize-y" placeholder="List the main topics, sessions, or activities covered" value={data.topicsCovered} onChange={(event) => update("topicsCovered", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Summary of Event</label>
            <textarea className="brutal-input min-h-[110px] resize-y" placeholder="Overall event summary" value={data.eventSummary} onChange={(event) => update("eventSummary", event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Photos</label>
              <input type="file" accept="image/*" multiple className="brutal-input" onChange={onPhotosChange} />
              {photoPreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photoPreviews.map((preview, idx) => (
                    <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="h-20 w-full object-cover" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Attendance File</label>
              <input type="file" accept=".csv,.xlsx,.xls" className="brutal-input" onChange={onAttendanceFileChange} />
              {attendanceRecords.length > 0 && <p className="text-xs text-muted-foreground mt-2">Parsed rows: {attendanceRecords.length} from {attendanceFile?.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Attendance Form Link</label>
              <input className="brutal-input" placeholder="https://forms.google.com/..." value={data.attendanceFormLink} onChange={(event) => update("attendanceFormLink", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Feedback</label>
              <input className="brutal-input" placeholder="Feedback summary" value={data.feedback} onChange={(event) => update("feedback", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Feedback Form Link</label>
              <input className="brutal-input" placeholder="https://forms.google.com/..." value={data.feedbackFormLink} onChange={(event) => update("feedbackFormLink", event.target.value)} />
            </div>
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
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Event Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Registered", data.participantsRegistered || "0"],
                ["Appeared", data.participantsAppeared || "0"],
                ["Fee", data.eventFee ? `Rs. ${data.eventFee}` : "Rs. 0"],
                ["Feedback", data.feedback || "0"],
                ["Mode", data.mode || "Offline"],
                ["Date", data.eventDate ? new Date(data.eventDate).toLocaleDateString() : "TBD"],
              ].map(([label, value]) => (
                <div key={label} className="brutal-border bg-muted/20 p-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{data.eventSummary || "Use this page to collect event report data, then generate a comprehensive PDF report with analytics and documentation."}</p>
          </div>
        </motion.div>
      </div>

      {previewUrl && (
        <motion.div className="mt-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="brutal-card">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">PDF Preview</p>
            <iframe
              src={previewUrl}
              className="w-full h-96 border-2 border-foreground/20 rounded-lg"
              title="Report Preview"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReportGenerator;
