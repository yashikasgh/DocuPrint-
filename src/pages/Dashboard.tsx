import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Image,
  BarChart3,
  Users,
  Sparkles,
  ArrowRight,
  Calendar,
  Wallet,
  ListChecks,
  FileBarChart,
  UserRound,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { authClient } from "@/lib/supabase";

const features = [
  {
    title: "Events",
    description: "Manage events and link all your documents in one place",
    icon: Calendar,
    color: "bg-secondary",
    span: "col-span-2",
    href: "/events",
  },
  {
    title: "Proposal",
    description: "Generate professional event proposals with branded headers",
    icon: FileText,
    color: "bg-primary",
    span: "col-span-1",
    href: "/generate/proposal",
  },
  {
    title: "Flyer",
    description: "AI-powered event flyers with style presets",
    icon: Image,
    color: "bg-secondary",
    span: "col-span-1",
    href: "/generate/flyer",
  },
  {
    title: "Report",
    description: "Post-event reports with charts and data visualization",
    icon: BarChart3,
    color: "bg-accent",
    span: "col-span-1",
    href: "/generate/report",
  },
  {
    title: "Budget",
    description: "Estimate budgets, contingency, and cost-per-head insights",
    icon: Wallet,
    color: "bg-secondary",
    span: "col-span-1",
    href: "/generate/budget",
  },
  {
    title: "Timeline",
    description: "Build milestone-based event activity timelines",
    icon: ListChecks,
    color: "bg-accent",
    span: "col-span-1",
    href: "/generate/timeline",
  },
  {
    title: "Attendance",
    description: "Upload rosters, mark attendance, export sheets",
    icon: Users,
    color: "bg-primary",
    span: "col-span-1",
    href: "/generate/attendance",
  },
  {
    title: "Summary",
    description: "Compile post-event analytics, highlights, and recommendations",
    icon: FileBarChart,
    color: "bg-primary",
    span: "col-span-2",
    href: "/generate/summary",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { y: 22, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "DocuPrint User";
  const initials = fullName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header
        className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-foreground brutal-border">
            <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">DocuPrint</h1>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Event Workspace</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/profile" className="brutal-btn-outline flex items-center gap-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center bg-secondary brutal-border text-xs font-bold text-secondary-foreground">
              {initials}
            </div>
            <span className="max-w-[160px] truncate text-xs">{fullName}</span>
            <UserRound className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <button onClick={handleSignOut} className="brutal-btn-outline flex items-center gap-2 py-2 text-xs">
            <LogOut className="h-4 w-4" strokeWidth={2.5} />
            Sign Out
          </button>
        </div>
      </motion.header>

      <motion.div
        className="mb-10"
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.4 }}
      >
        <h2 className="max-w-2xl text-4xl font-bold uppercase leading-tight md:text-5xl">
          What are we
          <br />
          <span className="text-primary">printing</span> today?
        </h2>
        <p className="mt-3 max-w-md font-mono text-sm text-muted-foreground">
          Select a document type below to start generating.
        </p>
      </motion.div>

      <motion.div
        className="grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={item}>
            <Link
              to={feature.href}
              className={`brutal-card group ${feature.span} flex min-h-[180px] flex-col justify-between`}
            >
              <div>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center ${feature.color} brutal-border`}>
                  <feature.icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">{feature.title}</h3>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold uppercase text-primary transition-all group-hover:gap-3">
                <span>Open</span>
                <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-12 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
      >
        <div className="h-3 w-12 bg-primary brutal-border" />
        <div className="h-3 w-8 bg-secondary brutal-border" />
        <div className="h-3 w-5 bg-accent brutal-border" />
      </motion.div>
    </div>
  );
};

export default Dashboard;
