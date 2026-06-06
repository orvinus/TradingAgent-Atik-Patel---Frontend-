// src/types/rbac.ts

export interface Role {
  code: string;
  title: string;
  description?: string | null;
  is_system?: boolean;
}

export interface Permission {
  code: string;
  title: string;
  description?: string | null;
  is_system?: boolean;
}

// Server envelopes from RBAC_API.md
export interface RolesListResponse {
  success: boolean;
  roles: Role[];
}

export interface RoleResponse {
  success: boolean;
  role: Role;
}

export interface PermissionsListResponse {
  success: boolean;
  permissions: Permission[];
}

export interface PermissionResponse {
  success: boolean;
  permission: Permission;
}

export interface RolePermissionsResponse {
  success: boolean;
  role: string;
  permissions: string[]; // permission codes
}

export interface CreateRolePayload {
  code: string;
  title: string;
  description?: string;
}

export interface CreatePermissionPayload {
  code: string;
  title: string;
  description?: string;
}

// Built-in permission codes from the RBAC doc — typed for autocomplete.
export type RbacPermissionCode =
  | "rbac.roles.read"
  | "rbac.roles.write"
  | "rbac.permissions.read"
  | "rbac.permissions.write"
  | "rbac.role_permissions.write"
  | "auth.users.role.write"
  | (string & {});
