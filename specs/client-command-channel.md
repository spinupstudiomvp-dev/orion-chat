# OrionChat — Client Command Channel Spec

## Problem
Clients need a way to request website changes without emailing, calling, or using project management tools. They should be able to type what they want directly on their own site and get it done.

## Solution Overview
OrionChat becomes an authenticated command channel embedded on client websites. Clients access it via a magic link (URL with token param), the token is stored in a cookie, and the widget appears only for authenticated users. Messages route to Orián for execution, with notifications to Matt.

## Auth Flow
1. Matt generates a token for each client site (manual for now)
2. Matt sends client a magic link: `theirsite.com?oc_token=abc123`
3. Widget JS detects `oc_token` URL param → stores in `oc_session` httpOnly cookie (via a small API endpoint)
4. Widget JS checks for `oc_session` cookie on every page load — only renders if present
5. Cookie is secure, httpOnly, SameSite=Strict, 30-day expiry
6. All chat API requests include the cookie — backend validates against stored (hashed) tokens
7. Token not in embed script source — script tag is just `<script src="https://orionchat.../widget.js" defer></script>`

## Widget Behavior
- **Hidden by default** — no cookie = no widget, completely invisible
- **When authenticated:**
  - Floating button (bottom-right) with subtle pulse
  - Click opens chat panel
  - Shows conversation history for this site
  - Client types request → sent to backend
  - Status indicators: pending ⏳ → in progress 🔄 → done ✅
  - Agent replies appear in real-time (polling or SSE)

## Data Model (Convex)

### sites
| Field | Type | Description |
|-------|------|-------------|
| siteId | string | Unique slug (e.g. "stories-and-sounds") |
| name | string | Display name |
| domain | string | Primary domain |
| repo | string | GitHub repo (owner/name) |
| tokenHash | string | SHA-256 hash of the auth token |
| clientName | string | Client's name |
| clientEmail | string | Client's email (optional) |
| createdAt | number | Timestamp |
| active | boolean | Whether site is active |

### messages
| Field | Type | Description |
|-------|------|-------------|
| siteId | string | Which site this belongs to |
| role | "client" \| "agent" | Who sent it |
| content | string | Message text |
| status | "pending" \| "in-progress" \| "done" | Task status (for client messages) |
| timestamp | number | When sent |
| metadata | string? | JSON — commit SHA, deploy URL, etc. |

## API Endpoints

### POST /api/auth/set-cookie
- Receives `{ token }` in body
- Hashes token, looks up site in DB
- If valid: sets `oc_session` httpOnly cookie with the token, returns `{ siteId, siteName }`
- If invalid: returns 401
- Called by widget JS when it detects `oc_token` URL param

### GET /api/auth/verify
- Reads `oc_session` cookie
- Validates against DB
- Returns `{ authenticated: true, siteId, siteName }` or `{ authenticated: false }`
- Widget calls this on load to decide whether to render

### GET /api/messages?siteId=xxx
- Requires valid cookie
- Returns conversation history for this site
- Paginated, newest first

### POST /api/messages
- Requires valid cookie
- Body: `{ content }`
- Creates message with role="client", status="pending"
- Triggers: (1) Telegram notification to Matt, (2) Task creation for Orián

### PATCH /api/messages/:id
- Agent-only (requires agent API key)
- Updates status and/or adds agent reply
- Used by Orián when working on / completing a task

## Task Routing
When a client message comes in:
1. **Telegram notification to Matt:** "🔔 [Stories & Sounds] Mrs B: 'Change the hero text to...'"
2. **Orián task created:** Via cron wake or session_send — includes site context (repo, domain)
3. **Orián executes:** Pulls repo, makes changes, commits, pushes → Vercel auto-deploys
4. **Orián replies:** Posts agent message back through OrionChat API with status="done"
5. **Client sees:** Reply in widget with ✅ status

## Embed Script
```html
<!-- No token, no secrets — completely clean -->
<script src="https://orionchat.vercel.app/widget.js" defer></script>
```

The widget.js:
1. On load: check for `oc_token` URL param → if present, POST to /api/auth/set-cookie
2. GET /api/auth/verify → if not authenticated, do nothing (widget stays hidden)
3. If authenticated: render floating button, load message history
4. Handle send/receive

## Security
- Token never in source code or client-side JS variables
- httpOnly cookie — not accessible via JS (XSS-proof)
- SameSite=Strict — no CSRF
- Tokens are hashed in DB (SHA-256) — DB breach doesn't expose tokens
- Rate limiting on message endpoint (max 10/min per site)
- No public-facing endpoints without auth

## Out of Scope (V1)
- Client self-service dashboard (Matt creates tokens manually)
- Real-time WebSocket (polling is fine for now)
- File/image uploads from clients
- Multi-user per site (one token per site)
- Auto-execution without Orián (no CMS layer)

## Migration from Current OrionChat
- Current widget.js needs full rewrite (was public chat, now auth-gated)
- Current Convex tables (conversations, messages) on little-echidna-115 can be deprecated
- New tables go on OrionChat's own Convex project (when Matt creates one) or stay on little-echidna-115

## Success Criteria
- Client receives magic link, clicks it, widget appears
- Client types a request, Matt gets Telegram notification
- Orián makes the change, client sees "Done ✅" in widget
- No token visible in page source or network requests (only in cookie)
- Widget completely invisible to non-authenticated visitors
