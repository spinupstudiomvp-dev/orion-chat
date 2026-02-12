# OrionChat v3 — Project Scoping Interface

## Overview
A new public-facing chat interface where potential clients can describe a project idea, have an AI conversation to scope it, and generate a structured project brief. Think Lovable/ChatGPT landing page UX — chat centered, then split-pane once conversation starts.

## Goals
1. Convert visitors into qualified project leads with structured briefs
2. Demonstrate Orián's capabilities through the scoping experience itself
3. Collect enough detail to estimate scope/cost before human involvement
4. Zero friction to start chatting; auth only required to submit

## Non-Goals
- NOT replacing the existing widget (embedded client support chat)
- NOT a general-purpose chatbot — focused on project scoping
- NOT handling payments or contracts

## Architecture

### Deployment
- **URL**: chat.orian.dev (subdomain of orian.dev)
- **Stack**: Next.js 14 (existing repo), Tailwind CSS
- **Backend**: Existing Convex instance (hardy-mongoose-695)
- **AI**: NVIDIA API → Kimi K2 model (same as widget)
- **Auth**: Convex Auth (magic link email) — only required at submission

### Existing Code — What NOT to Touch
- `/src/app/api/chat/route.ts` — widget chat endpoint (keep as-is)
- `/convex/http.ts` — all existing HTTP routes
- `/convex/schema.ts` — existing tables (sites, messages, tickets)
- Widget embed script functionality

### New Routes & Pages
```
/src/app/(scoping)/            — layout with scoping UI chrome
/src/app/(scoping)/page.tsx    — landing/chat page
/src/app/(scoping)/brief/[id]  — view/share completed brief
/src/app/api/scope/route.ts    — AI endpoint for scoping conversations
```

## Database Schema (New Tables)

Add to existing Convex schema:

```typescript
// Project scoping conversations
scopingSessions: defineTable({
  sessionId: v.string(),        // UUID, stored in localStorage pre-auth
  userId: v.optional(v.string()), // Linked after auth
  email: v.optional(v.string()),
  status: v.string(),           // "active" | "brief_ready" | "submitted" | "archived"
  briefData: v.optional(v.string()), // JSON: structured brief
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_sessionId", ["sessionId"])
  .index("by_userId", ["userId"])
  .index("by_status", ["status"]),

// Scoping chat messages (separate from client support messages)
scopingMessages: defineTable({
  sessionId: v.string(),
  role: v.string(),             // "user" | "assistant" | "system"
  content: v.string(),
  createdAt: v.number(),
})
  .index("by_sessionId", ["sessionId"])
  .index("by_sessionId_created", ["sessionId", "createdAt"]),

// Registered users (scoping platform)
scopingUsers: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  company: v.optional(v.string()),
  passwordHash: v.optional(v.string()), // For email/password auth
  magicLinkToken: v.optional(v.string()),
  magicLinkExpiry: v.optional(v.number()),
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()),
})
  .index("by_email", ["email"])
  .index("by_magicLinkToken", ["magicLinkToken"]),
```

## UX Flow

### Phase 1: Landing (Chat Centered)
```
┌─────────────────────────────────────────────┐
│  Logo                              Login    │
│                                             │
│                                             │
│         🚀 What do you want to build?       │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │ Describe your project idea...   │      │
│    └─────────────────────────────────┘      │
│                                             │
│    Examples:                                │
│    • "A SaaS dashboard for tracking..."     │
│    • "An e-commerce site that..."           │
│    • "A mobile app for..."                  │
│                                             │
└─────────────────────────────────────────────┘
```

### Phase 2: Split Pane (After First Message)
```
┌─────────────────────────────────────────────┐
│  Logo                    Brief   Login      │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  Chat            │  Project Brief           │
│  ─────           │  ──────────────          │
│                  │                          │
│  User: I want    │  📋 Project Overview     │
│  to build a...   │  Type: Web App           │
│                  │  Industry: ...           │
│  Orián: Great!   │                          │
│  Let me ask...   │  🎯 Core Features        │
│                  │  • Feature 1             │
│  User: It needs  │  • Feature 2             │
│  to...           │                          │
│                  │  👥 Target Users          │
│                  │  ...                     │
│  ┌────────────┐  │                          │
│  │ Type here  │  │  ⏱️ Estimated Scope      │
│  └────────────┘  │  ...                     │
│                  │                          │
│                  │  [Submit Brief] (locked)  │
├──────────────────┴──────────────────────────┤
└─────────────────────────────────────────────┘
```

### Phase 3: Brief Ready
- AI determines enough info has been collected
- Brief panel shows complete structured document
- "Submit Brief" button activates
- Clicking triggers auth modal (register/login)
- After auth → brief submitted, confirmation shown
- Telegram notification sent to Matt

## AI System Prompt (Scoping Agent)

The AI should:
1. **Open warmly** — ask what they want to build
2. **Explore systematically** — cover these areas:
   - Project type (web app, mobile, SaaS, landing page, etc.)
   - Problem being solved / target audience
   - Core features (must-have vs nice-to-have)
   - Design preferences (examples, style references)
   - Technical requirements (integrations, platforms, auth)
   - Timeline and budget range
   - Existing assets (branding, content, domain)
3. **Update brief in real-time** — after each meaningful exchange, emit a structured brief update
4. **Signal completion** — when enough info gathered, mark brief as ready
5. **Stay focused** — redirect off-topic conversations back to scoping

### Brief Update Protocol
The AI response includes a JSON block (hidden from chat display):
```json
{"brief_update": {
  "project_name": "...",
  "project_type": "web_app|mobile_app|saas|landing_page|other",
  "description": "...",
  "problem": "...",
  "target_users": "...",
  "core_features": ["..."],
  "nice_to_have": ["..."],
  "design_notes": "...",
  "tech_requirements": "...",
  "integrations": ["..."],
  "timeline": "...",
  "budget_range": "...",
  "existing_assets": "...",
  "status": "gathering|ready"
}}
```

## API Endpoint: `/api/scope/route.ts`

```typescript
// POST /api/scope
// Body: { sessionId, messages: [{role, content}] }
// Returns: { message: string, briefUpdate?: object }
//
// Uses same NVIDIA API + Kimi K2 model as widget
// Separate system prompt focused on project scoping
// Parses brief_update JSON from AI response
// Stores messages + brief in Convex
```

## Auth Flow

### Pre-Auth (anonymous)
- SessionId generated client-side (UUID in localStorage)
- Can chat freely, brief builds in real-time
- Brief stored in Convex linked to sessionId

### Auth Trigger (on submit)
- Modal: "Create account to submit your brief"
- Options: Magic link (email) or email + password
- After auth: link sessionId to userId
- Submit brief → status changes to "submitted"

### Convex HTTP Routes (new)
```
POST /api/scope/chat      — send message, get AI response + brief update
GET  /api/scope/session    — get session data + messages
POST /api/scope/submit     — submit brief (requires auth)
POST /api/scope/auth/register — create account
POST /api/scope/auth/login    — magic link or password
POST /api/scope/auth/verify   — verify magic link token
```

## Notifications
- On brief submission → Telegram notification to Matt
- Include: project name, type, brief summary, user email
- Format similar to existing ticket notifications

## Component Structure

```
src/
  app/
    (scoping)/
      layout.tsx          — scoping layout (no widget)
      page.tsx            — landing + chat + brief
      brief/[id]/page.tsx — shareable brief view
    api/
      scope/
        route.ts          — AI scoping endpoint
  components/
    scoping/
      ChatPanel.tsx       — chat interface (left pane)
      BriefPanel.tsx      — live brief document (right pane)
      ChatInput.tsx       — message input with send
      BriefSection.tsx    — individual brief section component
      AuthModal.tsx       — register/login modal
      LandingHero.tsx     — centered initial state
      ExamplePrompts.tsx  — clickable example projects
```

## Design Direction
- Dark theme (consistent with orian.dev)
- Minimal, clean — let the chat be the focus
- Brief panel: card-based sections, subtle animations on update
- Responsive: on mobile, brief is a slide-over or tab
- Accent color: emerald/green (#10b981) or match orian.dev

## Implementation Plan

### Phase 1: Database + API (30min)
1. Add new tables to Convex schema
2. Create Convex functions (mutations/queries) for scoping
3. Add HTTP routes to http.ts
4. Create `/api/scope/route.ts` with AI integration

### Phase 2: Chat UI (45min)
1. Landing page with centered chat input
2. Chat panel component with message rendering
3. Split-pane transition animation
4. Message streaming (if supported) or loading states

### Phase 3: Brief Panel (30min)
1. Brief document component with sections
2. Real-time updates from AI responses
3. Section animations on content change
4. Submit button with auth gate

### Phase 4: Auth (30min)
1. Auth modal component
2. Magic link email sending (Resend or similar)
3. Session linking after auth
4. Protected submit flow

### Phase 5: Polish + Deploy (15min)
1. Responsive design (mobile brief as tab)
2. Telegram notifications on submission
3. Deploy to Vercel
4. Configure chat.orian.dev subdomain

## Decisions
1. **Auth**: Magic link via Resend
2. **Brief access**: User registers → can view their brief + status in a dashboard
3. **Follow-up email**: Not needed for now
4. **Complexity/pricing**: AI determines complexity: Easy / Medium / Hard. No actual pricing shown.
5. **Sessions**: 1 project per user for now. No multi-session.

## Risk Mitigation
- **Existing widget safety**: All new code in separate route group `(scoping)/` and separate API route `/api/scope/`. Existing `/api/chat/` and Convex functions untouched.
- **Schema migration**: New tables only — no changes to existing tables. Convex handles additive schema changes cleanly.
- **AI abuse**: Rate limiting per sessionId (10 messages/min), message length cap (2000 chars), same sanitization as widget.
