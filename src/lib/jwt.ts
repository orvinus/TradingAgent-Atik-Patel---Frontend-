// src/lib/jwt.ts
// Minimal JWT payload decoder. We only inspect the claim payload — never
// trust it for authorization decisions, the backend is still the gate.

function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  // atob handles ASCII; JWT payloads are typically ASCII JSON.
  return atob(b64);
}

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const json = base64UrlDecode(payload);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Common claim names different backends use for the user's role.
const ROLE_CLAIMS = ["role", "user_role", "userRole", "r"] as const;

export function extractRoleFromJwt(token: string | null | undefined): string | null {
  if (!token) return null;
  const payload = decodeJwt<Record<string, unknown>>(token);
  if (!payload) return null;
  for (const key of ROLE_CLAIMS) {
    const v = payload[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}
