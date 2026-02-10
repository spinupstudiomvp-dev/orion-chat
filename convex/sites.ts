import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByTokenHash = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    return await ctx.db
      .query("sites")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();
  },
});

export const getBySiteId = query({
  args: { siteId: v.string() },
  handler: async (ctx, { siteId }) => {
    return await ctx.db
      .query("sites")
      .withIndex("by_siteId", (q) => q.eq("siteId", siteId))
      .first();
  },
});

export const create = mutation({
  args: {
    siteId: v.string(),
    name: v.string(),
    domain: v.string(),
    repo: v.string(),
    tokenHash: v.string(),
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sites", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sites").collect();
  },
});
