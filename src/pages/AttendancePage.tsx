import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, LoaderCircle, Save, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { api, base64PdfToObjectUrl, downloadBase64Pdf } from "@/lib/api";
import { COLLEGE_BRAND } from "@/lib/clubs";

interface Student {
  id: string;
  srNo?: string;
  admissionNo?: string;
  name: string;
  roll: string;
  year?: string;
  branch?: string;
  division?: string;
  selected?: boolean;
}

interface RosterRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  students: Student[];
  metadata: {
    sourceFile: string;
    rowsParsed: number;
    extractedColumns?: string[];
    years: string[];
    branches: string[];
    divisions: string[];
    selectedYear?: string;
    selectedBranch?: string;
    selectedDivision?: string;
  };
}

interface ParsedRosterDraft {
  fileName: string;
  students: Student[];
  metadata: RosterRecord["metadata"];
}

const YEAR_OPTIONS = [
  { label: "First Year", value: "FY" },
  { label: "Second Year", value: "SY" },
  { label: "Third Year", value: "TY" },
  { label: "Final Year", value: "B" },
];

const BRANCH_OPTIONS = [
  "Computer Engineering",
  "Mechanical Engineering",
  "Information Technology",
  "Electronics and Telecommunication",
  "Automobile",
];

const DIVISION_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const normalizeStudent = (student: Partial<Student> = {}, index: number): Student => ({
  id: String(student.id || index + 1),
  srNo: student.srNo ? String(student.srNo) : "",
  admissionNo: student.admissionNo ? String(student.admissionNo) : student.roll ? String(student.roll) : "",
  name: student.name ? String(student.name) : "",
  roll: student.roll ? String(student.roll) : student.admissionNo ? String(student.admissionNo) : "",
  year: student.year ? String(student.year) : "",
  branch: student.branch ? String(student.branch) : "",
  division: student.division ? String(student.division) : "",
  selected: student.selected ?? true,
});

const normalizeRoster = (roster: Partial<RosterRecord> = {}): RosterRecord => ({
  id: String(roster.id || `${Date.now()}`),
  fileName: String(roster.fileName || "Uploaded roster"),
  uploadedAt: String(roster.uploadedAt || new Date().toISOString()),
  students: Array.isArray(roster.students) ? roster.students.map((student, index) => normalizeStudent(student, index)) : [],
  metadata: {
    sourceFile: String(roster.metadata?.sourceFile || roster.fileName || "Uploaded roster"),
    rowsParsed: Number(roster.metadata?.rowsParsed || (Array.isArray(roster.students) ? roster.students.length : 0)),
    extractedColumns: Array.isArray(roster.metadata?.extractedColumns) ? roster.metadata.extractedColumns : [],
    years: Array.isArray(roster.metadata?.years) ? roster.metadata.years.map(String) : [],
    branches: Array.isArray(roster.metadata?.branches) ? roster.metadata.branches.map(String) : [],
    divisions: Array.isArray(roster.metadata?.divisions) ? roster.metadata.divisions.map(String) : [],
    selectedYear: roster.metadata?.selectedYear ? String(roster.metadata.selectedYear) : "",
    selectedBranch: roster.metadata?.selectedBranch ? String(roster.metadata.selectedBranch) : "",
    selectedDivision: roster.metadata?.selectedDivision ? String(roster.metadata.selectedDivision) : "",
  },
});

const AttendancePage = () => {
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [clubName, setClubName] = useState("");
  const [collegeName, setCollegeName] = useState(COLLEGE_BRAND.name);
  const [collegeAddress, setCollegeAddress] = useState(COLLEGE_BRAND.address);
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [division, setDivision] = useState("");
  const [status, setStatus] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedRosterDraft | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await api.getAttendanceRosters();
        const rosterList = Array.isArray(response.rosters)
          ? response.rosters.filter(Boolean).map((roster) => normalizeRoster(roster || {}))
          : [];
        setRosters(rosterList);
      } catch {
        // Keep empty state if backend store is unavailable.
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const selectionReady = Boolean(year && branch && division);

  const matchingRosters = useMemo(
    () =>
      rosters.filter(
        (roster) =>
          roster.metadata.selectedYear === year &&
          roster.metadata.selectedBranch === branch &&
          roster.metadata.selectedDivision === division
      ),
    [branch, division, rosters, year]
  );

  const selectedRoster = useMemo(
    () => matchingRosters.find((roster) => roster.id === selectedRosterId) || null,
    [matchingRosters, selectedRosterId]
  );

  useEffect(() => {
    if (!selectionReady) {
      setSelectedRosterId("");
      setStudents([]);
      return;
    }

    if (parsedDraft) {
      setStudents(parsedDraft.students);
      return;
    }

    if (matchingRosters.length === 0) {
      setSelectedRosterId("");
      setStudents([]);
      return;
    }

    const roster = matchingRosters.find((entry) => entry.id === selectedRosterId) || matchingRosters[0];
    setSelectedRosterId(roster.id);
    setStudents(roster.students);
  }, [matchingRosters, parsedDraft, selectedRosterId, selectionReady]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          (!year || !student.year || student.year === year) &&
          (!branch || !student.branch || student.branch === branch) &&
          (!division || !student.division || student.division === division)
      ),
    [branch, division, students, year]
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!selectionReady) {
      setStatus("Select year, branch, and division before uploading the roster.");
      event.target.value = "";
      return;
    }

    setIsParsing(true);
    setStatus("");

    try {
      const response = await api.parseAttendance(file, { year, branch, division });
      const nextStudents = Array.isArray(response.students)
        ? response.students.map((student, index) => normalizeStudent(student, index))
        : [];
      const nextDraft: ParsedRosterDraft = {
        fileName: file.name,
        students: nextStudents,
        metadata: {
          sourceFile: response.metadata?.sourceFile || file.name,
          rowsParsed: Number(response.metadata?.rowsParsed || nextStudents.length),
          extractedColumns: Array.isArray(response.metadata?.extractedColumns) ? response.metadata.extractedColumns : [],
          years: Array.isArray(response.metadata?.years) ? response.metadata.years : [],
          branches: Array.isArray(response.metadata?.branches) ? response.metadata.branches : [],
          divisions: Array.isArray(response.metadata?.divisions) ? response.metadata.divisions : [],
          selectedYear: year,
          selectedBranch: branch,
          selectedDivision: division,
        },
      };
      setParsedDraft(nextDraft);
      setSelectedRosterId("");
      setStudents(nextStudents);
      setStatus(
        nextDraft.metadata.rowsParsed > 0
          ? `Parsed ${nextDraft.metadata.rowsParsed} students from ${nextDraft.metadata.sourceFile}. Review and click Save Roster to store it under ${year} / ${branch} / ${division}.`
          : `No student rows were found in ${nextDraft.metadata.sourceFile}. Please check the file headers.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to parse file.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const saveParsedRoster = async () => {
    if (!parsedDraft || parsedDraft.students.length === 0) {
      setStatus("Upload and parse a roster before saving.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const response = await api.saveAttendanceRoster({
        fileName: parsedDraft.fileName,
        students: parsedDraft.students,
        metadata: parsedDraft.metadata,
      });
      const savedRoster = normalizeRoster(response.roster || {});
      setRosters((previous) => [savedRoster, ...previous.filter((entry) => entry.id !== savedRoster.id)]);
      setSelectedRosterId(savedRoster.id);
      setStudents(savedRoster.students);
      setParsedDraft(null);
      setStatus(`Saved roster under ${year} / ${branch} / ${division}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save roster.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStudent = (id: string) => {
    setStudents((previous) =>
      previous.map((student) => (student.id === id ? { ...student, selected: !student.selected } : student))
    );
  };

  const toggleAllVisible = (selected: boolean) => {
    const visibleIds = new Set(filteredStudents.map((student) => student.id));
    setStudents((previous) =>
      previous.map((student) => (visibleIds.has(student.id) ? { ...student, selected } : student))
    );
  };

  const exportAttendance = async () => {
    setIsExporting(true);
    setStatus("");

    try {
      const response = await api.exportAttendance({
        collegeName,
        collegeAddress,
        clubName,
        eventTitle,
        instituteName: "Mahatma Education Society's",
        departmentName: branch ? `Department of ${branch}` : "Department",
        academicYear: "2025-26",
        year,
        branch,
        division,
        students: filteredStudents.filter((student) => student.selected),
      });
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      setPdfPreviewUrl(base64PdfToObjectUrl(response.pdfBase64));
      downloadBase64Pdf(response.pdfBase64, response.fileName);
      setStatus("Attendance sheet PDF exported successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to export attendance sheet.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = filteredStudents.filter((student) => student.selected).length;

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header className="mb-8 flex items-center justify-between" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">Attendance Sheets</h1>
        </div>
        <button
          onClick={exportAttendance}
          className="brutal-btn-primary flex items-center gap-2 py-2"
          disabled={filteredStudents.length === 0 || isExporting}
        >
          {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Download className="h-4 w-4" strokeWidth={3} />}
          Export PDF
        </button>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.div className="space-y-4" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="brutal-card">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Academic Selection</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Year</label>
                <select className="brutal-input" value={year} onChange={(event) => setYear(event.target.value)}>
                  <option value="">Select year</option>
                  {YEAR_OPTIONS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Branch</label>
                <select className="brutal-input" value={branch} onChange={(event) => setBranch(event.target.value)}>
                  <option value="">Select branch</option>
                  {BRANCH_OPTIONS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Division</label>
                <select className="brutal-input" value={division} onChange={(event) => setDivision(event.target.value)}>
                  <option value="">Select division</option>
                  {DIVISION_OPTIONS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 border-t-2 border-foreground/10 pt-5">
              <div className="flex flex-wrap gap-3">
                <label
                  className={`inline-flex items-center gap-2 ${
                    selectionReady
                      ? "brutal-btn-secondary cursor-pointer"
                      : "cursor-not-allowed border-2 border-foreground/20 bg-muted/40 px-4 py-3 text-muted-foreground"
                  }`}
                >
                  <Upload className="h-4 w-4" strokeWidth={3} />
                  {isParsing ? "Parsing..." : "Upload CSV / Excel"}
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={!selectionReady}
                  />
                </label>
                <button
                  type="button"
                  onClick={saveParsedRoster}
                  disabled={!parsedDraft || parsedDraft.students.length === 0 || isSaving}
                  className="brutal-btn-primary inline-flex items-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={3} />}
                  Save Roster
                </button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                First choose the year, branch, and division. Then upload a CSV or Excel file with{" "}
                <span className="font-semibold">Roll No / Sr.No</span>, <span className="font-semibold">Admission Number</span>, and{" "}
                <span className="font-semibold">Student</span> or <span className="font-semibold">Name Of the Student</span>.
              </p>
            </div>

            {selectionReady && matchingRosters.length > 0 ? (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Saved Rosters For Selected Class</label>
                <select
                  className="brutal-input"
                  value={selectedRosterId}
                  onChange={(event) => {
                    const rosterId = event.target.value;
                    setSelectedRosterId(rosterId);
                    setParsedDraft(null);
                    const roster = matchingRosters.find((entry) => entry.id === rosterId);
                    if (roster) {
                      setStudents(roster.students);
                    }
                  }}
                >
                  {matchingRosters.map((roster) => (
                    <option key={roster.id} value={roster.id}>
                      {roster.fileName}
                    </option>
                  ))}
                </select>
                {selectedRoster?.metadata.extractedColumns?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Extracted columns: {selectedRoster.metadata.extractedColumns.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["collegeName", collegeName, setCollegeName, "College Name"],
              ["collegeAddress", collegeAddress, setCollegeAddress, "College Address"],
              ["clubName", clubName, setClubName, "Faculty / Club Name"],
              ["eventTitle", eventTitle, setEventTitle, "Event Title / Subject"],
            ].map(([key, value, setter, label]) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">{label}</label>
                <input className="brutal-input" value={value as string} onChange={(event) => (setter as (nextValue: string) => void)(event.target.value)} />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => toggleAllVisible(true)} className="brutal-btn-outline py-2 text-xs">
              Select Visible
            </button>
            <button onClick={() => toggleAllVisible(false)} className="brutal-btn-outline py-2 text-xs">
              Deselect Visible
            </button>
          </div>

          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </motion.div>

        <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="brutal-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Student List</p>
                <p className="mt-2 text-sm text-muted-foreground">{filteredStudents.length} visible, {selectedCount} selected for export.</p>
              </div>
            </div>

            {pdfPreviewUrl ? (
              <div className="mb-5 overflow-hidden border-2 border-foreground/10 bg-white">
                <div className="border-b-2 border-foreground/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PDF Preview
                </div>
                <iframe title="Attendance PDF Preview" src={pdfPreviewUrl} className="h-[360px] w-full bg-white" />
              </div>
            ) : null}

            <div className="max-h-[640px] overflow-y-auto">
              <div className="grid grid-cols-[52px_72px_160px_1fr] gap-3 border-b-2 border-foreground pb-3 text-xs font-bold uppercase tracking-wider">
                <span>Select</span>
                <span>Sr.No</span>
                <span>Admission</span>
                <span>Name</span>
              </div>
              <div className="space-y-2 pt-3">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className="grid w-full grid-cols-[52px_72px_160px_1fr] gap-3 rounded-none border-2 border-foreground/15 bg-muted/10 p-3 text-left"
                  >
                    <span className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!student.selected}
                        onChange={() => toggleStudent(student.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 accent-black"
                      />
                    </span>
                    <span className="font-mono text-xs">{student.srNo || "-"}</span>
                    <span className="font-mono text-xs">{student.admissionNo || student.roll || "-"}</span>
                    <span className="font-medium">{student.name}</span>
                  </button>
                ))}
                {filteredStudents.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Select the class details above and upload a roster to start building the attendance sheet.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AttendancePage;
