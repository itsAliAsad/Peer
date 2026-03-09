# Routes

> See also: `frontend-core.md` for provider/role context that affects every page.

## Route Map

| Route | Description | Key Components / Convex APIs |
|-------|-------------|------------------------------|
| `/` | Redirects → `/dashboard/buyer` | Server redirect, no client code |
| `/dashboard/buyer` | Student dashboard: requests, offers, crash courses | `dashboard/{SpendingChart,OffersSection,ProfileCompletenessCard}`, `chat/MessageButton` · `api.users.currentUser`, `api.tickets.listMyRequests`, `api.offers.listOffersForBuyer`, `api.crash_courses.getUpcoming` |
| `/dashboard/seller` | Tutor dashboard: jobs, bids, earnings | `dashboard/{EarningsChart,BidCard,ProfileCompletenessCard}` · `api.users.currentUser`, `api.tutor_profiles.getMyProfile`, `api.tickets.{listOpen,matchingRecentJobs}`, `api.offers.listMyOffers`, `api.crash_courses.getUpcoming`, `api.credentials.listMyCredentials` |
| `/requests/new` | Create help request (ticket) | `CourseSelector` · `api.tickets.create`, `api.users.currentUser` |
| `/requests/[id]` | Ticket detail: offers, accept, review | `trust/{ReportDialog,VerifiedBadge}`, `chat/MessageButton`, `reviews/StarRating` · `api.tickets.get`, `api.offers.{listByTicket,accept,create}`, `api.tickets.complete`, `api.reviews.create` |
| `/crash-courses` | Browse/filter crash courses | `crash-courses/CrashCourseCard` · `api.crash_courses.{list,listMy}` |
| `/crash-courses/new` | Create crash course | `CourseSelector` · `api.crash_courses.create` |
| `/crash-courses/[id]` | Crash course detail: enroll, vote, apply, manage | `crash-courses/{VotingSection,EnrollmentBar}` · 12 mutations/queries from `api.crash_courses.*` |
| `/messages` | Messaging interface | `chat/{ConversationList,ChatWindow}` |
| `/search` | Search open tickets | `api.tickets.{search,listOpen}`, `api.users.currentUser` |
| `/opportunities` | Tutor job board: browse tickets, submit offers | `search/{SearchBar,Filters}` · `api.tickets.{search,listOpen}`, `api.offers.create` |
| `/profile` | Edit own profile, portfolio, credentials | `portfolio/{PortfolioSection,CoursesSection}` · `api.users.{currentUser,update}`, `api.tutor_offerings.*`, `api.credentials.*` |
| `/profile/[id]` | Public profile view | `portfolio/{PortfolioSection,CoursesSection}`, `profile/{ExpertiseSection,EditProfileDialog}`, `trust/{VerifiedBadge,ReportDialog}` · `api.users.{get,currentUser}` |
| `/onboarding` | Multi-step onboarding wizard | `onboarding/OnboardingWizard` · `api.users.completeOnboarding`, `api.credentials.{submitCredential,generateUploadUrl}`, `api.universities.search`, `api.university_courses.search` |
| `/settings` | Profile, tutor settings, offerings | `CourseSelector` · `api.users.*`, `api.tutor_profiles.*`, `api.tutor_offerings.*` |
| `/admin` | Admin panel: stats, users, reports, announcements | `admin/{AdminGuard,ReportsTable,UserManagement,VerificationsQueue}` · `api.admin.*` |
| `/study-groups` | Browse/create study groups | `study-groups/StudyGroupCard`, `CourseSelector` · `api.study_groups.*` |
| `/courses` | Browse university courses | `api.university_courses.getAll` |
| `/teach` | Tutor landing/info page | `api.tickets.getPublicStats` |
