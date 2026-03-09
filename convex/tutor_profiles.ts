import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureTutorProfile, getTutorProfileByUserId } from "./tutor_profile_service";
import { getCurrentUser, requireUser } from "./utils";

export const getMyProfile = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        return await getTutorProfileByUserId(ctx, user._id);
    },
});

export const updateProfile = mutation({
    args: {
        bio: v.optional(v.string()),
        minRate: v.optional(v.number()),
        allowedHelpTypes: v.optional(v.array(v.union(
            v.literal("debugging"),
            v.literal("concept"),
            v.literal("exam_prep"),
            v.literal("review"),
            v.literal("assignment"),
            v.literal("project"),
            v.literal("mentorship"),
            v.literal("interview_prep"),
            v.literal("other"),
        ))),
        acceptingRequests: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const profile = await getTutorProfileByUserId(ctx, user._id);

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
            await ensureTutorProfile(ctx, {
                userId: user._id,
                bio: args.bio ?? "",
                minRate: args.minRate,
                allowedHelpTypes: args.allowedHelpTypes,
                acceptingRequests: args.acceptingRequests,
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
        const user = await requireUser(ctx);

        const profile = await getTutorProfileByUserId(ctx, user._id);

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
