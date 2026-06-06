import type { StateCreator } from "zustand";
import type { AppState } from "../index";
import type { AuthUser, PlanId } from "@/types/auth";

export interface AuthSlice {
  token: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  user: AuthUser | null;

  // onboarding / preferences
  selectedPlan: PlanId | null;
  telegramConnected: boolean;
  discordConnected: boolean;
  connectedBrokers: string[];
  onboardingComplete: boolean;
  // Set after a freshly-verified signup so the user is routed through the
  // setup funnel on their first login. Cleared once they finish or skip it.
  pendingOnboarding: boolean;

  // RBAC — role pulled from the JWT, permissions fetched from
  // GET /rbac/roles/{role}/permissions. Used purely for UI gating.
  role: string | null;
  permissions: string[];

  setSession: (s: { token: string; refreshToken: string; sessionId: string }) => void;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSelectedPlan: (plan: PlanId | null) => void;
  setTelegramConnected: (v: boolean) => void;
  setDiscordConnected: (v: boolean) => void;
  toggleBroker: (brokerId: string) => void;
  setOnboardingComplete: (v: boolean) => void;
  setPendingOnboarding: (v: boolean) => void;
  setRole: (role: string | null) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

// Read whatever was last persisted so the slice initialises with real values
// before Zustand's persist middleware rehydrates on its own tick.
function getPersistedAuth() {
  try {
    const raw = localStorage.getItem("tradingagents-store");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed?.state ?? {}) as Partial<AuthSlice>;
  } catch {
    return {};
  }
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => {
  const p = getPersistedAuth();

  return {
    // Hydrate from localStorage on first render — no flicker, no /auth/me round-trip
    token:              p.token              ?? null,
    refreshToken:       p.refreshToken       ?? null,
    sessionId:          p.sessionId          ?? null,
    user:               p.user               ?? null,

    selectedPlan:       p.selectedPlan       ?? null,
    telegramConnected:  p.telegramConnected  ?? false,
    discordConnected:   p.discordConnected   ?? false,
    connectedBrokers:   p.connectedBrokers   ?? [],
    onboardingComplete: p.onboardingComplete ?? false,
    pendingOnboarding:  p.pendingOnboarding  ?? false,
    role:               p.role               ?? null,
    permissions:        p.permissions        ?? [],

    setSession: ({ token, refreshToken, sessionId }) =>
      set({ token, refreshToken, sessionId }),
    setToken: (token) => set({ token }),
    setUser: (user) => set({ user }),
    setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
    setTelegramConnected: (telegramConnected) => set({ telegramConnected }),
    setDiscordConnected: (discordConnected) => set({ discordConnected }),
    toggleBroker: (brokerId) =>
      set((s) => ({
        connectedBrokers: s.connectedBrokers.includes(brokerId)
          ? s.connectedBrokers.filter((b) => b !== brokerId)
          : [...s.connectedBrokers, brokerId],
      })),
    setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
    setPendingOnboarding: (pendingOnboarding) => set({ pendingOnboarding }),
    setRole: (role) => set({ role }),
    setPermissions: (permissions) => set({ permissions }),
    logout: () =>
      set({
        token: null,
        refreshToken: null,
        sessionId: null,
        user: null,
        selectedPlan: null,
        telegramConnected: false,
        discordConnected: false,
        connectedBrokers: [],
        onboardingComplete: false,
        pendingOnboarding: false,
        role: null,
        permissions: [],
      }),
  };
};