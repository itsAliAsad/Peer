# API: messages · notifications

> See also: `schema.md` for conversations/messages/notifications table structure.

## messages.ts

> `messages.ts` is now a facade over `message_workflows.ts`, `conversation_read_models.ts`, and `conversations.ts`.

| Function | Type | Description |
|----------|------|-------------|
| `listConversations` | query | Conversation list read model from `conversation_read_models.ts` |
| `list` | query | Messages in a conversation (ascending order) |
| `send` | mutation | Thin facade over `message_workflows.ts`; validates, rate-limits, creates/loads conversation, updates denormalized state, and notifies |
| `markRead` | mutation | Thin facade over `message_workflows.ts` |
| `getConversation` | query | Conversation detail read model from `conversation_read_models.ts` |
| `getOrCreateConversation` | mutation | Facade over `conversations.ts`; requires an accepted offer between users |
| `canSendMessage` | query | Uses `conversations.ts` participant + accepted-offer policy helpers |
| `getUnreadMessagesFromUser` | query | Count of unread messages from a specific user |

## notifications.ts

| Function | Type | Description |
|----------|------|-------------|
| `list` | query | Paginated notifications for current user; enriches `new_message` with sender info |
| `markRead` | mutation | Mark single notification as read |
| `markAllRead` | mutation | Mark all notifications as read |
| `create` | internalMutation | Typed insert path; most writers should prefer `notification_service.ts` helpers |

## Notification Types

Notification payloads are schema-typed via `notification_types.ts`, and writes should go through `notification_service.ts`:

| type | Triggered by |
|------|-------------|
| `offer_received` | offers.create |
| `offer_accepted` | offers.accept |
| `ticket_resolved` | tickets.complete |
| `new_message` | messages.send |
| `credential_reviewed` | credentials.reviewCredential |
| `crash_course_confirmed` | crash_courses (multiple mutations) |
| `crash_course_cancelled` | crash_courses.cancel |
| `crash_course_selected` | crash_courses (voting close) |
| `crash_course_low_enrollment` | crash_courses (tutor review) |
| `crash_course_reminder` | crash_courses.sendReminders (cron) |
