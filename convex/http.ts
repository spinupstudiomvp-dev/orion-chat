import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const AGENT_SECRET = process.env.OC_AGENT_SECRET || "";
const TELEGRAM_BOT_TOKEN = process.env.OC_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.OC_TELEGRAM_CHAT_ID || "1914009883";

function cors(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-OC-Token",
      "Access-Control-Allow-Credentials": "true",
      ...extraHeaders,
    },
  });
}

function corsOptions() {
  return httpAction(async () => cors(null, 204));
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch {
    // Silent fail
  }
}

// ============================================================
// AUTH
// ============================================================

// Verify token — returns site info if valid
http.route({
  path: "/api/auth/verify",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { token } = await req.json();
    if (!token) return cors({ authenticated: false }, 401);

    const tokenHash = await hashToken(token);
    const site = await ctx.runQuery(api.sites.getByTokenHash, { tokenHash });

    if (!site || !site.active) {
      return cors({ authenticated: false }, 401);
    }

    return cors({
      authenticated: true,
      siteId: site.siteId,
      siteName: site.name,
      clientName: site.clientName,
    });
  }),
});

http.route({ path: "/api/auth/verify", method: "OPTIONS", handler: corsOptions() });

// ============================================================
// MESSAGES (client-facing, requires token)
// ============================================================

// Get messages for a site
http.route({
  path: "/api/messages",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const token = req.headers.get("X-OC-Token") || url.searchParams.get("token") || "";

    if (!token) return cors({ error: "Unauthorized" }, 401);

    const tokenHash = await hashToken(token);
    const site = await ctx.runQuery(api.sites.getByTokenHash, { tokenHash });
    if (!site || !site.active) return cors({ error: "Unauthorized" }, 401);

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const messages = await ctx.runQuery(api.messages.list, {
      siteId: site.siteId,
      limit,
    });

    return cors(messages);
  }),
});

// Send a message (client)
http.route({
  path: "/api/messages",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const token = req.headers.get("X-OC-Token") || "";
    if (!token) return cors({ error: "Unauthorized" }, 401);

    const tokenHash = await hashToken(token);
    const site = await ctx.runQuery(api.sites.getByTokenHash, { tokenHash });
    if (!site || !site.active) return cors({ error: "Unauthorized" }, 401);

    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return cors({ error: "Empty message" }, 400);
    }

    if (content.length > 2000) {
      return cors({ error: "Message too long (max 2000 chars)" }, 400);
    }

    const id = await ctx.runMutation(api.messages.send, {
      siteId: site.siteId,
      role: "client",
      content: content.trim(),
      status: "pending",
    });

    // Notify Matt via Telegram
    await sendTelegram(
      `🔔 <b>OrionChat</b> — ${site.name}\n\n` +
      `<b>${site.clientName}:</b> ${content.trim().substring(0, 500)}\n\n` +
      `<i>Site: ${site.domain}</i>`
    );

    return cors({ id, status: "pending" });
  }),
});

http.route({ path: "/api/messages", method: "OPTIONS", handler: corsOptions() });

// ============================================================
// AGENT ENDPOINTS (requires agent secret)
// ============================================================

// Agent reply
http.route({
  path: "/api/agent/reply",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization") || "";
    if (!AGENT_SECRET || authHeader !== `Bearer ${AGENT_SECRET}`) {
      return cors({ error: "Unauthorized" }, 401);
    }

    const { siteId, content, messageId, status, metadata } = await req.json();

    // If messageId provided, update the client message status
    if (messageId) {
      try {
        await ctx.runMutation(api.messages.updateStatus, {
          id: messageId,
          status: status || "done",
          metadata,
        });
      } catch {
        // Message might not exist
      }
    }

    // Send agent reply
    if (content) {
      await ctx.runMutation(api.messages.send, {
        siteId,
        role: "agent",
        content,
        status: "done",
        metadata,
      });
    }

    return cors({ ok: true });
  }),
});

http.route({ path: "/api/agent/reply", method: "OPTIONS", handler: corsOptions() });

// Get pending tasks (for Orián to check)
http.route({
  path: "/api/agent/pending",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization") || "";
    if (!AGENT_SECRET || authHeader !== `Bearer ${AGENT_SECRET}`) {
      return cors({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId") || undefined;
    const pending = await ctx.runQuery(api.messages.getPending, { siteId });

    return cors(pending);
  }),
});

// ============================================================
// ADMIN (requires agent secret)
// ============================================================

// Create a site
http.route({
  path: "/api/admin/sites",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization") || "";
    if (!AGENT_SECRET || authHeader !== `Bearer ${AGENT_SECRET}`) {
      return cors({ error: "Unauthorized" }, 401);
    }

    const { siteId, name, domain, repo, token, clientName, clientEmail } = await req.json();
    const tokenHash = await hashToken(token);

    const id = await ctx.runMutation(api.sites.create, {
      siteId,
      name,
      domain,
      repo,
      tokenHash,
      clientName,
      clientEmail,
    });

    return cors({ id, siteId });
  }),
});

http.route({ path: "/api/admin/sites", method: "OPTIONS", handler: corsOptions() });

// List sites
http.route({
  path: "/api/admin/sites",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const authHeader = req.headers.get("Authorization") || "";
    if (!AGENT_SECRET || authHeader !== `Bearer ${AGENT_SECRET}`) {
      return cors({ error: "Unauthorized" }, 401);
    }

    const sites = await ctx.runQuery(api.sites.list, {});
    return cors(sites);
  }),
});

export default http;
