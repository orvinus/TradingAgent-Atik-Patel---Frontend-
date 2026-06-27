// src/components/broker/BrokerConnectionModals.tsx
// Shared modal components for creating broker connections.
// Used in both the onboarding ConnectBroker page and the dashboard Brokers page.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { brokersApi } from "@/api/endpoints/alpaca";
import { tradierApi } from "@/api/endpoints/tradier";
import { binanceApi } from "@/api/endpoints/binance";
import { coinbaseApi } from "@/api/endpoints/coinbase";
import { krakenApi } from "@/api/endpoints/kraken";
import { publicApi } from "@/api/endpoints/public";
import { robinhoodApi } from "@/api/endpoints/robinhood";
import { mt5Api } from "@/api/endpoints/mt5";
import { toast } from "@/components/ui/Toast";
import { LuLoader, LuCheck, LuX } from "react-icons/lu";
import type { BrokerEnvironment, BrokerType } from "@/types/broker";

// ── Shared Modal Shell ────────────────────────────────────────────────────────

export function ConnectionModal({
  title,
  broker,
  env,
  setEnv,
  displayName,
  setDisplayName,
  confirmed,
  setConfirmed,
  isPending,
  canSubmit,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  broker: BrokerType;
  env: BrokerEnvironment;
  setEnv: (e: BrokerEnvironment) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  isPending: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border-default bg-bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-display text-base font-bold uppercase tracking-[.1em] text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-text-muted transition-colors hover:text-text-primary"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* Environment */}
          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Environment
            </label>
            <div className="flex gap-2">
              {(broker === "coinbase" || broker === "kraken" || broker === "public" || broker === "robinhood"
                ? (["live"] as const)
                : broker === "binance"
                ? (["testnet", "live"] as const)
                : (["paper", "live"] as const) // alpaca, tradier, mt5
              ).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnv(e as BrokerEnvironment)}
                  className={`flex-1 rounded-sm border py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest transition-colors ${
                    env === e
                      ? "border-accent bg-accent text-bg-base"
                      : "border-border-default bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {e === "testnet" ? "Testnet" : e === "paper" ? (broker === "tradier" ? "Sandbox" : "Paper") : "Live"}
                </button>
              ))}
            </div>
            {(broker === "coinbase" || broker === "kraken" || broker === "public" || broker === "robinhood") && (
              <p className="mt-1.5 font-mono text-[.62rem] text-warning">
                ⚠ {
                  broker === "kraken" ? "Kraken" :
                  broker === "public" ? "Public.com" :
                  broker === "robinhood" ? "Robinhood Crypto" :
                  "Coinbase Advanced Trade"
                } is live only. Real funds will be used.
              </p>
            )}
            {env === "live" && broker !== "coinbase" && broker !== "kraken" && broker !== "public" && broker !== "robinhood" && (
              <p className="mt-1.5 font-mono text-[.62rem] text-warning">
                ⚠ Live trading uses real funds. Use {broker === "binance" ? "testnet" : broker === "tradier" ? "sandbox" : "paper"} mode for testing.
              </p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
              Display Name{" "}
              <span className="text-text-disabled">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={
                broker === "tradier" ? "My Tradier Sandbox"
                : broker === "mt5" ? "My MT5 Demo"
                : "My Alpaca Paper"
              }
              className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
            />
          </div>

          {/* Broker-specific credential fields */}
          {children}

          {/* Consent */}
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="font-mono text-[.65rem] leading-relaxed text-text-secondary">
              I confirm that my credentials will be stored encrypted
              {broker !== "coinbase" && broker !== "kraken" && broker !== "public" && broker !== "robinhood" && (
                <> and understand that I should use {broker === "binance" ? "testnet" : broker === "tradier" ? "sandbox" : "paper"} mode for testing</>
              )}
              .
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border-subtle px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-border-default bg-bg-elevated py-2 font-mono text-[.7rem] uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-accent py-2 font-mono text-[.7rem] font-bold uppercase tracking-widest text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <LuLoader className="h-3.5 w-3.5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <LuCheck className="h-3.5 w-3.5" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alpaca Connection Modal ───────────────────────────────────────────────────

export function CreateAlpacaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [env, setEnv] = useState<BrokerEnvironment>("paper");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      brokersApi.createConnection({
        environment: env,
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        api_secret: apiSecret,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Alpaca connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit =
    apiKey.trim().length > 0 &&
    apiSecret.trim().length > 0 &&
    confirmed &&
    !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Alpaca Connection"
      broker="alpaca"
      env={env}
      setEnv={setEnv}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Key <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="PKQB7UYDJUEO…"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Secret <span className="text-bear">*</span>
        </label>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="••••••••••••••••"
          autoComplete="new-password"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Stored encrypted. Never returned after creation.
        </p>
      </div>
    </ConnectionModal>
  );
}

// ── Tradier Connection Modal ──────────────────────────────────────────────────

export function CreateTradierModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [env, setEnv] = useState<BrokerEnvironment>("paper");
  const [displayName, setDisplayName] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      tradierApi.createConnection({
        environment: env,
        ...(displayName ? { display_name: displayName } : {}),
        bearer_token: bearerToken,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Tradier connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit =
    bearerToken.trim().length > 0 && confirmed && !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Tradier Connection"
      broker="tradier"
      env={env}
      setEnv={setEnv}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Bearer Token <span className="text-bear">*</span>
        </label>
        <input
          type="password"
          value={bearerToken}
          onChange={(e) => setBearerToken(e.target.value)}
          placeholder="Your Tradier sandbox or live OAuth token"
          autoComplete="new-password"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Generate from developer.tradier.com → Sandbox dashboard. Stored
          encrypted; never returned.
        </p>
      </div>
    </ConnectionModal>
  );
}

// ── Binance Connection Modal ──────────────────────────────────────────────────

export function CreateBinanceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [env, setEnv] = useState<BrokerEnvironment>("testnet");
  const [displayName, setDisplayName] = useState("");
  const [signingMethod, setSigningMethod] = useState<"hmac" | "ed25519">("hmac");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [ed25519Pem, setEd25519Pem] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      binanceApi.createConnection({
        environment: env as "testnet" | "live",
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        ...(signingMethod === "hmac"
          ? { api_secret: apiSecret }
          : { ed25519_pem: ed25519Pem, signing_method: "ed25519" as const }),
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Binance connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const secretFilled =
    signingMethod === "hmac" ? apiSecret.trim().length > 0 : ed25519Pem.trim().length > 0;

  const canSubmit =
    apiKey.trim().length > 0 && secretFilled && confirmed && !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Binance Connection"
      broker="binance"
      env={env}
      setEnv={setEnv}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* Signing method toggle */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Signing Method
        </label>
        <div className="flex gap-2">
          {(["hmac", "ed25519"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSigningMethod(m)}
              className={`flex-1 rounded-sm border py-1.5 font-mono text-[.68rem] uppercase tracking-widest transition-colors ${
                signingMethod === m
                  ? "border-accent bg-accent text-bg-base"
                  : "border-border-default bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              {m === "hmac" ? "HMAC" : "Ed25519"}
            </button>
          ))}
        </div>
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          HMAC recommended for testnet. Ed25519 for live accounts.
        </p>
      </div>

      {/* API Key */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Key <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Binance API key"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
      </div>

      {/* Secret or PEM */}
      {signingMethod === "hmac" ? (
        <div>
          <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
            API Secret <span className="text-bear">*</span>
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="••••••••••••••••"
            autoComplete="new-password"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
          />
          <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
            HMAC secret from Binance API management. Stored encrypted; never returned.
          </p>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
            Ed25519 Private Key (PEM) <span className="text-bear">*</span>
          </label>
          <textarea
            value={ed25519Pem}
            onChange={(e) => setEd25519Pem(e.target.value)}
            placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
            rows={4}
            autoComplete="off"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
          />
          <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
            PKCS#8 Ed25519 PEM. Stored encrypted; never returned.
          </p>
        </div>
      )}
    </ConnectionModal>
  );
}

// ── Coinbase Connection Modal ─────────────────────────────────────────────────

export function CreateCoinbaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      coinbaseApi.createConnection({
        environment: "live",
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        api_secret: apiSecret,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Coinbase connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit =
    apiKey.trim().length > 0 &&
    apiSecret.trim().length > 0 &&
    confirmed &&
    !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Coinbase Connection"
      broker="coinbase"
      env="live"
      setEnv={() => {}}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* API Key (CDP resource path) */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Key <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="organizations/{org-id}/apiKeys/{key-id}"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Full CDP resource path from Coinbase Developer Platform.
        </p>
      </div>

      {/* API Secret (EC PEM) */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Secret (EC Private Key) <span className="text-bear">*</span>
        </label>
        <textarea
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder={"-----BEGIN EC PRIVATE KEY-----\nMHc...\n-----END EC PRIVATE KEY-----"}
          rows={4}
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          EC PEM from Coinbase Developer Platform. Use \n for newlines. Stored encrypted; never returned.
        </p>
      </div>
    </ConnectionModal>
  );
}

// ── Kraken Connection Modal ───────────────────────────────────────────────────

export function CreateKrakenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [tier, setTier] = useState<"starter" | "intermediate" | "pro">("starter");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      krakenApi.createConnection({
        environment: "live",
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        api_secret: apiSecret,
        tier,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Kraken connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit =
    apiKey.trim().length > 0 &&
    apiSecret.trim().length > 0 &&
    confirmed &&
    !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Kraken Connection"
      broker="kraken"
      env="live"
      setEnv={() => {}}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* API Key */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Key <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Kraken REST API key"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
      </div>

      {/* API Secret (base64) */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Secret (base64) <span className="text-bear">*</span>
        </label>
        <input
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="Base64 private key from Kraken UI"
          autoComplete="new-password"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Shown once on creation in Kraken UI. Stored encrypted; never returned.
        </p>
      </div>

      {/* Tier */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Account Tier
        </label>
        <div className="flex gap-2">
          {(["starter", "intermediate", "pro"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`flex-1 rounded-sm border py-1.5 font-mono text-[.65rem] uppercase tracking-widest transition-colors ${
                tier === t
                  ? "border-accent bg-accent text-bg-base"
                  : "border-border-default bg-bg-elevated text-text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </ConnectionModal>
  );
}

// ── Public.com Connection Modal ───────────────────────────────────────────────

export function CreatePublicModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      publicApi.createConnection({
        environment: "live",
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        ...(accountId ? { account_id: accountId } : {}),
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Public.com connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit = apiKey.trim().length > 0 && confirmed && !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Public.com Connection"
      broker="public"
      env="live"
      setEnv={() => {}}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* Long-lived secret */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Long-lived Secret <span className="text-bear">*</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Public.com long-lived API secret"
          autoComplete="new-password"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          From Public.com → API settings. Stored encrypted; never returned.
        </p>
      </div>

      {/* Optional Account ID */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Account ID <span className="text-text-disabled">(optional)</span>
        </label>
        <input
          type="text"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Public.com accountId — leave blank to auto-detect"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
      </div>
    </ConnectionModal>
  );
}

// ── Robinhood Connection Modal ────────────────────────────────────────────────

export function CreateRobinhoodModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      robinhoodApi.createConnection({
        environment: "live",
        ...(displayName ? { display_name: displayName } : {}),
        api_key: apiKey,
        ed25519_private_key: privateKey,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      toast.success("Robinhood Crypto connection created.");
      onCreated();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Failed to create connection.");
    },
  });

  const canSubmit =
    apiKey.trim().length > 0 &&
    privateKey.trim().length > 0 &&
    confirmed &&
    !createMut.isPending;

  return (
    <ConnectionModal
      title="Add Robinhood Crypto Connection"
      broker="robinhood"
      env="live"
      setEnv={() => {}}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* API Key */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          API Key <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Robinhood Crypto API key"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
      </div>

      {/* Ed25519 Private Key */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Ed25519 Private Key (PEM) <span className="text-bear">*</span>
        </label>
        <textarea
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
          rows={4}
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Ed25519 PEM from Robinhood API settings. Stored encrypted; never returned.
        </p>
      </div>
    </ConnectionModal>
  );
}

// ── MT5 Connection Modal ──────────────────────────────────────────────────────

export function CreateMT5Modal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [env, setEnv] = useState<BrokerEnvironment>("paper");
  const [displayName, setDisplayName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      mt5Api.createConnection({
        environment: env as "paper" | "live",
        ...(displayName ? { display_name: displayName } : {}),
        login,
        password,
        server,
        confirm_secret_storage: true,
      }),
    onSuccess: () => {
      setPassword("");
      toast.success("MT5 connection created.");
      onCreated();
    },
    onError: (err) => {
      const data = axios.isAxiosError(err) ? err.response?.data : null;
      const msg =
        (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: { message?: string } }).detail === "object"
          ? (data as { detail: { message?: string } }).detail?.message
          : null) ??
        (data && typeof data === "object" && "message" in data
          ? (data as { message?: string }).message
          : null) ??
        "Failed to create MT5 connection.";
      toast.error(msg);
    },
  });

  const canSubmit =
    login.trim().length > 0 &&
    password.trim().length > 0 &&
    server.trim().length > 0 &&
    confirmed &&
    !createMut.isPending;

  return (
    <ConnectionModal
      title="Add MetaTrader 5 Connection"
      broker="mt5"
      env={env}
      setEnv={setEnv}
      displayName={displayName}
      setDisplayName={setDisplayName}
      confirmed={confirmed}
      setConfirmed={setConfirmed}
      isPending={createMut.isPending}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => createMut.mutate()}
    >
      {/* MT5 Login (account number) */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          MT5 Login (Account Number) <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="5000123456"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Your MT5 numeric account login provided by your broker.
        </p>
      </div>

      {/* Password */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Password <span className="text-bear">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          autoComplete="new-password"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          Stored encrypted one-time. Never returned after connection is created.
        </p>
      </div>

      {/* Server */}
      <div>
        <label className="mb-1.5 block font-mono text-[.65rem] uppercase tracking-widest text-text-muted">
          Server <span className="text-bear">*</span>
        </label>
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="MetaQuotes-Demo"
          autoComplete="off"
          className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none"
        />
        <p className="mt-1 font-mono text-[.6rem] text-text-disabled">
          MT5 server name — shown in the MT5 terminal login screen (e.g. MetaQuotes-Demo).
        </p>
      </div>

      {/* MT5-specific info */}
      <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2.5">
        <p className="font-mono text-[.6rem] leading-relaxed text-text-disabled">
          ⓘ MT5 supports FX (EURUSD, GBPUSD, USDJPY), commodities (XAUUSD), and CFDs.
          Orders use <strong className="text-text-secondary">lots</strong> (min 0.01) — no dollar/notional amounts.
          Options and multi-leg strategies are not supported.
        </p>
      </div>
    </ConnectionModal>
  );
}
