import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from 'convex/values';

const schema = defineSchema({
  ...authTables,
  
  subscriptions: defineTable({
    userId: v.id('users'),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    productId: v.optional(v.string()),
    priceId: v.optional(v.string()),
    planCode: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    seats: v.optional(v.number()),
    metadata: v.optional(v.any()),
    creditsBalance: v.number(),
    creditsGrantPerPeriod: v.number(),
    creditsRolloverLimit: v.number(),
    lastGrantCursor: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_polarSubscriptionId', ['polarSubscriptionId'])
    .index('by_status', ['status']),
    

  credits_ledger: defineTable({
    userId: v.id('users'),
    subscriptionId: v.id('subscriptions'),
    amount: v.number(),
    type: v.string(), // "grant" | "consume" | "adjust"
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index('by_subscriptionId', ['subscriptionId'])
    .index('by_userId', ['userId'])
    .index('by_idempotencyKey', ['idempotencyKey']),

  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    styleGuide: v.optional(v.string()),
    sketchesData: v.any(),  //JSON structure matching Redux Shapes state
    viewportData: v.optional(v.any()), //JSON structure for viewport state
    generatedDesignData: v.optional(v.any()), //JSON structure for generated UI
    thumbnail: v.optional(v.string()),  //Base64 or URL for project thumbnail
    moodBoardImages: v.optional(v.array(v.string())), //Array of storage IDs for mood board Images
    inspirationImages: v.optional(v.array(v.string())), //Array of storage IDs for inspiration images (max 6)
    lastModified: v.number(), //Timestamp for last modification
    createdAt: v.number(), //project creation timestamp
    isPublic: v.optional(v.boolean()), //for future sharing features
    tags: v.optional(v.array(v.string())), //for future categorization
    projectNumber: v.number(),  //Auto-incrementing project number per user
    previousSketchesData: v.optional(v.any()), //Backup of previous sketchesData before overwrite

  }).index('by_userId', ['userId'])
  .index('by_userId_lastModified', ['userId', 'lastModified']),

  collaborators: defineTable({
    projectId: v.id('projects'),
    userId: v.optional(v.id('users')),       // null until invite accept 
    email: v.string(),                        // for pending invite track 
    role: v.union(v.literal('editor'), v.literal('viewer')),
    status: v.union(v.literal('pending'), v.literal('accepted')),
    invitedBy: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_project_user', ['projectId', 'userId'])
    .index('by_email', ['email']),

  presence: defineTable({
    projectId: v.id('projects'),
    cursor: v.optional(v.object({ x: v.number(), y: v.number() })),
    userId: v.id('users'),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    color: v.string(),                 // har user ka apna highlight color
    selectedIds: v.array(v.string()),  // user ne kaun se shapes select kiye
    lastSeen: v.number(),              // heartbeat timestamp
  })
    .index('by_project', ['projectId'])
    .index('by_project_user', ['projectId', 'userId']),

  project_counters: defineTable({
    userId: v.id('users'),
    nextProjectNumber: v.number(), //next available project number for the user
  }).index('by_userId', ['userId']),

});

export default schema;