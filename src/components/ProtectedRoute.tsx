import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isGuest } = useAuth();
  const location = useLocation();
  const guestAllowedPaths = new Set(["/dashboard"]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (isGuest && !guestAllowedPaths.has(location.pathname)) {
    return (
      <div className="relative min-h-screen">
        <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md brutal-card text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Guest Mode</p>
            <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight">Sign In To Continue</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Guest browsing is enabled for the dashboard, but generating, downloading, saving, and sharing features require a signed-in account.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/" state={{ from: location.pathname }} className="brutal-btn-primary">
                Sign In
              </Link>
              <Link to="/dashboard" className="brutal-btn-outline">
                Back To Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
