# Frontend Implementation Prompt — Notifications & Admin Send Alerts

Use this document as the **single implementation spec** for building notification UI in the TRADING-OS frontend.

**API reference:** `docs/NOTIFICATIONS_API.md`  
**Postman:** `docs/postman/TRADING-OS_Telegram_Discord_Connections.postman_collection.json`

---

## Scope

### Build (this task)

1. **Header notification bell** — preview latest 2–3 notifications + “Show more”
2. **Notifications page** — full list, pagination, filters, read/unread
3. **Admin “Send Alerts”** — sidebar entry to send notifications via Telegram, Discord, or both (user + broadcast)

### Do NOT build (already done)

- Telegram connect / disconnect UI
- Discord connect / disconnect UI
- Connection status settings page logic

Reuse existing connection components; only **consume** inbox and dispatch APIs described below.

---

## Prerequisites (backend gap — resolve before admin send UI)

### 1. Admin dispatch proxy (required for production)

Dispatch APIs require header:

```
X-Notifications-Api-Key: <NOTIFICATIONS_DISPATCH_API_KEY>
```

**Never** put this key in `VITE_*` env vars shipped to the browser.

**Recommended backend addition** (small proxy layer):

| Method | Path | Auth | Action |
|--------|------|------|--------|
| POST | `/api/v1/admin/notifications/dispatch/user` | JWT + admin permission | Forward to internal dispatch with server-side key |
| POST | `/api/v1/admin/notifications/dispatch/broadcast` | JWT + admin permission | Same |
| POST | `/api/v1/admin/notifications/telegram/dispatch/user` | JWT + admin | Same |
| POST | `/api/v1/admin/notifications/telegram/dispatch/broadcast` | JWT + admin | Same |
| POST | `/api/v1/admin/notifications/discord/dispatch/user` | JWT + admin | Same |
| POST | `/api/v1/admin/notifications/discord/dispatch/broadcast` | JWT + admin | Same |

Until proxy exists, admin UI can only be tested via Postman or a dev-only Vite proxy that injects the header server-side.

### 2. User picker API (required for “send to one user”)

There is **no** `GET /users` list endpoint today. Add one for admin:

**Suggested:** `GET /api/v1/admin/users?search=&limit=20&offset=0`  
Returns `{ id, email, firstName, lastName, role }` for searchable dropdown.

**Interim workaround:** Manual UUID input field (dev only).

---

## Auth patterns

### User inbox APIs — Bearer JWT

```ts
headers: {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}
```

Use existing auth store / axios interceptor.

### Admin dispatch — JWT only (via proxy)

```ts
headers: {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}
// Do NOT send X-Notifications-Api-Key from browser
```

---

## Feature 1 — Header notification bell

### Placement

Top navbar / app header, right side (near profile menu).

### UI behavior

```
┌─────────────────────────────────────────┐
│  [Logo]  Nav items...     🔔(3)  [User] │
└─────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Trade alert        │
                    │ BTC signal fired   │
                    │ 2 min ago · unread │
                    ├────────────────────┤
                    │ Maintenance        │
                    │ Tonight 02:00 UTC  │
                    │ 1 hr ago           │
                    ├────────────────────┤
                    │      Show more →   │
                    └────────────────────┘
```

### API calls

| Action | Endpoint |
|--------|----------|
| Badge count | `GET /api/v1/notifications/inbox/unread-count` |
| Dropdown preview | `GET /api/v1/notifications/inbox?limit=3&offset=0` |

### Implementation notes

- Show red badge when `unreadCount > 0` (cap display at `99+`).
- Poll unread count every **60s** and on window focus.
- Each row: `title` or fallback to `kind`, `body` (truncate 1 line), relative time from `createdAt`.
- Unread rows: bold title + dot indicator (`isRead === false`).
- Click row → mark read (`POST .../inbox/:id/read`) + optional expand/detail.
- **Show more** → navigate to `/notifications` (or `/app/notifications`).

### Suggested files

```
src/features/notifications/
  components/NotificationBell.tsx
  components/NotificationDropdown.tsx
  hooks/useUnreadCount.ts
  hooks/useNotificationInbox.ts
  api/notificationsApi.ts
```

---

## Feature 2 — Notifications page (full inbox)

### Route

`/notifications` — available to **all authenticated users**.

### Layout

```
┌──────────────────────────────────────────────────┐
│ Notifications                    [Mark all read] │
├──────────────────────────────────────────────────┤
│ Filters:                                         │
│ [Unread only ☐] [Kind ▼] [From date] [To date]   │
├──────────────────────────────────────────────────┤
│ ● Trade alert · alert · Jun 12, 10:00            │
│   BTC/USDT signal triggered.                     │
│   Broadcast · Delivered: platform, telegram      │
├──────────────────────────────────────────────────┤
│   Maintenance · system · Jun 11, 18:00           │
│   System maintenance tonight.                      │
├──────────────────────────────────────────────────┤
│              ← Prev   Page 1 of 5   Next →       │
└──────────────────────────────────────────────────┘
```

### API

**List (paginated):**

```
GET /api/v1/notifications/inbox?limit=20&offset=0&unreadOnly=false
```

| Query | Usage |
|-------|-------|
| `limit` | 20 per page (max 100) |
| `offset` | `pageIndex * limit` |
| `unreadOnly=true` | Unread filter toggle |

**Mark single read:**

```
POST /api/v1/notifications/inbox/:notificationId/read
```

**Mark all read (frontend-only until bulk API exists):**

1. Fetch all unread: `unreadOnly=true`, paginate with `limit=100`.
2. `Promise.all` → `POST .../read` per `id`.
3. Refresh list + unread count.

### Filters

| Filter | Implementation |
|--------|----------------|
| Unread only | API `unreadOnly=true` |
| Kind | Client-side on loaded page: `general`, `alert`, `trade`, `system` |
| Date range | Client-side on `createdAt` within current result set |

> **Note:** Server does not yet support `kind`, `fromDate`, `toDate` query params. For date range across full history, add backend filters later or fetch multiple pages client-side (acceptable for MVP with pagination).

### Row display fields

| Field | UI |
|-------|-----|
| `title` | Primary heading (fallback: capitalize `kind`) |
| `body` | Message text |
| `kind` | Badge/chip |
| `audienceType` | `broadcast` → “Everyone” badge |
| `createdAt` | Formatted date/time |
| `isRead` | Bold + dot when false |
| `deliveries` | Small icons: platform / telegram / discord + status color |

### Pagination

- Page size: **20**
- `hasMore = items.length === limit`
- Next page: `offset += limit`
- Show loading skeleton; disable buttons while fetching

### Empty states

- No notifications: “You’re all caught up.”
- Unread filter empty: “No unread notifications.”

---

## Feature 3 — Admin “Send Alerts” (sidebar)

### Access control

Show sidebar item only for admin roles (`superadmin` or role with dispatch permission).

**Sidebar label:** `Send Alerts` or `Notifications`  
**Route:** `/admin/send-alerts`  
**Icon:** megaphone / bell-plus

### Form layout

```
┌──────────────────────────────────────────────────┐
│ Send notification                                │
├──────────────────────────────────────────────────┤
│ Audience:  ( ) One user   (•) All users          │
│                                                  │
│ [User search dropdown ─────────────]  (if one)   │
│                                                  │
│ Channels:  ☑ Platform  ☑ Telegram  ☑ Discord     │
│            (or radio: All | Telegram | Discord)  │
│                                                  │
│ Kind:      [ alert ▼ ]                           │
│ Title:     [________________________]            │
│ Message:   [________________________]            │
│            [________________________]            │
│                                                  │
│                              [ Send notification]│
└──────────────────────────────────────────────────┘
```

### Form fields → API mapping

#### Audience: One user + channels selection

| Channels selected | API | Body |
|-------------------|-----|------|
| Platform + Telegram + Discord | `POST /notifications/dispatch/user` | See below |
| Telegram only | `POST /notifications/telegram/dispatch/user` | `{ userId, title, text, kind }` |
| Discord only | `POST /notifications/discord/dispatch/user` | `{ userId, title, text, kind }` |
| Platform only | `POST /notifications/dispatch/user` with `channels: ["platform"]` | |

**Unified user body:**

```json
{
  "userId": "<selected-user-uuid>",
  "title": "Trade alert",
  "text": "Message body here.",
  "kind": "alert",
  "channels": ["platform", "telegram", "discord"]
}
```

#### Audience: All users (broadcast)

| Channels | API | Body |
|----------|-----|------|
| All three | `POST /notifications/dispatch/broadcast` | `{ title, text, kind, channels }` |
| Telegram only | `POST /notifications/telegram/dispatch/broadcast` | `{ title, text, kind }` |
| Discord only | `POST /notifications/discord/dispatch/broadcast` | `{ title, text, kind }` |

**Unified broadcast body:**

```json
{
  "title": "Maintenance",
  "text": "System maintenance tonight at 02:00 UTC.",
  "kind": "system",
  "channels": ["platform", "telegram", "discord"]
}
```

### Validation (client-side)

| Field | Rule |
|-------|------|
| `text` | Required, min 1 char |
| `text` (Discord-only) | Max 2000 chars |
| `text` (Telegram / unified) | Max 4096 chars |
| `title` | Optional, max 255 |
| `userId` | Required when audience = one user |
| `kind` | One of: `general`, `alert`, `trade`, `system` |

### User picker (when audience = one user)

1. Search input debounced 300ms
2. Call `GET /api/v1/admin/users?search=ada&limit=20` (when available)
3. Display: `firstName lastName (email)`
4. Store selected `userId` in form state
5. Optional: show Telegram/Discord connection status from admin user detail if API provides it

### Success / error handling

**Success response** includes `notificationId` and per-channel `deliveries`:

```json
{
  "success": true,
  "data": {
    "notificationId": "...",
    "deliveries": {
      "telegram": { "status": "sent" },
      "discord": { "status": "failed", "lastError": "..." }
    }
  }
}
```

- Toast: “Notification sent” if platform `sent`
- Warning toast if any channel `failed` — show which channel failed
- Common errors: `TELEGRAM_NOT_CONNECTED`, `DISCORD_NOT_CONNECTED`, `INVALID_DISPATCH_KEY`

### Suggested files

```
src/features/admin/send-alerts/
  pages/SendAlertsPage.tsx
  components/SendAlertForm.tsx
  components/UserPicker.tsx
  components/ChannelSelector.tsx
  components/DeliveryResultPanel.tsx
  api/adminNotificationsApi.ts
```

---

## API module sketch (`notificationsApi.ts`)

```ts
const BASE = '/api/v1/notifications';

export async function getUnreadCount() {
  return api.get(`${BASE}/inbox/unread-count`);
}

export async function getInbox(params: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  return api.get(`${BASE}/inbox`, { params });
}

export async function markAsRead(notificationId: string) {
  return api.post(`${BASE}/inbox/${notificationId}/read`);
}

// Admin — call proxy routes, NOT raw dispatch with API key
export async function adminDispatchToUser(body: DispatchUserBody) {
  return api.post('/api/v1/admin/notifications/dispatch/user', body);
}

export async function adminDispatchBroadcast(body: DispatchBroadcastBody) {
  return api.post('/api/v1/admin/notifications/dispatch/broadcast', body);
}
```

---

## TypeScript types

```ts
export type NotificationKind = 'general' | 'alert' | 'trade' | 'system';
export type NotificationChannel = 'platform' | 'telegram' | 'discord';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped' | 'pending';

export interface InboxItem {
  id: string;
  title: string | null;
  body: string;
  audienceType: 'individual' | 'broadcast';
  targetUserId: string | null;
  kind: NotificationKind;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  isRead: boolean;
  deliveries: Array<{
    channel: NotificationChannel;
    status: DeliveryStatus;
    stats: Record<string, unknown>;
    deliveredAt: string | null;
  }>;
}

export interface DispatchUserBody {
  userId: string;
  title?: string;
  text: string;
  kind?: NotificationKind;
  channels?: NotificationChannel[];
}

export interface DispatchBroadcastBody {
  title?: string;
  text: string;
  kind?: NotificationKind;
  channels?: NotificationChannel[];
}
```

---

## UX checklist

- [ ] Bell badge updates after mark-read
- [ ] Dropdown closes on outside click
- [ ] Notifications page sorts newest first (API default)
- [ ] Loading + error states on all fetches
- [ ] Send form disabled while submitting
- [ ] Character counter on message field (2000 / 4096 based on channel)
- [ ] Confirm dialog before broadcast to all users
- [ ] Admin route hidden for non-admin roles

---

## Implementation order

1. `notificationsApi.ts` + types
2. `useUnreadCount` + `NotificationBell` in header
3. Notifications page with pagination + unread filter
4. Mark as read (single + mark all)
5. Backend admin proxy routes (if not done)
6. Admin user list endpoint (if not done)
7. Send Alerts page + form
8. Kind + date filters (client-side)
9. Polish: delivery status display, toasts, empty states

---

## Testing

Use Postman collection `TRADING-OS_Telegram_Discord_Connections.postman_collection.json`:

1. Login → save `accessToken`
2. `GET inbox?limit=3` — verify bell preview data
3. `GET inbox/unread-count` — verify badge
4. `POST dispatch/broadcast` with dispatch key — verify inbox populates
5. `POST inbox/:id/read` — verify badge decrements

---

## Out of scope (future)

- WebSocket / SSE real-time push
- `POST /inbox/mark-all-read` bulk endpoint
- Inbox server-side `kind` / date range filters
- Email / push notification channels
- Trade alert form in admin UI (`POST .../discord/dispatch/trade-alert`) — add as separate tab if needed
