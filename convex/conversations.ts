import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    siteId: v.string(),
    sessionId: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      ...args,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {
    siteId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.siteId) {
      const convos = await ctx.db
        .query("conversations")
        .withIndex("by_siteId", (q) => q.eq("siteId", args.siteId!))
        .collect();
      if (args.status) return convos.filter((c) => c.status === args.status);
      return convos;
    }
    if (args.status) {
      return await ctx.db
        .query("conversations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("conversations").collect();
  },
});

export const getBySessionId = query({
  args: { sessionId: v.string(), siteId: v.string() },
  handler: async (ctx, args) => {
    const convos = await ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return convos.find((c) => c.siteId === args.siteId && c.status === "open") || null;
  },
});

export const resolve = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "resolved", updatedAt: Date.now() });
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
