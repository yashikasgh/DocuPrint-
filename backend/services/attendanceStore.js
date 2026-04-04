import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, "../data");
const storePath = path.join(dataDirectory, "attendance-store.json");

const defaultStore = {
  rosters: [],
};

const normalizeStudent = (student = {}, index = 0) => ({
  id: String(student.id || index + 1),
  srNo: student.srNo ? String(student.srNo) : "",
  admissionNo: student.admissionNo ? String(student.admissionNo) : student.roll ? String(student.roll) : "",
  seatNo: student.seatNo ? String(student.seatNo) : "",
  name: student.name ? String(student.name) : "",
  roll: student.roll ? String(student.roll) : student.admissionNo ? String(student.admissionNo) : "",
  year: student.year ? String(student.year) : "",
  branch: student.branch ? String(student.branch) : "",
  division: student.division ? String(student.division) : "",
  selected: student.selected ?? true,
});

const normalizeRoster = (roster = {}) => ({
  id: String(roster.id || `${Date.now()}`),
  fileName: String(roster.fileName || "Uploaded roster"),
  uploadedAt: String(roster.uploadedAt || new Date().toISOString()),
  students: Array.isArray(roster.students) ? roster.students.map(normalizeStudent) : [],
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

const normalizeStore = (store = {}) => ({
  rosters: Array.isArray(store.rosters) ? store.rosters.map(normalizeRoster) : [],
});

const ensureStoreFile = async () => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    const raw = await readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch {
    await writeFile(storePath, JSON.stringify(defaultStore, null, 2), "utf8");
    return defaultStore;
  }
};

export const readAttendanceStore = async () => ensureStoreFile();

export const writeAttendanceStore = async (nextStore) => {
  const normalized = normalizeStore(nextStore);
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
};

export const saveAttendanceRoster = async (roster) => {
  const store = await ensureStoreFile();
  const filtered = store.rosters.filter((entry) => entry.id !== roster.id);
  const nextStore = {
    rosters: [roster, ...filtered].slice(0, 50),
  };
  await writeAttendanceStore(nextStore);
  return roster;
};
