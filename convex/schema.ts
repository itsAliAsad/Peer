import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ==========================================
    // 1. IDENTITY (Merged User Table)
    // ==========================================
    users: defineTable({
        name: v.string(),
        email: v.string(),
        tokenIdentifier: v.string(), // Clerk ID
        image: v.optional(v.string()),
        bio: v.optional(v.string()),
        university: v.optional(v.string()), // e.g. "LUMS"
        reputation: v.number(), // Aggregated rating
        ratingSum: v.optional(v.number()),
        ratingCount: v.optional(v.number()),
        termsAcceptedAt: v.optional(v.string()),
        role: v.union(v.literal("student"), v.literal("tutor"), v.literal("admin")),
        isVerified: v.optional(v.boolean()),
        isAdmin: v.optional(v.boolean()),
        isBanned: v.optional(v.boolean()),
        verifiedAt: v.optional(v.number()),
        verifiedBy: v.optional(v.id("users")),

        // UX & Personalization
        notificationPreferences: v.optional(
            v.object({
                email_marketing: v.boolean(),
                email_transactional: v.boolean(),
                push_messages: v.boolean(),
            })
        ),
        currency: v.optional(v.string()),
        language: v.optional(v.string()),
        theme: v.optional(v.string()),
        links: v.optional(
            v.object({
                linkedin: v.optional(v.string()),
                portfolio: v.optional(v.string()),
                twitter: v.optional(v.string()),
            })
        ),

        // Trust & Security
        lastLoginAt: v.optional(v.number()),
        loginIp: v.optional(v.string()),
        banReason: v.optional(v.string()),
        bannedAt: v.optional(v.number()),

        // Communication
        marketingConsent: v.optional(v.boolean()),
        marketingConsentUpdatedAt: v.optional(v.number()),

        // Data Integrity
        deletedAt: v.optional(v.number()),
    }).index("by_token", ["tokenIdentifier"]),

    // ==========================================
    // 2. TUTOR PROFILE (Separated from Users)
    // ==========================================
    tutor_profiles: defineTable({
        userId: v.id("users"),
        bio: v.string(),
        isOnline: v.boolean(), // Presence System
        lastActiveAt: v.number(),
        creditBalance: v.number(),
        settings: v.object({
            acceptingRequests: v.boolean(),
            acceptingPaid: v.boolean(),
            acceptingFree: v.boolean(),
            minRate: v.number(),
            allowedHelpTypes: v.array(v.string()), // ["Debugging", "Concept"]
        }),
    }).index("by_user", ["userId"]),

    // ==========================================
    // 3. UNIVERSITY CATALOG
    // ==========================================
    university_courses: defineTable({
        code: v.string(), // "CS 101"
        name: v.string(), // "Intro to Computing"
        department: v.optional(v.string()),
        isActive: v.boolean(),
    }).searchIndex("search_course", { searchField: "code" }),

    // ==========================================
    // 4. TUTOR OFFERINGS (Relationship Table)
    // ==========================================
    tutor_offerings: defineTable({
        tutorId: v.id("users"),
        courseId: v.id("university_courses"),
        level: v.string(), // "Beginner", "Intermediate"
    })
        .index("by_tutor", ["tutorId"])
        .index("by_course", ["courseId"]),

    // ==========================================
    // 5. TICKETS (REPLACES "requests")
    // ==========================================
    tickets: defineTable({
        studentId: v.id("users"),
        // Course linkage (optional for general requests)
        courseId: v.optional(v.id("university_courses")),
        // Fallback for non-course requests
        customCategory: v.optional(v.string()), // "Mentorship", "Career Advice", "Project Help"
        // Denormalized for easy filtering
        department: v.optional(v.string()), // "CS", "MATH", etc.
        title: v.string(),
        description: v.string(),
        budget: v.optional(v.number()),
        deadline: v.optional(v.string()),
        status: v.union(
            v.literal("open"),
            v.literal("offering"),
            v.literal("in_progress"), // Async work (essay review, code review)
            v.literal("in_session"), // Live tutoring session
            v.literal("resolved"),
            v.literal("cancelled")
        ),
        urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        helpType: v.string(), // "Debugging", "Exam Prep"
        assignedTutorId: v.optional(v.id("users")),
        createdAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_status", ["status"])
        .index("by_course", ["courseId"])
        .index("by_student", ["studentId"])
        .index("by_department", ["department", "status"])
        .index("by_student_and_tutor", ["studentId", "assignedTutorId"])
        .searchIndex("search_title_description", {
            searchField: "title",
            filterFields: ["helpType", "department", "customCategory"],
        }),

    // ==========================================
    // 6. CRASH COURSES
    // ==========================================
    crash_courses: defineTable({
        creatorId: v.id("users"),
        origin: v.union(v.literal("demand"), v.literal("supply")),

        // Course linkage
        courseId: v.id("university_courses"),
        department: v.optional(v.string()),

        // Content
        title: v.string(),
        description: v.string(),
        topics: v.array(v.string()),
        examType: v.union(
            v.literal("quiz"),
            v.literal("midterm"),
            v.literal("final"),
            v.literal("other")
        ),

        // Scheduling (SUPPLY: required at creation. DEMAND: set after tutor selection)
        scheduledAt: v.optional(v.number()),
        duration: v.optional(v.number()), // minutes
        location: v.optional(v.string()),

        // Demand-only: student preferences (guidance for tutor applications)
        preferredDateRange: v.optional(v.string()),
        preferredDuration: v.optional(v.number()),
        budgetPerStudent: v.optional(v.number()),

        // Pricing (SUPPLY: required at creation. DEMAND: set from winning quote)
        pricePerStudent: v.optional(v.number()),

        // Enrollment
        maxEnrollment: v.number(),
        minEnrollment: v.optional(v.number()),
        currentEnrollment: v.number(),

        // Tutor selection
        selectedTutorId: v.optional(v.id("users")),
        votingDeadline: v.optional(v.number()),
        confirmationDeadline: v.optional(v.number()),

        // Status
        status: v.union(
            v.literal("open"),          // supply: accepting enrollments
            v.literal("requesting"),    // demand: collecting interest + tutor applications
            v.literal("voting"),        // demand: students voting on applications
            v.literal("confirming"),    // demand: tutor selected, students confirming
            v.literal("pending_tutor_review"), // demand: too few confirmations, tutor decides
            v.literal("confirmed"),     // locked in
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("cancelled")
        ),

        createdAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_status", ["status"])
        .index("by_course", ["courseId"])
        .index("by_department", ["department", "status"])
        .index("by_creator", ["creatorId"])
        .index("by_tutor", ["selectedTutorId"])
        .searchIndex("search_crash_courses", {
            searchField: "title",
            filterFields: ["department", "examType", "status"],
        }),

    crash_course_enrollments: defineTable({
        crashCourseId: v.id("crash_courses"),
        studentId: v.id("users"),
        status: v.union(
            v.literal("interested"),
            v.literal("pending_confirmation"),
            v.literal("enrolled"),
            v.literal("withdrawn")
        ),
        createdAt: v.number(),
    })
        .index("by_crash_course", ["crashCourseId"])
        .index("by_student", ["studentId"])
        .index("by_crash_course_and_student", ["crashCourseId", "studentId"]),

    crash_course_applications: defineTable({
        crashCourseId: v.id("crash_courses"),
        tutorId: v.id("users"),

        // The Quote
        pitch: v.string(),
        proposedPrice: v.number(),
        proposedDate: v.number(),
        proposedDuration: v.number(), // minutes
        proposedLocation: v.optional(v.string()),
        topicsCovered: v.array(v.string()),

        // Enrollment terms (tutor defines the economics)
        proposedMinEnrollment: v.optional(v.number()), // min students needed to run
        proposedMaxEnrollment: v.optional(v.number()), // max students the tutor can handle

        // Voting
        voteCount: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("selected"),
            v.literal("rejected")
        ),
        createdAt: v.number(),
    })
        .index("by_crash_course", ["crashCourseId"])
        .index("by_tutor", ["tutorId"])
        .index("by_crash_course_and_tutor", ["crashCourseId", "tutorId"]),

    crash_course_votes: defineTable({
        applicationId: v.id("crash_course_applications"),
        crashCourseId: v.id("crash_courses"),
        studentId: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_application", ["applicationId"])
        .index("by_crash_course_and_student", ["crashCourseId", "studentId"]),

    // ==========================================
    // 7. STUDY GROUPS
    // ==========================================
    study_groups: defineTable({
        hostId: v.id("users"),
        courseId: v.id("university_courses"),
        title: v.string(),
        maxMembers: v.number(),
        currentMembers: v.number(),
        status: v.string(),
        createdAt: v.number(),
    }).index("by_course", ["courseId"]),

    // ==========================================
    // STANDARD TABLES (From Old Schema)
    // ==========================================

    offers: defineTable({
        ticketId: v.id("tickets"), // Updated from requestId
        studentId: v.optional(v.id("users")), // Was buyerId
        tutorId: v.id("users"), // Was sellerId
        price: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("rejected")
        ),
        deletedAt: v.optional(v.number()),
    })
        .index("by_ticket", ["ticketId"])
        .index("by_tutor", ["tutorId"])
        .index("by_ticket_and_tutor", ["ticketId", "tutorId"])
        .index("by_student_and_tutor", ["studentId", "tutorId"]),

    reviews: defineTable({
        reviewerId: v.id("users"),
        revieweeId: v.id("users"),
        ticketId: v.optional(v.id("tickets")), // Optional: for ticket reviews
        crashCourseId: v.optional(v.id("crash_courses")), // Optional: for crash course reviews
        rating: v.number(), // 1-5
        comment: v.optional(v.string()),
        type: v.union(
            v.literal("student_to_tutor"),
            v.literal("tutor_to_student"),
            v.literal("crash_course_review") // Student reviews crash course tutor
        ),
    }).index("by_reviewee", ["revieweeId"]),

    conversations: defineTable({
        participant1: v.id("users"),
        participant2: v.id("users"),
        lastMessageId: v.optional(v.id("messages")),
        updatedAt: v.number(),
    })
        .index("by_participant1", ["participant1"])
        .index("by_participant2", ["participant2"])
        .index("by_updated", ["updatedAt"]),

    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        type: v.union(v.literal("text"), v.literal("image"), v.literal("file")),
        metadata: v.optional(
            v.object({
                fileName: v.string(),
                fileSize: v.number(),
                mimeType: v.string(),
            })
        ),
        isRead: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_conversation", ["conversationId"])
        .index("by_conversation_and_created", ["conversationId", "createdAt"]),

    notifications: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("offer_received"),
            v.literal("offer_accepted"),
            v.literal("ticket_resolved"),
            v.literal("request_completed"), // Legacy: backward compat
            v.literal("new_message"),
            // Crash Course notifications
            v.literal("crash_course_application"),
            v.literal("crash_course_vote_open"),
            v.literal("crash_course_selected"),
            v.literal("crash_course_confirmed"),
            v.literal("crash_course_reminder"),
            v.literal("crash_course_cancelled"),
            v.literal("crash_course_low_enrollment")
        ),
        data: v.any(),
        isRead: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_read", ["userId", "isRead"]),

    reports: defineTable({
        reporterId: v.id("users"),
        targetId: v.id("users"),
        ticketId: v.optional(v.id("tickets")), // Updated from requestId
        reason: v.string(),
        description: v.optional(v.string()),
        status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
        createdAt: v.number(),
    })
        .index("by_status", ["status"])
        .index("by_target", ["targetId"]),

    portfolio_items: defineTable({
        userId: v.id("users"),
        title: v.string(),
        description: v.string(),
        imageUrl: v.string(),
        link: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    courses: defineTable({
        userId: v.id("users"),
        title: v.string(),
        description: v.string(),
        price: v.number(),
        imageUrl: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    announcements: defineTable({
        title: v.string(),
        content: v.string(),
        isActive: v.boolean(),
        createdAt: v.number(),
    }).index("by_active", ["isActive"]),

    audit_logs: defineTable({
        actorId: v.optional(v.id("users")),
        action: v.string(),
        targetId: v.optional(v.id("users")),
        targetType: v.optional(v.string()),
        details: v.optional(v.any()),
        ipAddress: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_actor", ["actorId"])
        .index("by_action", ["action"]),

});
