import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("scopingSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

export const create = mutation({
  args: {
    sessionId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, status }) => {
    const now = Date.now();
    return await ctx.db.insert("scopingSessions", {
      sessionId,
      status: status || "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBrief = mutation({
  args: {
    sessionId: v.string(),
    briefData: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, briefData, status }) => {
    const session = await ctx.db
      .query("scopingSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();
    if (!session) return null;
    const updates: any = { briefData, updatedAt: Date.now() };
    if (status) updates.status = status;
    await ctx.db.patch(session._id, updates);
    return session._id;
  },
});

export const submit = mutation({
  args: {
    sessionId: v.string(),
    email: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, email, userId }) => {
    const session = await ctx.db
      .query("scopingSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();
    if (!session) return null;
    await ctx.db.patch(session._id, {
      status: "submitted",
      email,
      userId: userId || undefined,
      updatedAt: Date.now(),
    });
    return session._id;
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    return await ctx.db
      .query("scopingSessions")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
  },
});
