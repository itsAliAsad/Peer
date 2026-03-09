import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { listRecommendedTicketsForTutor } from "./ticket_recommendations";
import {
    getTicketReadModel,
    listMyTicketReadModels,
    listOpenTicketReadModels,
    searchTicketReadModels,
} from "./ticket_read_models";
import { completeTicketWorkflow, createTicketWorkflow } from "./ticket_workflows";
import { getCurrentUser, requireUser } from "./utils";

export const create = mutation({
    args: {
        // Course is now optional for general requests
        courseId: v.optional(v.id("university_courses")),
        customCategory: v.optional(v.string()), // For non-course requests
        universityId: v.optional(v.id("universities")), // Scoping: null = open to all
        title: v.string(),
        description: v.string(),
        urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        helpType: v.union(
            v.literal("debugging"),
            v.literal("concept"),
            v.literal("exam_prep"),
            v.literal("review"),
            v.literal("assignment"),
            v.literal("project"),
            v.literal("mentorship"),
            v.literal("interview_prep"),
            v.literal("other"),
        ),
        budget: v.optional(v.number()),
        deadline: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await createTicketWorkflow(ctx, { ...args, user });
    },
});

// Alias for compatibility with old frontend code
export const listMyRequests = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        return await listMyTicketReadModels(ctx, user._id);
    },
});

export const listMyTickets = listMyRequests; // Alias

export const listOpen = query({
    args: {
        category: v.optional(v.string()),
        helpType: v.optional(v.string()),
        department: v.optional(v.string()),
        universityId: v.optional(v.id("universities")), // filter to specific university
        showAll: v.optional(v.boolean()),               // override university filter
    },
    handler: async (ctx, args) => {
        return await listOpenTicketReadModels(ctx, args);
    },
});

export const get = query({
    args: { id: v.id("tickets") },
    handler: async (ctx, args) => {
        return await getTicketReadModel(ctx, args.id);
    },
});

export const complete = mutation({
    args: { id: v.id("tickets") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        await completeTicketWorkflow(ctx, {
            ticketId: args.id,
            studentId: user._id,
        });
    },
});

export const search = query({
    args: {
        query: v.string(),
        category: v.optional(v.string()),
        helpType: v.optional(v.string()),
        department: v.optional(v.string()),
        universityId: v.optional(v.id("universities")),
        showAll: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await searchTicketReadModels(ctx, args);
    },
});

// New: List by department
export const listByDepartment = query({
    args: { department: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tickets")
            .withIndex("by_department", (q) =>
                q.eq("department", args.department).eq("status", "open")
            )
            .order("desc")
            .collect();
    },
});

// New: Get history between student and tutor
export const getHistoryWithTutor = query({
    args: { tutorId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        return await ctx.db
            .query("tickets")
            .withIndex("by_student_and_tutor", (q) =>
                q.eq("studentId", user._id).eq("assignedTutorId", args.tutorId)
            )
            .order("desc")
            .collect();
    },
});

// Get fresh matching jobs for tutor dashboard
export const matchingRecentJobs = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        return await listRecommendedTicketsForTutor(ctx, user);
    },
});

// Alias for new naming (can be used in frontend)
export const getRecommendedJobs = matchingRecentJobs;

// Public aggregate stats for the /teach landing page — no auth required
export const getPublicStats = query({
    args: {},
    handler: async (ctx) => {
        const openTickets = await ctx.db
            .query("tickets")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .collect();

        const resolvedTickets = await ctx.db
            .query("tickets")
            .withIndex("by_status", (q) => q.eq("status", "resolved"))
            .collect();

        const allUsers = await ctx.db.query("users").collect();
        const activeTutors = allUsers.filter(
            (u) => u.role === "tutor" && !u.bannedAt && !u.deletedAt
        ).length;

        return {
            openTickets: openTickets.length,
            resolvedTickets: resolvedTickets.length,
            activeTutors,
        };
    },
});
