import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
    notifyCrashCourseCancelled,
    notifyCrashCourseConfirmed,
    notifyCrashCourseLowEnrollment,
    notifyCrashCourseSelected,
} from "./notification_service";
import {
    DEFAULT_CONFIRMATION_HOURS,
    RENEGOTIATION_CONFIRMATION_HOURS,
} from "./crash_course_policy";

async function listEnrollmentsByStatus(
    ctx: MutationCtx,
    crashCourseId: Id<"crash_courses">,
    status: "interested" | "pending_confirmation" | "enrolled"
) {
    return await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", crashCourseId))
        .filter((q) => q.eq(q.field("status"), status))
        .collect();
}

export async function confirmCrashCourseWorkflow(
    ctx: MutationCtx,
    args: {
        course: Doc<"crash_courses">;
        confirmedAt?: number;
    }
) {
    await ctx.db.patch(args.course._id, { status: "confirmed" });

    const enrolled = await listEnrollmentsByStatus(ctx, args.course._id, "enrolled");
    await Promise.all(
        enrolled.map((enrollment) =>
            notifyCrashCourseConfirmed(
                ctx,
                enrollment.studentId,
                {
                    crashCourseId: args.course._id,
                    title: args.course.title,
                },
                args.confirmedAt
            )
        )
    );
}

export async function selectTutorAndOpenConfirmationWorkflow(
    ctx: MutationCtx,
    args: {
        course: Doc<"crash_courses">;
        application: Doc<"crash_course_applications">;
        selectedAt?: number;
        confirmationHours?: number;
    }
) {
    const selectedAt = args.selectedAt ?? Date.now();
    const confirmationDeadline =
        selectedAt + (args.confirmationHours ?? DEFAULT_CONFIRMATION_HOURS) * 60 * 60 * 1000;

    await ctx.db.patch(args.course._id, {
        selectedTutorId: args.application.tutorId,
        pricePerStudent: args.application.proposedPrice,
        scheduledAt: args.application.proposedDate,
        duration: args.application.proposedDuration,
        location: args.application.proposedLocation,
        minEnrollment: args.application.proposedMinEnrollment,
        maxEnrollment: args.application.proposedMaxEnrollment ?? 200,
        status: "confirming",
        confirmationDeadline,
    });

    await ctx.db.patch(args.application._id, { status: "selected" });

    const allApplications = await ctx.db
        .query("crash_course_applications")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", args.course._id))
        .collect();

    await Promise.all(
        allApplications
            .filter((app) => app._id !== args.application._id && app.status === "pending")
            .map((app) => ctx.db.patch(app._id, { status: "rejected" }))
    );

    const interested = await listEnrollmentsByStatus(ctx, args.course._id, "interested");
    await Promise.all(
        interested.map(async (enrollment) => {
            await ctx.db.patch(enrollment._id, { status: "pending_confirmation" });
            await notifyCrashCourseConfirmed(
                ctx,
                enrollment.studentId,
                {
                    crashCourseId: args.course._id,
                    title: args.course.title,
                    price: args.application.proposedPrice,
                    scheduledAt: args.application.proposedDate,
                },
                selectedAt
            );
        })
    );

    await notifyCrashCourseSelected(
        ctx,
        args.application.tutorId,
        {
            crashCourseId: args.course._id,
            title: args.course.title,
        },
        selectedAt
    );
}

export async function reopenConfirmationAfterRenegotiationWorkflow(
    ctx: MutationCtx,
    args: {
        course: Doc<"crash_courses">;
        newPrice: number;
        renegotiatedAt?: number;
    }
) {
    const renegotiatedAt = args.renegotiatedAt ?? Date.now();
    const enrolled = await listEnrollmentsByStatus(ctx, args.course._id, "enrolled");

    await Promise.all(
        enrolled.map(async (enrollment) => {
            await ctx.db.patch(enrollment._id, { status: "pending_confirmation" });
            await notifyCrashCourseLowEnrollment(
                ctx,
                enrollment.studentId,
                {
                    crashCourseId: args.course._id,
                    title: args.course.title,
                    oldPrice: args.course.pricePerStudent,
                    newPrice: args.newPrice,
                    message:
                        "The tutor has proposed a new price due to low enrollment. Please re-confirm.",
                },
                renegotiatedAt
            );
        })
    );

    await ctx.db.patch(args.course._id, {
        pricePerStudent: args.newPrice,
        currentEnrollment: 0,
        status: "confirming",
        confirmationDeadline:
            renegotiatedAt + RENEGOTIATION_CONFIRMATION_HOURS * 60 * 60 * 1000,
    });
}

export async function cancelCrashCourseWorkflow(
    ctx: MutationCtx,
    args: {
        course: Doc<"crash_courses">;
        cancelledAt?: number;
        message?: string;
        notifyCreator?: boolean;
    }
) {
    await ctx.db.patch(args.course._id, { status: "cancelled" });

    const allEnrollments = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", args.course._id))
        .filter((q) => q.neq(q.field("status"), "withdrawn"))
        .collect();

    await Promise.all(
        allEnrollments.map((enrollment) =>
            notifyCrashCourseCancelled(
                ctx,
                enrollment.studentId,
                {
                    crashCourseId: args.course._id,
                    title: args.course.title,
                    message: args.message,
                },
                args.cancelledAt
            )
        )
    );

    if (args.notifyCreator) {
        await notifyCrashCourseCancelled(
            ctx,
            args.course.creatorId,
            {
                crashCourseId: args.course._id,
                title: args.course.title,
                message: args.message,
            },
            args.cancelledAt
        );
    }
}
