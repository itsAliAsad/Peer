import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { insertNotification } from "./notification_service";
import {
    notificationDataValidator,
    notificationTypeValidator,
} from "./notification_types";
import { requireUser } from "./utils";
import { Id } from "./_generated/dataModel";

export const list = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, { allowBanned: true });

        const results = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .order("desc")
            .paginate(args.paginationOpts);

        // Enrich notifications with sender info for new_message type
        return {
            ...results,
            page: await Promise.all(
                results.page.map(async (n) => {
                    if (n.type === "new_message" && "senderId" in n.data) {
                        const sender = await ctx.db.get(n.data.senderId as Id<"users">);
                        return {
                            ...n,
                            sender: sender
                                ? { name: sender.name, image: sender.image }
                                : undefined,
                        };
                    }
                    return { ...n, sender: undefined };
                })
            ),
        };
    },
});

export const markRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, { allowBanned: true });

        const notification = await ctx.db.get(args.notificationId);
        if (!notification) throw new Error("Notification not found");

        if (notification.userId !== user._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.notificationId, { isRead: true });
    },
});

export const markAllRead = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx, { allowBanned: true });

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_and_read", (q) =>
                q.eq("userId", user._id).eq("isRead", false)
            )
            .collect();

        await Promise.all(
            unread.map((n) => ctx.db.patch(n._id, { isRead: true }))
        );
    },
});

export const create = internalMutation({
    args: {
        userId: v.id("users"),
        type: notificationTypeValidator,
        data: notificationDataValidator,
    },
    handler: async (ctx, args) => {
        await insertNotification(ctx, args as Parameters<typeof insertNotification>[1]);
    },
});
