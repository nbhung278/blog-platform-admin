# Strix — Admin Panel

The moderation/operations SPA for the Strix blog platform. Lets staff manage users, roles, posts (review/approve/reject), and categories.

## Stack

- **React 19** + **Vite**
- **TanStack Router** + **TanStack Query**
- **Zustand** for auth state
- **shadcn/ui** components on **Tailwind CSS**
- **TanStack Table** for post list
- **Tiptap** for the same editor experience as the public client
- **Sonner** for toasts (single global Toaster in `App.tsx`)

## Features

- Setup wizard: bootstrap the first super-admin when the database has zero users
- Login + auto-refresh + permission-aware navigation
- **Posts**: list with filters/tabs (All / My posts / Pending review), inline approve/reject, edit with the same Tiptap editor authors use
- **Users**: create, edit (assign roles, force-password-change flag), delete
- **Roles**: CRUD with permission checkboxes, system roles protected from deletion
- **Categories**: CRUD; deletion blocked when posts are still assigned
- Sidebar navigation gated by RBAC — buttons only render if the current user has the relevant permission

## Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- Backend running and reachable

## Setup

```bash
bun install

cp .env.example .env
# VITE_API_URL=http://localhost:3000  (admin uses /api/* paths, hardcoded in lib/api.ts)

bun run dev
```

Default dev URL: <http://localhost:5174>.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server with HMR |
| `bun run build` | Type-check + production bundle |
| `bun run preview` | Preview production build locally |
| `bun run lint` | ESLint |

## First-time bootstrap

When the database has zero users, the admin panel shows a setup wizard at `/` that lets you create the first super-admin (calls `POST /api/auth/setup`, which is idempotent and only allowed while the user count is zero). After that, sign-in is at `/login`.

## Architecture notes

- **Cookie partitioning**: admin sends `X-App-Client: admin`. Backend partitions cookies (`admin_at`, `admin_rt`, `admin_csrf`) so admin and the public client can be logged into different accounts simultaneously without clobbering each other's sessions.
- **Auto-refresh**: `src/lib/api.ts` interceptor handles 401 by calling `/api/auth/refresh` once (single-flight), retrying the original request. If refresh fails, `registerOnAuthLost` clears auth state and dumps the React Query cache.
- **CSRF**: cached in module scope, invalidated on login / setup / refresh / logout / 403 CSRF mismatch.
- **Permission gating**: `src/lib/permissions.ts` mirrors the backend's permission keys. UI uses `useAuth().hasPermission()` to hide actions the current user can't perform — the backend re-enforces them anyway.
- **Cache hygiene**: `queryClient.clear()` is called on login, setup, logout, and auth-lost events so a stale view from another account never leaks across sessions.

## Project layout

```
src/
  main.tsx                   # mount QueryClientProvider + RouterProvider
  App.tsx                    # render <Outlet/> + global Toaster
  lib/
    api.ts                   # axios + interceptors (auth lost / CSRF)
    queryClient.ts           # shared QueryClient instance
    queries.ts               # API surface (categoriesApi, postsApi, etc.)
    permissions.ts           # PERMISSIONS constants + helpers
    password-rules.ts
    authConstants.ts
    markdown.ts utils.ts
  store/auth.ts              # zustand auth store + loadMe + RBAC helpers
  components/
    AppLayout.tsx            # sidebar shell, nav gated by RBAC
    RequireAuth.tsx          # auth + setup-status guard
    ConfirmDialog.tsx        # reusable confirm modal
    PasswordRequirements.tsx
    editor/                  # Tiptap wrapper (mirrors the public client)
    ui/                      # shadcn/ui components
  routes/
    index.tsx                # routeTree
    setup.tsx login.tsx
    posts.tsx                # /posts list with tabs and review actions
    post-editor.tsx          # /posts/new and /posts/:id/edit
    users.tsx roles.tsx categories.tsx
```

## Deploying

- `bun run build` → static site in `dist/`
- Same SPA-fallback rules as the public client
- `VITE_API_URL` baked in at build time — must point at the production API origin
- Backend must include the deployed admin URL in `ADMIN_URL` so CORS + WebSocket origin checks pass
- Behind a reverse proxy, terminate TLS and forward to Vite-built static assets
