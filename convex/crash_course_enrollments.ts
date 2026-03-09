import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { confirmCrashCourseWorkflow } from "./crash_course_workflows";
import { removeStudentVote } from "./crash_course_voting";

export async function enrollInCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        user: Doc<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse || crashCourse.deletedAt) {
        throw new Error("Crash course not found");
    }

    const existing = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("studentId", args.user._id)
        )
        .first();
    if (existing && existing.status !== "withdrawn") {
        throw new Error("You are already enrolled in this crash course");
    }

    if (crashCourse.origin === "supply" && crashCourse.selectedTutorId === args.user._id) {
        throw new Error("You cannot enroll in your own crash course");
    }
    if (
        crashCourse.origin === "demand" &&
        crashCourse.creatorId === args.user._id &&
        !existing
    ) {
        throw new Error("You are already enrolled as the creator");
    }

    if (crashCourse.origin === "supply") {
        if (crashCourse.status !== "open") {
            throw new Error("This crash course is not accepting enrollments");
        }
        if (crashCourse.currentEnrollment >= crashCourse.maxEnrollment) {
            throw new Error("This crash course is full");
        }

        if (existing) {
            await ctx.db.patch(existing._id, { status: "enrolled", createdAt: Date.now() });
        } else {
            await ctx.db.insert("crash_course_enrollments", {
                crashCourseId: args.crashCourseId,
                studentId: args.user._id,
                status: "enrolled",
                createdAt: Date.now(),
            });
        }

        const newCount = crashCourse.currentEnrollment + 1;
        await ctx.db.patch(args.crashCourseId, { currentEnrollment: newCount });

        if (
            crashCourse.minEnrollment &&
            newCount >= crashCourse.minEnrollment &&
            crashCourse.status === "open"
        ) {
            await confirmCrashCourseWorkflow(ctx, { course: crashCourse });
        }

        return;
    }

    if (crashCourse.status !== "requesting" && crashCourse.status !== "voting") {
        throw new Error("This crash course is not accepting new interest");
    }
    if (crashCourse.currentEnrollment >= crashCourse.maxEnrollment) {
        throw new Error("This crash course is full");
    }

    if (existing) {
        await ctx.db.patch(existing._id, { status: "interested", createdAt: Date.now() });
        return;
    }

    await ctx.db.insert("crash_course_enrollments", {
        crashCourseId: args.crashCourseId,
        studentId: args.user._id,
        status: "interested",
        createdAt: Date.now(),
    });
}

export async function withdrawFromCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");

    const enrollment = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("studentId", args.userId)
        )
        .first();

    if (!enrollment || enrollment.status === "withdrawn") {
        throw new Error("You are not enrolled in this crash course");
    }

    if (crashCourse.origin === "demand" && crashCourse.creatorId === args.userId) {
        throw new Error("As the creator, you cannot withdraw. Cancel the crash course instead.");
    }

    const wasEnrolled = enrollment.status === "enrolled";
    await ctx.db.patch(enrollment._id, { status: "withdrawn" });

    if (wasEnrolled) {
        await ctx.db.patch(args.crashCourseId, {
            currentEnrollment: Math.max(0, crashCourse.currentEnrollment - 1),
        });
    }

    await removeStudentVote(ctx, args.crashCourseId, args.userId);
}

export async function confirmCrashCourseEnrollment(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    if (crashCourse.status !== "confirming") {
        throw new Error("Crash course is not in confirmation phase");
    }

    const enrollment = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("studentId", args.userId)
        )
        .first();

    if (!enrollment || enrollment.status !== "pending_confirmation") {
        throw new Error("No pending confirmation found");
    }

    await ctx.db.patch(enrollment._id, { status: "enrolled" });

    const newCount = crashCourse.currentEnrollment + 1;
    await ctx.db.patch(args.crashCourseId, { currentEnrollment: newCount });

    if (crashCourse.minEnrollment && newCount >= crashCourse.minEnrollment) {
        await confirmCrashCourseWorkflow(ctx, { course: crashCourse });
    }
}

export async function getCrashCourseEnrollments(
    ctx: QueryCtx,
    crashCourseId: Id<"crash_courses">
) {
    const enrollments = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", crashCourseId))
        .filter((q) => q.neq(q.field("status"), "withdrawn"))
        .collect();

    return await Promise.all(
        enrollments.map(async (enrollment) => {
            const student = await ctx.db.get(enrollment.studentId);
            return {
                ...enrollment,
                student: student
                    ? { _id: student._id, name: student.name, image: student.image }
                    : null,
            };
        })
    );
}

export async function getMyCrashCourseEnrollment(
    ctx: QueryCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    return await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("studentId", args.userId)
        )
        .first();
}

export async function getUpcomingCrashCourses(
    ctx: QueryCtx,
    userId: Id<"users">
) {
    const enrollments = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", userId))
        .filter((q) => q.eq(q.field("status"), "enrolled"))
        .collect();

    const teaching = await ctx.db
        .query("crash_courses")
        .withIndex("by_tutor", (q) => q.eq("selectedTutorId", userId))
        .collect();

    const allCourseIds = new Set([
        ...enrollments.map((enrollment) => enrollment.crashCourseId),
        ...teaching.map((course) => course._id),
    ]);

    const upcoming = [];
    for (const courseId of allCourseIds) {
        const course = await ctx.db.get(courseId);
        if (
            course &&
            !course.deletedAt &&
            (course.status === "confirmed" || course.status === "in_progress") &&
            course.scheduledAt &&
            course.scheduledAt > Date.now() - 24 * 60 * 60 * 1000
        ) {
            const universityCourse = course.courseId
                ? await ctx.db.get(course.courseId)
                : null;
            upcoming.push({
                ...course,
                course: universityCourse
                    ? { code: universityCourse.code, name: universityCourse.name }
                    : null,
                isTeaching: course.selectedTutorId === userId,
            });
        }
    }

    upcoming.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    return upcoming.slice(0, 10);
}
