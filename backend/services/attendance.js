import xlsx from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bufferToBase64, clampText } from "../utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const normalizeHeaderValue = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCellValue = (value) => normalizeHeaderValue(value);

const rowHasContent = (row = []) =>
  Array.isArray(row) && row.some((cell) => normalizeCellValue(cell));

const scoreHeaderRow = (row = []) => {
  const normalized = row.map(normalizeHeaderValue);
  let score = 0;
  if (normalized.some((cell) => /(sr\.?\s*no|serial|roll\s*no)/i.test(cell))) score += 2;
  if (normalized.some((cell) => /(admission|admn|enroll|enrol)/i.test(cell))) score += 3;
  if (normalized.some((cell) => /name|student/i.test(cell))) score += 3;
  if (normalized.some((cell) => /student/i.test(cell))) score += 1;
  return score;
};

const findHeaderRowIndex = (rows = []) => {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 12).forEach((row, index) => {
    const score = scoreHeaderRow(Array.isArray(row) ? row : []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const looksLikeRepeatedHeader = (values = []) => {
  const normalized = values.map(normalizeCellValue);
  return (
    normalized.some((cell) => /(sr\.?\s*no|serial|roll\s*no)/i.test(cell)) &&
    normalized.some((cell) => /(admission|admn|enroll|enrol)/i.test(cell)) &&
    normalized.some((cell) => /name|student/i.test(cell))
  );
};

const detectColumns = (row = []) => {
  const keys = row.map(normalizeHeaderValue);
  const srNoIndex = keys.findIndex((key) => /(sr\.?\s*no|serial|roll\s*no)/i.test(key));
  const admissionIndex = keys.findIndex((key) => /(admission|admn|enroll|enrol)/i.test(key));
  const nameIndex = keys.findIndex((key) => /name|student/i.test(key));
  const yearIndex = keys.findIndex((key) => /year/i.test(key));
  const branchIndex = keys.findIndex((key) => /branch|dept|department/i.test(key));
  const divisionIndex = keys.findIndex((key) => /division|div/i.test(key));

  return {
    srNoIndex: srNoIndex >= 0 ? srNoIndex : 0,
    admissionIndex: admissionIndex >= 0 ? admissionIndex : 1,
    nameIndex: nameIndex >= 0 ? nameIndex : 3,
    yearIndex,
    branchIndex,
    divisionIndex,
  };
};

export const parseAttendanceFile = (
  fileBuffer,
  fileName = "students.csv",
  { selectedYear = "", selectedBranch = "", selectedDivision = "" } = {}
) => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const safeRows = Array.isArray(rawRows) ? rawRows : [];
  const headerRowIndex = findHeaderRowIndex(safeRows);
  const headerRow = safeRows[headerRowIndex] || [];
  const columns = detectColumns(headerRow);

  const dataRows = safeRows.slice(headerRowIndex + 1);
  const students = dataRows
    .map((row, index) => {
      const values = Array.isArray(row) ? row : [];
      if (!rowHasContent(values) || looksLikeRepeatedHeader(values)) {
        return null;
      }

      const srNo = clampText(values[columns.srNoIndex], 20) || String(index + 1);
      const admissionNo = clampText(values[columns.admissionIndex], 60) || "";
      const name = clampText(values[columns.nameIndex], 120) || "";
      const year = columns.yearIndex >= 0 ? clampText(values[columns.yearIndex], 20) : "";
      const branch = columns.branchIndex >= 0 ? clampText(values[columns.branchIndex], 50) : "";
      const division = columns.divisionIndex >= 0 ? clampText(values[columns.divisionIndex], 20) : "";

      return {
        id: `${index + 1}`,
        srNo,
        admissionNo,
        name,
        roll: admissionNo || `ADM-${index + 1}`,
        year: year || selectedYear,
        branch: branch || selectedBranch,
        division: division || selectedDivision,
        selected: true,
      };
    })
    .filter((student) => student && student.name && (student.admissionNo || student.srNo));

  const metadata = {
    sourceFile: fileName,
    rowsParsed: students.length,
    extractedColumns: ["Sr.No", "Admission No", "Name Of the Student"],
    years: [...new Set(students.map((student) => student.year).filter(Boolean))],
    branches: [...new Set(students.map((student) => student.branch).filter(Boolean))],
    divisions: [...new Set(students.map((student) => student.division).filter(Boolean))],
    selectedYear,
    selectedBranch,
    selectedDivision,
  };

  return { students, metadata };
};

const detectImageType = (bytes) => {
  if (!bytes || bytes.length < 4) {
    return null;
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  return null;
};

const loadCollegeLogoBytes = async () => {
  const candidates = [
    path.join(projectRoot, "public", "logos", "college", "pce.png"),
    path.join(projectRoot, "public", "logos", "college", "pce.jpg"),
    path.join(projectRoot, "public", "logos", "college", "pce.jpeg"),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // Try next path.
    }
  }

  return null;
};

export const buildAttendancePdf = async (payload) => {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 18;
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await loadCollegeLogoBytes();
  const logoType = detectImageType(logoBytes);
  const headerHeight = 18;
  const logoSize = 28;
  const rowHeight = 18;
  const rowsPerPage = 22;
  const allStudents = Array.isArray(payload.students) ? payload.students.slice(0, 100) : [];

  const drawCellText = (page, text, x, y, width, font, size = 8, center = false) => {
    const safeText = clampText(String(text || ""), 80);
    const textWidth = font.widthOfTextAtSize(safeText, size);
    page.drawText(safeText, {
      x: center ? x + (width - textWidth) / 2 : x + 4,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  const columns = [
    { label: "Sr.No", key: "srNo", width: 48 },
    { label: "Admission No", key: "admissionNo", width: 96 },
    { label: "Name of Student", key: "name", width: 260 },
    ...Array.from({ length: 10 }, (_, index) => ({ label: String(index + 1), key: `lecture-${index + 1}`, width: 36 })),
    { label: "Total Attended", key: "total", width: 76 },
  ];

  const drawHeader = async (page) => {
    let x = margin;
    let y = pageHeight - margin - 4;

    page.drawRectangle({ x, y: y - headerHeight, width: pageWidth - margin * 2, height: headerHeight, borderWidth: 0.7, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(1, 1, 1) });
    if (logoBytes && logoType === "png") {
      const image = await pdfDoc.embedPng(logoBytes);
      page.drawImage(image, { x: x + 6, y: y - headerHeight + 2, width: 24, height: 24 });
    } else if (logoBytes && logoType === "jpg") {
      const image = await pdfDoc.embedJpg(logoBytes);
      page.drawImage(image, { x: x + 6, y: y - headerHeight + 2, width: 24, height: 24 });
    } else {
      page.drawText("PCE", { x: x + 10, y: y - 12, size: 16, font: bold, color: rgb(0.45, 0.08, 0.08) });
    }
    page.drawText(payload.instituteName || "Mahatma Education Society's", { x: x + 210, y: y - 11, size: 10, font: bold });
    y -= headerHeight;

    page.drawRectangle({ x, y: y - headerHeight, width: pageWidth - margin * 2, height: headerHeight, borderWidth: 0.7, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(1, 1, 1) });
    if (logoBytes && logoType === "png") {
      const image = await pdfDoc.embedPng(logoBytes);
      page.drawImage(image, { x: x + 6, y: y - logoSize + 2, width: logoSize, height: logoSize });
    } else if (logoBytes && logoType === "jpg") {
      const image = await pdfDoc.embedJpg(logoBytes);
      page.drawImage(image, { x: x + 6, y: y - logoSize + 2, width: logoSize, height: logoSize });
    } else {
      page.drawRectangle({ x: x + 6, y: y - logoSize + 2, width: logoSize, height: logoSize, borderWidth: 0.7, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(1, 1, 1) });
      page.drawText("PCE", { x: x + 10, y: y - 16, size: 11, font: bold, color: rgb(0.45, 0.08, 0.08) });
    }
    page.drawText(payload.collegeName || "Pillai College of Engineering", { x: x + 250, y: y - 11, size: 11, font: bold });
    const address = String(payload.collegeAddress || "");
    if (address) {
      const fontSize = 8.2;
      const width = regular.widthOfTextAtSize(address, fontSize);
      page.drawText(address, {
        x: Math.max(x + 48, (pageWidth - width) / 2),
        y: y - 24,
        size: fontSize,
        font: regular,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
    y -= headerHeight;

    page.drawRectangle({ x, y: y - headerHeight, width: pageWidth - margin * 2, height: headerHeight, borderWidth: 0.7, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(1, 1, 1) });
    page.drawText(payload.departmentName || `${payload.branch || "Department"} Department`, { x: x + 275, y: y - 11, size: 10, font: bold });
    y -= headerHeight + 4;

    const metaLine = `CLASS: ${payload.year || "-"}    BRANCH: ${payload.branch || "-"}    DIVISION: ${payload.division || "-"}    AY: ${payload.academicYear || "-"}    SUBJECT: ${payload.eventTitle || "Attendance Sheet"}    FACULTY: ${payload.clubName || "-"}`;
    page.drawRectangle({ x, y: y - 18, width: pageWidth - margin * 2, height: 18, borderWidth: 0.7, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(1, 1, 1) });
    page.drawText(metaLine, { x: x + 8, y: y - 12, size: 8.1, font: bold });
    y -= 18;

    let headerX = x;
    columns.forEach((column) => {
      page.drawRectangle({
        x: headerX,
        y: y - headerHeight,
        width: column.width,
        height: headerHeight,
        borderWidth: 0.6,
        borderColor: rgb(0.2, 0.2, 0.2),
        color: rgb(1, 1, 1),
      });
      drawCellText(page, column.label, headerX, y - 12, column.width, bold, 8, true);
      headerX += column.width;
    });

    return { x, y: y - headerHeight };
  };

  const chunks = [];
  for (let index = 0; index < allStudents.length; index += rowsPerPage) {
    chunks.push(allStudents.slice(index, index + rowsPerPage));
  }
  if (chunks.length === 0) {
    chunks.push([]);
  }

  for (const [pageIndex, chunk] of chunks.entries()) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const { x, y: startY } = await drawHeader(page);
    let y = startY;

    chunk.forEach((student) => {
      let cellX = x;
      columns.forEach((column) => {
        page.drawRectangle({
          x: cellX,
          y: y - rowHeight,
          width: column.width,
          height: rowHeight,
          borderWidth: 0.45,
          borderColor: rgb(0.3, 0.3, 0.3),
          color: rgb(1, 1, 1),
        });

        if (column.key === "srNo") {
          drawCellText(page, student.srNo, cellX, y - 12, column.width, regular, 8, true);
        } else if (column.key === "admissionNo") {
          drawCellText(page, student.admissionNo, cellX, y - 12, column.width, regular, 8, true);
        } else if (column.key === "name") {
          drawCellText(page, student.name, cellX, y - 12, column.width, regular, 8, false);
        }

        cellX += column.width;
      });
      y -= rowHeight;
    });

    page.drawText(`Page ${pageIndex + 1} of ${chunks.length}`, {
      x: pageWidth - margin - 68,
      y: 12,
      size: 8.4,
      font: regular,
      color: rgb(0.45, 0.45, 0.48),
    });
  }

  return {
    fileName: `${(payload.eventTitle || "attendance-sheet").replace(/\s+/g, "-").toLowerCase()}.pdf`,
    pdfBase64: bufferToBase64(await pdfDoc.save()),
  };
};
