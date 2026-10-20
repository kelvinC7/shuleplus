# Parent Messaging — Integration Guide

This guide is for developers building the **Parent app** (or adding parent messaging to an
existing parent-facing module). It explains how parents sign in, discover staff, chat in real
time, and share files using the Internal Chat module's dedicated **parent API surface**.

---

## 1. Access model

| Capability | Staff | Parent |
|---|---|---|
| DM another user | staff ↔ staff, staff → parent | parent → staff only |
| Create group/department/announcement chats | ✅ | ❌ (403) |
| Receive auto-announcements / department chats | ✅ | ❌ |
| Required license (chat module in JWT `modules`) | ✅ | ❌ (bypassed) |
| Directory they can search | staff + parents | staff only (`/parent/directory`) |

A user is classified as a **Parent** when their IAM JWT `roles` contain one of:
`parent`, `guardian`, `parent/guardian` (case-insensitive). See
`Backend/src/services/member.service.ts` → `kindForRoles()`.

Every chat member row is tagged with a `kind` (`STAFF` | `PARENT`). It is set automatically:
- when a user is synced from IAM (`memberService.syncOrganization`)
- when a user self-registers via middleware on first request / socket connect
  (`memberService.ensureSelf`)

> **IAM sync note:** the parent rows still come from IAM's org user directory
> (`iamClient.listOrgUsers`). A parent only appears in the staff-facing *Parents* tab once they
> have signed in at least once (or after an org sync runs).

---

## 2. Database changes

The `chat_members` table gains a `kind` column (`ChatMemberKind` enum: `STAFF`, `PARENT`,
default `STAFF`).

Apply it after starting PostgreSQL:

```bash
cd InternalChat/Backend
npx prisma db push      # adds the kind column (non-destructive)
npm run prisma:seed     # optional: creates 2 sample parents + a parent DM
```

---

## 3. Authentication

Parents authenticate exactly like staff, using the IAM flow:

1. Log in via IAM → receive `accessToken` / `refreshToken`.
2. Attach `Authorization: Bearer <accessToken>` to every REST call.
3. Connect the socket with `{ auth: { token: accessToken } }`.

The backend verifies the JWT with the same secret and derives the tenant from
`organizationId` in the token, so **no extra sign-up or provisioning is required**.

CORS: add your parent-app origin to `CORS_ORIGIN` in `Backend/.env`
(e.g. `CORS_ORIGIN="http://localhost:5173,http://localhost:3054,https://parents.yourdomain.com"`).

---

## 4. REST API

Base URL: `https://<host>/api/v1/parent`
Headers: `Authorization: Bearer <accessToken>` · `Content-Type: application/json`

### 4.1 Profile

`GET /parent/me`
```json
{
  "success": true,
  "data": {
    "id": "…", "organizationId": "…", "userId": "…",
    "kind": "PARENT", "email": "parent1@chat.dev",
    "firstName": "Danielle", "lastName": "Uwimana",
    "avatarUrl": null, "department": "Parents", "position": "Parent",
    "roleSlugs": ["parent"], "online": false
  }
}
```

### 4.2 Discover staff

`GET /parent/directory?search=alice`
Returns staff members only (`kind = STAFF`), each with an `online` flag.

### 4.3 Conversations

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/parent/conversations` | – | list conversations (with `peer`, `lastMessage`, `unreadCount`) |
| POST | `/parent/conversations` | `{ "staffId": "u-alice" }` | start (or resume) a DM with a staff member |
| GET | `/parent/conversations/:id` | – | conversation detail incl. `members` |
| GET | `/parent/conversations/:id/messages` | query: `before`, `limit` | fetch message history |
| POST | `/parent/conversations/:id/messages` | see below | send a message |
| POST | `/parent/conversations/:id/messages/:messageId/read` | – | mark a message as read |
| POST | `/parent/conversations/:id/typing` | `{ "isTyping": true }` | broadcast typing indicator |
| POST | `/parent/uploads` | `{ "dataUri": "data:…", "name": "…" }` | upload an attachment |

Send message body:

```json
{
  "type": "TEXT",            // TEXT | IMAGE | FILE
  "body": "Hello, could I get an update on my child progress?",
  "attachment": {            // required when type is IMAGE/FILE
    "url": "https://host/uploads/xxx.png",
    "name": "report.png",
    "mime": "image/png",
    "size": 2048
  }
}
```

`POST /parent/conversations` is **idempotent** — if a DM already exists between the parent and
that staff member, the existing conversation is returned instead of creating a duplicate.

---

## 5. Realtime (Socket.IO)

Connect to the module's socket server with the parent's access token:

```ts
const socket = io(SOCKET_URL, {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

### Emitted to the parent (listen)

| Event | Payload | Meaning |
|---|---|---|
| `conversation:new` | conversation | a new conversation was created |
| `conversation:updated` | `{ conversationId, senderId, lastMessageAt, type, body }` | list should re-sort |
| `message:new` | message | append to the open thread |
| `message:read` | `{ conversationId, messageId, userId, lastReadAt }` | read receipt |
| `typing:start` / `typing:stop` | `{ conversationId, userId }` | typing indicator |
| `presence:init` | `{ onlineUserIds: string[] }` | initial online set |
| `presence:online` / `presence:offline` | `{ userId }` | presence changes |

### Sent by the parent (emit)

| Event | Payload |
|---|---|
| `typing:start` / `typing:stop` | `{ conversationId }` |

The parent automatically joins the rooms for their conversations on connect, so no manual room
subscription is needed.

---

## 6. Restrictions enforced server-side

- A parent **cannot** create `GROUP` / `DEPARTMENT` / `ANNOUNCEMENT` chats → `403`.
- A parent can only DM users whose `kind = STAFF` → `403` otherwise.
- Parents are **not** auto-added to announcement/department conversations.
- Every conversation/message endpoint verifies membership (`assertMembership`) → `403` if not
  a participant.

---

## 7. Dev / test tips

1. Start PostgreSQL, then `npx prisma db push` and `npm run prisma:seed`.
2. The seed creates parent logins `parent1@chat.dev` / `parent2@chat.dev` (dev only) and a
   sample DM between `u-parent-1` and `u-alice`.
3. On the staff app, open **New Chat → Parents** tab (or the group picker) to DM/add parents.
4. To simulate a parent login against IAM in dev, mirror what `Backend/scripts/dev-login.ts`
   does but with a parent role slug, or add the parent role to the dev user in IAM.

---

## 8. Related files

- `Backend/prisma/schema.prisma` — `ChatMemberKind` enum + `kind` column
- `Backend/src/services/member.service.ts` — `kindForRoles`, `ensureSelf`, `syncOrganization`, `listParents`/`listStaff`
- `Backend/src/middleware/auth.middleware.ts` — `requireParent`
- `Backend/src/routes/parent.routes.ts` — the parent API surface
- `Backend/src/routes/member.routes.ts` — `GET /members?kind=staff|parent` (staff app)
- `Backend/src/services/conversation.service.ts` — parent chat guards + `kind` in member summaries
- `Backend/src/socket/index.ts` — socket auth stores roles so parents self-register as PARENT
