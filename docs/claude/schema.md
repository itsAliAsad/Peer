# Database Schema

> See also: `backend-infra.md` for auth helpers, `coupling-analysis.md` for cross-table dependencies.

## University Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `universities` | name, shortName, city, isActive | — | searchIndex: name |
| `university_courses` | code, name, department, isActive | universityId → universities | searchIndex: code; by_university |

## User / Identity Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `users` | name, email, tokenIdentifier, role, verificationTier, reputation, ratingSum, ratingCount, bio, universityId, teachingScope, bannedAt, banReason, onboardingCompletedAt, termsAcceptedAt, deletedAt | universityId → universities; verifiedBy → users | by_token |
| `tutor_profiles` | userId, bio, isOnline, lastActiveAt, creditBalance, settings{acceptingRequests, acceptingPaid, acceptingFree, minRate, allowedHelpTypes} | userId → users | by_user |
| `tutor_credentials` | tutorId, credentialType, status, storageId, reviewedBy, isPubliclyVisible, uploadedAt | tutorId → users; universityId → universities; reviewedBy → users; storageId → _storage | by_tutor; by_status; by_tutor_and_type |

## Tutor Offerings Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `tutor_offerings` | tutorId, courseId, customSubject, category, level | tutorId → users; courseId → university_courses; universityId → universities | by_tutor; by_course; by_tutor_and_category |

## Ticket Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `tickets` | studentId, courseId, customCategory, department, universityId, title, description, budget, deadline, status, urgency, helpType, assignedTutorId, createdAt, deletedAt | studentId → users; courseId → university_courses; universityId → universities; assignedTutorId → users | by_status; by_course; by_student; by_department; by_university; searchIndex: title |
| `offers` | ticketId, studentId, tutorId, price, status, deletedAt | ticketId → tickets; studentId → users; tutorId → users | by_ticket; by_tutor; by_ticket_and_tutor; by_student_and_tutor |

## Crash Course Domain (4 tables — all managed in `convex/crash_courses.ts`)

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `crash_courses` | creatorId, origin(demand/supply), courseId, category, title, description, topics[], examType, scheduledAt, duration, pricePerStudent, maxEnrollment, currentEnrollment, selectedTutorId, votingDeadline, confirmationDeadline, status, createdAt, deletedAt | creatorId → users; courseId → university_courses; universityId → universities; selectedTutorId → users | by_status; by_course; by_department; by_category; by_creator; by_tutor; searchIndex: title |
| `crash_course_enrollments` | crashCourseId, studentId, status(interested/pending_confirmation/enrolled/withdrawn), createdAt | crashCourseId → crash_courses; studentId → users | by_crash_course; by_student; by_crash_course_and_student |
| `crash_course_applications` | crashCourseId, tutorId, pitch, proposedPrice, proposedDate, proposedDuration, topicsCovered[], voteCount, status | crashCourseId → crash_courses; tutorId → users | by_crash_course; by_tutor; by_crash_course_and_tutor |
| `crash_course_votes` | applicationId, crashCourseId, studentId, createdAt | applicationId → crash_course_applications; crashCourseId → crash_courses; studentId → users | by_application; by_crash_course_and_student |

## Messaging Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `conversations` | participant1, participant2, lastMessageId, updatedAt | participant1 → users; participant2 → users; lastMessageId → messages | by_participant1; by_participant2; by_updated |
| `messages` | conversationId, senderId, content, type(text/image/file), metadata, isRead, createdAt | conversationId → conversations; senderId → users | by_conversation; by_conversation_and_created |

## Reviews & Trust Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `reviews` | reviewerId, revieweeId, ticketId, crashCourseId, rating, comment, type, createdAt | reviewerId → users; revieweeId → users; ticketId → tickets; crashCourseId → crash_courses | by_reviewee |
| `reports` | reporterId, targetId, ticketId, reason, description, status, createdAt | reporterId → users; targetId → users; ticketId → tickets | by_status; by_target |

## Portfolio Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `portfolio_items` | userId, title, description, imageUrl, link, createdAt | userId → users | by_user |
| `courses` | userId, title, description, price, imageUrl, createdAt | userId → users | by_user |

## Study Groups Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `study_groups` | hostId, courseId, title, maxMembers, currentMembers, status, createdAt | hostId → users; courseId → university_courses | by_course |

## Platform / Admin Domain

| Table | Key Fields | References | Indexes |
|-------|-----------|------------|---------|
| `notifications` | userId, type, data(any), isRead, createdAt | userId → users | by_user; by_user_and_read |
| `announcements` | title, content, isActive, createdAt | — | by_active |
| `audit_logs` | actorId, action, targetId, targetType, details, createdAt | actorId → users; targetId → users | by_actor; by_action |
