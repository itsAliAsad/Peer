import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type ConversationCtx = MutationCtx | QueryCtx;

export async function findConversationBetweenUsers(
    ctx: ConversationCtx,
    userA: Id<"users">,
    userB: Id<"users">
) {
    const existing1 = await ctx.db
        .query("conversations")
        .withIndex("by_participant1", (q) => q.eq("participant1", userA))
        .filter((q) => q.eq(q.field("participant2"), userB))
        .first();

    if (existing1) {
        return existing1;
    }

    return await ctx.db
        .query("conversations")
        .withIndex("by_participant1", (q) => q.eq("participant1", userB))
        .filter((q) => q.eq(q.field("participant2"), userA))
        .first();
}

export async function getOrCreateConversationBetweenUsers(
    ctx: MutationCtx,
    userA: Id<"users">,
    userB: Id<"users">
) {
    const existing = await findConversationBetweenUsers(ctx, userA, userB);
    if (existing) {
        return existing._id;
    }

    return await ctx.db.insert("conversations", {
        participant1: userA,
        participant2: userB,
        updatedAt: Date.now(),
    });
}

export async function hasAcceptedOfferBetweenUsers(
    ctx: ConversationCtx,
    userA: Id<"users">,
    userB: Id<"users">
) {
    const offerAsStudent = await ctx.db
        .query("offers")
        .withIndex("by_student_and_tutor", (q) =>
            q.eq("studentId", userA).eq("tutorId", userB)
        )
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .first();

    if (offerAsStudent) {
        return true;
    }

    const offerAsTutor = await ctx.db
        .query("offers")
        .withIndex("by_tutor", (q) => q.eq("tutorId", userA))
        .filter((q) =>
            q.and(
                q.eq(q.field("studentId"), userB),
                q.eq(q.field("status"), "accepted")
            )
        )
        .first();

    return Boolean(offerAsTutor);
}

export async function requireAcceptedOfferBetweenUsers(
    ctx: ConversationCtx,
    userA: Id<"users">,
    userB: Id<"users">
) {
    const allowed = await hasAcceptedOfferBetweenUsers(ctx, userA, userB);
    if (!allowed) {
        throw new Error("Messaging is only allowed after an offer has been accepted.");
    }
}

export function isConversationParticipant(
    conversation: Pick<Doc<"conversations">, "participant1" | "participant2">,
    userId: Id<"users">
) {
    return conversation.participant1 === userId || conversation.participant2 === userId;
}

export function getOtherParticipantId(
    conversation: Pick<Doc<"conversations">, "participant1" | "participant2">,
    userId: Id<"users">
) {
    if (!isConversationParticipant(conversation, userId)) {
        throw new Error("Unauthorized");
    }

    return conversation.participant1 === userId
        ? conversation.participant2
        : conversation.participant1;
}

export async function requireConversationParticipant(
    ctx: ConversationCtx,
    conversationId: Id<"conversations">,
    userId: Id<"users">
) {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
        throw new Error("Conversation not found");
    }
    if (!isConversationParticipant(conversation, userId)) {
        throw new Error("Unauthorized");
    }

    return conversation;
}
