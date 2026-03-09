import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { notifyTicketResolved } from "./notification_service";
import { INPUT_LIMITS, RATE_LIMITS, validateLength } from "./utils";

type TicketHelpType =
    | "debugging"
    | "concept"
    | "exam_prep"
    | "review"
    | "assignment"
    | "project"
    | "mentorship"
    | "interview_prep"
    | "other";

export async function createTicketWorkflow(
    ctx: MutationCtx,
    args: {
        user: Doc<"users">;
        courseId?: Id<"university_courses">;
        customCategory?: string;
        universityId?: Id<"universities">;
        title: string;
        description: string;
        urgency: "low" | "medium" | "high";
        helpType: TicketHelpType;
        budget?: number;
        deadline?: number;
    }
) {
    validateLength(args.title, INPUT_LIMITS.TITLE_MAX, "Title");
    validateLength(args.description, INPUT_LIMITS.DESCRIPTION_MAX, "Description");
    if (args.customCategory) {
        validateLength(args.customCategory, 100, "Category");
    }
    if (args.budget !== undefined && (args.budget < 0 || args.budget > 1_000_000)) {
        throw new Error("Budget must be between 0 and 1,000,000");
    }

    const { windowMs, maxRequests } = RATE_LIMITS.TICKET_CREATE;
    const recentTickets = await ctx.db
        .query("tickets")
        .withIndex("by_student", (q) => q.eq("studentId", args.user._id))
        .filter((q) => q.gt(q.field("_creationTime"), Date.now() - windowMs))
        .collect();

    if (recentTickets.length >= maxRequests) {
        throw new Error("Rate limited: Too many requests. Please wait before creating more.");
    }

    if (!args.courseId && !args.customCategory) {
        throw new Error("Either a course or custom category must be specified");
    }

    let department: string | undefined;
    if (args.courseId) {
        const course = await ctx.db.get(args.courseId);
        if (course) {
            department = course.department;
        }
    }

    let universityId = args.universityId;
    if (!universityId && args.user.universityId) {
        universityId = args.user.universityId;
    }

    return await ctx.db.insert("tickets", {
        studentId: args.user._id,
        courseId: args.courseId,
        customCategory: args.customCategory,
        universityId,
        department,
        title: args.title,
        description: args.description,
        status: "open",
        urgency: args.urgency,
        helpType: args.helpType,
        budget: args.budget,
        deadline: args.deadline,
        createdAt: Date.now(),
    });
}

export async function completeTicketWorkflow(
    ctx: MutationCtx,
    args: {
        ticketId: Id<"tickets">;
        studentId: Id<"users">;
    }
) {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.studentId !== args.studentId) throw new Error("Unauthorized");

    await ctx.db.patch(args.ticketId, { status: "resolved" });

    const acceptedOffer = await ctx.db
        .query("offers")
        .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .first();

    if (acceptedOffer) {
        await notifyTicketResolved(ctx, acceptedOffer.tutorId, {
            ticketId: args.ticketId,
        });
    }
}
