# Backend Infrastructure

> See also: `schema.md` for shared tables, `coupling-analysis.md` for module ownership.

## Shared Modules

| File | Purpose |
|------|---------|
| `convex/utils.ts` | Stable public entry for `requireUser`, `requireAdmin`, `logAudit`, validation helpers, and rate limits |
| `convex/identity.ts` | Clerk identity resolution + optional/required current-user lookup |
| `convex/audit.ts` | Audit-log writes |
| `convex/notification_service.ts` | Typed notification creation, message notification upsert, crash-course fanout |
| `convex/notification_types.ts` | Shared notification validators used by `schema.ts` and `notifications.ts` |
| `convex/trust.ts` | Reputation math + verification-tier recomputation/manual set |
| `convex/conversations.ts` | Conversation lookup/creation + accepted-offer policy + participant helpers |
| `convex/tutor_profile_service.ts` | Shared tutor-profile lookup/ensure logic |

## Domain Helper Modules

| Domain | Files | Responsibility |
|--------|-------|----------------|
| Tickets | `ticket_workflows.ts`, `ticket_read_models.ts`, `ticket_recommendations.ts` | Ticket writes, enriched reads, tutor recommendation scoring |
| Offers | `offer_workflows.ts`, `offer_read_models.ts`, `offer_ranking.ts` | Offer writes, buyer/tutor views, ranking math |
| Messages | `message_workflows.ts`, `conversation_read_models.ts`, `conversations.ts` | Send/read orchestration, conversation shaping, membership policy |
| Crash courses | `crash_course_policy.ts`, `crash_course_workflows.ts` | Shared lifecycle guards, confirmation outcomes, multi-table transitions |

## utils.ts Exports

Every Convex handler should still call auth through `convex/utils.ts`.

| Export | Type | Description |
|--------|------|-------------|
| `requireUser(ctx, opts?)` | async fn | Required auth guard; delegates to `identity.ts` |
| `requireAdmin(ctx)` | async fn | Admin guard; delegates to `identity.ts` |
| `getCurrentUser(ctx, opts?)` | async fn | Optional current-user lookup for non-throwing queries |
| `logAudit(ctx, args)` | async fn | Audit write facade over `audit.ts` |
| `validateLength(...)` | fn | Shared string-length guard |
| `INPUT_LIMITS` | const | Shared max lengths for tickets, messages, bios, comments, reasons |
| `RATE_LIMITS` | const | Shared per-action rate limits |

## Rate Limits

| Key | Window | Max | Used by |
|-----|--------|-----|---------|
| `OFFER_CREATE` | 60s | 5 | `offers.create` |
| `MESSAGE_SEND` | 60s | 30 | `messages.send` |
| `TICKET_CREATE` | 300s | 10 | `tickets.create` |
| `REPORT_CREATE` | 3600s | 5 | `reports.create` |

## Cron Jobs (`convex/crons.ts`)

| Job | Interval | Handler | Description |
|-----|----------|---------|-------------|
| `check-idle-tutors` | 10 min | `tutor_profiles.checkIdleTutors` | Mark tutors offline after 10 min inactivity |
| `auto-close-crash-course-voting` | 30 min | `crash_courses.autoCloseVoting` | Facade over `crash_course_crons.ts` |
| `auto-expire-crash-course-confirmations` | 30 min | `crash_courses.autoExpireConfirmations` | Facade over `crash_course_crons.ts` |
| `crash-course-reminders` | 30 min | `crash_courses.sendReminders` | Facade over `crash_course_crons.ts` |
