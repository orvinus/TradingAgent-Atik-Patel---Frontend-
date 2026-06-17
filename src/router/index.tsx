// src/router/index.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import RootLayout from "@/layouts/RootLayout";
import AuthLayout from "@/layouts/AuthLayout";
import { useAppStore } from "@/store/index";

const Dashboard       = lazy(() => import("@/pages/Dashboard/index"));
const TradingMode     = lazy(() => import("@/pages/TradingMode/index"));
const Strategies      = lazy(() => import("@/pages/Strategies/index"));
const Brokers         = lazy(() => import("@/pages/Brokers/index"));
const Backtest        = lazy(() => import("@/pages/Backtest/index"));
const Risk            = lazy(() => import("@/pages/Risk/index"));
const News            = lazy(() => import("@/pages/News/index"));
const Fundamentals    = lazy(() => import("@/pages/Fundamentals/index"));
const Alerts          = lazy(() => import("@/pages/Alerts/index"));
const Admin           = lazy(() => import("@/pages/Admin/index"));
const Audit           = lazy(() => import("@/pages/Audit/index"));
const Options         = lazy(() => import("@/pages/Options/index"));
const Discover        = lazy(() => import("@/pages/Discover/index"));
const Briefing        = lazy(() => import("@/pages/Briefing/index"));
const LLM             = lazy(() => import("@/pages/LLM/index"));
const Notifications         = lazy(() => import("@/pages/Notifications/index"));
const AdminSendAlerts       = lazy(() => import("@/pages/AdminSendAlerts/index"));
const CopyTrading           = lazy(() => import("@/pages/CopyTrading/index"));
const CopyTradingTelegram   = lazy(() => import("@/pages/CopyTradingTelegram/index"));

const Login           = lazy(() => import("@/pages/Login/index"));
const Signup          = lazy(() => import("@/pages/Signup/index"));
const VerifyEmail     = lazy(() => import("@/pages/VerifyEmail/index"));
const ForgotPassword  = lazy(() => import("@/pages/ForgotPassword/index"));
const ResetPassword   = lazy(() => import("@/pages/ResetPassword/index"));

const ChoosePlan      = lazy(() => import("@/pages/Onboarding/ChoosePlan"));
const StayConnected   = lazy(() => import("@/pages/Onboarding/StayConnected"));
const ConnectBroker   = lazy(() => import("@/pages/Onboarding/ConnectBroker"));

// Loading fallback shown while lazy page chunks load
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <span className="text-accent text-2xl animate-pulse">⬡</span>
        <span className="text-[.68rem] font-mono text-text-muted tracking-widest uppercase">Loading...</span>
      </div>
    </div>
  );
}

// Wraps each lazy page in Suspense
function Page({ component: C }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
}

// Dashboard guard — must be authenticated. Onboarding is no longer required
// to reach the app; missing setup is surfaced as CTAs on the dashboard.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Onboarding routes are also reachable post-signup or via dashboard CTAs;
// the only requirement is being authenticated.
function RequireAuthOnly({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guest-only guard — already-authenticated users skip the auth screens.
// If a fresh signup is pending its post-verification setup, send them there;
// otherwise drop them on the dashboard.
function GuestOnly({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  const pendingOnboarding = useAppStore((s) => s.pendingOnboarding);
  if (token) {
    return <Navigate to={pendingOnboarding ? "/onboarding/plan" : "/"} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  // ── Auth & Onboarding (use AuthLayout's dark gradient background) ─────
  {
    element: <AuthLayout />,
    children: [
      { path: "/login",            element: <GuestOnly><Page component={Login} /></GuestOnly> },
      { path: "/signup",           element: <GuestOnly><Page component={Signup} /></GuestOnly> },
      { path: "/verify-email",     element: <Page component={VerifyEmail} /> },
      { path: "/forgot-password",  element: <Page component={ForgotPassword} /> },
      { path: "/reset-password",   element: <Page component={ResetPassword} /> },

      {
        path: "/onboarding/plan",
        element: (
          <RequireAuthOnly>
            <Page component={ChoosePlan} />
          </RequireAuthOnly>
        ),
      },
      {
        path: "/onboarding/connect",
        element: (
          <RequireAuthOnly>
            <Page component={StayConnected} />
          </RequireAuthOnly>
        ),
      },
      {
        path: "/onboarding/broker",
        element: (
          <RequireAuthOnly>
            <Page component={ConnectBroker} />
          </RequireAuthOnly>
        ),
      },
    ],
  },

  // ── Protected app ─────────────────────────────────────────────────────
  {
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/",                element: <Page component={Dashboard}    /> },
      { path: "/mode",            element: <Page component={TradingMode}  /> },
      { path: "/strategies",      element: <Page component={Strategies}   /> },
      { path: "/brokers",         element: <Page component={Brokers}      /> },
      { path: "/backtest",        element: <Page component={Backtest}     /> },
      { path: "/risk",            element: <Page component={Risk}         /> },
      { path: "/news",            element: <Page component={News}         /> },
      { path: "/fundamentals",    element: <Page component={Fundamentals} /> },
      { path: "/alerts",          element: <Page component={Alerts}       /> },
      { path: "/admin",           element: <Page component={Admin}        /> },
      { path: "/audit",           element: <Page component={Audit}        /> },
      { path: "/options/:symbol", element: <Page component={Options}      /> },
      { path: "/discover",        element: <Page component={Discover}     /> },
      { path: "/briefing",          element: <Page component={Briefing}       /> },
      { path: "/llm",               element: <Page component={LLM}            /> },
      { path: "/notifications",                    element: <Page component={Notifications}        /> },
      { path: "/admin/send-alerts",                element: <Page component={AdminSendAlerts}      /> },
      { path: "/copy-trading/connections",         element: <Page component={CopyTrading}          /> },
      { path: "/copy-trading/connections/telegram",element: <Page component={CopyTradingTelegram}  /> },
    ],
  },

  // ── Fallback ──────────────────────────────────────────────────────────
  { path: "*", element: <Navigate to="/" replace /> },
]);
