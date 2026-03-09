import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type NotificationInsertArgs = {
    userId: Id<"users">;
    createdAt?: number;
} & (
    | {
        type: "offer_received" | "offer_accepted";
        data: { ticketId: Id<"tickets">; offerId: Id<"offers"> };
    }
    | {
        type: "ticket_resolved" | "request_completed";
        data: { ticketId: Id<"tickets"> };
    }
    | {
        type: "new_message";
        data: {
            conversationId: Id<"conversations">;
            messageId: Id<"messages">;
            senderId: Id<"users">;
            count: number;
            lastMessageId?: Id<"messages">;
        };
    }
    | {
        type: "credential_reviewed";
        data: {
            credentialId: Id<"tutor_credentials">;
            credentialType: string;
            decision: "approved" | "rejected" | "needs_resubmit";
            reason?: string;
        };
    }
    | {
        type: "crash_course_application";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
            tutorId: Id<"users">;
            tutorName: string;
        };
    }
    | {
        type: "crash_course_vote_open" | "crash_course_selected";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
        };
    }
    | {
        type: "crash_course_confirmed";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
            price?: number;
            scheduledAt?: number;
        };
    }
    | {
        type: "crash_course_reminder";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
            scheduledAt: number;
        };
    }
    | {
        type: "crash_course_cancelled";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
            message?: string;
        };
    }
    | {
        type: "crash_course_low_enrollment";
        data: {
            crashCourseId: Id<"crash_courses">;
            title: string;
            oldPrice?: number;
            newPrice?: number;
            confirmedCount?: number;
            minEnrollment?: number;
            message: string;
        };
    }
);

export async function insertNotification(
    ctx: MutationCtx,
    args: NotificationInsertArgs
) {
    await ctx.db.insert("notifications", {
        userId: args.userId,
        type: args.type,
        data: args.data,
        isRead: false,
        createdAt: args.createdAt ?? Date.now(),
    });
}

export async function notifyOfferReceived(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: { ticketId: Id<"tickets">; offerId: Id<"offers"> }
) {
    await insertNotification(ctx, {
        userId,
        type: "offer_received",
        data,
    });
}

export async function notifyOfferAccepted(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: { ticketId: Id<"tickets">; offerId: Id<"offers"> }
) {
    await insertNotification(ctx, {
        userId,
        type: "offer_accepted",
        data,
    });
}

export async function notifyTicketResolved(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: { ticketId: Id<"tickets"> }
) {
    await insertNotification(ctx, {
        userId,
        type: "ticket_resolved",
        data,
    });
}

export async function notifyCredentialReviewed(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        credentialId: Id<"tutor_credentials">;
        credentialType: string;
        decision: "approved" | "rejected" | "needs_resubmit";
        reason?: string;
    }
) {
    await insertNotification(ctx, {
        userId,
        type: "credential_reviewed",
        data,
    });
}

export async function upsertMessageNotification(
    ctx: MutationCtx,
    args: {
        recipientId: Id<"users">;
        conversationId: Id<"conversations">;
        messageId: Id<"messages">;
        senderId: Id<"users">;
    }
) {
    const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_user_and_read", (q) =>
            q.eq("userId", args.recipientId).eq("isRead", false)
        )
        .filter((q) =>
            q.and(
                q.eq(q.field("type"), "new_message"),
                q.eq(q.field("data.conversationId"), args.conversationId)
            )
        )
        .first();

    if (existingNotification) {
        const existingData = existingNotification.data as {
            conversationId: Id<"conversations">;
            messageId: Id<"messages">;
            senderId: Id<"users">;
            count?: number;
            lastMessageId?: Id<"messages">;
        };
        await ctx.db.patch(existingNotification._id, {
            data: {
                ...existingData,
                count: (existingData.count ?? 1) + 1,
                messageId: args.messageId,
                lastMessageId: args.messageId,
                senderId: args.senderId,
            },
            createdAt: Date.now(),
        });
        return;
    }

    await insertNotification(ctx, {
        userId: args.recipientId,
        type: "new_message",
        data: {
            conversationId: args.conversationId,
            messageId: args.messageId,
            senderId: args.senderId,
            count: 1,
            lastMessageId: args.messageId,
        },
    });
}

export async function notifyCrashCourseApplication(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        crashCourseId: Id<"crash_courses">;
        title: string;
        tutorId: Id<"users">;
        tutorName: string;
    },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_application",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseVoteOpen(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: { crashCourseId: Id<"crash_courses">; title: string },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_vote_open",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseSelected(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: { crashCourseId: Id<"crash_courses">; title: string },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_selected",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseConfirmed(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        crashCourseId: Id<"crash_courses">;
        title: string;
        price?: number;
        scheduledAt?: number;
    },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_confirmed",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseReminder(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        crashCourseId: Id<"crash_courses">;
        title: string;
        scheduledAt: number;
    },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_reminder",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseCancelled(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        crashCourseId: Id<"crash_courses">;
        title: string;
        message?: string;
    },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_cancelled",
        data,
        createdAt,
    });
}

export async function notifyCrashCourseLowEnrollment(
    ctx: MutationCtx,
    userId: Id<"users">,
    data: {
        crashCourseId: Id<"crash_courses">;
        title: string;
        oldPrice?: number;
        newPrice?: number;
        confirmedCount?: number;
        minEnrollment?: number;
        message: string;
    },
    createdAt?: number
) {
    await insertNotification(ctx, {
        userId,
        type: "crash_course_low_enrollment",
        data,
        createdAt,
    });
}

export async function hasCrashCourseReminder(
    ctx: MutationCtx,
    crashCourseId: Id<"crash_courses">
) {
    const existingReminder = await ctx.db
        .query("notifications")
        .filter((q) =>
            q.and(
                q.eq(q.field("type"), "crash_course_reminder"),
                q.eq(q.field("data.crashCourseId"), crashCourseId)
            )
        )
        .first();

    return Boolean(existingReminder);
}
