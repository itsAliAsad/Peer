# Coupling Analysis & Modularization

> See also: `api-crash-courses.md` for the primary target, `backend-infra.md` for notification insertion pattern.

## Cross-Module Dependency Matrix

| Module | Own Tables | Reads From (other domains) | Writes To (other domains) |
|--------|-----------|---------------------------|--------------------------|
| `users.ts` | users | universities, tutor_profiles | tutor_profiles (creates on onboarding) |
| `tickets.ts` | tickets | users, offers, university_courses, tutor_offerings, tutor_profiles | notifications |
| `offers.ts` | offers | tickets, users, tutor_profiles, tutor_offerings, university_courses | notifications, conversations |
| `messages.ts` | messages, conversations | users, offers | notifications |
| `crash_courses.ts` | crash_courses, enrollments, applications, votes | users, university_courses, tutor_profiles | notifications |
| `credentials.ts` | tutor_credentials | users | users (patches verificationTier), notifications |
| `admin.ts` | announcements | users, tickets, reports | users, audit_logs, reports |
| `tutor_offerings.ts` | tutor_offerings | users, university_courses | — |
| `tutor_profiles.ts` | tutor_profiles | users | — |
| `notifications.ts` | notifications | users | — |
| `reviews.ts` | reviews | tickets, offers, users | users (patches ratingSum/ratingCount/reputation) |
| `study_groups.ts` | study_groups | — | — |
| `portfolio.ts` | portfolio_items, courses | — | — |
| `reports.ts` | reports | — | — |
| `university_courses.ts` | university_courses | — | — |

## Current State

The main deep-module refactor is now in place:

- `crash_courses.ts` is a facade; logic moved into `crash_course_domain.ts`, `crash_course_enrollments.ts`, `crash_course_voting.ts`, `crash_course_read_models.ts`, and `crash_course_crons.ts`.
- Crash-course lifecycle guards and shared multi-table transitions now live in `crash_course_policy.ts` and `crash_course_workflows.ts`.
- Notification writes are centralized in `notification_service.ts`, with payload validators shared through `notification_types.ts`.
- Trust/derived-user writes are centralized in `trust.ts` (`reviews.ts`, `credentials.ts`, `admin.ts` now delegate there).
- Tickets now delegate writes/reads/recommendations to `ticket_workflows.ts`, `ticket_read_models.ts`, and `ticket_recommendations.ts`.
- Offers now delegate writes/reads/ranking to `offer_workflows.ts`, `offer_read_models.ts`, and `offer_ranking.ts`.
- Messages now delegate send/read orchestration to `message_workflows.ts`, read shaping to `conversation_read_models.ts`, and shared policy to `conversations.ts`.
- Tutor-profile bootstrap/lookup moved into `tutor_profile_service.ts`.

## Remaining Shallow Spots

**1. Admin remains broad** — `admin.ts` still owns several unrelated moderation/announcement concerns, even though audit and verification writes are now delegated.

**2. users.ts still mixes identity/bootstrap/profile concerns** — `store`, onboarding, and profile update paths are still grouped in one public module. This is acceptable for hardening now, but it is the next obvious split if user/account rules expand.

**3. Notification reads are still partially presentation-aware** — `notifications.ts` enriches sender data for `new_message`; more typed read models could move into a dedicated notifier/read-model layer later.

## Target Direction

Prefer small Convex entrypoints that delegate to:

- one workflow module per multi-table transition
- one shared service per cross-cutting concern
- one read-model module per query-heavy domain

That keeps the public surface shallow while hiding policy and synchronization inside deeper modules.
