# Clerk Theme Integration

> See also: `design-tokens.md` for the CSS variables referenced below.

**File:** `app/ConvexClientProvider.tsx` — `clerkAppearance` object passed to `<ClerkProvider>`.

## Variables

| Clerk Variable | Value |
|----------------|-------|
| `colorPrimary` | `var(--primary)` |
| `colorDanger` | `var(--destructive)` |
| `colorSuccess` | `var(--accent-sage)` |
| `colorWarning` | `var(--accent-amber)` |
| `colorBackground` | `var(--card)` |
| `colorInputBackground` | `var(--input)` |
| `colorNeutral` | `var(--muted-foreground)` |
| `colorText` | `var(--foreground)` |
| `colorTextSecondary` | `var(--muted-foreground)` |
| `fontFamily` | Geist Sans + SF Pro + system-ui fallbacks |
| `borderRadius` | `1.25rem` |
| `spacingUnit` | `1rem` |

## Element Overrides

| Element | Style |
|---------|-------|
| `card` | `bg-card/80 backdrop-blur-xl shadow-lg border border-border/50 rounded-2xl` |
| `formButtonPrimary` | `rounded-full`, shadow-md, `active:scale-95`, h-11 px-6 |
| `formFieldInput` | `rounded-lg`, `bg-input/50 backdrop-blur-md`, `ring-1 ring-border` |
| `socialButtonsBlockButton` | `rounded-full`, `bg-background/50 backdrop-blur-sm` |
| `footer` / `footerAction` | hidden |
| `modalBackdrop` | `backdrop-blur-sm bg-background/80` |
| `userButtonPopoverCard` | `rounded-2xl shadow-xl bg-card/95 backdrop-blur-xl` |
| `userButtonPopoverFooter` | hidden |
