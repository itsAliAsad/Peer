# API: users · tickets · offers

> See also: `schema.md` for table structure, `backend-infra.md` for auth helpers used by all modules.

## users.ts

| Function | Type | Description |
|----------|------|-------------|
| `store` | mutation | Upsert user from Clerk identity on login |
| `currentUser` | query | Authenticated user with computed fields (universityName, isAdmin, isBanned) |
| `update` | mutation | Update profile fields (bio, avatar, links, theme, preferences) |
| `get` | query | Public profile by user ID |
| `setRole` | mutation | Switch role between student/tutor |
| `completeOnboarding` | mutation | Set role, bio, university; delegates tutor profile bootstrap to `tutor_profile_service.ts` |
| `acceptTerms` | mutation | Record terms acceptance timestamp |
| `updateTutorPresence` | mutation | Toggle tutor online/offline status |
| `updateTutorSettings` | mutation | Update tutor settings (help types, rates, accepting status) |

## tickets.ts

> `tickets.ts` is now a facade over `ticket_workflows.ts`, `ticket_read_models.ts`, and `ticket_recommendations.ts`.

| Function | Type | Description |
|----------|------|-------------|
| `create` | mutation | Thin facade over `ticket_workflows.ts`; validates/rate-limits and inserts through one workflow |
| `listMyRequests` | query | Thin facade over `ticket_read_models.ts` |
| `listMyTickets` | query | Alias for listMyRequests |
| `listOpen` | query | Open tickets with university/department/helpType filters via `ticket_read_models.ts` |
| `get` | query | Single ticket with enriched student details via `ticket_read_models.ts` |
| `complete` | mutation | Thin facade over `ticket_workflows.ts`; resolves and notifies from one place |
| `search` | query | Full-text search on ticket titles via `ticket_read_models.ts` |
| `listByDepartment` | query | Open tickets by department |
| `getHistoryWithTutor` | query | Ticket history between student and specific tutor |
| `matchingRecentJobs` | query | Scored/ranked tutor recommendations via `ticket_recommendations.ts` |
| `getRecommendedJobs` | query | Alias for matchingRecentJobs |
| `getPublicStats` | query | Aggregate stats (open tickets, resolved, active tutors) — no auth |

## offers.ts

> `offers.ts` is now a facade over `offer_workflows.ts`, `offer_read_models.ts`, and `offer_ranking.ts`.

| Function | Type | Description |
|----------|------|-------------|
| `create` | mutation | Thin facade over `offer_workflows.ts`; validates/rate-limits and inserts through one workflow |
| `listByTicket` | query | Offers for a ticket via `offer_read_models.ts`, ranked by `offer_ranking.ts` |
| `listByRequest` | query | Legacy alias that now delegates to the same visibility/read-model path as `listByTicket` |
| `accept` | mutation | Thin facade over `offer_workflows.ts`; accepts offer, rejects siblings, ensures conversation, notifies tutor |
| `listMyOffers` | query | Tutor-facing read model from `offer_read_models.ts` |
| `listBetweenUsers` | query | Shared read model for bilateral offer history |
| `listOffersForBuyer` | query | Buyer-facing read model from `offer_read_models.ts` |
