import { useEffect, useState } from "react";
import { Download, Eye, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
import { api, base64PdfToObjectUrl, downloadBase64Pdf } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBudgetStore, formatBudgetCurrency, StoredBudgetRecord } from "@/lib/budgetStorage";
import { COLLEGE_BRAND } from "@/lib/clubs";

type EstimateResponse = {
  summary?: string;
  estimatedTotal?: number;
  estimatedTotalFormatted?: string;
  breakdown?: Array<{ label: string; amount: number; amountFormatted: string }>;
  recommendations?: string[];
};

const BudgetEstimationPage = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [history, setHistory] = useState<StoredBudgetRecord[]>([]);
  const [eventType, setEventType] = useState("");
  const [attendees, setAttendees] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const hydrate = async () => {
      const { categories: loadedCategories, records: loadedRecords } = await fetchBudgetStore();
      setCategories(loadedCategories);
      setHistory(loadedRecords);
      setEventType(loadedCategories[0] || "Fest");
    };
    hydrate();
  }, []);

  const generateEstimate = async () => {
    if (!eventType || !attendees) {
      toast.error("Select event type and number of people.");
      return;
    }
    setIsLoading(true);
    try {
      const response = (await api.estimateBudget({
        eventType,
        attendees: Number(attendees),
        history,
      })) as EstimateResponse;
      setEstimate(response);
      toast.success("Estimation generated from previous events.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Estimation failed.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const createEstimatePdf = async () => {
    if (!estimate) {
      return null;
    }
    const collegeLogo = await resolveLogoAsset(COLLEGE_BRAND.logoBasePath);
    return api.generateBudgetEstimation({
      collegeName: COLLEGE_BRAND.name,
      collegeAddress: COLLEGE_BRAND.address,
      collegeAcronym: COLLEGE_BRAND.acronym,
      collegeBrandColor: COLLEGE_BRAND.hex,
      collegeLogo,
      date: new Date().toISOString(),
      title: "Budget Estimation Report",
      eventType,
      attendees,
      summary: estimate.summary,
      estimatedTotalFormatted: estimate.estimatedTotalFormatted || formatBudgetCurrency(estimate.estimatedTotal || 0),
      breakdown: estimate.breakdown || [],
      recommendations: estimate.recommendations || [],
    });
  };

  const previewEstimatePdf = async () => {
    if (!estimate) {
      toast.error("Generate an estimate first.");
      return;
    }
    const response = await createEstimatePdf();
    if (!response) {
      return;
    }
    const url = base64PdfToObjectUrl(response.pdfBase64);
    setPreviewUrl(url);
  };

  const exportEstimatePdf = async () => {
    if (!estimate) {
      toast.error("Generate an estimate first.");
      return;
    }
    const response = await createEstimatePdf();
    if (!response) {
      return;
    }
    downloadBase64Pdf(response.pdfBase64, response.fileName || `budget-estimate-${eventType.toLowerCase()}-${attendees}.pdf`);
    toast.success("Estimation PDF exported.");
  };

  return (
    <BudgetWorkspaceShell
      title="Estimation"
      subtitle="Estimate new event budgets using previous event history and attendee count"
      actions={
        <>
          <button onClick={generateEstimate} className="brutal-btn-primary flex items-center gap-2 py-3" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.4} /> : null}
            Generate Estimate
          </button>
          <button onClick={previewEstimatePdf} className="brutal-btn-outline flex items-center gap-2 py-3">
            <Eye className="h-4 w-4" strokeWidth={2.4} />
            Preview PDF
          </button>
          <button onClick={exportEstimatePdf} className="brutal-btn-outline flex items-center gap-2 py-3">
            <Download className="h-4 w-4" strokeWidth={2.4} />
            Export PDF
          </button>
        </>
      }
    >
      <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Event Type</label>
            <select className="brutal-input rounded-[16px]" value={eventType} onChange={(event) => setEventType(event.target.value)}>
              {categories.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Number of People</label>
            <input className="brutal-input rounded-[16px]" value={attendees} onChange={(event) => setAttendees(event.target.value)} placeholder="200" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <h2 className="text-lg font-bold uppercase">Estimate Summary</h2>
          {estimate ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">{estimate.summary}</p>
              <div className="rounded-[18px] border border-foreground/10 bg-background px-4 py-4">
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="mt-2 text-3xl font-bold">{estimate.estimatedTotalFormatted || formatBudgetCurrency(estimate.estimatedTotal || 0)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
              Generate an estimate to see AI-backed suggestions from previous events.
            </div>
          )}
        </div>

        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <h2 className="text-lg font-bold uppercase">Suggested Breakdown</h2>
          {estimate?.breakdown?.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {estimate.breakdown.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-foreground/10 bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold">{item.amountFormatted}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
              No breakdown yet.
            </div>
          )}

          {estimate?.recommendations?.length ? (
            <div className="mt-5 space-y-2">
              {estimate.recommendations.map((entry) => (
                <div key={entry} className="rounded-[16px] border border-foreground/10 bg-background px-4 py-3 text-sm text-muted-foreground">
                  {entry}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
        <h2 className="text-lg font-bold uppercase">Notes From Previous Budgets</h2>
        {estimate?.recommendations?.length ? (
          <div className="mt-4 space-y-3">
            {estimate.recommendations.map((entry) => (
              <p key={entry} className="rounded-[16px] border border-foreground/10 bg-background px-4 py-3 text-sm text-muted-foreground">
                {entry}
              </p>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
            Generate an estimate to see notes and suggestions from previous events.
          </div>
        )}
      </div>

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open && previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
          }
        }}
      >
        <DialogContent className="max-w-5xl rounded-[24px] border-2 border-foreground bg-card p-0">
          <DialogHeader className="border-b border-foreground/10 px-6 py-4">
            <DialogTitle className="text-xl font-bold">Estimation PDF Preview</DialogTitle>
          </DialogHeader>
          {previewUrl ? <iframe title="Estimation PDF Preview" src={previewUrl} className="h-[76vh] w-full rounded-b-[24px]" /> : null}
        </DialogContent>
      </Dialog>
    </BudgetWorkspaceShell>
  );
};

export default BudgetEstimationPage;
