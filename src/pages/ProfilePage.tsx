import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LoaderCircle, LogOut, Save, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setStatus("");

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
      },
    });

    setSaving(false);
    setStatus(error ? error.message : "Profile updated successfully.");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate("/");
  };

  const initials = (fullName || user?.email || "DP")
    .split(" ")
    .map((chunk: string) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen p-6 md:p-10">
      <motion.header
        className="mb-8 flex items-center justify-between"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="brutal-btn-outline flex items-center gap-1 px-3 py-2 text-xs">
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Back
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight">Profile</h1>
        </div>
        <button onClick={handleSignOut} className="brutal-btn-outline flex items-center gap-2 py-2 text-xs" disabled={signingOut}>
          {signingOut ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <LogOut className="h-4 w-4" strokeWidth={3} />}
          Sign Out
        </button>
      </motion.header>

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="brutal-card">
          <div className="flex items-center gap-4">
            <div className="brutal-border flex h-20 w-20 items-center justify-center bg-secondary text-2xl font-bold text-secondary-foreground">
              {initials}
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">Workspace Identity</p>
              <h2 className="mt-2 text-2xl font-bold uppercase">{fullName || "DocuPrint User"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              ["Role", "Organizer"],
              ["Access", "Authenticated"],
              ["Flows", "7 active"],
              ["Mode", "Production"],
            ].map(([label, value]) => (
              <div key={label} className="brutal-border bg-muted/20 p-3">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-bold uppercase">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="brutal-card space-y-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">User Details</p>
            <h2 className="mt-3 text-3xl font-bold uppercase">Manage Account</h2>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Full Name</label>
            <input className="brutal-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider">Email</label>
            <input className="brutal-input" value={user?.email ?? ""} disabled />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={handleSave} className="brutal-btn-primary flex items-center justify-center gap-2" disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={3} />}
              Save Changes
            </button>
            <Link to="/dashboard" className="brutal-btn-outline flex items-center justify-center gap-2">
              <UserRound className="h-4 w-4" strokeWidth={3} />
              Return to Dashboard
            </Link>
          </div>

          {status ? <p className="font-mono text-xs text-muted-foreground">{status}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
