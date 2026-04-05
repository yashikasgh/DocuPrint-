import { createClient, type Session, type User } from "@supabase/supabase-js";

type AuthError = {
  message: string;
};

export type AuthUser = Pick<User, "id" | "email" | "user_metadata">;
export type AuthSession = Pick<Session, "user"> & {
  user: AuthUser;
};

type AuthStateCallback = (event: string, session: AuthSession | null) => void;

type AuthResult<T> = Promise<{
  data: T;
  error: AuthError | null;
}>;

type AuthClient = {
  exchangeCodeForSession: (authCode: string) => AuthResult<{ session: AuthSession | null }>;
  getSession: () => AuthResult<{ session: AuthSession | null }>;
  onAuthStateChange: (
    callback: AuthStateCallback
  ) => {
    data: {
      subscription: {
        unsubscribe: () => void;
      };
    };
  };
  signUp: (payload: {
    email: string;
    password: string;
    options?: {
      emailRedirectTo?: string;
      data?: {
        full_name?: string;
      };
    };
  }) => AuthResult<{ session: AuthSession | null }>;
  signInWithPassword: (payload: {
    email: string;
    password: string;
  }) => AuthResult<{ session: AuthSession | null }>;
  signOut: () => AuthResult<Record<string, never>>;
  updateUser: (payload: {
    data: {
      full_name?: string;
    };
  }) => AuthResult<{ user: AuthUser | null }>;
  signInAsGuest: () => AuthResult<{ session: AuthSession | null }>;
};

type LocalAccount = {
  id: string;
  email: string;
  password: string;
  fullName: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasPlaceholderValues =
  (supabaseUrl ?? "").includes("YOUR_PROJECT_REF") ||
  (supabaseKey ?? "").includes("YOUR_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey) && !hasPlaceholderValues;
export const authModeLabel = isSupabaseConfigured ? "Supabase authentication" : "local browser authentication";

const ACCOUNTS_STORAGE_KEY = "docuprint.auth.accounts";
const SESSION_STORAGE_KEY = "docuprint.auth.session";
const AUTH_MIGRATION_STORAGE_KEY = "docuprint.auth.migrated-to-supabase";
const authListeners = new Set<AuthStateCallback>();

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const clearJson = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
};

const migrateLegacyLocalAuth = () => {
  if (typeof window === "undefined" || !isSupabaseConfigured) {
    return;
  }

  const alreadyMigrated = window.localStorage.getItem(AUTH_MIGRATION_STORAGE_KEY);
  if (alreadyMigrated === "true") {
    return;
  }

  // Remove legacy browser-only auth data so Supabase sessions are authoritative.
  clearJson(ACCOUNTS_STORAGE_KEY);
  clearJson(SESSION_STORAGE_KEY);
  window.localStorage.setItem(AUTH_MIGRATION_STORAGE_KEY, "true");
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const makeUser = (account: LocalAccount): AuthUser => ({
  id: account.id,
  email: account.email,
  user_metadata: {
    full_name: account.fullName,
    auth_provider: "local",
  },
});

const makeSession = (account: LocalAccount): AuthSession => ({
  user: makeUser(account),
});

const getStoredAccounts = () => readJson<LocalAccount[]>(ACCOUNTS_STORAGE_KEY, []);
const saveStoredAccounts = (accounts: LocalAccount[]) => writeJson(ACCOUNTS_STORAGE_KEY, accounts);

const getStoredSession = () => readJson<AuthSession | null>(SESSION_STORAGE_KEY, null);

const saveStoredSession = (session: AuthSession | null) => {
  if (!session) {
    clearJson(SESSION_STORAGE_KEY);
    return;
  }

  writeJson(SESSION_STORAGE_KEY, session);
};

const emitAuthState = (event: string, session: AuthSession | null) => {
  authListeners.forEach((listener) => listener(event, session));
};

const buildAuthError = (message: string): AuthError => ({ message });

const buildAccountId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const localAuth: AuthClient = {
  async exchangeCodeForSession() {
    return {
      data: { session: getStoredSession() },
      error: null,
    };
  },
  async getSession() {
    return {
      data: { session: getStoredSession() },
      error: null,
    };
  },
  onAuthStateChange(callback) {
    authListeners.add(callback);

    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    };
  },
  async signUp({ email, password, options }) {
    const normalizedEmail = normalizeEmail(email);
    const accounts = getStoredAccounts();
    const existingAccount = accounts.find((account) => account.email === normalizedEmail);

    if (existingAccount) {
      return {
        data: { session: null },
        error: buildAuthError("This email is already registered. Try signing in instead."),
      };
    }

    const newAccount: LocalAccount = {
      id: buildAccountId(),
      email: normalizedEmail,
      password,
      fullName: options?.data?.full_name?.trim() || normalizedEmail.split("@")[0] || "DocuPrint User",
    };

    const nextAccounts = [...accounts, newAccount];
    const session = makeSession(newAccount);

    saveStoredAccounts(nextAccounts);
    saveStoredSession(session);
    emitAuthState("SIGNED_IN", session);

    return {
      data: { session },
      error: null,
    };
  },
  async signInWithPassword({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const account = getStoredAccounts().find((entry) => entry.email === normalizedEmail);

    if (!account || account.password !== password) {
      return {
        data: { session: null },
        error: buildAuthError("The email or password is incorrect. Double-check both and try again."),
      };
    }

    const session = makeSession(account);
    saveStoredSession(session);
    emitAuthState("SIGNED_IN", session);

    return {
      data: { session },
      error: null,
    };
  },
  async signOut() {
    saveStoredSession(null);
    emitAuthState("SIGNED_OUT", null);

    return {
      data: {},
      error: null,
    };
  },
  async updateUser({ data }) {
    const session = getStoredSession();
    if (!session?.user?.email) {
      return {
        data: { user: null },
        error: buildAuthError("You must sign in before updating the profile."),
      };
    }

    const accounts = getStoredAccounts();
    const nextAccounts = accounts.map((account) =>
      account.email === session.user.email
        ? {
            ...account,
            fullName: data.full_name?.trim() || account.fullName,
          }
        : account
    );

    const updatedAccount = nextAccounts.find((account) => account.email === session.user.email);
    if (!updatedAccount) {
      return {
        data: { user: null },
        error: buildAuthError("The local account could not be found."),
      };
    }

    const nextSession = makeSession(updatedAccount);
    saveStoredAccounts(nextAccounts);
    saveStoredSession(nextSession);
    emitAuthState("USER_UPDATED", nextSession);

    return {
      data: { user: nextSession.user },
      error: null,
    };
  },
  async signInAsGuest() {
    const guestAccount: LocalAccount = {
      id: "guest-user",
      email: "guest@docuprint.demo",
      password: "guest-password-not-used",
      fullName: "Guest Demo User",
    };

    const session = makeSession(guestAccount);
    saveStoredSession(session);
    emitAuthState("SIGNED_IN", session);

    return {
      data: { session },
      error: null,
    };
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase is not configured. DocuPrint is using local browser authentication until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided."
  );
}

migrateLegacyLocalAuth();

const getAuthClient = (): AuthClient => {
  if (supabase) {
    return {
      exchangeCodeForSession: (authCode: string) => supabase.auth.exchangeCodeForSession(authCode),
      getSession: () => supabase.auth.getSession(),
      onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
      signUp: (payload) => supabase.auth.signUp(payload),
      signInWithPassword: (payload) => supabase.auth.signInWithPassword(payload),
      signOut: () => supabase.auth.signOut(),
      updateUser: (payload) => supabase.auth.updateUser(payload),
=======
      exchangeCodeForSession: (authCode) => supabase.auth.exchangeCodeForSession(authCode) as AuthResult<{ session: AuthSession | null }>,
      getSession: () => supabase.auth.getSession() as AuthResult<{ session: AuthSession | null }>,
      onAuthStateChange: (callback) =>
        supabase.auth.onAuthStateChange((event, session) => {
          callback(event, session as AuthSession | null);
        }),
      signUp: (payload) => supabase.auth.signUp(payload) as AuthResult<{ session: AuthSession | null }>,
      signInWithPassword: (payload) =>
        supabase.auth.signInWithPassword(payload) as AuthResult<{ session: AuthSession | null }>,
      signOut: () => supabase.auth.signOut() as AuthResult<Record<string, never>>,
      updateUser: (payload) => supabase.auth.updateUser(payload) as AuthResult<{ user: AuthUser | null }>,
      signInAsGuest: localAuth.signInAsGuest,
    };
  }
  return localAuth;
};

export const authClient: AuthClient = getAuthClient();
