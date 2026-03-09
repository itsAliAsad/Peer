import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { notifyCredentialReviewed } from "./notification_service";
import { recalculateVerificationTierForUser } from "./trust";
import { getCurrentUser, requireAdmin, requireUser } from "./utils";

// ==========================================
// UPLOAD
// ==========================================

/** Generate a Convex Storage upload URL (client calls this, then uploads directly) */
export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        await requireUser(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

// ==========================================
// MUTATIONS
// ==========================================

/** Submit a credential row (with or without a document) */
export const submitCredential = mutation({
    args: {
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
            level: v.optional(v.string()),
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

        // Document (all optional — tutor may skip)
        storageId: v.optional(v.id("_storage")),
        fileName: v.optional(v.string()),
        mimeType: v.optional(v.string()),

        isPubliclyVisible: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        if (user.role !== "tutor") throw new Error("Only tutors can submit credentials");

        const hasDocument = !!args.storageId;
        const status = hasDocument ? "pending" : "unsubmitted";

        // If a storageId is provided, get the URL
        let fileUrl: string | undefined;
        if (args.storageId) {
            const url = await ctx.storage.getUrl(args.storageId);
            fileUrl = url ?? undefined;
        }

        const credId = await ctx.db.insert("tutor_credentials", {
            tutorId: user._id,
            credentialType: args.credentialType,
            candidateNumber: args.candidateNumber,
            examSession: args.examSession,
            subjects: args.subjects,
            satTotalScore: args.satTotalScore,
            satReadingWritingScore: args.satReadingWritingScore,
            satMathScore: args.satMathScore,
            satTestDate: args.satTestDate,
            ibTotalPoints: args.ibTotalPoints,
            ibSubjects: args.ibSubjects,
            apSubjects: args.apSubjects,
            institutionName: args.institutionName,
            universityId: args.universityId,
            degreeTitle: args.degreeTitle,
            gpa: args.gpa,
            gpaScale: args.gpaScale,
            graduationYear: args.graduationYear,
            currentSemester: args.currentSemester,
            storageId: args.storageId,
            fileUrl,
            fileName: args.fileName,
            mimeType: args.mimeType,
            status,
            uploadedAt: Date.now(),
            isPubliclyVisible: args.isPubliclyVisible ?? true,
        });

        return { credId, status };
    },
});

/** Upload a document for an existing unsubmitted credential */
export const uploadDocumentForCredential = mutation({
    args: {
        credentialId: v.id("tutor_credentials"),
        storageId: v.id("_storage"),
        fileName: v.string(),
        mimeType: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const cred = await ctx.db.get(args.credentialId);
        if (!cred) throw new Error("Credential not found");
        if (cred.tutorId !== user._id) throw new Error("Unauthorized");

        const fileUrl = await ctx.storage.getUrl(args.storageId);

        await ctx.db.patch(args.credentialId, {
            storageId: args.storageId,
            fileUrl: fileUrl ?? undefined,
            fileName: args.fileName,
            mimeType: args.mimeType,
            status: "pending",
            uploadedAt: Date.now(),
        });
    },
});

/** Delete a credential (tutor can remove their own pending/unsubmitted credentials) */
export const deleteCredential = mutation({
    args: { credentialId: v.id("tutor_credentials") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const cred = await ctx.db.get(args.credentialId);
        if (!cred) throw new Error("Credential not found");
        if (cred.tutorId !== user._id) throw new Error("Unauthorized");
        if (cred.status === "approved") throw new Error("Cannot delete an approved credential");

        await ctx.db.delete(args.credentialId);
    },
});

// ==========================================
// QUERIES
// ==========================================

/** All credentials for the currently authenticated tutor */
export const listMyCredentials = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        return await ctx.db
            .query("tutor_credentials")
            .withIndex("by_tutor", (q) => q.eq("tutorId", user._id))
            .collect();
    },
});

/** Approved credentials for a public profile (no document links) */
export const getPublicCredentials = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const credentials = await ctx.db
            .query("tutor_credentials")
            .withIndex("by_tutor", (q) => q.eq("tutorId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("status"), "approved"),
                    q.eq(q.field("isPubliclyVisible"), true)
                )
            )
            .collect();

        // Strip document storage info from public view
        return credentials.map((credential) => {
            const { storageId, fileUrl, ...rest } = credential;
            void storageId;
            void fileUrl;
            return rest;
        });
    },
});

// ==========================================
// ADMIN
// ==========================================

/** List pending credentials for admin review (oldest first) */
export const listPendingForReview = query({
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        if (user.role !== "admin") throw new Error("Unauthorized");

        const pending = await ctx.db
            .query("tutor_credentials")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        // Attach tutor name + image for display
        return await Promise.all(
            pending.map(async (cred) => {
                const tutor = await ctx.db.get(cred.tutorId);
                return {
                    ...cred,
                    tutorName: tutor?.name,
                    tutorImage: tutor?.image,
                };
            })
        );
    },
});

/** Admin reviews a credential: approve / reject / needs_resubmit */
export const reviewCredential = mutation({
    args: {
        credentialId: v.id("tutor_credentials"),
        decision: v.union(
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("needs_resubmit")
        ),
        rejectionReason: v.optional(v.string()),
        adminNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);

        const cred = await ctx.db.get(args.credentialId);
        if (!cred) throw new Error("Credential not found");

        await ctx.db.patch(args.credentialId, {
            status: args.decision,
            reviewedBy: admin._id,
            reviewedAt: Date.now(),
            rejectionReason: args.rejectionReason,
            adminNotes: args.adminNotes,
        });

        if (args.decision === "approved") {
            await recalculateVerificationTierForUser(ctx, cred.tutorId);
        }

        await notifyCredentialReviewed(ctx, cred.tutorId, {
            credentialId: args.credentialId,
            credentialType: cred.credentialType,
            decision: args.decision,
            reason: args.rejectionReason,
        });
    },
});

// ==========================================
// INTERNAL
// ==========================================

/** Recalculate and persist the tutor's verificationTier */
export const recalculateVerificationTier = internalMutation({
    args: { tutorId: v.id("users") },
    handler: async (ctx, args) => {
        await recalculateVerificationTierForUser(ctx, args.tutorId);
    },
});
