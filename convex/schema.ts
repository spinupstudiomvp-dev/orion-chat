import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sites: defineTable({
    siteId: v.string(),
    name: v.string(),
    domain: v.string(),
    repo: v.string(),
    tokenHash: v.string(),
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_tokenHash", ["tokenHash"]),

  messages: defineTable({
    siteId: v.string(),
    role: v.string(), // "client" | "agent"
    content: v.string(),
    status: v.string(), // "pending" | "in-progress" | "done"
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_siteId_created", ["siteId", "createdAt"]),
});
