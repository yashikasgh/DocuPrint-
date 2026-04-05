import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, LoaderCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const themeOptions = [
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

const styleOptions = [
  "Minimal Modern",
  "Glassmorphism",
  "Corporate",
  "Retro & Vintage",
  "Geometric & Abstract",
  "Futuristic & Technical",
  "Bold Editorial",
  "Neon Cyber",
];
const PCE_DEFAULT_NAME = "Pillai College of Engineering";
const PCE_LOGO_PATH = "/logos/college/pce.png";

const clubLogoOptions = [
  { id: "csi", name: "CSI PCE", logoPath: "/logos/clubs/csi.png" },
  { id: "gdsc", name: "GDSC", logoPath: "/logos/clubs/gdsc.png" },
  { id: "icell", name: "I-CELL", logoPath: "/logos/clubs/icell.png" },
  { id: "ieee", name: "IEEE", logoPath: "/logos/clubs/ieee.png" },
  { id: "nss", name: "NSS", logoPath: "/logos/clubs/nss.png" },
  { id: "swe", name: "SWE", logoPath: "/logos/clubs/swe.png" },
  { id: "tapas", name: "TAPAS", logoPath: "/logos/clubs/tapas.png" },
  { id: "tpc", name: "TPC", logoPath: "/logos/clubs/tpc.png" },
];

const themeBackgrounds: Record<string, string[][]> = {
  Technical: [["/theme/technical/01.jpg", "/theme/technical/01.jpeg"], ["/theme/technical/02.jpg", "/theme/technical/02.jpeg"]],
  Cultural: [["/theme/cultural/01.jpg", "/theme/cultural/01.jpeg"], ["/theme/cultural/02.jpg", "/theme/cultural/02.jpeg"]],
  Gaming: [["/theme/gaming/01.jpg", "/theme/gaming/01.jpeg"], ["/theme/gaming/02.jpg", "/theme/gaming/02.jpeg"]],
  Business: [["/theme/business/01.jpg", "/theme/business/01.jpeg"], ["/theme/business/02.jpg", "/theme/business/02.jpeg"]],
  Hackathon: [["/theme/hackathon/01.jpg", "/theme/hackathon/01.jpeg"], ["/theme/hackathon/02.jpg", "/theme/hackathon/02.jpeg"]],
  Workshop: [["/theme/workshop/01.jpg", "/theme/workshop/01.jpeg"], ["/theme/workshop/02.jpg", "/theme/workshop/02.jpeg"]],
  "AI & Machine Learning": [["/theme/ai-machine-learning/01.jpg", "/theme/ai-machine-learning/01.jpeg"], ["/theme/ai-machine-learning/02.jpg", "/theme/ai-machine-learning/02.jpeg"]],
  Cybersecurity: [["/theme/cybersecurity/01.jpg", "/theme/cybersecurity/01.jpeg"], ["/theme/cybersecurity/02.jpg", "/theme/cybersecurity/02.jpeg"]],
  Robotics: [["/theme/robotics/01.jpg", "/theme/robotics/01.jpeg"], ["/theme/robotics/02.jpg", "/theme/robotics/02.jpeg", "/theme/robotics/02.png"]],
  "Startup & Innovation": [["/theme/startup-innovation/01.jpg", "/theme/startup-innovation/01.jpeg"], ["/theme/startup-innovation/02.jpg", "/theme/startup-innovation/02.jpeg"]],
};

const randomThemeBackground = (theme: string) => {
  const variants = themeBackgrounds[theme] || [];
  if (!variants.length) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

const drawWrappedCenteredText = (
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const words = text.trim().split(/\s+/);
  if (!words.length || !words[0]) {
    return startY;
  }

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const testLine = `${currentLine} ${words[index]}`;
    if (context.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }

  lines.push(currentLine);
  const visibleLines = lines.slice(0, maxLines);

  visibleLines.forEach((line, lineIndex) => {
    context.fillText(line, centerX, startY + lineIndex * lineHeight);
  });

  return startY + visibleLines.length * lineHeight;
};

const setShinyTextStyle = (
  context: CanvasRenderingContext2D,
  fromY: number,
  toY: number,
  shadowOpacity: number,
  shadowBlur: number,
  shadowOffsetY: number
) => {
  const gradient = context.createLinearGradient(0, fromY, 0, toY);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.52, "#eff7ff");
  gradient.addColorStop(1, "#cfe5ff");
  context.fillStyle = gradient;
  context.shadowColor = `rgba(8, 20, 38, ${shadowOpacity})`;
  context.shadowBlur = shadowBlur;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = shadowOffsetY;
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const words = text.trim().split(/\s+/);
  if (!words.length || !words[0]) {
    return startY;
  }

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const testLine = `${currentLine} ${words[index]}`;
    if (context.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }

  lines.push(currentLine);
  const visibleLines = lines.slice(0, maxLines);

  visibleLines.forEach((line, lineIndex) => {
    context.fillText(line, startX, startY + lineIndex * lineHeight);
  });

  return startY + visibleLines.length * lineHeight;
};

const isValidText = (text: string): boolean => {
  if (!text || text.trim().length === 0) return false;
  const words = text.trim().split(/\s+/);
  const randomCharsRegex = /^[^a-z0-9\s]*$/i;
  return words.some((word) => !randomCharsRegex.test(word) && word.length > 1);
};

const getValidatedInput = (input: string, placeholder: string): string => {
  return isValidText(input) ? input : placeholder;
};

const toBulletPoints = (text: string, maxItems = 10) => {
  return text
    .split(/\n|\u2022/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)
    .slice(0, maxItems);
};

const toImageDataUrl = (base64: string, mimeType = "image/png") => `data:${mimeType};base64,${base64}`;

const FlyerGenerator = () => {
  const defaultClub = clubLogoOptions[0];
  const [formData, setFormData] = useState({
    collegeName: PCE_DEFAULT_NAME,
    clubName: defaultClub.name,
    theme: themeOptions[0],
    style: styleOptions[0],
    eventTitle: "",
    date: "",
    time: "",
    venue: "",
    details: "",
    contactNumbers: "",
    summary: "",
    customBackgroundDataUrl: "",
  });
  const [selectedClubId, setSelectedClubId] = useState(defaultClub.id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [composedFlyer, setComposedFlyer] = useState("");
  const [status, setStatus] = useState("");
  const [apiPrompt, setApiPrompt] = useState("");

  const update = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const selectedClub = clubLogoOptions.find((club) => club.id === selectedClubId) || defaultClub;

  const handleClubChange = (clubId: string) => {
    const nextClub = clubLogoOptions.find((club) => club.id === clubId) || defaultClub;
    setSelectedClubId(nextClub.id);
    update("clubName", nextClub.name);
  };

  const setCustomBackground = async (file: File | null) => {
    if (!file) {
      update("customBackgroundDataUrl", "");
      return;
    }

    try {
      update("customBackgroundDataUrl", await fileToDataUrl(file));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to process custom background image.");
    }
  };

  const drawLogo = async (
    context: CanvasRenderingContext2D,
    source: string,
    x: number,
    y: number,
    size: number,
    fallbackLabel: string
  ) => {
    context.save();
    context.shadowColor = "rgba(34, 58, 94, 0.14)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 6;
    context.fillStyle = "rgba(255, 255, 255, 0.98)";
    drawRoundedRect(context, x, y, size, size, size / 2);
    context.fill();
    context.restore();

    if (!source) {
      context.fillStyle = "#34507a";
      context.textAlign = "center";
      context.font = "700 18px 'Space Grotesk', sans-serif";
      context.fillText(fallbackLabel, x + size / 2, y + size / 2 + 6);
      return;
    }

    const logoImage = await loadImage(source);
    const ratio = Math.min((size - 24) / logoImage.width, (size - 24) / logoImage.height);
    const drawWidth = logoImage.width * ratio;
    const drawHeight = logoImage.height * ratio;
    const offsetX = x + (size - drawWidth) / 2;
    const offsetY = y + (size - drawHeight) / 2;
    context.drawImage(logoImage, offsetX, offsetY, drawWidth, drawHeight);
  };

  const composeFlyer = async ({
    backgroundSource,
    overlayOpacity = 0.18,
    renderEventText = true,
    enforceTemplateReadability = false,
  }: {
    backgroundSource?: string | string[] | null;
    overlayOpacity?: number;
    renderEventText?: boolean;
    enforceTemplateReadability?: boolean;
  }) => {
    const width = 1024;
    const height = 1536;
    const centerX = width / 2;
    const detailsCardX = 78;
    const detailsCardY = 560;
    const detailsCardWidth = width - 156;
    const detailsCardHeight = 700;

    const collegeName = formData.collegeName || PCE_DEFAULT_NAME;
    const clubName = formData.clubName || "Club Name";
    const title = formData.eventTitle || "Event Title";

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to initialize flyer renderer.");
    }

    let hasImageBackground = false;

    if (backgroundSource) {
      const sources = Array.isArray(backgroundSource) ? backgroundSource : [backgroundSource];
      for (const source of sources) {
        try {
          const background = await loadImage(source);
          context.drawImage(background, 0, 0, width, height);
          hasImageBackground = true;
          break;
        } catch {
          hasImageBackground = false;
        }
      }
    }

    if (!hasImageBackground) {
      const fallbackGradient = context.createLinearGradient(0, 0, width, height);
      fallbackGradient.addColorStop(0, "#f6fbff");
      fallbackGradient.addColorStop(1, "#f8f4ff");
      context.fillStyle = fallbackGradient;
      context.fillRect(0, 0, width, height);
    }

    if (overlayOpacity > 0) {
      context.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`;
      context.fillRect(0, 0, width, height);
    }

    if (enforceTemplateReadability) {
      const topBand = context.createLinearGradient(0, 0, 0, 330);
      topBand.addColorStop(0, "rgba(255, 255, 255, 0.56)");
      topBand.addColorStop(1, "rgba(255, 255, 255, 0.04)");
      context.fillStyle = topBand;
      context.fillRect(0, 0, width, 330);

      const centerSafe = context.createLinearGradient(0, 0, width * 0.72, 0);
      centerSafe.addColorStop(0, "rgba(255, 255, 255, 0.42)");
      centerSafe.addColorStop(0.75, "rgba(255, 255, 255, 0.14)");
      centerSafe.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = centerSafe;
      context.fillRect(0, 260, width * 0.76, 920);

      context.save();
      context.fillStyle = "rgba(255, 255, 255, 0.22)";
      drawRoundedRect(context, detailsCardX - 12, detailsCardY - 12, detailsCardWidth + 24, detailsCardHeight + 24, 32);
      context.fill();
      context.restore();

      context.fillStyle = "rgba(255, 255, 255, 0.34)";
      drawRoundedRect(context, 52, height - 142, width - 104, 92, 24);
      context.fill();
    }

    context.textAlign = "center";
    context.textBaseline = "alphabetic";

    const logoSize = 104;
    const headerY = 64;

    await drawLogo(context, PCE_LOGO_PATH, 58, headerY, logoSize, "PCE");
    await drawLogo(context, selectedClub.logoPath, width - 58 - logoSize, headerY, logoSize, "CLUB");

    if (!renderEventText) {
      setComposedFlyer(canvas.toDataURL("image/png"));
      return hasImageBackground;
    }

    context.save();
    context.font = "700 42px 'Space Grotesk', sans-serif";
    setShinyTextStyle(context, 70, 220, 0.64, 12, 4);
    drawWrappedCenteredText(context, collegeName, centerX, 112, width - 360, 48, 2);
    context.restore();

    context.save();
    context.font = "700 30px 'Space Grotesk', sans-serif";
    setShinyTextStyle(context, 130, 250, 0.7, 13, 4);
    drawWrappedCenteredText(context, clubName, centerX, 170, width - 360, 36, 2);
    context.restore();

    context.save();
    context.font = "800 86px 'Space Grotesk', sans-serif";
    setShinyTextStyle(context, 250, 540, 0.82, 22, 7);
    drawWrappedCenteredText(context, title, centerX, 332, width - 180, 90, 3);
    context.restore();

    context.save();
    context.shadowColor = "rgba(40, 70, 120, 0.16)";
    context.shadowBlur = 16;
    context.shadowOffsetY = 8;
    context.fillStyle = "rgba(255, 255, 255, 0.78)";
    drawRoundedRect(context, detailsCardX, detailsCardY, detailsCardWidth, detailsCardHeight, 28);
    context.fill();
    context.restore();

    context.fillStyle = "#1b2b47";
    context.textAlign = "left";
    context.font = "700 34px 'Space Grotesk', sans-serif";
    context.fillText("Event Details", detailsCardX + 34, detailsCardY + 58);

    context.fillStyle = "#1f2f4f";
    context.font = "600 24px 'Space Grotesk', sans-serif";

    const detailPoints = toBulletPoints(formData.details || "", 8);
    const summaryPoints = toBulletPoints(formData.summary || "", 6);

    let cursorY = detailsCardY + 118;
    const cardBottomY = detailsCardY + detailsCardHeight;
    const summaryReservedHeight = summaryPoints.length ? 220 : 40;
    const detailsBottomLimit = cardBottomY - summaryReservedHeight;
    const detailsToShow = detailPoints.length ? detailPoints : ["Details will appear here once provided."];

    for (const point of detailsToShow) {
      if (cursorY > detailsBottomLimit - 34) {
        context.fillText("...", detailsCardX + 64, detailsBottomLimit - 10);
        break;
      }

      context.fillText("•", detailsCardX + 38, cursorY);
      const nextCursorY = drawWrappedText(context, point, detailsCardX + 64, cursorY, detailsCardWidth - 92, 38, 3) + 14;

      if (nextCursorY > detailsBottomLimit) {
        context.fillText("...", detailsCardX + 64, detailsBottomLimit - 10);
        break;
      }

      cursorY = nextCursorY;
    }

    if (summaryPoints.length) {
      const summaryTitleY = cardBottomY - 210;
      context.fillStyle = "#294b7f";
      context.font = "700 28px 'Space Grotesk', sans-serif";
      context.fillText("Summary", detailsCardX + 34, summaryTitleY);
      context.fillStyle = "#1f2f4f";
      context.font = "600 24px 'Space Grotesk', sans-serif";
      drawWrappedText(context, summaryPoints.join(". "), detailsCardX + 34, summaryTitleY + 42, detailsCardWidth - 68, 30, 5);
    }

    const contactLine = formData.contactNumbers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" | ");

    const dateTime = [formData.date, formData.time].filter(Boolean).join(" ");
    const footerText = `Date & Time: ${dateTime || "Not specified"}   |   Venue: ${formData.venue || "Not specified"}   |   Contact: ${contactLine || "Not specified"}`;

    context.fillStyle = "rgba(255, 255, 255, 0.82)";
    drawRoundedRect(context, 56, height - 136, width - 112, 84, 20);
    context.fill();

    context.fillStyle = "#223a61";
    context.textAlign = "center";
    context.font = "700 20px 'Space Mono', monospace";
    drawWrappedCenteredText(context, footerText, centerX, height - 88, width - 140, 28, 2);

    setComposedFlyer(canvas.toDataURL("image/png"));
    return hasImageBackground;
  };

  const generateFlyer = async () => {
    setIsGenerating(true);
    setStatus("");
    setComposedFlyer("");
    setApiPrompt("");

    try {
      const selectedThemeBackground = randomThemeBackground(formData.theme);
      const backgroundSource = formData.customBackgroundDataUrl || selectedThemeBackground;
      await composeFlyer({ backgroundSource, overlayOpacity: 0.18 });
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate flyer.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAiFlyer = async () => {
    setIsAiGenerating(true);
    setStatus("");
    setComposedFlyer("");
    setApiPrompt("");

    try {
      const validatedTitle = getValidatedInput(formData.eventTitle, "Professional College Event");
      const validatedDetails = getValidatedInput(
        formData.details,
        "Join us for an exciting event filled with learning, networking, and professional growth opportunities."
      );
      const validatedSummary = getValidatedInput(formData.summary, "Don't miss this opportunity to participate in this exciting event.");

      const result = await api.generateFlyer({
        aiMode: "full-flyer",
        generateFullFlyer: true,
        collegeName: formData.collegeName || PCE_DEFAULT_NAME,
        clubName: formData.clubName,
        theme: formData.theme,
        style: formData.style,
        eventTitle: validatedTitle,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        details: validatedDetails,
        summary: validatedSummary,
        contactNumbers: formData.contactNumbers,
      });

      setApiPrompt(result.prompt || "");

      const aiBackgroundBase64 = result.fullFlyerBase64 || result.imageBase64 || result.backgroundBase64;
      const aiBackgroundContentType = result.fullFlyerContentType || result.backgroundContentType || "image/png";

      if (aiBackgroundBase64) {
        await composeFlyer({
          backgroundSource: toImageDataUrl(aiBackgroundBase64, aiBackgroundContentType),
          overlayOpacity: 0,
          renderEventText: false,
          enforceTemplateReadability: false,
        });
        setStatus(result.message || "AI full flyer generated with Pollinations and logos overlaid.");
        return;
      }

      if (String(result.message || "").toLowerCase().includes("insufficient pollinations balance")) {
        setStatus("Pollinations balance is low, so the AI full-flyer could not be generated. Top up pollen and try Generate AI Flyer again.");
        return;
      }

      setStatus(result.message || "Pollinations did not return an image for this request.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate AI flyer.";

      if (message.toLowerCase().includes("insufficient pollinations balance")) {
        setStatus("Pollinations balance is low, so the AI full-flyer could not be generated. Top up pollen and try Generate AI Flyer again.");
        return;
      }

      setStatus(message);
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header className="mb-8 flex items-center justify-between" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">Flyer Generator</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={generateFlyer} className="brutal-btn-primary flex items-center gap-2 py-2" disabled={isGenerating || isAiGenerating}>
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Sparkles className="h-4 w-4" strokeWidth={3} />}
            Generate Poster
          </button>
          <button onClick={generateAiFlyer} className="brutal-btn-outline flex items-center gap-2 px-4 py-2 text-xs" disabled={isGenerating || isAiGenerating}>
            {isAiGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Sparkles className="h-4 w-4" strokeWidth={3} />}
            Generate AI Flyer
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
        <motion.div className="space-y-4" initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">College Name</label>
              <input className="brutal-input" value={formData.collegeName} onChange={(event) => update("collegeName", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Club</label>
              <select className="brutal-input" value={selectedClubId} onChange={(event) => handleClubChange(event.target.value)}>
                {clubLogoOptions.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Custom Background (Optional)</label>
            <input className="brutal-input" type="file" accept="image/*" onChange={(event) => setCustomBackground(event.target.files?.[0] || null)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Theme</label>
              <select className="brutal-input" value={formData.theme} onChange={(event) => update("theme", event.target.value)}>
                {themeOptions.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Style</label>
              <select className="brutal-input" value={formData.style} onChange={(event) => update("style", event.target.value)}>
                {styleOptions.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Event Title</label>
            <input className="brutal-input" value={formData.eventTitle} onChange={(event) => update("eventTitle", event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Date</label>
              <input className="brutal-input" value={formData.date} onChange={(event) => update("date", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Time</label>
              <input className="brutal-input" value={formData.time} onChange={(event) => update("time", event.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Venue</label>
              <input className="brutal-input" value={formData.venue} onChange={(event) => update("venue", event.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Contact Numbers</label>
            <input className="brutal-input" placeholder="9876543210, 9123456780" value={formData.contactNumbers} onChange={(event) => update("contactNumbers", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Details</label>
            <textarea className="brutal-input min-h-[110px] resize-y" value={formData.details} onChange={(event) => update("details", event.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider">Short Summary</label>
            <textarea className="brutal-input min-h-[90px] resize-y" value={formData.summary} onChange={(event) => update("summary", event.target.value)} />
          </div>

          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </motion.div>

        <motion.div initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="rounded-2xl bg-card/60 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider">Poster Preview</p>
            {composedFlyer ? (
              <img src={composedFlyer} alt="Generated flyer poster" className="w-full rounded-xl object-cover" />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-muted/50 px-4 text-center text-sm text-muted-foreground">
                Generate poster to preview modern flyer layout with logos, title, details card, and footer metadata.
              </div>
            )}

            {composedFlyer ? (
              <a href={composedFlyer} download="event-flyer.png" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Download className="h-4 w-4" strokeWidth={2.5} />
                Download Poster
              </a>
            ) : null}

            {apiPrompt ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider">Prompt Sent To API</p>
                <pre className="max-h-48 overflow-auto rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">{apiPrompt}</pre>
              </div>
            ) : null}
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default FlyerGenerator;
