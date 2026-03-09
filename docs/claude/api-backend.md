# API: credentials · admin · tutor_profiles · tutor_offerings · reviews · study_groups · portfolio · reports · university_courses

> See also: `schema.md` for table structure, `backend-infra.md` for shared services.

## credentials.ts

| Function | Type | Description |
|----------|------|-------------|
| `generateUploadUrl` | mutation | Generate Convex Storage upload URL |
| `submitCredential` | mutation | Submit credential row (structured data + optional document) |
| `uploadDocumentForCredential` | mutation | Attach document to existing unsubmitted credential |
| `deleteCredential` | mutation | Delete own pending/unsubmitted credential |
| `listMyCredentials` | query | All credentials for authenticated tutor; uses optional current-user lookup |
| `getPublicCredentials` | query | Approved + visible credentials for a user profile |
| `listPendingForReview` | query | Admin: pending credentials with tutor info |
| `reviewCredential` | mutation | Admin review; delegates verification recompute to `trust.ts` and sends `credential_reviewed` notification |
| `recalculateVerificationTier` | internalMutation | Thin facade over `trust.ts` recomputation |

## admin.ts · tutor_profiles.ts · tutor_offerings.ts

| Module | Function | Type | Description |
|--------|----------|------|-------------|
| admin | `setVerification` | mutation | Delegates verification-tier ownership to `trust.ts`; audit still flows through `utils.ts` |
| tutor_profiles | `getMyProfile` | query | Uses shared current-user lookup |
| tutor_profiles | `updateProfile` | mutation | Updates profile; missing profiles are created through `tutor_profile_service.ts` |
| tutor_profiles | `updateOnlineStatus` | mutation | Set online/away/offline; updates `acceptingRequests` |
| tutor_profiles | `checkIdleTutors` | internalMutation | Cron: mark tutors offline after 10 min inactivity |
| tutor_offerings | `listMyOfferings` | query | Uses optional current-user lookup |

## reviews · study_groups · portfolio · reports · university_courses

| Module | Function | Type | Description |
|--------|----------|------|-------------|
| reviews | `create` | mutation | Create review; delegates rating/reputation update to `trust.ts` |
| study_groups | `create/join/leave/listByCourse` | mixed | Study-group lifecycle |
| portfolio | `addPortfolioItem/getPortfolioItems/addCourse/getCourses` | mixed | Portfolio + course listings |
| reports | `create/list/resolve` | mixed | Reporting workflow |
| university_courses | `seed/search/getAll` | mixed | Course seed + lookup |
