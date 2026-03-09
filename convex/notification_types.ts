import { v } from "convex/values";

export const offerReceivedDataValidator = v.object({
    ticketId: v.id("tickets"),
    offerId: v.id("offers"),
});

export const offerAcceptedDataValidator = v.object({
    ticketId: v.id("tickets"),
    offerId: v.id("offers"),
});

export const ticketResolvedDataValidator = v.object({
    ticketId: v.id("tickets"),
});

export const newMessageDataValidator = v.object({
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    senderId: v.id("users"),
    count: v.number(),
    lastMessageId: v.optional(v.id("messages")),
});

export const credentialReviewedDataValidator = v.object({
    credentialId: v.id("tutor_credentials"),
    credentialType: v.string(),
    decision: v.union(
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("needs_resubmit")
    ),
    reason: v.optional(v.string()),
});

export const crashCourseApplicationDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
    tutorId: v.id("users"),
    tutorName: v.string(),
});

export const crashCourseVoteOpenDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
});

export const crashCourseSelectedDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
});

export const crashCourseConfirmedDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
    price: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
});

export const crashCourseReminderDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
    scheduledAt: v.number(),
});

export const crashCourseCancelledDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
    message: v.optional(v.string()),
});

export const crashCourseLowEnrollmentDataValidator = v.object({
    crashCourseId: v.id("crash_courses"),
    title: v.string(),
    oldPrice: v.optional(v.number()),
    newPrice: v.optional(v.number()),
    confirmedCount: v.optional(v.number()),
    minEnrollment: v.optional(v.number()),
    message: v.string(),
});

export const notificationTypeValidator = v.union(
    v.literal("offer_received"),
    v.literal("offer_accepted"),
    v.literal("ticket_resolved"),
    v.literal("request_completed"),
    v.literal("new_message"),
    v.literal("credential_reviewed"),
    v.literal("crash_course_application"),
    v.literal("crash_course_vote_open"),
    v.literal("crash_course_selected"),
    v.literal("crash_course_confirmed"),
    v.literal("crash_course_reminder"),
    v.literal("crash_course_cancelled"),
    v.literal("crash_course_low_enrollment")
);

export const notificationDataValidator = v.union(
    offerReceivedDataValidator,
    offerAcceptedDataValidator,
    ticketResolvedDataValidator,
    newMessageDataValidator,
    credentialReviewedDataValidator,
    crashCourseApplicationDataValidator,
    crashCourseVoteOpenDataValidator,
    crashCourseSelectedDataValidator,
    crashCourseConfirmedDataValidator,
    crashCourseReminderDataValidator,
    crashCourseCancelledDataValidator,
    crashCourseLowEnrollmentDataValidator
);
