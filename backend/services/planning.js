import * as XLSX from "xlsx";
import { generateBudgetAnalysisNarrative, generateBudgetEstimateNarrative } from "./ai.js";
import { formatCurrency, formatPercent, safeArray } from "../utils.js";

const CATEGORY_BASELINES = {
  venue: 3500,
  travel: 1200,
  refreshments: 180,
  printing: 35,
  media: 1400,
  certificates: 30,
  contingency: 0,
};

export const analyzeBudget = (payload) => {
  const attendees = Number(payload.expectedAttendees || 0);
  const durationHours = Number(payload.durationHours || 0);
  const sponsorContribution = Number(payload.sponsorshipAmount || 0);
  const contingencyRatio = Number(payload.contingencyRatio || 0.1);
  const lineItems = safeArray(payload.lineItems).map((item) => ({
    label: item.label || "Untitled",
    quantity: Number(item.quantity || 1),
    unitCost: Number(item.unitCost || 0),
    total: Number(item.quantity || 1) * Number(item.unitCost || 0),
  }));

  const autoSuggested = [
    { label: "Venue & setup", total: CATEGORY_BASELINES.venue + durationHours * 120 },
    { label: "Refreshments", total: attendees * CATEGORY_BASELINES.refreshments },
    { label: "Certificates & printing", total: attendees * (CATEGORY_BASELINES.certificates + CATEGORY_BASELINES.printing) },
    { label: "Promotion & media", total: CATEGORY_BASELINES.media },
    { label: "Travel & guest support", total: CATEGORY_BASELINES.travel },
  ];

  const manualTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const suggestedTotal = autoSuggested.reduce((sum, item) => sum + item.total, 0);
  const workingSubtotal = Math.max(manualTotal, suggestedTotal);
  const contingency = Math.round(workingSubtotal * contingencyRatio);
  const projectedTotal = workingSubtotal + contingency;
  const netBudget = Math.max(projectedTotal - sponsorContribution, 0);
  const costPerHead = attendees > 0 ? netBudget / attendees : 0;

  return {
    inputs: {
      attendees,
      durationHours,
      sponsorshipAmount: sponsorContribution,
      contingencyRatio,
    },
    manualItems: lineItems,
    suggestedBreakdown: autoSuggested.map((item) => ({
      ...item,
      totalFormatted: formatCurrency(item.total),
    })),
    totals: {
      manualTotal,
      suggestedTotal,
      contingency,
      projectedTotal,
      netBudget,
      costPerHead,
      manualTotalFormatted: formatCurrency(manualTotal),
      projectedTotalFormatted: formatCurrency(projectedTotal),
      netBudgetFormatted: formatCurrency(netBudget),
      costPerHeadFormatted: formatCurrency(costPerHead),
    },
    insights: [
      `A contingency reserve of ${formatCurrency(contingency)} has been added at ${formatPercent(contingencyRatio)} of the working subtotal.`,
      attendees > 0
        ? `With ${attendees} expected attendees, the estimated net cost per attendee is ${formatCurrency(costPerHead)}.`
        : "Add an attendee estimate to unlock better per-person budgeting.",
      sponsorContribution > 0
        ? `Sponsorship support reduces the required internal budget by ${formatCurrency(sponsorContribution)}.`
        : "No sponsorship support is included yet, so the internal budget carries the full load.",
      manualTotal > 0 && manualTotal < suggestedTotal
        ? "The manual budget is below the system estimate, so double-check venue, print, and logistics coverage."
        : "The working estimate has enough room for common event operations and fallback costs.",
    ],
  };
};

export const buildTimeline = (payload) => {
  const eventDate = new Date(payload.eventDate || Date.now());
  const title = payload.eventTitle || "Event";
  const scale = payload.scale || "medium";
  const daysOffset = scale === "large" ? [42, 28, 21, 14, 7, 3, 1, 0, -1] : [28, 21, 14, 10, 7, 3, 1, 0, -1];

  const labels = [
    "Finalize concept, goal, and approvals",
    "Freeze budget draft and shortlist vendors",
    "Open registrations and publish the flyer",
    "Confirm speakers, volunteers, and room plan",
    "Review risk checklist and print requirements",
    "Run the final team briefing and dry run",
    "Prepare attendance sheet, kits, and signage",
    "Execute the event day schedule",
    "Collect feedback, analytics, and post-event summary",
  ];

  return daysOffset.map((offset, index) => {
    const milestoneDate = new Date(eventDate);
    milestoneDate.setDate(milestoneDate.getDate() - offset);

    return {
      id: `${index + 1}`,
      eventTitle: title,
      label: labels[index],
      offsetDays: offset,
      date: milestoneDate.toISOString().split("T")[0],
      owner: index < 2 ? "Faculty coordinator" : index < 6 ? "Core student team" : "Operations desk",
      status:
        offset > 7 ? "planned" : offset > 0 ? "upcoming" : offset === 0 ? "event-day" : "follow-up",
    };
  });
};

export const compilePostEventSummary = (payload) => {
  const attendeeCount = Number(payload.totalAttendees || 0);
  const registrations = Number(payload.totalRegistrations || attendeeCount || 0);
  const actualSpend = Number(payload.actualSpend || 0);
  const budgetApproved = Number(payload.totalBudget || actualSpend || 0);
  const feedbackScore = Number(payload.feedbackScore || 0);
  const highlights = safeArray(payload.highlights);
  const outcomes = safeArray(payload.outcomes);
  const imageCount = safeArray(payload.imageCaptions).length;

  const attendanceRate = registrations > 0 ? attendeeCount / registrations : 0;
  const budgetVariance = budgetApproved > 0 ? (budgetApproved - actualSpend) / budgetApproved : 0;

  return {
    headline: `${payload.eventTitle || "Event"} summary for ${payload.clubName || "the organizing team"}`,
    executiveSummary: [
      `${payload.eventTitle || "The event"} was conducted on ${payload.eventDate || "the scheduled date"} at ${payload.venue || "the planned venue"}.`,
      attendeeCount > 0
        ? `${attendeeCount} attendees were recorded from ${registrations || attendeeCount} registrations, producing an attendance rate of ${formatPercent(attendanceRate)}.`
        : "Attendee analytics are not complete yet.",
      actualSpend > 0
        ? `The event spent ${formatCurrency(actualSpend)} against an approved budget of ${formatCurrency(budgetApproved)}.`
        : "Final spending details are not complete yet.",
      feedbackScore > 0
        ? `Participants rated the event ${feedbackScore}/10 on average.`
        : "Feedback scoring has not been submitted yet.",
    ],
    analytics: {
      attendees: attendeeCount,
      registrations,
      attendanceRate,
      attendanceRateFormatted: formatPercent(attendanceRate),
      actualSpend,
      budgetApproved,
      budgetVariance,
      budgetVarianceFormatted: formatPercent(budgetVariance),
      feedbackScore,
      imagesSubmitted: imageCount,
    },
    highlights: highlights.length > 0 ? highlights : ["Stage execution completed as planned.", "Documentation can now be archived and shared."],
    outcomes: outcomes.length > 0 ? outcomes : ["Event deliverables completed.", "Post-event records prepared for review."],
    recommendations: [
      attendanceRate < 0.75
        ? "Improve pre-event reminder flow and registration follow-up to lift attendance conversion."
        : "The attendance conversion was healthy; reuse the same outreach timeline next cycle.",
      budgetVariance < 0
        ? "Review overspend categories and lock vendor quotes earlier in the planning phase."
        : "Budget discipline was maintained; preserve the same review checkpoints for future events.",
      feedbackScore > 0 && feedbackScore < 7
        ? "Focus on session pacing, signage, and volunteer response time in the next run."
        : "Maintain the current event structure and collect more qualitative testimonials for promotion.",
    ],
  };
};

export const analyzeBudgetFolder = async (payload) => {
  const folder = payload.folder || {};
  const expectedBudget = Number(folder.expectedBudget || 0);
  const actualSpend = Number(folder.grandTotal || 0);
  const variance = actualSpend - expectedBudget;
  const expenseCount = safeArray(folder.items).length;
  const averageExpense = expenseCount > 0 ? actualSpend / expenseCount : 0;
  const narrative = await generateBudgetAnalysisNarrative({
    ...folder,
    csvSummary: payload.csvSummary || "",
  });

  return {
    folderId: folder.id || "",
    title: folder.title || "Untitled folder",
    category: folder.category || "General",
    summary: narrative.summary,
    insights: narrative.insights,
    recommendation: narrative.recommendation,
    source: narrative.source,
    metrics: {
      expectedBudget,
      actualSpend,
      variance,
      expenseCount,
      averageExpense,
      expectedBudgetFormatted: formatCurrency(expectedBudget),
      actualSpendFormatted: formatCurrency(actualSpend),
      varianceFormatted: formatCurrency(variance),
      averageExpenseFormatted: formatCurrency(averageExpense),
    },
    chart: [
      { label: "Expected", amount: expectedBudget, amountFormatted: formatCurrency(expectedBudget) },
      { label: "Actual", amount: actualSpend, amountFormatted: formatCurrency(actualSpend) },
      { label: "Variance", amount: Math.abs(variance), amountFormatted: formatCurrency(Math.abs(variance)) },
    ],
  };
};

export const parseBudgetCsv = (buffer, originalname = "upload.csv") => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  const previewRows = rows.slice(0, 25);

  return {
    fileName: originalname,
    rowsParsed: rows.length,
    rows: previewRows,
    summaryText: previewRows
      .map((row, index) => `${index + 1}. ${Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(", ")}`)
      .join("\n"),
  };
};

export const estimateBudgetFromHistory = async (payload) => {
  const result = await generateBudgetEstimateNarrative({
    eventType: payload.eventType || "General",
    attendees: Number(payload.attendees || 0),
    history: safeArray(payload.history),
  });

  return {
    source: result.source,
    summary: result.summary,
    estimatedTotal: result.estimatedTotal,
    estimatedTotalFormatted: formatCurrency(result.estimatedTotal),
    breakdown: Object.entries(result.breakdown).map(([label, amount]) => ({
      label,
      amount,
      amountFormatted: formatCurrency(amount),
    })),
    recommendations: result.recommendations,
  };
};
