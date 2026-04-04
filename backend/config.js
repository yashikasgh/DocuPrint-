import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toNumber(process.env.PORT, 8787),
  openaiApiKey:
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_FLYERS ||
    "",
  geminiApiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    "",
  appName: "DocuPrint",
};
