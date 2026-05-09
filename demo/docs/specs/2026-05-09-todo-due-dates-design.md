# Due Dates for Todos — Design Spec

**Date:** 2026-05-09
**Repo:** `claude-code-team-workshop/demo`
**Status:** Brainstorm complete, ready for implementation plan
**Implementation rule:** This change touches `server/`, `src/`, and tests, so the **mandatory team protocol** in `demo/CLAUDE.md` applies. Do NOT implement directly — spawn the build team.

---

## Context

The demo TODO app currently models a todo as `{ id, userId, title, completed, createdAt, updatedAt }` — no metadata, no organization, no time semantics. We want to add **due dates** to give the workshop a feature that meaningfully exercises the team protocol: contract changes that must be frozen before fan-out, work that splits cleanly across `backend-builder`, `frontend-builder`, and `test-engineer`, and observable behavior the orchestrator can verify end-to-end.

The feature also gives users something useful: knowing what's overdue, what's coming up, and being able to sort their list by urgency rather than creation order.

## Goal

Add an optional `dueAt` to todos with the four behaviors:

1. Set / clear a due date (`POST /api/todos`, `PATCH /api/todos/:id`).
2. Visual overdue indicator in the UI.
3. Sort the list by due date.
4. Filter the list by date range / overdue-only.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Precision | **Date + time** (e.g. "May 12 at 5pm") |
| Storage | **UTC ISO 8601 string**, displayed in browser local TZ |
| Where "overdue" is computed | **Client-side** from `dueAt` vs `Date.now()`. Server returns data only — responses stay stationary. |
| `NULL` handling under `sort=dueAt-asc` | **NULLS LAST** (undated todos appear after dated ones) |
| Filter mechanism | Generic `?from=&to=` range; "Overdue" is just `?to=<now>` — no dedicated endpoints |
| Sort/filter UI placement | **Inline in `TodoList`** — no premature `TodoFilters` extraction |

## API contract (the freeze point)

These are the integration surfaces. The orchestrator must edit `shared/types.ts` and `shared/schemas.ts` **before** spawning teammates and **must not modify them mid-task** without an explicit synchronization event.

### `shared/types.ts`

```ts
export interface Todo {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  dueAt: string | null;          // NEW — UTC ISO 8601, nullable
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoRequest {
  title: string;
  dueAt?: string | null;          // NEW — optional on create
}

export interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
  dueAt?: string | null;          // NEW — pass null to clear
}

export type SortOption = 'createdAt-desc' | 'dueAt-asc';

export interface ListTodosQuery {        // NEW
  sort?: SortOption;                     // default: 'createdAt-desc'
  from?: string;                         // UTC ISO; lower bound (inclusive)
  to?: string;                           // UTC ISO; upper bound (exclusive)
}
```

### `shared/schemas.ts`

- Add `dueAtSchema = z.string().datetime().nullable().optional()`. (`z.string().datetime()` already requires a `Z` designator and rejects naive datetimes — no extra options needed.)
- Extend `createTodoSchema` and `updateTodoSchema` to include `dueAt: dueAtSchema`.
- Add `listTodosQuerySchema`:
  ```ts
  z.object({
    sort: z.enum(['createdAt-desc', 'dueAt-asc']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  });
  ```

### Routes (`server/routes/todos.ts`)

- `POST /api/todos` — accept `dueAt`; persist as-is.
- `PATCH /api/todos/:id` — accept `dueAt`; passing `null` clears the column.
- `GET /api/todos` — accept `sort`, `from`, `to` query params:
  - SQL: `WHERE user_id = ? [AND due_at >= ?] [AND due_at < ?] ORDER BY <sort>`
  - When either `from` or `to` is set, **also** add `AND due_at IS NOT NULL` (rows with no date can't be in any range).
  - `sort=dueAt-asc` → `ORDER BY due_at ASC NULLS LAST, created_at DESC`.
  - `sort=createdAt-desc` (default) → `ORDER BY created_at DESC`.

## Database

- Add nullable column: `ALTER TABLE todos ADD COLUMN due_at TEXT`.
- Place the migration alongside existing schema files in `server/db/`.
- Additive, no data loss path.

## Frontend

### Components (`src/components/`)
- `TodoForm.tsx` — add `<input type="datetime-local">`; on submit, convert `value` to UTC via `new Date(value).toISOString()`. Empty input → `dueAt: null`.
- `TodoItem.tsx` — render `dueAt` formatted with `Intl.DateTimeFormat` in local TZ. Apply an `overdue` class when `new Date(dueAt) < now && !completed`. Use `useNow(60_000)` so the indicator stays accurate.
- `TodoList.tsx` — owns sort dropdown (`Newest first` / `Due soonest`) and filter pillbar (`All` / `Overdue` / `Today` / `This week`). Pill → query mapping (boundaries computed in local TZ, then serialized to UTC):
  - `All` → no `from`/`to`.
  - `Overdue` → `to = now.toISOString()`.
  - `Today` → `from = startOfDay(now)`, `to = endOfDay(now)` (full local day; includes overdue-this-morning).
  - `This week` → `from = now`, `to = now + 7 days`.

### Hooks / lib (`src/lib/`)
- `useNow(intervalMs)` — small hook returning a `Date` that updates on a `setInterval`. New file.
- `api.ts` — extend `listTodos(query: ListTodosQuery)` to URL-encode params; keep zod response validation.
- Existing `useTodos` (or equivalent) — accept `query`, re-fetch when it changes.

## Error handling

- Invalid `dueAt`, `from`, or `to` (not Z-form ISO 8601) → server responds 400 with `ApiError.details.<field>`.
- Client form maps `details.dueAt` to a field-level error under the datetime input.
- Race conditions (PATCH conflicts another tab): existing 404/409 paths unchanged.
- DB migration is additive — no rollback path needed.

## Tests

### Server (`server/routes/todos.test.ts`)
- Create with valid `dueAt` round-trips through DB.
- Create with malformed `dueAt` → 400 with `details.dueAt`.
- PATCH with `dueAt: null` clears the column.
- List with `?sort=dueAt-asc` returns dated rows ascending, undated last.
- List with `?from=…&to=…` returns only rows in `[from, to)`; excludes `null` rows.
- Time-sensitive tests use **fixed UTC strings**, never `Date.now()`.

### Client (`src/components/*.test.tsx`)
- `TodoForm` converts a local datetime-local value to UTC ISO on submit (mock TZ via `vi.setSystemTime` and Intl polyfill where needed).
- `TodoItem` applies the `overdue` class when `dueAt < now && !completed`; not when completed.
- `TodoList` filter pills produce the right `from`/`to` query params.

## Critical files

**Modify**
- `shared/types.ts`
- `shared/schemas.ts`
- `server/db/schema.sql` (or migration file alongside)
- `server/routes/todos.ts`
- `src/components/TodoForm.tsx`
- `src/components/TodoItem.tsx`
- `src/components/TodoList.tsx`
- `src/lib/api.ts`
- `src/lib/useTodos.ts` (if exists)

**Create**
- `src/lib/useNow.ts`
- Tests next to each modified source file (`*.test.ts(x)`)

## Verification

1. `npm run typecheck` — must pass across both `tsconfig.server.json` and `tsconfig.client.json`.
2. `npm test` — both Vitest projects (server + client) green.
3. Manual smoke (`npm run dev`):
   - Register, log in.
   - Create a todo with due date 1 minute in the future.
   - Wait 1 minute → overdue indicator appears (no page reload).
   - Switch sort to "Due soonest" → dated todos ordered ascending, undated below them.
   - Click "Overdue" filter → only the overdue todo shows.
   - Edit the todo and clear the due date → todo disappears from "Overdue" filter.

## Workshop choreography (team protocol)

This is what the orchestrator should do — it should NOT implement directly.

1. **Plan** — run `planner-researcher` to produce a written plan from this spec.
2. **Freeze contract** — orchestrator edits `shared/types.ts` and `shared/schemas.ts` per the API contract section. Commits or stages, then stops touching them.
3. **Spawn team** — `TeamCreate`, then by name:
   - `backend-builder` (subagent_type: `Backend Architect`) — owns DB migration + `server/routes/todos.ts`.
   - `frontend-builder` (subagent_type: `Frontend Developer`) — owns all `src/` changes including `useNow`.
   - `test-engineer` (subagent_type: `general-purpose`) — owns all `*.test.ts(x)`.
4. **Tasks** — `TaskCreate` granular tasks; mark UI/test tasks `addBlockedBy` the backend route task where ordering matters (e.g. integration tests need the server endpoint).
5. **Review** — `code-reviewer` against the diff. Resolve every 🔴 and any 🟡 with a clear answer.
6. **Verify** — run typecheck + tests + manual smoke per Verification section above.

## Out of scope (explicit YAGNI)

- Recurring tasks
- Reminders / notifications / push
- Per-user timezone preference (we rely on browser TZ)
- Calendar view
- Server-derived `isOverdue` field (rejected — non-stationary responses)
- Dedicated `/overdue` and `/upcoming` endpoints (rejected — combinatorial sprawl)
