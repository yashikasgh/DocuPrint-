import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Image,
  Printer,
  Rocket,
  Users,
  Wallet,
  CalendarRange,
  FileBarChart,
  CalendarCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { authClient, isSupabaseConfigured } from "@/lib/supabase";
import { teamMembers } from "@/lib/siteContent";

type Phase = "intro" | "printer" | "form";

const featureCards = [
  {
    title: "Proposal to Report",
    description: "Create proposals, attendance sheets, reports, and summaries from one compact workflow.",
    icon: FileText,
    accent: "bg-primary",
  },
  {
    title: "Creative Flyer Flow",
    description: "Turn club theme and event details into Gemini-ready flyer prompts without extra copywriting.",
    icon: Image,
    accent: "bg-secondary",
  },
  {
    title: "Planning Intelligence",
    description: "Estimate budgets, generate timelines, and wrap up events with post-event analytics.",
    icon: Wallet,
    accent: "bg-accent",
  },
];
const formatAuthError = (message: string) => {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Your email is not confirmed yet. Open the verification email first, then sign in.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect. Double-check both and try again.";
  }

  if (normalized.includes("password should be at least")) {
    return "Password is too short. Use at least 8 characters.";
  }

  if (normalized.includes("user already registered")) {
    return "This email is already registered. Try signing in instead.";
  }

  if (normalized.includes("signup is disabled")) {
    return "Email sign-up is disabled in Supabase right now. Enable Email auth in your Supabase project settings.";
  }

  return message;
};

const introMotion = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

const IntroLanding = ({ onContinue }: { onContinue: () => void }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.35 }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="brutal-border flex h-12 w-12 items-center justify-center bg-foreground cursor-pointer"
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.2 }}
            >
              <CalendarCheck className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </motion.div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">DocuPrint</p>
              <h1 className="text-lg font-bold uppercase tracking-tight">Event Document Generator</h1>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:flex-row">
            <Link to="/about" className="brutal-btn-outline hidden py-2 md:inline-flex">
              About Project
            </Link>
            <button onClick={onContinue} className="brutal-btn-primary hidden py-2 md:inline-flex">
              Enter Experience
            </button>
          </div>
        </header>

        <main className="flex-1 py-8 md:py-12">
          <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              variants={introMotion}
              initial="hidden"
              animate="visible"
              transition={{ duration: reduceMotion ? 0.12 : 0.4 }}
              className="space-y-6"
            >
              <div className="inline-flex brutal-border bg-muted px-3 py-1 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Print-ready event ops
              </div>
              <div className="space-y-4">
                <h2 className="max-w-3xl text-4xl font-bold uppercase leading-[0.95] md:text-6xl">
                  Plan,
                  <br />
                  generate,
                  <br />
                  and archive
                  <span className="text-primary"> event docs</span>
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  A minimal workspace for clubs and organizers to generate proposals, flyers, attendance sheets,
                  reports, budget insights, activity timelines, and post-event summaries with much less manual work.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={onContinue} className="brutal-btn-primary flex items-center justify-center gap-2">
                  Start Demo Flow
                  <ArrowRight className="h-4 w-4" strokeWidth={3} />
                </button>
                <a href="#team" className="brutal-btn-outline flex items-center justify-center gap-2">
                  Meet the Team
                  <Users className="h-4 w-4" strokeWidth={3} />
                </a>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: "Proposal + report", icon: FileText },
                  { label: "Timeline + budget", icon: CalendarRange },
                  { label: "Summary + analytics", icon: FileBarChart },
                ].map((item) => (
                  <div key={item.label} className="brutal-border bg-card p-4">
                    <item.icon className="h-5 w-5 text-primary" strokeWidth={2.5} />
                    <p className="mt-3 text-xs font-bold uppercase">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={introMotion}
              initial="hidden"
              animate="visible"
              transition={{ delay: reduceMotion ? 0 : 0.08, duration: reduceMotion ? 0.12 : 0.45 }}
              className="grid gap-4"
            >
              {featureCards.map((card) => (
                <div key={card.title} className="brutal-card">
                  <div className={`brutal-border flex h-12 w-12 items-center justify-center ${card.accent}`}>
                    <card.icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold uppercase">{card.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.description}</p>
                </div>
              ))}
            </motion.div>
          </section>

          <section id="team" className="mt-14 md:mt-20">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-4 w-10 bg-primary brutal-border" />
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Project Team</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {teamMembers.map((member) => (
                <div key={member.name} className="brutal-card min-h-[230px]">
                  <div className="brutal-border flex h-12 w-12 items-center justify-center bg-secondary">
                    <Rocket className="h-5 w-5 text-secondary-foreground" strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold uppercase">{member.name}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {member.role}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{member.contribution}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
};

const PrinterAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.25 }}
    >
      <motion.div
        className="relative"
        initial={{ y: reduceMotion ? 0 : -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: "easeOut" }}
      >
        <div className="relative z-10 bg-foreground p-6 sm:p-8 brutal-border">
          <Printer className="h-16 w-16 text-primary-foreground sm:h-20 sm:w-20" strokeWidth={2.5} />
          <div className="absolute -top-2 left-1/2 h-3 w-16 -translate-x-1/2 bg-primary brutal-border" />
        </div>

        <div className="h-2 w-full bg-muted brutal-border border-t-0" />

        <motion.div
          className="mx-auto w-[90%] overflow-hidden border-t-0 bg-card brutal-border"
          initial={{ height: 0 }}
          animate={{ height: reduceMotion ? 140 : 180 }}
          transition={{ delay: reduceMotion ? 0.1 : 0.45, duration: reduceMotion ? 0.24 : 0.8, ease: "easeInOut" }}
          onAnimationComplete={onComplete}
        >
          <div className="space-y-2 p-4">
            <motion.div className="h-3 w-3/4 bg-primary/30" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduceMotion ? 0.1 : 0.7, duration: 0.25 }} style={{ transformOrigin: "left" }} />
            <motion.div className="h-2 w-full bg-muted-foreground/20" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduceMotion ? 0.12 : 0.82, duration: 0.2 }} style={{ transformOrigin: "left" }} />
            <motion.div className="h-2 w-5/6 bg-muted-foreground/20" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduceMotion ? 0.14 : 0.9, duration: 0.2 }} style={{ transformOrigin: "left" }} />
            <motion.div className="h-2 w-2/3 bg-secondary/40" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduceMotion ? 0.16 : 0.98, duration: 0.2 }} style={{ transformOrigin: "left" }} />
          </div>
        </motion.div>
      </motion.div>

      <motion.p
        className="text-center font-mono text-sm uppercase tracking-widest text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: reduceMotion ? 1 : [0, 1, 0.7, 1] }}
        transition={{ delay: 0.2, duration: reduceMotion ? 0.15 : 1.1 }}
      >
        Printing your workspace...
      </motion.p>
    </motion.div>
  );
};

const SignUpForm = ({ onBackToIntro }: { onBackToIntro: () => void }) => {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [navigate, user]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus("");
    const safeFullName = fullName.trim();
    const safeEmail = email.trim().toLowerCase();
    const safePassword = password;

    if (!safeEmail || !safePassword || (mode === "signup" && !safeFullName)) {
      setSubmitting(false);
      setStatus("Please fill all required fields.");
      return;
    }

    if (mode === "signup" && safePassword.length < 8) {
      setSubmitting(false);
      setStatus("Use a password with at least 8 characters.");
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error } = await authClient.signUp({
          email: safeEmail,
          password: safePassword,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: safeFullName,
            },
          },
        });

        setSubmitting(false);
        setStatus(
          error
            ? formatAuthError(error.message)
            : data.session
              ? "Account created successfully. You are now signed in."
              : "Account created. Check your email for the confirmation link, then come back and sign in."
        );
        return;
      }

      const { error } = await authClient.signInWithPassword({
        email: safeEmail,
        password: safePassword,
      });

      setSubmitting(false);
      if (error) {
        setStatus(formatAuthError(error.message));
        return;
      }

      navigate("/dashboard");
    } catch {
      setSubmitting(false);
      setStatus(
        isSupabaseConfigured
          ? "Unable to reach Supabase. Verify internet connection and Supabase URL/key values in .env.local."
          : "Local authentication could not be started. Refresh the page and try again."
      );
    }
  };

  return (
    <motion.div
      className="flex min-h-screen items-center justify-center px-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.3 }}
    >
      <div className="w-full max-w-md">
        <motion.div
          className="space-y-6 brutal-card"
          initial={{ y: reduceMotion ? 0 : 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.08, duration: reduceMotion ? 0.12 : 0.35 }}
        >
          <div>
            <div className="mb-4 inline-flex rounded-none brutal-border overflow-hidden">
              <button
                onClick={() => setMode("signup")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setMode("signin")}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${mode === "signin" ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground"}`}
              >
                Sign In
              </button>
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-tight">{mode === "signup" ? "Create Account" : "Welcome Back"}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {mode === "signup" ? "Create documents that demand attention." : "Access your event workspace and continue where you left off."}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "signup" ? (
              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wider">Full Name</label>
                <input type="text" placeholder="Jane Doe" className="brutal-input" value={fullName} onChange={(event) => setFullName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSubmit()} />
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider">Email</label>
              <input type="email" placeholder="jane@school.edu" className="brutal-input" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSubmit()} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider">Password</label>
              <input type="password" placeholder="Create a secure password" className="brutal-input" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSubmit()} />
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={handleSubmit} className="brutal-btn-primary block w-full text-center" disabled={submitting}>
              {submitting ? "Processing..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
            <p className="text-center text-sm font-mono text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "Need a new account?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setStatus("");
                }}
                className="font-bold text-primary underline decoration-2 underline-offset-4"
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>

            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-foreground/15" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="h-[1px] flex-1 bg-foreground/15" />
            </div>

            <button
              onClick={async () => {
                setSubmitting(true);
                const { error } = await authClient.signInAsGuest();
                setSubmitting(false);
                if (error) {
                  setStatus(error.message);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="brutal-btn-outline block w-full text-center"
              disabled={submitting}
            >
              Continue as Guest
            </button>

            {status ? <p className="text-center font-mono text-xs text-muted-foreground">{status}</p> : null}
            <button onClick={onBackToIntro} className="block w-full text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground underline underline-offset-4">
              Back to intro
            </button>
          </div>
        </motion.div>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-4 w-4 bg-primary brutal-border" />
          <div className="h-4 w-4 bg-secondary brutal-border" />
          <div className="h-4 w-4 bg-accent brutal-border" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">DOCUPRINT v1.0</span>
        </div>
      </div>
    </motion.div>
  );
};

const LandingPage = () => {
  const [phase, setPhase] = useState<Phase>("intro");
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {phase === "intro" ? (
        <IntroLanding key="intro" onContinue={() => setPhase("printer")} />
      ) : phase === "printer" ? (
        <PrinterAnimation key="printer" onComplete={() => window.setTimeout(() => setPhase("form"), reduceMotion ? 160 : 500)} />
      ) : (
        <SignUpForm key="form" onBackToIntro={() => setPhase("intro")} />
      )}
    </AnimatePresence>
  );
};

export default LandingPage;
