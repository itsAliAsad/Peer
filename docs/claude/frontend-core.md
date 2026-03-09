# Frontend Core

> Load this file before working on any frontend page or component.
> See also: `routes.md` for page-level detail, `components-feature.md` for feature component groups.

## Provider Hierarchy

```
<html>
  <body>
    <ConvexClientProvider>         ← ClerkProvider > ConvexProviderWithClerk > UserSync
      <ThemeProvider>              ← Reads user.theme from Convex, toggles .light/.dark on <html>
        <RoleProvider>             ← Dual-role (student/tutor), persisted to localStorage + Convex
          <Navbar />               ← Always rendered; has NotificationDropdown, CommandSearch, RoleSwitcher
          <BannedBanner />         ← Shown if user.bannedAt is set
          <AnnouncementsBar />     ← Active announcements from api.admin.getAnnouncements
          {children}               ← Page content, wrapped by template.tsx in PageTransition
          <Toaster />              ← Sonner toasts
          <TermsModal />           ← Shown if user hasn't accepted terms (no termsAcceptedAt)
        </RoleProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  </body>
</html>
```

**Files:** `app/layout.tsx` (provider tree) · `app/ConvexClientProvider.tsx` (Clerk+Convex setup) · `context/ThemeProvider.tsx` · `context/RoleContext.tsx`

## Role System

**File:** `context/RoleContext.tsx`

- Two roles: `"student"` (buyer) and `"tutor"` (seller)
- Persisted to `localStorage` key `path_user_role` AND Convex via `api.users.setRole`
- On mount: hydrates from Convex user record, falls back to localStorage, defaults to `"student"`
- Legacy value mapping: `"buyer"` → `"student"`, `"seller"` → `"tutor"`
- Hook: `useRole()` returns `{ role, setRole, toggleRole }`
- `RoleSwitcher` in Navbar calls `toggleRole()`
- Role determines which dashboard route is active (`/dashboard/buyer` vs `/dashboard/seller`) and which nav items are shown

## Template Gatekeeping

**File:** `app/template.tsx` — wraps every page on every navigation (Next.js template, not layout).

**Gate 1 — Onboarding redirect:**
- Condition: signed in + `termsAcceptedAt` set + `onboardingCompletedAt` not set
- Action: `router.replace("/onboarding")`
- Exempt routes: `/onboarding`, `/sign-in`, `/sign-up`

**Gate 2 — Launch gate (`IS_LAUNCHED` flag, currently `true`):**
- When `false`: only `/admin`, `/sign-in`, `/sign-up` accessible; admins bypass; everyone else redirected to `/` with "Coming Soon" toast

All page content wrapped in `<PageTransition>` (framer-motion opacity+y fade).

## Key Frontend Conventions

- Path alias `@/` maps to project root — use for all imports
- UI primitives in `components/ui/` (shadcn new-york style)
- Feature components grouped by domain: `components/{domain}/`
- Icons from `lucide-react`; fonts are Geist Sans (`--font-sans`) + Geist Mono (`--font-mono`)
- Tailwind CSS v4 — utility classes only, no config file; theme via CSS variables in `app/globals.css`
- Dark mode via `.dark` class on `<html>`, managed by ThemeProvider
