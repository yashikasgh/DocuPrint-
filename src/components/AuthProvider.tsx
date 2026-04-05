import { createContext, useContext, useEffect, useState } from "react";
import { authClient, type AuthSession, type AuthUser } from "@/lib/supabase";

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  isGuest: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrateSession = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get("code");
        const hasAuthCode =
          Boolean(authCode) ||
          currentUrl.hash.includes("access_token") ||
          currentUrl.hash.includes("refresh_token");

        if (authCode) {
          await authClient.exchangeCodeForSession(authCode).catch(() => null);
        }

        if (hasAuthCode) {
          currentUrl.searchParams.delete("code");
          currentUrl.searchParams.delete("type");
          currentUrl.searchParams.delete("access_token");
          currentUrl.searchParams.delete("refresh_token");
          currentUrl.hash = "";
          window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
        }

        const { data } = await authClient.getSession();
        if (!mounted) {
          return;
        }

        setSession(data.session ?? null);
        setLoading(false);
      } catch {
        if (!mounted) {
          return;
        }

        setSession(null);
        setLoading(false);
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = authClient.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isGuest: session?.user?.id === "guest-user" || session?.user?.email === "guest@docuprint.demo",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
