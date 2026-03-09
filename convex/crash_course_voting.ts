import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { DEFAULT_VOTING_HOURS, assertCanSelectTutor, assertCanStartVoting } from "./crash_course_policy";
import { selectTutorAndOpenConfirmationWorkflow } from "./crash_course_workflows";
import { notifyCrashCourseApplication, notifyCrashCourseVoteOpen } from "./notification_service";
import { INPUT_LIMITS, validateLength } from "./utils";

const APPLICATION_RATE_LIMIT = { windowMs: 300_000, maxRequests: 10 };

export async function applyToCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        pitch: string;
        proposedPrice: number;
        proposedDate: number;
        proposedDuration: number;
        proposedLocation?: string;
        topicsCovered: string[];
        proposedMinEnrollment?: number;
        proposedMaxEnrollment?: number;
        user: Doc<"users">;
    }
) {
    validateLength(args.pitch, INPUT_LIMITS.DESCRIPTION_MAX, "Pitch");
    if (args.proposedPrice <= 0 || args.proposedPrice > 1_000_000) {
        throw new Error("Price must be between 1 and 1,000,000");
    }
    if (args.proposedDate <= Date.now()) {
        throw new Error("Proposed date must be in the future");
    }
    if (args.proposedDuration <= 0 || args.proposedDuration > 480) {
        throw new Error("Duration must be between 1 and 480 minutes");
    }
    if (args.topicsCovered.length === 0) {
        throw new Error("You must cover at least one topic");
    }
    if (
        args.proposedMinEnrollment !== undefined &&
        (args.proposedMinEnrollment < 1 || args.proposedMinEnrollment > 200)
    ) {
        throw new Error("Min enrollment must be between 1 and 200");
    }
    if (
        args.proposedMaxEnrollment !== undefined &&
        (args.proposedMaxEnrollment < 2 || args.proposedMaxEnrollment > 200)
    ) {
        throw new Error("Max enrollment must be between 2 and 200");
    }
    if (
        args.proposedMinEnrollment !== undefined &&
        args.proposedMaxEnrollment !== undefined &&
        args.proposedMinEnrollment > args.proposedMaxEnrollment
    ) {
        throw new Error("Min enrollment cannot exceed max enrollment");
    }

    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse || crashCourse.deletedAt) {
        throw new Error("Crash course not found");
    }
    if (crashCourse.origin !== "demand") {
        throw new Error("Can only apply to student-requested crash courses");
    }
    if (crashCourse.status !== "requesting") {
        throw new Error("This crash course is not accepting applications");
    }
    if (crashCourse.creatorId === args.user._id) {
        throw new Error("You cannot apply to your own crash course request");
    }

    const recentApps = await ctx.db
        .query("crash_course_applications")
        .withIndex("by_tutor", (q) => q.eq("tutorId", args.user._id))
        .filter((q) => q.gt(q.field("_creationTime"), Date.now() - APPLICATION_RATE_LIMIT.windowMs))
        .collect();
    if (recentApps.length >= APPLICATION_RATE_LIMIT.maxRequests) {
        throw new Error("Rate limited: Too many applications. Please wait.");
    }

    const existing = await ctx.db
        .query("crash_course_applications")
        .withIndex("by_crash_course_and_tutor", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("tutorId", args.user._id)
        )
        .first();
    if (existing) {
        throw new Error("You have already applied to this crash course");
    }

    const appId = await ctx.db.insert("crash_course_applications", {
        crashCourseId: args.crashCourseId,
        tutorId: args.user._id,
        pitch: args.pitch,
        proposedPrice: args.proposedPrice,
        proposedDate: args.proposedDate,
        proposedDuration: args.proposedDuration,
        proposedLocation: args.proposedLocation,
        topicsCovered: args.topicsCovered,
        proposedMinEnrollment: args.proposedMinEnrollment,
        proposedMaxEnrollment: args.proposedMaxEnrollment,
        voteCount: 0,
        status: "pending",
        createdAt: Date.now(),
    });

    await notifyCrashCourseApplication(ctx, crashCourse.creatorId, {
        crashCourseId: args.crashCourseId,
        title: crashCourse.title,
        tutorId: args.user._id,
        tutorName: args.user.name,
    });

    return appId;
}

export async function startCrashCourseVoting(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        creatorId: Id<"users">;
        votingDeadlineHours?: number;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanStartVoting(crashCourse, args.creatorId);

    const applications = await ctx.db
        .query("crash_course_applications")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", args.crashCourseId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
    if (applications.length === 0) {
        throw new Error("At least one tutor application is required before voting");
    }

    const hours = args.votingDeadlineHours ?? DEFAULT_VOTING_HOURS;
    const votingDeadline = Date.now() + hours * 60 * 60 * 1000;

    await ctx.db.patch(args.crashCourseId, {
        status: "voting",
        votingDeadline,
    });

    const enrollments = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", args.crashCourseId))
        .filter((q) => q.eq(q.field("status"), "interested"))
        .collect();

    await Promise.all(
        enrollments.map((enrollment) =>
            notifyCrashCourseVoteOpen(ctx, enrollment.studentId, {
                crashCourseId: args.crashCourseId,
                title: crashCourse.title,
            })
        )
    );
}

export async function voteForCrashCourseApplication(
    ctx: MutationCtx,
    args: {
        applicationId: Id<"crash_course_applications">;
        userId: Id<"users">;
    }
) {
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.status !== "pending") {
        throw new Error("Application not found or not pending");
    }

    const crashCourse = await ctx.db.get(application.crashCourseId);
    if (!crashCourse || crashCourse.status !== "voting") {
        throw new Error("Voting is not open for this crash course");
    }

    const enrollment = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", application.crashCourseId).eq("studentId", args.userId)
        )
        .first();
    if (!enrollment || enrollment.status === "withdrawn") {
        throw new Error("You must be enrolled to vote");
    }

    const existingVote = await ctx.db
        .query("crash_course_votes")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", application.crashCourseId).eq("studentId", args.userId)
        )
        .first();

    if (existingVote) {
        if (existingVote.applicationId === args.applicationId) {
            throw new Error("You have already voted for this application");
        }

        await removeStudentVote(ctx, application.crashCourseId, args.userId);
    }

    await ctx.db.insert("crash_course_votes", {
        applicationId: args.applicationId,
        crashCourseId: application.crashCourseId,
        studentId: args.userId,
        createdAt: Date.now(),
    });

    await ctx.db.patch(args.applicationId, {
        voteCount: application.voteCount + 1,
    });
}

export async function removeStudentVote(
    ctx: MutationCtx,
    crashCourseId: Id<"crash_courses">,
    studentId: Id<"users">
) {
    const vote = await ctx.db
        .query("crash_course_votes")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", crashCourseId).eq("studentId", studentId)
        )
        .first();

    if (!vote) {
        return;
    }

    const application = await ctx.db.get(vote.applicationId);
    if (application) {
        await ctx.db.patch(vote.applicationId, {
            voteCount: Math.max(0, application.voteCount - 1),
        });
    }

    await ctx.db.delete(vote._id);
}

export async function selectTutorForCrashCourse(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        applicationId: Id<"crash_course_applications">;
        confirmationDeadlineHours?: number;
        selectedAt?: number;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    assertCanSelectTutor(crashCourse);

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.crashCourseId !== args.crashCourseId) {
        throw new Error("Application not found for this crash course");
    }

    await selectTutorAndOpenConfirmationWorkflow(ctx, {
        course: crashCourse,
        application,
        selectedAt: args.selectedAt,
        confirmationHours: args.confirmationDeadlineHours,
    });
}

export async function selectCrashCourseTutor(
    ctx: MutationCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        applicationId: Id<"crash_course_applications">;
        creatorId: Id<"users">;
        confirmationDeadlineHours?: number;
    }
) {
    const crashCourse = await ctx.db.get(args.crashCourseId);
    if (!crashCourse) throw new Error("Crash course not found");
    if (crashCourse.creatorId !== args.creatorId) {
        throw new Error("Only the creator can select a tutor");
    }

    await selectTutorForCrashCourse(ctx, {
        crashCourseId: args.crashCourseId,
        applicationId: args.applicationId,
        confirmationDeadlineHours: args.confirmationDeadlineHours,
    });
}

export async function getCrashCourseApplications(
    ctx: QueryCtx,
    crashCourseId: Id<"crash_courses">
) {
    const applications = await ctx.db
        .query("crash_course_applications")
        .withIndex("by_crash_course", (q) => q.eq("crashCourseId", crashCourseId))
        .collect();

    const crashCourse = await ctx.db.get(crashCourseId);

    const enriched = await Promise.all(
        applications.map(async (application) => {
            const tutor = await ctx.db.get(application.tutorId);
            const tutorProfile = tutor
                ? await ctx.db
                    .query("tutor_profiles")
                    .withIndex("by_user", (q) => q.eq("userId", tutor._id))
                    .first()
                : null;

            let expertiseLevel = null;
            if (crashCourse) {
                const offering = await ctx.db
                    .query("tutor_offerings")
                    .withIndex("by_tutor", (q) => q.eq("tutorId", application.tutorId))
                    .filter((q) => q.eq(q.field("courseId"), crashCourse.courseId))
                    .first();
                expertiseLevel = offering?.level ?? null;
            }

            const completedOffers = await ctx.db
                .query("offers")
                .withIndex("by_tutor", (q) => q.eq("tutorId", application.tutorId))
                .filter((q) => q.eq(q.field("status"), "accepted"))
                .collect();

            return {
                ...application,
                tutor: tutor
                    ? {
                        _id: tutor._id,
                        name: tutor.name,
                        image: tutor.image,
                        reputation: tutor.reputation,
                        isVerified:
                            tutor.verificationTier === "academic" ||
                            tutor.verificationTier === "expert",
                        isOnline: tutorProfile?.isOnline ?? false,
                        completedJobs: completedOffers.length,
                        expertiseLevel,
                    }
                    : null,
            };
        })
    );

    enriched.sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.createdAt - b.createdAt;
    });

    return enriched;
}

export async function getMyCrashCourseVote(
    ctx: QueryCtx,
    args: {
        crashCourseId: Id<"crash_courses">;
        userId: Id<"users">;
    }
) {
    return await ctx.db
        .query("crash_course_votes")
        .withIndex("by_crash_course_and_student", (q) =>
            q.eq("crashCourseId", args.crashCourseId).eq("studentId", args.userId)
        )
        .first();
}
