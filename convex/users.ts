import { v } from "convex/values";
import { z } from "zod";
import { mutation, query } from "./_generated/server";
import { ensureTutorProfile, getTutorProfileByUserId } from "./tutor_profile_service";
import { getUserReputation, isUserVerified } from "./trust";
import { requireUser } from "./utils";

const updateSchema = z
    .object({
        bio: z.string().optional(),
        avatar: z.string().optional(),
        name: z.string().optional(),
        personalEmail: z.string().email().optional(),
        whatsappNumber: z.string().optional(),
        // New fields
        currency: z.string().optional(),
        language: z.string().optional(),
        theme: z.string().optional(),
        links: z.object({
            linkedin: z.string().optional(),
            portfolio: z.string().optional(),
            twitter: z.string().optional(),
        }).optional(),
        notificationPreferences: z.object({
            email_marketing: z.boolean(),
            email_transactional: z.boolean(),
            push_messages: z.boolean(),
        }).optional(),
        marketingConsent: z.boolean().optional(),
    })
    .strict();

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (user !== null) {
            // If we've seen this identity before but the name has changed, patch the value.
            const patch: Record<string, unknown> = { lastLoginAt: Date.now() };
            if (user.name !== identity.name) {
                patch.name = identity.name;
            }
            await ctx.db.patch(user._id, patch);
            return user._id;
        }

        // If it's a new identity, create a new `User`.
        return await ctx.db.insert("users", {
            tokenIdentifier: identity.tokenIdentifier,
            name: identity.name!,
            email: identity.email!,
            image: identity.pictureUrl,
            reputation: 0,
            ratingSum: 0,
            ratingCount: 0,
            role: "student",
            verificationTier: "none",
            // Defaults
            lastLoginAt: Date.now(),
            notificationPreferences: {
                email_marketing: false,
                email_transactional: true,
                push_messages: true,
            },
            currency: "PKR",
            language: "en",
            theme: "system",
            marketingConsent: false,
        });
    },
});

export const currentUser = query({
    args: {},
    handler: async (ctx) => {
        try {
            const user = await requireUser(ctx, { allowBanned: true });
            let universityName: string | undefined;
            if (user.universityId) {
                const uni = await ctx.db.get(user.universityId);
                universityName = uni?.name;
            }
            return {
                ...user,
                universityName,
                reputation: getUserReputation(user),
                isAdmin: user.role === "admin",
                isVerified: isUserVerified(user),
                isBanned: user.bannedAt !== undefined,
            };
        } catch (error) {
            // If unauthenticated or user not found, return null to trigger UserSync
            if (error instanceof Error &&
                (error.message === "Unauthenticated" || error.message === "User not found")) {
                return null;
            }
            throw error;
        }
    },
});

export const update = mutation({
    args: {
        updates: v.any(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const parsed = updateSchema.parse(args.updates ?? {});

        const patch: Record<string, unknown> = {};
        if (parsed.bio !== undefined) patch.bio = parsed.bio;
        if (parsed.avatar !== undefined) patch.image = parsed.avatar;
        if (parsed.name !== undefined) patch.name = parsed.name;
        if (parsed.personalEmail !== undefined) patch.personalEmail = parsed.personalEmail;
        if (parsed.whatsappNumber !== undefined) patch.whatsappNumber = parsed.whatsappNumber;
        if (parsed.currency !== undefined) patch.currency = parsed.currency;
        if (parsed.language !== undefined) patch.language = parsed.language;
        if (parsed.theme !== undefined) patch.theme = parsed.theme;
        if (parsed.links !== undefined) patch.links = parsed.links;
        if (parsed.notificationPreferences !== undefined) patch.notificationPreferences = parsed.notificationPreferences;
        if (parsed.marketingConsent !== undefined) {
            patch.marketingConsent = parsed.marketingConsent;
            patch.marketingConsentUpdatedAt = Date.now();
        }

        if (Object.keys(patch).length === 0) return;

        await ctx.db.patch(user._id, patch);
    },
});

export const get = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id);
        if (!user) return null;

        // Resolve university name from universityId
        let universityName: string | undefined;
        if (user.universityId) {
            const uni = await ctx.db.get(user.universityId);
            universityName = uni?.name;
        }

        // Return only public profile fields
        return {
            _id: user._id,
            name: user.name,
            image: user.image,
            bio: user.bio,
            universityName,
            role: user.role,
            isVerified: isUserVerified(user),
            reputation: getUserReputation(user),
            // Links are public for profile display
            links: user.links,
        };
    },
});

export const setRole = mutation({
    args: { role: v.union(v.literal("student"), v.literal("tutor")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        // Note: Admin role can only be set via admin.setAdmin()
        await ctx.db.patch(user._id, { role: args.role });
        return args.role;
    },
});

export const completeOnboarding = mutation({
    args: {
        role: v.union(v.literal("student"), v.literal("tutor")),
        bio: v.string(),
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
        // Tutor-specific fields
        personalEmail: v.optional(v.string()),
        whatsappNumber: v.optional(v.string()),
        helpTypes: v.optional(v.array(v.union(
            v.literal("debugging"),
            v.literal("concept"),
            v.literal("exam_prep"),
            v.literal("review"),
            v.literal("assignment"),
            v.literal("project"),
            v.literal("mentorship"),
            v.literal("interview_prep"),
            v.literal("other"),
        ))),
        minRate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        // Update user record
        const userPatch: Record<string, unknown> = {
            role: args.role,
            bio: args.bio,
            onboardingCompletedAt: Date.now(),
        };
        if (args.universityId) userPatch.universityId = args.universityId;
        if (args.teachingScope) userPatch.teachingScope = args.teachingScope;
        if (args.personalEmail) userPatch.personalEmail = args.personalEmail;
        if (args.whatsappNumber) userPatch.whatsappNumber = args.whatsappNumber;

        await ctx.db.patch(user._id, userPatch);

        if (args.role === "tutor") {
            await ensureTutorProfile(ctx, {
                userId: user._id,
                bio: args.bio,
                minRate: args.minRate,
                allowedHelpTypes: args.helpTypes,
                acceptingRequests: true,
            });
        }

        return args.role;
    },
});

export const acceptTerms = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx, { allowBanned: true });
        const termsAcceptedAt = new Date().toISOString();

        await ctx.db.patch(user._id, { termsAcceptedAt });

        return termsAcceptedAt;
    },
});

export const updateTutorPresence = mutation({
    args: {
        isOnline: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const profile = await getTutorProfileByUserId(ctx, user._id);

        if (profile) {
            await ctx.db.patch(profile._id, {
                isOnline: args.isOnline,
                lastActiveAt: Date.now(),
            });
        } else {
            throw new Error("Tutor profile not found. Please create a tutor profile first.");
        }
    },
});

export const updateTutorSettings = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const profile = await getTutorProfileByUserId(ctx, user._id);

        if (profile) {
            await ctx.db.patch(profile._id, {
                settings: args.settings,
            });
        } else {
            throw new Error("Tutor profile not found. Please create a tutor profile first.");
        }
    },
});
