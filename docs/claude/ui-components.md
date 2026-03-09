# UI Components

> See also: `design-tokens.md` for CSS variables/colors, `animations.md` for motion patterns.

## shadcn/ui Catalog (`components/ui/`)

All use `cn()` from `lib/utils.ts` (clsx + tailwind-merge). Style: new-york, neutral base.

| Component | Radix / Library | Key Exports |
|-----------|-----------------|-------------|
| AspectRatio | `@radix-ui/react-aspect-ratio` | `AspectRatio` |
| Avatar | `@radix-ui/react-avatar` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| Badge | cva | `Badge`, `badgeVariants` |
| Button | cva + Slot | `Button`, `buttonVariants` |
| Calendar | `react-day-picker` | `Calendar` |
| Card | native div | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| Carousel | `embla-carousel-react` | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` |
| Chart | `recharts` | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent` |
| Checkbox | `@radix-ui/react-checkbox` | `Checkbox` |
| Command | `cmdk` | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator` |
| Dialog | `@radix-ui/react-dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose` |
| DropdownMenu | `@radix-ui/react-dropdown-menu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubTrigger` |
| Form | `react-hook-form` | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField` |
| HoverCard | `@radix-ui/react-hover-card` | `HoverCard`, `HoverCardTrigger`, `HoverCardContent` |
| Input | native input | `Input` |
| Label | `@radix-ui/react-label` | `Label` |
| Popover | `@radix-ui/react-popover` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` |
| Progress | `@radix-ui/react-progress` | `Progress` |
| RadioGroup | `@radix-ui/react-radio-group` | `RadioGroup`, `RadioGroupItem` |
| ScrollArea | `@radix-ui/react-scroll-area` | `ScrollArea`, `ScrollBar` |
| Select | `@radix-ui/react-select` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `SelectGroup`, `SelectLabel` |
| Separator | `@radix-ui/react-separator` | `Separator` |
| Sheet | `@radix-ui/react-dialog` | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose` |
| Skeleton | native div | `Skeleton` |
| Sonner | `sonner` | `Toaster` (custom icons: success/info/warning/error/loading) |
| Switch | **custom** (no Radix) | `Switch` — props: `checked`, `onCheckedChange`, `disabled` |
| Table | native table | `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` |
| Tabs | `@radix-ui/react-tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| Textarea | native textarea | `Textarea` |
| Tooltip | `@radix-ui/react-tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |

## Key Variants

**Button** — all `rounded-full`, `active:scale-95`, `transition-all duration-300`

| variant | Style |
|---------|-------|
| `default` | `bg-primary`, shadow-md |
| `destructive` | `bg-destructive`, white text |
| `outline` | bordered, `bg-background/50`, backdrop-blur |
| `secondary` | `bg-secondary/80`, backdrop-blur-md |
| `ghost` | transparent, hover `bg-accent/50` |
| `gradient-blue` / `gradient-purple` | gradient classes, white text |
| `glass` | `bg-white/20`, backdrop-blur-lg |

Sizes: `default` (h-11 px-6) · `sm` (h-9 px-4) · `lg` (h-12 px-8) · `icon` (size-11)

**Badge** — all `rounded-full`. Variants: `default`, `secondary`, `destructive`, `outline`, `info` (blue), `success` (green), `warning` (amber), `glass`

**Dialog** — `showCloseButton` prop (default true); overlay `bg-black/10 backdrop-blur-sm`; content glass-card style, `rounded-[1.75rem]`

**Sheet** — `side` prop: `"top" | "right" | "bottom" | "left"`

**Select** — `SelectTrigger` has `size` prop: `"sm" | "default"`

## Custom Components (Non-shadcn)

**`EmptyState`** — centered empty state with icon, title, description, optional action button. Animated entry (fade-in + zoom-in).

**`GradientCard`** — wraps Card with gradient background. `variant`: `"sunrise" | "ocean" | "berry"`. White text, hover scale-[1.02].

**`PageTransition`** — framer-motion wrapper; enter: `opacity 0→1, y 20→0`; exit: `opacity 1→0, y 0→-20`; 0.3s easeInOut.

**`LottieAnimation`** — dynamically imported `lottie-react` (SSR disabled). Props: `animationData`, `className`, `loop` (default true), `autoplay` (default true). Shows Skeleton while loading.

## Utility Functions (`lib/utils.ts`)

- `cn(...inputs)` — clsx + tailwind-merge for conditional class merging
- `formatStatus(status)` — `snake_case` → `Title Case`
