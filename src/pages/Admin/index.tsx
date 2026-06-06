// src/pages/Admin/index.tsx
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { rbacApi } from "@/api/endpoints/rbac";
import {
  useCurrentRole,
  useHasPermission,
} from "@/hooks/usePermissions";
import { toast } from "@/components/ui/Toast";
import type {
  CreatePermissionPayload,
  CreateRolePayload,
  Permission,
} from "@/types/rbac";
import {
  LuShield,
  LuKeyRound,
  LuLock,
  LuLoader,
  LuChevronRight,
  LuCheck,
  LuPlus,
  LuX,
  LuPencil,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";

// Code-format rules pulled directly from RBAC_API.md.
const ROLE_CODE_RE = /^[a-z][a-z0-9_]*$/;
const PERMISSION_CODE_RE = /^[a-z][a-z0-9_.]*$/;
const RESERVED_ROLE_CODES = new Set(["superadmin", "trader", "read_only"]);

type Tab = "roles" | "permissions";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("roles");
  const role = useCurrentRole();
  const canReadRoles = useHasPermission("rbac.roles.read");
  const canReadPerms = useHasPermission("rbac.permissions.read");

  // The page is reachable if either RBAC read permission is held.
  const hasAnyAccess = canReadRoles || canReadPerms;

  if (!hasAnyAccess) {
    return <NoAccess role={role} />;
  }

  // If they only have one of the two, force the visible tab to that one.
  const effectiveTab: Tab =
    tab === "roles" && !canReadRoles
      ? "permissions"
      : tab === "permissions" && !canReadPerms
      ? "roles"
      : tab;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl text-accent">⚙</span>
          <div>
            <h1 className="font-display text-base font-bold uppercase tracking-[.16em] text-text-primary">
              RBAC
            </h1>
            <p className="font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted">
              Roles & permissions · You are signed in as{" "}
              <span className="text-accent">{role ?? "unknown"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        <TabButton
          active={effectiveTab === "roles"}
          disabled={!canReadRoles}
          onClick={() => setTab("roles")}
          icon={<LuShield className="h-3.5 w-3.5" />}
          label="Roles"
        />
        <TabButton
          active={effectiveTab === "permissions"}
          disabled={!canReadPerms}
          onClick={() => setTab("permissions")}
          icon={<LuKeyRound className="h-3.5 w-3.5" />}
          label="Permissions"
        />
      </div>

      {effectiveTab === "roles" ? <RolesPanel /> : <PermissionsPanel />}
    </div>
  );
}

// ── Roles panel ───────────────────────────────────────────────────────────

function RolesPanel() {
  const { data: roles, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: rbacApi.listRoles,
  });
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const canWrite = useHasPermission("rbac.roles.write");

  if (isLoading) return <LoadingPanel label="Loading roles..." />;
  if (error) return <ErrorPanel err={error} onRetry={() => refetch()} />;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
      <PanelHeader
        title="System & Custom Roles"
        subtitle={`${roles?.length ?? 0} role${(roles?.length ?? 0) === 1 ? "" : "s"}`}
        loading={isFetching}
        action={
          canWrite && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border border-accent-border bg-accent-subtle px-2.5 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-accent transition-colors hover:bg-accent/15"
            >
              <LuPlus className="h-3 w-3" />
              New Role
            </button>
          )
        }
      />
      {createOpen && <CreateRoleModal onClose={() => setCreateOpen(false)} />}
      {openRole && (
        <RoleDetailsModal
          role={openRole}
          isSystem={
            (roles ?? []).find((r) => r.code === openRole)?.is_system ?? false
          }
          onClose={() => setOpenRole(null)}
        />
      )}
      <div className="divide-y divide-border-subtle">
        {(roles ?? []).map((r) => (
          <button
            key={r.code}
            onClick={() => setOpenRole(r.code)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-elevated"
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border ${
                r.is_system
                  ? "border-accent-border bg-accent-subtle text-accent"
                  : "border-border-default bg-bg-elevated text-text-secondary"
              }`}
            >
              <LuShield className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-[.78rem] font-bold uppercase tracking-[.1em] text-text-primary truncate">
                  {r.title}
                </p>
                {r.is_system && (
                  <span className="rounded-sm border border-border-subtle bg-bg-elevated px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-[.14em] text-text-muted">
                    System
                  </span>
                )}
              </div>
              <p className="font-mono text-[.62rem] text-text-disabled truncate">
                <span className="text-text-muted">{r.code}</span>
                {r.description ? ` · ${r.description}` : ""}
              </p>
            </div>
            <LuChevronRight className="h-4 w-4 flex-shrink-0 text-text-disabled" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Permissions panel ─────────────────────────────────────────────────────

function PermissionsPanel() {
  const { data: perms, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: rbacApi.listPermissions,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const canWrite = useHasPermission("rbac.permissions.write");

  if (isLoading) return <LoadingPanel label="Loading permissions..." />;
  if (error) return <ErrorPanel err={error} onRetry={() => refetch()} />;

  // Group by namespace prefix (rbac.*, broker.*, etc.) for readability.
  const grouped = groupByNamespace(perms ?? []);

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
      <PanelHeader
        title="Catalogued Permissions"
        subtitle={`${perms?.length ?? 0} permission${(perms?.length ?? 0) === 1 ? "" : "s"}`}
        loading={isFetching}
        action={
          canWrite && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border border-accent-border bg-accent-subtle px-2.5 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-accent transition-colors hover:bg-accent/15"
            >
              <LuPlus className="h-3 w-3" />
              New Permission
            </button>
          )
        }
      />
      {createOpen && <CreatePermissionModal onClose={() => setCreateOpen(false)} />}
      <div className="divide-y divide-border-subtle">
        {Object.entries(grouped).map(([ns, list]) => (
          <div key={ns} className="px-4 py-3">
            <p className="mb-2 font-mono text-[.6rem] uppercase tracking-[.16em] text-text-muted">
              {ns}
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {list.map((p) => (
                <PermissionCard key={p.code} perm={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByNamespace<T extends { code: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const ns = item.code.split(".")[0] ?? "other";
    (acc[ns] ??= []).push(item);
    return acc;
  }, {});
}

function PermissionCard({ perm }: { perm: Permission }) {
  const qc = useQueryClient();
  const canDelete = useHasPermission("rbac.permissions.write") && !perm.is_system;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => rbacApi.deletePermission(perm.code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac", "permissions"] });
      toast.success(`Permission "${perm.code}" deleted.`);
      setConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Couldn't delete permission."));
    },
  });

  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[.72rem] font-bold uppercase tracking-[.08em] text-text-primary truncate">
          {perm.title}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {perm.is_system && (
            <span className="rounded-sm border border-border-default bg-bg-overlay px-1.5 py-0.5 font-mono text-[.55rem] uppercase tracking-[.14em] text-text-muted">
              Sys
            </span>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${perm.code}`}
              title="Delete permission"
              className="rounded-sm p-1 text-text-disabled transition-colors hover:bg-bear/10 hover:text-bear"
            >
              <LuTrash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-0.5 font-mono text-[.6rem] text-accent">{perm.code}</p>
      {perm.description && (
        <p className="mt-1 text-[.7rem] text-text-secondary">{perm.description}</p>
      )}

      {confirmOpen && (
        <ConfirmDeleteDialog
          title="Delete permission?"
          body={
            <>
              This will soft-delete <span className="text-bear">{perm.code}</span>.
              Any role currently granted this permission will lose it.
            </>
          }
          confirmLabel="Delete Permission"
          pending={deleteMutation.isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
        />
      )}
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────

function PanelHeader({
  title,
  subtitle,
  loading,
  action,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-text-muted">
          {title}
        </span>
        {subtitle && (
          <span className="font-mono text-[.6rem] text-text-disabled">{subtitle}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loading && <LuLoader className="h-3.5 w-3.5 animate-spin text-text-disabled" />}
        {action}
      </div>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-8">
      <div className="flex items-center justify-center gap-2 font-mono text-[.7rem] text-text-muted">
        <LuLoader className="h-3.5 w-3.5 animate-spin" /> {label}
      </div>
    </div>
  );
}

function ErrorPanel({ err, onRetry }: { err: unknown; onRetry: () => void }) {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const code =
    axios.isAxiosError(err) && err.response?.data?.code
      ? (err.response.data.code as string)
      : null;

  if (status === 403 || code === "INSUFFICIENT_PERMISSIONS") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <LuLock className="h-6 w-6 text-text-disabled" />
          <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
            You don't have permission to view this.
          </p>
        </div>
      </div>
    );
  }

  const msg =
    axios.isAxiosError(err) && err.response?.data?.message
      ? err.response.data.message
      : "Couldn't load data.";

  return (
    <div className="rounded-lg border border-bear/30 bg-bear/5 p-6">
      <div className="flex flex-col items-center text-center gap-3">
        <p className="font-mono text-[.7rem] text-bear">{msg}</p>
        <button
          onClick={onRetry}
          className="rounded-sm border border-border-default bg-bg-elevated px-3 py-1.5 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function NoAccess({ role }: { role: string | null }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-12">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-default bg-bg-elevated text-text-disabled">
          <LuLock className="h-5 w-5" />
        </div>
        <h2 className="font-display text-base font-bold uppercase tracking-[.12em] text-text-primary">
          Restricted
        </h2>
        <p className="max-w-sm font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted">
          Your role{role ? ` (${role})` : ""} doesn't include RBAC visibility.
          Ask a superadmin to grant <span className="text-accent">rbac.roles.read</span>{" "}
          or <span className="text-accent">rbac.permissions.read</span>.
        </p>
      </div>
    </div>
  );
}

// ── Role details / permission editor modal ────────────────────────────────

// Action columns for the matrix. Anything outside this set falls into the
// "Other" column so nothing in the catalogue gets hidden from admins.
const MATRIX_ACTIONS = ["read", "write", "delete"] as const;
type MatrixAction = typeof MATRIX_ACTIONS[number] | "other";

interface MatrixCell {
  code: string;          // full permission code, e.g. "rbac.roles.read"
  action: MatrixAction;  // the parsed action segment
}

interface MatrixRow {
  resource: string;                              // e.g. "rbac.roles"
  cells: Partial<Record<MatrixAction, MatrixCell>>;
}

function buildMatrix(allCodes: string[]): MatrixRow[] {
  const byResource = new Map<string, MatrixRow>();

  for (const code of allCodes) {
    const segments = code.split(".");
    const last = segments[segments.length - 1] ?? code;
    const resource = segments.length > 1 ? segments.slice(0, -1).join(".") : code;
    const action: MatrixAction =
      (MATRIX_ACTIONS as readonly string[]).includes(last)
        ? (last as MatrixAction)
        : "other";

    const row = byResource.get(resource) ?? { resource, cells: {} };
    row.cells[action] = { code, action };
    byResource.set(resource, row);
  }

  return Array.from(byResource.values()).sort((a, b) =>
    a.resource.localeCompare(b.resource)
  );
}

function RoleDetailsModal({
  role,
  isSystem,
  onClose,
}: {
  role: string;
  isSystem: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const canEdit = useHasPermission("rbac.role_permissions.write");
  const canDelete = useHasPermission("rbac.roles.write") && !isSystem;
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Current grants for the role.
  const grantedQuery = useQuery({
    queryKey: ["rbac", "roles", role, "permissions"],
    queryFn: () => rbacApi.getRolePermissions(role),
  });

  // Catalogue of every permission — only loaded when we enter edit mode.
  const catalogueQuery = useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: rbacApi.listPermissions,
    enabled: mode === "edit",
  });

  // Local working set of selected codes during edit.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // When we enter edit mode (or current grants change), seed the selection.
  useEffect(() => {
    if (mode === "edit" && grantedQuery.data) {
      setSelected(new Set(grantedQuery.data));
    }
  }, [mode, grantedQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (perms: string[]) => rbacApi.setRolePermissions(role, perms),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac", "roles", role, "permissions"] });
      toast.success("Permissions updated.");
      setMode("view");
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Couldn't update permissions."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => rbacApi.deleteRole(role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac", "roles"] });
      qc.removeQueries({ queryKey: ["rbac", "roles", role, "permissions"] });
      toast.success(`Role "${role}" deleted.`);
      setConfirmDelete(false);
      onClose();
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Couldn't delete role."));
    },
  });

  const matrix = catalogueQuery.data
    ? buildMatrix(catalogueQuery.data.map((p) => p.code))
    : [];
  const hasOtherColumn = matrix.some((r) => r.cells.other);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleColumn(action: MatrixAction, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of matrix) {
        const cell = row.cells[action];
        if (!cell) continue;
        if (on) next.add(cell.code);
        else next.delete(cell.code);
      }
      return next;
    });
  }

  function toggleRow(row: MatrixRow, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const cell of Object.values(row.cells)) {
        if (!cell) continue;
        if (on) next.add(cell.code);
        else next.delete(cell.code);
      }
      return next;
    });
  }

  function handleSave() {
    saveMutation.mutate(Array.from(selected).sort());
  }

  return (
    <ModalShell title={`Role · ${role}`} onClose={onClose} wide>
      {/* Mode toggle / actions */}
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-muted">
          {mode === "view" ? "Granted permissions" : "Edit permissions"}
          {grantedQuery.isFetching && (
            <LuLoader className="h-3 w-3 animate-spin text-text-disabled" />
          )}
        </div>
        {mode === "view" ? (
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setMode("edit")}
                className="flex items-center gap-1.5 rounded-sm border border-accent-border bg-accent-subtle px-2.5 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-accent transition-colors hover:bg-accent/15"
              >
                <LuPencil className="h-3 w-3" /> Edit Permissions
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-sm border border-bear/40 bg-bear/10 px-2.5 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-bear transition-colors hover:bg-bear/20"
              >
                <LuTrash2 className="h-3 w-3" /> Delete Role
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setMode("view")}
            className="flex items-center gap-1.5 rounded-sm border border-border-default bg-bg-elevated px-2.5 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
          >
            Cancel edit
          </button>
        )}
      </div>

      {mode === "view" ? (
        <div className="p-5">
          {grantedQuery.isLoading ? (
            <LoadingPanel label="Loading permissions..." />
          ) : grantedQuery.error ? (
            <p className="font-mono text-[.65rem] text-bear">
              {extractApiError(grantedQuery.error, "Couldn't load permissions for this role.")}
            </p>
          ) : !grantedQuery.data || grantedQuery.data.length === 0 ? (
            <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-text-muted italic">
              No permissions granted.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {grantedQuery.data.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-sm border border-accent-border bg-accent-subtle px-2 py-0.5 font-mono text-[.62rem] text-accent"
                >
                  <LuCheck className="h-2.5 w-2.5" />
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Edit mode — matrix
        <div className="flex max-h-[70vh] flex-col">
          <div className="overflow-auto">
            {catalogueQuery.isLoading ? (
              <div className="p-6">
                <LoadingPanel label="Loading permission catalogue..." />
              </div>
            ) : catalogueQuery.error ? (
              <div className="p-5">
                <p className="font-mono text-[.65rem] text-bear">
                  {extractApiError(catalogueQuery.error, "Couldn't load permission catalogue.")}
                </p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-[.72rem]">
                <thead className="sticky top-0 z-10 bg-bg-surface">
                  <tr>
                    <th className="border-b border-border-subtle px-4 py-2 text-left font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted">
                      Resource
                    </th>
                    {MATRIX_ACTIONS.map((a) => {
                      // Header checkbox toggles the entire column at once.
                      const colCells = matrix
                        .map((r) => r.cells[a])
                        .filter((c): c is MatrixCell => !!c);
                      const allOn =
                        colCells.length > 0 && colCells.every((c) => selected.has(c.code));
                      const anyOn = colCells.some((c) => selected.has(c.code));
                      return (
                        <th
                          key={a}
                          className="border-b border-border-subtle px-3 py-2 text-center font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{a}</span>
                            <TriCheckbox
                              checked={allOn}
                              indeterminate={!allOn && anyOn}
                              disabled={colCells.length === 0}
                              onChange={(on) => toggleColumn(a, on)}
                            />
                          </div>
                        </th>
                      );
                    })}
                    {hasOtherColumn && (
                      <th className="border-b border-border-subtle px-3 py-2 text-center font-mono text-[.6rem] uppercase tracking-[.14em] text-text-muted">
                        Other
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => {
                    const rowCells = Object.values(row.cells).filter(
                      (c): c is MatrixCell => !!c
                    );
                    const allOn =
                      rowCells.length > 0 && rowCells.every((c) => selected.has(c.code));
                    const anyOn = rowCells.some((c) => selected.has(c.code));
                    return (
                      <tr
                        key={row.resource}
                        className="hover:bg-bg-elevated/60 transition-colors"
                      >
                        <td className="border-b border-border-subtle px-4 py-2">
                          <div className="flex items-center gap-2">
                            <TriCheckbox
                              checked={allOn}
                              indeterminate={!allOn && anyOn}
                              onChange={(on) => toggleRow(row, on)}
                            />
                            <span className="font-mono text-[.7rem] text-text-primary">
                              {row.resource}
                            </span>
                          </div>
                        </td>
                        {MATRIX_ACTIONS.map((a) => {
                          const cell = row.cells[a];
                          return (
                            <td
                              key={a}
                              className="border-b border-border-subtle px-3 py-2 text-center"
                            >
                              {cell ? (
                                <label
                                  className="inline-flex cursor-pointer items-center justify-center"
                                  title={cell.code}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected.has(cell.code)}
                                    onChange={() => toggle(cell.code)}
                                    className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent"
                                  />
                                </label>
                              ) : (
                                <span className="text-text-disabled">—</span>
                              )}
                            </td>
                          );
                        })}
                        {hasOtherColumn && (
                          <td className="border-b border-border-subtle px-3 py-2 text-center">
                            {row.cells.other ? (
                              <label
                                className="inline-flex cursor-pointer items-center justify-center"
                                title={row.cells.other.code}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(row.cells.other.code)}
                                  onChange={() => toggle(row.cells.other!.code)}
                                  className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent"
                                />
                              </label>
                            ) : (
                              <span className="text-text-disabled">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-bg-surface px-5 py-3">
            <span className="font-mono text-[.62rem] uppercase tracking-[.14em] text-text-muted">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || catalogueQuery.isLoading}
                className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.7rem] font-bold uppercase tracking-[.14em] text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending && (
                  <LuLoader className="h-3.5 w-3.5 animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Delete role?"
          body={
            <>
              This will soft-delete the role <span className="text-bear">{role}</span>.
              Users currently assigned to this role will need to be reassigned.
            </>
          }
          confirmLabel="Delete Role"
          pending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
        />
      )}
    </ModalShell>
  );
}

// Tri-state checkbox driven by parent state. Renders a real <input> so
// keyboard + form-a11y still work; we just set `indeterminate` via ref.
function TriCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-3.5 w-3.5 rounded-sm border-border-default bg-bg-elevated accent-accent disabled:opacity-40"
    />
  );
}

// ── Create Role modal ─────────────────────────────────────────────────────

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => rbacApi.createRole(payload),
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ["rbac", "roles"] });
      toast.success(`Role "${role.title || role.code}" created.`);
      onClose();
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Couldn't create role."));
    },
  });

  // Local validation that mirrors the backend rules.
  const codeError =
    code.length === 0
      ? null
      : !ROLE_CODE_RE.test(code)
      ? "Lowercase letters, digits, underscore. Must start with a letter."
      : RESERVED_ROLE_CODES.has(code)
      ? "Reserved system role — pick another code."
      : null;
  const canSubmit =
    code.length > 0 && title.length > 0 && !codeError && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedDesc = description.trim();
    const payload: CreateRolePayload = {
      code: code.trim(),
      title: title.trim(),
      ...(trimmedDesc ? { description: trimmedDesc } : {}),
    };
    mutation.mutate(payload);
  }

  return (
    <ModalShell title="Create Role" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <Field
          label="Code"
          hint="Lowercase, snake_case (e.g. risk_manager)"
          error={codeError}
        >
          <input
            autoFocus
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="risk_manager"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.78rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Risk Manager"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.78rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Can manage risk rules and alerts."
            rows={3}
            className="w-full resize-none rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Create Role" pending={mutation.isPending} disabled={!canSubmit} />
      </form>
    </ModalShell>
  );
}

// ── Create Permission modal ───────────────────────────────────────────────

function CreatePermissionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: CreatePermissionPayload) =>
      rbacApi.createPermission(payload),
    onSuccess: (perm) => {
      qc.invalidateQueries({ queryKey: ["rbac", "permissions"] });
      toast.success(`Permission "${perm.title || perm.code}" created.`);
      onClose();
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Couldn't create permission."));
    },
  });

  const codeError =
    code.length === 0
      ? null
      : !PERMISSION_CODE_RE.test(code)
      ? "Lowercase letters, digits, underscore, and dots. Must start with a letter."
      : null;
  const canSubmit =
    code.length > 0 && title.length > 0 && !codeError && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedDesc = description.trim();
    const payload: CreatePermissionPayload = {
      code: code.trim(),
      title: title.trim(),
      ...(trimmedDesc ? { description: trimmedDesc } : {}),
    };
    mutation.mutate(payload);
  }

  return (
    <ModalShell title="Create Permission" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <Field
          label="Code"
          hint="Namespaced, dot-separated (e.g. broker.connect.write)"
          error={codeError}
        >
          <input
            autoFocus
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="broker.connect.write"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.78rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Manage broker connections"
            className="w-full rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.78rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Create and revoke broker connections."
            rows={3}
            className="w-full resize-none rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.75rem] text-text-primary placeholder-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Create Permission" pending={mutation.isPending} disabled={!canSubmit} />
      </form>
    </ModalShell>
  );
}

// ── Confirm-delete dialog (shared by role + permission deletes) ──────────

function ConfirmDeleteDialog({
  title,
  body,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Esc to cancel; lock body scroll while open. Stops the parent modal
  // (if any) from also reacting to the same Escape press by stopping
  // propagation in the keydown handler.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-bear/30 bg-bg-surface shadow-card"
      >
        <div className="flex items-start gap-3 p-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-bear/30 bg-bear/10 text-bear">
            <LuTriangleAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[.82rem] font-bold uppercase tracking-[.12em] text-text-primary">
              {title}
            </h3>
            <p className="mt-1.5 text-[.74rem] leading-relaxed text-text-secondary">
              {body}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 rounded-sm bg-bear px-4 py-2 font-mono text-[.7rem] font-bold uppercase tracking-[.14em] text-white transition-colors hover:bg-bear/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal primitives ──────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-lg border border-border-subtle bg-bg-surface shadow-card ${
          wide
            ? "w-[70vw] max-w-[1400px] min-w-[640px]"
            : "w-full max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="font-display text-[.82rem] font-bold uppercase tracking-[.12em] text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[.62rem] uppercase tracking-[.16em] text-text-muted">
        {label}
      </span>
      {children}
      {error ? (
        <span className="font-mono text-[.6rem] text-bear">{error}</span>
      ) : hint ? (
        <span className="font-mono text-[.6rem] text-text-disabled">{hint}</span>
      ) : null}
    </label>
  );
}

function FormActions({
  onCancel,
  submitLabel,
  pending,
  disabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-sm border border-border-default bg-bg-elevated px-3 py-2 font-mono text-[.7rem] uppercase tracking-[.14em] text-text-secondary transition-colors hover:border-border-subtle hover:text-text-primary"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="flex items-center gap-2 rounded-sm bg-accent px-4 py-2 font-mono text-[.7rem] font-bold uppercase tracking-[.14em] text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <LuLoader className="h-3.5 w-3.5 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.message) return data.message;
    if (data?.code) return data.code;
  }
  return fallback;
}

function TabButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-t-sm border-b-2 px-3 py-2 font-mono text-[.65rem] uppercase tracking-[.14em] transition-colors ${
        disabled
          ? "border-transparent text-text-disabled cursor-not-allowed"
          : active
          ? "border-accent text-accent"
          : "border-transparent text-text-muted hover:text-text-secondary"
      }`}
    >
      {icon}
      {label}
      {disabled && <LuLock className="h-3 w-3" />}
    </button>
  );
}
