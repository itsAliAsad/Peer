import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getOrCreateConversationBetweenUsers } from "./conversations";
import { notifyOfferAccepted, notifyOfferReceived } from "./notification_service";
import { RATE_LIMITS } from "./utils";

export async function createOfferWorkflow(
    ctx: MutationCtx,
    args: {
        ticketId: Id<"tickets">;
        price: number;
        user: Doc<"users">;
    }
) {
    if (args.price <= 0) {
        throw new Error("Price must be positive");
    }
    if (args.price > 1_000_000) {
        throw new Error("Price exceeds maximum allowed");
    }

    const { windowMs, maxRequests } = RATE_LIMITS.OFFER_CREATE;
    const recentOffers = await ctx.db
        .query("offers")
        .withIndex("by_tutor", (q) => q.eq("tutorId", args.user._id))
        .filter((q) => q.gt(q.field("_creationTime"), Date.now() - windowMs))
        .collect();

    if (recentOffers.length >= maxRequests) {
        throw new Error("Rate limited: Too many offers. Please wait before submitting more.");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.status !== "open") {
        throw new Error("Ticket not available");
    }
    if (args.user._id === ticket.studentId) {
        throw new Error("You cannot submit an offer to your own request");
    }

    const existingOffer = await ctx.db
        .query("offers")
        .withIndex("by_ticket_and_tutor", (q) =>
            q.eq("ticketId", args.ticketId).eq("tutorId", args.user._id)
        )
        .unique();
    if (existingOffer) {
        throw new Error("You have already placed an offer");
    }

    const offerId = await ctx.db.insert("offers", {
        ticketId: args.ticketId,
        studentId: ticket.studentId,
        tutorId: args.user._id,
        price: args.price,
        status: "pending",
    });

    await notifyOfferReceived(ctx, ticket.studentId, {
        ticketId: args.ticketId,
        offerId,
    });

    return offerId;
}

export async function acceptOfferWorkflow(
    ctx: MutationCtx,
    args: {
        offerId: Id<"offers">;
        ticketId: Id<"tickets">;
        studentId: Id<"users">;
    }
) {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
        throw new Error("Ticket not found");
    }
    if (ticket.studentId !== args.studentId) {
        throw new Error("Unauthorized");
    }

    const offerToAccept = await ctx.db.get(args.offerId);
    if (!offerToAccept) {
        throw new Error("Offer not found");
    }
    if (offerToAccept.ticketId !== args.ticketId) {
        throw new Error("Offer does not belong to this ticket");
    }

    await ctx.db.patch(args.offerId, { status: "accepted" });

    await ctx.db.patch(args.ticketId, {
        status: "in_session",
        assignedTutorId: offerToAccept.tutorId,
    });

    const otherOffers = await ctx.db
        .query("offers")
        .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
        .collect();

    await Promise.all(
        otherOffers
            .filter((offer) => offer._id !== args.offerId && offer.status !== "rejected")
            .map((offer) => ctx.db.patch(offer._id, { status: "rejected" }))
    );

    await getOrCreateConversationBetweenUsers(
        ctx,
        args.studentId,
        offerToAccept.tutorId
    );

    await notifyOfferAccepted(ctx, offerToAccept.tutorId, {
        ticketId: args.ticketId,
        offerId: args.offerId,
    });

    return offerToAccept;
}
