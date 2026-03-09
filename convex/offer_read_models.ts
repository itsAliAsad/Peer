import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { buildOfferRanking } from "./offer_ranking";
import { getTutorProfileByUserId } from "./tutor_profile_service";

function addLegacyAliases<T extends { ticketId: Id<"tickets">; tutorId: Id<"users"> }>(
    offer: T
) {
    return {
        ...offer,
        tutorId: offer.tutorId,
        sellerId: offer.tutorId,
        requestId: offer.ticketId,
    };
}

export async function listOffersByTicketReadModel(
    ctx: QueryCtx,
    args: {
        ticketId: Id<"tickets">;
        viewerId: Id<"users">;
    }
) {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return [];

    const allOffers = await ctx.db
        .query("offers")
        .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
        .collect();

    const visibleOffers =
        args.viewerId === ticket.studentId
            ? allOffers
            : allOffers.filter((offer) => offer.tutorId === args.viewerId);

    const maxPrice = Math.max(...visibleOffers.map((offer) => offer.price), 1);

    const enriched = await Promise.all(
        visibleOffers.map(async (offer) => {
            const tutor = await ctx.db.get(offer.tutorId);
            const tutorProfile = await getTutorProfileByUserId(ctx, offer.tutorId);
            const tutorOfferings = await ctx.db
                .query("tutor_offerings")
                .withIndex("by_tutor", (q) => q.eq("tutorId", offer.tutorId))
                .collect();

            let tutorLevel: string | undefined;
            let hasCourseExpertise = false;
            if (ticket.courseId) {
                const specificOffering = tutorOfferings.find(
                    (offering) => offering.courseId === ticket.courseId
                );
                tutorLevel = specificOffering?.level;
                hasCourseExpertise = Boolean(specificOffering);
            }

            const offeringCourses = await Promise.all(
                tutorOfferings.map((offering) =>
                    offering.courseId ? ctx.db.get(offering.courseId) : Promise.resolve(null)
                )
            );
            const completedJobs = (
                await ctx.db
                    .query("offers")
                    .withIndex("by_tutor", (q) => q.eq("tutorId", offer.tutorId))
                    .filter((q) => q.eq(q.field("status"), "accepted"))
                    .collect()
            ).length;

            const ranking = buildOfferRanking({
                ticket,
                offer,
                tutor,
                tutorProfile,
                offeringCourses,
                tutorLevel,
                hasCourseExpertise,
                completedJobs,
                maxPrice,
            });

            return {
                ...addLegacyAliases(offer),
                tutorName: tutor?.name,
                sellerName: tutor?.name,
                tutorBio: tutorProfile?.bio,
                ...ranking,
            };
        })
    );

    return enriched.sort((a, b) => b.rankScore - a.rankScore);
}

export async function listMyOffersReadModel(
    ctx: QueryCtx,
    tutorId: Id<"users">
) {
    const offers = await ctx.db
        .query("offers")
        .withIndex("by_tutor", (q) => q.eq("tutorId", tutorId))
        .collect();

    return await Promise.all(
        offers.map(async (offer) => {
            const ticket = await ctx.db.get(offer.ticketId);
            return {
                ...addLegacyAliases(offer),
                requestTitle: ticket?.title || "Unknown Ticket",
                requestStatus: ticket?.status,
                requestDeadline: ticket?.deadline,
            };
        })
    );
}

export async function listOffersBetweenUsersReadModel(
    ctx: QueryCtx,
    args: {
        userId: Id<"users">;
        otherUserId: Id<"users">;
    }
) {
    const iAmStudent = await ctx.db
        .query("offers")
        .filter((q) =>
            q.and(
                q.eq(q.field("studentId"), args.userId),
                q.eq(q.field("tutorId"), args.otherUserId)
            )
        )
        .collect();

    const iAmTutor = await ctx.db
        .query("offers")
        .filter((q) =>
            q.and(
                q.eq(q.field("studentId"), args.otherUserId),
                q.eq(q.field("tutorId"), args.userId)
            )
        )
        .collect();

    return await Promise.all(
        [...iAmStudent, ...iAmTutor].map(async (offer) => {
            const ticket = await ctx.db.get(offer.ticketId);
            return {
                ...addLegacyAliases(offer),
                requestTitle: ticket?.title,
                requestDescription: ticket?.description,
            };
        })
    );
}

export async function listOffersForBuyerReadModel(
    ctx: QueryCtx,
    buyerId: Id<"users">
) {
    const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_student", (q) => q.eq("studentId", buyerId))
        .collect();

    if (tickets.length === 0) {
        return [];
    }

    const offers = await Promise.all(
        tickets.map(async (ticket) => {
            const ticketOffers = await ctx.db
                .query("offers")
                .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
                .collect();

            return ticketOffers.map((offer) => ({
                ...addLegacyAliases(offer),
                requestTitle: ticket.title,
            }));
        })
    );

    return offers.flat();
}
