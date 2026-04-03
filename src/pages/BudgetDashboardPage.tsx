import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarClock, Wallet, WalletCards } from "lucide-react";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";
import BudgetWorkspaceShell from "@/components/BudgetWorkspaceShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBudgetStore, StoredBudgetRecord, formatBudgetCurrency } from "@/lib/budgetStorage";
import { getBudgetTotals, getCategorySpend, getMonthlyExpenses, getRecentActivity } from "@/lib/budgetMetrics";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#111111", "#757575", "#e67e22", "#0f766e", "#d97706"];

const BudgetDashboardPage = () => {
  const [records, setRecords] = useState<StoredBudgetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const { records: loadedRecords } = await fetchBudgetStore();
      setRecords(loadedRecords);
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const totals = useMemo(() => getBudgetTotals(records), [records]);
  const categoryData = useMemo(() => getCategorySpend(records), [records]);
  const monthlyData = useMemo(() => getMonthlyExpenses(records), [records]);
  const activity = useMemo(() => getRecentActivity(records), [records]);

  const summary = [
    { label: "Total Budget", value: formatBudgetCurrency(totals.totalBudget), icon: WalletCards, tint: "bg-primary" },
    { label: "Total Spent", value: formatBudgetCurrency(totals.totalSpent), icon: Wallet, tint: "bg-secondary" },
    { label: "Remaining Balance", value: formatBudgetCurrency(totals.remainingBalance), icon: Activity, tint: "bg-accent" },
    { label: "Upcoming Events", value: String(totals.upcomingEvents || records.length), icon: CalendarClock, tint: "bg-foreground" },
  ];

  if (loading) {
    return (
      <BudgetWorkspaceShell title="Dashboard" subtitle="Budget overview and latest activity">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[24px]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[360px] rounded-[24px]" />
          <Skeleton className="h-[360px] rounded-[24px]" />
        </div>
      </BudgetWorkspaceShell>
    );
  }

  return (
    <BudgetWorkspaceShell title="Dashboard" subtitle="Budget overview and latest activity">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => (
          <div key={card.label} className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tint} brutal-border`}>
                <card.icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{card.label}</span>
            </div>
            <p className="mt-8 text-3xl font-bold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
        <h2 className="text-lg font-bold uppercase">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="mt-4 rounded-[20px] border-2 border-dashed border-foreground/20 px-5 py-12 text-center text-sm text-muted-foreground">
            No expenses yet. Create a budget to start tracking activity.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {activity.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-[20px] border border-foreground/10 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.meta}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold">{formatBudgetCurrency(item.amount)}</p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" strokeWidth={2.4} />
            <h2 className="text-lg font-bold uppercase">Category-wise Spending</h2>
          </div>
          <ChartContainer
            className="h-[300px] w-full"
            config={Object.fromEntries(categoryData.map((entry, index) => [entry.name, { label: entry.name, color: COLORS[index % COLORS.length] }]))}
          >
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        <div className="rounded-[24px] border-2 border-foreground bg-card p-5 brutal-shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" strokeWidth={2.4} />
            <h2 className="text-lg font-bold uppercase">Monthly Expenses</h2>
          </div>
          <ChartContainer config={{ spent: { label: "Spent", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="spent" radius={[8, 8, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell key={entry.month} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </BudgetWorkspaceShell>
  );
};

export default BudgetDashboardPage;
