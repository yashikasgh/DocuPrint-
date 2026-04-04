import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config.js";

import { bufferToBase64 } from "./utils.js";
import { generateProposalDocument, generateReportDocument } from "./services/documents.js";
import { analyzeBudget, buildTimeline, compilePostEventSummary } from "./services/planning.js";
import { parseAttendanceFile, buildAttendancePdf } from "./services/attendance.js";
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
    geminiConfigured: Boolean(config.geminiApiKey),
    openaiConfigured: Boolean(config.openaiApiKey),
    apiVersion: "flyers-gemini-full-v1",
  });
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

    res.json(parseAttendanceFile(req.file.buffer, req.file.originalname));
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
  res.status(500).json({ message });
});

app.listen(config.port, () => {
  console.log(`DocuPrint backend running on http://localhost:${config.port}`);
});