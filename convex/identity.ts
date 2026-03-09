import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export interface RequireUserOptions {
    allowBanned?: boolean;
}

export type IdentityCtx = MutationCtx | QueryCtx;

async function fetchUserByTokenIdentifier(
    ctx: IdentityCtx,
    tokenIdentifier: string
): Promise<Doc<"users"> | null> {
    return await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
        .unique();
}

export async function getCurrentUser(
    ctx: IdentityCtx,
    options?: RequireUserOptions
): Promise<Doc<"users"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return null;
    }

    const user = await fetchUserByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (!user) {
        return null;
    }

    if (user.bannedAt !== undefined && !options?.allowBanned) {
        throw new ConvexError("Your account has been banned. Please contact support.");
    }

    return user;
}

export async function requireCurrentUser(
    ctx: IdentityCtx,
    options?: RequireUserOptions
) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("Unauthenticated");
    }

    const user = await fetchUserByTokenIdentifier(ctx, identity.tokenIdentifier);
    if (!user) {
        throw new ConvexError("User not found");
    }

    if (user.bannedAt !== undefined && !options?.allowBanned) {
        throw new ConvexError("Your account has been banned. Please contact support.");
    }

    return user;
}

export async function requireCurrentAdmin(ctx: IdentityCtx) {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "admin") {
        throw new ConvexError("Unauthorized: Admin access required");
    }

    return user;
}
