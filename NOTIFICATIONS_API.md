# Notifications API (Connections, Inbox, Dispatch)

Complete API reference for TRADING-OS notifications: **Telegram/Discord connections**, **platform inbox**, and **dispatch** (send to users or broadcast).

**Base path:** `/api/v1`

**Postman collection:** `docs/postman/TRADING-OS_Telegram_Discord_Connections.postman_collection.json`

---

## Quick reference

| Group | Auth | Base path |
|-------|------|-----------|
| Connections (Telegram/Discord link) | Bearer JWT | `/notifications/*` |
| Platform inbox (read notifications) | Bearer JWT | `/notifications/inbox*` |
| Dispatch (send alerts) | `X-Notifications-Api-Key` | `/notifications/dispatch/*`, `/notifications/telegram/dispatch/*`, `/notifications/discord/dispatch/*` |
| Telegram webhook | `X-Telegram-Bot-Api-Secret-Token` (optional) | `/webhooks/telegram` |
| Discord OAuth callback | Signed `state` query param | `/auth/discord/callback` |

### Default success envelope

```json
{
  "success": true,
  "data": {}
}
```

### Default error envelope

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "ERROR_CODE"
}
```

---

## Authentication & headers

### Bearer JWT (user endpoints)

Used for: connect/disconnect, list connections, inbox.

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Obtain token via **POST** `/api/v1/auth/login`:

```json
{
  "email": "trader@example.com",
  "password": "your-password"
}
```

**Login response:**

```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "session_id": "...",
  "role": "trader"
}
```

### Dispatch API key (send endpoints)

Used for: all `POST .../dispatch/*` routes.

```
X-Notifications-Api-Key: <NOTIFICATIONS_DISPATCH_API_KEY>
Content-Type: application/json
```

| Error | HTTP | Code |
|-------|------|------|
| Key not configured on server | 503 | `DISPATCH_DISABLED` |
| Missing or wrong key | 401 | `INVALID_DISPATCH_KEY` |

> **Frontend note:** Do **not** embed `NOTIFICATIONS_DISPATCH_API_KEY` in the browser bundle. Admin send UI should call a **backend admin proxy** that validates JWT + admin permission and adds this header server-side. See `docs/FRONTEND_NOTIFICATIONS_PROMPT.md`.

### Telegram webhook secret (optional)

```
X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>
```

---

## Environment variables

| Variable | Used for |
|----------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot + messaging |
| `TELEGRAM_BOT_USERNAME` | Connect deep links |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook verification |
| `PUBLIC_API_BASE_URL` | Auto `setWebhook` on startup |
| `DISCORD_CLIENT_ID` | OAuth connect |
| `DISCORD_CLIENT_SECRET` | OAuth connect |
| `DISCORD_REDIRECT_URI` | OAuth callback (must match Discord portal) |
| `DISCORD_BOT_TOKEN` | Discord DMs |
| `DISCORD_GUILD_ID` | Optional guild check |
| `DISCORD_ALERT_CHANNEL_ID` | Trade-alert channel |
| `NOTIFICATIONS_DISPATCH_API_KEY` | Dispatch API header |

---

## Database

| Migration | Purpose |
|-----------|---------|
| `003_notification_connections.sql` | Telegram/Discord connection rows |
| `004_notification_connections_provider_chat_nullable.sql` | Nullable `provider_chat_id` for OAuth |
| `008_notifications.sql` | `notifications`, `notification_deliveries`, `notification_reads` |

### Concepts

| Concept | Description |
|---------|-------------|
| **Individual** | Notification for one user (`target_user_id`) |
| **Broadcast** | Visible in every user's inbox |
| **Platform channel** | Stored in DB, shown in inbox |
| **Telegram / Discord** | External delivery; status in `deliveries` |

Every dispatch call **always persists** to the platform inbox.

### Notification kinds

`general` | `alert` | `trade` | `system` (default: `general`)

### Delivery channels

`platform` | `telegram` | `discord`

### Delivery status

`sent` | `failed` | `skipped` | `pending`

---

# Part 1 — Connection APIs (Telegram & Discord)

> **Frontend:** Connection UI (connect link, disconnect, status) is **already implemented**. Do not rebuild.

## 1.1 Generate Telegram connect link

**GET** `/api/v1/notifications/telegram/connect-link`  
**Auth:** Bearer JWT

**Response:**

```json
{
  "success": true,
  "data": {
    "provider": "telegram",
    "url": "https://t.me/MyTradingOsBot?start=user_550e8400-e29b-41d4-a716-446655440000",
    "startPayload": "user_550e8400-e29b-41d4-a716-446655440000",
    "botUsername": "MyTradingOsBot"
  }
}
```

**Flow:** User opens `url` → presses START in Telegram → webhook completes link.

---

## 1.2 Generate Discord connect link

**GET** `/api/v1/notifications/discord/connect-link`  
**Auth:** Bearer JWT

**Response:**

```json
{
  "success": true,
  "data": {
    "provider": "discord",
    "url": "https://discord.com/oauth2/authorize?client_id=...&response_type=code&redirect_uri=...&scope=identify+guilds&prompt=consent&state=...",
    "state": "eyJhbGciOiJIUzI1NiIs...",
    "scopes": ["identify", "guilds"]
  }
}
```

**Flow:** Redirect user to `url` → Discord redirects to callback.

---

## 1.3 Discord OAuth callback

**GET** `/api/v1/auth/discord/callback?code=<oauth_code>&state=<state_token>`  
**Auth:** None (CSRF via signed `state`)

**Response:**

```json
{
  "success": true,
  "data": {
    "provider": "discord",
    "connected": true,
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "discordUserId": "126382761827361",
    "discordUsername": "ada_trader"
  }
}
```

---

## 1.4 List my notification connections

**GET** `/api/v1/notifications/connections`  
**Auth:** Bearer JWT

**Response:**

```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "conn-uuid-1",
        "providerType": "telegram",
        "isConnected": true,
        "connectedAt": "2025-06-01T12:00:00.000Z",
        "disconnectedAt": null,
        "providerUsername": "ada_trader"
      },
      {
        "id": "conn-uuid-2",
        "providerType": "discord",
        "isConnected": false,
        "connectedAt": null,
        "disconnectedAt": "2025-06-02T08:00:00.000Z",
        "providerUsername": null
      }
    ]
  }
}
```

---

## 1.5 Disconnect Telegram

**DELETE** `/api/v1/notifications/telegram/disconnect`  
**Auth:** Bearer JWT

**Response:**

```json
{
  "success": true,
  "data": {
    "disconnected": true,
    "alreadyDisconnected": false
  }
}
```

---

## 1.6 Disconnect Discord

**DELETE** `/api/v1/notifications/discord/disconnect`  
**Auth:** Bearer JWT

**Response:** Same shape as disconnect Telegram.

---

## 1.7 Telegram webhook (server-to-server)

**POST** `/api/v1/webhooks/telegram`  
**Auth:** None  
**Header (if configured):** `X-Telegram-Bot-Api-Secret-Token`

**Body:** Raw Telegram Update JSON.

```json
{
  "update_id": 10002,
  "message": {
    "message_id": 12,
    "from": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "Ada",
      "username": "ada_trader"
    },
    "chat": {
      "id": 987654321,
      "type": "private"
    },
    "date": 1715000000,
    "text": "/start user_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

# Part 2 — Platform Inbox APIs (Frontend notifications UI)

Used by: header bell dropdown, notifications page, unread badge.

## 2.1 List inbox notifications

**GET** `/api/v1/notifications/inbox`  
**Auth:** Bearer JWT

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | 1–100 |
| `offset` | int | 0 | Pagination offset |
| `unreadOnly` | `true` \| `false` | false | Only unread items |

**Example:** `GET /api/v1/notifications/inbox?limit=20&offset=0&unreadOnly=false`

Returns **individual** notifications for the logged-in user plus **all broadcast** notifications. Sorted **newest first** (`created_at DESC`).

**Response:**

```json
{
  "success": true,
  "data": {
    "unreadCount": 3,
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Trade alert",
        "body": "BTC/USDT signal triggered.",
        "audienceType": "individual",
        "targetUserId": "550e8400-e29b-41d4-a716-446655440000",
        "kind": "alert",
        "metadata": {},
        "createdAt": "2026-06-12T10:00:00.000Z",
        "updatedAt": "2026-06-12T10:00:00.000Z",
        "readAt": null,
        "isRead": false,
        "deliveries": [
          {
            "channel": "discord",
            "status": "sent",
            "stats": {},
            "deliveredAt": "2026-06-12T10:00:01.000Z"
          },
          {
            "channel": "platform",
            "status": "sent",
            "stats": { "stored": true },
            "deliveredAt": "2026-06-12T10:00:00.000Z"
          },
          {
            "channel": "telegram",
            "status": "sent",
            "stats": {},
            "deliveredAt": "2026-06-12T10:00:01.000Z"
          }
        ]
      }
    ]
  }
}
```

**Frontend usage:**

| UI | Suggested call |
|----|----------------|
| Header dropdown (2–3 items) | `limit=3&offset=0` |
| Notifications page | `limit=20&offset=<page*20>` |
| Unread filter | `unreadOnly=true` |

> **Date range / kind filters:** Not yet supported as query params. Filter `kind` and `createdAt` client-side on loaded items, or add backend params in a follow-up (`kind`, `fromDate`, `toDate`).

---

## 2.2 Get unread count only

**GET** `/api/v1/notifications/inbox/unread-count`  
**Auth:** Bearer JWT

**Response:**

```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

Use for header badge. Poll every 30–60s or refresh after mark-read / new dispatch.

---

## 2.3 Mark notification as read

**POST** `/api/v1/notifications/inbox/:notificationId/read`  
**Auth:** Bearer JWT

**Path param:** `notificationId` — UUID

**Response:**

```json
{
  "success": true,
  "data": {
    "notificationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "readAt": "2026-06-12T10:05:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | When |
|------|------|------|
| 404 | `NOTIFICATION_NOT_FOUND` | ID not visible to user |

> **Mark all as read:** No bulk endpoint yet. Frontend loops `POST .../read` for each unread item (fetch with `unreadOnly=true`, paginate if needed).

---

# Part 3 — Unified Dispatch (Platform + Telegram + Discord)

One API call fans out to selected channels. Always stores in platform inbox.

**Auth:** `X-Notifications-Api-Key`

## 3.1 Send to one user (all channels)

**POST** `/api/v1/notifications/dispatch/user`

**Headers:**

```
Content-Type: application/json
X-Notifications-Api-Key: <NOTIFICATIONS_DISPATCH_API_KEY>
```

**Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Trade alert",
  "text": "BTC/USDT signal triggered at 68420.",
  "kind": "alert",
  "channels": ["platform", "telegram", "discord"]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `userId` | Yes | Platform user UUID |
| `text` | Yes | Max 4096 chars |
| `title` | No | Inbox title (max 255) |
| `kind` | No | `general`, `alert`, `trade`, `system` |
| `channels` | No | Default: `["platform","telegram","discord"]` |

**Response:**

```json
{
  "success": true,
  "data": {
    "notificationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "audienceType": "individual",
    "targetUserId": "550e8400-e29b-41d4-a716-446655440000",
    "kind": "alert",
    "createdAt": "2026-06-12T10:00:00.000Z",
    "deliveries": {
      "platform": {
        "channel": "platform",
        "status": "sent",
        "stats": { "stored": true },
        "lastError": null,
        "deliveredAt": "2026-06-12T10:00:00.000Z"
      },
      "telegram": {
        "channel": "telegram",
        "status": "sent",
        "stats": { "delivered": true, "provider": "telegram", "chatId": "987654321" },
        "lastError": null,
        "deliveredAt": "2026-06-12T10:00:01.000Z"
      },
      "discord": {
        "channel": "discord",
        "status": "sent",
        "stats": { "delivered": true, "provider": "discord", "discordUserId": "126382761827361" },
        "lastError": null,
        "deliveredAt": "2026-06-12T10:00:01.000Z"
      }
    }
  }
}
```

If Telegram/Discord not connected, that channel may be `failed` with `lastError`; platform row is still `sent`.

---

## 3.2 Broadcast to all users (all channels)

**POST** `/api/v1/notifications/dispatch/broadcast`

**Headers:** Same as 3.1

**Body:**

```json
{
  "title": "Maintenance",
  "text": "System maintenance tonight at 02:00 UTC.",
  "kind": "system",
  "channels": ["platform", "telegram", "discord"]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `text` | Yes | Max 4096 chars |
| `title` | No | Inbox title |
| `kind` | No | Default `general` |
| `channels` | No | Default all three |

**Response:** Same shape as 3.1 with `audienceType: "broadcast"` and `targetUserId: null`.

---

# Part 4 — Provider-specific dispatch

Also persists to platform inbox. Use when sending to **one channel only**.

**Auth:** `X-Notifications-Api-Key`

## 4.1 Telegram — send to user

**POST** `/api/v1/notifications/telegram/dispatch/user`

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Trade alert",
  "text": "BTC/USDT alert fired.",
  "kind": "alert"
}
```

| Field | Required | Max length |
|-------|----------|------------|
| `userId` | Yes | UUID |
| `text` | Yes | 4096 |
| `title` | No | 255 |
| `kind` | No | enum |

**Errors:** `TELEGRAM_NOT_CONNECTED` if user has no active Telegram link.

---

## 4.2 Telegram — broadcast

**POST** `/api/v1/notifications/telegram/dispatch/broadcast`

```json
{
  "title": "Market update",
  "text": "System maintenance at 02:00 UTC.",
  "kind": "system"
}
```

---

## 4.3 Discord — send to user

**POST** `/api/v1/notifications/discord/dispatch/user`

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Signal",
  "text": "Your trading signal triggered.",
  "kind": "trade"
}
```

| Field | Required | Max length |
|-------|----------|------------|
| `text` | Yes | 2000 |

**Errors:** `DISCORD_NOT_CONNECTED`

---

## 4.4 Discord — broadcast

**POST** `/api/v1/notifications/discord/dispatch/broadcast`

```json
{
  "title": "Market update",
  "text": "Major market event alert.",
  "kind": "alert"
}
```

---

## 4.5 Discord — trade alert to channel

**POST** `/api/v1/notifications/discord/dispatch/trade-alert`

Does **not** use `title`/`text`/`kind` — posts formatted alert to `DISCORD_ALERT_CHANNEL_ID`.

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "price": 68420.55
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `symbol` | Yes | Max 50 chars |
| `side` | Yes | `BUY` or `SELL` |
| `price` | Yes | number or string |

---

# Part 5 — curl examples

```bash
export API_BASE="http://localhost:3000/api/v1"
export DISPATCH_KEY="your-notifications-dispatch-api-key"
export USER_ID="550e8400-e29b-41d4-a716-446655440000"
export ACCESS_TOKEN="your-jwt-access-token"
```

**Inbox:**

```bash
curl -s "$API_BASE/notifications/inbox?limit=3" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

curl -s "$API_BASE/notifications/inbox/unread-count" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

**Unified dispatch:**

```bash
curl -s -X POST "$API_BASE/notifications/dispatch/user" \
  -H "Content-Type: application/json" \
  -H "X-Notifications-Api-Key: $DISPATCH_KEY" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"Personal alert\",
    \"text\": \"Your BTC limit order filled.\",
    \"kind\": \"trade\"
  }" | jq
```

**Telegram-only:**

```bash
curl -s -X POST "$API_BASE/notifications/telegram/dispatch/broadcast" \
  -H "Content-Type: application/json" \
  -H "X-Notifications-Api-Key: $DISPATCH_KEY" \
  -d '{"title":"Update","text":"Telegram broadcast test.","kind":"general"}' | jq
```

---

# Security notes

- **Dispatch key** must stay server-side for production admin UI.
- **Telegram webhook:** secret header when `TELEGRAM_WEBHOOK_SECRET` is set.
- **Discord OAuth:** signed expiring `state` required.
- **Duplicate external accounts:** same Telegram/Discord account cannot be actively linked to two platform users.
- **Dispatch disabled** when `NOTIFICATIONS_DISPATCH_API_KEY` is unset (503).

---

# Code map

| Path | Role |
|------|------|
| `db/migrations/003_notification_connections.sql` | Connection schema |
| `db/migrations/008_notifications.sql` | Notification store schema |
| `src/modules/notifications/notifications.routes.js` | All HTTP routes |
| `src/modules/notifications/notifications.controller.js` | Request handlers |
| `src/services/notifications/notificationStore.service.js` | Inbox + persist |
| `src/services/notifications/notificationDispatch.service.js` | Send + persist |
| `src/middleware/requireNotificationsDispatchKey.js` | Dispatch key guard |
| `docs/postman/TRADING-OS_Telegram_Discord_Connections.postman_collection.json` | Postman collection |
| `docs/FRONTEND_NOTIFICATIONS_PROMPT.md` | Frontend implementation prompt |
