# TRADING-OS — RBAC (Roles & Permissions) API

This document describes the RBAC system added to the backend:

- `users.role` (single-role model)
- `auth_roles`
- `auth_permissions`
- `auth_role_permissions`

**Base URL:** `http://localhost:3000`  
**RBAC prefix:** `/api/v1/rbac`

---

## 1. Data model

### 1.1 Roles

- Table: `auth_roles`
- Primary key: `code` (stable string key)
- Built-in system roles (seeded by migration):
  - `superadmin`
  - `trader`
  - `read_only`

### 1.2 Permissions

- Table: `auth_permissions`
- Primary key: `code` (stable string key)
- Built-in permissions (seeded):
  - `rbac.roles.read`
  - `rbac.roles.write`
  - `rbac.permissions.read`
  - `rbac.permissions.write`
  - `rbac.role_permissions.write`

### 1.3 Role → Permission mapping

- Table: `auth_role_permissions` (many-to-many)
- Seeded grants:
  - `superadmin` has all seeded permissions
  - `trader` has read-only RBAC visibility (`rbac.roles.read`, `rbac.permissions.read`)
  - `read_only` has none by default

### 1.4 User role

- Column: `users.role` (TEXT, **NOT NULL**, default `read_only`)
- FK: `users.role` → `auth_roles.code`

---

## 2. Authentication / Authorization

All RBAC endpoints require:

- `Authorization: Bearer <access_token>` (from login)
- A required permission:
  - Roles list/view: `rbac.roles.read`
  - Roles manage: `rbac.roles.write`
  - Permissions list/view: `rbac.permissions.read`
  - Permissions manage: `rbac.permissions.write`
  - Assign permissions to role: `rbac.role_permissions.write`

If the caller lacks permission, the API returns:

```json
{
  "success": false,
  "message": "You do not have permission to perform this action.",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

---

## 3. APIs

### 3.1 Roles

#### List roles

`GET /api/v1/rbac/roles`

**Permission:** `rbac.roles.read`

Response:

```json
{
  "success": true,
  "roles": [
    { "code": "read_only", "title": "Read Only", "description": "...", "is_system": true },
    { "code": "superadmin", "title": "Super Admin", "description": "...", "is_system": true },
    { "code": "trader", "title": "Trader", "description": "...", "is_system": true }
  ]
}
```

#### Get role

`GET /api/v1/rbac/roles/:code`

:code => auth_roles.code column => Example=> superadmin, trader, read_only

**Permission:** `rbac.roles.read`

#### Create role

`POST /api/v1/rbac/roles`

**Permission:** `rbac.roles.write`

Body:

```json
{
  "code": "risk_manager",
  "title": "Risk Manager",
  "description": "Can manage risk rules and alerts."
}
```

Notes:

- `code` format: `^[a-z][a-z0-9_]*$`
- Reserved codes: `superadmin`, `trader`, `read_only` (cannot be created)

#### Update role

`PATCH /api/v1/rbac/roles/:code`

**Permission:** `rbac.roles.write`

Body:

```json
{
  "title": "Risk Manager",
  "description": "Updated description"
}
```

Notes:

- System roles cannot be edited.

#### Delete role

`DELETE /api/v1/rbac/roles/:code`

**Permission:** `rbac.roles.write`

Notes:

- Soft delete (`deleted_at`) on `auth_roles`
- System roles cannot be deleted.

---

### 3.2 Permissions

#### List permissions

`GET /api/v1/rbac/permissions`

**Permission:** `rbac.permissions.read`

#### Get permission

`GET /api/v1/rbac/permissions/:code`

**Permission:** `rbac.permissions.read`

#### Create permission

`POST /api/v1/rbac/permissions`

**Permission:** `rbac.permissions.write`

Body:

```json
{
  "code": "broker.connect.write",
  "title": "Manage broker connections",
  "description": "Create and revoke broker connections."
}
```

Notes:

- `code` format: `^[a-z][a-z0-9_.]*$` (supports namespaces like `rbac.roles.write`)

#### Update permission

`PATCH /api/v1/rbac/permissions/:code`

**Permission:** `rbac.permissions.write`

Notes:

- System permissions cannot be edited.

#### Delete permission

`DELETE /api/v1/rbac/permissions/:code`

**Permission:** `rbac.permissions.write`

Notes:

- Soft delete (`deleted_at`) on `auth_permissions`
- System permissions cannot be deleted.

---

### 3.3 Role permissions (assign)

#### Get permissions for role

`GET /api/v1/rbac/roles/:code/permissions`

**Permission:** `rbac.roles.read`

Response:

```json
{
  "success": true,
  "role": "trader",
  "permissions": ["rbac.permissions.read", "rbac.roles.read"]
}
```

#### Set permissions for role (replace set)

`PUT /api/v1/rbac/roles/:code/permissions`

**Permission:** `rbac.role_permissions.write`

Body:

```json
{
  "permissions": [
    "rbac.roles.read",
    "rbac.permissions.read"
  ]
}
```

Behavior:

- Replaces the entire set for the role (`DELETE` + `INSERT`)
- Rejects unknown permission codes with `400 UNKNOWN_PERMISSIONS`

---

### 3.4 User role management (superadmin)

#### Update a user role

`PATCH /api/v1/users/:id/role`

**Permission:** `auth.users.role.write`  
(**seeded and granted to `superadmin`**)

Body:

```json
{
  "role": "trader"
}
```

Response:

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "Arjun",
    "last_name": "Shah",
    "role": "trader",
    "updated_at": "2026-05-07T15:21:00.000Z"
  }
}
```

Notes:

- Only callers with `auth.users.role.write` can use it.
- Target role must exist in `auth_roles`.
- Safety rule: caller cannot remove their own `superadmin` access.

---

## 4. Migration files

DB migration created/added:

- `db/migrations/005_rbac_roles_permissions.sql`
- `db/migrations/006_rbac_user_role_manage_permission.sql`

It creates:

- `auth_roles`
- `auth_permissions`
- `auth_role_permissions`
- `users.role` (default `read_only`) + FK to roles
- Seeds system roles and baseline permissions and grants.

---

## 5. Frontend integration notes

Suggested UI pages:

- **Roles list**: GET `/api/v1/rbac/roles`
- **Role detail**: GET `/api/v1/rbac/roles/:code`
- **Permissions list**: GET `/api/v1/rbac/permissions`
- **Role permissions editor**:
  - GET `/api/v1/rbac/roles/:code/permissions`
  - PUT `/api/v1/rbac/roles/:code/permissions` (send selected permission codes)
- **User role editor**:
  - PATCH `/api/v1/users/:id/role` with body `{ "role": "<role_code>" }`

---

## 6. Next enhancements (optional)

- Add an outbox/audit table for RBAC changes (`RBAC_ROLE_CREATED`, etc.) in `auth_audit_logs`.
- Add multi-role model (`user_roles` join table) if you ever need multiple roles per user.

