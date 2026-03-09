# API: crash_courses

> `convex/crash_courses.ts` is now a stable Convex facade; most behavior lives in crash-course submodules.
> See also: `schema.md` for the 4 tables this domain manages, `coupling-analysis.md` for ownership notes.

## Lifecycle States

`requesting` → `voting` → `confirming` → `pending_tutor_review` → `confirmed` → `in_progress` → `completed` / `cancelled`

- **demand origin**: student creates, tutors apply, students vote, winner selected
- **supply origin**: tutor creates, students enroll directly

## Internal Module Map

| File | Responsibility |
|------|----------------|
| `crash_courses.ts` | Public Convex API surface only |
| `crash_course_policy.ts` | Pure lifecycle guards, confirmation outcomes, shared thresholds |
| `crash_course_workflows.ts` | Shared multi-table transitions: confirm, cancel, select tutor, reopen confirmation |
| `crash_course_domain.ts` | Create/start/complete/cancel/lock-in/tutor-review entry logic built on shared policy/workflows |
| `crash_course_enrollments.ts` | Enroll/withdraw/confirm/upcoming/enrollment queries; delegates confirmation side effects |
| `crash_course_voting.ts` | Apply/startVoting/vote/selectTutor/application queries; owns shared vote cleanup |
| `crash_course_read_models.ts` | `get`, `list`, `listMy`, `search` enrichment |
| `crash_course_crons.ts` | Auto-close voting, expire confirmations, reminders via shared policy/workflows |

## Mutations

| Function | Type | Description |
|----------|------|-------------|
| `create` | mutation | Create crash course (supply or demand origin) |
| `enroll` | mutation | Show interest / enroll in a crash course |
| `withdraw` | mutation | Withdraw; cleans up votes |
| `apply` | mutation | Tutor applies to teach a demand-side course |
| `startVoting` | mutation | Creator transitions demand course to voting phase |
| `vote` | mutation | Student votes for tutor application (one per course, can change) |
| `selectTutor` | mutation | Creator selects winning tutor; selection + confirmation opening flow is centralized in `crash_course_workflows.ts` |
| `confirmEnrollment` | mutation | Student confirms enrollment at announced price |
| `lockIn` | mutation | Creator/tutor manually locks in as confirmed using shared policy/workflow helpers |
| `start` | mutation | Transition confirmed course to in_progress |
| `complete` | mutation | Mark as completed |
| `cancel` | mutation | Cancel; notifies all enrolled students |
| `tutorReviewDecision` | mutation | Tutor accepts / renegotiates price / cancels after low enrollment via shared policy/workflows |

## Queries

| Function | Type | Description |
|----------|------|-------------|
| `get` | query | Single crash course with creator, course, tutor details |
| `list` | query | List with filters (origin, dept, category, exam type, status) |
| `listMy` | query | Crash courses user created or enrolled in |
| `getEnrollments` | query | Enrollments for a crash course |
| `getMyEnrollment` | query | Current user's enrollment status |
| `getApplications` | query | Tutor applications for a course |
| `getMyVote` | query | Current user's vote |
| `getUpcoming` | query | Upcoming confirmed/in_progress courses |
| `search` | query | Full-text search on titles |

## Internal Mutations (Cron)

| Function | Trigger | Description |
|----------|---------|-------------|
| `autoCloseVoting` | Every 30 min | Select top-voted tutor when voting deadline passes |
| `autoExpireConfirmations` | Every 30 min | Expire unconfirmed enrollments, then resolve outcome through `crash_course_policy.ts` |
| `sendReminders` | Every 30 min | Notify enrolled students/tutor 1 hour before session |
