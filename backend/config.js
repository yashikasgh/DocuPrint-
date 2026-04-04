import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanString = (value) => String(value || "").trim();

export const config = {
  port: toNumber(process.env.PORT, 8787),
  openaiApiKey: cleanString(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_FLYERS || ""),
  groqApiKey: cleanString(process.env.GROQ_API_KEY || ""),
  groqModel: cleanString(process.env.GROQ_MODEL || "llama-3.3-70b-versatile"),
  geminiApiKey: cleanString(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""),
  pollinationsApiKey: cleanString(process.env.POLLINATIONS_API_KEY || process.env.POLLEN_API_KEY || ""),
  pollinationsModel: cleanString(process.env.POLLINATIONS_MODEL || "flux"),
  mistralApiKey: cleanString(process.env.MISTRAL_API_KEY || ""),
  appName: "DocuPrint",
};
