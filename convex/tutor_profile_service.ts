import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type TutorProfileCtx = MutationCtx | QueryCtx;

export async function getTutorProfileByUserId(
    ctx: TutorProfileCtx,
    userId: Id<"users">
) {
    return await ctx.db
        .query("tutor_profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
}

export async function ensureTutorProfile(
    ctx: MutationCtx,
    args: {
        userId: Id<"users">;
        bio: string;
        minRate?: number;
        allowedHelpTypes?: (
            | "debugging"
            | "concept"
            | "exam_prep"
            | "review"
            | "assignment"
            | "project"
            | "mentorship"
            | "interview_prep"
            | "other"
        )[];
        acceptingRequests?: boolean;
    }
) {
    const existing = await getTutorProfileByUserId(ctx, args.userId);
    if (existing) {
        return existing._id;
    }

    return await ctx.db.insert("tutor_profiles", {
        userId: args.userId,
        bio: args.bio,
        isOnline: true,
        lastActiveAt: Date.now(),
        creditBalance: 0,
        settings: {
            acceptingRequests: args.acceptingRequests ?? true,
            acceptingPaid: true,
            acceptingFree: false,
            minRate: args.minRate ?? 500,
            allowedHelpTypes: args.allowedHelpTypes ?? [],
        },
    });
}
