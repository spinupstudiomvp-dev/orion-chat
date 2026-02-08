import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversations: defineTable({
    siteId: v.string(),
    sessionId: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    status: v.string(), // "open" | "resolved"
    createdAt: v.number(),
    updatedAt: v.number(),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_siteId", ["siteId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    sender: v.string(), // "visitor" | "agent"
    text: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  }).index("by_conversationId", ["conversationId"]),
});
