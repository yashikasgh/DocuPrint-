import { format } from "date-fns";
import { api, base64PdfToObjectUrl, downloadBase64Pdf } from "@/lib/api";
import { StoredBudgetRecord } from "@/lib/budgetStorage";
import { COLLEGE_BRAND } from "@/lib/clubs";

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const flattenRows = (records: StoredBudgetRecord[]) =>
  records.flatMap((record) =>
    record.items.map((item) => ({
      Event: record.title,
      Category: record.category,
      ExpenseTitle: item.label,
      Amount: item.amount,
      Date: item.purchaseDate || record.date,
      PaymentMethod: item.paymentMethod || record.paymentMethod,
      ExpenseID: item.expenseId || item.id,
      Vendor: item.vendorName || record.vendor,
      Notes: item.notes,
    }))
  );

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

const buildBudgetReportPayload = async (records: StoredBudgetRecord[], title?: string) => {
  const collegeLogo = await resolveLogoAsset(COLLEGE_BRAND.logoBasePath);
  return {
    records,
    title: title || (records.length === 1 ? `${records[0].title} Budget Report` : "College Budget Expenditure Report"),
    date: records.length === 1 ? records[0].date : new Date().toISOString(),
    collegeName: COLLEGE_BRAND.name,
    collegeAddress: COLLEGE_BRAND.address,
    collegeAcronym: COLLEGE_BRAND.acronym,
    collegeBrandColor: COLLEGE_BRAND.hex,
    collegeLogo,
  };
};

export const createBudgetPdfObjectUrl = async (records: StoredBudgetRecord[], title?: string) => {
  const response = await api.generateBudgetReport(await buildBudgetReportPayload(records, title));
  return base64PdfToObjectUrl(response.pdfBase64);
};

export const exportBudgetExcel = async (records: StoredBudgetRecord[]) => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(flattenRows(records));
  XLSX.utils.book_append_sheet(workbook, sheet, "Budget Report");
  XLSX.writeFile(workbook, `budget-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
};

export const exportBudgetPdf = async (records: StoredBudgetRecord[], title?: string) => {
  const response = await api.generateBudgetReport(await buildBudgetReportPayload(records, title));
  downloadBase64Pdf(response.pdfBase64, response.fileName || `budget-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};
