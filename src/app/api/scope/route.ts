import { NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://hardy-mongoose-695.eu-west-1.convex.site";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function sanitizeInput(text: string, maxLen = 2000): string {
  let clean = text.replace(/<[^>]*>/g, "");
  clean = clean.replace(/on\w+\s*=/gi, "");
  clean = clean.replace(/\.\.\//g, "");
  return clean.substring(0, maxLen);
}

const SCOPING_SYSTEM_PROMPT = `You are Orián, a friendly AI project scoping assistant for a web development studio. Your job is to help potential clients describe their project idea and build a structured project brief.

## How you behave:
- Be warm, enthusiastic, and professional
- Ask targeted questions to understand the project
- After each meaningful exchange, update the project brief
- Stay focused on project scoping — redirect off-topic conversations

## Conversation flow:
1. Greet warmly and ask what they want to build
2. Explore systematically — cover these areas one or two at a time (don't overwhelm):
   - Project type (web app, mobile app, SaaS, landing page, e-commerce, etc.)
   - Problem being solved / target audience
   - Core features (must-have vs nice-to-have)
   - Design preferences (examples, style references)
   - Technical requirements (integrations, platforms, auth needs)
   - Timeline expectations
   - Existing assets (branding, content, domain)
3. After gathering enough info (usually 4-8 exchanges), mark the brief as ready

## Brief Update Protocol:
After EVERY response, include a JSON block at the end (it will be hidden from the user).
Always wrap it in triple backticks with the json label.
Update fields progressively — keep previous values and add new ones.

\`\`\`json
{"brief_update": {
  "project_name": "string or null",
  "project_type": "web_app|mobile_app|saas|landing_page|e_commerce|other|null",
  "description": "short description or null",
  "problem": "what problem it solves or null",
  "target_users": "who uses it or null",
  "core_features": ["feature1", "feature2"],
  "nice_to_have": ["feature1"],
  "design_notes": "any design preferences or null",
  "tech_requirements": "technical needs or null",
  "integrations": ["integration1"],
  "timeline": "timeline expectation or null",
  "existing_assets": "what they already have or null",
  "complexity": "easy|medium|hard|null",
  "status": "gathering|ready"
}}
\`\`\`

Set status to "ready" ONLY when you have enough info for a meaningful brief (at minimum: project type, description, core features, and target users). When ready, tell the user their brief is complete and they can review and submit it.

## Important:
- Keep responses concise (2-4 sentences + a question)
- Don't ask too many questions at once (1-2 per message)
- Be encouraging and make the process feel easy
- Always include the brief_update JSON block`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, messages } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: "Rate limited. Try again in a minute." }, { status: 429, headers: corsHeaders });
    }

    // Sanitize messages
    const sanitizedMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.role === "user" ? sanitizeInput(m.content) : m.content,
    }));

    const systemMessage = {
      role: "system",
      content: SCOPING_SYSTEM_PROMPT,
    };

    // Call NVIDIA API
    const models = [
      "moonshotai/kimi-k2-instruct",
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      "meta/llama-3.1-70b-instruct",
    ];

    let aiResponse = null;
    let lastError = "";

    for (const model of models) {
      try {
        const res = await fetch(NVIDIA_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NVIDIA_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [systemMessage, ...sanitizedMessages],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiResponse = data.choices?.[0]?.message?.content || null;
          if (aiResponse) break;
        } else {
          lastError = `${model}: ${res.status}`;
        }
      } catch (e: any) {
        lastError = `${model}: ${e.message}`;
      }
    }

    if (!aiResponse) {
      return NextResponse.json({ error: `AI unavailable: ${lastError}` }, { status: 502, headers: corsHeaders });
    }

    // Extract brief_update JSON
    let briefUpdate = null;
    const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        briefUpdate = parsed.brief_update || parsed;
      } catch { /* ignore parse errors */ }
    }

    // Clean JSON from display message
    const displayMessage = aiResponse.replace(/```json[\s\S]*?```/g, "").trim();

    // Store messages and update brief in Convex
    try {
      // Ensure session exists
      const sessionRes = await fetch(`${CONVEX_URL}/api/scope/session?sessionId=${sessionId}`);
      const sessionData = await sessionRes.json();
      
      if (!sessionData.session) {
        // Create session via a direct Convex mutation — we'll use the HTTP route approach
        // For now, store the user message and AI response
      }

      // Store user's latest message
      const lastUserMsg = sanitizedMessages[sanitizedMessages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        await fetch(`${CONVEX_URL}/api/scope/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, role: "user", content: lastUserMsg.content }),
        }).catch(() => {});
      }

      // Store AI response
      await fetch(`${CONVEX_URL}/api/scope/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role: "assistant", content: displayMessage }),
      }).catch(() => {});

      // Update brief if we have one
      if (briefUpdate) {
        await fetch(`${CONVEX_URL}/api/scope/brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            briefData: JSON.stringify(briefUpdate),
            status: briefUpdate.status === "ready" ? "brief_ready" : "active",
          }),
        }).catch(() => {});
      }
    } catch { /* Convex storage is best-effort */ }

    return NextResponse.json(
      { message: displayMessage, briefUpdate },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}
