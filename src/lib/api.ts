const PRIMARY_API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const DEV_FALLBACK_API_BASES = [
  "/api",
  "http://localhost:8790/api",
  "http://localhost:8787/api",
];

const API_BASES = Array.from(
  new Set([
    PRIMARY_API_BASE,
    ...(import.meta.env.DEV ? DEV_FALLBACK_API_BASES : []),
  ].filter(Boolean))
);

type JsonOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

const normalizeApiBase = (base: string) =>
  base.endsWith("/") ? base.slice(0, -1) : base;

async function fetchWithFallback(
  path: string,
  init: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;

  for (const candidate of API_BASES) {
    const base = normalizeApiBase(candidate);

    try {
      const response = await fetch(`${base}${path}`, init);
      return response;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Request failed");
    }
  }

  throw (
    lastError ??
    new Error("Backend not reachable. Start the API server and try again.")
  );
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  try {
    return await fetchWithFallback(path, init);
  } catch {
    throw new Error("Backend not reachable. Start the API server and try again.");
  }
}

async function requestJson<T>(
  path: string,
  options: JsonOptions = {}
): Promise<T> {
  let response: Response;

  try {
    response = await apiFetch(path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      "Backend not reachable. Start the API server and try again."
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }

  return response.json();
}

export const api = {
  health: () =>
    requestJson<{
      ok: boolean;
      service: string;
      date: string;
      groqConfigured?: boolean;
      groqModel?: string | null;
      geminiConfigured?: boolean;
      openaiConfigured?: boolean;
      apiVersion?: string;
    }>("/health"),
  getBudgetStore: () => requestJson<{ categories: string[]; records: Array<Record<string, unknown>> }>("/budget/store"),
  saveBudgetStore: (body: unknown) => requestJson<{ categories: string[]; records: Array<Record<string, unknown>> }>("/budget/store", { method: "PUT", body }),
  generateProposal: (body: unknown) =>
    requestJson<{
      fileName: string;
      pdfBase64: string;
      summary: {
        eventTitle?: string;
        clubName?: string;
        authorityName?: string;
        estimatedBudget?: string | null;
        narrativeSource?: string;
        highlightsSource?: string;
      };
      narrative: string[];
    }>("/documents/proposal", {
      method: "POST",
      body,
    }),
  generateReport: (body: unknown) => requestJson<{ fileName: string; pdfBase64: string; summary: Record<string, unknown> }>("/documents/report", { method: "POST", body }),
  generateBudgetReport: (body: unknown) =>
    requestJson<{ fileName: string; pdfBase64: string; summary: Record<string, unknown> }>("/documents/budget-report", {
      method: "POST",
      body,
    }),
  generateBudgetEstimation: (body: unknown) =>
    requestJson<{ fileName: string; pdfBase64: string; summary: Record<string, unknown> }>("/documents/budget-estimation", {
      method: "POST",
      body,
    }),
  generateFlyer: (body: unknown) =>
    requestJson<{
      prompt: string;
      provider: string;
      status: string;
      message?: string;
      creativeBrief?: string;
      imageBase64?: string | null;
      fullFlyerBase64?: string | null;
      fullFlyerContentType?: string | null;
      backgroundBase64?: string | null;
      backgroundContentType?: string | null;
    }>("/flyers/generate", {
      method: "POST",
      body,
    }),
  analyzeBudget: (body: unknown) => requestJson<Record<string, unknown>>("/budget/analyze", { method: "POST", body }),
  analyzeBudgetFolder: (body: unknown) => requestJson<Record<string, unknown>>("/budget/analyze-folder", { method: "POST", body }),
  estimateBudget: (body: unknown) => requestJson<Record<string, unknown>>("/budget/estimate", { method: "POST", body }),
  generateTimeline: (body: unknown) => requestJson<{ timeline: Array<Record<string, unknown>> }>("/timelines/generate", { method: "POST", body }),
  compileSummary: (body: unknown) => requestJson<Record<string, unknown>>("/post-event/summary", { method: "POST", body }),
  analyzeBudgetCsv: async (file: File, folder: unknown) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", JSON.stringify(folder));

    let response: Response;
    try {
      response = await apiFetch("/budget/analyze-csv", {
        method: "POST",
        body: formData,
      });
    } catch {
      throw new Error("Backend not reachable. Start the API server and try again.");
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "CSV analysis failed");
    }

    return response.json() as Promise<Record<string, unknown>>;
  },
  parseAttendance: async (file: File, metadata?: { year?: string; branch?: string; division?: string }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata?.year) formData.append("year", metadata.year);
    if (metadata?.branch) formData.append("branch", metadata.branch);
    if (metadata?.division) formData.append("division", metadata.division);
    let response: Response;

    try {
      response = await apiFetch("/attendance/parse", {
        method: "POST",
        body: formData,
      });
    } catch {
      throw new Error("Backend not reachable. Start the API server and try again.");
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Attendance parsing failed");
    }

    return response.json() as Promise<{
      students: Array<{ id: string; srNo?: string; admissionNo?: string; seatNo?: string; name: string; roll: string; year?: string; branch?: string; division?: string; selected?: boolean }>;
      metadata: { sourceFile: string; rowsParsed: number; extractedColumns?: string[]; years: string[]; branches: string[]; divisions: string[]; selectedYear?: string; selectedBranch?: string; selectedDivision?: string };
    }>;
  },
  saveAttendanceRoster: (body: unknown) =>
    requestJson<{
      roster: {
        id: string;
        fileName: string;
        uploadedAt: string;
        students: Array<{ id: string; srNo?: string; admissionNo?: string; seatNo?: string; name: string; roll: string; year?: string; branch?: string; division?: string; selected?: boolean }>;
        metadata: { sourceFile: string; rowsParsed: number; extractedColumns?: string[]; years: string[]; branches: string[]; divisions: string[]; selectedYear?: string; selectedBranch?: string; selectedDivision?: string };
      };
    }>("/attendance/save", { method: "POST", body }),
  getAttendanceRosters: () =>
    requestJson<{
      rosters: Array<{
        id: string;
        fileName: string;
        uploadedAt: string;
        students: Array<{ id: string; srNo?: string; admissionNo?: string; seatNo?: string; name: string; roll: string; year?: string; branch?: string; division?: string; selected?: boolean }>;
        metadata: { sourceFile: string; rowsParsed: number; extractedColumns?: string[]; years: string[]; branches: string[]; divisions: string[]; selectedYear?: string; selectedBranch?: string; selectedDivision?: string };
      }>;
    }>("/attendance/rosters"),
  exportAttendance: (body: unknown) => requestJson<{ fileName: string; pdfBase64: string }>("/attendance/export", { method: "POST", body }),
};

export const downloadBase64Pdf = (base64: string, fileName: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const base64PdfToObjectUrl = (base64: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
};
