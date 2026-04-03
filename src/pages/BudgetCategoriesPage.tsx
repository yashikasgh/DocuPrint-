import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FlaskConical, GraduationCap, Megaphone, PartyPopper, Plus, Trophy, Wrench } from "lucide-react";
import { toast } from "sonner";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
import { fetchBudgetStore, formatBudgetCurrency, persistBudgetStore, StoredBudgetRecord } from "@/lib/budgetStorage";

const iconMap: Record<string, typeof PartyPopper> = {
  Fest: PartyPopper,
  Seminar: GraduationCap,
  Repair: Wrench,
  Research: FlaskConical,
  Infrastructure: Wrench,
  Sports: Trophy,
  Marketing: Megaphone,
  Hospitality: PartyPopper,
};

const BudgetCategoriesPage = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [records, setRecords] = useState<StoredBudgetRecord[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("");
  const [expandedFolderId, setExpandedFolderId] = useState("");

  useEffect(() => {
    const hydrate = async () => {
      const { categories: loadedCategories, records: loadedRecords } = await fetchBudgetStore();
      setCategories(loadedCategories);
      setRecords(loadedRecords);
    };
    hydrate();
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((record) => map.set(record.category, (map.get(record.category) || 0) + 1));
    return map;
  }, [records]);

  const categoryRecords = useMemo(() => {
    const grouped = new Map<string, StoredBudgetRecord[]>();
    records.forEach((record) => {
      grouped.set(record.category, [...(grouped.get(record.category) || []), record]);
    });
    return grouped;
  }, [records]);

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
      setNewCategory("");
      toast.success("Category added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add category.");
    }
  };

  return (
    <BudgetWorkspaceShell
      title="Categories"
      subtitle="Manage budget categories"
      actions={
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="brutal-input min-w-[220px] rounded-[18px]" placeholder="Add new category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          <button onClick={addCategory} className="brutal-btn-primary flex items-center gap-2 py-3">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add New Category
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const Icon = iconMap[category] || PartyPopper;
          const isCategoryExpanded = expandedCategory === category;
          const folders = categoryRecords.get(category) || [];
          return (
            <div
              key={category}
              className={`rounded-[24px] border-2 bg-card p-5 ${isCategoryExpanded ? "border-foreground brutal-shadow" : "border-foreground brutal-shadow-sm"}`}
            >
              <button
                type="button"
                onClick={() => {
                  setExpandedCategory(isCategoryExpanded ? "" : category);
                  setExpandedFolderId("");
                }}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted brutal-border">
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 transition-transform ${isCategoryExpanded ? "rotate-180" : ""}`} strokeWidth={2.4} />
                </div>
                <h3 className="mt-5 text-xl font-bold">{category}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{counts.get(category) || 0} events</p>
              </button>

              {isCategoryExpanded ? (
                <div className="mt-5 space-y-3 border-t border-foreground/10 pt-4">
                  {folders.length > 0 ? (
                    folders.map((record) => {
                      const isFolderExpanded = expandedFolderId === record.id;
                      return (
                      <div key={record.id} className="rounded-[18px] border border-foreground/10 bg-background">
                        <button
                          type="button"
                          onClick={() => setExpandedFolderId(isFolderExpanded ? "" : record.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                        >
                          <div>
                            <p className="font-semibold">{record.title}</p>
                            <p className="text-sm text-muted-foreground">{record.date} | {record.items.length} expenses</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">{formatBudgetCurrency(record.grandTotal)}</p>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isFolderExpanded ? "rotate-180" : ""}`} strokeWidth={2.4} />
                          </div>
                        </button>
                        {isFolderExpanded ? (
                          <div className="border-t border-foreground/10 px-4 py-4">
                            {record.items.length > 0 ? (
                              <div className="space-y-3">
                                {record.items.map((item) => (
                                  <div key={item.id} className="rounded-[14px] border border-foreground/10 bg-card px-4 py-3">
                                    <p className="font-medium">{item.label}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.vendorName || record.vendor}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{item.purchaseDate || record.date} | {item.paymentMethod || record.paymentMethod}</p>
                                    <p className="mt-2 text-sm font-medium">{formatBudgetCurrency(item.amount)}</p>
                                    {item.notes ? <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p> : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No expenses added in this folder yet.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )})
                  ) : (
                    <div className="rounded-[18px] border-2 border-dashed border-foreground/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      No folders found for this category.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </BudgetWorkspaceShell>
  );
};

export default BudgetCategoriesPage;
