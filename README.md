# Strix — Admin Panel

SPA admin/moderation cho Strix blog. Manage users, roles, posts (review/approve/reject), categories.

**Stack**: React 19 + Vite + TanStack Router/Query + TanStack Table + Zustand + shadcn/ui + Tailwind 4 + TipTap.

> Đọc [../CLAUDE.md](../CLAUDE.md) ở root project để nắm overview kiến trúc, cookie protocol, deploy workflow.

## Quick start

```bash
# Prerequisites: Bun ≥ 1.2, backend running

bun install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
bun run dev               # http://localhost:5174
```

**First-time bootstrap**: khi DB empty, admin panel hiện setup wizard ở `/` → tạo super_admin đầu (POST `/api/auth/setup`, idempotent). Sau đó login ở `/login`.

## Scripts

| Command | What |
| --- | --- |
| `bun run dev` | Vite dev server (CSP meta tự strip qua plugin) |
| `bun run build` | Type-check + production bundle |
| `bun run check` | tsc + eslint + prettier check |

## Project layout

```
src/
  main.tsx                   # QueryClientProvider + RouterProvider
  App.tsx                    # <Outlet/> + global Toaster
  lib/
    api.ts                   # axios + auto-refresh + CSRF inject
    authConstants.ts         # ⚠ KEEP IN SYNC với backend cookies.ts + frontend
    sanitize.ts              # sanitizeHtml + safeImageUrl (KEEP IN SYNC với frontend)
    permissions.ts           # mirror backend's PERMISSIONS constants
    queries.ts               # API surface (postsApi, usersApi, rolesApi, ...)
    queryClient.ts password-rules.ts markdown.ts utils.ts
  store/auth.ts              # zustand + loadMe single-flight + checkSetupStatus + hasPermission helpers
  components/
    AppLayout.tsx            # sidebar shell, nav gated by RBAC
    RequireAuth.tsx          # auth + setup-status + must-change-password guard
    editor/PostEditor.tsx    # TipTap wrapper (giống frontend's, dùng shadcn UI)
    ui/                      # shadcn/ui (badge.tsx và button.tsx có react-refresh warning — boilerplate, skip)
    ConfirmDialog.tsx PasswordRequirements.tsx ErrorBoundary.tsx
  routes/
    index.tsx                # routeTree
    home.tsx setup.tsx login.tsx change-password.tsx
    posts.tsx                # /posts list với tabs (Mine/All/Review)
    post-editor.tsx          # /posts/new và /posts/:id/edit
    post-preview.tsx         # /posts/:id/preview (có dangerouslySetInnerHTML qua sanitizeHtml)
    users.tsx roles.tsx categories.tsx not-found.tsx
vite.config.ts               # có stripCspInDev plugin
```

## Key patterns

- **Cookie partitioning**: admin sends `X-App-Client: admin`. Backend dùng `admin_at`, `admin_rt`, `admin_csrf` (khác `web_*` của frontend) → user có thể login đồng thời 2 app khác account.
- **Permission gating**: `useAuth().hasPermission(...)` ẩn UI nếu user không đủ quyền. Backend re-enforce hết — UI gate chỉ là UX, không phải security boundary.
- **Cache hygiene**: `queryClient.clear()` gọi sau login/setup/logout/auth-lost để không leak data giữa accounts.
- **Auto-refresh**: same pattern frontend — interceptor 401 → `/api/auth/refresh` single-flight → retry. Fail → `onAuthLost` → null state.

## Permission model

17 keys (xem `src/lib/permissions.ts`):
- `post:*` (view:any, write:own, write:any, publish:any, delete:own, delete:any, review)
- `media:upload`
- `comment:moderate`, `comment:delete:any`
- `analytics:view`, `category:manage`
- `user:view`, `user:manage`, `role:view`, `role:manage`

3 default roles seed sẵn ở backend:
- `super_admin` — tất cả 17 permissions. Cannot be modified by non-super_admin (PATCH/DELETE block).
- `admin` — content + moderation
- `author` — own posts + media upload

Login admin panel cần ít nhất 1 permission từ `ADMIN_PANEL_PERMISSIONS` (xem `src/lib/permissions.ts`).

## Deploy

Xem [../scripts/DEPLOY.md](../scripts/DEPLOY.md). Build → S3 `strix-blog-admin` → CloudFront → `admin.strix-blog.uk`.

```bash
./scripts/deploy-admin.sh   # build + S3 sync + CloudFront invalidate + smoke test
```

Backend phải include URL deployed trong `ADMIN_URL` (CORS + WS origin allowlist).
