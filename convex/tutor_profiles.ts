import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyProfile = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return null;

        return await ctx.db
            .query("tutor_profiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();
    },
});

export const updateProfile = mutation({
    args: {
        bio: v.optional(v.string()),
        minRate: v.optional(v.number()),
        allowedHelpTypes: v.optional(v.array(v.string())),
        acceptingRequests: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const profile = await ctx.db
            .query("tutor_profiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

        if (profile) {
            const updates: Record<string, unknown> = {};
            if (args.bio !== undefined) updates.bio = args.bio;
            if (args.minRate !== undefined || args.allowedHelpTypes !== undefined || args.acceptingRequests !== undefined) {
                updates.settings = {
                    ...profile.settings,
                    ...(args.minRate !== undefined && { minRate: args.minRate }),
                    ...(args.allowedHelpTypes !== undefined && { allowedHelpTypes: args.allowedHelpTypes }),
                    ...(args.acceptingRequests !== undefined && { acceptingRequests: args.acceptingRequests }),
                };
            }
            await ctx.db.patch(profile._id, updates);
        } else {
            // Create new - use defaults if not provided
            await ctx.db.insert("tutor_profiles", {
                userId: user._id,
                bio: args.bio || "",
                isOnline: true,
                lastActiveAt: Date.now(),
                creditBalance: 0,
                settings: {
                    acceptingRequests: args.acceptingRequests ?? true,
                    acceptingPaid: true,
                    acceptingFree: false,
                    minRate: args.minRate ?? 500,
                    allowedHelpTypes: args.allowedHelpTypes || [],
                },
            });
        }
    },
});

// Update online status
export const updateOnlineStatus = mutation({
    args: {
        status: v.union(v.literal("online"), v.literal("away"), v.literal("offline"))
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const profile = await ctx.db
            .query("tutor_profiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

        if (!profile) return; // No tutor profile — silently skip (student users, etc.)

        await ctx.db.patch(profile._id, {
            isOnline: args.status === "online",
            lastActiveAt: Date.now(),
            settings: {
                ...profile.settings,
                acceptingRequests: args.status === "online",
            }
        });
    },
});

export const checkIdleTutors = internalMutation({
    handler: async (ctx) => {
        const cutoff = Date.now() - 10 * 60 * 1000; // 10 minutes ago

        const idleTutors = await ctx.db
            .query("tutor_profiles")
            .withIndex("by_user") // Ideally we'd have an index on isOnline + lastActiveAt, but this needs schema change or full scan.
            // Since we can't easily query by isOnline without index, let's just filter in memory for now or iterate.
            // Better: use filter.
            .filter((q) => q.eq(q.field("isOnline"), true))
            .collect();

        for (const tutor of idleTutors) {
            if (tutor.lastActiveAt < cutoff) {
                await ctx.db.patch(tutor._id, {
                    isOnline: false,
                    settings: {
                        ...tutor.settings,
                        acceptingRequests: false, // Auto-mark as not accepting requests when idle
                    },
                });
            }
        }
    },
});
