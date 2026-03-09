/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as audit from "../audit.js";
import type * as conversation_read_models from "../conversation_read_models.js";
import type * as conversations from "../conversations.js";
import type * as crash_course_crons from "../crash_course_crons.js";
import type * as crash_course_domain from "../crash_course_domain.js";
import type * as crash_course_enrollments from "../crash_course_enrollments.js";
import type * as crash_course_policy from "../crash_course_policy.js";
import type * as crash_course_read_models from "../crash_course_read_models.js";
import type * as crash_course_voting from "../crash_course_voting.js";
import type * as crash_course_workflows from "../crash_course_workflows.js";
import type * as crash_courses from "../crash_courses.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as identity from "../identity.js";
import type * as init from "../init.js";
import type * as maintenance from "../maintenance.js";
import type * as message_workflows from "../message_workflows.js";
import type * as messages from "../messages.js";
import type * as notification_service from "../notification_service.js";
import type * as notification_types from "../notification_types.js";
import type * as notifications from "../notifications.js";
import type * as offer_ranking from "../offer_ranking.js";
import type * as offer_read_models from "../offer_read_models.js";
import type * as offer_workflows from "../offer_workflows.js";
import type * as offers from "../offers.js";
import type * as portfolio from "../portfolio.js";
import type * as profile_completeness from "../profile_completeness.js";
import type * as reports from "../reports.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as seedCourses from "../seedCourses.js";
import type * as study_groups from "../study_groups.js";
import type * as ticket_read_models from "../ticket_read_models.js";
import type * as ticket_recommendations from "../ticket_recommendations.js";
import type * as ticket_workflows from "../ticket_workflows.js";
import type * as tickets from "../tickets.js";
import type * as trust from "../trust.js";
import type * as tutor_offerings from "../tutor_offerings.js";
import type * as tutor_profile_service from "../tutor_profile_service.js";
import type * as tutor_profiles from "../tutor_profiles.js";
import type * as universities from "../universities.js";
import type * as university_courses from "../university_courses.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  audit: typeof audit;
  conversation_read_models: typeof conversation_read_models;
  conversations: typeof conversations;
  crash_course_crons: typeof crash_course_crons;
  crash_course_domain: typeof crash_course_domain;
  crash_course_enrollments: typeof crash_course_enrollments;
  crash_course_policy: typeof crash_course_policy;
  crash_course_read_models: typeof crash_course_read_models;
  crash_course_voting: typeof crash_course_voting;
  crash_course_workflows: typeof crash_course_workflows;
  crash_courses: typeof crash_courses;
  credentials: typeof credentials;
  crons: typeof crons;
  debug: typeof debug;
  identity: typeof identity;
  init: typeof init;
  maintenance: typeof maintenance;
  message_workflows: typeof message_workflows;
  messages: typeof messages;
  notification_service: typeof notification_service;
  notification_types: typeof notification_types;
  notifications: typeof notifications;
  offer_ranking: typeof offer_ranking;
  offer_read_models: typeof offer_read_models;
  offer_workflows: typeof offer_workflows;
  offers: typeof offers;
  portfolio: typeof portfolio;
  profile_completeness: typeof profile_completeness;
  reports: typeof reports;
  reviews: typeof reviews;
  seed: typeof seed;
  seedCourses: typeof seedCourses;
  study_groups: typeof study_groups;
  ticket_read_models: typeof ticket_read_models;
  ticket_recommendations: typeof ticket_recommendations;
  ticket_workflows: typeof ticket_workflows;
  tickets: typeof tickets;
  trust: typeof trust;
  tutor_offerings: typeof tutor_offerings;
  tutor_profile_service: typeof tutor_profile_service;
  tutor_profiles: typeof tutor_profiles;
  universities: typeof universities;
  university_courses: typeof university_courses;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
