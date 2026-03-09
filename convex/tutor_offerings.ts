import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isUserVerified } from "./trust";
import { getCurrentUser, requireUser } from "./utils";

// Add a course the tutor can help with
export const add = mutation({
    args: {
        courseId: v.optional(v.id("university_courses")),
        customSubject: v.optional(v.string()),
        category: v.union(
            v.literal("university"),
            v.literal("o_levels"),
            v.literal("a_levels"),
            v.literal("sat"),
            v.literal("ib"),
            v.literal("ap"),
            v.literal("general"),
        ),
        universityId: v.optional(v.id("universities")),
        level: v.union(
            v.literal("beginner"),
            v.literal("intermediate"),
            v.literal("advanced"),
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        if (!args.courseId && !args.customSubject) {
            throw new Error("Either courseId or customSubject must be provided");
        }

        // Check if already exists (by courseId or by customSubject+category)
        if (args.courseId) {
            const existing = await ctx.db
                .query("tutor_offerings")
                .withIndex("by_tutor", (q) => q.eq("tutorId", user._id))
                .filter((q) => q.eq(q.field("courseId"), args.courseId))
                .first();
            if (existing) throw new Error("You already offer this course");
        }

        return await ctx.db.insert("tutor_offerings", {
            tutorId: user._id,
            courseId: args.courseId,
            customSubject: args.customSubject,
            category: args.category,
            universityId: args.universityId,
            level: args.level,
        });
    },
});

// Remove a course offering
export const remove = mutation({
    args: { offeringId: v.id("tutor_offerings") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const offering = await ctx.db.get(args.offeringId);

        if (!offering) throw new Error("Offering not found");
        if (offering.tutorId !== user._id) throw new Error("Unauthorized");

        await ctx.db.delete(args.offeringId);
    },
});

// Update a course offering level
export const update = mutation({
    args: {
        offeringId: v.id("tutor_offerings"),
        level: v.union(
            v.literal("beginner"),
            v.literal("intermediate"),
            v.literal("advanced"),
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const offering = await ctx.db.get(args.offeringId);

        if (!offering) throw new Error("Offering not found");
        if (offering.tutorId !== user._id) throw new Error("Unauthorized");

        await ctx.db.patch(args.offeringId, { level: args.level });
    },
});

// Get my offerings
export const listMyOfferings = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const offerings = await ctx.db
            .query("tutor_offerings")
            .withIndex("by_tutor", (q) => q.eq("tutorId", user._id))
            .collect();

        // Enrich with course info
        return await Promise.all(
            offerings.map(async (offering) => {
                const course = offering.courseId ? await ctx.db.get(offering.courseId) : null;
                return {
                    ...offering,
                    courseCode: course?.code,
                    courseName: course?.name,
                    courseDepartment: course?.department,
                };
            })
        );
    },
});

// Get offerings for a specific tutor (public)
export const listByTutor = query({
    args: { tutorId: v.id("users") },
    handler: async (ctx, args) => {
        const offerings = await ctx.db
            .query("tutor_offerings")
            .withIndex("by_tutor", (q) => q.eq("tutorId", args.tutorId))
            .collect();

        return await Promise.all(
            offerings.map(async (offering) => {
                const course = offering.courseId ? await ctx.db.get(offering.courseId) : null;
                return {
                    ...offering,
                    courseCode: course?.code,
                    courseName: course?.name,
                    courseDepartment: course?.department,
                };
            })
        );
    },
});

// Get tutors for a specific course
export const listByCourse = query({
    args: { courseId: v.id("university_courses") },
    handler: async (ctx, args) => {
        const offerings = await ctx.db
            .query("tutor_offerings")
            .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
            .collect();

        return await Promise.all(
            offerings.map(async (offering) => {
                const tutor = await ctx.db.get(offering.tutorId);
                return {
                    ...offering,
                    tutorName: tutor?.name,
                    tutorImage: tutor?.image,
                    tutorIsVerified: tutor ? isUserVerified(tutor) : false,
                };
            })
        );
    },
});
