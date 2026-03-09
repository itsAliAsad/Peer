import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
    getOtherParticipantId,
    requireConversationParticipant,
} from "./conversations";
import { isUserVerified } from "./trust";

async function buildConversationPeer(ctx: QueryCtx, userId: Id<"users">) {
    const user = await ctx.db.get(userId);
    if (!user) {
        return null;
    }

    return {
        ...user,
        isVerified: isUserVerified(user),
    };
}

export async function listConversationReadModels(
    ctx: QueryCtx,
    userId: Id<"users">
) {
    const conversations1 = await ctx.db
        .query("conversations")
        .withIndex("by_participant1", (q) => q.eq("participant1", userId))
        .collect();
    const conversations2 = await ctx.db
        .query("conversations")
        .withIndex("by_participant2", (q) => q.eq("participant2", userId))
        .collect();

    const uniqueConversations = Array.from(
        new Map([...conversations1, ...conversations2].map((conversation) => [conversation._id, conversation])).values()
    ).sort((a, b) => b.updatedAt - a.updatedAt);

    return await Promise.all(
        uniqueConversations.map(async (conversation) => {
            const otherUserId = getOtherParticipantId(conversation, userId);
            const lastMessage = conversation.lastMessageId
                ? await ctx.db.get(conversation.lastMessageId)
                : null;

            return {
                ...conversation,
                otherUser: await buildConversationPeer(ctx, otherUserId),
                lastMessage,
            };
        })
    );
}

export async function getConversationReadModel(
    ctx: QueryCtx,
    args: {
        conversationId: Id<"conversations">;
        userId: Id<"users">;
    }
) {
    const conversation = await requireConversationParticipant(
        ctx,
        args.conversationId,
        args.userId
    );
    const otherUserId = getOtherParticipantId(conversation, args.userId);

    return {
        ...conversation,
        otherUser: await buildConversationPeer(ctx, otherUserId),
    };
}
