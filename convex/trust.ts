import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export type VerificationTier = "none" | "identity" | "academic" | "expert";

export function getUserReputation(user: Pick<Doc<"users">, "ratingSum" | "ratingCount">) {
    if (user.ratingCount === 0) {
        return 0;
    }

    return user.ratingSum / user.ratingCount;
}

export function isUserVerified(
    user: Pick<Doc<"users">, "verificationTier">
) {
    return user.verificationTier === "academic" || user.verificationTier === "expert";
}

function computeVerificationTier(
    approvedCredentialCount: number,
    averageRating: number
): VerificationTier {
    if (approvedCredentialCount >= 3 && averageRating >= 4.5) {
        return "expert";
    }

    if (approvedCredentialCount >= 1) {
        return "academic";
    }

    return "identity";
}

export async function applyReviewToUser(
    ctx: MutationCtx,
    userId: Id<"users">,
    rating: number
) {
    const reviewee = await ctx.db.get(userId);
    if (!reviewee) {
        throw new Error("Reviewee not found");
    }

    const ratingSum = reviewee.ratingSum + rating;
    const ratingCount = reviewee.ratingCount + 1;
    const reputation = getUserReputation({ ratingSum, ratingCount });

    await ctx.db.patch(userId, {
        ratingSum,
        ratingCount,
        reputation,
    });
}

export async function recalculateVerificationTierForUser(
    ctx: MutationCtx,
    userId: Id<"users">
) {
    const user = await ctx.db.get(userId);
    if (!user) {
        throw new Error("User not found");
    }

    const approvedCredentials = await ctx.db
        .query("tutor_credentials")
        .withIndex("by_tutor", (q) => q.eq("tutorId", userId))
        .filter((q) => q.eq(q.field("status"), "approved"))
        .collect();

    const verificationTier = computeVerificationTier(
        approvedCredentials.length,
        getUserReputation(user)
    );

    await ctx.db.patch(userId, {
        verificationTier,
    });

    return verificationTier;
}

export async function setVerificationTier(
    ctx: MutationCtx,
    args: {
        userId: Id<"users">;
        verificationTier: VerificationTier;
        verifiedBy?: Id<"users">;
        verifiedAt?: number;
    }
) {
    await ctx.db.patch(args.userId, {
        verificationTier: args.verificationTier,
        verifiedBy: args.verifiedBy,
        verifiedAt: args.verifiedAt,
    });
}
