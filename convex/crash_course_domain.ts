import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
    assertCanCancelCourse,
    assertCanCompleteCourse,
    assertCanLockIn,
    assertCanStartCourse,
} from "./crash_course_policy";
import {
    cancelCrashCourseWorkflow,
    confirmCrashCourseWorkflow,
    reopenConfirmationAfterRenegotiationWorkflow,
} from "./crash_course_workflows";
import { INPUT_LIMITS, validateLength } from "./utils";
const CRASH_COURSE_RATE_LIMIT = { windowMs: 300_000, maxRequests: 5 };

export async function createCrashCourse(
    ctx: MutationCtx,
    args: {
        origin: "demand" | "supply";
        courseId?: Id<"university_courses">;
        category?: "o_levels" | "a_levels" | "sat" | "ib" | "ap" | "general";
        customSubject?: string;
        universityId?: Id<"universities">;
        title: string;
        description: string;
        topics: string[];
        examType: "quiz" | "midterm" | "final" | "other";
        maxEnrollment?: number;
        pricePerStudent?: number;
        scheduledAt?: number;
        duration?: number;
        location?: string;
        minEnrollment?: number;
        preferredDateRange?: string;
        preferredDuration?: number;
        budgetPerStudent?: number;
        user: Doc<"users">;
    }
) {
    validateLength(args.title, INPUT_LIMITS.TITLE_MAX, "Title");
    validateLength(args.description, INPUT_LIMITS.DESCRIPTION_MAX, "Description");
    if (args.topics.length === 0) {
        throw new Error("At least one topic is required");
    }
    if (args.topics.length > 20) {
        throw new Error("Maximum 20 topics allowed");
    }
    for (const topic of args.topics) {
        validateLength(topic, 100, "Topic");
    }
    if (args.origin === "supply") {
        if (!args.maxEnrollment || args.maxEnrollment < 2 || args.maxEnrollment > 200) {
            throw new Error("Max enrollment must be between 2 and 200");
        }
    }

    const recentCourses = await ctx.db
        .query("crash_courses")
        .withIndex("by_creator", (q) => q.eq("creatorId", args.user._id))
        .filter((q) => q.gt(q.field("_creationTime"), Date.now() - CRASH_COURSE_RATE_LIMIT.windowMs))
        .collect();
    if (recentCourses.length >= CRASH_COURSE_RATE_LIMIT.maxRequests) {
        throw new Error("Rate limited: Too many crash courses created. Please wait.");
    }

    if (!args.courseId && !args.category) {
        throw new Error("Either courseId or category must be provided");
    }

    const course = args.courseId ? await ctx.db.get(args.courseId) : null;
    if (args.courseId && (!course || !course.isActive)) {
        throw new Error("Course not found or inactive");
    }

    if (args.origin === "supply") {
        if (!args.pricePerStudent || args.pricePerStudent <= 0) {
            throw new Error("Price per student is required and must be positive");
        }
        if (args.pricePerStudent > 1_000_000) {
            throw new Error("Price exceeds maximum allowed");
        }
        if (!args.scheduledAt) {
            throw new Error("Scheduled date & time is required");
        }
        if (args.scheduledAt <= Date.now()) {
            throw new Error("Scheduled date must be in the future");
        }
        if (!args.duration || args.duration <= 0) {
            throw new Error("Duration is required and must be positive");
        }
        if (args.duration > 480) {
            throw new Error("Duration cannot exceed 8 hours");
        }

        return await ctx.db.insert("crash_courses", {
            creatorId: args.user._id,
            origin: "supply",
            courseId: args.courseId,
            category: args.category,
            customSubject: args.customSubject,
            universityId: args.universityId,
            department: course?.department,
            title: args.title,
            description: args.description,
            topics: args.topics,
            examType: args.examType,
            scheduledAt: args.scheduledAt,
            duration: args.duration,
            location: args.location,
            pricePerStudent: args.pricePerStudent,
            maxEnrollment: args.maxEnrollment ?? 30,
            minEnrollment: args.minEnrollment,
            currentEnrollment: 0,
            selectedTutorId: args.user._id,
            status: "open",
            createdAt: Date.now(),
        });
    }

    if (args.budgetPerStudent !== undefined && args.budgetPerStudent < 0) {
        throw new Error("Budget must be non-negative");
    }

    const crashCourseId = await ctx.db.insert("crash_courses", {
        creatorId: args.user._id,
        origin: "demand",
        courseId: args.courseId,
        category: args.category,
        customSubject: args.customSubject,
        universityId: args.universityId,
        department: course?.department,
        title: args.title,
        description: args.description,
        topics: args.topics,
        examType: args.examType,
        preferredDateRange: args.preferredDateRange,
        preferredDuration: args.preferredDuration,
        budgetPerStudent: args.budgetPerStudent,
        maxEnrollment: 200,
        currentEnrollment: 0,
        status: "requesting",
        createdAt: Date.now(),
    });

    await ctx.db.insert("crash_course_enrollments", {
        crashCourseId,
        studentId: args.user._id,
        status: "interested",
        createdAt: Date.now(),
    });

    return crashCourseId;
}

export async function lockInCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
        forceLockin?: boolean;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanLockIn(crashCourse, args.userId, args.forceLockin);
    await confirmCrashCourseWorkflow(ctx, { course: crashCourse });
}

export async function startCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanStartCourse(crashCourse, args.userId);

    await ctx.db.patch(args.crashCourseId, { status: "in_progress" });
}

export async function completeCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanCompleteCourse(crashCourse, args.userId);

    await ctx.db.patch(args.crashCourseId, { status: "completed" });
}

export async function cancelCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanCancelCourse(crashCourse, args.userId);
    await cancelCrashCourseWorkflow(ctx, { course: crashCourse });
}

export async function tutorReviewCrashCourseDecision(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
        decision: "accept" | "renegotiate" | "cancel";
        newPrice?: number;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    if (crashCourse.status !== "pending_tutor_review") {
        throw new Error("This crash course is not pending tutor review");
    }
    if (crashCourse.selectedTutorId !== args.userId) {
        throw new Error("Only the selected tutor can make this decision");
    }

    const now = Date.now();

    if (args.decision === "accept") {
        await confirmCrashCourseWorkflow(ctx, {
            course: crashCourse,
            confirmedAt: now,
        });
        return;
    }

    if (args.decision === "renegotiate") {
        if (!args.newPrice || args.newPrice <= 0) {
            throw new Error("A valid new price is required for renegotiation");
        }
        await reopenConfirmationAfterRenegotiationWorkflow(ctx, {
            course: crashCourse,
            newPrice: args.newPrice,
            renegotiatedAt: now,
        });
        return;
    }

    await cancelCrashCourseWorkflow(ctx, {
        course: crashCourse,
        cancelledAt: now,
        message: "The tutor cancelled due to insufficient enrollment.",
    });
}
