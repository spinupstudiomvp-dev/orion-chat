import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { siteId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { siteId, limit }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_siteId", (q) => q.eq("siteId", siteId))
      .order("desc")
      .take(limit || 50);
    return messages.reverse();
  },
});

export const send = mutation({
  args: {
    siteId: v.string(),
    role: v.string(),
    content: v.string(),
    status: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, role, content, status, metadata }) => {
    return await ctx.db.insert("messages", {
      siteId,
      role,
      content,
      status: status || (role === "client" ? "pending" : "done"),
      metadata,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("messages"),
    status: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, metadata }) => {
    const patch: Record<string, string> = { status };
    if (metadata) patch.metadata = metadata;
    await ctx.db.patch(id, patch);
  },
});

export const getPending = query({
  args: { siteId: v.optional(v.string()) },
  handler: async (ctx, { siteId }) => {
    const all = siteId
      ? await ctx.db.query("messages").withIndex("by_siteId", (q) => q.eq("siteId", siteId)).collect()
      : await ctx.db.query("messages").collect();
    return all.filter((m) => m.role === "client" && m.status === "pending");
  },
});
