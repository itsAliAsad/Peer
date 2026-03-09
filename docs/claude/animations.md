# Animations

> See also: `ui-components.md` for PageTransition and LottieAnimation components.

## Framer Motion

**PageTransition** (`components/ui/PageTransition.tsx`) — wraps every page via `app/template.tsx`:
- Enter: `opacity: 0, y: 20` → `opacity: 1, y: 0`
- Exit: `opacity: 1, y: 0` → `opacity: 0, y: -20`
- Duration: 0.3s, easeInOut

**`lib/animations.ts`** — exports `rocketAnimation` (Lottie JSON, 500×500, 60 frames ~30fps). Used with `LottieAnimation` component.

## CSS Keyframes (`app/globals.css`)

| Animation | Token | Behavior |
|-----------|-------|----------|
| `accordion-down` | `--animate-accordion-down` | height: 0 → content, 0.2s ease-out |
| `accordion-up` | `--animate-accordion-up` | content → 0, 0.2s ease-out |
| `fade-in` | `--animate-fade-in` | opacity 0 → 1, 0.3s ease-out |
| `slide-in-from-bottom` | `--animate-slide-in-from-bottom` | translateY(10px) + opacity 0 → 0 + 1, 0.4s ease-out |
| `shimmer` | — | background-position shift (loading skeleton effect) |
| `countUp` | `.animate-count` | translateY(8px) + fade-in, 0.6s cubic-bezier(0.16,1,0.3,1) |

## Entry Animation Utilities (from `tw-animate-css`)

Used throughout components for staggered reveals:
- `animate-in`, `fade-in-*`, `zoom-in-*`, `slide-in-from-*` — Tailwind utility classes
- `.stagger-1` / `.stagger-2` / `.stagger-3` — delay: 0.05s / 0.10s / 0.15s
