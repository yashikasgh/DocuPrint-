import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
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
import {
  EXPENSE_TYPES,
  PAYMENT_METHODS,
  StoredBudgetRecord,
  fetchBudgetStore,
  formatBudgetCurrency,
  persistBudgetStore,
} from "@/lib/budgetStorage";

type ExpenseForm = {
  title: string;
  amount: string;
  purchaseDate: string;
  paymentMethod: string;
  vendorName: string;
  notes: string;
  expenseType: string;
  folderId: string;
};

const emptyExpense = (): ExpenseForm => ({
  title: "",
  amount: "",
  purchaseDate: "",
  paymentMethod: PAYMENT_METHODS[0],
  vendorName: "",
  notes: "",
  expenseType: EXPENSE_TYPES[0],
  folderId: "",
});

const BudgetPlannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<StoredBudgetRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [folderTitle, setFolderTitle] = useState("");
  const [folderCategory, setFolderCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [expectedBudget, setExpectedBudget] = useState("");
  const [description, setDescription] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState("");
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense());
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState("");

  useEffect(() => {
    const hydrate = async () => {
      const { categories: loadedCategories, records: loadedRecords } = await fetchBudgetStore();
      const draftId = searchParams.get("draft") || "";
      const draft = loadedRecords.find((record) => record.id === draftId);

      setCategories(loadedCategories);
      setRecords(loadedRecords);
      setFolderCategory(draft?.category || loadedCategories[0] || "Fest");
      setCurrentDraftId(draft?.id || "");
      setFolderTitle(draft?.title || "");
      setExpectedBudget(draft?.expectedBudget ? String(draft.expectedBudget) : "");
      setDescription(draft?.description || "");
      setExpenseForm((current) => ({
        ...current,
        folderId: draft?.id || loadedRecords[0]?.id || "",
      }));
    };

    hydrate();
  }, [searchParams]);

  const availableFolders = useMemo(() => records, [records]);

  const selectedFolder = useMemo(
    () => availableFolders.find((record) => record.id === (expenseForm.folderId || currentDraftId)) || null,
    [availableFolders, currentDraftId, expenseForm.folderId]
  );

  const todayLabel = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const todaysExpenses = useMemo(
    () =>
      records.flatMap((record) =>
        record.items
          .filter((item) => {
            if (!item.purchaseDate) return false;
            const normalized = new Date(item.purchaseDate).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
            return normalized === todayLabel;
          })
          .map((item) => ({
            ...item,
            folderTitle: record.title,
          }))
      ),
    [records, todayLabel]
  );

  const addCategory = async () => {
    const value = newCategory.trim();
    if (!value) {
      toast.error("Enter a category name first.");
      return;
    }
    const updated = Array.from(new Set([...categories, value]));
    try {
      const store = await persistBudgetStore(records, updated);
      setCategories(store.categories);
      setRecords(store.records);
      setFolderCategory(value);
      setNewCategory("");
      toast.success("Category added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add category.");
    }
  };

  const buildDraftRecord = (): StoredBudgetRecord => ({
    id: currentDraftId || `${Date.now()}`,
    title: folderTitle || "Untitled Folder",
    vendor: selectedFolder?.vendor || "Pending vendor",
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    category: folderCategory || categories[0] || "Fest",
    paymentMethod: selectedFolder?.paymentMethod || PAYMENT_METHODS[0],
    receiptId: currentDraftId ? `BGT-${currentDraftId}` : `BGT-${Date.now()}`,
    description,
    expectedBudget: Number(expectedBudget || 0),
    items: currentDraftId ? selectedFolder?.items || [] : [],
    subtotal: currentDraftId ? selectedFolder?.subtotal || 0 : 0,
    taxTotal: currentDraftId ? selectedFolder?.taxTotal || 0 : 0,
    discount: currentDraftId ? selectedFolder?.discount || 0 : 0,
    grandTotal: currentDraftId ? selectedFolder?.grandTotal || 0 : 0,
    isDraft: true,
  });

  const saveFolder = async () => {
    if (!folderTitle.trim()) {
      toast.error("Enter a folder name before saving.");
      return;
    }

    const record = buildDraftRecord();
    const updated = currentDraftId
      ? records.map((entry) => (entry.id === currentDraftId ? { ...entry, ...record } : entry))
      : [record, ...records];

    try {
      const store = await persistBudgetStore(updated, categories);
      setRecords(store.records);
      setCategories(store.categories);
      setCurrentDraftId(record.id);
      setExpenseForm((current) => ({ ...current, folderId: record.id }));
      setSearchParams({ draft: record.id });
      toast.success("Folder saved. You can add expenses later.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save folder.");
    }
  };

  const addExpenseToFolder = async () => {
    const targetFolderId = expenseForm.folderId || currentDraftId;
    if (!targetFolderId) {
      toast.error("Create or select a folder first.");
      return;
    }
    if (!expenseForm.title.trim() || !expenseForm.amount) {
      toast.error("Enter the expense title and amount.");
      return;
    }

    const updated = records.map((record) => {
      if (record.id !== targetFolderId) {
        return record;
      }

      const unitPrice = Number(expenseForm.amount || 0);
      const tax = Number((unitPrice * 0.08).toFixed(2));
      const amount = Number((unitPrice + tax).toFixed(2));

      const newItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: expenseForm.title,
        quantity: 1,
        unitPrice,
        tax,
        amount,
        notes: expenseForm.notes,
        expenseType: expenseForm.expenseType,
        vendorName: expenseForm.vendorName,
        purchaseDate: expenseForm.purchaseDate,
        paymentMethod: expenseForm.paymentMethod,
        expenseId: `EXP-${Date.now()}`,
      };

      const items = [...record.items, newItem];
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice, 0);
      const taxTotal = items.reduce((sum, item) => sum + item.tax, 0);
      const grandTotal = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        ...record,
        vendor: expenseForm.vendorName || record.vendor,
        paymentMethod: expenseForm.paymentMethod || record.paymentMethod,
        items,
        subtotal,
        taxTotal,
        grandTotal,
        isDraft: false,
      };
    });

    try {
      const store = await persistBudgetStore(updated, categories);
      setRecords(store.records);
      setCategories(store.categories);
      setExpenseForm(() => ({ ...emptyExpense(), folderId: targetFolderId }));
      toast.success("Expense added to the selected folder.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add expense.");
    }
  };

  const deleteExpenseFromFolder = async () => {
    if (!pendingDeleteExpenseId || !selectedFolder) {
      return;
    }

    const updated = records.map((record) => {
      if (record.id !== selectedFolder.id) return record;
      const items = record.items.filter((item) => item.id !== pendingDeleteExpenseId);
      return {
        ...record,
        items,
        subtotal: items.reduce((sum, item) => sum + item.unitPrice, 0),
        taxTotal: items.reduce((sum, item) => sum + item.tax, 0),
        grandTotal: items.reduce((sum, item) => sum + item.amount, 0),
      };
    });

    try {
      const store = await persistBudgetStore(updated, categories);
      setRecords(store.records);
      setCategories(store.categories);
      setPendingDeleteExpenseId("");
      toast.success("Expense deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete expense.");
    }
  };

  return (
    <BudgetWorkspaceShell
      title="Create Budget"
      subtitle="Add expenses into folders, save folders separately, and track today's spend"
      actions={
        <div className="flex gap-2">
          <Link to="/dashboard" className="brutal-btn-outline py-3 px-4 flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <button onClick={saveFolder} className="brutal-btn-outline py-3">
            {currentDraftId ? "Update Folder" : "Save Folder"}
          </button>
        </div>
      }
    >
      <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Add Expense</h2>
            <p className="text-sm text-muted-foreground">Add an expense directly into any saved folder.</p>
          </div>
          <button onClick={addExpenseToFolder} className="brutal-btn-primary flex items-center gap-2 py-3">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Add Expense
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Expense Title</label>
            <input className="brutal-input rounded-[16px]" value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} placeholder="Stage lights" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Amount</label>
            <input className="brutal-input rounded-[16px]" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} placeholder="25000" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Date</label>
            <input type="date" className="brutal-input rounded-[16px]" value={expenseForm.purchaseDate} onChange={(event) => setExpenseForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Payment</label>
            <select className="brutal-input rounded-[16px]" value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
              {PAYMENT_METHODS.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Vendor Type</label>
            <input className="brutal-input rounded-[16px]" value={expenseForm.vendorName} onChange={(event) => setExpenseForm((current) => ({ ...current, vendorName: event.target.value }))} placeholder="Vendor / supplier" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <input className="brutal-input rounded-[16px]" value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Expense Type</label>
            <select className="brutal-input rounded-[16px]" value={expenseForm.expenseType} onChange={(event) => setExpenseForm((current) => ({ ...current, expenseType: event.target.value }))}>
              {EXPENSE_TYPES.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Folder</label>
            <select className="brutal-input rounded-[16px]" value={expenseForm.folderId} onChange={(event) => setExpenseForm((current) => ({ ...current, folderId: event.target.value }))}>
              <option value="">Select folder</option>
              {availableFolders.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
        <h2 className="text-xl font-bold">Create Folder</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create and save a folder separately for another day.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Folder Name</label>
            <input className="brutal-input rounded-[16px]" value={folderTitle} onChange={(event) => setFolderTitle(event.target.value)} placeholder="Alegria 2026" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Expected Budget</label>
            <input className="brutal-input rounded-[16px]" value={expectedBudget} onChange={(event) => setExpectedBudget(event.target.value)} placeholder="100000" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select className="brutal-input rounded-[16px]" value={folderCategory} onChange={(event) => setFolderCategory(event.target.value)}>
              {categories.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Add New Category</label>
            <div className="flex gap-3">
              <input className="brutal-input rounded-[16px]" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" />
              <button onClick={addCategory} className="brutal-btn-outline px-4">Add</button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea className="brutal-input min-h-[120px] rounded-[16px] resize-none" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the event or budget folder..." />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase">Selected Folder Expenses</h2>
            <span className="text-sm text-muted-foreground">{selectedFolder?.title || "No folder selected"}</span>
          </div>
          {selectedFolder && selectedFolder.items.length > 0 ? (
            <div className="space-y-3">
              {selectedFolder.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-[18px] border border-foreground/10 bg-background px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.vendorName || "Vendor pending"} | {item.paymentMethod || selectedFolder.paymentMethod}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{formatBudgetCurrency(item.amount)}</p>
                      <p className="text-sm text-muted-foreground">{item.purchaseDate || selectedFolder.date}</p>
                    </div>
                    <button onClick={() => setPendingDeleteExpenseId(item.id)} className="brutal-btn-outline px-3 py-2 text-destructive">
                      <Trash2 className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
              No expenses in the selected folder yet.
            </div>
          )}
        </div>

        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <h2 className="text-lg font-bold uppercase">Today's Expenditure</h2>
          {todaysExpenses.length > 0 ? (
            <div className="mt-4 space-y-3">
              {todaysExpenses.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-foreground/10 bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.folderTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatBudgetCurrency(item.amount)}</p>
                      <p className="text-sm text-muted-foreground">{item.vendorName || "Vendor pending"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border-2 border-dashed border-foreground/20 px-5 py-10 text-center text-sm text-muted-foreground">
              No expenditure recorded for today yet.
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingDeleteExpenseId} onOpenChange={(open) => !open && setPendingDeleteExpenseId("")}>
        <AlertDialogContent className="rounded-[24px] border-2 border-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the expense from the currently selected folder.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteExpenseFromFolder}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BudgetWorkspaceShell>
  );
};

export default BudgetPlannerPage;
