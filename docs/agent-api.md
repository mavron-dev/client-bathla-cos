# Agent API Reference

**For:** building 11Labs server tools (and any other external integration that calls Bathla COS over HTTP)
**Last updated:** 2026-05-06

---

## 1. Overview

The Bathla COS web app exposes a single set of HTTP endpoints under `/api/*` that serve **two callers** with the same routes:

- **Dashboard** — `apps/web` UI; authenticated via NextAuth session cookie. The dashboard's React components fetch with `credentials: 'include'`.
- **Agent / external integrations** — including the 11Labs voice agent. Authenticated via the `x-api-key` header against the `AGENT_API_KEY` env var.

Every route runs through `requireApiAuth(req)` (`apps/web/src/lib/api-auth.ts:43`), which accepts either auth path. There is no separate "agent tools" surface — the agent simply calls the same endpoints with a header.

This doc focuses on the agent's view: the endpoints they call, the headers, the request/response shapes, and how each maps to the spec's seven tools.

---

## 2. Authentication

```http
x-api-key: <AGENT_API_KEY>
Content-Type: application/json   ; on requests with a JSON body
```

- `AGENT_API_KEY` is in the project's root `.env` (and Vercel for prod). Generate with `openssl rand -hex 32`.
- The header is compared with `crypto.timingSafeEqual`. Wrong key → `401 INVALID_API_KEY`.
- Missing both header and session → `401 NOT_AUTHENTICATED`.

The agent should be configured with this key as a **secret header** in the 11Labs workspace, attached to every server tool.

---

## 3. Base URL

- **Local dev (HTTP)** — `http://localhost:3000`
- **Local dev tunneled (HTTPS, for 11Labs)** — `https://<your-subdomain>.ngrok.app` (see § 13)
- **Production** — your Vercel domain

---

## 4. Conventions

### Response envelope

| Outcome | Shape |
|---|---|
| Success | `{ "data": <payload> }` (always wrapped under `data`) |
| Error | `{ "error": "<message>", "code": "<MACHINE_CODE>" }` (sometimes adds `issues` for zod) |

HTTP status codes:

| Status | Meaning |
|---|---|
| `200` | Successful read or update |
| `201` | Successful create |
| `400` | Validation failed (`code: BAD_REQUEST`) |
| `401` | Unauthenticated (`NOT_AUTHENTICATED` or `INVALID_API_KEY`) |
| `403` | Authenticated but not allowed (`FORBIDDEN`) |
| `404` | Resource missing (`NOT_FOUND`) |
| `409` | Unique-constraint conflict (`CONFLICT`) |
| `500` | Anything else (`INTERNAL`) |

### Time handling

| Direction | Format |
|---|---|
| In (request body) | ISO 8601 with offset, e.g. `2026-04-26T18:00:00+05:30` |
| Out (Date fields) | ISO 8601 UTC, e.g. `2026-04-26T12:30:00.000Z` |
| Out (`*Local` companions) | Localized in the user's tz: `Today 11:00 AM`, `Tomorrow 11:00 AM`, `Friday 11:00 AM`, `Apr 26, 11:00 AM`, or `Overdue (was Mon 11:00 AM)` |

The agent should anchor relative dates to `user.currentLocalTime` returned by `/api/agent-context` (§ 5).

### Soft delete

Tasks use a soft-delete flag (`isDeleted`). All read endpoints filter `isDeleted: false`. `DELETE /api/tasks/[id]` flips the flag — reversible via the dashboard.

### Audit trail

Every task mutation writes a `TaskUpdate` row in the same transaction as the change. Includes `updatedById`, `updateType` (`created | status_changed | priority_changed | edited | deferred | deleted`), `source` (`agent` for api-key callers, `dashboard` for sessions), `oldValue`, `newValue`. Visible via `GET /api/tasks/[id]` in the `updates` array.

---

## 5. Endpoints

### 5.1 Bootstrap — agent context

> Maps to spec tool: **`get_user_context`**

`GET /api/agent-context?phone=<E.164>`

Resolves the caller by phone, returns user identity + task state + recent conversation summaries in a single shot. **The agent should call this first in every new session** to get `user.id`, then use that id for subsequent calls.

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `phone` | string | yes | E.164 with or without `+` (`919876543210` and `+919876543210` both work) |

**Success response (200)**

```json
{
  "data": {
    "user": {
      "id": "9bf2230e-bb27-4fb1-9545-d0e770fb8106",
      "firstName": "Dhruv",
      "displayName": "Dhruv",
      "role": "admin",
      "languagePref": "hinglish",
      "timezone": "Asia/Kolkata",
      "voiceReplyEnabled": true,
      "currentLocalTime": "2026-05-06T22:48:10+05:30"
    },
    "taskState": {
      "pendingCount": 1,
      "inProgressCount": 0,
      "deferredCount": 0,
      "overdueCount": 0,
      "urgentToday": [
        {
          "id": "task-uuid",
          "title": "Mark partnership call",
          "deadline": "2026-05-06T05:30:00.000Z",
          "deadlineLocal": "Today 11:00 AM",
          "priority": "high"
        }
      ]
    },
    "recentSummaries": [
      {
        "date": "2026-05-05",
        "summaryText": "Closed Mark partnership review, deferred Q1 deck to Friday...",
        "keyDecisions": ["Approved hire", "Pushed Pune visit"]
      }
    ],
    "communicationPattern": "short replies, prefers voice notes for new tasks"
  }
}
```

**Error responses**

| Code | When |
|---|---|
| `404 NOT_FOUND` | Phone doesn't match any user |
| `403 FORBIDDEN` | User found but `isActive=false` |
| `400 BAD_REQUEST` | Phone format invalid |

---

### 5.2 List tasks

> Maps to spec tool: **`get_tasks`**

`GET /api/tasks?<filters>`

**Query parameters** (all optional; combine freely)

| Name | Type | Notes |
|---|---|---|
| `assignedToId` | uuid | Scope to one user. The agent passes `user.id` from `/api/agent-context`. |
| `filter` | enum | `today \| this_week \| overdue \| pending \| all`. Computes deadline buckets in the assignee's tz. Layered on top of `status` if both are passed. |
| `status` | enum or repeated | `pending \| in_progress \| done \| deferred \| cancelled`. Repeat the param for OR (`?status=pending&status=in_progress`). |
| `priority` | enum or repeated | `low \| medium \| high \| urgent` |
| `search` | string | Case-insensitive substring on `title` and `description` |
| `limit` | int | Default 100, max 200 |

**Success response (200)**

```json
{
  "data": [
    {
      "id": "task-uuid",
      "assignedToId": "user-uuid",
      "createdById": "user-uuid",
      "title": "Mark partnership call",
      "description": "Final review of partnership terms before signing",
      "status": "pending",
      "priority": "high",
      "deadline": "2026-05-06T05:30:00.000Z",
      "deferredTo": null,
      "completedAt": null,
      "source": "agent",
      "tags": ["partnerships"],
      "isDeleted": false,
      "createdAt": "2026-05-06T03:00:00.000Z",
      "updatedAt": "2026-05-06T03:00:00.000Z",
      "assignee": {
        "id": "user-uuid",
        "displayName": "Dhruv",
        "image": "https://...",
        "email": "dpamneja@gmail.com"
      },
      "creator": {
        "id": "user-uuid",
        "displayName": "Dhruv"
      }
    }
  ]
}
```

Sort order: `deadline ASC NULLS LAST, priority DESC, createdAt DESC`.
For agent-created tasks, `creator` will be `null`.

**Error responses**

| Code | When |
|---|---|
| `400 BAD_REQUEST` | Bad enum value, bad uuid, `limit > 200` |

---

### 5.3 Create task

> Maps to spec tool: **`create_task`**

`POST /api/tasks`

The agent first calls `/api/agent-context` to learn `user.id`, then passes that as `assignedToId` here.

**Request body**

```json
{
  "assignedToId": "user-uuid",
  "title": "Review Q2 board deck",
  "description": "Need numbers from finance first",
  "deadline": "2026-04-26T18:00:00+05:30",
  "priority": "high",
  "tags": ["board"]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `assignedToId` | uuid | yes | Caller's own id for self-assigned tasks |
| `title` | string | yes | 1–200 chars after trim |
| `description` | string | no | ≤ 2000 chars |
| `deadline` | ISO 8601 | no | Include offset; no past-date check |
| `priority` | enum | no | Default `medium` |
| `status` | enum | no | Default `pending` |
| `tags` | string[] | no | Up to 10 tags, each ≤ 50 chars |

**Server-set fields:**
- `source` = `agent` when called with `x-api-key`, `dashboard` when called with a session cookie. **Clients cannot forge `source`.**
- `createdById` = the api-key caller has no user identity, so `createdById` is `null` for agent-created tasks. (For dashboard sessions, it's the session user's id.)

**Success response (201)**

```json
{ "data": { /* same shape as a task in 5.2 */ } }
```

A `TaskUpdate` row with `updateType: 'created'` is written in the same transaction.

**Error responses**

| Code | When |
|---|---|
| `400 BAD_REQUEST` | Validation (empty title, > 200 chars, bad assignee uuid, etc.) |
| `403 FORBIDDEN` | Session caller is not admin/dev (api-key is allowed) |

---

### 5.4 Update task

> Maps to spec tool: **`update_task`**

`PATCH /api/tasks/[id]`

Generic field update. Use **`/defer`** (§ 5.6) instead when you're pushing a deadline forward — different audit type.

**Request body** — any subset of the create fields:

```json
{
  "title": "Updated title",
  "description": "...",
  "status": "done",
  "priority": "urgent",
  "deadline": "2026-05-10T18:00:00+05:30",
  "tags": ["partnerships", "urgent"]
}
```

**Server-managed transitions**
- When `status` changes to `done` → `completedAt = now()`.
- When `status` moves away from `done` → `completedAt = null`.
- When `status` changes to anything other than `deferred` → `deferredTo = null`.

**Authorization**
- Admin/dev session OR api-key: any task.
- Executive session: only on a task where `assignedToId === userId`, and only `description | deadline | status` may change.

**Success response (200)** — full task. **Error**: `404 NOT_FOUND`, `403 FORBIDDEN`, `400 BAD_REQUEST`.

---

### 5.5 Quick status change

`PATCH /api/tasks/[id]/status`

Narrow body for drag-drop / "mark done" intent. Same audit/transition logic as `PATCH /api/tasks/[id]`, but the body is just `{ status, deferredTo? }`.

```json
{ "status": "done" }
```

**Use this when** the agent wants to set status with minimal payload (e.g. "mark X as done"). **Use `/api/tasks/[id]`** for any multi-field edit.

---

### 5.6 Defer task

> Maps to spec tool: **`defer_task`**

`PATCH /api/tasks/[id]/defer`

Push a task's deadline forward. Distinct from a generic update because:
- `deadline` AND `deferredTo` are both set to the new value (`deferredTo` is the "this was pushed at some point" flag).
- `status` is **intentionally unchanged** (a pending task stays pending).
- The audit row carries `updateType: 'deferred'`, which can be queried later for analytics ("how often does this user defer?").

**Request body**

```json
{
  "deferTo": "2026-05-13T17:00:00+05:30",
  "reason": "user moved to next week"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `deferTo` | ISO 8601 | yes | Must be ≥ now + 1 minute |
| `reason` | string | no | ≤ 500 chars; stored in `TaskUpdate.newValue.reason` |

**Validation**
- `deferTo` in the past or too close to now → 400.
- Task in status `done` or `cancelled` → 400.

**Success response (200)** — full task with the updated `deadline` and `deferredTo`.

---

### 5.7 Soft-delete task

`DELETE /api/tasks/[id]`

Sets `isDeleted = true`. Reversible by an admin via Prisma Studio. Writes a `TaskUpdate` with `updateType: 'deleted'`.

Not in the spec's seven tools — included here because the agent may need it (e.g. "cancel that task — actually, just delete it"). If you don't want the agent to call delete, simply don't register a tool for it.

**Auth**: admin/dev session OR api-key.

**Success response (200):** `{ "data": { "ok": true } }`.

---

### 5.8 Daily summary

> Maps to spec tool: **`get_daily_summary`**

`GET /api/users/[id]/daily-summary?date=today|yesterday`

Live-computed aggregates. **Today and yesterday only** — anything older goes through `/summaries/[date]` (§ 5.9).

**Path parameters**

| Name | Notes |
|---|---|
| `id` | The user's uuid (from `/api/agent-context`) |

**Query parameters**

| Name | Default | Notes |
|---|---|---|
| `date` | `today` | `today` or `yesterday`; any other value → `400 BAD_REQUEST` |

Boundaries are computed in the user's `timezone`. `pendingCount` for `yesterday` is approximated per the spec (tasks still active OR completed after yesterday's EOD).

**Success response (200)**

```json
{
  "data": {
    "date": "2026-05-06",
    "completedCount": 4,
    "pendingCount": 3,
    "deferredCount": 1,
    "createdCount": 2,
    "completedTitles": ["Mark partnership call", "Invoice approval"],
    "pendingTitles": ["Board deck review", "Hiring sync prep"],
    "deferredTitles": ["Q1 deck"],
    "tomorrowPreview": ["Q2 close kickoff", "Marketing review"]
  }
}
```

Title arrays capped at 5. `tomorrowPreview` is empty when `date=yesterday`.

---

### 5.9 Recall day

> Maps to spec tool: **`recall_day`**

`GET /api/users/[id]/summaries/[date]`

Reads the stored `ConversationSummary` row written by the midnight summarization cron. Returns `found: false` (success, not error) when no summary exists.

**Path parameters**

| Name | Format | Notes |
|---|---|---|
| `id` | uuid | |
| `date` | `YYYY-MM-DD` | Calendar day in the user's tz. Future dates return `found: false` (not an error). |

**Success — found (200)**

```json
{
  "data": {
    "found": true,
    "date": "2026-05-05",
    "summaryText": "Closed three site reviews. Discussed Pune contractor delays...",
    "keyDecisions": [
      { "type": "task_deferred", "title": "Q1 deck", "to": "2026-05-09" }
    ],
    "taskStateSnapshot": { "pending_at_eod": 4, "completed_today": 3 },
    "emotionalTone": "focused, tense about hiring",
    "communicationPattern": "voice notes, terse"
  }
}
```

**Success — not found (200)**

```json
{ "data": { "found": false, "date": "2026-04-19" } }
```

**Errors**: `400 BAD_REQUEST` for malformed dates.

---

### 5.10 List users (lookup helper)

`GET /api/users?phone=<E.164>` — find a user by phone. Useful if the agent needs to look someone up by phone *other than* the caller (e.g. "schedule a follow-up with the partnership lead at +91…").

**Auth**: admin/dev session OR api-key. Executive sessions cannot list the directory.

```json
{
  "data": [
    {
      "id": "user-uuid",
      "email": "dpamneja@gmail.com",
      "phoneE164": "919958841734",
      "displayName": "Dhruv",
      "image": "https://...",
      "role": "admin",
      "teamId": null,
      "languagePref": "hinglish",
      "timezone": "Asia/Kolkata",
      "voiceReplyEnabled": true,
      "isActive": true
    }
  ]
}
```

Other supported query params: `search`, `role`, `status` (`active|inactive|all`), `limit`.

---

### 5.11 Get user / user profile

- `GET /api/users/[id]` — basic user record (same shape as a row in 5.10).
- `GET /api/users/[id]/profile` — rich profile with KPIs (active/completed/overdue tasks, sessions count) and recent activity. Used by the dashboard's `/admin/users/[id]` page; agents probably won't need it but it's available.

---

## 6. Agent flow — happy path

Typical sequence for a new conversation:

1. WhatsApp message arrives. ElevenLabs invokes the agent. `system__caller_id = "919958841734"`.
2. Agent calls **`get_user_context`** → `GET /api/agent-context?phone=919958841734`. Stores `user.id` in conversation memory.
3. User says "I had a great call with Mark, mark that done."
4. Agent calls **`get_tasks`** → `GET /api/tasks?assignedToId={user.id}&search=Mark`. Picks the right task by id.
5. Agent calls **`update_task`** → `PATCH /api/tasks/{id}` with `{ "status": "done" }`. Server sets `completedAt` and writes audit.
6. Agent confirms back to the user.

Variations:
- "Push the board deck to Friday" → step 5 is **`defer_task`** (`PATCH /api/tasks/{id}/defer`) instead.
- "Add a task to call HR tomorrow" → step 5 is **`create_task`** (`POST /api/tasks`) with `assignedToId = user.id`.
- "How did today go?" → **`get_daily_summary`** (`GET /api/users/{user.id}/daily-summary?date=today`).
- "What did we decide last Friday?" → **`recall_day`** (`GET /api/users/{user.id}/summaries/2026-05-02`).

---

## 7. 11Labs tool config — paste-ready JSON

11Labs server tools take a JSON-style config. Below is one entry per spec tool, ready to paste into the workspace tool editor (or import as JSON if the dashboard supports it). The schema follows their standard "webhook" tool shape — adjust field names if your workspace uses different keys.

> **Replace** `BASE_URL` with your ngrok HTTPS URL during dev or your Vercel domain in prod. Keep the `x-api-key` header configured as a **workspace secret** so the value isn't visible in the tool config.

### 7.1 `get_user_context`

```json
{
  "name": "get_user_context",
  "description": "Bootstraps a session. Call this FIRST in every new conversation to get the user's identity, current task state, and recent context. Returns user.id which all subsequent task/summary tools need.",
  "method": "GET",
  "url": "BASE_URL/api/agent-context",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" }
  ],
  "query_parameters": [
    {
      "name": "phone",
      "type": "string",
      "required": true,
      "description": "Caller's phone number from WhatsApp. Pass {{system__caller_id}} verbatim — the server normalizes E.164 with or without the leading '+'.",
      "value": "{{system__caller_id}}"
    }
  ]
}
```

### 7.2 `get_tasks`

```json
{
  "name": "get_tasks",
  "description": "List or search the caller's tasks. Use this to resolve user references like 'mark the marketing review done' (call with search='marketing review') or to answer 'what's pending today' (filter='today'). Always pass assignedToId from get_user_context.",
  "method": "GET",
  "url": "BASE_URL/api/tasks",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" }
  ],
  "query_parameters": [
    {
      "name": "assignedToId",
      "type": "string",
      "required": true,
      "description": "The caller's user.id from get_user_context. Scopes the search to their tasks only."
    },
    {
      "name": "filter",
      "type": "string",
      "required": false,
      "description": "Time bucket: 'today' (deadline today), 'this_week' (next 7 days), 'overdue' (past deadline, still active), 'pending' (active regardless of date), 'all' (no time filter). Computed in the user's timezone."
    },
    {
      "name": "priority",
      "type": "string",
      "required": false,
      "description": "Filter by priority: 'low', 'medium', 'high', 'urgent'."
    },
    {
      "name": "search",
      "type": "string",
      "required": false,
      "description": "Substring match on title and description, case-insensitive. Use to disambiguate user-named tasks."
    },
    {
      "name": "limit",
      "type": "number",
      "required": false,
      "description": "Max results, default 100, cap 200. Pass a smaller value (e.g. 10) when you only need a short list to read back."
    }
  ]
}
```

### 7.3 `create_task`

```json
{
  "name": "create_task",
  "description": "Create a new task assigned to the caller. Use when the user mentions something new to track. assignedToId MUST be the caller's user.id from get_user_context (Phase 1 only supports self-assignment).",
  "method": "POST",
  "url": "BASE_URL/api/tasks",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" },
    { "name": "Content-Type", "value": "application/json" }
  ],
  "body_parameters": [
    {
      "name": "assignedToId",
      "type": "string",
      "required": true,
      "description": "The caller's user.id from get_user_context."
    },
    {
      "name": "title",
      "type": "string",
      "required": true,
      "description": "Short imperative title, 1–200 chars. E.g. 'Review Q2 board deck'."
    },
    {
      "name": "description",
      "type": "string",
      "required": false,
      "description": "Optional details, ≤ 2000 chars."
    },
    {
      "name": "deadline",
      "type": "string",
      "required": false,
      "description": "ISO 8601 with timezone offset, e.g. '2026-04-26T18:00:00+05:30'. Anchor relative dates ('tomorrow', 'next Friday') to user.currentLocalTime from get_user_context."
    },
    {
      "name": "priority",
      "type": "string",
      "required": false,
      "description": "'low' | 'medium' | 'high' | 'urgent'. Default 'medium'. Infer from urgency cues in user speech."
    },
    {
      "name": "tags",
      "type": "array",
      "required": false,
      "description": "Optional string tags, ≤ 10, each ≤ 50 chars."
    }
  ]
}
```

### 7.4 `update_task`

```json
{
  "name": "update_task",
  "description": "Update a task's status, priority, title, or description. Use for 'mark done', 'cancel', 'change priority', etc. DO NOT use this to change deadlines — call defer_task instead. Pass at least one field to change.",
  "method": "PATCH",
  "url": "BASE_URL/api/tasks/{task_id}",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" },
    { "name": "Content-Type", "value": "application/json" }
  ],
  "path_parameters": [
    {
      "name": "task_id",
      "type": "string",
      "required": true,
      "description": "Target task uuid (from get_tasks)."
    }
  ],
  "body_parameters": [
    {
      "name": "status",
      "type": "string",
      "required": false,
      "description": "'pending' | 'in_progress' | 'done' | 'cancelled'. Server auto-manages completedAt when transitioning to/from 'done'. DO NOT set status='deferred' here — use defer_task."
    },
    {
      "name": "priority",
      "type": "string",
      "required": false,
      "description": "'low' | 'medium' | 'high' | 'urgent'."
    },
    {
      "name": "title",
      "type": "string",
      "required": false,
      "description": "New title, 1–200 chars."
    },
    {
      "name": "description",
      "type": "string",
      "required": false,
      "description": "New description, ≤ 2000 chars. Empty string clears."
    }
  ]
}
```

### 7.5 `defer_task`

```json
{
  "name": "defer_task",
  "description": "Push a task's deadline to a future time. Use for 'kal kar denge', 'push to next week', 'defer this'. Sets a flag the system can mine later. The task's status is intentionally unchanged.",
  "method": "PATCH",
  "url": "BASE_URL/api/tasks/{task_id}/defer",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" },
    { "name": "Content-Type", "value": "application/json" }
  ],
  "path_parameters": [
    {
      "name": "task_id",
      "type": "string",
      "required": true,
      "description": "Target task uuid."
    }
  ],
  "body_parameters": [
    {
      "name": "deferTo",
      "type": "string",
      "required": true,
      "description": "New deadline as ISO 8601 with timezone offset, e.g. '2026-04-26T18:00:00+05:30'. Must be at least 1 minute in the future."
    },
    {
      "name": "reason",
      "type": "string",
      "required": false,
      "description": "Optional free-text reason, ≤ 500 chars. Stored in audit log."
    }
  ]
}
```

### 7.6 `get_daily_summary`

```json
{
  "name": "get_daily_summary",
  "description": "Live-computed digest of today or yesterday for the caller — counts of completed/pending/deferred/created tasks plus title arrays. Use for 'how did today go' and evening wrap-up. For older dates, use recall_day.",
  "method": "GET",
  "url": "BASE_URL/api/users/{user_id}/daily-summary",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" }
  ],
  "path_parameters": [
    {
      "name": "user_id",
      "type": "string",
      "required": true,
      "description": "The caller's user.id from get_user_context."
    }
  ],
  "query_parameters": [
    {
      "name": "date",
      "type": "string",
      "required": false,
      "description": "'today' (default) or 'yesterday'. Any other value returns 400 — use recall_day for older dates."
    }
  ]
}
```

### 7.7 `recall_day`

```json
{
  "name": "recall_day",
  "description": "Read the stored narrative summary for a past day. Use when the user references something from a specific past date that's not in active conversation memory. Returns found:false (not an error) when no summary exists for that date.",
  "method": "GET",
  "url": "BASE_URL/api/users/{user_id}/summaries/{date}",
  "headers": [
    { "name": "x-api-key", "value": "{{secret.AGENT_API_KEY}}" }
  ],
  "path_parameters": [
    {
      "name": "user_id",
      "type": "string",
      "required": true,
      "description": "The caller's user.id from get_user_context."
    },
    {
      "name": "date",
      "type": "string",
      "required": true,
      "description": "Calendar date YYYY-MM-DD in the user's timezone (e.g. '2026-04-19')."
    }
  ]
}
```

---

## 8. Error handling for the agent's system prompt

Drop this into the agent's system prompt so it knows how to react to each error code:

```
ERROR HANDLING:

If a tool returns 4xx/5xx, the response JSON has { error, code }. Handle gracefully:

- code = NOT_AUTHENTICATED / INVALID_API_KEY: Should never happen in production. Fail silently and log.
- code = NOT_FOUND on /api/agent-context: "I don't recognize this number — please ask your admin to add you." End the conversation.
- code = FORBIDDEN with message "User is inactive": "Your account is paused. Please contact your admin." End the conversation.
- code = NOT_FOUND on a task: "I couldn't find that task — could you describe it differently?" Then call get_tasks with a search.
- code = FORBIDDEN with message "Not your task": "That task isn't yours to update." (Phase 1 limitation.)
- code = BAD_REQUEST: Apologize briefly, retry once with cleaner inputs. If it still fails, tell the user "I'm having trouble with that — let me try again later."
- code = CONFLICT: Tell the user "There's a conflict — that record already exists." (Mostly for user creates which the agent doesn't do.)
- code = INTERNAL or network failure: "Let me try that again." Retry once. If still fails: "I'm having trouble reaching the system right now — try again in a minute."

NEVER expose error_code values verbatim to the user.
```

---

## 9. Local testing — ngrok

1. Start the dev server (already running here): `pnpm --filter @bathla-cos/web dev`.
2. In a separate terminal: `ngrok http 3000`.
3. Copy the `https://<subdomain>.ngrok.app` URL.
4. In the 11Labs tool config, set `BASE_URL` to that ngrok URL.
5. Smoke-test from the same terminal:

   ```bash
   AGENT_API_KEY=$(grep -E '^AGENT_API_KEY' .env | sed -E 's/AGENT_API_KEY *= *//; s/^"//; s/"$//')
   NGROK_URL=https://<your-subdomain>.ngrok.app

   curl -H "x-api-key: $AGENT_API_KEY" \
     "$NGROK_URL/api/agent-context?phone=919958841734"
   ```

ngrok's free tier gives you a fresh URL on every restart — update the 11Labs tool config when it changes, or upgrade for a stable subdomain.

---

## 10. Endpoint inventory (quick reference)

| Tool / use | HTTP | Path |
|---|---|---|
| `get_user_context` | GET | `/api/agent-context?phone=…` |
| `get_tasks` | GET | `/api/tasks?assignedToId=…&filter=…` |
| `create_task` | POST | `/api/tasks` |
| `update_task` | PATCH | `/api/tasks/{id}` |
| Quick status | PATCH | `/api/tasks/{id}/status` |
| `defer_task` | PATCH | `/api/tasks/{id}/defer` |
| Soft delete | DELETE | `/api/tasks/{id}` |
| `get_daily_summary` | GET | `/api/users/{id}/daily-summary?date=today\|yesterday` |
| `recall_day` | GET | `/api/users/{id}/summaries/{YYYY-MM-DD}` |
| Lookup user by phone | GET | `/api/users?phone=…` |
| Get user (basic) | GET | `/api/users/{id}` |
| Get user profile (rich) | GET | `/api/users/{id}/profile` |

All require the `x-api-key` header (or a NextAuth session cookie for the dashboard).

---

## 11. What's NOT in scope here

- **Post-call webhook from 11Labs** (transcript ingestion, conversation summarization). Will be added at `/api/webhooks/elevenlabs` later.
- **Daily summarization cron** that writes `ConversationSummary` rows. Until it runs, `recall_day` always returns `{ found: false }`.
- **Twilio voice transport** — same agent + tools, different transport. The endpoints work unmodified.
- **Idempotency keys** — none in v1; double-creates are tolerated.
- **Per-user rate limiting** — none in v1; one CEO is fine.

---

## 12. Source-of-truth files

- Auth + error codes: `apps/web/src/lib/api-auth.ts`
- Time helpers (tz formatting, day boundaries): `apps/web/src/lib/time-tz.ts`
- Task service: `apps/web/src/server/tasks/service.ts`
- User service (incl. `getAgentContext`, `getUserDailySummary`, `recallDay`): `apps/web/src/server/users/service.ts`
- Schemas: `apps/web/src/server/{tasks,users}/schemas.ts`
- Route handlers: `apps/web/src/app/api/**/route.ts`
