import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
};

const LANDSCAPE_PAGE = {
  width: 841.89,
  height: 595.28,
  margin: 40,
};

const currencyNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-IN", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatCurrency = (amount) => `Rs. ${currencyNumberFormatter.format(Number(amount || 0))}`;

export const formatPercent = (value) => percentageFormatter.format(Number(value || 0));

export const titleCase = (value = "") =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .trim();

export const safeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const clampText = (value = "", max = 5000) => String(value || "").trim().slice(0, max);

const hexToRgb = (hex = "#111111") => {
  const value = hex.replace("#", "").trim();
  const normalized = value.length === 3 ? value.split("").map((char) => `${char}${char}`).join("") : value;
  const int = Number.parseInt(normalized, 16);

  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
};

export const normalizeDate = (value) => {
  if (!value) {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
};

const truncateToWidth = (text, font, fontSize, maxWidth) => {
  const source = String(text || "");
  if (font.widthOfTextAtSize(source, fontSize) <= maxWidth) {
    return source;
  }

  let output = source;
  while (output.length > 0 && font.widthOfTextAtSize(`${output}...`, fontSize) > maxWidth) {
    output = output.slice(0, -1);
  }

  return output ? `${output}...` : "";
};

const fitFontSizeToWidth = (text, font, initialSize, maxWidth, minSize = 8) => {
  let fontSize = initialSize;
  while (fontSize > minSize && font.widthOfTextAtSize(String(text || ""), fontSize) > maxWidth) {
    fontSize -= 0.2;
  }
  return fontSize;
};

const parseDataUri = (value = "") => {
  const match = String(value).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mime: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
};

const detectImageType = (bytes) => {
  if (!bytes || bytes.length < 4) {
    return null;
  }

  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;

  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  if (isPng) {
    return "png";
  }

  if (isJpg) {
    return "jpg";
  }

  return null;
};

const drawImageFromData = async (pdfDoc, value, page, x, topY, maxWidth = 52, maxHeight = 52) => {
  const parsed = parseDataUri(value);
  if (!parsed) {
    return false;
  }

  try {
    const detectedType = detectImageType(parsed.bytes);
    const image =
      detectedType === "png"
        ? await pdfDoc.embedPng(parsed.bytes)
        : detectedType === "jpg"
          ? await pdfDoc.embedJpg(parsed.bytes)
          : parsed.mime === "image/png"
            ? await pdfDoc.embedPng(parsed.bytes)
            : await pdfDoc.embedJpg(parsed.bytes);

    const dimensions = image.scaleToFit(maxWidth, maxHeight);
    page.drawImage(image, {
      x,
      y: topY - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    });

    return true;
  } catch {
    return false;
  }
};

const drawBadge = (page, bold, label, x, topY, hexColor, size = 52) => {
  const color = hexToRgb(hexColor || "#111111");
  page.drawRectangle({
    x,
    y: topY - size,
    width: size,
    height: size,
    color: rgb(color.r, color.g, color.b),
  });

  const safeLabel = String(label || "").slice(0, 8);
  const textWidth = bold.widthOfTextAtSize(safeLabel, 10);
  page.drawText(safeLabel, {
    x: x + (size - textWidth) / 2,
    y: topY - size / 2 - 4,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
};

export const buildPdfDocument = async ({
  collegeName,
  collegeAddress,
  documentLabel,
  date,
  subject,
  addressedTo,
  clubName,
  bodyParagraphs,
  highlights = [],
  analytics = [],
  footerText,
  collegeLogo,
  clubLogo,
  collegeAcronym,
  clubAcronym,
  collegeBrandColor,
  clubBrandColor,
  signatories = [],
}) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE.height - PAGE.margin;

  const collegeImageDrawn = await drawImageFromData(pdfDoc, collegeLogo, page, PAGE.margin, y + 10);
  if (!collegeImageDrawn) {
    drawBadge(page, bold, collegeAcronym || "PCCOE", PAGE.margin, y + 10, collegeBrandColor || "#111827");
  }

  const clubImageDrawn = await drawImageFromData(pdfDoc, clubLogo, page, PAGE.width - PAGE.margin - 52, y + 10);
  if (!clubImageDrawn) {
    drawBadge(page, bold, clubAcronym || "CLUB", PAGE.width - PAGE.margin - 52, y + 10, clubBrandColor || "#7c3aed");
  }

  const headerCenter = collegeName || "College Name";
  const headerCenterWidth = bold.widthOfTextAtSize(headerCenter, 14);
  page.drawText(headerCenter, {
    x: (PAGE.width - headerCenterWidth) / 2,
    y,
    size: 14,
    font: bold,
  });
  y -= 18;

  const addressText = collegeAddress || "College Address";
  const addressFontSize = fitFontSizeToWidth(addressText, font, 10, PAGE.width - PAGE.margin * 2 - 110, 8);
  const addressWidth = font.widthOfTextAtSize(addressText, addressFontSize);
  page.drawText(addressText, {
    x: (PAGE.width - addressWidth) / 2,
    y,
    size: addressFontSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 28;

  page.drawLine({
    start: { x: PAGE.margin, y },
    end: { x: PAGE.width - PAGE.margin, y },
    thickness: 1.3,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 22;

  const metaRows = [
    `Date: ${normalizeDate(date)}`,
    `Subject: ${subject || documentLabel}`,
    `To: ${addressedTo || "Respective authority"}`,
    `Club: ${clubName || "General"}`,
  ];

  for (const row of metaRows) {
    page.drawText(row, {
      x: PAGE.margin,
      y,
      size: 11,
      font: row.startsWith("Date:") ? font : bold,
    });
    y -= 18;
  }

  y -= 8;

  const contentWidth = PAGE.width - PAGE.margin * 2;
  for (const paragraph of bodyParagraphs) {
    const lines = wrapText(paragraph, font, 11, contentWidth);
    for (const line of lines) {
      if (y < 96) {
        break;
      }
      page.drawText(line, {
        x: PAGE.margin,
        y,
        size: 11,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
      y -= 15;
    }
    y -= 10;
  }

  const drawBulletSection = (heading, items) => {
    if (items.length === 0 || y < 120) {
      return;
    }

    page.drawText(heading, {
      x: PAGE.margin,
      y,
      size: 12,
      font: bold,
    });
    y -= 18;

    for (const item of items) {
      const lines = wrapText(`- ${item}`, font, 10.5, contentWidth - 10);
      for (const line of lines) {
        if (y < 88) {
          break;
        }
        page.drawText(line, {
          x: PAGE.margin + 10,
          y,
          size: 10.5,
          font,
        });
        y -= 14;
      }
    }
    y -= 8;
  };

  drawBulletSection("Key Highlights", safeArray(highlights));
  drawBulletSection("Analytics", safeArray(analytics));

  if (signatories.length > 0) {
    const signatureY = 120;
    const blockWidth = 180;
    const gap = 40;
    signatories.slice(0, 2).forEach((signatory, index) => {
      const x = PAGE.margin + index * (blockWidth + gap);
      page.drawLine({
        start: { x, y: signatureY + 24 },
        end: { x: x + blockWidth - 20, y: signatureY + 24 },
        thickness: 0.8,
        color: rgb(0.35, 0.35, 0.35),
      });
      page.drawText(signatory.name || "Signature", {
        x,
        y: signatureY + 8,
        size: 10,
        font: bold,
      });
      page.drawText(signatory.designation || "Designation", {
        x,
        y: signatureY - 8,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    });
  }

  const footer = footerText || "Generated by DocuPrint";
  page.drawLine({
    start: { x: PAGE.margin, y: 58 },
    end: { x: PAGE.width - PAGE.margin, y: 58 },
    thickness: 0.8,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(footer, {
    x: PAGE.margin,
    y: 42,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
};

export const buildBudgetSheetPdf = async ({
  collegeName,
  collegeAddress,
  date,
  title,
  collegeLogo,
  collegeAcronym,
  collegeBrandColor,
  records = [],
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const tableColumns = [
    { label: "Sr", key: "sr", width: 28 },
    { label: "Expense ID", key: "expenseId", width: 62 },
    { label: "Expense Title", key: "title", width: 180 },
    { label: "Vendor", key: "vendor", width: 112 },
    { label: "Date", key: "date", width: 70 },
    { label: "Payment", key: "payment", width: 78 },
    { label: "Qty", key: "qty", width: 34 },
    { label: "Unit Price", key: "unitPrice", width: 72 },
    { label: "Tax", key: "tax", width: 60 },
    { label: "Amount", key: "amount", width: 76 },
  ];

  let page = pdfDoc.addPage([LANDSCAPE_PAGE.width, LANDSCAPE_PAGE.height]);
  let y = LANDSCAPE_PAGE.height - LANDSCAPE_PAGE.margin;
  let pageNumber = 1;

  const drawHeader = async () => {
    y = LANDSCAPE_PAGE.height - LANDSCAPE_PAGE.margin;
    const logoTop = y + 8;
    const collegeImageDrawn = await drawImageFromData(pdfDoc, collegeLogo, page, LANDSCAPE_PAGE.margin, logoTop);
    if (!collegeImageDrawn) {
      drawBadge(page, bold, collegeAcronym || "PCE", LANDSCAPE_PAGE.margin, logoTop, collegeBrandColor || "#111827");
    }

    const safeCollegeName = collegeName || "College Name";
    const nameWidth = bold.widthOfTextAtSize(safeCollegeName, 18);
    page.drawText(safeCollegeName, {
      x: (LANDSCAPE_PAGE.width - nameWidth) / 2,
      y,
      size: 18,
      font: bold,
      color: rgb(0.08, 0.08, 0.1),
    });
    y -= 20;

    const safeAddress = collegeAddress || "College Address";
    const safeTitle = title || "Budget Report";
    const headerTextLeft = LANDSCAPE_PAGE.margin + 74;
    const headerTextWidth = LANDSCAPE_PAGE.width - headerTextLeft - LANDSCAPE_PAGE.margin;
    const titleWidth = Math.min(bold.widthOfTextAtSize(safeTitle, 13), headerTextWidth);
    page.drawText(safeTitle, {
      x: headerTextLeft + (headerTextWidth - titleWidth) / 2,
      y,
      size: 13,
      font: bold,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 16;

    const addressLines = wrapText(safeAddress, font, 10.2, headerTextWidth);
    addressLines.forEach((line) => {
      const addressWidth = font.widthOfTextAtSize(line, 10.2);
      page.drawText(line, {
        x: headerTextLeft + (headerTextWidth - addressWidth) / 2,
        y,
        size: 10.2,
        font,
        color: rgb(0.38, 0.38, 0.4),
      });
      y -= 14;
    });

    const reportDate = `Date: ${normalizeDate(date)}`;
    page.drawText(reportDate, {
      x: LANDSCAPE_PAGE.margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.18, 0.18, 0.2),
    });
    y -= 16;

    page.drawLine({
      start: { x: LANDSCAPE_PAGE.margin, y },
      end: { x: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin, y },
      thickness: 1.1,
      color: rgb(0.22, 0.22, 0.22),
    });
    y -= 18;
  };

  const drawFooter = () => {
    page.drawLine({
      start: { x: LANDSCAPE_PAGE.margin, y: 26 },
      end: { x: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin, y: 26 },
      thickness: 0.8,
      color: rgb(0.82, 0.82, 0.84),
    });
    page.drawText(`Page ${pageNumber}`, {
      x: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin - 42,
      y: 14,
      size: 8.5,
      font,
      color: rgb(0.45, 0.45, 0.48),
    });
  };

  const addPage = async () => {
    drawFooter();
    pageNumber += 1;
    page = pdfDoc.addPage([LANDSCAPE_PAGE.width, LANDSCAPE_PAGE.height]);
    await drawHeader();
  };

  const ensureSpace = async (requiredHeight) => {
    if (y - requiredHeight < 42) {
      await addPage();
    }
  };

  const drawTableHeader = () => {
    let x = LANDSCAPE_PAGE.margin;
    page.drawRectangle({
      x,
      y: y - 20,
      width: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin * 2,
      height: 20,
      color: rgb(0.93, 0.94, 0.96),
    });
    tableColumns.forEach((column) => {
      page.drawText(column.label, {
        x: x + 4,
        y: y - 13.5,
        size: 8.3,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += column.width;
    });
    y -= 20;
  };

  const drawRow = (cells) => {
    let x = LANDSCAPE_PAGE.margin;
    const rowHeight = 20;
    page.drawRectangle({
      x,
      y: y - rowHeight,
      width: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin * 2,
      height: rowHeight,
      borderWidth: 0.4,
      borderColor: rgb(0.88, 0.88, 0.9),
      color: rgb(1, 1, 1),
    });

    tableColumns.forEach((column) => {
      const value = truncateToWidth(cells[column.key], font, 8.2, column.width - 8);
      page.drawText(value, {
        x: x + 4,
        y: y - 13.3,
        size: 8.2,
        font: column.key === "amount" ? bold : font,
        color: rgb(0.14, 0.14, 0.16),
      });
      x += column.width;
    });
    y -= rowHeight;
  };

  await drawHeader();

  for (const record of records) {
    await ensureSpace(94);
    page.drawRectangle({
      x: LANDSCAPE_PAGE.margin,
      y: y - 24,
      width: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin * 2,
      height: 24,
      color: rgb(0.96, 0.97, 0.99),
    });
    page.drawText(`${record.title} | ${record.category}`, {
      x: LANDSCAPE_PAGE.margin + 6,
      y: y - 15.5,
      size: 10,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
    });
    const meta = `${normalizeDate(record.date)} | ${record.vendor || "Vendor"} | ${record.paymentMethod || "Payment pending"}`;
    const metaWidth = font.widthOfTextAtSize(meta, 8.5);
    page.drawText(meta, {
      x: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin - metaWidth - 6,
      y: y - 15.2,
      size: 8.5,
      font,
      color: rgb(0.36, 0.36, 0.38),
    });
    y -= 30;

    drawTableHeader();

    const items = Array.isArray(record.items) && record.items.length > 0 ? record.items : [];
    if (items.length === 0) {
      await ensureSpace(24);
      drawRow({
        sr: "1",
        expenseId: "--",
        title: "No expense entries available",
        vendor: record.vendor || "--",
        date: normalizeDate(record.date),
        payment: record.paymentMethod || "--",
        qty: "--",
        unitPrice: "--",
        tax: "--",
        amount: formatCurrency(record.grandTotal || 0),
      });
    } else {
      for (const [index, item] of items.entries()) {
        await ensureSpace(24);
        drawRow({
          sr: String(index + 1),
          expenseId: item.expenseId || item.id || "--",
          title: item.label || "Untitled expense",
          vendor: item.vendorName || record.vendor || "--",
          date: normalizeDate(item.purchaseDate || record.date),
          payment: item.paymentMethod || record.paymentMethod || "--",
          qty: String(item.quantity || 1),
          unitPrice: formatCurrency(item.unitPrice || 0),
          tax: formatCurrency(item.tax || 0),
          amount: formatCurrency(item.amount || 0),
        });
      }
    }

    await ensureSpace(66);
    const totalsX = LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin - 220;
    const totalRows = [
      ["Subtotal", formatCurrency(record.subtotal || 0)],
      ["Tax Total", formatCurrency(record.taxTotal || 0)],
      ["Discount", formatCurrency(record.discount || 0)],
      ["Grand Total", formatCurrency(record.grandTotal || 0)],
    ];
    totalRows.forEach(([label, value], index) => {
      const isGrand = index === totalRows.length - 1;
      const rowY = y - index * 18;
      page.drawText(label, {
        x: totalsX,
        y: rowY,
        size: isGrand ? 9.4 : 8.8,
        font: isGrand ? bold : font,
        color: rgb(0.18, 0.18, 0.2),
      });
      page.drawText(value, {
        x: LANDSCAPE_PAGE.width - LANDSCAPE_PAGE.margin - 8 - bold.widthOfTextAtSize(value, isGrand ? 9.4 : 8.8),
        y: rowY,
        size: isGrand ? 9.4 : 8.8,
        font: isGrand ? bold : font,
        color: rgb(0.12, 0.12, 0.14),
      });
    });
    y -= 88;
  }

  drawFooter();
  return Buffer.from(await pdfDoc.save());
};

export const buildBudgetEstimatePdf = async ({
  collegeName,
  collegeAddress,
  date,
  title,
  collegeLogo,
  collegeAcronym,
  collegeBrandColor,
  eventType,
  attendees,
  summary,
  estimatedTotalFormatted,
  breakdown = [],
  recommendations = [],
}) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = PAGE.height - PAGE.margin;
  const headerTextLeft = PAGE.margin + 76;
  const headerTextWidth = PAGE.width - headerTextLeft - PAGE.margin;

  const collegeImageDrawn = await drawImageFromData(pdfDoc, collegeLogo, page, PAGE.margin, y + 10);
  if (!collegeImageDrawn) {
    drawBadge(page, bold, collegeAcronym || "PCE", PAGE.margin, y + 10, collegeBrandColor || "#111827");
  }

  const safeCollegeName = collegeName || "College Name";
  const collegeNameWidth = Math.min(bold.widthOfTextAtSize(safeCollegeName, 15), headerTextWidth);
  page.drawText(safeCollegeName, {
    x: headerTextLeft + (headerTextWidth - collegeNameWidth) / 2,
    y,
    size: 15,
    font: bold,
    color: rgb(0.08, 0.08, 0.1),
  });
  y -= 18;

  const safeAddress = collegeAddress || "College Address";
  const addressFontSize = fitFontSizeToWidth(safeAddress, font, 9.2, headerTextWidth, 7.6);
  const addressWidth = font.widthOfTextAtSize(safeAddress, addressFontSize);
  page.drawText(safeAddress, {
    x: headerTextLeft + (headerTextWidth - addressWidth) / 2,
    y,
    size: addressFontSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 24;

  const safeTitle = title || "Budget Estimation Report";
  const titleWidth = Math.min(bold.widthOfTextAtSize(safeTitle, 13), headerTextWidth);
  page.drawText(safeTitle, {
    x: headerTextLeft + (headerTextWidth - titleWidth) / 2,
    y,
    size: 13,
    font: bold,
    color: rgb(0.12, 0.12, 0.12),
  });
  y -= 20;

  page.drawText(`Date: ${normalizeDate(date)}`, {
    x: PAGE.margin,
    y,
    size: 10.2,
    font,
    color: rgb(0.18, 0.18, 0.2),
  });
  y -= 18;

  page.drawLine({
    start: { x: PAGE.margin, y },
    end: { x: PAGE.width - PAGE.margin, y },
    thickness: 1.1,
    color: rgb(0.22, 0.22, 0.22),
  });
  y -= 22;

  const metaRows = [
    `Event Type: ${eventType || "General"}`,
    `Expected Audience: ${attendees || "0"}`,
    `Estimated Total: ${estimatedTotalFormatted || formatCurrency(0)}`,
  ];

  metaRows.forEach((row) => {
    page.drawText(row, {
      x: PAGE.margin,
      y,
      size: 10.8,
      font: row.startsWith("Estimated Total") ? bold : font,
      color: rgb(0.14, 0.14, 0.16),
    });
    y -= 18;
  });
  y -= 8;

  page.drawText("Summary", {
    x: PAGE.margin,
    y,
    size: 12,
    font: bold,
  });
  y -= 18;
  wrapText(summary || "", font, 10.5, PAGE.width - PAGE.margin * 2).forEach((line) => {
    page.drawText(line, {
      x: PAGE.margin,
      y,
      size: 10.5,
      font,
      color: rgb(0.16, 0.16, 0.18),
    });
    y -= 14;
  });
  y -= 12;

  page.drawText("Suggested Breakdown", {
    x: PAGE.margin,
    y,
    size: 12,
    font: bold,
  });
  y -= 18;

  breakdown.forEach((item) => {
    page.drawRectangle({
      x: PAGE.margin,
      y: y - 18,
      width: PAGE.width - PAGE.margin * 2,
      height: 18,
      color: rgb(0.97, 0.97, 0.98),
    });
    page.drawText(String(item.label || ""), {
      x: PAGE.margin + 8,
      y: y - 12,
      size: 10,
      font,
      color: rgb(0.14, 0.14, 0.16),
    });
    const value = String(item.amountFormatted || "");
    page.drawText(value, {
      x: PAGE.width - PAGE.margin - 8 - bold.widthOfTextAtSize(value, 10),
      y: y - 12,
      size: 10,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
    });
    y -= 22;
  });
  y -= 10;

  if (recommendations.length > 0) {
    page.drawText("Notes / Suggestions", {
      x: PAGE.margin,
      y,
      size: 12,
      font: bold,
    });
    y -= 18;
    recommendations.forEach((entry) => {
      wrapText(`- ${entry}`, font, 10.2, PAGE.width - PAGE.margin * 2 - 8).forEach((line) => {
        page.drawText(line, {
          x: PAGE.margin + 6,
          y,
          size: 10.2,
          font,
          color: rgb(0.16, 0.16, 0.18),
        });
        y -= 14;
      });
      y -= 6;
    });
  }

  page.drawLine({
    start: { x: PAGE.margin, y: 58 },
    end: { x: PAGE.width - PAGE.margin, y: 58 },
    thickness: 0.8,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText("Generated by DocuPrint Estimation Engine", {
    x: PAGE.margin,
    y: 42,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
};

export const bufferToBase64 = (buffer) => Buffer.from(buffer).toString("base64");
