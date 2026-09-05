# TripMate AI — Product Requirements Document (Portfolio Edition)

**Version:** 3.0
**Date:** 2026-08-29
**Supersedes:** v2.0 (Graduation Project Edition)

---

## 0. Direction change — read this first

**This is no longer a graduation project.** It is a **personal portfolio
project**, published on LinkedIn and used when applying for software / AI
engineering roles.

Everything v2.0 called "Part II — the graduation layer" has been **removed**:
the research question, the multi-agent orchestrator, the critic-and-revise
loop, the three-system A/B/C comparison, the 30-request evaluation harness, the
Wilcoxon signed-rank analysis, and the thesis chapter mapping. None of it is
being built. Do not reintroduce it.

**Positioning:**

> **TripMate AI — an intelligent travel planner and travel companion.**

**What the project exists to demonstrate**, to someone reading a CV:

Next.js (App Router) · React · TypeScript · LLM integration · structured AI
output · external API integration · Supabase · authentication · database
design · Row Level Security · localization (EN/AR with RTL) · real-world data
integration · considered UI/UX.

**What it deliberately is not:** a travel agency. There is no payment, no
checkout, no card handling, no booking engine, no real flight or hotel booking.
Hotels and restaurants that appear in a plan are recommendations.

### 0.1 Assumptions

| # | Assumption | Change it if... |
|---|---|---|
| A1 | Portfolio project. Scope is chosen for what it demonstrates per hour of work, not for academic novelty. | Never — this replaces v2.0's assumption A1. |
| A2 | AI provider is **Groq** (`groq-sdk`), model `openai/gpt-oss-120b`. | You switch providers. Only §7 changes. |
| A3 | Solo developer. | — |
| A4 | **Free tiers only.** Any service requiring a credit card or a billing account needs the owner's approval before use. | Never without asking — see §20. |

---

# PART I — The application as built

Part I is **complete and working**. It is described here because Part II builds
on it, and because a reader needs to know what exists before changing it.

## 1. Product overview

**Product name:** TripMate AI
**Type:** AI-powered travel planning and companion web application.

**Purpose:** generate a personalized, budget-aware travel itinerary from five
inputs (origin, destination, departure date, budget in SAR, number of days),
ground it in real-world data, then let the user save and revisit it.

Domain focus is **Saudi domestic tourism** (Riyadh, Jeddah, AlUla, Abha, the
Red Sea coast). International destinations work too — the focus is a default
and a showcase, not a restriction.

## 2. Core user flow

```
Home  ->  Plan Trip  ->  Generate (AI)  ->  Result  ->  Save  ->  My Trips  ->  View Saved Trip
```

This flow does not change. Part II adds information **to the Result page**; it
does not reroute the journey.

## 3. Pages and routes

| Route | Purpose |
|---|---|
| `/` | Landing page — hero, features, CTA |
| `/plan` | Trip input form |
| `/result` | Freshly generated (unsaved) itinerary |
| `/result/[id]` | A saved itinerary, loaded from Supabase |
| `/my-trips` | List of saved trips |
| `/login`, `/signup` | Authentication |
| `/auth/callback` | Email confirmation lands here |

### 3.1 Plan Trip (`/plan`)

| Field | Type | Validation |
|---|---|---|
| From | text | required, 2–60 chars |
| Destination | text | required, 2–60 chars, different from From |
| Departure Date | date | required, today or later |
| Budget (SAR) | number | required, integer, 500–500,000 |
| Number of Days | number | required, integer, 1–30 |

On submit: validate client-side, disable the button and show a loading state
(generation takes 10–40s), `POST /api/trips/generate`, store the result, then
navigate to `/result`. On failure, show a readable error and keep the form
filled.

### 3.2 Result (`/result` and `/result/[id]`)

Renders the trip title, summary cards (destination, duration, estimated cost),
the budget-warning banner when present, the collapsible daily itinerary, and
travel tips. `/result` reads `sessionStorage`; `/result/[id]` reads Supabase.
Both render the same `TripResult` component.

Part II extends this page — see §12.

## 4. Data flow

`sessionStorage` under key `tripmate:lastTrip` carries the unsaved result from
`/plan` to `/result`. Saving inserts a row and redirects to `/result/[id]`.
`sessionStorage` is transport, never a database.

## 5. Data model (Supabase)

One table, `trips`. The authoritative version is `supabase/schema.sql` — run
that, not a snippet.

> **Two columns that look redundant and are not:** `budget` is what the user
> asked to spend; `estimated_budget` is what the plan actually costs. The gap
> between them is exactly what `budget_warning` explains, so collapsing them
> would throw away the product's most distinctive behaviour.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `user_id` | uuid, not null | FK to `auth.users`, cascade delete |
| `title` | text | AI-generated |
| `from_location` | text | user input |
| `destination` | text | as returned by the model |
| `departure_date` | date | |
| `budget` | integer | requested |
| `estimated_budget` | integer | actual cost of the plan |
| `days` | integer | |
| `itinerary` | jsonb | `Day[]` |
| `travel_tips` | jsonb | `string[]` |
| `budget_warning` | text, nullable | null when the budget works |
| `created_at` | timestamptz | `now()` |

Index: `trips (user_id, created_at desc)` — matches the My Trips query.

**Row Level Security** is enabled with four policies, all scoped `to
authenticated` and keyed on `auth.uid() = user_id`: select, insert, update,
delete. The insert policy uses `with check`, so a user cannot write a row under
another user's id even by editing the request body.

**No route handler filters by `user_id`.** Authorization lives in the database
on purpose: a forgotten filter in application code is a data leak, whereas a
forgotten filter under RLS simply returns nothing. Preserve this property when
adding queries in Part II.

## 6. API routes

All AI calls and database writes go through server-side route handlers. **No
provider key ever reaches the browser.**

| Route | Method | Purpose |
|---|---|---|
| `/api/trips/generate` | POST | Validate input, call the AI, return the plan |
| `/api/trips` | POST | Save a generated trip |
| `/api/trips` | GET | List the signed-in user's trips |
| `/api/trips/[id]` | GET | Fetch one saved trip |
| `/api/trips/[id]` | DELETE | Delete one saved trip |

Part II adds routes; each follows the same rule.

## 7. AI integration

### 7.1 Provider and model

**Groq** (`groq-sdk`), model **`openai/gpt-oss-120b`**, called from `lib/ai.ts`
via `app/api/trips/generate/route.ts`.

**Why this model.** On Groq, only the `openai/gpt-oss-*` family supports
**strict structured outputs**. Every other Groq model offers loose JSON mode
only, which can return valid JSON with the wrong shape and forces hand-written
repair code. Provider selection was driven by the structured-output
requirement, not by benchmark scores — a real engineering trade-off, and a good
thing to be able to explain in an interview.

**Honest limitation:** `gpt-oss-120b` is a mid-size open-weight model, so its
geographic and factual grounding is weaker than a frontier model's. That is
exactly why Part II grounds place data against a real places source instead of
trusting the model for it.

### 7.2 Structured output

```ts
const completion = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  max_completion_tokens: tokenBudget(input.days),
  reasoning_effort: "low",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(userInput) },
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: "trip_plan", strict: true, schema: tripPlanJsonSchema() },
  },
});
```

**One schema, three uses.** `lib/schema.ts` defines the trip shape once in Zod.
`tripPlanJsonSchema()` converts it with `z.toJSONSchema(schema, {io: "input"})`
for the request; `tripPlanSchema.safeParse()` validates the response; the
inferred TypeScript types flow through the UI. They cannot drift apart.

Requirements Groq's strict mode imposes, and how they are met:

| Requirement | How |
|---|---|
| Every property listed in `required` | Zod objects are required by default |
| `additionalProperties: false` on every object | `z.strictObject()`, not `z.object()` |
| Optional fields as nullable unions | `z.string().nullable()` |
| No `$schema` key in the request | `tripPlanJsonSchema()` deletes it |

Notes that save hours:

- The parameter is `max_completion_tokens`, not `max_tokens`.
- Strict structured outputs **cannot be combined with streaming or tool use**
  on Groq. Any multi-step AI work must be separate sequential calls.
- `gpt-oss-120b` is a reasoning model; reasoning tokens count toward
  `max_completion_tokens`. Check `finish_reason === "length"` and surface it
  rather than returning truncated JSON.
- Strict mode guarantees the **shape**, not the **content**. The model can still
  return the wrong number of days — verify `itinerary.length === input.days` and
  retry once.

### 7.3 Budget honesty

A model told to "respect the budget" invents numbers to comply. Instead the
schema carries `budgetWarning`, and the system prompt instructs:

> If the requested budget cannot realistically cover the trip, set
> `budgetWarning` to a short honest explanation naming a realistic minimum
> figure. Still produce the best itinerary possible at that budget. Never
> fabricate prices to appear within budget.

The Result page renders this banner when present. This is the product's most
distinctive behaviour and the thing worth demoing first.

### 7.4 Error handling

| Failure | Handling |
|---|---|
| Missing or invalid API key | Generic message to the user; real cause logged server-side |
| Rate limit | Groq reports the per-minute token limit as **413 as well as 429** — catch both |
| Response fails schema or day count | Retry once, then a readable failure |
| Network failure | Readable failure, never a raw provider error |

## 8. Design

- Sand background, deep navy primary, sand gold accent, Georgia serif for
  display headings.
- Every colour comes from a token in `app/globals.css`. **No hard-coded hex
  values in components.**
- Light and dark themes, applied before first paint.
- Clean, modern, minimal, responsive. No excessive animation, no gradient soup,
  **no emoji as UI icons** — icons are hand-written inline SVG.

## 9. Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind
CSS v4 · Supabase (`@supabase/ssr`) · Zod 4 · `groq-sdk`

Seven runtime dependencies. No state-management library, no component library,
no ORM. Add a dependency only when a concrete problem demands it — and for a
portfolio project, being able to say "I did not need one" is worth more than the
library.

## 10. Project structure

```
app/
  layout.tsx                  theme script, locale resolution, dir/lang
  globals.css                 design tokens for both themes
  page.tsx                    landing
  plan/page.tsx               trip form
  result/page.tsx             unsaved result (sessionStorage)
  result/[id]/page.tsx        saved result (Supabase)
  my-trips/page.tsx           saved trips list
  login/ signup/              auth pages
  auth/callback/route.ts      email confirmation exchange
  auth/signout/route.ts
  api/trips/generate/route.ts POST — validate, call AI, return plan
  api/trips/route.ts          POST save, GET list
  api/trips/[id]/route.ts     GET one, DELETE one

components/
  Navbar Footer Hero Features CTA         server components
  TripForm TripResult DayCard             the planning UI
  SaveTripButton DeleteTripButton AuthForm
  LocaleProvider LocaleToggle ThemeToggle

lib/
  ai.ts             Groq client, system prompt, token budget, retries
  schema.ts         Zod schemas — the single source of truth
  i18n.ts           every UI string in English and Arabic
  locale-server.ts  reads the locale cookie in server components
  supabase/         browser and server clients
  storage.ts        sessionStorage bridge
  site-url.ts       base URL for confirmation links

middleware.ts       session refresh + route protection
supabase/schema.sql table, index, RLS policies
```

## 11. Part I definition of done

A user can:

1. Open TripMate AI
2. Create an account and receive a confirmation email
3. Confirm by email, then sign in
4. Enter trip details and see validation work
5. Generate a trip and see a loading state
6. Receive an itinerary matching the requested day count
7. See a budget warning when the budget is unrealistic
8. Save the trip
9. Open My Trips and see only their own trips
10. Open a saved trip at its own URL
11. Sign out and find protected pages redirect to sign-in
12. Encounter a readable error — never a blank screen — when something fails

All twelve pass. **One check remains open:** a second account opening the first
account's trip URL must get "not found", not the trip. See §22.

---

# PART II — Portfolio feature roadmap

This replaces v2.0's graduation layer entirely. Each feature is chosen because
it demonstrates a distinct, nameable skill and because it makes the product
genuinely more useful — not because it is novel.

## 12. Design principles for Part II

These constrain every feature that follows.

**1. The AI plans; external data grounds.** The LLM decides what to do on which
day. It is not trusted for place metadata, coordinates, photographs, weather,
currency, or app recommendations. Those come from real sources or curated data.

**2. No multi-agent architecture.** Grounding is a post-processing step over the
generated itinerary, not an orchestrator with agents. The pipeline is:

```
AI itinerary  ->  extract place names  ->  resolve against a places source  ->  enriched itinerary
```

That is one function calling another. Keep it that way.

**3. Optional services fail soft.** Trip generation is the core. If place
enrichment, weather, or photos fail, **the itinerary still renders**. Every
enrichment is additive and independently skippable. This is a hard requirement,
not a nicety.

**4. Never fabricate to fill a gap.** A missing photo is much better than a
wrong photo — the previous version shipped a card labelled "AlUla" showing a
Dubai hotel, and that single defect is why this rule exists. If a place cannot
be confidently resolved, show no metadata. If a destination has no curated app
data, show a clean unavailable state. If a date is beyond the forecast range,
say so.

**5. Do not spend LLM tokens on deterministic facts.** Currency, timezone, plug
type, and emergency numbers are lookups, not generation.

**6. Secrets stay server-side.** Every third-party call goes through a route
handler or a server component. A key is only allowed in the browser when the
provider explicitly designs it for client-side use and it is restricted by
referrer or origin.

**7. Free tiers only, and ask before billing.** See §20.

## 13. Place grounding (Phase 2)

**Skill demonstrated:** external API integration, data reconciliation, graceful
degradation.

After the AI returns an itinerary, resolve the named places to real ones and
attach verified metadata:

| Field | Use |
|---|---|
| `placeId` | Stable identifier; drives the Maps link and the photo lookup |
| `name` | The provider's official display name |
| `address` | Shown under the place when available |
| `lat`, `lng` | Drives the map (§14) |
| `photo` | Only ever the resolved place's own photo (§13.2) |

**Where the place names come from.** Today `Day.activities` is `string[]` — free
text like `"Hegra guided tour (200 SAR)"`. Grounding needs the place name
separable from the activity description, so the day schema gains a structured
activity shape. Saved trips written under the old shape must keep rendering: the
reader accepts both forms.

**Confidence gate.** A resolution is accepted only when the provider's result
plausibly matches what the model named *and* sits in the right city. A fuzzy
match to a similarly-named place in another country is worse than no match.
Unresolved places render exactly as they do today — plain text, no metadata, no
photo, no map marker.

### 13.2 Photographs

The rule from §12.4, stated concretely, because this is where the previous
version failed:

- A photo may only be displayed for a place that **resolved successfully**, and
  it must be **that place's own photo** from the provider.
- Never ask the LLM for an image URL.
- Never run a keyword image search and assume the top result depicts the place.
- Never pair a hard-coded stock photograph with a named attraction.
- When no verified photo exists, render the existing gradient placeholder.
- Honour the provider's **attribution** requirements, and its **caching and
  storage** terms — do not persist provider photo bytes or URLs beyond what the
  terms allow.

## 14. Maps (Phases 2 and 3)

**Skill demonstrated:** third-party integration done correctly, geospatial UI.

**"View on Google Maps"** on every resolved place. Prefer opening the exact
place by its Place ID; fall back to coordinates plus name when no Place ID
exists. Never a bare name search when something better is available. Opens in a
new tab. No API key appears in the URL. The label is localized (EN/AR).

**Trip map** — a map section on the Result page showing a marker per resolved
place. Selecting a marker shows that place's basic information. The map is an
addition to the result experience (a tab or a section), and it must not displace
or degrade the itinerary UI. If a fully interactive embedded Google map turns
out to need billing or disproportionate complexity, a simpler alternative is
chosen and the trade-off is written down before implementing.

## 15. Useful apps by destination (Phase 4)

**Skill demonstrated:** data modelling, curation discipline, i18n.

A "Useful Apps" section telling a traveller which everyday services actually
work at the destination — food delivery, ride hailing, public transport,
navigation, communication.

**Curated data, never LLM-generated.** The model does not get to invent app
names. Shape, roughly:

```
country -> category -> { name, description, officialUrl }
```

Start with a small set of countries that demonstrates the feature well (Saudi
Arabia first, plus a couple of contrasting destinations such as Japan and the
UAE), and keep the structure trivial to extend. Links point only to official
websites or official app-store pages. A destination with no curated entry hides
the section or shows a clean unavailable state.

## 16. Weather (Phase 5)

**Skill demonstrated:** working within a real API's actual limits.

Show temperature, condition, and date for the trip days. Real weather API, not
the LLM.

**Forecast horizon is the interesting part.** Providers only forecast a limited
window. For a trip beyond that window the app must **say so** rather than present
something invented as a forecast. Showing "forecast not available this far
ahead" is the correct, honest behaviour and is worth more than fake data.

## 17. Local essentials (Phase 6)

**Skill demonstrated:** knowing when *not* to use an LLM.

A compact card: currency, main language, emergency number, plug type, timezone.
Deterministic or curated data only. Labels localized in both languages.

## 18. Trip checklist (Phase 7)

**Skill demonstrated:** small, well-scoped stateful UI.

A short pre-trip checklist — identification, connectivity, power adapter,
transport setup — that adapts to the destination where it sensibly can (plug
type drives the adapter item; international travel drives the passport item).
Items can be checked and unchecked. Lightweight: this is a checklist, not a task
manager. No sub-tasks, no due dates, no drag-and-drop.

## 19. AI trip assistant (Phase 8 — last)

**Skill demonstrated:** context-aware LLM feature design under a hard cost
constraint.

A small assistant attached to **one specific trip**, which knows that trip's
context and modifies or advises on it:

> "Make day 2 cheaper." · "Replace the afternoon activity." · "I want an indoor
> activity instead." · "Suggest something close to my hotel." · "Make day 3 less
> busy."

**This is not a general chatbot.** It operates on the existing plan rather than
starting from zero.

**Cost constraint is the design driver.** Groq's free tier is roughly two trip
generations per minute across the entire project (§21). An unlimited chat loop
is not implementable on it. A simple per-user quota is the accepted answer for
the portfolio version. Build this only after Phases 2–7 are stable.

## 20. External APIs and the cost rule

**The rule:** before adding any API that requires billing or a credit card,
**stop and ask the owner**, stating what the API is, why it is needed, whether it
has a free tier, whether billing setup is required, and whether a free
alternative achieves the feature. Wait for approval.

### 20.1 Provider decisions (made 2026-08-29)

The rule above was applied to Google Places, and the answer was no.

**Google Maps Platform requires a Cloud billing account with a valid credit
card** before any Maps or Places API can be called. Since March 2025 the $200
monthly credit has been replaced by per-SKU free caps, but claiming them still
requires billing enabled, and usage past the cap bills automatically unless a
limit is set by hand. The owner chose to avoid billing entirely.

| Need | Provider | Key? | Card? |
|---|---|---|---|
| Place resolution: id, official name, address, lat/lng | **Geoapify** — 3,000 requests/day free | Yes | No |
| Place photographs | **Wikipedia / Wikimedia REST** | No | No |
| "View on Google Maps" | Plain `google.com/maps` URLs — no API involved | No | No |
| Map rendering | **MapLibre GL JS** + **MapTiler** free tiles | Yes (tiles) | No |
| Weather | **Open-Meteo** — 16-day forecast, ~10k calls/day | No | No |
| Country facts | **REST Countries** + curated JSON | No | No |
| Useful apps | Curated JSON in the repository | — | — |

Two consequences that shape §13 and §14:

1. **Geoapify returns no photographs**, so photos come from Wikimedia. That
   path better satisfies §13.2 anyway: the image comes from the encyclopedia
   article *about the resolved place*, not from a keyword search whose first
   result merely looks plausible. No article means the gradient placeholder.
2. **No Google Place ID exists on this stack**, so Maps links use the
   coordinate-plus-name fallback described in §14 rather than `query_place_id`.

Keep the resolver behind a small interface in `lib/places.ts` so that enabling
Google billing later would be a one-file swap rather than a refactor.

**Total new runtime dependencies across the whole roadmap: one** (MapLibre GL
JS, Phase 3). Everything else is `fetch`.

All third-party keys are server-side. Responses are cached where the provider's
terms allow it, because the same city gets queried repeatedly during
development.

Environment variables (`.env.local`, git-ignored):

```
GROQ_API_KEY=                    secret, server only, never NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=        project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   publishable, public by design, guarded by RLS
NEXT_PUBLIC_SITE_URL=            base URL for confirmation links
```

Two of these are not secrets and one is. The Supabase publishable key is
designed to ship to browsers; what protects the data is RLS, not concealment.
The Groq key is a real secret. It must never gain a `NEXT_PUBLIC_` prefix,
appear in client code, or be pasted into a chat. Part II adds one variable per
service it uses; each follows the same rule.

## 21. Known constraints

| Constraint | Effect |
|---|---|
| **Groq free tier: 8,000 tokens/minute, project-wide** | It counts prompt **plus** `max_completion_tokens` together, so a large output budget is rejected outright even when the reply would be short. `tokenBudget()` scales with trip length. Roughly two generations per minute across all users. Directly shapes §19. |
| **Groq strict output validates after generation, not during** | A stray quoted number rejects the whole reply with HTTP 400. Numeric fields are number-or-string unions on purpose. Do not "clean up" those unions. |
| **Strict output cannot combine with tool use or streaming on Groq** | Any multi-step AI work is separate sequential calls. |
| **Tailwind v4: `@theme`, never `@theme inline`** | `inline` bakes the light palette into every utility and silently kills dark mode. |
| **Turbopack serves stale CSS after `globals.css` structural edits** | Restart the dev server; delete `.next` if it persists. |
| **PowerShell 5.1 corrupts UTF-8 source files** | `Set-Content` writes ANSI and has already destroyed every Arabic string once. Use the editor tools or a UTF-8-aware method. |
| **Supabase email: about two messages per hour** | Free-plan built-in service, Supabase-owned sender. Custom SMTP fixes both — see §23. |
| **Confirmation links follow `NEXT_PUBLIC_SITE_URL`** | A LAN IP in development; it changes with the network and silently breaks links. Must also be listed in Supabase, Authentication, URL Configuration. |
| **Headless preview browser does not composite frames** | CSS transitions read as frozen and lazy images never load, which looks exactly like a broken theme toggle. Inject `* { transition: none !important }` before checking computed colours. |

## 22. Outstanding work outside the roadmap

| Item | Notes |
|---|---|
| **Two-account RLS check** | The last open item from §11. Confirm account B gets "not found" on account A's trip URL. Requires temporarily disabling email confirmation to create a second account. |
| **Destination card photography** | `public/images/` is empty; the home page destination cards are gradient placeholders. Phase 2's place grounding may supply verified photos; otherwise the placeholders stay. **Do not substitute unverified stock photos.** |
| **`middleware.ts` deprecation** | Next 16.2 warns that the `middleware` file convention is deprecated in favour of `proxy`. Cosmetic today; worth doing before deployment. |

## 23. Deployment (end of project)

| Task | Solves |
|---|---|
| Deploy to Vercel | Confirmation links point at a LAN IP and break on any other device or network. A real domain fixes it permanently. |
| Custom SMTP (e.g. Resend free tier) | Emails arrive from a Supabase-owned address and are limited to about two per hour. Custom SMTP fixes the sender identity and the limit. |

Before deploying, confirm `public/` holds only web assets — anything large there
is uploaded on every deploy and served publicly.

## 24. Non-goals

Explicitly out of scope. Do not build these, and do not propose them.

- **Payment, checkout, or card handling** — of any kind
- **Real booking** — flights, hotels, tickets, or anything reservable
- **Amadeus or any booking/fare API**
- Academic evaluation: research questions, system comparisons, statistical
  testing, a fixed measurement test set
- A multi-agent orchestrator, or a critic-and-revise loop
- Agent frameworks of any kind
- Multi-user collaboration on a trip
- Native mobile apps
- Drag-and-drop itinerary editing
- Offline mode

## 25. Working agreement for AI coding sessions

- **Implement one phase at a time.** After each phase: run `npx tsc --noEmit`,
  build where appropriate, summarize exactly what changed, and say what to test
  manually in the browser. Do not roll into the next phase without reporting.
- **Preserve what works.** AI generation, Supabase, auth, RLS, localization,
  themes, budget honesty, and saved trips are all working and verified. Do not
  redesign them.
- **Readable over clever.** This code gets explained in interviews. Small
  modules, clear names, no unnecessary abstraction.
- **No new dependency without a concrete problem** it solves.
- **Comment only non-obvious constraints.** Do not narrate what the next line
  does.
- **Secrets never reach the client.** Every AI call, database write, and
  third-party request goes through a route handler or a server component.
- **Ask before deleting anything the owner owns.**
- **Ask before using any billing-required service** (§20).
- **Verify the property that actually matters.** The wrong-photo defect happened
  because the image URLs were confirmed to *load*, never to depict the right
  place. Check the real property, not a proxy for it.

---

## Appendix A — Change log from v2.0

| Change | Reason |
|---|---|
| Retitled "Graduation Project Edition" to "Portfolio Edition" | The project is now a portfolio piece for job applications |
| Deleted the entire graduation layer (old §§12–17) | Research question, multi-agent architecture, critic loop, A/B/C comparison, 30-case test set, and statistical analysis are all out of scope |
| Deleted the thesis chapter mapping (old Appendix A) | No thesis |
| Removed the flight and hotel booking APIs | Booking is a non-goal; the product plans trips, it does not sell them |
| Added Part II as a feature roadmap (§§13–19) | Replaces the academic layer with user-facing features that demonstrate employable skills |
| Added place grounding with an explicit confidence gate (§13) | The LLM is not trustworthy for place metadata; grounding it is the single highest-value feature |
| Added the photo-correctness rules (§13.2) | A card labelled "AlUla" once displayed a Dubai hotel. A missing image is better than a wrong one |
| Added Google Maps links and a trip map (§14) | Real geospatial integration, visible in a portfolio demo |
| Added useful apps, weather, local essentials, checklist (§§15–18) | Turns a planner into a companion, and each demonstrates a distinct skill |
| Moved the chat feature to a trip-scoped assistant with a quota (§19) | An unlimited chat loop is not implementable on Groq's free tier |
| Added the billing-approval rule (§20) | Portfolio project on free tiers; no service with a required credit card is added without approval |
| Made fail-soft behaviour a hard requirement (§12.3) | The core generation flow must survive any optional service being down |
| Stated payment and booking as explicit non-goals (§24) | Removes the previously planned payment button and quota-payment scope |
