import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export async function getCrashCourseReadModel(
    ctx: QueryCtx,
    crashCourseId: Id<"crash_courses">
) {
    const crashCourse = await ctx.db.get(crashCourseId);
    if (!crashCourse || crashCourse.deletedAt) return null;

    const creator = await ctx.db.get(crashCourse.creatorId);
    const course = crashCourse.courseId ? await ctx.db.get(crashCourse.courseId) : null;
    const tutor = crashCourse.selectedTutorId
        ? await ctx.db.get(crashCourse.selectedTutorId)
        : null;

    let tutorProfile = null;
    if (tutor) {
        tutorProfile = await ctx.db
            .query("tutor_profiles")
            .withIndex("by_user", (q) => q.eq("userId", tutor._id))
            .first();
    }

    return {
        ...crashCourse,
        creator: creator ? { _id: creator._id, name: creator.name, image: creator.image } : null,
        course: course
            ? { _id: course._id, code: course.code, name: course.name, department: course.department }
            : null,
        tutor: tutor
            ? {
                _id: tutor._id,
                name: tutor.name,
                image: tutor.image,
                reputation: tutor.reputation,
                isVerified:
                    tutor.verificationTier === "academic" ||
                    tutor.verificationTier === "expert",
                isOnline: tutorProfile?.isOnline ?? false,
            }
            : null,
    };
}

export async function listCrashCourseReadModels(
    ctx: QueryCtx,
    args: {
        origin?: "demand" | "supply";
        department?: string;
        category?: "o_levels" | "a_levels" | "sat" | "ib" | "ap" | "general";
        examType?: "quiz" | "midterm" | "final" | "other";
        status?: string;
    }
) {
    let results;

    if (args.category && args.status) {
        results = await ctx.db
            .query("crash_courses")
            .withIndex("by_category", (q) =>
                q.eq("category", args.category!).eq("status", args.status as never)
            )
            .collect();
    } else if (args.category) {
        results = await ctx.db
            .query("crash_courses")
            .withIndex("by_category", (q) => q.eq("category", args.category!) as never)
            .collect();
    } else if (args.department && args.status) {
        results = await ctx.db
            .query("crash_courses")
            .withIndex("by_department", (q) =>
                q.eq("department", args.department!).eq("status", args.status as never)
            )
            .collect();
    } else if (args.status) {
        results = await ctx.db
            .query("crash_courses")
            .withIndex("by_status", (q) => q.eq("status", args.status as never))
            .collect();
    } else {
        results = await ctx.db.query("crash_courses").collect();
    }

    if (args.origin) {
        results = results.filter((course) => course.origin === args.origin);
    }
    if (args.department && !args.category) {
        results = results.filter((course) => course.department === args.department);
    }
    if (args.examType) {
        results = results.filter((course) => course.examType === args.examType);
    }

    results = results
        .filter((course) => !course.deletedAt && course.status !== "cancelled")
        .sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
        results.slice(0, 50).map(async (courseRecord) => {
            const course = courseRecord.courseId
                ? await ctx.db.get(courseRecord.courseId)
                : null;
            const creator = await ctx.db.get(courseRecord.creatorId);

            let applicationCount = 0;
            if (courseRecord.origin === "demand") {
                const applications = await ctx.db
                    .query("crash_course_applications")
                    .withIndex("by_crash_course", (q) =>
                        q.eq("crashCourseId", courseRecord._id)
                    )
                    .filter((q) => q.eq(q.field("status"), "pending"))
                    .collect();
                applicationCount = applications.length;
            }

            return {
                ...courseRecord,
                course: course ? { code: course.code, name: course.name } : null,
                creatorName: creator?.name ?? "Unknown",
                applicationCount,
            };
        })
    );
}

export async function listMyCrashCourseReadModels(
    ctx: QueryCtx,
    userId: Id<"users">
) {
    const created = await ctx.db
        .query("crash_courses")
        .withIndex("by_creator", (q) => q.eq("creatorId", userId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

    const enrollments = await ctx.db
        .query("crash_course_enrollments")
        .withIndex("by_student", (q) => q.eq("studentId", userId))
        .filter((q) => q.neq(q.field("status"), "withdrawn"))
        .collect();

    const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.crashCourseId));
    const enrolledCourses = [];
    for (const courseId of enrolledCourseIds) {
        if (!created.some((course) => course._id === courseId)) {
            const course = await ctx.db.get(courseId);
            if (course && !course.deletedAt) {
                enrolledCourses.push(course);
            }
        }
    }

    const allCourses = [...created, ...enrolledCourses].sort(
        (a, b) => b.createdAt - a.createdAt
    );

    return await Promise.all(
        allCourses.map(async (courseRecord) => {
            const course = courseRecord.courseId
                ? await ctx.db.get(courseRecord.courseId)
                : null;
            return {
                ...courseRecord,
                course: course ? { code: course.code, name: course.name } : null,
            };
        })
    );
}

export async function searchCrashCourseReadModels(
    ctx: QueryCtx,
    args: {
        query: string;
        department?: string;
        examType?: string;
    }
) {
    if (!args.query.trim()) return [];

    const searchQuery = ctx.db
        .query("crash_courses")
        .withSearchIndex("search_crash_courses", (q) => {
            let search = q.search("title", args.query);
            if (args.department) {
                search = search.eq("department", args.department);
            }
            if (args.examType) {
                search = search.eq("examType", args.examType as never);
            }
            return search;
        });

    const results = await searchQuery.collect();

    return await Promise.all(
        results
            .filter(
                (course) =>
                    !course.deletedAt &&
                    course.status !== "cancelled" &&
                    course.status !== "completed"
            )
            .slice(0, 20)
            .map(async (courseRecord) => {
                const course = courseRecord.courseId
                    ? await ctx.db.get(courseRecord.courseId)
                    : null;
                return {
                    ...courseRecord,
                    course: course ? { code: course.code, name: course.name } : null,
                };
            })
    );
}
