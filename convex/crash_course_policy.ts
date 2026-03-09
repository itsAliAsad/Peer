import type { Doc, Id } from "./_generated/dataModel";

export const DEFAULT_VOTING_HOURS = 48;
export const DEFAULT_CONFIRMATION_HOURS = 48;
export const RENEGOTIATION_CONFIRMATION_HOURS = 24;

export function assertCanStartVoting(
    course: Doc<"crash_courses">,
    creatorId: Id<"users">
) {
    if (course.creatorId !== creatorId) {
        throw new Error("Only the creator can start voting");
    }
    if (course.status !== "requesting") {
        throw new Error("Crash course must be in requesting status to start voting");
    }
}

export function assertCanSelectTutor(course: Doc<"crash_courses">) {
    if (course.status !== "voting" && course.status !== "requesting") {
        throw new Error("Cannot select tutor in current status");
    }
}

export function assertCanLockIn(
    course: Doc<"crash_courses">,
    actorId: Id<"users">,
    forceLockin?: boolean
) {
    const isCreator = course.creatorId === actorId;
    const isTutor = course.selectedTutorId === actorId;
    if (!isCreator && !isTutor) {
        throw new Error("Only the creator or selected tutor can lock in");
    }

    if (
        course.status !== "confirming" &&
        course.status !== "open" &&
        course.status !== "pending_tutor_review"
    ) {
        throw new Error("Cannot lock in from current status");
    }

    if (
        course.origin === "demand" &&
        course.minEnrollment &&
        course.currentEnrollment < course.minEnrollment &&
        !forceLockin
    ) {
        throw new Error(
            `Only ${course.currentEnrollment} of ${course.minEnrollment} required students confirmed. Pass forceLockin to proceed, or renegotiate.`
        );
    }
}

export function assertCanStartCourse(
    course: Doc<"crash_courses">,
    actorId: Id<"users">
) {
    const isTutor = course.selectedTutorId === actorId;
    const isCreator = course.creatorId === actorId;
    if (!isTutor && !isCreator) {
        throw new Error("Only the tutor or creator can start the session");
    }
    if (course.status !== "confirmed") {
        throw new Error("Crash course must be confirmed before starting");
    }
}

export function assertCanCompleteCourse(
    course: Doc<"crash_courses">,
    actorId: Id<"users">
) {
    const isTutor = course.selectedTutorId === actorId;
    const isCreator = course.creatorId === actorId;
    if (!isTutor && !isCreator) {
        throw new Error("Only the tutor or creator can complete the session");
    }
    if (course.status !== "in_progress") {
        throw new Error("Crash course must be in progress to complete");
    }
}

export function assertCanCancelCourse(
    course: Doc<"crash_courses">,
    actorId: Id<"users">
) {
    const isCreator = course.creatorId === actorId;
    const isTutor = course.selectedTutorId === actorId;
    if (!isCreator && !isTutor) {
        throw new Error("Only the creator or tutor can cancel");
    }
    if (course.status === "completed" || course.status === "cancelled") {
        throw new Error("Cannot cancel a completed or already cancelled crash course");
    }
}

export function evaluateConfirmationOutcome(args: {
    currentEnrollment: number;
    minEnrollment?: number;
    totalInterested: number;
}) {
    if (args.currentEnrollment === 0) {
        return "cancelled" as const;
    }

    if (args.minEnrollment !== undefined) {
        return args.currentEnrollment >= args.minEnrollment
            ? ("confirmed" as const)
            : ("pending_tutor_review" as const);
    }

    if (args.totalInterested >= 4 && args.currentEnrollment < args.totalInterested * 0.5) {
        return "pending_tutor_review" as const;
    }

    return "confirmed" as const;
}
