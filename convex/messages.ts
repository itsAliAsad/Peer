import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    findConversationBetweenUsers,
    getOrCreateConversationBetweenUsers,
    getOtherParticipantId,
    hasAcceptedOfferBetweenUsers,
    requireAcceptedOfferBetweenUsers,
    requireConversationParticipant,
} from "./conversations";
import {
    getConversationReadModel,
    listConversationReadModels,
} from "./conversation_read_models";
import {
    markConversationReadWorkflow,
    sendMessageWorkflow,
} from "./message_workflows";
import { getCurrentUser, requireUser } from "./utils";

export const listConversations = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        return await listConversationReadModels(ctx, user._id);
    },
});

export const list = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        try {
            await requireConversationParticipant(ctx, args.conversationId, user._id);
        } catch {
            return [];
        }

        return await ctx.db
            .query("messages")
            .withIndex("by_conversation_and_created", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .order("asc")
            .collect();
    },
});

export const send = mutation({
    args: {
        conversationId: v.optional(v.id("conversations")),
        recipientId: v.optional(v.id("users")), // If starting new convo
        content: v.string(),
        type: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
        metadata: v.optional(
            v.object({
                fileName: v.string(),
                fileSize: v.number(),
                mimeType: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await sendMessageWorkflow(ctx, {
            sender: user,
            ...args,
        });
    },
});

export const markRead = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await markConversationReadWorkflow(ctx, {
            conversationId: args.conversationId,
            userId: user._id,
        });
    },
});

export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        try {
            return await getConversationReadModel(ctx, {
                conversationId: args.conversationId,
                userId: user._id,
            });
        } catch {
            return null;
        }
    },
});

export const getOrCreateConversation = mutation({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await requireAcceptedOfferBetweenUsers(ctx, user._id, args.otherUserId);
        return await getOrCreateConversationBetweenUsers(ctx, user._id, args.otherUserId);
    },
});

export const canSendMessage = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return false;
        try {
            const conversation = await requireConversationParticipant(
                ctx,
                args.conversationId,
                user._id
            );
            const otherUserId = getOtherParticipantId(conversation, user._id);
            return await hasAcceptedOfferBetweenUsers(ctx, user._id, otherUserId);
        } catch {
            return false;
        }
    },
});

export const getUnreadMessagesFromUser = query({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return 0;

        const conversation = await findConversationBetweenUsers(ctx, user._id, args.otherUserId);
        if (!conversation) return 0;

        // Count unread messages from the other user
        const unreadMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
            .filter((q) =>
                q.and(
                    q.eq(q.field("senderId"), args.otherUserId),
                    q.eq(q.field("isRead"), false)
                )
            )
            .collect();

        return unreadMessages.length;
    },
});


