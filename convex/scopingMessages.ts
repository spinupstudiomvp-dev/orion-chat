import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { sessionId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionId, limit }) => {
    const msgs = await ctx.db
      .query("scopingMessages")
      .withIndex("by_sessionId_created", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .take(limit || 100);
    return msgs;
  },
});

export const send = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { sessionId, role, content }) => {
    return await ctx.db.insert("scopingMessages", {
      sessionId,
      role,
      content,
      createdAt: Date.now(),
    });
  },
});
