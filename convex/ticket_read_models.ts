import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getUserReputation, isUserVerified } from "./trust";

async function resolveAssignedTutorId(
    ctx: QueryCtx,
    ticket: {
        _id: Id<"tickets">;
        assignedTutorId?: Id<"users">;
        status: string;
    }
) {
    let assignedTutorId = ticket.assignedTutorId;

    if (
        !assignedTutorId &&
        (ticket.status === "in_session" ||
            ticket.status === "in_progress" ||
            ticket.status === "resolved")
    ) {
        const offer = await ctx.db
            .query("offers")
            .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .first();
        if (offer) {
            assignedTutorId = offer.tutorId;
        }
    }

    return assignedTutorId;
}

async function buildStudentSummary(ctx: QueryCtx, studentId: Id<"users">) {
    const student = await ctx.db.get(studentId);
    if (!student) {
        return undefined;
    }

    return {
        _id: student._id,
        name: student.name,
        image: student.image,
        universityName: student.universityId
            ? (await ctx.db.get(student.universityId))?.name
            : undefined,
        isVerified: isUserVerified(student),
        reputation: getUserReputation(student),
    };
}

export async function listMyTicketReadModels(
    ctx: QueryCtx,
    studentId: Id<"users">
) {
    const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .order("desc")
        .collect();

    return await Promise.all(
        tickets.map(async (ticket) => ({
            ...ticket,
            assignedTutorId: await resolveAssignedTutorId(ctx, ticket),
        }))
    );
}

export async function listOpenTicketReadModels(
    ctx: QueryCtx,
    args: {
        category?: string;
        helpType?: string;
        department?: string;
        universityId?: Id<"universities">;
        showAll?: boolean;
    }
) {
    let results;

    if (args.universityId && !args.showAll && !args.department) {
        results = await ctx.db
            .query("tickets")
            .withIndex("by_university", (q) =>
                q.eq("universityId", args.universityId).eq("status", "open")
            )
            .order("desc")
            .collect();
    } else if (args.department && args.department !== "all") {
        results = await ctx.db
            .query("tickets")
            .withIndex("by_department", (q) =>
                q.eq("department", args.department).eq("status", "open")
            )
            .order("desc")
            .collect();

        if (args.universityId && !args.showAll) {
            results = results.filter((ticket) => ticket.universityId === args.universityId);
        }
    } else {
        results = await ctx.db
            .query("tickets")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .order("desc")
            .collect();

        if (args.universityId && !args.showAll) {
            results = results.filter(
                (ticket) =>
                    !ticket.universityId || ticket.universityId === args.universityId
            );
        }
    }

    if (args.helpType && args.helpType !== "all") {
        results = results.filter((ticket) => ticket.helpType === args.helpType);
    }
    if (args.category && args.category !== "all") {
        results = results.filter((ticket) => ticket.helpType === args.category);
    }

    return results;
}

export async function getTicketReadModel(ctx: QueryCtx, ticketId: Id<"tickets">) {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;

    return {
        ...ticket,
        student: await buildStudentSummary(ctx, ticket.studentId),
    };
}

export async function searchTicketReadModels(
    ctx: QueryCtx,
    args: {
        query: string;
        category?: string;
        helpType?: string;
        department?: string;
        universityId?: Id<"universities">;
        showAll?: boolean;
    }
) {
    let results = await ctx.db
        .query("tickets")
        .withSearchIndex("search_title_description", (q) =>
            q.search("title", args.query)
        )
        .collect();

    results = results.filter((ticket) => ticket.status === "open");

    if (args.universityId && !args.showAll) {
        results = results.filter(
            (ticket) =>
                !ticket.universityId || ticket.universityId === args.universityId
        );
    }

    if (args.department && args.department !== "all") {
        results = results.filter((ticket) => ticket.department === args.department);
    }

    const filterType = args.helpType || args.category;
    if (filterType && filterType !== "all") {
        results = results.filter((ticket) => ticket.helpType === filterType);
    }

    return results;
}
