import type { MutationCtx } from "./_generated/server";
import { evaluateConfirmationOutcome } from "./crash_course_policy";
import {
    cancelCrashCourseWorkflow,
    confirmCrashCourseWorkflow,
} from "./crash_course_workflows";
import {
    hasCrashCourseReminder,
    notifyCrashCourseLowEnrollment,
    notifyCrashCourseReminder,
} from "./notification_service";
import { selectTutorForCrashCourse } from "./crash_course_voting";

export async function autoCloseCrashCourseVoting(ctx: MutationCtx) {
    const votingCourses = await ctx.db
        .query("crash_courses")
        .withIndex("by_status", (q) => q.eq("status", "voting"))
        .collect();

    const now = Date.now();
    for (const course of votingCourses) {
        if (!course.votingDeadline || course.votingDeadline >= now) {
            continue;
        }

        const applications = await ctx.db
            .query("crash_course_applications")
            .withIndex("by_crash_course", (q) => q.eq("crashCourseId", course._id))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        if (applications.length === 0) {
            await cancelCrashCourseWorkflow(ctx, { course, cancelledAt: now });
            continue;
        }

        applications.sort((a, b) => b.voteCount - a.voteCount);
        await selectTutorForCrashCourse(ctx, {
            crashCourseId: course._id,
            applicationId: applications[0]._id,
            confirmationDeadlineHours: 48,
            selectedAt: now,
        });
    }
}

export async function autoExpireCrashCourseConfirmations(ctx: MutationCtx) {
    const confirmingCourses = await ctx.db
        .query("crash_courses")
        .withIndex("by_status", (q) => q.eq("status", "confirming"))
        .collect();

    const now = Date.now();
    for (const course of confirmingCourses) {
        if (!course.confirmationDeadline || course.confirmationDeadline >= now) {
            continue;
        }

        const pendingEnrollments = await ctx.db
            .query("crash_course_enrollments")
            .withIndex("by_crash_course", (q) => q.eq("crashCourseId", course._id))
            .filter((q) => q.eq(q.field("status"), "pending_confirmation"))
            .collect();

        await Promise.all(
            pendingEnrollments.map((enrollment) =>
                ctx.db.patch(enrollment._id, { status: "withdrawn" })
            )
        );

        const allEnrollments = await ctx.db
            .query("crash_course_enrollments")
            .withIndex("by_crash_course", (q) => q.eq("crashCourseId", course._id))
            .collect();
        const totalInterested = allEnrollments.filter(
            (enrollment) => enrollment.status !== "withdrawn"
        ).length;
        const outcome = evaluateConfirmationOutcome({
            currentEnrollment: course.currentEnrollment,
            minEnrollment: course.minEnrollment,
            totalInterested,
        });

        if (outcome === "cancelled") {
            await cancelCrashCourseWorkflow(ctx, { course, cancelledAt: now });
            continue;
        }
        if (outcome === "confirmed") {
            await confirmCrashCourseWorkflow(ctx, { course, confirmedAt: now });
            continue;
        }

        await ctx.db.patch(course._id, { status: "pending_tutor_review" });

        if (course.selectedTutorId) {
            await notifyCrashCourseLowEnrollment(
                ctx,
                course.selectedTutorId,
                {
                    crashCourseId: course._id,
                    title: course.title,
                    confirmedCount: course.currentEnrollment,
                    minEnrollment: course.minEnrollment,
                    message: `Only ${course.currentEnrollment} student(s) confirmed. You can accept, renegotiate the price, or cancel.`,
                },
                now
            );
        }
    }
}

export async function sendCrashCourseReminders(ctx: MutationCtx) {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;

    const confirmedCourses = await ctx.db
        .query("crash_courses")
        .withIndex("by_status", (q) => q.eq("status", "confirmed"))
        .collect();

    for (const course of confirmedCourses) {
        if (
            !course.scheduledAt ||
            course.scheduledAt <= now ||
            course.scheduledAt > oneHourFromNow
        ) {
            continue;
        }

        const alreadySent = await hasCrashCourseReminder(ctx, course._id);
        if (alreadySent) {
            continue;
        }

        const enrollments = await ctx.db
            .query("crash_course_enrollments")
            .withIndex("by_crash_course", (q) => q.eq("crashCourseId", course._id))
            .filter((q) => q.eq(q.field("status"), "enrolled"))
            .collect();

        await Promise.all(
            enrollments.map((enrollment) =>
                notifyCrashCourseReminder(
                    ctx,
                    enrollment.studentId,
                    {
                        crashCourseId: course._id,
                        title: course.title,
                        scheduledAt: course.scheduledAt!,
                    },
                    now
                )
            )
        );

        if (course.selectedTutorId) {
            await notifyCrashCourseReminder(
                ctx,
                course.selectedTutorId,
                {
                    crashCourseId: course._id,
                    title: course.title,
                    scheduledAt: course.scheduledAt,
                },
                now
            );
        }
    }
}
