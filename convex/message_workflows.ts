import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
    getOrCreateConversationBetweenUsers,
    getOtherParticipantId,
    requireAcceptedOfferBetweenUsers,
    requireConversationParticipant,
} from "./conversations";
import { upsertMessageNotification } from "./notification_service";
import { INPUT_LIMITS, RATE_LIMITS, validateLength } from "./utils";

export async function sendMessageWorkflow(
    ctx: MutationCtx,
    args: {
        sender: Doc<"users">;
        conversationId?: Id<"conversations">;
        recipientId?: Id<"users">;
        content: string;
        type: "text" | "image" | "file";
        metadata?: {
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
    }
) {
    validateLength(args.content, INPUT_LIMITS.MESSAGE_MAX, "Message");

    const { windowMs, maxRequests } = RATE_LIMITS.MESSAGE_SEND;
    const recentMessages = await ctx.db
        .query("messages")
        .filter((q) =>
            q.and(
                q.eq(q.field("senderId"), args.sender._id),
                q.gt(q.field("_creationTime"), Date.now() - windowMs)
            )
        )
        .take(maxRequests + 1);
    if (recentMessages.length >= maxRequests) {
        throw new Error("Rate limited: Too many messages. Please slow down.");
    }

    let conversationId = args.conversationId;
    if (!conversationId) {
        if (!args.recipientId) {
            throw new Error("Recipient required for new conversation");
        }
        await requireAcceptedOfferBetweenUsers(ctx, args.sender._id, args.recipientId);
        conversationId = await getOrCreateConversationBetweenUsers(
            ctx,
            args.sender._id,
            args.recipientId
        );
    }

    const conversation = await requireConversationParticipant(
        ctx,
        conversationId,
        args.sender._id
    );
    const recipientId = getOtherParticipantId(conversation, args.sender._id);
    const createdAt = Date.now();

    const messageId = await ctx.db.insert("messages", {
        conversationId,
        senderId: args.sender._id,
        content: args.content,
        type: args.type,
        metadata: args.metadata,
        isRead: false,
        createdAt,
    });

    await ctx.db.patch(conversationId, {
        lastMessageId: messageId,
        updatedAt: createdAt,
    });

    await upsertMessageNotification(ctx, {
        recipientId,
        conversationId,
        messageId,
        senderId: args.sender._id,
    });

    return messageId;
}

export async function markConversationReadWorkflow(
    ctx: MutationCtx,
    args: {
        conversationId: Id<"conversations">;
        userId: Id<"users">;
    }
) {
    await requireConversationParticipant(ctx, args.conversationId, args.userId);

    const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
        .filter((q) => q.neq(q.field("senderId"), args.userId))
        .filter((q) => q.eq(q.field("isRead"), false))
        .collect();

    await Promise.all(messages.map((message) => ctx.db.patch(message._id, { isRead: true })));
}
