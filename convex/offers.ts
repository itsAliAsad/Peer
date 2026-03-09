import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    listMyOffersReadModel,
    listOffersBetweenUsersReadModel,
    listOffersByTicketReadModel,
    listOffersForBuyerReadModel,
} from "./offer_read_models";
import { acceptOfferWorkflow, createOfferWorkflow } from "./offer_workflows";
import { getCurrentUser, requireUser } from "./utils";

export const create = mutation({
    args: {
        ticketId: v.id("tickets"),
        price: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await createOfferWorkflow(ctx, { ...args, user });
    },
});

// Primary function with new name
export const listByTicket = query({
    args: { ticketId: v.id("tickets") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        return await listOffersByTicketReadModel(ctx, {
            ticketId: args.ticketId,
            viewerId: user._id,
        });
    },

});

// Backward compat alias
export const listByRequest = query({
    args: { requestId: v.id("tickets") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        return await listOffersByTicketReadModel(ctx, {
            ticketId: args.requestId,
            viewerId: user._id,
        });
    },
});

export const accept = mutation({
    args: {
        offerId: v.id("offers"),
        ticketId: v.optional(v.id("tickets")),
        requestId: v.optional(v.id("tickets")), // Legacy alias
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        // Support both ticketId and requestId for backward compat
        const resolvedTicketId = args.ticketId || args.requestId;
        if (!resolvedTicketId) throw new Error("ticketId is required");

        await acceptOfferWorkflow(ctx, {
            offerId: args.offerId,
            ticketId: resolvedTicketId,
            studentId: user._id,
        });
    },
});

export const listMyOffers = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];
        return await listMyOffersReadModel(ctx, user._id);
    },
});

export const listBetweenUsers = query({
    args: { otherUserId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        return await listOffersBetweenUsersReadModel(ctx, {
            userId: user._id,
            otherUserId: args.otherUserId,
        });
    },
});

export const listOffersForBuyer = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        return await listOffersForBuyerReadModel(ctx, user._id);
    },
});
