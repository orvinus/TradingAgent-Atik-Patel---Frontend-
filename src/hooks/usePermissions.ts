// src/hooks/usePermissions.ts
import { useAppStore } from "@/store/index";
import { rbacApi } from "@/api/endpoints/rbac";
import { extractRoleFromJwt } from "@/lib/jwt";
import type { RbacPermissionCode } from "@/types/rbac";

export function useCurrentRole(): string | null {
  return useAppStore((s) => s.role);
}

export function usePermissions(): string[] {
  return useAppStore((s) => s.permissions);
}

export function useHasPermission(code: RbacPermissionCode): boolean {
  return useAppStore((s) => s.permissions.includes(code));
}

export function useHasAnyPermission(codes: RbacPermissionCode[]): boolean {
  return useAppStore((s) => codes.some((c) => s.permissions.includes(c)));
}

// Pull the role from the JWT and load the role's permissions from the
// backend. Safe to call on login and on app boot — failures are swallowed
// (e.g. read_only users can't read RBAC, that's expected).
export async function loadRoleAndPermissions(token: string | null): Promise<void> {
  const { setRole, setPermissions } = useAppStore.getState();
  if (!token) {
    setRole(null);
    setPermissions([]);
    return;
  }

  const role = extractRoleFromJwt(token);
  setRole(role);

  if (!role) return;

  try {
    const perms = await rbacApi.getRolePermissions(role);
    setPermissions(perms);
  } catch {
    // 403 (no rbac.roles.read) or any transient error — leave permissions
    // as whatever was last persisted. UI gates default to "no access" when
    // permissions list is empty, which is the safer fallback.
  }
}
