import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { clampText, safeArray } from "../utils.js";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

const formatInr = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const EVENT_ESTIMATION_PROFILES = {
  fest: {
    breakdown: { Lighting: 0.24, Food: 0.34, Logistics: 0.22, Misc: 0.2 },
    notes: [
      "Reserve a contingency buffer for stage, sound, and crowd-control changes because fest costs usually rise in the final week.",
      "Lock food vendors and decoration vendors early, since these are usually the biggest price-variation points for a fest.",
    ],
  },
  seminar: {
    breakdown: { Lighting: 0.12, Food: 0.24, Logistics: 0.34, Misc: 0.18 },
    notes: [
      "Keep a separate allocation for speaker travel, AV support, and printed materials because seminars often depend on these fixed costs.",
      "Review registration count against hall capacity early so hospitality and kit costs do not scale unnecessarily.",
    ],
  },
  repair: {
    breakdown: { Lighting: 0.18, Food: 0.06, Logistics: 0.28, Misc: 0.24 },
    notes: [
      "Collect at least two vendor quotations before finalizing repair work because labor and material charges vary widely across vendors.",
      "Keep a higher contingency for repair projects because hidden material replacement often appears after work starts.",
    ],
  },
  research: {
    breakdown: { Lighting: 0.08, Food: 0.06, Logistics: 0.26, Misc: 0.32 },
    notes: [
      "Protect the prototype and testing allocation first, because research budgets usually get delayed when procurement is underestimated.",
      "Track recurring software, cloud, or lab-consumable costs separately so the project team can justify repeat spending clearly.",
    ],
  },
  infrastructure: {
    breakdown: { Lighting: 0.16, Food: 0.04, Logistics: 0.3, Misc: 0.24 },
    notes: [
      "Plan for installation and transport separately from purchase cost because infrastructure work usually includes hidden setup charges.",
      "Keep inspection and maintenance follow-up costs visible so the total ownership cost is not understated.",
    ],
  },
  sports: {
    breakdown: { Lighting: 0.1, Food: 0.26, Logistics: 0.3, Misc: 0.18 },
    notes: [
      "Ground preparation, participant refreshments, and awards usually consume the biggest share, so validate those vendors first.",
      "Keep an emergency reserve for weather-related adjustments, extra kits, or transport changes during sports events.",
    ],
  },
  marketing: {
    breakdown: { Lighting: 0.05, Food: 0.08, Logistics: 0.22, Misc: 0.3 },
    notes: [
      "Separate print and digital promotion costs so the outreach team can measure which channel is actually delivering value.",
      "Creative revisions tend to add cost late, so freeze campaign assets before booking production or ad spend.",
    ],
  },
  hospitality: {
    breakdown: { Lighting: 0.08, Food: 0.4, Logistics: 0.24, Misc: 0.16 },
    notes: [
      "Hospitality budgets should keep catering, welcome kits, and guest transport under separate headings for easier approval review.",
      "Confirm guest count closer to the event date to avoid overcommitting on meal plans and accommodation blocks.",
    ],
  },
  general: {
    breakdown: { Lighting: 0.18, Food: 0.32, Logistics: 0.24, Misc: 0.12 },
    notes: [
      "Keep a contingency amount outside the visible line items for operational flexibility.",
      "Lock the major vendors early to avoid last-minute pricing changes.",
    ],
  },
};

const resolveEventProfile = (eventType = "") => {
  const normalized = String(eventType || "").toLowerCase();
  return (
    Object.entries(EVENT_ESTIMATION_PROFILES).find(([key]) => normalized.includes(key))?.[1] ||
    EVENT_ESTIMATION_PROFILES.general
  );
};

const createProposalPrompt = (payload) => `
You are writing a formal college event proposal for administrative approval.

Write:
1. Exactly 4 detailed, professional proposal paragraphs.
2. Exactly 4 expanded highlight lines for the proposal's highlights section.

Requirements:
- Keep the tone formal, polished, approval-oriented, and suitable for submission to college authorities.
- Expand the objective, event summary, benefits, and key points into strong institutional language.
- Make the highlights concise but meaningful, not copied raw from the user input.
- Do not include headings, bullet symbols, salutations, signatures, placeholders, or markdown.
- Do not invent facts outside the provided inputs.
- The four paragraphs should follow this structure:
  1. Event introduction, organizing body, audience, and approval context.
  2. Clear objective, need for the event, and what will be conducted.
  3. Participant benefits, expected outcomes, key highlights, logistics, and execution discipline.
  4. Institutional value, request for approval, and assurance of responsible implementation.
- The highlights should sound like proposal-ready value statements, not raw notes.

Return valid JSON only in this exact shape:
{"paragraphs":["paragraph 1","paragraph 2","paragraph 3","paragraph 4"],"highlights":["highlight 1","highlight 2","highlight 3","highlight 4"]}

College: ${payload.collegeName || "Pillai College of Engineering"}
Club: ${payload.clubName || "Student Club"}
Event title: ${payload.eventTitle || "Event"}
Event date: ${payload.eventDate || "To be announced"}
Venue: ${payload.venue || "College campus"}
Addressed to: ${payload.authorityName || "Respective authority"}
Subject: ${payload.subject || "Event proposal"}
Target audience: ${payload.targetAudience || "Students and faculty"}
Budget: ${payload.budget || "To be finalized"}
Objective: ${clampText(payload.objective || "", 700)}
Event summary: ${clampText(payload.eventSummary || "", 1200)}
Benefits: ${clampText(payload.benefits || "", 900)}
Key points: ${(payload.keyPoints || []).join(", ")}
`.trim();

const createProposalRepairPrompt = (payload, priorText) => `
The previous proposal draft was too generic or too weak.

Rewrite it into a stronger, more meaningful college proposal using the original event inputs.
The response must be richer, more specific to the event, and more useful for administrative approval.
Do not copy raw user phrases unless necessary. Expand them into proper proposal language.

Return valid JSON only in this exact shape:
{"paragraphs":["paragraph 1","paragraph 2","paragraph 3","paragraph 4"],"highlights":["highlight 1","highlight 2","highlight 3","highlight 4"]}

Original event details:
College: ${payload.collegeName || "Pillai College of Engineering"}
Club: ${payload.clubName || "Student Club"}
Event title: ${payload.eventTitle || "Event"}
Event date: ${payload.eventDate || "To be announced"}
Venue: ${payload.venue || "College campus"}
Addressed to: ${payload.authorityName || "Respective authority"}
Subject: ${payload.subject || "Event proposal"}
Target audience: ${payload.targetAudience || "Students and faculty"}
Budget: ${payload.budget || "To be finalized"}
Objective: ${clampText(payload.objective || "", 700)}
Event summary: ${clampText(payload.eventSummary || "", 1200)}
Benefits: ${clampText(payload.benefits || "", 900)}
Key points: ${(payload.keyPoints || []).join(", ")}

Weak previous draft:
${clampText(priorText || "", 4000)}
`.trim();

const fallbackProposalParagraphs = (payload) => [
  `This proposal is submitted on behalf of ${payload.clubName} for organizing the event "${payload.eventTitle}" at ${payload.venue || "the college venue"} on ${payload.eventDate || "the proposed date"}. The event is intended for ${payload.targetAudience || "students and faculty members"} and has been planned to create a structured and meaningful learning experience within the college environment.`,
  `The primary objective of the event is to ${payload.objective || "create a valuable academic and co-curricular experience for participants"}. Based on the details provided, the event will include ${payload.eventSummary || "well-coordinated activities, guided participation, and institution-aligned execution"} so that the intended outcomes are achieved in a professional and engaging manner.`,
  `${payload.benefits ? `The event is expected to benefit participants by ${payload.benefits}. ` : ""}The estimated budget for the event is ${payload.budget ? `Rs. ${Number(payload.budget).toLocaleString("en-IN")}` : "to be finalized"}. Administrative approval is requested for venue allocation, scheduling support, permissions, and any related logistics required for smooth execution. The organizing team will ensure that the event is conducted with discipline, proper coordination, and institutional compliance.`,
  `Through this event, ${payload.clubName} aims to contribute positively to student development and campus engagement. We therefore request approval to proceed with the proposed plan and assure that all arrangements, reporting, and post-event documentation will be carried out responsibly under faculty guidance.`,
];

const createReportPrompt = (payload) => {
  const budgetApproved = payload.eventFee || payload.workshopFee ? `Rs. ${Number(payload.eventFee || payload.workshopFee).toLocaleString("en-IN")}` : "not provided";

  return `
You are preparing a formal college post-event report for PDF export.

Your job is to write the REPORT CONTENT ONLY, in a structure that can be placed into a 2-3 page post-event report with analytics, attendance analysis, and photographs.

Requirements:
1. Write in a formal institutional tone suitable for submission to college authorities.
2. Make the report detailed enough to fill roughly 2-3 A4 pages when typeset.
3. Use the exact section order below.
4. Use the supplied attendance analytics explicitly. Do not invent metrics that contradict the data.
5. Refer to photographs naturally as event documentation wherever appropriate.
6. Return valid JSON only. No markdown fences. No commentary outside JSON.

Return JSON in this exact shape:
{
  "title": "string",
  "subtitle": "string",
  "sections": [
    {
      "heading": "string",
      "paragraphs": ["string", "string"],
      "bullets": ["string", "string"]
    }
  ],
  "photoCaptions": ["string", "string", "string"],
  "closingNote": "string"
}

Use these sections in this exact order:
1. Introduction
2. Objectives of the Event
3. Planning and Execution
4. Participation and Attendance Analysis
5. Sessions and Key Activities
6. Outcomes and Impact
7. Feedback and Observations
8. Conclusion

Context:
College: ${payload.collegeName || "Pillai College of Engineering"}
College address: ${payload.collegeAddress || "Not provided"}
Organizing body: ${payload.studentChapterName || payload.clubName || "Student Committee"}
Department: ${payload.department || "Not provided"}
Event title: ${payload.eventName || "Event Title"}
Date: ${payload.eventDate || "Not provided"}
Venue: ${payload.eventVenue || "Not provided"}
Mode: ${payload.mode || "Offline"}
Addressed to: ${payload.authorityName || "Respective authority"}
Speaker / Instructor: ${payload.eventInstructor || "Not provided"}
Student coordinator: ${payload.studentEventHead || "Not provided"}
Faculty coordinator: ${payload.facultyEventHead || "Not provided"}
Eligibility / criteria: ${payload.criteria || "Not provided"}
Description: ${clampText(payload.description || "", 1800)}
Topics covered: ${clampText(payload.topicsCovered || "", 1800)}
Event summary: ${clampText(payload.eventSummary || "", 2200)}
Key highlights: ${safeStringList(payload.keyHighlights).join("; ") || "Not provided"}
Attendance form / method: ${payload.attendanceForm || payload.attendanceFormLink || "Not provided"}
Feedback details: ${payload.feedback || "Not provided"}
Feedback form link: ${payload.feedbackFormLink || "Not provided"}
Event fee / budget note: ${payload.eventFee ? `Rs. ${Number(payload.eventFee).toLocaleString("en-IN")}` : "Not provided"}

Attendance analytics:
- Registered participants: ${analytics.registeredCount ?? payload.participantsRegistered ?? "Not available"}
- Appeared participants: ${analytics.appearedCount ?? payload.participantsAppeared ?? "Not available"}
- Attendance file records: ${analytics.rosterCount ?? "Not available"}
- Attendance rate: ${analytics.attendanceRateFormatted || "Not available"}
- Named records completeness: ${analytics.completenessFormatted || "Not available"}
- Branches represented: ${analytics.branchCount ?? "Not available"}
- Divisions represented: ${analytics.divisionCount ?? "Not available"}
- Years represented: ${analytics.yearCount ?? "Not available"}
Attendance breakdown:
${attendanceSummaryLines}

Photograph notes:
${imageLines}

Important writing rules:
- Mention concrete attendance insights in the Participation and Attendance Analysis section.
- Mention that photographs were recorded and embedded as evidence of participation and execution quality.
- Do not use placeholders like "insert image here".
- Keep each paragraph substantial and polished.
- If some information is missing, write gracefully without calling the data "missing".
`.trim();
};

const safeStringList = (value) =>
  Array.isArray(value)
    ? value.map((item) => clampText(item, 240)).filter(Boolean)
    : [];

const normalizeJsonText = (value) => {
  const text = String(value || "").trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return text;
  }

  return text.slice(firstBrace, lastBrace + 1);
};

const buildFallbackReportNarrative = (payload) => {
  const analytics = payload.analyticsSummary || {};
  const title = payload.eventName || payload.eventTitle || "Post-Event Report";
  const attendanceLine = analytics.attendanceRateFormatted
    ? `The event recorded ${analytics.appearedCount || payload.participantsAppeared || analytics.rosterCount || "multiple"} participants, reflecting an attendance rate of ${analytics.attendanceRateFormatted}.`
    : `The event recorded ${analytics.appearedCount || payload.participantsAppeared || analytics.rosterCount || "multiple"} participants and sustained active involvement across the scheduled sessions.`;
  const breakdown = Array.isArray(analytics.attendanceBreakdown) ? analytics.attendanceBreakdown : [];

  return {
    title,
    subtitle: `${payload.studentChapterName || payload.clubName || "Organizing Committee"} | ${payload.eventDate || "Event Date"} | ${payload.eventVenue || "Venue"}`,
    sections: [
      {
        heading: "Introduction",
        paragraphs: [
          `${title} was organized by ${payload.studentChapterName || payload.clubName || "the organizing body"} on ${payload.eventDate || "the scheduled date"} at ${payload.eventVenue || "the designated venue"}. The programme was designed to create a meaningful academic and co-curricular engagement aligned with institutional objectives.`,
          `${clampText(payload.eventSummary || payload.description || "The event was conducted with a focus on structured delivery, participant engagement, and measurable outcomes.", 900)}`
        ],
        bullets: [],
      },
      {
        heading: "Objectives of the Event",
        paragraphs: [
          `The central objective of the event was to provide participants with an opportunity to engage with ${clampText(payload.topicsCovered || payload.description || "relevant themes and practical learning experiences", 900)}.`,
        ],
        bullets: safeStringList(payload.keyHighlights).slice(0, 4),
      },
      {
        heading: "Planning and Execution",
        paragraphs: [
          `The event planning process included coordination among the organizing committee, faculty representatives, and operational support members to ensure smooth scheduling, venue readiness, communication, and participant management.`,
          `Execution on the event day was guided by the student coordinator ${payload.studentEventHead || "from the organizing team"} and the faculty coordinator ${payload.facultyEventHead || "assigned by the department"}, with support from ${payload.eventInstructor || "the invited speaker / facilitator"}.`,
        ],
        bullets: [],
      },
      {
        heading: "Participation and Attendance Analysis",
        paragraphs: [
          attendanceLine,
          breakdown.length > 0
            ? `Attendance analysis of the uploaded roster shows representation across ${analytics.yearCount || 0} year groups, ${analytics.branchCount || 0} branches, and ${analytics.divisionCount || 0} divisions, indicating a healthy spread of participation.`
            : `The attendance records were reviewed to understand participation quality and roster completeness.`,
        ],
        bullets: breakdown.slice(0, 5),
      },
      {
        heading: "Sessions and Key Activities",
        paragraphs: [
          `${clampText(payload.topicsCovered || "The sessions covered the planned themes, discussions, and practical components of the event.", 1200)}`,
        ],
        bullets: safeStringList(payload.keyHighlights).slice(0, 5),
      },
      {
        heading: "Outcomes and Impact",
        paragraphs: [
          `${clampText(payload.description || "The event delivered visible academic and engagement outcomes for the participating students and reinforced the relevance of collaborative event-based learning.", 1200)}`,
        ],
        bullets: [],
      },
      {
        heading: "Feedback and Observations",
        paragraphs: [
          `${clampText(payload.feedback || "The overall response to the event was positive, with participants appreciating the relevance of the content, the organization of the sessions, and the opportunity for meaningful engagement.", 900)}`,
          `Photographic documentation was maintained throughout the event and has been included in the report to support the recorded activities and participation.`,
        ],
        bullets: [],
      },
      {
        heading: "Conclusion",
        paragraphs: [
          `The event concluded successfully and met its intended objectives through organized execution, active participation, and clear educational value. The report, attendance analysis, and supporting photographs together present a complete record of the programme.`,
        ],
        bullets: [],
      },
    ],
    photoCaptions: safeStringList(payload.imageCaptions).slice(0, 6),
    closingNote: "This report is generated for institutional documentation and review.",
  };
};

export const generateReportNarrative = async (payload) => {
  const prompt = createReportPrompt(payload);
  if (!config.mistralApiKey) {
    return {
      report: buildFallbackReportNarrative(payload),
      prompt,
      source: "template",
      analytics: [],
    };
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.mistralApiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2200,
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Mistral] ${response.status} ${response.statusText}: ${errText}`);
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content || "";
    const cleaned = normalizeJsonText(generatedText);
    const parsed = JSON.parse(cleaned);
    const sections = Array.isArray(parsed?.sections)
      ? parsed.sections
          .map((section) => ({
            heading: clampText(section?.heading || "", 120),
            paragraphs: safeStringList(section?.paragraphs).slice(0, 4),
            bullets: safeStringList(section?.bullets).slice(0, 6),
          }))
          .filter((section) => section.heading && (section.paragraphs.length > 0 || section.bullets.length > 0))
      : [];

    if (sections.length === 0) {
      throw new Error("Mistral response did not contain valid report sections");
    }

    const analytics = [
      payload.totalAttendees ? `Total attendees: ${payload.totalAttendees}` : null,
      payload.feedbackScore ? `Feedback score: ${payload.feedbackScore}/10` : null,
      payload.totalBudget ? `Approved budget: Rs. ${Number(payload.totalBudget).toLocaleString("en-IN")}` : null,
      payload.actualSpend ? `Actual spend: Rs. ${Number(payload.actualSpend).toLocaleString("en-IN")}` : null,
    ].filter(Boolean);

    return {
      report: {
        title: clampText(parsed?.title || payload.eventName || "Post-Event Report", 180),
        subtitle: clampText(parsed?.subtitle || "", 240),
        sections,
        photoCaptions: safeStringList(parsed?.photoCaptions).slice(0, 8),
        closingNote: clampText(parsed?.closingNote || "", 400),
      },
      prompt,
      source: "mistral",
      analytics,
    };
  } catch (error) {
    console.error("Mistral report generation error:", error);
    return {
      report: buildFallbackReportNarrative(payload),
      prompt,
      source: "template",
      analytics: [],
    };
  }
};

const fallbackProposalHighlights = (payload) => {
  const expandedInputHighlights = safeHighlightArray(payload.keyPoints).map((point) => {
    if (/approval|permission/i.test(point)) {
      return `Administrative approval is requested to complete the required institutional permissions and execution support for the event.`;
    }

    if (/outcome|benefit|impact/i.test(point)) {
      return `The proposal is designed to generate clear academic, professional, and co-curricular value for the intended participants.`;
    }

    return point.endsWith(".")
      ? point
      : `${point.charAt(0).toUpperCase()}${point.slice(1)} will be handled as a structured part of the proposed event plan.`;
  });

  const fallback = [
    `The event has been structured to align with the club's objectives and the college's academic and co-curricular priorities.`,
    payload.benefits
      ? `Participants are expected to benefit through ${clampText(payload.benefits, 220)}.`
      : `Participants are expected to gain meaningful academic, professional, and collaborative exposure through the event.`,
    `The organizing team will manage planning, coordination, and documentation under proper faculty guidance and institutional discipline.`,
    `Approval is requested for venue allocation, scheduling support, and the administrative arrangements needed for smooth execution.`,
  ];

  return [...expandedInputHighlights, ...fallback].slice(0, 4);
};

const safeHighlightArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

const normalizeParagraphs = (paragraphs, payload) => {
  const cleanedParagraphs = (Array.isArray(paragraphs) ? paragraphs : [])
    .map((paragraph) => String(paragraph || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);

  return cleanedParagraphs.length === 4 ? cleanedParagraphs : fallbackProposalParagraphs(payload);
};

const normalizeHighlights = (highlights, payload) => {
  const cleanedHighlights = safeHighlightArray(highlights).slice(0, 4);
  return cleanedHighlights.length === 4 ? cleanedHighlights : fallbackProposalHighlights(payload);
};

const extractJsonObject = (text = "") => {
  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return text.slice(startIndex, endIndex + 1);
};

const parseProposalContent = (text, payload) => {
  const jsonBlock = extractJsonObject(text);
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);
      return {
        paragraphs: normalizeParagraphs(parsed.paragraphs, payload),
        highlights: normalizeHighlights(parsed.highlights, payload),
      };
    } catch {
      return null;
    }
  }

  const plainTextParagraphs = String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);

  return plainTextParagraphs.length === 4
    ? {
        paragraphs: plainTextParagraphs,
        highlights: fallbackProposalHighlights(payload),
      }
    : null;
};

const soundsLikeMeaningfulProposal = (content, payload) => {
  if (!content?.paragraphs || !content?.highlights) {
    return false;
  }

  const joinedParagraphs = content.paragraphs.join(" ");
  const joinedHighlights = content.highlights.join(" ");
  const normalizedKeyPoints = safeHighlightArray(payload.keyPoints).map((item) => item.toLowerCase());
  const paragraphLength = joinedParagraphs.replace(/\s+/g, " ").trim().length;
  const highlightLength = joinedHighlights.replace(/\s+/g, " ").trim().length;
  const mentionsEventTitle = payload.eventTitle
    ? joinedParagraphs.toLowerCase().includes(String(payload.eventTitle).toLowerCase())
    : true;
  const mentionsObjective = payload.objective
    ? joinedParagraphs.toLowerCase().includes(String(payload.objective).split(" ").slice(0, 2).join(" ").toLowerCase()) ||
      /objective|aim|purpose/.test(joinedParagraphs.toLowerCase())
    : true;
  const rawHighlightMatches = normalizedKeyPoints.filter((item) => joinedHighlights.toLowerCase().includes(item)).length;

  return (
    content.paragraphs.length === 4 &&
    content.highlights.length === 4 &&
    paragraphLength >= 950 &&
    highlightLength >= 220 &&
    mentionsEventTitle &&
    mentionsObjective &&
    rawHighlightMatches < Math.max(normalizedKeyPoints.length, 1)
  );
};

const generateTextWithGroq = async (prompt) => {
  if (!config.groqApiKey) {
    return null;
  }

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.4,
        max_completion_tokens: 1400,
        messages: [
          {
            role: "system",
            content:
              "You write polished, formal, college-administration-ready proposal content. Follow formatting instructions exactly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
};

export const generateProposalNarrative = async (payload) => {
  const prompt = createProposalPrompt(payload);
  const groqText = await generateTextWithGroq(prompt);
  const groqContent = groqText ? parseProposalContent(groqText, payload) : null;
  if (groqContent && soundsLikeMeaningfulProposal(groqContent, payload)) {
    return {
      paragraphs: groqContent.paragraphs,
      highlights: groqContent.highlights,
      prompt,
      source: `groq:${config.groqModel}`,
    };
  }

  if (groqText) {
    const repairedGroqText = await generateTextWithGroq(createProposalRepairPrompt(payload, groqText));
    const repairedGroqContent = repairedGroqText ? parseProposalContent(repairedGroqText, payload) : null;
    if (repairedGroqContent && soundsLikeMeaningfulProposal(repairedGroqContent, payload)) {
      return {
        paragraphs: repairedGroqContent.paragraphs,
        highlights: repairedGroqContent.highlights,
        prompt,
        source: `groq:${config.groqModel}:repaired`,
      };
    }
  }

  try {
    if (config.geminiApiKey) {
      const client = new GoogleGenerativeAI(config.geminiApiKey);
      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([{ text: prompt }]);
      const text = result.response.text().trim();
      const content = parseProposalContent(text, payload);

      if (content && soundsLikeMeaningfulProposal(content, payload)) {
        return {
          paragraphs: content.paragraphs,
          highlights: content.highlights,
          prompt,
          source: "gemini:gemini-1.5-flash",
        };
      }

      if (text) {
        const retryPrompt = createProposalRepairPrompt(payload, text);
        const retryResult = await model.generateContent([{ text: retryPrompt }]);
        const retryText = retryResult.response.text().trim();
        const retryContent = parseProposalContent(retryText, payload);

        if (retryContent && soundsLikeMeaningfulProposal(retryContent, payload)) {
          return {
            paragraphs: retryContent.paragraphs,
            highlights: retryContent.highlights,
            prompt,
            source: "gemini:gemini-1.5-flash:repaired",
          };
        }
      }
    }
  } catch {
    // Fall through to the local template below.
  }

  return {
    paragraphs: fallbackProposalParagraphs(payload),
    highlights: fallbackProposalHighlights(payload),
    prompt,
    source: "template",
  };
};

const generateTextWithGemini = async (prompt) => {
  if (!config.geminiApiKey) {
    return null;
  }

  try {
    const client = new GoogleGenerativeAI(config.geminiApiKey);
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([{ text: prompt }]);
    return result.response.text().trim();
  } catch {
    return null;
  }
};

const generateTextWithLlm = async (prompt) => {
  const groqText = await generateTextWithGroq(prompt);
  if (groqText) {
    return {
      text: groqText,
      source: `groq:${config.groqModel}`,
    };
  }

  const geminiText = await generateTextWithGemini(prompt);
  if (geminiText) {
    return {
      text: geminiText,
      source: "gemini:gemini-1.5-flash",
    };
  }

  return null;
};

const normalizeInsightLine = (value) =>
  String(value || "")
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\*+/g, "");

const normalizeSentence = (value) => {
  const cleaned = normalizeInsightLine(value);
  if (!cleaned) {
    return "";
  }

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const extractJsonPayload = (text = "") => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

const normalizeBudgetInsights = (insights, fallback = []) => {
  const cleaned = safeArray(insights)
    .map((item) => normalizeSentence(item))
    .filter(Boolean)
    .slice(0, 4);

  if (cleaned.length === 4) {
    return cleaned;
  }

  return safeArray(fallback)
    .map((item) => normalizeSentence(item))
    .filter(Boolean)
    .slice(0, 4);
};

const normalizeBudgetRecommendations = (recommendations, fallback = []) => {
  const cleaned = safeArray(recommendations)
    .map((item) => normalizeSentence(item))
    .filter(Boolean)
    .slice(0, 3);

  if (cleaned.length > 0) {
    return cleaned;
  }

  return safeArray(fallback)
    .map((item) => normalizeSentence(item))
    .filter(Boolean)
    .slice(0, 3);
};

export const generateBudgetAnalysisNarrative = async (payload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const expectedBudget = Number(payload.expectedBudget || 0);
  const actualSpend = Number(payload.grandTotal || 0);
  const variance = actualSpend - expectedBudget;
  const largestExpense = items.reduce(
    (largest, item) => (Number(item.amount || 0) > Number(largest?.amount || 0) ? item : largest),
    items[0] || null
  );
  const vendorTotals = items.reduce((map, item) => {
    const key = item.vendorName || payload.vendor || "Unknown vendor";
    map.set(key, (map.get(key) || 0) + Number(item.amount || 0));
    return map;
  }, new Map());
  const topVendorEntry = [...vendorTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const expenseTypeTotals = items.reduce((map, item) => {
    const key = item.expenseType || "General";
    map.set(key, (map.get(key) || 0) + Number(item.amount || 0));
    return map;
  }, new Map());
  const topExpenseTypeEntry = [...expenseTypeTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const overspendText =
    variance > 0
      ? `The folder is overspent by ${formatInr(variance)} compared with the approved budget.`
      : variance < 0
        ? `The folder is under budget by ${formatInr(Math.abs(variance))}, which leaves room for pending operational costs.`
        : "The folder is exactly on the approved budget.";
  const fallbackInsights = [
    overspendText,
    largestExpense
      ? `${largestExpense.label} is the cost driver in this folder, contributing ${formatInr(largestExpense.amount)} to the spend profile.`
      : "This folder does not have enough expense entries yet to identify a dominant cost driver.",
    topExpenseTypeEntry
      ? `${topExpenseTypeEntry[0]} is the highest spending expense type at ${formatInr(topExpenseTypeEntry[1])}, so this is the first area to audit for savings or reallocation.`
      : "Expense-type tagging is still limited, so category-wise spend insights will improve as more entries are added.",
    topVendorEntry
      ? `${topVendorEntry[0]} is the most expensive vendor touchpoint so far, which makes it the best candidate for rate comparison or negotiation.`
      : "Vendor-level comparison is not available yet because the expense entries do not have enough vendor detail.",
  ];
  const fallbackRecommendation =
    variance > 0
      ? `Freeze non-essential additions in ${payload.title || "this folder"} until ${topExpenseTypeEntry?.[0] || "the main spend category"} is reviewed and the overspend of ${formatInr(variance)} is justified or reduced.`
      : `Continue tracking ${payload.title || "this folder"} with the current structure, and use the remaining ${formatInr(Math.abs(Math.min(variance, 0)))} strategically for pending items or contingency coverage.`;
  const prompt = `
You are a finance analyst for a college event budget management system.

Analyze the following event budget and return:
1. One meaningful executive summary paragraph that explains the budget position clearly.
2. Exactly 4 specific actionable insights tied to the numbers, vendors, categories, or uploaded CSV data.
3. Exactly 2 recommendation lines for the committee.

Requirements:
- Keep it professional, specific, and useful for faculty or student committee review.
- Refer to concrete spend patterns, not generic budgeting advice.
- If CSV data is provided, incorporate it into the analysis.
- Make each insight distinct and practical.
- Do not use markdown.
- Do not mention that you are an AI model.
- Keep every insight and recommendation to one sentence.
- Return valid JSON only in this exact shape:
{"summary":"...","insights":["...","...","...","..."],"recommendations":["...","..."]}

Folder title: ${payload.title || "Untitled folder"}
Category: ${payload.category || "General"}
Expected budget: ${payload.expectedBudget || 0}
Actual spend: ${payload.grandTotal || 0}
Budget variance: ${variance}
Average expense value: ${items.length > 0 ? (actualSpend / items.length).toFixed(2) : 0}
Vendor: ${payload.vendor || "Unknown"}
Description: ${clampText(payload.description || "", 800)}
Expenses:
${(payload.items || [])
  .map((item, index) => `${index + 1}. ${item.label} | amount ${item.amount} | vendor ${item.vendorName || "Unknown"} | type ${item.expenseType} | notes ${item.notes || "None"}`)
  .join("\n")}

If there is uploaded csv content, use it too:
${clampText(payload.csvSummary || "No CSV uploaded.", 2000)}
`.trim();

  const llmResponse = await generateTextWithLlm(prompt);
  if (!llmResponse?.text) {
    const summaryParts = [
      `${payload.title || "This folder"} in the ${payload.category || "general"} category has recorded ${formatInr(actualSpend)} against an expected allocation of ${formatInr(expectedBudget)}.`,
      largestExpense ? `The largest single expense is ${largestExpense.label} at ${formatInr(largestExpense.amount)}.` : null,
      topVendorEntry ? `${topVendorEntry[0]} accounts for the highest vendor outflow at ${formatInr(topVendorEntry[1])}.` : null,
    ].filter(Boolean);

    return {
      source: "template",
      summary: summaryParts.join(" "),
      insights: normalizeBudgetInsights(fallbackInsights),
      recommendation: normalizeBudgetRecommendations([fallbackRecommendation]).join(" "),
    };
  }

  const parsed = extractJsonPayload(llmResponse.text);
  if (parsed) {
    const summary = normalizeSentence(parsed.summary || "");
    const insights = normalizeBudgetInsights(parsed.insights, fallbackInsights);
    const recommendations = normalizeBudgetRecommendations(parsed.recommendations, [fallbackRecommendation]);

    if (summary && insights.length === 4 && recommendations.length > 0) {
      return {
        source: llmResponse.source,
        summary,
        insights,
        recommendation: recommendations.join(" "),
      };
    }
  }

  const text = llmResponse.text;
  const lines = text.split("\n").map((line) => normalizeSentence(line)).filter(Boolean);
  return {
    source: llmResponse.source,
    summary: lines[0] || normalizeSentence(text) || normalizeSentence(fallbackInsights[0]),
    insights: normalizeBudgetInsights(lines.slice(1, 5), fallbackInsights),
    recommendation: normalizeBudgetRecommendations(lines.slice(5), [fallbackRecommendation]).join(" "),
  };
};

export const generateBudgetEstimateNarrative = async (payload) => {
  const eventProfile = resolveEventProfile(payload.eventType);
  const historyDetails = (payload.history || [])
    .map((record, index) => {
      const topItems = safeArray(record.items)
        .slice(0, 8)
        .map((item) => `${item.label}: ${item.amount} (${item.expenseType || "General"})`)
        .join("; ");

      return `${index + 1}. ${record.title} | category ${record.category} | expected ${record.expectedBudget || 0} | spent ${record.grandTotal || 0} | vendor ${record.vendor || "Unknown"} | description ${record.description || "None"} | items ${topItems}`;
    })
    .join("\n");

  const prompt = `
You are estimating a new college event budget using detailed past event spending history.

Event type: ${payload.eventType}
Expected attendees: ${payload.attendees}

Historical folders:
${historyDetails}

Return:
1. One meaningful summary paragraph explaining the estimate logic.
2. A suggested total estimate as a whole number.
3. Four practical breakdown items for Lighting, Food, Logistics, Misc based on the event type and past history.
4. Two practical recommendations specific to the event type and likely cost drivers.

Requirements:
- Use the past budgets as actual historical evidence.
- Do not give generic advice.
- Mention the strongest historical cost patterns influencing the estimate.
- Keep the summary concise but meaningful.
- Return valid JSON only in this exact shape:
{"summary":"...","estimatedTotal":123456,"breakdown":{"Lighting":123,"Food":456,"Logistics":789,"Misc":101},"recommendations":["...","..."]}
`.trim();

  const llmResponse = await generateTextWithLlm(prompt);
  if (!llmResponse?.text) {
    const relatedHistory = (payload.history || []).filter((record) =>
      String(record.category || "")
        .toLowerCase()
        .includes(String(payload.eventType || "").toLowerCase())
    );
    const sourceHistory = relatedHistory.length > 0 ? relatedHistory : payload.history || [];
    const averageSpend =
      sourceHistory.length > 0
        ? sourceHistory.reduce((sum, record) => sum + Number(record.grandTotal || 0), 0) / sourceHistory.length
        : 100000;
    const attendeeFactor = Math.max(Number(payload.attendees || 0), 1) * 220;
    const estimate = Math.round((averageSpend + attendeeFactor) / 2);
    return {
      source: "template",
      summary: `The estimate is based on ${sourceHistory.length} previous ${payload.eventType} or related budget records, adjusted for an audience size of ${payload.attendees}.`,
      estimatedTotal: estimate,
      breakdown: {
        Lighting: Math.round(estimate * eventProfile.breakdown.Lighting),
        Food: Math.round(estimate * eventProfile.breakdown.Food),
        Logistics: Math.round(estimate * eventProfile.breakdown.Logistics),
        Misc: Math.round(estimate * eventProfile.breakdown.Misc),
      },
      recommendations: eventProfile.notes,
    };
  }

  const parsed = extractJsonPayload(llmResponse.text);
  if (parsed) {
    const estimatedTotal = Math.max(Number(parsed.estimatedTotal || 0), 0);
    const parsedBreakdown = parsed.breakdown || {};
    const breakdown = {
      Lighting: Math.max(Number(parsedBreakdown.Lighting || 0), 0),
      Food: Math.max(Number(parsedBreakdown.Food || 0), 0),
      Logistics: Math.max(Number(parsedBreakdown.Logistics || 0), 0),
      Misc: Math.max(Number(parsedBreakdown.Misc || 0), 0),
    };
    const totalBreakdown = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    if (estimatedTotal > 0 && totalBreakdown > 0) {
      return {
        source: llmResponse.source,
        summary: normalizeSentence(parsed.summary || "") || `The estimate is informed by historical spending patterns for ${payload.eventType || "the selected event type"}.`,
        estimatedTotal,
        breakdown,
        recommendations: normalizeBudgetRecommendations(parsed.recommendations, eventProfile.notes),
      };
    }
  }

  const text = llmResponse.text;
  const lines = text.split("\n").map((line) => normalizeSentence(line)).filter(Boolean);
  const estimateMatch = text.match(/(\d[\d,]*)/);
  const estimatedTotal = estimateMatch ? Number(estimateMatch[1].replace(/,/g, "")) : 100000;
  return {
    source: llmResponse.source,
    summary: lines[0] || `The estimate is informed by historical spending patterns for ${payload.eventType || "the selected event type"}.`,
    estimatedTotal,
    breakdown: {
      Lighting: Math.round(estimatedTotal * eventProfile.breakdown.Lighting),
      Food: Math.round(estimatedTotal * eventProfile.breakdown.Food),
      Logistics: Math.round(estimatedTotal * eventProfile.breakdown.Logistics),
      Misc: Math.round(estimatedTotal * eventProfile.breakdown.Misc),
    },
    recommendations: normalizeBudgetRecommendations(lines.slice(-2), eventProfile.notes),
  };
};

export const generateTimelineMilestones = async (payload) => {
  const eventTitle = payload.eventTitle || "Event";
  const eventDate = payload.eventDate || new Date().toISOString().split("T")[0];
  const scale = payload.scale || "medium";

  const prompt = `
Generate a detailed timeline of milestones for an event.

Event Title: ${eventTitle}
Event Date: ${eventDate}
Event Scale: ${scale}

Make the timeline specific to the event type based on the title.
Include the event title "${eventTitle}" in each milestone label to personalize them.

Timeline Requirements:
- Generate 6-8 meaningful milestones
- Dates should be spread realistically across the event planning and execution window
- Earlier dates = planning/preparation phases
- Later dates closer to event date = execution phases
- After event date = post-event phases
- Owners should be realistic roles (e.g., "Faculty coordinator", "Core student team", "Operations desk")
- Each label MUST include the event title for personalization
- No generic milestone names like "Milestone 1" or "Step 1"

Examples of personalized labels:
- For "Web Dev Hackathon": "Registration opens for Web Dev Hackathon" instead of "Open registrations"
- For "SIH 2024": "Submit prototype for SIH 2024" instead of "Submit prototype"
- For "Tech Summit": "Launch marketing for Tech Summit" instead of "Marketing launch"

Return structured milestones:
- label (milestone name - MUST include event title)
- date (ISO date format YYYY-MM-DD)
- owner (person or team responsible)
- status (completed, ongoing, pending)

Requirements:
1. Return ONLY valid JSON in this exact shape:
{"milestones":[{"label":"...","date":"YYYY-MM-DD","owner":"...","status":"..."}]}
2. Do not include any text outside the JSON object.
3. Generate 6-8 milestones total.
`.trim();

  const llmResponse = await generateTextWithLlm(prompt);

  if (!llmResponse?.text) {
    return { milestones: [] };
  }

  try {
    const jsonMatch = llmResponse.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { milestones: [] };
    }

    const parsedJson = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsedJson.milestones) && parsedJson.milestones.length > 0) {
      const normalizedMilestones = parsedJson.milestones.map((m) => ({
        label: String(m.label || "").trim() || "Milestone",
        date: String(m.date || "").trim() || eventDate,
        owner: String(m.owner || "").trim() || "Team",
        status: String(m.status || "").trim().toLowerCase() || "pending",
      }));

      return {
        milestones: normalizedMilestones,
      };
    }
  } catch {
    // Fall through to empty return
  }

  return { milestones: [] };
};
