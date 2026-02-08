import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// POST /api/widget/message
http.route({
  path: "/api/widget/message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { siteId, sessionId, text, visitorName, visitorEmail, pageUrl, userAgent } = body;

    if (!siteId || !sessionId || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create conversation
    let conversation = await ctx.runQuery(api.conversations.getBySessionId, { sessionId, siteId });
    let conversationId;
    if (!conversation) {
      conversationId = await ctx.runMutation(api.conversations.create, {
        siteId, sessionId, visitorName, visitorEmail, pageUrl, userAgent,
      });
    } else {
      conversationId = conversation._id;
    }

    const messageId = await ctx.runMutation(api.messages.send, {
      conversationId,
      sender: "visitor",
      text,
    });

    return new Response(JSON.stringify({ conversationId, messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// GET /api/widget/messages
http.route({
  path: "/api/widget/messages",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Missing conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = await ctx.runQuery(api.messages.list, {
      conversationId: conversationId as any,
    });

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// POST /api/agent/reply
http.route({
  path: "/api/agent/reply",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { conversationId, text } = body;

    if (!conversationId || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = await ctx.runMutation(api.messages.send, {
      conversationId,
      sender: "agent",
      text,
    });

    return new Response(JSON.stringify({ messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// POST /api/webhook/telegram (placeholder)
http.route({
  path: "/api/webhook/telegram",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("[OrionChat] Telegram webhook received:", JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// CORS preflight for all routes
http.route({
  path: "/api/widget/message",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});
http.route({
  path: "/api/widget/messages",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});
http.route({
  path: "/api/agent/reply",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});
http.route({
  path: "/api/webhook/telegram",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

export default http;
