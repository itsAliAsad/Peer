import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
    notificationDataValidator,
    notificationTypeValidator,
} from "./notification_types";

export default defineSchema({
    // ==========================================
    // 0. UNIVERSITIES (Canonical list)
    // ==========================================
    universities: defineTable({
        name: v.string(),        // "LUMS", "NUST", "IBA"
        shortName: v.string(),   // "lums", "nust"
        city: v.string(),        // "Lahore", "Islamabad"
        isActive: v.boolean(),
    }).searchIndex("search_university", { searchField: "name" }),

    // ==========================================
    // 1. IDENTITY (Merged User Table)
    // ==========================================
    users: defineTable({
        name: v.string(),
        email: v.string(),
        tokenIdentifier: v.string(), // Clerk ID
        image: v.optional(v.string()),
        bio: v.optional(v.string()),
        universityId: v.optional(v.id("universities")),
        teachingScope: v.optional(
            v.array(
                v.union(
                    v.literal("university"),
                    v.literal("o_levels"),
                    v.literal("a_levels"),
                    v.literal("sat"),
                    v.literal("ib"),
                    v.literal("ap"),
                    v.literal("general"),
                )
            )
        ),
        verificationTier: v.union(
            v.literal("none"),
            v.literal("identity"),
            v.literal("academic"),
            v.literal("expert"),
        ),
        reputation: v.number(), // Aggregated rating
        ratingSum: v.number(),
        ratingCount: v.number(),
        termsAcceptedAt: v.optional(v.string()),
        role: v.union(v.literal("student"), v.literal("tutor"), v.literal("admin")),
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
        personalEmail: v.optional(v.string()), // Personal contact email (distinct from auth email)
        whatsappNumber: v.optional(v.string()), // WhatsApp number for primary contact
        marketingConsent: v.boolean(),
        marketingConsentUpdatedAt: v.optional(v.number()),

        // Onboarding
        onboardingCompletedAt: v.optional(v.number()),

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
            allowedHelpTypes: v.array(v.union(
                v.literal("debugging"),
                v.literal("concept"),
                v.literal("exam_prep"),
                v.literal("review"),
                v.literal("assignment"),
                v.literal("project"),
                v.literal("mentorship"),
                v.literal("interview_prep"),
                v.literal("other"),
            )),
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
        universityId: v.optional(v.id("universities")), // null = shared/general
    })
        .searchIndex("search_course", { searchField: "code" })
        .index("by_university", ["universityId"]),

    // ==========================================
    // 4. TUTOR OFFERINGS (Relationship Table)
    // ==========================================
    tutor_offerings: defineTable({
        tutorId: v.id("users"),
        courseId: v.optional(v.id("university_courses")), // for university courses
        customSubject: v.optional(v.string()),           // for O-Level, SAT, etc.
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
    })
        .index("by_tutor", ["tutorId"])
        .index("by_course", ["courseId"])
        .index("by_tutor_and_category", ["tutorId", "category"]),

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
        universityId: v.optional(v.id("universities")), // scoping: null = open to all
        title: v.string(),
        description: v.string(),
        budget: v.optional(v.number()),
        deadline: v.optional(v.number()),
        status: v.union(
            v.literal("open"),
            v.literal("offering"),
            v.literal("in_progress"), // Async work (essay review, code review)
            v.literal("in_session"), // Live tutoring session
            v.literal("resolved"),
            v.literal("cancelled")
        ),
        urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        helpType: v.union(
            v.literal("debugging"),
            v.literal("concept"),
            v.literal("exam_prep"),
            v.literal("review"),
            v.literal("assignment"),
            v.literal("project"),
            v.literal("mentorship"),
            v.literal("interview_prep"),
            v.literal("other"),
        ),
        assignedTutorId: v.optional(v.id("users")),
        createdAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_status", ["status"])
        .index("by_course", ["courseId"])
        .index("by_student", ["studentId"])
        .index("by_department", ["department", "status"])
        .index("by_student_and_tutor", ["studentId", "assignedTutorId"])
        .index("by_university", ["universityId", "status"])
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

        // Course linkage (optional for non-university categories)
        courseId: v.optional(v.id("university_courses")),
        category: v.optional(v.union(
            v.literal("o_levels"),
            v.literal("a_levels"),
            v.literal("sat"),
            v.literal("ib"),
            v.literal("ap"),
            v.literal("general"),
        )),
        customSubject: v.optional(v.string()), // free text for non-university topics
        universityId: v.optional(v.id("universities")), // null = open to all
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
        .index("by_category", ["category", "status"])
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
    // 7. TUTOR CREDENTIALS
    // ==========================================
    tutor_credentials: defineTable({
        tutorId: v.id("users"),

        credentialType: v.union(
            v.literal("o_level"),
            v.literal("a_level"),
            v.literal("sat"),
            v.literal("ib"),
            v.literal("ap"),
            v.literal("university_transcript"),
            v.literal("university_degree"),
            v.literal("other_certificate")
        ),

        // O-Level / A-Level
        candidateNumber: v.optional(v.string()),
        examSession: v.optional(v.string()),
        subjects: v.optional(v.array(v.object({
            name: v.string(),
            grade: v.string(),
            level: v.optional(v.string()), // "AS" or "A2"
        }))),

        // SAT
        satTotalScore: v.optional(v.number()),
        satReadingWritingScore: v.optional(v.number()),
        satMathScore: v.optional(v.number()),
        satTestDate: v.optional(v.string()),

        // IB
        ibTotalPoints: v.optional(v.number()),
        ibSubjects: v.optional(v.array(v.object({
            name: v.string(),
            level: v.union(v.literal("HL"), v.literal("SL")),
            grade: v.number(),
        }))),

        // AP
        apSubjects: v.optional(v.array(v.object({
            name: v.string(),
            score: v.number(),
            year: v.string(),
        }))),

        // University
        institutionName: v.optional(v.string()),
        universityId: v.optional(v.id("universities")),
        degreeTitle: v.optional(v.string()),
        gpa: v.optional(v.number()),
        gpaScale: v.optional(v.number()),
        graduationYear: v.optional(v.number()),
        currentSemester: v.optional(v.string()),

        // Document proof (optional — tutor may skip upload)
        storageId: v.optional(v.id("_storage")),
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        mimeType: v.optional(v.string()),

        // Admin review
        status: v.union(
            v.literal("unsubmitted"), // structured data only, no doc
            v.literal("pending"),
            v.literal("in_review"),
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("needs_resubmit")
        ),
        reviewedBy: v.optional(v.id("users")),
        reviewedAt: v.optional(v.number()),
        rejectionReason: v.optional(v.string()),
        adminNotes: v.optional(v.string()),

        uploadedAt: v.number(),
        isPubliclyVisible: v.boolean(),
    })
        .index("by_tutor", ["tutorId"])
        .index("by_status", ["status"])
        .index("by_tutor_and_type", ["tutorId", "credentialType"]),

    // ==========================================
    // 8. STUDY GROUPS
    // ==========================================
    study_groups: defineTable({
        hostId: v.id("users"),
        courseId: v.id("university_courses"),
        title: v.string(),
        maxMembers: v.number(),
        currentMembers: v.number(),
        status: v.union(
            v.literal("active"),
            v.literal("full"),
            v.literal("completed"),
            v.literal("cancelled"),
        ),
        createdAt: v.number(),
    }).index("by_course", ["courseId"]),

    // ==========================================
    // STANDARD TABLES (From Old Schema)
    // ==========================================

    offers: defineTable({
        ticketId: v.id("tickets"), // Updated from requestId
        studentId: v.id("users"), // Was buyerId
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
        createdAt: v.number(),
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
        type: notificationTypeValidator,
        data: notificationDataValidator,
        isRead: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_read", ["userId", "isRead"]),

    reports: defineTable({
        reporterId: v.id("users"),
        targetId: v.id("users"),
        ticketId: v.optional(v.id("tickets")), // Updated from requestId
        reason: v.union(
            v.literal("spam"),
            v.literal("harassment"),
            v.literal("fake_credentials"),
            v.literal("inappropriate_content"),
            v.literal("no_show"),
            v.literal("payment_dispute"),
            v.literal("other"),
        ),
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
        targetType: v.optional(v.union(
            v.literal("user"),
            v.literal("ticket"),
            v.literal("crash_course"),
            v.literal("tutor_credential"),
            v.literal("offer"),
            v.literal("review"),
            v.literal("report"),
        )),
        details: v.optional(v.any()),
        ipAddress: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_actor", ["actorId"])
        .index("by_action", ["action"]),

});
