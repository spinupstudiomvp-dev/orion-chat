import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("scopingUsers")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
  },
});

export const getByMagicLinkToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("scopingUsers")
      .withIndex("by_magicLinkToken", (q) => q.eq("magicLinkToken", token))
      .first();
  },
});

export const createOrUpdate = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    magicLinkToken: v.optional(v.string()),
    magicLinkExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scopingUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (existing) {
      const updates: any = { lastLoginAt: Date.now() };
      if (args.name) updates.name = args.name;
      if (args.company) updates.company = args.company;
      if (args.magicLinkToken !== undefined) updates.magicLinkToken = args.magicLinkToken;
      if (args.magicLinkExpiry !== undefined) updates.magicLinkExpiry = args.magicLinkExpiry;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }
    return await ctx.db.insert("scopingUsers", {
      email: args.email.toLowerCase(),
      name: args.name,
      company: args.company,
      magicLinkToken: args.magicLinkToken,
      magicLinkExpiry: args.magicLinkExpiry,
      createdAt: Date.now(),
    });
  },
});

export const clearMagicLink = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("scopingUsers")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, {
      magicLinkToken: undefined,
      magicLinkExpiry: undefined,
      lastLoginAt: Date.now(),
    });
  },
});
