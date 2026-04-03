import { ReactNode, useMemo } from "react";
import { Bell, FileSpreadsheet, History, LayoutDashboard, Menu, ReceiptText, Search, Settings, Sparkles, Tags, WalletCards, BarChart3 } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type BudgetWorkspaceShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

const items = [
  { label: "Dashboard", to: "/generate/budget", icon: LayoutDashboard },
  { label: "History", to: "/generate/budget/history", icon: History },
  { label: "Create Budget", to: "/generate/budget/create", icon: WalletCards },
  { label: "Categories", to: "/generate/budget/categories", icon: Tags },
  { label: "Analysis", to: "/generate/budget/analysis", icon: BarChart3 },
  { label: "Estimation", to: "/generate/budget/estimation", icon: ReceiptText },
  { label: "Reports", to: "/generate/budget/reports", icon: FileSpreadsheet },
  { label: "Settings", to: "/profile", icon: Settings },
];

const SidebarContent = () => (
  <div className="flex h-full flex-col">
    <div className="mb-8 flex items-center gap-3 px-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary brutal-border brutal-shadow-sm">
        <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
      </div>
      <div>
        <p className="text-lg font-bold uppercase tracking-tight">Budget</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Management</p>
      </div>
    </div>

    <div className="space-y-2">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === "/generate/budget"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-2xl border-2 border-transparent px-4 py-3 text-sm font-medium transition-all duration-200 hover:border-foreground/15 hover:bg-muted/40",
              isActive && "border-foreground bg-card brutal-shadow-sm"
            )
          }
        >
          <item.icon className="h-4 w-4" strokeWidth={2.3} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  </div>
);

const BudgetWorkspaceShell = ({ title, subtitle, children, actions }: BudgetWorkspaceShellProps) => {
  const { user } = useAuth();
  const initials = useMemo(() => {
    const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "BU";
    return fullName
      .split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="hidden rounded-[24px] border-2 border-foreground bg-card p-4 brutal-shadow lg:block">
          <SidebarContent />
        </aside>

        <div className="min-w-0 space-y-4">
          <header className="rounded-[24px] border-2 border-foreground bg-card p-4 brutal-shadow">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-foreground bg-background brutal-shadow-sm lg:hidden">
                    <Menu className="h-5 w-5" strokeWidth={2.4} />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] border-r-2 border-foreground bg-card p-4">
                    <SidebarContent />
                  </SheetContent>
                </Sheet>

                <div>
                  <h1 className="text-2xl font-bold uppercase tracking-tight md:text-3xl">{title}</h1>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{subtitle}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-background px-4 py-3 brutal-shadow-sm sm:min-w-[280px]">
                  <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
                  <input className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search budgets, vendors, events..." />
                </div>
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-foreground bg-background brutal-shadow-sm">
                  <Bell className="h-4 w-4" strokeWidth={2.4} />
                </button>
                <Link to="/profile" className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-background px-4 py-2 brutal-shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary brutal-border text-xs font-bold text-secondary-foreground">{initials}</div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold">{user?.user_metadata?.full_name || "Budget Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || "Signed in"}</p>
                  </div>
                </Link>
              </div>
            </div>
            {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
          </header>

          <main className="space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default BudgetWorkspaceShell;
