# Notification Connections API (Telegram + Discord)

This document covers the production notification connection module for TRADING-OS using the shared `notification_connections` table and provider-based services.

---

## Architecture overview

| Layer | Responsibility |
|--------|----------------|
| **REST** | `/api/v1/notifications/*` for user connect/disconnect/list and internal dispatch APIs. |
| **Webhook** | `/api/v1/webhooks/telegram` receives Telegram Update payloads. |
| **OAuth callback** | `/api/v1/auth/discord/callback` handles Discord code exchange and user mapping. |
| **Services** | `notificationConnection.*` for provider-independent upsert/disconnect rules; provider-specific telegram/discord services for integration logic. |
| **Persistence** | PostgreSQL `notification_connections` + Sequelize `NotificationConnection` model. |

---

## Database

- **Migration files**
  - `db/migrations/003_notification_connections.sql`
  - `db/migrations/004_notification_connections_provider_chat_nullable.sql`
- **Table:** `notification_connections`
- **Enum:** `notification_provider_type` with `telegram`, `discord`

### Constraints and indexes

- **UNIQUE** `(user_id, provider_type)`  
  One row per provider per platform user (reconnect updates existing row).
- **Partial UNIQUE** `(provider_type, provider_user_id)` where `is_connected=true`  
  Prevents same external account from being actively connected to multiple platform users.
- **Indexes** on `user_id`, `(provider_type, is_connected)` for fast reads and dispatch scans.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram | Bot token from BotFather. |
| `TELEGRAM_BOT_USERNAME` | Telegram | Bot username (without `@`) for deep links. |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram | Secret for `X-Telegram-Bot-Api-Secret-Token` verification. |
| `PUBLIC_API_BASE_URL` | Telegram | Base URL used by server startup to call Telegram `setWebhook`. |
| `DISCORD_CLIENT_ID` | Discord OAuth | Discord OAuth2 application client id. |
| `DISCORD_CLIENT_SECRET` | Discord OAuth | Discord OAuth2 application secret. |
| `DISCORD_REDIRECT_URI` | Discord OAuth | Callback URL, must exactly match Discord Developer Portal redirect entry. |
| `DISCORD_BOT_TOKEN` | Discord bot | Token used for bot login and messaging. |
| `DISCORD_GUILD_ID` | Optional | Guild validation/metadata check. |
| `DISCORD_ALERT_CHANNEL_ID` | Optional | Channel used by trade-alert dispatch endpoint. |
| `NOTIFICATIONS_DISPATCH_API_KEY` | Optional | Required header for internal dispatch APIs (`X-Notifications-Api-Key`). |

---

## Connection flow (Telegram)

1. User signs in and frontend calls **GET** `/api/v1/notifications/telegram/connect-link`.
2. API returns `https://t.me/<BOT_USERNAME>?start=user_<platform_user_uuid>`.
3. User opens bot and presses **START**.
4. Telegram sends update to **POST** `/api/v1/webhooks/telegram`.
5. Backend verifies webhook secret header (when configured).
6. Backend parses `/start` payload, resolves platform user, upserts provider connection.
7. Bot replies with success/failure message.

### Telegram webhook endpoint details

**POST** `/api/v1/webhooks/telegram`

- **Auth:** None (Telegram server-to-server request)
- **Header (when secret configured):**
  - `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`
- **Body:** Raw Telegram Update JSON.

**Sample Update**

```json
{
  "update_id": 10002,
  "message": {
    "message_id": 12,
    "from": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "Ada",
      "last_name": "Trader",
      "username": "ada_trader",
      "language_code": "en"
    },
    "chat": {
      "id": 987654321,
      "first_name": "Ada",
      "username": "ada_trader",
      "type": "private"
    },
    "date": 1715000000,
    "text": "/start user_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Connection flow (Discord OAuth2)

1. User signs in and frontend calls **GET** `/api/v1/notifications/discord/connect-link`.
2. API returns Discord OAuth URL with signed state.
3. Frontend redirects user to Discord authorization page.
4. User approves; Discord redirects back to **GET** `/api/v1/auth/discord/callback?code=...&state=...`.
5. Backend validates state (JWT-signed + expiry), exchanges code for access token.
6. Backend fetches Discord user profile (`/users/@me`) and guild data (`/users/@me/guilds`).
7. Backend upserts `provider_type='discord'` row in `notification_connections`.
8. API returns success response.

### Discord OAuth callback endpoint details

**GET** `/api/v1/auth/discord/callback`

- **Auth:** None (state token is the CSRF/user binding control)
- **Query params:**
  - `code` (required)
  - `state` (required, signed token from connect-link API)

**Success response (example)**

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

**Example stored metadata shape**

```json
{
  "discord": {
    "discord_user_id": "126382761827361",
    "username": "ada_trader",
    "global_name": "Ada",
    "discriminator": "0",
    "avatar": "f146cb87d2d0",
    "locale": "en-US",
    "verified": true,
    "email": "ada@example.com",
    "guild_id": "112233445566",
    "in_configured_guild": true,
    "scopes": ["identify", "guilds"],
    "raw_discord_payload": {
      "user": {},
      "guilds": []
    }
  }
}
```

---

## REST APIs

Default success envelope:

```json
{
  "success": true,
  "data": {}
}
```

### 1) Generate Telegram connect link

**GET** `/api/v1/notifications/telegram/connect-link`  
**Auth:** Bearer JWT

**Sample response**

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

### 2) Generate Discord connect link

**GET** `/api/v1/notifications/discord/connect-link`  
**Auth:** Bearer JWT

**Sample response**

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

### 3) Telegram webhook

**POST** `/api/v1/webhooks/telegram`  
**Auth:** None  
**Header (if configured):**  
`X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`

### 4) Discord OAuth callback

**GET** `/api/v1/auth/discord/callback?code=<oauth_code>&state=<state_token>`

### 5) Get user notification connections

**GET** `/api/v1/notifications/connections`  
**Auth:** Bearer JWT

### 6) Disconnect Telegram

**DELETE** `/api/v1/notifications/telegram/disconnect`  
**Auth:** Bearer JWT

### 7) Disconnect Discord

**DELETE** `/api/v1/notifications/discord/disconnect`  
**Auth:** Bearer JWT

---

## Internal dispatch APIs (alerts/news/broadcast)

All dispatch endpoints require:

`X-Notifications-Api-Key: <NOTIFICATIONS_DISPATCH_API_KEY>`

### Telegram dispatch

1. **POST** `/api/v1/notifications/telegram/dispatch/user`  
   Body:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "BTC/USDT alert fired."
}
```

2. **POST** `/api/v1/notifications/telegram/dispatch/broadcast`  
   Body:

```json
{
  "text": "System maintenance at 02:00 UTC."
}
```

### Discord dispatch

1. **POST** `/api/v1/notifications/discord/dispatch/user`  
   Body:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Your trading signal triggered."
}
```

2. **POST** `/api/v1/notifications/discord/dispatch/broadcast`  
   Body:

```json
{
  "text": "Major market event alert."
}
```

3. **POST** `/api/v1/notifications/discord/dispatch/trade-alert`  
   Body:

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "price": 68420.55
}
```

---

## Security notes

- **Telegram webhook validation:** secret header checked when `TELEGRAM_WEBHOOK_SECRET` is set.
- **Discord CSRF protection:** signed expiring OAuth state is mandatory (`INVALID_OAUTH_STATE` on mismatch/expiry).
- **Duplicate prevention:** enforced in app transaction + DB unique constraints.
- **Provider account ownership:** same external account cannot be actively linked to two platform users.
- **Dispatch safety:** internal dispatch routes disabled unless `NOTIFICATIONS_DISPATCH_API_KEY` is configured.

---

## Operational checklist

1. Apply DB migrations:
   - `003_notification_connections.sql`
   - `004_notification_connections_provider_chat_nullable.sql`
2. Configure env values for Telegram and Discord.
3. Ensure Discord Developer Portal redirect URL exactly equals `DISCORD_REDIRECT_URI`.
4. Start backend and verify startup logs for Telegram webhook setup and Discord bot init (if configured).
5. In Telegram, open the deep link from **GET** connect-link and complete **START**.
6. Optionally set `NOTIFICATIONS_DISPATCH_API_KEY` and test single-user and broadcast sends.

---

## Future enhancements

- Add richer provider capabilities in `provider_metadata` versioned schema.
- Move high-volume broadcast to queue/job workers.
- Add Discord role-based channel routing for strategy-specific signals.
- Add provider health checks and retry policy for outbound dispatch.

---

## Code map

| Path | Role |
|------|------|
| `db/migrations/003_notification_connections.sql` | Base schema for provider connections |
| `db/migrations/004_notification_connections_provider_chat_nullable.sql` | Makes `provider_chat_id` nullable for OAuth providers |
| `src/models/NotificationConnection.js` | Sequelize model |
| `src/db/sequelize.js` | Sequelize instance (search_path follows `DATABASE_SCHEMA`) |
| `src/services/notifications/*` | Provider-agnostic connection + dispatch orchestrator |
| `src/services/telegram/*` | Deep link generation + Telegraf setup + webhook registration |
| `src/services/discord/*` | OAuth connect/callback + discord.js bot messaging |
| `src/modules/notifications/*` | Connect/disconnect/list + internal dispatch HTTP layer |
| `src/modules/auth/auth.routes.js` | Discord OAuth callback route (`/api/v1/auth/discord/callback`) |
| `src/modules/webhooks/*` | Telegram webhook HTTP layer |
| `src/middleware/telegramWebhookVerify.js` | Telegram webhook secret verification |
| `src/middleware/requireNotificationsDispatchKey.js` | Internal dispatch API key guard |
| `src/utils/telegramStartPayload.js` | Parse/build Telegram `/start` payload |
| `src/utils/discordOauthState.js` | Signed Discord OAuth state generation and validation |

