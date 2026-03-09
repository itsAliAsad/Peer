import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { writeAuditEntry } from "./audit";
import {
    getCurrentUser,
    type IdentityCtx,
    type RequireUserOptions,
    requireCurrentAdmin,
    requireCurrentUser,
} from "./identity";

// ==========================================
// INPUT VALIDATION CONSTANTS
// ==========================================
export const INPUT_LIMITS = {
    TITLE_MAX: 200,
    DESCRIPTION_MAX: 5000,
    MESSAGE_MAX: 10000,
    BIO_MAX: 1000,
    COMMENT_MAX: 2000,
    REASON_MAX: 500,
} as const;

export function validateLength(value: string, max: number, fieldName: string) {
    if (value.length > max) {
        throw new ConvexError(`${fieldName} exceeds maximum length of ${max} characters`);
    }
}

// ==========================================
// RATE LIMITING
// ==========================================
interface RateLimitConfig {
    windowMs: number;    // Time window in milliseconds
    maxRequests: number; // Max requests in that window
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    OFFER_CREATE: { windowMs: 60_000, maxRequests: 5 },      // 5 offers per minute
    MESSAGE_SEND: { windowMs: 60_000, maxRequests: 30 },     // 30 messages per minute
    TICKET_CREATE: { windowMs: 300_000, maxRequests: 10 },   // 10 tickets per 5 minutes
    REPORT_CREATE: { windowMs: 3600_000, maxRequests: 5 },   // 5 reports per hour
};

// ==========================================
// AUTH UTILITIES
// ==========================================
export { getCurrentUser };

export async function requireUser(ctx: IdentityCtx, options?: RequireUserOptions) {
    return await requireCurrentUser(ctx, options);
}

export async function requireAdmin(ctx: IdentityCtx) {
    return await requireCurrentAdmin(ctx);
}

// ==========================================
// AUDIT LOGGING
// ==========================================
export async function logAudit(
    ctx: MutationCtx,
    args: {
        action: string;
        actorId?: Id<"users">;
        targetId?: Id<"users">;
        targetType?: "user" | "ticket" | "offer" | "review" | "crash_course" | "tutor_credential" | "report";
        details?: unknown;
    }
) {
    await writeAuditEntry(ctx, args);
}
