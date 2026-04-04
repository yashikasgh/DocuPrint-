import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config.js";
import { bufferToBase64 } from "./utils.js";
import { generateBudgetEstimationDocument, generateBudgetReportDocument, generateProposalDocument, generateReportDocument } from "./services/documents.js";
import { readBudgetStore, writeBudgetStore } from "./services/budgetStore.js";
import { analyzeBudget, analyzeBudgetFolder, buildTimeline, compilePostEventSummary, estimateBudgetFromHistory, parseBudgetCsv } from "./services/planning.js";
import { parseAttendanceFile, buildAttendancePdf } from "./services/attendance.js";
import { readAttendanceStore, saveAttendanceRoster } from "./services/attendanceStore.js";
import { generateFlyerConcept } from "./services/flyers.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: config.appName,
    date: new Date().toISOString(),
  });
});

app.get("/api/budget/store", async (_req, res, next) => {
  try {
    res.json(await readBudgetStore());
  } catch (error) {
    next(error);
  }
});

app.put("/api/budget/store", async (req, res, next) => {
  try {
    res.json(await writeBudgetStore(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/proposal", async (req, res, next) => {
  try {
    const result = await generateProposalDocument(req.body);
    res.json({
      fileName: result.fileName,
      summary: result.summary,
      narrative: result.narrative,
      pdfBase64: bufferToBase64(result.pdfBuffer),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/report", async (req, res, next) => {
  try {
    const result = await generateReportDocument(req.body);
    res.json({
      fileName: result.fileName,
      summary: result.summary,
      pdfBase64: bufferToBase64(result.pdfBuffer),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/budget-report", async (req, res, next) => {
  try {
    const result = await generateBudgetReportDocument(req.body);
    res.json({
      fileName: result.fileName,
      summary: result.summary,
      pdfBase64: bufferToBase64(result.pdfBuffer),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/documents/budget-estimation", async (req, res, next) => {
  try {
    const result = await generateBudgetEstimationDocument(req.body);
    res.json({
      fileName: result.fileName,
      summary: result.summary,
      pdfBase64: bufferToBase64(result.pdfBuffer),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/flyers/generate", async (req, res, next) => {
  try {
    res.json(await generateFlyerConcept(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/parse", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A CSV or Excel file is required." });
    }

    const selectedYear = String(req.body?.year || "").trim();
    const selectedBranch = String(req.body?.branch || "").trim();
    const selectedDivision = String(req.body?.division || "").trim();
    const parsed = parseAttendanceFile(req.file.buffer, req.file.originalname, {
      selectedYear,
      selectedBranch,
      selectedDivision,
    });
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/save", async (req, res, next) => {
  try {
    const students = Array.isArray(req.body?.students) ? req.body.students : [];
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
    const fileName = String(req.body?.fileName || metadata.sourceFile || "Uploaded roster");

    if (students.length === 0) {
      return res.status(400).json({ message: "There are no parsed students to save." });
    }

    const roster = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName,
      uploadedAt: new Date().toISOString(),
      students,
      metadata,
    };

    await saveAttendanceRoster(roster);
    res.json({ roster });
  } catch (error) {
    next(error);
  }
});

app.get("/api/attendance/rosters", async (_req, res, next) => {
  try {
    res.json(await readAttendanceStore());
  } catch (error) {
    next(error);
  }
});

app.post("/api/attendance/export", async (req, res, next) => {
  try {
    res.json(await buildAttendancePdf(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/budget/analyze", (req, res) => {
  res.json(analyzeBudget(req.body));
});

app.post("/api/budget/analyze-folder", async (req, res, next) => {
  try {
    res.json(await analyzeBudgetFolder(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/budget/analyze-csv", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A CSV or Excel file is required." });
    }

    const csvData = parseBudgetCsv(req.file.buffer, req.file.originalname);
    const analysis = await analyzeBudgetFolder({
      folder: req.body.folder ? JSON.parse(req.body.folder) : {},
      csvSummary: csvData.summaryText,
    });

    res.json({
      ...csvData,
      analysis,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/budget/estimate", async (req, res, next) => {
  try {
    res.json(await estimateBudgetFromHistory(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/timelines/generate", (req, res) => {
  res.json({
    timeline: buildTimeline(req.body),
  });
});

app.post("/api/post-event/summary", (req, res) => {
  res.json(compilePostEventSummary(req.body));
});

app.use((error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("API error:", error);
  res.status(500).json({
    message,
  });
});

export default app;
