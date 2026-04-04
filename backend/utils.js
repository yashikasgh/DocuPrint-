import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

const sanitizeText = (text = "") => {
  // Remove markdown/bold/italic tokens since PDF rendering is plain text
  // keep the clean semantic text.
  let clean = String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Remove emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Remove symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Remove transport & map symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Remove flags
    .replace(/[\u{2600}-\u{26FF}]/gu, "") // Remove miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "") // Remove dingbats
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Collapse multiple punctuation and keep text easy to wrap.
  clean = clean.replace(/\s*\*\*/g, "").replace(/\s*__\s*/g, " ");
  return clean;
};

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
  const words = sanitizeText(String(text || "")).split(/\s+/).filter(Boolean);
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
      // If the word itself is too long, break it into smaller chunks
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let remainingWord = word;
        while (remainingWord.length > 0) {
          let chunk = remainingWord;
          // Find the maximum chunk that fits
          while (font.widthOfTextAtSize(chunk, fontSize) > maxWidth && chunk.length > 1) {
            chunk = chunk.slice(0, -1);
          }
          if (chunk.length === 0) {
            // If even a single character doesn't fit, force it
            chunk = remainingWord.charAt(0);
          }
          lines.push(chunk);
          remainingWord = remainingWord.slice(chunk.length);
        }
        current = "";
      } else {
        current = word;
      }
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

const loadLogoFile = (logoPath) => {
  if (!logoPath || typeof logoPath !== "string") {
    return null;
  }

  // If it's already a data URI, parse it
  if (logoPath.startsWith("data:")) {
    return parseDataUri(logoPath);
  }

  // If it's a path starting with /logos/, try to load from public directory
  if (logoPath.startsWith("/logos/")) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const publicPath = join(__dirname, "..", "public", logoPath);

      const fileBuffer = readFileSync(publicPath);
      const mime = logoPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

      return {
        mime,
        bytes: fileBuffer,
      };
    } catch (error) {
      console.warn(`Failed to load logo from ${logoPath}:`, error.message);
      return null;
    }
  }

  return null;
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
  title,
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
  attendanceRecords = [],
  photoDataUrls = [],
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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawImageIfPresent = async (page, value, x, topY) => {
    const parsed = loadLogoFile(value);
    if (!parsed) {
      return;
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

      const dimensions = image.scaleToFit(52, 52);
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

  const drawBadge = (page, label, x, topY, hexColor) => {
    const color = hexToRgb(hexColor || "#111111");
    const size = 52;
    page.drawRectangle({
      x,
      y: topY - size,
      width: size,
      height: size,
      color: rgb(color.r, color.g, color.b),
    });

    const safeLabel = sanitizeText(String(label || "").slice(0, 8));
    const textWidth = bold.widthOfTextAtSize(safeLabel, 10);
    page.drawText(safeLabel, {
      x: x + (size - textWidth) / 2,
      y: topY - size / 2 - 4,
      size: 10,
      font: bold,
      color: rgb(1, 1, 1),
    });
  };

  const createPage = async () => {
    const newPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
    let yPos = PAGE.height - PAGE.margin;

    const collegeImageDrawn = await drawImageIfPresent(newPage, collegeLogo, PAGE.margin, yPos + 10);
    if (!collegeImageDrawn) {
      drawBadge(newPage, collegeAcronym || "PCCOE", PAGE.margin, yPos + 10, collegeBrandColor || "#111827");
    }

    const clubImageDrawn = await drawImageIfPresent(newPage, clubLogo, PAGE.width - PAGE.margin - 52, yPos + 10);
    if (!clubImageDrawn) {
      drawBadge(newPage, clubAcronym || "CLUB", PAGE.width - PAGE.margin - 52, yPos + 10, clubBrandColor || "#7c3aed");
    }

    const headerCenter = sanitizeText(collegeName || "College Name");
    const headerCenterWidth = bold.widthOfTextAtSize(headerCenter, 14);
    newPage.drawText(headerCenter, {
      x: (PAGE.width - headerCenterWidth) / 2,
      y: yPos,
      size: 14,
      font: bold,
    });
    yPos -= 18;

    const addressText = sanitizeText(collegeAddress || "College Address");
    const addressWidth = font.widthOfTextAtSize(addressText, 10);
    newPage.drawText(addressText, {
      x: (PAGE.width - addressWidth) / 2,
      y: yPos,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    yPos -= 26;

    newPage.drawLine({
      start: { x: PAGE.margin, y: yPos },
      end: { x: PAGE.width - PAGE.margin, y: yPos },
      thickness: 1.3,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 24;

    return { page: newPage, y: yPos };
  };

  let { page: currentPage, y: y } = await createPage();

  const contentWidth = PAGE.width - PAGE.margin * 2;

  const renderFooter = (page) => {
    const footer = sanitizeText(footerText || "Generated by DocuPrint");
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
  };

  const startNewPage = async () => {
    renderFooter(currentPage);
    const next = await createPage();
    currentPage = next.page;
    y = next.y;
  };

  const drawTextLine = async (line, size = 11, lineHeight = 15, color = rgb(0.12, 0.12, 0.12)) => {
    if (y < 96) {
      await startNewPage();
    }

    // Ensure minimum line height
    const actualLineHeight = Math.max(lineHeight, size + 4);

    currentPage.drawText(sanitizeText(line), {
      x: PAGE.margin,
      y: y - (actualLineHeight - size) / 2, // Center text in line height
      size,
      font,
      color,
    });
    y -= actualLineHeight;
  };

  const drawSectionHeader = async (title, color = rgb(0.1, 0.1, 0.1)) => {
    if (y < 120) {
      await startNewPage();
    }

    // Add some space before section header
    y -= 8;

    // Draw a colored bar
    const brandColor = hexToRgb(collegeBrandColor || clubBrandColor || "#7c3aed");
    currentPage.drawRectangle({
      x: PAGE.margin,
      y: y - 2,
      width: 4,
      height: 16,
      color: rgb(brandColor.r, brandColor.g, brandColor.b),
    });

    // Draw the section title with wrapping if needed
    const sanitizedTitle = sanitizeText(title);
    const titleLines = wrapText(sanitizedTitle, bold, 14, contentWidth - 20);
    let titleY = y + 2;

    for (const line of titleLines) {
      currentPage.drawText(line, {
        x: PAGE.margin + 12,
        y: titleY,
        size: 14,
        font: bold,
        color,
      });
      titleY -= 18;
    }

    y -= 14 + (titleLines.length - 1) * 18;
  };

  const drawAnalyticsBox = async (title, value, subtitle = "", xPos = PAGE.margin) => {
    if (y < 140) {
      await startNewPage();
    }

    const boxWidth = 160;
    const boxHeight = 60;
    const boxX = xPos;
    const boxY = y - boxHeight;

    // Draw box background
    currentPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    // Draw title
    currentPage.drawText(sanitizeText(title), {
      x: boxX + 8,
      y: y - 16,
      size: 10,
      font: bold,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Draw value
    const brandColor = hexToRgb(collegeBrandColor || clubBrandColor || "#7c3aed");
    currentPage.drawText(sanitizeText(value), {
      x: boxX + 8,
      y: y - 32,
      size: 16,
      font: bold,
      color: rgb(brandColor.r, brandColor.g, brandColor.b),
    });

    // Draw subtitle if provided
    if (subtitle) {
      currentPage.drawText(sanitizeText(subtitle), {
        x: boxX + 8,
        y: y - 46,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    return boxWidth + 16; // Return width + margin for next box
  };

  const metaRows = [
    `Institution: ${collegeName || "College Name"}`,
    `Organizing Body: ${clubName || "Student Committee"}`,
    `Event Category: ${documentLabel || "Educational Event"}`,
    `Event Title: ${subject || "Community Engagement Initiative"}`,
    `Date: ${normalizeDate(date)}`,
    `Location: ${addressedTo || "Campus Venue"}`,
  ];

  for (const row of metaRows) {
    await drawTextLine(row, 11, 18, row.startsWith("Institution:") ? rgb(0.12, 0.12, 0.12) : rgb(0.0, 0.0, 0.0));
  }

  y -= 12;

  // Add analytics boxes for key metrics
  if (analytics && analytics.length > 0) {
    await drawSectionHeader("Key Performance Indicators");

    let currentX = PAGE.margin;
    const maxX = PAGE.width - PAGE.margin - 160;
    let boxesInRow = 0;
    const boxHeight = 60;

    for (const analytic of analytics.slice(0, 6)) { // Limit to 6 metrics to fit nicely
      if (currentX > maxX || boxesInRow >= 2) {
        currentX = PAGE.margin;
        y -= boxHeight + 10; // Move down for next row with proper spacing
        boxesInRow = 0;

        // Check if we need a new page
        if (y < 120) {
          await startNewPage();
        }
      }

      const boxWidth = await drawAnalyticsBox(
        analytic.split(':')[0] || analytic,
        analytic.split(':')[1] || analytic,
        "",
        currentX
      );
      currentX += boxWidth;
      boxesInRow++;
    }

    y -= boxHeight + 20; // Space after all analytics boxes (boxHeight + extra margin)
  }

  // Process body paragraphs with section headers
  for (const paragraph of bodyParagraphs) {
    const lines = wrapText(paragraph, font, 11, contentWidth);

    // Check if this looks like a section header (more robust detection)
    let isHeader = false;
    if (lines[0]) {
      const firstLine = lines[0].trim();
      isHeader = firstLine.includes("###") ||
                 firstLine.match(/^[A-Z][^.!?]*:$/) ||
                 firstLine.match(/^[A-Z\s]{3,}:?$/i) && firstLine.length < 50;
    }

    if (isHeader) {
      const headerText = lines[0].replace(/^###\s*/, "").replace(/:$/, "").trim();
      await drawSectionHeader(headerText);
      lines.shift(); // Remove the header from lines
    }

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Check for bullet points or numbered lists
      if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•") || trimmedLine.match(/^\d+\./)) {
        await drawTextLine(line, 10.5, 14, rgb(0.2, 0.2, 0.2));
        y -= 2; // Less space after list items
      } else if (trimmedLine.length > 0) {
        await drawTextLine(line, 11, 16); // Increased line height for better readability
      }
    }

    // Add space between paragraphs, more space after headers
    if (isHeader) {
      y -= 16; // More space after headers
    } else {
      y -= 12; // Space between regular paragraphs
    }

    // Force page break if we're getting close to the end and have more content
    if (y < 150 && bodyParagraphs.indexOf(paragraph) < bodyParagraphs.length - 1) {
      await startNewPage();
    }
  }

  const drawTable = async (headers, rows, columnWidths) => {
    if (y < 120) {
      await startNewPage();
    }

    const rowHeight = 16;
    const tableWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const startX = PAGE.margin;
    const startY = y;

    // Draw header background
    currentPage.drawRectangle({
      x: startX,
      y: startY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Draw headers
    let currentX = startX;
    for (let i = 0; i < headers.length; i++) {
      currentPage.drawText(sanitizeText(headers[i]), {
        x: currentX + 4,
        y: startY - 12,
        size: 10,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentX += columnWidths[i];
    }

    y -= rowHeight;

    // Draw rows
    for (const row of rows.slice(0, 15)) { // Limit to 15 rows to prevent overflow
      if (y < 80) {
        await startNewPage();
      }

      currentX = startX;

      // Draw row background (alternating colors)
      const isEvenRow = rows.indexOf(row) % 2 === 0;
      if (isEvenRow) {
        currentPage.drawRectangle({
          x: startX,
          y: y - rowHeight + 2,
          width: tableWidth,
          height: rowHeight - 2,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      for (let i = 0; i < Math.min(row.length, headers.length); i++) {
        const cellText = sanitizeText(String(row[i] || ""));
        const maxWidth = columnWidths[i] - 8;

        // Truncate text if too long for cell
        let displayText = cellText;
        if (font.widthOfTextAtSize(displayText, 9) > maxWidth) {
          while (displayText.length > 3 && font.widthOfTextAtSize(displayText + "...", 9) > maxWidth) {
            displayText = displayText.slice(0, -1);
          }
          displayText += "...";
        }

        currentPage.drawText(displayText, {
          x: currentX + 4,
          y: y - 12,
          size: 9,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentX += columnWidths[i];
      }

      y -= rowHeight;
    }

    y -= 8; // Space after table
  };

  const drawBulletSection = async (heading, items) => {
    if (items.length === 0) {
      return;
    }

    await drawSectionHeader(heading);

    for (const item of items) {
      if (!item || typeof item !== 'string') continue;

      const cleanItem = item.trim();
      if (cleanItem.length === 0) continue;

      const lines = wrapText(`• ${cleanItem}`, font, 10.5, contentWidth - 10);
      for (const line of lines) {
        await drawTextLine(line, 10.5, 13, rgb(0.2, 0.2, 0.2));
      }
      y -= 3; // Small space between bullet items
    }
    y -= 8; // Space after the entire bullet section
  };

  await drawBulletSection("Key Highlights", safeArray(highlights));
  // Remove duplicate analytics section since they're already shown as boxes above

  if (attendanceRecords && attendanceRecords.length > 0) {
    // Check space before section header
    if (y < 200) { // Need more space for table
      await startNewPage();
    }

    await drawSectionHeader("Attendance Records");

    // Prepare table data
    const headers = ["ID", "Name", "Roll No", "Year", "Branch"];
    const tableRows = attendanceRecords.slice(0, 20).map(record => [
      record.id || "",
      record.name || "",
      record.roll || "",
      record.year || "",
      record.branch || ""
    ]);

    // Define column widths (total should be <= contentWidth)
    const columnWidths = [40, 120, 80, 50, 80];

    await drawTable(headers, tableRows, columnWidths);

    // Show summary after table
    const totalAttendees = attendanceRecords.length;
    const completeRecords = attendanceRecords.filter(r => r.name && r.name.trim()).length;

    await drawTextLine(`Total Records: ${totalAttendees} | Complete: ${completeRecords} (${Math.round((completeRecords/totalAttendees)*100)}%)`, 10, 12, rgb(0.3, 0.3, 0.3));
    y -= 8;
  }

  if (photoDataUrls && photoDataUrls.length > 0) {
    for (const [index, url] of photoDataUrls.entries()) {
      // Check space before adding photo
      if (y < 280) {
        await startNewPage();
      }

      // Draw compact photo header
      const brandColor = hexToRgb(collegeBrandColor || clubBrandColor || "#7c3aed");
      currentPage.drawRectangle({
        x: PAGE.margin,
        y: y - 10,
        width: 4,
        height: 10,
        color: rgb(brandColor.r, brandColor.g, brandColor.b),
      });
      
      currentPage.drawText(`Event Photo ${index + 1}`, {
        x: PAGE.margin + 12,
        y: y - 6,
        size: 11,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 14;
      const parsed = parseDataUri(url);
      if (parsed) {
        try {
          const photoType = detectImageType(parsed.bytes);
          const image = photoType === "png" ? await pdfDoc.embedPng(parsed.bytes) : await pdfDoc.embedJpg(parsed.bytes);
          // Limit photo to max 220 pixels height to fit better on page
          const maxPhotoHeight = Math.min(220, PAGE.height - PAGE.margin * 2 - 150);
          const dimensions = image.scaleToFit(PAGE.width - PAGE.margin * 4, maxPhotoHeight);

          if (y - dimensions.height < 100) {
            await startNewPage();
          }

          currentPage.drawImage(image, {
            x: (PAGE.width - dimensions.width) / 2,
            y: y - dimensions.height,
            width: dimensions.width,
            height: dimensions.height,
          });
          y -= dimensions.height + 8;
        } catch {
          await drawTextLine("Unable to render photo (invalid image data)", 10, 14, rgb(0.6, 0.2, 0.2));
        }
      } else {
        await drawTextLine("Invalid image data for photo", 10, 14, rgb(0.6, 0.2, 0.2));
      }

      y -= 6;
    }
  }

  if (signatories.length > 0) {
    if (y < 120) {
      await startNewPage();
    }

    const signatureY = y;
    const blockWidth = 180;
    const gap = 40;
    signatories.slice(0, 2).forEach((signatory, index) => {
      const x = PAGE.margin + index * (blockWidth + gap);
      currentPage.drawLine({
        start: { x, y: signatureY + 24 },
        end: { x: x + blockWidth - 20, y: signatureY + 24 },
        thickness: 0.8,
        color: rgb(0.35, 0.35, 0.35),
      });
      currentPage.drawText(signatory.name || "Signature", {
        x,
        y: signatureY + 8,
        size: 10,
        font: bold,
      });
      currentPage.drawText(signatory.designation || "Designation", {
        x,
        y: signatureY - 8,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    });
  }

  renderFooter(currentPage);
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
