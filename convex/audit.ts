import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export interface AuditEntryArgs {
    action: string;
    actorId?: Id<"users">;
    targetId?: Id<"users">;
    targetType?:
        | "user"
        | "ticket"
        | "offer"
        | "review"
        | "crash_course"
        | "tutor_credential"
        | "report";
    details?: unknown;
}

export async function writeAuditEntry(ctx: MutationCtx, args: AuditEntryArgs) {
    await ctx.db.insert("audit_logs", {
        ...args,
        createdAt: Date.now(),
    });
}
