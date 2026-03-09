import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { applyReviewToUser } from "./trust";
import { requireUser, INPUT_LIMITS, validateLength } from "./utils";

export const create = mutation({
    args: {
        ticketId: v.id("tickets"),
        rating: v.number(),
        comment: v.optional(v.string()),
        type: v.union(v.literal("student_to_tutor"), v.literal("tutor_to_student")),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        // Input validation
        if (args.rating < 1 || args.rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }
        if (args.comment) {
            validateLength(args.comment, INPUT_LIMITS.COMMENT_MAX, "Comment");
        }

        const ticket = await ctx.db.get(args.ticketId);
        if (!ticket) throw new Error("Ticket not found");

        const acceptedOffer = await ctx.db
            .query("offers")
            .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .unique();

        if (!acceptedOffer) throw new Error("No accepted offer found for this ticket");

        let revieweeId;
        if (args.type === "student_to_tutor") {
            if (user._id !== ticket.studentId) {
                throw new Error("Only the student can review the tutor");
            }
            revieweeId = acceptedOffer.tutorId;
        } else {
            if (user._id !== acceptedOffer.tutorId) {
                throw new Error("Only the accepted tutor can review the student");
            }
            if (ticket.status !== "resolved") {
                throw new Error("Reviews from tutors are allowed after resolution");
            }
            revieweeId = ticket.studentId;
        }

        const existing = await ctx.db
            .query("reviews")
            .withIndex("by_reviewee", (q) => q.eq("revieweeId", revieweeId))
            .filter((q) => q.eq(q.field("ticketId"), args.ticketId))
            .filter((q) => q.eq(q.field("reviewerId"), user._id))
            .filter((q) => q.eq(q.field("type"), args.type))
            .first();

        if (existing) {
            throw new Error("You have already submitted this review");
        }

        await ctx.db.insert("reviews", {
            reviewerId: user._id,
            revieweeId,
            ticketId: args.ticketId,
            rating: args.rating,
            comment: args.comment,
            createdAt: Date.now(),
            type: args.type,
        });

        await applyReviewToUser(ctx, revieweeId, args.rating);
    },
});
