import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Download, FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, base64PdfToObjectUrl, downloadBase64Pdf } from "@/lib/api";
import { CLUBS, COLLEGE_BRAND, getClubById } from "@/lib/clubs";

type Signatory = {
  id: string;
  name: string;
  designation: string;
};

interface ProposalData {
  collegeName: string;
  collegeAddress: string;
  collegeAcronym: string;
  clubId: string;
  authorityName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  subject: string;
  targetAudience: string;
  budget: string;
  objective: string;
  eventSummary: string;
  keyPoints: string;
}

const initialState: ProposalData = {
  collegeName: COLLEGE_BRAND.name,
  collegeAddress: COLLEGE_BRAND.address,
  collegeAcronym: COLLEGE_BRAND.acronym,
  clubId: CLUBS[0].id,
  authorityName: "The Principal",
  eventTitle: "",
  eventDate: "",
  venue: "",
  subject: "",
  targetAudience: "",
  budget: "",
  objective: "",
  eventSummary: "",
  keyPoints: "",
};

const LogoBadge = ({
  label,
  hex,
  logoPath,
  size = "lg",
}: {
  label: string;
  hex: string;
  logoPath?: string;
  size?: "sm" | "lg";
}) => {
  const [failed, setFailed] = useState(false);
  const dimension = size === "sm" ? "h-9 w-9" : "h-14 w-14";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  if (logoPath && !failed) {
    return (
      <div className={`flex ${dimension} items-center justify-center overflow-hidden bg-white brutal-border`}>
        <img src={logoPath} alt={label} className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div className={`flex ${dimension} items-center justify-center ${textSize} font-bold uppercase tracking-wider text-white brutal-border`} style={{ backgroundColor: hex }}>
      {label}
    </div>
  );
};

const assetUrlToDataUrl = async (assetPath?: string) => {
  if (!assetPath) {
    return "";
  }

  try {
    const response = await fetch(assetPath);
    if (!response.ok) {
      return "";
    }

    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

const resolveLogoAsset = async (basePath?: string) => {
  if (!basePath) {
    return "";
  }

  const candidates = [".png", ".jpg", ".jpeg", ".webp"].map((extension) => `${basePath}${extension}`);

  for (const candidate of candidates) {
    const value = await assetUrlToDataUrl(candidate);
    if (value) {
      return value;
    }
  }

  return "";
};

const resolveLogoPath = (basePath?: string) => {
  if (!basePath) {
    return undefined;
  }

  return `${basePath}.png`;
};

const createSignatory = (): Signatory => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  designation: "",
});

const ProposalGenerator = () => {
  const [data, setData] = useState<ProposalData>(initialState);
  const [signatories, setSignatories] = useState<Signatory[]>([createSignatory()]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<{ fileName: string; pdfBase64: string; narrative: string[] } | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [status, setStatus] = useState("");
  const [clubMenuOpen, setClubMenuOpen] = useState(false);

  const selectedClub = useMemo(() => getClubById(data.clubId), [data.clubId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const update = (field: keyof ProposalData, value: string) => {
    setData((previous) => ({ ...previous, [field]: value }));
  };

  const updateSignatory = (id: string, key: keyof Omit<Signatory, "id">, value: string) => {
    setSignatories((previous) =>
      previous.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const addSignatory = () => {
    setSignatories((previous) => [...previous, createSignatory()]);
  };

  const removeSignatory = (id: string) => {
    setSignatories((previous) => (previous.length === 1 ? previous : previous.filter((item) => item.id !== id)));
  };

  const generateProposal = async () => {
    setIsGenerating(true);
    setStatus("");

    try {
      const [collegeLogo, clubLogo] = await Promise.all([
        resolveLogoAsset(COLLEGE_BRAND.logoBasePath),
        resolveLogoAsset(selectedClub.logoBasePath),
      ]);

      const response = await api.generateProposal({
        ...data,
        clubName: selectedClub.name,
        clubAcronym: selectedClub.acronym,
        clubBrandColor: selectedClub.hex,
        collegeBrandColor: COLLEGE_BRAND.hex,
        collegeLogo,
        clubLogo,
        keyPoints: data.keyPoints
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        signatories: signatories.filter((item) => item.name || item.designation),
      });

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const nextPdfUrl = base64PdfToObjectUrl(response.pdfBase64);
      setPdfUrl(nextPdfUrl);
      setGeneratedFile(response);
      setStatus("Proposal PDF generated successfully. You can preview and download it below.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate proposal.";
      setStatus(
        message.includes("Backend not reachable")
          ? `${message} Run "npm run server" in the project root, then try again.`
          : message
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedFile) {
      return;
    }

    downloadBase64Pdf(generatedFile.pdfBase64, generatedFile.fileName);
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">Proposal Generator</h1>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">AI-generated narrative with formatted PDF output</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={generateProposal} className="brutal-btn-primary flex items-center gap-2 py-2" disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <FileText className="h-4 w-4" strokeWidth={3} />}
            Generate PDF
          </button>
          <button onClick={handleDownload} className="brutal-btn-secondary flex items-center gap-2 py-2" disabled={!generatedFile}>
            <Download className="h-4 w-4" strokeWidth={3} />
            Download
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.div className="space-y-4" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">College Name</label>
              <input className="brutal-input" value={data.collegeName} onChange={(event) => update("collegeName", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">College Acronym</label>
              <input className="brutal-input" value={data.collegeAcronym} onChange={(event) => update("collegeAcronym", event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">College Address</label>
            <input className="brutal-input" value={data.collegeAddress} onChange={(event) => update("collegeAddress", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Club</label>
            <div className="relative">
              <button type="button" onClick={() => setClubMenuOpen((previous) => !previous)} className="brutal-input flex items-center justify-between gap-3 text-left">
                <span className="flex items-center gap-3">
                  <LogoBadge label={selectedClub.acronym} hex={selectedClub.hex} logoPath={resolveLogoPath(selectedClub.logoBasePath)} size="sm" />
                  <span>
                    <span className="block font-bold uppercase">{selectedClub.acronym}</span>
                    <span className="block text-xs text-muted-foreground">{selectedClub.name}</span>
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${clubMenuOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
              </button>

              {clubMenuOpen ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden bg-card brutal-border brutal-shadow-sm">
                  {CLUBS.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => {
                        update("clubId", club.id);
                        setClubMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-foreground/10 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <LogoBadge label={club.acronym} hex={club.hex} logoPath={resolveLogoPath(club.logoBasePath)} size="sm" />
                      <span>
                        <span className="block font-bold uppercase">{club.acronym}</span>
                        <span className="block text-xs text-muted-foreground">{club.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Addressed To</label>
              <input className="brutal-input" value={data.authorityName} onChange={(event) => update("authorityName", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Date</label>
              <input className="brutal-input" type="date" value={data.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Title</label>
              <input className="brutal-input" placeholder="AI Innovation Summit" value={data.eventTitle} onChange={(event) => update("eventTitle", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Venue</label>
              <input className="brutal-input" placeholder="Seminar Hall A" value={data.venue} onChange={(event) => update("venue", event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Subject</label>
              <input className="brutal-input" placeholder="Proposal for AI Innovation Summit" value={data.subject} onChange={(event) => update("subject", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Estimated Budget</label>
              <input className="brutal-input" placeholder="35000" value={data.budget} onChange={(event) => update("budget", event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Target Audience</label>
            <input className="brutal-input" placeholder="Second year and third year students" value={data.targetAudience} onChange={(event) => update("targetAudience", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Objective</label>
            <textarea className="brutal-input min-h-[96px] resize-y" value={data.objective} onChange={(event) => update("objective", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Summary</label>
            <textarea className="brutal-input min-h-[120px] resize-y" value={data.eventSummary} onChange={(event) => update("eventSummary", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Key Points</label>
            <textarea className="brutal-input min-h-[100px] resize-y" placeholder={"One point per line\nExpected outcomes\nRequired approvals"} value={data.keyPoints} onChange={(event) => update("keyPoints", event.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider">Faculty Signatures</label>
              <button type="button" onClick={addSignatory} className="brutal-btn-outline flex items-center gap-2 px-3 py-2 text-xs">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                Add Faculty
              </button>
            </div>

            {signatories.map((signatory, index) => (
              <div key={signatory.id} className="grid grid-cols-1 gap-3 rounded-none bg-muted/15 p-3 brutal-border md:grid-cols-[1fr_1fr_auto]">
                <input className="brutal-input" placeholder={`Faculty ${index + 1} Name`} value={signatory.name} onChange={(event) => updateSignatory(signatory.id, "name", event.target.value)} />
                <input className="brutal-input" placeholder="Designation" value={signatory.designation} onChange={(event) => updateSignatory(signatory.id, "designation", event.target.value)} />
                <button type="button" onClick={() => removeSignatory(signatory.id)} className="brutal-btn-outline flex items-center justify-center px-3 py-2 text-xs">
                  <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>

          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </motion.div>

        <motion.div className="space-y-6" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="brutal-card">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-5">
              <LogoBadge label={data.collegeAcronym || "PCE"} hex={COLLEGE_BRAND.hex} logoPath={resolveLogoPath(COLLEGE_BRAND.logoBasePath)} />
              <div className="flex-1 text-center">
                <h2 className="text-lg font-bold uppercase">{data.collegeName || COLLEGE_BRAND.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{data.collegeAddress || "Add the college address here."}</p>
              </div>
              <LogoBadge label={selectedClub.acronym} hex={selectedClub.hex} logoPath={resolveLogoPath(selectedClub.logoBasePath)} />
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Date", data.eventDate || "Event date"],
                  ["Club", selectedClub.acronym],
                  ["To", data.authorityName || "Respective authority"],
                  ["Venue", data.venue || "Venue"],
                ].map(([label, value]) => (
                  <div key={label} className="brutal-border bg-muted/20 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Subject</p>
                <p className="mt-2 text-sm font-medium">{data.subject || `Proposal for ${data.eventTitle || "the planned event"}`}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Generated Proposal Body</p>
                <div className="mt-3 space-y-4 text-sm leading-7 text-muted-foreground">
                  {generatedFile?.narrative?.length ? (
                    generatedFile.narrative.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                  ) : (
                    <p>Generate the proposal to see AI-written paragraph content based on your objective, event summary, and key points.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Submitted Signatories</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {signatories.filter((item) => item.name || item.designation).length > 0 ? (
                    signatories
                      .filter((item) => item.name || item.designation)
                      .map((item) => (
                        <div key={item.id} className="border-t border-foreground/30 pt-4 text-sm">
                          <p className="font-bold">{item.name || "Faculty Name"}</p>
                          <p className="text-muted-foreground">{item.designation || "Designation"}</p>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Add one or more faculty names and designations to include signature blocks in the PDF.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="brutal-card">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Formatted PDF Preview</p>
                <p className="mt-1 text-sm text-muted-foreground">This is the actual generated PDF output, not a mock preview.</p>
              </div>
              {generatedFile ? (
                <button onClick={handleDownload} className="brutal-btn-secondary flex items-center gap-2 py-2 text-xs">
                  <Download className="h-4 w-4" strokeWidth={3} />
                  Download PDF
                </button>
              ) : null}
            </div>

            {pdfUrl ? (
              <iframe title="Proposal PDF Preview" src={pdfUrl} className="h-[720px] w-full brutal-border bg-white" />
            ) : (
              <div className="flex min-h-[240px] items-center justify-center brutal-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                Generate the proposal first. The formatted PDF will appear here and will also be downloadable.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProposalGenerator;
