import { config } from "../config.js";

const FLYER_WIDTH = 1024;
const FLYER_HEIGHT = 1536;
const POLLINATIONS_IMAGE_ENDPOINTS = [
  {
    label: "gen",
    baseUrl: "https://gen.pollinations.ai/image",
  },
  {
    label: "legacy",
    baseUrl: "https://image.pollinations.ai/prompt",
  },
];
const POLLINATIONS_FORCED_MODEL = "flux";
const POLLINATIONS_MODEL_CANDIDATES = [POLLINATIONS_FORCED_MODEL];
const POLLINATIONS_FULL_FLYER_MODEL_CANDIDATES = [POLLINATIONS_FORCED_MODEL];
const POLLINATIONS_MAX_ATTEMPTS = 3;

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
  "Retro & Vintage": "retro poster style, warm vintage tones, subtle paper texture, timeless editorial composition",
  "Geometric & Abstract": "bold geometric shapes, abstract forms, clean vector-like composition, structured visual rhythm",
  "Futuristic & Technical": "futuristic technical interface vibe, sleek neon accents, precise digital geometry, high-tech environment",
  "Bold Editorial": "high-impact editorial layout, strong contrast blocks, modern magazine-inspired art direction",
  "Neon Cyber": "cyberpunk neon palette, luminous gradients, moody futuristic energy, digital nightlife atmosphere",
};

const normalizePromptField = (value, maxLength = 220) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const toBulletLines = (value, maxItems = 7, maxLength = 120) =>
  String(value || "")
    .split(/\n|\u2022|•|;/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => `- ${item.slice(0, maxLength)}`);

export const buildFlyerPrompt = (payload) => {
  const theme = themes.includes(payload.theme) ? payload.theme : themes[0];
  const style = payload.style || "Minimal Modern";
  const collegeName = normalizePromptField(payload.collegeName || "Pillai College of Engineering", 120);
  const eventTitle = normalizePromptField(payload.eventTitle || "Professional College Event", 140);
  const clubName = normalizePromptField(payload.clubName || "Student club", 120);
  const venue = normalizePromptField(payload.venue || "College campus", 120);
  const collegeLogoPath = normalizePromptField(payload.collegeLogoPath || "", 180);
  const clubLogoPath = normalizePromptField(payload.clubLogoPath || "", 180);

  return `
Generate ONLY the BACKGROUND artwork for a vertical college event poster (2:3 aspect ratio, 1024x1536 pixels).
Theme: ${theme}.
Style direction: ${style}.
Event focus: ${eventTitle} by ${clubName} at ${venue} in ${collegeName}.
${themeKeywords[theme] || ""}.
${styleKeywords[style] || ""}.

Composition blueprint for overlay compatibility:
- Keep bright, clean top strip with read-safe zones for circular logos (top-left and top-right)
- Keep upper-middle clean headline-safe area for large event title overlay
- Keep lower-middle clean rectangular safe zone for translucent white details card overlay
- Keep bottom strip clean and readable for date, venue, contact footer text overlay
- Concentrate richer visual detail on the right side and lower-right corner
- Keep left and center readable for headline and details overlays

Visual direction:
- Brand assets to accommodate: ${collegeLogoPath || "college logo"} and ${clubLogoPath || "club logo"}
- Abstract futuristic technical graphics, circuit traces, polygon meshes, light data-flow lines, subtle neon accents
- Bright, high-key lighting with rich visual depth and cinematic composition
- Premium quality, sharp details, print-ready composition

STRICT REQUIREMENTS:
- No text, letters, numbers, typography, or readable words in the background image
- No logos, emblems, badges, seals, watermarks
- No signs, posters, banners, UI text, interface panels, infographics
- No people, faces, laptop screens, monitors, keyboards, documents
- No objects that typically carry readable text
- No random characters, symbols, or gibberish
- Pure visual background only - app will overlay its own text and logos
`.trim();
};

const buildFullFlyerPrompt = (payload) => {
  const theme = themes.includes(payload.theme) ? payload.theme : themes[0];
  const style = payload.style || "Minimal Modern";
  const collegeName = normalizePromptField(payload.collegeName || "Pillai College of Engineering", 120);
  const clubName = normalizePromptField(payload.clubName || "Club Name", 120);
  const eventTitle = normalizePromptField(payload.eventTitle || "Professional College Event", 140);
  const date = normalizePromptField(payload.date || "Date: Not specified", 80);
  const time = normalizePromptField(payload.time || "Time: Not specified", 80);
  const venue = normalizePromptField(payload.venue || "Venue: Not specified", 120);
  const details = normalizePromptField(payload.details || "Join us for an exciting event filled with learning, networking, and professional growth opportunities.", 420);
  const summary = normalizePromptField(payload.summary || "Don't miss this opportunity to participate in this exciting event.", 220);
  const contact = normalizePromptField(payload.contactNumbers || "Contact: Not specified", 120);
  const detailLines = toBulletLines(details, 8, 120);
  const detailsBlock = detailLines.length ? detailLines.join("\n") : "- Join us for an exciting professional event";

  return `
Create one COMPLETE vertical college event flyer image with FINAL PRINTED TEXT included in the image.
Theme: ${theme}.
Style: ${style}.
${themeKeywords[theme] || ""}.
${styleKeywords[style] || ""}.

Canvas and quality:
- Portrait 2:3 layout (1536x2304 pixels)
- High contrast, clean typography, strong readability
- Professional poster composition with clear spacing
- Print-ready quality with sharp details

Required layout order - USE EXACT TEXT PROVIDED:
1) Top-center: ${collegeName}
2) Immediately below: ${clubName}
3) Main headline in very large, bold font (show only once): ${eventTitle}
4) Mid section heading (bold): Event Details
5) Mid section body text (clear, readable, normal English only):
${detailsBlock}
6) Near bottom: Date & Time: ${date} ${time}
7) Next line: Venue: ${venue}
8) Next line: Summary: ${summary}
9) Bottom line: Contact: ${contact}

STRICT TEXT REQUIREMENTS:
- Use ONLY clear, meaningful English words provided above
- NO placeholder text like "lorem ipsum" or "dummy text"
- NO random characters, symbols, or gibberish
- NO corrupted or warped typography
- All text must be fully legible and properly spelled
- If a line is long, wrap it across multiple lines with proper spacing
- Never distort, mirror, or reverse letters/text
- Keep one clean details panel in center and clean footer strip at bottom

Design requirements:
- No logos, emblems, badges, seals, or watermarks (except what's overlaid by app)
- Concentrate visual detail mostly on right side and lower-right corner
- Keep center and top-middle areas readable for headline overlays
- Use cinematic composition with premium quality
- No people, faces, laptop screens, monitors, or documents
- No pseudo-text, code fragments, or interface panels in background
`.trim();
};

const buildPollinationsUrl = (baseUrl, prompt, seed, model, options = {}) => {
  const width = Number(options.width) > 0 ? Number(options.width) : FLYER_WIDTH;
  const height = Number(options.height) > 0 ? Number(options.height) : FLYER_HEIGHT;
  const enhance = options.enhance !== false;

  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    nologo: "true",
    enhance: enhance ? "true" : "false",
    private: "true",
    seed: String(seed),
  });

  if (config.pollinationsApiKey) {
    params.set("key", config.pollinationsApiKey);
  }

  return `${baseUrl}/${encodeURIComponent(prompt)}?${params.toString()}`;
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const compactErrorText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

const shouldRetryPollinations = (status, errorText) => {
  const normalized = String(errorText || "").toLowerCase();

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    normalized.includes("queue full") ||
    normalized.includes("overloaded") ||
    normalized.includes("timeout")
  );
};

const isInsufficientBalanceError = (status, errorText) => {
  const normalized = String(errorText || "").toLowerCase();
  return status === 402 && normalized.includes("insufficient balance");
};

const getPollinationsImage = async (prompt, seed, options = {}) => {
  const modelCandidates = Array.isArray(options.modelCandidates) && options.modelCandidates.length
    ? options.modelCandidates
    : POLLINATIONS_MODEL_CANDIDATES;
  const requestOptions = {
    width: Number(options.width) > 0 ? Number(options.width) : FLYER_WIDTH,
    height: Number(options.height) > 0 ? Number(options.height) : FLYER_HEIGHT,
    enhance: options.enhance !== false,
  };
  const errors = [];
  const insufficientBalanceModels = new Set();

  for (const model of modelCandidates) {
    let modelBlockedByBalance = false;

    for (const endpoint of POLLINATIONS_IMAGE_ENDPOINTS) {
      for (let attempt = 1; attempt <= POLLINATIONS_MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
          const response = await fetch(buildPollinationsUrl(endpoint.baseUrl, prompt, seed, model, requestOptions), {
            headers: {
              Accept: "image/*",
              ...(config.pollinationsApiKey
                ? {
                    Authorization: `Bearer ${config.pollinationsApiKey}`,
                  }
                : {}),
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "image/jpeg";
            if (!contentType.startsWith("image/")) {
              const payloadText = compactErrorText(await response.text().catch(() => ""));
              throw new Error(`Pollinations did not return an image. ${payloadText}`.trim());
            }

            const bytes = await response.arrayBuffer();
            const imageBase64 = Buffer.from(bytes).toString("base64");
            return { contentType, imageBase64, modelUsed: model };
          }

          const errorText = compactErrorText(await response.text().catch(() => ""));
          errors.push(`${model} ${endpoint.label} attempt ${attempt}: ${response.status} ${errorText}`.trim());

          if (isInsufficientBalanceError(response.status, errorText)) {
            insufficientBalanceModels.add(model);
            modelBlockedByBalance = true;
            break;
          }

          if (response.status === 401 && !config.pollinationsApiKey) {
            break;
          }

          if (shouldRetryPollinations(response.status, errorText) && attempt < POLLINATIONS_MAX_ATTEMPTS) {
            await wait(700 * attempt + Math.floor(Math.random() * 350));
            continue;
          }

          break;
        } catch (error) {
          clearTimeout(timeoutId);
          const message = compactErrorText(error instanceof Error ? error.message : "Request failed");
          errors.push(`${model} ${endpoint.label} attempt ${attempt}: ${message}`);

          if (attempt < POLLINATIONS_MAX_ATTEMPTS) {
            await wait(700 * attempt + Math.floor(Math.random() * 350));
            continue;
          }

          break;
        }
      }

      if (modelBlockedByBalance) {
        break;
      }
    }
  }

  if (insufficientBalanceModels.size === modelCandidates.length) {
    throw new Error(
      `Insufficient Pollinations balance for configured model candidates (${modelCandidates.join(", "
      )}). Top up pollen or switch to a lower-cost model.`
    );
  }

  const keyHint = config.pollinationsApiKey
    ? ""
    : " Add POLLINATIONS_API_KEY from https://enter.pollinations.ai for better reliability and higher capacity.";

  throw new Error(
    `Pollinations request failed after retries.${keyHint} ${errors.slice(-4).join(" | ")}`.trim()
  );
};

export const generateFlyerConcept = async (payload) => {
  const wantsFullFlyer = payload.aiMode === "full-flyer" || payload.generateFullFlyer === true;
  const prompt = wantsFullFlyer ? buildFullFlyerPrompt(payload) : buildFlyerPrompt(payload);
  const requestOptions = wantsFullFlyer
    ? {
        modelCandidates: POLLINATIONS_FULL_FLYER_MODEL_CANDIDATES,
        width: 1536,
        height: 2304,
        enhance: false,
      }
    : {
        modelCandidates: POLLINATIONS_MODEL_CANDIDATES,
        width: FLYER_WIDTH,
        height: FLYER_HEIGHT,
        enhance: true,
      };
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
    const seed = Number.isFinite(Number(payload.seed)) ? Number(payload.seed) : Math.floor(Math.random() * 10000000);
    const generated = await getPollinationsImage(prompt, seed, requestOptions);

    return {
      prompt,
      provider: wantsFullFlyer ? "pollinations-full-flyer" : "pollinations-image",
      status: "ready",
      layout,
      message: `Generated with Pollinations (${generated.modelUsed}, seed ${seed}).`,
      imageBase64: generated.imageBase64,
      fullFlyerContentType: wantsFullFlyer ? generated.contentType : null,
      fullFlyerBase64: wantsFullFlyer ? generated.imageBase64 : null,
      backgroundContentType: wantsFullFlyer ? null : generated.contentType,
      backgroundBase64: wantsFullFlyer ? null : generated.imageBase64,
    };
  } catch (error) {
    return {
      prompt,
      provider: "prompt-only",
      status: "mocked",
      message: error instanceof Error ? `Pollinations image generation failed. ${error.message}` : "Pollinations image generation failed.",
      layout,
      imageBase64: null,
      fullFlyerBase64: null,
      fullFlyerContentType: null,
      backgroundBase64: null,
      backgroundContentType: null,
    };
  }
};
