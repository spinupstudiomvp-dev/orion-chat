import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    sender: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      sender: args.sender,
      text: args.text,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now });
    // Log for future Telegram notification
    if (args.sender === "visitor") {
      console.log(`[OrionChat] New visitor message in ${args.conversationId}: ${args.text}`);
    }
    return id;
  },
});

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});
