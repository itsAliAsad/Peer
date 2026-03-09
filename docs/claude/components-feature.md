# Feature Components

> See also: `frontend-core.md` for provider/role context, `routes.md` for which page uses which components.

## Layout (`components/layout/`)

| Component | Responsibility | Convex | Cross-group |
|-----------|---------------|--------|-------------|
| `Navbar` | Top nav: links, auth, notifications, search | `api.users.currentUser`, `api.messages.listConversations` | `notifications/NotificationDropdown`, `search/CommandSearch`, `layout/RoleSwitcher` |
| `RoleSwitcher` | Toggle student↔tutor role | — (uses `useRole()`) | — |
| `BannedBanner` | Warning banner if user banned | `api.users.currentUser` | — |
| `AnnouncementsBar` | Dismissable admin announcements | `api.admin.getAnnouncements` | — |

## Chat (`components/chat/`)

| Component | Responsibility | Convex | Cross-group |
|-----------|---------------|--------|-------------|
| `ConversationList` | Sidebar list of conversations | `api.messages.listConversations`, `api.users.currentUser` | `trust/VerifiedBadge` |
| `ChatWindow` | Message thread + send input | `api.messages.{list,getConversation,send,markRead,canSendMessage}`, `api.users.currentUser` | `trust/{ReportDialog,VerifiedBadge}` |
| `DealSidebar` | Sheet: offers between two users | `api.offers.listBetweenUsers`, `api.messages.getUnreadMessagesFromUser` | — |
| `MessageButton` | Button to open/create conversation | `api.messages.getOrCreateConversation` | — |
| `TicketHistorySection` | Ticket history between student+tutor | `api.tickets.getHistoryWithTutor` | — |

## Admin (`components/admin/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `AdminGuard` | Renders children only if `user.role === "admin"` | `api.users.currentUser` |
| `ReportsTable` | Reports list with resolve/dismiss | `api.admin.getReports`, `api.reports.resolve` |
| `UserManagement` | Users list: ban, verify, admin toggle | `api.admin.{listUsers,banUser,setVerification,setAdmin}`, `api.users.currentUser` |
| `VerificationsQueue` | Review pending tutor credentials | `api.credentials.{listPendingForReview,reviewCredential}` |

## Trust (`components/trust/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `VerifiedBadge` | Verification tier badge + tooltip | — (props only) |
| `VerificationBadge` | Alternative verification badge style | — (props only) |
| `ReportDialog` | Report a user dialog | `api.reports.create` |
| `CredentialsDisplay` | Approved credentials on profile | `api.credentials.getPublicCredentials` |
| `TermsModal` | Terms acceptance modal (shown if no `termsAcceptedAt`) | `api.users.{currentUser,acceptTerms}` |

## Dashboard (`components/dashboard/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `BidCard` | Tutor's offer/bid card | — (props only) |
| `EarningsChart` | Recharts earnings chart (tutor) | — (props only) |
| `SpendingChart` | Recharts spending chart (student) | — (props only) |
| `OffersSection` | Offers received on student's tickets | — (props only) |
| `ProfileCompletenessCard` | Gamified profile completeness | `api.profile_completeness.{getTutorCompleteness,getStudentCompleteness}` |

## Auth, Onboarding, Notifications (`components/{auth,onboarding,notifications}/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `auth/UserSync` | Syncs Clerk user to Convex on auth change | `api.users.store` |
| `onboarding/OnboardingWizard` | Multi-step: role, university, bio, credentials | `api.users.completeOnboarding`, `api.credentials.{submitCredential,generateUploadUrl}`, `api.universities.search`, `api.university_courses.search` |
| `notifications/NotificationDropdown` | Paginated notifications dropdown; routes request/message/crash-course notifications and credential reviews to `/profile` | `api.notifications.{list,markRead,markAllRead}` (paginated) |

## Profile & Portfolio (`components/{profile,portfolio}/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `profile/EditProfileDialog` | Edit user profile fields dialog | `api.users.update` |
| `profile/ExpertiseSection` | Tutor offerings (courses they teach) | `api.tutor_offerings.{listByTutor,add,remove}` |
| `portfolio/PortfolioSection` | CRUD portfolio items | `api.portfolio.{getPortfolioItems,addPortfolioItem}` |
| `portfolio/CoursesSection` | CRUD course listings | `api.portfolio.{getCourses,addCourse}` |

## Other Feature Components

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `crash-courses/CrashCourseCard` | Course listing card | — (props only) |
| `crash-courses/EnrollmentBar` | Enrollment progress bar | — (props only) |
| `crash-courses/VotingSection` | Tutor application voting | `api.crash_courses.{getApplications,getMyVote,vote}` |
| `crash-courses/ApplicationCard` | Single tutor application card | — (props only) |
| `study-groups/StudyGroupCard` | Study group card + join/leave | `api.study_groups.{join,leave}`, `api.users.currentUser` |
| `reviews/StarRating` | Star rating input | — (props only) |
| `search/SearchBar` | Text search input | — (props only, callback) |
| `search/Filters` | Filter dropdowns | — (props only, callback) |
| `search/CommandSearch` | Cmd+K command palette | — (cmdk, props only) |

## Standalone (`components/` root + `app/components/`)

| Component | Responsibility | Convex |
|-----------|---------------|--------|
| `CourseSelector` | Searchable course combobox | `api.university_courses.search` |
| `TutorStatusToggle` | Online/offline toggle + settings | `api.tutor_profiles.getMyProfile`, `api.users.{updateTutorPresence,updateTutorSettings}` |
| `app/components/OnlinePresence` | Heartbeat every 4 min (keeps tutor online) | `api.tutor_profiles.updateOnlineStatus` |
