import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const FLYER_WIDTH = 1024;
const FLYER_HEIGHT = 1536;
const GEMINI_IMAGE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
];
const GEMINI_TEXT_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash"];

const toModelId = (name) => name.replace(/^models\//, "");

const listAvailableGeminiModels = async (apiKey) => {
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models
      .filter((model) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes("generateContent"))
      .map((model) => toModelId(String(model.name || "")))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const resolveModelCandidates = (preferredModels, availableModels, options = {}) => {
  const { strictWhenAvailable = false } = options;

  if (!availableModels.length) {
    return preferredModels;
  }

  const preferredSet = new Set(preferredModels);
  const matched = availableModels.filter((model) => preferredSet.has(model));

  if (matched.length) {
    return matched;
  }

  return strictWhenAvailable ? [] : preferredModels;
};

const isQuotaError = (message) => {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("quota exceeded") ||
    normalized.includes("too many requests") ||
    normalized.includes("limit: 0") ||
    normalized.includes("429")
  );
};

const buildGeminiFailureMessage = ({ wantsFullFlyer, imageError, textError, imageModelsTried, availableModels }) => {
  if (isQuotaError(imageError) || isQuotaError(textError)) {
    return wantsFullFlyer
      ? "Gemini full flyer cannot be generated right now because your API key has no available quota (limit: 0 / 429). Use Generate Poster with local backgrounds, or enable quota in Google AI Studio."
      : "Gemini background cannot be generated right now because your API key has no available quota (limit: 0 / 429). Use Generate Poster with local backgrounds, or enable quota in Google AI Studio.";
  }

  if (imageModelsTried.length === 0 && availableModels.length > 0) {
    return wantsFullFlyer
      ? "Your Gemini key does not currently have access to image-generation models. Only text models are available for this project/key."
      : "Your Gemini key does not currently have access to image-generation models. Only text models are available for this project/key.";
  }

  return wantsFullFlyer
    ? `Gemini full flyer generation failed. ${imageError || "No image-capable model returned output."}`
    : `Gemini image generation failed. ${imageError || "No image-capable model returned output."}`;
};

export const themes = [
  "Technical",
  "Cultural",
  "Gaming",
  "Business",
  "Hackathon",
  "Workshop",
  "AI & Machine Learning",
  "Cybersecurity",
  "Robotics",
  "Startup & Innovation",
];

const themeKeywords = {
  Technical: "light digital patterns, soft blue gradients, abstract tech shapes",
  Cultural: "vibrant cultural motifs, elegant decorative geometry, festive atmosphere",
  Gaming: "esports inspired neon accents, dynamic abstract energy shapes, futuristic arena vibe",
  Business: "professional corporate visual language, modern business skyline silhouettes, clean layout",
  Hackathon: "coding sprint energy, digital abstract shapes, innovation-driven collaborative mood",
  Workshop: "bright workspace, laptop with code editor, clean desk, developers collaborating",
  "AI & Machine Learning": "light neural networks, glowing nodes, futuristic data flow",
  Cybersecurity: "minimal lock icons, secure digital mesh, clean technology gradients",
  Robotics: "sleek robotics lab, smart machine silhouettes, polished futurist environment",
  "Startup & Innovation": "startup pitch energy, bold modern gradients, innovation-centric visual language",
};

const styleKeywords = {
  "Minimal Modern": "minimal modern aesthetic, clean white space, balanced composition, subtle gradients",
  Glassmorphism: "glassmorphism layers, translucent panels, soft blur depth, polished contemporary look",
  Corporate: "corporate clean design, disciplined typography space, professional blue-white palette",
};

export const buildFlyerPrompt = (payload) => {
  const theme = themes.includes(payload.theme) ? payload.theme : themes[0];
  const style = payload.style || "Minimal Modern";

  return `
Vertical event flyer background for a college event poster.
Theme: ${theme}.
Style direction: ${style}.
${themeKeywords[theme] || ""}.
${styleKeywords[style] || ""}.
Bright, high-key lighting with rich visual depth.
Keep center and top-middle areas readable for headline text overlays.
Use cinematic composition, premium quality, and sharp details.
No text, no letters, no typography, no logos, no watermark.
`.trim();
};

const buildCompleteFlyerPrompt = (payload) => {
  const theme = themes.includes(payload.theme) ? payload.theme : themes[0];
  const style = payload.style || "Minimal Modern";
  const details = String(payload.details || "").trim() || "No extra details provided.";
  const summary = String(payload.summary || "").trim() || "";
  const contactLine = Array.isArray(payload.contactNumbers)
    ? payload.contactNumbers.filter(Boolean).join(" | ")
    : String(payload.contactNumbers || "").trim();

  return `
Generate a complete, print-ready vertical event flyer poster image for a college event.
Theme: ${theme}.
Style direction: ${style}.
${themeKeywords[theme] || ""}.
${styleKeywords[style] || ""}.

Required text content to include clearly and correctly:
College Name: ${payload.collegeName || "Pillai College of Engineering"}
Club Name: ${payload.clubName || "Club Name"}
Event Title: ${payload.eventTitle || "Event Title"}
Date: ${payload.date || "Not specified"}
Time: ${payload.time || "Not specified"}
Venue: ${payload.venue || "Not specified"}
Details: ${details}
Summary: ${summary || "Not specified"}
Contact: ${contactLine || "Not specified"}

Design constraints:
- high contrast readable typography
- balanced spacing and modern visual hierarchy
- no gibberish text, no random letters
- premium polished college event poster look
- final output should be a single complete flyer image
`.trim();
};

const getGeminiImage = async (prompt, mode = "background", availableModels = []) => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const client = new GoogleGenerativeAI(config.geminiApiKey);
  const instruction =
    mode === "full-flyer"
      ? "Generate the full finished flyer exactly with readable text."
      : "Generate only the background image. Do not include any text or logo in the image.";

  const requestPayload = [
    {
      text: `${prompt}\n\n${instruction}`,
    },
  ];

  const modelErrors = [];
  const imageModelCandidates = resolveModelCandidates(GEMINI_IMAGE_MODELS, availableModels, {
    strictWhenAvailable: true,
  });

  if (!imageModelCandidates.length) {
    throw new Error("No supported Gemini image-generation model is available for this key/project.");
  }

  for (const modelName of imageModelCandidates) {
    try {
      const imageModel = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      const result = await imageModel.generateContent(requestPayload);
      const parts = result.response?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part?.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        modelErrors.push(`${modelName}: no image data returned`);
        continue;
      }

      return {
        contentType: imagePart.inlineData.mimeType || "image/png",
        imageBase64: imagePart.inlineData.data,
      };
    } catch (error) {
      modelErrors.push(`${modelName}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  throw new Error(
    modelErrors.length
      ? modelErrors.join(" | ")
      : "Gemini image generation failed on all configured image models."
  );
};

export const generateFlyerConcept = async (payload) => {
  const wantsFullFlyer = payload.aiMode === "full-flyer" || payload.generateFullFlyer === true;
  const prompt = wantsFullFlyer ? buildCompleteFlyerPrompt(payload) : buildFlyerPrompt(payload);
  const availableModels = await listAvailableGeminiModels(config.geminiApiKey);
  let geminiImageErrorMessage = "";
  let imageModelsTried = [];
  const layout = {
    collegeName: payload.collegeName || "Pillai College of Engineering",
    clubName: payload.clubName || "Club Name",
    title: payload.eventTitle || "Event Title",
    dimensions: {
      width: FLYER_WIDTH,
      height: FLYER_HEIGHT,
    },
  };

  try {
    imageModelsTried = resolveModelCandidates(GEMINI_IMAGE_MODELS, availableModels, {
      strictWhenAvailable: true,
    });
    const generated = await getGeminiImage(prompt, wantsFullFlyer ? "full-flyer" : "background", availableModels);
    return {
      prompt,
      provider: wantsFullFlyer ? "gemini-full-flyer" : "gemini-image",
      status: "ready",
      layout,
      fullFlyerContentType: wantsFullFlyer ? generated.contentType : null,
      fullFlyerBase64: wantsFullFlyer ? generated.imageBase64 : null,
      backgroundContentType: generated.contentType,
      backgroundBase64: generated.imageBase64,
    };
  } catch (error) {
    geminiImageErrorMessage = error instanceof Error ? error.message : "Gemini image generation failed.";
  }

  if (isQuotaError(geminiImageErrorMessage)) {
    return {
      prompt,
      provider: "prompt-only",
      status: "mocked",
      message: buildGeminiFailureMessage({
        wantsFullFlyer,
        imageError: geminiImageErrorMessage,
        textError: "",
        imageModelsTried,
        availableModels,
      }),
      layout,
      fullFlyerBase64: null,
      fullFlyerContentType: null,
      backgroundBase64: null,
      backgroundContentType: null,
    };
  }

  if (!config.geminiApiKey) {
    return {
      prompt,
      provider: "prompt-only",
      status: "mocked",
      message: wantsFullFlyer
        ? "GEMINI_API_KEY is missing. Add it to .env to enable Gemini full flyer generation."
        : "GEMINI_API_KEY is missing. Add it to .env to enable Gemini flyer background generation.",
      layout,
      fullFlyerBase64: null,
      fullFlyerContentType: null,
      backgroundBase64: null,
      backgroundContentType: null,
    };
  }

  const client = new GoogleGenerativeAI(config.geminiApiKey);
  const creativeBriefPrompt = `Turn this into a structured creative brief for an image generation model. Keep it concise and production-ready.\n\n${prompt}`;
  let creativeBrief = "";
  const textModelErrors = [];
  const textModelCandidates = resolveModelCandidates(GEMINI_TEXT_MODELS, availableModels);

  for (const modelName of textModelCandidates) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([{ text: creativeBriefPrompt }]);
      creativeBrief = result.response.text();
      if (creativeBrief) {
        break;
      }
      textModelErrors.push(`${modelName}: empty response`);
    } catch (error) {
      textModelErrors.push(`${modelName}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  if (!creativeBrief) {
    const textModelError = textModelErrors.join(" | ");
    return {
      prompt,
      provider: "prompt-only",
      status: "mocked",
      message: buildGeminiFailureMessage({
        wantsFullFlyer,
        imageError: geminiImageErrorMessage,
        textError: textModelError || "No supported Gemini text model available.",
        imageModelsTried,
        availableModels,
      }),
      layout,
      fullFlyerBase64: null,
      fullFlyerContentType: null,
      backgroundBase64: null,
      backgroundContentType: null,
    };
  }

  return {
    prompt,
    provider: "gemini",
    status: "mocked",
    creativeBrief,
    message: buildGeminiFailureMessage({
      wantsFullFlyer,
      imageError: geminiImageErrorMessage || "Using Gemini creative brief fallback.",
      textError: "",
      imageModelsTried,
      availableModels,
    }),
    layout,
    fullFlyerBase64: null,
    fullFlyerContentType: null,
    backgroundBase64: null,
    backgroundContentType: null,
  };
};
