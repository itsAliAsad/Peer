import type { Doc } from "./_generated/dataModel";
import { getUserReputation, isUserVerified } from "./trust";

export function buildOfferRanking(args: {
    ticket: Doc<"tickets">;
    offer: Doc<"offers">;
    tutor?: Doc<"users"> | null;
    tutorProfile?: Doc<"tutor_profiles"> | null;
    offeringCourses: ({ department?: string; code?: string } | null)[];
    tutorLevel?: string;
    hasCourseExpertise: boolean;
    completedJobs: number;
    maxPrice: number;
}) {
    let matchPercent = 0;

    if (args.hasCourseExpertise) matchPercent += 40;
    if (args.tutorLevel === "Expert") matchPercent += 15;
    else if (args.tutorLevel === "Intermediate") matchPercent += 10;

    const hasRelatedCourses = Boolean(
        args.ticket.department &&
            args.offeringCourses.some(
                (course) => course?.department === args.ticket.department
            )
    );
    if (hasRelatedCourses) matchPercent += 10;

    if (args.tutor && isUserVerified(args.tutor)) matchPercent += 10;

    const now = Date.now();
    const isOnline = args.tutorProfile?.isOnline ?? false;
    const lastActiveAt = args.tutorProfile?.lastActiveAt ?? 0;
    const activeIn24h = now - lastActiveAt < 24 * 60 * 60 * 1000;
    if (isOnline) matchPercent += 15;
    else if (activeIn24h) matchPercent += 8;

    if (args.completedJobs >= 10) matchPercent += 10;
    else if (args.completedJobs >= 5) matchPercent += 5;

    const tutorReputation = args.tutor ? getUserReputation(args.tutor) : 0;
    const priceScore = 100 - (args.offer.price / Math.max(args.maxPrice, 1)) * 100;
    const rankScore =
        (tutorReputation / 5) * 100 * 0.4 + matchPercent * 0.35 + priceScore * 0.25;

    return {
        tutorLevel: args.tutorLevel,
        tutorCourses: args.offeringCourses
            .map((course) => course?.code)
            .filter((code): code is string => Boolean(code))
            .slice(0, 3),
        tutorReputation,
        completedJobs: args.completedJobs,
        isOnline,
        lastActiveAt,
        matchPercent,
        rankScore,
        sellerIsVerified: Boolean(args.tutor && isUserVerified(args.tutor)),
    };
}
