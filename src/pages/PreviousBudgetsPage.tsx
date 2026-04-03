import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit3, FolderKanban, IndianRupee, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StoredBudgetRecord, fetchBudgetStore, formatBudgetCurrency, persistBudgetStore } from "@/lib/budgetStorage";

const PreviousBudgetsPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StoredBudgetRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [amountFilter, setAmountFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = useState("");
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const { records: loadedRecords, categories: loadedCategories } = await fetchBudgetStore();
      setRecords(loadedRecords);
      setCategories(loadedCategories);
      setSelectedRecordId(loadedRecords[0]?.id || "");
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const searchMatch =
          !search ||
          record.title.toLowerCase().includes(search.toLowerCase()) ||
          record.vendor.toLowerCase().includes(search.toLowerCase());
        const categoryMatch = category === "All" || record.category === category;
        const amountMatch = !amountFilter || record.grandTotal >= Number(amountFilter);
        const dateMatch = !dateFilter || record.date.toLowerCase().includes(dateFilter.toLowerCase());
        return searchMatch && categoryMatch && amountMatch && dateMatch;
      }),
    [amountFilter, category, dateFilter, records, search]
  );

  const selected = filtered.find((record) => record.id === selectedRecordId) || filtered[0];

  const removeRecord = async (recordId: string) => {
    const updated = records.filter((record) => record.id !== recordId);
    try {
      const store = await persistBudgetStore(updated, categories);
      setRecords(store.records);
      setCategories(store.categories);
      setSelectedRecordId(store.records[0]?.id || "");
      setPendingDeleteRecordId("");
      setIsDetailsOpen(false);
      toast.success("Budget folder deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete budget folder.");
    }
  };

  const removeExpense = async (recordId: string, expenseId: string) => {
    const updated = records.map((record) =>
      record.id !== recordId
        ? record
        : {
            ...record,
            items: record.items.filter((item) => item.id !== expenseId),
          }
    );
    try {
      const store = await persistBudgetStore(updated, categories);
      setRecords(store.records);
      setCategories(store.categories);
      setPendingDeleteExpenseId("");
      toast.success("Expense deleted from folder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete expense.");
    }
  };

  if (loading) {
    return (
      <BudgetWorkspaceShell title="History" subtitle="Previous expenditures">
        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-[24px]" />
          ))}
        </div>
      </BudgetWorkspaceShell>
    );
  }

  return (
    <BudgetWorkspaceShell title="History" subtitle="Previous expenditures and events">
      <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_180px]">
        <div className="flex items-center gap-3 rounded-[24px] border-2 border-foreground bg-card px-4 py-3 brutal-shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Search events..." />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="brutal-input rounded-[20px]">
          <option value="All">All Categories</option>
          {categories.map((entry) => (
            <option key={entry}>{entry}</option>
          ))}
        </select>
        <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="brutal-input rounded-[20px]" placeholder="Date filter" />
        <input value={amountFilter} onChange={(event) => setAmountFilter(event.target.value)} className="brutal-input rounded-[20px]" placeholder="Min amount" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[24px] border-2 border-dashed border-foreground/20 bg-card px-6 py-16 text-center brutal-shadow-sm">
          <p className="text-lg font-semibold">No matching budgets found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try another search term or remove a filter.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {filtered.map((record) => (
              <button
                key={record.id}
                onClick={() => {
                  setSelectedRecordId(record.id);
                  setIsDetailsOpen(true);
                }}
                className={`rounded-[24px] border-2 p-5 text-left transition-all ${selected?.id === record.id ? "border-foreground bg-card brutal-shadow" : "border-foreground/15 bg-card brutal-shadow-sm"}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary brutal-border">
                    <FolderKanban className="h-5 w-5 text-primary-foreground" strokeWidth={2.3} />
                  </div>
                  <span className="rounded-full border border-foreground/20 px-3 py-1 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">{record.category}</span>
                </div>
                <h3 className="text-xl font-bold">{record.title}</h3>
                <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
                    <span>{record.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" strokeWidth={2.2} />
                    <span>{formatBudgetCurrency(record.grandTotal)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground">{selected.description || "Detailed expense view for this event."}</p>
                </div>
                <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground md:items-end">
                  <span>{selected.vendor}</span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate(`/generate/budget/create?draft=${selected.id}`)} className="brutal-btn-outline flex items-center gap-2 px-4 py-2 text-xs">
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={2.3} />
                      Edit
                    </button>
                    <button onClick={() => setPendingDeleteRecordId(selected.id)} className="brutal-btn-outline flex items-center gap-2 px-4 py-2 text-xs text-destructive">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                      Delete
                    </button>
                    <button onClick={() => setIsDetailsOpen(true)} className="brutal-btn-outline px-4 py-2 text-xs">
                      Open Detailed View
                    </button>
                  </div>
                </div>
              </div>

              {selected.items.length === 0 ? (
                <div className="rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
                  This folder has no expenses yet. Open the draft and add expenses later.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10">
                        {["Expense Title", "Amount", "Date", "Payment Method", "Expense ID"].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                    {selected.items.map((item) => (
                      <tr key={item.id} className="border-b border-foreground/8 last:border-none">
                        <td className="px-4 py-4">{item.label}</td>
                        <td className="px-4 py-4 font-semibold">{formatBudgetCurrency(item.amount)}</td>
                        <td className="px-4 py-4">{item.purchaseDate || selected.date}</td>
                        <td className="px-4 py-4">{item.paymentMethod || selected.paymentMethod}</td>
                          <td className="px-4 py-4">{item.expenseId || item.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      <Dialog open={isDetailsOpen && !!selected} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-5xl rounded-[24px] border-2 border-foreground bg-card p-0">
          {selected ? (
            <>
              <DialogHeader className="border-b border-foreground/10 px-6 py-5">
                <DialogTitle className="text-2xl font-bold">{selected.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {selected.description || "Detailed expenditure table"} | {selected.category} | {selected.vendor}
                </DialogDescription>
              </DialogHeader>

              {selected.items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No expenses have been added to this folder yet.
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-auto px-6 py-5">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10">
                        {["Expense Title", "Amount", "Date", "Payment Method", "Expense ID", "Vendor", "Notes", "Action"].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item) => (
                        <tr key={item.id} className="border-b border-foreground/8 last:border-none">
                          <td className="px-4 py-4">{item.label}</td>
                          <td className="px-4 py-4 font-semibold">{formatBudgetCurrency(item.amount)}</td>
                          <td className="px-4 py-4">{item.purchaseDate || selected.date}</td>
                          <td className="px-4 py-4">{item.paymentMethod || selected.paymentMethod}</td>
                          <td className="px-4 py-4">{item.expenseId || item.id}</td>
                          <td className="px-4 py-4">{item.vendorName || selected.vendor}</td>
                          <td className="px-4 py-4">{item.notes || "--"}</td>
                          <td className="px-4 py-4">
                            <button onClick={() => setPendingDeleteExpenseId(item.id)} className="brutal-btn-outline px-3 py-2 text-xs text-destructive">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteRecordId} onOpenChange={(open) => !open && setPendingDeleteRecordId("")}>
        <AlertDialogContent className="rounded-[24px] border-2 border-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget folder?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the selected budget history entry and all expenses inside it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeRecord(pendingDeleteRecordId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteExpenseId} onOpenChange={(open) => !open && setPendingDeleteExpenseId("")}>
        <AlertDialogContent className="rounded-[24px] border-2 border-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the expense from the selected folder history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected && removeExpense(selected.id, pendingDeleteExpenseId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BudgetWorkspaceShell>
  );
};

export default PreviousBudgetsPage;
