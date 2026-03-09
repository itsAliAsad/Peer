import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { setVerificationTier } from "./trust";
import { requireAdmin, logAudit } from "./utils";

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        const usersCount = (await ctx.db.query("users").collect()).length;
        const ticketsCount = (await ctx.db.query("tickets").collect()).length;
        const reportsCount = (await ctx.db.query("reports").collect()).length;

        return {
            usersCount,
            requestsCount: ticketsCount, // Backward compat for frontend
            reportsCount,
        };
    },
});

export const getReports = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("reports").order("desc").collect();
    },
});

export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("users").order("desc").collect();
    },
});

export const banUser = mutation({
    args: { userId: v.id("users"), isBanned: v.boolean(), banReason: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        await ctx.db.patch(args.userId, { 
            bannedAt: args.isBanned ? Date.now() : undefined,
            banReason: args.isBanned ? args.banReason : undefined,
        });

        // Audit log
        await logAudit(ctx, {
            action: args.isBanned ? "user_banned" : "user_unbanned",
            actorId: admin._id,
            targetId: args.userId,
            targetType: "user",
            details: { reason: args.banReason },
        });
    },
});

export const createAnnouncement = mutation({
    args: { title: v.string(), content: v.string() },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        const announcementId = await ctx.db.insert("announcements", {
            title: args.title,
            content: args.content,
            isActive: true,
            createdAt: Date.now(),
        });

        await logAudit(ctx, {
            action: "announcement_created",
            actorId: admin._id,
            details: { announcementId, title: args.title },
        });
    },
});

export const getAnnouncements = query({
    args: {},
    handler: async (ctx) => {
        // Publicly accessible
        return await ctx.db
            .query("announcements")
            .withIndex("by_active", (q) => q.eq("isActive", true))
            .order("desc")
            .collect();
    },
});

export const listAnnouncements = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);
        return await ctx.db.query("announcements").order("desc").collect();
    },
});

export const setAnnouncementStatus = mutation({
    args: { id: v.id("announcements"), isActive: v.boolean() },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        await ctx.db.patch(args.id, { isActive: args.isActive });

        await logAudit(ctx, {
            action: args.isActive ? "announcement_activated" : "announcement_deactivated",
            actorId: admin._id,
            details: { announcementId: args.id },
        });
    },
});

export const setVerification = mutation({
    args: { userId: v.id("users"), isVerified: v.boolean() },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        await setVerificationTier(ctx, {
            userId: args.userId,
            verificationTier: args.isVerified ? "academic" : "none",
            verifiedBy: args.isVerified ? admin._id : undefined,
            verifiedAt: args.isVerified ? Date.now() : undefined,
        });

        await logAudit(ctx, {
            action: args.isVerified ? "user_verified" : "user_unverified",
            actorId: admin._id,
            targetId: args.userId,
            targetType: "user",
        });
    },
});

export const setAdmin = mutation({
    args: { userId: v.id("users"), isAdmin: v.boolean() },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        await ctx.db.patch(args.userId, { role: args.isAdmin ? "admin" : "student" });

        await logAudit(ctx, {
            action: args.isAdmin ? "admin_granted" : "admin_revoked",
            actorId: admin._id,
            targetId: args.userId,
            targetType: "user",
        });
    },
});

export const resolveReport = mutation({
    args: { 
        reportId: v.id("reports"), 
        status: v.union(v.literal("resolved"), v.literal("dismissed")),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);
        const report = await ctx.db.get(args.reportId);
        
        await ctx.db.patch(args.reportId, { status: args.status });

        await logAudit(ctx, {
            action: `report_${args.status}`,
            actorId: admin._id,
            targetId: report?.targetId,
            targetType: "report",
            details: { reportId: args.reportId, notes: args.notes },
        });
    },
});

export const getAuditLogs = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const logs = await ctx.db
            .query("audit_logs")
            .order("desc")
            .take(args.limit || 100);

        // Enrich with actor info
        return await Promise.all(
            logs.map(async (log) => {
                const actor = log.actorId ? await ctx.db.get(log.actorId) : null;
                return {
                    ...log,
                    actorName: actor?.name,
                    actorEmail: actor?.email,
                };
            })
        );
    },
});
