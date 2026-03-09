# Design Tokens

> See also: `ui-components.md` for component-level styling, `clerk-theme.md` for auth UI.

## Color System (oklch, `app/globals.css`)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--background` | oklch(0.975 0.005 85) warm off-white | oklch(0.14 0.015 280) deep charcoal | Page background |
| `--foreground` | oklch(0.15 0.02 265) | oklch(0.96 0.005 85) | Primary text |
| `--card` | oklch(0.995 0.002 85) | oklch(0.18 0.018 280) | Card surfaces |
| `--primary` | oklch(0.18 0.015 280) dark charcoal | oklch(0.96 0.005 85) off-white | Inverts in dark mode |
| `--secondary` | oklch(0.955 0.008 85) | oklch(0.22 0.02 280) | Secondary surfaces |
| `--muted` | oklch(0.955 0.006 85) | oklch(0.22 0.02 280) | Muted backgrounds |
| `--muted-foreground` | oklch(0.50 0.02 265) | oklch(0.65 0.01 280) | Secondary text |
| `--accent` | oklch(0.95 0.015 85) | oklch(0.24 0.025 270) | Hover/accent |
| `--destructive` | oklch(0.58 0.22 25) | same | Error/danger |
| `--border` | oklch(0.90 0.008 85) | oklch(0.26 0.015 280) | Borders |
| `--ring` | oklch(0.55 0.18 45) warm amber | oklch(0.65 0.18 45) | Focus rings |

## Premium Accent Tokens

| Token | Color |
|-------|-------|
| `--accent-amber` | Amber gold |
| `--accent-coral` | Terracotta coral |
| `--accent-teal` | Deep teal |
| `--accent-sage` | Fresh sage |
| `--accent-rose` | Magenta rose |

Chart colors `--chart-1` through `--chart-5` use these same values.

## Radius System

- `--radius`: 1.25rem (base)
- `--radius-sm`: calc(var(--radius) - 4px)
- `--radius-md`: calc(var(--radius) - 2px)
- `--radius-lg`: var(--radius)
- `--radius-xl`: calc(var(--radius) + 4px)

## Shadow System

| Token | Description |
|-------|-------------|
| `--shadow-xs` | 1px subtle |
| `--shadow-sm` | 2-layer, 8px spread |
| `--shadow-md` | 2-layer, 12px spread |
| `--shadow-lg` | 2-layer, 32px spread |
| `--shadow-xl` | 2-layer, 48px spread |
| `--shadow-amber/coral/teal` | Colored glow variants |

## Typography

- `--font-sans`: Geist Sans (SF Pro, system-ui fallbacks)
- `--font-mono`: Geist Mono (SF Mono, monospace fallbacks)
- Font features: `ss01`, `ss02`, `cv01`, `cv02` enabled

## Utility Classes

| Class | Description |
|-------|-------------|
| `.glass` | `bg-white/70 backdrop-blur-2xl border-white/30 shadow-lg` (dark: `bg-black/50`) |
| `.glass-card` | `bg-white/80 backdrop-blur-xl rounded-2xl`, layered shadow, hover translateY(-2px) |
| `.mesh-bg` | Multi-radial-gradient warm mesh (amber/coral/teal/sage corners) — on `<body>` |
| `.shadow-glow-amber/coral/teal` | Colored box-shadow glows |
| `.card-3d` | perspective-1000, hover rotateX(2deg) rotateY(-2deg) translateY(-4px) |
| `.stagger-1/2/3` | Animation delays: 0.05s / 0.10s / 0.15s |
| `.container` | `mx-auto px-4 md:px-8 max-w-7xl` |
| `.animate-count` | Count-up animation, 0.6s cubic-bezier(0.16,1,0.3,1) |

## Dark Mode

- Activated by `.dark` class on `<html>` — managed by `context/ThemeProvider.tsx`
- CSS: `@custom-variant dark (&:is(.dark *))`
- Imports: `tailwindcss` + `tw-animate-css`
