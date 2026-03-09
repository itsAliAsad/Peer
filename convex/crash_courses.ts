import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import {
    cancelCrashCourse,
    completeCrashCourse,
    createCrashCourse,
    lockInCrashCourse,
    startCrashCourse,
    tutorReviewCrashCourseDecision,
} from "./crash_course_domain";
import {
    autoCloseCrashCourseVoting,
    autoExpireCrashCourseConfirmations,
    sendCrashCourseReminders,
} from "./crash_course_crons";
import {
    confirmCrashCourseEnrollment,
    enrollInCrashCourse,
    getCrashCourseEnrollments,
    getMyCrashCourseEnrollment,
    getUpcomingCrashCourses,
    withdrawFromCrashCourse,
} from "./crash_course_enrollments";
import {
    getCrashCourseReadModel,
    listCrashCourseReadModels,
    listMyCrashCourseReadModels,
    searchCrashCourseReadModels,
} from "./crash_course_read_models";
import {
    applyToCrashCourse,
    getCrashCourseApplications,
    getMyCrashCourseVote,
    selectCrashCourseTutor,
    startCrashCourseVoting,
    voteForCrashCourseApplication,
} from "./crash_course_voting";
import { requireUser } from "./utils";

// ==========================================
// MUTATIONS
// ==========================================

/**
 * Create a crash course.
 * - Supply (tutor): requires price, scheduledAt, duration. Status → "open".
 * - Demand (student): only preferences. Status → "requesting".
 */
export const create = mutation({
    args: {
        origin: v.union(v.literal("demand"), v.literal("supply")),
        courseId: v.optional(v.id("university_courses")),
        category: v.optional(v.union(
            v.literal("o_levels"),
            v.literal("a_levels"),
            v.literal("sat"),
            v.literal("ib"),
            v.literal("ap"),
            v.literal("general"),
        )),
        customSubject: v.optional(v.string()), // free text for non-university topics
        universityId: v.optional(v.id("universities")),
        title: v.string(),
        description: v.string(),
        topics: v.array(v.string()),
        examType: v.union(
            v.literal("quiz"),
            v.literal("midterm"),
            v.literal("final"),
            v.literal("other")
        ),
        maxEnrollment: v.optional(v.number()), // supply: required; demand: omitted (tutor sets it)
        // Supply-only (required for supply)
        pricePerStudent: v.optional(v.number()),
        scheduledAt: v.optional(v.number()),
        duration: v.optional(v.number()),
        location: v.optional(v.string()),
        minEnrollment: v.optional(v.number()), // supply-only (tutor sets this)
        // Demand-only (preferences)
        preferredDateRange: v.optional(v.string()),
        preferredDuration: v.optional(v.number()),
        budgetPerStudent: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await createCrashCourse(ctx, { ...args, user });
    },
});

/**
 * Enroll in a crash course.
 * - Supply: status → "enrolled"
 * - Demand (requesting/voting): status → "interested"
 */
export const enroll = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await enrollInCrashCourse(ctx, { crashCourseId: args.crashCourseId, user });
    },
});

/**
 * Withdraw from a crash course.
 */
export const withdraw = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await withdrawFromCrashCourse(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Tutor applies to teach a demand-side crash course.
 */
export const apply = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
        pitch: v.string(),
        proposedPrice: v.number(),
        proposedDate: v.number(),
        proposedDuration: v.number(),
        proposedLocation: v.optional(v.string()),
        topicsCovered: v.array(v.string()),
        proposedMinEnrollment: v.optional(v.number()),
        proposedMaxEnrollment: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await applyToCrashCourse(ctx, { ...args, user });
    },
});

/**
 * Start voting phase on a demand-side crash course.
 */
export const startVoting = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
        votingDeadlineHours: v.optional(v.number()), // hours from now, default 48
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await startCrashCourseVoting(ctx, {
            crashCourseId: args.crashCourseId,
            creatorId: user._id,
            votingDeadlineHours: args.votingDeadlineHours,
        });
    },
});

/**
 * Vote for a tutor application. One vote per student per crash course.
 * Can change vote.
 */
export const vote = mutation({
    args: {
        applicationId: v.id("crash_course_applications"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await voteForCrashCourseApplication(ctx, {
            applicationId: args.applicationId,
            userId: user._id,
        });
    },
});

/**
 * Select a tutor (creator picks or auto from top vote).
 * Moves to "confirming" phase. Copies quote to crash course.
 */
export const selectTutor = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
        applicationId: v.id("crash_course_applications"),
        confirmationDeadlineHours: v.optional(v.number()), // default 48
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await selectCrashCourseTutor(ctx, {
            crashCourseId: args.crashCourseId,
            applicationId: args.applicationId,
            creatorId: user._id,
            confirmationDeadlineHours: args.confirmationDeadlineHours,
        });
    },
});

/**
 * Confirm enrollment after tutor selection (demand-side).
 * Student commits at the announced price.
 */
export const confirmEnrollment = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await confirmCrashCourseEnrollment(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Creator or tutor manually locks in a confirming crash course as confirmed.
 * For demand-side courses, warns if confirmed count is below minEnrollment.
 */
export const lockIn = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
        forceLockin: v.optional(v.boolean()), // acknowledge low enrollment
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await lockInCrashCourse(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
            forceLockin: args.forceLockin,
        });
    },
});

/**
 * Start the crash course session.
 */
export const start = mutation({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await startCrashCourse(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Complete the crash course.
 */
export const complete = mutation({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await completeCrashCourse(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Cancel the crash course.
 */
export const cancel = mutation({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await cancelCrashCourse(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Tutor reviews a demand-side crash course after the confirmation deadline
 * when too few students confirmed (status: "pending_tutor_review").
 *
 * Decisions:
 *  - "accept"       → proceed to "confirmed" at the current price.
 *  - "renegotiate"  → set a new pricePerStudent, move enrolled students back to
 *                     pending_confirmation, and reopen a 24-hour confirmation window.
 *  - "cancel"       → cancel without penalty.
 */
export const tutorReviewDecision = mutation({
    args: {
        crashCourseId: v.id("crash_courses"),
        decision: v.union(v.literal("accept"), v.literal("renegotiate"), v.literal("cancel")),
        newPrice: v.optional(v.number()), // required when decision === "renegotiate"
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await tutorReviewCrashCourseDecision(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
            decision: args.decision,
            newPrice: args.newPrice,
        });
    },
});

// ==========================================
// QUERIES
// ==========================================

/**
 * Get a single crash course with enriched details.
 */
export const get = query({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        return await getCrashCourseReadModel(ctx, args.crashCourseId);
    },
});

/**
 * List crash courses with optional filters.
 */
export const list = query({
    args: {
        origin: v.optional(v.union(v.literal("demand"), v.literal("supply"))),
        department: v.optional(v.string()),
        category: v.optional(v.union(
            v.literal("o_levels"),
            v.literal("a_levels"),
            v.literal("sat"),
            v.literal("ib"),
            v.literal("ap"),
            v.literal("general"),
        )),
        examType: v.optional(v.union(
            v.literal("quiz"),
            v.literal("midterm"),
            v.literal("final"),
            v.literal("other")
        )),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await listCrashCourseReadModels(ctx, args);
    },
});

/**
 * List crash courses the current user is involved in (created or enrolled).
 */
export const listMy = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx, { allowBanned: true });
        return await listMyCrashCourseReadModels(ctx, user._id);
    },
});

/**
 * Get enrollments for a crash course.
 */
export const getEnrollments = query({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        return await getCrashCourseEnrollments(ctx, args.crashCourseId);
    },
});

/**
 * Get my enrollment status for a crash course.
 */
export const getMyEnrollment = query({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, { allowBanned: true });
        return await getMyCrashCourseEnrollment(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Get applications for a crash course with enriched tutor info, sorted by voteCount.
 */
export const getApplications = query({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        return await getCrashCourseApplications(ctx, args.crashCourseId);
    },
});

/**
 * Get current user's vote for a crash course.
 */
export const getMyVote = query({
    args: { crashCourseId: v.id("crash_courses") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, { allowBanned: true });
        return await getMyCrashCourseVote(ctx, {
            crashCourseId: args.crashCourseId,
            userId: user._id,
        });
    },
});

/**
 * Get upcoming confirmed crash courses for the current user (for dashboard widgets).
 */
export const getUpcoming = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx, { allowBanned: true });
        return await getUpcomingCrashCourses(ctx, user._id);
    },
});

/**
 * Search crash courses by title.
 */
export const search = query({
    args: {
        query: v.string(),
        department: v.optional(v.string()),
        examType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await searchCrashCourseReadModels(ctx, args);
    },
});

// ==========================================
// INTERNAL MUTATIONS (for cron jobs)
// ==========================================

/**
 * Auto-close voting when deadline passes. Select top-voted tutor.
 */
export const autoCloseVoting = internalMutation({
    args: {},
    handler: async (ctx) => {
        await autoCloseCrashCourseVoting(ctx);
    },
});

/**
 * Auto-expire confirmations when deadline passes.
 * If too few students confirmed relative to minEnrollment (or < 50% of
 * interested when no minEnrollment is set), the crash course transitions
 * to "pending_tutor_review" so the tutor can accept, renegotiate, or cancel.
 */
export const autoExpireConfirmations = internalMutation({
    args: {},
    handler: async (ctx) => {
        await autoExpireCrashCourseConfirmations(ctx);
    },
});

/**
 * Send reminders for upcoming crash courses (within 1 hour).
 */
export const sendReminders = internalMutation({
    args: {},
    handler: async (ctx) => {
        await sendCrashCourseReminders(ctx);
    },
});
