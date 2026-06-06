// src/layouts/RootLayout.tsx
import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/index";
import { useThemeStore } from "@/store/themeStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { NAV_ITEMS, ROUTES } from "@/constants/routes";
import {
  LuLogOut,
  LuUser,
  LuChevronLeft,
  LuChevronRight,
  LuSettings,
  LuBell,
  LuSearch,
} from "react-icons/lu";
import { authApi } from "@/api/endpoints/auth";
import { useHasAnyPermission } from "@/hooks/usePermissions";
// ── User Menu ─────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // Derive initials & display name from store user (already hydrated from localStorage)
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.email ?? "";
  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : (email?.[0]?.toUpperCase() ?? "U");
  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : email;

  async function handleLogout() {
    setOpen(false);
    try {
      await authApi.logout(); // clears httpOnly cookie on backend
    } catch {
      // proceed even if request fails
    } finally {
      logout(); // clears Zustand + localStorage via partialize
      navigate("/login", { replace: true });
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      {/* <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-sm border border-border-default bg-bg-elevated px-2.5 py-1.5 transition-colors hover:border-accent/50 hover:bg-bg-surface"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 font-mono text-[.65rem] font-bold text-accent select-none">
          {initials}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate font-mono text-[.68rem] text-text-secondary">
          {displayName}
        </span>
        <LuChevronDown
          className={`h-3 w-3 text-text-disabled transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button> */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center text-[.68rem] font-bold text-accent cursor-pointer"
      >
        {initials}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-sm border border-border-subtle bg-bg-surface shadow-card">
          {/* User info header */}
          <div className="border-b border-border-subtle px-3 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 font-mono text-[.72rem] font-bold text-accent select-none">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-[.72rem] font-bold text-text-primary leading-tight">
                  {displayName}
                </p>
                <p className="truncate font-mono text-[.6rem] text-text-disabled leading-tight mt-0.5">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-[.68rem] text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <LuUser className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
              Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-[.68rem] text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <LuSettings className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
              Settings
            </button>

            <div className="my-1 border-t border-border-subtle" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-[.68rem] text-bear transition-colors hover:bg-bear/10"
            >
              <LuLogOut className="h-3.5 w-3.5 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RootLayout() {
  const { theme, sidebarCollapsed, setSidebarCollapsed, unreadCount } =
    useAppStore();
  const themeMode = useThemeStore((s) => s.theme);

  // Theme-aware logo with /logo-light.png → /logo.png fallback. If we
  // fall back, apply a lightness-invert filter so the dark logo reads
  // properly on a light background.
  const [logoSrc, setLogoSrc] = useState(
    themeMode === "light" ? "/logo-light.png" : "/logo.png",
  );
  const [logoFallback, setLogoFallback] = useState(false);
  useEffect(() => {
    setLogoSrc(themeMode === "light" ? "/logo-light.png" : "/logo.png");
    setLogoFallback(false);
  }, [themeMode]);
  const logoFilter =
    themeMode === "light" && logoFallback
      ? "invert(1) hue-rotate(180deg)"
      : undefined;

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme === "light" ? "light" : "",
    );
  }, [theme]);

  useCommandPalette();
  const location = useLocation();
  const { setOpen } = useCommandPalette();

  // Hide RBAC-gated nav items for users without read access. The Admin
  // page itself also enforces this server-side; this just prevents the
  // dead-end nav click.
  const canSeeAdmin = useHasAnyPermission([
    "rbac.roles.read",
    "rbac.permissions.read",
  ]);
  const visibleNav = NAV_ITEMS.filter(
    (item) => item.to !== ROUTES.ADMIN || canSeeAdmin
  );

  // Resolve the current page's title, icon, and subtitle from NAV_ITEMS.
  // For parametrised routes (e.g. /options/:symbol), match by path prefix.
  const currentPage = (() => {
    for (const item of NAV_ITEMS) {
      const path = typeof item.to === "function" ? item.to("AAPL") : item.to;
      const prefix =
        typeof item.to === "function"
          ? path.split("/").slice(0, 2).join("/")
          : path;
      const match =
        prefix === ROUTES.HOME
          ? location.pathname === "/"
          : location.pathname === prefix ||
            location.pathname.startsWith(prefix + "/");
      if (match)
        return { label: item.label, icon: item.icon, subtitle: item.subtitle };
    }
    return { label: "Dashboard", icon: "▦", subtitle: "__live_clock__" };
  })();

  // Live clock for any page whose subtitle is the "__live_clock__" sentinel.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (currentPage.subtitle !== "__live_clock__") return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [currentPage.subtitle]);
  const subtitleText =
    currentPage.subtitle === "__live_clock__"
      ? `${now.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}  ·  ${now.toLocaleTimeString(undefined, { hour12: false })}`
      : currentPage.subtitle;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-primary font-body transition-colors duration-300">
      <aside
        className={`flex flex-col h-screen sticky top-0 bg-bg-surface border-r border-border-subtle flex-shrink-0 transition-all duration-300 overflow-hidden ${sidebarCollapsed ? "w-14" : "w-52"}`}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-border-subtle min-h-[56px] whitespace-nowrap">
          <img
            src={logoSrc}
            alt="Trading OS"
            onError={() => {
              if (logoSrc === "/logo-light.png") {
                setLogoSrc("/logo.png");
                setLogoFallback(true);
              }
            }}
            style={{ filter: logoFilter }}
            className="h-12 w-18 flex-shrink-0 object-contain"
          />
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={() => setOpen(true)}
            className="mx-2 mt-2 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-bg-elevated border border-border-subtle text-text-secondary text-[.68rem] font-mono hover:border-border-default hover:text-text-primary transition-colors"
          >
            <LuSearch className="w-3 h-3" />
            <span className="flex-1 text-left">Search...</span>
            <span className="text-[.58rem] text-text-muted">⌘K</span>
          </button>
        )}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto mt-1">
          {visibleNav.map((item) => {
            // Resolve function-typed routes (e.g. OPTIONS requires :symbol) and
            // compute a path prefix to detect "active" for nested URLs.
            const path =
              typeof item.to === "function" ? item.to("AAPL") : item.to;
            // For nested-aware highlight (so /options/TSLA still lights "Options Chain")
            // use the parent segment when the route is parametrised.
            const matchPrefix =
              typeof item.to === "function" ? path.split("/").slice(0, 2).join("/") : path;
            const isActiveForPath = (pathname: string) =>
              pathname === matchPrefix ||
              pathname.startsWith(matchPrefix + "/");

            return (
              <NavLink
                key={path}
                to={path}
                end={path === ROUTES.HOME}
                className={({ isActive }) => {
                  // Override default isActive only for parametrised routes.
                  const active =
                    typeof item.to === "function"
                      ? isActiveForPath(location.pathname)
                      : isActive;
                  return `flex items-center gap-2.5 rounded-sm text-[.68rem] font-medium tracking-widest uppercase transition-colors whitespace-nowrap ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"} ${active ? "bg-accent-subtle text-accent border-l-2 border-accent pl-2.5" : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"}`;
                }}
              >
                <span className="text-sm flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`m-2 flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-[.62rem] uppercase tracking-[.16em] text-text-secondary transition-colors hover:border-border-default hover:bg-bg-overlay hover:text-text-primary ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          {sidebarCollapsed ? (
            <LuChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <LuChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <header className="min-h-[68px] flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 bg-bg-surface border-b border-border-subtle transition-colors duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl text-accent leading-none flex-shrink-0">{currentPage.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold tracking-[.16em] uppercase text-text-primary truncate">
                  {currentPage.label}
                </h1>
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-bull" />
                </span>
              </div>
              {subtitleText && (
                <p className="font-mono text-[.65rem] text-text-muted mt-0.5 truncate">
                  {subtitleText}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!sidebarCollapsed && <ThemeToggle />}
            <span className="flex items-center gap-1.5 text-[.68rem] font-mono text-accent">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-bull" />
              </span>
              Live
            </span>
            <button className="relative p-1.5 rounded-sm hover:bg-bg-elevated transition-colors">
              <LuBell className="w-4 h-4 text-text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-bear text-white text-[.55rem] font-mono flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
