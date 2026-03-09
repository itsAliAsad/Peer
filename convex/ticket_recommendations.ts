import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { getTutorProfileByUserId } from "./tutor_profile_service";

export async function listRecommendedTicketsForTutor(
    ctx: QueryCtx,
    user: Doc<"users">
) {
    const offerings = await ctx.db
        .query("tutor_offerings")
        .withIndex("by_tutor", (q) => q.eq("tutorId", user._id))
        .collect();

    const tutorProfile = await getTutorProfileByUserId(ctx, user._id);
    const allowedHelpTypes = tutorProfile?.settings?.allowedHelpTypes || [];
    const courseIds = offerings.flatMap((offering) =>
        offering.courseId ? [offering.courseId] : []
    );
    const tutorUniversityId = user.universityId;

    const allOpenTickets = await ctx.db
        .query("tickets")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .order("desc")
        .collect();

    const scoredTickets = allOpenTickets
        .map((ticket) => {
            let score = 0;
            let universityMatch = false;

            if (tutorUniversityId) {
                if (!ticket.universityId) {
                    score += 0.3;
                } else if (ticket.universityId === tutorUniversityId) {
                    score += 1.5;
                    universityMatch = true;
                } else {
                    score += 0.1;
                }
            } else {
                score += 0.5;
            }

            if (!ticket.courseId) {
                score += 0.7;
            } else if (courseIds.length > 0 && courseIds.includes(ticket.courseId)) {
                score += 1.0;
            } else if (courseIds.length === 0) {
                score += 0.5;
            } else if (!universityMatch && tutorUniversityId) {
                return null;
            }

            if (
                allowedHelpTypes.length > 0 &&
                !allowedHelpTypes.includes(ticket.helpType)
            ) {
                return null;
            }

            if (ticket.urgency === "high") score += 0.2;
            else if (ticket.urgency === "medium") score += 0.1;

            const hoursOld = (Date.now() - ticket.createdAt) / 3600000;
            if (hoursOld < 2) score += 0.15;
            else if (hoursOld < 6) score += 0.1;
            else if (hoursOld < 24) score += 0.05;

            return { ...ticket, _score: score };
        })
        .filter(
            (
                ticket
            ): ticket is (typeof allOpenTickets)[number] & { _score: number } =>
                ticket !== null
        );

    scoredTickets.sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return b.createdAt - a.createdAt;
    });

    return scoredTickets.slice(0, 15).map((ticket) => {
        const { _score, ...rest } = ticket;
        void _score;
        return rest;
    });
}
