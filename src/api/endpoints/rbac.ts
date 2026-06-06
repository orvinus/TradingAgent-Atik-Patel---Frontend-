// src/api/endpoints/rbac.ts
import { apiClient } from "@/api/client";
import type {
  CreatePermissionPayload,
  CreateRolePayload,
  PermissionResponse,
  PermissionsListResponse,
  RolePermissionsResponse,
  RoleResponse,
  RolesListResponse,
} from "@/types/rbac";

export const rbacApi = {
  listRoles: async () => {
    const { data } = await apiClient.get<RolesListResponse>("/rbac/roles");
    return data.roles;
  },

  getRole: async (code: string) => {
    const { data } = await apiClient.get<RoleResponse>(`/rbac/roles/${code}`);
    return data.role;
  },

  createRole: async (payload: CreateRolePayload) => {
    const { data } = await apiClient.post<RoleResponse>("/rbac/roles", payload);
    return data.role;
  },

  deleteRole: async (code: string) => {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/rbac/roles/${code}`
    );
    return data;
  },

  listPermissions: async () => {
    const { data } = await apiClient.get<PermissionsListResponse>(
      "/rbac/permissions"
    );
    return data.permissions;
  },

  getPermission: async (code: string) => {
    const { data } = await apiClient.get<PermissionResponse>(
      `/rbac/permissions/${code}`
    );
    return data.permission;
  },

  createPermission: async (payload: CreatePermissionPayload) => {
    const { data } = await apiClient.post<PermissionResponse>(
      "/rbac/permissions",
      payload
    );
    return data.permission;
  },

  deletePermission: async (code: string) => {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/rbac/permissions/${code}`
    );
    return data;
  },

  getRolePermissions: async (code: string) => {
    const { data } = await apiClient.get<RolePermissionsResponse>(
      `/rbac/roles/${code}/permissions`
    );
    return data.permissions;
  },

  setRolePermissions: async (code: string, permissions: string[]) => {
    const { data } = await apiClient.put<RolePermissionsResponse>(
      `/rbac/roles/${code}/permissions`,
      { permissions }
    );
    return data.permissions;
  },
};
