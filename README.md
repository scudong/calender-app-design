# Kargul Calender Design Prototype

A design prototype of **Kargul Workspace**, a people-ops workspace built from the
"Dashboard – calendar" Figma design. Live at https://calender-app-design.vercel.app.

The **Time off** page (`/time-off`, the default route) reproduces the design
pixel-for-pixel; every other page in the sidebar is built in the same visual
language. Everything runs in the browser — there is no backend; data persists
to `localStorage`.

中文使用说明：登录后访问 `/guide`，或查看 [public/docs/user-guide.md](public/docs/user-guide.md)

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** with design tokens mapped from the Figma variables
- **shadcn/ui** (Radix primitives) themed to the design
- **Zustand** for state (`persist` middleware → `localStorage`)
- **next-themes** for dark mode, **Sonner** for toasts, **cmdk** for the command palette

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. To return to the exact design state, use
**Settings → Data → Reset demo data** (or clear site data).

## What works

- **Calendar** — week / day / month views; drag on empty space to create, drag
  events to move (across days), drag the bottom edge to resize; overlapping
  events lay out side by side; all-day lane with public holidays; live now-line;
  origin-aware details popover.
- **Time off** — request dialog that counts working days (skips weekends and
  holidays) and shows the balance after the request; stats computed from your
  requests and allowance; requests table with search, filters, sorting, details,
  edit/cancel/delete, and a manager approve/decline preview.
- **Shell** — workspace switcher, ⌘K search across pages/events/requests/
  documents/invoices, notifications, help menu, dark mode, account menu.
- **Keyboard** — `⌘K` search, `N` new event, `R` request time-off, `T` today,
  `←/→` previous/next, `D/W/M` views, `?` shortcuts.
- **Other pages** — Dashboard, Analytics, Personal details, Documents, Time
  tracking, Benefits, Invoice, Withdrawal methods, Settings.

## Project layout

```
src/
  app/                 routes (one folder per sidebar page)
  components/
    ui/                shadcn/ui primitives, themed
    shell/             title bar, sidebar, search, notifications, shortcuts
    calendar/          header, time grid, all-day row, month view, popover
    time-off/          stats panel, requests table, status badge
    dialogs/           app-wide dialogs (request, event, details, holidays…)
    pages/             page bodies for the secondary routes
  stores/              Zustand stores (app data, calendar view, overlays)
  hooks/               client-only "today"/"now"
  lib/                 types, date helpers, leave rules, seed data
```

The seed in `src/lib/seed.ts` is what the design shows: the week of Nov 8–14,
2026 with Tue Nov 10 selected, and allowance figures of 7 available, 2 pending,
3 upcoming.

## Backend, accounts and deployment

The app is served by a Cloudflare Pages project whose Pages Function
(`functions/api/[[path]].ts`) exposes the JSON API and stores every user's data in
Cloudflare D1 (SQLite). The UI and API share one origin, so session cookies work
without CORS.

- **Auth** — email + password (PBKDF2-SHA256, 10k iterations — sized for the
  Workers Free CPU budget; raise `ITERATIONS` in `worker/auth.ts` on a paid
  plan), HttpOnly session cookie stored as a hash in D1. The first admin is
  whoever's email is listed in `ADMIN_EMAILS` (see `wrangler.toml`) when they
  register.
- **Data** — normalised tables (`events`, `leave_requests`, `holidays`,
  `documents`, `time_entries`, `invoices`, `benefits`, …), all scoped by
  `user_id`. The browser keeps an in-memory Zustand store and pushes diffs to
  `POST /api/sync` (600 ms debounce, last-write-wins).
- **Roles** — `employee`, `manager`, `admin`. Admins see every member and can
  assign roles and reporting lines; managers approve their reports' requests on
  `/admin`. Employees only see their own data.
- **Static assets** — `next build` writes `out/`, uploaded as a Pages deployment;
  the Pages Function handles `/api/*` only.

### Local development

```bash
npm install
npm run db:local      # create the local D1 schema
npm run build         # produce out/
npm run worker:dev    # http://localhost:8787 (Pages dev: UI + Functions)
```

### Deploy

```bash
npx wrangler d1 create calender-app-zh          # once, copy the database_id
# put the id into wrangler.toml → [[d1_databases]].database_id
npm run db:remote                               # apply worker/schema.sql
npm run deploy                                  # next build + wrangler pages deploy
```

Known limits: uploaded document contents are not stored (metadata only, D1
keeps the file name/size/category); there is no rate limiting yet; concurrent
edits are last-write-wins.


## License

[MIT](LICENSE) © 2026 Kargul Studio
