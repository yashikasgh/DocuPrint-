import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Build the AI prompt from event context.
 */
const buildPrompt = (payload) => `
You are an expert event feedback form designer for college and organizational events.

Based on the event details below, generate a structured feedback form with 7–10 smart, contextually relevant questions.

Event Details:
- Event Name: ${payload.eventName || "Event"}
- Event Type: ${payload.eventType || "General"}
- Date: ${payload.eventDate || "Not specified"}
- Venue: ${payload.venue || "Not specified"}
- Description: ${payload.description || "Not provided"}
- Target Audience: ${payload.targetAudience || "Students and faculty"}
- Organizer: ${payload.clubName || "Organizing committee"}

Rules:
1. Make questions specific to this event, not generic surveys.
2. Use a mix of question types: "rating" (1–5 scale), "text" (open-ended), "choice" (multiple choice).
3. At least 3 rating questions, at least 2 text questions, and at least 1 choice question.
4. Questions should cover: overall experience, content quality, logistics, speaker/instructor (if relevant), suggestions.
5. For "choice" questions, provide 3–4 relevant options.
6. Do NOT return markdown, only return valid JSON.

Return JSON in this exact shape:
{
  "formTitle": "string",
  "formSubtitle": "string",
  "questions": [
    {
      "id": "q1",
      "type": "rating",
      "label": "How would you rate the overall event?",
      "required": true
    },
    {
      "id": "q2",
      "type": "text",
      "label": "What did you enjoy most about the event?",
      "placeholder": "Share your thoughts...",
      "required": false
    },
    {
      "id": "q3",
      "type": "choice",
      "label": "How did you hear about this event?",
      "options": ["Social media", "College notice board", "Friend/colleague", "Email"],
      "required": false
    }
  ]
}
`.trim();

const extractJson = (text = "") => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * Generic fallback questions when AI is unavailable.
 */
const buildFallbackQuestions = (payload) => {
  const eventName = payload.eventName || "this event";
  return {
    formTitle: `${eventName} — Feedback Form`,
    formSubtitle: `We value your feedback to help us improve future events.`,
    questions: [
      {
        id: "q1",
        type: "rating",
        label: `How would you rate your overall experience at ${eventName}?`,
        required: true,
      },
      {
        id: "q2",
        type: "rating",
        label: "How would you rate the quality of content / sessions covered?",
        required: true,
      },
      {
        id: "q3",
        type: "rating",
        label: "How satisfied were you with the event organization and logistics?",
        required: true,
      },
      {
        id: "q4",
        type: "choice",
        label: "How did you hear about this event?",
        options: ["Social media", "College notice board", "Friend / colleague", "Email / WhatsApp"],
        required: false,
      },
      {
        id: "q5",
        type: "text",
        label: "What did you enjoy the most about this event?",
        placeholder: "Share what stood out for you...",
        required: false,
      },
      {
        id: "q6",
        type: "text",
        label: "What can we improve for future events?",
        placeholder: "Your suggestions are welcome...",
        required: false,
      },
      {
        id: "q7",
        type: "choice",
        label: "Would you attend similar events in the future?",
        options: ["Definitely yes", "Probably yes", "Not sure", "No"],
        required: true,
      },
    ],
  };
};

/**
 * Try Gemini first, fall back to Groq, then use template.
 */
export const generateFeedbackQuestions = async (payload) => {
  const prompt = buildPrompt(payload);

  // 1. Try Gemini
  if (config.geminiApiKey) {
    try {
      const client = new GoogleGenerativeAI(config.geminiApiKey);
      const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent([{ text: prompt }]);
      const text = result.response.text().trim();
      const parsed = extractJson(text);
      if (parsed?.questions?.length >= 5) {
        return { ...parsed, source: "gemini" };
      }
    } catch (err) {
      console.warn("[Feedback] Gemini failed:", err.message);
    }
  }

  // 2. Try Groq
  if (config.groqApiKey) {
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
          max_completion_tokens: 1600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const parsed = extractJson(text);
        if (parsed?.questions?.length >= 5) {
          return { ...parsed, source: "groq" };
        }
      }
    } catch (err) {
      console.warn("[Feedback] Groq failed:", err.message);
    }
  }

  // 3. Template fallback
  return { ...buildFallbackQuestions(payload), source: "template" };
};
