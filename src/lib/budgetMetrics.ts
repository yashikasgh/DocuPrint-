import { StoredBudgetRecord } from "@/lib/budgetStorage";

export const getBudgetTotals = (records: StoredBudgetRecord[]) => {
  const totalBudget = records.reduce((sum, record) => sum + (record.expectedBudget || record.grandTotal), 0);
  const totalSpent = records.reduce((sum, record) => sum + record.grandTotal, 0);
  const remainingBalance = totalBudget - totalSpent;
  const upcomingEvents = records.length;

  return {
    totalBudget,
    totalSpent,
    remainingBalance,
    upcomingEvents,
  };
};

export const getCategorySpend = (records: StoredBudgetRecord[]) => {
  const map = new Map<string, number>();
  records.forEach((record) => {
    map.set(record.category, (map.get(record.category) || 0) + record.grandTotal);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
};

export const getMonthlyExpenses = (records: StoredBudgetRecord[]) => {
  const map = new Map<string, number>();
  records.forEach((record) => {
    const label = record.date.slice(0, 6).replace(" ", " ");
    map.set(label, (map.get(label) || 0) + record.grandTotal);
  });
  return Array.from(map.entries()).map(([month, spent]) => ({ month, spent }));
};

export const getRecentActivity = (records: StoredBudgetRecord[]) =>
  records
    .flatMap((record) =>
      record.items.map((item) => ({
        id: item.id,
        title: item.label,
        meta: `${record.title} • ${item.vendorName || record.vendor}`,
        amount: item.amount,
        date: item.purchaseDate || record.date,
        category: record.category,
      }))
    )
    .slice(0, 6);

export const getCategoryInsights = (records: StoredBudgetRecord[]) => {
  const categorySpend = getCategorySpend(records);
  const highest = [...categorySpend].sort((a, b) => b.value - a.value)[0];
  const overspending = records
    .filter((record) => (record.expectedBudget || 0) > 0 && record.grandTotal > (record.expectedBudget || 0))
    .sort((a, b) => b.grandTotal - (b.expectedBudget || 0) - (a.grandTotal - (a.expectedBudget || 0)));

  return {
    highest,
    overspending,
  };
};
