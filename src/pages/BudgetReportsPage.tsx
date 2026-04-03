import { useEffect, useState } from "react";
import { Download, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
import { createBudgetPdfObjectUrl, exportBudgetExcel, exportBudgetPdf } from "@/lib/budgetExports";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchBudgetStore, StoredBudgetRecord, formatBudgetCurrency } from "@/lib/budgetStorage";

const BudgetReportsPage = () => {
  const [records, setRecords] = useState<StoredBudgetRecord[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    const hydrate = async () => {
      const { records: loadedRecords } = await fetchBudgetStore();
      setRecords(loadedRecords);
    };
    hydrate();
  }, []);

  return (
    <BudgetWorkspaceShell
      title="Reports"
      subtitle="Export budget data as PDF or Excel"
      actions={
        <>
          <button
            onClick={async () => {
              await exportBudgetPdf(records);
              toast.success("PDF report downloaded.");
            }}
            className="brutal-btn-primary flex items-center gap-2 py-3"
          >
            <FileText className="h-4 w-4" strokeWidth={2.4} />
            Export PDF
          </button>
          <button
            onClick={async () => {
              await exportBudgetExcel(records);
              toast.success("Excel report downloaded.");
            }}
            className="brutal-btn-outline flex items-center gap-2 py-3"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={2.4} />
            Export Excel
          </button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {records.map((record) => (
          <div key={record.id} className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{record.title} Report</h3>
                <p className="mt-2 text-sm text-muted-foreground">{record.date} | {formatBudgetCurrency(record.grandTotal)}</p>
              </div>
              <span className="rounded-full border border-foreground/20 px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">{record.category}</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {record.description || `This report includes ${record.items.length} expense entries and a total spend of ${formatBudgetCurrency(record.grandTotal)}.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  const url = await createBudgetPdfObjectUrl([record], `${record.title} Budget Report`);
                  setPreviewUrl(url);
                  setPreviewTitle(`${record.title} Report Preview`);
                }}
                className="brutal-btn-outline flex items-center gap-2 px-4 py-3"
              >
                <Eye className="h-4 w-4" strokeWidth={2.4} />
                Preview
              </button>
              <button
                onClick={async () => {
                  await exportBudgetPdf([record], `${record.title} Budget Report`);
                  toast.success(`${record.title} report exported.`);
                }}
                className="brutal-btn-outline flex items-center gap-2 px-4 py-3"
              >
                <Download className="h-4 w-4" strokeWidth={2.4} />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open && previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
            setPreviewTitle("");
          }
        }}
      >
        <DialogContent className="max-w-6xl rounded-[24px] border-2 border-foreground bg-card p-0">
          <DialogHeader className="border-b border-foreground/10 px-6 py-4">
            <DialogTitle className="text-xl font-bold">{previewTitle}</DialogTitle>
          </DialogHeader>
          {previewUrl ? <iframe title={previewTitle} src={previewUrl} className="h-[78vh] w-full rounded-b-[24px]" /> : null}
        </DialogContent>
      </Dialog>
    </BudgetWorkspaceShell>
  );
};

export default BudgetReportsPage;
